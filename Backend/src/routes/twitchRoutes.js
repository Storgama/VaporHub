import { Router } from 'express';
import { getStreamStats } from '../controllers/twitchController.js';

const router = Router();

/**
 * du coup voila notre premier route
 * en gros ici en URL tu auras localhost ou ton nom de domain genre www.jetepiseaucul.com /api/twitch/stats
 * et getStreamStats c'est ce qui contient ce quon va retour ça s'appel un controller en dev c'est l'action en gros
 *
 */
router.get('/stats', getStreamStats);

export default router;