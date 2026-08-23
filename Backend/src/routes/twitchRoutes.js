import { Router } from 'express';
import { getStreamStats } from '../controllers/twitchController.js';

const router = Router();

router.get('/stats', getStreamStats);

export default router;