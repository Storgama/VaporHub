<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  getDiscordAlertConfigsApi,
  createDiscordAlertConfigApi,
  updateDiscordAlertConfigApi,
  deleteDiscordAlertConfigApi,
  getDiscordBotStatusApi,
  type DiscordAlertConfigData
} from '../api/discord';
import {
  Bot,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Hash,
  Users,
  MessageSquare,
  Tag
} from 'lucide-vue-next';

interface EditableAlertConfig extends DiscordAlertConfigData {
  tempId?: string;
  isSaving?: boolean;
  saveSuccess?: boolean;
  errorMessage?: string;
}

const loading = ref<boolean>(true);
const globalError = ref<string>('');
const configs = ref<EditableAlertConfig[]>([]);
const selectedIndex = ref<number>(0);
const botStatus = ref<{ isConnected: boolean; botUsername?: string | null }>({ isConnected: false });

async function loadBotStatus() {
  try {
    const res = await getDiscordBotStatusApi();
    botStatus.value = {
      isConnected: res.isConnected,
      botUsername: res.botUsername
    };
  } catch {
    botStatus.value = { isConnected: false };
  }
}

// Notification sélectionnée pour la prévisualisation en direct
const activeConfig = computed<EditableAlertConfig | null>(() => {
  if (configs.value.length === 0) return null;
  const idx = Math.min(selectedIndex.value, configs.value.length - 1);
  return configs.value[Math.max(0, idx)] || null;
});

// Prévisualisation calculée du message Discord
const previewMessage = computed(() => {
  if (!activeConfig.value) return 'Aucune alerte configurée.';
  const template = activeConfig.value.customMessage || 'Hey {role}, {streamer} vient de lancer un live sur **{game}** !';
  return template
    .replace(/{role}/g, activeConfig.value.roleMention || '@everyone')
    .replace(/{streamer}/g, 'MonStreamer')
    .replace(/{game}/g, 'Valorant')
    .replace(/{title}/g, '[FR] Road to Radiant ! | Drops ON')
    .replace(/{url}/g, 'https://twitch.tv/monstreamer')
    .replace(/{viewers}/g, '150');
});

// Tags d'insertion rapide
const availableTags = [
  { tag: '{streamer}', desc: 'Pseudo du streamer' },
  { tag: '{game}', desc: 'Jeu / Catégorie' },
  { tag: '{title}', desc: 'Titre du stream' },
  { tag: '{role}', desc: 'Mention de rôle' },
  { tag: '{url}', desc: 'Lien du stream' }
];

function insertTag(item: EditableAlertConfig, tag: string) {
  const current = item.customMessage || '';
  item.customMessage = `${current} ${tag} `.trim();
}

async function loadConfigs() {
  loading.value = true;
  globalError.value = '';
  try {
    const list = await getDiscordAlertConfigsApi();
    configs.value = list.map(c => ({
      ...c,
      isSaving: false,
      saveSuccess: false,
      errorMessage: ''
    }));
  } catch (err) {
    globalError.value = err instanceof Error ? err.message : 'Erreur de chargement des alertes';
  } finally {
    loading.value = false;
  }
}

function addNewAlert() {
  const newIndex = configs.value.length;
  const newAlert: EditableAlertConfig = {
    tempId: `new-${Date.now()}`,
    name: `Alerte #${newIndex + 1}`,
    guildId: '',
    channelId: '',
    roleMention: '@everyone',
    customMessage: 'Hey {role}, {streamer} vient de lancer un live sur **{game}** !',
    isEnabled: true,
    isSaving: false,
    saveSuccess: false,
    errorMessage: ''
  };
  configs.value.push(newAlert);
  selectedIndex.value = newIndex;
}

async function saveAlert(item: EditableAlertConfig) {
  item.errorMessage = '';
  item.saveSuccess = false;

  const guild = (item.guildId || '').trim();
  const channel = (item.channelId || '').trim();

  if (!guild || !/^\d{17,20}$/.test(guild)) {
    item.errorMessage = 'L\'ID du serveur Discord doit comporter entre 17 et 20 chiffres.';
    return;
  }

  if (!channel || !/^\d{17,20}$/.test(channel)) {
    item.errorMessage = 'L\'ID du salon Discord doit comporter entre 17 et 20 chiffres.';
    return;
  }

  item.isSaving = true;
  try {
    const payload = {
      name: (item.name || 'Alerte de stream').trim(),
      guildId: guild,
      channelId: channel,
      roleMention: item.roleMention?.trim() || null,
      customMessage: item.customMessage?.trim() || null,
      isEnabled: item.isEnabled
    };

    if (item.id) {
      const updated = await updateDiscordAlertConfigApi(item.id, payload);
      Object.assign(item, updated);
    } else {
      const created = await createDiscordAlertConfigApi(payload);
      Object.assign(item, created);
    }

    item.saveSuccess = true;
    setTimeout(() => {
      item.saveSuccess = false;
    }, 4000);
  } catch (err) {
    item.errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
  } finally {
    item.isSaving = false;
  }
}

async function removeAlert(index: number) {
  const item = configs.value[index];
  if (!item) return;

  if (item.id) {
    try {
      await deleteDiscordAlertConfigApi(item.id);
    } catch (err) {
      item.errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      return;
    }
  }

  configs.value.splice(index, 1);
  if (selectedIndex.value >= configs.value.length) {
    selectedIndex.value = Math.max(0, configs.value.length - 1);
  }
}

onMounted(() => {
  loadConfigs();
  loadBotStatus();
});
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <!-- En-tête de la page -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
          <Bot class="w-8 h-8" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-wide text-zinc-100 flex items-center gap-2">
            Gestion du Bot Discord
            <span
              data-testid="discord-status"
              :class="[
                'text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize transition',
                botStatus.isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
              ]"
            >
              {{ botStatus.isConnected ? (botStatus.botUsername ? `connecté (${botStatus.botUsername})` : 'connecté') : 'Non connecté' }}
            </span>
          </h1>
          <p class="text-sm text-zinc-400 mt-0.5">
            Automatisation des alertes de stream et synchronisation de communauté
          </p>
        </div>
      </div>

      <!-- Bouton Ajouter une notification -->
      <div>
        <button
          data-testid="btn-add-notification"
          type="button"
          @click="addNewAlert"
          class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/50"
        >
          <Plus class="w-4 h-4" />
          <span>Ajouter une notification</span>
        </button>
      </div>
    </header>

    <!-- Erreur globale si chargement KO -->
    <div v-if="globalError" class="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
      <AlertCircle class="w-4 h-4 shrink-0" />
      <span>{{ globalError }}</span>
    </div>

    <!-- Grille Formulaires et Prévisualisation Discord -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Colonne Alertes (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        <!-- Aucune alerte configurée -->
        <div v-if="!loading && configs.length === 0" class="bg-zinc-900/30 rounded-2xl border border-zinc-800/80 p-12 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
            <Bell class="w-6 h-6" />
          </div>
          <h2 class="text-base font-bold text-zinc-200">Aucune alerte configurée</h2>
          <p class="text-xs text-zinc-400 max-w-md mx-auto">
            Créez votre première notification pour annoncer automatiquement vos streams sur vos serveurs Discord.
          </p>
          <button
            type="button"
            @click="addNewAlert"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>Ajouter une notification</span>
          </button>
        </div>

        <!-- Liste des cartes d'alerte -->
        <div
          v-for="(item, idx) in configs"
          :key="item.id || item.tempId || idx"
          :class="[
            'bg-zinc-900/40 rounded-2xl border p-6 space-y-5 transition cursor-pointer',
            selectedIndex === idx ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-zinc-800/80 hover:border-zinc-700'
          ]"
          @click="selectedIndex = idx"
        >
          <!-- En-tête de la carte d'alerte -->
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3 gap-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <Bell class="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                data-testid="input-alert-name"
                v-model="item.name"
                type="text"
                placeholder="Nom de l'alerte (ex: Alerte Principale)"
                class="bg-transparent text-sm font-bold text-zinc-100 focus:outline-none border-b border-transparent focus:border-indigo-500 transition px-1 py-0.5 w-full"
                @click.stop
              />
            </div>

            <!-- Contrôles rapides (Switch ON/OFF + Corbeille) -->
            <div class="flex items-center gap-3 shrink-0" @click.stop>
              <button
                data-testid="toggle-alerts-enabled"
                type="button"
                @click="item.isEnabled = !item.isEnabled"
                :title="item.isEnabled ? 'Alerte active' : 'Alerte désactivée'"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  item.isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                ]"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    item.isEnabled ? 'translate-x-4' : 'translate-x-0'
                  ]"
                />
              </button>

              <button
                data-testid="btn-delete-alert"
                type="button"
                @click="removeAlert(idx)"
                class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                title="Supprimer cette alerte"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Alertes locales erreur / succès -->
          <div v-if="item.errorMessage" data-testid="discord-error-alert" class="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ item.errorMessage }}</span>
          </div>

          <div v-if="item.saveSuccess" data-testid="discord-success-alert" class="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl">
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            <span>Alerte enregistrée avec succès !</span>
          </div>

          <!-- Formulaire de la carte -->
          <div class="space-y-4" @click.stop>
            <!-- IDs Discord -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Users class="w-3.5 h-3.5 text-zinc-400" />
                  ID Serveur (Guild ID)
                </label>
                <input
                  data-testid="input-guild-id"
                  v-model="item.guildId"
                  type="text"
                  placeholder="Ex: 123456789012345678"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Hash class="w-3.5 h-3.5 text-zinc-400" />
                  ID Salon (Channel ID)
                </label>
                <input
                  data-testid="input-channel-id"
                  v-model="item.channelId"
                  type="text"
                  placeholder="Ex: 987654321098765432"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <!-- Mention de rôle -->
            <div>
              <label class="block text-xs font-semibold text-zinc-300 mb-1">
                Rôle à mentionner
              </label>
              <input
                data-testid="input-role-mention"
                v-model="item.roleMention"
                type="text"
                placeholder="@everyone, @here ou <@&ID_ROLE>"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <!-- Message personnalisé (texte long) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare class="w-3.5 h-3.5 text-zinc-400" />
                  Message texte d'annonce
                </label>
                <span class="text-[10px] text-zinc-500 font-mono">
                  {{ (item.customMessage || '').length }} / 2000 car.
                </span>
              </div>

              <textarea
                data-testid="input-custom-message"
                v-model="item.customMessage"
                rows="3"
                maxlength="2000"
                placeholder="Ex: Hey {role}, {streamer} vient de lancer un live sur **{game}** !"
                class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition resize-y font-sans leading-relaxed"
              />

              <!-- Tags rapides -->
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] uppercase font-bold text-zinc-500 mr-1 flex items-center gap-1">
                  <Tag class="w-3 h-3" /> Tags :
                </span>
                <button
                  v-for="t in availableTags"
                  :key="t.tag"
                  type="button"
                  @click="insertTag(item, t.tag)"
                  class="px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-indigo-600/30 border border-zinc-700/60 hover:border-indigo-500/50 text-zinc-300 hover:text-indigo-200 text-[10px] font-mono transition cursor-pointer"
                  :title="t.desc"
                >
                  {{ t.tag }}
                </button>
              </div>
            </div>

            <!-- Bouton Enregistrer de la carte -->
            <div class="pt-2 flex justify-end">
              <button
                data-testid="btn-save-discord-config"
                type="button"
                :disabled="item.isSaving"
                @click="saveAlert(item)"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-950/40"
              >
                <Save class="w-3.5 h-3.5" />
                <span>{{ item.isSaving ? 'Enregistrement...' : 'Enregistrer' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Colonne Prévisualisation Discord (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <div class="flex items-center justify-between text-zinc-300 font-bold text-sm">
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-purple-400" />
            <span>Prévisualisation Discord</span>
          </div>
          <span v-if="activeConfig" class="text-xs font-normal text-indigo-400">
            Aperçu : {{ activeConfig.name || 'Alerte' }}
          </span>
        </div>

        <!-- Simulation Message Discord -->
        <div class="bg-[#313338] rounded-xl p-4 border border-zinc-800 shadow-xl space-y-2 text-[#dbdee1] font-sans">
          <!-- Auteur du bot -->
          <div class="flex items-center gap-2 text-xs">
            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
              VB
            </div>
            <span class="font-bold text-white">VaporHub Bot</span>
            <span class="bg-[#5865F2] text-[10px] font-bold text-white px-1 py-0.2 rounded">BOT</span>
            <span class="text-[10px] text-[#949ba4]">Aujourd'hui à 20:00</span>
          </div>

          <!-- Texte du message -->
          <p class="text-xs leading-relaxed text-[#dbdee1] break-words whitespace-pre-line pl-10">
            {{ previewMessage }}
          </p>

          <!-- Embed Twitch (SANS Spectateurs, uniquement Jeu / Catégorie) -->
          <div class="ml-10 border-l-4 border-[#9146FF] bg-[#2b2d31] rounded-r-lg p-3 space-y-2 text-xs">
            <div class="flex items-center gap-2">
              <img src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" class="w-4 h-4 rounded-full" />
              <span class="font-bold text-white text-[11px]">MonStreamer est en direct !</span>
            </div>

            <a href="#" class="font-bold text-[#00a8fc] hover:underline block text-xs">
              [FR] Road to Radiant ! | Drops ON
            </a>

            <!-- Champ Jeu uniquement (pas de spectateurs) -->
            <div class="pt-1">
              <span class="text-[#949ba4] block text-[10px] font-semibold">🎮 Jeu / Catégorie</span>
              <span class="text-white font-medium">Valorant</span>
            </div>

            <!-- Miniature -->
            <div class="pt-1">
              <div class="w-full h-36 rounded bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500 text-xs">
                Miniature Twitch (1280x720)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
