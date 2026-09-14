import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    getTwitchAuthUrlApi, 
    getTwitchStatsApi, 
    getTwitchHistoryApi, 
    getTwitchMetricsApi,
    getTwitchSummaryApi,
    getTwitchBreakdownApi,
    getTwitchAdScheduleApi
} from '../../src/api/twitch';
import * as clientModule from '../../src/api/client';

describe('🎮 API : Twitch Endpoints (twitch.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getTwitchSummaryApi doit renvoyer le résumé des KPIs', async () => {
        const mockSummary = { totalStreams: 4, totalWatchTimeHours: 120.5 };
        vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockSummary
        } as unknown as Response);

        const data = await getTwitchSummaryApi();
        expect(data).toEqual(mockSummary);
    });

    it('getTwitchBreakdownApi doit renvoyer la fréquence et l\'évolution temporelle', async () => {
        const mockBreakdown = { 
            totalStreams: 312, 
            streamsPerWeek: 3.0, 
            topDays: [{ day: 'Mardi', percentage: 33 }],
            evolutionTimeline: [{ label: 'Jan 25', watchTime: 120 }]
        };

        const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockBreakdown
        } as unknown as Response);

        const data = await getTwitchBreakdownApi('yearly');
        expect(data).toEqual(mockBreakdown);
        expect(httpSpy).toHaveBeenCalledWith(expect.stringContaining('period=yearly'));
    });

    it('getTwitchAdScheduleApi doit renvoyer le radar publicitaire', async () => {
        const mockAds = {
            linked: true,
            hasAds: true,
            adSchedule: {
                next_ad_at: 1698774600,
                duration: 90,
                preroll_free_time: 1200
            }
        };

        const httpSpy = vi.spyOn(clientModule, 'httpClient').mockResolvedValueOnce({
            ok: true,
            json: async () => mockAds
        } as unknown as Response);

        const data = await getTwitchAdScheduleApi();
        expect(data).toEqual(mockAds);
        expect(httpSpy).toHaveBeenCalledWith('/twitch/ads');
    });
});
