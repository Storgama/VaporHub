import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Chat from '../../src/components/Chat.vue';
import type { ChatMessage } from '../../src/types/chat.js';

describe('🧩 Composant : Chat.vue (Tchat natif multi-plateforme & modération)', () => {
    const mockMessages: ChatMessage[] = [
        {
            id: 'msg-1',
            platform: 'twitch',
            author: {
                id: 'u1',
                name: 'ModoGamer',
                color: '#9146FF',
                badges: ['moderator']
            },
            content: 'Bienvenue sur le stream PogChamp !',
            timestamp: '20:15'
        },
        {
            id: 'msg-2',
            platform: 'youtube',
            author: {
                id: 'u2',
                name: 'SuperFan',
                color: '#FF0000',
                badges: ['vip']
            },
            content: 'Super live Kappa',
            timestamp: '20:16'
        }
    ];

    it('doit rendre la liste des messages avec les auteurs et contenus', () => {
        const wrapper = mount(Chat, {
            props: { messages: mockMessages }
        });

        expect(wrapper.text()).toContain('ModoGamer');
        expect(wrapper.text()).toContain('SuperFan');
        expect(wrapper.text()).toContain('Bienvenue sur le stream');
    });

    it('doit afficher les badges des utilisateurs (Modérateur, VIP, etc.) avec leurs labels', () => {
        const wrapper = mount(Chat, {
            props: { messages: mockMessages }
        });

        const badges = wrapper.findAll('img[data-testid="chat-badge"]');
        expect(badges.length).toBeGreaterThanOrEqual(2);
        expect(badges[0].attributes('title')).toBe('Modérateur');
        expect(badges[1].attributes('title')).toBe('VIP');
    });

    it('doit parser et afficher les émotes inline sous forme d\'images sécurisées', () => {
        const wrapper = mount(Chat, {
            props: { messages: mockMessages }
        });

        const emotes = wrapper.findAll('img[data-testid="chat-emote"]');
        expect(emotes.length).toBeGreaterThanOrEqual(2);
        expect(emotes[0].attributes('alt')).toBe('PogChamp');
        expect(emotes[1].attributes('alt')).toBe('Kappa');
    });

    it('doit afficher les émotes personnalisées passées en props', () => {
        const customMsg: ChatMessage[] = [
            {
                id: 'msg-3',
                platform: 'twitch',
                author: { name: 'VaporFan', badges: ['subscriber'] },
                content: 'Incroyable vaporHype',
                timestamp: '20:17'
            }
        ];

        const wrapper = mount(Chat, {
            props: {
                messages: customMsg,
                customEmotes: { vaporHype: 'https://cdn.vaporhub.test/emotes/vaporHype.png' }
            }
        });

        const emote = wrapper.find('img[data-testid="chat-emote"]');
        expect(emote.exists()).toBe(true);
        expect(emote.attributes('alt')).toBe('vaporHype');
        expect(emote.attributes('src')).toBe('https://cdn.vaporhub.test/emotes/vaporHype.png');
    });

    it('doit permettre d\'envoyer un message et émettre send-message', async () => {
        const wrapper = mount(Chat);

        const input = wrapper.find('input[data-testid="chat-input"]');
        await input.setValue('Salut tout le monde !');

        const form = wrapper.find('form[data-testid="chat-form"]');
        await form.trigger('submit');

        expect(wrapper.emitted('send-message')).toBeTruthy();
        expect(wrapper.emitted('send-message')![0]).toEqual([
            { content: 'Salut tout le monde !', platform: 'twitch' }
        ]);
        expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('doit permettre de basculer la plateforme d\'envoi (Twitch / YouTube)', async () => {
        const wrapper = mount(Chat);

        const platformBtn = wrapper.find('button[data-testid="platform-toggle"]');
        await platformBtn.trigger('click');

        const input = wrapper.find('input[data-testid="chat-input"]');
        await input.setValue('Hello YouTube');

        const form = wrapper.find('form[data-testid="chat-form"]');
        await form.trigger('submit');

        expect(wrapper.emitted('send-message')![0]).toEqual([
            { content: 'Hello YouTube', platform: 'youtube' }
        ]);
    });

    it('doit ouvrir l\'Emote Picker et insérer l\'émote cliquée dans le champ de saisie', async () => {
        const wrapper = mount(Chat);

        const pickerBtn = wrapper.find('button[data-testid="emote-picker-btn"]');
        await pickerBtn.trigger('click');

        const popover = wrapper.find('[data-testid="emote-picker-popover"]');
        expect(popover.exists()).toBe(true);

        const pogChampBtn = wrapper.find('button[data-emote="PogChamp"]');
        await pogChampBtn.trigger('click');

        const input = wrapper.find('input[data-testid="chat-input"]');
        expect((input.element as HTMLInputElement).value).toContain('PogChamp');
    });

    it('doit proposer les actions de modération (supprimer message, timeout, ban)', async () => {
        const wrapper = mount(Chat, {
            props: { messages: mockMessages, canModerate: true }
        });

        // 1. Suppression de message
        const deleteBtn = wrapper.find('button[data-testid="action-delete-msg-1"]');
        await deleteBtn.trigger('click');
        expect(wrapper.emitted('delete-message')).toBeTruthy();
        expect(wrapper.emitted('delete-message')![0]).toEqual(['msg-1']);

        // 2. Timeout
        const timeoutBtn = wrapper.find('button[data-testid="action-timeout-msg-1"]');
        await timeoutBtn.trigger('click');
        expect(wrapper.emitted('timeout-user')).toBeTruthy();
        expect(wrapper.emitted('timeout-user')![0]).toEqual([{ userId: 'u1', username: 'ModoGamer', duration: 300 }]);

        // 3. Bannissement
        const banBtn = wrapper.find('button[data-testid="action-ban-msg-1"]');
        await banBtn.trigger('click');
        expect(wrapper.emitted('ban-user')).toBeTruthy();
        expect(wrapper.emitted('ban-user')![0]).toEqual([{ userId: 'u1', username: 'ModoGamer' }]);
    });

    it('doit masquer ou marquer un message comme supprimé si isDeleted est true', () => {
        const deletedMessages: ChatMessage[] = [
            {
                id: 'msg-del',
                platform: 'twitch',
                author: { name: 'TrollUser' },
                content: 'Message insultant',
                timestamp: '20:18',
                isDeleted: true
            }
        ];

        const wrapper = mount(Chat, {
            props: { messages: deletedMessages }
        });

        expect(wrapper.text()).not.toContain('Message insultant');
        expect(wrapper.text()).toContain('Message supprimé');
    });

    it('doit émettre clear-chat quand le modérateur clique sur vider le tchat', async () => {
        const wrapper = mount(Chat, {
            props: { messages: mockMessages, canModerate: true }
        });

        const clearBtn = wrapper.find('button[data-testid="action-clear-chat"]');
        await clearBtn.trigger('click');

        expect(wrapper.emitted('clear-chat')).toBeTruthy();
    });
});