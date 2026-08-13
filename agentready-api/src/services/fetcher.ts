import axios, { AxiosError, AxiosResponse } from 'axios';
import { config } from '../config';

export type FetchFailure =
  | 'timeout'
  | 'dns'
  | 'ssl'
  | 'redirect_loop'
  | 'connection_refused'
  | 'network'
  | 'deadline_exceeded';

export interface FetchResult {
  requestedUrl: string;
  /** URL after redirects. Falls back to requestedUrl when we never got a response. */
  finalUrl: string;
  status: number | null;
  ok: boolean;
  headers: Record<string, string>;
  body: string | null;
  contentType: string | null;
  /** Set when no usable response came back at all. */
  failure: FetchFailure | null;
  /**
   * True when the server answered but refused us: 401/403/429, or a Cloudflare
   * style interstitial. Distinct from `failure` — the site is up, it just does
   * not want a bot. Spec section 8 wants this reported as its own result.
   */
  blocked: boolean;
  durationMs: number;
}

/**
 * A single scan's time budget.
 *
 * The spec's 15-second ceiling is on the whole scan, not per request, so every
 * fetch asks the deadline how long it may take. Once the budget is gone,
 * `fetch` returns a `deadline_exceeded` result immediately instead of starting a
 * request that could not finish in time.
 */
export class Deadline {
  private readonly endsAt: number;

  /**
   * Held back from the network budget for parsing, scoring and building the
   * report. Without it the fetches alone can consume the entire ceiling and the
   * scan finishes *after* the time we promised — parsing six pages of HTML is
   * not free.
   */
  static readonly PROCESSING_RESERVE_MS = 1500;

  constructor(totalMs: number = config.scanner.totalTimeoutMs) {
    this.endsAt = Date.now() + Math.max(1000, totalMs - Deadline.PROCESSING_RESERVE_MS);
  }

  remainingMs(): number {
    return Math.max(0, this.endsAt - Date.now());
  }

  expired(): boolean {
    // Anything under a second cannot complete a useful request; treat it as gone
    // so callers stop rather than firing a request doomed to time out.
    return this.remainingMs() < 1000;
  }
}

const MAX_BODY_BYTES = 3 * 1024 * 1024;

const CHALLENGE_MARKERS = [
  'just a moment...',
  'cf-browser-verification',
  'attention required! | cloudflare',
  'checking your browser before accessing',
  'enable javascript and cookies to continue',
  'access denied',
  'request unsuccessful. incapsula',
  'pardon our interruption',
];

function classifyAxiosError(error: AxiosError): FetchFailure {
  const code = error.code || '';
  // ERR_CANCELED is what the deadline's AbortSignal produces, and
  // TimeoutError/ABORT_ERR is the underlying DOMException name.
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_CANCELED' || code === 'ABORT_ERR') return 'timeout';
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'ERR_FR_TOO_MANY_REDIRECTS') return 'redirect_loop';
  if (code.startsWith('ERR_TLS') || code === 'CERT_HAS_EXPIRED' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    return 'ssl';
  }
  return 'network';
}

function headersOf(response: AxiosResponse): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = response.headers as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(raw || {})) {
    if (value == null) continue;
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return out;
}

function looksChallenged(status: number, body: string | null): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  if (status !== 503 || !body) return false;
  const head = body.slice(0, 4000).toLowerCase();
  return CHALLENGE_MARKERS.some((marker) => head.includes(marker));
}

export interface FetchOptions {
  /**
   * Identify as a different crawler for this request.
   *
   * Used to test whether a site's firewall actually serves the AI crawlers its
   * robots.txt claims to allow — the two disagree more often than owners
   * realise. The strings passed in still name us as the prober (see
   * checks/botAccess.ts), so this reveals stricter treatment rather than
   * evading it.
   */
  userAgent?: string;
}

/**
 * Fetch a URL within the scan's remaining budget. Never throws — every failure
 * mode is reported in the result, because a failed fetch is itself a finding.
 */
export async function fetchUrl(url: string, deadline: Deadline, options: FetchOptions = {}): Promise<FetchResult> {
  const startedAt = Date.now();

  const base: FetchResult = {
    requestedUrl: url,
    finalUrl: url,
    status: null,
    ok: false,
    headers: {},
    body: null,
    contentType: null,
    failure: null,
    blocked: false,
    durationMs: 0,
  };

  if (deadline.expired()) {
    return { ...base, failure: 'deadline_exceeded', durationMs: 0 };
  }

  const timeout = Math.min(config.scanner.requestTimeoutMs, deadline.remainingMs());

  try {
    const response = await axios.get<string>(url, {
      timeout,
      /**
       * axios's `timeout` starts once the socket is connected, so DNS
       * resolution, TLS negotiation and a slow body stream all sit outside it —
       * which is how a scan with a 15-second ceiling was finishing in 19. This
       * signal covers the whole request, wall-clock, and is what actually
       * enforces the deadline.
       */
      signal: AbortSignal.timeout(timeout),
      maxRedirects: 5,
      maxContentLength: MAX_BODY_BYTES,
      responseType: 'text',
      // We inspect non-2xx bodies (a 403 challenge page, a 404 .well-known),
      // so never let axios turn a status code into an exception.
      validateStatus: () => true,
      decompress: true,
      headers: {
        'User-Agent': options.userAgent || config.scanner.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      transformResponse: [(data) => data],
    });

    const headers = headersOf(response);
    const body = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    const status = response.status;

    return {
      ...base,
      finalUrl: (response.request?.res?.responseUrl as string | undefined) || url,
      status,
      ok: status >= 200 && status < 300,
      headers,
      body,
      contentType: headers['content-type'] || null,
      blocked: looksChallenged(status, body),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const failure = axios.isAxiosError(error) ? classifyAxiosError(error) : 'network';
    return { ...base, failure, durationMs: Date.now() - startedAt };
  }
}

/**
 * Fetch a URL over http:// if the https:// attempt failed at the transport
 * level. Plenty of small Indian D2C stores still have a broken or missing
 * certificate on the apex domain, and reporting "we couldn't reach you" when
 * the site is plainly online would be wrong.
 */
export async function fetchWithHttpFallback(url: string, deadline: Deadline): Promise<FetchResult> {
  const first = await fetchUrl(url, deadline);
  const transportFailed = first.failure && first.failure !== 'deadline_exceeded';

  if (!transportFailed || !url.startsWith('https://') || deadline.expired()) {
    return first;
  }

  const fallback = await fetchUrl(url.replace(/^https:/, 'http:'), deadline);
  return fallback.failure ? first : fallback;
}
