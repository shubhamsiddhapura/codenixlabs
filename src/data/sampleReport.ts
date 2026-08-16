import type { AuditTrail, ScanCheck } from '../types/aiReadiness';

/**
 * A worked example of a real report, shown before anyone scans.
 *
 * The point is to remove the leap of faith at the input box: a visitor sees
 * exactly what they get back, in the real components, before typing an address.
 *
 * Two rules held it to being honest rather than a mockup:
 *
 *  1. It renders through the same ResultHeader and CheckCard the live report
 *     uses. A hand-drawn picture of a report drifts the moment the report
 *     changes; this cannot, because it *is* the report.
 *
 *  2. The domain is deliberately fictitious. Putting a real company's failing
 *     grade on our marketing page — without asking them — would be a nasty
 *     thing to do to a business that has done nothing wrong, and it is the kind
 *     of shortcut that the rest of this product exists to argue against.
 *
 * The findings themselves are the ones we genuinely see most often: a firewall
 * quietly refusing one crawler, product schema missing its stock field, and a
 * page with no canonical URL.
 */
export const SAMPLE_DOMAIN = 'example-store.in';

export const SAMPLE_AUDIT: AuditTrail = {
  scoringVersion: '1.6.0',
  weights: {
    bot_access: 20,
    agent_interface: 12,
    structured_data: 28,
    content_structure: 10,
    trust_signals: 13,
    meta_robots: 8,
    crawlability: 9,
  },
  blockingIssues: 1,
  pagesChecked: 6,
  pagesDiscovered: 412,
  renderMode: 'server_rendered',
  siteTypeOverridden: false,
  method:
    'Static HTML only — no JavaScript is executed. Checks that could not be verified are excluded from the score rather than counted as zero.',
};

export const SAMPLE_SUMMARY =
  'AI assistants can find your online store but struggle to understand it. 3 issues to fix, beginning with ai bot access.';

/**
 * Three checks: one hard failure, one partial, one clean pass.
 *
 * Showing only failures would misrepresent the tool as a fault-finder, and
 * showing only passes would make it look like flattery. This is the shape of a
 * real mid-range result.
 */
export const SAMPLE_CHECKS: ScanCheck[] = [
  {
    checkId: 'bot_access',
    title: 'AI bot access',
    status: 'fail',
    pointsAwarded: 0,
    pointsPossible: 20,
    details: 'Server refused live requests from 1 AI crawler while serving ours normally: GPTBot → HTTP 403.',
    humanExplanation:
      'We asked your server for your homepage as ChatGPT, and it turned that crawler away — while serving the exact same page to us a moment earlier. This is the failure almost nobody catches, because your robots.txt can say "come in" while your firewall says "no", and the crawler never files a complaint — it simply stops coming back. It is nearly always bot protection set too broadly: a security plugin, a WAF rule, or a CDN treating any non-browser visitor as an attack. Until that is fixed, nothing else on this report can help.',
    generatedFix: `# Edit your robots.txt at https://example-store.in/robots.txt

# Add this block so AI crawlers are explicitly welcome:

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /`,
    generatedFixLanguage: 'robots',
    generatedFixTarget: 'https://example-store.in/robots.txt',
    agentAccess: [
      { agent: 'GPTBot', label: 'ChatGPT (training + browsing)', status: 'blocked_server', liveTested: true, detail: 'server answered HTTP 403 to a live request' },
      { agent: 'ChatGPT-User', label: 'ChatGPT (when a user asks about you)', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'OAI-SearchBot', label: 'ChatGPT search', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'ClaudeBot', label: 'Claude', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'Claude-User', label: 'Claude (when a user asks about you)', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'Google-Extended', label: 'Google Gemini / AI Overviews', status: 'allowed', liveTested: false, detail: null },
      { agent: 'PerplexityBot', label: 'Perplexity', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'Amazonbot', label: 'Amazon Alexa / Rufus', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'Applebot', label: 'Apple Intelligence / Siri', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
      { agent: 'CCBot', label: 'Common Crawl (feeds many AI models)', status: 'blocked_robots', liveTested: false, detail: 'robots.txt line 14: Disallow: /' },
      { agent: 'Bingbot', label: 'Bing / Copilot', status: 'allowed', liveTested: true, detail: 'served HTTP 200 to a live request' },
    ],
    locked: false,
  },
  {
    checkId: 'structured_data',
    title: 'Structured data (Product)',
    status: 'warning',
    pointsAwarded: 14,
    pointsPossible: 28,
    details: 'Product schema found on 4/4 page(s) checked. Missing fields: offers.availability, brand.',
    humanExplanation:
      'Your product pages do include Product structured data, but the stock availability and brand are missing. Stock availability is the one that costs you most: an assistant that cannot confirm an item is in stock will usually recommend a store where it can. You are close — filling in the missing fields is a small edit with an outsized effect. The block below is built from what we could read off your own page; fill in anything marked REPLACE_WITH_ and paste it into the <head>.',
    generatedFix: `<!-- Paste inside the <head> of each product page, one block per product. -->
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Cotton Crew Neck T-Shirt",
  "image": ["https://example-store.in/img/crew-neck.jpg"],
  "sku": "REPLACE_WITH_YOUR_SKU_OR_PRODUCT_CODE",
  "brand": { "@type": "Brand", "name": "Example Store" },
  "offers": {
    "@type": "Offer",
    "price": "899",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  }
}
</script>`,
    generatedFixLanguage: 'html',
    generatedFixTarget: 'The <head> section of each product page',
    locked: false,
  },
  {
    checkId: 'crawlability',
    title: 'Crawlability & response health',
    status: 'pass',
    pointsAwarded: 9,
    pointsPossible: 9,
    details: 'All 6 sampled page(s) returned HTTP 200 with readable text content in the HTML. Homepage responded in 412ms — band A.',
    humanExplanation:
      'Every page we checked loaded cleanly and its content was readable straight from the server, without needing JavaScript to run first. That is exactly what an AI crawler needs, and a surprising number of modern sites fail it. Your homepage answered in 0.4s, which is comfortably inside any fetch deadline — worth watching, because assistants fetch competing sources in parallel and write the answer from whatever arrives first.',
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
    locked: false,
  },
];
