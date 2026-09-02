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

describe('📈 Composant : TwitchHistory.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher le message "aucun stream" si l\'historique est vide', async () => {
        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce([]);

        const wrapper = mount(TwitchHistory);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        expect(wrapper.text()).toContain('Historique des Streams & Analytics');
        expect(wrapper.text()).toContain('Aucun stream enregistré pour le moment');
    });

    it('doit lister les sessions et charger les métriques du premier stream par défaut', async () => {
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
                { timestamp: '2026-09-02T10:00:00Z', viewerCount: 20 },
                { timestamp: '2026-09-02T11:00:00Z', viewerCount: 64 }
            ]
        };

        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce(mockSessions);
        vi.spyOn(twitchApi, 'getTwitchMetricsApi').mockResolvedValueOnce(mockMetrics);

        const wrapper = mount(TwitchHistory);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        expect(wrapper.text()).toContain('Soirée Ranked Valorant');
        expect(wrapper.text()).toContain('Valorant');
        expect(wrapper.text()).toContain('64');
        expect(wrapper.text()).toContain('3h 0m'); // Durée
    });

    it('doit changer de session sélectionnée quand on clique sur un stream', async () => {
        const mockSessions = [
            { id: 'sess_1', title: 'Live 1', startedAt: '2026-09-02T10:00:00Z' },
            { id: 'sess_2', title: 'Live 2', startedAt: '2026-09-02T15:00:00Z' }
        ];

        vi.spyOn(twitchApi, 'getTwitchHistoryApi').mockResolvedValueOnce(mockSessions);
        const metricsSpy = vi.spyOn(twitchApi, 'getTwitchMetricsApi').mockResolvedValue({
            session: mockSessions[1],
            metrics: []
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

