import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../../src/middlewares/authMiddleware.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

describe('🛡️ Middleware : requireAuth (authMiddleware.js)', () => {
    beforeEach(() => {
        process.env.JWT_ACCESS_SECRET = 'test_access_secret_123';
        process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    });

    it('doit renvoyer 401 si le header Authorization est absent', () => {
        const req = { headers: {} };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Accès refusé : Token d\'authentification manquant'
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('doit renvoyer 401 si le header ne commence pas par "Bearer "', () => {
        const req = { headers: { authorization: 'Basic 12345' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('doit renvoyer 403 si le token est invalide ou expiré', () => {
        const req = { headers: { authorization: 'Bearer token_completement_invalide' } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(next).not.toHaveBeenCalled();
    });

    it('doit injecter req.user et appeler next() si le token est valide', () => {
        const token = generateAccessToken({ userId: 'user_123', role: 'streamer' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('user_123');
        expect(req.user.role).toBe('streamer');
        expect(next).toHaveBeenCalledTimes(1);
    });
});

