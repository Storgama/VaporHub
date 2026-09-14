import type { ChatMessage } from '../types/chat';

export interface ParsedIrcEvent {
  type: 'PING' | 'PRIVMSG' | 'CLEARMSG' | 'CLEARCHAT' | 'OTHER';
  message?: ChatMessage;
  targetMsgId?: string;
  targetUser?: string;
}

/**
 * Décode une ligne brute du protocole Twitch IRC WebSocket (avec ou sans tags).
 */
export function parseTwitchIrcLine(rawLine: string): ParsedIrcEvent {
  const line = rawLine.trim();
  if (!line) return { type: 'OTHER' };

  // 1. Détection PING
  if (line.startsWith('PING')) {
    return { type: 'PING' };
  }

  let tags: Record<string, string> = {};
  let rest = line;

  // 2. Extraction des tags IRC s'ils commencent par '@'
  if (line.startsWith('@')) {
    const firstSpaceIdx = line.indexOf(' ');
    if (firstSpaceIdx !== -1) {
      const tagsString = line.slice(1, firstSpaceIdx);
      rest = line.slice(firstSpaceIdx + 1);

      const tagPairs = tagsString.split(';');
      for (const pair of tagPairs) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx !== -1) {
          const key = pair.slice(0, eqIdx);
          const val = pair.slice(eqIdx + 1);
          tags[key] = val;
        }
      }
    }
  }

  // 3. Traitement CLEARMSG (suppression d'un message spécifique)
  if (rest.includes(' CLEARMSG ')) {
    return {
      type: 'CLEARMSG',
      targetMsgId: tags['target-msg-id']
    };
  }

  // 4. Traitement CLEARCHAT (exclusion d'un utilisateur ou purge globale)
  if (rest.includes(' CLEARCHAT ')) {
    const colonIdx = rest.indexOf(' :');
    const targetUser = colonIdx !== -1 ? rest.slice(colonIdx + 2).trim() : undefined;
    return {
      type: 'CLEARCHAT',
      targetUser: targetUser || undefined
    };
  }

  // 5. Traitement PRIVMSG (message utilisateur dans le tchat)
  if (rest.includes(' PRIVMSG ')) {
    const privMsgIdx = rest.indexOf(' PRIVMSG ');
    const prefix = rest.slice(0, privMsgIdx);
    const afterPrivMsg = rest.slice(privMsgIdx + 9);
    const colonIdx = afterPrivMsg.indexOf(' :');

    const content = colonIdx !== -1 ? afterPrivMsg.slice(colonIdx + 2) : '';

    // Extraction du pseudo depuis le préfixe :nick!nick@...
    let nick = '';
    if (prefix.startsWith(':')) {
      const exclIdx = prefix.indexOf('!');
      nick = exclIdx !== -1 ? prefix.slice(1, exclIdx) : prefix.slice(1);
    }

    const displayName = tags['display-name'] || nick || 'Anonyme';
    const color = tags['color'] || '#a855f7';
    const msgId = tags['id'] || `twitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Badges (ex: broadcaster/1,subscriber/3000 -> ['broadcaster', 'subscriber'])
    const badgesStr = tags['badges'] || '';
    const badges = badgesStr
      ? badgesStr.split(',').map((b) => b.split('/')[0]).filter(Boolean)
      : [];

    // Horodatage
    let timestamp = '';
    if (tags['tmi-sent-ts']) {
      const date = new Date(parseInt(tags['tmi-sent-ts'], 10));
      timestamp = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      const now = new Date();
      timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    // Détection des GIFs natifs Twitch (GIPHY) ou URLs directes de GIF
    let gifUrl: string | undefined;
    if (tags['gifs']) {
      const parts = tags['gifs'].split('|');
      const foundUrl = parts.find((p) => p.startsWith('http://') || p.startsWith('https://'));
      if (foundUrl) {
        gifUrl = foundUrl;
      }
    }

    if (!gifUrl && /^https?:\/\/\S+\.(?:gif)(?:\?\S*)?$/i.test(content.trim())) {
      gifUrl = content.trim();
    }

    return {
      type: 'PRIVMSG',
      message: {
        id: msgId,
        platform: 'twitch',
        author: {
          id: tags['user-id'] || nick,
          name: displayName,
          color,
          badges
        },
        content,
        timestamp,
        ...(gifUrl ? { gifUrl } : {})
      }
    };
  }

  return { type: 'OTHER' };
}

