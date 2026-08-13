/**
 * End-to-end exercise of all five endpoints against a real database.
 *
 *   npm run smoke                      # uses an in-memory MongoDB
 *   MONGODB_URI=... npm run smoke      # or point it at a real one
 *
 * This is the check that the lead-capture gate actually holds: it asserts that
 * the locked fields are absent from every ungated response, not merely hidden
 * by the client.
 */
import http from 'http';
import mongoose from 'mongoose';

// The rate limiter is built from config at import time, and the functional
// tests below legitimately need more than five scan-endpoint calls. Raise the
// limit before anything reads config, then verify the limit still bites at the
// configured number — so this stays a real test of the limiter, not a bypass.
const SMOKE_RATE_LIMIT = 12;
process.env.SCAN_RATE_LIMIT_PER_HOUR = String(SMOKE_RATE_LIMIT);

/** A store that is stable, fast and reliably scannable. */
const TARGET_URL = process.env.SMOKE_URL || 'https://www.chumbak.com';
const COMPETITOR_URL = process.env.SMOKE_COMPETITOR_URL || 'https://sleepyowl.co';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

interface ApiResponse {
  status: number;
  body: any;
  raw: string;
}

function request(port: number, method: string, path: string, payload?: unknown): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const data = payload === undefined ? null : JSON.stringify(payload);
    const req = http.request(
      { host: '127.0.0.1', port, method, path, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let body: unknown = null;
          try {
            body = JSON.parse(raw);
          } catch {
            body = null;
          }
          resolve({ status: res.statusCode || 0, body, raw });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Always an isolated, throwaway database.
 *
 * This deliberately ignores `MONGODB_URI`. It used to honour it, and once a
 * real `.env` existed the suite quietly started writing test scans and a fake
 * lead into the production database — and then failing, because it was reading
 * back its own leftovers from the previous run. A test that can reach
 * production is a test that will eventually damage it.
 *
 * Point it somewhere real only by setting SMOKE_MONGODB_URI, which nothing else
 * sets by accident.
 */
async function startMongo(): Promise<{ uri: string; stop: () => Promise<void> }> {
  if (process.env.SMOKE_MONGODB_URI) {
    console.log('⚠️  Using SMOKE_MONGODB_URI — this run will write to that database.');
    return { uri: process.env.SMOKE_MONGODB_URI, stop: async () => undefined };
  }

  // Optional dev dependency; only needed when there is no MongoDB to point at.
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  return {
    uri: server.getUri(),
    stop: async () => {
      await server.stop();
    },
  };
}

async function main(): Promise<void> {
  // Imported dynamically so the env override above is in place before config
  // is first read.
  const { createApp } = await import('../app');
  const { Lead } = await import('../models/Lead');

  const mongo = await startMongo();
  await mongoose.connect(mongo.uri);

  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const port = (server.address() as { port: number }).port;

  try {
    console.log('\nHealth');
    const health = await request(port, 'GET', '/api/health');
    assert('GET /api/health → 200', health.status === 200 && health.body?.success === true);

    console.log('\nInvalid input');
    const bad = await request(port, 'POST', '/api/scan', { url: 'not a url' });
    assert('a junk URL → 400 with a readable message', bad.status === 400 && typeof bad.body?.error === 'string', bad.raw);
    const localhost = await request(port, 'POST', '/api/scan', { url: 'http://127.0.0.1:8080' });
    assert('a loopback URL is refused (SSRF guard)', localhost.status === 400, localhost.raw);

    console.log(`\nPOST /api/scan — ${TARGET_URL}`);
    const scanRes = await request(port, 'POST', '/api/scan', { url: TARGET_URL });
    assert('→ 200', scanRes.status === 200, scanRes.raw.slice(0, 300));
    const teaser = scanRes.body?.data;
    assert('returns a grade and a score', /^[A-F]$/.test(teaser?.overallGrade) && typeof teaser?.overallScore === 'number');
    assert('returns exactly 2 teaser checks', teaser?.teaserChecks?.length === 2, JSON.stringify(teaser?.teaserChecks?.length));
    assert('teaser hides the remaining checks', teaser?.lockedChecks === 5, String(teaser?.lockedChecks));
    assert('teaser advertises the generated fixes', typeof teaser?.fixesAvailable === 'number');
    assert('teaser leaks no explanations', !scanRes.raw.includes('humanExplanation'));
    assert('teaser leaks no generated fixes', !scanRes.raw.includes('generatedFix"'));
    assert('completed inside the 15s budget', teaser?.scanDurationMs < 15000, String(teaser?.scanDurationMs));

    const scanId = teaser?.scanId as string;

    console.log('\nGET /api/scan/:scanId (gated)');
    const gated = await request(port, 'GET', `/api/scan/${scanId}`);
    assert('→ 200 with all seven checks', gated.status === 200 && gated.body?.data?.checks?.length === 7, String(gated.body?.data?.checks?.length));
    assert('every check is marked locked', gated.body.data.checks.every((check: any) => check.locked === true));
    assert('no explanations are sent', gated.body.data.checks.every((check: any) => check.humanExplanation === null));
    assert('no fixes are sent', gated.body.data.checks.every((check: any) => check.generatedFix === null));
    assert('verdicts and points are still visible', gated.body.data.checks.every((check: any) => typeof check.status === 'string'));

    const missing = await request(port, 'GET', '/api/scan/000000000000000000000000');
    assert('an unknown scan id → 404', missing.status === 404);
    const malformed = await request(port, 'GET', '/api/scan/not-an-id');
    assert('a malformed scan id → 400, not a 500', malformed.status === 400, malformed.raw);

    console.log('\nGET /api/scan/:scanId/report before unlocking');
    const lockedReport = await request(port, 'GET', `/api/scan/${scanId}/report`);
    assert('→ 403, so the report link is not a way around the gate', lockedReport.status === 403, String(lockedReport.status));

    console.log('\nPOST /api/scan/:scanId/unlock');
    const badEmail = await request(port, 'POST', `/api/scan/${scanId}/unlock`, { name: 'Test', email: 'nope', whatsapp: '+919876543210' });
    assert('rejects an invalid email', badEmail.status === 400, badEmail.raw);
    const badPhone = await request(port, 'POST', `/api/scan/${scanId}/unlock`, { name: 'Test', email: 'a@b.com', whatsapp: '12' });
    assert('rejects an implausible WhatsApp number', badPhone.status === 400, badPhone.raw);

    /**
     * Consent is enforced server-side, not only by the checkbox.
     *
     * The form is the honest place to ask, but a rule that lives only in the
     * browser can be skipped by calling this endpoint directly — and a lead in
     * the database without a recorded agreement is one we could never lawfully
     * contact.
     */
    const noConsent = await request(port, 'POST', `/api/scan/${scanId}/unlock`, {
      name: 'Test Buyer',
      email: 'test@example.com',
      whatsapp: '+91 98765 43210',
    });
    assert('an unlock without consent is refused', noConsent.status === 400, noConsent.raw);

    const CONSENT_WORDING = 'I agree that Codenix Labs may email me this report and contact me on WhatsApp.';
    const unlocked = await request(port, 'POST', `/api/scan/${scanId}/unlock`, {
      name: 'Test Buyer',
      email: 'test@example.com',
      whatsapp: '+91 98765 43210',
      consent: true,
      consentText: CONSENT_WORDING,
      consentSource: 'ai-readiness-gate',
    });
    assert('→ 200', unlocked.status === 200, unlocked.raw.slice(0, 300));
    assert('now returns every explanation', unlocked.body?.data?.checks?.every((check: any) => typeof check.humanExplanation === 'string' && check.humanExplanation.length > 40));
    assert('returns at least one copy-paste fix', unlocked.body.data.checks.some((check: any) => typeof check.generatedFix === 'string'));
    assert('reports that email was not sent (no API key configured)', unlocked.body?.meta?.emailed === false);

    const lead = await Lead.findById(unlocked.body.meta.leadId).exec();
    assert('a Lead was saved with the scan attached', Boolean(lead) && String(lead?.scanId) === scanId);
    assert('the lead carries the grade for the outreach list', lead?.overallGrade === teaser.overallGrade);
    assert('the email failure is recorded on the lead, not swallowed', lead?.reportEmailed === false && Boolean(lead?.emailError));

    assert('consent is stored with the lead', lead?.consent === true);
    assert('and stamped with a server-side time', lead?.consentAt instanceof Date);
    assert(
      'and keeps the exact wording that was agreed to',
      lead?.consentText === CONSENT_WORDING,
      String(lead?.consentText),
    );
    assert('and records which form it came from', lead?.consentSource === 'ai-readiness-gate');

    console.log('\nGET /api/scan/:scanId/report after unlocking');
    const report = await request(port, 'GET', `/api/scan/${scanId}/report`);
    assert('→ 200 HTML', report.status === 200 && report.raw.includes('<!DOCTYPE html>'));
    assert('the HTML contains the grade', report.raw.includes(`>${teaser.overallGrade}<`));
    assert('the HTML contains a fix block', report.raw.includes('Copy-paste fix'));

    console.log(`\nPOST /api/scan/:scanId/compare — ${COMPETITOR_URL}`);
    const sameStore = await request(port, 'POST', `/api/scan/${scanId}/compare`, { competitorUrl: TARGET_URL });
    assert('refuses to compare a store with itself', sameStore.status === 400, sameStore.raw);

    const compared = await request(port, 'POST', `/api/scan/${scanId}/compare`, { competitorUrl: COMPETITOR_URL });
    assert('→ 200 with both scans', compared.status === 200 && Boolean(compared.body?.data?.yourScan) && Boolean(compared.body?.data?.competitorScan));
    assert('both sides carry all seven checks', compared.body.data.yourScan.checks.length === 7 && compared.body.data.competitorScan.checks.length === 7);
    assert('the comparison is linked back on your scan', compared.body.data.yourScan.comparisonScanId === compared.body.data.competitorScan.scanId);
    assert('and linked back on the competitor scan', compared.body.data.competitorScan.comparisonScanId === scanId);
    assert('an unlocked visitor sees both in full', compared.body.data.competitorScan.checks.every((check: any) => typeof check.humanExplanation === 'string'));

    console.log('\nCaching');
    const cachedRes = await request(port, 'POST', '/api/scan', { url: TARGET_URL });
    assert('re-scanning the same domain within 6h is served from cache', cachedRes.body?.data?.cached === true);
    assert('and returns the same scan id', cachedRes.body?.data?.scanId === scanId);

    console.log('\nSite-type override');
    const rejected = await request(port, 'POST', '/api/scan', { url: TARGET_URL, siteType: 'bakery' });
    assert('an unknown site type → 400', rejected.status === 400, rejected.raw);

    const overridden = await request(port, 'POST', '/api/scan', { url: TARGET_URL, siteType: 'content' });
    assert('an override runs a fresh scan rather than reusing the detected one', overridden.body?.data?.cached === false);
    assert('and reports the type the visitor chose', overridden.body?.data?.siteType === 'content', JSON.stringify(overridden.body?.data?.siteType));
    assert('and marks it as overridden', overridden.body?.data?.siteTypeOverridden === true);
    // Assert the shape of the change, not a frozen number — the weights are
    // revised whenever the evidence changes, and a test that breaks on every
    // revision teaches you to ignore it.
    const overriddenWeights = overridden.body?.data?.audit?.weights || {};
    assert(
      'and switches to that type\'s weights',
      overriddenWeights.content_structure > 12 && overriddenWeights.bot_access >= 25,
      JSON.stringify(overriddenWeights),
    );
    assert(
      'llms.txt is worth zero for a publication — nothing reads it',
      overriddenWeights.agent_interface === 0,
      JSON.stringify(overriddenWeights),
    );
    assert(
      'every profile still totals 100',
      Object.values(overriddenWeights as Record<string, number>).reduce((sum, weight) => sum + weight, 0) === 100,
      JSON.stringify(overriddenWeights),
    );

    // The reverse must hold too: a plain scan must never be handed someone
    // else's override, or it opens "you told us..." when they said nothing.
    const plainAgain = await request(port, 'POST', '/api/scan', { url: TARGET_URL });
    assert('a plain scan is never served an overridden cached scan', plainAgain.body?.data?.siteTypeOverridden === false, JSON.stringify(plainAgain.body?.data?.siteType));

    console.log('\nAudit trail');
    const auditTrail = gated.body.data.audit;
    assert('the gated response still publishes the scoring version', typeof auditTrail?.scoringVersion === 'string' && auditTrail.scoringVersion.length > 0);
    assert('and the full weight table', Object.keys(auditTrail?.weights || {}).length === 7, String(Object.keys(auditTrail?.weights || {}).length));
    assert('and how many pages were checked vs found', typeof auditTrail?.pagesChecked === 'number' && typeof auditTrail?.pagesDiscovered === 'number');
    assert('and the count of hard blockers', typeof auditTrail?.blockingIssues === 'number');
    assert('and states the method plainly', String(auditTrail?.method || '').includes('Static HTML only'));

    console.log(`\nRate limiting (${SMOKE_RATE_LIMIT} scan-endpoint calls per IP per hour)`);
    // Keep firing rejected-URL requests — cheap, no crawling — until the
    // limiter refuses one. Counting up rather than assuming a fixed number
    // keeps this honest as the tests above change.
    let attempts = 0;
    let lastStatus = 0;
    while (attempts < SMOKE_RATE_LIMIT + 4 && lastStatus !== 429) {
      lastStatus = (await request(port, 'POST', '/api/scan', { url: 'not a url' })).status;
      attempts += 1;
    }
    assert('the limiter eventually refuses with 429', lastStatus === 429, `gave up after ${attempts} extra calls`);
    assert('and it refuses within the configured allowance', attempts <= SMOKE_RATE_LIMIT, `took ${attempts} extra calls`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    await mongo.stop();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
