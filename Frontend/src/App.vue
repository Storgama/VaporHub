<script setup>
    import { useAuth } from './state/useAuth.js';
    import Navbar from './components/Navbar.vue';
    import AuthView from './views/AuthView.vue';
    import DashboardView from './views/DashboardView.vue';

    const { isAuthenticated } = useAuth();
</script>

<template>
  <main>
    <h1>🚀 VaporHub</h1>
    
    <Navbar />

    <DashboardView v-if="isAuthenticated" />
    <AuthView v-else />
  </main>
</template>