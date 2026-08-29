<script setup>
    import { useAuth } from '../state/useAuth.js';
    const { user, isAuthenticated, logout } = useAuth();
</script>

<template>
  <header class="header-bar" v-if="isAuthenticated">
    <span>Connecté en tant que : <strong>{{ user }}</strong></span>
    <button @click="logout">Se déconnecter</button>
  </header>
</template>