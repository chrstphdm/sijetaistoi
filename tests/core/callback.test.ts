import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  describeComposition, respectsSignQuota, selectCallback, signOf,
  unfavourableCap, withSign, type CallbackCandidate, type CallbackSign,
} from '@/core/callback.ts'
import { createRandom } from '@/core/rng.ts'
import { euros } from '@/core/money.ts'
import type { Rule } from '@/core/world.ts'

const rule: Rule = {
  id: 'r1', reformId: 'ref', optionId: 'opt', shortLabel: 'Contribution énergie',
  playerWording: 'celui qui consomme doit payer', playerJudgement: 'rather_yes',
  diegeticMonth: '2027-04', replaces: null, status: 'in_force',
}

const candidate = (deltaCents: number, characterId = 'claire'): CallbackCandidate => ({
  rule, characterId, deltaCents, here: 'ici', elsewhere: 'ailleurs',
})

describe('signe d’un rappel', () => {
  it('classe selon la perceptibilité, pas selon le signe arithmétique seul', () => {
    expect(signOf(euros(-27))).toBe('unfavourable')
    expect(signOf(euros(31))).toBe('favourable')
    // Sous le seuil : l'effet existe mais ne se vit pas.
    expect(signOf(euros(-3))).toBe('neutral')
    expect(signOf(0)).toBe('neutral')
  })

  it('est symétrique autour de zéro', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500_000 }), (m) => {
        const a = signOf(m)
        const b = signOf(-m)
        if (a === 'neutral') expect(b).toBe('neutral')
        else expect(b).toBe(a === 'favourable' ? 'unfavourable' : 'favourable')
      }),
    )
  })
})

describe('quota de signe — règle S1', () => {
  it('plafonne les rappels défavorables à la moitié, arrondie au supérieur', () => {
    expect(unfavourableCap(1)).toBe(1)
    expect(unfavourableCap(2)).toBe(1)
    expect(unfavourableCap(3)).toBe(2)
    expect(unfavourableCap(4)).toBe(2)
  })

  it('autorise toujours un rappel favorable ou neutre', () => {
    const history: CallbackSign[] = ['unfavourable', 'unfavourable', 'unfavourable']
    expect(respectsSignQuota(history, 'favourable')).toBe(true)
    expect(respectsSignQuota(history, 'neutral')).toBe(true)
  })

  it('refuse un défavorable qui ferait franchir le plafond', () => {
    expect(respectsSignQuota([], 'unfavourable')).toBe(true)
    expect(respectsSignQuota(['unfavourable'], 'unfavourable')).toBe(false)
    expect(respectsSignQuota(['unfavourable', 'favourable'], 'unfavourable')).toBe(true)
  })

  it('tient sur une partie entière, quelle que soit la suite tirée', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -200_00, max: 200_00 }), { maxLength: 30 }), (deltas) => {
        const r = createRandom('propriete')
        const history: CallbackSign[] = []
        for (const d of deltas) {
          const sel = selectCallback([candidate(d)], history, r.presentation)
          if (sel.kind === 'selected') history.push(sel.callback.sign)
        }
        expect(describeComposition(history).withinCap).toBe(true)
      }),
    )
  })
})

describe('sélection d’un rappel', () => {
  it('signale explicitement quand aucun candidat ne respecte le quota', () => {
    // Le moteur ne viole JAMAIS la règle en silence : il remonte le blocage,
    // et l'interface le dit au joueur.
    const sel = selectCallback([candidate(euros(-50))], ['unfavourable'], createRandom('g').presentation)
    expect(sel.kind).toBe('quota_blocked')
    if (sel.kind === 'quota_blocked') expect(sel.blocked).toHaveLength(1)
  })

  it('distingue « aucun candidat » de « quota bloquant »', () => {
    expect(selectCallback([], [], createRandom('g').presentation).kind).toBe('none_available')
  })

  it('n’est pas un argmax de douleur : le plus coûteux n’est pas privilégié', () => {
    // Sur 400 tirages, le candidat le plus douloureux ne doit pas dominer.
    const cands = [candidate(euros(-5), 'a'), candidate(euros(-50), 'b'), candidate(euros(-500), 'c')]
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 400; i++) {
      const sel = selectCallback(cands, ['unfavourable', 'favourable'], createRandom(`g${i}`).presentation)
      if (sel.kind === 'selected') counts[sel.callback.characterId] = (counts[sel.callback.characterId] ?? 0) + 1
    }
    const total = counts.a! + counts.b! + counts.c!
    expect(total).toBe(400)
    // Chacun doit être tiré une part substantielle du temps.
    for (const k of ['a', 'b', 'c']) expect(counts[k]! / total).toBeGreaterThan(0.2)
  })

  it('est déterministe à graine égale', () => {
    const cands = [candidate(euros(-5), 'a'), candidate(euros(-50), 'b')]
    const one = selectCallback(cands, ['favourable'], createRandom('fixe').presentation)
    const two = selectCallback(cands, ['favourable'], createRandom('fixe').presentation)
    expect(one).toEqual(two)
  })

  it('conserve la formulation du joueur dans le rappel', () => {
    const sel = selectCallback([candidate(euros(-27))], [], createRandom('g').presentation)
    expect(sel.kind).toBe('selected')
    if (sel.kind === 'selected')
      expect(sel.callback.rule.playerWording).toBe('celui qui consomme doit payer')
  })

  it('porte toujours les deux volets : ici ET ailleurs', () => {
    const c = withSign(candidate(euros(-27)))
    expect(c.here).toBeTruthy()
    expect(c.elsewhere).toBeTruthy()
  })
})
