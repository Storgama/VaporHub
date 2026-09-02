import { z } from 'zod';
/**
 * Schéma de validation pour l'Inscription
 */
export const registerSchema = z.object({
    email: z.string().trim().email({ message: 'Format d\'email invalide' }),
    username: z.string().trim().min(3, { message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' }).max(30, { message: 'Le nom d\'utilisateur ne peut dépasser 30 caractères' }),
    password: z.string().min(12, { message: 'Le mot de passe doit contenir au moins 12 caractères' })
}).strip(); // Supprime automatiquement tout champ non autorisé (Allowlist stricte)

/**
 * Schéma de validation pour la Connexion
 */
export const loginSchema = z.object({
    email: z.string().trim().email({ message: 'Format d\'email invalide' }),
    password: z.string().min(1, { message: 'Le mot de passe est requis' })
}).strip();