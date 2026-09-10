//import pour ecrire les tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { mockSelectReturn, mockInsertResolve, mockUpdateResolve } from '../helpers/dbMock.js';

//tout ce qu'il faut pour tester twitchController
import { 
    getTwitchAuthUrl, 
    twitchCallback,
    getCurrentLiveStatus, 
    getStreamHistory, 
    getStreamMetrics,
    getAnalyticsSummary,
    getAnalyticsBreakdown,
    getTwitchAdSchedule
} from '../../src/controllers/twitchController.js';
import * as twitchService from '../../src/services/twitchService.js';
import * as encryptionUtils from '../../src/utils/encryption.js';
import * as trackerService from '../../src/services/streamTrackerService.js';
import * as analyticsService from '../../src/services/analyticsService.js';

describe('controller : twitchController', () => {
    let req: Partial<Request> & { user?: {userId: string; role?: string}};
    let res: {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
        redirect: ReturnType<typeof vi.fn>;
    }
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

        req = {
            user: {userId: 'user_123', role: 'streamer'},
            params: {},
            query: {}
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            redirect: vi.fn()
        };

        next = vi.fn();
    });

    describe('getTwitchAuthUrl', async () => {
        it('doit renvoyer l\'URL générée par le service avec l\'ID utilisateur', async () => {
            // Simulation du retour du service Twitch
            vi.spyOn(twitchService, 'buildAuthUrl').mockReturnValueOnce('https://id.twitch.tv/oauth2/authorize?client_id=123');
            
            await getTwitchAuthUrl(req as Request, res as unknown as Response, next);
            
            // Vérifie que le service a bien reçu l'ID de l'utilisateur connecté
            expect(twitchService.buildAuthUrl).toHaveBeenCalledWith('user_123');
            // Vérifie la réponse JSON renvoyée au frontend
            expect(res.json).toHaveBeenCalledWith({
                url: 'https://id.twitch.tv/oauth2/authorize?client_id=123'
            });
        });

        it('doit transmettre l\'erreur à next() si le service échoue', async () => {
            const fakeError = new Error('Config Twitch manquante');

            vi.spyOn(twitchService, 'buildAuthUrl').mockImplementationOnce(() => {
                throw fakeError;
            });

            await getTwitchAuthUrl(req as Request, res as unknown as Response, next);

            expect(next).toHaveBeenCalledWith(fakeError);
        });
    })

    describe('twitchCallback', () => {
        it('redirect si refus connexion', async () => {
            req.query = { error: 'access_denied' };

            await twitchCallback(req as Request, res as unknown as Response, next);

            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=twitch_denied'));
        });

        it('Garantie de sécu: obligation de chiffrer les token', async () => {
            req.query = {
                code: 'oauth_code_xyz',
                state: 'user_123'
            }

            const rawAccessToken = 'raw_twitch_super_secret_access_token';
            const rawRefreshToken = 'raw_twitch_super_secret_refresh_token';

            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce({
                access_token: rawAccessToken,
                refresh_token: rawRefreshToken,
                expires_in: 3600,
                scope: ['user:read:email']
            });

            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({ 
                id: 'twitch_123' 
            });

            //On espoinne la fonction de chiffrement
            const encryptSpy = vi.spyOn(encryptionUtils, 'encrypt');

            mockSelectReturn([]);
            mockInsertResolve();

            await twitchCallback(req as Request, res as unknown as Response, next);

            // 1. Vérification que encrypt() a été appelé avec les tokens bruts
            expect(encryptSpy).toHaveBeenCalledWith(rawAccessToken);

            expect(encryptSpy).toHaveBeenCalledWith(rawRefreshToken);
        });

        it('doit échouer et appeler next(error) si le chiffrement échoue', async () => {
            
            req.query = { 
                code: 'oauth_code_xyz', 
                state: 'user_123' 
            };

            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce({
                access_token: 'token',
                refresh_token: 'refresh',
                expires_in: 3600
            });

            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({ 
                id: 'twitch_123' 
            });
            
            // On simule une panne du moteur de chiffrement (clé invalide, etc.)
            const encryptionError = new Error('Échec du chiffrement');

            vi.spyOn(encryptionUtils, 'encrypt').mockImplementationOnce(() => {
                throw encryptionError;
            });

            mockSelectReturn([]);

            await twitchCallback(req as Request, res as unknown as Response, next);

            // Vérifie que l'erreur est bien remontée au middleware Express
            expect(next).toHaveBeenCalledWith(encryptionError);

            // Vérifie qu'on n'a JAMAIS redirigé vers le succès
            expect(res.redirect).not.toHaveBeenCalledWith(
                expect.stringContaining('twitch_linked=true')
            );
        });

        it('chiffre bien les token et insert en bdd', async () => {
            req.query = {
                code: 'valid_oauth_code',
                state: 'user_123'
            };

            const mockTokenData = {
                access_token: 'twitch_raw_access',
                refresh_token: 'twitch_raw_refresh',
                expires_in: 3600,
                scope: ['user:read:email']
            };

            const mockTwitchProfile = { 
                id: 'twitch_acc_99', 
                display_name: 'StreamerTest' 
            };

            // 1. Mock des appels API Twitch
            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce(mockTokenData);
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce(mockTwitchProfile);
        
            // 2. Mock BDD : aucun token existant pour cet utilisateur -> Insertion
            mockSelectReturn([]);
            mockInsertResolve();

            // 3. Exécution
            await twitchCallback(req as Request, res as unknown as Response, next);

            expect(res.redirect).toHaveBeenCalledWith(
                expect.stringContaining('twitch_linked=true')
            );
        });

        it('doit mettre à jour les tokens en BDD si le compte était déjà lié', async () => {
            req.query = { code: 'valid_oauth_code', state: 'user_123' };

            const mockTokenData = {
                access_token: 'new_raw_access',
                refresh_token: 'new_raw_refresh',
                expires_in: 3600,
                scope: ['user:read:email']
            };

            const mockTwitchProfile = { id: 'twitch_acc_99', display_name: 'StreamerTest' };
            
            vi.spyOn(twitchService, 'exchangeCodeForTokens').mockResolvedValueOnce(mockTokenData);
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce(mockTwitchProfile);
            
            // Mock BDD : un token existe déjà -> Mise à jour
            mockSelectReturn([{ id: 'existing_token_row_id' }]);
            mockUpdateResolve();
            
            await twitchCallback(req as Request, res as unknown as Response, next);
            
            expect(res.redirect).toHaveBeenCalledWith(
                expect.stringContaining('twitch_linked=true')
            );
        });
    });

    describe('getCurrentLiveStatus', () => {
        it('Garanti Secu : le mock doit être ignorer en mod Prod', async () => {
            process.env.NODE_ENV = 'production';
            req.query = {
                mock: 'true'
            };

            mockSelectReturn([]);

            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);

            // doit renvoyer un reponse BDD
            expect(res.json).toHaveBeenCalledWith({
                linked: false,
                message: 'Aucun compte Twitch lié'
            });
        })

        it('Mode Mock Dev : doit renvoyer un faux live en direct si ?mock=true hors production', async () => {
            
            process.env.NODE_ENV = 'development';
            
            req.query = { mock: 'true' };
            
            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);
            
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                linked: true,
                isLive: true,
                channel: expect.stringContaining('Mock Live'),
                viewerCount: 84
            }));
        });

        it('doit renvoyer Connexion expirée si le token ne peut pas être rafraîchi', async () => {
            mockSelectReturn([{ 
                providerAccountId: '123' 
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce(null);
            
            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);
            
            expect(res.json).toHaveBeenCalledWith({
                linked: false,
                message: 'Connexion expirée'
            });
        });

         it('doit clore la session et renvoyer isLive: false si le streamer est hors ligne', async () => {
            mockSelectReturn([{ 
                providerAccountId: '123' 
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');
            
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({
                display_name: 'Pominus',
                profile_image_url: 'https://avatar.png'
            });
            
            // Pas de stream en cours
            vi.spyOn(twitchService, 'fetchLiveStream').mockResolvedValueOnce(null);
            
            const closeSpy = vi.spyOn(trackerService, 'closeOpenSession').mockResolvedValueOnce({} as unknown as void);
            
            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);
            
            expect(closeSpy).toHaveBeenCalledWith('user_123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                linked: true,
                isLive: false,
                viewerCount: 0
            }));
        });

        it('doit enregistrer la session et renvoyer isLive: true quand le stream est actif', async () => {
            mockSelectReturn([{ 
                providerAccountId: '123' 
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce(
                'valid_token'
            );
            
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({
                display_name: 'Pominus',
                profile_image_url: 'https://avatar.png'
            });
            
            const mockStream = {
                title: 'Live Chill',
                game_name: 'Just Chatting',
                viewer_count: 150,
                started_at: '2026-09-09T20:00:00Z',
                thumbnail_url: 'https://thumb-{width}x{height}.jpg'
            };

            vi.spyOn(twitchService, 'fetchLiveStream').mockResolvedValueOnce(mockStream as any);
            
            const recordSpy = vi.spyOn(trackerService, 'recordLiveSession').mockResolvedValueOnce({} as any);
            
            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);
            
            // Vérifie que le tracker enregistre bien le stream
            expect(recordSpy).toHaveBeenCalledWith('user_123', mockStream);
            
            // Vérifie le payload renvoyé (avec thumbnail)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                linked: true,
                isLive: true,
                channel: 'Pominus',
                viewerCount: 150,
                thumbnailUrl: 'https://thumb-320x180.jpg'
            }));
        });

        it('doit clore la session et renvoyer isLive: false si le streamer est hors ligne', async () => {
            mockSelectReturn([{ 
                providerAccountId: '123' 
            }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');
            
            vi.spyOn(twitchService, 'fetchUserProfile').mockResolvedValueOnce({
                display_name: 'Pominus',
                profile_image_url: 'https://avatar.png'
            });
            
            vi.spyOn(twitchService, 'fetchLiveStream').mockResolvedValueOnce(null);
            
            const closeSpy = vi.spyOn(trackerService, 'closeOpenSession').mockResolvedValueOnce(
                {} as any
            );

            await getCurrentLiveStatus(req as Request, res as unknown as Response, next);

            expect(closeSpy).toHaveBeenCalledWith('user_123');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                linked: true,
                isLive: false,
                viewerCount: 0
            }));
        });
    });

    describe('getStreamHistory', () => {
        it('doit renvoyer qu\'aucun historique n\est disponible', async ()=> {
            const mockHistory = [{}]

            vi.spyOn(trackerService, 'getSessionsHistory').mockResolvedValueOnce(mockHistory as unknown as any[]);

            await getStreamHistory(req as Request, res as unknown as Response, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(trackerService.getSessionsHistory).toHaveBeenCalledWith('user_123');
            expect(res.json).toHaveBeenCalledWith([]);
        })

        it('doit renvoyer l\'historique des streams de l\'utilisateur connecté', async () => {
            const mockHistory = [{ id: 'session_1', title: 'Live Apex Legends' }];
            
            vi.spyOn(trackerService, 'getSessionsHistory').mockResolvedValueOnce(mockHistory as unknown as any[]);
            
            await getStreamHistory(req as Request, res as unknown as Response, next);
            
            expect(trackerService.getSessionsHistory).toHaveBeenCalledWith('user_123');
            expect(res.json).toHaveBeenCalledWith(mockHistory);
        });
    });

    describe('getTwitchAdSchedule', () => {
        it('doit renvoyer hasAds: true et le calendrier si des coupures pub sont prévues', async () => {
            mockSelectReturn([{ providerAccountId: '123' }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');

            const mockAdSchedule = {
                next_ad_at: 1700000000,
                duration: 90,
                preroll_free_time: 1200
            };
            vi.spyOn(twitchService, 'fetchAdSchedule').mockResolvedValueOnce(mockAdSchedule as unknown as any);

            await getTwitchAdSchedule(req as Request, res as unknown as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                linked: true,
                hasAds: true,
                adSchedule: mockAdSchedule
            });
        });

        it('doit renvoyer hasAds: false si la chaîne n\'a aucune pub programmée', async () => {
            mockSelectReturn([{ providerAccountId: '123' }]);

            vi.spyOn(twitchService, 'getValidAccessToken').mockResolvedValueOnce('valid_token');
            vi.spyOn(twitchService, 'fetchAdSchedule').mockResolvedValueOnce(null);

            await getTwitchAdSchedule(req as Request, res as unknown as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                linked: true,
                hasAds: false,
                message: 'Aucune publicité programmée ou chaîne non affiliée'
            });
        });
    });

    describe('getStreamMetrics', () => {
        it('Cas 404 : doit renvoyer 404 si la session est introuvable ou n\'appartient pas à l\'utilisateur', async () => {
            req.params = { sessionId: 'session_inconnue' };
            vi.spyOn(trackerService, 'getSessionMetrics').mockResolvedValueOnce(null);

            await getStreamMetrics(req as Request, res as unknown as Response, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Session introuvable' });
        });

        it('Cas 200 : doit calculer la rétention et renvoyer la session enrichie', async () => {
            req.params = { sessionId: 'session_1' };
            const mockData = {
                session: { id: 'session_1', title: 'Live Test' },
                metrics: [{ viewerCount: 80 }, { viewerCount: 90 }]
            };
            const mockRetention = {
                retentionRate: 85,
                watchTimeHours: 120,
                retentionTier: { label: 'Audience Captive' }
            };

            vi.spyOn(trackerService, 'getSessionMetrics').mockResolvedValueOnce(mockData as unknown as any);
            vi.spyOn(analyticsService, 'calculateRetentionMetrics').mockReturnValueOnce(mockRetention as unknown as any);

            await getStreamMetrics(req as Request, res as unknown as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                ...mockData,
                retention: mockRetention
            });
        });

        it('Cas Erreur : doit attraper les erreurs et appeler next(error)', async () => {
            req.params = { sessionId: 'session_1' };
            const dbError = new Error('Panne BDD');
            vi.spyOn(trackerService, 'getSessionMetrics').mockRejectedValueOnce(dbError);

            await getStreamMetrics(req as Request, res as unknown as Response, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('getAnalyticsSummary', () => {
        it('doit filtrer les streams des 30 derniers jours et calculer le résumé mensuel', async () => {
            const now = Date.now();
            const recentStream = { session: { id: '1', startedAt: new Date(now - 5 * 24 * 3600 * 1000) }, metrics: [] };
            const oldStream = { session: { id: '2', startedAt: new Date(now - 45 * 24 * 3600 * 1000) }, metrics: [] }; // Doit être filtré !

            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([recentStream, oldStream] as unknown as any);
            vi.spyOn(analyticsService, 'calculateRetentionMetrics').mockReturnValue({ retentionRate: 80 } as unknown as any);
            
            const mockSummary = { totalStreams: 1, totalWatchTimeHours: 50 };
            const computeSpy = vi.spyOn(analyticsService, 'computeMonthlySummary').mockReturnValueOnce(mockSummary as unknown as any);

            await getAnalyticsSummary(req as Request, res as unknown as Response, next);

            // Vérifie qu'une seule session (la récente) a été transmise au résumé
            expect(computeSpy).toHaveBeenCalledWith([expect.objectContaining({ id: '1' })]);
            expect(res.json).toHaveBeenCalledWith(mockSummary);
        });

        it('Cas limite : doit gérer 0 stream sans planter (liste vide)', async () => {
            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([]);
            const mockEmptySummary = { totalStreams: 0, totalWatchTimeHours: 0 };
            vi.spyOn(analyticsService, 'computeMonthlySummary').mockReturnValueOnce(mockEmptySummary as unknown as any);

            await getAnalyticsSummary(req as Request, res as unknown as Response, next);

            expect(res.json).toHaveBeenCalledWith(mockEmptySummary);
        });
    });

    describe('getAnalyticsBreakdown', () => {
        it('doit ventiler par période "weekly" (7 jours)', async () => {
            req.query = { period: 'weekly' };
            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([]);
            const computeSpy = vi.spyOn(analyticsService, 'computeFrequencyAndBreakdown').mockReturnValueOnce({} as unknown as any);

            await getAnalyticsBreakdown(req as Request, res as unknown as Response, next);

            expect(computeSpy).toHaveBeenCalledWith([], 'weekly');
        });

        it('doit ventiler par période "monthly" (30 jours)', async () => {
            req.query = { period: 'monthly' };
            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([]);
            const computeSpy = vi.spyOn(analyticsService, 'computeFrequencyAndBreakdown').mockReturnValueOnce({} as unknown as any);

            await getAnalyticsBreakdown(req as Request, res as unknown as Response, next);

            expect(computeSpy).toHaveBeenCalledWith([], 'monthly');
        });

        it('doit ventiler par période "yearly" (365 jours)', async () => {
            req.query = { period: 'yearly' };
            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([]);
            const computeSpy = vi.spyOn(analyticsService, 'computeFrequencyAndBreakdown').mockReturnValueOnce({} as unknown as any);

            await getAnalyticsBreakdown(req as Request, res as unknown as Response, next);

            expect(computeSpy).toHaveBeenCalledWith([], 'yearly');
        });

        it('doit appliquer la période par défaut "all" si aucun paramètre period n\'est fourni', async () => {
            req.query = {}; // Pas de period
            vi.spyOn(trackerService, 'getAllSessionsWithMetrics').mockResolvedValueOnce([]);
            const computeSpy = vi.spyOn(analyticsService, 'computeFrequencyAndBreakdown').mockReturnValueOnce({} as unknown as any);

            await getAnalyticsBreakdown(req as Request, res as unknown as Response, next);

            expect(computeSpy).toHaveBeenCalledWith([], 'all');
        });
    });
});