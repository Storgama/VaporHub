import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { streamSessions, streamMetrics } from '../db/schemas/index.js';

/**
 * Enregistre ou met à jour la session active et ses métriques (avec throttling 2 min)
 */
export async function recordLiveSession(userId, stream) {
    let [currentSession] = await db.select().from(streamSessions).where(
        and(
            eq(streamSessions.userId, userId),
            eq(streamSessions.providerStreamId, stream.id),
            isNull(streamSessions.endedAt)
        )
    );

    if (!currentSession) {
        const [newSession] = await db.insert(streamSessions).values({
            userId,
            provider: 'twitch',
            providerStreamId: stream.id,
            title: stream.title,
            gameName: stream.game_name,
            peakViewers: stream.viewer_count,
            startedAt: new Date(stream.started_at)
        }).returning();
        currentSession = newSession;

        await db.insert(streamMetrics).values({
            sessionId: currentSession.id,
            viewerCount: stream.viewer_count
        });
    } else {
        const updates = {};
        if (stream.viewer_count > currentSession.peakViewers) updates.peakViewers = stream.viewer_count;
        if (stream.title !== currentSession.title) updates.title = stream.title;
        if (stream.game_name !== currentSession.gameName) updates.gameName = stream.game_name;

        if (Object.keys(updates).length > 0) {
            await db.update(streamSessions).set(updates).where(eq(streamSessions.id, currentSession.id));
        }

        const [lastMetric] = await db.select().from(streamMetrics)
            .where(eq(streamMetrics.sessionId, currentSession.id))
            .orderBy(desc(streamMetrics.timestamp))
            .limit(1);

        const twoMinutes = 2 * 60 * 1000;
        if (!lastMetric || (Date.now() - new Date(lastMetric.timestamp).getTime()) >= twoMinutes) {
            await db.insert(streamMetrics).values({
                sessionId: currentSession.id,
                viewerCount: stream.viewer_count
            });
        }
    }

    return currentSession;
}

/**
 * Clôture la session ouverte quand le stream s'arrête
 */
export async function closeOpenSession(userId) {
    const [openSession] = await db.select().from(streamSessions).where(
        and(
            eq(streamSessions.userId, userId),
            isNull(streamSessions.endedAt)
        )
    );

    if (openSession) {
        await db.update(streamSessions).set({ endedAt: new Date() }).where(eq(streamSessions.id, openSession.id));
    }
}

/**
 * Récupère l'historique des streams d'un utilisateur
 */
export async function getSessionsHistory(userId, limit = 20) {
    return await db.select().from(streamSessions)
        .where(eq(streamSessions.userId, userId))
        .orderBy(desc(streamSessions.startedAt))
        .limit(limit);
}

/**
 * Récupère une session et ses points métriques pour le graphique
 */
export async function getSessionMetrics(sessionId, userId) {
    const [session] = await db.select().from(streamSessions).where(
        and(eq(streamSessions.id, sessionId), eq(streamSessions.userId, userId))
    );

    if (!session) return null;

    const metrics = await db.select().from(streamMetrics)
        .where(eq(streamMetrics.sessionId, sessionId))
        .orderBy(streamMetrics.timestamp);

    return { session, metrics };
}