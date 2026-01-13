import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs';

// Recursively copy directory contents
function copyDirRecursive(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

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
              // Copy data folder (yaml + images) to dist recursively
              const dataDir = 'data';
              if (existsSync(dataDir)) {
                copyDirRecursive(dataDir, 'dist/data');
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
