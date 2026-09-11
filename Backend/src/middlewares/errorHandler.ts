import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CustomError {
    message?: string;
    stack?: string;
    status?: number;
    statusCode?: number;
}

/**
 * Middleware de gestion globale des erreurs Express
 * 4 arguments obligatoires pour qu'Express le traite comme ErrorHandler
 */
export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Si les en-têtes HTTP ont déjà été envoyés au client, déléguer au gestionnaire par défaut d'Express
    if (res.headersSent) {
        return _next(err);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();

    const errorObj = (typeof err === 'object' && err !== null ? err : {}) as CustomError;
    const status = Number(errorObj.status || errorObj.statusCode) || 500;
    const rawMessage = typeof err === 'string' ? err : (errorObj.message || 'Une erreur est survenue');
    const stack = errorObj.stack || (err instanceof Error ? err.stack : undefined);

    // En production : génération d'un incident ID hexadécimal à 8 caractères pour corrélation
    const errorId = isProd ? crypto.randomBytes(4).toString('hex') : undefined;

    // Log serveur structuré au format JSON pour les outils de monitoring
    console.error({
        error: '[Error Handler]:',
        errorId,
        timestamp,
        stack
    });

    if (isProd) {
        res.status(status).json({
            error: {
                message: status === 500 ? 'Erreur interne du serveur' : rawMessage,
                status,
                errorId,
                timestamp
            }
        });
    } else {
        res.status(status).json({
            error: {
                message: rawMessage,
                status,
                stack
            }
        });
    }
};

