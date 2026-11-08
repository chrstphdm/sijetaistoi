import { expect, test } from '@playwright/test'
import { reach } from './helpers.ts'

/**
 * Une partie doit pouvoir se jouer entièrement au clavier.
 *
 * Ce n'est pas un confort : c'est la condition pour qu'une personne qui
 * n'utilise pas de souris puisse jouer, et donc pour que le dispositif
 * s'adresse réellement à tout le monde.
 */
test('le parcours se joue au clavier seul', async ({ page }) => {
  await reach(page, 'reform')

  const focusable = await page.evaluate(() => {
    const sel = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    return document.querySelectorAll(sel).length
  })
  expect(focusable).toBeGreaterThan(0)

  // La tabulation atteint le premier bouton de décision sans souris.
  let reached = false
  for (let i = 0; i < 60 && !reached; i++) {
    await page.keyboard.press('Tab')
    reached = await page.evaluate(
      () => document.activeElement?.textContent?.trim() === 'Décider ceci',
    )
  }
  expect(reached, 'le bouton de décision n’est pas atteignable au clavier').toBe(true)

  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /bien et juste/ })).toBeVisible()
})

test('le focus reste visible partout', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')

  const outline = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const s = getComputedStyle(el)
    return { width: s.outlineWidth, style: s.outlineStyle }
  })
  expect(outline).not.toBeNull()
  expect(outline?.style).not.toBe('none')
  expect(parseFloat(outline?.width ?? '0')).toBeGreaterThanOrEqual(2)
})
