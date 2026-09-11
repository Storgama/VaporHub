import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

/**
 * 1. Limiteur Authentification (Anti-Brute Force)
 * Bloque l'IP après 5 tentatives pendant 15 minutes
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 requêtes max par fenêtre de 15 min
    standardHeaders: 'draft-7', // En-têtes RateLimit-* conformes IETF
    legacyHeaders: false,
    statusCode: 429,
    message: {
        error: 'Trop de tentatives de connexion depuis cette adresse IP. Veuillez réessayer dans 15 minutes.'
    }
});

/**
 * 2. Limiteur Global API (Protection Anti-DoS)
 * 100 requêtes max par tranche de 15 minutes par IP
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    statusCode: 429,
    message: {
        error: "Trop de requêtes envoyées à l'API. Ralentissez un instant."
    }
});

