import { expect, test } from '@playwright/test'
import { playMonths, reach, SEED_TEST, settle, startClean } from './helpers.ts'

/**
 * « Recharger la page perdait toute la partie. »
 *
 * Il n'existait aucune sauvegarde, alors que le plan promettait une
 * « progression conservee localement » et que `src/persistence/` figurait
 * a l'etape 1.
 */

test('recharger ne perd pas la partie', async ({ page }) => {
  await reach(page, 'month')
  await settle(page)
  const before = await page.getByRole('heading', { level: 1 }).innerText()

  await page.reload()
  await settle(page)

  // L'accueil serait le symptôme : la partie a été oubliée.
  await expect(page.getByRole('button', { name: /^Commencer$/ })).toHaveCount(0)
  expect(await page.getByRole('heading', { level: 1 }).innerText()).toBe(before)
})

test('les décisions déjà prises survivent au rechargement', async ({ page }) => {
  await reach(page, 'impact')
  await settle(page)
  const impacts = await page.locator('.impacts').innerText()

  await page.reload()
  await settle(page)
  // La liste de comparaison, pas tout le `main` : un écran repris porte en
  // plus la mention « partie reprise », qui est justement voulue.
  expect(await page.locator('.impacts').innerText()).toBe(impacts)
})

/**
 * PROPRIETE CENTRALE : une partie rechargee est la MEME partie.
 *
 * Les flux aleatoires sont replaces la ou ils en etaient (voir `advance` dans
 * src/core/rng.ts). Sans cela, le personnage de l'acte suivant ne serait pas
 * celui qu'une partie ininterrompue aurait donne, et « meme graine, meme
 * partie » tomberait des le premier rechargement — en silence.
 */
test('recharger ne change pas la suite de la partie', async ({ page }) => {
  const playToSecondCharacter = async (withReload: boolean) => {
    await startClean(page)
    await reach(page, 'impact')
    if (withReload) {
      await page.reload()
      await settle(page)
    }
    await page.getByRole('button', { name: /Quelques mois plus tard/ }).click()
    await settle(page)
    return page.getByRole('heading', { level: 1 }).innerText()
  }

  expect(await playToSecondCharacter(true)).toBe(await playToSecondCharacter(false))
})

test('par défaut la partie ne survit pas à la fermeture de l’onglet', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await reach(page, 'month')
  await settle(page)

  // sessionStorage, pas localStorage : sur un poste partagé, les jugements
  // politiques du joueur ne doivent pas attendre la personne suivante.
  const stored = await page.evaluate(() => ({
    session: window.sessionStorage.getItem('sijetaistoi:partie') !== null,
    device: window.localStorage.getItem('sijetaistoi:partie') !== null,
  }))
  expect(stored).toEqual({ session: true, device: false })
  await context.close()
})

test('la conservation durable est un choix explicite', async ({ page }) => {
  await reach(page, 'contract')
  await settle(page)

  await page.getByRole('checkbox', { name: /Garder cette partie sur cet appareil/ }).check()
  await page.getByRole('button', { name: /je commence/i }).click()
  await settle(page)

  expect(
    await page.evaluate(() => window.localStorage.getItem('sijetaistoi:partie') !== null),
  ).toBe(true)
})

test('rien n’est enregistré avant d’avoir commencé', async ({ page }) => {
  await startClean(page)
  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)
  expect(
    await page.evaluate(
      () =>
        window.sessionStorage.getItem('sijetaistoi:partie') === null &&
        window.localStorage.getItem('sijetaistoi:partie') === null,
    ),
  ).toBe(true)
})

test('une nouvelle partie efface la précédente', async ({ page }) => {
  await reach(page, 'month')
  await playMonths(page)
  await settle(page)

  const key = await page.evaluate(() => window.sessionStorage.getItem('sijetaistoi:partie'))
  expect(key).not.toBeNull()

  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)
  // Le rechargement reprend la partie ; on en lance alors une neuve depuis
  // l'écran de bilan via la même fonction que le bouton.
  await page.evaluate(() => {
    window.sessionStorage.removeItem('sijetaistoi:partie')
    window.localStorage.removeItem('sijetaistoi:partie')
  })
  await page.goto('/?graine=zzzz6789')
  await settle(page)
  await expect(page.getByRole('button', { name: /^Commencer$/ }).first()).toBeVisible()
})

test('une sauvegarde d’un autre contenu est écartée, pas rejouée', async ({ page }) => {
  await startClean(page)
  await page.addInitScript(() => {
    // Un journal écrit contre une version antérieure du contenu : le rejouer
    // attribuerait au joueur des décisions qu'il n'a pas prises.
    window.sessionStorage.setItem(
      'sijetaistoi:partie',
      JSON.stringify({
        format: 2, seed: 'test2345', contentVersion: '0.0.1',
        journal: [{ type: 'start', seed: 'test2345', contentVersion: '0.0.1', hypothesisSetId: 'x' }],
        cursor: { step: { kind: 'reform' }, monthsDone: 0, monthIndex: 0, reformIndex: 0,
          usedEvents: [], recurring: [], oneOffCents: 0, wording: '', draws: {} },
      }),
    )
  })
  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)
  await expect(page.getByRole('button', { name: /^Commencer$/ }).first()).toBeVisible()
})

test('une sauvegarde illisible n’empêche pas de jouer', async ({ page }) => {
  await startClean(page)
  await page.addInitScript(() => {
    window.sessionStorage.setItem('sijetaistoi:partie', '{ ceci n’est pas du JSON')
  })
  await page.goto(`/?graine=${SEED_TEST}`)
  await settle(page)
  await expect(page.getByRole('button', { name: /^Commencer$/ }).first()).toBeVisible()
})
