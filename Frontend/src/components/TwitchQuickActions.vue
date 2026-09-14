<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { 
  triggerCommercialApi, 
  startRaidApi, 
  cancelRaidApi, 
  snoozeAdApi 
} from '../api/twitch.js';
import { 
  Tv, 
  Zap, 
  X, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    isLive?: boolean;
    isMock?: boolean;
  }>(),
  {
    isLive: false,
    isMock: false
  }
);

const emit = defineEmits<{
  (e: 'action-completed', payload: { type: string; data: unknown }): void;
}>();

// --- État Pubs ---
const selectedLength = ref<number>(60);
const availableLengths = [30, 60, 90, 120, 150, 180];
const adCooldownSec = ref<number>(0);
const adLoading = ref<boolean>(false);
let adCooldownTimer: ReturnType<typeof setInterval> | null = null;

// --- État Raid ---
const targetLogin = ref<string>('');
const raidLoading = ref<boolean>(false);
const activeRaidTarget = ref<string | null>(null);

// --- État Snooze ---
const snoozeLoading = ref<boolean>(false);

// --- Feedback ---
const feedback = ref<{ text: string; isError: boolean } | null>(null);

function showFeedback(text: string, isError: boolean = false): void {
  feedback.value = { text, isError };
  setTimeout(() => {
    if (feedback.value?.text === text) {
      feedback.value = null;
    }
  }, 6000);
}

// 1. Déclencher une pub
async function handleTriggerCommercial(): Promise<void> {
  if (adCooldownSec.value > 0 || adLoading.value) return;

  adLoading.value = true;
  feedback.value = null;

  try {
    const res = await triggerCommercialApi(selectedLength.value, props.isMock);
    showFeedback(res.message || `Coupure de ${res.length}s démarrée avec succès`);
    emit('action-completed', { type: 'commercial', data: res });

    if (res.retryAfter && res.retryAfter > 0) {
      startAdCooldown(res.retryAfter);
    }
  } catch (err: unknown) {
    showFeedback(err instanceof Error ? err.message : 'Échec de la coupure publicitaire', true);
  } finally {
    adLoading.value = false;
  }
}

function startAdCooldown(seconds: number): void {
  if (adCooldownTimer) clearInterval(adCooldownTimer);
  adCooldownSec.value = seconds;
  adCooldownTimer = setInterval(() => {
    adCooldownSec.value -= 1;
    if (adCooldownSec.value <= 0) {
      if (adCooldownTimer) clearInterval(adCooldownTimer);
      adCooldownTimer = null;
      adCooldownSec.value = 0;
    }
  }, 1000);
}

// 2. Lancer un Raid
async function handleStartRaid(): Promise<void> {
  const cleanLogin = targetLogin.value.trim().toLowerCase();
  if (!cleanLogin || raidLoading.value) return;

  raidLoading.value = true;
  feedback.value = null;

  try {
    const res = await startRaidApi(cleanLogin, props.isMock);
    activeRaidTarget.value = res.targetLogin;
    showFeedback(`Raid vers @${res.targetLogin} lancé avec succès !`);
    emit('action-completed', { type: 'raid', data: res });
    targetLogin.value = '';
  } catch (err: unknown) {
    showFeedback(err instanceof Error ? err.message : 'Impossible de lancer le raid', true);
  } finally {
    raidLoading.value = false;
  }
}

// 3. Annuler un Raid
async function handleCancelRaid(): Promise<void> {
  if (!activeRaidTarget.value || raidLoading.value) return;

  raidLoading.value = true;
  feedback.value = null;

  try {
    await cancelRaidApi(props.isMock);
    showFeedback(`Raid vers @${activeRaidTarget.value} annulé.`);
    emit('action-completed', { type: 'cancel-raid', data: { canceled: true } });
    activeRaidTarget.value = null;
  } catch (err: unknown) {
    showFeedback(err instanceof Error ? err.message : 'Impossible d\'annuler le raid', true);
  } finally {
    raidLoading.value = false;
  }
}

// 4. Reporter la Pub (Snooze)
async function handleSnoozeAd(): Promise<void> {
  if (snoozeLoading.value) return;

  snoozeLoading.value = true;
  feedback.value = null;

  try {
    const res = await snoozeAdApi(props.isMock);
    showFeedback('Prochaine pub reportée de 5 minutes avec succès !');
    emit('action-completed', { type: 'snooze', data: res });
  } catch (err: unknown) {
    showFeedback(err instanceof Error ? err.message : 'Impossible de reporter la pub', true);
  } finally {
    snoozeLoading.value = false;
  }
}

onUnmounted(() => {
  if (adCooldownTimer) clearInterval(adCooldownTimer);
});
</script>

<template>
  <div class="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 shadow-inner space-y-4">
    <!-- En-tête du panneau -->
    <div class="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
      <div class="flex items-center gap-2">
        <SlidersHorizontal class="w-4 h-4 text-purple-400" />
        <span class="text-xs font-bold text-zinc-100 uppercase tracking-wider">Actions Rapides Live</span>
      </div>
      <span v-if="isMock" class="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
        SIMULATION
      </span>
    </div>

    <!-- Bannière de retour feedback -->
    <div 
      v-if="feedback" 
      :class="['p-2.5 rounded-lg text-xs flex items-center gap-2 border transition duration-200',
               feedback.isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400']"
    >
      <AlertCircle v-if="feedback.isError" class="w-4 h-4 shrink-0" />
      <CheckCircle2 v-else class="w-4 h-4 shrink-0" />
      <span class="flex-1 truncate">{{ feedback.text }}</span>
      <button @click="feedback = null" class="text-zinc-500 hover:text-zinc-300 cursor-pointer">
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Grille des 2 actions principales : Pub & Raid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      
      <!-- 1. Coupure Publicitaire -->
      <div class="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Tv class="w-3.5 h-3.5 text-purple-400" />
              Coupure Pub
            </span>
            <!-- Sélecteur de durée -->
            <select 
              v-model="selectedLength"
              :disabled="adLoading || adCooldownSec > 0"
              class="bg-zinc-950 border border-zinc-700/80 rounded-md text-[11px] font-semibold text-zinc-300 px-2 py-0.5 focus:outline-none focus:border-purple-500 cursor-pointer disabled:opacity-50"
            >
              <option v-for="len in availableLengths" :key="len" :value="len">
                {{ len }}s
              </option>
            </select>
          </div>
          <p class="text-[11px] text-zinc-500 leading-tight">
            Lance une coupure immédiate et suspend les pré-rolls pour les spectateurs entrants.
          </p>
        </div>

        <!-- Boutons Pub & Snooze -->
        <div class="flex gap-2 pt-1">
          <button
            @click="handleTriggerCommercial"
            :disabled="adLoading || adCooldownSec > 0"
            class="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-xs font-bold py-2 px-3 rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw v-if="adLoading" class="w-3.5 h-3.5 animate-spin" />
            <Tv v-else class="w-3.5 h-3.5" />
            <span v-if="adCooldownSec > 0">Attente ({{ adCooldownSec }}s)</span>
            <span v-else>Lancer ({{ selectedLength }}s)</span>
          </button>

          <button
            @click="handleSnoozeAd"
            :disabled="snoozeLoading"
            title="Reporter la prochaine pub de 5 minutes"
            class="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-2 rounded-lg border border-zinc-700 transition flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <Clock :class="['w-3.5 h-3.5', { 'animate-spin': snoozeLoading }]" />
          </button>
        </div>
      </div>

      <!-- 2. Lancer un Raid -->
      <div class="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Zap class="w-3.5 h-3.5 text-amber-400" />
              Raid de Fin de Live
            </span>
            <span v-if="activeRaidTarget" class="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
              Vers @{{ activeRaidTarget }}
            </span>
          </div>

          <!-- Si raid actif : affichage bouton annuler -->
          <div v-if="activeRaidTarget" class="pt-1">
            <p class="text-[11px] text-zinc-400 mb-2">
              Raid initié vers <strong>@{{ activeRaidTarget }}</strong>. Les spectateurs rejoindront la chaîne à la fin du compte à rebours.
            </p>
            <button
              @click="handleCancelRaid"
              :disabled="raidLoading"
              class="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <X class="w-3.5 h-3.5" />
              <span>Annuler le Raid</span>
            </button>
          </div>

          <!-- Si aucun raid : champ saisie pseudo -->
          <div v-else>
            <p class="text-[11px] text-zinc-500 leading-tight mb-2">
              Envoyez toute votre communauté vers une chaîne amie dès la fin de votre session.
            </p>
            <div class="flex gap-2">
              <input
                v-model="targetLogin"
                @keyup.enter="handleStartRaid"
                type="text"
                placeholder="Pseudo chaîne cible..."
                class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <button
                @click="handleStartRaid"
                :disabled="raidLoading || !targetLogin.trim()"
                class="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-xs font-bold px-3 py-1.5 rounded-lg shadow transition flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw v-if="raidLoading" class="w-3.5 h-3.5 animate-spin" />
                <Zap v-else class="w-3.5 h-3.5" />
                <span>Raid</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

