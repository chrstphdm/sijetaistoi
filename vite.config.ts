import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Chemin de base relatif : le site fonctionne a la racine d'un domaine
// (Cloudflare Pages) comme dans un sous-repertoire, sans reconfiguration.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2023',
    sourcemap: true,
  },
  test: {
    globals: true,
    // Le moteur est pur : il se teste dans Node, sans DOM. Les tests
    // d'interface arriveront avec leur propre projet jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
