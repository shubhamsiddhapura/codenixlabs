import { CheckId, CheckOutcome, CheckResult, CheckStatus, Grade, SiteType } from '../types';
import { SITE_PROFILES } from './siteType';

/**
 * Weights come from the site profile, not a single global table.
 *
 * The ecommerce row is the spec's, unchanged (20/15/30/15/10/10). The other
 * site types redistribute the same 100 points according to what actually
 * decides whether an assistant can use that kind of site — see
 * services/siteType.ts for the reasoning per type.
 */
export function weightsFor(siteType: SiteType): Record<CheckId, number> {
  return SITE_PROFILES[siteType].weights;
}

export const TOTAL_POINTS = 100;

/**
 * Bumped whenever the weights, the grade boundaries or a pass/fail threshold
 * changes. Stamped on every scan.
 *
 * The weights below are a judgement about what matters most, not a measurement
 * — nobody has published outcome data linking these signals to being cited by
 * an assistant. Versioning them is the honest compromise: it does not make them
 * objective, but it makes them fixed, comparable over time, and visibly changed
 * when they change. A before/after score is only meaningful within one version.
 */
export const SCORING_VERSION = '1.6.0';

/**
 * Checks whose failure is not a matter of opinion.
 *
 * If a crawler is disallowed, the page does not return, or the page tells
 * search engines to ignore it, the site is not "scoring badly" — it is
 * invisible, and no weighting scheme would change that. Reporting these
 * separately gives the visitor a number that carries no judgement at all,
 * alongside the weighted score that does.
 */
const BLOCKING_CHECKS: CheckId[] = ['bot_access', 'crawlability', 'meta_robots'];

export function isBlocking(checkId: CheckId): boolean {
  return BLOCKING_CHECKS.includes(checkId);
}

/** Hard blockers currently failing — objective, regardless of the weights. */
export function countBlockers(checks: CheckResult[]): number {
  return checks.filter((check) => check.status === 'fail' && isBlocking(check.checkId)).length;
}

const MULTIPLIER: Record<CheckStatus, number> = {
  pass: 1,
  warning: 0.5,
  fail: 0,
  // A skipped check scores nothing out of nothing — see `totalScore` below.
  skipped: 0,
};

export function scoreCheck(outcome: CheckOutcome, siteType: SiteType): CheckResult {
  const possible = outcome.status === 'skipped' ? 0 : weightsFor(siteType)[outcome.checkId];
  return {
    ...outcome,
    pointsPossible: possible,
    pointsAwarded: possible * MULTIPLIER[outcome.status],
  };
}

export interface Scored {
  score: number;
  grade: Grade;
  /** True when some checks were skipped and the score was normalised. */
  normalised: boolean;
}

/**
 * Total a set of scored checks into a 0-100 score and a letter grade.
 *
 * When a check could not be run — no key pages to test structured data on, or
 * the deadline expired before it finished — the score is taken over the points
 * that were actually in play rather than out of a flat 100. Scoring a skipped
 * check as zero would mean a small site with no discoverable subpages could not
 * exceed 70 no matter how good it is, which would be reporting our own blind
 * spot as their failure.
 */
export function totalScore(checks: CheckResult[]): Scored {
  const possible = checks.reduce((sum, check) => sum + check.pointsPossible, 0);
  const awarded = checks.reduce((sum, check) => sum + check.pointsAwarded, 0);

  // Nothing ran at all: no basis for a score, so report the floor rather than
  // dividing by zero.
  if (possible === 0) return { score: 0, grade: 'F', normalised: true };

  const score = Math.round((awarded / possible) * 100);
  return { score, grade: toGrade(score), normalised: possible !== TOTAL_POINTS };
}

export function toGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Checks that should have been scored and could not be.
 *
 * Excludes anything weighted zero on purpose — llms.txt is "not scored" for
 * most site types by design, and counting it here would make every ordinary
 * scan look half-blind.
 */
function unverifiedCount(checks: CheckResult[], siteType: SiteType): number {
  const weights = weightsFor(siteType);
  return checks.filter((check) => check.status === 'skipped' && weights[check.checkId] > 0).length;
}

/** The one-line summary shown next to the grade in the free teaser. */
export function buildSummary(grade: Grade, checks: CheckResult[], siteType: SiteType): string {
  const failed = checks.filter((check) => check.status === 'fail');
  const warned = checks.filter((check) => check.status === 'warning');
  const noun = SITE_PROFILES[siteType].label;

  /**
   * A grade drawn from two checks is not the same claim as a grade drawn from
   * seven, and the letter alone cannot tell them apart.
   *
   * Removing unverifiable checks from the total is the right call — we will not
   * charge anyone for our own blind spots — but it cuts both ways: a site that
   * blocked us scored a confident B off two checks, and nothing in the sentence
   * next to that B admitted how little we had actually seen. Saying it here is
   * the other half of that honesty.
   */
  const unverified = unverifiedCount(checks, siteType);
  if (unverified >= 3) {
    const scored = checks.length - unverified;
    return (
      `We could only verify ${scored} of ${checks.length} checks on your ${noun} — the rest we could not see, ` +
      `so this grade reflects a narrow view rather than a clean bill of health. ` +
      `What we could check, you ${failed.length ? 'did not pass' : warned.length ? 'mostly passed' : 'passed'}.`
    );
  }

  if (grade === 'A') {
    return warned.length
      ? `AI assistants can read and recommend your ${noun} — a couple of small gaps left to close.`
      : `AI assistants can read, understand and recommend your ${noun}. You are ahead of almost everyone.`;
  }

  const headline = failed[0] || warned[0];
  const problem = headline ? headline.title.toLowerCase() : 'several areas';
  // Count failures and warnings together. A site can land on C or D with no
  // outright failures at all, and "0 serious issues to fix" next to a C reads
  // as a broken report.
  const issues = failed.length + warned.length;
  const plural = issues === 1 ? '' : 's';

  if (grade === 'B') {
    return `Mostly readable to AI assistants, but ${issues} issue${plural} ${issues === 1 ? 'is' : 'are'} holding you back — starting with ${problem}.`;
  }
  if (grade === 'C') {
    return `AI assistants can find your ${noun} but struggle to understand it. ${issues} issue${plural} to fix, beginning with ${problem}.`;
  }
  if (grade === 'D') {
    return `AI assistants are largely unable to work with your ${noun} right now — ${problem} is the first of ${issues} thing${plural} to fix.`;
  }
  return `AI assistants effectively cannot see your ${noun} today. ${issues} of ${checks.length} checks need work, starting with ${problem}.`;
}
