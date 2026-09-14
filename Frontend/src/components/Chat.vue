<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import type { ChatMessage, ChatPlatform, ResolvedBadge, SendMessagePayload, TimeoutUserPayload, BanUserPayload } from '../types/chat';
import { resolveBadge } from '../utils/chatBadges';
import { parseMessageContent, GLOBAL_EMOTES } from '../utils/chatEmotes';
import { MessageSquare, Send, Smile, Trash2, Clock, Ban, Eraser, Shield } from 'lucide-vue-next';

interface Props {
  messages?: ChatMessage[];
  customEmotes?: Record<string, string>;
  channelBadges?: Record<string, ResolvedBadge>;
  canModerate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  messages: () => [],
  customEmotes: () => ({}),
  channelBadges: () => ({}),
  canModerate: true
});

const emit = defineEmits<{
  (e: 'send-message', payload: SendMessagePayload): void;
  (e: 'delete-message', messageId: string): void;
  (e: 'timeout-user', payload: TimeoutUserPayload): void;
  (e: 'ban-user', payload: BanUserPayload): void;
  (e: 'clear-chat'): void;
}>();

const inputText = ref('');
const selectedPlatform = ref<ChatPlatform>('twitch');
const isPickerOpen = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Catalogue complet des émotes (Globales + Chaîne)
const availableEmotes = computed<Record<string, string>>(() => {
  return {
    ...GLOBAL_EMOTES,
    ...(props.customEmotes || {})
  };
});

function togglePlatform() {
  if (selectedPlatform.value === 'twitch') {
    selectedPlatform.value = 'youtube';
  } else if (selectedPlatform.value === 'youtube') {
    selectedPlatform.value = 'all';
  } else {
    selectedPlatform.value = 'twitch';
  }
}

function insertEmote(code: string) {
  if (inputText.value.length > 0 && !inputText.value.endsWith(' ')) {
    inputText.value += ' ';
  }
  inputText.value += `${code} `;
}

function handleSubmit() {
  const trimmed = inputText.value.trim();
  if (!trimmed) return;

  emit('send-message', {
    content: trimmed,
    platform: selectedPlatform.value
  });

  inputText.value = '';
  isPickerOpen.value = false;
}

function getBadge(badgeId: string): ResolvedBadge | null {
  return resolveBadge(badgeId, props.channelBadges);
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

watch(() => props.messages, () => {
  nextTick(scrollToBottom);
}, { deep: true });

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="flex flex-col h-full bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
    <!-- En-tête du tchat -->
    <header class="flex items-center justify-between px-4 py-3 bg-zinc-950/70 border-b border-zinc-800/80">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
          <MessageSquare class="w-4 h-4" />
        </div>
        <h2 class="text-sm font-bold text-zinc-100 uppercase tracking-wider">
          Tchat en direct
        </h2>
        <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
          {{ messages.length }} msgs
        </span>
      </div>

      <!-- Actions globales tchat -->
      <div class="flex items-center gap-2">
        <button
          v-if="canModerate"
          data-testid="action-clear-chat"
          @click="$emit('clear-chat')"
          class="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 px-2.5 py-1 rounded-lg transition"
          title="Vider le tchat"
        >
          <Eraser class="w-3.5 h-3.5" />
          <span>Vider</span>
        </button>
      </div>
    </header>

    <!-- Flux des messages avec défilement -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs select-text scroll-smooth"
    >
      <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-zinc-500 py-12">
        <MessageSquare class="w-8 h-8 mb-2 opacity-40" />
        <p>Aucun message pour le moment.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="group relative flex items-start gap-2 p-1.5 rounded-lg hover:bg-zinc-800/40 transition"
      >
        <!-- Indicateur plateforme -->
        <span
          class="inline-block mt-0.5 px-1 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
          :class="{
            'bg-purple-950 text-purple-300 border border-purple-800/50': msg.platform === 'twitch',
            'bg-red-950 text-red-300 border border-red-800/50': msg.platform === 'youtube',
            'bg-gradient-to-r from-purple-950 to-red-950 text-amber-300 border border-amber-700/50': msg.platform === 'all',
            'bg-zinc-800 text-zinc-300 border border-zinc-700': msg.platform === 'system'
          }"
        >
          {{ msg.platform === 'twitch' ? 'TW' : msg.platform === 'youtube' ? 'YT' : msg.platform === 'all' ? 'ALL' : 'SYS' }}
        </span>

        <!-- Corps du message -->
        <div class="flex-1 min-w-0 leading-relaxed break-words">
          <!-- Horodatage & Auteur -->
          <span class="text-zinc-500 text-[10px] mr-1.5">{{ msg.timestamp }}</span>

          <!-- Badges de rôle (Modérateur, VIP, Artiste, etc.) -->
          <template v-if="msg.author.badges">
            <template v-for="bId in msg.author.badges" :key="bId">
              <img
                v-if="getBadge(bId)?.imageUrl"
                data-testid="chat-badge"
                :src="getBadge(bId)?.imageUrl"
                :alt="getBadge(bId)?.label"
                :title="getBadge(bId)?.label"
                class="inline-block w-4 h-4 mr-1 align-text-bottom rounded shrink-0"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
            </template>
          </template>

          <!-- Pseudo auteur -->
          <span
            class="font-bold mr-1.5 hover:underline cursor-pointer"
            :style="{ color: msg.author.color || '#c084fc' }"
          >
            {{ msg.author.name }}:
          </span>

          <!-- Message supprimé -->
          <span v-if="msg.isDeleted" class="italic text-zinc-500">
            &lt;Message supprimé par un modérateur&gt;
          </span>

          <!-- Contenu parsé avec émotes inline -->
          <template v-else>
            <template v-if="!msg.gifUrl || msg.content.trim() !== msg.gifUrl.trim()">
              <template v-for="(token, idx) in parseMessageContent(msg.content, customEmotes)" :key="idx">
                <span v-if="token.type === 'text'">{{ token.text }}</span>
                <img
                  v-else-if="token.type === 'emote'"
                  data-testid="chat-emote"
                  :src="token.url"
                  :alt="token.code"
                  :title="token.code"
                  class="inline-block h-6 mx-0.5 align-middle select-none"
                />
              </template>
            </template>

            <!-- Rendu GIF animé (Twitch GIPHY ou URL média) -->
            <div v-if="msg.gifUrl" class="mt-1.5 max-w-[260px]">
              <img
                data-testid="chat-gif"
                :src="msg.gifUrl"
                alt="GIF"
                class="rounded-lg max-h-48 w-auto object-contain border border-zinc-800/80 shadow-md bg-zinc-950/50"
                loading="lazy"
                @error="($event.target as HTMLElement).style.display = 'none'"
              />
            </div>
          </template>
        </div>

        <!-- Barre d'actions rapides de modération au survol -->
        <div
          v-if="canModerate && !msg.isDeleted"
          class="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-zinc-950/90 border border-zinc-700/80 rounded-lg px-1.5 py-0.5 shadow-lg shrink-0 transition"
        >
          <button
            :data-testid="'action-delete-' + msg.id"
            @click="$emit('delete-message', msg.id)"
            class="p-1 text-zinc-400 hover:text-red-400 transition"
            title="Supprimer le message"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
          <button
            :data-testid="'action-timeout-' + msg.id"
            @click="$emit('timeout-user', { userId: msg.author.id, username: msg.author.name, duration: 300 })"
            class="p-1 text-zinc-400 hover:text-amber-400 transition"
            title="Exclure 5m (Timeout)"
          >
            <Clock class="w-3.5 h-3.5" />
          </button>
          <button
            :data-testid="'action-ban-' + msg.id"
            @click="$emit('ban-user', { userId: msg.author.id, username: msg.author.name })"
            class="p-1 text-zinc-400 hover:text-red-500 transition"
            title="Bannir définitivement"
          >
            <Ban class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Popover Emote Picker -->
    <div
      v-if="isPickerOpen"
      data-testid="emote-picker-popover"
      class="border-t border-zinc-800 bg-zinc-950/95 p-3 max-h-48 overflow-y-auto backdrop-blur-md shadow-2xl"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Émotes disponibles</span>
        <button @click="isPickerOpen = false" class="text-xs text-zinc-500 hover:text-zinc-300">✕</button>
      </div>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="(url, code) in availableEmotes"
          :key="code"
          :data-emote="code"
          @click="insertEmote(code)"
          class="p-1.5 rounded-lg hover:bg-zinc-800/80 flex items-center justify-center transition border border-transparent hover:border-purple-500/30"
          :title="code"
        >
          <img :src="url" :alt="code" class="w-6 h-6 object-contain" />
        </button>
      </div>
    </div>

    <!-- Formulaire d'envoi et sélecteur de plateforme -->
    <footer class="p-3 bg-zinc-950/80 border-t border-zinc-800/80">
      <form
        data-testid="chat-form"
        @submit.prevent="handleSubmit"
        class="flex items-center gap-2"
      >
        <!-- Basculeur Twitch / YouTube / All -->
        <button
          type="button"
          data-testid="platform-toggle"
          @click="togglePlatform"
          class="px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 border"
          :class="{
            'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30': selectedPlatform === 'twitch',
            'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600/30': selectedPlatform === 'youtube',
            'bg-gradient-to-r from-purple-600/25 to-red-600/25 text-amber-200 border-amber-500/40 hover:from-purple-600/35 hover:to-red-600/35': selectedPlatform === 'all'
          }"
          :title="'Plateforme active : ' + selectedPlatform"
        >
          <span>{{ selectedPlatform === 'twitch' ? 'Twitch' : selectedPlatform === 'youtube' ? 'YouTube' : 'All' }}</span>
        </button>

        <!-- Champ de saisie -->
        <div class="relative flex-1 flex items-center">
          <input
            data-testid="chat-input"
            v-model="inputText"
            type="text"
            placeholder="Envoyer un message..."
            class="w-full bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-zinc-100 placeholder-zinc-500 rounded-xl px-3 py-2 pr-9 text-xs outline-none transition"
          />
          <button
            type="button"
            data-testid="emote-picker-btn"
            @click="isPickerOpen = !isPickerOpen"
            class="absolute right-2 text-zinc-400 hover:text-purple-400 transition"
            title="Insérer une émote"
          >
            <Smile class="w-4 h-4" />
          </button>
        </div>

        <!-- Bouton d'envoi -->
        <button
          type="submit"
          class="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition shrink-0 cursor-pointer disabled:opacity-40"
          :disabled="!inputText.trim()"
          title="Envoyer"
        >
          <Send class="w-4 h-4" />
        </button>
      </form>
    </footer>
  </div>
</template>

