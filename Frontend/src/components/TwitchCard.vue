<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getTwitchStatsApi, getTwitchAuthUrlApi } from '../api/twitch.js';
import { Radio, Users, Gamepad2, FileText, RefreshCw, AlertCircle, ExternalLink } from 'lucide-vue-next';

const stats = ref(null);
const loading = ref(true);
const error = ref('');
const isRefreshing = ref(false);
let pollInterval = null;

async function loadStats(isSilent = false) {
  if (!isSilent) loading.value = true;
  else isRefreshing.value = true;
  
  error.value = '';

  try {
    stats.value = await getTwitchStatsApi();
  } catch (err) {
    if (!isSilent) error.value = err.message;
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
}

async function handleLinkTwitch() {
  try {
    const url = await getTwitchAuthUrlApi();
    window.location.href = url;
  } catch (err) {
    error.value = err.message;
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    loadStats(true);
    startPolling();
  }
}

function startPolling() {
  stopPolling();
  pollInterval = setInterval(() => {
    loadStats(true);
  }, 30000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('twitch_linked')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  loadStats(false);
  startPolling();
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative">
    
    <!-- En-tête sobre de la carte -->
    <div class="flex items-center gap-2.5 mb-6 pb-4 border-b border-zinc-800/80">
      <div class="p-2 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
        <Radio class="w-5 h-5" />
      </div>
      <h2 class="text-lg font-bold text-zinc-100">Twitch Live Tracker</h2>
    </div>

    <!-- État 1 : Chargement initial -->
    <div v-if="loading" class="py-12 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
      <RefreshCw class="w-5 h-5 animate-spin text-purple-400" />
      <span>Chargement des données Twitch en direct...</span>
    </div>

    <!-- État 2 : Erreur -->
    <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2.5">
      <AlertCircle class="w-5 h-5 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- État 3 : Compte NON lié -->
    <div v-else-if="stats && !stats.linked" class="py-8 text-center">
      <p class="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
        Liez votre compte Twitch à VaporHub pour suivre vos streams, votre audience et vos performances en temps réel.
      </p>
      <button 
        @click="handleLinkTwitch"
        class="inline-flex items-center gap-2 bg-[#9146ff] hover:bg-[#772ce8] text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-900/30 transition duration-200 cursor-pointer"
      >
        <span>Lier mon compte Twitch</span>
        <ExternalLink class="w-4 h-4" />
      </button>
    </div>

    <!-- État 4 : Compte LIÉ -->
    <div v-else-if="stats && stats.linked" class="space-y-6">
      
      <!-- Profil de la chaîne (Avatar + Nom + Statut) -->
      <div class="flex items-center gap-4">
        <div class="relative">
          <img 
            v-if="stats.avatar" 
            :src="stats.avatar" 
            alt="Avatar Twitch" 
            class="w-16 h-16 rounded-full border-2 border-purple-500 shadow-md object-cover bg-zinc-950" 
          />
          <div v-else class="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <Radio class="w-8 h-8" />
          </div>
          <!-- Point d'état sur l'avatar -->
          <span 
            :class="['absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900', 
                     stats.isLive ? 'bg-rose-500' : 'bg-zinc-500']"
          ></span>
        </div>

        <div>
          <h3 class="text-xl font-extrabold text-zinc-100">{{ stats.channel }}</h3>
          <span 
            :class="['inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold mt-1 border', 
                     stats.isLive ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-zinc-800/80 text-zinc-400 border-zinc-700']"
          >
            <span v-if="stats.isLive" class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            {{ stats.isLive ? 'EN DIRECT' : 'HORS LIGNE' }}
          </span>
        </div>
      </div>

      <!-- Détails si le streamer est EN LIVE -->
      <div v-if="stats.isLive" class="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-5 space-y-3">
        
        <!-- Nombre de spectateurs -->
        <div class="flex items-center gap-2 text-emerald-400 font-extrabold text-lg">
          <Users class="w-5 h-5 text-emerald-400" />
          <span>{{ stats.viewerCount }} spectateurs en direct</span>
        </div>

        <!-- Catégorie / Jeu -->
        <div v-if="stats.game" class="flex items-center gap-2 text-sm text-zinc-300">
          <Gamepad2 class="w-4 h-4 text-purple-400 shrink-0" />
          <span class="text-zinc-500">Jeu :</span>
          <span class="font-medium text-zinc-200">{{ stats.game }}</span>
        </div>

        <!-- Titre du stream -->
        <div v-if="stats.title" class="flex items-start gap-2 text-sm text-zinc-300">
          <FileText class="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span class="text-zinc-500 shrink-0">Titre :</span>
          <span class="italic text-zinc-300">{{ stats.title }}</span>
        </div>

        <!-- Miniature du live -->
        <div v-if="stats.thumbnailUrl" class="mt-4 pt-2">
          <img 
            :src="stats.thumbnailUrl" 
            alt="Aperçu du stream" 
            class="rounded-lg border border-zinc-800 max-w-sm w-full shadow-md" 
          />
        </div>

      </div>

      <!-- Barre d'action inférieure -->
      <div class="flex justify-between items-center pt-2 text-xs text-zinc-500">
        <span>Synchronisation active en arrière-plan</span>
        <button 
          @click="loadStats(true)" 
          :disabled="isRefreshing"
          class="flex items-center gap-1.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700/50 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw :class="['w-3.5 h-3.5', { 'animate-spin': isRefreshing }]" />
          <span>Actualiser</span>
        </button>
      </div>

    </div>

  </div>
</template>