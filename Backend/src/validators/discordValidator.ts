import { z } from 'zod';

const discordSnowflakeRegex = /^\d{17,20}$/;

export const alertConfigSchema = z.object({
    name: z
        .string()
        .max(100, { message: 'Le nom de l\'alerte ne peut excéder 100 caractères' })
        .optional()
        .default('Alerte de stream'),
    guildId: z
        .string()
        .regex(discordSnowflakeRegex, { message: 'L\'ID du serveur Discord doit comporter entre 17 et 20 chiffres' }),
    channelId: z
        .string()
        .regex(discordSnowflakeRegex, { message: 'L\'ID du salon Discord doit comporter entre 17 et 20 chiffres' }),
    roleMention: z
        .string()
        .max(100, { message: 'La mention de rôle ne peut excéder 100 caractères' })
        .optional()
        .nullable(),
    customMessage: z
        .string()
        .max(2000, { message: 'Le message personnalisé ne peut excéder 2000 caractères' })
        .optional()
        .nullable(),
    isEnabled: z
        .boolean()
        .optional()
        .default(true)
}).strip();

export const updateAlertConfigSchema = alertConfigSchema.partial();

export const heartbeatSchema = z.object({
    botUsername: z.string().max(100).optional(),
    status: z.enum(['online', 'offline']).optional().default('online')
}).strip();

export type AlertConfigInput = z.infer<typeof alertConfigSchema>;
export type UpdateAlertConfigInput = z.infer<typeof updateAlertConfigSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;

