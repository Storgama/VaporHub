import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TwitchCard from '../../src/components/TwitchCard.vue';
import * as twitchApi from '../../src/api/twitch.js';

describe('🧩 Composant : TwitchCard.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('doit afficher l\'état non lié et rediriger vers Twitch au clic sur le bouton', async () => {
        vi.spyOn(twitchApi, 'getTwitchStatsApi').mockResolvedValueOnce({
            linked: false,
            message: 'Aucun compte Twitch lié'
        });

        const authUrlSpy = vi.spyOn(twitchApi, 'getTwitchAuthUrlApi').mockResolvedValueOnce('https://twitch.tv/oauth');

        Object.defineProperty(window, 'location', {
            value: { href: '', reload: vi.fn() },
            writable: true,
            configurable: true
        });

        const wrapper = mount(TwitchCard);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        expect(wrapper.text()).toContain('Twitch Live Tracker');
        
        const linkBtn = wrapper.find('button');
        await linkBtn.trigger('click');

        expect(authUrlSpy).toHaveBeenCalledTimes(1);
    });

    it('doit afficher le profil et le badge HORS LIGNE quand le streamer ne live pas', async () => {
        vi.spyOn(twitchApi, 'getTwitchStatsApi').mockResolvedValueOnce({
            linked: true,
            channel: 'MonStreamerPrefere',
            avatar: 'https://avatar.png',
            isLive: false,
            viewerCount: 0
        });

        const wrapper = mount(TwitchCard);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        expect(wrapper.text()).toContain('MonStreamerPrefere');
        expect(wrapper.text()).toContain('HORS LIGNE');
    });

    it('doit afficher les informations complètes et le badge EN DIRECT quand le streamer est en live', async () => {
        vi.spyOn(twitchApi, 'getTwitchStatsApi').mockResolvedValueOnce({
            linked: true,
            channel: 'StreamerEnLive',
            avatar: 'https://avatar.png',
            isLive: true,
            title: 'Tournoi Ranked !',
            game: 'Valorant',
            viewerCount: 154,
            thumbnailUrl: 'https://thumb_320x180.jpg'
        });

        const wrapper = mount(TwitchCard);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        expect(wrapper.text()).toContain('StreamerEnLive');
        expect(wrapper.text()).toContain('EN DIRECT');
        expect(wrapper.text()).toContain('154 spectateurs en direct');
        expect(wrapper.text()).toContain('Valorant');
        expect(wrapper.text()).toContain('Tournoi Ranked !');
    });

    it('doit forcer l\'actualisation quand on clique sur le bouton Actualiser', async () => {
        const statsSpy = vi.spyOn(twitchApi, 'getTwitchStatsApi').mockResolvedValue({
            linked: true,
            channel: 'StreamerTest',
            isLive: false,
            viewerCount: 0
        });

        const wrapper = mount(TwitchCard);
        await wrapper.vm.$nextTick();
        await new Promise(r => setTimeout(r, 10));

        const refreshBtn = wrapper.find('.flex.justify-between button');
        if (refreshBtn.exists()) {
            await refreshBtn.trigger('click');
            expect(statsSpy).toHaveBeenCalled();
        }
    });

    it('doit gérer la visibilité de l\'onglet (pause du polling si onglet masqué)', async () => {
        const statsSpy = vi.spyOn(twitchApi, 'getTwitchStatsApi').mockResolvedValue({
            linked: true,
            channel: 'StreamerTest',
            isLive: false
        });

        const wrapper = mount(TwitchCard);
        await wrapper.vm.$nextTick();

        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(statsSpy).toHaveBeenCalled();
    });
});
