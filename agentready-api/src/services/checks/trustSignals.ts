import { CheckOutcome, SiteType } from '../../types';
import { ScanContext } from '../scanContext';
import { HtmlDocument } from '../htmlDocument';
import { fetchUrl } from '../fetcher';
import { isSameSite } from '../../utils/url';

/**
 * Check 4 — trust and identity pages.
 *
 * Agents are conservative about sending someone to a site whose terms and
 * identity they cannot read. Which pages count depends on what the site is: a
 * store needs returns and shipping, a clinic needs contact details, a SaaS
 * product needs pricing and terms, a publication needs to say who is behind it.
 * Demanding a returns policy from a dentist would be noise, and noise is how a
 * report loses a reader.
 *
 * The ecommerce set is exactly the spec's three — returns, shipping, privacy.
 */

interface PolicySpec {
  kind: string;
  label: string;
  hrefPattern: RegExp;
  textPattern: RegExp;
  /** Probed in order, only when links and sitemap turned up nothing. */
  probePaths: string[];
  /**
   * Phrases that mean this topic is genuinely *covered* somewhere, rather than
   * merely mentioned. Used when there is no dedicated page and we go looking
   * inside the other policy pages.
   *
   * Necessary because the topic word alone proves nothing: Mamaearth's privacy
   * policy contains the word "shipping" once, in a footer badge. Reporting
   * that as "they have a shipping policy" would be as wrong as reporting they
   * have nothing.
   */
  topicSource: string;
}

/**
 * Where a policy actually lives.
 *
 * The middle two states are the point. Telling a large brand "you have no
 * shipping policy" when their lawyers put it inside the terms page makes us
 * look careless in exactly the conversation this tool exists for — and the
 * advice is completely different. "Write a shipping policy" is a project;
 * "split the shipping section out of your terms page" is twenty minutes.
 */
type Coverage =
  /** Its own page, at a findable address. */
  | 'dedicated'
  /** A real section inside another policy page. */
  | 'inside'
  /** The words appear somewhere, but there is no actual policy. */
  | 'passing'
  /** Nothing found anywhere we looked. */
  | 'absent';

const RETURNS: PolicySpec = {
  kind: 'returns',
  label: 'returns / refund policy',
  hrefPattern: /(return|refund|exchange)[-_a-z]*(policy|policies)?/i,
  textPattern: /\b(returns?|refunds?|exchanges?)\b/i,
  probePaths: ['/policies/refund-policy', '/pages/return-policy', '/return-policy', '/refund-policy', '/returns'],
  topicSource: '\\b(return policy|returns policy|refund policy|return(ed)? (the )?(product|item|order)|eligible for (a )?(return|refund)|replacement request)\\b',
};

const SHIPPING: PolicySpec = {
  kind: 'shipping',
  label: 'shipping policy',
  hrefPattern: /(shipping|delivery)[-_a-z]*(policy|policies|info)?/i,
  textPattern: /\b(shipping|delivery)\b/i,
  probePaths: ['/policies/shipping-policy', '/pages/shipping-policy', '/shipping-policy', '/shipping', '/delivery'],
  topicSource: '\\b(shipping policy|delivery policy|shipping charges?|delivery charges?|shipping (and|&) delivery|delivery (time|timeline)s?|business days from the date|dispatch(ed)? within)\\b',
};

const PRIVACY: PolicySpec = {
  kind: 'privacy',
  label: 'privacy policy',
  hrefPattern: /privacy[-_a-z]*(policy|policies)?/i,
  textPattern: /\bprivacy\b/i,
  probePaths: ['/policies/privacy-policy', '/pages/privacy-policy', '/privacy-policy', '/privacy'],
  topicSource: '\\b(privacy policy|personal (data|information) (we|is) (collect|collected|use)|how we (collect|use|process) your|data protection)\\b',
};

const CONTACT: PolicySpec = {
  kind: 'contact',
  label: 'contact page',
  hrefPattern: /contact([-_]us)?|reach[-_]us|get[-_]in[-_]touch/i,
  textPattern: /\b(contact us|contact|get in touch|reach us)\b/i,
  probePaths: ['/contact', '/contact-us', '/pages/contact', '/get-in-touch'],
  topicSource: '\\b(contact us|customer (care|support)|write to us|reach us at|helpline)\\b',
};

const ABOUT: PolicySpec = {
  kind: 'about',
  label: 'about page',
  hrefPattern: /about([-_](us|me))?|our[-_]story|who[-_]we[-_]are/i,
  textPattern: /\b(about us|about|our story|who we are)\b/i,
  probePaths: ['/about', '/about-us', '/pages/about', '/our-story'],
  topicSource: '\\b(about us|our story|who we are|founded in|our mission)\\b',
};

const TERMS: PolicySpec = {
  kind: 'terms',
  label: 'terms of service',
  hrefPattern: /terms([-_](of[-_])?(service|use|conditions))?|tos\b|legal/i,
  textPattern: /\b(terms of service|terms of use|terms (and|&) conditions|terms)\b/i,
  probePaths: ['/terms', '/terms-of-service', '/terms-and-conditions', '/policies/terms-of-service', '/legal'],
  topicSource: '\\b(terms of (service|use)|terms (and|&) conditions|these terms govern|by using this (site|website))\\b',
};

const PRICING: PolicySpec = {
  kind: 'pricing',
  label: 'pricing page',
  hrefPattern: /pricing|plans/i,
  textPattern: /\b(pricing|plans|price)\b/i,
  probePaths: ['/pricing', '/plans', '/pricing-plans'],
  topicSource: '\\b(pricing|per month|per user|free plan|paid plans?|billed (annually|monthly))\\b',
};

/**
 * What each kind of site must publish.
 *
 * Kept to three or four per type on purpose. A checklist a site owner can
 * actually finish in an afternoon gets done; a checklist of twelve gets ignored.
 */
const REQUIRED_PAGES: Record<SiteType, PolicySpec[]> = {
  // Exactly the spec's three.
  ecommerce: [RETURNS, SHIPPING, PRIVACY],
  content: [ABOUT, CONTACT, PRIVACY],
  saas: [PRICING, TERMS, PRIVACY, CONTACT],
  local_business: [CONTACT, ABOUT, PRIVACY],
  general: [ABOUT, CONTACT, PRIVACY],
};

/** Exposed so the fixtures can pin the pattern that silently broke once. */
export const SHIPPING_TOPIC = new RegExp(SHIPPING.topicSource, 'i');

/** Paths that mention a policy word but are not the policy page. */
const NOT_A_POLICY = /\/(cart|checkout|account|login|blogs?|products?|collections)\//i;

interface PolicyFinding {
  spec: PolicySpec;
  url: string | null;
  source: 'homepage link' | 'sitemap' | 'known path' | null;
  coverage: Coverage;
  /** When covered inside another page, which one. */
  coveredBy: string | null;
}

/**
 * A topic is genuinely covered inside another page when the page carries a
 * heading about it, or says one of the phrases that only appear in a real
 * policy. Counting bare keyword hits would mean a privacy policy that says
 * "shipping address" once counts as a shipping policy.
 */
function coverageInPage(page: HtmlDocument, spec: PolicySpec): Coverage {
  // Deliberately HtmlDocument.text() rather than a local extraction. cheerio's
  // own .text() concatenates block elements with no separator, so
  // "<span>delivery</span><span>charges</span>" becomes "deliverycharges" and
  // every phrase match silently fails. That bug already cost us once; there
  // should only ever be one place in this codebase that turns HTML into words.
  const text = page.text();
  const $ = page.$;
  if (!$) return 'absent';

  let headed = false;
  $('h1, h2, h3, h4, h5, strong, b').each((_, element) => {
    if (headed) return;
    const heading = $(element).text().replace(/\s+/g, ' ').trim();
    if (heading.length < 90 && spec.hrefPattern.test(heading)) headed = true;
  });

  // Built fresh rather than stored. A shared RegExp is a mutable object, and
  // reusing one across calls invites state bugs that are near-impossible to
  // see when reading the call site.
  if (headed || new RegExp(spec.topicSource, 'i').test(text)) return 'inside';
  return spec.textPattern.test(text) ? 'passing' : 'absent';
}

export async function checkTrustSignals(context: ScanContext): Promise<CheckOutcome> {
  const required = REQUIRED_PAGES[context.siteType];

  const base = {
    checkId: 'trust_signals' as const,
    title: titleFor(context.siteType),
    generatedFix: null,
    generatedFixLanguage: null,
    generatedFixTarget: null,
  };

  const findings: PolicyFinding[] = required.map((spec) => ({
    spec,
    coverage: 'absent' as Coverage,
    coveredBy: null,
    ...findInLinksOrSitemap(context, spec),
  }));

  // Only spend HTTP requests on the ones we could not find by reading. A site
  // with a working footer costs us zero extra fetches here.
  for (const finding of findings) {
    if (finding.url || context.deadline.expired()) continue;

    for (const path of finding.spec.probePaths.slice(0, 3)) {
      if (context.deadline.expired()) break;
      const response = await fetchUrl(`${context.origin}${path}`, context.deadline);
      // A soft 404 that returns 200 with a near-empty body is common; require
      // some actual content before calling the page real.
      if (response.ok && (response.body || '').length > 500) {
        finding.url = response.finalUrl;
        finding.source = 'known path';
        break;
      }
    }
  }

  for (const finding of findings) {
    if (finding.url) finding.coverage = 'dedicated';
  }

  await locateInsideOtherPages(context, findings);

  const found = findings.filter((finding) => finding.coverage === 'dedicated' || finding.coverage === 'inside');
  const missing = findings.filter((finding) => finding.coverage === 'passing' || finding.coverage === 'absent');
  const buried = findings.filter((finding) => finding.coverage === 'inside');

  const details = [
    found.length
      ? `Found: ${found
          .map((f) =>
            f.coverage === 'inside'
              ? `${f.spec.kind} (inside ${f.coveredBy}, no dedicated page)`
              : `${f.spec.kind} (${f.url}, via ${f.source})`,
          )
          .join('; ')}.`
      : '',
    missing.length
      ? `No dedicated page for: ${missing
          .map((f) => (f.coverage === 'passing' ? `${f.spec.kind} (mentioned in passing only)` : f.spec.kind))
          .join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // A site whose navigation is drawn by JavaScript gives us no links to read,
  // and its page URLs may match no known pattern. Telling that owner "you have
  // no privacy policy" when they do would be the fastest way to lose their
  // trust, so report what we could not see instead of what they lack.
  if (!found.length && homepageUnreadable(context)) {
    return {
      ...base,
      status: 'skipped',
      details: `${details} Homepage navigation was not present in the raw HTML, so link discovery was not possible.`,
      humanExplanation:
        'We could not check your trust and identity pages, because your homepage navigation is not in the HTML your server sends — it is drawn afterwards by JavaScript. ' +
        'That is the same issue flagged under crawlability, and it is the root cause here: a crawler that cannot read your menu cannot find these pages either, even if they exist and are perfectly good. ' +
        'This check has been left out of your score rather than counted against you. Fix the JavaScript rendering issue and this one resolves itself.',
      generatedFix: null,
    };
  }

  // Anything buried inside another page counts as published — the information
  // is there and an assistant can reach it — but it is worth saying, because
  // pulling it into its own page is a small job with a real payoff.
  const buriedNote = buried.length
    ? `One thing worth improving even though it does not cost you points: your ${joinWords(
        buried.map((finding) => finding.spec.label),
      )} ${buried.length === 1 ? 'is' : 'are'} inside your ${joinWords([...new Set(buried.map((finding) => finding.coveredBy || 'other pages'))])} rather than on ${buried.length === 1 ? 'its own page' : 'their own pages'}. ` +
      'An assistant asked "how long does delivery take?" has to find the right paragraph in a long legal document, which it often will not. Splitting it into its own page makes the answer quotable, and takes about twenty minutes.'
    : '';

  if (!missing.length) {
    return {
      ...base,
      status: 'pass',
      details,
      humanExplanation:
        `Your ${joinWords(required.map((spec) => spec.label))} are all published and reachable. ` +
        'This matters more than it looks: when an AI assistant is choosing between two sites, it leans towards the one whose terms and identity it can actually read, because it will not send someone somewhere it cannot vouch for. You are on the right side of that. ' +
        buriedNote,
      generatedFix: null,
    };
  }

  const missingLabels = missing.map((finding) => finding.spec.label);
  // Say precisely what we saw. "You have no shipping policy" is the kind of
  // claim an owner can disprove in ten seconds, and once they do, they stop
  // believing the rest of the report.
  const passingOnly = missing.filter((finding) => finding.coverage === 'passing');
  const passingNote = passingOnly.length
    ? `We did see ${joinWords(passingOnly.map((finding) => finding.spec.kind))} mentioned in passing elsewhere on your site, but a sentence or two is not a policy — an assistant cannot answer a customer's question from it. `
    : '';

  if (found.length) {
    return {
      ...base,
      status: 'warning',
      details,
      humanExplanation:
        `We could not find a dedicated page for your ${joinWords(missingLabels, 'or')}. ` +
        passingNote +
        'AI assistants check for these before recommending a site, and treat "cannot find it" the same as "does not have one". ' +
        `Publish ${missing.length === 1 ? 'the missing page' : 'the missing pages'} and — this is the part sites forget — link ${missing.length === 1 ? 'it' : 'them'} from your footer so every page points to ${missing.length === 1 ? 'it' : 'them'}. ` +
        buriedNote +
        'A page that exists but is not linked anywhere is a page crawlers never find.',
      generatedFix: null,
    };
  }

  return {
    ...base,
    status: 'fail',
    details,
    humanExplanation:
      `We could not find ${joinWords(missingLabels, 'or')} anywhere on your site. ` +
      'To a visitor this looks careless; to an AI assistant it is close to disqualifying, because it will not recommend a site when it cannot tell someone who is behind it or what the terms are. ' +
      `${missing.length} short pages fix this. Write them in plain language and link all of them from your footer.`,
    generatedFix: null,
  };
}

function titleFor(siteType: SiteType): string {
  if (siteType === 'ecommerce') return 'Returns, shipping and privacy pages';
  if (siteType === 'saas') return 'Pricing, terms and privacy pages';
  return 'Trust and identity pages';
}

/**
 * True when the homepage HTML we received was a shell rather than a page.
 *
 * The 500-character threshold is the same one Check 6 uses to call a page
 * JavaScript-rendered, kept deliberately in step: if that check says the page
 * is not readable, this one must not draw conclusions from what it did not
 * read. A handful of links is normal in a shell (logo, app-store badges), so
 * the link count is a supporting signal rather than the deciding one.
 *
 * Only consulted when nothing was found by any route — a site whose sitemap
 * listed its pages has already been handled above.
 */
function homepageUnreadable(context: ScanContext): boolean {
  return context.homepage.links().length < 10 && context.homepage.text().length < 500;
}

/**
 * For anything still missing, read the policy pages we *did* find.
 *
 * Costs at most two extra requests, and only when there is a gap. Worth it:
 * "your shipping terms are inside your terms page, split them out" is a
 * twenty-minute job the owner will actually do, while "you have no shipping
 * policy" is both wrong and a project they will postpone.
 */
async function locateInsideOtherPages(context: ScanContext, findings: PolicyFinding[]): Promise<void> {
  const gaps = findings.filter((finding) => finding.coverage === 'absent');
  if (!gaps.length) return;

  /**
   * Terms first, always — even though most site types do not require it.
   *
   * It is the page that absorbs everything else. Mamaearth's entire shipping
   * policy is one sentence inside their terms document; their returns and
   * privacy pages only mention shipping in passing. Looking at the required
   * pages alone would have reported "no shipping policy" while the answer sat
   * in the page we never opened.
   */
  let termsUrl = findInLinksOrSitemap(context, TERMS).url;

  // Worth two requests to find it if the footer and sitemap did not name it.
  // We follow only two child sitemaps, so whether the one listing static pages
  // gets read is close to a coin flip — and this is the page most likely to
  // hold the answer.
  if (!termsUrl) {
    for (const path of TERMS.probePaths.slice(0, 2)) {
      if (context.deadline.expired()) break;
      const probe = await fetchUrl(`${context.origin}${path}`, context.deadline);
      if (probe.ok && (probe.body || '').length > 500) {
        termsUrl = probe.finalUrl;
        break;
      }
    }
  }

  const hosts: { url: string; label: string }[] = [
    ...(termsUrl ? [{ url: termsUrl, label: TERMS.label }] : []),
    ...findings
      .filter((finding) => finding.coverage === 'dedicated' && finding.url)
      .map((finding) => ({ url: finding.url!, label: finding.spec.label })),
  ].slice(0, 3);

  if (!hosts.length) return;

  for (const host of hosts) {
    if (context.deadline.expired()) return;
    const response = await fetchUrl(host.url, context.deadline);
    if (!response.ok || !response.body) continue;
    const hostPage = new HtmlDocument(response);

    for (const gap of gaps) {
      if (gap.coverage === 'inside') continue;
      const coverage = coverageInPage(hostPage, gap.spec);
      if (coverage === 'absent') continue;
      // A real section beats a passing mention found on an earlier page.
      if (coverage === 'inside' || gap.coverage === 'absent') {
        gap.coverage = coverage;
        gap.coveredBy = host.label;
      }
    }
  }
}

function findInLinksOrSitemap(
  context: ScanContext,
  spec: PolicySpec,
): { url: string | null; source: PolicyFinding['source'] } {
  for (const link of context.homepage.links()) {
    if (!isSameSite(link.url, context.homepage.url)) continue;

    let path: string;
    try {
      path = new URL(link.url).pathname;
    } catch {
      continue;
    }

    if (NOT_A_POLICY.test(path)) continue;
    if (spec.hrefPattern.test(path) || spec.textPattern.test(link.text)) {
      return { url: link.url, source: 'homepage link' };
    }
  }

  for (const url of context.sitemapUrls) {
    let path: string;
    try {
      path = new URL(url).pathname;
    } catch {
      continue;
    }
    if (NOT_A_POLICY.test(path)) continue;
    if (spec.hrefPattern.test(path)) return { url, source: 'sitemap' };
  }

  return { url: null, source: null };
}

function joinWords(items: string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}
