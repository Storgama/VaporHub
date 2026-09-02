import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../src/App.vue';
import { ref, computed } from 'vue';

const mockIsAuthenticated = ref(false);

vi.mock('../src/state/useAuth.js', () => ({
    useAuth: () => ({
        isAuthenticated: computed(() => mockIsAuthenticated.value),
        user: ref('TestUser'),
        logout: vi.fn()
    })
}));

vi.mock('../src/components/Navbar.vue', () => ({
    default: { template: '<nav data-testid="mock-navbar">Navbar</nav>' }
}));

vi.mock('../src/views/AuthView.vue', () => ({
    default: { template: '<div data-testid="mock-auth-view">AuthView</div>' }
}));

vi.mock('../src/views/DashboardView.vue', () => ({
    default: { template: '<div data-testid="mock-dashboard-view">DashboardView</div>' }
}));

describe('🚀 Racinede l\'application (App.vue)', () => {
    beforeEach(() => {
        mockIsAuthenticated.value = false;
    });

    it('doit afficher AuthView si l\'utilisateur n\'est pas connecté', () => {
        mockIsAuthenticated.value = false;
        const wrapper = mount(App);

        expect(wrapper.find('[data-testid="mock-auth-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-dashboard-view"]').exists()).toBe(false);
    });

    it('doit afficher DashboardView et Navbar si l\'utilisateur est connecté', () => {
        mockIsAuthenticated.value = true;
        const wrapper = mount(App);

        expect(wrapper.find('[data-testid="mock-dashboard-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-auth-view"]').exists()).toBe(false);
    });
});

