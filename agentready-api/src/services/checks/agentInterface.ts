import { CheckOutcome, FixLanguage, SiteType } from '../../types';
import { ScanContext } from '../scanContext';
import { isAgentInterfaceScored } from '../siteType';
import { FetchResult } from '../fetcher';

/**
 * Check 2 — is there a machine-readable interface an AI agent can use?
 *
 * The spec called this "UCP manifest presence", because it assumed a store. The
 * underlying question is broader and applies to every site: beyond reading your
 * pages like a human, is there anything here an agent can *talk to*?
 *
 * What that artefact is depends on the site:
 *
 *   store          /.well-known/ucp      — browse the catalogue, check stock, buy
 *   SaaS           an MCP or OpenAPI descriptor — call the product directly
 *   anything else  /llms.txt             — a plain summary of the site for models
 *
 * llms.txt is the fallback for every type, and the primary for content, local
 * business and general sites. It is a markdown file: a title, a one-line
 * summary and a curated list of links. It is also the easiest thing on this
 * whole report to fix, which makes it a good first ask on a sales call.
 */

const PLACEHOLDER = (field: string): string => `REPLACE_WITH_YOUR_${field.toUpperCase()}`;

/** UCP protocol version the generator targets. */
const UCP_VERSION = '2026-04-08';

/** Paths probed for each site type, most meaningful first. */
export const AGENT_ARTIFACT_PATHS: Record<SiteType, { key: string; path: string }[]> = {
  ecommerce: [
    { key: 'ucp', path: '/.well-known/ucp' },
    { key: 'llms.txt', path: '/llms.txt' },
  ],
  saas: [
    { key: 'mcp', path: '/.well-known/mcp.json' },
    { key: 'openapi', path: '/openapi.json' },
    { key: 'llms.txt', path: '/llms.txt' },
  ],
  content: [{ key: 'llms.txt', path: '/llms.txt' }],
  local_business: [{ key: 'llms.txt', path: '/llms.txt' }],
  general: [{ key: 'llms.txt', path: '/llms.txt' }],
};

/** The artefact that fully answers the check for each site type. */
const PRIMARY_ARTIFACT: Record<SiteType, string> = {
  ecommerce: 'ucp',
  saas: 'mcp',
  content: 'llms.txt',
  local_business: 'llms.txt',
  general: 'llms.txt',
};

const TITLES: Record<SiteType, string> = {
  ecommerce: 'AI checkout manifest (UCP)',
  saas: 'Machine-readable agent interface',
  content: 'AI site summary (llms.txt)',
  local_business: 'AI site summary (llms.txt)',
  general: 'AI site summary (llms.txt)',
};

export function checkAgentInterface(context: ScanContext): CheckOutcome {
  const base = {
    checkId: 'agent_interface' as const,
    title: TITLES[context.siteType],
  };

  const primaryKey = PRIMARY_ARTIFACT[context.siteType];
  const primary = evaluate(primaryKey, context.agentArtifacts[primaryKey]);

  // Every profile falls back to llms.txt, so a site can still get partial
  // credit for the easy win even when the type-specific artefact is missing.
  const fallback = primaryKey === 'llms.txt' ? null : evaluate('llms.txt', context.agentArtifacts['llms.txt']);

  const fix = buildFix(context, primaryKey);

  // The site turned our scanner away on every probe, so "no manifest here" is
  // an assumption, not an observation. Crawlability reports the block; this
  // check steps aside rather than charging for something it never saw.
  const probed = Object.values(context.agentArtifacts);
  if (probed.length && probed.every((response) => response.blocked)) {
    return {
      ...base,
      status: 'skipped',
      details: 'Every probe was refused by the site (HTTP 401/403/429), so this could not be verified.',
      humanExplanation:
        'Your server turned our scanner away, so we could not check whether you publish a machine-readable interface for AI agents. ' +
        'This has been left out of your score rather than counted against you. See the crawlability result below — the same block that stopped us will stop AI crawlers too, and that is the thing to fix first.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  /**
   * llms.txt is reported, never scored.
   *
   * For these site types llms.txt is the only artefact there would be, and no
   * AI system fetches it — Google has said so on the record, and independent
   * crawls find 97% are never requested by anything. We used to weight it at 8
   * points here, which meant docking real sites for missing a file with no
   * readers. That is precisely the placebo this tool is supposed to expose, so
   * it now scores 0 of 0 and appears as information rather than a finding.
   */
  if (!isAgentInterfaceScored(context.siteType)) {
    const published = primary.state === 'valid';
    return {
      ...base,
      status: 'skipped',
      details: published ? `llms.txt found and valid. ${primary.detail} Not scored.` : 'No llms.txt found. Not scored.',
      humanExplanation:
        (published
          ? 'You publish an llms.txt file — a plain summary of your site written for AI models. '
          : 'You do not publish an llms.txt file, and we are not counting that against you. ') +
        'Here is the honest position: no AI system currently reads llms.txt. Google has stated publicly that it does not fetch the file and has no plans to, and independent studies of well over a hundred thousand domains found almost none of these files are ever requested by anything. ' +
        'Plenty of tools will score you down for not having one. We did too, until we checked. ' +
        (published
          ? 'Keeping yours costs nothing and it may matter later if the standard gets adopted.'
          : 'So we are not giving you a file to create for it. Spend the time on the checks above that are actually costing you visibility — if the standard gets adopted, adding one later is a ten-minute job.'),
      /**
       * No generated file here, deliberately.
       *
       * We tell the reader in the sentence above that nothing reads llms.txt,
       * and then used to hand them one to publish anyway. Shipping a fix for a
       * problem we have just called a placebo undoes the credibility the
       * paragraph was buying — and a reader who notices it is right to
       * discount everything else on the page.
       */
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  if (primary.state === 'valid') {
    return {
      ...base,
      status: 'pass',
      details: `${describeKey(primaryKey)} found and valid. ${primary.detail}`,
      humanExplanation: passExplanation(primaryKey),
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  if (primary.state === 'malformed') {
    return {
      ...base,
      status: 'warning',
      details: `${describeKey(primaryKey)} exists but is not usable. ${primary.detail}`,
      humanExplanation:
        `You publish ${describeKey(primaryKey)} — more than most sites do — but an agent reading it will give up, because ${primary.detail.toLowerCase()} ` +
        'This is usually a small problem: a stray comma, a smart quote pasted from a document, or your server returning an error page instead of the file. ' +
        'Replace the contents with the version below.',
      generatedFix: fix.body,
      generatedFixLanguage: fix.language,
      generatedFixTarget: fix.target,
    };
  }

  if (fallback?.state === 'valid') {
    return {
      ...base,
      status: 'warning',
      details: `No ${describeKey(primaryKey)}, but /llms.txt is published and valid.`,
      humanExplanation:
        `You publish an llms.txt file, which is a real head start — it gives AI models a plain summary of your site. ` +
        `What is missing is ${describeKey(primaryKey)}, the part that lets an agent ${context.siteType === 'ecommerce' ? 'check your live prices and stock and complete a purchase' : 'call your product directly rather than just read about it'}. ` +
        'llms.txt tells an assistant about you; this tells it how to work with you. The starter file below is the next step.',
      generatedFix: fix.body,
      generatedFixLanguage: fix.language,
      generatedFixTarget: fix.target,
    };
  }

  /**
   * We never got an answer about any of them, so we cannot say they are absent.
   *
   * "No agent interface found" is a claim that the file is not there. When every
   * request timed out, the only thing we established is that the site was slow
   * while we were asking. mcaffeine.com flipped from pass to fail between two
   * runs on exactly this, with nothing about the site having changed.
   */
  if (primary.state === 'unknown' && (!fallback || fallback.state === 'unknown')) {
    return {
      ...base,
      status: 'skipped',
      details: `Could not reach ${(AGENT_ARTIFACT_PATHS[context.siteType] || []).map((entry) => entry.path).join(', ')} — ${primary.detail} Not scored.`,
      humanExplanation:
        'We could not finish checking whether your site publishes a machine-readable interface for AI agents — the requests did not come back in time, which usually means the site was busy rather than that anything is wrong. ' +
        'This has been left out of your score rather than counted against you, because we did not establish that anything is missing. Re-run the scan and it will normally complete.',
      generatedFix: null,
      generatedFixLanguage: null,
      generatedFixTarget: null,
    };
  }

  return {
    ...base,
    status: 'fail',
    details: `No agent interface found. Checked: ${(AGENT_ARTIFACT_PATHS[context.siteType] || []).map((entry) => entry.path).join(', ')}.`,
    humanExplanation: missingExplanation(context, primaryKey),
    generatedFix: fix.body,
    generatedFixLanguage: fix.language,
    generatedFixTarget: fix.target,
  };
}

// --- Artefact evaluation --------------------------------------------------

type ArtifactState = 'valid' | 'malformed' | 'missing' |
  /**
   * We never got an answer, so we do not know whether it is there.
   *
   * Distinct from `missing`, which used to swallow it. A request that timed out
   * or ran past the scan budget is a fact about us; reporting it as "no agent
   * interface found" tells the owner a file is absent when we simply never
   * managed to ask. On a slow site this turned a passing check into a failure —
   * mcaffeine.com went pass to fail on a run where the only thing that changed
   * was how busy the network was.
   */
  'unknown';

/** Transport failures, as opposed to a server that answered "not here". */
const NEVER_ANSWERED = new Set(['timeout', 'deadline_exceeded', 'network', 'connection_refused', 'dns', 'ssl']);

interface ArtifactVerdict {
  state: ArtifactState;
  detail: string;
}

function evaluate(key: string, response: FetchResult | undefined): ArtifactVerdict {
  if (!response) return { state: 'unknown', detail: 'Not checked.' };

  if (response.failure) {
    // A 404 is an answer: the file is not there. A timeout is not an answer.
    return NEVER_ANSWERED.has(response.failure)
      ? { state: 'unknown', detail: `No response (${response.failure}).` }
      : { state: 'missing', detail: `${response.failure}.` };
  }

  if (!response.ok) {
    return { state: 'missing', detail: `HTTP ${response.status}.` };
  }

  // A 200 that returns the site's own HTML is a soft 404 — very common on SPA
  // hosts, which serve index.html for every unknown path. Treating that as
  // "you have one, but it is broken" would be plainly wrong.
  if (looksLikeHtml(response.contentType, response.body)) {
    return { state: 'missing', detail: 'The URL returned an HTML page rather than a file (soft 404).' };
  }

  return key === 'llms.txt' ? evaluateLlmsTxt(response) : evaluateJsonManifest(key, response);
}

function evaluateLlmsTxt(response: FetchResult): ArtifactVerdict {
  const body = (response.body || '').trim();

  if (body.length < 40) {
    return { state: 'malformed', detail: 'The file is effectively empty.' };
  }
  // The format is a markdown H1 title, an optional blockquote summary, then
  // sections of links. A file with neither a heading nor a link is not one.
  const hasHeading = /^#\s+\S/m.test(body);
  const hasLinks = /\[[^\]]+\]\([^)]+\)/.test(body);

  if (!hasHeading && !hasLinks) {
    return { state: 'malformed', detail: 'It has no markdown heading and no links, so there is nothing for a model to read.' };
  }
  if (!hasLinks) {
    return { state: 'malformed', detail: 'It names the site but links to none of its pages, which is the useful half.' };
  }

  const linkCount = (body.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  return { state: 'valid', detail: `${linkCount} linked page(s) described.` };
}

/** Field names that count as "a service or business identifier" in a manifest. */
const IDENTIFIER_FIELDS = ['service', 'service_name', 'business', 'business_name', 'name', 'merchant', 'merchant_id', 'id'];

function evaluateJsonManifest(key: string, response: FetchResult): ArtifactVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body || '');
  } catch {
    return { state: 'malformed', detail: 'It is not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { state: 'malformed', detail: 'It is valid JSON but not a single descriptive object.' };
  }

  const raw = parsed as Record<string, unknown>;

  if (key === 'openapi') {
    const version = raw.openapi || raw.swagger;
    const paths = raw.paths && typeof raw.paths === 'object' ? Object.keys(raw.paths as object).length : 0;
    if (!version) return { state: 'malformed', detail: 'It has no "openapi" or "swagger" version field.' };
    if (!paths) return { state: 'malformed', detail: 'It declares no endpoints.' };
    return { state: 'valid', detail: `OpenAPI ${String(version)} with ${paths} endpoint(s).` };
  }

  if (key === 'mcp') {
    const servers = raw.servers || raw.mcpServers || raw.server;
    if (!servers) return { state: 'malformed', detail: 'It names no MCP server to connect to.' };
    return { state: 'valid', detail: 'MCP descriptor with a server endpoint.' };
  }

  // UCP. The real-world shape nests everything under a `ucp` envelope, with
  // `services` (transport endpoints) alongside `capabilities`. Early
  // hand-rolled manifests are flat, so tolerate both.
  const envelope = raw.ucp && typeof raw.ucp === 'object' && !Array.isArray(raw.ucp) ? (raw.ucp as Record<string, unknown>) : raw;

  const capabilities = describeKeys(envelope.capabilities);
  const services = describeKeys(envelope.services);
  if (!capabilities.length && !services.length) {
    return { state: 'malformed', detail: 'It lists no capabilities or services, so an agent cannot tell what you support.' };
  }

  const identified =
    IDENTIFIER_FIELDS.some((field) => typeof envelope[field] === 'string' && (envelope[field] as string).trim()) ||
    services.length > 0 ||
    Boolean(envelope.supported_versions);

  if (!identified) {
    return { state: 'malformed', detail: 'Nothing in it identifies your business or names an endpoint to connect to.' };
  }

  const named = [...new Set([...capabilities, ...services])].slice(0, 6);
  return { state: 'valid', detail: `Version ${String(envelope.version || 'unspecified')}, declares: ${named.join(', ')}.` };
}

function describeKeys(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>);
  return [];
}

function looksLikeHtml(contentType: string | null, body: string | null): boolean {
  if (contentType && /text\/html/i.test(contentType)) return true;
  return Boolean(body && /^\s*<(!doctype|html)/i.test(body));
}

function describeKey(key: string): string {
  if (key === 'ucp') return 'a UCP manifest at /.well-known/ucp';
  if (key === 'mcp') return 'an MCP descriptor at /.well-known/mcp.json';
  if (key === 'openapi') return 'an OpenAPI document';
  return 'an llms.txt file';
}

// --- Explanations ---------------------------------------------------------

function passExplanation(key: string): string {
  if (key === 'ucp') {
    return (
      'Your store publishes a UCP manifest — the file that tells AI shopping agents what your store can do and how to connect to it. ' +
      'This is what will let an assistant check your live prices and stock, and eventually complete a purchase for a shopper without them opening your website. ' +
      'If you are on Shopify this arrived with the platform rather than something you set up, which is good news: it stays current automatically. ' +
      'Nothing to fix.'
    );
  }
  if (key === 'mcp' || key === 'openapi') {
    return (
      'Your product publishes a machine-readable interface, so an AI agent can call it directly instead of only reading marketing copy about it. ' +
      'That is the difference between an assistant describing your product and an assistant *using* it on someone\'s behalf. Very few products have this yet. Nothing to fix.'
    );
  }
  return (
    'You publish an llms.txt file — a plain summary of your site written for AI models, pointing them at the pages that matter. ' +
    'Almost no sites have this yet. It means a model answering a question about your area has a clean, curated view of what you offer instead of guessing from your page layout. ' +
    'Keep it current as you add important pages.'
  );
}

function missingExplanation(context: ScanContext, key: string): string {
  const site = `https://${context.domain}`;

  if (key === 'ucp') {
    return (
      `Your store does not publish a UCP manifest at ${site}/.well-known/ucp. ` +
      'UCP is the standard that lets an AI assistant do more than describe your store — it lets the assistant check your live prices and stock, and complete a purchase on a shopper\'s behalf without them ever opening your website. ' +
      'Shopify now ships this automatically for stores on it, so not having one increasingly means being the store an agent cannot transact with while your competitors are. ' +
      'Below is a starter manifest. Save it as a file named "ucp" (no extension) inside a folder called ".well-known" at the root of your site, served as application/json. ' +
      'The manifest is the easy half — it points at a live endpoint an agent talks to, and that endpoint has to exist and answer. That is the part worth getting help with.'
    );
  }

  if (key === 'mcp') {
    return (
      `Your product does not publish a machine-readable interface at ${site}/.well-known/mcp.json, and has no OpenAPI document at ${site}/openapi.json. ` +
      'Right now an AI assistant can read your marketing pages and describe what you do, but it cannot actually use your product for someone. ' +
      'That gap is becoming the difference between being mentioned and being adopted: when a user asks their assistant to do a job your software does, the products it can call are the ones it reaches for. ' +
      'The starter descriptor below is the file; behind it you need a live endpoint that answers. That endpoint is the real work.'
    );
  }

  return (
    `Your site does not publish an llms.txt file at ${site}/llms.txt. ` +
    'llms.txt is a short, plain-language summary of your site written for AI models — a title, a sentence about what you do, and a curated list of your most important pages. ' +
    'Without it, a model has to infer all of that from your navigation and page layout, and it often infers wrong: it misses your best pages, or describes you as something you are not. ' +
    'This is the cheapest item on this entire report to fix. It is one text file, it takes ten minutes, and almost none of your competitors have one. ' +
    'We have written a starting version below from your own site — save it as llms.txt at the root of your domain.'
  );
}

// --- Fix generation -------------------------------------------------------

interface GeneratedFix {
  body: string;
  language: FixLanguage;
  /**
   * Where the file goes. Carried alongside the block because JSON cannot hold
   * a comment saying "save this at /.well-known/ucp", and the person who ends
   * up pasting it is usually not the person who read the report.
   */
  target: string;
}

function buildFix(context: ScanContext, key: string): GeneratedFix {
  if (key === 'ucp') {
    return {
      body: buildUcpManifest(context),
      language: 'json',
      target: `https://${context.domain}/.well-known/ucp — a file named "ucp" with no extension, inside a ".well-known" folder at the root of your site, served as application/json`,
    };
  }
  if (key === 'mcp') {
    return {
      body: buildMcpDescriptor(context),
      language: 'json',
      target: `https://${context.domain}/.well-known/mcp.json — inside a ".well-known" folder at the root of your site, served as application/json`,
    };
  }
  return {
    body: buildLlmsTxt(context),
    language: 'markdown',
    target: `https://${context.domain}/llms.txt — a plain text file at the root of your site, served as text/plain or text/markdown`,
  };
}

/**
 * A starter UCP manifest in the real shape, pre-filled with what we detected.
 *
 * Capabilities are deliberately minimal: declaring a checkout capability a
 * store cannot honour is worse for it than declaring none, because an agent
 * will try to use it and fail in front of a customer.
 */
function buildUcpManifest(context: ScanContext): string {
  return JSON.stringify(
    {
      ucp: {
        version: UCP_VERSION,
        business_name: context.siteName || PLACEHOLDER('business_name'),
        homepage: context.origin,
        services: {
          'dev.ucp.shopping': [
            {
              version: UCP_VERSION,
              spec: 'https://ucp.dev/2026-04-08/specification/overview/',
              transport: 'mcp',
              endpoint: PLACEHOLDER('ucp_endpoint_url'),
              schema: 'https://ucp.dev/2026-04-08/services/shopping/mcp.openrpc.json',
            },
          ],
        },
        capabilities: {
          'dev.ucp.shopping.catalog': [{ version: UCP_VERSION, spec: 'https://ucp.dev/2026-04-08/specification/overview/' }],
        },
      },
    },
    null,
    2,
  );
}

function buildMcpDescriptor(context: ScanContext): string {
  return JSON.stringify(
    {
      name: context.siteName || PLACEHOLDER('product_name'),
      description: PLACEHOLDER('one_line_description_of_what_your_product_does'),
      homepage: context.origin,
      servers: [
        {
          name: `${context.domain} MCP server`,
          transport: 'http',
          url: PLACEHOLDER('your_mcp_server_url'),
          authentication: { type: 'oauth2', authorization_url: PLACEHOLDER('your_oauth_authorize_url') },
        },
      ],
      documentation: `${context.origin}/docs`,
    },
    null,
    2,
  );
}

/**
 * A starting llms.txt built from the site's own homepage: its name, its meta
 * description, and the internal pages it links to most prominently.
 *
 * Templating, not generation — everything here was read during the scan.
 */
function buildLlmsTxt(context: ScanContext): string {
  const homepage = context.homepage;
  const description =
    homepage.$?.('meta[name="description"]').first().attr('content')?.trim() ||
    homepage.$?.('meta[property="og:description"]').first().attr('content')?.trim() ||
    PLACEHOLDER('one_sentence_describing_what_you_do');

  const lines = [
    `# ${context.siteName || context.domain}`,
    '',
    `> ${description}`,
    '',
    `${context.origin}`,
    '',
  ];

  const keyLinks = context.keyPages.map((page) => ({ url: page.url, text: page.title || page.url }));
  if (keyLinks.length) {
    lines.push(`## ${titleCase(context.profile.keyPageLabel)}`, '');
    for (const link of keyLinks) {
      lines.push(`- [${cleanTitle(link.text)}](${link.url}): ${PLACEHOLDER('what_this_page_covers')}`);
    }
    lines.push('');
  }

  const navLinks = pickNavLinks(context);
  if (navLinks.length) {
    lines.push('## Key pages', '');
    for (const link of navLinks) {
      lines.push(`- [${link.text}](${link.url}): ${PLACEHOLDER('what_this_page_covers')}`);
    }
    lines.push('');
  }

  lines.push(
    '## Notes',
    '',
    '- Replace every REPLACE_WITH_ placeholder with a real one-line description.',
    '- Keep this file short. It is a map of your site, not a copy of it.',
    '- Save it as llms.txt at the root of your domain, served as text/plain or text/markdown.',
    '',
  );

  return lines.join('\n');
}

/** Up to six substantial internal links from the homepage, deduped by URL. */
function pickNavLinks(context: ScanContext): { url: string; text: string }[] {
  const seen = new Set<string>();
  const picked: { url: string; text: string }[] = [];

  for (const link of context.homepage.links()) {
    if (picked.length >= 6) break;
    if (!link.text || link.text.length < 3 || link.text.length > 60) continue;

    let path: string;
    try {
      const parsed = new URL(link.url);
      if (parsed.hostname.replace(/^www\./, '') !== context.domain) continue;
      path = parsed.pathname;
    } catch {
      continue;
    }

    if (path === '/' || seen.has(path)) continue;
    if (/\/(cart|checkout|account|login|register|search)\b/i.test(path)) continue;

    seen.add(path);
    picked.push({ url: link.url, text: link.text });
  }

  return picked;
}

function cleanTitle(title: string): string {
  return title.split(/[|–—]/)[0].trim().slice(0, 70) || title.slice(0, 70);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
