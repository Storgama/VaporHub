import { Router } from 'express';
import twitchRoutes from './twitchRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Varpohub BackEnd API'});
});

router.use('/twitch', twitchRoutes);

export default router;