import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '../../src/utils/encryption.js';

describe('🛡️ Utils : Chiffrement AES-256-GCM (encryption.js)', () => {
    const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    beforeEach(() => {
        process.env.ENCRYPTION_KEY = TEST_KEY;
    });

    it('doit chiffrer et déchiffrer une chaîne de caractères à l\'identique', () => {
        const secretText = 'twitch_oauth_access_token_super_secret_123456';
        
        const encrypted = encrypt(secretText);
        expect(encrypted).not.toBeNull();
        expect(encrypted).not.toBe(secretText);

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(secretText);
    });

    it('doit retourner null si l\'entrée est vide ou nulle', () => {
        expect(encrypt(null)).toBeNull();
        expect(encrypt('')).toBeNull();
        expect(decrypt(null)).toBeNull();
        expect(decrypt('')).toBeNull();
    });

    it('doit respecter le format iv:authTag:donnees (3 parties séparées par des deux-points)', () => {
        const encrypted = encrypt('token_test');
        const parts = encrypted.split(':');
        
        expect(parts).toHaveLength(3);
        expect(parts[0]).toHaveLength(24);
        expect(parts[1]).toHaveLength(32);
    });

    it('doit lever une erreur si la clé ENCRYPTION_KEY est absente ou invalide', () => {
        delete process.env.ENCRYPTION_KEY;
        expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY doit être une chaîne hexadécimale de 64 caractères');

        process.env.ENCRYPTION_KEY = 'trop_courte';
        expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY doit être une chaîne hexadécimale de 64 caractères');
    });

    it('doit lever une erreur si le format chiffré est corrompu lors du déchiffrement', () => {
        expect(() => decrypt('iv_seul')).toThrow('Format de texte chiffré invalide');
        expect(() => decrypt('iv:tag')).toThrow('Format de texte chiffré invalide');
    });

    it('doit échouer au déchiffrement si le tag ou le contenu a été altéré', () => {
        const encrypted = encrypt('donnee_secrete');
        const parts = encrypted.split(':');
        
        const corruptedTag = parts[0] + ':ffffffffffffffffffffffffffffffff:' + parts[2];
        expect(() => decrypt(corruptedTag)).toThrow();
    });
});

