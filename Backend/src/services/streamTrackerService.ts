import { eq, and, desc, isNull, inArray, gte, type SQL } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { streamSessions, streamMetrics } from '../db/schemas/index.js';

export type StreamSession = typeof streamSessions.$inferSelect;
export type NewStreamSession = typeof streamSessions.$inferInsert;
export type StreamMetric = typeof streamMetrics.$inferSelect;
export type NewStreamMetric = typeof streamMetrics.$inferInsert;

export interface StreamInput {
    id: string;
    title?: string | null;
    game_name?: string | null;
    viewer_count?: number | null;
    started_at: string | Date;
}

export interface SessionWithMetrics {
    session: StreamSession;
    metrics: StreamMetric[];
}

/**
 * Enregistre ou met à jour la session active et ses métriques (avec throttling 2 min)
 */
export async function recordLiveSession(
    userId: string,
    stream: StreamInput
): Promise<StreamSession> {
    const [currentSession] = await db.select().from(streamSessions).where(
        and(
            eq(streamSessions.userId, userId),
            eq(streamSessions.providerStreamId, stream.id),
            isNull(streamSessions.endedAt)
        )
    );

    let activeSession = currentSession;

    if (!activeSession) {
        const [newSession] = await db.insert(streamSessions).values({
            userId,
            provider: 'twitch',
            providerStreamId: stream.id,
            title: stream.title ?? '',
            gameName: stream.game_name ?? '',
            peakViewers: stream.viewer_count ?? 0,
            startedAt: new Date(stream.started_at)
        }).returning();
        activeSession = newSession;

        await db.insert(streamMetrics).values({
            sessionId: activeSession.id,
            viewerCount: stream.viewer_count ?? 0
        });
    } else {
        const updates: Partial<NewStreamSession> = {};
        if (
            stream.viewer_count !== undefined &&
            stream.viewer_count !== null &&
            stream.viewer_count > activeSession.peakViewers
        ) {
            updates.peakViewers = stream.viewer_count;
        }
        if (stream.title !== undefined && stream.title !== activeSession.title) {
            updates.title = stream.title ?? '';
        }
        if (stream.game_name !== undefined && stream.game_name !== activeSession.gameName) {
            updates.gameName = stream.game_name ?? '';
        }

        if (Object.keys(updates).length > 0) {
            await db.update(streamSessions).set(updates).where(eq(streamSessions.id, activeSession.id));
        }

        const [lastMetric] = await db.select().from(streamMetrics)
            .where(eq(streamMetrics.sessionId, activeSession.id))
            .orderBy(desc(streamMetrics.timestamp))
            .limit(1);

        const twoMinutes = 2 * 60 * 1000;
        if (!lastMetric || (Date.now() - new Date(lastMetric.timestamp).getTime()) >= twoMinutes) {
            await db.insert(streamMetrics).values({
                sessionId: activeSession.id,
                viewerCount: stream.viewer_count ?? 0
            });
        }
    }

    return activeSession;
}

/**
 * Clôture la session ouverte quand le stream s'arrête
 */
export async function closeOpenSession(userId: string): Promise<void> {
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
export async function getSessionsHistory(
    userId: string,
    limit: number = 20
): Promise<StreamSession[]> {
    return await db.select().from(streamSessions)
        .where(eq(streamSessions.userId, userId))
        .orderBy(desc(streamSessions.startedAt))
        .limit(limit);
}

/**
 * Récupère une session et ses points métriques pour le graphique
 */
export async function getSessionMetrics(
    sessionId: string,
    userId: string
): Promise<{ session: StreamSession; metrics: StreamMetric[] } | null> {
    const [session] = await db.select().from(streamSessions).where(
        and(eq(streamSessions.id, sessionId), eq(streamSessions.userId, userId))
    );

    if (!session) return null;

    const metrics = await db.select().from(streamMetrics)
        .where(eq(streamMetrics.sessionId, sessionId))
        .orderBy(streamMetrics.timestamp);

    return { session, metrics };
}

/**
 * Récupère tous les streams et leurs métriques en 2 requêtes globales
 */
export async function getAllSessionsWithMetrics(
    userId: string,
    limit: number = 500,
    sinceDate: Date | null = null
): Promise<SessionWithMetrics[]> {
    // 1. Récupère toutes les sessions en 1 seule requête
    const conditions: (SQL<unknown> | undefined)[] = [eq(streamSessions.userId, userId)];
    if (sinceDate) {
        conditions.push(gte(streamSessions.startedAt, sinceDate));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const query = db.select().from(streamSessions)
        .where(whereClause)
        .orderBy(desc(streamSessions.startedAt))
        .limit(limit);

    const sessions = await query;
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.id);

    // 2. Récupère toutes les métriques de ces sessions en 1 seule requête globale
    const allMetrics = await db.select().from(streamMetrics)
        .where(inArray(streamMetrics.sessionId, sessionIds));

    // 3. Regroupement ultra-rapide en mémoire
    const metricsBySession = new Map<string, StreamMetric[]>();
    allMetrics.forEach(m => {
        const existing = metricsBySession.get(m.sessionId);
        if (!existing) {
            metricsBySession.set(m.sessionId, [m]);
        } else {
            existing.push(m);
        }
    });

    return sessions.map(session => ({
        session,
        metrics: metricsBySession.get(session.id) || []
    }));
}
