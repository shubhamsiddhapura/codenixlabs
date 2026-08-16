import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { scanRateLimit } from '../middleware/scanRateLimit';
import {
  compareScan,
  createScan,
  diffScans,
  getScan,
  getStats,
  getScanHistory,
  getScanReport,
  unlockScan,
} from '../controllers/scanController';

const router = Router();

// The two routes that can trigger a crawl share the 5-per-IP-per-hour limit.
router.post('/', scanRateLimit, asyncHandler(createScan));
router.post('/:scanId/compare', scanRateLimit, asyncHandler(compareScan));

// Declared before '/:scanId', or Express matches "stats" as a scan id and the
// request dies as an invalid ObjectId.
router.get('/stats', asyncHandler(getStats));

router.get('/:scanId', asyncHandler(getScan));
router.post('/:scanId/unlock', asyncHandler(unlockScan));
router.get('/:scanId/report', asyncHandler(getScanReport));

// Reading back scans we already stored — no crawl, so no rate limit.
router.get('/:scanId/history', asyncHandler(getScanHistory));
router.get('/:scanId/diff/:otherScanId', asyncHandler(diffScans));

export default router;
