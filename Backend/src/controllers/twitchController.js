import { eq, and } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_URL = 'https://api.twitch.tv/helix';

/**
 * Helper : Vérifie la validité du token Twitch et le renouvelle si expiré
 */
async function getValidTwitchAccessToken(tokenRecord) {
    const now = new Date();
    // On prend une marge de sécurité de 5 minutes avant expiration réelle
    const isExpired = !tokenRecord.expiresAt || (new Date(tokenRecord.expiresAt).getTime() - 5 * 60 * 1000) < now.getTime();

    // 1. Si le token est encore bon, on le déchiffre et on le renvoie
    if (!isExpired) {
        return decrypt(tokenRecord.accessToken);
    }

    // 2. Si le token est expiré, on utilise le Refresh Token
    try {
        const decryptedRefreshToken = decrypt(tokenRecord.refreshToken);

        const refreshParams = new URLSearchParams({
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken
        });

        const res = await fetch(TWITCH_TOKEN_URL, {
            method: 'POST',
            body: refreshParams
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Échec du refresh token Twitch :', data);
            return null;
        }

        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

        // Mise à jour des nouveaux tokens chiffrés en BDD
        await db.update(oauthTokens).set({
            accessToken: encrypt(data.access_token),
            refreshToken: encrypt(data.refresh_token),
            expiresAt: newExpiresAt,
            updatedAt: new Date()
        }).where(eq(oauthTokens.id, tokenRecord.id));

        return data.access_token;
    } catch (err) {
        console.error('Erreur lors du refresh token Twitch :', err);
        return null;
    }
}

/**
 * 1. Redirection vers Twitch OAuth
 */
export async function getTwitchAuthUrl(req, res, next) {
    try {
        const scopes = [
            'user:read:email',
            'channel:read:stream_key'
        ].join(' ');

        const authUrl = `${TWITCH_AUTH_URL}?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.TWITCH_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${req.user.userId}`;
        
        res.json({ url: authUrl });
    } catch (error) {
        next(error);
    }
}

/**
 * 2. Callback OAuth Twitch
 */
export async function twitchCallback(req, res, next) {
    try {
        const { code, state: userId, error } = req.query;

        if (error || !code) {
            return res.redirect('http://localhost:5173/?error=twitch_denied');
        }

        const tokenParams = new URLSearchParams({
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.TWITCH_REDIRECT_URI
        });

        const tokenRes = await fetch(TWITCH_TOKEN_URL, {
            method: 'POST',
            body: tokenParams
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            return res.redirect('http://localhost:5173/?error=twitch_token_failed');
        }

        const userRes = await fetch(`${TWITCH_HELIX_URL}/users`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userRes.json();
        const twitchUser = userData.data[0];

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
        const [existing] = await db.select().from(oauthTokens).where(
            and(
                eq(oauthTokens.userId, userId),
                eq(oauthTokens.provider, 'twitch')
            )
        );

        if (existing) {
            await db.update(oauthTokens).set({
                providerAccountId: twitchUser.id,
                accessToken: encrypt(tokenData.access_token),
                refreshToken: encrypt(tokenData.refresh_token),
                expiresAt,
                scope: tokenData.scope ? tokenData.scope.join(' ') : '',
                updatedAt: new Date()
            }).where(eq(oauthTokens.id, existing.id));
        } else {
            await db.insert(oauthTokens).values({
                userId,
                provider: 'twitch',
                providerAccountId: twitchUser.id,
                accessToken: encrypt(tokenData.access_token),
                refreshToken: encrypt(tokenData.refresh_token),
                expiresAt,
                scope: tokenData.scope ? tokenData.scope.join(' ') : ''
            });
        }

        res.redirect('http://localhost:5173/?twitch_linked=true');
    } catch (error) {
        next(error);
    }
}

/**
 * 3. Récupération des données enrichies du live et profil
 */
export async function getLiveStatus(req, res, next) {
    try {
        const userId = req.user.userId;

        // 1. Récupérer l'enregistrement du token en BDD
        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(
                eq(oauthTokens.userId, userId),
                eq(oauthTokens.provider, 'twitch')
            )
        );

        if (!tokenRecord) {
            return res.json({
                linked: false,
                message: 'Aucun compte Twitch lié'
            });
        }

        // 2. Obtenir un Access Token VALIDE (auto-rafraîchi si expiré)
        const validAccessToken = await getValidTwitchAccessToken(tokenRecord);

        if (!validAccessToken) {
            return res.json({
                linked: false,
                message: 'Connexion Twitch expirée. Veuillez relier votre compte.'
            });
        }

        // 3. Récupérer les informations de profil (Avatar, Pseudo)
        const userRes = await fetch(`${TWITCH_HELIX_URL}/users?id=${tokenRecord.providerAccountId}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${validAccessToken}`
            }
        });

        const userData = await userRes.json();
        const twitchUser = userData.data && userData.data[0] ? userData.data[0] : null;

        if (!twitchUser) {
            return res.status(404).json({ error: 'Utilisateur Twitch introuvable' });
        }

        // 4. Vérifier le direct (Streams)
        const streamRes = await fetch(`${TWITCH_HELIX_URL}/streams?user_id=${tokenRecord.providerAccountId}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${validAccessToken}`
            }
        });

        const streamData = await streamRes.json();

        // En Live 🔴
        if (streamData.data && streamData.data.length > 0) {
            const stream = streamData.data[0];
            return res.json({
                linked: true,
                channel: twitchUser.display_name,
                avatar: twitchUser.profile_image_url,
                isLive: true,
                title: stream.title,
                game: stream.game_name,
                viewerCount: stream.viewer_count,
                startedAt: stream.started_at,
                thumbnailUrl: stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180')
            });
        }

        // Hors ligne ⚪
        res.json({
            linked: true,
            channel: twitchUser.display_name,
            avatar: twitchUser.profile_image_url,
            isLive: false,
            viewerCount: 0
        });

    } catch (error) {
        next(error);
    }
}