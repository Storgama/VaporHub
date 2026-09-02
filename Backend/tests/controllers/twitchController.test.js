import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getTwitchAuthUrl, 
    twitchCallback,
    getCurrentLiveStatus, 
    getStreamHistory, 
    getStreamMetrics 
} from '../../src/controllers/twitchController.js';
import { db } from '../../src/db/initBdd.js';
import * as twitchService from '../../src/services/twitchService.js';
import * as trackerService from '../../src/services/streamTrackerService.js';

vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn()
    }
}));

describe('🎮 Controller : Twitch (twitchController.js)', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        req = { user: { userId: 'user_123' }, params: {}, query: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            redirect: vi.fn()
        };
        next = vi.fn();
    });

    describe('1. URL d\'autorisation OAuth (getTwitchAuthUrl)', () => {
        it('doit renvoyer l\'URL générée par le service', async () => {
            vi.spyOn(twitchService, 'buildAuthUrl').mockReturnValueOnce('https://twitch.tv/auth_url');

            await getTwitchAuthUrl(req, res, next);

            expect(res.json).toHaveBeenCalledWith({ url: 'https://twitch.tv/auth_url' });
        });
    });

    describe('2. Callback OAuth Twitch (twitchCallback)', () => {
        it('doit rediriger avec une erreur si le code est manquant ou si Twitch renvoie une erreur', async () => {
            req.query = { error: 'access_denied' };

            await twitchCallback(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/?error=twitch_denied');
        });

        it('doit insérer un nouveau token si aucun token n\'existait en BDD', async () => {
            req.query = { code: 'valid_oauth_code', state: 'user_123' };

            const mockTokens = { access_token: 'access_123', refresh_token: 'refresh_123', expires_in: 14400, scope: ['user:read:email'] };
            const mockUser = { id: 'twitch_acc_99', display_name: 'StreamerTest' };

            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce(mockTokens);
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce(mockUser);

            // Aucun token existant en BDD
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            db.insert.mockReturnValueOnce({
                values: vi.fn().mockResolvedValueOnce({})
            });

            await twitchCallback(req, res, next);

            expect(db.insert).toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/?twitch_linked=true');
        });

        it('doit mettre à jour le token si l\'utilisateur avait déjà lié sa chaîne', async () => {
            req.query = { code: 'valid_oauth_code', state: 'user_123' };

            const mockTokens = { access_token: 'access_123', refresh_token: 'refresh_123', expires_in: 14400 };
            const mockUser = { id: 'twitch_acc_99', display_name: 'StreamerTest' };

            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce(mockTokens);
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce(mockUser);

            // Token existant trouvé
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([{ id: 'existing_token_id' }])
                })
            });

            db.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce({})
                })
            });

            await twitchCallback(req, res, next);

            expect(db.update).toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/?twitch_linked=true');
        });
    });

    describe('3. Statut du direct (getCurrentLiveStatus)', () => {
        it('doit renvoyer linked: false si aucun token n\'est en base', async () => {
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            await getCurrentLiveStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                linked: false,
                message: 'Aucun compte Twitch lié'
            });
        });

        it('doit renvoyer linked: true et isLive: false si la chaîne est hors ligne', async () => {
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([{ accessToken: 'token_chiffre', providerAccountId: 'tw_123' }])
                })
            });

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({ display_name: 'StreamerName', profile_image_url: 'avatar.png' });
            vi.spyOn(twitchService, 'fetchLiveStream').mockResolvedValueOnce(null);
            vi.spyOn(trackerService, 'closeOpenSession').mockResolvedValueOnce();

            await getCurrentLiveStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                linked: true,
                channel: 'StreamerName',
                avatar: 'avatar.png',
                isLive: false,
                viewerCount: 0
            });
        });

        it('doit renvoyer les infos enrichies et enregistrer la session si en live', async () => {
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([{ accessToken: 'token_chiffre', providerAccountId: 'tw_123' }])
                })
            });

            const mockStream = {
                title: 'Live en cours !',
                game_name: 'Valorant',
                viewer_count: 88,
                started_at: '2026-09-02T10:00:00Z',
                thumbnail_url: 'https://thumb_{width}x{height}.jpg'
            };

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({ display_name: 'StreamerName', profile_image_url: 'avatar.png' });
            vi.spyOn(twitchService, 'fetchLiveStream').mockResolvedValueOnce(mockStream);
            vi.spyOn(trackerService, 'recordLiveSession').mockResolvedValueOnce();

            await getCurrentLiveStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                linked: true,
                isLive: true,
                viewerCount: 88,
                title: 'Live en cours !',
                thumbnailUrl: 'https://thumb_320x180.jpg'
            }));
        });
    });

    describe('4. Historique et Graphiques', () => {
        it('doit renvoyer l\'historique des streams', async () => {
            const mockHistory = [{ id: '1', title: 'Live 1' }];
            vi.spyOn(trackerService, 'getSessionsHistory').mockResolvedValueOnce(mockHistory);

            await getStreamHistory(req, res, next);

            expect(res.json).toHaveBeenCalledWith(mockHistory);
        });

        it('doit renvoyer 404 si la session demandée n\'existe pas', async () => {
            req.params.sessionId = '999';
            vi.spyOn(trackerService, 'getSessionMetrics').mockResolvedValueOnce(null);

            await getStreamMetrics(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Session introuvable' });
        });

        it('doit renvoyer la session et ses points métriques avec succès', async () => {
            req.params.sessionId = '123';
            const mockData = { session: { id: '123', title: 'Live Test' }, metrics: [{ viewerCount: 50 }] };
            vi.spyOn(trackerService, 'getSessionMetrics').mockResolvedValueOnce(mockData);

            await getStreamMetrics(req, res, next);

            expect(res.json).toHaveBeenCalledWith(mockData);
        });
    });
});
