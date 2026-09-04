import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const oauthTokens = pgTable(
    'oauth_token',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        //liaison avec user
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        
        //nom du service (twitch, youtube, blablabla)
        provider: text('provider').notNull(),
        // L'ID unique de l'utilisateur CÔTÉ TWITCH (ex: "12345678")
        providerAccountId: text('provider_account_id').notNull(),

        // Nom de la chaîne pour l'affichage
        accountName: text('account_name'),
        // Avatar de la chaîne
        accountAvatar: text('account_avatar'),

        // Tokens d'accès OAuth
        accessToken: text('access_token').notNull(),
        refreshToken: text('refresh_token'),
        expiresAt: timestamp('expires_at'),
        scope: text('scope'),

        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('user_provider_account_unique_idx').on(table.userId, table.provider, table.providerAccountId)
    ]
)