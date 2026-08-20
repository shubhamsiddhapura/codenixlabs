import { Confidence, SiteType } from '../types';
import { Deadline, FetchResult } from './fetcher';
import { HtmlDocument } from './htmlDocument';
import { ParsedRobots } from './robotsTxt';
import { SiteProfile } from './siteType';

/**
 * Everything the six checks read from. The engine gathers it once — one fetch
 * per URL, one parse per page — and every check works off this snapshot, so
 * adding a check never adds HTTP traffic.
 */
export interface ScanContext {
  submittedUrl: string;
  /** e.g. "https://example.com" — no trailing slash. */
  origin: string;
  /** e.g. "example.com" — www stripped, the cache key. */
  domain: string;

  /** What kind of site this is, and how sure we are. Drives every expectation. */
  siteType: SiteType;
  siteTypeConfidence: Confidence;
  siteTypeEvidence: string[];
  profile: SiteProfile;

  homepage: HtmlDocument;
  /**
   * The representative pages sampled beyond the homepage: product pages for a
   * store, articles for a publication, pricing and service pages elsewhere.
   */
  keyPages: HtmlDocument[];
  /** True when no representative pages could be identified (spec section 8). */
  noKeyPagesFound: boolean;

  robotsTxt: FetchResult;
  robots: ParsedRobots | null;

  /**
   * Machine-readable agent interfaces we probed for, keyed by artefact name
   * ("ucp", "llms.txt", "mcp", "openapi"). Absent keys were not probed.
   */
  agentArtifacts: Record<string, FetchResult>;

  /**
   * The homepage fetched again as each named AI crawler, keyed by bot name
   * ("GPTBot", "ClaudeBot", "PerplexityBot").
   *
   * This is what separates "your robots.txt allows GPTBot" from "your server
   * actually serves GPTBot" — a distinction that costs sites their entire AI
   * visibility without anyone noticing.
   */
  botProbes: Record<string, FetchResult>;
  /**
   * A browser was served where our scanner was not.
   *
   * Only set after the homepage failed. Turns "we could not reach you" into the
   * far more useful "your server answers browsers and stalls everything else",
   * which is a statement about how the site treats crawlers rather than about
   * whether it is online.
   */
  browserReachable: boolean;

  sitemapFound: boolean;
  sitemapUrls: string[];

  /** Best guess at the site's name, used to pre-fill generated fixes. */
  siteName: string;

  deadline: Deadline;
}

/** Homepage plus sampled key pages, in the order they were fetched. */
export function allPages(context: ScanContext): HtmlDocument[] {
  return [context.homepage, ...context.keyPages];
}
