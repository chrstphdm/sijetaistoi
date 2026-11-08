import { describe, expect, it } from 'vitest'
import {
  castFirst, castNext, CONSTRAINT_STATEMENTS, RELAXATION_ORDER,
  type CastingProfile, type ConstraintId,
} from '@/core/casting.ts'
import { createRandom } from '@/core/rng.ts'

const p = (id: string, incomeDecile: number, concernedByRule = true): CastingProfile => ({
  id, incomeDecile, concernedByRule,
})

const SIX = [
  p('claire', 2), p('yanis', 1), p('michele', 4),
  p('sophie', 6), p('thomas', 7), p('marc-anne', 9),
]

describe('premier tirage', () => {
  it('est uniforme : aucun biais possible sur le point d’entrée', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 6000; i++) {
      const d = castFirst(SIX, createRandom(`g${i}`).characters)
      counts.set(d.picked, (counts.get(d.picked) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    // Écart au seuil théorique de 1/6 : tolérance large, on teste l'absence
    // de biais grossier, pas la qualité du générateur.
    for (const n of counts.values()) expect(n / 6000).toBeGreaterThan(0.12)
    for (const n of counts.values()) expect(n / 6000).toBeLessThan(0.21)
  })

  it('déclare n’avoir appliqué aucune contrainte', () => {
    const d = castFirst(SIX, createRandom('g').characters)
    expect(d.applied).toEqual([])
    expect(d.relaxed).toEqual([])
    expect(d.eligible).toHaveLength(6)
  })
})

describe('tirages suivants', () => {
  it('ne retire jamais un personnage déjà incarné', () => {
    for (let i = 0; i < 200; i++) {
      const d = castNext(SIX, ['claire', 'marc-anne'], 9, createRandom(`g${i}`).characters)
      expect(['claire', 'marc-anne']).not.toContain(d.picked)
    }
  })

  it('privilégie un écart d’au moins trois déciles', () => {
    const d = castNext(SIX, ['claire'], 2, createRandom('g').characters)
    expect(Math.abs(SIX.find((c) => c.id === d.picked)!.incomeDecile - 2)).toBeGreaterThanOrEqual(3)
    expect(d.relaxed).toEqual([])
  })

  it('relâche la distance sociale avant la pertinence, dans l’ordre publié', () => {
    // Personne à plus de trois déciles : la contrainte doit céder.
    const serres = [p('a', 5), p('b', 5), p('c', 6)]
    const d = castNext(serres, ['a'], 5, createRandom('g').characters)
    expect(d.relaxed).toContain('social_distance')
    expect(['b', 'c']).toContain(d.picked)
  })

  it('relâche la pertinence quand aucune règle ne concerne personne', () => {
    const aucun = SIX.map((c) => ({ ...c, concernedByRule: false }))
    const d = castNext(aucun, ['claire'], 2, createRandom('g').characters)
    expect(d.relaxed).toContain('concerned_by_a_rule')
    expect(d.picked).not.toBe('claire')
  })

  it('ne rejoue un personnage qu’en dernier recours, et le signale', () => {
    const d = castNext([p('seul', 5)], ['seul'], 5, createRandom('g').characters)
    expect(d.picked).toBe('seul')
    expect(d.relaxed).toContain('not_already_played')
  })

  it('reste uniforme parmi les admissibles : pas d’argmax', () => {
    // Trois candidats également admissibles doivent se partager les tirages.
    const pool = [p('x', 9), p('y', 9), p('z', 9), p('ref', 2)]
    const counts = new Map<string, number>()
    for (let i = 0; i < 3000; i++) {
      const d = castNext(pool, ['ref'], 2, createRandom(`g${i}`).characters)
      counts.set(d.picked, (counts.get(d.picked) ?? 0) + 1)
    }
    expect(counts.size).toBe(3)
    for (const n of counts.values()) expect(n / 3000).toBeGreaterThan(0.25)
  })

  it('journalise de quoi auditer le tirage', () => {
    const d = castNext(SIX, ['claire'], 2, createRandom('g').characters)
    expect(d.pool).toHaveLength(6)
    expect(d.eligible.length).toBeGreaterThan(0)
    expect(d.eligible).toContain(d.picked)
    expect(d.uniform).toBe(true)
  })

  it('est déterministe à graine égale', () => {
    const a = castNext(SIX, ['claire'], 2, createRandom('fixe').characters)
    const b = castNext(SIX, ['claire'], 2, createRandom('fixe').characters)
    expect(a).toEqual(b)
  })
})

describe('transparence', () => {
  it('chaque contrainte du code possède un énoncé public', () => {
    // Une contrainte sans énoncé serait une règle cachée.
    const inCode: ConstraintId[] = ['not_already_played', 'concerned_by_a_rule', 'social_distance']
    for (const id of inCode) {
      expect(CONSTRAINT_STATEMENTS[id]).toBeTruthy()
      expect(CONSTRAINT_STATEMENTS[id].length).toBeGreaterThan(20)
    }
  })

  it('l’ordre de relâchement ne contient que des contraintes réelles', () => {
    for (const id of RELAXATION_ORDER) expect(CONSTRAINT_STATEMENTS[id]).toBeTruthy()
  })
})
