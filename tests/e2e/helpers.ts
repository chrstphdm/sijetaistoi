import type { Page } from '@playwright/test'

/** Traverse les mois d'un acte jusqu'à l'écran de réforme. */
export async function playMonths(page: Page) {
  for (let guard = 0; guard < 12; guard++) {
    const reveal = page.getByRole('button', { name: /Voir les possibilités/ })
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click()
      await page.getByRole('button', { name: 'Choisir' }).first().click()
      continue
    }
    const skip = page.getByRole('button', { name: /Mois suivant/ })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click()
      continue
    }
    break
  }
}

export type Phase = 'intro' | 'month' | 'reform' | 'judgement' | 'impact' | 'callback' | 'summary'

/** Avance jusqu'à une phase donnée du parcours. */
export async function reach(page: Page, phase: Phase) {
  await page.goto('/')
  if (phase === 'intro') return

  await page.getByRole('button', { name: /Commencer le mois/ }).click()
  if (phase === 'month') return

  await playMonths(page)
  if (phase === 'reform') return

  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  if (phase === 'judgement') return

  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
  if (phase === 'impact') return

  await page.getByRole('button', { name: /Quelques mois plus tard/ }).click()
  if (phase === 'callback') return

  // Actes 2 et 3, puis bilan.
  for (const _ of [2, 3]) {
    await page.getByRole('button', { name: /Commencer le mois/ }).click()
    await playMonths(page)
    await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
    await page.getByRole('radio', { name: 'plutôt oui' }).click()
    await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
    const next = page.getByRole('button', { name: /Quelques mois plus tard|Voir le bilan/ })
    await next.click()
  }
}

/**
 * Attend que toutes les animations soient terminees.
 *
 * Sans cela, un controle de contraste peut mesurer un element en plein
 * fondu d'entree, dont l'opacite n'est pas encore a 1, et signaler une
 * fausse violation. Les exigences d'accessibilite portent sur l'etat
 * stabilise ; le cas prefers-reduced-motion est verifie separement.
 */
export async function settle(page: Page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState !== 'running'),
    undefined,
    { timeout: 5_000 },
  )
}
