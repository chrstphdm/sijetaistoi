import { expect, test } from '@playwright/test'
import { reach, SEED_TEST, settle, type Phase } from './helpers.ts'

/**
 * Les bases de la navigation web.
 *
 * Tout ce fichier teste des manques, pas des regressions : rien de ceci
 * n'existait. Releve en jouant, pas par un test — « parfois, lorsqu'on arrive
 * sur la page suivante, on est tout en bas », « il faut pouvoir rapidement
 * remonter en haut d'une page ».
 *
 * Ces controles doivent vivre ici et non en jsdom : le defilement, la position
 * d'un element fixe et la visibilite reelle n'existent pas sans mise en page.
 */

test('on arrive en haut du nouvel écran, même en venant du bas du précédent', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)

  // On descend jusqu'en bas du relevé avant de choisir.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await page.getByRole('button', { name: 'Choisir' }).first().click()
  await settle(page)

  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('le focus se déplace dans le nouvel écran, pas à la racine du document', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)
  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await page.getByRole('button', { name: 'Choisir' }).first().click()
  await settle(page)

  // `body` serait le symptôme : le focus retombe à la racine, et la
  // tabulation suivante repart du tout premier élément de la page.
  const focused = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName)
  expect(focused).not.toBe('BODY')
})

test('le titre du document nomme l’écran', async ({ page }) => {
  await page.goto(`/?graine=${SEED_TEST}`)
  await expect(page).toHaveTitle(/Accueil/)

  await reach(page, 'reform')
  await expect(page).toHaveTitle(/décision collective/)
})

test('le lien d’évitement apparaît à la première tabulation', async ({ page }) => {
  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: /Aller au contenu/ })
  await expect(skip).toBeFocused()
  // Hors de l'écran au repos, visible dès qu'il a le focus : c'est tout
  // l'intérêt. `display: none` le retirerait de l'ordre de tabulation.
  await expect(skip).toBeInViewport()
})

/**
 * Apres un changement d'ecran, le lien d'evitement n'a plus a etre atteint en
 * premier : le focus est deja DANS le contenu, et la tabulation doit donc
 * continuer vers les commandes de l'ecran, pas revenir en arriere. C'est le
 * comportement attendu, et il merite d'etre fige.
 */
test('après un changement d’écran, la tabulation continue dans le contenu', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)
  await page.getByRole('button', { name: /Voir les possibilités/ }).click()
  await page.getByRole('button', { name: 'Choisir' }).first().click()
  await settle(page)

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /Aller au contenu/ })).not.toBeFocused()
  const inMain = await page.evaluate(() =>
    document.getElementById('contenu')?.contains(document.activeElement) ?? false,
  )
  expect(inMain).toBe(true)
})

test('le retour en haut apparaît quand la page est longue, et ramène en haut', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)

  const top = page.locator('.back-to-top')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(top).toHaveClass(/back-to-top--visible/)
  // Il doit aussi être ANNONCÉ : masqué au lecteur d'écran, il serait
  // inutilisable par ceux qui en ont le plus besoin.
  await expect(top).toHaveAttribute('aria-hidden', 'false')

  await top.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(80)
})

test('le retour en haut reste hors de portée tant qu’il est inutile', async ({ page }) => {
  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  /*
   * Masqué ET non cliquable ET hors de l'arbre d'accessibilité.
   *
   * Sans `pointer-events: none`, il intercepterait les clics sur ce qui se
   * trouve dessous alors qu'on ne le voit pas — un bouton invisible qui vole
   * les clics est pire que pas de bouton. D'où `locator` et non `getByRole` :
   * `aria-hidden` le retire justement des rôles, ce qui est voulu.
   */
  const top = page.locator('.back-to-top')
  await expect(top).toHaveAttribute('aria-hidden', 'true')
  await expect(top).toHaveAttribute('tabindex', '-1')
  expect(await top.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
})

/**
 * UN SEUL `h1` PAR ECRAN, et au moins un.
 *
 * Quatre ecrans de jeu sur neuf n'en avaient aucun : le mois, la decision, le
 * jugement, la comparaison. Leur hierarchie de titres commencait a `h2`, donc
 * rien ne nommait la page — ni pour un lecteur d'ecran, ni pour la remise a
 * zero du focus, qui n'avait aucune cible.
 *
 * Deux `h1` sur une page valent aucun : c'est pourquoi « Tu es Claire. » et
 * « Ce que tu as decide » sont passes en `h2`.
 */
const PHASES: readonly Phase[] = [
  'home', 'contract', 'intro', 'month', 'reform', 'judgement', 'impact', 'callback',
]

for (const phase of PHASES) {
  test(`l’écran « ${phase} » porte exactement un h1`, async ({ page }) => {
    await reach(page, phase)
    await settle(page)
    await expect(page.locator('h1')).toHaveCount(1)
    expect(((await page.locator('h1').textContent()) ?? '').trim().length).toBeGreaterThan(3)
  })
}

test('le titre de l’écran et celui de l’onglet disent la même chose', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)
  // `textContent` et non `innerText` : le titre d'écran est en capitales par
  // CSS, et `innerText` rend le texte RENDU, donc déjà transformé.
  const heading = ((await page.locator('h1').textContent()) ?? '').trim()
  await expect(page).toHaveTitle(new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})
