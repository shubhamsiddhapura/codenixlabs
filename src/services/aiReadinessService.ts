import type {
  ComparisonResult,
  FullScan,
  LeadInput,
  RunComparison,
  ScanHistory,
  ScanStats,
  SiteType,
  TeaserScan,
  UnlockResult,
} from '../types/aiReadiness';

const BASE_URL = (import.meta.env.VITE_AGENTREADY_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

/**
 * An error carrying a message the visitor can act on.
 *
 * The API already writes its errors for a non-technical reader ("that URL does
 * not look valid", "you have reached the limit of 5 scans per hour"), so they
 * are surfaced as-is. Only when there is no usable message do we substitute our
 * own — never a raw status code.
 */
export class AiReadinessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AiReadinessError';
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: Record<string, unknown> }> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    // fetch only rejects on network failure — the API being down, or CORS.
    throw new AiReadinessError('We could not reach the checker. Check your connection and try again in a moment.', 0);
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success || body.data === undefined) {
    throw new AiReadinessError(body?.error || fallbackMessage(response.status), response.status);
  }

  return { data: body.data, meta: body.meta };
}

function fallbackMessage(status: number): string {
  if (status === 429) return 'You have run several scans in a row. Give it a few minutes and try again.';
  if (status === 404) return 'We could not find that scan. Please run it again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'Something went wrong. Please try again.';
}

/**
 * Runs the scan. Can take up to ~15 seconds on a slow site.
 *
 * `siteType` skips detection and judges the site as that type — how a visitor
 * corrects a low-confidence classification instead of reading a report built on
 * a wrong assumption.
 */
export async function startScan(url: string, siteType?: SiteType): Promise<TeaserScan> {
  const { data } = await request<TeaserScan>('/api/scan', {
    method: 'POST',
    body: JSON.stringify(siteType ? { url, siteType } : { url }),
  });
  return data;
}

/** Exchanges contact details for the full report. */
export async function unlockScan(scanId: string, lead: LeadInput): Promise<UnlockResult> {
  const { data, meta } = await request<FullScan>(`/api/scan/${scanId}/unlock`, {
    method: 'POST',
    body: JSON.stringify(lead),
  });
  return { scan: data, emailed: meta?.emailed === true };
}

/** Runs a second scan and returns both, side by side. */
export async function compareScan(scanId: string, competitorUrl: string): Promise<ComparisonResult> {
  const { data } = await request<ComparisonResult>(`/api/scan/${scanId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ competitorUrl }),
  });
  return data;
}

/** Earlier runs of the same domain — dates and grades only, no findings. */
export async function fetchScanHistory(scanId: string): Promise<ScanHistory> {
  const { data } = await request<ScanHistory>(`/api/scan/${scanId}/history`);
  return data;
}

/** What moved between this run and an earlier one. */
export async function fetchRunComparison(scanId: string, otherScanId: string): Promise<RunComparison> {
  const { data } = await request<RunComparison>(`/api/scan/${scanId}/diff/${otherScanId}`);
  return data;
}

/** Public usage counters. Cached server-side; safe to call on every page load. */
export async function fetchScanStats(): Promise<ScanStats> {
  const { data } = await request<ScanStats>('/api/scan/stats');
  return data;
}
