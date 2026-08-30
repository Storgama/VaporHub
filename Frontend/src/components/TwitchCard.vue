<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getTwitchStatsApi, getTwitchAuthUrlApi } from '../api/twitch.js';

const stats = ref(null);
const loading = ref(true);
const error = ref('');
let pollInterval = null;

// Charger les données du live (avec option "silencieuse" pour le polling)
async function loadStats(isSilent = false) {
  if (!isSilent) {
    loading.value = true;
  }
  error.value = '';

  try {
    stats.value = await getTwitchStatsApi();
  } catch (err) {
    // Si c'est un refresh en arrière-plan et que ça échoue, on évite d'effacer les données précédentes
    if (!isSilent) {
      error.value = err.message;
    }
  } finally {
    if (!isSilent) {
      loading.value = false;
    }
  }
}

// Redirection vers Twitch pour lier le compte
async function handleLinkTwitch() {
  try {
    const url = await getTwitchAuthUrlApi();
    window.location.href = url;
  } catch (err) {
    error.value = err.message;
  }
}

// Gestion de la visibilité de l'onglet (met en pause le polling si l'utilisateur change d'onglet)
function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else {
    loadStats(true);
    startPolling();
  }
}

function startPolling() {
  stopPolling(); // Sécurité : évite d'avoir 2 timers en parallèle
  pollInterval = setInterval(() => {
    loadStats(true); // Actualisation silencieuse toutes les 30 secondes
  }, 30000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

onMounted(() => {
  // Nettoyer l'URL si retour de Twitch (?twitch_linked=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('twitch_linked')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 1. Premier chargement avec spinner
  loadStats(false);

  // 2. Démarrer le polling automatique
  startPolling();

  // 3. Écouter si l'onglet passe en arrière-plan
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  // Détruire le timer et l'écouteur d'événements quand le composant est démonté
  stopPolling();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div class="card twitch-card">
    <div class="card-title-bar">
      <h2>🎮 Twitch Live Tracker</h2>
      <span v-if="stats && stats.linked" class="pulse-indicator" title="Synchronisation automatique active (30s)"></span>
    </div>

    <!-- État Chargement initial -->
    <p v-if="loading">Chargement des données Twitch...</p>

    <!-- État Erreur -->
    <p v-else-if="error" class="message error">{{ error }}</p>

    <!-- État 1 : Compte NON lié -->
    <div v-else-if="stats && !stats.linked" class="not-linked">
      <p>Tu n'as pas encore lié ta chaîne Twitch à VaporHub.</p>
      <button class="btn-twitch" @click="handleLinkTwitch">
        🟣 Lier mon compte Twitch
      </button>
    </div>

    <!-- État 2 : Compte LIÉ -->
    <div v-else-if="stats && stats.linked" class="linked-info">
      
      <!-- En-tête avec Avatar et Nom de la chaîne -->
      <div class="channel-header">
        <img v-if="stats.avatar" :src="stats.avatar" alt="Avatar Twitch" class="avatar" />
        <div>
          <h3>{{ stats.channel }}</h3>
          <span :class="['badge', stats.isLive ? 'live-badge' : 'offline-badge']">
            {{ stats.isLive ? '🔴 EN LIVE' : '⚪ HORS LIGNE' }}
          </span>
        </div>
      </div>

      <!-- Détails si en live -->
      <div v-if="stats.isLive" class="live-box">
        <div class="viewer-count">
          👥 <strong>{{ stats.viewerCount }}</strong> spectateurs en direct
        </div>
        <p v-if="stats.game">🎮 Jeu : <strong>{{ stats.game }}</strong></p>
        <p v-if="stats.title">📝 Titre : <em>{{ stats.title }}</em></p>
        
        <img v-if="stats.thumbnailUrl" :src="stats.thumbnailUrl" alt="Miniature du live" class="live-preview" />
      </div>

      <!-- Footer discret avec indicateur d'auto-actualisation -->
      <div class="actions">
        <span class="sync-text">⚡ Mis à jour auto toutes les 30s</span>
        <button class="btn-refresh" @click="loadStats(false)">Forcer l'actualisation</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title-bar h2 {
  margin: 0;
}

.pulse-indicator {
  width: 10px;
  height: 10px;
  background-color: #00ff66;
  border-radius: 50%;
  box-shadow: 0 0 8px #00ff66;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid #9146ff;
}

.badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-weight: bold;
  display: inline-block;
  margin-top: 0.25rem;
}

.live-badge {
  background: #ff005522;
  color: #ff3366;
  border: 1px solid #ff3366;
}

.offline-badge {
  background: #33333366;
  color: #888;
  border: 1px solid #555;
}

.live-box {
  background: #252525;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #ff3366;
  margin-bottom: 1rem;
}

.viewer-count {
  font-size: 1.1rem;
  color: #00ff88;
  margin-bottom: 0.5rem;
}

.live-preview {
  width: 100%;
  max-width: 320px;
  border-radius: 6px;
  margin-top: 0.75rem;
  border: 1px solid #444;
}

.btn-twitch {
  background: #9146ff;
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.sync-text {
  font-size: 0.8rem;
  color: #777;
}

.btn-refresh {
  background: #333;
  color: white;
  border: 1px solid #555;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-refresh:hover {
  background: #444;
}
</style>