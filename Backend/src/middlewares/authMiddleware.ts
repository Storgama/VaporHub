import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt.js';

export interface AuthenticatedUserPayload extends JwtPayload {
    userId: string;
    role?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUserPayload;
}

/**
 * Middleware Express : vérifie la validité du JWT dans Authorization: Bearer <token>
 * Injecte req.user avec le payload décodé ou renvoie 401 / 403
 */
export function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void | Response {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Accès refusé : Token d\'authentification manquant' });
        }

        // Extraire la chaîne du token après "Bearer "
        const token = authHeader.split(' ')[1];

        // Vérifier et décoder le token JWT
        const decoded = verifyAccessToken(token) as unknown as AuthenticatedUserPayload;

        // Injecter les données de l'utilisateur dans l'objet req
        (req as AuthenticatedRequest).user = decoded;

        return next();
    } catch {
        return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
}

