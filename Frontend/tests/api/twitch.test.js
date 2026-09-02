import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getTwitchAuthUrlApi, 
    getTwitchStatsApi, 
    getTwitchHistoryApi, 
    getTwitchMetricsApi 
} from '../../src/api/twitch.js';
import * as clientModule from '../../src/api/client.js';

describe('🎮 API : Twitch Endpoints (twitch.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getTwitchAuthUrlApi doit renvoyer l\'URL OAuth', async () => {
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: 'https://twitch.tv/oauth' })
        });

        const url = await getTwitchAuthUrlApi();
        expect(url).toBe('https://twitch.tv/oauth');
    });

    it('getTwitchStatsApi doit renvoyer l\'état du stream', async () => {
        const mockStats = { linked: true, isLive: true, viewerCount: 100 };
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockStats
        });

        const stats = await getTwitchStatsApi();
        expect(stats).toEqual(mockStats);
    });

    it('getTwitchHistoryApi doit renvoyer la liste des sessions', async () => {
        const mockHistory = [{ id: 's1', title: 'Live 1' }];
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockHistory
        });

        const history = await getTwitchHistoryApi();
        expect(history).toEqual(mockHistory);
    });

    it('getTwitchMetricsApi doit renvoyer la session et ses points', async () => {
        const mockMetrics = { session: { id: 's1' }, metrics: [] };
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockMetrics
        });

        const data = await getTwitchMetricsApi('s1');
        expect(data).toEqual(mockMetrics);
    });

    it('doit lever une erreur si la requête échoue', async () => {
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Erreur API' })
        });

        await expect(getTwitchStatsApi()).rejects.toThrow('Erreur API');
    });
});

