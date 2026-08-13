import { ScanDoc } from '../models/Scan';
import { config } from '../config';

/**
 * The full report as standalone HTML.
 *
 * Used for both the emailed report and GET /api/scan/:id/report, so it is
 * table-based with inline styles only — email clients strip <style> blocks and
 * ignore flexbox, and a report that renders as a wall of unstyled text in Gmail
 * undoes the point of sending it.
 */

const GRADE_COLOURS: Record<string, string> = {
  A: '#059669',
  B: '#65a30d',
  C: '#d97706',
  D: '#ea580c',
  F: '#dc2626',
};

/** How the report names each site type. Matches the profile labels. */
const SITE_TYPE_LABELS: Record<string, string> = {
  ecommerce: 'online store',
  content: 'content / publishing site',
  saas: 'software or SaaS product',
  local_business: 'local business',
  general: 'website',
};

const STATUS_STYLES: Record<string, { label: string; colour: string; background: string }> = {
  pass: { label: 'PASS', colour: '#065f46', background: '#d1fae5' },
  warning: { label: 'NEEDS WORK', colour: '#92400e', background: '#fef3c7' },
  fail: { label: 'FAIL', colour: '#991b1b', background: '#fee2e2' },
  skipped: { label: 'NOT CHECKED', colour: '#374151', background: '#e5e7eb' },
};

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function checkBlock(check: ScanDoc['checks'][number]): string {
  const style = STATUS_STYLES[check.status] || STATUS_STYLES.skipped;

  const fixBlock = check.generatedFix
    ? `
      <p style="margin:16px 0 4px;font-size:13px;font-weight:600;color:#0f172a;">Copy-paste fix</p>
      ${
        check.generatedFixTarget
          ? `<p style="margin:0 0 8px;font-size:12.5px;color:#64748b;line-height:1.6;"><strong>Where this goes:</strong> ${escapeHtml(
              check.generatedFixTarget,
            )}</p>`
          : ''
      }
      <pre style="margin:0;padding:14px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;overflow-x:auto;">${escapeHtml(
        check.generatedFix,
      )}</pre>`
    : '';

  return `
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;">
        <tr><td style="padding:20px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:16px;font-weight:600;color:#0f172a;">${escapeHtml(check.title)}</td>
            <td align="right" style="white-space:nowrap;">
              <span style="display:inline-block;background:${style.background};color:${style.colour};font-size:11px;font-weight:700;letter-spacing:0.04em;padding:4px 10px;border-radius:999px;">${style.label}</span>
              <span style="display:inline-block;margin-left:8px;font-size:12px;color:#6b7280;">${check.pointsAwarded}/${check.pointsPossible} pts</span>
            </td>
          </tr></table>

          <p style="margin:14px 0 0;font-size:14px;line-height:1.65;color:#334155;">${escapeHtml(check.humanExplanation)}</p>
          <p style="margin:12px 0 0;font-size:12px;line-height:1.55;color:#94a3b8;">${escapeHtml(check.details)}</p>
          ${fixBlock}
        </td></tr>
      </table>
    </td></tr>`;
}

export function buildReportHtml(scan: ScanDoc, recipientName?: string): string {
  const gradeColour = GRADE_COLOURS[scan.overallGrade] || '#6b7280';
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)}, here is` : 'Here is';

  // Stated up front on purpose. Every expectation in this report follows from
  // this one call, so if it is wrong the reader needs to know before they read
  // the findings — not after they act on them.
  const siteTypeNotice = `<tr><td style="padding:0 0 20px;">
       <p style="margin:0;padding:12px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#475569;line-height:1.6;">
         We checked this as ${escapeHtml(indefiniteArticle(SITE_TYPE_LABELS[scan.siteType] || 'website'))}${
           scan.siteTypeConfidence === 'low' ? ', though the signals were weak' : ''
         }, so the checks below are the ones that matter for that kind of site.${
           scan.siteTypeEvidence.length ? ` We based that on: ${escapeHtml(scan.siteTypeEvidence.join('; '))}.` : ''
         } If that is not what you are, tell us and we will re-run it.
       </p>
     </td></tr>`;

  const partialNotice = scan.partial
    ? `<tr><td style="padding:0 0 20px;">
         <p style="margin:0;padding:12px 16px;background:#f1f5f9;border-radius:8px;font-size:13px;color:#475569;line-height:1.6;">
           Some checks could not be completed on this scan, so they were left out of the score rather than counted against you. Re-running the scan usually completes them.
         </p>
       </td></tr>`
    : '';

  const jsNotice = scan.jsRenderWarning
    ? `<tr><td style="padding:0 0 20px;">
         <p style="margin:0;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;line-height:1.6;">
           <strong>Needs manual review:</strong> your site may require JavaScript to load its content, which some AI crawlers cannot execute.
         </p>
       </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>AI Readiness Report — ${escapeHtml(scan.domain)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
<tr><td align="center">
  <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.08);">

    <tr><td style="background:#0f172a;padding:26px 32px;">
      <p style="margin:0;color:#ffffff;font-size:19px;font-weight:600;">AI Readiness Report</p>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${escapeHtml(scan.domain)} &middot; scanned ${scan.scannedAt.toISOString().slice(0, 10)}</p>
    </td></tr>

    <tr><td style="padding:32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
        ${greeting} the full breakdown of how AI shopping assistants — ChatGPT, Claude, Gemini and Perplexity — currently see your store.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
        <tr>
          <td width="96" valign="middle">
            <div style="width:88px;height:88px;border-radius:16px;background:${gradeColour};color:#ffffff;font-size:44px;font-weight:700;line-height:88px;text-align:center;">${scan.overallGrade}</div>
          </td>
          <td valign="middle" style="padding-left:18px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${scan.overallScore}/100</p>
            <p style="margin:6px 0 0;font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(scan.summary)}</p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        ${siteTypeNotice}
        ${partialNotice}
        ${jsNotice}
        ${scan.checks.map(checkBlock).join('')}
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        <tr><td style="padding:22px;background:#f1f5f9;border-radius:12px;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">Want these fixed for you?</p>
          <p style="margin:8px 0 0;font-size:14px;color:#475569;line-height:1.65;">
            Everything in this report is fixable. Reply to this email or message us on WhatsApp and we will walk you through it — or do it for you.
          </p>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr><td style="padding:18px 20px;border:1px solid #e5e7eb;border-radius:12px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#0f172a;">How this score was calculated</p>
          <p style="margin:0;font-size:12.5px;color:#64748b;line-height:1.7;">
            Scoring rules version ${escapeHtml(scan.scoringVersion || 'unknown')} — scores are only comparable between scans on the same version.<br>
            Checked ${scan.pagesScanned.length} page(s) of ${Math.max(scan.pagesDiscovered + 1, scan.pagesScanned.length)} found, sampled across different sections of the site.<br>
            Weights for ${escapeHtml(SITE_TYPE_LABELS[scan.siteType] || 'this kind of site')}: ${weightSummary(scan)}.<br>
            Static HTML only — no JavaScript is executed. Checks we could not verify are excluded from the score rather than counted as zero.
          </p>
          <p style="margin:10px 0 0;font-size:12.5px;color:#94a3b8;line-height:1.7;">
            These weights are our judgement about what matters most for this kind of site, not a measurement — treat the number as a ranking of what to fix first.
            ${
              blockingFailures(scan) > 0
                ? `The ${blockingFailures(scan)} blocker(s) above are the part that carries no judgement: a crawler that is disallowed, a page that does not load, or a page marked noindex is invisible however you weight it.`
                : 'You have no hard blockers — nothing on your site is invisible to a crawler outright.'
            }
          </p>
        </td></tr>
      </table>

      <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Pages checked: ${scan.pagesScanned.map((page) => escapeHtml(page)).join('<br>') || 'none'}<br>
        Scan completed in ${(scan.scanDurationMs / 1000).toFixed(1)}s.
      </p>
    </td></tr>

    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        This report reflects what was publicly visible at ${escapeHtml(scan.domain)} at the time of the scan. Static HTML only — pages that build themselves with JavaScript are flagged for manual review rather than guessed at.
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** "AI bot access 20, structured data 30, …" — the weight table, inline. */
function weightSummary(scan: ScanDoc): string {
  return scan.checks
    .filter((check) => check.pointsPossible > 0)
    .map((check) => `${escapeHtml(check.title.toLowerCase())} ${check.pointsPossible}`)
    .join(', ');
}

/** Failures that are matters of fact rather than of weighting. */
function blockingFailures(scan: ScanDoc): number {
  const blocking = ['bot_access', 'crawlability', 'meta_robots'];
  return scan.checks.filter((check) => check.status === 'fail' && blocking.includes(check.checkId)).length;
}

function indefiniteArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

/** Link to the hosted copy of the report, included in the email. */
export function reportUrl(scanId: string): string {
  return `${config.appUrl}/api/scan/${scanId}/report`;
}
