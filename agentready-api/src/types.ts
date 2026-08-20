/**
 * Shared types for the scan engine.
 *
 * These mirror the Scan document in the build spec (section 6) with three
 * documented additions:
 *
 *  - `status` gains a `"skipped"` member. The spec asks for two behaviours that
 *    have no home in pass/warning/fail: "no product pages found → skip Check 3"
 *    (section 8) and "on timeout, mark the rest as unable to verify" (also
 *    section 8). Calling either of those a `fail` would invent points against a
 *    store for something we never actually observed. A skipped check scores
 *    0/0 and the final percentage is normalised over the points that were
 *    genuinely in play — see services/scoring.ts.
 *
 *  - `partial` on the scan, true when the deadline cut a scan short. The report
 *    needs to say so out loud rather than presenting a half-run scan as final.
 *
 *  - `siteType`. The spec scoped Phase 1 to online stores, but the tool is used
 *    on whatever URL a visitor pastes. Three of the six checks are meaningless
 *    against a clinic, a blog or a SaaS product if they only ever look for
 *    Product schema and a returns policy, so each scan first works out what
 *    kind of site it is and judges it against the right expectations. See
 *    services/siteType.ts.
 */

export type CheckId =
  | 'bot_access'
  /**
   * Named `ucp_manifest` in the spec. Renamed because the check no longer only
   * looks for a commerce manifest: on a non-store site the equivalent artefact
   * is llms.txt, an MCP descriptor or an OpenAPI document. Same slot, same
   * question — "is there anything here an AI agent can talk to?"
   */
  | 'agent_interface'
  | 'structured_data'
  /**
   * Whether a model can parse and attribute the page: one canonical URL, a
   * heading hierarchy it can chunk, alt text, semantic landmarks, and Open
   * Graph tags. Distinct from `structured_data`, which is about the facts
   * themselves rather than the shape they sit in.
   */
  | 'content_structure'
  | 'trust_signals'
  | 'meta_robots'
  | 'crawlability';

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'skipped';

/**
 * What kind of site this is. Decides the weights, the schema.org type we expect,
 * which trust pages are required, and which pages get sampled.
 */
export type SiteType = 'ecommerce' | 'content' | 'saas' | 'local_business' | 'general';

export type Confidence = 'high' | 'medium' | 'low';

export interface SiteTypeVerdict {
  siteType: SiteType;
  confidence: Confidence;
  /** Human-readable signals behind the call, shown in the report. */
  evidence: string[];
}

export interface CheckResult {
  checkId: CheckId;
  /** Short human label, e.g. "AI bot access". Saves the frontend a lookup table. */
  title: string;
  status: CheckStatus;
  pointsAwarded: number;
  pointsPossible: number;
  /** Machine-readable detail, e.g. which bots were blocked. */
  details: string;
  /** Plain-English "why this matters + how to fix", written for a site owner. */
  humanExplanation: string;
  /** Ready-to-paste code block, or null when this check has no generatable fix. */
  generatedFix: string | null;
  /** Language hint for syntax highlighting the fix block in the UI. */
  generatedFixLanguage: FixLanguage | null;
  /**
   * Exactly where the block goes — a file path or a place in the page.
   *
   * Held separately from the code because a visitor forwards the block to
   * whoever maintains their site, and JSON cannot carry a comment saying
   * "save this at /.well-known/ucp". A fix nobody knows where to put is not a
   * fix.
   */
  generatedFixTarget: string | null;
  /**
   * Per-crawler access, for the bot-access check only.
   *
   * We already work all of this out — eleven crawlers judged against robots.txt,
   * three of them plus a control asked for the homepage directly — and then
   * throw it away into a single sentence. A visitor cannot check a sentence.
   * A table naming each assistant and how we decided is inspectable, and it is
   * the one part of the report someone can verify against their own server logs.
   */
  agentAccess?: AgentAccessRow[];
}

export type AgentAccessStatus =
  /** robots.txt permits it, and where we tested live, the server served it. */
  | 'allowed'
  /** A rule in robots.txt disallows it. */
  | 'blocked_robots'
  /** robots.txt permits it but the server refused the live request. */
  | 'blocked_server';

export interface AgentAccessRow {
  /** The user-agent token, e.g. GPTBot. */
  agent: string;
  /** What that crawler is, in the words a site owner uses. */
  label: string;
  status: AgentAccessStatus;
  /** True when this row comes from an actual request rather than a file. */
  liveTested: boolean;
  /** The rule or status code behind the verdict, when there is one. */
  detail: string | null;
}

export type FixLanguage = 'robots' | 'json' | 'html' | 'markdown';

/** What a check implementation returns; scoring fills in the points. */
export type CheckOutcome = Omit<CheckResult, 'pointsAwarded' | 'pointsPossible'>;

/**
 * How the page's content reached us.
 *
 * These three cases used to collapse into one "JS render" warning, but they
 * need different advice: one is fine, one is a markup problem, one is a
 * rendering problem.
 */
export type RenderMode =
  /** The content was in the HTML the server sent. Nothing to do. */
  | 'server_rendered'
  /**
   * The content *is* in the response, but inside an inline JSON blob
   * (`__NEXT_DATA__`, `__NUXT__`, an initial-state object) rather than in
   * readable markup. A crawler that only reads tags sees an empty page even
   * though the words are technically there.
   */
  | 'payload_only'
  /** Nothing usable in the response at all — the content needs JS to fetch. */
  | 'empty_shell';

export interface ScanResult {
  domain: string;
  submittedUrl: string;
  siteType: SiteType;
  siteTypeConfidence: Confidence;
  siteTypeEvidence: string[];
  /** True when the visitor told us what kind of site this is. */
  siteTypeOverridden: boolean;
  overallScore: number;
  overallGrade: Grade;
  summary: string;
  checks: CheckResult[];
  pagesScanned: string[];
  /** How many pages we found worth checking, before the sample was capped. */
  pagesDiscovered: number;
  renderMode: RenderMode;
  scanDurationMs: number;
  jsRenderWarning: boolean;
  /** True when the 15s deadline cut the scan short. */
  partial: boolean;
  /**
   * No website could be read at this address — parked, unregistered, offline,
   * or behind a broken certificate.
   *
   * Kept separate from every other outcome because it is not a degree of
   * badness. A grade would say "your website has problems"; the truth is that
   * there is no website to have an opinion about, and the report replaces the
   * score entirely when this is set.
   */
  noWebsite: boolean;
  /**
   * The site exists and answered, but refused us everything we asked for, so no
   * check could actually run.
   *
   * Distinct from `noWebsite`, which means there is nothing there at all. Here
   * there is plainly a website — croma.com serves its customers perfectly — and
   * we simply were not allowed to look at it. Without this the score fell
   * through to F, 0 out of 100, because zero points were in play; an F is a
   * claim about a website, and we never saw one.
   *
   * Worth knowing what the alternative looks like: a competitor scanner gave
   * croma.com 71/100 while its own screenshot showed an "Access Denied" page,
   * and gave healthkart.com 58/100 over a "Performing security verification"
   * screen. A 403 page has a title and its robots.txt reads fine, so a scanner
   * that never asks "did I get the real page?" produces a plausible number for
   * a page that is not the site. Refusing to score is the right call — printing
   * F/0 while doing so was not.
   */
  unreadable: boolean;
  /**
   * Which scoring rules produced this number. Stamped on every scan so two
   * scores are only ever compared when they were produced the same way, and so
   * a change to the weights is visible rather than silent.
   */
  scoringVersion: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
