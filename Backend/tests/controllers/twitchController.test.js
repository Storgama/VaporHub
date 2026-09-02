import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getTwitchAuthUrl, 
    twitchCallback,
    getCurrentLiveStatus, 
    getStreamHistory, 
    getStreamMetrics,
    getAnalyticsSummary
} from '../../src/controllers/twitchController.js';
import { db } from '../../src/db/initBdd.js';
import * as twitchService from '../../src/services/twitchService.js';
import * as trackerService from '../../src/services/streamTrackerService.js';
import * as analyticsService from '../../src/services/analyticsService.js';

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

            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=twitch_denied'));
        });

        it('doit insérer un nouveau token si aucun token n\'existait en BDD', async () => {
            req.query = { code: 'valid_oauth_code', state: 'user_123' };

            const mockTokens = { access_token: 'access_123', refresh_token: 'refresh_123', expires_in: 14400, scope: ['user:read:email'] };
            const mockUser = { id: 'twitch_acc_99', display_name: 'StreamerTest' };

            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce(mockTokens);
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce(mockUser);

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
            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('twitch_linked=true'));
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
    });

    describe('4. Historique et Métriques Enrichies de Rétention', () => {
        it('doit renvoyer l\'historique des streams', async () => {
            const mockHistory = [{ id: '1', title: 'Live 1' }];
            vi.spyOn(trackerService, 'getSessionsHistory').mockResolvedValueOnce(mockHistory);

            await getStreamHistory(req, res, next);

            expect(res.json).toHaveBeenCalledWith(mockHistory);
        });

        it('doit renvoyer la session, ses points et son analyse de rétention calculée', async () => {
            req.params.sessionId = '123';
            const mockData = { session: { id: '123', title: 'Live Test' }, metrics: [{ viewerCount: 50 }] };
            const mockRetention = { retentionRate: 85, watchTimeHours: 120, retentionTier: { label: 'Audience Captive' } };

            vi.spyOn(trackerService, 'getSessionMetrics').mockResolvedValueOnce(mockData);
            vi.spyOn(analyticsService, 'calculateRetentionMetrics').mockReturnValueOnce(mockRetention);

            await getStreamMetrics(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                ...mockData,
                retention: mockRetention
            });
        });
    });

    describe('5. Résumé Global des Analytics (getAnalyticsSummary)', () => {
        it('doit renvoyer le résumé des 30 derniers jours avec KPIs de rétention', async () => {
            const mockHistory = [
                { id: '1', title: 'Live 1' },
                { id: '2', title: 'Live 2' }
            ];

            vi.spyOn(trackerService, 'getSessionsHistory').mockResolvedValueOnce(mockHistory);
            vi.spyOn(trackerService, 'getSessionMetrics')
                .mockResolvedValueOnce({ session: mockHistory[0], metrics: [{ viewerCount: 50 }] })
                .mockResolvedValueOnce({ session: mockHistory[1], metrics: [{ viewerCount: 80 }] });

            const mockSummary = {
                totalStreams: 2,
                totalWatchTimeHours: 200,
                overallRetentionRate: 85
            };

            vi.spyOn(analyticsService, 'computeMonthlySummary').mockReturnValueOnce(mockSummary);

            await getAnalyticsSummary(req, res, next);

            expect(res.json).toHaveBeenCalledWith(mockSummary);
        });
    });
});
