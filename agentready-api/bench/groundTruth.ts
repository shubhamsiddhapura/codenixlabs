/**
 * What is actually true of a page, established without going through our scanner.
 *
 * This is the point of the whole exercise. A competitor's verdict only tells us
 * where we disagree, never which of us is wrong — the site itself is the only
 * authority, and every bug found today came from reading it directly.
 */
import axios from 'axios';

export interface Truth {
  reachable: boolean;
  status: number | null;
  bytes: number;
  ms: number;
  /** schema.org types present in any notation. */
  schemaTypes: string[];
  hasJsonLd: boolean;
  hasMicrodata: boolean;
  textChars: number;
  robotsStatus: number | null;
  /** robots.txt literally disallows one of the named AI crawlers. */
  robotsBlocksAi: boolean;
  error: string | null;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const AI_AGENTS = ['gptbot', 'claudebot', 'perplexitybot', 'google-extended', 'ccbot', 'oai-searchbot', 'anthropic-ai'];

const get = (url: string, ms = 25000) =>
  axios.get(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, timeout: ms, maxRedirects: 5,
    maxContentLength: Infinity, validateStatus: () => true, responseType: 'text', transformResponse: [(x) => x] });

/** Does robots.txt disallow "/" for a named AI crawler? Group-aware, unlike a substring test. */
function robotsBlocksAi(body: string): boolean {
  let inAiGroup = false;
  let agentsInGroup: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) { agentsInGroup = []; inAiGroup = false; continue; }
    const [field, ...rest] = line.split(':');
    const key = (field || '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') { agentsInGroup.push(value.toLowerCase()); inAiGroup = agentsInGroup.some((a) => AI_AGENTS.includes(a)); continue; }
    if (key === 'disallow' && inAiGroup && (value === '/' || value === '')) { if (value === '/') return true; }
  }
  return false;
}

export async function establishTruth(domain: string): Promise<Truth> {
  const t: Truth = { reachable: false, status: null, bytes: 0, ms: 0, schemaTypes: [], hasJsonLd: false,
    hasMicrodata: false, textChars: 0, robotsStatus: null, robotsBlocksAi: false, error: null };
  const started = Date.now();
  try {
    const r = await get(`https://${domain}/`);
    t.ms = Date.now() - started;
    t.status = r.status;
    const html = String(r.data ?? '');
    t.bytes = html.length;
    t.reachable = r.status >= 200 && r.status < 400;

    const types = new Set<string>();
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      t.hasJsonLd = true;
      try {
        const walk = (n: unknown): void => {
          if (Array.isArray(n)) return n.forEach(walk);
          if (n && typeof n === 'object') {
            const ty = (n as Record<string, unknown>)['@type'];
            if (ty) [ty].flat().forEach((x) => types.add(String(x).toLowerCase()));
            Object.values(n as Record<string, unknown>).forEach(walk);
          }
        };
        walk(JSON.parse(m[1]));
      } catch { /* malformed blocks are themselves a finding, counted via hasJsonLd */ }
    }
    for (const m of html.matchAll(/itemtype=["']https?:\/\/schema\.org\/(\w+)/gi)) { t.hasMicrodata = true; types.add(m[1].toLowerCase()); }
    t.schemaTypes = [...types];
    t.textChars = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  } catch (e) { t.error = (e as { code?: string; message: string }).code || (e as Error).message; t.ms = Date.now() - started; }

  try {
    const rb = await get(`https://${domain}/robots.txt`, 15000);
    t.robotsStatus = rb.status;
    if (rb.status === 200) t.robotsBlocksAi = robotsBlocksAi(String(rb.data ?? ''));
  } catch { /* absent robots.txt means "allowed", which the harness records as false */ }

  return t;
}
