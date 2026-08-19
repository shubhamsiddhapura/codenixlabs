import { config } from '../config';
import { CheckId, CheckOutcome, CheckResult, ScanResult, SiteType } from '../types';
import { Deadline, FetchResult, PROBE_BODY_BYTES, fetchUrl, fetchWithHttpFallback } from './fetcher';
import { HtmlDocument, typesOf } from './htmlDocument';
import { ScanContext } from './scanContext';
import { collectSitemapUrls, isSampleablePage, selectKeyPages } from './discovery';
import { ParsedRobots, parseRobotsTxt } from './robotsTxt';
import { detectSiteType, profileFor } from './siteType';
import { normalizeUrl } from '../utils/url';
import { SCORING_VERSION, buildSummary, scoreCheck, totalScore } from './scoring';

import { CONTROL_BOT, LIVE_PROBE_BOTS, checkBotAccess } from './checks/botAccess';
import { CONTENT_STRUCTURE_TITLE, checkContentStructure } from './checks/contentStructure';
import { AGENT_ARTIFACT_PATHS, checkAgentInterface } from './checks/agentInterface';
import { checkStructuredData } from './checks/structuredData';
import { SCHEMA_PROFILES } from './checks/schemaProfiles';
import { checkTrustSignals } from './checks/trustSignals';
import { checkMetaRobots } from './checks/metaRobots';
import { checkCrawlability, looksParked } from './checks/crawlability';

/** Report order — worst-to-fix-first is handled in the UI, this is stable order. */
const CHECK_ORDER: CheckId[] = [
  'bot_access',
  'structured_data',
  'content_structure',
  'agent_interface',
  'trust_signals',
  'meta_robots',
  'crawlability',
];

/**
 * Run all six checks against a URL.
 *
 * Never throws for site-side problems — an unreachable or hostile site is a
 * result, not an error. The only throw is InvalidUrlError from normalisation,
 * which is a problem with what the visitor typed.
 *
 * Order matters here. The homepage is fetched first because everything depends
 * on it; the site type is classified next because it decides which pages get
 * sampled, which agent artefacts get probed, and what the checks expect.
 */
export interface ScanOptions {
  /**
   * Skip classification and judge the site as this type.
   *
   * Detection is a heuristic and says so — it reports low confidence when the
   * signals are thin. This is how that admission becomes actionable: the
   * visitor can correct it and re-run, rather than reading a report built on a
   * wrong assumption.
   */
  siteType?: SiteType;
}

export async function runScan(submittedUrl: string, options: ScanOptions = {}): Promise<ScanResult> {
  const startedAt = Date.now();
  const { href, origin, domain } = normalizeUrl(submittedUrl);
  const deadline = new Deadline(config.scanner.totalTimeoutMs);

  const homepage = new HtmlDocument(await fetchWithHttpFallback(href, deadline));

  /**
   * Stop before anything else if there is no website here to grade.
   *
   * Checked immediately after the homepage and before any other request,
   * because everything downstream — sampling pages, probing crawlers, judging
   * schema — is meaningless without a page, and running it produces a confident
   * grade for a domain nobody has built. Returning early also spares the ~20
   * requests.
   */
  const missing = whyNoWebsite(homepage);
  if (missing) {
    return noWebsiteResult(submittedUrl, domain, homepage, startedAt, missing);
  }

  const robotsTxt = await fetchUrl(`${origin}/robots.txt`, deadline);
  const robots: ParsedRobots | null =
    robotsTxt.ok && robotsTxt.body && !looksLikeHtml(robotsTxt) ? parseRobotsTxt(robotsTxt.body) : null;

  const sitemap = await collectSitemapUrls(origin, robots?.sitemaps ?? [], deadline);

  // Classify before sampling: a blog and a store want completely different
  // pages fetched, and fetching the wrong ones wastes the budget.
  // robots.txt is passed in because on sites that refuse our scanner it is the
  // only structural evidence we have — see robotsPathsOf in siteType.ts.
  const detected = detectSiteType(homepage, sitemap.urls, robots);
  const verdict = options.siteType
    ? { siteType: options.siteType, confidence: 'high' as const, evidence: ['you told us what kind of site this is'] }
    : detected;
  const profile = profileFor(verdict.siteType);

  const selection = selectKeyPages(homepage, sitemap.urls, verdict.siteType, config.scanner.maxKeyPages);
  const candidateUrls = selection.urls;

  // Agent artefacts and key pages are independent, so fetch them together —
  // sequential round trips would eat most of a 15-second budget on a slow host.
  const artifactSpecs = AGENT_ARTIFACT_PATHS[verdict.siteType];

  const [artifactResponses, keyPageResponses, probeResponses] = await Promise.all([
    Promise.all(artifactSpecs.map((spec) => fetchUrl(`${origin}${spec.path}`, deadline))),
    deadline.expired() ? Promise.resolve([]) : Promise.all(candidateUrls.map((url) => fetchUrl(url, deadline))),
    // Ask for the homepage again as each named AI crawler. This is what
    // separates "robots.txt allows GPTBot" from "the server actually serves
    // GPTBot" — a gap that costs sites their entire AI visibility silently.
    probeAsCrawlers(homepage.url, deadline),
  ]);

  const botProbes: Record<string, FetchResult> = {};
  [...LIVE_PROBE_BOTS, CONTROL_BOT].forEach((bot, index) => {
    botProbes[bot.agent] = probeResponses[index];
  });

  const agentArtifacts: Record<string, FetchResult> = {};
  artifactSpecs.forEach((spec, index) => {
    agentArtifacts[spec.key] = artifactResponses[index];
  });

  const keyPages = keyPageResponses
    .filter((result) => {
      // A discontinued page often redirects to a listing or landing page.
      // Judging that page for missing schema would report a gap the site does
      // not have, so drop anything that redirected somewhere not worth
      // sampling. A page that simply failed is kept: Check 6 needs to report
      // the broken page.
      if (result.failure || !result.ok) return true;
      const redirected = stripSlash(result.finalUrl) !== stripSlash(result.requestedUrl);
      return !redirected || isSampleablePage(result.finalUrl, verdict.siteType);
    })
    .map((result) => new HtmlDocument(result));

  const ranOutOfTime = deadline.expired();

  const context: ScanContext = {
    submittedUrl,
    origin,
    domain,
    siteType: verdict.siteType,
    siteTypeConfidence: verdict.confidence,
    siteTypeEvidence: verdict.evidence,
    profile,
    homepage,
    keyPages,
    noKeyPagesFound: candidateUrls.length === 0,
    robotsTxt,
    robots,
    agentArtifacts,
    botProbes,
    sitemapFound: sitemap.found,
    sitemapUrls: sitemap.urls,
    siteName: detectSiteName(homepage, domain),
    deadline,
  };

  // Network-free checks first, so a tight budget costs us the cheapest check
  // rather than the most valuable one.
  const outcomes: CheckOutcome[] = [];
  outcomes.push(checkBotAccess(context));
  outcomes.push(checkAgentInterface(context));

  const structured = resolveStructuredData(context, ranOutOfTime);
  outcomes.push(structured.outcome);
  outcomes.push(checkContentStructure(context));
  outcomes.push(checkMetaRobots(context));

  const crawlability = checkCrawlability(context);
  outcomes.push(crawlability.outcome);

  // Last, because it is the only check that may still make requests.
  outcomes.push(await checkTrustSignals(context));

  const checks: CheckResult[] = CHECK_ORDER.map((checkId) => {
    const outcome = outcomes.find((candidate) => candidate.checkId === checkId);
    // Defensive: a missing outcome would silently drop weight from the score.
    return scoreCheck(outcome ?? unableToVerify(checkId, context.siteType), context.siteType);
  });

  const { score, grade } = totalScore(checks, verdict.siteType);

  return {
    domain,
    submittedUrl,
    siteType: verdict.siteType,
    siteTypeConfidence: verdict.confidence,
    siteTypeEvidence: verdict.evidence,
    siteTypeOverridden: Boolean(options.siteType),
    overallScore: score,
    overallGrade: grade,
    summary: buildSummary(grade, checks, verdict.siteType),
    checks,
    pagesScanned: [homepage.url, ...keyPages.map((page) => page.url)],
    pagesDiscovered: selection.discovered,
    renderMode: crawlability.renderMode,
    scanDurationMs: Date.now() - startedAt,
    jsRenderWarning: crawlability.jsRenderWarning,
    /**
     * "Partial" means the deadline beat us, not that a check did not apply.
     *
     * The comment above said exactly that while the code said something much
     * narrower: it was wired to `structured.timedOut`, so a scan was only ever
     * declared partial when one specific check ran out of time. Seven scans in
     * the database overran the fifteen-second ceiling — one took 25 seconds —
     * and every single one of them recorded `partial: false`. Those reports were
     * built from half-finished crawls and presented as final, which is the worst
     * shape of error we can make: not wrong, but quietly wrong.
     *
     * Asked here, at the end, rather than at the midpoint where `ranOutOfTime`
     * is captured — the trust-signals check still makes requests after that
     * point, so a scan can exhaust its budget between the two.
     */
    partial: deadline.expired() || structured.timedOut,
    noWebsite: false,
    scoringVersion: SCORING_VERSION,
  };
}

/**
 * Check 3 has two "cannot run" cases that must not be scored as failures: a
 * site with no discoverable key pages, and a scan that ran out of time before
 * it could fetch them.
 *
 * Only stores and publications are judged on their subpages — for a local
 * business, a SaaS product or an unclassified site the entity being described
 * is the site itself, so the homepage is enough and this never fires.
 */
function resolveStructuredData(
  context: ScanContext,
  ranOutOfTime: boolean,
): { outcome: CheckOutcome; timedOut: boolean } {
  const judgedOnSubpages = context.siteType === 'ecommerce' || context.siteType === 'content';
  if (!judgedOnSubpages || context.keyPages.length) {
    return { outcome: checkStructuredData(context), timedOut: false };
  }

  /**
   * Out of time before the product pages could be fetched.
   *
   * This has to be checked *before* the homepage fallback below, not after.
   * A store's homepage often carries a Product node for a featured item, and
   * judging that as though it were a product page produces a confident FAIL on
   * a shop whose real product pages are perfect — chumbak.com dropped from B to
   * F this way on the first scan after a cold start, purely because the
   * deadline expired and nobody noticed.
   *
   * We found pages worth checking and could not fetch them. That is "unable to
   * verify", which is the honest answer everywhere else in this file.
   */
  if (ranOutOfTime && !context.noKeyPagesFound) {
    return { outcome: unableToVerify('structured_data', context.siteType), timedOut: true };
  }

  // A single-product or one-page site: the homepage genuinely is the key page.
  const profile = SCHEMA_PROFILES[context.siteType];
  const homepageHasEntity = context.homepage.jsonLd().some((node) => typesOf(node).some((type) => profile.accepts(type)));
  if (homepageHasEntity) return { outcome: checkStructuredData(context), timedOut: false };

  return {
    timedOut: false,
    outcome: {
      checkId: 'structured_data',
      title: `Structured data (${profile.label})`,
      status: 'skipped',
      details: `No ${context.profile.keyPageLabel} could be identified from homepage links or the sitemap, so this check was not run.`,
      humanExplanation:
        `We could not identify any ${context.profile.keyPageLabel} on your site, so we could not check whether they carry structured data. ` +
        'That usually means one of three things: your links are generated by JavaScript, your URLs use an unusual pattern, or those pages do not exist yet. ' +
        'This check has been left out of your score rather than counted against you — but it is worth a manual look, because structured data is the single biggest factor in whether an AI assistant will describe you accurately.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    },
  };
}

/**
 * How many crawler probes go out at once, and how long we pause between waves.
 *
 * All eleven used to leave together. That is a burst no ordinary visitor
 * produces, and a fair number of servers answer the first few and then start
 * returning 429 — which we read back as "this site blocks AI crawlers". We were
 * measuring our own impatience and billing the site owner for it.
 *
 * Four at a time with a short pause is still far quicker than a real crawler
 * would ever be, and it costs about half a second of a fifteen-second budget.
 */
const PROBE_WAVE_SIZE = 4;
const PROBE_WAVE_GAP_MS = 250;
const RATE_LIMIT_BACKOFF_MS = 800;

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask for one page as every named crawler, without hammering the server.
 *
 * A probe that comes back rate-limited is retried once after a longer pause,
 * because the first answer told us about our own request rate and nothing about
 * the crawler. If the retry is rate-limited too, the result carries that fact
 * through to the check, which reports "could not test" rather than "blocked".
 */
async function probeAsCrawlers(url: string, deadline: Deadline): Promise<FetchResult[]> {
  const bots = [...LIVE_PROBE_BOTS, CONTROL_BOT];
  const results: FetchResult[] = [];

  for (let start = 0; start < bots.length; start += PROBE_WAVE_SIZE) {
    if (deadline.expired()) {
      // Out of time. Record the untested ones as such rather than leaving holes
      // the check would have to guess about.
      for (let i = results.length; i < bots.length; i += 1) {
        results.push({ ...EMPTY_PROBE, requestedUrl: url, finalUrl: url, failure: 'deadline_exceeded' });
      }
      break;
    }

    if (start > 0) await pause(PROBE_WAVE_GAP_MS);
    const wave = bots.slice(start, start + PROBE_WAVE_SIZE);
    results.push(...(await Promise.all(wave.map((bot) => fetchUrl(url, deadline, { userAgent: bot.userAgent, maxBytes: PROBE_BODY_BYTES })))));
  }

  const limited = results.map((result, index) => ({ result, index })).filter(({ result }) => result.rateLimited);
  if (limited.length && !deadline.expired()) {
    await pause(RATE_LIMIT_BACKOFF_MS);
    for (const { index } of limited) {
      if (deadline.expired()) break;
      results[index] = await fetchUrl(url, deadline, { userAgent: bots[index].userAgent });
    }
  }

  return results;
}

const EMPTY_PROBE: FetchResult = {
  requestedUrl: '',
  finalUrl: '',
  status: null,
  ok: false,
  headers: {},
  body: null,
  contentType: null,
  failure: null,
  blocked: false,
  rateLimited: false,
  truncated: false,
  durationMs: 0,
};

function titleFor(checkId: CheckId, siteType: SiteType): string {
  if (checkId === 'structured_data') return `Structured data (${SCHEMA_PROFILES[siteType].label})`;
  if (checkId === 'content_structure') return CONTENT_STRUCTURE_TITLE;
  if (checkId === 'agent_interface') return 'Machine-readable agent interface';
  if (checkId === 'bot_access') return 'AI bot access';
  if (checkId === 'trust_signals') return 'Trust and identity pages';
  if (checkId === 'meta_robots') return 'Search & AI indexability';
  return 'Crawlability & response health';
}

type NoWebsiteReason = 'parked' | 'dns' | 'unreachable' | 'timeout' | 'ssl' | 'redirect_loop';

/**
 * Is there anything here to grade at all?
 *
 * Two shapes of nothing, and the first fix only caught one of them. A parked
 * domain answers 200 with a placeholder; an unregistered one does not answer at
 * all. shubhtanna.com does not resolve — no DNS record anywhere — and we gave it
 * F, 35 out of 100, with a lead-capture form under it. That is a confident
 * judgement about a website that has never existed.
 *
 * The general rule is simply: if no page ever reached us, there is nothing to
 * have an opinion about. Every content check would be skipped anyway, so the
 * only score left comes from the handful that pass trivially — which is exactly
 * how a domain that is not registered scored 35.
 */
export function whyNoWebsite(homepage: HtmlDocument): NoWebsiteReason | null {
  if (looksParked(homepage)) return 'parked';

  switch (homepage.failure) {
    case 'dns':
      return 'dns';
    case 'connection_refused':
      return 'unreachable';
    /**
     * `network` is deliberately absent, and so is `too_large`.
     *
     * `network` is the catch-all for everything we could not classify, so
     * routing it here meant any unrecognised transport hiccup declared a domain
     * nonexistent. That is how mastersunion.org — a live business school serving
     * a 4MB homepage over HTTP 200 — was told "nothing answered at this address".
     * Saying a website does not exist is the strongest claim this tool makes and
     * it should rest on evidence, not on the bucket labelled "something else".
     */
    case 'timeout':
      return 'timeout';
    /**
     * `deadline_exceeded` is deliberately absent.
     *
     * It means our own scan budget ran out, not that the site failed to answer.
     * Routing it here told healthy sites they did not exist — the honest result
     * is an ordinary scan that comes back marked partial, saying we ran out of
     * time, which is what actually happened.
     */
    case 'ssl':
      return 'ssl';
    case 'redirect_loop':
      return 'redirect_loop';
    default:
      return null;
  }
}

/**
 * What the reader is told, per cause.
 *
 * Each one says what we observed and what it means, because "we could not
 * check your site" is useless on its own — an expired certificate, a domain
 * that was never pointed anywhere and a server that is merely slow are three
 * completely different problems with three different owners.
 */
function explainNoWebsite(domain: string, reason: NoWebsiteReason): string {
  switch (reason) {
    case 'parked':
      return (
        `${domain} does not appear to have a website on it yet. The address answers, but it returns an almost empty page ` +
        'that forwards visitors to a domain-parking holder rather than serving any content. ' +
        'There is nothing here for an AI assistant — or for us — to read, so we have not given it a score.'
      );
    case 'dns':
      return (
        `${domain} does not exist as far as the internet is concerned — there is no DNS record for it at all, so nothing ` +
        'can connect to it, including us and every AI assistant. Check the spelling; if it is right, the domain is either ' +
        'unregistered or has never been pointed at a server. There is nothing to score until it is.'
      );
    case 'unreachable':
      return (
        `Nothing answered at ${domain}. The address is known, but no server accepted the connection — usually a site that ` +
        'is switched off, between hosts, or pointed at a server that is no longer running. Until it responds there is ' +
        'nothing for us to look at.'
      );
    case 'timeout':
      return (
        `${domain} did not respond in time. That can mean the site is down, or simply very slow — which matters in its own ` +
        'right, because assistants work to a deadline and drop sources that arrive late. Try again in a few minutes: if it ' +
        'answers then, we will give you a real report.'
      );
    case 'ssl':
      return (
        `${domain} has a broken or expired security certificate, so nothing could load it — not a browser, not us, and not ` +
        'an AI assistant. This is worth fixing today whatever else is true of the site, because visitors are seeing a ' +
        'security warning instead of your homepage. Your hosting provider can renew it.'
      );
    case 'redirect_loop':
      return (
        `${domain} sends visitors round in a redirect loop — each address forwards to another that forwards back, so no ` +
        'page is ever delivered. Browsers and AI crawlers both give up at that point. It is usually a misconfigured www ' +
        'or https redirect rule, and until it is untangled there is no page here to read.'
      );
  }
}

/**
 * The result for a domain that has no website to grade.
 *
 * Every check is `skipped`, so nothing is scored out of anything and no letter
 * grade is implied. `noWebsite` is what the report reads to replace the whole
 * score panel with an explanation — a D would say "your website has problems"
 * and an F would say "your website is terrible", when the truth is that there
 * is no website to have an opinion about.
 */
function noWebsiteResult(
  submittedUrl: string,
  domain: string,
  homepage: HtmlDocument,
  startedAt: number,
  reason: NoWebsiteReason,
): ScanResult {
  const checks: CheckResult[] = CHECK_ORDER.map((checkId) =>
    scoreCheck(
      {
        checkId,
        title: titleFor(checkId, 'general'),
        status: 'skipped',
        details: 'Not checked — no website could be read at this address.',
        humanExplanation:
          'There is nothing at this address for us to check yet, so we have not scored it.',
        generatedFix: null,
        generatedFixLanguage: null,
        generatedFixTarget: null,
      },
      'general',
    ),
  );

  return {
    domain,
    submittedUrl,
    siteType: 'general',
    siteTypeConfidence: 'low',
    siteTypeEvidence: ['no website could be read at this address'],
    siteTypeOverridden: false,
    overallScore: 0,
    overallGrade: 'F',
    summary: explainNoWebsite(domain, reason),
    checks,
    pagesScanned: [homepage.url],
    pagesDiscovered: 0,
    renderMode: 'empty_shell',
    scanDurationMs: Date.now() - startedAt,
    jsRenderWarning: false,
    partial: false,
    noWebsite: true,
    scoringVersion: SCORING_VERSION,
  };
}

/** Spec section 8: on timeout, report the remainder as unable to verify. */
function unableToVerify(checkId: CheckId, siteType: SiteType): CheckOutcome {
  return {
    checkId,
    title: titleFor(checkId, siteType),
    status: 'skipped',
    details: 'Unable to verify — the scan hit its time limit before this check could complete.',
    humanExplanation:
      'We ran out of time before finishing this check, usually because the site responded slowly. ' +
      'It has been left out of your score rather than counted against you. Re-run the scan in a few minutes and it will normally complete — and if it keeps timing out, that slowness is itself worth looking at, because crawlers give up on slow sites too.',
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
  };
}

/** robots.txt served as an HTML page means there is no real robots.txt. */
function looksLikeHtml(response: { contentType: string | null; body: string | null }): boolean {
  if (response.contentType && /text\/html/i.test(response.contentType)) return true;
  return Boolean(response.body && /^\s*<(!doctype|html)/i.test(response.body));
}

const stripSlash = (url: string): string => url.replace(/\/+$/, '');

function detectSiteName(homepage: HtmlDocument, domain: string): string {
  const ogSiteName = homepage.$?.('meta[property="og:site_name"]').first().attr('content')?.trim();
  if (ogSiteName) return ogSiteName;

  // Page titles are almost always "Brand – tagline" or "Page | Brand"; the
  // longest-lived segment is the first one.
  const title = homepage.title;
  if (title) {
    const segment = title.split(/[|–—·:]/)[0].trim();
    if (segment.length >= 2 && segment.length <= 60) return segment;
  }

  return domain;
}
