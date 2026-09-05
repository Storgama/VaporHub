import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption.js';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_URL = 'https://api.twitch.tv/helix';

/**
 * Génère l'URL d'autorisation OAuth Twitch
 */
export function buildAuthUrl(userId) {
    const scopes = ['user:read:email', 'channel:read:stream_key', 'channel:read:ads'].join(' ');
    return `${TWITCH_AUTH_URL}?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.TWITCH_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${userId}`;
}

/**
 * Échange le code temporaire contre des tokens d'accès
 */
export async function exchangeCodeForTokens(code) {
    const tokenParams = new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI
    });

    const res = await fetch(TWITCH_TOKEN_URL, { 
        method: 'POST', 
        body: tokenParams,
        signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Échec échange code Twitch');
    return data;
}

/**
 * Vérifie et rafraîchit automatiquement le token Twitch si expiré
 */
export async function getValidAccessToken(tokenRecord) {
    const now = new Date();
    const isExpired = !tokenRecord.expiresAt || (new Date(tokenRecord.expiresAt).getTime() - 5 * 60 * 1000) < now.getTime();

    if (!isExpired) {
        return decrypt(tokenRecord.accessToken);
    }

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
            body: refreshParams,
            signal: AbortSignal.timeout(5000) 
        });
        const data = await res.json();
        if (!res.ok) return null;

        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

        await db.update(oauthTokens).set({
            accessToken: encrypt(data.access_token),
            refreshToken: encrypt(data.refresh_token),
            expiresAt: newExpiresAt,
            updatedAt: new Date()
        }).where(eq(oauthTokens.id, tokenRecord.id));

        return data.access_token;
    } catch {
        return null;
    }
}

/**
 * Récupère le profil utilisateur Twitch (Avatar, Pseudo)
 */
export async function fetchUserProfile(twitchAccountId, accessToken) {

    const url = twitchAccountId ? `${TWITCH_HELIX_URL}/users?id=${twitchAccountId}` : `${TWITCH_HELIX_URL}/users`;

    const res = await fetch(url, {
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        },
        signal: AbortSignal.timeout(5000)
    });
    
    const data = await res.json();
    return data.data && data.data[0] ? data.data[0] : null;
}

/**
 * Vérifie si la chaîne est en direct
 */
export async function fetchLiveStream(twitchAccountId, accessToken) {
    const res = await fetch(`${TWITCH_HELIX_URL}/streams?user_id=${twitchAccountId}`, {
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        },
        signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
}

/**
 * Récupère le calendrier publicitaire officiel (prochaine pub, durée, temps sans pré-roll)
 */
export async function fetchAdSchedule(broadcasterId, accessToken) {
    try {
        const res = await fetch(`${TWITCH_HELIX_URL}/channels/ads?broadcaster_id=${broadcasterId}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data && data.data[0] ? data.data[0] : null;
    } catch {
        return null;
    }
}