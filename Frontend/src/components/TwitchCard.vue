<script setup>
  import { ref, onMounted } from 'vue';
  import { getTwitchStatsApi, getTwitchAuthUrlApi } from '../api/twitch.js';

  const stats = ref(null);
  const loading = ref(true);
  const error = ref('');

  // Charger l'état du stream
  async function loadStats() {
    loading.value = true;
    error.value = '';
    try {
      stats.value = await getTwitchStatsApi();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  // Redirection vers Twitch pour lier le compte
  async function handleLinkTwitch() {
    try {
      const url = await getTwitchAuthUrlApi();
      window.location.href = url; // Redirige le navigateur vers Twitch
    } catch (err) {
      error.value = err.message;
    }
  }

  onMounted(() => {
    // Nettoyer l'URL si on revient de la redirection Twitch (?twitch_linked=true)
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('twitch_linked')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadStats();
  });
</script>

<template>
  <div class="card twitch-card">
    <h2>🎮 Twitch Live Tracker</h2>

    <!-- État Chargement -->
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
      <p>Chaîne : <strong>{{ stats.channel }}</strong></p>

      <p>Statut : 
        <span :class="stats.isLive ? 'live' : 'offline'">
          {{ stats.isLive ? `🔴 En Live (${stats.viewerCount} spectateurs)` : '⚪ Hors ligne' }}
        </span>
      </p>

      <!-- Infos supplémentaires si en live -->
      <div v-if="stats.isLive" class="stream-details">
        <p v-if="stats.game">🎮 Jeu : <strong>{{ stats.game }}</strong></p>
        <p v-if="stats.title">📝 Titre : <em>{{ stats.title }}</em></p>
      </div>

      <div class="actions">
        <button @click="loadStats">Actualiser</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .btn-twitch {
    background: #9146ff;
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .btn-twitch:hover {
    background: #772ce8;
  }

  .stream-details {
    background: #2a2a2a;
    padding: 0.75rem;
    border-radius: 6px;
    margin: 1rem 0;
  }

  .actions {
    margin-top: 1rem;
  }
</style>