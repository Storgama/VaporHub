import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TwitchHistory from '../../src/components/TwitchHistory.vue';
import * as twitchApi from '../../src/api/twitch.js';

// Mock de Chart.js
vi.mock('chart.js/auto', () => {
    return {
        default: class MockChart {
            constructor() {}
            destroy() {}
        }
    };
});

describe('📈 Composant : TwitchHistory.vue (Analytics de Rétention)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher le message "aucun stream" si l\'historique est vide', async () => {
        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce([]);
        vi.spyOn(twitchApi, 'getTwitchSummaryApi').mockResolvedValueOnce(null);

        const wrapper = mount(TwitchHistory);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        expect(wrapper.text()).toContain('Analytics de Rétention & Audience');
        expect(wrapper.text()).toContain('Aucun stream enregistré pour le moment');
    });

    it('doit afficher les 4 cartes KPIs de Rétention et charger le premier stream avec son badge', async () => {
        const mockSummary = {
            totalStreams: 5,
            totalWatchTimeHours: 154.5,
            overallRetentionRate: 88,
            overallAverageViewers: 50,
            highestPeakViewers: 120
        };

        const mockSessions = [
            {
                id: 'sess_1',
                title: 'Soirée Ranked Valorant',
                gameName: 'Valorant',
                peakViewers: 64,
                startedAt: '2026-09-02T10:00:00Z',
                endedAt: '2026-09-02T13:00:00Z'
            }
        ];

        const mockMetrics = {
            session: mockSessions[0],
            metrics: [
                { timestamp: '2026-09-02T10:00:00Z', viewerCount: 50 },
                { timestamp: '2026-09-02T11:00:00Z', viewerCount: 64 }
            ],
            retention: {
                retentionRate: 89,
                watchTimeHours: 162,
                retentionTier: { label: 'Audience Captive', badge: 'captive' }
            }
        };

        vi.spyOn(twitchApi, 'getTwitchSummaryApi').mockResolvedValueOnce(mockSummary);
        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce(mockSessions);
        vi.spyOn(twitchApi, 'getTwitchMetricsApi').mockResolvedValueOnce(mockMetrics);

        const wrapper = mount(TwitchHistory);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 30));

        // 1. Vérification des 4 cartes KPIs globales
        expect(wrapper.text()).toContain('Watch Time Cumulé');
        expect(wrapper.text()).toContain('154.5');
        expect(wrapper.text()).toContain('Rétention Moyenne');
        expect(wrapper.text()).toContain('88%');
        expect(wrapper.text()).toContain('Moyenne de Viewers');
        expect(wrapper.text()).toContain('Pic Record');

        // 2. Vérification des badges de rétention sur le stream sélectionné
        expect(wrapper.text()).toContain('Audience Captive (89%)');
        expect(wrapper.text()).toContain('162 h vues');
    });

    it('doit changer de session sélectionnée quand on clique sur un stream', async () => {
        const mockSessions = [
            { id: 'sess_1', title: 'Live 1', startedAt: '2026-09-02T10:00:00Z' },
            { id: 'sess_2', title: 'Live 2', startedAt: '2026-09-02T15:00:00Z' }
        ];

        vi.spyOn(twitchApi, 'getTwitchSummaryApi').mockResolvedValue(null);
        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce(mockSessions);
        const metricsSpy = vi.spyOn(twitchApi, 'getTwitchMetricsApi').mockResolvedValue({
            session: mockSessions[1],
            metrics: [],
            retention: { retentionRate: 75, watchTimeHours: 80, retentionTier: { label: 'Audience Stable', badge: 'stable' } }
        });

        const wrapper = mount(TwitchHistory);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        const sessionCards = wrapper.findAll('.lg\\:col-span-4 > div');
        if (sessionCards.length > 1) {
            await sessionCards[1].trigger('click');
            expect(metricsSpy).toHaveBeenCalledWith('sess_2');
        }
    });
});
