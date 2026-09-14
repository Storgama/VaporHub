<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import TwitchCard from '../components/TwitchCard.vue';
import Chat from '../components/Chat.vue';
import { useAuth } from '../state/useAuth';
import { getTwitchBadgesApi, getTwitchEmotesApi, getTwitchStatsApi, sendTwitchChatMessageApi } from '../api/twitch';
import { useTwitchChat } from '../composables/useTwitchChat';
import type { ChatMessage, ResolvedBadge, SendMessagePayload, TimeoutUserPayload, BanUserPayload } from '../types/chat';
import { Radio, FlaskConical } from 'lucide-vue-next';

const { user } = useAuth();

const splitContainer = ref<HTMLElement | null>(null);
const cockpitWidth = ref<number>(60);
const isDragging = ref<boolean>(false);
const isDesktop = ref<boolean>(true);

// Données du Tchat & Mode Mock Global
const customEmotes = ref<Record<string, string>>({});
const channelBadges = ref<Record<string, ResolvedBadge>>({});
const isMockActive = ref<boolean>(false);

const MOCK_TEST_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-mock-1',
    platform: 'twitch',
    author: {
      id: 'bot-1',
      name: 'VaporBot',
      color: '#a855f7',
      badges: ['moderator']
    },
    content: 'Bienvenue sur VaporHub ! Le live est synchronisé PogChamp',
    timestamp: '12:00'
  },
  {
    id: 'msg-mock-2',
    platform: 'twitch',
    author: {
      id: 'fan-1',
      name: 'PixelViewer',
      color: '#22c55e',
      badges: ['vip']
    },
    content: 'Prêt pour la session Kappa',
    timestamp: '12:01'
  },
  {
    id: 'msg-mock-3',
    platform: 'youtube',
    author: {
      id: 'yt-1',
      name: 'StreamEnjoyer_YT',
      color: '#ef4444',
      badges: ['subscriber']
    },
    content: 'Salut l\'équipe ! Superbe qualité de stream sur YouTube ❤️',
    timestamp: '12:02'
  },
  {
    id: 'msg-mock-4',
    platform: 'twitch',
    author: {
      id: 'fan-2',
      name: 'HypeMaster',
      color: '#ec4899',
      badges: ['subscriber']
    },
    content: 'Incroyable ce moove !',
    gifUrl: 'https://media.giphy.com/media/joSNxeswxuc74Juo8X/giphy.gif',
    timestamp: '12:03'
  }
];

// Le tchat est STRICTEMENT VIDE par défaut en mode réel
const messages = ref<ChatMessage[]>([]);

// Connexion IRC Twitch WebSocket automatique en direct
const {
  isConnected: isIrcConnected,
  currentChannel: ircChannel,
  connect: connectIrc,
  disconnect: disconnectIrc,
  onMessage: onIrcMessage,
  onClearMessage: onIrcClearMessage,
  onClearChat: onIrcClearChat
} = useTwitchChat();

// Réception des vrais messages Twitch en temps réel
onIrcMessage((incomingMsg) => {
  // Éviter les doublons si le message a déjà été affiché de façon optimiste
  const isDuplicate = messages.value.some(
    (m) => m.id === incomingMsg.id || (m.content === incomingMsg.content && m.author.name === incomingMsg.author.name)
  );
  if (!isDuplicate) {
    messages.value.push(incomingMsg);
  }
});

onIrcClearMessage((targetMsgId) => {
  handleDeleteMessage(targetMsgId);
});

onIrcClearChat((targetUser) => {
  if (targetUser) {
    handleBanUser({ username: targetUser });
  } else {
    handleClearChat();
  }
});

// Basculeur GLOBAL de simulation (Live + Tchat)
function toggleGlobalMock() {
  isMockActive.value = !isMockActive.value;
  applyMockState(isMockActive.value);
}

function applyMockState(isMock: boolean) {
  isMockActive.value = isMock;
  if (isMock) {
    messages.value = [...MOCK_TEST_MESSAGES];
    loadChatAssets(true);
  } else {
    messages.value = [];
    loadChatAssets(false);
  }
}

// Redimensionnement en temps réel
function checkDesktop() {
  isDesktop.value = window.innerWidth >= 1024;
}

function startResize() {
  isDragging.value = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !splitContainer.value) return;
    const rect = splitContainer.value.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rawPercent = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(Math.max(rawPercent, 35), 75);
    cockpitWidth.value = Math.round(clamped * 10) / 10;
  };

  const handleEnd = () => {
    isDragging.value = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('vaporhub_cockpit_split_width', cockpitWidth.value.toString());
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchmove', handleMove);
    window.removeEventListener('touchend', handleEnd);
  };

  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchmove', handleMove);
  window.addEventListener('touchend', handleEnd);
}

// Actions Tchat avec ENVOI RÉEL vers Twitch
async function handleSendMessage(payload: SendMessagePayload) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const localMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    platform: payload.platform,
    author: {
      name: user.value || 'Streamer',
      color: '#c084fc',
      badges: ['broadcaster']
    },
    content: payload.content,
    timestamp: timeStr
  };

  // 1. Affichage optimiste immédiat dans le tchat
  messages.value.push(localMsg);

  // 2. Envoi réel vers l'API Twitch si plateforme Twitch ou All
  if (payload.platform === 'twitch' || payload.platform === 'all') {
    try {
      await sendTwitchChatMessageApi(payload.content, isMockActive.value);
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message Twitch:', err);
    }
  }
}

function handleDeleteMessage(messageId: string) {
  const target = messages.value.find((m) => m.id === messageId);
  if (target) {
    target.isDeleted = true;
  }
}

function handleTimeoutUser(payload: TimeoutUserPayload) {
  messages.value.forEach((m) => {
    if (m.author.name === payload.username || (payload.userId && m.author.id === payload.userId)) {
      m.isDeleted = true;
    }
  });
}

function handleBanUser(payload: BanUserPayload) {
  messages.value.forEach((m) => {
    if (m.author.name === payload.username || (payload.userId && m.author.id === payload.userId)) {
      m.isDeleted = true;
    }
  });
}

function handleClearChat() {
  messages.value = [];
}

// Chargement automatique des badges, émotes et liaison automatique au tchat
async function loadChatAssets(isMock: boolean = false) {
  try {
    const [badges, emotes, stats] = await Promise.all([
      getTwitchBadgesApi(isMock).catch(() => ({})),
      getTwitchEmotesApi(isMock).catch(() => []),
      getTwitchStatsApi(isMock ? '?mock=true' : '').catch(() => null)
    ]);

    if (badges && Object.keys(badges).length > 0) {
      channelBadges.value = badges;
    }

    if (emotes && emotes.length > 0) {
      const map: Record<string, string> = {};
      for (const em of emotes) {
        map[em.name] = em.images.url_1x;
      }
      customEmotes.value = map;
    }

    // Liaison AUTOMATIQUE au compte Twitch lié de l'utilisateur (zéro saisie manuelle)
    let target = '';
    if (stats && stats.channel) {
      target = stats.channel.replace(/\s*\(Mock Live\)/i, '').trim().toLowerCase();
    } else if (user.value) {
      target = user.value.trim().toLowerCase();
    }

    if (target) {
      connectIrc(target);
    }
  } catch {
    // Non bloquant si hors ligne
  }
}

onMounted(() => {
  checkDesktop();
  window.addEventListener('resize', checkDesktop);

  const saved = localStorage.getItem('vaporhub_cockpit_split_width');
  if (saved) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed) && parsed >= 35 && parsed <= 75) {
      cockpitWidth.value = parsed;
    }
  }

  loadChatAssets(false);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkDesktop);
  disconnectIrc();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Barre de Contrôle Globale du Dashboard -->
    <header class="flex flex-wrap items-center justify-between gap-4 p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-600/15 text-purple-400 rounded-xl border border-purple-500/25">
          <Radio class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-zinc-100">
            Cockpit Live & Tchat Natif
          </h1>
          <p class="text-[11px] text-zinc-400">
            Gestion du direct et modération tchat multi-plateforme
          </p>
        </div>
      </div>

      <!-- Bouton GLOBAL Simuler un Live -->
      <button
        data-testid="btn-global-mock-toggle"
        @click="toggleGlobalMock"
        :class="['text-xs px-3.5 py-2 rounded-xl border transition font-bold flex items-center gap-2 cursor-pointer',
                 isMockActive
                   ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950/40'
                   : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-800 hover:text-zinc-100']"
        title="Basculer globalement l'ensemble du Cockpit et du Tchat en mode simulation"
      >
        <FlaskConical class="w-4 h-4 text-amber-400" />
        <span>{{ isMockActive ? 'Mode Simulation : ACTIF' : 'Simuler un Live' }}</span>
      </button>
    </header>

    <!-- Split-Pane : Cockpit et Tchat -->
    <div
      ref="splitContainer"
      class="flex flex-col lg:flex-row w-full min-h-[calc(100vh-210px)] items-stretch select-none"
    >
      <!-- Colonne Cockpit (Redimensionnable) -->
      <div
        data-testid="cockpit-column"
        class="w-full lg:shrink-0 overflow-y-auto pr-0 lg:pr-2 select-text"
        :style="{ width: isDesktop ? `${cockpitWidth}%` : '100%' }"
      >
        <TwitchCard :is-mock="isMockActive" @mock-change="applyMockState" />
      </div>

      <!-- Poignée de Redimensionnement (Split Resizer) -->
      <div
        data-testid="split-resizer"
        @mousedown="startResize"
        @touchstart="startResize"
        class="hidden lg:flex items-center justify-center w-4 cursor-col-resize group relative z-10 shrink-0"
        title="Glisser pour ajuster la largeur du Cockpit et du Tchat"
      >
        <div
          class="w-1 h-32 rounded-full transition-colors duration-200"
          :class="isDragging ? 'bg-purple-500 ring-2 ring-purple-400/40' : 'bg-zinc-800 group-hover:bg-purple-500'"
        />
      </div>

      <!-- Colonne Tchat -->
      <div
        data-testid="chat-column"
        class="w-full lg:flex-1 min-w-[320px] pl-0 lg:pl-2 mt-4 lg:mt-0 flex flex-col h-[650px] lg:h-auto select-text"
      >
        <Chat
          class="h-full"
          :messages="messages"
          :custom-emotes="customEmotes"
          :channel-badges="channelBadges"
          :can-moderate="true"
          @send-message="handleSendMessage"
          @delete-message="handleDeleteMessage"
          @timeout-user="handleTimeoutUser"
          @ban-user="handleBanUser"
          @clear-chat="handleClearChat"
        />
      </div>
    </div>
  </div>
</template>