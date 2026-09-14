import { Router, type Request, type Response } from 'express';
import twitchRoutes from './twitchRoutes.js';
import authRoutes from './authRoutes.js';

const router: Router = Router();

/**
 * Ping de santé interne de l'API
 */
router.get('/health', (req: Request, res: Response): void => {
    res.json({ status: 'ok', service: 'Varpohub BackEnd API' });
});

router.use('/twitch', twitchRoutes);
router.use('/auth', authRoutes);

export default router;

