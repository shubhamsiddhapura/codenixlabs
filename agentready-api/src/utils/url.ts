/**
 * URL normalisation and validation.
 *
 * Visitors paste things like "shop.example.com/", "HTTP://Example.com/?utm=x"
 * or "example". Everything downstream — the 6-hour cache key, same-host checks,
 * the .well-known probe — assumes a clean origin, so normalise once here.
 */

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

export interface NormalizedUrl {
  /** Full URL we will actually fetch, e.g. "https://example.com/". */
  href: string;
  /** Scheme + host, no trailing slash, e.g. "https://example.com". */
  origin: string;
  /** Bare hostname with a leading "www." stripped, e.g. "example.com". */
  domain: string;
}

const PRIVATE_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export function normalizeUrl(input: string): NormalizedUrl {
  const raw = (input || '').trim();
  if (!raw) throw new InvalidUrlError('Please enter a store URL.');
  if (raw.length > 2048) throw new InvalidUrlError('That URL is too long.');

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new InvalidUrlError(`"${raw}" does not look like a valid website address.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError('Only http:// and https:// addresses can be scanned.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // A hostname with no dot ("example", "intranet") is never a public store.
  if (!hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.')) {
    throw new InvalidUrlError(`"${raw}" does not look like a valid website address.`);
  }

  // Refuse to point the scanner at loopback or private ranges. A public endpoint
  // that fetches arbitrary URLs is an SSRF probe if it can reach internal hosts.
  if (PRIVATE_HOST.test(hostname)) {
    throw new InvalidUrlError('That address is not a public website.');
  }

  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';
  // Tracking params change nothing about the page but would fragment the cache.
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|ref$|ref_)/i.test(key)) parsed.searchParams.delete(key);
  }
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');

  const origin = `${parsed.protocol}//${parsed.host}`;
  return {
    href: parsed.toString(),
    origin,
    domain: hostname.replace(/^www\./, ''),
  };
}

/** Absolute URL from a possibly-relative href, or null if it is unusable. */
export function resolveUrl(base: string, href: string): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:|data:|whatsapp:)/i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** True when both URLs are on the same registrable-ish host (www-insensitive). */
export function isSameSite(a: string, b: string): boolean {
  try {
    const hostA = new URL(a).hostname.toLowerCase().replace(/^www\./, '');
    const hostB = new URL(b).hostname.toLowerCase().replace(/^www\./, '');
    return hostA === hostB;
  } catch {
    return false;
  }
}

/**
 * Two-part public suffixes common enough to matter here. Without these,
 * "example.co.in" and "app.example.co.in" would compare as "co.in" vs
 * "example.co.in" and look like different companies.
 *
 * Not a complete public-suffix list — a full one is a large dependency for a
 * question this narrow. These cover the Indian and Commonwealth domains this
 * tool actually meets.
 */
const TWO_PART_SUFFIXES = new Set([
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'co.uk', 'org.uk', 'me.uk', 'ac.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'co.za', 'com.br', 'com.sg', 'com.my', 'co.jp', 'com.hk',
]);

/** The registrable part of a hostname: "app.shop.co.in" → "shop.co.in". */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/^www\./, '').split('.');
  if (labels.length <= 2) return labels.join('.');

  const lastTwo = labels.slice(-2).join('.');
  const take = TWO_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join('.');
}

/**
 * Same organisation, allowing for subdomains.
 *
 * Looser than `isSameSite` on purpose, and used only for classification. A SaaS
 * product almost always puts sign-up on `app.` or `accounts.`, and treating
 * that as a third party threw away the strongest evidence of what the site is —
 * freshworks.com was classified as a publication for exactly this reason.
 *
 * Not used for deciding which pages to fetch: sampling stays strictly
 * same-host, because crawling someone's app subdomain is not what a visitor
 * asked for.
 */
export function isSameCompany(a: string, b: string): boolean {
  try {
    return registrableDomain(new URL(a).hostname) === registrableDomain(new URL(b).hostname);
  } catch {
    return false;
  }
}

/** Path + query of a URL, which is what robots.txt rules are matched against. */
export function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '/';
  }
}

/**
 * True when this URL is the organisation's main host rather than a subdomain of
 * it — `example.com` or `www.example.com`, but not `blog.example.com`.
 *
 * Used to decide whether sibling subdomains count as part of the same site:
 * looking outward from the apex is fair, looking upward from a subdomain is
 * borrowing someone else's pages.
 */
export function isApexHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return registrableDomain(hostname) === hostname;
  } catch {
    return false;
  }
}
