import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    mockSelectReturn, 
    mockInsertReturning, 
    mockInsertResolve, 
    mockUpdateResolve,
    expectInsertCount,
    expectNoInsert,
    expectUpdateCalled
} from '../helpers/dbMock.js';

import { 
    recordLiveSession, 
    closeOpenSession, 
    getSessionsHistory, 
    getSessionMetrics,
    getAllSessionsWithMetrics
} from '../../src/services/streamTrackerService.js';



describe('📊 Services : streamTrackerService', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('1. recordLiveSession', () => {
        it('doit créer une nouvelle session et un premier point métrique si le live débute', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Nouveau Live',
                game_name: 'Valorant',
                viewer_count: 50,
                started_at: '2026-09-02T10:00:00Z'
            };

            const newSession = {
                id: 'session_uuid_1',
                userId,
                provider: 'twitch',
                providerStreamId: mockStream.id,
                title: mockStream.title,
                gameName: mockStream.game_name,
                peakViewers: mockStream.viewer_count,
                startedAt: new Date(mockStream.started_at)
            };

            // 1. Aucune session en cours
            mockSelectReturn([]);
            // 2. Insertion session
            mockInsertReturning([newSession]);
            // 3. Insertion premier point métrique
            mockInsertResolve();

            const session = await recordLiveSession(userId, mockStream);

            expect(session).toEqual(newSession);
            expectInsertCount(2);
        });

        it('doit mettre à jour le pic de spectateurs si la session existe déjà', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Live Existant',
                game_name: 'Valorant',
                viewer_count: 120,
                started_at: '2026-09-02T10:00:00Z'
            };

            const existingSession = {
                id: 'session_uuid_1',
                userId,
                providerStreamId: 'twitch_stream_999',
                title: 'Ancien Titre',
                gameName: 'Discussion',
                peakViewers: 80
            };

            // 1. Session existante trouvée
            mockSelectReturn([existingSession]);
            // 2. Mock de la mise à jour
            mockUpdateResolve();
            // 3. Dernière métrique récente
            mockSelectReturn([{ timestamp: new Date() }]);

            await recordLiveSession(userId, mockStream);

            expectUpdateCalled()
        });

        it('ne doit PAS insérer de nouvelle métrique si moins de 2 minutes se sont écoulées (Throttling)', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Live Existant',
                game_name: 'Valorant',
                viewer_count: 50,
                started_at: '2026-09-02T10:00:00Z'
            };

            const existingSession = {
                id: 'session_uuid_1',
                userId,
                providerStreamId: 'twitch_stream_999',
                title: 'Live Existant',
                gameName: 'Valorant',
                peakViewers: 50
            };

            // 1. Session existante trouvée
            mockSelectReturn([existingSession]);
            // 2. Dernière métrique datant de 30 secondes seulement
            const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
            mockSelectReturn([{ timestamp: thirtySecondsAgo }]);

            await recordLiveSession(userId, mockStream);

            // Pas d'insertion métrique car < 2 min
            expectNoInsert()
        });

        it('doit insérer un nouveau point métrique si plus de 2 minutes se sont écoulées', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Live Existant',
                game_name: 'Valorant',
                viewer_count: 60,
                started_at: '2026-09-02T10:00:00Z'
            };

            const existingSession = {
                id: 'session_uuid_1',
                userId,
                providerStreamId: 'twitch_stream_999',
                peakViewers: 50
            };

            // 1. Session existante trouvée
            mockSelectReturn([existingSession]);
            // 2. Mise à jour du pic (60 > 50)
            mockUpdateResolve();
            // 3. Dernière métrique datant de 3 minutes (>= 2 min)
            const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
            mockSelectReturn([{ timestamp: threeMinutesAgo }]);
            // 4. Insertion du nouveau point métrique
            mockInsertResolve();

            await recordLiveSession(userId, mockStream);

            // Insertion métrique validée
            expectInsertCount(1)
        });
    });

    describe('2. closeOpenSession', () => {
        it('doit marquer la session ouverte comme terminée avec la date actuelle', async () => {
            const userId = 'user_123';
            const openSession = { id: 'session_uuid_1', userId, endedAt: null };

            mockSelectReturn([openSession]);
            mockUpdateResolve();

            await closeOpenSession(userId);

            expectUpdateCalled();
        });
    });

    describe('3. Récupération de l\'historique et métriques', () => {
        it('doit renvoyer la liste des sessions passées de l\'utilisateur', async () => {
            const mockHistory = [{ id: '1', title: 'Live 1' }, { id: '2', title: 'Live 2' }];

            mockSelectReturn(mockHistory);

            const history = await getSessionsHistory('user_123');
            expect(history).toEqual(mockHistory);
        });

        it('doit renvoyer les points métriques d\'un stream précis pour le graphique', async () => {
            const mockSession = { id: 'session_1', title: 'Mon Stream' };
            const mockMetrics = [{ timestamp: new Date(), viewerCount: 25 }];

            mockSelectReturn([mockSession]);
            mockSelectReturn(mockMetrics);

            const result = await getSessionMetrics('session_1', 'user_123');

            expect(result).toEqual({
                session: mockSession,
                metrics: mockMetrics
            });
        });

        it('doit retourner null si la session demandée n\'appartient pas à l\'utilisateur', async () => {
            mockSelectReturn([]);

            const result = await getSessionMetrics('session_inconnue', 'user_123');
            expect(result).toBeNull();
        });
    });

    describe('4. getAllSessionsWithMetrics', () => {
        it('doit récupérer les sessions et associer les métriques correspondantes en 2 requêtes globales', async () => {
            const userId = 'user_123';
            const mockSessions = [
                { id: 'sess_1', title: 'Live 1', userId },
                { id: 'sess_2', title: 'Live 2', userId }
            ];
            const mockMetrics = [
                { sessionId: 'sess_1', viewerCount: 50 },
                { sessionId: 'sess_1', viewerCount: 70 },
                { sessionId: 'sess_2', viewerCount: 100 }
            ];
            // 1. Première requête : sélection des sessions
            mockSelectReturn(mockSessions);
            // 2. Deuxième requête : sélection groupée de toutes les métriques
            mockSelectReturn(mockMetrics);
            const result = await getAllSessionsWithMetrics(userId);
            expect(result).toHaveLength(2);
            // Vérification de l'association par sessionId
            expect(result[0]).toEqual({
                session: mockSessions[0],
                metrics: [mockMetrics[0], mockMetrics[1]]
            });
            expect(result[1]).toEqual({
                session: mockSessions[1],
                metrics: [mockMetrics[2]]
            });
        });
        it('doit renvoyer un tableau vide si aucune session n\'existe pour cet utilisateur', async () => {
            // Aucune session trouvée en BDD
            mockSelectReturn([]);
            const result = await getAllSessionsWithMetrics('user_123');
            expect(result).toEqual([]);
        });
    });
});