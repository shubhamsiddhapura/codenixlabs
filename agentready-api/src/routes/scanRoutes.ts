import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { scanRateLimit } from '../middleware/scanRateLimit';
import {
  compareScan,
  createScan,
  getScan,
  getScanReport,
  unlockScan,
} from '../controllers/scanController';

const router = Router();

// The two routes that can trigger a crawl share the 5-per-IP-per-hour limit.
router.post('/', scanRateLimit, asyncHandler(createScan));
router.post('/:scanId/compare', scanRateLimit, asyncHandler(compareScan));

router.get('/:scanId', asyncHandler(getScan));
router.post('/:scanId/unlock', asyncHandler(unlockScan));
router.get('/:scanId/report', asyncHandler(getScanReport));

export default router;
