import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    recordLiveSession, 
    closeOpenSession, 
    getSessionsHistory, 
    getSessionMetrics 
} from '../../src/services/streamTrackerService.js';
import { db } from '../../src/db/initBdd.js';

vi.mock('../../src/db/initBdd.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

describe('📊 Services : Suivi & Métriques de Live (streamTrackerService.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Enregistrement d\'une session de live (recordLiveSession)', () => {
        it('doit créer une nouvelle session et un premier point métrique si le live débute', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Nouveau Live',
                game_name: 'Valorant',
                viewer_count: 50,
                started_at: '2026-09-02T10:00:00Z'
            };

            // Aucune session en cours
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            // Insertion session
            const newSession = { id: 'session_uuid_1', ...mockStream };
            db.insert
                .mockReturnValueOnce({
                    values: vi.fn().mockReturnValueOnce({
                        returning: vi.fn().mockResolvedValueOnce([newSession])
                    })
                })
                // Insertion premier point métrique
                .mockReturnValueOnce({
                    values: vi.fn().mockResolvedValueOnce({})
                });

            const session = await recordLiveSession(userId, mockStream);

            expect(session).toEqual(newSession);
            expect(db.insert).toHaveBeenCalledTimes(2);
        });

        it('doit mettre à jour le pic de spectateurs si la session existe déjà', async () => {
            const userId = 'user_123';
            const mockStream = {
                id: 'twitch_stream_999',
                title: 'Live Existant',
                game_name: 'Valorant',
                viewer_count: 120, // Record battu
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

            // Session existante trouvée
            db.select
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockResolvedValueOnce([existingSession])
                    })
                })
                // Dernière métrique récente
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockReturnValueOnce({
                            orderBy: vi.fn().mockReturnValueOnce({
                                limit: vi.fn().mockResolvedValueOnce([{ timestamp: new Date() }])
                            })
                        })
                    })
                });

            db.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce({})
                })
            });

            await recordLiveSession(userId, mockStream);

            expect(db.update).toHaveBeenCalled();
        });
    });

    describe('2. Clôture de session (closeOpenSession)', () => {
        it('doit marquer la session ouverte comme terminée avec la date actuelle', async () => {
            const userId = 'user_123';
            const openSession = { id: 'session_uuid_1', userId, endedAt: null };

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([openSession])
                })
            });

            db.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce({})
                })
            });

            await closeOpenSession(userId);

            expect(db.update).toHaveBeenCalled();
        });
    });

    describe('3. Récupération de l\'historique et métriques', () => {
        it('doit renvoyer la liste des sessions passées de l\'utilisateur', async () => {
            const mockHistory = [{ id: '1', title: 'Live 1' }, { id: '2', title: 'Live 2' }];

            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockReturnValueOnce({
                        orderBy: vi.fn().mockReturnValueOnce({
                            limit: vi.fn().mockResolvedValueOnce(mockHistory)
                        })
                    })
                })
            });

            const history = await getSessionsHistory('user_123');
            expect(history).toEqual(mockHistory);
        });

        it('doit renvoyer les points métriques d\'un stream précis pour le graphique', async () => {
            const mockSession = { id: 'session_1', title: 'Mon Stream' };
            const mockMetrics = [{ timestamp: new Date(), viewerCount: 25 }];

            db.select
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockResolvedValueOnce([mockSession])
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValueOnce({
                        where: vi.fn().mockReturnValueOnce({
                            orderBy: vi.fn().mockResolvedValueOnce(mockMetrics)
                        })
                    })
                });

            const result = await getSessionMetrics('session_1', 'user_123');

            expect(result).toEqual({
                session: mockSession,
                metrics: mockMetrics
            });
        });

        it('doit retourner null si la session demandée n\'appartient pas à l\'utilisateur', async () => {
            db.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValueOnce({
                    where: vi.fn().mockResolvedValueOnce([])
                })
            });

            const result = await getSessionMetrics('session_inconnue', 'user_123');
            expect(result).toBeNull();
        });
    });
});

