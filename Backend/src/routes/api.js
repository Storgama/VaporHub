import { Router } from 'express';
import twitchRoutes from './twitchRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

/**
 * un healthcheck ça va vérifier tout les petit truc qu'on a besoin et nous faire une jolie
 * interface pour dire tout va bien ou tout est péter
 */
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Varpohub BackEnd API'});
});

/**
 * c'est pour éviter d'avoir 40 GET écrit dans le même fichier on sépare les choses
 * du coup la je dit Hey connard de express tu voi le twitchRoutes sa contient tout les route qui commencerons toute
 * par /twitch
 * ps: oublie pas fichier d'avant on a fait /api pour tout le monde donc en réalité là t'es en 
 * /api/twitch
 */
router.use('/twitch', twitchRoutes);

/**
 * routes pour l'authentification
 */
router.use('/auth', authRoutes);

export default router;