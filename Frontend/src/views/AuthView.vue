<script setup>
import { ref } from 'vue';
import { useAuth } from '../state/useAuth.js';
import { Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-vue-next';

const { login, register } = useAuth();

const currentTab = ref('login');
const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ username: '', email: '', password: '' });
const message = ref({ text: '', isError: true });
const loading = ref(false);

async function handleLogin() {
  message.value = { text: '', isError: true };
  loading.value = true;
  try {
    await login(loginForm.value.email, loginForm.value.password);
  } catch (err) {
    message.value = { text: err.message, isError: true };
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  message.value = { text: '', isError: true };
  loading.value = true;
  try {
    await register(registerForm.value.username, registerForm.value.email, registerForm.value.password);
    message.value = { text: 'Compte créé avec succès ! Connecte-toi maintenant.', isError: false };
    currentTab.value = 'login';
  } catch (err) {
    message.value = { text: err.message, isError: true };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-12">
    
    <!-- En-tête de bienvenue -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center p-3 bg-purple-600/10 text-purple-400 rounded-2xl border border-purple-500/20 mb-4 shadow-lg shadow-purple-500/10">
        <Sparkles class="w-7 h-7" />
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
        Bienvenue sur VaporHub
      </h1>
      <p class="text-sm text-zinc-400 mt-2">
        La plateforme centralisée pour suivre et propulser vos lives.
      </p>
    </div>

    <!-- Carte d'Authentification -->
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
      
      <!-- Sélecteur d'onglets (Pill Tabs) -->
      <div class="grid grid-cols-2 bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800/80">
        <button 
          :class="['py-2 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer', 
                   currentTab === 'login' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200']"
          @click="currentTab = 'login'; message.text = ''"
        >
          Connexion
        </button>
        <button 
          :class="['py-2 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer', 
                   currentTab === 'register' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200']"
          @click="currentTab = 'register'; message.text = ''"
        >
          Inscription
        </button>
      </div>

      <!-- 1. Formulaire Connexion -->
      <form v-if="currentTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email</label>
          <div class="relative">
            <Mail class="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="loginForm.email" 
              type="email" 
              placeholder="streamer@exemple.com" 
              required 
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mot de passe</label>
          <div class="relative">
            <Lock class="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="loginForm.password" 
              type="password" 
              placeholder="••••••••" 
              required 
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/25 transition duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <span>{{ loading ? 'Connexion en cours...' : 'Se connecter' }}</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </form>

      <!-- 2. Formulaire Inscription -->
      <form v-else @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nom de créateur</label>
          <div class="relative">
            <User class="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="registerForm.username" 
              type="text" 
              placeholder="MonPseudo" 
              required 
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email</label>
          <div class="relative">
            <Mail class="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="registerForm.email" 
              type="email" 
              placeholder="streamer@exemple.com" 
              required 
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mot de passe</label>
          <div class="relative">
            <Lock class="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="registerForm.password" 
              type="password" 
              placeholder="Au moins 8 caractères" 
              required 
              minlength="8" 
              class="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/25 transition duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <span>{{ loading ? 'Création en cours...' : 'Créer mon compte' }}</span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </form>

      <!-- Message d'alerte (Erreur / Succès) -->
      <div 
        v-if="message.text" 
        :class="['mt-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5 border', 
                 message.isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400']"
      >
        <AlertCircle v-if="message.isError" class="w-5 h-5 shrink-0" />
        <CheckCircle2 v-else class="w-5 h-5 shrink-0" />
        <span>{{ message.text }}</span>
      </div>

    </div>
  </div>
</template>