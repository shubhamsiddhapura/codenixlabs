import { Resend } from 'resend';
import { config } from '../config';
import { ScanDoc } from '../models/Scan';
import { LeadDoc } from '../models/Lead';
import { buildReportHtml, escapeHtml, reportUrl } from './reportHtml';

/**
 * Report delivery, on Resend — the same provider DealsPouch already sends
 * through, so there is no second email vendor to configure or warm up.
 */

let client: Resend | null = null;

function resend(): Resend {
  if (!config.email.apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!client) client = new Resend(config.email.apiKey);
  return client;
}

export function emailConfigured(): boolean {
  return Boolean(config.email.apiKey);
}

/** Send the visitor their full report. Throws so the caller can record failure. */
export async function sendReportEmail(scan: ScanDoc, lead: LeadDoc): Promise<void> {
  const html = buildReportHtml(scan, lead.name).replace(
    '</body>',
    `<div style="text-align:center;padding:0 0 28px;font-size:12px;color:#94a3b8;">
       <a href="${reportUrl(String(scan._id))}" style="color:#64748b;">View this report in your browser</a>
     </div></body>`,
  );

  const response = await resend().emails.send({
    from: config.email.from,
    to: lead.email,
    subject: `Your store scored ${scan.overallGrade} for AI readiness — ${scan.domain}`,
    html,
  });

  if (response.error) {
    throw new Error(`Resend API error: ${response.error.message}`);
  }
}

/**
 * Internal copy of a captured lead. Best-effort: a failure here must never
 * affect the visitor's response, so callers should not await-and-throw on it.
 */
export async function sendLeadNotification(scan: ScanDoc, lead: LeadDoc): Promise<void> {
  if (!config.email.leadNotify || !emailConfigured()) return;

  const rows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['WhatsApp', lead.whatsapp],
    ['Store', scan.domain],
    ['Grade', `${scan.overallGrade} (${scan.overallScore}/100)`],
    ['Failed checks', scan.checks.filter((check) => check.status === 'fail').map((check) => check.title).join(', ') || 'none'],
    ['Report', reportUrl(String(scan._id))],
  ];

  await resend().emails.send({
    from: config.email.from,
    to: config.email.leadNotify,
    subject: `New AgentReady lead: ${lead.name} — ${scan.domain} (${scan.overallGrade})`,
    html: `<table cellpadding="6" style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="color:#64748b;">${escapeHtml(label)}</td><td><strong>${escapeHtml(String(value))}</strong></td></tr>`,
      )
      .join('')}</table>`,
  });
}
