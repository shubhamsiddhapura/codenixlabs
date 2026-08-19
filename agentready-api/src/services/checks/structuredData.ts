import { CheckOutcome } from '../../types';
import { ScanContext } from '../scanContext';
import { HtmlDocument, typesOf } from '../htmlDocument';
import { SCHEMA_PROFILES, SchemaField, SchemaProfile } from './schemaProfiles';
import { clientRenderWarning } from './crawlability';
import { looksLikeProductUrl } from '../discovery';

/**
 * Check 3 — structured data (the heaviest check for every site type).
 *
 * This is what an assistant quotes back to a user: the price and stock for a
 * store, the author and date for an article, the address and hours for a
 * clinic, the category and pricing for a SaaS product. Without it the model is
 * guessing from prose, and it will prefer whoever it can read cleanly.
 *
 * Which schema is expected comes from the site profile — see schemaProfiles.ts.
 * The judging logic below is identical whatever the site is.
 */

interface PageFinding {
  page: HtmlDocument;
  found: boolean;
  missing: SchemaField[];
  node: Record<string, unknown> | null;
}

export function checkStructuredData(context: ScanContext): CheckOutcome {
  const profile = SCHEMA_PROFILES[context.siteType];

  const base = {
    checkId: 'structured_data' as const,
    title: `Structured data (${profile.label})`,
    generatedFixLanguage: 'html' as const,
  };

  /**
   * Which pages to judge.
   *
   * For a store or a publication the answer lives on the individual product or
   * article pages, so those are what get checked. For a local business, a SaaS
   * product or an unclassified site, the entity being described is the site
   * itself — its schema belongs on the homepage, and demanding it on every
   * sampled subpage would fail sites that are doing it correctly.
   */
  const judgeSubpages = context.siteType === 'ecommerce' || context.siteType === 'content';

  const candidates = judgeSubpages && context.keyPages.length ? context.keyPages : [context.homepage];
  // A 403 challenge page parses perfectly well as HTML, so "did cheerio load
  // it" is not the question — "did we receive the real page" is.
  const readablePages = candidates.filter((page) => page.$ !== null && page.ok && !page.blocked);

  // We never saw the page. Reporting "no structured data found" would be a
  // confident claim about HTML that never reached us — the crawlability check
  // reports the access problem, and this one steps aside rather than inventing
  // a 25-to-30-point penalty for it.
  if (!readablePages.length) {
    return {
      ...base,
      status: 'skipped',
      details: `No readable page HTML to inspect (homepage ${context.homepage.blocked ? 'blocked our scanner' : context.homepage.failure || `returned HTTP ${context.homepage.status}`}).`,
      humanExplanation:
        'We could not read the HTML of your pages, so we could not check whether they carry structured data. ' +
        'This has been left out of your score rather than counted against you. ' +
        'See the crawlability result below — that is the problem to fix first, and once it is fixed this check will run properly.',
      generatedFix: profile.buildFix(context, null),
      generatedFixTarget: profile.fixTarget,
    };
  }

  const findings: PageFinding[] = readablePages.map((page) => {
    const node = bestNode(page, profile);
    return {
      page,
      found: Boolean(node),
      missing: node ? profile.required.filter((field) => !safeTest(field, node)) : [...profile.required],
      node,
    };
  });

  const withSchema = findings.filter((finding) => finding.found);
  const exemplar = [...withSchema].sort((a, b) => a.missing.length - b.missing.length)[0] || null;
  const fix = profile.buildFix(context, exemplar?.page || readablePages[0]);

  const pageNoun = judgeSubpages ? context.profile.keyPageLabel : 'homepage';

  /**
   * We guessed what kind of site this is, and they published schema — just not
   * the type we guessed at.
   *
   * 58 of 93 stored scans were classified `general` with `low` confidence, and
   * the single largest source of lost points in the whole database was
   * "expected Organization and found none". mrisoftware.com is the clearest
   * case: a property-management software company we labelled a *content* site,
   * then failed 22 points deep for not carrying news-article markup. It
   * publishes WebPage, WebSite, Organization and BreadcrumbList. It is doing
   * structured data well.
   *
   * So when we are not confident about the site type, a site that publishes
   * *some* recognised schema gets a warning naming what we found, not a zero.
   * A guess of ours should cost a few points, never the whole check.
   *
   * High confidence stays strict on purpose: a store we are sure is a store,
   * carrying Organization but no Product markup, really is failing the thing
   * that matters, and softening that would gut the check.
   */
  /**
   * We found no Product markup, and we never actually opened a product page.
   *
   * themancompany.com was failed 0 out of 28 for "no Product markup" — and the
   * single page we looked at was `/collections/hair`, a category listing.
   * Product schema belongs on the page for one product; a listing is not
   * supposed to carry it, so finding none there proves nothing about the store.
   *
   * Deliberately judged on the outcome rather than by filtering the URLs up
   * front. A store whose product URLs do not match any shape we recognise, but
   * whose pages carry perfectly good Product markup, still gets judged and still
   * passes — filtering first would have skipped it and quietly hidden good work.
   * Only when both are true — nothing found, and nothing that looks like a
   * product page was opened — do we step aside. A skipped check scores nothing
   * out of nothing, so our sampling missing the right pages costs the site
   * nothing.
   */
  const openedAKeyPage = readablePages.some((page) => looksLikeProductUrl(page.url));
  if (!withSchema.length && judgeSubpages && context.siteType === 'ecommerce' && !openedAKeyPage) {
    return {
      ...base,
      status: 'skipped',
      details: `No ${profile.label} markup found, but none of the ${readablePages.length} page(s) we sampled were individual ${context.profile.keyPageLabel} — only listing or category pages, which are not where it belongs. Not scored.`,
      humanExplanation:
        `We look for ${profile.label} data on your individual ${context.profile.keyPageLabel}, and the pages we happened to find were category and listing pages instead. ` +
        'Listing pages are not supposed to carry it, so finding none there tells us nothing about your site — and we would rather say that than mark you down for something we did not properly look at. ' +
        `It is still worth two minutes of your time: open one of your ${context.profile.keyPageLabel}, view the page source, and search it for "${profile.label}". ` +
        'If it is not there, the block below is a starting point — this is the highest-value thing on the whole report to get right.',
      generatedFix: fix,
      generatedFixTarget: profile.fixTarget,
    };
  }

  const otherSchema = otherSchemaTypes(readablePages, profile);
  if (!withSchema.length && context.siteTypeConfidence !== 'high' && otherSchema.length) {
    return {
      ...base,
      status: 'warning',
      details: `No ${profile.label} markup, but ${otherSchema.join(', ')} found on ${readablePages.length} page(s). Site type was detected with ${context.siteTypeConfidence} confidence, so this is not scored as a failure.`,
      humanExplanation:
        `Your pages do publish structured data — we found ${joinWords(otherSchema)} — so the machine-readable basics are there. ` +
        `What we did not find is ${profile.label} markup, which is what we would expect if this is ${
          context.siteType === 'general' ? 'a business site' : `a ${context.siteType.replace('_', ' ')}`
        }. ` +
        'We are telling you rather than marking you down for it, because we were not confident enough about what kind of site this is to be sure that is the right thing to ask for. ' +
        `If it is, adding ${profile.label} is worth doing — ${profile.why}. If it is not, you can ignore this and re-run the scan with the correct site type chosen at the top of the page. ` +
        'The block below is a starting point.' +
        clientRenderWarning(context.homepage),
      generatedFix: fix,
      generatedFixTarget: profile.fixTarget,
    };
  }

  if (!withSchema.length) {
    return {
      ...base,
      status: 'fail',
      details: `No schema.org ${profile.label} markup found on ${readablePages.length} page(s): ${describeAffectedPages(
        readablePages.map((page) => page.url),
        context.profile.keyPageLabel,
      )}.`,
      humanExplanation:
        `Your ${pageNoun} do not include ${profile.label} structured data — the hidden, machine-readable block that states the facts about you in a form a machine can trust. ` +
        'A person reading your page can see all of it; an AI assistant reading the same page often cannot, because it is buried in design markup. ' +
        `This is the single most valuable thing on this report to fix, because ${profile.why}. ` +
        'Paste the block below into the <head>, filling in the real values.' +
        clientRenderWarning(context.homepage),
      generatedFix: fix,
      generatedFixTarget: profile.fixTarget,
    };
  }

  const missingUnion = dedupeFields(withSchema.flatMap((finding) => finding.missing));
  const pagesWithout = findings.filter((finding) => !finding.found);

  const bonus = describeBonusSchema(readablePages);

  if (!missingUnion.length && !pagesWithout.length) {
    return {
      ...base,
      status: 'pass',
      details: `Complete ${profile.label} schema found on all ${readablePages.length} page(s) checked.${bonus.detail}`,
      humanExplanation:
        `Your ${pageNoun} publish complete ${profile.label} structured data — every field an AI assistant needs is machine-readable. ` +
        'This is exactly what lets an assistant describe you accurately and confidently rather than hedging or skipping you. Nothing to change here. ' +
        bonus.opportunity,
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  const labels = missingUnion.map((field) => field.label);
  const details = [
    `${profile.label} schema found on ${withSchema.length}/${readablePages.length} page(s) checked.`,
    missingUnion.length ? `Missing fields: ${missingUnion.map((field) => field.key).join(', ')}.` : '',
    pagesWithout.length
      ? `No ${profile.label} schema on: ${describeAffectedPages(
          pagesWithout.map((finding) => finding.page.url),
          context.profile.keyPageLabel,
        )}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * When incomplete markup stops counting as markup at all.
   *
   * The old rule was "three or more missing fields is a fail", and it produced
   * this on zofffoods.com: Product schema present on 5 pages out of 5, four
   * fields missing, scored **0 out of 28** — the identical score we give a store
   * with no structured data whatsoever. A shop that did most of the work and one
   * that did none cannot land in the same place; the reader learns nothing from
   * a number that cannot tell them apart, and the one who tried is told their
   * effort was worthless.
   *
   * A flat count was the wrong measure anyway, because profiles ask for
   * different numbers of fields — three missing out of four is a shell, three
   * missing out of nine is a gap. So the test is now proportional, and a page
   * that carries the schema keeps its half credit unless most of the required
   * fields are absent.
   */
  const requiredCount = profile.required.length || 1;
  const missingMost = missingUnion.length / requiredCount > 0.6;
  const severelyIncomplete = missingMost || pagesWithout.length === readablePages.length;

  /**
   * Two independent problems, either of which can be absent.
   *
   * Building this as one sentence with an optional tail produced "but and
   * undefined are missing" on a real report: every page carrying schema was
   * complete, so `labels` was empty, and `joinWords([])` reached past the end
   * of the array. Assemble the clauses that apply and join those.
   */
  const missingClause = !labels.length
    ? ''
    : labels.length === 1
      ? `the ${labels[0]} is missing`
      : `${joinWords(labels)} are missing`;

  const pagesClause = pagesWithout.length
    ? `${pagesWithout.length} of the ${readablePages.length} pages we checked have none at all`
    : '';

  const problem = [missingClause, pagesClause].filter(Boolean).join(', and ');

  return {
    ...base,
    status: severelyIncomplete ? 'fail' : 'warning',
    details,
    humanExplanation:
      `Your ${pageNoun} do include ${profile.label} structured data, but ${problem}. ` +
      criticalFieldNote(missingUnion) +
      (severelyIncomplete
        ? 'With this much missing, an assistant reading your page still cannot answer the basic questions about you — so in practice it behaves as if the data were not there. '
        : 'You are close — filling in the missing fields is a small edit with an outsized effect. ') +
      'The block below is built from what we could read off your own page; fill in anything marked REPLACE_WITH_ and paste it into the <head>.' +
      clientRenderWarning(context.homepage),
    generatedFix: fix,
    generatedFixTarget: profile.fixTarget,
  };
}

/**
 * FAQPage and BreadcrumbList: worth having, never required.
 *
 * FAQ markup is the single most quotable format there is — a self-contained
 * question and answer is exactly the shape an assistant wants to lift. But a
 * dentist with no FAQ section is not failing at anything, so these are reported
 * as an opportunity and never affect the verdict.
 */
function describeBonusSchema(pages: HtmlDocument[]): { detail: string; opportunity: string } {
  const hasFaq = pages.some((page) => pageHasType(page, /^(faqpage|qapage)$/));
  const hasBreadcrumb = pages.some((page) => pageHasType(page, /^breadcrumblist$/));

  const present = [hasFaq ? 'FAQPage' : null, hasBreadcrumb ? 'BreadcrumbList' : null].filter(Boolean);
  const detail = present.length ? ` Also found: ${present.join(', ')}.` : ' No FAQPage or BreadcrumbList markup found.';

  if (hasFaq && hasBreadcrumb) {
    return { detail, opportunity: 'You also publish FAQ and breadcrumb markup, which is further ahead than most sites get.' };
  }

  const missing = [
    hasFaq ? null : 'FAQPage markup on any page that answers common questions — it is the single most quotable format, because a question and its answer are exactly the shape an assistant wants to lift whole',
    hasBreadcrumb ? null : 'BreadcrumbList markup, so an assistant understands where a page sits in your site rather than treating every page as an island',
  ].filter(Boolean);

  return {
    detail,
    opportunity: `Two optional additions worth knowing about, neither of which counts against you: ${missing.join('; and ')}.`,
  };
}

/**
 * Schema types that describe the business or the page, other than the one we
 * asked for.
 *
 * Deliberately a named list rather than "anything with an @type". Half the web
 * emits ImageObject, ListItem, SearchAction and PostalAddress as nested fragments
 * of some larger node, and counting those as "you publish structured data" would
 * hand out credit for markup nobody authored on purpose. These are the types a
 * site publishes because it decided to.
 */
const MEANINGFUL_SCHEMA = new Set([
  'organization',
  'corporation',
  'localbusiness',
  'website',
  'webpage',
  'product',
  'article',
  'newsarticle',
  'blogposting',
  'softwareapplication',
  'service',
  'collectionpage',
  'itemlist',
  'faqpage',
  'qapage',
  'breadcrumblist',
  'person',
  'event',
  'recipe',
  'course',
  'jobposting',
]);

function otherSchemaTypes(pages: HtmlDocument[], profile: SchemaProfile): string[] {
  const found = new Set<string>();
  for (const page of pages) {
    for (const node of page.jsonLd()) {
      for (const type of typesOf(node)) {
        if (profile.accepts(type)) continue;
        if (MEANINGFUL_SCHEMA.has(type.toLowerCase())) found.add(type);
      }
    }
  }
  return [...found].sort();
}

function pageHasType(page: HtmlDocument, matcher: RegExp): boolean {
  return page.jsonLd().some((node) => typesOf(node).some((type) => matcher.test(type)));
}

/** The most complete matching node on a page. */
function bestNode(page: HtmlDocument, profile: SchemaProfile): Record<string, unknown> | null {
  const matches = page.jsonLd().filter((node) => typesOf(node).some((type) => profile.accepts(type)));
  if (!matches.length) return null;

  return matches
    .map((node) => ({ node, score: profile.required.filter((field) => safeTest(field, node)).length }))
    .sort((a, b) => b.score - a.score)[0].node;
}

/** A field predicate must never take the scan down over odd JSON-LD. */
function safeTest(field: SchemaField, node: Record<string, unknown>): boolean {
  try {
    return field.test(node);
  } catch {
    return false;
  }
}

function dedupeFields(fields: SchemaField[]): SchemaField[] {
  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

/** Some missing fields cost more than others; say so when they show up. */
function criticalFieldNote(missing: SchemaField[]): string {
  const keys = new Set(missing.map((field) => field.key));

  if (keys.has('offers.availability')) {
    return 'Stock availability is the one that costs you most: an assistant that cannot confirm an item is in stock will usually recommend a store where it can. ';
  }
  if (keys.has('openingHours')) {
    return 'Opening hours matter most here — an assistant that cannot confirm you are open will send someone to a competitor rather than risk a wasted trip. ';
  }
  if (keys.has('author') || keys.has('datePublished')) {
    return 'Author and date are what make you citable: without them an assistant will use your information and credit someone else. ';
  }
  if (keys.has('telephone') || keys.has('address')) {
    return 'Without a machine-readable address and phone number, an assistant cannot answer "where are they" — which is most of what people ask about a local business. ';
  }
  return '';
}

/**
 * The URL shape a page was built from: `/products/blue-shirt` → `/products/*`.
 *
 * Two pages sharing a shape were almost certainly rendered by the same
 * template, which is what turns a list of broken pages into a single cause.
 */
function templateOf(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    return `/${segments.slice(0, -1).join('/')}/*`;
  } catch {
    return null;
  }
}

/**
 * Name the cause, not the casualties.
 *
 * Listing four failing URLs produces four tickets, fixed four times, and
 * reintroduced by the fifth page built from the same template. Saying "four
 * pages built from /products/*" is one job that also fixes every product added
 * next month. Only claim it when the pages genuinely share a shape and there
 * are enough of them for it to be a pattern rather than a coincidence.
 */
export function describeAffectedPages(urls: string[], noun: string): string {
  if (!urls.length) return '';
  if (urls.length < 3) return urls.join(', ');

  const templates = new Map<string, number>();
  for (const url of urls) {
    const template = templateOf(url);
    if (template) templates.set(template, (templates.get(template) || 0) + 1);
  }

  const [shape, count] = [...templates.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!shape || count < 3 || count < urls.length) return urls.join(', ');

  return `${count} ${noun} built from the same template (${shape}) — one template change fixes all of them, and every page added from it afterwards`;
}

function joinWords(items: string[]): string {
  // Guard the empty case explicitly. Reading items[-1] returned undefined and
  // put the literal word "undefined" into a customer-facing sentence.
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
