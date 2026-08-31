<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { getTwitchHistoryApi, getTwitchMetricsApi } from '../api/twitch.js';
import Chart from 'chart.js/auto';
import { TrendingUp, Users, Calendar, Clock, Gamepad2, Layers, RefreshCw } from 'lucide-vue-next';

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

// Dessiner le graphique Chart.js avec dégradé
function renderChart(metrics) {
  if (!chartCanvas.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  
  // Création d'un dégradé lumineux sous la courbe
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(145, 70, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(145, 70, 255, 0.0)');

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
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#9146ff',
        pointBorderColor: '#09090b',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        x: {
          grid: { color: 'rgba(39, 39, 42, 0.6)' },
          ticks: { color: '#71717a', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(39, 39, 42, 0.6)' },
          ticks: { color: '#71717a', font: { size: 11 } },
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#18181b',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          borderColor: '#27272a',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true
        }
      }
    }
  });
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm mt-8">
    
    <!-- En-tête de la section Analytics -->
    <div class="flex items-center gap-2.5 mb-6 pb-4 border-b border-zinc-800/80">
      <div class="p-2 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
        <TrendingUp class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-lg font-bold text-zinc-100">Historique des Streams & Analytics</h2>
        <p class="text-xs text-zinc-400">Suivez l'évolution de vos audiences et vos records de viewers.</p>
      </div>
    </div>

    <!-- État Chargement -->
    <div v-if="loading" class="py-16 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
      <RefreshCw class="w-5 h-5 animate-spin text-purple-400" />
      <span>Chargement de l'historique...</span>
    </div>

    <!-- État Aucun stream -->
    <div v-else-if="history.length === 0" class="py-12 text-center text-zinc-500 text-sm">
      <Layers class="w-10 h-10 mx-auto text-zinc-600 mb-3" />
      <p>Aucun stream enregistré pour le moment.</p>
      <p class="text-xs text-zinc-600 mt-1">Lancez un live sur Twitch pour commencer l'enregistrement automatique !</p>
    </div>

    <!-- Grille Analytics (2 colonnes) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Colonne Gauche : Liste des sessions (4 colonnes) -->
      <div class="lg:col-span-4 space-y-3 max-h-[440px] overflow-y-auto pr-1">
        <div 
          v-for="session in history" 
          :key="session.id" 
          :class="['p-4 rounded-xl border transition duration-200 cursor-pointer',
                   selectedSession && selectedSession.id === session.id 
                     ? 'bg-purple-950/30 border-purple-500 shadow-lg shadow-purple-950/40' 
                     : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-950']"
          @click="selectSession(session)"
        >
          <!-- Ligne 1 : Jeu + Pic de viewers -->
          <div class="flex justify-between items-center mb-1.5">
            <span class="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Gamepad2 class="w-3.5 h-3.5 text-purple-400" />
              {{ session.gameName || 'Discussion' }}
            </span>
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Users class="w-3 h-3" />
              {{ session.peakViewers }}
            </span>
          </div>

          <!-- Ligne 2 : Titre du live -->
          <p class="text-sm font-medium text-zinc-300 truncate mb-2.5" :title="session.title">
            {{ session.title }}
          </p>

          <!-- Ligne 3 : Date + Durée -->
          <div class="flex justify-between items-center text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              {{ formatDate(session.startedAt) }}
            </span>
            <span class="flex items-center gap-1 text-zinc-400">
              <Clock class="w-3 h-3" />
              {{ formatDuration(session.startedAt, session.endedAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Colonne Droite : Graphique d'audience (8 colonnes) -->
      <div class="lg:col-span-8 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
        
        <!-- En-tête du graphique avec titre de la session sélectionnée -->
        <div v-if="selectedSession" class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Courbe d'audience</span>
            <h3 class="text-base font-bold text-zinc-100 mt-0.5">{{ selectedSession.title }}</h3>
          </div>
          <span class="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700">
            {{ selectedSession.gameName }}
          </span>
        </div>

        <!-- Canvas Chart.js -->
        <div class="relative h-[320px] w-full">
          <canvas ref="chartCanvas"></canvas>
        </div>

      </div>

    </div>

  </div>
</template>