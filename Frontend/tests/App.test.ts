import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed, defineComponent } from 'vue';
import App from '../src/App.vue';

const mockIsAuthenticated = ref(false);

vi.mock('../src/state/useAuth', () => ({
    useAuth: () => ({
        isAuthenticated: computed(() => mockIsAuthenticated.value),
        user: ref('TestUser'),
        logout: vi.fn()
    })
}));

// Mock Navbar émetteur d'événements (inliné pour éviter l'erreur de hoisting vi.mock)
vi.mock('../src/components/Navbar.vue', () => ({
    default: {
        name: 'Navbar',
        props: ['currentView'],
        emits: ['change-view'],
        template: `
            <nav data-testid="mock-navbar">
                <button data-testid="btn-to-analytics" @click="$emit('change-view', 'analytics')">Analytics</button>
                <button data-testid="btn-to-dashboard" @click="$emit('change-view', 'dashboard')">Dashboard</button>
            </nav>
        `
    }
}));

vi.mock('../src/views/AuthView.vue', () => ({
    default: { template: '<div data-testid="mock-auth-view">AuthView</div>' }
}));

vi.mock('../src/views/DashboardView.vue', () => ({
    default: { template: '<div data-testid="mock-dashboard-view">DashboardView</div>' }
}));

vi.mock('../src/views/AnalyticsView.vue', () => ({
    default: { template: '<div data-testid="mock-analytics-view">AnalyticsView</div>' }
}));

describe('🚀 Racine de l\'application (App.vue)', () => {
    beforeEach(() => {
        mockIsAuthenticated.value = false;
    });

    it('doit afficher AuthView si l\'utilisateur n\'est pas connecté', () => {
        mockIsAuthenticated.value = false;
        const wrapper = mount(App);

        expect(wrapper.find('[data-testid="mock-auth-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-dashboard-view"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="mock-analytics-view"]').exists()).toBe(false);
    });

    it('doit afficher DashboardView et Navbar par défaut si l\'utilisateur est connecté', () => {
        mockIsAuthenticated.value = true;
        const wrapper = mount(App);

        expect(wrapper.find('[data-testid="mock-navbar"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-dashboard-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-auth-view"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="mock-analytics-view"]').exists()).toBe(false);
    });

    it('doit basculer sur AnalyticsView quand la Navbar émet un changement de vue', async () => {
        mockIsAuthenticated.value = true;
        const wrapper = mount(App);

        // Clic pour changer la vue vers analytics
        await wrapper.find('[data-testid="btn-to-analytics"]').trigger('click');

        expect(wrapper.find('[data-testid="mock-analytics-view"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="mock-dashboard-view"]').exists()).toBe(false);
    });
});