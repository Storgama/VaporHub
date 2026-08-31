<script setup>
  import { useAuth } from './state/useAuth.js';
  import Navbar from './components/Navbar.vue';
  import AuthView from './views/AuthView.vue';
  import DashboardView from './views/DashboardView.vue';

  const { isAuthenticated } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-purple-500 selection:text-white">
    <!-- Navbar (visible si connecté) -->
    <Navbar />

    <!-- Contenu Principal -->
    <main class="flex-1 max-w-6xl w-full mx-auto px-4 pb-12">
      <DashboardView v-if="isAuthenticated" />
      <AuthView v-else />
    </main>
  </div>
</template>