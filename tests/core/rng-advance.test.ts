import { describe, expect, it } from 'vitest'
import { advance, createRandom, drawCounts, STREAMS } from '@/core/rng.ts'

describe('reprise d’une partie sauvegardée', () => {
  /**
   * PROPRIETE : recharger ne change pas la partie.
   *
   * Sans avance des flux, une sauvegarde relue repartait de generateurs neufs
   * et la suite de la partie divergeait silencieusement de ce qu'une partie
   * ininterrompue aurait donne.
   */
  it('reproduit exactement la suite d’une partie ininterrompue', () => {
    const continu = createRandom('graine-temoin')
    for (let i = 0; i < 7; i++) continu.events.next()
    for (let i = 0; i < 3; i++) continu.characters.next()
    const counts = drawCounts(continu)
    const attendu = [continu.events.next(), continu.characters.next()]

    const repris = createRandom('graine-temoin')
    advance(repris, counts)
    expect([repris.events.next(), repris.characters.next()]).toEqual(attendu)
  })

  it('compte les tirages de chaque flux séparément', () => {
    const r = createRandom('x')
    r.events.next()
    r.events.next()
    r.presentation.next()
    expect(drawCounts(r)).toEqual({ events: 2, characters: 0, presentation: 1, hypotheses: 0 })
  })

  it('n’avance jamais en arrière', () => {
    const r = createRandom('x')
    r.events.next()
    r.events.next()
    advance(r, { events: 1 })
    expect(r.events.draws).toBe(2)
  })

  it('traite un flux absent du compte comme non consommé', () => {
    const r = createRandom('x')
    advance(r, { events: 4 })
    expect(r.events.draws).toBe(4)
    for (const n of STREAMS.filter((s) => s !== 'events')) expect(r[n].draws).toBe(0)
  })
})
