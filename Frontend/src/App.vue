<script setup>
import { ref, onMounted } from 'vue';

const API_URL = 'http://localhost:3000/api';

// --- États réactifs ---
const currentTab = ref('login'); // 'login' ou 'register'
const username = ref(localStorage.getItem('username') || '');
const accessToken = ref(localStorage.getItem('accessToken') || '');
const refreshToken = ref(localStorage.getItem('refreshToken') || '');

const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ username: '', email: '', password: '' });
const authMessage = ref({ text: '', isError: true });
const twitchStats = ref(null);

// --- Inscription ---
async function handleRegister() {
  authMessage.value = { text: '', isError: true };
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerForm.value)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur inscription');

    authMessage.value = { text: 'Compte créé ! Connecte-toi.', isError: false };
    currentTab.value = 'login';
  } catch (err) {
    authMessage.value = { text: err.message, isError: true };
  }
}

// --- Connexion ---
async function handleLogin() {
  authMessage.value = { text: '', isError: true };
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Identifiants invalides');

    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;
    username.value = data.user.username;

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('username', data.user.username);

    loadTwitchStats();
  } catch (err) {
    authMessage.value = { text: err.message, isError: true };
  }
}

// --- Déconnexion ---
async function handleLogout() {
  if (refreshToken.value) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken.value })
    }).catch(() => {});
  }
  localStorage.clear();
  accessToken.value = '';
  refreshToken.value = '';
  username.value = '';
  twitchStats.value = null;
}

// --- Appel API protégé ---
async function loadTwitchStats() {
  try {
    const res = await fetch(`${API_URL}/twitch/stats`, {
      headers: { 'Authorization': `Bearer ${accessToken.value}` }
    });
    if (res.ok) {
      twitchStats.value = await res.json();
    }
  } catch (err) {
    console.error(err);
  }
}

onMounted(() => {
  if (accessToken.value) loadTwitchStats();
});
</script>

<template>
  <main>
    <h1>🚀 VaporHub (Vue 3)</h1>

    <!-- 1. SECTION AUTH -->
    <div v-if="!accessToken" class="card">
      <div class="tabs">
        <button :class="{ active: currentTab === 'login' }" @click="currentTab = 'login'">Connexion</button>
        <button :class="{ active: currentTab === 'register' }" @click="currentTab = 'register'">Inscription</button>
      </div>

      <!-- Form Login -->
      <form v-if="currentTab === 'login'" @submit.prevent="handleLogin">
        <h2>Se connecter</h2>
        <input v-model="loginForm.email" type="email" placeholder="Email" required />
        <input v-model="loginForm.password" type="password" placeholder="Mot de passe" required />
        <button type="submit">Connexion</button>
      </form>

      <!-- Form Register -->
      <form v-else @submit.prevent="handleRegister">
        <h2>Créer un compte</h2>
        <input v-model="registerForm.username" type="text" placeholder="Nom de créateur" required />
        <input v-model="registerForm.email" type="email" placeholder="Email" required />
        <input v-model="registerForm.password" type="password" placeholder="Mot de passe (min 8 car.)" required minlength="8" />
        <button type="submit">S'inscrire</button>
      </form>

      <p v-if="authMessage.text" :class="['message', { error: authMessage.isError, success: !authMessage.isError }]">
        {{ authMessage.text }}
      </p>
    </div>

    <!-- 2. SECTION DASHBOARD -->
    <div v-else>
      <div class="header-bar">
        <span>Connecté : <strong>{{ username }}</strong></span>
        <button @click="handleLogout">Se déconnecter</button>
      </div>

      <div class="card" v-if="twitchStats">
        <h2>Statistiques Twitch</h2>
        <p>Chaîne : {{ twitchStats.channel }}</p>
        <p>Statut : <span :class="twitchStats.isLive ? 'live' : 'offline'">
          {{ twitchStats.isLive ? `🔴 En Live (${twitchStats.viewerCount} viewers)` : '⚪ Hors ligne' }}
        </span></p>
      </div>
    </div>
  </main>
</template>