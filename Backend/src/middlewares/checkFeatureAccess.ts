import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware V1 : Laisse tout passer.
 * Préparation pour la vérification des accès et abonnements (Feature Flags)
 */
export function checkFeatureAccess(featureName?: string) {
    return async (
        _req: Request,
        _res: Response,
        next: NextFunction
    ): Promise<void | Response> => {
        // V1 : Accès libre pour tout le monde
        const isAllowed = true;

        if (!isAllowed) {
            return _res.status(403).json({ error: `Accès refusé à la fonctionnalité : ${featureName || 'inconnue'}` });
        }

        return next();
    };
}

