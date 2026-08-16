import { CheckId, Confidence, SiteType, SiteTypeVerdict } from '../types';
import { HtmlDocument, typesOf } from './htmlDocument';
import { ParsedRobots } from './robotsTxt';
import { isApexHost, isSameCompany, isSameSite } from '../utils/url';

/**
 * What kind of site is this, and what should we therefore expect of it?
 *
 * Phase 1 was specified against online stores, but visitors paste whatever they
 * like — a clinic, a law firm, a newspaper, a SaaS landing page. Judging all of
 * those against "has Product schema" and "has a returns policy" would produce
 * confident nonsense: a dentist has no returns policy and should not lose 15
 * points for it.
 *
 * So every scan starts by classifying the site from its homepage, then runs the
 * same six checks against expectations that fit. The checks themselves do not
 * change — "can agents reach you", "is there a machine-readable interface", "is
 * your core entity described in structured data", "can an agent verify who you
 * are" — only what counts as a correct answer.
 *
 * Detection is evidence-scored rather than rule-chained, because real sites are
 * mixtures: a SaaS company with a blog, a store with a clinic attached. The
 * highest-scoring profile wins, ties break towards the more demanding profile,
 * and the evidence is reported so a visitor can see why they were classified
 * that way — and so a wrong call is visibly wrong rather than silently wrong.
 */

// --- Profiles -------------------------------------------------------------

/** A required field in the structured-data check, with the label users see. */
export interface SchemaField {
  key: string;
  label: string;
  test: (node: Record<string, unknown>) => boolean;
}

export interface TrustPageSpec {
  kind: string;
  label: string;
  hrefPattern: RegExp;
  textPattern: RegExp;
  probePaths: string[];
}

export interface SiteProfile {
  siteType: SiteType;
  /** How the report refers to this kind of site, e.g. "online store". */
  label: string;
  /** What an AI assistant is trying to do with this site, in one clause. */
  agentGoal: string;
  /** Must total 100. Asserted in the fixture tests. */
  weights: Record<CheckId, number>;
  /** URL shapes worth sampling beyond the homepage. */
  keyPagePatterns: RegExp[];
  /** What the sampled pages are called in the report, e.g. "product pages". */
  keyPageLabel: string;
}

/**
 * Weights per site type. Each row must total 100 — asserted in the fixtures.
 *
 * The spec's row was 20/15/30/15/10/10 for a store across six checks. Adding a
 * seventh (`content_structure`) makes keeping it verbatim impossible, so the
 * revision below preserves its *ordering* — structured data heaviest, bot
 * access next — and takes the new check's points from the places that were
 * least load-bearing. This is what bumped the scoring version to 1.1.0; scans
 * on 1.0.0 are not comparable to these.
 *
 * What varies per type, and why:
 *
 *  - content: parsing and attribution matter most here — an assistant quoting
 *    an article needs a heading structure to chunk and an author to credit —
 *    so `content_structure` is heaviest for publications.
 *  - local_business: structured data carries the name/address/phone/hours an
 *    assistant needs to answer "where and when", so it stays heavy.
 *  - saas: an agent interface (MCP, OpenAPI) is closer to the point than it is
 *    for a blog, so it keeps its weight.
 *  - general: trust and identity matter most, because the main question an
 *    assistant has about an unclassifiable site is "who is this".
 */
const WEIGHTS: Record<SiteType, Record<CheckId, number>> = {
  ecommerce: { bot_access: 20, agent_interface: 12, structured_data: 28, content_structure: 10, trust_signals: 13, meta_robots: 8, crawlability: 9 },
  content: { bot_access: 25, agent_interface: 0, structured_data: 22, content_structure: 17, trust_signals: 12, meta_robots: 13, crawlability: 11 },
  saas: { bot_access: 20, agent_interface: 13, structured_data: 22, content_structure: 12, trust_signals: 13, meta_robots: 12, crawlability: 8 },
  local_business: { bot_access: 22, agent_interface: 0, structured_data: 30, content_structure: 11, trust_signals: 15, meta_robots: 12, crawlability: 10 },
  general: { bot_access: 23, agent_interface: 0, structured_data: 24, content_structure: 13, trust_signals: 17, meta_robots: 13, crawlability: 10 },
};

/**
 * Site types whose only agent artefact would be llms.txt, which is why they
 * score it at zero.
 *
 * llms.txt is a proposal with no consumers. Google has said on the record that
 * no AI system fetches it and that it has no plans to support it; independent
 * crawls of ~137,000 domains found 97% of llms.txt files were never requested
 * by anything. Docking a site points for not publishing a file nothing reads
 * would be exactly the placebo-selling this tool exists to call out.
 *
 * UCP (stores) and MCP/OpenAPI (software) stay scored: those are consumed by
 * real clients today, even if adoption is early.
 *
 * The check still runs and still reports what it found — it simply does not
 * affect the number. See checks/agentInterface.ts.
 */
export const LLMS_TXT_ONLY_TYPES: SiteType[] = ['content', 'local_business', 'general'];

export const isAgentInterfaceScored = (siteType: SiteType): boolean =>
  !LLMS_TXT_ONLY_TYPES.includes(siteType);

export const SITE_PROFILES: Record<SiteType, SiteProfile> = {
  ecommerce: {
    siteType: 'ecommerce',
    label: 'online store',
    agentGoal: 'recommend your products and eventually buy them for a shopper',
    weights: WEIGHTS.ecommerce,
    keyPageLabel: 'product pages',
    keyPagePatterns: [/\/products\/[^/?#]+/i, /\/product\/[^/?#]+/i, /\/p\/[^/?#]+/i, /\/item\/[^/?#]+/i, /\/shop\/[^/?#]+/i, /\/dp\/[A-Z0-9]{10}/i],
  },
  content: {
    siteType: 'content',
    label: 'content or publishing site',
    agentGoal: 'quote and cite your articles when answering a question',
    weights: WEIGHTS.content,
    keyPageLabel: 'articles',
    keyPagePatterns: [
      /\/blog\/[^/?#]+/i,
      /\/posts?\/[^/?#]+/i,
      /\/article(s)?\/[^/?#]+/i,
      /\/news\/[^/?#]+/i,
      /\/stor(y|ies)\/[^/?#]+/i,
      // Dated permalinks: /2024/05/some-headline
      /\/(19|20)\d{2}\/\d{1,2}\/[^/?#]+/,
      /**
       * Root-level headline slugs: blog.example.com/how-we-rebuilt-our-edge.
       *
       * Ghost and most Next.js blogs publish this way, matching none of the
       * patterns above — which left them sampling tag and locale pages instead
       * of articles. Three or more words keeps `/de-de` and `/about-us` out.
       */
      /^\/[a-z0-9]+(?:-[a-z0-9]+){2,}\/?$/i,
    ],
  },
  saas: {
    siteType: 'saas',
    label: 'software or SaaS product',
    agentGoal: 'explain what your product does, what it costs, and connect to it',
    weights: WEIGHTS.saas,
    keyPageLabel: 'product and pricing pages',
    keyPagePatterns: [
      /\/pricing\b/i,
      /\/plans?\b/i,
      /\/features?\b/i,
      /\/product(s)?\b/i,
      /\/solutions?\b/i,
      /\/(docs|documentation|api)\b/i,
      /\/integrations?\b/i,
    ],
  },
  local_business: {
    siteType: 'local_business',
    label: 'local business',
    agentGoal: 'tell someone where you are, when you are open, and how to book',
    weights: WEIGHTS.local_business,
    keyPageLabel: 'service and contact pages',
    keyPagePatterns: [
      /\/services?\b/i,
      /\/treatments?\b/i,
      /\/menu\b/i,
      /\/book(ing)?\b/i,
      /\/appointments?\b/i,
      /\/locations?\b/i,
      /\/branch(es)?\b/i,
      /\/contact\b/i,
    ],
  },
  general: {
    siteType: 'general',
    label: 'website',
    agentGoal: 'work out who you are and what you offer',
    weights: WEIGHTS.general,
    keyPageLabel: 'main pages',
    keyPagePatterns: [
      /\/about\b/i,
      /\/services?\b/i,
      /\/work\b/i,
      /\/portfolio\b/i,
      /\/projects?\b/i,
      /\/contact\b/i,
      /\/team\b/i,
    ],
  },
};

// --- Detection ------------------------------------------------------------

interface Signal {
  siteType: SiteType;
  points: number;
  /** Shown to the visitor when this signal fires. */
  evidence: string;
  matches: (input: DetectionInput) => boolean;
}

interface DetectionInput {
  homepage: HtmlDocument;
  /** Lower-cased homepage text, capped — scanning megabytes of text per rule is waste. */
  text: string;
  /** Lower-cased same-site link URLs, plus tel:/mailto: hrefs and sitemap URLs. */
  paths: string[];
  /** The homepage's own hostname, lower-cased. */
  hostname: string;
  schemaTypes: Set<string>;
  jsonLd: Record<string, unknown>[];
  generator: string;
}

const hasPath = (input: DetectionInput, pattern: RegExp): boolean => input.paths.some((path) => pattern.test(path));

/**
 * How many known URLs match — the honest test when the evidence comes from a
 * sitemap of thousands of entries rather than a handful of nav links. One
 * `/products/` URL on a blog proves nothing; two hundred prove a store.
 */
const countPaths = (input: DetectionInput, pattern: RegExp): number =>
  input.paths.filter((path) => pattern.test(path)).length;

/**
 * Every response header flattened into one lower-cased string.
 *
 * Cheap to build and only used by the platform signals. Header *names* are
 * included alongside values because the giveaway is often the name alone —
 * `x-shopid` says Shopify no matter what number follows it.
 */
const headerBlob = (input: DetectionInput): string =>
  Object.entries(input.homepage.headers || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
    .toLowerCase();

const hasSchema = (input: DetectionInput, ...types: string[]): boolean =>
  types.some((type) => input.schemaTypes.has(type));

/**
 * schema.org LocalBusiness has around 200 subtypes. Rather than enumerate them,
 * match the ones a small business site actually uses, plus anything ending in a
 * telltale suffix.
 */
const LOCAL_BUSINESS_TYPES =
  /^(localbusiness|restaurant|cafe|bakery|bar|hotel|lodging|store|dentist|physician|hospital|medicalclinic|healthandbeautybusiness|beautysalon|hairsalon|dayspa|gym|healthclub|sportsactivitylocation|automotivebusiness|realestateagent|professionalservice|legalservice|attorney|accountingservice|financialservice|homeandconstructionbusiness|childcare|school|educationalorganization|travelagency|eventvenue|foodestablishment|veterinarycare|pharmacy|autorepair|movingcompany|plumber|electrician)$/;

const SIGNALS: Signal[] = [
  // --- ecommerce ---
  {
    siteType: 'ecommerce',
    points: 4,
    evidence: 'Product or Offer structured data on the homepage',
    matches: (input) => hasSchema(input, 'product', 'productgroup', 'offer', 'aggregateoffer'),
  },
  {
    siteType: 'ecommerce',
    points: 3,
    evidence: 'links to a cart or checkout',
    matches: (input) => hasPath(input, /\/(cart|checkout|basket|bag)(\/|$|\?)/i),
  },
  {
    siteType: 'ecommerce',
    points: 3,
    evidence: 'product or shop URLs across the site',
    // Three or more, because the pool now includes the sitemap: a content site
    // that links to a single product page should not read as a store.
    // `/dp/ASIN` is Amazon's product shape and appears nowhere else; without it
    // amazon.in tied with "content" on its own homepage and fell to general.
    matches: (input) =>
      countPaths(input, /\/(products?|shop|collections|store)\//i) + countPaths(input, /\/(dp|itm)\/[a-z0-9]{8,}/i) >= 3,
  },
  {
    /**
     * The storefront a blocked site still admits to.
     *
     * Every large Indian retailer we tested refuses our scanner, leaving
     * classification with a 403 page and no signals at all — so Flipkart was
     * graded on Organization schema instead of Product. Their robots.txt is
     * served without complaint and is unmistakably a shop: `/viewcart`,
     * `/catalog/`, `ajaxaddcart`, and a `Storebot-Google` group.
     *
     * Storebot-Google alone is conclusive — it is Google's *shopping* crawler,
     * and nothing but a store has any reason to name it. The path patterns need
     * two hits, since one stray `/orders` link could appear anywhere.
     */
    siteType: 'ecommerce',
    points: 4,
    evidence: 'robots.txt describes a storefront',
    matches: (input) =>
      hasPath(input, /^ua:storebot-google$/i) ||
      countPaths(input, /(view|my|ajax|add)[-_]?cart|add[-_]?to[-_]?cart|\/catalog(ue)?\/|\/wishlist|\/checkout|\/orders?\b/i) >= 2,
  },
  {
    siteType: 'ecommerce',
    points: 3,
    // A JS-rendered storefront can have a homepage with no readable links at
    // all — thesouledstore's is literally empty. Its sitemap still lists
    // thousands of product URLs, which is the only signal left, and a decisive
    // one at this volume.
    evidence: 'a sitemap dominated by product pages',
    matches: (input) => countPaths(input, /\/(products?|item|p)\/[^/?#]+/i) >= 25,
  },
  {
    siteType: 'ecommerce',
    points: 3,
    evidence: 'buy / add-to-cart wording on the page',
    matches: (input) => /\b(add to (cart|bag|basket)|buy now|shop now|add to trolley)\b/.test(input.text),
  },
  {
    siteType: 'ecommerce',
    points: 2,
    evidence: 'built on an ecommerce platform',
    matches: (input) => /shopify|woocommerce|magento|bigcommerce|prestashop|opencart|wix stores|squarespace commerce/.test(input.generator),
  },
  {
    /**
     * The platform a JavaScript storefront cannot hide.
     *
     * A `<meta name="generator">` tag lives in the HTML, so it vanishes on
     * exactly the sites we struggle with — a client-rendered store sends us an
     * empty shell and every content signal scores zero. The response headers
     * arrive regardless: thesouledstore.com answers `Server: Nitrogen`
     * (Shopify's Hydrogen runtime) with a completely empty body, and Shopify
     * themes leak `cdn.shopify.com` through `link` preconnect headers.
     *
     * Worth three points rather than two because it is harder to fake and
     * survives the case where nothing else does.
     */
    siteType: 'ecommerce',
    points: 3,
    evidence: 'served by an ecommerce platform (from response headers)',
    matches: (input) =>
      /cdn\.shopify\.com|x-shopid|x-shopify|shopify-|server:\s*nitrogen|\bnitrogen\b|x-magento|magento|bigcommerce|woocommerce|prestashop/i.test(
        headerBlob(input),
      ),
  },

  // --- local business ---
  {
    siteType: 'local_business',
    points: 5,
    evidence: 'LocalBusiness structured data',
    matches: (input) => [...input.schemaTypes].some((type) => LOCAL_BUSINESS_TYPES.test(type)),
  },
  {
    siteType: 'local_business',
    points: 3,
    evidence: 'a postal address published on the homepage',
    matches: (input) =>
      input.jsonLd.some((node) => Boolean(node.address)) ||
      input.schemaTypes.has('postaladdress') ||
      // A street line followed by an Indian PIN code — the shape of a footer
      // address on most local sites here.
      /\b(street|road|marg|lane|sector|plot|floor|near)\b[^.]{0,80}\b\d{6}\b/.test(input.text),
  },
  {
    siteType: 'local_business',
    points: 3,
    evidence: 'a phone number to call',
    matches: (input) => hasPath(input, /^tel:/i) || input.jsonLd.some((node) => Boolean(node.telephone)),
  },
  {
    siteType: 'local_business',
    points: 3,
    evidence: 'opening hours or booking wording',
    matches: (input) =>
      /\b(opening hours|open(ing)? (times|timings)|book an appointment|book a table|walk-ins?|visit us|get directions|our timings)\b/.test(input.text),
  },
  {
    siteType: 'local_business',
    points: 2,
    evidence: 'an embedded map',
    matches: (input) => Boolean(input.homepage.$?.('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').length),
  },
  {
    siteType: 'local_business',
    points: 2,
    // Vocabulary that only makes sense for somewhere you physically go. A
    // restaurant chain with no LocalBusiness schema and no tel: link — which
    // is common, and is exactly the finding worth reporting — would otherwise
    // score too low to be recognised, and get generic advice instead of
    // "publish your outlets' addresses and hours".
    evidence: 'wording that implies a physical premises customers visit',
    matches: (input) =>
      /\b(book a table|dine[- ]in|takeaway|take[- ]away|our outlets?|nearest (branch|outlet|store|centre|center)|walk[- ]ins?|reservations?|branches near)\b/.test(
        input.text,
      ),
  },
  {
    siteType: 'local_business',
    points: 3,
    /**
     * "Near me" is the giveaway. An online-only business never writes it —
     * there is nothing to be near. Paired with a word for the kind of place, it
     * is about as clean a signal as this file has.
     *
     * Found by looking at cult.fit, a gym chain that scored zero on every other
     * local signal: no LocalBusiness schema, no tel: link, no address, no map.
     * Which is itself the finding worth selling them.
     */
    evidence: '"near me" wording alongside a physical venue',
    matches: (input) =>
      /\b(near me|near you|nearest|find a (centre|center|studio|store|branch|gym))\b/.test(input.text) &&
      VENUE_WORDS.test(input.text),
  },
  {
    siteType: 'local_business',
    points: 3,
    evidence: 'per-location or per-branch pages',
    matches: (input) => countPaths(input, /\/(gyms?|centres?|centers?|locations?|branch(es)?|outlets?|clinics?|studios?|salons?|restaurants?)\/[^/?#]+/i) >= 3,
  },

  // --- saas ---
  {
    siteType: 'saas',
    points: 4,
    evidence: 'SoftwareApplication structured data',
    matches: (input) => hasSchema(input, 'softwareapplication', 'webapplication', 'mobileapplication', 'softwaresourcecode'),
  },
  {
    siteType: 'saas',
    points: 3,
    evidence: 'a pricing page alongside sign-up or login',
    matches: (input) =>
      hasPath(input, /\/(pricing|plans)(\/|$|\?)/i) &&
      hasPath(input, /\/(signup|sign-up|register|login|log-in|sign-in|get-started|start|trial|demo)(\/|$|\?)/i),
  },
  {
    siteType: 'saas',
    points: 3,
    evidence: 'free-trial or book-a-demo wording',
    matches: (input) => /\b(free trial|start for free|get started free|book a demo|request a demo|sign up free|no credit card)\b/.test(input.text),
  },
  {
    siteType: 'saas',
    points: 2,
    evidence: 'developer docs, an API or integrations',
    matches: (input) => hasPath(input, /\/(docs|documentation|api|developers?|integrations?|changelog)(\/|$|\?)/i),
  },

  // --- content ---
  {
    siteType: 'content',
    points: 4,
    evidence: 'Article or BlogPosting structured data',
    matches: (input) => hasSchema(input, 'article', 'blogposting', 'newsarticle', 'blog', 'techarticle', 'liveblogposting'),
  },
  {
    siteType: 'content',
    points: 3,
    evidence: 'many article or blog links on the homepage',
    matches: (input) => input.paths.filter((path) => /\/(blog|posts?|articles?|news|stor(y|ies))\//i.test(path)).length >= 4,
  },
  {
    siteType: 'content',
    points: 2,
    evidence: 'the homepage declares itself an article feed',
    matches: (input) => (input.homepage.$?.('meta[property="og:type"]').first().attr('content') || '').toLowerCase().includes('article'),
  },
  {
    siteType: 'content',
    points: 2,
    evidence: 'an RSS or Atom feed',
    matches: (input) => Boolean(input.homepage.$?.('link[type="application/rss+xml"], link[type="application/atom+xml"]').length),
  },
  {
    siteType: 'content',
    points: 2,
    evidence: 'dated article URLs',
    matches: (input) => input.paths.filter((path) => /\/(19|20)\d{2}\/\d{1,2}\//.test(path)).length >= 3,
  },
  {
    siteType: 'content',
    points: 4,
    evidence: 'the site lives on a blog or news subdomain',
    matches: (input) => /^(blog|news|stories|journal|magazine)\./.test(input.hostname),
  },
  {
    siteType: 'content',
    points: 3,
    // Root-level blogs (blog.example.com/some-long-headline) match none of the
    // /blog/ URL patterns, so recognise the headline shape itself.
    evidence: 'many headline-shaped links on the homepage',
    matches: (input) => input.paths.filter(isHeadlineUrl).length >= 6,
  },
  {
    siteType: 'content',
    points: -5,
    /**
     * Every software company runs a large content hub, and on a JS-rendered
     * site the sitemap is *all* we see — so the blog drowns out the product.
     * freshworks.com scored content 6 against saas 5 on exactly this and was
     * classified as a publication.
     *
     * A pricing page next to developer docs or a sign-up flow is a product
     * being sold, not a publication. Both are required deliberately: plenty of
     * news sites have a /pricing page for subscriptions, but almost none have
     * /docs or /api next to it.
     */
    evidence: 'discounted: this looks like a product being sold, not a publication',
    matches: (input) =>
      hasPath(input, /\/(pricing|plans)(\/|$|\?)/i) &&
      hasPath(input, /\/(docs|documentation|api|developers?|integrations?|signup|sign-up|get-started|free-trial)(\/|$|\?)/i),
  },
];

/** Words for a place you physically walk into. */
const VENUE_WORDS =
  /\b(gyms?|clinics?|salons?|studios?|centres?|centers?|spas?|restaurants?|cafes?|showrooms?|branch(es)?|outlets?|stores? near|dealers?|hospitals?)\b/;

/** A same-site URL whose last segment reads like a headline slug. */
function isHeadlineUrl(url: string): boolean {
  const path = url.split('?')[0].replace(/\/+$/, '');
  const last = path.split('/').pop() || '';
  if (last.length < 15 || /\.(jpg|png|svg|css|js|xml|json)$/.test(last)) return false;
  return (last.match(/-/g) || []).length >= 3;
}

/**
 * Minimum score before we claim to know what a site is. Below this the honest
 * answer is "a website", and the general profile is the one that assumes least.
 */
const MIN_SCORE = 4;

export interface SiteTypeScore {
  siteType: SiteType;
  score: number;
  evidence: string[];
}

/**
 * Every profile's score, not just the winner.
 *
 * Exposed because tuning detection by staring at the final answer is guesswork
 * — when a SaaS site came back as a publication, the useful question was "how
 * many points did each side get, and from which signal", and that was invisible.
 * `npm run classify -- <url>` prints this.
 */
export function scoreSiteTypes(
  homepage: HtmlDocument,
  sitemapUrls: string[] = [],
  robots: ParsedRobots | null = null,
): SiteTypeScore[] {
  const input = buildInput(homepage, sitemapUrls, robots);

  const scores = new Map<SiteType, number>();
  const evidence = new Map<SiteType, string[]>();

  for (const signal of SIGNALS) {
    let fired = false;
    try {
      fired = signal.matches(input);
    } catch {
      // A malformed page must never break classification; treat it as no signal.
      fired = false;
    }
    if (!fired) continue;

    scores.set(signal.siteType, (scores.get(signal.siteType) || 0) + signal.points);
    const note = signal.points < 0 ? `${signal.evidence} (−${Math.abs(signal.points)})` : signal.evidence;
    evidence.set(signal.siteType, [...(evidence.get(signal.siteType) || []), note]);
  }

  return CLASSIFICATION_PRIORITY.map((siteType) => ({
    siteType,
    score: scores.get(siteType) || 0,
    evidence: evidence.get(siteType) || [],
  }));
}

/**
 * Everything the signals read, gathered once.
 *
 * Which links count depends on where we are standing, and the direction
 * matters:
 *
 *  - On a main site (example.com), sibling subdomains are part of it.
 *    `app.freshworks.com` holds the sign-up flow, and excluding it lost the
 *    strongest evidence that freshworks.com is a product — it was classified
 *    as a publication because its blog outvoted its own pricing page.
 *
 *  - On a subdomain (blog.cloudflare.com), links *up* to the parent are
 *    somebody else's pages. Counting cloudflare.com/pricing and /docs made the
 *    blog read as a SaaS product, and it would then be asked for a pricing page
 *    it has no business having.
 *
 * So: look outward from the apex, never upward from a subdomain.
 */
/**
 * Path-shaped evidence out of robots.txt.
 *
 * This is the only structural evidence some sites give us. Every large Indian
 * retailer we tested refuses our scanner at the homepage, so classification saw
 * a 403 page — 30 characters, no links, no sitemap — and fell to "general".
 * Flipkart was then judged on Organization schema instead of Product, which is
 * the wrong yardstick applied to the wrong entity.
 *
 * Their robots.txt, meanwhile, was served to us happily and is full of
 * `/viewcart`, `/catalog/`, `ajaxaddcart` and a `Storebot-Google` group. That
 * is a store describing itself.
 *
 * Note what this deliberately does *not* do: we also hold a copy of the
 * homepage fetched as GPTBot, which those servers do answer. Reading that for
 * content would mean using another crawler's identity to obtain a page we were
 * refused, and the probe exists to observe treatment, not to route around it.
 * robots.txt is a file the site chose to hand us.
 */
function robotsPathsOf(robots: ParsedRobots | null): string[] {
  if (!robots) return [];
  const out: string[] = [];
  for (const group of robots.groups) {
    for (const agent of group.userAgents) out.push(`ua:${agent.toLowerCase()}`);
    for (const rule of group.rules) {
      if (rule.path) out.push(rule.path.toLowerCase());
    }
  }
  return out.slice(0, 500);
}

function buildInput(homepage: HtmlDocument, sitemapUrls: string[], robots: ParsedRobots | null = null): DetectionInput {
  const jsonLd = homepage.jsonLd();
  const schemaTypes = new Set(jsonLd.flatMap((node) => typesOf(node)));

  const onMainSite = isApexHost(homepage.url);
  const belongsHere = (url: string): boolean =>
    onMainSite ? isSameCompany(url, homepage.url) : isSameSite(url, homepage.url);

  const linkPaths = homepage
    .links()
    .filter((link) => belongsHere(link.url))
    .map((link) => link.url.toLowerCase());

  // Raw hrefs too, so `tel:` and `mailto:` survive — links() drops them because
  // they are not fetchable, but they are strong local-business evidence.
  const rawHrefs: string[] = [];
  homepage.$?.('a[href]').each((_, element) => {
    const href = homepage.$?.(element).attr('href');
    if (href && /^(tel:|mailto:|\/)/i.test(href.trim())) rawHrefs.push(href.trim().toLowerCase());
  });

  return {
    homepage,
    // 20k characters is well past any homepage's navigation and hero copy.
    text: homepage.text().slice(0, 20000).toLowerCase(),
    // A generous slice of the sitemap. For a JS-rendered site this is the only
    // evidence there is, and 400 entries of a 5,000-URL sitemap is routinely
    // all category pages with the product URLs further down. Matching regexes
    // over strings is cheap; being wrong about what a site is, is not.
    paths: [
      ...linkPaths,
      ...rawHrefs,
      ...sitemapUrls.slice(0, 3000).map((url) => url.toLowerCase()),
      ...robotsPathsOf(robots),
    ],
    hostname: hostnameOf(homepage.url),
    schemaTypes,
    jsonLd,
    generator: (homepage.$?.('meta[name="generator"]').first().attr('content') || '').toLowerCase(),
  };
}

/**
 * Ties break towards the profile that expects more of the site, so a store that
 * also runs a blog is still judged as a store.
 */
const CLASSIFICATION_PRIORITY: SiteType[] = ['ecommerce', 'local_business', 'saas', 'content'];

export function detectSiteType(
  homepage: HtmlDocument,
  sitemapUrls: string[] = [],
  robots: ParsedRobots | null = null,
): SiteTypeVerdict {
  const ranked = [...scoreSiteTypes(homepage, sitemapUrls, robots)].sort(
    (a, b) => b.score - a.score || CLASSIFICATION_PRIORITY.indexOf(a.siteType) - CLASSIFICATION_PRIORITY.indexOf(b.siteType),
  );

  const winner = ranked[0];
  const runnerUp = ranked[1];

  if (!winner || winner.score < MIN_SCORE) {
    return {
      siteType: 'general',
      confidence: 'low',
      evidence: ['no strong signals of a store, a local business, a SaaS product or a publication'],
    };
  }

  const margin = winner.score - (runnerUp?.score || 0);
  const confidence: Confidence = winner.score >= 8 && margin >= 3 ? 'high' : winner.score >= MIN_SCORE + 2 ? 'medium' : 'low';

  return {
    siteType: winner.siteType,
    confidence,
    evidence: winner.evidence,
  };
}

export function profileFor(siteType: SiteType): SiteProfile {
  return SITE_PROFILES[siteType];
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}
