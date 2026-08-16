import { Router } from 'express';
import scanRoutes from './scanRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'AgentReady API is running', timestamp: new Date().toISOString() });
});

router.use('/scan', scanRoutes);

export default router;
