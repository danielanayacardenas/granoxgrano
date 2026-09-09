import { defineConfig } from 'astro/config';

// Sitio estático, listo para Vercel sin adaptador dedicado.
export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
