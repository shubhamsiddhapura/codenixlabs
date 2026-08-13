import * as cheerio from 'cheerio';
import { FetchResult } from './fetcher';
import { resolveUrl } from '../utils/url';

export interface PageLink {
  url: string;
  text: string;
}

/** Elements a browser renders on their own line, so their text must not run on. */
const BLOCK_ELEMENTS =
  'p, div, li, ul, ol, h1, h2, h3, h4, h5, h6, section, article, header, footer, nav, aside, ' +
  'main, blockquote, figcaption, figure, table, tr, td, th, dl, dt, dd, pre, address, form, ' +
  'fieldset, legend, label, option, details, summary';

/**
 * One fetched page, parsed once and reused by every check.
 *
 * Checks 3, 4, 5 and 6 all need the same three things out of a page — its
 * JSON-LD blocks, its links, and how much readable text it actually has — so
 * cheerio runs once per page here rather than once per check.
 */
export class HtmlDocument {
  readonly url: string;
  readonly status: number | null;
  readonly ok: boolean;
  readonly blocked: boolean;
  readonly failure: string | null;
  readonly headers: Record<string, string>;
  /** Wall-clock time for the whole request — the crawl-budget signal. */
  readonly durationMs: number;
  readonly $: cheerio.CheerioAPI | null;

  private cachedText: string | null = null;
  private cachedLinks: PageLink[] | null = null;
  private cachedJsonLd: unknown[] | null = null;

  constructor(fetched: FetchResult) {
    this.url = fetched.finalUrl || fetched.requestedUrl;
    this.status = fetched.status;
    this.ok = fetched.ok;
    this.blocked = fetched.blocked;
    this.failure = fetched.failure;
    this.headers = fetched.headers;
    this.durationMs = fetched.durationMs;

    const isHtml = !fetched.contentType || /html|xml|text\/plain/i.test(fetched.contentType);
    this.$ = fetched.body && isHtml ? cheerio.load(fetched.body) : null;
  }

  get title(): string {
    return this.$?.('title').first().text().trim() || '';
  }

  /**
   * Visible text with script/style/noscript stripped — the crawlability signal,
   * and the input to every text-based site-type rule.
   *
   * cheerio's `.text()` concatenates with no separator, so
   * `<h1>Grill House</h1><p>Book a table` comes out as `Grill HouseBook a table`
   * and any pattern anchored with `\b` silently stops matching. Block elements
   * get a trailing space first, which is what a browser renders anyway. Inline
   * elements deliberately do not: `Read<a>more</a>` really is one word on screen.
   */
  text(): string {
    if (this.cachedText !== null) return this.cachedText;
    if (!this.$) {
      this.cachedText = '';
      return this.cachedText;
    }

    const $ = this.$;
    const body = $('body').clone();
    body.find('script, style, noscript, template, svg').remove();
    body.find('br, hr').replaceWith(' ');
    body.find(BLOCK_ELEMENTS).each((_, element) => {
      $(element).append(' ');
    });

    this.cachedText = body.text().replace(/\s+/g, ' ').trim();
    return this.cachedText;
  }

  /** Every same-document anchor, resolved to an absolute URL. */
  links(): PageLink[] {
    if (this.cachedLinks) return this.cachedLinks;
    if (!this.$) {
      this.cachedLinks = [];
      return this.cachedLinks;
    }

    const $ = this.$;
    const seen = new Set<string>();
    const links: PageLink[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const resolved = href ? resolveUrl(this.url, href) : null;
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);
      links.push({ url: resolved, text: $(element).text().replace(/\s+/g, ' ').trim() });
    });

    this.cachedLinks = links;
    return links;
  }

  /**
   * Every JSON-LD object on the page, flattened.
   *
   * Real stores nest things three different ways — a bare object, a top-level
   * array, or an `@graph` — and a Product can be buried in any of them, so
   * flatten all three shapes into one list of objects rather than making each
   * caller re-walk the tree.
   */
  jsonLd(): Record<string, unknown>[] {
    if (this.cachedJsonLd) return this.cachedJsonLd as Record<string, unknown>[];
    if (!this.$) {
      this.cachedJsonLd = [];
      return [];
    }

    const $ = this.$;
    const nodes: Record<string, unknown>[] = [];

    $('script[type="application/ld+json"]').each((_, element) => {
      const raw = $(element).contents().text().trim();
      if (!raw) return;
      try {
        collectNodes(JSON.parse(raw), nodes);
      } catch {
        // Malformed JSON-LD is common (trailing commas, PHP-escaped quotes).
        // Check 3 reports "no usable Product schema" rather than crashing.
      }
    });

    this.cachedJsonLd = nodes;
    return nodes;
  }

  /**
   * Size of the largest inline JSON state blob on the page.
   *
   * Frameworks ship the page's real content inside `__NEXT_DATA__`,
   * `__NUXT__`, `self.__next_f`, or an `__INITIAL_STATE__` object. It is in the
   * response — a crawler that parses it can read the product name and price —
   * but it is not in the markup, so anything looking for headings, paragraphs
   * or JSON-LD sees an empty page.
   *
   * That distinction changes the advice completely, so measure it rather than
   * lumping it in with "needs JavaScript".
   */
  inlineStateBytes(): number {
    if (!this.$) return 0;
    const $ = this.$;
    let largest = 0;

    $('script').each((_, element) => {
      const id = ($(element).attr('id') || '').toLowerCase();
      const type = ($(element).attr('type') || '').toLowerCase();
      const body = $(element).contents().text();
      if (!body || body.length < 500) return;

      const isKnownStateScript =
        id === '__next_data__' ||
        id === '__nuxt_data__' ||
        type === 'application/json' ||
        /^\s*(self\.__next_f|window\.__(NUXT|INITIAL_STATE|APOLLO_STATE|PRELOADED_STATE|REMIX_CONTEXT|data)__)/i.test(body);

      if (isKnownStateScript) largest = Math.max(largest, body.length);
    });

    return largest;
  }

  /** Content of `<meta name="...">`, lower-cased. */
  metaContent(name: string): string | null {
    if (!this.$) return null;
    const $ = this.$;
    let found: string | null = null;
    $('meta[name]').each((_, element) => {
      if (found !== null) return;
      const attr = ($(element).attr('name') || '').trim().toLowerCase();
      if (attr === name.toLowerCase()) {
        found = ($(element).attr('content') || '').trim().toLowerCase();
      }
    });
    return found;
  }
}

function collectNodes(value: unknown, out: Record<string, unknown>[], depth = 0): void {
  if (depth > 6 || value == null) return;

  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out, depth + 1);
    return;
  }

  if (typeof value !== 'object') return;

  const node = value as Record<string, unknown>;
  out.push(node);

  if (node['@graph']) collectNodes(node['@graph'], out, depth + 1);
  // A Product is frequently nested under an ItemList's `itemListElement` or a
  // WebPage's `mainEntity`.
  if (node.itemListElement) collectNodes(node.itemListElement, out, depth + 1);
  if (node.mainEntity) collectNodes(node.mainEntity, out, depth + 1);
  if (node.item) collectNodes(node.item, out, depth + 1);
}

/** `@type` can be a string or an array; normalise to a lower-cased list. */
export function typesOf(node: Record<string, unknown>): string[] {
  const raw = node['@type'] ?? node.type;
  if (typeof raw === 'string') return [raw.toLowerCase()];
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase());
  return [];
}
