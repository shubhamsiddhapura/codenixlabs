import { AgentAccessRow, CheckOutcome } from '../../types';
import { ScanContext } from '../scanContext';
import { RobotsRule, isAllowed } from '../robotsTxt';
import { pathOf } from '../../utils/url';

/**
 * Check 1 — AI bot access via robots.txt (20 points, the heaviest single check).
 *
 * The user-agent list is the one the spec names: the crawlers behind ChatGPT,
 * Claude, Google's AI surfaces, Perplexity, Amazon's Rufus, Apple and Bing.
 */
/**
 * The crawlers we actually send a request as, to find out whether the site
 * serves them.
 *
 * Reading robots.txt only tells you what a site *says*. A CDN or firewall rule
 * can refuse GPTBot regardless — Cloudflare's bot protection does this by
 * default — and the owner never finds out, because the crawler does not send
 * a complaint. This is the only way to catch that, and it turns an opinion
 * about a text file into an observation.
 *
 * Each string keeps the real crawler token so user-agent rules match, and names
 * us alongside it. We are looking for stricter treatment than we get, not
 * trying to slip past anything — a site that blocks this probe is telling us
 * exactly what it would tell the real crawler.
 */
const PROBE_SUFFIX = '(probe by AgentReadyBot; +https://codenixlabs.com/agentready)';

/**
 * The control that makes the whole probe honest.
 *
 * A user-agent string proves nothing on its own — anyone can send one. The
 * crawlers that matter publish IP ranges, and a well-run firewall verifies
 * identity by IP and treats the header as untrusted. So a site that allowlists
 * OpenAI's ranges will refuse *our* GPTBot-shaped request from an Indian server
 * exactly as it would refuse a spoofer, while the real GPTBot walks in. Read
 * naively, that looks like "your firewall blocks ChatGPT" — a false accusation,
 * and worst on the sites with the best security.
 *
 * Googlebot is the control because every commercial site wants Googlebot. If a
 * spoofed Googlebot is refused too, the server is checking identity rather than
 * targeting AI crawlers, and we have learned nothing about GPTBot — so we say
 * that instead of guessing. If Googlebot is served and GPTBot is refused, the
 * rule really is aimed at AI crawlers, and now we can prove it rather than
 * infer it.
 */
export const CONTROL_BOT = {
  agent: 'Googlebot-control',
  userAgent: `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) ${PROBE_SUFFIX}`,
};

/**
 * Every crawler we ask the server about directly.
 *
 * This was three, which left eight of the eleven rows in the access table
 * inferred from a text file rather than observed. Reading robots.txt tells you
 * what a site asked for; only a request tells you what it does — and that gap
 * is the whole point of this check, so it should cover as much of the table as
 * the time budget allows.
 *
 * `Google-Extended` is deliberately absent. It is a robots.txt directive for
 * opting out of Gemini training, not a crawler that ever makes a request, so
 * there is nothing to probe and a live row for it would be theatre.
 *
 * These run in parallel, so ten probes cost little more wall-clock than three —
 * but see the control guard in buildAccessRows for what happens when a server
 * starts rate-limiting halfway through the burst.
 */
export const LIVE_PROBE_BOTS: { agent: string; label: string; userAgent: string }[] = [
  {
    agent: 'GPTBot',
    label: 'ChatGPT',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot ${PROBE_SUFFIX}`,
  },
  {
    agent: 'ChatGPT-User',
    label: 'ChatGPT (when a user asks about you)',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot ${PROBE_SUFFIX}`,
  },
  {
    agent: 'OAI-SearchBot',
    label: 'ChatGPT search',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot ${PROBE_SUFFIX}`,
  },
  {
    agent: 'ClaudeBot',
    label: 'Claude',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com ${PROBE_SUFFIX}`,
  },
  {
    agent: 'Claude-User',
    label: 'Claude (when a user asks about you)',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +claudebot@anthropic.com ${PROBE_SUFFIX}`,
  },
  {
    agent: 'PerplexityBot',
    label: 'Perplexity',
    userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot ${PROBE_SUFFIX}`,
  },
  {
    agent: 'Bingbot',
    label: 'Bing / Copilot',
    userAgent: `Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) ${PROBE_SUFFIX}`,
  },
  {
    agent: 'Amazonbot',
    label: 'Amazon Alexa / Rufus',
    userAgent: `Mozilla/5.0 (Linux; like Android) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot) ${PROBE_SUFFIX}`,
  },
  {
    agent: 'Applebot',
    label: 'Apple Intelligence / Siri',
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot) ${PROBE_SUFFIX}`,
  },
  {
    agent: 'CCBot',
    label: 'Common Crawl (feeds many AI models)',
    userAgent: `CCBot/2.0 (https://commoncrawl.org/faq/) ${PROBE_SUFFIX}`,
  },
];

export const AI_BOTS: { agent: string; label: string }[] = [
  { agent: 'GPTBot', label: 'ChatGPT (training + browsing)' },
  { agent: 'ChatGPT-User', label: 'ChatGPT (when a user asks about you)' },
  { agent: 'OAI-SearchBot', label: 'ChatGPT search' },
  { agent: 'ClaudeBot', label: 'Claude' },
  { agent: 'Claude-User', label: 'Claude (when a user asks about you)' },
  { agent: 'Google-Extended', label: 'Google Gemini / AI Overviews' },
  { agent: 'PerplexityBot', label: 'Perplexity' },
  { agent: 'Amazonbot', label: 'Amazon Alexa / Rufus' },
  { agent: 'Applebot', label: 'Apple Intelligence / Siri' },
  { agent: 'CCBot', label: 'Common Crawl (feeds many AI models)' },
  { agent: 'Bingbot', label: 'Bing / Copilot' },
];

/**
 * Rules that every store blocks on purpose and that no AI shopping agent needs.
 *
 * The spec's literal wording — "blocks some non-critical paths" is a warning —
 * would score a stock Shopify robots.txt as a warning, because Shopify ships
 * ~40 Disallow lines by default. That would cap a well-run store at a B on its
 * heaviest check for doing nothing wrong. So the rule implemented here is:
 * blocked product pages fail, blocked housekeeping passes, and anything that
 * blocks real content warns.
 *
 * Verified against the live robots.txt of several Shopify and WooCommerce
 * stores; the patterns below are the platform defaults, not guesses.
 */
/**
 * Matched at any path segment, not only the first.
 *
 * These used to be anchored to the start of the path, which meant `/wp-admin/`
 * was recognised and `/blog/wp-admin/` was not — so a WordPress blog living in a
 * subfolder got warned for blocking its own admin screen. The same applied to
 * `/en/cart` and every other localised or nested variant.
 *
 * The boundaries are deliberate rather than a bare substring test: requiring a
 * `/` or the end of the string after the word keeps `/collections/cart-bags`
 * and `/products/admin-chair` out, which a loose match would swallow.
 */
const SEGMENT = String.raw`(?:^|/)`;
const SEGMENT_END = String.raw`(?:/|$|\b)`;

const HOUSEKEEPING_RULES: RegExp[] = [
  // Transactional and admin areas. The optional view/my/shopping prefix is not
  // decoration: Flipkart disallows `/viewcart`, which is as obviously a cart as
  // `/cart` is, and without it we warned a major retailer that it was blocking
  // real content. Deliberately no `bag` — `/bags` is a product category on half
  // the fashion sites in India, and treating that as housekeeping would hide a
  // genuine block.
  new RegExp(
    `${SEGMENT}\\*?((view|my|shopping)[-_]?)?(cart|carts|basket|checkout|checkouts|orders?|account|my[-_]account|admin|login|logout|register|password|lost[-_]password|customer|wishlist|compare|search)${SEGMENT_END}`,
    'i',
  ),
  // Faceted navigation and sort/filter permutations — infinite URL space, no
  // unique content behind any of it.
  /sort_by|filter|\*\+\*|%2b|\?|&|=/i,
  // Theme and script previews.
  /preview_theme|preview_script|oseid/i,
  // Platform plumbing: JSON endpoints, build output and framework internals.
  // None of it holds a page a person would read, so none of it is a finding.
  // `/api/` in particular is blocked by almost every modern site — flagging it
  // would cost nearly every React, Next.js or Vite site points for doing the
  // correct thing.
  new RegExp(
    `${SEGMENT}\\*?(api|_next|_nuxt|_vercel|_astro|static|assets|build|dist|cgi-bin|node_modules|a/downloads|sf_|cdn/|apps|services|recommendations|\\.well-known|apple-app-site-association|wp-admin|wp-includes|wp-content|wp-json|xmlrpc)`,
    'i',
  ),
  // Shopify's remote-SKU variants: literal character classes in the path.
  /\[a-f0-9\]/i,
  // Numeric store-id prefixed routes, e.g. "/13080907/checkouts".
  /^\/\d{4,}(\/|$)/,
];

/**
 * Multi-market stores repeat every rule with a locale wildcard in front
 * ("/*​/cart/", "*​/collections/..."). Strip that prefix before matching, or the
 * localised copy of a housekeeping rule reads as a content block.
 */
function stripLocalePrefix(rulePath: string): string {
  return rulePath.replace(/^[/*]+/, '/');
}

function isHousekeeping(rulePath: string): boolean {
  const candidates = [rulePath, stripLocalePrefix(rulePath)];
  return HOUSEKEEPING_RULES.some((pattern) => candidates.some((candidate) => pattern.test(candidate)));
}

/**
 * URL paths we test each bot against to decide "can it reach the pages that
 * matter?" — the sampled key pages when we have them, and otherwise the URL
 * shapes this kind of site typically uses.
 *
 * `sampled` tells the caller which it got, because the two need opposite
 * logic. Real sampled pages are the site's actual content, so a bot is only
 * shut out when *all* of them are blocked — one odd page should not fail the
 * check. Guessed shapes are alternatives to each other, and we do not know
 * which one this site uses, so a rule blocking *any* of them is a genuine
 * finding rather than a coincidence.
 */
function keyProbePaths(context: ScanContext): { paths: string[]; sampled: boolean } {
  const sampled = context.keyPages.map((page) => pathOf(page.url));
  if (sampled.length) return { paths: sampled, sampled: true };

  const fallbacks: Record<string, string[]> = {
    ecommerce: ['/products/sample-product', '/product/sample-product', '/shop/sample-product'],
    content: ['/blog/sample-post', '/posts/sample-post', '/article/sample-post'],
    saas: ['/pricing', '/features', '/docs'],
    local_business: ['/services', '/contact', '/about'],
    general: ['/about', '/services', '/contact'],
  };

  return { paths: fallbacks[context.siteType] || fallbacks.general, sampled: false };
}

interface BotVerdict {
  agent: string;
  label: string;
  rootBlocked: boolean;
  /** Shut out of the pages that carry this site's substance. */
  keyPagesBlocked: boolean;
  blockingRule: RobotsRule | null;
  /** Non-key, non-housekeeping paths this bot is disallowed from. */
  otherBlocks: RobotsRule[];
}

/**
 * One row per crawler: what robots.txt says, overridden by what the server
 * actually did wherever we asked it.
 *
 * The live result outranks the file every time. A rule saying "welcome" means
 * nothing if the request comes back 403, and that disagreement is the single
 * most valuable thing this check produces — so the row says which of the two it
 * is reporting rather than blending them into one verdict.
 */
function buildAccessRows(context: ScanContext): AgentAccessRow[] {
  const { robots } = context;

  /**
   * Was the server still answering us while the probes ran?
   *
   * Ten near-simultaneous requests can trip a rate limiter that four never did,
   * and every probe after that point comes back 429 — which would read as "this
   * site blocks ten AI crawlers" when it blocks none of them. The Googlebot
   * control is sent in the same burst, so if it came back cleanly the server was
   * still serving and a refusal really is about that crawler. If the control was
   * refused too, we cannot attribute anything, and the rows fall back to what
   * robots.txt says rather than inventing a server-side block.
   */
  const control = context.botProbes[CONTROL_BOT.agent];
  const serverWasAnswering = Boolean(control && control.ok);

  return AI_BOTS.map(({ agent, label }) => {
    const probe = context.botProbes[agent];
    const liveTested = Boolean(probe && !probe.failure) && serverWasAnswering;

    if (liveTested && (probe.blocked || probe.status === 404)) {
      return {
        agent,
        label,
        status: 'blocked_server' as const,
        liveTested: true,
        detail: `server answered HTTP ${probe.status ?? '—'} to a live request`,
      };
    }

    const decision = robots ? isAllowed(robots, agent, '/') : null;
    if (decision && !decision.allowed) {
      return {
        agent,
        label,
        status: 'blocked_robots' as const,
        liveTested: false,
        detail: decision.rule ? `robots.txt line ${decision.rule.line}: Disallow: ${decision.rule.path}` : 'disallowed in robots.txt',
      };
    }

    return {
      agent,
      label,
      status: 'allowed' as const,
      liveTested,
      detail: liveTested ? `served HTTP ${probe.status} to a live request` : null,
    };
  });
}

export function checkBotAccess(context: ScanContext): CheckOutcome {
  const { robotsTxt, robots } = context;

  const base = {
    checkId: 'bot_access' as const,
    title: 'AI bot access',
    generatedFixLanguage: 'robots' as const,
    agentAccess: buildAccessRows(context),
  };

  /**
   * The live probe outranks everything below.
   *
   * If the server refuses a crawler outright, what robots.txt says about it is
   * irrelevant — and this is the finding no file-reading tool can produce, so
   * it is checked first and reported on its own terms.
   */
  const refused = LIVE_PROBE_BOTS.filter(({ agent }) => {
    const probe = context.botProbes[agent];
    return probe && (probe.blocked || probe.status === 404) && !probe.failure;
  });

  // Only meaningful if the site served *us*. When it refuses everyone, that is
  // the crawlability check's finding, not a crawler-specific one.
  const homepageServedUs = context.homepage.ok && !context.homepage.blocked;

  const control = context.botProbes[CONTROL_BOT.agent];
  const controlRefused = Boolean(control && control.blocked && !control.failure);

  /**
   * A refusal we cannot attribute. The server turned away a crawler shape it
   * has every commercial reason to welcome, which means it is verifying
   * identity rather than filtering by name — so what it does to the real
   * GPTBot, arriving from OpenAI's own network, is not something this test can
   * see. Saying so is the only defensible answer.
   */
  if (refused.length && controlRefused) {
    return {
      ...base,
      status: 'skipped',
      details: `Live probes refused for ${refused.map((bot) => bot.agent).join(', ')}, but a Googlebot control request was refused too — the server verifies crawler identity by network address, so this test cannot see how it treats the real crawlers.`,
      humanExplanation:
        'Your server refused our test requests — but it also refused one shaped like Googlebot, which no commercial site wants to turn away. ' +
        'That tells us your firewall is checking *where* a visitor comes from, not what it calls itself, which is the stricter and better-configured setup. ' +
        'It also means this particular test cannot tell you anything: the real ChatGPT and Claude crawlers arrive from their own published networks, and they may well be let straight through. ' +
        'We have left this out of your score rather than guess. To know for certain, ask whoever manages your hosting to search your server logs for GPTBot and ClaudeBot over the last month — if you see them fetching pages, you are fine.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  if (homepageServedUs && refused.length) {
    const names = refused.map((bot) => bot.label).join(', ');
    const statuses = refused
      .map((bot) => `${bot.agent} → HTTP ${context.botProbes[bot.agent]?.status ?? 'blocked'}`)
      .join('; ');

    return {
      ...base,
      status: 'fail',
      details: `Server refused live requests from ${refused.length} AI crawler(s) while serving ours normally: ${statuses}.`,
      humanExplanation:
        `We asked your server for your homepage as ${names}, and it turned ${refused.length === 1 ? 'that crawler' : 'them'} away — while serving the exact same page to us a moment earlier. ` +
        'This is the failure almost nobody catches, because your robots.txt can say "come in" while your firewall says "no", and the crawler never files a complaint — it simply stops coming back. ' +
        'It is nearly always bot protection set too broadly: Cloudflare\'s bot-fight mode, a WAF rule, or a security plugin that treats any non-browser visitor as an attack. ' +
        'Ask whoever manages your hosting or CDN to allow the AI crawler user-agents through — the list is in the block below. ' +
        'Until that is done, nothing else on this report can help: these assistants cannot read a single page of your site.',
      generatedFix: buildRobotsFix(context, []),
      generatedFixTarget: `https://${context.domain}/robots.txt`,
    };
  }

  // The inverse is worth saying out loud: some sites refuse unknown scanners
  // but allowlist the named crawlers, which is a correct setup.
  const probedOk = LIVE_PROBE_BOTS.filter(({ agent }) => context.botProbes[agent]?.ok);
  const serverAllowlistsBots = !homepageServedUs && probedOk.length > 0;

  /**
   * Say it here too, not only when robots.txt was unreadable.
   *
   * This used to live solely inside the robots.txt-failure branch, so a large
   * retailer with a perfectly readable robots.txt that refused our scanner and
   * served GPTBot fell straight through to the rules-based verdict below — and
   * the single most reassuring fact we had learned about it was silently
   * dropped from the report.
   */
  if (serverAllowlistsBots) {
    return {
      ...base,
      status: 'pass',
      details: `Server refused our scanner (HTTP ${context.homepage.status ?? 'blocked'}) but served ${probedOk
        .map((bot) => bot.agent)
        .join(', ')} normally.`,
      humanExplanation:
        `Your server turns away visitors it does not recognise — including our scanner — but served your homepage normally when we asked as ${probedOk
          .map((bot) => bot.label)
          .join(', ')}. ` +
        'That is exactly the right configuration: strict by default, open to the crawlers that matter. ' +
        'The live test is the one that counts here, and you passed it. ' +
        'Because we were turned away ourselves, several checks below could not run — they have been left out of your score rather than counted against you.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  // Could not reach robots.txt at all — the site was down or blocked us. Say so
  // rather than guessing; Check 6 reports the access problem itself.
  if (robotsTxt.failure || robotsTxt.blocked) {
    return {
      ...base,
      status: serverAllowlistsBots ? 'pass' : 'warning',
      details: `Could not read robots.txt (${robotsTxt.failure || `HTTP ${robotsTxt.status}`}).${
        serverAllowlistsBots ? ` Live probes as ${probedOk.map((bot) => bot.agent).join(', ')} were served normally.` : ''
      }`,
      humanExplanation: serverAllowlistsBots
        ? 'Your server turns away scanners it does not recognise — including ours — but it served your homepage normally when we asked as ChatGPT, Claude and Perplexity. ' +
          'That is a correct setup: strict by default, open to the crawlers that matter. We could not read your robots.txt for the same reason, so we could not check it in detail, but the live test is the one that counts and you passed it.'
        : 'We could not read your robots.txt file, so we cannot confirm whether AI assistants are allowed to visit your site. ' +
          `Open https://${context.domain}/robots.txt in your browser: if it does not load, that is worth fixing, because every crawler checks this file first.`,
      generatedFix: serverAllowlistsBots ? null : startingRobotsTxt(context),
      generatedFixLanguage: serverAllowlistsBots ? null : ('robots' as const),
      generatedFixTarget: serverAllowlistsBots ? null : `https://${context.domain}/robots.txt`,
    };
  }

  // 404 or an empty file both mean "no rules", and no rules means allowed.
  const hasRules = Boolean(robots && !robots.empty && robots.groups.length);
  if (!hasRules) {
    const reason = robotsTxt.status === 404 ? "You do not have a robots.txt file" : 'Your robots.txt file contains no crawl rules';
    return {
      ...base,
      status: 'pass',
      details:
        robotsTxt.status === 404
          ? 'No robots.txt (HTTP 404). Default behaviour is "everything allowed".'
          : `robots.txt returned HTTP ${robotsTxt.status} with no usable rules.`,
      humanExplanation:
        `${reason}, and when there are no rules the default is "everyone is welcome" — so ChatGPT, Claude, Gemini and Perplexity can all read your site. ` +
        'Nothing to fix here. If you add a robots.txt later, make sure it does not block the AI crawlers by accident.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  const { paths: probePaths, sampled } = keyProbePaths(context);
  const verdicts: BotVerdict[] = AI_BOTS.map(({ agent, label }) => {
    const rootDecision = isAllowed(robots!, agent, '/');
    const keyDecisions = probePaths.map((path) => isAllowed(robots!, agent, path));
    const blockedDecisions = keyDecisions.filter((decision) => !decision.allowed);
    const keyPagesBlocked = sampled ? blockedDecisions.length === keyDecisions.length : blockedDecisions.length > 0;

    const blockingRule =
      keyDecisions.find((decision) => !decision.allowed)?.rule || (rootDecision.allowed ? null : rootDecision.rule);

    const otherBlocks = collectOtherBlocks(robots!, agent);

    return {
      agent,
      label,
      rootBlocked: !rootDecision.allowed,
      keyPagesBlocked,
      blockingRule,
      otherBlocks,
    };
  });

  const blockedFromProducts = verdicts.filter((verdict) => verdict.keyPagesBlocked);
  const warnOnly = verdicts.filter((verdict) => !verdict.keyPagesBlocked && verdict.otherBlocks.length);

  if (blockedFromProducts.length) {
    const names = blockedFromProducts.map((verdict) => verdict.agent);
    const citedRules = [
      ...new Set(
        blockedFromProducts
          .map((verdict) => (verdict.blockingRule ? `line ${verdict.blockingRule.line}: Disallow: ${verdict.blockingRule.path}` : null))
          .filter((rule): rule is string => Boolean(rule)),
      ),
    ];

    const everything = blockedFromProducts.every((verdict) => verdict.rootBlocked);

    return {
      ...base,
      status: 'fail',
      details: `Blocked from ${context.profile.keyPageLabel}: ${names.join(', ')}. Rules: ${citedRules.join('; ') || 'n/a'}.`,
      humanExplanation:
        `Your robots.txt file is currently telling ${describeList(blockedFromProducts.map((v) => v.label))} to stay away from ${everything ? 'your whole website' : `your ${context.profile.keyPageLabel}`}. ` +
        `That means when someone asks one of those assistants a question you could answer, your site is invisible to it — not ranked low, simply not there. ` +
        'This is usually accidental: it is inherited from a theme, a staging setup, or an SEO plugin nobody revisited. ' +
        'Fix it by removing the blocking lines below and adding the allow rules we generated for you.',
      generatedFix: buildRobotsFix(context, blockedFromProducts),
      generatedFixTarget: `https://${context.domain}/robots.txt`,
    };
  }

  if (warnOnly.length) {
    const blockedPaths = [...new Set(warnOnly.flatMap((verdict) => verdict.otherBlocks.map((rule) => rule.path)))];
    const sampleRules = blockedPaths.slice(0, 6);
    const policiesBlocked = blockedPaths.some((path) => /policies|policy|terms|shipping|refund|return|privacy/i.test(path));

    return {
      ...base,
      status: 'warning',
      details: `AI crawlers can reach your ${context.profile.keyPageLabel}, but these paths are disallowed: ${sampleRules.join(', ')}${
        blockedPaths.length > sampleRules.length ? `, +${blockedPaths.length - sampleRules.length} more` : ''
      }.`,
      humanExplanation:
        `AI assistants can reach your ${context.profile.keyPageLabel}, which is the important part. But your robots.txt also blocks some other sections of the site ` +
        `(${sampleRules.slice(0, 3).join(', ')}${blockedPaths.length > 3 ? ', and others' : ''}). ` +
        (policiesBlocked
          ? 'One of those is your policy pages, and that one matters: an assistant that cannot read your terms will often decline to recommend you at all, because it will not send someone somewhere it cannot explain. ' +
            'On Shopify this line is in the default robots.txt every store ships with — most owners have no idea it is there. It can be edited (Online Store → Themes → Edit code → robots.txt.liquid). '
          : 'If any of those hold guides, collection pages, documentation or policy pages, an assistant will not be able to read them, and it uses exactly that kind of page to decide whether to recommend you. ') +
        'Review the list below and unblock anything a visitor would be allowed to see.',
      generatedFix: buildRobotsFix(context, []),
      generatedFixTarget: `https://${context.domain}/robots.txt`,
    };
  }

  const probeNote = probedOk.length
    ? ` Live requests as ${probedOk.map((bot) => bot.agent).join(', ')} were served normally.`
    : '';

  const defects = describeDefects(robots);

  return {
    ...base,
    status: 'pass',
    details: `All ${AI_BOTS.length} AI crawlers can reach the homepage and your ${context.profile.keyPageLabel}.${probeNote}${defects.detail}`,
    humanExplanation:
      `Your robots.txt file lets every major AI assistant — ChatGPT, Claude, Gemini, Perplexity, Copilot and Amazon's — read your site, including your ${context.profile.keyPageLabel}. ` +
      (probedOk.length
        ? `We also asked your server for a page as ${probedOk.map((bot) => bot.label).join(', ')} and it served ${probedOk.length === 1 ? 'it' : 'them'} normally, so your firewall agrees with your robots.txt — the two disagree more often than owners realise. `
        : '') +
      'This is the single biggest thing to get right, and you have it right. Nothing to change.' +
      defects.explanation,
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
  };
}

/**
 * Lines in robots.txt that crawlers silently discard.
 *
 * Reported even when everything else passes, because the failure is invisible
 * from the owner's side: they wrote `Disallow: https://example.com/login/`,
 * they believe that page is blocked, and it is not. Nothing in their analytics
 * or their file will ever tell them the rule is dead.
 *
 * It never changes the status. An ignored Disallow does not stop an assistant
 * reading the site, which is what this check scores — it is information the
 * owner is entitled to, not a fault in their AI readiness.
 */
function describeDefects(robots: ScanContext['robots']): { detail: string; explanation: string } {
  const defects = robots?.defects ?? [];
  if (!defects.length) return { detail: '', explanation: '' };

  const lines = defects.slice(0, 3).map((defect) => `line ${defect.line} (${defect.raw})`);

  return {
    detail: ` ${defects.length} robots.txt line(s) are invalid and ignored by crawlers: ${lines.join('; ')}.`,
    explanation:
      ` One separate thing worth knowing: ${
        defects.length === 1 ? 'one line in your robots.txt is' : `${defects.length} lines in your robots.txt are`
      } written in a way crawlers cannot read, so ${defects.length === 1 ? 'it is' : 'they are'} skipped entirely — ${lines.join('; ')}. ` +
      'A rule must be a path such as "/login/", not a full web address. ' +
      `This does not affect your score, and it is not stopping assistants reading you. But if ${
        defects.length === 1 ? 'that line was' : 'those lines were'
      } meant to keep something private, ${defects.length === 1 ? 'it is' : 'they are'} not doing it — nothing in your file or your analytics would ever have told you.`,
  };
}

/**
 * Disallow rules that apply to this bot and are neither key-page paths nor
 * routine housekeeping — the paths a site owner should actually look at.
 */
function collectOtherBlocks(robots: NonNullable<ScanContext['robots']>, agent: string): RobotsRule[] {
  const group =
    robots.groups.find((candidate) => candidate.userAgents.includes(agent.toLowerCase())) ||
    robots.groups.find((candidate) => candidate.userAgents.includes('*'));

  if (!group) return [];

  return group.rules.filter(
    (rule) => rule.type === 'disallow' && rule.path !== '' && !isHousekeeping(rule.path),
  );
}

function describeList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The allow-block every store should have, used by both fixes below. */
function allowBlock(): string {
  return AI_BOTS.map(({ agent }) => `User-agent: ${agent}\nAllow: /\n`).join('\n');
}

function startingRobotsTxt(context: ScanContext): string {
  return [
    `# robots.txt for ${context.domain}`,
    '# Save this at https://' + context.domain + '/robots.txt',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    '',
    '# Explicitly welcome AI shopping assistants',
    allowBlock().trimEnd(),
    '',
    `Sitemap: https://${context.domain}/sitemap.xml`,
    '',
  ].join('\n');
}

function buildRobotsFix(context: ScanContext, blocked: BotVerdict[]): string {
  const lines: string[] = [`# Edit your robots.txt at https://${context.domain}/robots.txt`, ''];

  if (blocked.length) {
    const rules = new Map<number, string>();
    for (const verdict of blocked) {
      if (verdict.blockingRule) rules.set(verdict.blockingRule.line, `Disallow: ${verdict.blockingRule.path}`);
    }

    lines.push('# STEP 1 — remove (or narrow) these lines, they are what blocks the AI crawlers:');
    if (rules.size) {
      for (const [line, text] of [...rules.entries()].sort((a, b) => a[0] - b[0])) {
        lines.push(`#   line ${line}:  ${text}`);
      }
    } else {
      lines.push('#   (see the "details" above for the exact rules)');
    }
    lines.push('');
    lines.push('# STEP 2 — add this block at the end of the file:');
  } else {
    lines.push('# Add this block at the end of the file so AI crawlers are explicitly welcome:');
  }

  lines.push('');
  lines.push(allowBlock().trimEnd());
  lines.push('');
  lines.push(`Sitemap: https://${context.domain}/sitemap.xml`);
  lines.push('');

  return lines.join('\n');
}
