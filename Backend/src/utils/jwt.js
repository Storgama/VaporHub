import jwt from 'jsonwebtoken';

/**
 * Génère l'access token
 * @param { json } payload = les info minimal de l'utilisateur genre sont ID et sont role 
 * @returns 
 */
export function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    });
}

/**
 * Génère le Refresh Token
 * @param { json } payload 
 * @returns 
 */
export function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
}

/**
 * Vérifie et décode l'Access Token
 * Renvoie le payload décodé ou lève une erreur si expiré/invalide
 * @param { tokenAccess } token 
 * @returns 
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

/**
 * Vérifie et décode le Refresh Token
 * @param { tokenAccess } token 
 * @returns 
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}