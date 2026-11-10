import { test } from '@playwright/test'
import { reach, revealAll, settle, startClean, type Phase } from './helpers.ts'

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
    if (phase === 'home') await revealAll(page)
    await page.screenshot({
      path: `captures/${info.project.name}-${name}.png`,
      fullPage: true,
    })
  })
}

// La page méthode ne fait pas partie du parcours : on y entre par l'accueil.
test('capture methode', async ({ page }, info) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Comment ce jeu est construit/ }).click()
  await settle(page)
  await page.screenshot({ path: `captures/${info.project.name}-methode.png`, fullPage: true })
})

/**
 * Captures des ecrans qui n'appartiennent pas au parcours tire au hasard.
 *
 * L'option hors de portee ne se voit que chez un personnage peu liquide, et
 * l'ecran de preparation n'est lie depuis nulle part : sans la porte de
 * service, aucune des deux ne serait regardable.
 */
test('capture option hors de portee', async ({ page }, info) => {
  await startClean(page)
  for (const seed of ['test2345', 'abcd2345', 'zzzz6789', 'mnpq3456']) {
    await page.goto(`/?graine=${seed}&persos=claire`)
    await page.getByRole('button', { name: 'Commencer' }).first().click()
    await page.getByRole('button', { name: /je commence/i }).click()
    await page.getByRole('button', { name: /Commencer le mois/ }).click()
    let found = false
    for (let guard = 0; guard < 8; guard++) {
      if (await page.getByRole('heading', { name: /contrôle technique/i }).isVisible().catch(() => false)) {
        found = true
        break
      }
      const reveal = page.getByRole('button', { name: /Voir les possibilités/ })
      if (await reveal.isVisible().catch(() => false)) {
        await reveal.click()
        await page.getByRole('button', { name: 'Choisir' }).first().click()
        continue
      }
      const skip = page.getByRole('button', { name: /Mois suivant/ })
      if (await skip.isVisible().catch(() => false)) { await skip.click(); continue }
      break
    }
    if (!found) continue
    await page.getByRole('button', { name: /Voir les possibilités/ }).click()
    await settle(page)
    await page.screenshot({ path: `captures/${info.project.name}-hors-de-portee.png`, fullPage: true })
    return
  }
})

test('capture preparation', async ({ page }, info) => {
  await startClean(page)
  await page.goto('/?graine=test2345#preparation')
  await settle(page)
  await page.screenshot({ path: `captures/${info.project.name}-preparation.png`, fullPage: true })
})
