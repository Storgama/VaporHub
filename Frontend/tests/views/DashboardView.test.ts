import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardView from '../../src/views/DashboardView.vue';
import TwitchCard from '../../src/components/TwitchCard.vue';
import TwitchHistory from '../../src/components/TwitchHistory.vue';

describe('🧩 Vue : DashboardView.vue (Cockpit Live Épuré)', () => {
    it('doit rendre uniquement la carte Twitch Live Cockpit sans encombrer avec l\'historique', () => {
        const wrapper = mount(DashboardView);

        // 1. Doit contenir TwitchCard
        expect(wrapper.findComponent(TwitchCard).exists()).toBe(true);

        // 2. Ne doit STRICTEMENT PAS contenir TwitchHistory
        expect(wrapper.findComponent(TwitchHistory).exists()).toBe(false);
    });
});
