<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { getTwitchHistoryApi, getTwitchMetricsApi } from '../api/twitch.js';
import Chart from 'chart.js/auto';

const history = ref([]);
const selectedSession = ref(null);
const loading = ref(true);
const chartCanvas = ref(null);
let chartInstance = null;

// Formater la date en français
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

// Calculer la durée du live
function formatDuration(start, end) {
  if (!end) return 'En cours';
  const diffMs = new Date(end) - new Date(start);
  const diffMins = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// Charger l'historique
async function loadHistory() {
  loading.value = true;
  try {
    history.value = await getTwitchHistoryApi();
    if (history.value.length > 0) {
      // Sélectionner le live le plus récent par défaut
      selectSession(history.value[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

// Sélectionner un stream et tracer sa courbe
async function selectSession(session) {
  selectedSession.value = session;
  try {
    const data = await getTwitchMetricsApi(session.id);
    await nextTick();
    renderChart(data.metrics);
  } catch (err) {
    console.error(err);
  }
}

// Dessiner le graphique Chart.js
function renderChart(metrics) {
  if (!chartCanvas.value) return;

  if (chartInstance) {
    chartInstance.destroy(); // Nettoyer l'ancien graphique
  }

  const labels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  const viewers = metrics.map(m => m.viewerCount);

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spectateurs en direct',
        data: viewers,
        borderColor: '#9146ff',
        backgroundColor: 'rgba(145, 70, 255, 0.15)',
        borderWidth: 2,
        fill: true,
        tension: 0.3, // Courbe adoucie
        pointRadius: 3,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: '#333' }, ticks: { color: '#888' } },
        y: { grid: { color: '#333' }, ticks: { color: '#888' }, beginAtZero: true }
      },
      plugins: {
        legend: { labels: { color: '#fff' } }
      }
    }
  });
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="card history-container">
    <h2>📈 Historique des Streams & Analytics</h2>

    <p v-if="loading">Chargement de l'historique...</p>
    <p v-else-if="history.length === 0" class="empty-text">Aucun stream enregistré pour le moment. Lance un live pour commencer l'analyse !</p>

    <div v-else class="analytics-layout">
      
      <!-- Liste des streams (colonne gauche) -->
      <div class="sessions-list">
        <h3>Derniers Lives</h3>
        <div 
          v-for="session in history" 
          :key="session.id" 
          :class="['session-item', { active: selectedSession && selectedSession.id === session.id }]"
          @click="selectSession(session)"
        >
          <div class="session-header">
            <strong>{{ session.gameName || 'Discussion' }}</strong>
            <span class="peak">👥 Pic : {{ session.peakViewers }}</span>
          </div>
          <p class="session-title">{{ session.title }}</p>
          <div class="session-footer">
            <span>📅 {{ formatDate(session.startedAt) }}</span>
            <span>⏱️ {{ formatDuration(session.startedAt, session.endedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Graphique d'audience (colonne droite) -->
      <div class="chart-box">
        <h3 v-if="selectedSession">Courbe d'audience : {{ selectedSession.title }}</h3>
        <div class="chart-wrapper">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.history-container {
  margin-top: 1.5rem;
  max-width: 100%;
}

.analytics-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
  margin-top: 1rem;
}

.sessions-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-item {
  background: #222;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #333;
  cursor: pointer;
  transition: all 0.2s;
}

.session-item:hover {
  background: #2a2a2a;
  border-color: #555;
}

.session-item.active {
  border-color: #9146ff;
  background: #2f2540;
}

.session-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.peak {
  color: #00ff88;
  font-weight: bold;
}

.session-title {
  font-size: 0.85rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0.25rem 0;
}

.session-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #777;
}

.chart-box {
  background: #181818;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.chart-wrapper {
  position: relative;
  height: 320px;
  width: 100%;
}

.empty-text {
  color: #777;
  font-style: italic;
}
</style>