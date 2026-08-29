import { eq, and } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_URL = 'https://api.twitch.tv/helix';

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

export async function twitchCallback(req, res, next) {
    try {
        const { code, state: userId, error} = req.query;

        if (error || !code) {
            //@TODO voir pour rendre url non static
            return res.redirect('http://localhost:5173/?error=twitch_denied')
        }

        // Échanger le code contre les tokens d'accès Twitch
        const tokenParams = new URLSearchParams({
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.TWITCH_REDIRECT_URI
        });

        //contacte Twitch
        const tokenRes = await fetch(TWITCH_TOKEN_URL, {
            method: 'POST',
            body: tokenParams
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            //@TODO voir a rendre URL non static
            return res.redirect('http://localhost:5173/?error=twitch_token_failed');
        }

        //Recup info user depuis twitch
        const userRes = await fetch(`${TWITCH_HELIX_URL}/users`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userRes.json();

        const twitchUser = userData.data[0];

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
        // Vérifier si un token Twitch existe déjà pour cet user
        const [existing] = await db.select().from(oauthTokens).where(
            and(
                eq(oauthTokens.userId, userId),
                eq(oauthTokens.provider, 'twitch')
            )
        );

        if (existing) {
            // Mise à jour
            await db.update(oauthTokens).set({
                providerAccountId: twitchUser.id,
                accessToken: encrypt(tokenData.access_token),
                refreshToken: encrypt(tokenData.refresh_token),
                expiresAt,
                scope: tokenData.scope ? tokenData.scope.join(' ') : '',
                updatedAt: new Date()
            }).where(eq(oauthTokens.id, existing.id));
        } else {
            // Insertion
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

        // Rediriger le créateur vers le Frontend avec confirmation
        //@TODO voir pour rendre url non static
        res.redirect('http://localhost:5173/?twitch_linked=true');

    } catch (error) {
        next(error);
    }
}

export async function getLiveStatus(req, res, next) {
    try {
        const userId = req.user.userId;

        // Récupérer le token Twitch du créateur en BDD
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

        const decryptedAccessToken = decrypt(tokenRecord.accessToken);

        // Appeler l'API Helix pour vérifier si le stream est en live
        const streamRes = await fetch(`${TWITCH_HELIX_URL}/streams?user_id=${tokenRecord.providerAccountId}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${decryptedAccessToken}`
            }
        });

        const streamData = await streamRes.json();

        // Si le tableau data n'est pas vide -> La chaîne est en live !
        if (streamData.data && streamData.data.length > 0) {
            const stream = streamData.data[0];
            return res.json({
                linked: true,
                channel: stream.user_name,
                isLive: true,
                title: stream.title,
                game: stream.game_name,
                viewerCount: stream.viewer_count,
                startedAt: stream.started_at
            });
        }

        // Sinon, la chaîne est hors ligne : on récupère juste le nom de la chaîne
        const userRes = await fetch(`${TWITCH_HELIX_URL}/users?id=${tokenRecord.providerAccountId}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${decryptedAccessToken}`
            }
        });

        const userData = await userRes.json();

        const channelName = userData.data && userData.data[0] ? userData.data[0].display_name : 'Inconnu';
        
        res.json({
            linked: true,
            channel: channelName,
            isLive: false,
            viewerCount: 0
        });

    } catch (error) {
        next(error);
    }
}