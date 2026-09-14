import { z } from 'zod';

const ALLOWED_COMMERCIAL_LENGTHS = [30, 60, 90, 120, 150, 180] as const;

export const commercialSchema = z.object({
    length: z.number({ message: 'La durée doit être un nombre entier' })
        .int({ message: 'La durée doit être un nombre entier' })
        .refine((val) => (ALLOWED_COMMERCIAL_LENGTHS as readonly number[]).includes(val), {
            message: 'Durée non autorisée. Valeurs possibles : 30, 60, 90, 120, 150, 180 secondes'
        })
}).strip();

export const raidSchema = z.object({
    targetLogin: z.string({ message: 'Le pseudo de la chaîne cible est requis' })
        .trim()
        .min(3, { message: 'Le pseudo Twitch doit comporter au moins 3 caractères' })
        .max(25, { message: 'Le pseudo Twitch ne peut pas dépasser 25 caractères' })
        .regex(/^[a-zA-Z0-9_]+$/, { message: 'Le pseudo ne peut contenir que des lettres, des chiffres et des underscores' })
        .transform((val) => val.toLowerCase())
}).strip();

export type CommercialInput = z.infer<typeof commercialSchema>;
export type RaidInput = z.infer<typeof raidSchema>;

