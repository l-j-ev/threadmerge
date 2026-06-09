import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    // Don't use HTTPS - Codespaces forwards as HTTPS at the edge
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        taskpane: path.resolve(__dirname, 'taskpane.html'),
        commands: path.resolve(__dirname, 'commands.html'),
        'auth-start': path.resolve(__dirname, 'auth-start.html'),
        'auth-redirect': path.resolve(__dirname, 'auth-redirect.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@threadmerge/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});