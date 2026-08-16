import { config } from '../config';
import { CheckId, CheckOutcome, CheckResult, ScanResult, SiteType } from '../types';
import { Deadline, FetchResult, fetchUrl, fetchWithHttpFallback } from './fetcher';
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
import { checkCrawlability } from './checks/crawlability';

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
    Promise.all(
      [...LIVE_PROBE_BOTS, CONTROL_BOT].map((bot) => fetchUrl(homepage.url, deadline, { userAgent: bot.userAgent })),
    ),
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

  const { score, grade } = totalScore(checks);

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
    // "Partial" means the deadline beat us, not that a check did not apply.
    // A site with no discoverable subpages gets a complete, cacheable scan;
    // only a timed-out one is worth re-running.
    partial: structured.timedOut,
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

function titleFor(checkId: CheckId, siteType: SiteType): string {
  if (checkId === 'structured_data') return `Structured data (${SCHEMA_PROFILES[siteType].label})`;
  if (checkId === 'content_structure') return CONTENT_STRUCTURE_TITLE;
  if (checkId === 'agent_interface') return 'Machine-readable agent interface';
  if (checkId === 'bot_access') return 'AI bot access';
  if (checkId === 'trust_signals') return 'Trust and identity pages';
  if (checkId === 'meta_robots') return 'Search & AI indexability';
  return 'Crawlability & response health';
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
