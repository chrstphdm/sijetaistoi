import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Avance jusqu'à une phase donnée du parcours. */
async function reach(page: Page, phase: 'vote' | 'judging' | 'impact' | 'collision' | 'summary') {
  await page.goto('/')
  if (phase === 'vote') return
  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  if (phase === 'judging') return
  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
  if (phase === 'impact') return
  await page.getByRole('button', { name: /Quelques mois plus tard/ }).click()
  if (phase === 'collision') return
  await page.getByRole('button', { name: /Terminer la partie/ }).click()
}

const PHASES = ['vote', 'judging', 'impact', 'collision', 'summary'] as const

for (const phase of PHASES) {
  test(`aucune violation d'accessibilité — phase ${phase}`, async ({ page }) => {
    await reach(page, phase)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const details = results.violations.map(
      (v) => `${v.id} (${v.impact}) — ${v.help}\n    ${v.nodes.map((n) => n.html).join('\n    ')}`,
    )
    expect(results.violations, details.join('\n\n')).toEqual([])
  })
}

test('les contrastes tiennent aussi en thème sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await reach(page, 'impact')
  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
  const contrast = results.violations.filter((v) => v.id === 'color-contrast')
  expect(contrast, JSON.stringify(contrast, null, 1)).toEqual([])
})
