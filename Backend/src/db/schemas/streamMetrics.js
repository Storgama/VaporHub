import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { streamSessions } from './streamSessions.js';

/**
 * 2. Table des métriques temporelles (pour tracer les courbes du graphique)
 */
export const streamMetrics = pgTable('stream_metrics', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
        .notNull()
        .references(() => streamSessions.id, { onDelete: 'cascade' }),
    viewerCount: integer('viewer_count').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});