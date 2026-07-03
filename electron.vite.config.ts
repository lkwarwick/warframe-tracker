// electron.vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.ts'),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload.ts'),
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
    plugins: [react()],
  },
});