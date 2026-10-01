import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const discordAlertConfigs = pgTable('discord_alert_configs', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').default('Alerte de stream').notNull(),
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    roleMention: text('role_mention'),
    customMessage: text('custom_message'),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type DiscordAlertConfig = typeof discordAlertConfigs.$inferSelect;
export type NewDiscordAlertConfig = typeof discordAlertConfigs.$inferInsert;

