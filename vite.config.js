import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Relative base so the build works wherever it is hosted. Two pages: the site, and the articles at /articles/.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), articles: resolve(import.meta.dirname, 'articles/index.html') } } },
});
