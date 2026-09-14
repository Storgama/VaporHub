<script setup lang="ts">
  import { ref } from 'vue';
  import { useAuth } from './state/useAuth.js';
  import Navbar from './components/Navbar.vue';
  import AuthView from './views/AuthView.vue';
  import DashboardView from './views/DashboardView.vue';
  import AnalyticsView from './views/AnalyticsView.vue';

  export type ViewType = 'dashboard' | 'analytics';

  const { isAuthenticated } = useAuth();
  const currentView = ref<ViewType>('dashboard');
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-purple-500 selection:text-white">
    <!-- Navbar avec changement de vue -->
    <Navbar :current-view="currentView" @change-view="(v: string) => currentView = (v as ViewType)" />

    <!-- Contenu Principal -->
    <main class="flex-1 max-w-[1920px] w-full mx-auto px-4 lg:px-8 pb-12">
      <template v-if="isAuthenticated">
        <DashboardView v-if="currentView === 'dashboard'" />
        <AnalyticsView v-else-if="currentView === 'analytics'" />
      </template>
      <AuthView v-else />
    </main>
  </div>
</template>