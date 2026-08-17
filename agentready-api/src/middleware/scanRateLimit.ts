import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Which visitor is this?
 *
 * `req.ip` is the obvious answer and it was the wrong one in production. Behind
 * Render's proxy, Express could not recover a client address from the hop count
 * it had been given and fell back to the *connection* address — Render's own
 * load balancer, identical for every request on earth. Every visitor hashed to
 * the same key, so the whole world shared a single allowance of ten scans an
 * hour. One person exhausted it and everybody else was locked out, with no
 * error anywhere to say why.
 *
 * It cannot be caught locally: two machines on a desk have two addresses and
 * the bug does not exist until something sits in front of the app.
 *
 * So read the forwarded chain directly. The leftmost entry is the original
 * client — every proxy appends, so the address furthest left is the one that
 * started the request.
 *
 * On spoofing: a caller can put whatever they like in `X-Forwarded-For`, so a
 * determined abuser can rotate this key. That is an accepted trade. This limit
 * exists to stop the tool being used as a crawler, not to defend a secret, and
 * a limit that is bypassable by the determined beats one that is broken for
 * everyone. The real protection is that a scan costs us almost nothing and the
 * cache absorbs repeats.
 */
function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const client = chain?.split(',')[0]?.trim();
  // Fall back to whatever Express worked out. Wrong in production, but better
  // than an empty key, which would put everyone in one bucket again.
  return client || req.ip || 'unknown';
}

/**
 * Spec section 7: max 5 scans per IP per hour (10 in the current deployment).
 *
 * Shared between POST /api/scan and POST /api/scan/:id/compare so a visitor
 * cannot get an extra crawl for free by routing it through the comparison
 * endpoint.
 *
 * Cached responses still count against the allowance, which is a known
 * unfairness: a visitor who gets a cached result and then presses "Scan again
 * now" spends two of their ten for one actual crawl. It is left alone
 * deliberately — this middleware runs *before* the handler, so at the moment it
 * decides, nobody knows yet whether the result will come from cache. Fixing it
 * needs the counter decremented after the fact, which is a bigger change than
 * the bug it corrects.
 */
export const scanRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.scanner.rateLimitPerHour,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `You have reached the limit of ${config.scanner.rateLimitPerHour} scans per hour. Try again a little later, or message us and we will run it for you.`,
  },
});

export default scanRateLimit;
