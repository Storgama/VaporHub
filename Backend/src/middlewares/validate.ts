import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Middleware de validation et d'assainissement strict Zero Trust (Zod).
 * Valide req.body et transmet les anomalies d'infrastructure à errorHandler.
 */
export function validate<T = unknown>(schema?: ZodType<T>): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!schema || typeof schema.safeParse !== 'function') {
            next(new Error('Schéma de validation manquant ou invalide'));
            return;
        }

        if (req.body === undefined || req.body === null) {
            res.status(400).json({ error: 'Corps de requête manquant ou indéfini' });
            return;
        }

        const result = typeof schema.safeParseAsync === 'function'
            ? await schema.safeParseAsync(req.body)
            : schema.safeParse(req.body);

        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Données invalides';
            res.status(400).json({ error: firstError });
            return;
        }

        // Remplace le body par les données typées, assainies et nettoyées (allowlist stricte)
        req.body = result.data;
        next();
    };
}

