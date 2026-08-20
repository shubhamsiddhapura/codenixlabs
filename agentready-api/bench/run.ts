/**
 * Scan the corpus and hold every verdict against what is actually true.
 *
 * Serial on purpose: running four scans at once starved their own results once
 * already, and a measurement that changes what it measures is worse than none.
 */
import { writeFileSync } from 'fs';
import { runScan } from '../src/services/scanEngine';
import { CORPUS } from './corpus';
import { establishTruth, Truth } from './groundTruth';

interface Row {
  sector: string; domain: string;
  grade: string; score: number; siteType: string; confidence: string;
  pages: number; ms: number; partial: boolean; noWebsite: boolean;
  checks: Record<string, { status: string; awarded: number; possible: number; details: string }>;
  truth: Truth;
  flags: string[];
}

/**
 * Where our verdict contradicts the page itself. Each one is a candidate bug.
 *
 * Rewritten once the scanner outgrew the first version of these rules. Round
 * three still reported 21 contradictions, and most were the harness failing to
 * understand a correct result: a 403 we now deliberately leave unscored, a
 * product-page verdict compared against homepage schema, a site that stalls us
 * and therefore cannot be sampled. A measurement that flags correct behaviour
 * trains you to ignore it, which is exactly the trap the reports themselves
 * kept falling into.
 *
 * Every rule below now states what makes it a genuine contradiction rather than
 * a difference.
 */
function contradictions(r: Row): string[] {
  const f: string[] = [];
  const sd = r.checks.structured_data;
  const bot = r.checks.bot_access;
  const crawl = r.checks.crawlability;
  const t = r.truth;

  // Did we ever actually get the homepage? Almost every rule below depends on it.
  const weGotIn = Boolean(crawl && crawl.status !== 'skipped' && !/never answered|returned HTTP|fetch failed/i.test(crawl.details));

  if (r.noWebsite && t.reachable) f.push(`SAID-NO-WEBSITE but homepage returned ${t.status}`);

  // Scoring a site that refused our ground-truth browser is only wrong if we
  // claimed to have read it. Scoring robots.txt-based checks while openly not
  // scoring the content ones is the behaviour we built on purpose.
  if (!r.noWebsite && !t.reachable && !t.error && weGotIn)
    f.push(`SCORED-AS-READ a site that returned ${t.status} to a browser`);

  // Ground truth reads the homepage; the scanner judges product pages. Only
  // comparable when the homepage is the only thing we looked at.
  if (sd && sd.status === 'fail' && r.pages <= 1 && t.schemaTypes.length > 0)
    f.push(`SCHEMA-FAIL on the homepage which publishes: ${t.schemaTypes.slice(0, 4).join(',')}`);
  if (sd && sd.status === 'pass' && t.schemaTypes.length === 0 && t.reachable && r.pages <= 1)
    f.push('SCHEMA-PASS but the homepage publishes none');

  if (bot && bot.status === 'fail' && !t.robotsBlocksAi && !/server refused|never answered|HTTP 4|HTTP 5/i.test(bot.details))
    f.push('BOT-FAIL but robots.txt does not disallow AI crawlers');
  if (bot && bot.status === 'pass' && t.robotsBlocksAi)
    f.push('BOT-PASS but robots.txt disallows an AI crawler');

  // A crawlability failure is correct when the site served a browser and stalled
  // us — that is the finding. It is only a contradiction if we got in fine.
  if (crawl && crawl.status === 'fail' && weGotIn && t.reachable && t.textChars > 2000)
    f.push(`CRAWL-FAIL although we read the page and it has ${t.textChars} chars`);

  if (r.ms > 21000) f.push(`OVERRAN budget: ${r.ms}ms`);
  if (r.ms > 20000 && !r.partial) f.push('OVERRAN without reporting partial');
  if (r.score > 95) f.push(`SCORE above ceiling: ${r.score}`);
  if (!r.noWebsite && !r.grade.startsWith('THREW') && r.pages <= 1 && t.reachable && weGotIn)
    f.push('SAMPLED only the homepage despite reading it fine');
  return f;
}

(async () => {
  const rows: Row[] = [];
  const all = CORPUS.flatMap((s) => s.sites.map((d) => ({ sector: s.sector, domain: d })));
  console.log(`${all.length} sites across ${CORPUS.length} sectors\n`);

  for (const [i, { sector, domain }] of all.entries()) {
    let row: Row;
    try {
      const [scan, truth] = [await runScan(`https://${domain}`), await establishTruth(domain)];
      const checks: Row['checks'] = {};
      for (const c of scan.checks) checks[c.checkId] = { status: c.status, awarded: c.pointsAwarded, possible: c.pointsPossible, details: c.details };
      row = { sector, domain, grade: scan.overallGrade, score: scan.overallScore, siteType: scan.siteType,
        confidence: scan.siteTypeConfidence, pages: scan.pagesScanned.length, ms: scan.scanDurationMs,
        partial: scan.partial, noWebsite: scan.noWebsite, checks, truth, flags: [] };
      row.flags = contradictions(row);
    } catch (e) {
      row = { sector, domain, grade: 'THREW', score: -1, siteType: '-', confidence: '-', pages: 0, ms: 0,
        partial: false, noWebsite: false, checks: {}, truth: {} as Truth, flags: [`THREW: ${(e as Error).message}`] };
    }
    rows.push(row);
    console.log(`${String(i + 1).padStart(2)}/${all.length} ${sector.padEnd(11)} ${domain.padEnd(24)} ${row.grade}/${String(row.score).padEnd(3)} ${String(row.ms).padStart(6)}ms${row.flags.length ? '  ⚠ ' + row.flags.length : ''}`);
  }

  writeFileSync('bench/results.json', JSON.stringify(rows, null, 2));
  console.log('\n' + '='.repeat(70));
  const flagged = rows.filter((r) => r.flags.length);
  console.log(`${flagged.length} of ${rows.length} sites have at least one contradiction\n`);
  const byKind = new Map<string, string[]>();
  for (const r of flagged) for (const f of r.flags) {
    const kind = f.split(' but ')[0].split(':')[0];
    byKind.set(kind, [...(byKind.get(kind) || []), r.domain]);
  }
  for (const [kind, sites] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${String(sites.length).padStart(2)}x  ${kind.padEnd(42)} ${sites.slice(0, 4).join(', ')}${sites.length > 4 ? ` +${sites.length - 4}` : ''}`);
  process.exit(0);
})();
