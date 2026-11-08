import { expect, test, type Page } from '@playwright/test'

/**
 * Le TEST DE LA LECTURE MUETTE, appliqué pour de vrai.
 *
 * Troisième des trois tests opposables de la ligne rouge : on coupe le
 * mouvement et la couleur, et on vérifie que la conclusion d'un lecteur ne
 * change pas. Si elle change, la mise en scène portait un argument.
 *
 * Seul un vrai navigateur peut l'exécuter : il faut que prefers-reduced-motion
 * soit réellement appliqué par le moteur de rendu.
 */

const textOf = (page: Page) => page.locator('main').innerText()

test('prefers-reduced-motion ne retire aucune information', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
  const withMotion = await textOf(page)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()
  const withoutMotion = await textOf(page)

  expect(withoutMotion).toBe(withMotion)
})

test('les six blocs de comparaison apparaissent ensemble, sans cascade', async ({ page }) => {
  // Sur un écran dont le message EST la comparaison, différencier la mise en
  // scène ajoute un second canal qui amplifie un personnage.
  await page.goto('/')
  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()

  const delays = await page.locator('.impacts li').evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).animationDelay),
  )
  expect(new Set(delays).size).toBe(1)

  const durations = await page.locator('.impacts li').evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).animationDuration),
  )
  expect(new Set(durations).size).toBe(1)
})

test('aucun signe n’est porté par la seule couleur', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Décider ceci' }).nth(1).click()
  await page.getByRole('radio', { name: 'plutôt oui' }).click()
  await page.getByRole('button', { name: /ce que cela change pour chacun/i }).click()

  // Chaque montant signé porte un mot en toutes lettres, en plus du glyphe.
  const signed = page.locator('.amount__word')
  const count = await signed.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const text = (await signed.nth(i).innerText()).trim()
    expect(['en plus', 'en moins']).toContain(text)
  }
})
