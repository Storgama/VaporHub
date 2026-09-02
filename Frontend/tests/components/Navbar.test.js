import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Navbar from '../../src/components/Navbar.vue';
import { ref, computed } from 'vue';

// Mock du state useAuth
const mockUser = ref(null);
const mockIsAuthenticated = computed(() => !!mockUser.value);
const mockLogout = vi.fn();

vi.mock('../../src/state/useAuth.js', () => ({
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

    it('doit afficher le logo, le pseudo et le bouton de déconnexion si connecté', async () => {
        mockUser.value = 'StreamerMaster';

        const wrapper = mount(Navbar);

        expect(wrapper.find('header').exists()).toBe(true);
        expect(wrapper.text()).toContain('VaporHub');
        expect(wrapper.text()).toContain('StreamerMaster');
        expect(wrapper.text()).toContain('Déconnexion');
    });

    it('doit appeler la fonction logout quand on clique sur Déconnexion', async () => {
        mockUser.value = 'StreamerMaster';

        const wrapper = mount(Navbar);

        const logoutBtn = wrapper.find('button');
        await logoutBtn.trigger('click');

        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
});

