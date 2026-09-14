import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TwitchQuickActions from '../../src/components/TwitchQuickActions.vue';
import * as twitchApi from '../../src/api/twitch.js';

describe('🧩 Composant : TwitchQuickActions.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher les sections Coupure Pub, Raid et le badge SIMULATION si isMock est actif', () => {
        const wrapper = mount(TwitchQuickActions, {
            props: { isLive: true, isMock: true }
        });

        expect(wrapper.text()).toContain('Actions Rapides Live');
        expect(wrapper.text()).toContain('SIMULATION');
        expect(wrapper.text()).toContain('Coupure Pub');
        expect(wrapper.text()).toContain('Raid de Fin de Live');
    });

    it('doit déclencher une coupure pub et émettre action-completed au clic sur Lancer', async () => {
        const commercialSpy = vi.spyOn(twitchApi, 'triggerCommercialApi').mockResolvedValueOnce({
            success: true,
            length: 60,
            retryAfter: 120,
            message: 'Pub de 60s lancée'
        });

        const wrapper = mount(TwitchQuickActions, {
            props: { isLive: true, isMock: false }
        });

        const launchBtn = wrapper.findAll('button').find(b => b.text().includes('Lancer'));
        expect(launchBtn).toBeDefined();

        await launchBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        expect(commercialSpy).toHaveBeenCalledWith(60, false);
        expect(wrapper.emitted('action-completed')).toBeTruthy();
        expect(wrapper.text()).toContain('Pub de 60s lancée');
    });

    it('doit lancer un raid et basculer sur le bouton d\'annulation', async () => {
        const raidSpy = vi.spyOn(twitchApi, 'startRaidApi').mockResolvedValueOnce({
            success: true,
            targetLogin: 'zerator'
        });

        const wrapper = mount(TwitchQuickActions, {
            props: { isLive: true, isMock: false }
        });

        const input = wrapper.find('input[placeholder*="Pseudo"]');
        await input.setValue('ZeratoR');

        const raidBtn = wrapper.findAll('button').find(b => b.text().includes('Raid'));
        await raidBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        expect(raidSpy).toHaveBeenCalledWith('zerator', false);
        expect(wrapper.text()).toContain('Raid vers @zerator lancé');

        const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Annuler le Raid'));
        expect(cancelBtn).toBeDefined();
    });

    it('doit annuler un raid en cours quand on clique sur Annuler le Raid', async () => {
        vi.spyOn(twitchApi, 'startRaidApi').mockResolvedValueOnce({
            success: true,
            targetLogin: 'zerator'
        });
        const cancelSpy = vi.spyOn(twitchApi, 'cancelRaidApi').mockResolvedValueOnce({
            success: true,
            canceled: true
        });

        const wrapper = mount(TwitchQuickActions);

        // 1. Démarre un raid
        await wrapper.find('input').setValue('zerator');
        const raidBtn = wrapper.findAll('button').find(b => b.text().includes('Raid'));
        await raidBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        // 2. Clique sur annuler
        const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Annuler le Raid'));
        await cancelBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        expect(cancelSpy).toHaveBeenCalled();
        expect(wrapper.text()).toContain('Raid vers @zerator annulé');
    });

    it('doit reporter la pub quand on clique sur le bouton Snooze', async () => {
        const snoozeSpy = vi.spyOn(twitchApi, 'snoozeAdApi').mockResolvedValueOnce({
            success: true,
            snoozed: true
        });

        const wrapper = mount(TwitchQuickActions);

        const snoozeBtn = wrapper.find('button[title*="Reporter"]');
        await snoozeBtn.trigger('click');
        await wrapper.vm.$nextTick();

        expect(snoozeSpy).toHaveBeenCalled();
        expect(wrapper.text()).toContain('Prochaine pub reportée de 5 minutes');
    });

    it('doit afficher une bannière d\'erreur si l\'API échoue', async () => {
        vi.spyOn(twitchApi, 'triggerCommercialApi').mockRejectedValueOnce(new Error('Quota publicitaire dépassé'));

        const wrapper = mount(TwitchQuickActions);

        const launchBtn = wrapper.findAll('button').find(b => b.text().includes('Lancer'));
        await launchBtn!.trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('Quota publicitaire dépassé');
    });
});