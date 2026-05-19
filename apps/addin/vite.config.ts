import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Don't use HTTPS - Codespaces forwards as HTTPS at the edge
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@threadmerge/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});