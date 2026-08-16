import { SiteType } from '../../types';
import { HtmlDocument } from '../htmlDocument';
import { ScanContext } from '../scanContext';

/**
 * What structured data should each kind of site publish, and what does a
 * ready-to-paste version of it look like?
 *
 * One entry per site type. Each names the schema.org types that count, the
 * fields an agent actually needs, and a fix template built from data the scan
 * already scraped off the page. Adding a site type means adding an entry here
 * and nothing else.
 *
 * The required-field lists are deliberately short. They are not "everything
 * schema.org allows" — they are the fields without which an assistant cannot
 * answer the question a user is actually asking: what is this, what does it
 * cost, where is it, who wrote it, is it available.
 */

export interface SchemaField {
  key: string;
  label: string;
  test: (node: Record<string, unknown>) => boolean;
}

export interface SchemaProfile {
  /** Lower-cased @type values that satisfy this check. */
  accepts: (type: string) => boolean;
  /** What the report calls it, e.g. "Product". */
  label: string;
  /** One line on why this schema is the one that matters here. */
  why: string;
  required: SchemaField[];
  /** Exactly where the generated block goes, in the words a site owner uses. */
  fixTarget: string;
  buildFix: (context: ScanContext, page: HtmlDocument | null) => string;
}

// --- Shared value helpers -------------------------------------------------

/**
 * Does this value actually carry information?
 *
 * Nested schema.org values come in every shape: a brand is a string or an
 * object with a name, an address is an object of address parts, opening hours
 * are an array of specification objects with no name or url anywhere in them.
 * So an object counts as populated when any of its own non-`@` keys is
 * populated — `@type` and `@context` are excluded deliberately, otherwise a
 * bare `{"@type": "Brand"}` would read as "this product has a brand" when it
 * names none.
 */
export function isNonEmpty(value: unknown, depth = 0): boolean {
  if (value == null || depth > 5) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some((item) => isNonEmpty(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) => !key.startsWith('@') && isNonEmpty(nested, depth + 1),
    );
  }
  return false;
}

const has = (key: string, ...aliases: string[]) => (node: Record<string, unknown>): boolean =>
  [key, ...aliases].some((candidate) => isNonEmpty(node[candidate]));

function firstOffer(node: Record<string, unknown>): Record<string, unknown> | null {
  const offers = node.offers;
  if (!offers) return null;
  const candidates = Array.isArray(offers) ? offers : [offers];
  const objects = candidates.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  if (!objects.length) return null;

  // AggregateOffer wraps the real offer; unwrap one level if present.
  const first = objects[0];
  if (first.offers) {
    const nested = Array.isArray(first.offers) ? first.offers[0] : first.offers;
    if (nested && typeof nested === 'object') return { ...first, ...(nested as Record<string, unknown>) };
  }
  return first;
}

/**
 * `priceSpecification` entries on an offer, normalised to a list.
 *
 * Shopify's current theme markup puts the real price in an *array* of
 * UnitPriceSpecification objects (selling price plus a strikethrough MRP) and
 * leaves `offers.price` off entirely — so treating this field as a single
 * object reports "no price" on stores that publish one perfectly well.
 */
function priceSpecs(offer: Record<string, unknown>): Record<string, unknown>[] {
  const spec = offer.priceSpecification;
  if (!spec) return [];
  const list = Array.isArray(spec) ? spec : [spec];
  return list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
}

const hasPrice = (node: Record<string, unknown>): boolean => {
  const offer = firstOffer(node);
  if (!offer) return false;
  return isNonEmpty(offer.price) || isNonEmpty(offer.lowPrice) || priceSpecs(offer).some((spec) => isNonEmpty(spec.price));
};

const hasCurrency = (node: Record<string, unknown>): boolean => {
  const offer = firstOffer(node);
  if (!offer) return false;
  return isNonEmpty(offer.priceCurrency) || priceSpecs(offer).some((spec) => isNonEmpty(spec.priceCurrency));
};

const hasAvailability = (node: Record<string, unknown>): boolean => {
  const offer = firstOffer(node);
  return Boolean(offer && isNonEmpty(offer.availability));
};

// --- Scraping helpers used by the fix builders ----------------------------

const PLACEHOLDER = (field: string): string => `REPLACE_WITH_${field.toUpperCase()}`;

export function metaProperty(page: HtmlDocument | null, property: string): string | null {
  if (!page?.$) return null;
  const $ = page.$;
  const value = $(`meta[property="${property}"]`).first().attr('content') || $(`meta[name="${property}"]`).first().attr('content');
  const trimmed = (value || '').trim();
  return trimmed || null;
}

function scrapeName(page: HtmlDocument | null): string | null {
  if (!page) return null;
  const og = metaProperty(page, 'og:title');
  if (og) return og;
  const heading = page.$?.('h1').first().text().replace(/\s+/g, ' ').trim();
  if (heading) return heading;
  return page.title || null;
}

function scrapeDescription(page: HtmlDocument | null): string | null {
  return metaProperty(page, 'og:description') || metaProperty(page, 'description');
}

function scrapePrice(page: HtmlDocument | null): string | null {
  if (!page) return null;

  const fromMeta =
    metaProperty(page, 'product:price:amount') ||
    metaProperty(page, 'og:price:amount') ||
    page.$?.('[itemprop="price"]').first().attr('content') ||
    page.$?.('[itemprop="price"]').first().text();

  if (fromMeta) {
    const numeric = String(fromMeta).replace(/[^\d.]/g, '');
    if (numeric && Number.isFinite(Number(numeric))) return numeric;
  }

  // Fall back to the first currency amount in the visible text. Imperfect, but
  // a real number the owner can eyeball beats a placeholder.
  const match = page.text().match(/(?:₹|Rs\.?|INR|\$|€|£)\s?([\d,]+(?:\.\d{1,2})?)/i);
  return match ? match[1].replace(/,/g, '') : null;
}

function scrapeCurrency(page: HtmlDocument | null): string {
  const explicit = metaProperty(page, 'product:price:currency') || metaProperty(page, 'og:price:currency');
  if (explicit) return explicit.toUpperCase();
  if (!page) return 'INR';
  return /₹|Rs\.?\s?\d|INR/i.test(page.text().slice(0, 5000)) ? 'INR' : PLACEHOLDER('currency_code');
}

/** First `tel:` link on the page — the most reliable phone number available. */
function scrapePhone(context: ScanContext): string | null {
  let found: string | null = null;
  context.homepage.$?.('a[href^="tel:"]').each((_, element) => {
    if (found) return;
    const href = context.homepage.$?.(element).attr('href') || '';
    const number = href.replace(/^tel:/i, '').trim();
    if (number.replace(/\D/g, '').length >= 8) found = number;
  });
  return found;
}

function scrapeEmail(context: ScanContext): string | null {
  let found: string | null = null;
  context.homepage.$?.('a[href^="mailto:"]').each((_, element) => {
    if (found) return;
    const href = context.homepage.$?.(element).attr('href') || '';
    const address = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(address)) found = address;
  });
  return found;
}

/** Social profile URLs, which schema.org calls `sameAs`. */
function scrapeSameAs(context: ScanContext): string[] {
  const socials = new Set<string>();
  for (const link of context.homepage.links()) {
    if (socials.size >= 5) break;
    if (/(facebook|instagram|twitter|x)\.com|linkedin\.com|youtube\.com|pinterest\.|threads\.net/i.test(link.url)) {
      socials.add(link.url.split('?')[0]);
    }
  }
  return [...socials];
}

function scriptBlock(schema: unknown, note: string): string {
  return [
    `<!-- ${note} -->`,
    '<!-- Replace every REPLACE_WITH_ value before publishing. -->',
    '<script type="application/ld+json">',
    JSON.stringify(schema, null, 2),
    '</script>',
  ].join('\n');
}

// --- The profiles ---------------------------------------------------------

const PRODUCT: SchemaProfile = {
  accepts: (type) => type === 'product' || type === 'productgroup',
  label: 'Product',
  fixTarget: 'The <head> section of each product page',
  why: 'it is what decides whether an assistant can say "this one is ₹1,499 and in stock" or has to skip you and recommend a competitor it can quote confidently',
  required: [
    { key: 'name', label: 'product name', test: has('name', 'title') },
    { key: 'image', label: 'product image', test: has('image') },
    { key: 'offers.price', label: 'price', test: hasPrice },
    { key: 'offers.priceCurrency', label: 'currency', test: hasCurrency },
    { key: 'offers.availability', label: 'stock availability', test: hasAvailability },
    { key: 'brand', label: 'brand', test: has('brand', 'manufacturer') },
  ],
  buildFix: (context, page) =>
    scriptBlock(
      {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: scrapeName(page) || PLACEHOLDER('product_name'),
        image: [metaProperty(page, 'og:image') || PLACEHOLDER('product_image_url')],
        description: scrapeDescription(page) || PLACEHOLDER('short_product_description'),
        sku: PLACEHOLDER('your_sku_or_product_code'),
        brand: { '@type': 'Brand', name: metaProperty(page, 'og:site_name') || context.siteName || PLACEHOLDER('brand_name') },
        offers: {
          '@type': 'Offer',
          url: page?.url || `${context.origin}/products/your-product`,
          price: scrapePrice(page) || PLACEHOLDER('price_number_only'),
          priceCurrency: scrapeCurrency(page),
          // Switch to OutOfStock when unavailable. Agents check this before
          // recommending — a stale value costs you sales.
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
      'Paste inside the <head> of each product page, one block per product.',
    ),
};

const ARTICLE: SchemaProfile = {
  accepts: (type) => /^(article|blogposting|newsarticle|techarticle|reportagenewsarticle|liveblogposting|scholarlyarticle)$/.test(type),
  label: 'Article',
  fixTarget: 'The <head> section of each article or blog post',
  why: 'it is what lets an assistant cite you by name and date instead of paraphrasing you anonymously — attribution is the whole return on publishing',
  required: [
    { key: 'headline', label: 'headline', test: has('headline', 'name', 'title') },
    { key: 'author', label: 'author', test: has('author', 'creator') },
    { key: 'datePublished', label: 'publication date', test: has('datePublished', 'dateCreated') },
    { key: 'image', label: 'article image', test: has('image', 'thumbnailUrl') },
    { key: 'publisher', label: 'publisher', test: has('publisher', 'sourceOrganization') },
  ],
  buildFix: (context, page) =>
    scriptBlock(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: scrapeName(page) || PLACEHOLDER('article_headline'),
        description: scrapeDescription(page) || PLACEHOLDER('one_sentence_summary'),
        image: [metaProperty(page, 'og:image') || PLACEHOLDER('article_image_url')],
        author: { '@type': 'Person', name: PLACEHOLDER('author_full_name'), url: `${context.origin}/about` },
        publisher: {
          '@type': 'Organization',
          name: context.siteName || context.domain,
          logo: { '@type': 'ImageObject', url: PLACEHOLDER('your_logo_url') },
        },
        datePublished: PLACEHOLDER('yyyy-mm-dd'),
        dateModified: PLACEHOLDER('yyyy-mm-dd'),
        mainEntityOfPage: { '@type': 'WebPage', '@id': page?.url || context.origin },
      },
      'Paste inside the <head> of each article, with that article\'s real values.',
    ),
};

const LOCAL_BUSINESS: SchemaProfile = {
  accepts: (type) =>
    /^(localbusiness|restaurant|cafe|bakery|bar|hotel|lodging|store|dentist|physician|hospital|medicalclinic|medicalbusiness|healthandbeautybusiness|beautysalon|hairsalon|dayspa|gym|healthclub|sportsactivitylocation|automotivebusiness|realestateagent|professionalservice|legalservice|attorney|accountingservice|financialservice|homeandconstructionbusiness|childcare|school|educationalorganization|travelagency|eventvenue|foodestablishment|veterinarycare|pharmacy|autorepair|movingcompany|plumber|electrician|place)$/.test(
      type,
    ),
  label: 'LocalBusiness',
  fixTarget: 'The <head> section of your homepage and your contact page',
  why: 'it carries the address, phone number and opening hours an assistant needs to answer "where are they and are they open" — the two questions people actually ask about a local business',
  required: [
    { key: 'name', label: 'business name', test: has('name', 'legalName') },
    { key: 'address', label: 'street address', test: has('address') },
    { key: 'telephone', label: 'phone number', test: has('telephone', 'contactPoint') },
    { key: 'openingHours', label: 'opening hours', test: has('openingHours', 'openingHoursSpecification') },
    { key: 'url', label: 'website URL', test: has('url', '@id') },
  ],
  buildFix: (context) =>
    scriptBlock(
      {
        '@context': 'https://schema.org',
        '@type': PLACEHOLDER('your_type_eg_Restaurant_Dentist_or_LocalBusiness'),
        name: context.siteName || context.domain,
        description: scrapeDescription(context.homepage) || PLACEHOLDER('one_sentence_about_your_business'),
        url: context.origin,
        image: metaProperty(context.homepage, 'og:image') || PLACEHOLDER('photo_of_your_premises_url'),
        telephone: scrapePhone(context) || PLACEHOLDER('phone_with_country_code'),
        email: scrapeEmail(context) || PLACEHOLDER('contact_email'),
        address: {
          '@type': 'PostalAddress',
          streetAddress: PLACEHOLDER('street_address'),
          addressLocality: PLACEHOLDER('city'),
          addressRegion: PLACEHOLDER('state'),
          postalCode: PLACEHOLDER('pin_code'),
          addressCountry: 'IN',
        },
        // One entry per distinct set of hours. Get these right — an assistant
        // sending someone to a closed shop is the worst outcome here.
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: PLACEHOLDER('hh:mm'),
            closes: PLACEHOLDER('hh:mm'),
          },
        ],
        sameAs: scrapeSameAs(context),
      },
      'Paste inside the <head> of your homepage and your contact page.',
    ),
};

const SOFTWARE: SchemaProfile = {
  accepts: (type) => /^(softwareapplication|webapplication|mobileapplication|service|product)$/.test(type),
  label: 'SoftwareApplication',
  fixTarget: 'The <head> section of your homepage and your pricing page',
  why: 'it tells an assistant what category of tool you are and what you cost, which is what it compares on when someone asks for a recommendation',
  required: [
    { key: 'name', label: 'product name', test: has('name') },
    { key: 'description', label: 'description', test: has('description', 'abstract') },
    { key: 'applicationCategory', label: 'category', test: has('applicationCategory', 'serviceType', 'category', 'applicationSubCategory') },
    { key: 'offers', label: 'pricing', test: (node) => hasPrice(node) || isNonEmpty(node.offers) || isNonEmpty((node as { priceRange?: unknown }).priceRange) },
  ],
  buildFix: (context, page) =>
    scriptBlock(
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: context.siteName || PLACEHOLDER('product_name'),
        description: scrapeDescription(page || context.homepage) || PLACEHOLDER('one_sentence_on_what_it_does'),
        url: context.origin,
        applicationCategory: PLACEHOLDER('eg_BusinessApplication_or_DeveloperApplication'),
        operatingSystem: 'Web',
        provider: { '@type': 'Organization', name: context.siteName || context.domain, url: context.origin },
        offers: {
          '@type': 'Offer',
          price: scrapePrice(page) || PLACEHOLDER('starting_price_number_only'),
          priceCurrency: scrapeCurrency(page),
          url: `${context.origin}/pricing`,
        },
      },
      'Paste inside the <head> of your homepage and your pricing page.',
    ),
};

const ORGANIZATION: SchemaProfile = {
  accepts: (type) => /^(organization|corporation|ngo|educationalorganization|governmentorganization|localbusiness|professionalservice|person)$/.test(type),
  label: 'Organization',
  fixTarget: 'The <head> section of your homepage',
  why: 'it is the difference between an assistant knowing who you are and guessing from your page title — everything else it says about you is built on this',
  required: [
    { key: 'name', label: 'name', test: has('name', 'legalName') },
    { key: 'url', label: 'website URL', test: has('url', '@id') },
    { key: 'logo', label: 'logo', test: has('logo', 'image') },
    { key: 'contact', label: 'a way to contact you', test: has('contactPoint', 'telephone', 'email', 'address') },
  ],
  buildFix: (context) =>
    scriptBlock(
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: context.siteName || context.domain,
        url: context.origin,
        logo: metaProperty(context.homepage, 'og:image') || PLACEHOLDER('your_logo_url'),
        description: scrapeDescription(context.homepage) || PLACEHOLDER('one_sentence_about_your_organisation'),
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: scrapePhone(context) || PLACEHOLDER('phone_with_country_code'),
          email: scrapeEmail(context) || PLACEHOLDER('contact_email'),
        },
        sameAs: scrapeSameAs(context),
      },
      'Paste inside the <head> of your homepage.',
    ),
};

export const SCHEMA_PROFILES: Record<SiteType, SchemaProfile> = {
  ecommerce: PRODUCT,
  content: ARTICLE,
  local_business: LOCAL_BUSINESS,
  saas: SOFTWARE,
  general: ORGANIZATION,
};
