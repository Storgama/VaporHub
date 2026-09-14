import { z } from 'zod';

/**
 * Schéma de validation pour l'Inscription (Zod 4)
 * Allowlist stricte via .strip()
 */
export const registerSchema = z.object({
    email: z.email({ message: 'Format d\'email invalide' }).trim(),
    username: z.string()
        .trim()
        .min(3, { message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' })
        .max(30, { message: 'Le nom d\'utilisateur ne peut dépasser 30 caractères' }),
    password: z.string()
        .min(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
}).strip();

/**
 * Schéma de validation pour la Connexion (Zod 4)
 * Allowlist stricte via .strip()
 */
export const loginSchema = z.object({
    email: z.email({ message: 'Format d\'email invalide' }).trim(),
    password: z.string()
        .min(1, { message: 'Le mot de passe est requis' })
}).strip();

/**
 * Inférence statique des types TypeScript
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

