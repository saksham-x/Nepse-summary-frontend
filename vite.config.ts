import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      // If 5173 is busy Vite picks the next free port. API calls go through the
      // proxy below (same origin), so the port doesn't need to match CORS_ORIGINS.
      port: 5173,
      // In development the app calls /api/... and /socket.io on its own origin and Vite forwards them.
      proxy: { '/api': { target: apiTarget, changeOrigin: true }, '/socket.io': { target: apiTarget, changeOrigin: true, ws: true } },
    },
    preview: {
      port: 4173,
      proxy: { '/api': { target: apiTarget, changeOrigin: true }, '/socket.io': { target: apiTarget, changeOrigin: true, ws: true } },
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
