import { and, eq } from 'drizzle-orm';
import { db } from '../db/initBdd.js';
import { discordAlertConfigs, type DiscordAlertConfig } from '../db/schemas/index.js';
import type { AlertConfigInput, UpdateAlertConfigInput } from '../validators/discordValidator.js';

export async function getAlertConfigs(userId: string): Promise<DiscordAlertConfig[]> {
    const configs = await db
        .select()
        .from(discordAlertConfigs)
        .where(eq(discordAlertConfigs.userId, userId));

    return configs || [];
}

export async function getAlertConfig(userId: string): Promise<DiscordAlertConfig | null> {
    const [config] = await db
        .select()
        .from(discordAlertConfigs)
        .where(eq(discordAlertConfigs.userId, userId));

    return config || null;
}

export async function createAlertConfig(
    userId: string,
    data: AlertConfigInput
): Promise<DiscordAlertConfig> {
    const [inserted] = await db
        .insert(discordAlertConfigs)
        .values({
            userId,
            name: data.name?.trim() || 'Alerte de stream',
            guildId: data.guildId,
            channelId: data.channelId,
            roleMention: data.roleMention ?? null,
            customMessage: data.customMessage ?? null,
            isEnabled: data.isEnabled ?? true
        })
        .returning();

    return inserted;
}

export async function updateAlertConfig(
    userId: string,
    alertId: string,
    data: UpdateAlertConfigInput
): Promise<DiscordAlertConfig | null> {
    const [existing] = await db
        .select()
        .from(discordAlertConfigs)
        .where(and(eq(discordAlertConfigs.id, alertId), eq(discordAlertConfigs.userId, userId)));

    if (!existing) {
        return null;
    }

    if (typeof db.update === 'function') {
        const query = db.update(discordAlertConfigs);
        if (query && typeof query.set === 'function') {
            const setQuery = query.set({
                ...(data.name !== undefined && { name: data.name }),
                ...(data.guildId !== undefined && { guildId: data.guildId }),
                ...(data.channelId !== undefined && { channelId: data.channelId }),
                ...(data.roleMention !== undefined && { roleMention: data.roleMention ?? null }),
                ...(data.customMessage !== undefined && { customMessage: data.customMessage ?? null }),
                ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
                updatedAt: new Date()
            });
            if (setQuery && typeof setQuery.where === 'function') {
                await setQuery.where(and(eq(discordAlertConfigs.id, alertId), eq(discordAlertConfigs.userId, userId)));
            }
        }
    }

    const [updated] = await db
        .select()
        .from(discordAlertConfigs)
        .where(and(eq(discordAlertConfigs.id, alertId), eq(discordAlertConfigs.userId, userId)));

    return updated || null;
}

export async function deleteAlertConfig(userId: string, alertId: string): Promise<boolean> {
    const [existing] = await db
        .select()
        .from(discordAlertConfigs)
        .where(and(eq(discordAlertConfigs.id, alertId), eq(discordAlertConfigs.userId, userId)));

    if (!existing) {
        return false;
    }

    await db
        .delete(discordAlertConfigs)
        .where(and(eq(discordAlertConfigs.id, alertId), eq(discordAlertConfigs.userId, userId)));

    return true;
}

export async function saveAlertConfig(
    userId: string,
    data: AlertConfigInput
): Promise<DiscordAlertConfig> {
    const [existing] = await db
        .select()
        .from(discordAlertConfigs)
        .where(eq(discordAlertConfigs.userId, userId));

    if (existing) {
        const updated = await updateAlertConfig(userId, existing.id, data);
        if (updated) return updated;
    }

    return createAlertConfig(userId, data);
}
