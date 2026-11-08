import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { reach, settle } from './helpers.ts'

const PHASES = ['intro', 'month', 'reform', 'judgement', 'impact', 'callback', 'summary'] as const

for (const phase of PHASES) {
  test(`aucune violation d'accessibilité — phase ${phase}`, async ({ page }) => {
    await reach(page, phase)
    await settle(page)
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
  await settle(page)
  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
  const contrast = results.violations.filter((v) => v.id === 'color-contrast')
  expect(contrast, JSON.stringify(contrast, null, 1)).toEqual([])
})
