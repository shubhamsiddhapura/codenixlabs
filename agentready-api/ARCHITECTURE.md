# AI Readiness Checker — how the backend works

A developer's guide to the scanner API. Read this before changing anything in
`src/services/`.

Every file path below is relative to `agentready-api/`.

---

## 1. What this service does, in one paragraph

A visitor pastes a URL. The service fetches that site's homepage plus up to five
other pages, requests the homepage again while identifying as three named AI
crawlers, parses everything as static HTML, runs seven checks against it,
converts the results into a 0–100 score and a letter grade, generates
ready-to-paste code for whatever failed, stores the whole thing in MongoDB, and
returns a deliberately incomplete version of it. The rest is released once a
visitor gives their contact details.

It never executes JavaScript. That is a design decision, not a gap — most AI
crawlers do not either, so the scanner sees roughly what they see.

---

## 2. The two processes

This repository holds two independent backends. They do not share code.

| | `SERVER/` | `agentready-api/` |
|---|---|---|
| Purpose | Blog content, OG images | The scanner |
| Language | JavaScript, ESM | TypeScript, CommonJS |
| Express | 5.1 | 4.21 |
| Default port | 4000 | 5100 |
| Entry point | `index.js` | `src/server.ts` |

They are separate because a scan holds a connection for up to fifteen seconds
and makes about fifteen outbound requests, while the blog API does fast database
reads. In one process, a burst of scans would starve the blog.

---

## 3. The request lifecycle

This is the whole path from a click to JSON. Follow it once and the rest of the
document is detail.

```
Browser                        API                              Target site
   |                            |                                    |
   |-- POST /api/scan --------->|                                    |
   |   { url, siteType? }       |                                    |
   |                            | rate limit (5/IP/hour)             |
   |                            | normalizeUrl()                     |
   |                            | cache lookup (6h, same version)    |
   |                            |                                    |
   |                            |-- GET homepage ------------------->|
   |                            |-- GET /robots.txt --------------->|
   |                            |-- GET /sitemap.xml --------------->|
   |                            |                                    |
   |                            | detectSiteType()                   |
   |                            | selectKeyPages()                   |
   |                            |                                    |
   |                            |== 3 parallel groups ==============>|
   |                            |   agent artefacts                  |
   |                            |   up to 5 key pages                |
   |                            |   4 crawler probes                 |
   |                            |                                    |
   |                            | run 7 checks                       |
   |                            | scoreCheck() x7 -> totalScore()    |
   |                            | Scan.create()                      |
   |<-- teaser JSON ------------|                                    |
   |    grade + 2 checks        |                                    |
   |                            |                                    |
   |-- POST /:id/unlock ------->|                                    |
   |   { name, email, ... }     | Lead.create() + email              |
   |<-- full JSON --------------|                                    |
```

### Entry points

`src/app.ts` builds the Express app: helmet with a strict CSP, a CORS allowlist
(`config.frontendUrls` plus any `*.vercel.app` or `*.codenixlabs.com` origin), a
10 KB JSON body limit, and `trust proxy` set to 1 so the rate limiter sees real
client IPs behind a host's proxy.

`src/routes/scanRoutes.ts` mounts five routes under `/api/scan`:

| Method | Path | Handler | Rate limited |
|---|---|---|---|
| POST | `/` | `createScan` | yes |
| POST | `/:scanId/compare` | `compareScan` | yes |
| GET | `/:scanId` | `getScan` | no |
| POST | `/:scanId/unlock` | `unlockScan` | no |
| GET | `/:scanId/report` | `getScanReport` | no |

Both routes that can trigger a crawl share the same limiter, so a visitor cannot
get a sixth crawl for free by routing it through the comparison endpoint.

---

## 4. Caching and the rate limit

`src/services/scanService.ts` sits between the controller and the engine. Before
any network activity, `findCachedScan()` looks for a recent scan of the same
domain. Four conditions must all hold:

```ts
{
  domain,
  scannedAt: { $gte: cutoff },      // within SCAN_CACHE_HOURS, default 6
  partial: false,                    // a timed-out scan is not worth reusing
  scoringVersion: SCORING_VERSION,   // scores only compare within one version
}
```

Plus one more that is easy to miss and caused a real bug: if the caller supplied
a `siteType` override, only scans of that type match; if they did not,
`siteTypeOverridden: false` is required. Without this, someone pasting a URL cold
could be handed a stranger's overridden scan and read a report opening with "you
told us this is a SaaS product" when they said no such thing.

The rate limit (`src/middleware/scanRateLimit.ts`) is five per IP per hour.
Cache hits still count against it — the limit exists to stop the tool being used
as a free crawler, and exempting cached scans would leak that.

---

## 5. The time budget

Every scan has a hard ceiling, default 15 seconds. It is enforced by the
`Deadline` class in `src/services/fetcher.ts`, not by per-request timeouts.

```ts
constructor(totalMs = config.scanner.totalTimeoutMs) {
  this.endsAt = Date.now() + Math.max(1000, totalMs - Deadline.PROCESSING_RESERVE_MS);
}
```

Two details matter:

**`PROCESSING_RESERVE_MS` is 1500.** Parsing six pages of HTML, scoring and
building the report is not free. Without the reserve, fetches alone consumed the
entire ceiling and the scan finished *after* the time promised.

**`expired()` returns true below 1000 ms remaining**, not at zero. A request with
900 ms left cannot complete usefully, so callers stop rather than firing one
doomed to time out.

Every `fetchUrl()` call asks the deadline how long it may take:

```ts
const timeout = Math.min(config.scanner.requestTimeoutMs, deadline.remainingMs());
```

### Why `AbortSignal` and not just axios's timeout

```ts
timeout,
signal: AbortSignal.timeout(timeout),
```

axios's `timeout` starts counting once the socket is connected. DNS resolution,
TLS negotiation and a slow body stream all sit outside it — which is how a scan
with a 15-second ceiling was observed finishing in 19. The `AbortSignal` covers
the whole request in wall-clock time and is what actually enforces the deadline.

---

## 6. Fetching

`fetchUrl()` **never throws.** A failed fetch is a finding, not an error, so
every failure mode is returned in the result:

```ts
interface FetchResult {
  requestedUrl, finalUrl, status, ok, headers, body, contentType,
  failure: 'timeout' | 'dns' | 'ssl' | 'redirect_loop'
         | 'connection_refused' | 'network' | 'deadline_exceeded' | null,
  blocked: boolean,
  durationMs: number,
}
```

`blocked` is distinct from `failure`: the server answered but refused us. It is
set for 401, 403 and 429, and for a 503 whose body contains a known challenge
marker (`CHALLENGE_MARKERS` covers Cloudflare, Incapsula and similar
interstitials). The site is up — it just does not want a bot, which is a
completely different finding from "the site is down".

Other choices worth knowing:

- `validateStatus: () => true` — we read non-2xx bodies deliberately (a 403
  challenge page, a 404 `.well-known` probe), so axios must never turn a status
  code into an exception.
- `maxRedirects: 5`, `maxContentLength` 3 MB.
- `fetchWithHttpFallback()` retries over `http://` when an `https://` attempt
  fails at the transport level. Plenty of small stores have a broken certificate
  on the apex domain, and reporting "we couldn't reach you" about a site that is
  plainly online would be wrong.

---

## 7. Parsing: `HtmlDocument`

`src/services/htmlDocument.ts` wraps one `FetchResult`. cheerio runs **once per
page**, here, rather than once per check — four checks need the same three things
out of a page.

`text()`, `links()` and `jsonLd()` are each cached after first call.

### The `text()` trap

cheerio's `.text()` concatenates with no separator, so
`<h1>Grill House</h1><p>Book a table` comes out as `Grill HouseBook a table` and
any pattern anchored with `\b` silently stops matching. Every block element gets
a trailing space appended before extraction:

```ts
body.find(BLOCK_ELEMENTS).each((_, element) => { $(element).append(' '); });
```

Inline elements deliberately do not get one — `Read<a>more</a>` really is one
word on screen. **This bug has been introduced twice.** If you need page text,
call `HtmlDocument.text()`; do not hand-roll extraction.

### `jsonLd()` flattening

Real sites nest structured data in several ways, and the node you want can be
buried in any of them. `collectNodes()` walks to depth 6 and follows `@graph`,
`itemListElement`, `mainEntity` and `item`, flattening everything into one list
of objects so no caller has to re-walk the tree.

Malformed JSON-LD is swallowed silently — trailing commas and PHP-escaped quotes
are common. The structured-data check then reports "no usable schema" rather than
the scan crashing.

### `inlineStateBytes()`

Measures the largest inline JSON blob (`__NEXT_DATA__`, `__NUXT__`,
`self.__next_f`, `window.__INITIAL_STATE__`, and any `application/json` script
over 500 bytes). This is what separates *payload only* from *empty shell* in the
crawlability check — see §11.

---

## 8. Site-type classification

`src/services/siteType.ts`. Five types: `ecommerce`, `content`, `saas`,
`local_business`, `general`.

`scoreSiteTypes()` runs every entry in `SIGNALS` against a single `buildInput()`
snapshot of the page and accumulates points per type, with evidence strings.
Signals can be negative — a content site loses 5 points when pricing and docs
links are both present, because that pattern is a SaaS product with a blog.

A signal that throws is treated as not firing. A malformed page must never break
classification.

`detectSiteType()` sorts by score, breaking ties with:

```ts
const CLASSIFICATION_PRIORITY: SiteType[] = ['ecommerce', 'local_business', 'saas', 'content'];
```

Ties break towards the profile that expects *more* of the site, so a store that
also runs a blog is still judged as a store. Below `MIN_SCORE` (4) the verdict is
`general` with `low` confidence.

Confidence is derived from the winner's score and its margin over the runner-up:

```ts
winner.score >= 8 && margin >= 3  ? 'high'
: winner.score >= MIN_SCORE + 2   ? 'medium'
:                                   'low'
```

The margin matters as much as the score. A site scoring 9 as a store and 8 as a
publication is genuinely ambiguous, and reporting that as `high` would be a lie
the visitor has no way to catch. Low confidence is what makes the site-type
override in the UI worth offering.

Classification happens **before** page sampling, because a blog and a store want
completely different pages fetched.

Two debugging aids:

```bash
npm run classify -- https://example.com   # every type's score and evidence
npm run scan -- https://example.com       # a full scan, printed
```

`scoreSiteTypes()` exists because tuning detection by staring only at the winner
is guesswork.

---

## 9. Page discovery

`src/services/discovery.ts` answers: which pages besides the homepage are worth
fetching?

### Sitemaps

`collectSitemapUrls()` tries at most three candidates — whatever `robots.txt`
advertised via `Sitemap:` lines, then `/sitemap.xml`, then `/sitemap_index.xml` —
and stops at the first that parses. For a sitemap index it follows two children,
ranked by `childPriority()` so `product`/`post`/`article` sitemaps are preferred
over `tag`/`author`/`archive` ones.

### Selection

`selectKeyPages()` gathers candidates from four sources in order:

1. Homepage links — a URL the homepage links to is a page the site considers
   current, whereas a sitemap can be stale.
2. `url` fields on primary JSON-LD entities — for sites whose navigation is
   JavaScript-rendered but whose schema still names its pages.
3. The first 1,000 sitemap URLs.
4. **Top-up fallback**, if fewer than `limit` candidates were found: any
   plausible content page (one or two path segments, no query string, not a
   policy or listing page).

Source 4 tops up whenever the sample is short, not only when nothing matched. A
site with one matching page was otherwise judged on that single page while five
were asked for — the narrowest possible sample in exactly the case where a wide
one matters most.

A URL qualifies via `looksLikeKeyUrl()`, which rejects in order: cart, checkout,
account and asset paths (`KEY_URL_EXCLUSIONS`); bare listing pages
(`LISTING_PATHS`); policy pages (`POLICY_PATHS`, which belong to the trust
check); and for publications, anything that does not look like an article slug.

`looksLikeArticleSlug()` requires a digit, over 20 characters, or two or more
hyphens. Section indexes like `/news/national/` match the same URL shape as a
real story but carry no Article schema — sampling those and reporting "your
articles have no structured data" would be a false accusation against a newspaper
that marks up every story correctly.

### Spreading the sample

`spreadAcrossSections()` groups candidates by first path segment and takes them
round-robin — one from each section before a second from any.

Homepage links come in navigation order, so the first three are routinely three
products from one collection. A sample like that says nothing about whether the
*rest* of the site is marked up, which is the actual question.

---

## 10. The engine

`src/services/scanEngine.ts`, function `runScan()`. Order is load-bearing.

```
1  normalizeUrl(submittedUrl)          -> href, origin, domain
2  new Deadline(totalTimeoutMs)
3  fetchWithHttpFallback(href)          -> homepage    [everything depends on it]
4  fetchUrl(origin + '/robots.txt')     -> parseRobotsTxt, unless it is HTML
5  collectSitemapUrls(...)
6  detectSiteType(homepage, sitemapUrls)  or the caller's override
7  selectKeyPages(...)
8  Promise.all([ artefacts, keyPages, botProbes ])   <- the only parallel block
9  drop key pages that redirected somewhere not worth sampling
10 build ScanContext
11 run checks
12 scoreCheck() each, then totalScore()
```

**Step 4:** a `robots.txt` served as an HTML page means there is no real
`robots.txt`. `looksLikeHtml()` checks both content type and body prefix.

**Step 8** is one `Promise.all` of three groups. Agent artefacts, key pages and
crawler probes are independent; sequential round trips would eat most of the
budget on a slow host.

**Step 9:** a discontinued page often redirects to a listing or landing page.
Judging *that* page for missing schema would report a gap the site does not have.
A page that simply failed is kept, because the crawlability check needs to report
it.

**Step 11 order is deliberate:** network-free checks run first so a tight budget
costs the cheapest check rather than the most valuable one. `checkTrustSignals`
runs last and is the only check awaited, because it is the only one that may
still make requests.

### `ScanContext`

Everything the checks read, assembled once (`src/services/scanContext.ts`):

```ts
{
  submittedUrl, origin, domain,
  siteType, siteTypeConfidence, siteTypeEvidence, profile,
  homepage,            // HtmlDocument
  keyPages,            // HtmlDocument[]
  noKeyPagesFound,     // distinguishes "none exist" from "we ran out of time"
  robotsTxt, robots,
  agentArtifacts,      // key -> FetchResult
  botProbes,           // agent name -> FetchResult
  sitemapFound, sitemapUrls,
  siteName,
  deadline,
}
```

Checks receive this and return a `CheckOutcome`. They do not fetch, except
`checkTrustSignals`.

---

## 11. The checks

All live in `src/services/checks/`. Every one returns the same shape:

```ts
interface CheckOutcome {
  checkId: CheckId;
  title: string;
  status: 'pass' | 'warning' | 'fail' | 'skipped';
  details: string;              // factual, shown before unlock
  humanExplanation: string;     // plain English, gated
  generatedFix: string | null;  // gated
  generatedFixLanguage: 'robots' | 'json' | 'html' | 'markdown' | null;
  generatedFixTarget: string | null;  // where the code goes
}
```

| Check | File | What it observes |
|---|---|---|
| `bot_access` | `botAccess.ts` | robots.txt rules for 11 AI crawlers, plus live probes |
| `agent_interface` | `agentInterface.ts` | UCP / MCP / OpenAPI / llms.txt artefacts |
| `structured_data` | `structuredData.ts` | schema.org markup on the pages that matter |
| `content_structure` | `contentStructure.ts` | canonical, headings, alt text, Open Graph, dates |
| `trust_signals` | `trustSignals.ts` | policy and identity pages |
| `meta_robots` | `metaRobots.ts` | `noindex` in the meta tag **and** the `X-Robots-Tag` header |
| `crawlability` | `crawlability.ts` | response health and render mode |

### `bot_access` — the live probe

Reading robots.txt tells you what a site *says*. A CDN rule can refuse GPTBot
regardless, and the owner never finds out because crawlers do not file
complaints.

So the engine re-requests the homepage as each of `LIVE_PROBE_BOTS` (GPTBot,
ClaudeBot, PerplexityBot) plus `CONTROL_BOT`. Every string keeps the real crawler
token so user-agent rules match, and appends
`(probe by AgentReadyBot; +https://codenixlabs.com/agentready)` — we are looking
for stricter treatment than we get, not evading anything.

`CONTROL_BOT` is a Googlebot-shaped request, and it is what makes the probe
honest:

- AI bots refused, Googlebot **served** → the rule targets AI crawlers. Report a
  failure; it is now observed, not inferred.
- AI bots refused, Googlebot **also refused** → the server verifies identity by
  IP and treats the header as untrusted. We learned nothing about the real
  crawlers, so the status is `skipped`.

Without the control, every site that correctly allowlists OpenAI's IP ranges
would be told its firewall blocks ChatGPT — a false accusation landing hardest on
the sites with the best security.

### `bot_access` — housekeeping rules

Shopify ships around forty `Disallow` lines by default. Reading the spec
literally ("blocks some non-critical paths" is a warning) would cap a well-run
store at a B on its heaviest check for doing nothing wrong.

`HOUSEKEEPING_RULES` classifies cart/checkout/account paths, faceted-navigation
parameters, theme previews and platform plumbing (`/api/`, `/_next/`, `/wp-admin`
and friends) as expected. Blocked key pages fail; blocked housekeeping passes;
anything blocking real content warns.

`stripLocalePrefix()` handles multi-market stores that repeat every rule with a
locale wildcard, so `/*/cart/` is still recognised as housekeeping.

### `structured_data` — which pages get judged

```ts
const judgeSubpages = context.siteType === 'ecommerce' || context.siteType === 'content';
const candidates = judgeSubpages && context.keyPages.length ? context.keyPages : [context.homepage];
const readablePages = candidates.filter((page) => page.$ !== null && page.ok && !page.blocked);
```

For a store or publication the answer lives on individual product or article
pages. For a local business, SaaS product or unclassified site, the entity being
described is the site itself, so the homepage is correct and demanding schema on
every subpage would fail sites doing it right.

`page.$ !== null` is not enough on its own — a 403 challenge page parses
perfectly well as HTML. The question is whether we received the *real* page.

Verdict logic: no schema anywhere → `fail`. Schema present and complete on every
page → `pass`. Otherwise the union of missing fields across pages decides —
three or more missing fields, or no page carrying schema at all, is
`severelyIncomplete` and fails; one or two is a `warning`. Markup missing that
much is present but not usable, which for an agent is the same as absent.

`FAQPage` and `BreadcrumbList` are reported as opportunities and **never** affect
the verdict. A dentist with no FAQ section is not failing at anything.

### `crawlability` — three render modes

| Mode | Meaning | Advice |
|---|---|---|
| `server_rendered` | Words are in the HTML | Nothing to do |
| `payload_only` | Words are in the response, inside a JSON blob rather than tags | Usually a framework setting |
| `empty_shell` | Nothing usable arrived; JavaScript fetches it later | Needs server-side rendering |

Thresholds: under `MIN_TEXT_CHARS` (500) of visible text a 200 response is almost
certainly not carrying its content in markup; an inline state blob over
`MIN_STATE_BYTES` (3000) is the page's content rather than a config object.

Collapsing the middle case into "you need SSR" would send an owner to rebuild a
site that mostly needs its markup fixed.

The worst mode seen across all pages is reported, since that is the one costing
the site.

---

## 12. Generated fixes

`src/services/checks/schemaProfiles.ts` holds one `SchemaProfile` per site type:

```ts
interface SchemaProfile {
  accepts: (type: string) => boolean;   // lower-cased @type values that count
  label: string;                         // "Product"
  why: string;                           // one line on why it matters here
  required: SchemaField[];
  fixTarget: string;                     // where the block goes, in plain words
  buildFix: (context, page) => string;
}
```

`buildFix` scrapes real values off the visitor's own page so the output is not a
generic template:

- name — `og:title`, then the first `<h1>`, then `<title>`
- image — `og:image`
- price — `product:price:amount`, then `og:price:amount`, then
  `[itemprop="price"]`, then the first currency amount in visible text
- currency — explicit meta, else `INR` if the text contains rupee markers
- phone / email — first `tel:` and `mailto:` link on the homepage
- `sameAs` — up to five social profile links

Anything unavailable becomes `REPLACE_WITH_FIELD_NAME`, and the block is wrapped
with a comment saying so. Each fix carries `generatedFixTarget`, e.g. *"The
`<head>` section of each product page"* — a code block without a destination is
not actionable for the person who receives it.

### Field predicates

Required-field tests are deliberately tolerant of how real sites nest data:

- `isNonEmpty()` treats an object as populated when any non-`@` key is populated,
  so a bare `{"@type": "Brand"}` does **not** count as having a brand.
- `firstOffer()` unwraps `AggregateOffer` one level.
- `priceSpecs()` handles Shopify's current markup, which puts the real price in an
  *array* of `UnitPriceSpecification` objects and omits `offers.price` entirely.
  Treating that field as a single object reported "no price" on stores that
  publish one perfectly well.

Every predicate runs inside `safeTest()`. A field test must never take the scan
down over odd JSON-LD.

---

## 13. Scoring

`src/services/scoring.ts`.

```ts
const MULTIPLIER = { pass: 1, warning: 0.5, fail: 0, skipped: 0 };

const possible = outcome.status === 'skipped' ? 0 : weightsFor(siteType)[outcome.checkId];
const awarded  = possible * MULTIPLIER[outcome.status];
```

A skipped check scores **zero out of zero**. `totalScore()` then divides by the
points actually in play:

```ts
const score = Math.round((awarded / possible) * 100);
```

Scoring a skipped check as zero would mean a small site with no discoverable
subpages could not exceed 70 no matter how good it is — reporting our own blind
spot as their failure.

Grades: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, otherwise F.

Weights come from `SITE_PROFILES[siteType].weights`, not one global table. Each
row totals 100. They are a judgement, not a measurement — nobody has published
outcome data linking these signals to citation. `SCORING_VERSION` (currently
`1.2.0`) is the honest compromise: versioning does not make the weights
objective, but it makes them fixed, comparable over time, and visibly changed
when they change.

**Bump `SCORING_VERSION` whenever weights, grade boundaries or a pass/fail
threshold change.** The cache keys on it, so old scans stop being served
automatically.

`BLOCKING_CHECKS` — `bot_access`, `crawlability`, `meta_robots` — are counted
separately by `countBlockers()`. If a crawler is disallowed or a page tells search
engines to ignore it, the site is not "scoring badly"; it is invisible, and no
weighting scheme would change that.

---

## 14. Persistence

Two collections.

**`Scan`** (`src/models/Scan.ts`) stores the full result including every check's
`humanExplanation` and `generatedFix`. Both the raw score and the letter grade
are kept, because a store going 41 → 58 is progress the grade alone hides.
Indexed on `{ domain: 1, scannedAt: -1 }` for the cache lookup.

**`Lead`** (`src/models/Lead.ts`) stores the contact details plus four consent
fields, all `required` with **no defaults**:

```ts
consent:       { type: Boolean, required: true },
consentAt:     { type: Date,    required: true },
consentText:   { type: String,  required: true },
consentSource: { type: String,  required: true },
```

No defaults is the point. A default would let a lead reach the database with a
consent record nobody actually gave.

---

## 15. The gate

`src/services/scanService.ts` exposes three shapes of the same scan. The gate is
only real if the locked fields never leave the server, so stripping happens here
rather than in the client.

| | `toTeaser` | `toGatedScan` | `toFullScan` |
|---|---|---|---|
| Grade, score, summary | yes | yes | yes |
| `audit` block | yes | yes | yes |
| Checks included | first 2 | all | all |
| `details` | yes | yes | yes |
| `humanExplanation` | — | `null` | yes |
| `generatedFix` | — | `null` | yes |
| `fixesAvailable` count | yes | yes | yes |

The `audit` block ships even with the gated response:

```ts
{
  scoringVersion, weights, blockingIssues,
  pagesChecked, pagesDiscovered, renderMode, siteTypeOverridden,
  method: 'Static HTML only — no JavaScript is executed. Checks that could not be
           verified are excluded from the score rather than counted as zero.',
}
```

Withholding the methodology behind a score would undercut the one thing that
makes a number trustworthy.

`generatedFixLanguage` is left visible in the gated shape so the UI can say "we
have HTML ready for you" without revealing the code.

---

## 16. Unlock

`unlockScan` in `src/controllers/scanController.ts`:

1. `validateLeadInput()` — name length, email pattern, phone digits 8–15 after
   stripping punctuation.
2. **Consent enforced server-side.** The checkbox in the UI is the honest place
   to *ask*, but not where the rule can be kept — anything living only in the
   browser can be skipped by calling the endpoint directly:

   ```ts
   if (source.consent !== true) {
     throw new HttpError(400, 'Please tick the box so we know we may send you the report and contact you.');
   }
   ```

3. `Lead.create()` with `consentAt: new Date()` stamped **server-side**. A
   timestamp the client could set is not evidence.
4. `scan.unlocked = true`.
5. Send the report email if Resend is configured.
6. Fire the internal notification without awaiting it.

The lead is captured the moment it is saved. Email is a delivery detail — if
Resend is down or unconfigured, the visitor still gets their report on screen and
the lead is still kept, with `emailError` recorded on it.

`GET /:scanId/report` refuses to render unless `scan.unlocked` is true, otherwise
it would be a way around the gate.

---

## 17. Error handling conventions

- **Site-side problems are results, not errors.** `runScan()` throws only
  `InvalidUrlError` from normalisation, which is a problem with what the visitor
  typed. An unreachable or hostile site produces a scan with failing checks.
- `HttpError(status, message)` from `src/middleware/errorHandler.ts` carries
  user-facing text. Messages are written to be shown directly — no stack traces,
  no jargon.
- `asyncHandler()` wraps every route so a rejected promise reaches the error
  middleware.
- Anything parsing third-party data is wrapped: `safeTest()` for schema
  predicates, try/catch around each classification signal, silent catch on
  malformed JSON-LD. **One bad page must never take a scan down.**

---

## 18. Configuration

`src/config/index.ts` reads `.env`. Copy `.env.example` to `.env` — the service
will not connect to MongoDB without it.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | 5100 | |
| `MONGODB_URI` | — | Required |
| `FRONTEND_URLS` | `http://localhost:3000` | Comma-separated CORS allowlist |
| `APP_URL` | `http://localhost:$PORT` | Report link in emails; must be set in production |
| `RESEND_API_KEY` | — | Absent disables email; scans still work |
| `LEAD_NOTIFY_EMAIL` | — | Internal copy of every lead |
| `SCAN_TOTAL_TIMEOUT_MS` | 15000 | Whole-scan ceiling |
| `SCAN_REQUEST_TIMEOUT_MS` | 10000 | Per request |
| `SCAN_CACHE_HOURS` | 6 | |
| `SCAN_RATE_LIMIT_PER_HOUR` | 5 | Per IP |
| `SCAN_MAX_KEY_PAGES` | 5 | Pages beyond the homepage |
| `SCANNER_USER_AGENT` | `AgentReadyBot/1.0 (+…)` | Honest by default |

`SCAN_MAX_PRODUCT_PAGES` is still read as a fallback for the renamed
`SCAN_MAX_KEY_PAGES`. If an old `.env` sets it, **it wins** and you silently get
the old value.

`.env.example` is committed. Never put a real credential in it.

---

## 19. Running and testing

```bash
npm run dev          # ts-node-dev on 5100
npm run dev:memory   # same, without MongoDB
npm run check        # ~197 offline assertions against fixtures
npm run smoke        # 59 end-to-end assertions, needs SMOKE_MONGODB_URI
npm run scan -- <url>       # full scan, printed
npm run classify -- <url>   # site-type scores and evidence
npm run build && npm start  # tsc, then node dist/server.js
```

`npm run smoke` requires `SMOKE_MONGODB_URI` explicitly and will not fall back to
`MONGODB_URI`. It used to, and it wrote test scans and a fake lead into the
production database.

From the repo root, `npm run dev:all` starts three processes at once — Vite, the
blog server, and this service. Note that it runs this service via `dev:memory`,
so **scans are not persisted** and cache, unlock and comparison will not behave
as they do in production. Run `npm run dev` here directly when you need MongoDB.

---

## 20. Extension points

### Adding a check

1. Add the id to `CheckId` in `src/types.ts` and to the enum in
   `src/models/Scan.ts`.
2. Write `src/services/checks/yourCheck.ts` exporting a function that takes
   `ScanContext` and returns `CheckOutcome`.
3. Add a weight for it to **every** site type in `SITE_PROFILES`, keeping each
   row at 100.
4. Call it in `runScan()` and add the id to `CHECK_ORDER`.
5. Add a title case to `titleFor()`, or a timeout will report it untitled.
6. Bump `SCORING_VERSION`.
7. Add fixtures to `src/scripts/checkFixtures.ts`.

If the check makes requests, run it last, after `checkTrustSignals`.

### Adding a site type

1. Add it to `SiteType` and the enums in both models.
2. Add a `SITE_PROFILES` entry: weights totalling 100, `keyPagePatterns`,
   `keyPageLabel`, trust pages.
3. Add a `SCHEMA_PROFILES` entry with `required` fields and a `buildFix`.
4. Add an `AGENT_ARTIFACT_PATHS` entry.
5. Add classification signals to `SIGNALS`, and decide where it sits in
   `CLASSIFICATION_PRIORITY`.
6. Add it to `LLMS_TXT_ONLY_TYPES` if llms.txt is the only relevant artefact — it
   scores zero there.
7. Bump `SCORING_VERSION`.

Discovery needs no change; it reads `keyPagePatterns` from the profile.

### Changing weights

Edit `WEIGHTS` in `src/services/siteType.ts`, keep every row at 100, bump
`SCORING_VERSION`, and re-run `npm run check`. The cache invalidates itself.

---

## 21. Things that will bite you

- **`text()` concatenation.** Introduced twice. Always use
  `HtmlDocument.text()`.
- **Regex patterns stored as strings.** `trustSignals.ts` keeps topic patterns as
  strings compiled at use, after an editing tool wrote a literal `0x08` byte
  where `\b` was intended — a pattern that matched nothing and took four rounds
  to find. A fixture now asserts no control characters appear in them.
- **Ordering in `resolveStructuredData()`.** The out-of-time check must come
  *before* the homepage fallback. A store's homepage often carries a `Product`
  node for a featured item; judging that as a product page produced a confident F
  on a shop whose real product pages were fine.
- **`siteTypeOverridden` in the cache query.** Omit it and visitors get other
  people's overrides.
- **`.env.example` is committed.** Real credentials there are public the moment
  the repo is pushed.
