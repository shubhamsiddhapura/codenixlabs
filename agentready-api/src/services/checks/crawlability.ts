import { CheckOutcome, RenderMode } from '../../types';
import { ScanContext, allPages } from '../scanContext';
import { HtmlDocument } from '../htmlDocument';

/**
 * Check 6 — basic crawlability / response health.
 *
 * Two distinct problems live here, and the spec asks for them to be reported
 * separately:
 *   1. The page does not return a usable 200 (down, blocked, redirect loop).
 *   2. The page returns 200 but the content is not in the markup.
 *
 * Case 2 has three outcomes, not one, and they need different advice:
 *
 *   server_rendered  the words are in the HTML — nothing to do
 *   payload_only     the words are in the response, but inside a JSON blob
 *                    rather than in tags. Cheap to fix, and a very different
 *                    conversation from a rebuild.
 *   empty_shell      nothing usable arrived at all; the content is fetched by
 *                    JavaScript after load. This is the expensive one.
 *
 * Collapsing the middle case into "you need server-side rendering" would send
 * a shop owner to rebuild a site that mostly needs its markup fixed.
 */

/**
 * Below this many characters of visible text, a 200 response is almost
 * certainly not carrying its content in markup. A genuinely thin homepage still
 * has a nav, a tagline and a footer — comfortably more than this.
 */
const MIN_TEXT_CHARS = 500;

/** An inline JSON blob this big is the page's content, not a config object. */
const MIN_STATE_BYTES = 3000;

/** Root containers frameworks mount into; empty ones are the giveaway. */
const SPA_ROOT_SELECTORS = '#root, #app, #__next, #__nuxt, [data-reactroot]';

export interface CrawlabilityResult {
  outcome: CheckOutcome;
  jsRenderWarning: boolean;
  renderMode: RenderMode;
}

export function checkCrawlability(context: ScanContext): CrawlabilityResult {
  const base = {
    checkId: 'crawlability' as const,
    title: 'Crawlability & response health',
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
  };

  const homepage = context.homepage;
  const pages = allPages(context);

  if (homepage.blocked) {
    return {
      jsRenderWarning: false,
      renderMode: 'server_rendered',
      outcome: {
        ...base,
        status: 'fail',
        details: `Homepage returned HTTP ${homepage.status} to our scanner (bot challenge or block).`,
        humanExplanation:
          "We couldn't access your site directly — your server turned our scanner away. " +
          'That is usually a bot-protection setting (Cloudflare, a firewall rule, or a security plugin) doing its job a little too broadly. ' +
          'It is worth checking manually, because the same rule that stopped us can stop ChatGPT, Claude and Perplexity from reading your store, and unlike us they will not tell you. ' +
          'Ask whoever manages your hosting to allow the AI crawler user-agents listed in the robots.txt fix above through your bot protection.',
      },
    };
  }

  if (homepage.failure) {
    return {
      jsRenderWarning: false,
      renderMode: 'server_rendered',
      outcome: {
        ...base,
        status: 'fail',
        details: `Homepage fetch failed: ${homepage.failure}.`,
        humanExplanation: failureExplanation(homepage.failure),
      },
    };
  }

  if (!homepage.ok) {
    return {
      jsRenderWarning: false,
      renderMode: 'server_rendered',
      outcome: {
        ...base,
        status: 'fail',
        details: `Homepage returned HTTP ${homepage.status}.`,
        humanExplanation:
          `Your homepage returned an error (HTTP ${homepage.status}) instead of loading normally. ` +
          'Anything that cannot load your homepage — a shopper, Google, or an AI assistant — stops there. Nothing else on this report can help until the page returns normally.',
      },
    };
  }

  const brokenPages = pages.filter((page) => page !== homepage && (page.failure || !page.ok));

  const healthy = pages.filter((page) => !page.failure && page.ok);
  const modes = healthy.map(renderModeOf);
  const shellPages = healthy.filter((_, index) => modes[index] === 'empty_shell');
  const payloadPages = healthy.filter((_, index) => modes[index] === 'payload_only');

  // Report the worst state seen, since that is the one costing the site.
  const renderMode: RenderMode = shellPages.length ? 'empty_shell' : payloadPages.length ? 'payload_only' : 'server_rendered';
  const jsRenderWarning = renderMode !== 'server_rendered';

  if (renderMode === 'empty_shell') {
    return {
      jsRenderWarning,
      renderMode,
      outcome: {
        ...base,
        status: 'warning',
        details: `Nothing readable in the raw HTML of ${shellPages.length}/${pages.length} page(s): ${shellPages
          .map((page) => `${page.url} (${page.text().length} chars, no inline data)`)
          .join('; ')}.`,
        humanExplanation:
          'Your site may require JavaScript to load content, which some AI crawlers cannot execute. This needs manual review. ' +
          "In plain terms: when we asked your server for the page, what came back was an empty frame — the words, prices and product names are fetched afterwards by code running in the visitor's browser. " +
          'People never notice, because their browser does that work. Several AI crawlers do not, so they see the empty frame. ' +
          'The fix is server-side rendering or pre-rendering, which your developer or platform can enable. ' +
          'Confirm it yourself first: open a page, view the page source, and search it for your own headline — if it is not there, an AI assistant cannot see it either.',
      },
    };
  }

  if (renderMode === 'payload_only') {
    return {
      jsRenderWarning,
      renderMode,
      outcome: {
        ...base,
        status: 'warning',
        details: `Content present as inline JSON but not as markup on ${payloadPages.length}/${pages.length} page(s): ${payloadPages
          .map((page) => `${page.url} (${page.text().length} chars of text, ${Math.round(page.inlineStateBytes() / 1024)}KB of inline data)`)
          .join('; ')}.`,
        humanExplanation:
          'Your pages do send their content — but as a block of raw data for the browser to render, rather than as readable headings and paragraphs. ' +
          'This is better news than it sounds. The words are genuinely in what your server sends, so a crawler that digs into that data can find them; but the ones that read normal page structure — which is most of them — see very little. ' +
          'This is usually a framework setting rather than a rebuild: your developer can turn on server-side rendering or static pre-rendering for these pages, and the same content starts arriving as proper markup. ' +
          'Ask them specifically whether these routes are being server-rendered — it is normally a small configuration change, not a project.',
      },
    };
  }

  const slow = responseTimeVerdict(context);

  if (slow) {
    return {
      jsRenderWarning,
      renderMode,
      outcome: {
        ...base,
        status: 'warning',
        details: `${slow.detail} (${brokenPages.length} broken page(s)).`,
        humanExplanation:
          `Your pages load, but slowly — ${slow.detail}. ` +
          'Crawlers budget their time: a slow site gets visited less often, so new pages are discovered late and changes take longer to be noticed. It costs you with shoppers directly too. ' +
          'Ask your hosting provider about time to first byte, and check whether your pages are being generated fresh on every request when they could be cached.',
      },
    };
  }

  if (brokenPages.length) {
    return {
      jsRenderWarning,
      renderMode,
      outcome: {
        ...base,
        status: 'warning',
        details: `${brokenPages.length}/${pages.length} sampled page(s) did not return HTTP 200: ${brokenPages
          .map((page) => `${page.url} → ${page.failure || page.status}`)
          .join('; ')}.`,
        humanExplanation:
          'Your homepage loads fine, but some of the pages we sampled did not — they returned an error or timed out. ' +
          'Every broken page is content an AI assistant cannot use, and repeated errors make crawlers visit the rest of your site less often. ' +
          'Open the pages listed above in a browser and check whether they load; if they do, the problem is intermittent and worth raising with your hosting provider.',
      },
    };
  }

  return {
    jsRenderWarning,
    renderMode,
    outcome: {
      ...base,
      status: 'pass',
      details: `All ${pages.length} sampled page(s) returned HTTP 200 with readable text content in the HTML. Homepage responded in ${context.homepage.durationMs}ms.`,
      humanExplanation:
        'Every page we checked loaded cleanly and its content was readable straight from the server, without needing JavaScript to run first. ' +
        'That is exactly what an AI crawler needs, and a surprising number of modern sites fail it.',
    },
  };
}

/**
 * Slow enough to cost the site crawl budget.
 *
 * We measure the full response, not time-to-first-byte, so the threshold is
 * looser than Google's ~1.8s TTFB guidance — 4 seconds for a whole HTML
 * document is unambiguously slow on any connection, and below that the number
 * is reported without being penalised.
 */
const SLOW_RESPONSE_MS = 4000;

function responseTimeVerdict(context: ScanContext): { detail: string } | null {
  const homepage = context.homepage.durationMs;
  if (homepage < SLOW_RESPONSE_MS) return null;
  return { detail: `your homepage took ${(homepage / 1000).toFixed(1)} seconds to respond` };
}

function renderModeOf(page: HtmlDocument): RenderMode {
  if (page.text().length >= MIN_TEXT_CHARS) return 'server_rendered';

  // Thin text. Is the content in the response as data, or absent entirely?
  if (page.inlineStateBytes() >= MIN_STATE_BYTES) return 'payload_only';

  // A short page with an empty framework root is conclusive. A short page
  // without one is still worth flagging — the spec asks for manual review, not
  // a verdict.
  if (page.$) {
    const root = page.$(SPA_ROOT_SELECTORS).first();
    if (root.length && root.text().trim().length < 100) return 'empty_shell';
  }

  return 'empty_shell';
}

function failureExplanation(failure: string): string {
  if (failure === 'dns') {
    return (
      'We could not find your website at that address at all — the domain did not resolve. ' +
      'Check the spelling, and if it is correct, check with your domain registrar that the domain is still active and pointing at your hosting.'
    );
  }
  if (failure === 'ssl') {
    return (
      'Your site has a security certificate problem, so we could not connect over a secure connection. ' +
      'Browsers show a scary warning screen for this, and crawlers usually refuse the site outright. Most hosting providers can renew or reissue the certificate in a few minutes — treat this as urgent.'
    );
  }
  if (failure === 'redirect_loop') {
    return (
      'Your homepage redirects in a loop — it keeps sending visitors from one address to another and back again, never arriving. ' +
      'This is usually a conflict between a www/non-www rule and an http/https rule. Nothing can read the site until it is resolved.'
    );
  }
  if (failure === 'timeout' || failure === 'deadline_exceeded') {
    return (
      'Your site took too long to respond and we had to stop waiting. ' +
      'Slow responses cost you visitors directly, and crawlers reduce how often they visit a slow site — so pages get discovered late or not at all. Worth raising with your hosting provider.'
    );
  }
  return (
    'We could not connect to your website. It may be down right now, or blocking connections from outside. ' +
    'Try loading it yourself in a private browser window; if it works for you but not for us, ask your hosting provider whether something is filtering automated visitors.'
  );
}
