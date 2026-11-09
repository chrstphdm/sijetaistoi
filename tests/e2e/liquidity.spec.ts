import { expect, test } from '@playwright/test'
import { settle } from './helpers.ts'

/**
 * « Quand on a la possibilite de payer en une fois, est-ce que ca ne depend
 * pas de la somme que l'on a de cote ? »
 *
 * Si. L'option etait proposee a tout le monde : Claire reglait une reparation
 * de 750 EUR avec 180 EUR disponibles et 200 EUR de decouvert autorise. Le
 * schema prevoyait pourtant un champ `availableIf` sur chaque option — jamais
 * evalue.
 *
 * L'ecran de preparation sert ici a atteindre a coup sur un personnage
 * precis : sans lui, ce controle dependrait du tirage.
 */

/** Rejoue les mois jusqu'a tomber sur l'evenement voulu, ou epuiser l'acte. */
async function findEvent(page: import('@playwright/test').Page, title: RegExp) {
  for (let guard = 0; guard < 8; guard++) {
    if (await page.getByRole('heading', { name: title }).isVisible().catch(() => false)) return true
    const reveal = page.getByRole('button', { name: /Voir les possibilités/ })
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click()
      await page.getByRole('button', { name: 'Choisir' }).first().click()
      continue
    }
    const skip = page.getByRole('button', { name: /Mois suivant/ })
    if (await skip.isVisible().catch(() => false)) { await skip.click(); continue }
    return false
  }
  return false
}

async function openClaire(page: import('@playwright/test').Page, seed: string) {
  await page.goto(`/?graine=${seed}&persos=claire`)
  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await page.getByRole('button', { name: /je commence/i }).click()
  await page.getByRole('button', { name: /Commencer le mois/ }).click()
  await settle(page)
}

test('une réparation hors de portée reste affichée, barrée et chiffrée', async ({ page }) => {
  // Plusieurs graines : l'événement visé n'apparaît pas à tous les mois.
  let found = false
  for (const seed of ['test2345', 'abcd2345', 'zzzz6789', 'mnpq3456']) {
    await openClaire(page, seed)
    if (await findEvent(page, /contrôle technique/i)) { found = true; break }
  }
  expect(found, 'l’événement voiture doit survenir pour au moins une graine').toBe(true)

  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await settle(page)

  const barred = page.locator('.option--impossible')
  await expect(barred).toHaveCount(1)
  await expect(barred).toContainText(/Hors de portée/)

  // Le motif doit être CHIFFRÉ : « hors de portée » sans montant ressemble à
  // une punition arbitraire au lieu d'une contrainte qu'on peut comprendre.
  await expect(barred).toContainText(/€/)
  await expect(barred.getByRole('button', { name: 'Choisir' })).toHaveCount(0)

  // Et le mois garde une issue : au moins une option reste choisissable.
  expect(await page.getByRole('button', { name: 'Choisir' }).count()).toBeGreaterThan(0)
})

test('le même événement laisse le choix à qui a la trésorerie', async ({ page }) => {
  let found = false
  for (const seed of ['test2345', 'abcd2345', 'zzzz6789', 'mnpq3456']) {
    await page.goto(`/?graine=${seed}&persos=marc-anne`)
    await page.getByRole('button', { name: 'Commencer' }).first().click()
    await page.getByRole('button', { name: /je commence/i }).click()
    await page.getByRole('button', { name: /Commencer le mois/ }).click()
    await settle(page)
    if (await findEvent(page, /contrôle technique/i)) { found = true; break }
  }
  expect(found).toBe(true)

  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await settle(page)

  // C'EST LE PROPOS DU JEU : la même panne, la même somme, et deux vécus
  // différents. Rien n'est barré ici.
  await expect(page.locator('.option--impossible')).toHaveCount(0)
})

/**
 * Une perte de revenu n'est pas une somme a financer.
 *
 * Avoir confondu les deux fermait l'ecran de l'arret de travail sans aucune
 * option pour Yanis. Releve par le controle de build, pas a la lecture.
 */
test('un arrêt de travail ne barre jamais rien', async ({ page }) => {
  let found = false
  for (const seed of ['test2345', 'abcd2345', 'zzzz6789', 'mnpq3456']) {
    await page.goto(`/?graine=${seed}&persos=yanis`)
    await page.getByRole('button', { name: 'Commencer' }).first().click()
    await page.getByRole('button', { name: /je commence/i }).click()
    await page.getByRole('button', { name: /Commencer le mois/ }).click()
    await settle(page)
    if (await findEvent(page, /arrêt de travail/i)) { found = true; break }
  }
  expect(found).toBe(true)

  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await settle(page)
  await expect(page.locator('.option--impossible')).toHaveCount(0)
  expect(await page.getByRole('button', { name: 'Choisir' }).count()).toBe(3)
})
