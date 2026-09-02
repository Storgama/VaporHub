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

export async function getAnalyticsSummary(req, res, next) {
    try {
        const history = await trackerService.getSessionsHistory(req.user.userId, 30);
        const calculatedStreams = [];
        for (const session of history) {
            const data = await trackerService.getSessionMetrics(session.id, req.user.userId);
            if (data) {
                const metricsResult = analyticsService.calculateRetentionMetrics(data.session, data.metrics);
                calculatedStreams.push({ ...session, ...metricsResult });
            }
        }
        const summary = analyticsService.computeMonthlySummary(calculatedStreams);
        res.json(summary);
    } catch (error) {
        next(error);
    }
}