import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    https: {
      // office-addin-dev-certs creates these
      key: fs.existsSync(path.resolve(process.env.HOME || '', '.office-addin-dev-certs/localhost.key'))
        ? fs.readFileSync(path.resolve(process.env.HOME || '', '.office-addin-dev-certs/localhost.key'))
        : undefined,
      cert: fs.existsSync(path.resolve(process.env.HOME || '', '.office-addin-dev-certs/localhost.crt'))
        ? fs.readFileSync(path.resolve(process.env.HOME || '', '.office-addin-dev-certs/localhost.crt'))
        : undefined,
    },
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
