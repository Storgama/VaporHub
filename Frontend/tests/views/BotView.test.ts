import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BotView from '../../src/views/BotView.vue';
import * as discordApi from '../../src/api/discord';

describe('🤖 Vue : BotView.vue (Gestion Multi-Notifications)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('doit charger et afficher la liste des alertes existantes', async () => {
        const mockConfigs: discordApi.DiscordAlertConfigData[] = [
            {
                id: 'config-1',
                name: 'Alerte Principale',
                guildId: '123456789012345678',
                channelId: '987654321098765432',
                roleMention: '@everyone',
                customMessage: 'Live sur {game} !',
                isEnabled: true
            }
        ];

        vi.spyOn(discordApi, 'getDiscordAlertConfigsApi').mockResolvedValue(mockConfigs);

        const wrapper = mount(BotView);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        expect(wrapper.text()).toContain('Gestion du Bot Discord');
        expect(wrapper.text()).toContain('Alerte Principale');
        expect(wrapper.text()).toContain('Ajouter une notification');
    });

    it('doit ajouter une nouvelle carte quand on clique sur "Ajouter une notification"', async () => {
        vi.spyOn(discordApi, 'getDiscordAlertConfigsApi').mockResolvedValue([]);

        const wrapper = mount(BotView);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 20));

        const addBtn = wrapper.findAll('button').find(b => b.text().includes('Ajouter une notification'));
        expect(addBtn).toBeDefined();

        await addBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        // Une nouvelle carte d'alerte apparaît dans la liste
        const inputs = wrapper.findAll('input[data-testid="input-alert-name"]');
        expect(inputs.length).toBeGreaterThan(0);
    });

    it('doit afficher le badge "Connecté" si l\'API indique que le bot est connecté', async () => {
        vi.spyOn(discordApi, 'getDiscordBotStatusApi').mockResolvedValue({ isConnected: true, botUsername: 'VaporHubBot#0001' });
        
        const wrapper = mount(BotView);
        await wrapper.vm.$nextTick();

        const inputs = wrapper.findAll('span[data-testid="discord-status"]');
        expect(wrapper.text()).toContain('connecté');
    });

    it('doit afficher le badge "Hors-ligne" ou "Non connecté" si le bot n\'est pas actif', async () => {
        vi.spyOn(discordApi, 'getDiscordBotStatusApi').mockResolvedValue({ isConnected: false });
        
        const wrapper = mount(BotView);
        await wrapper.vm.$nextTick();

        const inputs = wrapper.findAll('span[data-testid="discord-status"]');
        expect(wrapper.text()).toContain('Non connecté');
    });
});