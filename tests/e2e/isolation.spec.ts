import { expect, test } from '@playwright/test'
import { reach } from './helpers.ts'

/**
 * Le site ne doit RIEN charger ni RIEN envoyer vers l'exterieur.
 *
 * C'est la garantie de confidentialite annoncee au joueur : ses reponses
 * portent sur ses opinions politiques, et elles ne peuvent pas quitter son
 * navigateur si rien ne sort. Une police distante suffirait a transmettre
 * une adresse corrélée a une session.
 *
 * Ces tests verifient le FAIT, pas la promesse.
 */

test('aucune requête ne sort vers un domaine tiers, sur tout le parcours', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const url = r.url()
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    if (baseURL && url.startsWith(baseURL)) return
    external.push(`${r.method()} ${url}`)
  })

  await reach(page, 'summary')
  expect(external, `requêtes sortantes :\n${external.join('\n')}`).toEqual([])
})

test('aucune violation de la politique de sécurité, ni erreur console', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))

  await reach(page, 'summary')

  const csp = problems.filter((p) => /content security policy|refused to/i.test(p))
  expect(csp, csp.join('\n')).toEqual([])
  expect(problems, problems.join('\n')).toEqual([])
})

test('la politique de sécurité est bien déclarée dans la page', async ({ page }) => {
  await page.goto('/')
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')

  expect(csp).toContain("default-src 'none'")
  expect(csp).toContain("connect-src 'none'")
  expect(csp).toContain("form-action 'none'")
})

test('l’Atelier n’est pas livré au visiteur', async ({ page }) => {
  // Sur un site déployé il serait décoratif et trompeur : il écrit sur la
  // machine du visiteur, alors que le jeu lit un paquet figé au build.
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Ouvrir l’Atelier/ })).toHaveCount(0)

  await page.goto('/#atelier')
  await expect(page.getByRole('heading', { name: 'Atelier', level: 1 })).toHaveCount(0)
  // Le jeu s'affiche normalement, le fragment est simplement ignoré.
  await expect(page.getByRole('button', { name: 'Commencer' })).toBeVisible()
})
