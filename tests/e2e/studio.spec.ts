import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { settle } from './helpers.ts'

test.describe('Atelier', () => {
  test('s’ouvre depuis le jeu et liste tout le contenu', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Commencer' }).first().click()
    await page.getByRole('button', { name: /je commence/i }).click()
    await page.getByRole('button', { name: /Ouvrir l’Atelier/ }).click()

    await expect(page.getByRole('heading', { name: 'Atelier', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Personnages' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Décisions collectives' })).toBeVisible()
  })

  test('applique les mêmes règles que le build, pendant la frappe', async ({ page }) => {
    await page.goto('/#atelier')
    const editor = page.getByLabel(/Contenu de .*, au format JSON/)
    await expect(editor).toBeVisible()
    await expect(page.getByText('Aucun problème')).toBeVisible()

    // Un terme proscrit par le lexique est signalé immédiatement.
    const text = await editor.inputValue()
    const broken = text.replace(/"story": "/, '"story": "Elle vit de l’assistanat. ')
    await editor.fill(broken)

    const diagnostics = page.locator('.studio__diag')
    await expect(diagnostics).toContainText('assistanat')
    await expect(diagnostics).toContainText('prestations sociales')
    await expect(diagnostics).toContainText('Bloquant')
  })

  test('refuse d’enregistrer un contenu invalide', async ({ page }) => {
    await page.goto('/#atelier')
    const editor = page.getByLabel(/Contenu de .*, au format JSON/)
    await editor.fill('{ "id": "casse" }')
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  test('signale un JSON illisible sans planter', async ({ page }) => {
    await page.goto('/#atelier')
    await page.getByLabel(/Contenu de .*, au format JSON/).fill('{ "id":')
    await expect(page.getByText(/JSON invalide/)).toBeVisible()
  })

  test('n’a aucune violation d’accessibilité', async ({ page }) => {
    await page.goto('/#atelier')
    await settle(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([])
  })
})
