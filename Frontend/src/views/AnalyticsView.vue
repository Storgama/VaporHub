<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { getTwitchBreakdownApi, type TwitchBreakdownResponse, type TimelinePoint } from '../api/twitch.js';
import Chart from 'chart.js/auto';
import { 
  BarChart3, 
  Flame, 
  Eye, 
  Trophy, 
  Users, 
  RefreshCw, 
  TrendingUp, 
  Activity
} from 'lucide-vue-next';

export type PeriodType = 'weekly' | 'monthly' | 'yearly' | 'all';

interface PeriodOption {
  id: PeriodType;
  label: string;
  desc: string;
}

const selectedPeriod = ref<PeriodType>('all');
const breakdown = ref<TwitchBreakdownResponse | null>(null);
const loading = ref<boolean>(true);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const periods: PeriodOption[] = [
  { id: 'weekly', label: 'Hebdo (7j)', desc: 'des 7 derniers jours' },
  { id: 'monthly', label: 'Mensuel (30j)', desc: 'des 30 derniers jours' },
  { id: 'yearly', label: 'Annuel (1 an)', desc: 'de la dernière année' },
  { id: 'all', label: 'Tout l\'historique', desc: 'sur l\'ensemble de vos streams' }
];

const currentPeriodObj = computed<PeriodOption>(() => {
  return periods.find(p => p.id === selectedPeriod.value) || periods[3];
});

async function loadBreakdown(period: PeriodType = selectedPeriod.value): Promise<void> {
  selectedPeriod.value = period;
  loading.value = true;
  try {
    breakdown.value = await getTwitchBreakdownApi(period);
  } catch (err: unknown) {
    console.error(err);
  } finally {
    loading.value = false;
    await nextTick();
    if (breakdown.value?.evolutionTimeline && breakdown.value.evolutionTimeline.length > 0) {
      renderEvolutionChart(breakdown.value.evolutionTimeline);
    }
  }
}

function renderEvolutionChart(timeline: TimelinePoint[]): void {
  if (!chartCanvas.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  let gradient: CanvasGradient | string = 'rgba(145, 70, 255, 0.2)';
  if (ctx && typeof ctx.createLinearGradient === 'function') {
    const linearGrad = ctx.createLinearGradient(0, 0, 0, 320);
    linearGrad.addColorStop(0, 'rgba(145, 70, 255, 0.35)');
    linearGrad.addColorStop(1, 'rgba(145, 70, 255, 0.0)');
    gradient = linearGrad;
  }

  const labels = timeline.map(t => t.label);
  const watchTimes = timeline.map(t => t.watchTime);
  const avgViewers = timeline.map(t => t.avgViewers);

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Heures-Vues (Watch Time)',
          data: watchTimes,
          borderColor: '#9146ff',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#9146ff',
          pointRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Moyenne de Viewers',
          data: avgViewers,
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          fill: false,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        x: {
          grid: { color: 'rgba(39, 39, 42, 0.5)' },
          ticks: { color: '#71717a', font: { size: 11 } }
        },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(39, 39, 42, 0.5)' },
          ticks: { color: '#9146ff', font: { size: 11 } },
          title: { display: true, text: 'Heures-Vues', color: '#9146ff', font: { size: 11 } }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#10b981', font: { size: 11 } },
          title: { display: true, text: 'Moyenne Viewers', color: '#10b981', font: { size: 11 } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#a1a1aa', boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#18181b',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          borderColor: '#27272a',
          borderWidth: 1,
          padding: 10
        }
      }
    }
  });
}

onMounted(() => {
  loadBreakdown();
});
</script>

<template>
  <div class="space-y-6">
    
    <!-- En-tête avec Sélecteur de Période Dynamique -->
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
          <BarChart3 class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-zinc-100">Statistiques & Évolution</h1>
          <p class="text-xs text-zinc-400">Analyse approfondie de votre régularité, rétention et progression {{ currentPeriodObj.desc }}.</p>
        </div>
      </div>

      <!-- Sélecteur de période -->
      <div class="flex items-center gap-1.5 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800 self-start md:self-auto">
        <button
          v-for="p in periods"
          :key="p.id"
          @click="loadBreakdown(p.id)"
          :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                   selectedPeriod === p.id 
                     ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                     : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900']"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- État Chargement Dynamique -->
    <div v-if="loading" class="py-20 text-center text-zinc-500 text-sm flex items-center justify-center gap-2 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
      <RefreshCw class="w-5 h-5 animate-spin text-purple-400" />
      <span>Calcul des statistiques {{ currentPeriodObj.desc }} en cours...</span>
    </div>

    <template v-else-if="breakdown">
      
      <!-- Ligne 1 : 4 KPIs Clés -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
          <div class="flex items-center justify-between text-zinc-400 text-xs mb-1.5 font-medium">
            <span>Watch Time Total</span>
            <Eye class="w-4 h-4 text-purple-400" />
          </div>
          <div class="text-2xl font-bold text-zinc-100">{{ breakdown.totalWatchTimeHours }} <span class="text-xs font-normal text-zinc-500">h</span></div>
          <p class="text-[11px] text-purple-400/80 mt-1">Sur {{ breakdown.totalStreamHours }}h de live</p>
        </div>

        <div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
          <div class="flex items-center justify-between text-zinc-400 text-xs mb-1.5 font-medium">
            <span>Rétention Globale</span>
            <Flame class="w-4 h-4 text-emerald-400" />
          </div>
          <div class="text-2xl font-bold text-emerald-400">{{ breakdown.overallRetentionRate }}%</div>
          <p class="text-[11px] text-zinc-500 mt-1">Fidélité moyenne</p>
        </div>

        <div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
          <div class="flex items-center justify-between text-zinc-400 text-xs mb-1.5 font-medium">
            <span>Audience Moyenne</span>
            <Users class="w-4 h-4 text-blue-400" />
          </div>
          <div class="text-2xl font-bold text-zinc-100">{{ breakdown.overallAverageViewers }}</div>
          <p class="text-[11px] text-zinc-500 mt-1">Sur {{ breakdown.totalStreams }} streams</p>
        </div>

        <div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
          <div class="flex items-center justify-between text-zinc-400 text-xs mb-1.5 font-medium">
            <span>Record Absolu</span>
            <Trophy class="w-4 h-4 text-amber-400" />
          </div>
          <div class="text-2xl font-bold text-amber-400">{{ breakdown.highestPeakViewers }}</div>
          <p class="text-[11px] text-zinc-500 mt-1">Pic maximal atteint</p>
        </div>

      </div>

      <!-- Ligne 2 : Fréquence de Stream (4 colonnes) + Grand Graphique d'Évolution (8 colonnes) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Colonne Gauche : Fréquence & Régularité (4 cols) -->
        <div class="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-zinc-100 font-bold mb-4 pb-3 border-b border-zinc-800">
              <Activity class="w-5 h-5 text-purple-400" />
              <h2>Fréquence & Régularité</h2>
            </div>

            <!-- Cadence hebdomadaire -->
            <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 mb-5">
              <span class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Cadence moyenne</span>
              <div class="text-xl font-extrabold text-purple-400 mt-1 flex items-baseline gap-1.5">
                <span>{{ breakdown.streamsPerWeek }} streams / sem</span>
              </div>
              <p class="text-xs text-zinc-400 mt-1">Régularité optimale pour fidéliser l'audience.</p>
            </div>

            <!-- Jours de prédilection -->
            <h3 class="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-3">Jours de stream préférés</h3>
            <div class="space-y-2.5">
              <div 
                v-for="d in breakdown.topDays" 
                :key="d.day" 
                class="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3"
              >
                <div class="flex justify-between items-center text-xs font-semibold mb-1.5">
                  <span class="text-zinc-200">{{ d.day }}</span>
                  <span class="text-purple-400">{{ d.count }} lives ({{ d.percentage }}%)</span>
                </div>
                <div class="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-purple-500 h-full rounded-full" :style="{ width: d.percentage + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne Droite : Grand Graphique d'Évolution (8 cols) -->
        <div class="lg:col-span-8 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
            <div>
              <span class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Progression Chronologique</span>
              <h2 class="text-base font-bold text-zinc-100 mt-0.5">Évolution du Watch Time & Audience</h2>
            </div>
            <span class="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
              <TrendingUp class="w-3.5 h-3.5" />
              Vue Historique
            </span>
          </div>

          <!-- Canvas Chart.js -->
          <div class="relative h-[340px] w-full">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>

      </div>

    </template>
  </div>
</template>