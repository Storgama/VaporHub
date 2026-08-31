<script setup>
import { useAuth } from '../state/useAuth.js';
import { Flame, User, LogOut } from 'lucide-vue-next';

const { user, isAuthenticated, logout } = useAuth();
</script>

<template>
  <header v-if="isAuthenticated" class="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 mb-8">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      
      <!-- Logo VaporHub -->
      <div class="flex items-center gap-2">
        <div class="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
          <Flame class="w-5 h-5" />
        </div>
        <span class="text-xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
          VaporHub
        </span>
      </div>

      <!-- Profil & Déconnexion -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-sm text-zinc-300">
          <User class="w-4 h-4 text-purple-400" />
          <span>{{ user }}</span>
        </div>

        <button 
          @click="logout"
          class="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-400 bg-zinc-900/60 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer"
        >
          <LogOut class="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>

    </div>
  </header>
</template>