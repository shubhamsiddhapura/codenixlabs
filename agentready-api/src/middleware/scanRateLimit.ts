import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Spec section 7: max 5 scans per IP per hour.
 *
 * Shared between POST /api/scan and POST /api/scan/:id/compare so a visitor
 * cannot get a sixth crawl for free by routing it through the comparison
 * endpoint. Cache hits still count — the limit is about stopping the tool being
 * used as a crawler, and letting cached scans be unlimited would leak that.
 */
export const scanRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.scanner.rateLimitPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `You have reached the limit of ${config.scanner.rateLimitPerHour} scans per hour. Try again a little later, or message us and we will run it for you.`,
  },
});

export default scanRateLimit;
