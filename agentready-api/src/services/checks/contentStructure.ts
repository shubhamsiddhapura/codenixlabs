import { CheckOutcome } from '../../types';
import { ScanContext, allPages } from '../scanContext';
import { HtmlDocument, typesOf } from '../htmlDocument';
import { isSameSite } from '../../utils/url';

/**
 * Check 7 — can a model parse and attribute this page?
 *
 * Distinct from structured data, which is about the *facts*. This is about the
 * *shape* they sit in: one canonical URL so citations do not split across
 * duplicates, a heading hierarchy a model can chunk into answerable sections,
 * alt text so images are not dead weight, semantic landmarks so the article is
 * separable from the navigation, Open Graph tags for when an assistant links
 * you, and a date so it knows whether you are current.
 *
 * None of these individually is dramatic. Together they decide whether a model
 * quotes a clean paragraph from you or a mangled blob of your menu — which is
 * the difference between being cited and being skipped.
 *
 * Six signals, judged over the sampled pages. One or two gaps is a warning;
 * three or more means the page is genuinely hard to parse.
 */

interface Signal {
  id: string;
  /** What a site owner would call it. */
  label: string;
  ok: boolean;
  /** Machine-readable specifics for the details line. */
  detail: string;
  /** One line on why it costs them, used to build the explanation. */
  consequence: string;
}

const WARNING_THRESHOLD = 1;
const FAIL_THRESHOLD = 3;

export function checkContentStructure(context: ScanContext): CheckOutcome {
  const base = {
    checkId: 'content_structure' as const,
    title: 'Page structure & metadata',
    generatedFixLanguage: 'html' as const,
  };

  const pages = allPages(context).filter((page) => page.$ !== null && page.ok && !page.blocked);

  // Same rule as every other check: a page we never received cannot be judged.
  if (!pages.length) {
    return {
      ...base,
      status: 'skipped',
      details: 'No readable page HTML to inspect.',
      humanExplanation:
        'We could not read your pages, so we could not check how they are structured. This has been left out of your score rather than counted against you — see the crawlability result, which is the problem to fix first.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  const signals = [
    checkCanonical(pages, context),
    checkHeadings(pages),
    checkAltText(pages),
    checkSemanticLandmarks(pages),
    checkOpenGraph(pages),
    checkFreshness(pages, context),
  ];

  const problems = signals.filter((signal) => !signal.ok);
  const fix = buildHeadFix(context, pages[0], problems);

  if (!problems.length) {
    return {
      ...base,
      status: 'pass',
      details: `All ${signals.length} structure signals present across ${pages.length} page(s): ${signals.map((s) => s.detail).join('; ')}.`,
      humanExplanation:
        'Your pages are well structured for a machine to read: one clear address per page, a heading hierarchy an assistant can break into sections, described images, proper page landmarks, complete social tags and a visible date. ' +
        'This is the unglamorous half of being quotable, and you have it. Nothing to change.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  const status = problems.length >= FAIL_THRESHOLD ? 'fail' : problems.length > WARNING_THRESHOLD - 1 ? 'warning' : 'warning';

  return {
    ...base,
    status,
    details: `${problems.length} of ${signals.length} structure signals missing across ${pages.length} page(s). ${problems
      .map((signal) => signal.detail)
      .join('; ')}.`,
    humanExplanation:
      `${problems.length === 1 ? 'One thing' : `${problems.length} things`} about how your pages are built ${problems.length === 1 ? 'makes' : 'make'} them harder for an AI assistant to quote accurately: ` +
      `${listWords(problems.map((signal) => signal.label))}. ` +
      problems.map((signal) => signal.consequence).join(' ') +
      ' ' +
      (status === 'fail'
        ? 'Together these mean an assistant reading your page has to guess where your content starts, what it is called and which version of the URL is the real one — so it quotes you badly, or skips you for a competitor whose page it can parse cleanly. '
        : 'These are small edits with a disproportionate effect on how cleanly you get quoted. ') +
      'The block below covers the parts that are copy-pasteable; the rest are edits to your page template.',
    generatedFix: fix,
    generatedFixTarget: 'The <head> section of every page on your site',
  };
}

// --- Signals --------------------------------------------------------------

/** One canonical URL per page, pointing at itself on the same site. */
function checkCanonical(pages: HtmlDocument[], context: ScanContext): Signal {
  const missing: string[] = [];
  const foreign: string[] = [];

  for (const page of pages) {
    const links = page.$!('link[rel="canonical"]');
    const href = links.first().attr('href')?.trim();

    if (!href) {
      missing.push(page.url);
      continue;
    }
    // A canonical pointing at another domain hands your citations to them.
    if (!isSameSite(absolute(href, page.url), context.origin)) foreign.push(page.url);
  }

  const ok = missing.length === 0 && foreign.length === 0;
  return {
    id: 'canonical',
    label: 'a canonical URL on every page',
    ok,
    detail: ok
      ? 'canonical tags present on all pages'
      : `canonical missing on ${missing.length} page(s)${foreign.length ? `, pointing off-site on ${foreign.length}` : ''}`,
    consequence: foreign.length
      ? 'A canonical tag pointing at another domain tells assistants to credit that site instead of yours.'
      : 'Without a canonical tag, the same page reachable at two addresses is treated as two pages, splitting whatever authority it has earned.',
  };
}

/** Exactly one H1, and no levels skipped — the outline a model chunks by. */
function checkHeadings(pages: HtmlDocument[]): Signal {
  const noH1: string[] = [];
  const multipleH1: string[] = [];
  const skipped: string[] = [];

  for (const page of pages) {
    const $ = page.$!;
    const h1Count = $('h1').length;
    if (h1Count === 0) noH1.push(page.url);
    else if (h1Count > 2) multipleH1.push(page.url);

    const levels: number[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const tag = (element as { tagName?: string }).tagName;
      if (tag) levels.push(Number(tag.slice(1)));
    });

    // A jump from h1 straight to h3 leaves a model guessing what the h3
    // belongs to.
    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i] - levels[i - 1] > 1) {
        skipped.push(page.url);
        break;
      }
    }
  }

  const ok = !noH1.length && !multipleH1.length && !skipped.length;
  return {
    id: 'headings',
    label: 'a clean heading outline',
    ok,
    detail: ok
      ? 'heading hierarchy is well formed'
      : [
          noH1.length ? `no H1 on ${noH1.length} page(s)` : '',
          multipleH1.length ? `several H1s on ${multipleH1.length} page(s)` : '',
          skipped.length ? `skipped heading levels on ${skipped.length} page(s)` : '',
        ]
          .filter(Boolean)
          .join(', '),
    consequence: noH1.length
      ? 'A page with no H1 gives an assistant nothing to treat as its title, so it falls back to guessing from your navigation.'
      : 'Assistants split a page into answerable sections by its heading levels; a broken outline means the sections it quotes do not match what you actually wrote.',
  };
}

/** Images described, so they are content rather than dead weight. */
function checkAltText(pages: HtmlDocument[]): Signal {
  let total = 0;
  let described = 0;

  for (const page of pages) {
    page.$!('img').each((_, element) => {
      total += 1;
      const alt = page.$!(element).attr('alt');
      // alt="" is a deliberate "this is decorative" and counts as handled.
      if (alt !== undefined && alt !== null) described += 1;
    });
  }

  if (total === 0) {
    return { id: 'alt', label: 'described images', ok: true, detail: 'no images to describe', consequence: '' };
  }

  const ratio = described / total;
  const ok = ratio >= 0.8;
  return {
    id: 'alt',
    label: 'alt text on your images',
    ok,
    detail: `${described}/${total} images have an alt attribute`,
    consequence:
      'Images without alt text are invisible to an assistant — for a product photo or a chart, that is a chunk of your page it simply cannot use.',
  };
}

/** Landmarks that separate the article from the furniture. */
function checkSemanticLandmarks(pages: HtmlDocument[]): Signal {
  const bare: string[] = [];

  for (const page of pages) {
    const $ = page.$!;
    const hasMain = $('main, [role="main"], article').length > 0;
    const hasNav = $('nav, [role="navigation"], header').length > 0;
    if (!hasMain || !hasNav) bare.push(page.url);
  }

  const ok = bare.length === 0;
  return {
    id: 'landmarks',
    label: 'semantic page landmarks',
    ok,
    detail: ok ? 'main/article and nav landmarks present' : `no <main> or <article> landmark on ${bare.length} page(s)`,
    consequence:
      'Without a <main> or <article> element, an assistant cannot tell your content apart from your menu and footer, so it quotes them together.',
  };
}

/** The five Open Graph tags that decide how you appear when linked. */
function checkOpenGraph(pages: HtmlDocument[]): Signal {
  const required = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
  const missingByPage = new Map<string, string[]>();

  for (const page of pages) {
    const missing = required.filter((property) => !page.$!(`meta[property="${property}"]`).first().attr('content')?.trim());
    if (missing.length) missingByPage.set(page.url, missing);
  }

  const allMissing = [...new Set([...missingByPage.values()].flat())];
  const ok = allMissing.length === 0;
  return {
    id: 'opengraph',
    label: 'complete Open Graph tags',
    ok,
    detail: ok ? 'all Open Graph tags present' : `missing ${allMissing.join(', ')} on ${missingByPage.size} page(s)`,
    consequence:
      'Open Graph tags are what an assistant shows when it links you — without them your result is a bare URL next to competitors with a title, a summary and an image.',
  };
}

/** Some machine-readable indication of when this was written or updated. */
function checkFreshness(pages: HtmlDocument[], context: ScanContext): Signal {
  const dated = pages.filter((page) => {
    const $ = page.$!;
    if ($('time[datetime]').length) return true;
    if ($('meta[property="article:published_time"], meta[property="article:modified_time"]').length) return true;
    return page.jsonLd().some((node) => Boolean(node.datePublished || node.dateModified || node.uploadDate));
  });

  // A store's product pages are not expected to carry dates; a publication's
  // articles absolutely are.
  const expected = context.siteType === 'content';
  const ok = expected ? dated.length >= Math.ceil(pages.length / 2) : dated.length > 0 || !expected;

  return {
    id: 'freshness',
    label: 'a machine-readable date',
    ok,
    detail: ok ? `${dated.length}/${pages.length} page(s) carry a date` : `no published or updated date on ${pages.length - dated.length} page(s)`,
    consequence:
      'Assistants prefer information they can date, and treat undated pages as possibly stale — which for anything time-sensitive means being passed over for a competitor who published a date.',
  };
}

// --- Fix generation -------------------------------------------------------

const PLACEHOLDER = (field: string): string => `REPLACE_WITH_${field.toUpperCase()}`;

/**
 * The copy-pasteable half: canonical and Open Graph tags, pre-filled from the
 * page's own content. Headings, alt text and landmarks are template edits, so
 * they are named in the comments rather than faked as a block.
 */
function buildHeadFix(context: ScanContext, page: HtmlDocument, problems: Signal[]): string {
  const ids = new Set(problems.map((signal) => signal.id));
  const lines: string[] = ['<!-- Paste inside the <head> of each page, with that page\'s own values. -->'];

  if (ids.has('canonical')) {
    lines.push('', '<!-- One canonical address per page, absolute, pointing at itself. -->', `<link rel="canonical" href="${page.url}" />`);
  }

  if (ids.has('opengraph')) {
    const title = page.$?.('meta[property="og:title"]').first().attr('content')?.trim() || page.title || PLACEHOLDER('page_title');
    const description =
      page.$?.('meta[property="og:description"]').first().attr('content')?.trim() ||
      page.$?.('meta[name="description"]').first().attr('content')?.trim() ||
      PLACEHOLDER('one_sentence_summary_of_this_page');
    const image = page.$?.('meta[property="og:image"]').first().attr('content')?.trim() || PLACEHOLDER('share_image_url');

    lines.push(
      '',
      '<!-- What an assistant shows when it links this page. -->',
      `<meta property="og:title" content="${escapeAttribute(title)}" />`,
      `<meta property="og:description" content="${escapeAttribute(description)}" />`,
      `<meta property="og:image" content="${escapeAttribute(image)}" />`,
      `<meta property="og:url" content="${page.url}" />`,
      `<meta property="og:type" content="${ogTypeFor(context)}" />`,
      `<meta property="og:site_name" content="${escapeAttribute(context.siteName || context.domain)}" />`,
    );
  }

  if (ids.has('freshness')) {
    lines.push(
      '',
      '<!-- So assistants know how current this is. Use real dates. -->',
      `<meta property="article:published_time" content="${PLACEHOLDER('yyyy-mm-dd')}" />`,
      `<meta property="article:modified_time" content="${PLACEHOLDER('yyyy-mm-dd')}" />`,
    );
  }

  const templateEdits = problems.filter((signal) => ['headings', 'alt', 'landmarks'].includes(signal.id));
  if (templateEdits.length) {
    lines.push('', '<!-- These are edits to your page template, not tags to paste:');
    if (ids.has('headings')) {
      lines.push('     · exactly one <h1> per page, then <h2> and <h3> in order — never skip a level');
    }
    if (ids.has('alt')) {
      lines.push('     · an alt="..." on every meaningful image; alt="" only for decoration');
    }
    if (ids.has('landmarks')) {
      lines.push('     · wrap the page content in <main> (or <article>) and the menu in <nav>');
    }
    lines.push('-->');
  }

  lines.push('');
  return lines.join('\n');
}

function ogTypeFor(context: ScanContext): string {
  if (context.siteType === 'content') return 'article';
  if (context.siteType === 'ecommerce') return 'product';
  return 'website';
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '&quot;').slice(0, 200);
}

function listWords(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Re-exported so the engine can name the check before it runs. */
export const CONTENT_STRUCTURE_TITLE = 'Page structure & metadata';

/** Used by the structured-data check to mention bonus schema types. */
export function hasSchemaType(page: HtmlDocument, matcher: RegExp): boolean {
  return page.jsonLd().some((node) => typesOf(node).some((type) => matcher.test(type)));
}
