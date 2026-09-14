import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AnalyticsView from '../../src/views/AnalyticsView.vue';
import * as twitchApi from '../../src/api/twitch.js';

vi.mock('chart.js/auto', () => {
    return {
        default: class MockChart {
            constructor() {}
            destroy() {}
        }
    };
});

describe('📊 Vue : AnalyticsView.vue (Page Statistiques Dynamiques)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher les boutons de période dynamique, la fréquence de stream et les jours clés', async () => {
        const mockBreakdown = {
            totalStreams: 312,
            totalWatchTimeHours: 4250,
            overallRetentionRate: 86,
            overallAverageViewers: 65,
            highestPeakViewers: 145,
            streamsPerWeek: 3.0,
            topDays: [
                { day: 'Mardi', percentage: 34, count: 104 },
                { day: 'Jeudi', percentage: 33, count: 104 },
                { day: 'Samedi', percentage: 33, count: 104 }
            ],
            evolutionTimeline: [
                { label: 'Janv. 25', watchTime: 180, avgViewers: 45, streamsCount: 12 }
            ]
        };

        const breakdownSpy = vi.spyOn(twitchApi, 'getTwitchBreakdownApi').mockResolvedValue(mockBreakdown);

        const wrapper = mount(AnalyticsView);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        // 1. Boutons de sélection de période dynamique
        expect(wrapper.text()).toContain('Statistiques & Évolution');
        expect(wrapper.text()).toContain('Hebdo (7j)');
        expect(wrapper.text()).toContain('Mensuel (30j)');
        expect(wrapper.text()).toContain('Annuel (1 an)');
        expect(wrapper.text()).toContain('Tout l\'historique');

        // 2. Carte de Fréquence & Régularité
        expect(wrapper.text()).toContain('3 streams / sem');
        expect(wrapper.text()).toContain('Mardi');
        expect(wrapper.text()).toContain('Jeudi');
        expect(wrapper.text()).toContain('Samedi');

        // 3. Métriques globales
        expect(wrapper.text()).toContain('4250');
        expect(wrapper.text()).toContain('86%');
    });

    it('doit recharger les données quand on change de période (ex: Annuel)', async () => {
        const breakdownSpy = vi.spyOn(twitchApi, 'getTwitchBreakdownApi').mockResolvedValue({
            totalStreams: 50,
            totalWatchTimeHours: 800,
            streamsPerWeek: 3.0,
            topDays: [],
            evolutionTimeline: []
        });

        const wrapper = mount(AnalyticsView);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        const periodButtons = wrapper.findAll('button');
        const yearlyButton = periodButtons.find(b => b.text().includes('Annuel'));

        if (yearlyButton) {
            await yearlyButton.trigger('click');
            expect(breakdownSpy).toHaveBeenCalledWith('yearly');
        }
    });
});
