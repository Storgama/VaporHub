import { eq } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { users, refreshTokens } from '../db/schemas/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

/**
 * Permet l'inscription d'un utilisateur
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export async function register(req, res, next) {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'les champs email, username, password sont requis'})
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
        }

        const existingMail = await db.select().from(users).where(eq(users.email, email));

        if (existingMail.length > 0) {
            return res.status(409).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hacher le mot de passe avec Argon2id
        const hashedPassword = await hashPassword(password);

        // Insérer le nouvel utilisateur
        const [newUser] = await db.insert(users).values({
            email,
            username,
            password: hashedPassword
        }).returning(
            { 
                id: users.id, 
                email: users.email, 
                username: users.username, 
                role: users.role 
            }
        );
        
        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: newUser
        });
    } catch (error) {
        next(error);
    }
}

/**
 * connect l'utilisateur
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export async function login(req, res, next) {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        // Récupérer l'utilisateur
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await verifyPassword(user.password, password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Créer les tokens
        const accessToken = generateAccessToken({ userId: user.id, role: user.role });

        const refreshToken = generateRefreshToken({ userId: user.id });

        // Calculer l'expiration du Refresh Token (7 jours en millisecondes)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Sauvegarder le Refresh Token en BDD
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: refreshToken,
            expiresAt
        });

        res.json({
            message: 'Connexion réussie',
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            accessToken,
            refreshToken
        });

    } catch (error) {
        next(error);
    }
}

/**
 * refresh le token de connexion
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export async function refresh(req, res, next) {
    try {

        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh Token manquant' });
        }

        // 1. Vérifier la signature JWT du token
        let decoded;

        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (err) {
            return res.status(401).json({ error: 'Refresh Token invalide ou expiré' });
        }

        // 2. Vérifier s'il existe toujours en BDD
        const [storedToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, refreshToken));
        
        if (!storedToken) {
            return res.status(403).json({ error: 'Session révoquée ou inexistante' });
        }

        // 3. Récupérer l'utilisateur pour rafraîchir son rôle
        const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        // 4. Générer un nouvel Access Token
        const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
        
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        next(error);
    }
}

/**
 * déco l'utilisateur et détruit sont token pour la sécuriter
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export async function logout(req, res, next) {
    try {

        const { refreshToken } = req.body;

        if (refreshToken) {
            // Supprimer le token de la BDD pour invalider la session
            await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
        }

        res.json({ message: 'Déconnexion réussie' });

    } catch (error) {
        next(error);
    }

}