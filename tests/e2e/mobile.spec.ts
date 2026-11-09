import { expect, test } from '@playwright/test'
import { playMonths, reach } from './helpers.ts'

test.describe('tenue sur petit écran', () => {
  test('aucun débordement horizontal à 400 px, sur tout le parcours', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto('/')

    const overflows = async (label: string) => {
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth, `débordement horizontal sur « ${label} »`).toBeLessThanOrEqual(clientWidth + 1)
    }

    await overflows('accueil')
    await page.getByRole('button', { name: 'Commencer' }).click()
    await overflows('contrat')
    await page.getByRole('button', { name: /je commence/i }).click()
    await overflows('rencontre')
    await page.getByRole('button', { name: /Commencer le mois/ }).click()
    await overflows('mois')
    await playMonths(page)
    await overflows('réforme')
    await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
    await overflows('question')
    await page.getByRole('radio', { name: 'plutôt oui' }).click()
    await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
    await overflows('impact')
  })

  test('les cinq réponses ont la même largeur rendue', async ({ page }) => {
    // jsdom ne calcule aucune mise en page : seul un vrai moteur peut le dire.
    // Une réponse plus large serait une réponse suggérée.
    await page.setViewportSize({ width: 400, height: 800 })
    await reach(page, 'judgement')

    const widths = await page.getByRole('radio').evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().width)),
    )
    expect(widths).toHaveLength(5)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
  })

  test('toute cible tactile atteint 24 px, minimum WCAG 2.2', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await reach(page, 'reform')
    const small = await page.getByRole('button').evaluateAll((els) =>
      els
        .map((e) => ({ t: e.textContent?.slice(0, 40) ?? '', r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.height < 24 || r.width < 24)
        .map(({ t, r }) => `${t} — ${Math.round(r.width)}×${Math.round(r.height)}`),
    )
    expect(small).toEqual([])
  })
})
