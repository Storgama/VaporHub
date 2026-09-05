import { eq, and } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { oauthTokens } from '../db/schemas/index.js';
import { encrypt } from '../utils/encryption.js';
import * as twitchService from '../services/twitchService.js';
import * as trackerService from '../services/streamTrackerService.js';
import * as analyticsService from '../services/analyticsService.js';

export async function getTwitchAuthUrl(req, res, next) {
    try {
        res.json({ url: twitchService.buildAuthUrl(req.user.userId) });
    } catch (error) {
        next(error);
    }
}

export async function twitchCallback(req, res, next) {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const { code, state: userId, error } = req.query;
        if (error || !code) return res.redirect(`${frontendUrl}/?error=twitch_denied`);

        const tokenData = await twitchService.exchangeCodeForTokens(code);
        const twitchUser = await twitchService.fetchUserProfile('', tokenData.access_token);
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        const [existing] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, 'twitch'))
        );

        const payload = {
            providerAccountId: twitchUser.id,
            accessToken: encrypt(tokenData.access_token),
            refreshToken: encrypt(tokenData.refresh_token),
            expiresAt,
            scope: tokenData.scope ? tokenData.scope.join(' ') : ''
        };

        if (existing) {
            await db.update(oauthTokens).set({ ...payload, updatedAt: new Date() }).where(eq(oauthTokens.id, existing.id));
        } else {
            await db.insert(oauthTokens).values({ userId, provider: 'twitch', ...payload });
        }

        res.redirect(`${frontendUrl}/?twitch_linked=true`);
    } catch (error) {
        next(error);
    }
}

export async function getCurrentLiveStatus(req, res, next) {
    try {

        // 🧪 MODE MOCK DEV : Permet de simuler un live avec ?mock=true
        if (process.env.NODE_ENV !== 'PROD' && req.query.mock === 'true') {
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


        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, req.user.userId), eq(oauthTokens.provider, 'twitch'))
        );

        if (!tokenRecord) return res.json({ linked: false, message: 'Aucun compte Twitch lié' });

        const accessToken = await twitchService.getValidAccessToken(tokenRecord);
        if (!accessToken) return res.json({ linked: false, message: 'Connexion expirée' });

        const twitchUser = await twitchService.fetchUserProfile(tokenRecord.providerAccountId, accessToken);
        const stream = await twitchService.fetchLiveStream(tokenRecord.providerAccountId, accessToken);

        if (stream) {
            await trackerService.recordLiveSession(req.user.userId, stream);
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

        await trackerService.closeOpenSession(req.user.userId);
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

export async function getStreamHistory(req, res, next) {
    try {
        const history = await trackerService.getSessionsHistory(req.user.userId);
        res.json(history);
    } catch (error) {
        next(error);
    }
}

export async function getStreamMetrics(req, res, next) {
    try {
        const data = await trackerService.getSessionMetrics(req.params.sessionId, req.user.userId);
        if (!data) return res.status(404).json({ error: 'Session introuvable' });
        
        const retention = analyticsService.calculateRetentionMetrics(data.session, data.metrics);
        res.json({ ...data, retention });
    } catch (error) {
        next(error);
    }
}

/**
 * Récupère le résumé global des KPIs (30 derniers jours) — Version Haute Performance
 */
export async function getAnalyticsSummary(req, res, next) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // seule requête groupée pour toutes les sessions des 30 derniers jours
        const sessionsWithMetrics = await trackerService.getAllSessionsWithMetrics(req.user.userId, 50, thirtyDaysAgo);
        // Filtrage et calcul de la rétention en mémoire (ultra-rapide)
        const calculatedStreams = sessionsWithMetrics
            .filter(item => new Date(item.session.startedAt) >= thirtyDaysAgo)
            .map(({ session, metrics }) => {
                const metricsResult = analyticsService.calculateRetentionMetrics(session, metrics);
                return { ...session, ...metricsResult };
            });
        const summary = analyticsService.computeMonthlySummary(calculatedStreams);
        res.json(summary);
    } catch (error) {
        next(error);
    }
}

export async function getAnalyticsBreakdown(req, res, next) {
    try {
        const { period } = req.query;
        let sinceDate = null;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (period === 'weekly') sinceDate = new Date(now - 7 * oneDay);
        else if (period === 'monthly') sinceDate = new Date(now - 30 * oneDay);
        else if (period === 'yearly') sinceDate = new Date(now - 365 * oneDay);
        const sessionsWithMetrics = await trackerService.getAllSessionsWithMetrics(req.user.userId, 500, sinceDate);
        const filtered = sinceDate 
            ? sessionsWithMetrics.filter(item => new Date(item.session.startedAt) >= sinceDate)
            : sessionsWithMetrics;
        const calculatedStreams = filtered.map(({ session, metrics }) => {
            const metricsResult = analyticsService.calculateRetentionMetrics(session, metrics);
            return { ...session, ...metricsResult };
        });
        const breakdown = analyticsService.computeFrequencyAndBreakdown(calculatedStreams, period || 'all');
        res.json(breakdown);
    } catch (error) {
        next(error);
    }
}

/**
 * Radar Publicitaire : Renvoie les timers de pub et le temps garanti sans pré-roll
 */
export async function getTwitchAdSchedule(req, res, next) {
    try {

         // 🧪 MODE MOCK DEV : Faux compte à rebours de pub
        if (process.env.NODE_ENV !== 'production' && req.query.mock === 'true') {
            return res.json({
                linked: true,
                hasAds: true,
                adSchedule: {
                    next_ad_at: Math.floor(Date.now() / 1000) + 740, // Prochaine pub dans 12 min 20s
                    duration: 90, // Coupure de 90s
                    preroll_free_time: 1100, // 18 min sans pré-roll pour les nouveaux viewers
                    last_ad_at: Math.floor(Date.now() / 1000) - 1800
                }
            });
        }

        const [tokenRecord] = await db.select().from(oauthTokens).where(
            and(eq(oauthTokens.userId, req.user.userId), eq(oauthTokens.provider, 'twitch'))
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
        res.json({
            linked: true,
            hasAds: false,
            message: 'Aucune publicité programmée ou chaîne non affiliée'
        });
    } catch (error) {
        next(error);
    }
}