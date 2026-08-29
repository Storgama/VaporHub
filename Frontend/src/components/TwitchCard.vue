<script setup>
    import { ref, onMounted } from 'vue';
    import { getTwitchStatsApi } from '../api/twitch.js';

    const stats = ref(null);
    const loading = ref(true);
    const error = ref('');

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

    onMounted(() => {
        loadStats();
    });
</script>

<template>
  <div class="card">
    <h2>Statistiques Twitch</h2>

    <p v-if="loading">Chargement des données...</p>
    <p v-else-if="error" class="message error">{{ error }}</p>

    <div v-else-if="stats">
      <p>Chaîne : <strong>{{ stats.channel }}</strong></p>
      <p>Statut : 
        <span :class="stats.isLive ? 'live' : 'offline'">
          {{ stats.isLive ? `🔴 En Live (${stats.viewerCount} viewers)` : '⚪ Hors ligne' }}
        </span>
      </p>
      <button @click="loadStats">Actualiser</button>
    </div>
  </div>
</template>