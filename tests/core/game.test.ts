import { describe, expect, it } from 'vitest'
import {
  ACT_COUNT, apply, answersFor, initialState, isLastAct,
  lastJudgement, replay, type Command, type GameState,
} from '@/core/game.ts'
import type { Rule } from '@/core/world.ts'
import type { Draw } from '@/core/casting.ts'

const start: Command = {
  type: 'start', seed: 'g', contentVersion: '0.1.0', hypothesisSetId: 'sensibilite-faible',
}

const draw = (picked: string): Draw => ({
  picked, pool: ['claire', 'marc-anne'], eligible: [picked],
  applied: ['not_already_played'], relaxed: [], uniform: true,
})

const rule: Rule = {
  id: 'r1', reformId: 'ref', optionId: 'opt', shortLabel: 'Contribution énergie',
  playerWording: 'celui qui consomme doit payer', playerJudgement: null,
  diegeticMonth: 'avril 2027', replaces: null, status: 'in_force',
}

const JOURNAL: Command[] = [
  start,
  { type: 'cast', draw: draw('claire') },
  { type: 'advance_month', month: '2027-03' },
  { type: 'resolve_event', eventId: 'chaudiere', optionId: 'etaler' },
  { type: 'vote', rule },
  { type: 'answer', entry: { questionId: 'ref', judgement: 'rather_yes', freeText: 'ma phrase', turn: 1, context: '' } },
  { type: 'emit_callback', ruleId: 'r1', sign: 'unfavourable' },
  { type: 'cast', draw: draw('marc-anne') },
  { type: 'answer', entry: { questionId: 'ref', judgement: 'rather_no', freeText: null, turn: 2, context: '' } },
]

describe('journal de commandes', () => {
  it('reconstruit l’état entier par rejeu', () => {
    const s = replay(JOURNAL)
    expect(s.act).toBe(2)
    expect(s.currentCharacterId).toBe('marc-anne')
    expect(s.world.rules).toHaveLength(1)
    expect(s.opinions).toHaveLength(2)
    expect(s.resolvedEvents).toEqual([{ eventId: 'chaudiere', optionId: 'etaler' }])
    expect(s.callbackSigns).toEqual(['unfavourable'])
  })

  it('rejoue à l’identique : une partie est auditable après coup', () => {
    expect(replay(JOURNAL)).toEqual(replay(JOURNAL))
  })

  it('refuse un journal qui ne commence pas par « start »', () => {
    expect(() => replay([{ type: 'advance_month', month: '2027-01' }])).toThrow(/commence toujours/)
  })

  it('ne persiste rien de calculé : l’état se déduit entièrement du journal', () => {
    // Rejouer un préfixe donne exactement l'état intermédiaire.
    const prefix = JOURNAL.slice(0, 5)
    const s = replay(prefix)
    expect(s.world.rules).toHaveLength(1)
    expect(s.opinions).toHaveLength(0)
    expect(s.act).toBe(1)
  })

  it('est immuable : appliquer une commande ne modifie pas l’état précédent', () => {
    const before = initialState('g', '0.1.0', 'h')
    const after = apply(before, { type: 'cast', draw: draw('claire') })
    expect(before.act).toBe(0)
    expect(before.castHistory).toHaveLength(0)
    expect(after).not.toBe(before)
  })
})

describe('structure de la partie', () => {
  it('un nouveau personnage ouvre un acte', () => {
    let s: GameState = initialState('g', '0.1.0', 'h')
    s = apply(s, { type: 'cast', draw: draw('claire') })
    expect(s.act).toBe(1)
    s = apply(s, { type: 'cast', draw: draw('marc-anne') })
    expect(s.act).toBe(2)
  })

  it('compte trois actes, et non deux', () => {
    // Avec deux personnages le joueur perçoit un piège ; avec trois, un
    // système. C'est une décision de conception, pas un paramètre.
    expect(ACT_COUNT).toBe(3)
    let s: GameState = initialState('g', '0.1.0', 'h')
    for (const id of ['a', 'b']) s = apply(s, { type: 'cast', draw: draw(id) })
    expect(isLastAct(s)).toBe(false)
    s = apply(s, { type: 'cast', draw: draw('c') })
    expect(isLastAct(s)).toBe(true)
  })

  it('conserve l’historique complet des tirages, pour pouvoir les montrer', () => {
    const s = replay(JOURNAL)
    expect(s.castHistory).toHaveLength(2)
    expect(s.castHistory[0]?.applied).toContain('not_already_played')
  })

  it('journalise la consultation des autres fiches sans la décourager', () => {
    let s = initialState('g', '0.1.0', 'h')
    s = apply(s, { type: 'open_other_characters' })
    s = apply(s, { type: 'open_other_characters' })
    expect(s.consultedOthers).toBe(2)
  })
})

describe('positions au fil de la partie', () => {
  it('retrouve toutes les réponses à une question, dans l’ordre', () => {
    const s = replay(JOURNAL)
    expect(answersFor(s, 'ref').map((a) => a.judgement)).toEqual(['rather_yes', 'rather_no'])
  })

  it('retourne la dernière position connue', () => {
    expect(lastJudgement(replay(JOURNAL), 'ref')).toBe('rather_no')
    expect(lastJudgement(replay(JOURNAL), 'inconnue')).toBeNull()
  })
})
