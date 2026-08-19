import dotenv from 'dotenv';

dotenv.config();

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const frontendUrls = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const config = {
  port: num(process.env.PORT, 5100),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: (process.env.APP_URL || `http://localhost:${num(process.env.PORT, 5100)}`).replace(/\/+$/, ''),
  frontendUrls,

  mongoUri: process.env.MONGODB_URI || '',

  /**
   * Where the emailed report sends someone who wants help.
   *
   * Configurable rather than written into the HTML: the number and the contact
   * page are the two things most likely to change, and hunting for them inside
   * a template is how a report ends up pointing at a disconnected line.
   */
  contact: {
    /** Digits only — wa.me rejects spaces, plus signs and dashes. */
    whatsapp: (process.env.CONTACT_WHATSAPP || '918488080162').replace(/\D/g, ''),
    url: process.env.CONTACT_URL || 'https://www.codenixlabs.com/contact',
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    // from: process.env.RESEND_FROM_EMAIL || 'noreply@codenixlabs.com',
    from: process.env.RESEND_FROM_EMAIL || 'alerts@dealspouch.com',
    // Optional internal copy of every captured lead, so a lead is not lost if 
    // nobody is watching the database.
    leadNotify: process.env.LEAD_NOTIFY_EMAIL || '',
  },

  scanner: {
    /**
     * Hard ceiling on a whole scan. The engine treats this as a deadline, not a
     * per-request timeout: every fetch gets `min(requestTimeoutMs, time left)`,
     * so a slow site degrades into a partial result instead of hanging the
     * request. Spec section 8.
     */
    /**
     * Raised from 15s on evidence. Re-scanning 91 stored domains left 24 of them
     * marked partial — a quarter of reports carrying "we ran out of time", which
     * trains people to ignore the caveat rather than read it. Real sites like
     * semrush.com and nexdigm.com genuinely need 12 seconds of network time.
     *
     * The number is a promise made on the homepage and in outreach, so changing
     * it means changing that copy too — it is not a free dial to turn.
     */
    totalTimeoutMs: num(process.env.SCAN_TOTAL_TIMEOUT_MS, 20000),
    requestTimeoutMs: num(process.env.SCAN_REQUEST_TIMEOUT_MS, 10000),
    cacheHours: num(process.env.SCAN_CACHE_HOURS, 1),
    rateLimitPerHour: num(process.env.SCAN_RATE_LIMIT_PER_HOUR, 5),
    /**
     * How many pages beyond the homepage to sample. The spec said 3; 5 is the
     * most the 15-second budget absorbs comfortably, since they are fetched in
     * parallel, and a wider sample is the single cheapest way to make the
     * structured-data verdict less of a guess about the rest of the site.
     */
    maxKeyPages: num(process.env.SCAN_MAX_KEY_PAGES || process.env.SCAN_MAX_PRODUCT_PAGES, 5),
    /**
     * We identify ourselves honestly. Some stores will 403 an unknown bot; that
     * is a real finding for the shop owner (Check 6 reports it), not something
     * to route around by claiming to be Chrome.
     */
    userAgent:
      process.env.SCANNER_USER_AGENT ||
      'AgentReadyBot/1.0 (+https://codenixlabs.com/agentready)',
  },
};

export default config;
