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
export const SCORING_VERSION = '1.7.0';

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
/**
 * The highest score a scan can award, and why it is not 100.
 *
 * A crawl can establish that an assistant is *able* to read you. It cannot
 * establish that one actually names you — and that is the question a site owner
 * really has. Five points are held back for what this method structurally
 * cannot see:
 *
 *   - whether ChatGPT, Claude or Perplexity in fact cite you in an answer
 *   - anything that only appears once JavaScript has run, which we do not render
 *   - the rest of your site: we sample about five pages, not all of them
 *   - the 19 further signals catalogued for later phases that Phase 1 does not run
 *
 * This is a statement about the method, not a penalty against the site, and it
 * is published in the weights table with everything else. A tool that hands out
 * flawless marks reads as a sales gimmick — but the fix for that is to be honest
 * about the ceiling, never to shave a few points off in secret and hope nobody
 * asks how the number was reached.
 */
export const SCAN_CEILING = 95;

/**
 * The best grade available when part of the assessment could not run.
 *
 * flipkart.com blocks our scanner, so the structured-data check — the heaviest
 * one — could not be read. We do not score a skipped check as zero, because
 * that would charge a site for our blind spot. But excluding it from the total
 * meant the remaining checks averaged to a perfect result, and Flipkart came out
 * A/100: a top grade off roughly seventy per cent of an examination.
 *
 * An A says "we looked at everything and it is excellent". When we did not look
 * at everything, we may not say that.
 */
const GRADE_FLOOR: Record<Grade, number> = { A: 90, B: 75, C: 60, D: 40, F: 0 };

/**
 * How far the grade may reach, given how much of the assessment actually ran.
 *
 * One blind spot is not the same as six. flipkart.com blocks our scanner so
 * thoroughly that only the bot-access check completes — capping that at B still
 * presents a confident verdict drawn from one seventh of the examination. The
 * ceiling drops as the blind spots multiply, so the letter degrades in step with
 * how little we could see rather than falling off one cliff.
 */
function ceilingFor(unverified: number): Grade {
  if (unverified === 0) return 'A';
  if (unverified <= 2) return 'B';
  return 'C';
}

export function totalScore(checks: CheckResult[], siteType: SiteType = 'general'): Scored {
  const possible = checks.reduce((sum, check) => sum + check.pointsPossible, 0);
  const awarded = checks.reduce((sum, check) => sum + check.pointsAwarded, 0);

  // Nothing ran at all: no basis for a score, so report the floor rather than
  // dividing by zero.
  if (possible === 0) return { score: 0, grade: 'F', normalised: true };

  /**
   * The grade comes from the percentage, the number from the ceiling.
   *
   * Deriving the letter from the already-scaled number would move every
   * boundary down by five points at once — a site that earns 90% of what we
   * measured would drop from A to B for no reason but a change in presentation.
   * That is a silent recalibration of everyone's result, and the opposite of
   * what this change is for. The rules for earning an A are exactly what they
   * were; only the top of the printed scale has moved.
   */
  const percent = (awarded / possible) * 100;
  const unverified = unverifiedCount(checks, siteType);

  const measured = Math.round((percent / 100) * SCAN_CEILING);
  const grade = toGrade(percent);

  if (unverified === 0) return { score: measured, grade, normalised: possible !== TOTAL_POINTS };

  // Cap the number alongside the letter. Leaving 95 on screen under a B would
  // read as a bug in the report rather than a limit on what we examined.
  const cappedGrade = capGrade(grade, ceilingFor(unverified));
  // One point under the floor of the next grade up, scaled — so the number and
  // the letter agree instead of the report appearing to contradict itself.
  const nextGradeUp = GRADE_ORDER[GRADE_ORDER.indexOf(cappedGrade) + 1] ?? 'A';
  const ceiling = Math.round(((GRADE_FLOOR[nextGradeUp] - 1) / 100) * SCAN_CEILING);

  return {
    score: cappedGrade === grade ? measured : Math.min(measured, ceiling),
    grade: cappedGrade,
    normalised: possible !== TOTAL_POINTS,
  };
}

const GRADE_ORDER: Grade[] = ['F', 'D', 'C', 'B', 'A'];

function capGrade(grade: Grade, ceiling: Grade): Grade {
  return GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(ceiling) ? ceiling : grade;
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
