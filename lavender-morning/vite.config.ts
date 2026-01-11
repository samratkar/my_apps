import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/my_apps/lavender-morning/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'copy-data',
          closeBundle() {
            try {
              // Copy quotes.yaml from assets folder
              mkdirSync('dist/data', { recursive: true });
              copyFileSync('../assets/lavender-morning/quotes.yaml', 'dist/data/quotes.yaml');
              
              // Copy images from assets folder to data folder (alongside yaml)
              const assetsDir = '../assets/lavender-morning';
              const files = readdirSync(assetsDir);
              files.forEach(file => {
                if (file !== 'quotes.yaml') {
                  copyFileSync(`${assetsDir}/${file}`, `dist/data/${file}`);
                }
              });
            } catch (e) {
              console.error('Failed to copy data folder:', e);
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
