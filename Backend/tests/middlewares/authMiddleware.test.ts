//import pour ecrire les tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { requireAuth } from '../../src/middlewares/authMiddleware.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

describe('🛡️ Middleware : Auth', () => {
    let req: Partial<Request> & { 
        headers: Record<string, string | undefined>;
         user?: { userId: string; role?: string } 
        };

    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };

    let next: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        process.env.JWT_ACCESS_SECRET = 'test_access_secret_123';
        process.env.JWT_ACCESS_EXPIRES_IN = '15m';

        req = { headers: {} };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    });


    it('doit renvoyer 401 si le header Authorization est absent', () => {
        req.headers = {};

        requireAuth(req as Request, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('doit renvoyer 401 si le header ne commence pas par "Bearer "', () => {
        req.headers = { authorization: 'Basic 12345' };

        requireAuth(req as Request, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);        
        expect(next).not.toHaveBeenCalled();
    });

    it('doit renvoyer 403 si le token est invalide ou expiré', () => {
        req.headers = { authorization: 'Bearer token_completement_invalide' };

        requireAuth(req as Request, res as unknown as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(next).not.toHaveBeenCalled();
    });

    it('doit injecter req.user et appeler next() si le token est valide', () => {
        const token = generateAccessToken({ userId: 'user_123', role: 'streamer' });
       
        req.headers = { authorization: `Bearer ${token}` };

        requireAuth(req as Request, res as unknown as Response, next);

        expect(req.user).toBeDefined();
        expect(req.user?.userId).toBe('user_123');
        expect(req.user?.role).toBe('streamer');
        expect(next).toHaveBeenCalledTimes(1);
    });
});