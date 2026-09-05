import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@game-content': fileURLToPath(new URL('../../packages/game-content', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      // allow imports from packages/game-content (quests.json) in dev
      allow: ['..'],
    },
  },
});
