import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardView from '../../src/views/DashboardView.vue';
import TwitchCard from '../../src/components/TwitchCard.vue';
import Chat from '../../src/components/Chat.vue';

describe('🧩 Vue : DashboardView.vue (Cockpit Live & Tchat Split-Pane)', () => {
    it('doit rendre TwitchCard et Chat dans un layout split-pane sans l\'historique', () => {
        const wrapper = mount(DashboardView);

        // 1. Doit contenir TwitchCard et le Tchat natif
        expect(wrapper.findComponent(TwitchCard).exists()).toBe(true);
        expect(wrapper.findComponent(Chat).exists()).toBe(true);

        // 3. Doit contenir la poignée de redimensionnement en temps réel
        expect(wrapper.find('[data-testid="split-resizer"]').exists()).toBe(true);
    });

    it('doit dimensionner la colonne cockpit avec un style de largeur réactif', () => {
        const wrapper = mount(DashboardView);
        const cockpitCol = wrapper.find('[data-testid="cockpit-column"]');
        expect(cockpitCol.exists()).toBe(true);
        expect(cockpitCol.attributes('style')).toContain('width:');
    });
});