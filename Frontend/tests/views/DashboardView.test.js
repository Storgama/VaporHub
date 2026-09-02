import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardView from '../../src/views/DashboardView.vue';

// Mock des composants enfants pour tester le montage propre du Dashboard
vi.mock('../../src/components/TwitchCard.vue', () => ({
    default: { template: '<div data-testid="mock-twitch-card">TwitchCard</div>' }
}));

vi.mock('../../src/components/TwitchHistory.vue', () => ({
    default: { template: '<div data-testid="mock-twitch-history">TwitchHistory</div>' }
}));

describe('🧩 Vue : DashboardView.vue', () => {
    it('doit rendre la carte Twitch et l\'historique', () => {
        const wrapper = mount(DashboardView);

        expect(wrapper.find('[data-testid="mock-twitch-card"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-twitch-history"]').exists()).toBe(true);
    });
});

