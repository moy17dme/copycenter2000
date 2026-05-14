import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path'; // 👈 1. Importa el módulo 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 👈 2. Configura el alias "@" para que apunte al directorio "src"
      "@": path.resolve(__dirname, "./src"),
    },
  },
});