import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/my_apps/lavender-morning/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            generator: path.resolve(__dirname, 'generator.html'),
            offline: path.resolve(__dirname, 'offline.html'),
            home: path.resolve(__dirname, 'home.html'),
          },
        },
      },
      plugins: [
        react(),
        {
          name: 'copy-data',
          closeBundle() {
            try {
              // Copy data folder (yaml + images) to dist
              mkdirSync('dist/data', { recursive: true });
              const dataDir = 'data';
              if (existsSync(dataDir)) {
                const files = readdirSync(dataDir);
                files.forEach(file => {
                  copyFileSync(`${dataDir}/${file}`, `dist/data/${file}`);
                });
              }
            } catch (e) {
              console.error('Failed to copy files:', e);
            }
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
