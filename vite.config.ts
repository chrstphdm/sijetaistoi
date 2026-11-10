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
    rolldownOptions: {
      output: {
        /*
         * Deux fichiers à part, chargés au démarrage comme avant mais en
         * parallèle, et surtout mis en cache séparément : corriger un texte
         * ne fait plus retélécharger React, et une mise à jour du code ne
         * fait plus retélécharger les 350 ko du contenu.
         *
         * Le contenu n'est PAS chargé à la demande : le moteur le lit de
         * façon synchrone dès le montage (tirage des personnages, reprise
         * d'une partie), et le rendre asynchrone toucherait au déterminisme.
         */
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'contenu', test: /content[\\/]bundle\.json$/ },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    // Le moteur est pur : il se teste dans Node, sans DOM. Les tests
    // d'interface arriveront avec leur propre projet jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
