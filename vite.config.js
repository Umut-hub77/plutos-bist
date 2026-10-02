import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api/* isteklerini FastAPI backend'ine (http://localhost:8000) yönlendiriyoruz.
// Böylece React tarafında fetch('/api/...') yazmak yeterli, CORS uğraşmaya gerek yok.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
