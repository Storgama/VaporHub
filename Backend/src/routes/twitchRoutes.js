import { Router } from 'express';
import { getTwitchAuthUrl, twitchCallback, getLiveStatus } from '../controllers/twitchController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// 1. Obtenir l'URL de connexion Twitch (protégé)
router.get('/auth', requireAuth, getTwitchAuthUrl);

// 2. Callback de retour Twitch (public : Twitch redirige ici)
router.get('/callback', twitchCallback);

// 3. Stats en direct (protégé)
router.get('/live', requireAuth, getLiveStatus);

export default router;