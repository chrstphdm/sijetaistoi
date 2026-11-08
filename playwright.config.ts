import { defineConfig, devices } from '@playwright/test'

/**
 * Les tests de bout en bout tournent sur le BUILD DE PRODUCTION servi par
 * vite preview, et non sur le serveur de développement.
 *
 * Ce qu'ils vérifient ne peut l'être nulle part ailleurs : jsdom ne calcule
 * aucune mise en page, donc il ne voit ni les contrastes réels, ni un
 * débordement horizontal, ni l'application effective de
 * prefers-reduced-motion. Ce sont des garanties d'accessibilité, c'est-à-dire
 * des garanties de neutralité : une information portée par la seule couleur
 * ou le seul mouvement est une information retirée à une partie des joueurs.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    // --host 127.0.0.1 est nécessaire : par défaut vite preview n'écoute
    // que sur ::1, et le navigateur de test joint 127.0.0.1.
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
