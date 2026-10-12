import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Konfigurasi Vite untuk aplikasi React Absensi Face Recognition USINDO
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
});
