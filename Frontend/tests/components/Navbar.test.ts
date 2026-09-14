import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Navbar from '../../src/components/Navbar.vue';
import { ref, computed } from 'vue';

// Mock du state useAuth
const mockUser = ref<string | null>(null);
const mockIsAuthenticated = computed(() => !!mockUser.value);
const mockLogout = vi.fn();

vi.mock('../../src/state/useAuth', () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: mockIsAuthenticated,
        logout: mockLogout
    })
}));

describe('🧩 Composant : Navbar.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser.value = null;
    });

    it('ne doit pas s\'afficher si l\'utilisateur n\'est pas connecté', () => {
        const wrapper = mount(Navbar);
        expect(wrapper.find('header').exists()).toBe(false);
    });

    it('doit afficher le logo, les onglets de navigation, le pseudo et le bouton de déconnexion si connecté', async () => {
        mockUser.value = 'StreamerMaster';

        const wrapper = mount(Navbar, {
            props: { currentView: 'dashboard' }
        });

        expect(wrapper.find('header').exists()).toBe(true);
        expect(wrapper.text()).toContain('VaporHub');
        expect(wrapper.text()).toContain('Dashboard');
        expect(wrapper.text()).toContain('Statistiques');
        expect(wrapper.text()).toContain('StreamerMaster');
        expect(wrapper.text()).toContain('Déconnexion');
    });

    it('doit émettre un événement change-view quand on clique sur Statistiques', async () => {
        mockUser.value = 'StreamerMaster';

        const wrapper = mount(Navbar);

        const statsBtn = wrapper.findAll('button').find(b => b.text().includes('Statistiques'));
        expect(statsBtn).toBeDefined();
        await statsBtn!.trigger('click');

        expect(wrapper.emitted('change-view')).toBeTruthy();
        expect(wrapper.emitted('change-view')![0]).toEqual(['analytics']);
    });

    it('doit appeler la fonction logout quand on clique sur Déconnexion', async () => {
        mockUser.value = 'StreamerMaster';

        const wrapper = mount(Navbar);

        const logoutBtn = wrapper.findAll('button').find(b => b.text().includes('Déconnexion'));
        expect(logoutBtn).toBeDefined();
        await logoutBtn!.trigger('click');

        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
});
