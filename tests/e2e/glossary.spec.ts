import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { settle } from './helpers.ts'

/**
 * Le glossaire ne doit rien réserver à la souris.
 *
 * jsdom ne voit ni la bulle ni ses contrastes : seul un vrai navigateur
 * dit si la définition s'affiche au clavier comme au survol, sans sortir de
 * l'écran ni tomber sous le seuil de contraste.
 */
test('la définition s’affiche au clavier, au survol, et reste lisible', async ({ page }) => {
  await page.goto('/')
  const term = page.getByRole('button', { name: 'décile' })
  const tip = page.locator('.gloss__tip')

  await term.focus()
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('dix groupes')
  // Annoncée sans rien ouvrir : la description est calculée par le navigateur.
  await expect(term).toHaveAccessibleDescription(/dix groupes/)

  const box = await tip.boundingBox()
  const width = await page.evaluate(() => document.documentElement.clientWidth)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width)

  await settle(page)
  const results = await new AxeBuilder({ page }).include('.gloss').withTags(['wcag2aa']).analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])

  await page.keyboard.press('Escape')
  await expect(tip).toHaveCount(0)

  // Au survol aussi, une fois le focus parti ailleurs.
  await term.blur()
  await term.hover()
  await expect(tip).toBeVisible()
})

test('la page méthode porte un glossaire complet', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Lire comment le jeu est construit/ }).click()
  const glossary = page.getByRole('heading', { name: 'Glossaire' })
  await expect(glossary).toBeVisible()
  await expect(page.locator('.glossary dt')).not.toHaveCount(0)
})

test('au toucher, la définition s’ouvre et se referme d’un toucher ailleurs', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'appareil sans écran tactile')
  await page.goto('/')
  const term = page.getByRole('button', { name: 'décile' })
  await term.scrollIntoViewIfNeeded()
  await settle(page)
  await term.tap()
  await expect(page.locator('.gloss__tip')).toBeVisible()
  await page.locator('h1').first().tap()
  await expect(page.locator('.gloss__tip')).toHaveCount(0)
})
