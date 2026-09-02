import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AuthView from '../../src/views/AuthView.vue';

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../../src/state/useAuth.js', () => ({
    useAuth: () => ({
        login: mockLogin,
        register: mockRegister
    })
}));

describe('🧩 Vue : AuthView.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher par défaut le formulaire de connexion', () => {
        const wrapper = mount(AuthView);

        expect(wrapper.text()).toContain('Bienvenue sur VaporHub');
        expect(wrapper.find('button[type="submit"]').text()).toContain('Se connecter');
        expect(wrapper.find('input[type="email"]').exists()).toBe(true);
        expect(wrapper.find('input[type="password"]').exists()).toBe(true);
        expect(wrapper.find('input[type="text"]').exists()).toBe(false);
    });

    it('doit basculer sur le formulaire d\'inscription quand on clique sur l\'onglet Inscription', async () => {
        const wrapper = mount(AuthView);

        const tabButtons = wrapper.findAll('.grid button');
        const registerTab = tabButtons[1];

        await registerTab.trigger('click');

        expect(wrapper.find('input[type="text"]').exists()).toBe(true);
        expect(wrapper.find('button[type="submit"]').text()).toContain('Créer mon compte');
    });

    it('doit appeler login avec les identifiants saisis', async () => {
        const wrapper = mount(AuthView);

        await wrapper.find('input[type="email"]').setValue('user@test.com');
        await wrapper.find('input[type="password"]').setValue('Secret123!');

        await wrapper.find('form').trigger('submit.prevent');

        expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'Secret123!');
    });

    it('doit appeler register et afficher le message de succès lors de l\'inscription', async () => {
        const wrapper = mount(AuthView);

        const tabButtons = wrapper.findAll('.grid button');
        await tabButtons[1].trigger('click'); // Inscription

        await wrapper.find('input[type="text"]').setValue('MonPseudo');
        await wrapper.find('input[type="email"]').setValue('nouveau@test.com');
        await wrapper.find('input[type="password"]').setValue('Secret123!');

        mockRegister.mockResolvedValueOnce({});

        await wrapper.find('form').trigger('submit.prevent');
        await wrapper.vm.$nextTick();

        expect(mockRegister).toHaveBeenCalledWith('MonPseudo', 'nouveau@test.com', 'Secret123!');
        expect(wrapper.text()).toContain('Compte créé avec succès');
    });

    it('doit afficher un message d\'erreur si la connexion échoue', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Identifiants invalides'));

        const wrapper = mount(AuthView);

        await wrapper.find('input[type="email"]').setValue('user@test.com');
        await wrapper.find('input[type="password"]').setValue('FauxPassword');

        await wrapper.find('form').trigger('submit.prevent');
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('Identifiants invalides');
    });

    it('doit afficher un message d\'erreur si l\'inscription échoue', async () => {
        mockRegister.mockRejectedValueOnce(new Error('Email déjà existant'));

        const wrapper = mount(AuthView);

        const tabButtons = wrapper.findAll('.grid button');
        await tabButtons[1].trigger('click');

        await wrapper.find('input[type="text"]').setValue('MonPseudo');
        await wrapper.find('input[type="email"]').setValue('existant@test.com');
        await wrapper.find('input[type="password"]').setValue('Secret123!');

        await wrapper.find('form').trigger('submit.prevent');
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('Email déjà existant');
    });
});
