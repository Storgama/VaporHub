import type { ParsedChatToken } from '../types/chat';

export const GLOBAL_EMOTES: Record<string, string> = {
    Kappa: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0',
    PogChamp: 'https://static-cdn.jtvnw.net/emoticons/v2/305954156/default/dark/1.0',
    LUL: 'https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0',
    BibleThump: 'https://static-cdn.jtvnw.net/emoticons/v2/86/default/dark/1.0',
    Kreygasm: 'https://static-cdn.jtvnw.net/emoticons/v2/41/default/dark/1.0',
    ResidentSleeper: 'https://static-cdn.jtvnw.net/emoticons/v2/245/default/dark/1.0',
    WutFace: 'https://static-cdn.jtvnw.net/emoticons/v2/28087/default/dark/1.0',
    HeyGuys: 'https://static-cdn.jtvnw.net/emoticons/v2/30259/default/dark/1.0',
    CoolCat: 'https://static-cdn.jtvnw.net/emoticons/v2/58127/default/dark/1.0',
    monkaS: 'https://static-cdn.jtvnw.net/emoticons/v2/monkaS/default/dark/1.0',
    Pepega: 'https://static-cdn.jtvnw.net/emoticons/v2/Pepega/default/dark/1.0'
};

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Découpe le contenu textuel d'un message en tokens de texte et d'émotes inline.
 * Respecte les frontières de mots et préserve l'espacement exact.
 */
export function parseMessageContent(
    content: string,
    customEmotes?: Record<string, string>
): ParsedChatToken[] {
    if (!content) return [];

    // Priorité aux émotes personnalisées de chaîne sur les émotes globales
    const allEmotes: Record<string, string> = {
        ...GLOBAL_EMOTES,
        ...(customEmotes || {})
    };

    const emoteKeys = Object.keys(allEmotes);
    if (emoteKeys.length === 0) {
        return [{ type: 'text', text: content }];
    }

    // Trier par longueur décroissante pour matcher les codes les plus longs en premier
    emoteKeys.sort((a, b) => b.length - a.length);

    const pattern = emoteKeys.map(escapeRegex).join('|');
    // Une émote doit être précédée du début de chaîne ou d'un espace, et suivie de la fin ou d'un espace
    const regex = new RegExp(`(?:^|(?<=\\s))(${pattern})(?=\\s|$)`, 'g');

    const tokens: ParsedChatToken[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const matchStart = match.index;
        const matchedCode = match[1];
        const matchEnd = matchStart + matchedCode.length;

        // Texte intercalaire avant l'émote
        if (matchStart > lastIndex) {
            tokens.push({
                type: 'text',
                text: content.slice(lastIndex, matchStart)
            });
        }

        // Token émote
        tokens.push({
            type: 'emote',
            code: matchedCode,
            url: allEmotes[matchedCode]
        });

        lastIndex = matchEnd;
    }

    // Texte restant après la dernière émote
    if (lastIndex < content.length) {
        tokens.push({
            type: 'text',
            text: content.slice(lastIndex)
        });
    }

    return tokens.length > 0 ? tokens : [{ type: 'text', text: content }];
}

