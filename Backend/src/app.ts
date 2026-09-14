import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { runHealthCheck } from './utils/healthcheck.js';

const app: Application = express();

/**
 * 1. Sécurité des en-têtes HTTP
 * Supprime X-Powered-By, active HSTS, CSP, X-Frame-Options, etc.
 */
app.use(helmet());

/**
 * 2. Restriction CORS
 * N'autorise que notre Frontend officiel à communiquer avec l'API
 */
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

/**
 * Route de santé du système
 */
app.get('/health', async (req: Request, res: Response): Promise<void> => {
    const health = await runHealthCheck();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

/**
 * Standard security.txt (RFC 9116)
 * Totalement configurable via SECURITY_CONTACT
 */
app.get('/.well-known/security.txt', (req: Request, res: Response): void => {
    const contact = process.env.SECURITY_CONTACT || 'mailto:contact@vaporhub.app';
    res.type('text/plain');
    res.send(`Contact: ${contact} Expires: 2027-12-31T23:59:59.000Z Preferred-Languages: fr, en`);
});

/**
 * Routes API
 */
app.use('/api', apiRouter);

/**
 * Gestion 404
 */
app.use((req: Request, res: Response): void => {
    res.status(404).json({ error: 'Route non trouvée sur Vaporhub API' });
});

/**
 * Gestionnaire d'erreurs
 */
app.use(errorHandler);

export default app;