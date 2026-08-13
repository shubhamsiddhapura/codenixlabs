import { config } from '../config';
import { SiteType } from '../types';
import { Scan, ScanDoc } from '../models/Scan';
import { runScan } from './scanEngine';
import { SCORING_VERSION, countBlockers, weightsFor } from './scoring';
import { normalizeUrl } from '../utils/url';

/**
 * Persistence and caching around the scan engine.
 *
 * The 6-hour cache does double duty: it keeps a casual visitor from re-scanning
 * the same store on every page refresh, and it stops the tool being used as a
 * free crawling proxy for someone else's site.
 */

export interface ScanOutcome {
  scan: ScanDoc;
  /** True when this came from the cache rather than a fresh crawl. */
  cached: boolean;
}

export async function scanUrl(submittedUrl: string, siteType?: SiteType): Promise<ScanOutcome> {
  const { domain } = normalizeUrl(submittedUrl);

  const cached = await findCachedScan(domain, siteType);
  if (cached) return { scan: cached, cached: true };

  const result = await runScan(submittedUrl, { siteType });

  const scan = await Scan.create({
    domain: result.domain,
    submittedUrl: result.submittedUrl,
    scannedAt: new Date(),
    siteType: result.siteType,
    siteTypeConfidence: result.siteTypeConfidence,
    siteTypeEvidence: result.siteTypeEvidence,
    siteTypeOverridden: result.siteTypeOverridden,
    overallScore: result.overallScore,
    overallGrade: result.overallGrade,
    summary: result.summary,
    checks: result.checks,
    pagesScanned: result.pagesScanned,
    pagesDiscovered: result.pagesDiscovered,
    renderMode: result.renderMode,
    scanDurationMs: result.scanDurationMs,
    jsRenderWarning: result.jsRenderWarning,
    partial: result.partial,
    scoringVersion: result.scoringVersion,
    comparisonScanId: null,
    unlocked: false,
  });

  return { scan, cached: false };
}

async function findCachedScan(domain: string, siteType?: SiteType): Promise<ScanDoc | null> {
  const cutoff = new Date(Date.now() - config.scanner.cacheHours * 60 * 60 * 1000);

  const query: Record<string, unknown> = {
    domain,
    scannedAt: { $gte: cutoff },
    // A partial scan is not worth serving for six hours — the next visitor
    // deserves a real attempt, so only complete scans are cacheable.
    partial: false,
    // Scores are only comparable within one version of the rules, so a scan
    // made under older weights must not be served as if it were current.
    scoringVersion: SCORING_VERSION,
  };

  // A detected scan and an overridden one are different judgements of the same
  // site, so neither may be served in place of the other. Without this, someone
  // pasting a URL cold could be handed a stranger's override — and read a
  // report that opens "you told us this is a SaaS product" when they said no
  // such thing.
  if (siteType) query.siteType = siteType;
  else query.siteTypeOverridden = false;

  return Scan.findOne(query).sort({ scannedAt: -1 }).exec();
}

// --- Response shaping -----------------------------------------------------
//
// Three views of the same scan. The gate in spec section 2 is only real if the
// locked fields never leave the server, so the stripping happens here rather
// than in the client.

const TEASER_CHECK_COUNT = 2;

/**
 * The facts a reader needs to judge whether to believe the number: which rules
 * produced it, what each check was worth, how much of the site was looked at,
 * and how many of the failures are matters of fact rather than of weighting.
 *
 * Shipped with the gated response too. Withholding the methodology behind a
 * score would undercut the one thing that makes it trustworthy.
 */
function auditTrail(scan: ScanDoc): Record<string, unknown> {
  return {
    scoringVersion: scan.scoringVersion || 'unknown',
    weights: weightsFor(scan.siteType),
    blockingIssues: countBlockers(scan.checks),
    pagesChecked: scan.pagesScanned.length,
    pagesDiscovered: Math.max(scan.pagesDiscovered, scan.pagesScanned.length - 1),
    renderMode: scan.renderMode,
    siteTypeOverridden: scan.siteTypeOverridden,
    method: 'Static HTML only — no JavaScript is executed. Checks that could not be verified are excluded from the score rather than counted as zero.',
  };
}

export function toFullScan(scan: ScanDoc): Record<string, unknown> {
  return {
    scanId: String(scan._id),
    domain: scan.domain,
    submittedUrl: scan.submittedUrl,
    scannedAt: scan.scannedAt,
    siteType: scan.siteType,
    siteTypeConfidence: scan.siteTypeConfidence,
    siteTypeEvidence: scan.siteTypeEvidence,
    overallScore: scan.overallScore,
    overallGrade: scan.overallGrade,
    summary: scan.summary,
    checks: scan.checks.map((check) => ({
      checkId: check.checkId,
      title: check.title,
      status: check.status,
      pointsAwarded: check.pointsAwarded,
      pointsPossible: check.pointsPossible,
      details: check.details,
      humanExplanation: check.humanExplanation,
      generatedFix: check.generatedFix,
      generatedFixLanguage: check.generatedFixLanguage,
      generatedFixTarget: check.generatedFixTarget,
      locked: false,
    })),
    pagesScanned: scan.pagesScanned,
    scanDurationMs: scan.scanDurationMs,
    jsRenderWarning: scan.jsRenderWarning,
    partial: scan.partial,
    audit: auditTrail(scan),
    comparisonScanId: scan.comparisonScanId ? String(scan.comparisonScanId) : null,
    unlocked: true,
  };
}

/** Every check and its verdict, but no explanations and no generated fixes. */
export function toGatedScan(scan: ScanDoc): Record<string, unknown> {
  return {
    scanId: String(scan._id),
    domain: scan.domain,
    submittedUrl: scan.submittedUrl,
    scannedAt: scan.scannedAt,
    siteType: scan.siteType,
    siteTypeConfidence: scan.siteTypeConfidence,
    siteTypeEvidence: scan.siteTypeEvidence,
    overallScore: scan.overallScore,
    overallGrade: scan.overallGrade,
    summary: scan.summary,
    checks: scan.checks.map((check) => ({
      checkId: check.checkId,
      title: check.title,
      status: check.status,
      pointsAwarded: check.pointsAwarded,
      pointsPossible: check.pointsPossible,
      details: check.details,
      humanExplanation: null,
      generatedFix: null,
      generatedFixLanguage: check.generatedFixLanguage,
      generatedFixTarget: null,
      locked: true,
    })),
    pagesScanned: scan.pagesScanned,
    scanDurationMs: scan.scanDurationMs,
    jsRenderWarning: scan.jsRenderWarning,
    partial: scan.partial,
    audit: auditTrail(scan),
    comparisonScanId: scan.comparisonScanId ? String(scan.comparisonScanId) : null,
    unlocked: false,
    fixesAvailable: countFixes(scan),
  };
}

/** Grade, summary and the first two checks — what a visitor sees for free. */
export function toTeaser(scan: ScanDoc, cached: boolean): Record<string, unknown> {
  return {
    scanId: String(scan._id),
    domain: scan.domain,
    // Shown in the teaser: "we scanned this as an online store" is the first
    // thing a visitor sanity-checks, and getting it visibly wrong is better
    // than getting it invisibly wrong.
    siteType: scan.siteType,
    siteTypeConfidence: scan.siteTypeConfidence,
    siteTypeOverridden: scan.siteTypeOverridden,
    audit: auditTrail(scan),
    overallGrade: scan.overallGrade,
    overallScore: scan.overallScore,
    summary: scan.summary,
    teaserChecks: scan.checks.slice(0, TEASER_CHECK_COUNT).map((check) => ({
      checkId: check.checkId,
      title: check.title,
      status: check.status,
      details: check.details,
      locked: false,
    })),
    lockedChecks: Math.max(0, scan.checks.length - TEASER_CHECK_COUNT),
    // Named in the teaser on purpose: "we generated the code to fix this" is
    // the strongest reason a visitor has to hand over an email (spec 3a).
    fixesAvailable: countFixes(scan),
    jsRenderWarning: scan.jsRenderWarning,
    partial: scan.partial,
    scanDurationMs: scan.scanDurationMs,
    cached,
  };
}

export function countFixes(scan: ScanDoc): number {
  return scan.checks.filter((check) => Boolean(check.generatedFix)).length;
}
