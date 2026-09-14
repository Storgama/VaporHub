import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * 1. Table des sessions de stream (1 ligne par live)
 */
export const streamSessions = pgTable('stream_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').default('twitch').notNull(),
    providerStreamId: text('provider_stream_id').notNull(), // ID du live chez Twitch
    title: text('title').notNull(),
    gameName: text('game_name'),
    peakViewers: integer('peak_viewers').default(0).notNull(),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'), // Reste null tant que le stream est actif
    createdAt: timestamp('created_at').defaultNow().notNull()
});

export type StreamSession = typeof streamSessions.$inferSelect;
export type NewStreamSession = typeof streamSessions.$inferInsert;

