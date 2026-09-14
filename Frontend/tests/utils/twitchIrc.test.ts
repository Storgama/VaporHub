import { describe, it, expect } from 'vitest';
import { parseTwitchIrcLine } from '../../src/utils/twitchIrc';

describe('📡 Utilitaire : twitchIrc (Parsing protocole IRC Twitch WebSocket)', () => {

    it('doit détecter un message PING du serveur IRC Twitch', () => {
        const result = parseTwitchIrcLine('PING :tmi.twitch.tv');
        expect(result.type).toBe('PING');
    });

    it('doit parser un message PRIVMSG avec tags complets (auteur, couleur, badges, message)', () => {
        const raw = '@badge-info=subscriber/3;badges=broadcaster/1,subscriber/3000;color=#00FF7F;display-name=Pominus;emotes=;id=msg-abc-123;tmi-sent-ts=1690000000000 :pominus!pominus@pominus.tmi.twitch.tv PRIVMSG #pominus :Salut tout le monde PogChamp !';
        
        const result = parseTwitchIrcLine(raw);
        expect(result.type).toBe('PRIVMSG');
        expect(result.message).toBeDefined();
        expect(result.message?.id).toBe('msg-abc-123');
        expect(result.message?.platform).toBe('twitch');
        expect(result.message?.author.name).toBe('Pominus');
        expect(result.message?.author.color).toBe('#00FF7F');
        expect(result.message?.author.badges).toEqual(['broadcaster', 'subscriber']);
        expect(result.message?.content).toBe('Salut tout le monde PogChamp !');
    });

    it('doit parser un PRIVMSG sans tags en extrayant le pseudo du préfixe IRC', () => {
        const raw = ':viewer_fan!viewer_fan@viewer_fan.tmi.twitch.tv PRIVMSG #benoit :GG pour le live !';

        const result = parseTwitchIrcLine(raw);
        expect(result.type).toBe('PRIVMSG');
        expect(result.message).toBeDefined();
        expect(result.message?.author.name).toBe('viewer_fan');
        expect(result.message?.content).toBe('GG pour le live !');
    });

    it('doit parser une commande CLEARMSG pour supprimer un message spécifique', () => {
        const raw = '@login=troll;target-msg-id=bad-msg-456 :tmi.twitch.tv CLEARMSG #benoit :Message insultant';

        const result = parseTwitchIrcLine(raw);
        expect(result.type).toBe('CLEARMSG');
        expect(result.targetMsgId).toBe('bad-msg-456');
    });

    it('doit parser une commande CLEARCHAT pour purger un utilisateur ou tout le tchat', () => {
        const rawUser = '@target-user-id=999 :tmi.twitch.tv CLEARCHAT #benoit :troll_user';
        const resUser = parseTwitchIrcLine(rawUser);
        expect(resUser.type).toBe('CLEARCHAT');
        expect(resUser.targetUser).toBe('troll_user');

        const rawAll = ':tmi.twitch.tv CLEARCHAT #benoit';
        const resAll = parseTwitchIrcLine(rawAll);
        expect(resAll.type).toBe('CLEARCHAT');
        expect(resAll.targetUser).toBeUndefined();
    });
});