import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginVue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // port: 8080,
    // 开发时 Login 等使用相对路径 /litetrack/v1，需转发到 Fastify，否则会 404
    proxy: {
      '/litetrack': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  html: {
    template: './index.html',
    title: 'LiteTrack',
    favicon: './public/favicon.svg',
  },
});
