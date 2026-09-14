import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { commercialSchema, raidSchema } from '../validators/twitchActionValidator.js';
import * as twitchController from '../controllers/twitchController.js';

const router: Router = Router();

router.get('/auth', requireAuth, twitchController.getTwitchAuthUrl);
router.get('/callback', twitchController.twitchCallback);
router.get('/current', requireAuth, twitchController.getCurrentLiveStatus);
router.get('/history', requireAuth, twitchController.getStreamHistory);
router.get('/history/:sessionId', requireAuth, twitchController.getStreamMetrics);
router.get('/analytics/summary', requireAuth, twitchController.getAnalyticsSummary);
router.get('/analytics/breakdown', requireAuth, twitchController.getAnalyticsBreakdown);
router.get('/ads', requireAuth, twitchController.getTwitchAdSchedule);

// Actions Rapides de Streamer (Pubs, Raids, Snooze)
router.post('/actions/commercial', requireAuth, validate(commercialSchema), twitchController.triggerCommercial);
router.post('/actions/raid', requireAuth, validate(raidSchema), twitchController.startRaid);
router.delete('/actions/raid', requireAuth, twitchController.cancelRaid);
router.post('/actions/ads/snooze', requireAuth, twitchController.snoozeAd);

export default router;

