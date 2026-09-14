import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { encrypt } from '../utils/encryption.js';
import * as twitchService from '../services/twitchService.js';
import * as trackerService from '../services/streamTrackerService.js';
import * as analyticsService from '../services/analyticsService.js';

export interface AuthUser {
    userId: string;
    role?: string;
}

interface CallbackQueryParams {
    code?: string;
    state?: string;
    error?: string;
}

interface TwitchTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string[];
}

interface TwitchUserProfile {
    id: string;
    display_name: string;
    profile_image_url?: string;
}

interface LiveStreamItem {
    id: string;
    title: string;
    game_name: string;
    viewer_count: number;
    started_at: string;
    thumbnail_url: string;
}

interface SessionWithMetrics {
    session: {
        id: string;
        startedAt: string | Date;
        [key: string]: unknown;
    };
    metrics: Array<{ viewerCount?: number; [key: string]: unknown }>;
}

type NextFn = unknown;

function forwardError(next: NextFn, error: unknown): void {
    if (typeof next === 'function') {
        next(error);
    }
}

/**
 * Génère et renvoie l'URL d'autorisation OAuth Twitch
 */
export async function getTwitchAuthUrl(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        return res.json({ url: twitchService.buildAuthUrl(userId) });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Callback OAuth 2.0 Twitch : échange de code, chiffrement AES-256 et persistance des tokens
 */
export async function twitchCallback(
    req: Request<unknown, unknown, unknown, CallbackQueryParams>,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const { code, state: userId, error } = req.query;
        if (error || !code || !userId) {
            return res.redirect(`${frontendUrl}/?error=twitch_denied`);
        }

        const tokenData = (await twitchService.exchangeCodeForTokens(code)) as TwitchTokenResponse;
        const twitchUser = (await twitchService.fetchUserProfile('', tokenData.access_token)) as TwitchUserProfile;
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        const [existing] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );

        const encryptedAccess = encrypt(tokenData.access_token) || '';
        const encryptedRefresh = encrypt(tokenData.refresh_token);

        const payload = {
            providerAccountId: twitchUser.id,
            accessToken: encryptedAccess,
            refreshToken: encryptedRefresh,
            expiresAt,
            scope: tokenData.scope ? tokenData.scope.join(' ') : ''
        };

        if (existing) {
            await db.update(oauthTokens).set({ ...payload, updatedAt: new Date() }).where(eq(oauthTokens.id, existing.id));
        } else {
            await db.insert(oauthTokens).values({ userId, provider: 'twitch', ...payload });
        }

        return res.redirect(`${frontendUrl}/?twitch_linked=true`);
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère l'état actuel du direct (actif ou hors ligne)
 */
export async function getCurrentLiveStatus(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        // 🧪 MODE MOCK DEV : Permet de simuler un live avec ?mock=true hors production
        const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production' || process.env.NODE_ENV === 'PROD';
        if (!isProduction && req.query.mock === 'true') {
            return res.json({
                linked: true,
                channel: 'Pominus (Mock Live)',
                avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=128&h=128&fit=crop&crop=faces',
                isLive: true,
                title: '🧪 [LABO] Test du Radar Publicitaire & Cockpit VaporHub !',
                game: 'Valorant',
                viewerCount: 84,
                startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
                thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=320&h=180&fit=crop'
            });
        }

        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );

        if (!tokenRecord) return res.json({ linked: false, message: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.json({ linked: false, message: 'Connexion expirée' });

        const twitchUser = (await twitchService.fetchUserProfile(tokenRecord.providerAccountId, accessToken)) as TwitchUserProfile;
        const stream = (await twitchService.fetchLiveStream(tokenRecord.providerAccountId, accessToken)) as LiveStreamItem | null;

        if (stream) {
            await trackerService.recordLiveSession(userId, stream);
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

        await trackerService.closeOpenSession(userId);
        return res.json({
            linked: true,
            channel: twitchUser.display_name,
            avatar: twitchUser.profile_image_url,
            isLive: false,
            viewerCount: 0
        });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère l'historique des sessions de stream du streamer
 */
export async function getStreamHistory(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const history = (await trackerService.getSessionsHistory(userId)) as Array<Record<string, unknown>>;
        if (!history || history.length === 0 || (history.length === 1 && Object.keys(history[0]).length === 0)) {
            return res.status(200).json([]);
        }
        return res.status(200).json(history);
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère les métriques détaillées et calculs de rétention d'une session
 */
export async function getStreamMetrics(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const sessionId = req.params.sessionId as string;
        const data = (await trackerService.getSessionMetrics(sessionId, userId)) as {
            session: Record<string, unknown>;
            metrics: Array<Record<string, unknown>>;
        } | null;

        if (!data) return res.status(404).json({ error: 'Session introuvable' });
        
        const retention = analyticsService.calculateRetentionMetrics(data.session, data.metrics);
        return res.json({ ...data, retention });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère le résumé global des KPIs (30 derniers jours) — Version Haute Performance
 */
export async function getAnalyticsSummary(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const fetchAllSessions = trackerService.getAllSessionsWithMetrics as (
            id: string,
            limit?: number,
            dateFilter?: unknown
        ) => Promise<SessionWithMetrics[]>;

        const sessionsWithMetrics = await fetchAllSessions(userId, 50, thirtyDaysAgo);
        
        const calculatedStreams = sessionsWithMetrics
            .filter(item => new Date(item.session.startedAt) >= thirtyDaysAgo)
            .map(({ session, metrics }) => {
                const metricsResult = analyticsService.calculateRetentionMetrics(session, metrics);
                return { ...session, ...metricsResult };
            });

        const summary = analyticsService.computeMonthlySummary(calculatedStreams);
        return res.json(summary);
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère la ventilation des statistiques de stream par période (weekly, monthly, yearly, all)
 */
export async function getAnalyticsBreakdown(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const { period } = req.query as { period?: string };
        let sinceDate: Date | null = null;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (period === 'weekly') sinceDate = new Date(now - 7 * oneDay);
        else if (period === 'monthly') sinceDate = new Date(now - 30 * oneDay);
        else if (period === 'yearly') sinceDate = new Date(now - 365 * oneDay);

        const fetchAllSessions = trackerService.getAllSessionsWithMetrics as (
            id: string,
            limit?: number,
            dateFilter?: unknown
        ) => Promise<SessionWithMetrics[]>;

        const sessionsWithMetrics = await fetchAllSessions(userId, 500, sinceDate);
        const filtered = sinceDate 
            ? sessionsWithMetrics.filter(item => new Date(item.session.startedAt) >= sinceDate)
            : sessionsWithMetrics;

        const calculatedStreams = filtered.map(({ session, metrics }) => {
            const metricsResult = analyticsService.calculateRetentionMetrics(session, metrics);
            return { ...session, ...metricsResult };
        });

        const breakdown = analyticsService.computeFrequencyAndBreakdown(calculatedStreams, period || 'all');
        return res.json(breakdown);
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Radar Publicitaire : Renvoie les timers de pub et le temps garanti sans pré-roll
 */
export async function getTwitchAdSchedule(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        // 🧪 MODE MOCK DEV : Faux compte à rebours de pub hors production
        const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production' || process.env.NODE_ENV === 'PROD';
        if (!isProduction && req.query.mock === 'true') {
            return res.json({
                linked: true,
                hasAds: true,
                adSchedule: {
                    next_ad_at: Math.floor(Date.now() / 1000) + 740,
                    duration: 90,
                    preroll_free_time: 1100,
                    last_ad_at: Math.floor(Date.now() / 1000) - 1800
                }
            });
        }

        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.json({ linked: false, message: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.json({ linked: false, message: 'Connexion expirée' });

        const adSchedule = await twitchService.fetchAdSchedule(tokenRecord.providerAccountId, accessToken);
        if (adSchedule) {
            return res.json({
                linked: true,
                hasAds: true,
                adSchedule
            });
        }

        return res.json({
            linked: true,
            hasAds: false,
            message: 'Aucune publicité programmée ou chaîne non affiliée'
        });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Déclenche une coupure publicitaire sur Twitch (ou simulation)
 */
export async function triggerCommercial(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const length = Number(req.body?.length) || 60;
        const isMock = req.query?.mock === 'true';

        if (isMock) {
            return res.json({
                success: true,
                length,
                retryAfter: 300,
                simulated: true,
                message: `Simulation: Coupure publicitaire de ${length}s lancée`
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        try {
            const result = await twitchService.triggerCommercial(tokenRecord.providerAccountId, accessToken, length);
            return res.json({
                success: true,
                length: result.length,
                retryAfter: result.retry_after,
                message: `Coupure publicitaire de ${result.length}s lancée`
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Échec du lancement de la pub';
            return res.status(400).json({ error: errorMsg });
        }
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Déclenche un raid vers une chaîne cible (ou simulation)
 */
export async function startRaid(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const targetLogin = String(req.body?.targetLogin || '').toLowerCase();
        const isMock = req.query?.mock === 'true';

        if (isMock) {
            return res.json({
                success: true,
                targetLogin,
                simulated: true,
                createdAt: new Date().toISOString(),
                message: `Simulation: Raid lancé vers ${targetLogin}`
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        try {
            const result = await twitchService.startRaid(tokenRecord.providerAccountId, accessToken, targetLogin);
            return res.json({
                success: true,
                targetLogin,
                createdAt: result.created_at
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Échec du lancement du raid';
            const status = errorMsg === 'Chaîne cible introuvable' ? 404 : 400;
            return res.status(status).json({ error: errorMsg });
        }
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Annule un raid en cours (ou simulation)
 */
export async function cancelRaid(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const isMock = req.query?.mock === 'true';
        if (isMock) {
            return res.json({
                success: true,
                canceled: true,
                simulated: true
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        try {
            await twitchService.cancelRaid(tokenRecord.providerAccountId, accessToken);
            return res.json({
                success: true,
                canceled: true
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Impossible d\'annuler le raid';
            return res.status(400).json({ error: errorMsg });
        }
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Reporte la prochaine coupure publicitaire de 5 minutes (ou simulation)
 */
export async function snoozeAd(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const isMock = req.query?.mock === 'true';
        if (isMock) {
            return res.json({
                success: true,
                snoozed: true,
                simulated: true,
                nextAdAt: Date.now() + 300000
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        try {
            const result = await twitchService.snoozeNextAd(tokenRecord.providerAccountId, accessToken);
            return res.json({
                success: true,
                snoozed: true,
                nextAdAt: result.next_ad_at
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Impossible de reporter la coupure publicitaire';
            return res.status(400).json({ error: errorMsg });
        }
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère les badges Twitch (globaux et de chaîne) pour le tchat
 */
export async function getTwitchBadges(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const isMock = req.query?.mock === 'true';
        if (isMock) {
            return res.json({
                success: true,
                simulated: true,
                badges: {
                    broadcaster: { id: 'broadcaster', label: 'Diffuseur', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1' },
                    moderator: { id: 'moderator', label: 'Modérateur', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1' },
                    vip: { id: 'vip', label: 'VIP', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1' },
                    artist: { id: 'artist', label: 'Artiste', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/1' },
                    founder: { id: 'founder', label: 'Fondateur', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/1' },
                    subscriber: { id: 'subscriber', label: 'Abonné', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1' },
                    partner: { id: 'partner', label: 'Partenaire', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/1' },
                    staff: { id: 'staff', label: 'Staff', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/d97c37bd-a6f5-4c38-8f57-4e4bef88af34/1' },
                    premium: { id: 'premium', label: 'Prime Gaming', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/bbbe0db0-a598-423e-86d0-f9fb98ca1933/1' },
                    zevent: { id: 'zevent', label: 'ZEvent', imageUrl: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1' }
                }
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        const [globalBadges, channelBadges] = await Promise.all([
            twitchService.fetchGlobalBadges(accessToken),
            twitchService.fetchChannelBadges(tokenRecord.providerAccountId, accessToken)
        ]);

        const badgeMap: Record<string, { label: string; imageUrl: string; versions?: unknown }> = {};
        for (const b of globalBadges) {
            const v = b.versions?.[0];
            badgeMap[b.set_id] = {
                label: v?.title || b.set_id,
                imageUrl: v?.image_url_1x || v?.image_url_2x || v?.image_url_4x || '',
                versions: b.versions
            };
        }
        for (const b of channelBadges) {
            const v = b.versions?.[0];
            badgeMap[b.set_id] = {
                label: v?.title || b.set_id,
                imageUrl: v?.image_url_1x || v?.image_url_2x || v?.image_url_4x || '',
                versions: b.versions
            };
        }

        return res.json({
            success: true,
            badges: badgeMap
        });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Récupère les émotes personnalisées de la chaîne pour le tchat
 */
export async function getTwitchEmotes(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const isMock = req.query?.mock === 'true';
        if (isMock) {
            return res.json({
                success: true,
                simulated: true,
                emotes: [
                    { id: 'mock_1', name: 'vaporHype', url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_7b6863b15c544e3e8f85f1c9bb7bb34d/default/dark/2.0' },
                    { id: 'mock_2', name: 'vaporGg', url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_5b2d5a37452d431481b95b8ee9e53066/default/dark/2.0' },
                    { id: 'mock_3', name: 'vaporLove', url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_dc22b7a9de584bb78d8a7ff8b049d562/default/dark/2.0' },
                    { id: 'mock_4', name: 'vaporRip', url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_812e9b08d24b4231920703c16263595f/default/dark/2.0' }
                ]
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        const emotes = await twitchService.fetchChannelEmotes(tokenRecord.providerAccountId, accessToken);

        return res.json({
            success: true,
            emotes
        });
    } catch (error) {
        forwardError(next, error);
    }
}

/**
 * Envoie un message dans le tchat Twitch (ou simulation)
 */
export async function postChatMessage(
    req: Request,
    res: Response,
    next: NextFn
): Promise<void | Response> {
    try {
        const user = (req as Request & { user?: AuthUser }).user;
        const userId = user?.userId;
        if (!userId) return res.status(401).json({ error: 'Non authentifié' });

        const { message } = req.body as { message?: string };
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Le contenu du message est requis' });
        }

        const isMock = req.query?.mock === 'true';
        if (isMock) {
            return res.json({
                success: true,
                simulated: true,
                messageId: `mock-msg-${Date.now()}`,
                isSent: true
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );
        if (!tokenRecord) return res.status(404).json({ error: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.status(401).json({ error: 'Token Twitch expiré ou invalide' });

        try {
            const result = await twitchService.sendChatMessage(
                tokenRecord.providerAccountId,
                tokenRecord.providerAccountId,
                accessToken,
                message.trim()
            );
            return res.json({
                success: true,
                ...result
            });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Impossible d\'envoyer le message';
            return res.status(400).json({ error: errorMsg });
        }
    } catch (error) {
        forwardError(next, error);
    }
}



