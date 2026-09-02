import { describe, it, expect, vi } from 'vitest';
import { checkFeatureAccess } from '../../src/middlewares/checkFeatureAccess.js';

describe('🛡️ Middleware : checkFeatureAccess (checkFeatureAccess.js)', () => {
    it('doit appeler next() pour laisser passer les requêtes en V1', async () => {
        const middleware = checkFeatureAccess('twitch_analytics');
        const req = {};
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});

