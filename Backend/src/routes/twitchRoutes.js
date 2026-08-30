import { Router } from 'express';
import { 
    getTwitchAuthUrl, 
    twitchCallback, 
    getCurrentLiveStatus,
    getStreamHistory,
    getStreamMetrics
} from '../controllers/twitchController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Connexion OAuth
router.get('/auth', requireAuth, getTwitchAuthUrl);
router.get('/callback', twitchCallback);

// Direct
router.get('/current', requireAuth, getCurrentLiveStatus);

// Historique & Graphiques
router.get('/history', requireAuth, getStreamHistory);
router.get('/history/:sessionId', requireAuth, getStreamMetrics);

export default router;