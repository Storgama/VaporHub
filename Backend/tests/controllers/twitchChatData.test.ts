import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';
import { mockSelectReturn } from '../helpers/dbMock.js';
import { getTwitchBadges, getTwitchEmotes } from '../../src/controllers/twitchController.js';
import * as twitchService from '../../src/services/twitchService.js';

describe('🎮 Contrôleur : Données du Tchat Twitch (Badges & Émotes)', () => {
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
            query: {}
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    });

    describe('getTwitchBadges', () => {
        it('doit renvoyer 401 si non authentifié', async () => {
            req.user = undefined;
            await getTwitchBadges(req as any, res as any, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('doit renvoyer les badges de simulation si mock=true sans appeler Helix', async () => {
            req.query = { mock: 'true' };

            await getTwitchBadges(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                badges: expect.objectContaining({
                    moderator: expect.any(Object),
                    vip: expect.any(Object),
                    artist: expect.any(Object),
                    zevent: expect.any(Object)
                })
            }));
        });

        it('doit récupérer et fusionner les badges globaux et de chaîne', async () => {
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'fetchGlobalBadges').mockResolvedValueOnce([
                { set_id: 'moderator', versions: [{ id: '1', image_url_1x: 'https://badges/mod_1x.png' }] }
            ]);
            vi.spyOn(twitchService, 'fetchChannelBadges').mockResolvedValueOnce([
                { set_id: 'subscriber', versions: [{ id: '12', image_url_1x: 'https://badges/sub12_1x.png' }] }
            ]);

            await getTwitchBadges(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                badges: expect.objectContaining({
                    moderator: expect.any(Object),
                    subscriber: expect.any(Object)
                })
            }));
        });
    });

    describe('getTwitchEmotes', () => {
        it('doit renvoyer 401 si non authentifié', async () => {
            req.user = undefined;
            await getTwitchEmotes(req as any, res as any, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('doit renvoyer les émotes personnalisées de simulation si mock=true', async () => {
            req.query = { mock: 'true' };

            await getTwitchEmotes(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                emotes: expect.arrayContaining([
                    expect.objectContaining({ name: 'vaporHype' }),
                    expect.objectContaining({ name: 'vaporGg' })
                ])
            }));
        });

        it('doit récupérer les émotes de chaîne du streamer via twitchService', async () => {
            mockSelectReturn([{
                id: 'tok_1',
                providerAccountId: 'broadcaster_999',
                accessToken: 'encrypted_tok'
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('fresh_access_token');
            vi.spyOn(twitchService, 'fetchChannelEmotes').mockResolvedValueOnce([
                { id: 'em_1', name: 'streamerPog', images: { url_1x: 'https://emotes/1.png' } }
            ]);

            await getTwitchEmotes(req as any, res as any, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                emotes: expect.arrayContaining([
                    expect.objectContaining({ name: 'streamerPog' })
                ])
            }));
        });
    });
});

