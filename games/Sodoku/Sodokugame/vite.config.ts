import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Sodoku Vite config — Phase 1 scaffold.
//
// Phase 6 will tighten build options (manualChunks, minify, source maps,
// etc.). For Phase 1 the goal is: `npm run dev` boots the dev server,
// `npm run build` produces a static `dist/` that the Phase 0 nginx
// container could swap in for `Design/`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*.svg', 'assets/**/*.png'],
      manifest: {
        name: 'Sodoku',
        short_name: 'Sodoku',
        description: 'Sudoku — multiple difficulty levels with notes mode. Plays offline.',
        theme_color: '#A63C28',
        background_color: '#FBF9F5',
        display: 'standalone',
        start_url: '/',
        // SVG icon serves all sizes (modern browsers); included as
        // both `any` and `maskable` so install-to-homescreen on
        // Android renders cleanly inside the OS icon mask.
        icons: [
          { src: '/assets/kaya-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Pre-cache the static SPA shell + the engine worker. Daily
        // challenge generation works fully offline once cached.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
});
