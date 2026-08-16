/**
 * What this scanner checks, what it deliberately does not, and what it cannot
 * answer at all.
 *
 * Kept in one place because it is rendered twice — a short version under a
 * finished report, and the full version on the landing page. Two copies of a
 * list of limitations is how a tool ends up claiming different things in
 * different places, which is precisely the failure this content exists to
 * avoid.
 *
 * The wording rule: state the limit, then the reason. "We do not check mobile
 * rendering" invites doubt; "we do not check mobile rendering, because AI
 * crawlers are not phones" reads as a decision. Nothing here promises future
 * work — see NOT_ANSWERED.
 */

export interface ScopeItem {
  title: string;
  body: string;
}

/** The twelve points we check, grouped into the five questions they answer. */
export const COVERED: ScopeItem[] = [
  {
    title: 'Can AI crawlers reach you?',
    body:
      'Your robots.txt rules for eleven named AI crawlers — and then a live request as GPTBot, ClaudeBot and PerplexityBot to see what your server actually does, with a Googlebot control so we never blame you for a firewall doing its job properly.',
  },
  {
    title: 'Does the page arrive readable?',
    body:
      'Whether your words are in the HTML or assembled later by JavaScript, whether the page loads at all, and whether it responds fast enough that crawlers keep coming back.',
  },
  {
    title: 'Are your facts machine-readable?',
    body:
      'Structured data, field by field, for what you actually are — price, stock and brand for a shop; author and date for an article; address, phone and hours for a local business. FAQ and breadcrumb markup are reported as opportunities and never counted against you.',
  },
  {
    title: 'Can an assistant quote you cleanly?',
    body:
      'One canonical address per page, a heading outline it can split into answers, described images, semantic page landmarks, complete Open Graph tags, and a machine-readable date.',
  },
  {
    title: 'Are you visible at all?',
    body:
      'Any page quietly telling crawlers to ignore it — in the meta tag and in the X-Robots-Tag header, which never appears in your page source and is the one people miss for months.',
  },
  {
    title: 'And is there anything to talk to?',
    body:
      'A UCP manifest for shops, MCP or OpenAPI for software products, llms.txt for everyone else — reported honestly, including when it is worth nothing.',
  },
];

/** Things we could check and choose not to. Each one names its reason. */
export const NOT_CHECKED: ScopeItem[] = [
  {
    title: 'We do not run JavaScript',
    body:
      'Deliberately. Most AI crawlers do not run it either, so rendering your page in a browser would show us something they never see — and hide the exact problem we are looking for.',
  },
  {
    title: 'Mobile rendering',
    body:
      'Matters enormously for Google and barely at all for AI crawlers, which are not phones and do not care about tap targets or viewport widths.',
  },
  {
    title: 'Internal linking and orphan pages',
    body:
      'Answering this honestly needs a crawl of your whole site, not a sample of five pages. We would rather skip it than guess from a sample too small to support the claim.',
  },
  {
    title: 'Sitemap quality and hreflang',
    body:
      'We read your sitemap to find pages worth checking, but we do not grade it. For most sites the effect on whether an assistant can read you is small.',
  },
  {
    title: 'llms.txt is checked but scored at zero',
    body:
      'No AI system currently reads it. Google has said so publicly, and independent crawls found almost none of these files are ever requested. Plenty of tools mark it urgent. We used to as well, until we checked.',
  },
];

/**
 * The limits of the question itself.
 *
 * Framed as what this tool does not answer, not as a roadmap. A promise made
 * here costs more trust when it is still unbuilt in six months than it ever
 * bought on the day it was written.
 */
export const NOT_ANSWERED: ScopeItem[] = [
  {
    title: 'Whether AI actually recommends you',
    body:
      'This is the big one, and it is a different question. What drives being named is largely off-site — how often you are mentioned and cited elsewhere. Being readable makes you eligible; it does not make you the answer.',
  },
  {
    title: 'Your reputation and authority',
    body:
      'Expertise, trustworthiness, citations, third-party coverage, brand consistency. These matter more than anything on this page — and no technical scan can measure them, so we do not pretend to.',
  },
  {
    title: 'What changed since last time',
    body:
      'Every scan is a single moment. We do not track your score over time or alert you when something breaks — which is worth knowing, because a theme update can quietly shut crawlers out overnight.',
  },
];

/** The one-line honest summary, used in both placements. */
export const SCOPE_SUMMARY =
  'This tool answers one question — can an AI assistant reach, read and quote your site — and says plainly where it stops.';
