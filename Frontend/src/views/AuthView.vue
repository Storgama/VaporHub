<script setup>
    import { ref } from 'vue';
    import { useAuth } from '../state/useAuth.js';

    const { login, register } = useAuth();

    const currentTab = ref('login');
    const loginForm = ref({ email: '', password: '' });
    const registerForm = ref({ username: '', email: '', password: '' });
    const message = ref({ text: '', isError: true });

    async function handleLogin() {

        message.value = { text: '', isError: true };

        try {
            await login(loginForm.value.email, loginForm.value.password);
        } catch (err) {
            message.value = { text: err.message, isError: true };
        }
        
    }

    async function handleRegister() {

        message.value = { text: '', isError: true };

        try {
            await register(registerForm.value.username, registerForm.value.email, registerForm.value.password);
            message.value = { text: 'Compte créé avec succès ! Connecte-toi.', isError: false };
            currentTab.value = 'login';
        } catch (err) {
            message.value = { text: err.message, isError: true };
        }

    }
</script>

<template>
  <div class="card">
    <div class="tabs">
      <button :class="{ active: currentTab === 'login' }" @click="currentTab = 'login'">Connexion</button>
      <button :class="{ active: currentTab === 'register' }" @click="currentTab = 'register'">Inscription</button>
    </div>

    <!-- Formulaire Connexion -->
    <form v-if="currentTab === 'login'" @submit.prevent="handleLogin">
      <h2>Se connecter</h2>
      <input v-model="loginForm.email" type="email" placeholder="Email" required />
      <input v-model="loginForm.password" type="password" placeholder="Mot de passe" required />
      <button type="submit">Connexion</button>
    </form>

    <!-- Formulaire Inscription -->
    <form v-else @submit.prevent="handleRegister">
      <h2>Créer un compte</h2>
      <input v-model="registerForm.username" type="text" placeholder="Nom de créateur" required />
      <input v-model="registerForm.email" type="email" placeholder="Email" required />
      <input v-model="registerForm.password" type="password" placeholder="Mot de passe (min 8 car.)" required minlength="8" />
      <button type="submit">S'inscrire</button>
    </form>

    <p v-if="message.text" :class="['message', message.isError ? 'error' : 'success']">
      {{ message.text }}
    </p>
  </div>
</template>