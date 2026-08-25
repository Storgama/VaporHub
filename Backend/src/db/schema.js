import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNullable().unique(),
    username: text('username').notNullable(),
    createdAt: timestamp('created_at').defaultNow().notNullable(),
    updatedAt: timestamp('updatedAt').defaultNow().notNullable()
});