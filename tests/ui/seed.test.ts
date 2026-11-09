import { describe, expect, it } from 'vitest'
import { makeSeed, seedFromUrl, urlForSeed } from '@/ui/seed.ts'
import { createRandom } from '@/core/rng.ts'
import { castFirst, type CastingProfile } from '@/core/casting.ts'

const SIX: CastingProfile[] = ['claire', 'marc-anne', 'michele', 'sophie', 'thomas', 'yanis'].map(
  (id, i) => ({ id, incomeDecile: i + 2, concernedByRule: true }),
)

describe('graine de partie', () => {
  it('produit une graine différente à chaque appel', () => {
    const seeds = new Set(Array.from({ length: 200 }, makeSeed))
    expect(seeds.size).toBe(200)
  })

  it('n’emploie aucun caractère ambigu à l’oral', () => {
    // Une graine se lit et se dicte : ni 0/O, ni 1/l/i.
    for (let n = 0; n < 50; n++) {
      expect(makeSeed()).not.toMatch(/[01oil]/)
    }
  })

  it('relit une graine depuis l’adresse, et refuse le bruit', () => {
    expect(seedFromUrl('?graine=abcd2345')).toBe('abcd2345')
    expect(seedFromUrl('?graine=ABCD2345')).toBe('abcd2345')
    expect(seedFromUrl('?graine=ab')).toBeNull()
    expect(seedFromUrl('?autre=abcd')).toBeNull()
    expect(seedFromUrl('')).toBeNull()
  })

  it('construit une adresse rejouable', () => {
    expect(urlForSeed('abcd2345')).toContain('graine=abcd2345')
  })
})

describe('la graine fait varier la partie', () => {
  it('ouvre sur les six personnages selon la graine', () => {
    // C'est le défaut relevé en test utilisateur : avec une graine fixe, il
    // n'existait qu'UNE partie, et toujours le même premier personnage.
    const first = new Set<string>()
    for (let n = 0; n < 400; n++) {
      first.add(castFirst(SIX, createRandom(makeSeed()).characters).picked)
    }
    expect(first.size).toBe(6)
  })

  it('reste parfaitement reproductible à graine égale', () => {
    // La variété ne doit pas coûter la rejouabilité : une partie doit
    // pouvoir être rejouée à l'identique pour être auditable.
    const seed = makeSeed()
    const a = createRandom(seed)
    const b = createRandom(seed)
    expect(castFirst(SIX, a.characters)).toEqual(castFirst(SIX, b.characters))
    expect(Array.from({ length: 20 }, () => a.events.next()))
      .toEqual(Array.from({ length: 20 }, () => b.events.next()))
  })
})
