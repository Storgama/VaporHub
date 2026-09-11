import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { checkFeatureAccess } from '../../src/middlewares/checkFeatureAccess.js';

/**
*  TODO: a faire quand on mettra des droit d'accès plus tard 
*/
describe('🛡️ Middleware : checkFeatureAccess', () => {
    it('doit appeler next() pour laisser passer les requêtes en V1', async () => {
        const middleware = checkFeatureAccess();
        const req = {} as Request;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        } as unknown as Response;
        const next = vi.fn();

        req.url = ".../AnalyticAccess/...";

        await middleware(req, res, next as unknown as NextFunction);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});