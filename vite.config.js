import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Dev/demo + compile-check config. The engine itself ships as Svelte SOURCE and
// is compiled by the host; this config only powers the local demo (`npm run demo`).
export default defineConfig({
  plugins: [svelte()],
  root: 'demo',
  publicDir: 'public',
  build: { outDir: '../demo-dist', emptyOutDir: true },
})
