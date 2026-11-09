import { defineConfig, devices } from '@playwright/test'

/**
 * Deux cibles, parce que le produit n'est pas le même dans les deux cas.
 *
 * Le JEU est testé sur le BUILD DE PRODUCTION servi par vite preview : c'est
 * exactement ce que reçoit un visiteur. jsdom ne calcule aucune mise en
 * page, donc il ne voit ni les contrastes réels, ni un débordement
 * horizontal, ni l'application effective de prefers-reduced-motion — autant
 * de garanties d'accessibilité, c'est-à-dire de neutralité : une
 * information portée par la seule couleur ou le seul mouvement est une
 * information retirée à une partie des joueurs.
 *
 * L'ATELIER est testé sur le serveur de développement, parce qu'il n'existe
 * QUE là : sur un site déployé il serait décoratif et trompeur. Un test qui
 * le vérifierait sur le build de production vérifierait quelque chose qui
 * n'est pas livré.
 */
const PREVIEW = 'http://127.0.0.1:4173'
const DEV = 'http://127.0.0.1:5174'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: { trace: 'on-first-retry' },

  projects: [
    {
      name: 'bureau',
      use: { ...devices['Desktop Chrome'], baseURL: PREVIEW },
      testIgnore: /studio\.spec\.ts|visual\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], baseURL: PREVIEW },
      testIgnore: /studio\.spec\.ts|visual\.spec\.ts/,
    },
    // Captures à regarder, pas des assertions : un test de DOM ne voit pas
    // qu'un schéma déborde de la page.
    {
      name: 'vue-large',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, baseURL: PREVIEW },
      testMatch: /visual\.spec\.ts/,
    },
    {
      name: 'vue-etroite',
      use: { ...devices['Pixel 5'], baseURL: PREVIEW },
      testMatch: /visual\.spec\.ts/,
    },
    {
      name: 'atelier',
      use: { ...devices['Desktop Chrome'], baseURL: DEV },
      testMatch: /studio\.spec\.ts/,
    },
  ],

  webServer: [
    {
      // --host 127.0.0.1 est nécessaire : par défaut vite n'écoute que sur
      // ::1, et le navigateur de test joint 127.0.0.1.
      command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
      url: PREVIEW,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort',
      url: DEV,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
