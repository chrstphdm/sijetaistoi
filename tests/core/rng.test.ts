import { describe, expect, it } from 'vitest'
import { createRandom, STREAMS } from '@/core/rng.ts'

describe('aléa déterministe', () => {
  it('produit la même suite pour la même graine', () => {
    const a = createRandom('graine-1')
    const b = createRandom('graine-1')
    expect(Array.from({ length: 20 }, () => a.events.next()))
      .toEqual(Array.from({ length: 20 }, () => b.events.next()))
  })

  it('produit des suites différentes pour des graines différentes', () => {
    const a = createRandom('graine-1')
    const b = createRandom('graine-2')
    expect(a.events.next()).not.toBe(b.events.next())
  })

  it('les flux sont INDÉPENDANTS : consommer l’un ne décale pas les autres', () => {
    // C'est la propriété qui permet d'ajouter une randomisation d'affichage
    // sans changer les événements tirés. Sans elle, aucun test de référence
    // ne survit à une modification de l'interface.
    const a = createRandom('g')
    const b = createRandom('g')
    for (let i = 0; i < 50; i++) a.presentation.next()
    expect(a.events.next()).toBe(b.events.next())
    expect(a.characters.next()).toBe(b.characters.next())
  })

  it('chaque flux a sa propre suite', () => {
    const r = createRandom('g')
    const values = STREAMS.map((s) => r[s].next())
    expect(new Set(values).size).toBe(STREAMS.length)
  })

  it('int reste dans les bornes et accepte zéro', () => {
    const r = createRandom('g')
    for (let i = 0; i < 500; i++) {
      const v = r.events.int(6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
    expect(r.events.int(0)).toBe(0)
  })

  it('shuffle est une permutation et ne modifie pas l’original', () => {
    const r = createRandom('g')
    const source = [1, 2, 3, 4, 5, 6]
    const out = r.presentation.shuffle(source)
    expect(source).toEqual([1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual(source)
  })

  it('compte ses tirages, pour pouvoir être audité', () => {
    const r = createRandom('g')
    r.characters.next(); r.characters.int(3); r.characters.pick([1, 2, 3])
    expect(r.characters.draws).toBe(3)
    expect(r.events.draws).toBe(0)
  })
})
