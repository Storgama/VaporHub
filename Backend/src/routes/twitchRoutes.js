import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import * as twitchController from '../controllers/twitchController.js';

const router = Router();

router.get('/auth', requireAuth, twitchController.getTwitchAuthUrl);
router.get('/callback', twitchController.twitchCallback);
router.get('/current', requireAuth, twitchController.getCurrentLiveStatus);
router.get('/history', requireAuth, twitchController.getStreamHistory);
router.get('/history/:sessionId', requireAuth, twitchController.getStreamMetrics);
router.get('/analytics/summary', requireAuth, twitchController.getAnalyticsSummary);

export default router;