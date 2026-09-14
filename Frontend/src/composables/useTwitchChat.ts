import { ref } from 'vue';
import type { ChatMessage } from '../types/chat';
import { parseTwitchIrcLine } from '../utils/twitchIrc';

export function useTwitchChat() {
  const isConnected = ref(false);
  const currentChannel = ref('');
  const connectionError = ref('');

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let onMessageCallback: ((message: ChatMessage) => void) | null = null;
  let onClearMsgCallback: ((targetMsgId: string) => void) | null = null;
  let onClearChatCallback: ((targetUser?: string) => void) | null = null;

  function connect(channelName: string) {
    const cleanChannel = channelName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanChannel) return;

    disconnect();
    currentChannel.value = cleanChannel;
    connectionError.value = '';

    try {
      if (typeof WebSocket === 'undefined') {
        isConnected.value = false;
        return;
      }

      // Connexion au serveur WebSocket IRC officiel de Twitch
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

      ws.onopen = () => {
        isConnected.value = true;
        connectionError.value = '';

        // Demande des capacités (tags pour badges, couleurs, id)
        ws?.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
        // Authentification anonyme en lecture seule (standard Twitch IRC)
        ws?.send('PASS SCHMOOPIE');
        ws?.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
        // Rejoindre le canal
        ws?.send(`JOIN #${cleanChannel}`);
      };

      ws.onmessage = (event: MessageEvent) => {
        const rawData = typeof event.data === 'string' ? event.data : '';
        const lines = rawData.split('\r\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          const parsed = parseTwitchIrcLine(line);

          if (parsed.type === 'PING') {
            ws?.send('PONG :tmi.twitch.tv');
          } else if (parsed.type === 'PRIVMSG' && parsed.message) {
            if (onMessageCallback) {
              onMessageCallback(parsed.message);
            }
          } else if (parsed.type === 'CLEARMSG' && parsed.targetMsgId) {
            if (onClearMsgCallback) {
              onClearMsgCallback(parsed.targetMsgId);
            }
          } else if (parsed.type === 'CLEARCHAT') {
            if (onClearChatCallback) {
              onClearChatCallback(parsed.targetUser);
            }
          }
        }
      };

      ws.onclose = () => {
        isConnected.value = false;
      };

      ws.onerror = () => {
        isConnected.value = false;
        connectionError.value = 'Erreur de connexion WebSocket Twitch';
      };
    } catch (err) {
      isConnected.value = false;
      connectionError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // Ignorer si déjà fermé
      }
      ws = null;
    }

    isConnected.value = false;
  }

  function onMessage(callback: (message: ChatMessage) => void) {
    onMessageCallback = callback;
  }

  function onClearMessage(callback: (targetMsgId: string) => void) {
    onClearMsgCallback = callback;
  }

  function onClearChat(callback: (targetUser?: string) => void) {
    onClearChatCallback = callback;
  }

  return {
    isConnected,
    currentChannel,
    connectionError,
    connect,
    disconnect,
    onMessage,
    onClearMessage,
    onClearChat
  };
}
