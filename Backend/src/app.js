import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { runHealthCheck } from './utils/healthcheck.js'

const app = express();

/**
 * On ajoute ce qu'on appel des middleware c'est pour nous simplifier la vie ça
 * en gros toute requete que tu ferra passera pas ces middlewares
 */
app.use(cors()); // Autorise les requêtes depuis ton futur Frontend
app.use(express.json()); // Parse les JSON en gros tu passe d'un gros boublibouga a ça {piou => proute}

/**
 * Route Pour obtenir le résultat de check du système global
 */
app.get('/health', async (req, res) => {
    const health = await runHealthCheck();
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
});

/**
 * Ajout des Route (les URL pour dire ce qu'on réponds)
 * Le '/api' c'est par ce j'ai la flemme de le mettre a chaque route donc il sera par défault
 */
app.use('/api', apiRouter);

/**
 * ça c'est jsute un backup si la route existe pas
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée sur Vaporhub API' });
});

/**
 * ça c'est pour nous afficher tout les erreurs durant la période de dev pour l'instant on va le laisser 
 * actif quoi qu'il arrive
 */
app.use(errorHandler);

export default app;