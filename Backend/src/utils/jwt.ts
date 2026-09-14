import jwt, { type JwtPayload as BaseJwtPayload, type SignOptions } from 'jsonwebtoken';

export interface TokenPayload extends BaseJwtPayload {
    userId: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Génère l'Access Token (durée courte, ex: 15m)
 */
export function generateAccessToken(payload: string | Buffer | object): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET manquant dans l\'environnement');
    }
    const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Génère le Refresh Token (durée longue, ex: 7j)
 */
export function generateRefreshToken(payload: string | Buffer | object): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET manquant dans l\'environnement');
    }
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Vérifie et décode l'Access Token
 * Renvoie le payload décodé ou lève une erreur si expiré/invalide
 */
export function verifyAccessToken(token: string): TokenPayload {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET manquant dans l\'environnement');
    }
    return jwt.verify(token, secret) as TokenPayload;
}

/**
 * Vérifie et décode le Refresh Token
 */
export function verifyRefreshToken(token: string): TokenPayload {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET manquant dans l\'environnement');
    }
    return jwt.verify(token, secret) as TokenPayload;
}

