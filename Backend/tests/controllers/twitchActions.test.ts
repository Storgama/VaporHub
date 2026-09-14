import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';
import { mockSelectReturn } from '../helpers/dbMock.js';
import { 
    triggerCommercial, 
    startRaid, 
    cancelRaid, 
    snoozeAd 
} from '../../src/controllers/twitchController.js';
import * as twitchService from '../../src/services/twitchService.js';

describe('🎮 Contrôleur : Actions Rapides Twitch (Pubs, Raids, Snooze)', () => {
    let req: Partial<Request> & { user?: { userId: string; role?: string } };
    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

        req = {
            user: { userId: 'user_123', role: 'streamer' },
            body: {},
            query: {}
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    });

    describe('triggerCommercial', () => {
        it('doit renvoyer 401 si non authentifié', async () => {
            req.user = undefined;
            await triggerCommercial(req as any, res as any, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('doit simuler une pub si mock=true sans appeler l\'API Twitch', async () => {
            req.query = { mock: 'true' };
            req.body = { length: 60 };

            await triggerCommercial(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                length: 60,
                retryAfter: expect.any(Number),
                simulated: true
            }));
        });

        it('doit renvoyer 404 si aucun compte Twitch n\'est lié', async () => {
            req.body = { length: 60 };
            mockSelectReturn([]); // Pas de token en BDD

            await triggerCommercial(req as any, res as any, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Aucun compte Twitch lié' });
        });

        it('doit déclencher la pub avec succès via twitchService', async () => {
            req.body = { length: 90 };
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'triggerCommercial').mockResolvedValueOnce({
                length: 90,
                message: '',
                retry_after: 300
            });

            await triggerCommercial(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                length: 90,
                retryAfter: 300,
                message: 'Coupure publicitaire de 90s lancée'
            });
        });

        it('doit renvoyer 400 si l\'API Twitch renvoie une erreur (ex: non affilié)', async () => {
            req.body = { length: 60 };
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'triggerCommercial').mockRejectedValueOnce(new Error('Broadcaster is not affiliated'));

            await triggerCommercial(req as any, res as any, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Broadcaster is not affiliated')
            }));
        });
    });

    describe('startRaid', () => {
        it('doit simuler un raid si mock=true sans appeler l\'API Twitch', async () => {
            req.query = { mock: 'true' };
            req.body = { targetLogin: 'zerator' };

            await startRaid(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                targetLogin: 'zerator',
                simulated: true
            }));
        });

        it('doit lancer le raid vers la chaîne cible avec succès', async () => {
            req.body = { targetLogin: 'mon_ami' };
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'startRaid').mockResolvedValueOnce({
                created_at: '2026-09-14T12:00:00Z',
                is_mature: false
            });

            await startRaid(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                targetLogin: 'mon_ami',
                createdAt: '2026-09-14T12:00:00Z'
            });
        });

        it('doit renvoyer 404 si la chaîne cible est introuvable', async () => {
            req.body = { targetLogin: 'introuvable_xyz' };
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'startRaid').mockRejectedValueOnce(new Error('Chaîne cible introuvable'));

            await startRaid(req as any, res as any, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Chaîne cible introuvable' });
        });
    });

    describe('cancelRaid', () => {
        it('doit simuler l\'annulation de raid en mode mock', async () => {
            req.query = { mock: 'true' };

            await cancelRaid(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                canceled: true,
                simulated: true
            }));
        });

        it('doit annuler le raid via twitchService', async () => {
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'cancelRaid').mockResolvedValueOnce(true);

            await cancelRaid(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                canceled: true
            });
        });
    });

    describe('snoozeAd', () => {
        it('doit simuler le snooze de pub en mode mock', async () => {
            req.query = { mock: 'true' };

            await snoozeAd(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                snoozed: true,
                simulated: true
            }));
        });

        it('doit reporter la pub via twitchService', async () => {
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'snoozeNextAd').mockResolvedValueOnce({
                snooze_count: 1,
                snooze_refresh_at: 1234567,
                next_ad_at: 9999999
            });

            await snoozeAd(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                snoozed: true,
                nextAdAt: 9999999
            });
        });
    });
});