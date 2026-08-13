import { SiteType } from '../types';
import { Deadline, fetchUrl } from './fetcher';
import { HtmlDocument, typesOf } from './htmlDocument';
import { isSameSite, resolveUrl } from '../utils/url';
import { SITE_PROFILES, profileFor } from './siteType';

/**
 * Which pages beyond the homepage are worth sampling.
 *
 * Phase 1 sampled product pages, because Phase 1 assumed a store. The same
 * question generalises: an assistant judges a site by its *representative*
 * pages, and what counts as representative depends on what the site is — a
 * product page for a store, an article for a publication, the pricing page for
 * a SaaS product, the services or contact page for a clinic.
 *
 * The per-type URL shapes live in the site profiles (services/siteType.ts) so
 * that adding a site type does not mean editing this file.
 */

/** Paths that look like key pages but never are. */
const KEY_URL_EXCLUSIONS =
  /\/(cart|checkout|account|login|logout|register|wishlist|compare|search|feed|rss|sitemap)\/?(\?|$)|\.(json|xml|rss|atom|jpg|jpeg|png|webp|avif|gif|svg|pdf|css|js|zip|mp4)(\?|$)/i;

/** Listing pages: real URLs, but they describe a set rather than a thing. */
const LISTING_PATHS =
  /^\/(products?|shop|collections?|store|blog|posts?|articles?|news|category|categories|tag|tags|author|page)\/?$/i;

/** Anything under these is a policy page — Check 4's job, not a content sample. */
const POLICY_PATHS = /\/(policies|policy|privacy|terms|refund|returns?|shipping|legal|cookies?)\b/i;

export function looksLikeKeyUrl(url: string, siteType: SiteType): boolean {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return false;
  }

  if (KEY_URL_EXCLUSIONS.test(url)) return false;
  if (LISTING_PATHS.test(path)) return false;
  if (POLICY_PATHS.test(path)) return false;
  if (siteType === 'content' && !looksLikeArticleSlug(path)) return false;

  return profileFor(siteType).keyPagePatterns.some((pattern) => pattern.test(path));
}

/**
 * Distinguish an article from a section index on a publication.
 *
 * `/news/national/` and `/news/international/` match the same URL shape as a
 * real story, but they are category listings with no Article schema on them —
 * sampling those and reporting "your articles have no structured data" is a
 * false accusation against a newspaper that marks up every story correctly.
 *
 * Headlines become long multi-word slugs or carry a story id; section names are
 * one or two short words ("national", "tamil-nadu"). Requiring a digit, real
 * length, or three or more words separates them reliably enough — and a
 * publication whose slugs really are two words still gets sampled by the
 * fallback path in `selectKeyPages`.
 */
function looksLikeArticleSlug(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return false;
  return /\d/.test(last) || last.length > 20 || (last.match(/-/g) || []).length >= 2;
}

/**
 * Kept as a named export because Check 1 and the engine both ask specifically
 * "is this a product URL", regardless of how the site was classified.
 */
export function looksLikeProductUrl(url: string): boolean {
  return looksLikeKeyUrl(url, 'ecommerce');
}

/** `<loc>` values out of a sitemap or sitemap index. */
function parseSitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const matcher = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi;
  let match = matcher.exec(xml);
  while (match) {
    out.push(match[1].trim());
    if (out.length >= 5000) break;
    match = matcher.exec(xml);
  }
  return out;
}

const isSitemapIndex = (xml: string): boolean => /<sitemapindex[\s>]/i.test(xml);

export interface SitemapResult {
  /** True when at least one sitemap was found and parsed. */
  found: boolean;
  urls: string[];
  sources: string[];
}

/**
 * Collect URLs from the site's sitemap, following a sitemap index one level
 * deep. `extraSitemaps` are the `Sitemap:` lines robots.txt advertised, which
 * is often the only way to find a sitemap that is not at /sitemap.xml.
 */
export async function collectSitemapUrls(
  origin: string,
  extraSitemaps: string[],
  deadline: Deadline,
): Promise<SitemapResult> {
  const candidates = [...new Set([...extraSitemaps, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`])]
    .filter((url) => isSameSite(url, origin))
    .slice(0, 3);

  const urls: string[] = [];
  const sources: string[] = [];
  let found = false;

  for (const candidate of candidates) {
    if (deadline.expired()) break;
    // One good sitemap is enough; do not burn the budget on the alternates.
    if (found) break;

    const response = await fetchUrl(candidate, deadline);
    if (!response.ok || !response.body || !/<(urlset|sitemapindex)[\s>]/i.test(response.body)) continue;

    found = true;
    sources.push(candidate);
    const locs = parseSitemapLocs(response.body);

    if (!isSitemapIndex(response.body)) {
      urls.push(...locs);
      continue;
    }

    // Sitemap index: follow the children most likely to hold content first.
    const children = locs
      .filter((loc) => isSameSite(loc, origin))
      .sort((a, b) => childPriority(b) - childPriority(a))
      .slice(0, 2);

    for (const child of children) {
      if (deadline.expired()) break;
      const childResponse = await fetchUrl(child, deadline);
      if (!childResponse.ok || !childResponse.body) continue;
      sources.push(child);
      urls.push(...parseSitemapLocs(childResponse.body));
    }
  }

  return { found, urls: [...new Set(urls)], sources };
}

/** Prefer child sitemaps whose name suggests content over ones full of tags. */
function childPriority(url: string): number {
  if (/product|post|article|blog|news|page/i.test(url)) return 2;
  if (/categor|tag|author|archive/i.test(url)) return 0;
  return 1;
}

/**
 * Pick up to `limit` representative pages to sample.
 *
 * Homepage links come first: a URL the homepage links to is a page the site
 * considers current, whereas a sitemap can be stale or list thousands of dead
 * entries. Structured-data `url` fields are a third source, for sites whose
 * navigation is rendered by JavaScript but whose schema still names its pages.
 *
 * The final fallback matters for the `general` profile, where there is no
 * meaningful URL pattern to match: take the first few substantial internal
 * links and sample those, so an unclassifiable site still gets judged on more
 * than its homepage.
 */
export interface KeyPageSelection {
  /** The URLs to fetch, capped at `limit`. */
  urls: string[];
  /** How many candidates matched before the cap — the coverage denominator. */
  discovered: number;
}

export function selectKeyPages(
  homepage: HtmlDocument,
  sitemapUrls: string[],
  siteType: SiteType,
  limit: number,
): KeyPageSelection {
  const candidates: string[] = [];
  const seen = new Set<string>([stripTrailingSlash(homepage.url)]);

  const consider = (url: string | null | undefined, test: (candidate: string) => boolean): void => {
    if (!url) return;
    const key = stripTrailingSlash(url);
    if (seen.has(key)) return;
    if (!isSameSite(url, homepage.url)) return;
    if (!test(url)) return;
    seen.add(key);
    candidates.push(url);
  };

  const onProfile = (url: string): boolean => looksLikeKeyUrl(url, siteType);

  for (const link of homepage.links()) consider(link.url, onProfile);

  for (const node of homepage.jsonLd()) {
    if (!isPrimaryEntity(node, siteType)) continue;
    const url = typeof node.url === 'string' ? resolveUrl(homepage.url, node.url) : null;
    consider(url, onProfile);
  }

  // Cap the sitemap contribution: a large site would otherwise put tens of
  // thousands of URLs through the section-spreading pass for no benefit.
  for (const url of sitemapUrls.slice(0, 1000)) consider(url, onProfile);

  // Top up whenever the profile's shapes did not fill the sample, not only when
  // they matched nothing. A site with one matching page was otherwise judged on
  // that single page while five were asked for — the narrowest possible sample,
  // in exactly the case where a wider one matters most.
  if (candidates.length < limit) {
    for (const link of homepage.links()) consider(link.url, isPlausibleContentPage);
    for (const url of sitemapUrls.slice(0, 200)) consider(url, isPlausibleContentPage);
  }

  return { urls: spreadAcrossSections(candidates, limit), discovered: candidates.length };
}

/**
 * Pick `limit` URLs from different parts of the site rather than the first N.
 *
 * Homepage links come in navigation order, so the first three are routinely
 * three products from the same collection or three posts from one category.
 * A sample like that says nothing about whether the *rest* of the site is
 * marked up — which is the question. Taking one from each top-level section
 * before taking a second from any makes a three-to-five page sample far more
 * representative for the same number of requests.
 */
function spreadAcrossSections(urls: string[], limit: number): string[] {
  if (urls.length <= limit) return urls;

  const bySection = new Map<string, string[]>();
  for (const url of urls) {
    const section = sectionOf(url);
    const bucket = bySection.get(section);
    if (bucket) bucket.push(url);
    else bySection.set(section, [url]);
  }

  const picked: string[] = [];
  const buckets = [...bySection.values()];

  // Round-robin: one from each section, then a second from each, and so on.
  for (let round = 0; picked.length < limit; round += 1) {
    let tookAny = false;
    for (const bucket of buckets) {
      if (picked.length >= limit) break;
      if (round < bucket.length) {
        picked.push(bucket[round]);
        tookAny = true;
      }
    }
    if (!tookAny) break;
  }

  return picked;
}

/** First path segment, which is what separates one part of a site from another. */
function sectionOf(url: string): string {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    return segments[0] || '/';
  } catch {
    return '/';
  }
}


/** The schema.org type that *is* the point of this kind of site. */
function isPrimaryEntity(node: Record<string, unknown>, siteType: SiteType): boolean {
  const types = typesOf(node);
  if (siteType === 'ecommerce') return types.includes('product');
  if (siteType === 'content') return types.some((type) => /article|blogposting|newsarticle/.test(type));
  if (siteType === 'saas') return types.some((type) => /softwareapplication|webapplication|service/.test(type));
  if (siteType === 'local_business') return types.some((type) => /localbusiness|service|place/.test(type));
  return false;
}

/**
 * Would this URL have been worth sampling — by either route selection uses?
 *
 * `selectKeyPages` picks pages two ways: the profile's URL shapes, and a
 * general "looks like a real page" fallback. Anything re-tested afterwards
 * (a page that redirected somewhere, for instance) has to be judged by the same
 * pair, or every page the fallback supplied gets thrown away.
 */
export function isSampleablePage(url: string, siteType: SiteType): boolean {
  return looksLikeKeyUrl(url, siteType) || isPlausibleContentPage(url);
}

/**
 * A same-site URL that plausibly holds real content: one or two path segments,
 * no query string, not a policy or listing page, not a file.
 */
function isPlausibleContentPage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.search) return false;
  if (KEY_URL_EXCLUSIONS.test(url) || POLICY_PATHS.test(parsed.pathname) || LISTING_PATHS.test(parsed.pathname)) return false;

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return false;
  // Reject the language switchers and one-letter routes that clutter nav bars.
  return segments[segments.length - 1].length >= 3;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export { SITE_PROFILES };
