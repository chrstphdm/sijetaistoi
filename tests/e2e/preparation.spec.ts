import { expect, test } from '@playwright/test'
import { settle } from './helpers.ts'

/**
 * La porte de service : `#preparation`.
 *
 * Elle n'est liee depuis nulle part, et ce n'est pas un oubli : choisir
 * soi-meme ses personnages, c'est choisir ce qu'on va ressentir. Elle sert a
 * animer une seance collective, a montrer un cas precis, et a tester.
 */

test('aucune page du jeu ne mène à la préparation', async ({ page }) => {
  await page.goto('/?graine=test2345')
  await settle(page)
  await expect(page.getByRole('link', { name: /préparation|préparer/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Préparer une partie/i })).toHaveCount(0)
})

test('la préparation impose le personnage choisi', async ({ page }) => {
  await page.goto('/?graine=test2345#preparation')
  await settle(page)
  await expect(page.getByRole('heading', { name: 'Préparer une partie' })).toBeVisible()

  await page.getByLabel('Acte 1').first().selectOption('michele')
  await page.getByRole('button', { name: 'Commencer cette partie' }).click()

  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await page.getByRole('button', { name: /je commence/i }).click()
  await settle(page)

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Michèle/)
})

test('la préparation impose la décision collective choisie', async ({ page }) => {
  await page.goto('/?graine=test2345#preparation')
  await settle(page)

  await page.getByLabel('Acte 1').last().selectOption('tva-taux-reduit')
  await page.getByRole('button', { name: 'Commencer cette partie' }).click()
  await page.goto(page.url())

  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await page.getByRole('button', { name: /je commence/i }).click()
  await page.getByRole('button', { name: /Commencer le mois/ }).click()
  for (let i = 0; i < 8; i++) {
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
  await settle(page)
  await expect(page.locator('main')).toContainText(/TVA/i)
})

/**
 * POINT DE METHODE, et non de confort.
 *
 * La page methode affirme que le premier personnage est tire au hasard parmi
 * les six. Dans une partie preparee c'est faux. Sans ce controle, le jeu
 * porterait une affirmation inexacte sur son propre fonctionnement — ce que la
 * charte interdit explicitement.
 */
test('une partie préparée ne se prétend pas tirée au hasard', async ({ page }) => {
  await page.goto('/?graine=test2345&persos=michele')
  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await page.getByRole('button', { name: /je commence/i }).click()
  await settle(page)

  await page.getByRole('group', { name: /comment ce jeu choisit/i })
    .or(page.locator('details', { hasText: 'Comment ce jeu choisit' }))
    .first()
    .locator('summary')
    .click()

  const registry = page.locator('details', { hasText: 'Comment ce jeu choisit' }).first()
  await expect(registry).toContainText(/préparée à la main/)
  await expect(registry).toContainText(/Michèle \(imposé\)/)
  await expect(registry).not.toContainText(/Le premier personnage est tiré au hasard/)
})

test('une partie normale continue d’annoncer un tirage au hasard', async ({ page }) => {
  await page.goto('/?graine=test2345')
  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await page.getByRole('button', { name: /je commence/i }).click()
  await settle(page)

  const registry = page.locator('details', { hasText: 'Comment ce jeu choisit' }).first()
  await registry.locator('summary').click()
  await expect(registry).toContainText(/tiré au hasard parmi les 6/)
  await expect(registry).not.toContainText(/imposé/)
})
