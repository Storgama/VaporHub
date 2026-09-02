import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('🔑 Utils : Hachage Argon2id (password.js)', () => {
    const plainPassword = 'MonSuperMotDePasseSecret123!';

    it('doit hacher un mot de passe en clair avec Argon2id', async () => {
        const hash = await hashPassword(plainPassword);

        expect(hash).toBeDefined();
        expect(hash).not.toBe(plainPassword);
        expect(hash).toContain('$argon2id$');
    });

    it('doit valider avec succès le mot de passe correct', async () => {
        const hash = await hashPassword(plainPassword);
        const isValid = await verifyPassword(hash, plainPassword);

        expect(isValid).toBe(true);
    });

    it('doit rejeter un mauvais mot de passe', async () => {
        const hash = await hashPassword(plainPassword);
        const isValid = await verifyPassword(hash, 'MauvaisMotDePasse');

        expect(isValid).toBe(false);
    });

    it('doit générer un sel unique (deux hash du même mot de passe sont différents)', async () => {
        const hash1 = await hashPassword(plainPassword);
        const hash2 = await hashPassword(plainPassword);

        expect(hash1).not.toBe(hash2);
    });
});

