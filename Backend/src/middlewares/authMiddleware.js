import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Accès refusé : Token d\'authentification manquant' });
        }

        // Extraire la chaîne du token après "Bearer "
        const token = authHeader.split(' ')[1];

        // Vérifier et décoder le token
        const decoded = verifyAccessToken(token);

        // Injecter les données de l'utilisateur dans l'objet req
        req.user = decoded;

        next();

    } catch (error) {

        return res.status(403).json({ error: 'Token invalide ou expiré' });

    }
}