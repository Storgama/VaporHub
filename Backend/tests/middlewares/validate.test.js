import { describe, it, expect, vi } from 'vitest';
import { validate } from '../../src/middlewares/validate.js';
import { registerSchema, loginSchema } from '../../src/validators/authValidator.js';

describe('🛡️ TDD : Validation des Entrées avec Zod (validate.js & authValidator.js)', () => {

    describe('1. Validation Inscription (registerSchema)', () => {
        it('doit rejeter un email invalide avec un code HTTP 400', async () => {
            const req = { body: { email: 'format_invalide', username: 'StreamerPro', password: 'MotDePasseTresLong123!' } };
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
            const next = vi.fn();

            const middleware = validate(registerSchema);
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('email')
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it('doit rejeter un mot de passe de moins de 12 caractères (Point 3)', async () => {
            const req = { body: { email: 'test@test.com', username: 'StreamerPro', password: 'Court123!' } }; // 9 chars
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
            const next = vi.fn();

            const middleware = validate(registerSchema);
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('12 caractères')
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it('doit rejeter un nom d\'utilisateur de moins de 3 caractères', async () => {
            const req = { body: { email: 'test@test.com', username: 'Ab', password: 'MotDePasseTresLong123!' } };
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
            const next = vi.fn();

            const middleware = validate(registerSchema);
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });

        it('doit laisser passer et assainir les données si tout est valide (Point 30 - Allowlist)', async () => {
            const req = { 
                body: { 
                    email: 'valide@test.com', 
                    username: 'StreamerValide', 
                    password: 'MotDePasseUltraSecurise123!',
                    hacker_field: 'champ_a_supprimer' // Ne doit pas traverser
                } 
            };
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
            const next = vi.fn();

            const middleware = validate(registerSchema);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(req.body.hacker_field).toBeUndefined(); // Champ non autorisé filtré
            expect(req.body.email).toBe('valide@test.com');
        });
    });

    describe('2. Validation Connexion (loginSchema)', () => {
        it('doit valider les identifiants bien formés', async () => {
            const req = { body: { email: 'streamer@test.com', password: 'MonMotDePasse123!' } };
            const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
            const next = vi.fn();

            const middleware = validate(loginSchema);
            await middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
        });
    });

});

