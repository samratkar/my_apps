import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'fs';

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
          name: 'serve-parent-assets',
          configureServer(server) {
            // Serve ../assets/ at /my_apps/assets/ during dev (same path as GitHub Pages)
            server.middlewares.use('/my_apps/assets', (req, res, next) => {
              const filePath = path.resolve(__dirname, '../assets', req.url?.slice(1) || '');
              if (existsSync(filePath)) {
                const content = readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes: Record<string, string> = {
                  '.yaml': 'text/yaml',
                  '.yml': 'text/yaml',
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.webp': 'image/webp',
                  '.gif': 'image/gif',
                };
                res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                res.end(content);
              } else {
                next();
              }
            });
          }
        },
        {
          name: 'copy-assets-to-dist',
          closeBundle() {
            // No need to copy - assets folder is deployed separately at ../assets/
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
