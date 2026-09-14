import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/validators/authValidator.js';

describe('🛡️ Validateur : authValidator', () => {

    describe('registerSchema', () => {
        it('doit valider et assainir un payload d\'inscription valide', () => {
            const validData = {
                email: 'streamer@vaporhub.test',
                username: 'StreamerPro',
                password: 'SuperPassword123!',
                injectedField: 'hack'
            };

            const result = registerSchema.safeParse(validData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('streamer@vaporhub.test');
                expect(result.data.username).toBe('StreamerPro');
                // Allowlist : le champ injecté doit être supprimé
                expect((result.data as Record<string, unknown>).injectedField).toBeUndefined();
            }
        });

        it('doit rejeter un email mal formaté', () => {
            const result = registerSchema.safeParse({
                email: 'invalid-email',
                username: 'StreamerPro',
                password: 'SuperPassword123!'
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe('Format d\'email invalide');
            }
        });

        it('doit rejeter un username de moins de 3 caractères', () => {
            const result = registerSchema.safeParse({
                email: 'test@vaporhub.test',
                username: 'ab',
                password: 'SuperPassword123!'
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe('Le nom d\'utilisateur doit contenir au moins 3 caractères');
            }
        });

        it('doit rejeter un username de plus de 30 caractères', () => {
            const result = registerSchema.safeParse({
                email: 'test@vaporhub.test',
                username: 'a'.repeat(31),
                password: 'SuperPassword123!'
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe('Le nom d\'utilisateur ne peut dépasser 30 caractères');
            }
        });

        it('doit rejeter un mot de passe de moins de 12 caractères', () => {
            const result = registerSchema.safeParse({
                email: 'test@vaporhub.test',
                username: 'StreamerPro',
                password: 'Court123!' // 9 chars
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe('Le mot de passe doit contenir au moins 12 caractères');
            }
        });
    });

    describe('loginSchema', () => {
        it('doit valider les identifiants bien formés', () => {
            const result = loginSchema.safeParse({
                email: 'streamer@vaporhub.test',
                password: 'MonMotDePasse123!'
            });

            expect(result.success).toBe(true);
        });

        it('doit rejeter si le mot de passe est vide', () => {
            const result = loginSchema.safeParse({
                email: 'streamer@vaporhub.test',
                password: ''
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0]?.message).toBe('Le mot de passe est requis');
            }
        });
    });

});