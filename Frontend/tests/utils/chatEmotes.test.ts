import { describe, it, expect } from 'vitest';
import { parseMessageContent, GLOBAL_EMOTES } from '../../src/utils/chatEmotes';

describe('🎨 Utilitaire : chatEmotes (Parsing & Émotes inline)', () => {

    it('doit renvoyer un token texte pour un message simple sans émote', () => {
        const tokens = parseMessageContent('Bonjour à tous sur le live !');
        expect(tokens).toEqual([
            { type: 'text', text: 'Bonjour à tous sur le live !' }
        ]);
    });

    it('doit remplacer une émote globale connue par un token emote', () => {
        const tokens = parseMessageContent('Ce coup de maître PogChamp');
        expect(tokens).toHaveLength(2);
        expect(tokens[0]).toEqual({ type: 'text', text: 'Ce coup de maître ' });
        expect(tokens[1]).toMatchObject({
            type: 'emote',
            code: 'PogChamp',
            url: expect.stringContaining('jtvnw.net')
        });
    });

    it('doit remplacer en priorité une émote personnalisée de la chaîne', () => {
        const customEmotes = {
            vaporHype: 'https://cdn.vaporhub.test/emotes/vaporHype.png'
        };

        const tokens = parseMessageContent('Let\'s go vaporHype GG', customEmotes);
        expect(tokens).toHaveLength(3);
        expect(tokens[0]).toEqual({ type: 'text', text: 'Let\'s go ' });
        expect(tokens[1]).toEqual({
            type: 'emote',
            code: 'vaporHype',
            url: 'https://cdn.vaporhub.test/emotes/vaporHype.png'
        });
        expect(tokens[2]).toEqual({ type: 'text', text: ' GG' });
    });

    it('doit gérer un message composé uniquement d\'émotes consécutives', () => {
        const tokens = parseMessageContent('Kappa LUL');
        expect(tokens).toHaveLength(3); // Kappa + espace + LUL
        expect(tokens[0]).toMatchObject({ type: 'emote', code: 'Kappa' });
        expect(tokens[1]).toEqual({ type: 'text', text: ' ' });
        expect(tokens[2]).toMatchObject({ type: 'emote', code: 'LUL' });
    });

    it('ne doit pas remplacer des sous-chaînes au milieu d\'un mot', () => {
        // "LUL" ne doit pas être extrait de "LULLABY"
        const tokens = parseMessageContent('C\'est une lullaby');
        expect(tokens).toEqual([
            { type: 'text', text: 'C\'est une lullaby' }
        ]);
    });
});