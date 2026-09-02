import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // Affiche le tableau dans le terminal + génère un rapport HTML
      include: ['src/**/*.js'],
      exclude: ['src/db/**'] // On exclut les migrations/seeds du coverage
    }
  }
});