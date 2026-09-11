import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import type { JwtPayload } from 'jsonwebtoken';
import { db } from '../db/initBdd.js';
import { users, refreshTokens } from '../db/schemas/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

interface RegisterBody {
    email?: string;
    username?: string;
    password?: string;
}

interface LoginBody {
    email?: string;
    password?: string;
}

interface TokenBody {
    refreshToken?: string;
}

interface TokenPayload extends JwtPayload {
    userId: string;
    role?: string;
}

/**
 * Permet l'inscription d'un utilisateur et connecte automatiquement
 */
export async function register(
    req: Request<unknown, unknown, RegisterBody>,
    res: Response,
    next: NextFunction
): Promise<void | Response> {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'les champs email, username, password sont requis' });
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
        }).returning({ 
            id: users.id, 
            email: users.email, 
            username: users.username, 
            role: users.role 
        });

        // Générer les tokens JWT (Access 15 min + Refresh 7 j)
        const accessToken = generateAccessToken({ userId: newUser.id, role: newUser.role });
        const refreshToken = generateRefreshToken({ userId: newUser.id });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Sauvegarder le Refresh Token en BDD
        await db.insert(refreshTokens).values({
            userId: newUser.id,
            token: refreshToken,
            expiresAt
        });

        return res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: newUser,
            accessToken,
            refreshToken
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Connecte l'utilisateur
 */
export async function login(
    req: Request<unknown, unknown, LoginBody>,
    res: Response,
    next: NextFunction
): Promise<void | Response> {
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

        // Vérifier le mot de passe via Argon2id
        const isPasswordValid = await verifyPassword(user.password, password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Créer les tokens
        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id });

        // Calculer l'expiration du Refresh Token (7 jours)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Sauvegarder le Refresh Token en BDD
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: refreshToken,
            expiresAt
        });

        return res.status(200).json({
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
 * Rafraîchit le token d'accès
 */
export async function refresh(
    req: Request<unknown, unknown, TokenBody>,
    res: Response,
    next: NextFunction
): Promise<void | Response> {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh Token manquant' });
        }

        // 1. Vérifier la signature JWT du token
        let decoded: TokenPayload;

        try {
            decoded = verifyRefreshToken(refreshToken) as unknown as TokenPayload;
        } catch {
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
        
        return res.status(200).json({ accessToken: newAccessToken });

    } catch (error) {
        next(error);
    }
}

/**
 * Déconnecte l'utilisateur et révoque son token
 */
export async function logout(
    req: Request<unknown, unknown, TokenBody>,
    res: Response,
    next: NextFunction
): Promise<void | Response> {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Supprimer le token de la BDD pour invalider la session
            await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
        }

        return res.json({ message: 'Déconnexion réussie' });

    } catch (error) {
        next(error);
    }
}
