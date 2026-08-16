import { CheckOutcome, RenderMode } from '../../types';
import { ScanContext, allPages } from '../scanContext';
import { HtmlDocument } from '../htmlDocument';
import { LIVE_PROBE_BOTS } from './botAccess';

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
    /**
     * Turned away — but by whom, and does it matter?
     *
     * If the AI crawlers were served the same page we were refused, the site is
     * not broken; it is correctly configured. Strict with strangers, open to
     * the crawlers that count. Failing it here would be reporting *our* lack of
     * access as *their* defect, and on a large retailer that single
     * ten-point failure was the difference between a D and a passing grade
     * while ChatGPT was being served normally the whole time.
     *
     * We genuinely cannot say whether their pages render, so the honest status
     * is "could not verify" — the same answer we give everywhere else we were
     * unable to look.
     */
    const servedToAiBots = LIVE_PROBE_BOTS.filter(({ agent }) => context.botProbes[agent]?.ok);

    if (servedToAiBots.length) {
      const names = servedToAiBots.map((bot) => bot.label).join(', ');
      return {
        jsRenderWarning: false,
        renderMode: 'server_rendered',
        outcome: {
          ...base,
          status: 'skipped',
          details: `Homepage returned HTTP ${homepage.status} to our scanner, but was served normally to ${servedToAiBots
            .map((bot) => bot.agent)
            .join(', ')} — not scored.`,
          humanExplanation:
            `Your server turned our scanner away, but served your homepage normally when we asked as ${names}. ` +
            'That is a correct setup rather than a problem: strict with visitors it does not recognise, open to the crawlers that matter. ' +
            'It does mean we never saw your HTML, so we could not check whether your content is actually in the page or built afterwards by JavaScript. ' +
            'This has been left out of your score rather than counted against you. To check it yourself: open a page, view the page source, and search it for your own headline — if it is there, you are fine.',
        },
      };
    }

    return {
      jsRenderWarning: false,
      renderMode: 'server_rendered',
      outcome: {
        ...base,
        status: 'fail',
        details: `Homepage returned HTTP ${homepage.status} to our scanner (bot challenge or block).`,
        humanExplanation:
          "We couldn't access your site directly — your server turned our scanner away, and it turned away the AI crawlers too. " +
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
          'This costs you differently from the way it costs you in search. An assistant answering a question fetches several sources at once and works to a deadline, then writes the answer from whatever arrived in time. ' +
          'A page that arrives late is not ranked lower — it is simply absent, there is no second attempt, and nothing in your analytics will ever show you it happened. ' +
          'Ask your hosting provider about time to first byte, and check whether pages are being generated fresh on every request when they could be cached. ' +
          'One note on our number: we time the complete response rather than the first byte, so treat it as an upper bound on how slow you are.',
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
      details: `All ${pages.length} sampled page(s) returned HTTP 200 with readable text content in the HTML. Homepage responded in ${
        context.homepage.durationMs
      }ms — band ${responseBandOf(context.homepage.durationMs).grade}.`,
      humanExplanation:
        'Every page we checked loaded cleanly and its content was readable straight from the server, without needing JavaScript to run first. ' +
        'That is exactly what an AI crawler needs, and a surprising number of modern sites fail it. ' +
        // Reported even on a pass. Speed is the one signal that degrades quietly
        // — nobody notices drifting from 400ms to 1.5s until they are being left
        // out of answers, and by then there is nothing in analytics to find.
        `Your homepage answered in ${(context.homepage.durationMs / 1000).toFixed(1)}s, which is ${
          responseBandOf(context.homepage.durationMs).note
        } — worth watching, because assistants fetch competing sources in parallel and write the answer from whatever arrives first.`,
    },
  };
}

/**
 * Response-time bands, judged against how assistants actually retrieve.
 *
 * A single "is it over four seconds" threshold got the mechanism wrong. Search
 * engines rank a slow page lower; an assistant does something different and
 * worse — it fetches several sources in parallel against a deadline and writes
 * the answer from whatever arrived. Miss the deadline and you are not demoted,
 * you are absent, with no ranking to appeal and nothing in your analytics
 * showing it happened.
 *
 * So the bands below are graded rather than binary, and only the slowest one
 * costs points: below that the number is reported so an owner can see which way
 * they are drifting.
 *
 * Honest caveat, stated in the report: this is the *whole response*, not
 * time-to-first-byte. TTFB would be the better measure and needs socket-level
 * timing we do not collect. The bands are therefore looser than TTFB guidance —
 * a full HTML document in 600ms is genuinely quick.
 */
const RESPONSE_BANDS: { upTo: number; grade: string; note: string }[] = [
  { upTo: 600, grade: 'A', note: 'comfortably inside any fetch deadline' },
  { upTo: 1200, grade: 'B', note: 'fine for most retrieval' },
  { upTo: 2500, grade: 'C', note: 'you start losing races against faster sources' },
  { upTo: 4000, grade: 'D', note: 'at risk of being dropped from answers' },
  { upTo: Infinity, grade: 'F', note: 'slower than most fetch deadlines allow' },
];

/** Only this band and worse costs points. */
const PENALISED_FROM_MS = 4000;

export function responseBandOf(ms: number): { grade: string; note: string } {
  return RESPONSE_BANDS.find((band) => ms < band.upTo) ?? RESPONSE_BANDS[RESPONSE_BANDS.length - 1];
}

function responseTimeVerdict(context: ScanContext): { detail: string } | null {
  const homepage = context.homepage.durationMs;
  if (homepage < PENALISED_FROM_MS) return null;
  const band = responseBandOf(homepage);
  return {
    detail: `your homepage took ${(homepage / 1000).toFixed(1)} seconds to respond — band ${band.grade}, ${band.note}`,
  };
}

/**
 * A warning to attach to any fix that says "paste this into your <head>".
 *
 * On a site whose content is assembled in the browser, the obvious way to add
 * meta tags or JSON-LD is a client-side helper — react-helmet, next/head used
 * client-side, a useEffect that injects a script tag. All of them run *after*
 * the JavaScript does, and the crawlers this report is about do not run
 * JavaScript. So the tags exist only in a browser, and never in what a crawler
 * receives.
 *
 * Without this, someone can follow our advice exactly, add perfect structured
 * data, re-scan, and still fail — then reasonably conclude the tool is broken.
 * We already know when it applies, because we detect the empty shell. Saying
 * nothing is the worst failure a diagnostic can have: sending someone to do
 * work that cannot possibly help them.
 */
export function clientRenderWarning(homepage: HtmlDocument): string {
  const mode = renderModeOf(homepage);
  if (mode === 'server_rendered') return '';

  return (
    ' One important warning before you paste anything: your pages are assembled in the browser rather than sent complete by the server. ' +
    'That means adding these tags with a client-side tool — react-helmet, or anything that injects them after your JavaScript runs — will not fix this, ' +
    'because the crawlers that need the tags never run your JavaScript and will not see them. ' +
    'The tags have to be in the HTML your server sends. In practice that means server-side rendering or pre-rendering the page (Next.js, Nuxt, Astro or a prerender service), ' +
    'or, for a single page such as your homepage, putting them directly in the index.html file that is served. ' +
    'It is worth confirming this yourself first: open the page, view the page source, and search it for your own headline — if it is not there, neither are the tags you are about to add.'
  );
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
