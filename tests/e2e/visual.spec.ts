import { test } from '@playwright/test'
import { reach, settle, type Phase } from './helpers.ts'

/**
 * Captures d'ecran, pour regarder le site plutot que de l'asserter.
 *
 * Raison d'etre : la suite entiere passait au vert pendant que le schema de
 * la boucle etait visiblement tronque a l'ecran. Un test de DOM verifie
 * qu'un element existe, jamais qu'il tient dans la page.
 *
 * Ces captures ne sont pas des tests — elles n'echouent pas. Elles servent
 * a etre ouvertes et examinees.
 */

const SHOTS: readonly { phase: Phase; name: string }[] = [
  { phase: 'home', name: 'accueil' },
  { phase: 'contract', name: 'contrat' },
  { phase: 'intro', name: 'personnage' },
  { phase: 'month', name: 'mois' },
  { phase: 'reform', name: 'decision' },
  { phase: 'impact', name: 'impact' },
  { phase: 'summary', name: 'bilan' },
]

for (const { phase, name } of SHOTS) {
  test(`capture ${name}`, async ({ page }, info) => {
    await reach(page, phase)
    await settle(page)
    await page.screenshot({
      path: `captures/${info.project.name}-${name}.png`,
      fullPage: true,
    })
  })
}
