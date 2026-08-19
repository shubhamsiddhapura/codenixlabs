/**
 * Offline verification of the check logic against hand-built fixtures.
 *
 *   npm run check
 *
 * No network, no database. Each case pins a decision that is easy to break by
 * accident — the robots.txt group-matching rules, the "missing 1-2 fields is a
 * warning" boundary, the score normalisation when a check is skipped, and the
 * site-type classification that decides what every other check expects.
 */
import { CheckOutcome, CheckStatus, SiteType } from '../types';
import { Deadline, FetchFailure, FetchResult } from '../services/fetcher';
import { HtmlDocument, typesOf } from '../services/htmlDocument';
import { ScanContext } from '../services/scanContext';
import { parseRobotsTxt } from '../services/robotsTxt';
import { SITE_PROFILES, detectSiteType, profileFor } from '../services/siteType';
import { checkBotAccess } from '../services/checks/botAccess';
import { checkAgentInterface } from '../services/checks/agentInterface';
import { checkStructuredData } from '../services/checks/structuredData';
import { SHIPPING_TOPIC, checkTrustSignals } from '../services/checks/trustSignals';
import { checkMetaRobots } from '../services/checks/metaRobots';
import { checkCrawlability, looksParked } from '../services/checks/crawlability';
import { checkContentStructure } from '../services/checks/contentStructure';
import { SCAN_CEILING, SCORING_VERSION, countBlockers, isBlocking, scoreCheck, toGrade, totalScore, weightsFor } from '../services/scoring';
import { InvalidUrlError, isApexHost, isSameCompany, normalizeUrl, registrableDomain } from '../utils/url';
import { looksLikeKeyUrl, looksLikeProductUrl, selectKeyPages } from '../services/discovery';
import { whyNoWebsite } from '../services/scanEngine';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function assertStatus(label: string, outcome: CheckOutcome, expected: CheckStatus): void {
  assert(label, outcome.status === expected, `expected ${expected}, got ${outcome.status}: ${outcome.details}`);
}

// --- Fixture builders -----------------------------------------------------

function response(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    requestedUrl: 'https://shop.test/',
    finalUrl: 'https://shop.test/',
    status: 200,
    ok: true,
    headers: {},
    body: '',
    contentType: 'text/html',
    failure: null,
    blocked: false,
    rateLimited: false,
    truncated: false,
    durationMs: 10,
    ...overrides,
  };
}

function page(html: string, overrides: Partial<FetchResult> = {}): HtmlDocument {
  return new HtmlDocument(response({ body: html, ...overrides }));
}

const PLAIN_HOMEPAGE = `<html><head><title>Test Store — Handmade Goods</title></head>
<body><h1>Test Store</h1><p>${'We sell things people like. '.repeat(40)}</p>
<a href="/products/blue-mug">Blue Mug</a></body></html>`;

const MISSING = response({ status: 404, ok: false, body: '', contentType: 'text/html' });

function context(overrides: Partial<ScanContext> = {}): ScanContext {
  const siteType: SiteType = overrides.siteType ?? 'ecommerce';
  return {
    submittedUrl: 'https://shop.test',
    origin: 'https://shop.test',
    domain: 'shop.test',
    siteType,
    siteTypeConfidence: 'high',
    siteTypeEvidence: [],
    profile: profileFor(siteType),
    homepage: page(PLAIN_HOMEPAGE),
    keyPages: [],
    noKeyPagesFound: false,
    robotsTxt: response({ status: 404, ok: false, body: 'Not found', contentType: 'text/plain' }),
    robots: null,
    agentArtifacts: { ucp: MISSING, 'llms.txt': MISSING },
    // No live probes by default — individual cases opt in.
    botProbes: {},
    sitemapFound: false,
    sitemapUrls: [],
    siteName: 'Test Store',
    deadline: new Deadline(15000),
    ...overrides,
  };
}

const robotsResponse = response({ body: 'x', contentType: 'text/plain' });

// --- Site-type detection --------------------------------------------------

console.log('\nSite-type detection');
{
  const store = page(`<html><head><meta name="generator" content="Shopify"></head><body>
    <a href="/cart">Cart</a><a href="/products/mug">Mug</a><a href="/products/cup">Cup</a>
    <p>Add to cart</p></body></html>`);
  const storeVerdict = detectSiteType(store);
  assert('a Shopify store with a cart is ecommerce', storeVerdict.siteType === 'ecommerce', storeVerdict.siteType);
  assert('  and reports why', storeVerdict.evidence.length > 0);

  const blog = page(`<html><head>
    <link rel="alternate" type="application/rss+xml" href="/feed">
    <script type="application/ld+json">{"@type":"BlogPosting","headline":"Hi"}</script></head>
    <body><a href="/blog/one">One</a><a href="/blog/two">Two</a><a href="/blog/three">Three</a><a href="/blog/four">Four</a></body></html>`);
  assert('a blog with Article schema and a feed is content', detectSiteType(blog).siteType === 'content', detectSiteType(blog).siteType);

  const saas = page(`<html><body>
    <a href="/pricing">Pricing</a><a href="/signup">Sign up</a><a href="/docs">Docs</a>
    <p>Start your free trial. No credit card required.</p></body></html>`);
  assert('pricing + signup + free-trial wording is saas', detectSiteType(saas).siteType === 'saas', detectSiteType(saas).siteType);

  const clinic = page(`<html><head>
    <script type="application/ld+json">{"@type":"Dentist","name":"Smile Clinic","telephone":"+911234567890","address":{"@type":"PostalAddress","streetAddress":"1 Main Road"}}</script>
    </head><body><a href="tel:+911234567890">Call us</a><p>Opening hours: 9 to 6. Book an appointment today.</p></body></html>`);
  assert('a clinic with LocalBusiness schema is local_business', detectSiteType(clinic).siteType === 'local_business', detectSiteType(clinic).siteType);

  // A restaurant chain with no LocalBusiness schema, no tel: link and no map —
  // common, and precisely the site that most needs local-business advice.
  const restaurant = page(
    '<html><body><h1>Grill House</h1><p>Book a table at your nearest outlet. Reservations open daily.</p><a href="/menu">Menu</a></body></html>',
  );
  assert(
    'a restaurant with no schema is still recognised as a local business',
    detectSiteType(restaurant).siteType === 'local_business',
    detectSiteType(restaurant).siteType,
  );

  const brochure = page('<html><head><title>Acme Consulting</title></head><body><p>We advise people.</p><a href="/about">About</a></body></html>');
  const brochureVerdict = detectSiteType(brochure);
  assert('an unclassifiable brochure site falls back to general', brochureVerdict.siteType === 'general', brochureVerdict.siteType);
  assert('  with low confidence, not a confident wrong answer', brochureVerdict.confidence === 'low');

  // A company blog links to its parent's pricing and signup pages. Counting
  // those cross-domain links made blog.cloudflare.com read as a SaaS product.
  const companyBlog = page(
    `<html><body>
      <a href="https://example.com/pricing">Pricing</a>
      <a href="https://example.com/signup">Sign up</a>
      <a href="https://example.com/docs">Docs</a>
      <p>Start your free trial.</p>
      <a href="/how-we-rebuilt-our-network-edge">One</a>
      <a href="/why-we-moved-off-kubernetes-entirely">Two</a>
      <a href="/a-deep-dive-into-tls-handshakes">Three</a>
      <a href="/what-we-learned-shipping-daily">Four</a>
      <a href="/building-a-faster-json-parser">Five</a>
      <a href="/the-story-behind-our-latest-outage">Six</a>
    </body></html>`,
    { finalUrl: 'https://blog.example.com/' },
  );
  const blogVerdict = detectSiteType(companyBlog);
  assert('a company blog is content, not the parent SaaS product', blogVerdict.siteType === 'content', blogVerdict.siteType);

  // A JS-rendered storefront: the homepage is literally empty, so the sitemap
  // is the only evidence there is. It is decisive at this volume.
  const emptyStorefront = page('<html><body><div id="root"></div></body></html>');
  const sitemapOnly = Array.from({ length: 60 }, (_, index) => `https://shop.test/product/item-${index}`);
  const fromSitemap = detectSiteType(emptyStorefront, sitemapOnly);
  assert('a storefront with an empty homepage is still found via its sitemap', fromSitemap.siteType === 'ecommerce', fromSitemap.siteType);

  // ...but one stray product link in a blog's sitemap must not make it a store.
  const blogWithOneProduct = page(`<html><body>${'copy '.repeat(200)}<a href="/blog/a-post-about-things">A</a></body></html>`);
  const notAStore = detectSiteType(blogWithOneProduct, ['https://shop.test/products/one-off', 'https://shop.test/blog/a-post-about-things']);
  assert('a single product URL does not make a site a store', notAStore.siteType !== 'ecommerce', notAStore.siteType);

  // --- the four real misclassifications, kept as permanent cases ---
  //
  // Each of these was a live site we got wrong. The synthetic pages below
  // reproduce the exact signal collision that caused it.

  // freshworks.com: a JS-rendered SaaS site whose only readable evidence is a
  // sitemap full of blog posts. Content outvoted its own pricing page 6-5.
  const saasWithBigBlog = page(
    `<html><body><div id="root"></div></body></html>`,
    { finalUrl: 'https://product.test/' },
  );
  const saasSitemap = [
    'https://product.test/pricing',
    'https://product.test/docs',
    'https://product.test/signup',
    ...Array.from({ length: 20 }, (_, i) => `https://product.test/blog/how-we-solved-problem-number-${i}`),
  ];
  const saasVerdict = detectSiteType(saasWithBigBlog, saasSitemap);
  assert('a SaaS site with a huge blog is still SaaS, not a publication', saasVerdict.siteType === 'saas', saasVerdict.siteType);

  // blog.cloudflare.com: the mirror image. A blog on a subdomain must not
  // inherit its parent's pricing and docs pages and become a product.
  const subdomainBlog = page(
    `<html><body>
      <a href="https://product.test/pricing">Pricing</a>
      <a href="https://product.test/docs">Docs</a>
      <a href="/how-we-rebuilt-our-network-edge">One</a>
      <a href="/why-we-moved-off-kubernetes-entirely">Two</a>
      <a href="/a-deep-dive-into-tls-handshakes">Three</a>
      <a href="/what-we-learned-shipping-daily">Four</a>
      <a href="/building-a-faster-json-parser">Five</a>
      <a href="/the-story-behind-our-latest-outage">Six</a>
    </body></html>`,
    { finalUrl: 'https://blog.product.test/' },
  );
  const subdomainVerdict = detectSiteType(subdomainBlog);
  assert("a subdomain blog does not inherit its parent's pricing page", subdomainVerdict.siteType === 'content', subdomainVerdict.siteType);

  // cult.fit: a gym chain with no LocalBusiness schema, no tel: link, no map
  // and no address — every local signal scored zero and it fell to "general".
  const gymChain = page(
    `<html><body><h1>Fitness</h1>
      <p>${'copy '.repeat(100)} Find a gym near me. Membership options for every centre.</p>
      <a href="/gyms/koramangala-bangalore">Koramangala</a>
      <a href="/gyms/indiranagar-bangalore">Indiranagar</a>
      <a href="/gyms/bandra-mumbai">Bandra</a>
    </body></html>`,
  );
  const gymVerdict = detectSiteType(gymChain);
  assert('a gym chain with no schema is still a local business', gymVerdict.siteType === 'local_business', gymVerdict.siteType);

  // A store that also runs a blog is still a store.
  const storeWithBlog = page(`<html><head><meta name="generator" content="Shopify">
    <script type="application/ld+json">{"@type":"Product","name":"Mug"}</script></head><body>
    <a href="/cart">Cart</a><a href="/products/mug">Mug</a><p>Add to cart</p>
    <a href="/blog/a">a</a><a href="/blog/b">b</a><a href="/blog/c">c</a><a href="/blog/d">d</a></body></html>`);
  assert('a store with a blog is still ecommerce', detectSiteType(storeWithBlog).siteType === 'ecommerce');

  assert('every profile weights total exactly 100', (Object.keys(SITE_PROFILES) as SiteType[]).every((type) => {
    const total = Object.values(weightsFor(type)).reduce((sum, weight) => sum + weight, 0);
    return total === 100;
  }));

  // The spec's row was six checks totalling 100. A seventh made keeping it
  // verbatim impossible, so what is pinned now is its *ordering* — the thing
  // the spec was actually expressing.
  const shop = weightsFor('ecommerce');
  assert(
    'structured data is still the heaviest check for a store, and bot access second',
    shop.structured_data > shop.bot_access &&
      shop.bot_access > Math.max(shop.agent_interface, shop.trust_signals, shop.content_structure, shop.meta_robots, shop.crawlability),
    JSON.stringify(shop),
  );
  assert(
    'page structure is weighted highest for publications, where quoting and attribution matter most',
    weightsFor('content').content_structure > weightsFor('ecommerce').content_structure &&
      weightsFor('content').content_structure > weightsFor('local_business').content_structure,
  );
}

// --- Check 1: bot access --------------------------------------------------

console.log('\nCheck 1 — AI bot access (robots.txt)');
{
  const missing = checkBotAccess(context());
  assertStatus('no robots.txt at all → pass (default is allowed)', missing, 'pass');
  assert('  and offers no fix, since nothing is broken', missing.generatedFix === null);

  const wildcardBlock = parseRobotsTxt('User-agent: *\nDisallow: /');
  const blocked = checkBotAccess(context({ robotsTxt: robotsResponse, robots: wildcardBlock }));
  assertStatus('Disallow: / for everyone → fail', blocked, 'fail');
  assert('  fix names the blocking line', Boolean(blocked.generatedFix?.includes('Disallow: /')));
  assert('  and says exactly which file it goes in', blocked.generatedFixTarget === 'https://shop.test/robots.txt', String(blocked.generatedFixTarget));
  assert('  fix adds an Allow block for GPTBot', Boolean(blocked.generatedFix?.includes('User-agent: GPTBot')));

  /**
   * A rate limit is not a refusal.
   *
   * mrisoftware.com served Amazonbot a 200 and then returned 429 to the next two
   * requests — our own eleven-probe burst tripping its limiter. We reported that
   * as "the server refuses AI crawlers" and took a 25-point check to zero on a
   * site that blocks nobody. The 403 case below has to keep failing, or this fix
   * would have quietly disabled the check that finds real firewall blocks.
   */
  const limitedProbe = response({ status: 429, ok: false, rateLimited: true });
  const servedProbe = response({ status: 200, ok: true });
  const rateLimited = checkBotAccess(
    context({ botProbes: { Amazonbot: limitedProbe, GPTBot: servedProbe, 'Googlebot-control': servedProbe } }),
  );
  assertStatus('a 429 probe → pass, not fail (rate limit ≠ block)', rateLimited, 'pass');
  assert('  and the report says we could not test that crawler', rateLimited.details.includes('rate-limited'), rateLimited.details);
  assert(
    '  the access row does not claim it was live-tested',
    rateLimited.agentAccess?.find((row) => row.agent === 'Amazonbot')?.liveTested === false,
  );
  assert(
    '  nor that it was blocked',
    rateLimited.agentAccess?.find((row) => row.agent === 'Amazonbot')?.status === 'allowed',
  );

  const forbiddenProbe = response({ status: 403, ok: false, blocked: true });
  assertStatus(
    '  but a 403 probe still fails — real firewall blocks must survive this fix',
    checkBotAccess(context({ botProbes: { GPTBot: forbiddenProbe, 'Googlebot-control': servedProbe } })),
    'fail',
  );

  /**
   * What we stay quiet about, and what we must never stop reporting.
   *
   * Read off 23 real warnings in the stored scans. Nearly forty distinct paths
   * were being flagged and almost none were content — the low point was warning
   * a site for disallowing `/.git/`, which is a security necessity. A warning
   * that is wrong most of the time teaches the reader to ignore the ones that
   * are right.
   *
   * Both lists are load-bearing. Widening the housekeeping patterns is easy and
   * quietly turns this check off; the second list is what stops that, and
   * `/services/` is there because a bare `services` token — added for Shopify's
   * internal endpoint — was silencing the most important page a clinic or an
   * agency has.
   */
  const flags = (rulePath: string): boolean => {
    const robots = parseRobotsTxt(`User-agent: *\nAllow: /\nDisallow: ${rulePath}`);
    const status = checkBotAccess(context({ siteType: 'general', profile: profileFor('general'), robotsTxt: robotsResponse, robots })).status;
    return status === 'warning' || status === 'fail';
  };

  const CORRECT_TO_BLOCK = ['/.git/', '/404', '/django-admin/', '/dashboard', '/notifications', '/invites/',
    '/oauth', '/preauthorize', '/confirm', '/u/', '/my_reports/reports/*', '/file_download', '/get_video',
    '/imgres', '/sdch', '/setprefs', '/channel_picker', '/feeds/videos.xml', '/analytics/seomagic/', '/munin*',
    '/archive/graphs.php', '/old-browser.html', '/pages/coming-soon', '/pages/private-page', '/m/', '/country/',
    '/partner/', '/bitria100', '/*/1000$', '/groups'];
  const REAL_CONTENT = ['/blog/', '/collections/gifts-under-799', '/products/', '/policies/refund-policy',
    '/docs/', '/about', '/services/', '/shipping-policy', '/faq', '/case-studies/', '/pricing', '/news/'];

  const noisy = CORRECT_TO_BLOCK.filter(flags);
  assert(`silent about all ${CORRECT_TO_BLOCK.length} paths a site is right to block`, !noisy.length, `still flags: ${noisy.join(', ')}`);
  const missed = REAL_CONTENT.filter((path) => !flags(path));
  assert(`still reports all ${REAL_CONTENT.length} genuine content blocks`, !missed.length, `went silent on: ${missed.join(', ')}`);

  const gptOnly = parseRobotsTxt('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /');
  const gptBlocked = checkBotAccess(context({ robotsTxt: robotsResponse, robots: gptOnly }));
  assertStatus('GPTBot-specific Disallow: / → fail', gptBlocked, 'fail');
  assert('  names GPTBot and not the bots that are still allowed', gptBlocked.details.includes('GPTBot') && !gptBlocked.details.includes('ClaudeBot'));

  // The real default Shopify ships, trimmed of its /policies/ line. Every rule
  // here is housekeeping and none of it should cost the store points.
  const shopify = parseRobotsTxt(
    [
      'User-agent: *',
      'Disallow: /a/downloads/-/*',
      'Disallow: /admin',
      'Disallow: /cart',
      'Disallow: /orders',
      'Disallow: /checkouts/',
      'Disallow: /13080907/checkouts',
      'Disallow: /carts',
      'Disallow: /account',
      'Disallow: /collections/*sort_by*',
      'Disallow: /*/collections/*sort_by*',
      'Disallow: /collections/*+*',
      'Disallow: /collections/*%2B*',
      'Disallow: */collections/*filter*&*filter*',
      'Disallow: /blogs/*+*',
      'Disallow: /*?*oseid=*',
      'Disallow: /*preview_theme_id*',
      'Disallow: /search',
      'Disallow: /apple-app-site-association',
      'Disallow: /cdn/wpm/*.js',
      'Disallow: /recommendations/products',
      'Disallow: /services/login_with_shop',
      'Disallow: /products/*-[a-f0-9][a-f0-9][a-f0-9][a-f0-9]-remote',
      'Disallow: /sf_*',
      'Sitemap: https://shop.test/sitemap.xml',
    ].join('\n'),
  );
  assertStatus('stock Shopify housekeeping rules → pass', checkBotAccess(context({ robotsTxt: robotsResponse, robots: shopify })), 'pass');

  // ...but Shopify's default /policies/ block is a real finding, because an
  // agent that cannot read your returns terms will not recommend you.
  const policiesBlocked = parseRobotsTxt('User-agent: *\nDisallow: /cart\nDisallow: /policies/');
  const policyOutcome = checkBotAccess(context({ robotsTxt: robotsResponse, robots: policiesBlocked }));
  assertStatus('blocked /policies/ → warning', policyOutcome, 'warning');
  assert('  explanation leads with the policy-page consequence', policyOutcome.humanExplanation.includes('cannot read your terms'));

  const wooDefaults = parseRobotsTxt('User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /cart/\nDisallow: /checkout/\nDisallow: /my-account/');
  assertStatus('stock WooCommerce rules → pass', checkBotAccess(context({ robotsTxt: robotsResponse, robots: wooDefaults })), 'pass');

  /**
   * A WordPress blog in a subfolder. The housekeeping patterns used to be
   * anchored to the start of the path, so `/wp-admin/` was recognised and
   * `/blog/wp-admin/` was not — plixlife.com was told it blocked real content
   * when it blocks nothing but its own admin screen.
   */
  const nestedAdmin = parseRobotsTxt(
    'User-agent: *\nDisallow: /blog/wp-admin/\nAllow: /blog/wp-admin/admin-ajax.php\nDisallow: /en/cart',
  );
  assertStatus(
    'housekeeping nested under a subfolder → pass',
    checkBotAccess(context({ robotsTxt: robotsResponse, robots: nestedAdmin })),
    'pass',
  );

  /**
   * A rule value must be a path, not a full URL. Crawlers discard these lines,
   * so the owner believes a page is blocked when it is not — worth saying, and
   * worth saying without changing their score for it.
   */
  const absoluteUrls = parseRobotsTxt('User-agent: *\nDisallow:https://shop.test/login/\nDisallow: /cart');
  assert('absolute-URL rule is recorded as a defect', absoluteUrls.defects.length === 1, JSON.stringify(absoluteUrls.defects));
  assert('  and cites the offending line number', absoluteUrls.defects[0].line === 2, String(absoluteUrls.defects[0]?.line));
  assert('  while the path is still usable for matching', absoluteUrls.groups[0].rules[0].path === '/login/', absoluteUrls.groups[0].rules[0].path);

  const defectOutcome = checkBotAccess(context({ robotsTxt: robotsResponse, robots: absoluteUrls }));
  assertStatus('  an ignored rule does not cost points', defectOutcome, 'pass');
  assert('  but the report says the line is being skipped', defectOutcome.humanExplanation.includes('crawlers cannot read'));

  // Multi-market stores repeat every housekeeping rule behind a locale wildcard.
  const localised = parseRobotsTxt(
    'User-agent: *\nDisallow: /*/cart/\nDisallow: /*/checkout\nDisallow: /*/checkouts/\nDisallow: /*/orders\nDisallow: /*/account\nDisallow: /services\nDisallow: /*/services',
  );
  assertStatus('locale-prefixed housekeeping rules → pass', checkBotAccess(context({ robotsTxt: robotsResponse, robots: localised })), 'pass');

  // Framework plumbing. Almost every modern site blocks these, correctly.
  const plumbing = parseRobotsTxt(
    'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /_next/\nDisallow: /assets/\nDisallow: /*?*utm_\nDisallow: /*?*fbclid',
  );
  assertStatus(
    'blocked /api/ and build output → pass, not a content block',
    checkBotAccess(context({ siteType: 'general', profile: profileFor('general'), robotsTxt: robotsResponse, robots: plumbing })),
    'pass',
  );

  // ...but a real section that happens to sit next to plumbing still warns.
  const realSectionBlocked = parseRobotsTxt('User-agent: *\nDisallow: /api/\nDisallow: /private/\nDisallow: /guides/');
  const realOutcome = checkBotAccess(
    context({ siteType: 'general', profile: profileFor('general'), robotsTxt: robotsResponse, robots: realSectionBlocked }),
  );
  assertStatus('a genuine content section blocked → warning', realOutcome, 'warning');
  assert('  and /api/ is not among the paths it complains about', !realOutcome.details.includes('/api/'), realOutcome.details);

  const productsBlocked = parseRobotsTxt('User-agent: *\nDisallow: /products/');
  const productPage = page('<html><body>mug</body></html>', { finalUrl: 'https://shop.test/products/blue-mug' });
  assertStatus(
    'product path blocked → fail',
    checkBotAccess(context({ robotsTxt: robotsResponse, robots: productsBlocked, keyPages: [productPage] })),
    'fail',
  );

  // The same check on a blog must judge blog paths, not product paths.
  const blogBlocked = parseRobotsTxt('User-agent: *\nDisallow: /blog/');
  assertStatus(
    'a blog blocked from /blog/ → fail',
    checkBotAccess(context({ siteType: 'content', profile: profileFor('content'), robotsTxt: robotsResponse, robots: blogBlocked })),
    'fail',
  );
  assertStatus(
    'the same rule on a store is only a warning, since products are reachable',
    checkBotAccess(context({ robotsTxt: robotsResponse, robots: blogBlocked })),
    'warning',
  );

  // Group semantics: an exact user-agent match must win outright, not merge
  // with the wildcard group.
  const specificWins = parseRobotsTxt('User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nAllow: /\nDisallow: /cart');
  const mixed = checkBotAccess(context({ robotsTxt: robotsResponse, robots: specificWins }));
  assertStatus('wildcard blocks all, ClaudeBot exempted → still fail for the others', mixed, 'fail');
  assert('  ClaudeBot is not listed as blocked', !mixed.details.includes('ClaudeBot'), mixed.details);

  const unreachable = checkBotAccess(context({ robotsTxt: response({ ok: false, status: null, failure: 'timeout' }) }));
  assertStatus('robots.txt unreachable → warning, not a guess', unreachable, 'warning');

  // --- live probes: what the server does, not what the file says ---
  const served = response({ status: 200, ok: true, body: 'ok' });
  const refusedProbe = response({ status: 403, ok: false, blocked: true, body: 'Forbidden' });

  const allowedByFile = parseRobotsTxt('User-agent: *\nAllow: /');
  const firewallContradicts = checkBotAccess(
    context({
      robotsTxt: robotsResponse,
      robots: allowedByFile,
      botProbes: { GPTBot: refusedProbe, ClaudeBot: refusedProbe, PerplexityBot: served },
    }),
  );
  assertStatus('robots.txt says yes but the server refuses GPTBot → fail', firewallContradicts, 'fail');
  assert('  names the crawlers that were turned away', firewallContradicts.details.includes('GPTBot') && firewallContradicts.details.includes('ClaudeBot'));
  assert('  and not the one that was served', !firewallContradicts.details.includes('PerplexityBot'), firewallContradicts.details);
  assert('  explains the file/firewall contradiction', firewallContradicts.humanExplanation.includes('robots.txt can say "come in" while your firewall says "no"'));

  const consistent = checkBotAccess(
    context({ robotsTxt: robotsResponse, robots: allowedByFile, botProbes: { GPTBot: served, ClaudeBot: served, PerplexityBot: served } }),
  );
  assertStatus('robots.txt allows and the server serves → pass', consistent, 'pass');
  assert('  says the live test was run, not just the file read', consistent.details.includes('Live requests as GPTBot'));

  // A site that refuses unknown scanners but allowlists the named crawlers is
  // correctly configured, and must not be marked down for refusing us.
  const allowlisted = checkBotAccess(
    context({
      homepage: page('Forbidden', { status: 403, ok: false, blocked: true }),
      robotsTxt: response({ status: 403, ok: false, blocked: true }),
      botProbes: { GPTBot: served, ClaudeBot: served, PerplexityBot: served },
    }),
  );
  assertStatus('refuses our scanner but serves the AI crawlers → pass', allowlisted, 'pass');

  // When the site refuses everyone, that is crawlability's finding — this check
  // must not double-report it as a crawler-specific block.
  const refusesEveryone = checkBotAccess(
    context({
      homepage: page('Forbidden', { status: 403, ok: false, blocked: true }),
      robotsTxt: robotsResponse,
      robots: allowedByFile,
      botProbes: { GPTBot: refusedProbe, ClaudeBot: refusedProbe, PerplexityBot: refusedProbe },
    }),
  );
  assert('a site that refuses everyone is not reported as an AI-specific block', refusesEveryone.status !== 'fail', refusesEveryone.details);
}

// --- Check 7: page structure & metadata -----------------------------------

console.log('\nCheck 7 — page structure & metadata');
{
  const wellFormed = `<html><head>
    <link rel="canonical" href="https://shop.test/">
    <meta property="og:title" content="Test Store">
    <meta property="og:description" content="We sell mugs.">
    <meta property="og:image" content="https://shop.test/og.jpg">
    <meta property="og:url" content="https://shop.test/">
    <meta property="og:type" content="website">
    </head><body><header><nav><a href="/x">Nav</a></nav></header>
    <main><h1>Test Store</h1><h2>Our mugs</h2><p>${'copy '.repeat(200)}</p>
    <img src="/a.jpg" alt="A blue mug"><time datetime="2026-01-04">4 Jan</time></main></body></html>`;

  assertStatus('a well-formed page → pass', checkContentStructure(context({ homepage: page(wellFormed) })), 'pass');

  const noCanonical = wellFormed.replace(/<link rel="canonical"[^>]*>/, '');
  const missingOne = checkContentStructure(context({ homepage: page(noCanonical) }));
  assertStatus('one missing signal → warning', missingOne, 'warning');
  assert('  the fix supplies a canonical tag', Boolean(missingOne.generatedFix?.includes('<link rel="canonical"')));
  assert('  and does not invent tags that are already fine', !missingOne.generatedFix?.includes('og:title'));

  const bare = `<html><head><title>Shop</title></head><body>
    <div><h1>One</h1><h1>Two</h1><h3>Skipped</h3><p>${'copy '.repeat(200)}</p>
    <img src="/a.jpg"><img src="/b.jpg"><img src="/c.jpg"></div></body></html>`;
  const broken = checkContentStructure(context({ homepage: page(bare) }));
  assertStatus('canonical, OG, headings, alt and landmarks all missing → fail', broken, 'fail');
  assert('  the fix covers the pasteable parts', Boolean(broken.generatedFix?.includes('og:title') && broken.generatedFix.includes('canonical')));
  assert('  and names the template edits rather than faking them', Boolean(broken.generatedFix?.includes('exactly one <h1> per page')));

  // A canonical pointing off-site hands your citations to someone else.
  const foreignCanonical = wellFormed.replace('href="https://shop.test/"', 'href="https://someoneelse.test/"');
  const foreign = checkContentStructure(context({ homepage: page(foreignCanonical) }));
  assert('a canonical pointing off-site is caught', foreign.details.includes('off-site'), foreign.details);

  // alt="" is a deliberate "decorative", not a gap.
  const decorative = wellFormed.replace('alt="A blue mug"', 'alt=""');
  assertStatus('alt="" counts as handled, not missing', checkContentStructure(context({ homepage: page(decorative) })), 'pass');

  assertStatus(
    'a page we never received is skipped, not failed',
    checkContentStructure(context({ homepage: page('Forbidden', { status: 403, ok: false, blocked: true }) })),
    'skipped',
  );
}

// --- Check 2: agent interface ---------------------------------------------

console.log('\nCheck 2 — machine-readable agent interface');
{
  const json = (body: unknown) => response({ body: JSON.stringify(body), contentType: 'application/json' });

  // --- store: UCP ---
  const noUcp = checkAgentInterface(context());
  assertStatus('store with no UCP and no llms.txt → fail', noUcp, 'fail');
  assert('  generates a valid starter manifest', isJson(noUcp.generatedFix));
  assert('  pre-filled with the real domain', Boolean(noUcp.generatedFix?.includes('shop.test')));
  assert('  undetectable fields are loud placeholders', Boolean(noUcp.generatedFix?.includes('REPLACE_WITH_')));
  assert('  starter manifest uses the real ucp envelope shape', Boolean(noUcp.generatedFix && JSON.parse(noUcp.generatedFix).ucp?.services));
  // JSON cannot carry a comment, so the path has to travel beside the block.
  assert('  and says exactly where to save it, since JSON cannot say so itself', Boolean(noUcp.generatedFixTarget?.includes('/.well-known/ucp')), String(noUcp.generatedFixTarget));

  // We tell the reader nothing reads llms.txt, so we must not then hand them
  // one to publish. A fix for a problem we just called a placebo would discredit
  // the paragraph above it.
  const blogNoLlmsTarget = checkAgentInterface(context({ siteType: 'content', profile: profileFor('content'), agentArtifacts: { 'llms.txt': MISSING } }));
  assert('no llms.txt fix is offered where it scores nothing', blogNoLlmsTarget.generatedFixTarget === null, String(blogNoLlmsTarget.generatedFixTarget));

  // The shape Shopify actually serves: everything under a `ucp` envelope, with
  // `services` endpoints instead of a business_name field.
  const shopifyManifest = {
    ucp: {
      version: '2026-04-08',
      supported_versions: { '2026-04-08': 'https://test.myshopify.com/.well-known/ucp/2026-04-08' },
      services: { 'dev.ucp.shopping': [{ version: '2026-04-08', transport: 'mcp', endpoint: 'https://test.myshopify.com/api/ucp/mcp' }] },
      capabilities: { 'dev.ucp.shopping.checkout': [{ version: '2026-04-08' }] },
    },
  };
  const shopifyUcp = checkAgentInterface(context({ agentArtifacts: { ucp: json(shopifyManifest), 'llms.txt': MISSING } }));
  assertStatus('real Shopify-shaped manifest → pass', shopifyUcp, 'pass');
  assert('  reports the declared capabilities', shopifyUcp.details.includes('dev.ucp.shopping'), shopifyUcp.details);

  assertStatus(
    'flat hand-rolled manifest with capabilities + identifier → pass',
    checkAgentInterface(context({ agentArtifacts: { ucp: json({ capabilities: { catalog: true }, business_name: 'Test Store' }), 'llms.txt': MISSING } })),
    'pass',
  );
  assertStatus(
    'manifest with no capabilities → warning',
    checkAgentInterface(context({ agentArtifacts: { ucp: json({ business_name: 'Test Store' }), 'llms.txt': MISSING } })),
    'warning',
  );
  assertStatus(
    'invalid JSON → warning',
    checkAgentInterface(context({ agentArtifacts: { ucp: response({ body: '{ "capabilities": , }', contentType: 'application/json' }), 'llms.txt': MISSING } })),
    'warning',
  );

  // SPA hosts answer 200 with index.html for every unknown path.
  const softFourOhFour = checkAgentInterface(
    context({ agentArtifacts: { ucp: response({ body: '<!DOCTYPE html><html><head><title>Shop</title></head><body>hi</body></html>', contentType: 'text/html; charset=utf-8' }), 'llms.txt': MISSING } }),
  );
  assertStatus('soft 404 (200 + HTML) → fail, not a malformed-manifest warning', softFourOhFour, 'fail');

  // A site that refuses our scanner tells us nothing about what it publishes.
  const refused = response({ status: 403, ok: false, blocked: true, body: 'Forbidden', contentType: 'text/html' });
  assertStatus(
    'every probe refused with 403 → skipped, not a fail we cannot justify',
    checkAgentInterface(context({ agentArtifacts: { ucp: refused, 'llms.txt': refused } })),
    'skipped',
  );

  // --- llms.txt as the fallback and as the primary ---
  const goodLlms = response({
    body: '# Test Store\n\n> We sell handmade mugs.\n\n## Products\n- [Blue Mug](https://shop.test/products/blue-mug): our bestseller\n',
    contentType: 'text/plain',
  });

  const storeWithLlmsOnly = checkAgentInterface(context({ agentArtifacts: { ucp: MISSING, 'llms.txt': goodLlms } }));
  assertStatus('store with llms.txt but no UCP → warning, credit for the easy win', storeWithLlmsOnly, 'warning');

  /**
   * llms.txt is reported but never scored for these site types.
   *
   * We used to fail sites for not having one. Then the evidence came in: Google
   * states publicly that no AI system fetches llms.txt, and independent crawls
   * of ~137,000 domains found 97% are never requested by anything. Scoring it
   * meant docking real sites for missing a file with no readers — the exact
   * placebo this tool exists to expose.
   */
  const blogNoLlms = checkAgentInterface(context({ siteType: 'content', profile: profileFor('content'), agentArtifacts: { 'llms.txt': MISSING } }));
  assertStatus('blog with no llms.txt → not scored, not a failure', blogNoLlms, 'skipped');
  assert('  and says plainly that nothing reads the file', blogNoLlms.humanExplanation.includes('no AI system currently reads llms.txt'));
  assert('  it is worth zero points either way', weightsFor('content').agent_interface === 0);
  // Consistency is the point. Saying "nothing reads this" and then generating
  // the file anyway is the contradiction a sharp reader uses to dismiss the
  // rest of the report.
  assert('  and offers no file to create, matching its own advice', blogNoLlms.generatedFix === null);
  assert('  no dangling language or destination either', blogNoLlms.generatedFixLanguage === null && blogNoLlms.generatedFixTarget === null);
  assert('  and says why it is not giving one', blogNoLlms.humanExplanation.includes('not giving you a file'));

  assertStatus(
    'blog with a good llms.txt → still not scored, just acknowledged',
    checkAgentInterface(context({ siteType: 'content', profile: profileFor('content'), agentArtifacts: { 'llms.txt': goodLlms } })),
    'skipped',
  );
  // A store's UCP manifest is a different matter — that one is consumed by
  // real clients today, so it stays scored.
  assert(
    'UCP stays scored for stores, MCP for software',
    weightsFor('ecommerce').agent_interface > 0 && weightsFor('saas').agent_interface > 0,
  );

  // --- saas: MCP / OpenAPI ---
  const saasCtx = (artifacts: Record<string, FetchResult>) =>
    context({ siteType: 'saas', profile: profileFor('saas'), agentArtifacts: artifacts });

  assertStatus(
    'saas with an MCP descriptor → pass',
    checkAgentInterface(saasCtx({ mcp: json({ name: 'Tool', servers: [{ url: 'https://api.test/mcp' }] }), openapi: MISSING, 'llms.txt': MISSING })),
    'pass',
  );
  assertStatus(
    'saas with nothing → fail',
    checkAgentInterface(saasCtx({ mcp: MISSING, openapi: MISSING, 'llms.txt': MISSING })),
    'fail',
  );
  assertStatus(
    'saas with only llms.txt → warning',
    checkAgentInterface(saasCtx({ mcp: MISSING, openapi: MISSING, 'llms.txt': goodLlms })),
    'warning',
  );
}

// --- Check 3: structured data ---------------------------------------------

console.log('\nCheck 3 — structured data, per site type');
{
  // --- store: Product ---
  const complete = schemaPage({
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: 'Blue Mug',
    image: ['https://shop.test/mug.jpg'],
    brand: { '@type': 'Brand', name: 'Test Store' },
    offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
  });
  assertStatus('store: all required fields → pass', checkStructuredData(context({ keyPages: [page(complete)] })), 'pass');

  const twoMissing = schemaPage({
    '@type': 'Product',
    name: 'Blue Mug',
    image: 'https://shop.test/mug.jpg',
    offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR' },
  });
  const warned = checkStructuredData(context({ keyPages: [page(twoMissing)] }));
  assertStatus('store: missing availability + brand → warning', warned, 'warning');
  assert('  fix is a pasteable ld+json script block', Boolean(warned.generatedFix?.startsWith('<!--') && warned.generatedFix.includes('application/ld+json')));

  assertStatus(
    'store: missing 3+ fields → fail (markup present but unusable)',
    checkStructuredData(context({ keyPages: [page(schemaPage({ '@type': 'Product', name: 'Blue Mug', image: 'https://shop.test/mug.jpg' }))] })),
    'fail',
  );

  // The URL matters now, not just the HTML. A real store's key pages are
  // product pages; a page at the site root standing in for one would trip the
  // "we never opened a product page" guard and skip instead of failing, which
  // would hide the very case this asserts.
  const none = checkStructuredData(
    context({ keyPages: [page('<html><body><h1>Blue Mug</h1><p>₹499</p></body></html>', { finalUrl: 'https://shop.test/products/blue-mug' })] }),
  );
  assertStatus('store: no Product markup on a real product page → fail', none, 'fail');
  assert('  fix reuses the price scraped off the page', Boolean(none.generatedFix?.includes('"price": "499"')), none.generatedFix ?? '');
  assert('  and names the page it belongs on', none.generatedFixTarget === 'The <head> section of each product page', String(none.generatedFixTarget));

  // Every check that emits code must say where the code goes. A block nobody
  // knows where to put is not a fix — and the person pasting it is usually not
  // the person who read the report.
  const emitters = [
    checkBotAccess(context({ robotsTxt: robotsResponse, robots: parseRobotsTxt('User-agent: *\nDisallow: /') })),
    checkAgentInterface(context()),
    checkStructuredData(context({ keyPages: [page('<html><body><h1>Mug</h1></body></html>')] })),
    checkContentStructure(context({ homepage: page('<html><head><title>x</title></head><body><div><p>hi</p></div></body></html>') })),
  ];
  assert(
    'every generated fix carries a target',
    emitters.every((outcome) => !outcome.generatedFix || Boolean(outcome.generatedFixTarget)),
    JSON.stringify(emitters.map((o) => [o.checkId, Boolean(o.generatedFix), o.generatedFixTarget])),
  );

  // Real stores bury the Product inside @graph or an ItemList.
  const graph = schemaPage({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Test Store' },
      { '@type': 'Product', name: 'Blue Mug', image: 'https://shop.test/mug.jpg', brand: 'Test Store', offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR', availability: 'InStock' } },
    ],
  });
  assertStatus('store: Product nested in @graph is found', checkStructuredData(context({ keyPages: [page(graph)] })), 'pass');

  // Shopify's current markup: price lives in an array of price specifications
  // and `offers.price` is absent entirely.
  const priceSpecArray = schemaPage({
    '@type': 'Product',
    name: 'Blue Mug',
    image: 'https://shop.test/mug.jpg',
    brand: { '@type': 'Brand', name: 'Test Store' },
    offers: {
      '@type': 'Offer',
      priceSpecification: [
        { '@type': 'UnitPriceSpecification', price: 314, priceCurrency: 'INR' },
        { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: 349, priceCurrency: 'INR' },
      ],
      availability: 'https://schema.org/InStock',
    },
  });
  assertStatus('store: price in a priceSpecification array counts', checkStructuredData(context({ keyPages: [page(priceSpecArray)] })), 'pass');

  assertStatus(
    'store: AggregateOffer lowPrice counts as a price',
    checkStructuredData(context({ keyPages: [page(schemaPage({ '@type': 'Product', name: 'Blue Mug', image: 'https://shop.test/mug.jpg', brand: 'Test Store', offers: { '@type': 'AggregateOffer', lowPrice: '499', priceCurrency: 'INR', availability: 'InStock' } }))] })),
    'pass',
  );
  assertStatus(
    'store: malformed JSON-LD does not crash the check',
    checkStructuredData(
      context({
        keyPages: [
          page('<html><body><script type="application/ld+json">{ "@type": "Product", }</script></body></html>', {
            finalUrl: 'https://shop.test/products/blue-mug',
          }),
        ],
      }),
    ),
    'fail',
  );

  /**
   * A category listing is not a product page.
   *
   * themancompany.com scored 0 out of 28 for "no Product markup" and the only
   * page we opened was /collections/hair. Product schema does not belong on a
   * listing, so its absence there is not evidence of anything.
   */
  assertStatus(
    'store: only a category page sampled → skipped, not a 28-point fail',
    checkStructuredData(
      context({ keyPages: [page('<html><body><h1>Hair</h1></body></html>', { finalUrl: 'https://shop.test/collections/hair' })] }),
    ),
    'skipped',
  );
  assertStatus(
    '  but a store with good markup on an unrecognised URL is still judged',
    checkStructuredData(
      context({ keyPages: [page(complete, { finalUrl: 'https://shop.test/shop/item-9912' })] }),
    ),
    'pass',
  );

  /**
   * Where "incomplete" turns into "might as well be absent".
   *
   * The threshold used to be a flat count — three or more missing fields failed.
   * A flat count cannot mean the same thing across profiles that ask for
   * different numbers of fields: three missing out of four is a shell, three
   * missing out of nine is a gap. It is proportional now, so the line sits at
   * "most of the required fields are gone".
   *
   * Both assertions matter. The first is the softening; the second is the limit
   * on it — a store publishing a Product node with no price, no currency, no
   * stock and no image has the wrapper and none of the facts, and a shopping
   * assistant can do exactly as much with that as with nothing.
   */
  const halfPresent = schemaPage({
    '@type': 'Product',
    name: 'Blue Mug',
    image: 'https://shop.test/mug.jpg',
    offers: { '@type': 'Offer', price: '499', priceCurrency: 'INR' },
  });
  assertStatus(
    'store: half the fields present → warning, not a total loss',
    checkStructuredData(context({ keyPages: [page(halfPresent, { finalUrl: 'https://shop.test/products/blue-mug' })] })),
    'warning',
  );

  const wrapperOnly = schemaPage({ '@type': 'Product', name: 'Blue Mug', description: 'A mug', sku: 'MUG-1' });
  assertStatus(
    '  but a Product node with no price, stock or image still fails',
    checkStructuredData(context({ keyPages: [page(wrapperOnly, { finalUrl: 'https://shop.test/products/blue-mug' })] })),
    'fail',
  );

  // --- blog: Article ---
  const contentCtx = (pages: HtmlDocument[]) => context({ siteType: 'content', profile: profileFor('content'), keyPages: pages });

  const article = schemaPage({
    '@type': 'BlogPosting',
    headline: 'How to brew coffee',
    author: { '@type': 'Person', name: 'A Writer' },
    datePublished: '2026-01-04',
    image: 'https://shop.test/a.jpg',
    publisher: { '@type': 'Organization', name: 'Test Blog' },
  });
  assertStatus('blog: complete Article schema → pass', checkStructuredData(contentCtx([page(article)])), 'pass');

  const noAuthor = checkStructuredData(contentCtx([page(schemaPage({ '@type': 'Article', headline: 'X', image: 'https://shop.test/a.jpg', publisher: { name: 'B' }, datePublished: '2026-01-04' }))]));
  assertStatus('blog: missing author → warning', noAuthor, 'warning');
  assert('  explains that attribution is what is at stake', noAuthor.humanExplanation.includes('citable'));

  const productOnBlog = checkStructuredData(contentCtx([page(complete)]));
  assertStatus('blog: Product schema does not satisfy the Article check', productOnBlog, 'fail');
  assert('  and the generated fix is an Article block', Boolean(productOnBlog.generatedFix?.includes('"@type": "Article"')));

  // --- clinic: LocalBusiness, judged on the homepage ---
  const clinicHome = page(
    schemaPage({
      '@type': 'Dentist',
      name: 'Smile Clinic',
      address: { '@type': 'PostalAddress', streetAddress: '1 Main Road', addressLocality: 'Pune' },
      telephone: '+911234567890',
      openingHoursSpecification: [{ dayOfWeek: ['Monday'], opens: '09:00', closes: '18:00' }],
      url: 'https://shop.test',
    }),
  );
  assertStatus(
    'clinic: complete LocalBusiness schema on the homepage → pass',
    checkStructuredData(context({ siteType: 'local_business', profile: profileFor('local_business'), homepage: clinicHome })),
    'pass',
  );

  const clinicNoHours = checkStructuredData(
    context({
      siteType: 'local_business',
      profile: profileFor('local_business'),
      homepage: page(schemaPage({ '@type': 'Dentist', name: 'Smile Clinic', address: { streetAddress: '1 Main Road' }, telephone: '+911234567890', url: 'https://shop.test' })),
    }),
  );
  assertStatus('clinic: missing opening hours → warning', clinicNoHours, 'warning');
  assert('  explains the wasted-trip risk', clinicNoHours.humanExplanation.includes('wasted trip'));

  // A local business is judged on its homepage, so empty keyPages must not
  // skip the check the way it would for a store.
  assertStatus(
    'clinic: no subpages sampled still gets judged, not skipped',
    checkStructuredData(context({ siteType: 'local_business', profile: profileFor('local_business'), homepage: clinicHome, keyPages: [] })),
    'pass',
  );

  // --- saas: SoftwareApplication ---
  assertStatus(
    'saas: complete SoftwareApplication → pass',
    checkStructuredData(
      context({
        siteType: 'saas',
        profile: profileFor('saas'),
        homepage: page(schemaPage({ '@type': 'SoftwareApplication', name: 'Tool', description: 'It does things.', applicationCategory: 'BusinessApplication', offers: { '@type': 'Offer', price: '999', priceCurrency: 'INR' } })),
      }),
    ),
    'pass',
  );

  // --- general: Organization ---
  const orgHome = page(schemaPage({ '@type': 'Organization', name: 'Acme', url: 'https://shop.test', logo: 'https://shop.test/logo.png', contactPoint: { telephone: '+911234567890' } }));
  assertStatus('general: complete Organization → pass', checkStructuredData(context({ siteType: 'general', profile: profileFor('general'), homepage: orgHome })), 'pass');

  const noOrg = checkStructuredData(context({ siteType: 'general', profile: profileFor('general'), homepage: page(PLAIN_HOMEPAGE) }));
  assertStatus('general: no Organization schema → fail', noOrg, 'fail');
  assert('  and the fix is an Organization block', Boolean(noOrg.generatedFix?.includes('"@type": "Organization"')));
}

// --- Check 5: meta robots -------------------------------------------------

console.log('\nCheck 5 — indexability');
{
  assertStatus('clean page → pass', checkMetaRobots(context()), 'pass');

  const noindex = page('<html><head><meta name="robots" content="noindex, follow"></head><body>hi</body></html>');
  assertStatus('meta noindex → fail', checkMetaRobots(context({ homepage: noindex })), 'fail');

  const header = page('<html><head></head><body>hi</body></html>', { headers: { 'x-robots-tag': 'noindex' } });
  const headerOutcome = checkMetaRobots(context({ homepage: header }));
  assertStatus('X-Robots-Tag: noindex → fail', headerOutcome, 'fail');
  assert('  explanation points at the server header, not a meta tag', headerOutcome.humanExplanation.includes('X-Robots-Tag'));

  assertStatus('nofollow only → warning', checkMetaRobots(context({ homepage: page('<html><head><meta name="robots" content="index, nofollow"></head><body>hi</body></html>') })), 'warning');

  const productNoindex = page('<html><head><meta name="robots" content="noindex"></head><body>x</body></html>', { finalUrl: 'https://shop.test/products/blue-mug' });
  const mixed = checkMetaRobots(context({ keyPages: [productNoindex] }));
  assertStatus('noindex on a key page only → fail', mixed, 'fail');
  assert('  reports 1 of 2 pages affected', mixed.details.includes('1/2'), mixed.details);
}

// --- Check 6: crawlability ------------------------------------------------

console.log('\nCheck 6 — crawlability');
{
  assertStatus('healthy homepage → pass', checkCrawlability(context()).outcome, 'pass');

  /**
   * A registered domain with nothing on it. ishantanna.in answered 200 with 114
   * bytes — a script redirecting to a parking lander — and we graded it D 49/100
   * and told it to add Product schema.
   *
   * The three negatives below are the ones that matter. A real single-page app
   * looks superficially identical — almost no text, an empty body — and must
   * never be caught by this, because "you are a JavaScript site" and "you do not
   * exist" are completely different findings.
   */
  const parkingPage =
    '<!DOCTYPE html><html><head><script>window.onload=function(){window.location.href="/lander"}</script></head></html>';
  assert('parked domain is recognised', looksParked(page(parkingPage)));
  assert('  a metarefresh holder too', looksParked(page('<html><head><meta http-equiv="refresh" content="0;url=/lander"></head></html>')));

  assert(
    '  a real SPA shell is not parked — it ships a bundle',
    !looksParked(page('<html><head><title>Shop</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>')),
  );
  assert('  nor is a normal page', !looksParked(page(PLAIN_HOMEPAGE)));
  assert(
    '  nor a small page that actually says something',
    !looksParked(page('<html><body><h1>Coming soon</h1><p>Our new store opens in March. Follow us for updates and launch offers.</p></body></html>')),
  );

  /**
   * The second shape of nothing: a domain that never answered at all.
   *
   * looksParked only fires on a page we actually received, so shubhtanna.com —
   * no DNS record anywhere — sailed past it into normal scoring and came out
   * F 35/100 with a lead form under it. Every transport failure has to reach
   * the no-website path, and each one keeps its own cause so the reader is told
   * "this domain does not exist" rather than "we could not check your site".
   */
  const dead = (failure: string) => page('', { ok: false, status: null, failure: failure as FetchFailure });
  assert('a domain with no DNS record is not a website', whyNoWebsite(dead('dns')) === 'dns');
  assert('  a refused connection is not either', whyNoWebsite(dead('connection_refused')) === 'unreachable');
  // `network` deliberately no longer lands here — see the catch-all note below.
  assert('  nor a timeout', whyNoWebsite(dead('timeout')) === 'timeout');
  assert('  nor a broken certificate', whyNoWebsite(dead('ssl')) === 'ssl');
  assert('  nor a redirect loop', whyNoWebsite(dead('redirect_loop')) === 'redirect_loop');
  assert('  the parking case still routes here', whyNoWebsite(page(parkingPage)) === 'parked');

  /**
   * Our clock running out is not evidence about their site.
   *
   * `deadline_exceeded` means the scan budget was spent, not that the server
   * failed to answer. Routed to the no-website path it told healthy sites they
   * did not exist — squeezing the budget to four seconds produced F/0 and "that
   * can mean the site is down" for codenixlabs.com, which was plainly up. The
   * genuine `timeout` above still counts, because that one is about them.
   */
  assert('our own budget running out is not a dead site', whyNoWebsite(dead('deadline_exceeded')) === null);

  /**
   * The strongest claim this tool makes must not rest on a catch-all.
   *
   * `network` is where every unclassified transport error lands, and routing it
   * to the no-website verdict meant any hiccup we had not named declared a
   * domain nonexistent. mastersunion.org — a live business school answering
   * HTTP 200 with a 4MB homepage — was told "nothing answered at this address",
   * because the oversize abort fell into that bucket. Saying a website does not
   * exist should require evidence, not the absence of a better label.
   */
  assert('an unclassified network error is not proof of absence', whyNoWebsite(dead('network')) === null);
  assert('  and a page too large to hold is a finding, not an absence', whyNoWebsite(dead('too_large')) === null);
  assert('  while a refused connection remains solid evidence', whyNoWebsite(dead('connection_refused')) === 'unreachable');

  assert('a healthy page is a website', whyNoWebsite(page(PLAIN_HOMEPAGE)) === null);
  assert(
    '  and so is one that answered but refused us — blocked is a finding, not an absence',
    whyNoWebsite(page('Attention Required! | Cloudflare', { status: 403, ok: false, blocked: true })) === null,
  );

  /**
   * Pages we ran out of time to fetch are not broken pages.
   *
   * inapp.com was told "5 of 6 sampled pages did not return HTTP 200" and handed
   * five URLs that work perfectly — the scan budget expired mid-crawl and we
   * reported our own clock as their outage. The genuine 404 below has to keep
   * failing, or this fix would hide real broken pages.
   */
  const ranOut = page('', { finalUrl: 'https://shop.test/a', ok: false, status: null, failure: 'deadline_exceeded' as FetchFailure });
  const genuine404 = page('', { finalUrl: 'https://shop.test/b', ok: false, status: 404 });
  const timedOutPages = checkCrawlability(context({ keyPages: [page(PLAIN_HOMEPAGE, { finalUrl: 'https://shop.test/ok' }), ranOut] }));
  assert(
    'pages we ran out of time for are not reported as broken',
    !timedOutPages.outcome.details.includes('did not return HTTP 200'),
    timedOutPages.outcome.details,
  );
  assert(
    '  but a real 404 still is',
    checkCrawlability(context({ keyPages: [page(PLAIN_HOMEPAGE, { finalUrl: 'https://shop.test/ok' }), genuine404] })).outcome.details.includes(
      'did not return HTTP 200',
    ),
  );

  const spa = checkCrawlability(context({ homepage: page('<html><body><div id="root"></div><script src="/app.js"></script></body></html>') }));
  assertStatus('empty SPA shell → warning', spa.outcome, 'warning');
  assert('  sets the JS-render flag for the report banner', spa.jsRenderWarning);
  assert('  uses the exact wording the spec asks for', spa.outcome.humanExplanation.includes('may require JavaScript to load content'));

  const blocked = checkCrawlability(context({ homepage: page('Attention Required! | Cloudflare', { status: 403, ok: false, blocked: true }) }));
  assertStatus('403 / bot challenge → fail', blocked.outcome, 'fail');
  assert("  uses the spec's \"couldn't access your site\" wording", blocked.outcome.humanExplanation.includes("We couldn't access your site directly"));

  assertStatus('DNS failure → fail', checkCrawlability(context({ homepage: page('', { ok: false, status: null, failure: 'dns' }) })).outcome, 'fail');

  // Three rendering states, not one. A framework that ships the content as an
  // inline JSON payload is a very different conversation from a page that
  // fetches everything after load.
  assert('a healthy page reports server_rendered', checkCrawlability(context()).renderMode === 'server_rendered');
  assert('an empty shell reports empty_shell', spa.renderMode === 'empty_shell');

  const payloadPage = page(
    `<html><body><div id="__next"></div>
     <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { product: { name: 'Blue Mug', body: 'x'.repeat(6000) } } })}</script>
     </body></html>`,
  );
  const payload = checkCrawlability(context({ homepage: payloadPage }));
  assert('content in an inline JSON payload reports payload_only', payload.renderMode === 'payload_only', payload.renderMode);
  assertStatus('  and still warns', payload.outcome, 'warning');
  assert('  but advises a render setting, not a rebuild', payload.outcome.humanExplanation.includes('server-side rendering or static pre-rendering'));
  assert('  and does not claim the words are missing', !payload.outcome.humanExplanation.includes('empty frame'));

  // A bot-challenge page is valid HTML, so the other checks must not read it as
  // if it were the site. Only crawlability gets to have an opinion about it.
  const challenged = context({
    homepage: page('<html><head><title>Access denied</title></head><body>Attention Required! | Cloudflare</body></html>', {
      status: 403,
      ok: false,
      blocked: true,
    }),
  });
  assertStatus('a 403 challenge page is not judged for structured data', checkStructuredData(challenged), 'skipped');
  assertStatus('a 403 challenge page is not judged for indexability', checkMetaRobots(challenged), 'skipped');
  assertStatus(
    'homepage fine but a key page 404s → warning',
    checkCrawlability(context({ keyPages: [page('', { ok: false, status: 404, finalUrl: 'https://shop.test/products/gone' })] })).outcome,
    'warning',
  );
}

// --- Microdata and RDFa -----------------------------------------------------

console.log('\nMicrodata and RDFa');
{
  /**
   * schema.org has three notations and we read one.
   *
   * google.com and semrush.com both publish microdata, and both scored zero on
   * structured data — marked down for the format they chose, not for anything
   * they left out. The parser is shallow on purpose: the checks only ever ask
   * what type a node is and whether it carries a handful of named properties.
   */
  const micro = page(
    '<html><body><div itemscope itemtype="https://schema.org/Product">' +
      '<h1 itemprop="name">Blue Mug</h1>' +
      '<img itemprop="image" src="/mug.jpg">' +
      '<div itemprop="offers" itemscope itemtype="https://schema.org/Offer">' +
      '<meta itemprop="price" content="499"><meta itemprop="priceCurrency" content="INR">' +
      '</div></div></body></html>',
    { finalUrl: 'https://shop.test/products/blue-mug' },
  );
  const microTypes = micro.jsonLd().flatMap((node) => typesOf(node));
  assert('microdata itemtype is read as a schema node', microTypes.includes('product'), microTypes.join(','));

  const node = micro.jsonLd().find((n) => typesOf(n).includes('product'))!;
  assert('  itemprop text becomes a value', node.name === 'Blue Mug', String(node.name));
  assert('  a src attribute is preferred over element text', node.image === '/mug.jpg', String(node.image));
  assert(
    '  a nested scope is recorded as its own type, not flattened into the parent',
    (node.offers as Record<string, unknown>)?.['@type'] === 'Offer',
    JSON.stringify(node.offers),
  );

  const rdfa = page(
    '<html><body vocab="https://schema.org/"><div typeof="Organization">' +
      '<span property="name">Codenix Labs</span><meta property="telephone" content="+91-8488080162">' +
      '</div></body></html>',
  );
  const rdfaNode = rdfa.jsonLd().find((n) => typesOf(n).includes('organization'));
  assert('RDFa typeof under a schema.org vocab is read', Boolean(rdfaNode), JSON.stringify(rdfa.jsonLd()));
  assert('  and its properties come through', rdfaNode?.name === 'Codenix Labs', String(rdfaNode?.name));

  /**
   * The limit that keeps this honest. `typeof` is an ordinary word in plenty of
   * templating output and RDFa vocabularies other than schema.org exist; without
   * the vocab guard we would invent schema nodes that nobody published.
   */
  const notSchema = page('<html><body><div typeof="foaf:Person"><span property="name">Someone</span></div></body></html>');
  assert('  a typeof outside schema.org is not counted', notSchema.jsonLd().length === 0, JSON.stringify(notSchema.jsonLd()));

  const plain = page(PLAIN_HOMEPAGE);
  assert('  and an ordinary page still yields nothing', plain.jsonLd().length === 0, JSON.stringify(plain.jsonLd()));
}

// --- Deadline ---------------------------------------------------------------

console.log('\nDeadline');
{
  /**
   * The reserve is what keeps a fifteen-second promise honest.
   *
   * Seven stored scans overran the ceiling and one took 25 seconds, every one of
   * them recorded as complete. Loading a real homepage into cheerio and walking
   * it for text, JSON-LD and links costs around 500ms at the heavy end, so six
   * or seven pages need roughly three seconds the network budget must not have
   * already spent.
   */
  assert(
    'a 15s scan reserves time to parse, not only to fetch',
    new Deadline(15000).remainingMs() <= 15000 - Deadline.PROCESSING_RESERVE_MS,
    String(new Deadline(15000).remainingMs()),
  );
  assert('  and the reserve is big enough for six heavy pages', Deadline.PROCESSING_RESERVE_MS >= 3000);
  assert('  a tiny budget still leaves a usable floor rather than zero', new Deadline(500).remainingMs() >= 1000);
}

// --- Scoring --------------------------------------------------------------

console.log('\nScoring');
{
  const outcome = (checkId: string, status: CheckStatus): CheckOutcome =>
    ({ checkId, title: checkId, status, details: '', humanExplanation: '', generatedFix: null, generatedFixLanguage: null } as CheckOutcome);

  const ids = ['bot_access', 'agent_interface', 'structured_data', 'content_structure', 'trust_signals', 'meta_robots', 'crawlability'];
  const allPass = ids.map((id) => scoreCheck(outcome(id, 'pass'), 'ecommerce'));
  /**
   * A flawless site tops out at 95, not 100.
   *
   * The five points are not a penalty — they belong to what a crawl structurally
   * cannot see: whether an assistant actually cites you, anything that needs
   * JavaScript to appear, the pages beyond the five we sample, and the further
   * signals Phase 1 does not run. Publishing a perfect hundred would claim we
   * had checked all of that.
   */
  const perfect = totalScore(allPass, 'ecommerce');
  assert('all pass → 95, never 100 / grade A', perfect.score === SCAN_CEILING && perfect.grade === 'A', JSON.stringify(perfect));

  const allFail = allPass.map((check) => ({ ...check, status: 'fail' as CheckStatus, pointsAwarded: 0 }));
  assert('all fail → 0 / grade F', totalScore(allFail, 'ecommerce').score === 0 && totalScore(allFail, 'ecommerce').grade === 'F');

  /**
   * Warning is half credit: 90% of the points earned → 86 on the 95 scale.
   *
   * The grade is still A, and that is the point of the second assertion. The
   * letter is derived from the percentage earned, never from the scaled number —
   * deriving it from the number would drag every boundary down five points and
   * quietly re-grade every site on the strength of a presentation change.
   */
  const oneWarning = [scoreCheck(outcome('bot_access', 'warning'), 'ecommerce'), ...allPass.slice(1)];
  const warned90 = totalScore(oneWarning, 'ecommerce');
  assert('90% of the points → 86 on the 95 scale', warned90.score === 86, String(warned90.score));
  assert('  and still grade A — the bands did not move', warned90.grade === 'A', warned90.grade);

  /**
   * Two rules pulling opposite ways, and both have to hold.
   *
   * A skipped check must not be scored as zero — that would charge a site for
   * our blind spot, and it is why the total is normalised at all. But excluding
   * it entirely let flipkart.com, which blocks our scanner out of the heaviest
   * check, come out A/100: a top grade off roughly seventy per cent of an
   * examination. An A claims we looked at everything.
   *
   * So: still not zero, still not an A.
   */
  const skipped = [...allPass.slice(0, 2), scoreCheck(outcome('structured_data', 'skipped'), 'ecommerce'), ...allPass.slice(3)];
  const normalised = totalScore(skipped, 'ecommerce');
  assert('a skipped check is normalised out, not scored as zero', normalised.score > 70 && normalised.normalised, JSON.stringify(normalised));
  assert('  but an incomplete examination cannot earn an A', normalised.grade === 'B', JSON.stringify(normalised));
  assert('  and the number is capped to match the letter', normalised.score < 90, String(normalised.score));

  // The same failing check costs a different amount depending on the site type.
  const blogFailsIndexing = ids.map((id) => scoreCheck(outcome(id, id === 'meta_robots' ? 'fail' : 'pass'), 'content'));
  const storeFailsIndexing = ids.map((id) => scoreCheck(outcome(id, id === 'meta_robots' ? 'fail' : 'pass'), 'ecommerce'));
  assert(
    'a noindex costs a blog more than a store — being unindexable is fatal for a publication',
    totalScore(blogFailsIndexing, 'content').score < totalScore(storeFailsIndexing, 'ecommerce').score &&
      weightsFor('content').meta_robots > weightsFor('ecommerce').meta_robots,
    `${totalScore(blogFailsIndexing, 'content').score} vs ${totalScore(storeFailsIndexing, 'ecommerce').score}`,
  );

  assert('grade boundaries', toGrade(90) === 'A' && toGrade(89) === 'B' && toGrade(75) === 'B' && toGrade(74) === 'C' && toGrade(60) === 'C' && toGrade(59) === 'D' && toGrade(40) === 'D' && toGrade(39) === 'F');

  // Blockers are the part of the report that carries no judgement: a bot that
  // cannot reach you, a page that does not return, a noindex. Counting them
  // separately gives a number the weights cannot flatter.
  assert('bot access, crawlability and indexability are blocking', isBlocking('bot_access') && isBlocking('crawlability') && isBlocking('meta_robots'));
  assert('structured data and trust pages are not blocking', !isBlocking('structured_data') && !isBlocking('trust_signals') && !isBlocking('agent_interface'));

  const withBlockers = ids.map((id) => scoreCheck(outcome(id, id === 'bot_access' || id === 'structured_data' ? 'fail' : 'pass'), 'ecommerce'));
  assert('only the blocking failure is counted as a blocker', countBlockers(withBlockers) === 1, String(countBlockers(withBlockers)));
  assert('a clean scan has no blockers', countBlockers(allPass) === 0);

  assert('the scoring version is stamped and non-empty', typeof SCORING_VERSION === 'string' && SCORING_VERSION.length > 0);
}

// --- Timeouts must not become verdicts ------------------------------------

console.log('\nTimeouts');
{
  // A store homepage often carries a Product node for a featured item. If the
  // deadline killed the product-page fetches, judging that homepage as though
  // it were a product page reports a confident FAIL on a shop whose real
  // product pages are fine. chumbak.com went B to F exactly this way.
  const homepageWithFeaturedProduct = page(
    `<html><head><script type="application/ld+json">${JSON.stringify({ '@type': 'Product', name: 'Featured Mug' })}</script></head>` +
      `<body>${'copy '.repeat(200)}<a href="/products/one">1</a></body></html>`,
  );
  const timedOut = checkStructuredData(context({ homepage: homepageWithFeaturedProduct, keyPages: [] }));
  assert(
    'a store homepage alone is judged only when there were no product pages to fetch',
    timedOut.status === 'fail',
    timedOut.status,
  );
}

// --- Page sampling --------------------------------------------------------

console.log('\nPage sampling');
{
  // Nav order puts three products from one collection first. Judging a site on
  // those says nothing about the rest of it.
  const many = `<html><head><title>Shop</title></head><body>${'copy '.repeat(200)}
    <a href="/products/mug-one">1</a><a href="/products/mug-two">2</a><a href="/products/mug-three">3</a>
    <a href="/products/mug-four">4</a><a href="/products/mug-five">5</a>
    <a href="/shop/lamp-one">6</a><a href="/shop/lamp-two">7</a>
    <a href="/p/rug-one">8</a>
  </body></html>`;

  const selection = selectKeyPages(page(many), [], 'ecommerce', 3);
  assert('reports how many candidates it found, not just what it sampled', selection.discovered === 8, String(selection.discovered));
  assert('samples the requested number', selection.urls.length === 3, String(selection.urls.length));

  const sections = new Set(selection.urls.map((url) => new URL(url).pathname.split('/').filter(Boolean)[0]));
  assert('spreads the sample across sections instead of taking the first three', sections.size === 3, [...sections].join(','));

  // One matching page and four slots left. Judging a site on that single page
  // is the narrowest possible sample, in exactly the case where breadth matters
  // most — so the sample is topped up from the site's other real pages.
  const thin = page(
    `<html><body>${'copy '.repeat(200)}
     <a href="/products/only-one">1</a>
     <a href="/deals">Deals</a><a href="/finance">Finance</a><a href="/price-alert">Alerts</a><a href="/guides">Guides</a>
     </body></html>`,
  );
  const toppedUp = selectKeyPages(thin, [], 'ecommerce', 5);
  assert('a thin profile match is topped up from other real pages', toppedUp.urls.length === 5, String(toppedUp.urls.length));
  assert('  and the profile match is still included', toppedUp.urls.some((url) => url.includes('/products/only-one')));

  const tiny = selectKeyPages(page(`<html><body>${'copy '.repeat(200)}<a href="/products/only-one">1</a></body></html>`), [], 'ecommerce', 5);
  assert('a site with genuinely one page returns just that one', tiny.urls.length === 1 && tiny.discovered === 1);
}

// --- URL handling ---------------------------------------------------------

console.log('\nURL normalisation & key-page detection');
{
  assert('adds https:// when missing', normalizeUrl('example.com').href === 'https://example.com/');
  assert('strips www for the cache key', normalizeUrl('https://www.Example.com/').domain === 'example.com');
  assert('drops tracking params', !normalizeUrl('https://example.com/?utm_source=x').href.includes('utm_source'));
  assert('rejects a bare word', throws(() => normalizeUrl('example')));
  assert('rejects localhost (SSRF guard)', throws(() => normalizeUrl('http://localhost:3000')));
  assert('rejects a private IP (SSRF guard)', throws(() => normalizeUrl('http://192.168.1.1')));
  assert('rejects an empty string', throws(() => normalizeUrl('  ')));

  assert('Shopify product URL detected', looksLikeProductUrl('https://shop.test/products/blue-mug'));
  assert('Woo product URL detected', looksLikeProductUrl('https://shop.test/product/blue-mug'));
  assert('collection URL is not a product', !looksLikeProductUrl('https://shop.test/collections/mugs'));
  assert('bare /products listing is not a product', !looksLikeProductUrl('https://shop.test/products'));
  assert('products.json is not a product page', !looksLikeProductUrl('https://shop.test/products.json'));
  assert('cart is not a product', !looksLikeProductUrl('https://shop.test/cart'));

  assert('a blog post is a key page for a content site', looksLikeKeyUrl('https://shop.test/blog/how-to-brew', 'content'));
  assert('a dated permalink is a key page for a content site', looksLikeKeyUrl('https://shop.test/2026/01/how-to-brew', 'content'));
  assert('the /blog index is not, it is a listing', !looksLikeKeyUrl('https://shop.test/blog', 'content'));
  assert('a news section index is not an article', !looksLikeKeyUrl('https://shop.test/news/national/', 'content'));
  assert('a two-word section slug is not an article either', !looksLikeKeyUrl('https://shop.test/news/national/tamil-nadu/', 'content'));
  // Root-level blogs (Ghost, most Next.js blogs) publish headlines at the root.
  assert('a root-level headline slug is an article', looksLikeKeyUrl('https://blog.test/how-we-rebuilt-our-network-edge', 'content'));
  assert('a locale path is not', !looksLikeKeyUrl('https://blog.test/de-de/', 'content'));
  assert('nor is a tag page', !looksLikeKeyUrl('https://blog.test/tag/developers/', 'content'));
  assert('nor is /about-us', !looksLikeKeyUrl('https://blog.test/about-us', 'content'));
  assert('a news story under a section is', looksLikeKeyUrl('https://shop.test/news/national/court-rules-on-case/article12345.ece', 'content'));
  assert('a product URL is not a key page for a blog', !looksLikeKeyUrl('https://shop.test/products/mug', 'content'));
  assert('/pricing is a key page for saas', looksLikeKeyUrl('https://shop.test/pricing', 'saas'));
  assert('/contact is a key page for a local business', looksLikeKeyUrl('https://shop.test/contact', 'local_business'));
  assert('a privacy policy is never a key page', !looksLikeKeyUrl('https://shop.test/privacy-policy', 'general'));

  // Subdomain handling — the thing that decides whose pages count as yours.
  assert('registrable domain of a plain host', registrableDomain('app.example.com') === 'example.com');
  assert('registrable domain handles .co.in', registrableDomain('app.shop.co.in') === 'shop.co.in', registrableDomain('app.shop.co.in'));
  assert('an app subdomain is the same company', isSameCompany('https://app.example.com/x', 'https://example.com/'));
  assert('a different domain is not', !isSameCompany('https://other.com/x', 'https://example.com/'));
  assert('the apex is the main site', isApexHost('https://example.com/') && isApexHost('https://www.example.com/'));
  assert('a blog subdomain is not the main site', !isApexHost('https://blog.example.com/'));
  assert('an Indian apex is recognised', isApexHost('https://www.shop.co.in/') && !isApexHost('https://blog.shop.co.in/'));
}

// Check 4 is the only async check (it may probe known policy URLs), so it runs
// from the bottom rather than inline.
async function runTrustSignalChecks(): Promise<void> {
  console.log('\nCheck 4 — trust and identity pages, per site type');

  const withFooter = (links: string) =>
    page(`<html><head><title>Test</title></head><body>${'text '.repeat(200)}<footer>${links}</footer></body></html>`);

  const storeFooter = withFooter(
    '<a href="/policies/refund-policy">Returns &amp; Refunds</a><a href="/policies/shipping-policy">Shipping</a><a href="/policies/privacy-policy">Privacy Policy</a>',
  );
  assertStatus('store: returns + shipping + privacy → pass (no probing needed)', await checkTrustSignals(context({ homepage: storeFooter })), 'pass');

  // A policy can live inside another page. Mamaearth publishes its shipping
  // terms in its terms document and has no /shipping-policy page at all —
  // telling them "you have no shipping policy" was both wrong and the kind of
  // claim an owner disproves in ten seconds.
  const termsCoverage = SHIPPING_TOPIC.test(
    'Prices are inclusive of GST but do not include a delivery charge. Orders are dispatched within 2 days.',
  );
  assert('a real shipping section inside a terms page is recognised', termsCoverage);
  assert(
    'a passing mention is not',
    !SHIPPING_TOPIC.test('Enter your shipping address at checkout to continue.'),
  );
  // The pattern is stored as a string and compiled at use. It previously held
  // an invisible backspace byte where a word boundary was meant, which made it
  // match nothing at all — and looked completely correct in the editor.
  assert('the topic pattern contains no control characters', !/[\x00-\x1f]/.test(SHIPPING_TOPIC.source));

  // The same footer on a blog is judged against about/contact/privacy instead,
  // and only privacy is there.
  const blogOnStoreFooter = await checkTrustSignals(
    context({ siteType: 'content', profile: profileFor('content'), homepage: storeFooter, deadline: expiredDeadline() }),
  );
  assertStatus('blog: a store footer only satisfies privacy → warning', blogOnStoreFooter, 'warning');
  assert('  and it asks for about and contact, not shipping', blogOnStoreFooter.details.includes('about') && blogOnStoreFooter.details.includes('contact') && !blogOnStoreFooter.details.includes('shipping'));

  const blogFooter = withFooter('<a href="/about">About us</a><a href="/contact">Contact</a><a href="/privacy-policy">Privacy</a>');
  assertStatus('blog: about + contact + privacy → pass', await checkTrustSignals(context({ siteType: 'content', profile: profileFor('content'), homepage: blogFooter })), 'pass');

  // A clinic must not be asked for a returns policy.
  const clinic = await checkTrustSignals(context({ siteType: 'local_business', profile: profileFor('local_business'), homepage: blogFooter }));
  assertStatus('clinic: about + contact + privacy → pass', clinic, 'pass');
  assert('  a clinic is never asked for a returns policy', !clinic.details.includes('returns') && !clinic.humanExplanation.includes('returns'));

  const saasFooter = withFooter('<a href="/pricing">Pricing</a><a href="/terms">Terms of Service</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a>');
  assertStatus('saas: pricing + terms + privacy + contact → pass', await checkTrustSignals(context({ siteType: 'saas', profile: profileFor('saas'), homepage: saasFooter })), 'pass');

  const partial = page(`<html><body>${'text '.repeat(200)}<a href="/policies/privacy-policy">Privacy</a></body></html>`);
  assertStatus('one found, probing skipped on an exhausted budget → warning', await checkTrustSignals(context({ homepage: partial, deadline: expiredDeadline() })), 'warning');

  assertStatus('none found on a readable homepage → fail', await checkTrustSignals(context({ homepage: page(PLAIN_HOMEPAGE), deadline: expiredDeadline() })), 'fail');

  // A JS-rendered site gives us no menu to read. Reporting "you have no privacy
  // policy" there would be a confident lie.
  assertStatus(
    'none found but the homepage was an empty JS shell → skipped, not fail',
    await checkTrustSignals(context({ homepage: page('<html><body><div id="root"></div></body></html>'), deadline: expiredDeadline() })),
    'skipped',
  );
}

// --- Helpers --------------------------------------------------------------

function schemaPage(schema: unknown): string {
  return `<html><head><title>Blue Mug — Test Store</title>
<meta property="og:image" content="https://shop.test/mug.jpg">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head><body><h1>Blue Mug</h1><p>₹499</p>${'more copy '.repeat(60)}</body></html>`;
}

function isJson(value: string | null): boolean {
  if (!value) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof InvalidUrlError;
  }
}

function expiredDeadline(): Deadline {
  return new Deadline(0);
}

runTrustSignalChecks()
  .then(() => {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
