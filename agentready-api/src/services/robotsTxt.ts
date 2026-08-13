/**
 * A small robots.txt parser.
 *
 * Hand-rolled rather than pulled from npm because we need more than a yes/no
 * answer: the report has to tell a shop owner *which line* in *which group* is
 * blocking *which bot*, and generate the corrected file. Off-the-shelf parsers
 * answer "is this URL allowed" and throw the provenance away.
 *
 * Semantics implemented (per the robots.txt spec as Google and OpenAI apply it):
 *  - Consecutive `User-agent` lines start a group; the rules that follow apply
 *    to all of them.
 *  - A bot obeys the group whose user-agent token matches its name exactly
 *    (case-insensitive). Only if no such group exists does it fall back to `*`.
 *    Rules are NOT merged across groups.
 *  - Within a group the longest matching rule wins; `Allow` beats `Disallow`
 *    when both match at the same length.
 *  - `Disallow:` with an empty value means "allow everything".
 *  - `*` and `$` wildcards are supported in paths.
 */

export interface RobotsRule {
  type: 'allow' | 'disallow';
  path: string;
  /** 1-based line number in the original file, so the report can cite it. */
  line: number;
}

export interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** True when the file had no parsable directives at all (e.g. an HTML 404 page). */
  empty: boolean;
}

export function parseRobotsTxt(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];

  let current: RobotsGroup | null = null;
  // A `User-agent` line right after another one extends the same group; one
  // after a rule line starts a new group.
  let lastWasUserAgent = false;
  let directives = 0;

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const withoutComment = lines[i].split('#')[0].trim();
    if (!withoutComment) continue;

    const separator = withoutComment.indexOf(':');
    if (separator === -1) continue;

    const field = withoutComment.slice(0, separator).trim().toLowerCase();
    const value = withoutComment.slice(separator + 1).trim();

    if (field === 'user-agent') {
      directives += 1;
      if (!current || !lastWasUserAgent) {
        current = { userAgents: [], rules: [] };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
      lastWasUserAgent = true;
      continue;
    }

    if (field === 'sitemap') {
      directives += 1;
      if (value) sitemaps.push(value);
      // Sitemap is a file-level directive; it does not close or open a group.
      continue;
    }

    if (field === 'allow' || field === 'disallow') {
      directives += 1;
      lastWasUserAgent = false;
      // Rules before any User-agent line are not addressed to anyone; treat
      // them as belonging to an implicit `*` group, which is how crawlers that
      // tolerate the mistake read it.
      if (!current) {
        current = { userAgents: ['*'], rules: [] };
        groups.push(current);
      }
      current.rules.push({ type: field, path: value, line: i + 1 });
      continue;
    }

    // Crawl-delay, Host, and anything else: ignored, but they do end a
    // user-agent run.
    lastWasUserAgent = false;
  }

  return { groups, sitemaps, empty: directives === 0 };
}

/** The group a given bot would obey: exact user-agent match, else `*`, else none. */
export function groupFor(robots: ParsedRobots, userAgent: string): RobotsGroup | null {
  const needle = userAgent.toLowerCase();

  const exact = robots.groups.filter((group) => group.userAgents.includes(needle));
  if (exact.length) return mergeGroups(exact);

  const wildcard = robots.groups.filter((group) => group.userAgents.includes('*'));
  if (wildcard.length) return mergeGroups(wildcard);

  return null;
}

/**
 * A file may repeat the same user-agent in several blocks. Crawlers treat those
 * as one group, so flatten them before matching.
 */
function mergeGroups(groups: RobotsGroup[]): RobotsGroup {
  if (groups.length === 1) return groups[0];
  return {
    userAgents: groups[0].userAgents,
    rules: groups.flatMap((group) => group.rules),
  };
}

function ruleMatches(rulePath: string, target: string): boolean {
  // An empty Disallow value means "nothing is disallowed"; it never matches.
  if (rulePath === '') return false;

  const anchoredEnd = rulePath.endsWith('$');
  const pattern = anchoredEnd ? rulePath.slice(0, -1) : rulePath;

  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');

  const regex = new RegExp(`^${escaped}${anchoredEnd ? '$' : ''}`);
  return regex.test(target);
}

export interface RobotsDecision {
  allowed: boolean;
  /** The rule that decided it, or null when nothing matched (default: allowed). */
  rule: RobotsRule | null;
}

/** Would `userAgent` be allowed to fetch `path` (path + query, e.g. "/products/x")? */
export function isAllowed(robots: ParsedRobots, userAgent: string, path: string): RobotsDecision {
  const group = groupFor(robots, userAgent);
  if (!group) return { allowed: true, rule: null };

  let winner: RobotsRule | null = null;

  for (const rule of group.rules) {
    if (!ruleMatches(rule.path, path)) continue;
    if (!winner) {
      winner = rule;
      continue;
    }
    if (rule.path.length > winner.path.length) {
      winner = rule;
    } else if (rule.path.length === winner.path.length && rule.type === 'allow') {
      // Equally specific: Allow wins, matching Google's tie-break.
      winner = rule;
    }
  }

  if (!winner) return { allowed: true, rule: null };
  return { allowed: winner.type === 'allow', rule: winner };
}

/**
 * True when the site root is disallowed for this bot. Not the same as "shut out
 * entirely" — `Disallow: /` paired with `Allow: /products/` blocks the root but
 * leaves product pages reachable — so callers that care about product reach
 * should also test the real product paths with `isAllowed`.
 */
export function blocksRoot(robots: ParsedRobots, userAgent: string): boolean {
  return !isAllowed(robots, userAgent, '/').allowed;
}
