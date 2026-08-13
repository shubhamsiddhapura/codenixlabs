/**
 * Response shapes from the AI Readiness API (agentready-api/).
 *
 * Hand-written rather than shared through a package: the API deploys
 * separately, and a type that drifts is easier to spot in one short file than
 * inside a build step.
 */

export type CheckId =
  | 'bot_access'
  | 'agent_interface'
  | 'structured_data'
  | 'content_structure'
  | 'trust_signals'
  | 'meta_robots'
  | 'crawlability';

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'skipped';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type SiteType = 'ecommerce' | 'content' | 'saas' | 'local_business' | 'general';
export type Confidence = 'high' | 'medium' | 'low';
export type FixLanguage = 'robots' | 'json' | 'html' | 'markdown';
export type RenderMode = 'server_rendered' | 'payload_only' | 'empty_shell';

/**
 * Everything a reader needs to judge whether to believe the score — the weight
 * table, the rules version, how much of the site was looked at. Shipped even
 * with the gated response, because withholding the method would undercut the
 * one thing that makes a number trustworthy.
 */
export interface AuditTrail {
  scoringVersion: string;
  weights: Record<CheckId, number>;
  /** Failures that are matters of fact, not of weighting. */
  blockingIssues: number;
  pagesChecked: number;
  pagesDiscovered: number;
  renderMode: RenderMode;
  siteTypeOverridden: boolean;
  method: string;
}

export interface ScanCheck {
  checkId: CheckId;
  title: string;
  status: CheckStatus;
  pointsAwarded: number;
  pointsPossible: number;
  details: string;
  /** null until the report is unlocked. */
  humanExplanation: string | null;
  generatedFix: string | null;
  generatedFixLanguage: FixLanguage | null;
  /** Exactly where the block goes — a file path, or a place in the page. */
  generatedFixTarget: string | null;
  locked: boolean;
}

export interface TeaserScan {
  scanId: string;
  domain: string;
  siteType: SiteType;
  siteTypeConfidence: Confidence;
  siteTypeOverridden: boolean;
  audit: AuditTrail;
  overallGrade: Grade;
  overallScore: number;
  summary: string;
  teaserChecks: Pick<ScanCheck, 'checkId' | 'title' | 'status' | 'details' | 'locked'>[];
  lockedChecks: number;
  fixesAvailable: number;
  jsRenderWarning: boolean;
  partial: boolean;
  scanDurationMs: number;
  cached: boolean;
}

export interface FullScan {
  scanId: string;
  domain: string;
  submittedUrl: string;
  scannedAt: string;
  siteType: SiteType;
  siteTypeConfidence: Confidence;
  siteTypeEvidence: string[];
  siteTypeOverridden: boolean;
  audit: AuditTrail;
  overallScore: number;
  overallGrade: Grade;
  summary: string;
  checks: ScanCheck[];
  pagesScanned: string[];
  scanDurationMs: number;
  jsRenderWarning: boolean;
  partial: boolean;
  comparisonScanId: string | null;
  unlocked: boolean;
  fixesAvailable?: number;
}

/**
 * The exact wording a visitor agrees to, defined once.
 *
 * Rendered as the checkbox label *and* sent to the API to be stored verbatim
 * with the lead. Keeping one constant is what makes those two identical — a
 * consent record that does not match what was on screen evidences nothing, and
 * wording drifts the moment the two live in separate files.
 */
export const CONSENT_TEXT =
  'I agree that Codenix Labs may email me this report and contact me on WhatsApp about fixing what it finds. You can ask us to delete your details at any time.';

/** Which form the consent came from, so a second capture point stays distinct. */
export const CONSENT_SOURCE = 'ai-readiness-gate';

export interface LeadInput {
  name: string;
  email: string;
  whatsapp: string;
  /** DPDP Act 2023 requires a clear affirmative action before we may contact them. */
  consent: boolean;
  consentText: string;
  consentSource: string;
}

export interface UnlockResult {
  scan: FullScan;
  emailed: boolean;
}

export interface ComparisonResult {
  yourScan: FullScan;
  competitorScan: FullScan;
}

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  ecommerce: 'online store',
  content: 'content or publishing site',
  saas: 'software or SaaS product',
  local_business: 'local business',
  general: 'website',
};

export const GRADE_COLOUR: Record<Grade, string> = {
  A: '#00E676',
  B: '#00F5D4',
  C: '#FFD600',
  D: '#FF9100',
  F: '#FF5252',
};

export const STATUS_STYLE: Record<CheckStatus, { label: string; text: string; bg: string; ring: string }> = {
  pass: { label: 'Pass', text: 'text-success', bg: 'bg-success/10', ring: 'ring-success/30' },
  warning: { label: 'Needs work', text: 'text-warning', bg: 'bg-warning/10', ring: 'ring-warning/30' },
  fail: { label: 'Fail', text: 'text-error', bg: 'bg-error/10', ring: 'ring-error/30' },
  skipped: { label: 'Not scored', text: 'text-neutral-400', bg: 'bg-white/5', ring: 'ring-white/10' },
};
