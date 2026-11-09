// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { characters, reforms } from '@/content/load.ts'
import { createRandom } from '@/core/rng.ts'
import { castChosen, castFirst } from '@/core/casting.ts'
import { EMPTY_SETUP, isPrepared, setupFromUrl, SLOTS, urlForSetup } from '@/ui/setup.ts'

const profiles = characters.map((c) => ({
  id: c.id,
  incomeDecile: c.identity.incomeDecile,
  concernedByRule: true,
}))

describe('préparation lue dans l’adresse', () => {
  it('ne prépare rien par défaut', () => {
    expect(isPrepared(setupFromUrl(''))).toBe(false)
    expect(isPrepared(EMPTY_SETUP)).toBe(false)
  })

  it('lit les personnages et les décisions', () => {
    const s = setupFromUrl(`?persos=${characters[2]!.id},${characters[0]!.id}&decisions=${reforms[1]!.id}`)
    expect(s.characterIds).toEqual([characters[2]!.id, characters[0]!.id])
    expect(s.reformIds).toEqual([reforms[1]!.id])
    expect(isPrepared(s)).toBe(true)
  })

  /**
   * Une adresse partagee doit survivre a un renommage de contenu : elle
   * retombe sur le tirage normal plutot que d'ouvrir une page en erreur.
   */
  it('ignore un identifiant inconnu au lieu d’échouer', () => {
    const s = setupFromUrl(`?persos=inexistant,${characters[0]!.id}&decisions=pas-une-reforme`)
    expect(s.characterIds).toEqual([characters[0]!.id])
    expect(s.reformIds).toEqual([])
  })

  it('ne retient jamais plus de places qu’il n’y a d’actes', () => {
    const all = characters.map((c) => c.id).join(',')
    expect(setupFromUrl(`?persos=${all}`).characterIds).toHaveLength(SLOTS)
  })

  it('écrit une adresse relisible, graine comprise', () => {
    const s = { characterIds: [characters[1]!.id], reformIds: [reforms[0]!.id] }
    const url = urlForSetup('abcd2345', s)
    const search = new URL(url).search
    expect(new URLSearchParams(search).get('graine')).toBe('abcd2345')
    expect(setupFromUrl(search)).toEqual(s)
  })

  it('retire les paramètres des places rendues au hasard', () => {
    const prepared = new URL(urlForSetup('abcd2345', { characterIds: [characters[1]!.id], reformIds: [] }))
    expect(prepared.searchParams.has('decisions')).toBe(false)
  })
})

describe('imposer un personnage ne déplace pas la partie', () => {
  /**
   * PROPRIETE CENTRALE. Si `castChosen` tirait dans un flux, ouvrir l'ecran
   * de preparation decalerait tout l'aleatoire en aval : a graine egale, les
   * evenements du mois ne seraient plus les memes, et comparer une partie
   * preparee a une partie tiree n'aurait plus de sens.
   */
  it('ne consomme aucun aléatoire', () => {
    const a = createRandom('graine-temoin')
    castFirst(profiles, a.characters)
    const afterDraw = a.events.shuffle(reforms).map((r) => r.id)

    const b = createRandom('graine-temoin')
    castChosen(characters[3]!.id, profiles)
    const afterImposed = b.events.shuffle(reforms).map((r) => r.id)

    expect(afterImposed).toEqual(afterDraw)
  })

  it('marque le tirage comme imposé, pour que le registre ne mente pas', () => {
    const draw = castChosen(characters[0]!.id, profiles)
    expect(draw.imposed).toBe(true)
    expect(draw.uniform).toBe(false)
    expect(castFirst(profiles, createRandom('x').characters).imposed).toBeUndefined()
  })

  it('refuse un personnage hors du corpus', () => {
    expect(() => castChosen('fantome', profiles)).toThrow(/inconnu/)
  })
})
