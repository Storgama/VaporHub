import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption.js';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_URL = 'https://api.twitch.tv/helix';

export interface TwitchTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string[];
    token_type?: string;
}

export interface TwitchUserProfile {
    id?: string;
    login?: string;
    display_name?: string;
    type?: string;
    broadcaster_type?: string;
    description?: string;
    profile_image_url?: string;
    offline_image_url?: string;
    view_count?: number;
    email?: string;
    created_at?: string;
    [key: string]: unknown;
}

export interface LiveStreamItem {
    id: string;
    user_id?: string;
    user_login?: string;
    user_name?: string;
    game_id?: string;
    game_name: string;
    type?: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language?: string;
    thumbnail_url?: string;
    tag_ids?: string[];
    tags?: string[];
    is_mature?: boolean;
    [key: string]: unknown;
}

export interface TwitchAdSchedule {
    snooze_count: number;
    snooze_refresh_at: number;
    next_ad_at: number;
    duration: number;
    preroll_free_time: number;
    last_ad_at: number;
    [key: string]: unknown;
}

export interface OAuthTokenRecord {
    id?: string;
    userId?: string;
    provider?: string;
    providerAccountId?: string;
    accountName?: string | null;
    accountAvatar?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | string | null;
    scope?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: unknown;
}

/**
 * Génère l'URL d'autorisation OAuth Twitch
 */
export function buildAuthUrl(userId: string): string {
    const clientId = process.env.TWITCH_CLIENT_ID || '';
    const redirectUri = process.env.TWITCH_REDIRECT_URI || '';
    const scopes = [
        'user:read:email', 
        'channel:read:stream_key', 
        'channel:read:ads',
        'channel:edit:commercial',
        'channel:manage:raids',
        'channel:manage:ads'
    ].join(' ');
    return `${TWITCH_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(userId)}`;
}

/**
 * Échange le code temporaire contre des tokens d'accès
 */
export async function exchangeCodeForTokens(code: string): Promise<TwitchTokenResponse> {
    const tokenParams = new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID || '',
        client_secret: process.env.TWITCH_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI || ''
    });

    const res = await fetch(TWITCH_TOKEN_URL, { 
        method: 'POST', 
        body: tokenParams,
        signal: AbortSignal.timeout(5000)
    });
    const data = (await res.json()) as TwitchTokenResponse;
    if (!res.ok) throw new Error('Échec échange code Twitch');
    return data;
}

/**
 * Vérifie et rafraîchit automatiquement le token Twitch si expiré
 */
export async function getValidAccessToken(tokenRecord: OAuthTokenRecord): Promise<string | null> {
    const now = new Date();
    const isExpired = !tokenRecord.expiresAt || (new Date(tokenRecord.expiresAt).getTime() - 5 * 60 * 1000) < now.getTime();

    if (!isExpired) {
        return tokenRecord.accessToken ? decrypt(tokenRecord.accessToken) : null;
    }

    if (!tokenRecord.refreshToken) {
        return null;
    }

    try {
        const decryptedRefreshToken = decrypt(tokenRecord.refreshToken);
        if (!decryptedRefreshToken) {
            return null;
        }

        const refreshParams = new URLSearchParams({
            client_id: process.env.TWITCH_CLIENT_ID || '',
            client_secret: process.env.TWITCH_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
            refresh_token: decryptedRefreshToken
        });

        const res = await fetch(TWITCH_TOKEN_URL, {
            method: 'POST', 
            body: refreshParams,
            signal: AbortSignal.timeout(5000) 
        });
        const data = (await res.json()) as TwitchTokenResponse;
        if (!res.ok) return null;

        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

        if (tokenRecord.id) {
            const encryptedAccessToken = encrypt(data.access_token);
            const encryptedRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : null;
            if (!encryptedAccessToken) return null;

            await db.update(oauthTokens).set({
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt: newExpiresAt,
                updatedAt: new Date()
            }).where(eq(oauthTokens.id, tokenRecord.id));
        }

        return data.access_token;
    } catch {
        return null;
    }
}

/**
 * Récupère le profil utilisateur Twitch (Avatar, Pseudo)
 */
export async function fetchUserProfile(
    twitchAccountId?: string | null,
    accessToken: string = ''
): Promise<TwitchUserProfile | null> {
    try {
        const url = twitchAccountId ? `${TWITCH_HELIX_URL}/users?id=${twitchAccountId}` : `${TWITCH_HELIX_URL}/users`;

        const res = await fetch(url, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        });
        
        if (!res.ok) return null;
        const data = (await res.json()) as { data?: TwitchUserProfile[] };
        return data.data && data.data[0] ? data.data[0] : null;
    } catch {
        return null;
    }
}

/**
 * Vérifie si la chaîne est en direct
 */
export async function fetchLiveStream(
    twitchAccountId: string,
    accessToken: string
): Promise<LiveStreamItem | null> {
    try {
        const res = await fetch(`${TWITCH_HELIX_URL}/streams?user_id=${encodeURIComponent(twitchAccountId)}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { data?: LiveStreamItem[] };
        return data.data && data.data.length > 0 ? data.data[0] : null;
    } catch {
        return null;
    }
}

/**
 * Récupère plusieurs flux live en une seule requête (Batch jusqu'à 100 chaînes)
 */
export async function fetchBatchLiveStreams(
    twitchAccountIds: string[],
    accessToken: string
): Promise<LiveStreamItem[]> {
    if (!twitchAccountIds || twitchAccountIds.length === 0) {
        return [];
    }

    try {
        const params = twitchAccountIds
            .slice(0, 100)
            .map(id => `user_id=${encodeURIComponent(id)}`)
            .join('&');

        const res = await fetch(`${TWITCH_HELIX_URL}/streams?${params}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) return [];
        const data = (await res.json()) as { data?: LiveStreamItem[] };
        return data.data || [];
    } catch {
        return [];
    }
}

/**
 * Récupère le calendrier publicitaire officiel (prochaine pub, durée, temps sans pré-roll)
 */
export async function fetchAdSchedule(
    broadcasterId: string,
    accessToken: string
): Promise<TwitchAdSchedule | null> {
    try {
        const res = await fetch(`${TWITCH_HELIX_URL}/channels/ads?broadcaster_id=${encodeURIComponent(broadcasterId)}`, {
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { data?: TwitchAdSchedule[] };
        return data.data && data.data[0] ? data.data[0] : null;
    } catch {
        return null;
    }
}

export interface TwitchCommercialResult {
    length: number;
    message: string;
    retry_after: number;
}

export interface TwitchRaidResult {
    created_at: string;
    is_mature: boolean;
}

export interface TwitchSnoozeResult {
    snooze_count: number;
    snooze_refresh_at: number;
    next_ad_at: number;
}

/**
 * Déclenche une coupure publicitaire sur la chaîne
 */
export async function triggerCommercial(
    broadcasterId: string,
    accessToken: string,
    length: number
): Promise<TwitchCommercialResult> {
    const res = await fetch(`${TWITCH_HELIX_URL}/channels/commercial`, {
        method: 'POST',
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            broadcaster_id: broadcasterId,
            length
        }),
        signal: AbortSignal.timeout(5000)
    });

    const data = (await res.json()) as { data?: TwitchCommercialResult[]; message?: string; error?: string };
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Impossible de lancer la coupure publicitaire');
    }

    if (!data.data || !data.data[0]) {
        throw new Error('Réponse invalide de l\'API Twitch pour la coupure publicitaire');
    }

    return data.data[0];
}

/**
 * Déclenche un raid vers une chaîne cible
 */
export async function startRaid(
    fromBroadcasterId: string,
    accessToken: string,
    targetLogin: string
): Promise<TwitchRaidResult> {
    // 1. Résolution de l'identifiant de la chaîne cible
    const userRes = await fetch(`${TWITCH_HELIX_URL}/users?login=${encodeURIComponent(targetLogin)}`, {
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            'Authorization': `Bearer ${accessToken}`
        },
        signal: AbortSignal.timeout(5000)
    });

    const userData = (await userRes.json()) as { data?: Array<{ id: string }> };
    if (!userRes.ok || !userData.data || userData.data.length === 0) {
        throw new Error('Chaîne cible introuvable');
    }

    const targetBroadcasterId = userData.data[0].id;

    // 2. Lancement du raid
    const raidRes = await fetch(
        `${TWITCH_HELIX_URL}/raids?from_broadcaster_id=${encodeURIComponent(fromBroadcasterId)}&to_broadcaster_id=${encodeURIComponent(targetBroadcasterId)}`,
        {
            method: 'POST',
            headers: {
                'Client-Id': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
        }
    );

    const raidData = (await raidRes.json()) as { data?: TwitchRaidResult[]; message?: string; error?: string };
    if (!raidRes.ok) {
        throw new Error(raidData.message || raidData.error || 'Échec du lancement du raid');
    }

    if (!raidData.data || !raidData.data[0]) {
        throw new Error('Réponse invalide de l\'API Twitch pour le raid');
    }

    return raidData.data[0];
}

/**
 * Annule un raid en cours
 */
export async function cancelRaid(
    broadcasterId: string,
    accessToken: string
): Promise<boolean> {
    const res = await fetch(`${TWITCH_HELIX_URL}/raids?broadcaster_id=${encodeURIComponent(broadcasterId)}`, {
        method: 'DELETE',
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            'Authorization': `Bearer ${accessToken}`
        },
        signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message || 'Impossible d\'annuler le raid');
    }

    return true;
}

/**
 * Reporte la prochaine coupure publicitaire de 5 minutes (Snooze)
 */
export async function snoozeNextAd(
    broadcasterId: string,
    accessToken: string
): Promise<TwitchSnoozeResult> {
    const res = await fetch(`${TWITCH_HELIX_URL}/channels/ads/snooze?broadcaster_id=${encodeURIComponent(broadcasterId)}`, {
        method: 'POST',
        headers: {
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            'Authorization': `Bearer ${accessToken}`
        },
        signal: AbortSignal.timeout(5000)
    });

    const data = (await res.json()) as { data?: TwitchSnoozeResult[]; message?: string; error?: string };
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Impossible de reporter la coupure publicitaire');
    }

    if (!data.data || !data.data[0]) {
        throw new Error('Réponse invalide de l\'API Twitch pour le report publicitaire');
    }

    return data.data[0];
}

