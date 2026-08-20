import { CheckOutcome } from '../../types';
import { ScanContext, allPages } from '../scanContext';
import { looksLikeKeyUrl } from '../discovery';
import { HtmlDocument } from '../htmlDocument';

/**
 * Check 5 — meta robots / indexability (10 points).
 *
 * A `noindex` is the quiet killer: the page loads perfectly in a browser, so
 * nobody notices, but every crawler drops it. It usually arrives via a staging
 * setting or an SEO plugin default that was never turned back off.
 *
 * We also read the `X-Robots-Tag` response header, which does exactly the same
 * thing from the server side and is far harder for a shop owner to spot.
 */

/** Meta names that carry indexing directives we care about. */
const DIRECTIVE_META_NAMES = ['robots', 'googlebot', 'bingbot', 'google'];

interface PageVerdict {
  url: string;
  noindex: boolean;
  nofollow: boolean;
  source: 'meta tag' | 'X-Robots-Tag header' | null;
  raw: string | null;
}

export function checkMetaRobots(context: ScanContext): CheckOutcome {
  const base = {
    checkId: 'meta_robots' as const,
    title: 'Search & AI indexability',
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
  };

  // Only pages we genuinely received. A bot-challenge page carries no robots
  // directive, and reporting "no noindex found" off one would be a pass the
  // site did not earn.
  const pages = allPages(context).filter((page) => page.$ !== null && page.ok && !page.blocked);

  // Same reasoning as the structured-data check: a page we never received
  // cannot be scored, only reported as unchecked.
  if (!pages.length) {
    return {
      ...base,
      status: 'skipped',
      details: 'No readable page HTML to inspect for robots directives.',
      humanExplanation:
        'We could not read your pages, so we could not confirm whether they are set to be indexed. ' +
        'This has been left out of your score rather than counted against you — see the crawlability result below, which is the problem to fix first.',
    };
  }

  const verdicts = pages.map(inspectPage);
  const blocked = verdicts.filter((verdict) => verdict.noindex);
  const nofollowOnly = verdicts.filter((verdict) => !verdict.noindex && verdict.nofollow);

  /**
   * One deliberately hidden page is not a site that has hidden itself.
   *
   * apollo247.com noindexes a single credit-card campaign landing page —
   * `/apollo-sbi-credit-card?utm_source=mweb…` — and we failed its entire
   * indexability check, dropping the site from C to D. Noindexing marketing
   * landing pages, thank-you pages and campaign URLs is standard, correct
   * practice; those pages exist to receive ad traffic, not to be found in
   * search, and duplicating them into an index is what a good SEO would
   * actively prevent.
   *
   * A failure here should mean "your site is telling search engines and
   * assistants to ignore it". That is true when the homepage carries the
   * directive, or when it is on most of what we sampled — not when it is on one
   * page out of six that was never meant to be found.
   */
  const homepageBlocked = verdicts[0]?.noindex === true;
  const mostPagesBlocked = blocked.length > pages.length / 2;

  /**
   * Which noindexed pages are excusable, and which are the finding.
   *
   * A noindexed product page is serious: the product cannot be recommended by
   * anything, and that is the whole subject of this report. A noindexed campaign
   * landing page is the opposite — it exists to receive ad clicks, and keeping it
   * out of the index is what a competent SEO would insist on.
   *
   * Campaign parameters in the URL are the clean signal. Nothing arrives at
   * `?utm_source=mweb&utm_medium=homepage` expecting to be found in search.
   */
  const excusable = (verdict: { url: string }): boolean => {
    const hasCampaignParams = /[?&](utm_|gclid|fbclid|mc_cid|campaign)/i.test(verdict.url);
    return hasCampaignParams || !looksLikeKeyUrl(verdict.url, context.siteType);
  };

  const seriousBlocks = blocked.filter((verdict) => !excusable(verdict));

  if (blocked.length && !seriousBlocks.length && !homepageBlocked && !mostPagesBlocked) {
    return {
      ...base,
      status: 'warning',
      details: `noindex on ${blocked.length}/${pages.length} sampled page(s), not including the homepage: ${blocked
        .map((verdict) => verdict.url)
        .slice(0, 3)
        .join(', ')}.`,
      humanExplanation:
        `${blocked.length} of the ${pages.length} pages we sampled asks search engines and AI assistants not to index it, but your homepage does not, and most of your site does not. ` +
        'That is usually deliberate and correct — campaign landing pages, thank-you pages and printer-friendly duplicates are routinely hidden on purpose, and hiding them is better practice than leaving them to compete with your real pages. ' +
        `We are pointing it out rather than marking you down, because only you know whether ${blocked.length === 1 ? 'that page was' : 'those pages were'} meant to be found: ${blocked
          .map((verdict) => verdict.url)
          .slice(0, 3)
          .join(', ')}. ` +
        'If any of them is a page you would want an assistant to recommend, remove its noindex directive.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  if (blocked.length) {
    return {
      ...base,
      status: 'fail',
      details: `noindex on ${blocked.length}/${pages.length} page(s): ${blocked
        .map((verdict) => `${verdict.url} (${verdict.source}: ${verdict.raw})`)
        .join('; ')}.`,
      humanExplanation:
        `${blocked.length === pages.length ? 'Your pages carry' : `${blocked.length} of the ${pages.length} pages we checked carry`} a "noindex" instruction, ` +
        'which tells every crawler — Google, Bing, ChatGPT, Claude, all of them — to leave the page out entirely. ' +
        'The page still works normally for anyone who visits it, which is why this goes unnoticed for months. ' +
        'It is almost always left over from when the site was being built, or a switch in an SEO plugin. ' +
        `Remove the ${blocked[0].source === 'X-Robots-Tag header' ? 'X-Robots-Tag header from your server or hosting configuration' : '<meta name="robots" content="noindex"> tag from those pages'} and they become visible again within days. ` +
        'Nothing else on this report matters as much if this stays switched on.',
    };
  }

  if (nofollowOnly.length) {
    return {
      ...base,
      status: 'warning',
      details: `nofollow (without noindex) on ${nofollowOnly.length}/${pages.length} page(s).`,
      humanExplanation:
        'Your pages can be indexed, but they tell crawlers not to follow the links on them. ' +
        'That means a crawler landing on your homepage will not walk through to your product pages by itself, so parts of your catalogue may never get discovered. ' +
        'Unless this was deliberate, remove "nofollow" from the robots meta tag.',
    };
  }

  return {
    ...base,
    status: 'pass',
    details: `No noindex directive on ${pages.length} sampled page(s).`,
    humanExplanation:
      'None of your pages are blocking themselves from being indexed. Search engines and AI assistants are free to include your store in what they show shoppers.',
  };
}

function inspectPage(page: HtmlDocument): PageVerdict {
  const headerValue = page.headers['x-robots-tag'] || null;
  if (headerValue && /\bnoindex\b/i.test(headerValue)) {
    return {
      url: page.url,
      noindex: true,
      nofollow: /\bnofollow\b/i.test(headerValue),
      source: 'X-Robots-Tag header',
      raw: headerValue,
    };
  }

  for (const name of DIRECTIVE_META_NAMES) {
    const content = page.metaContent(name);
    if (!content) continue;
    if (/\bnoindex\b/i.test(content) || /\bnone\b/i.test(content)) {
      return { url: page.url, noindex: true, nofollow: /\bnofollow\b|\bnone\b/i.test(content), source: 'meta tag', raw: `${name}="${content}"` };
    }
    if (/\bnofollow\b/i.test(content)) {
      return { url: page.url, noindex: false, nofollow: true, source: 'meta tag', raw: `${name}="${content}"` };
    }
  }

  if (headerValue && /\bnofollow\b/i.test(headerValue)) {
    return { url: page.url, noindex: false, nofollow: true, source: 'X-Robots-Tag header', raw: headerValue };
  }

  return { url: page.url, noindex: false, nofollow: false, source: null, raw: null };
}
