import { describe, expect, it } from 'vitest'
import {
  answersTo, hesitations, movements, rank, relaunchSentence,
  stablePositions, type OpinionEntry,
} from '@/core/opinion.ts'

const entry = (over: Partial<OpinionEntry> & Pick<OpinionEntry, 'questionId' | 'judgement' | 'turn'>): OpinionEntry => ({
  freeText: null,
  characterId: null,
  context: '',
  ...over,
})

describe('échelle', () => {
  it('place « je ne sais pas » au milieu et non hors échelle', () => {
    // Passer de « plutôt oui » à « je ne sais pas » est un mouvement, pas
    // une absence de réponse.
    expect(rank('dont_know')).toBe(2)
    expect(rank('no')).toBeLessThan(rank('dont_know'))
    expect(rank('yes')).toBeGreaterThan(rank('dont_know'))
  })
})

describe('mouvements de position', () => {
  it('détecte un déplacement entre la première et la dernière réponse', () => {
    const log = [
      entry({ questionId: 'q1', judgement: 'rather_yes', turn: 1 }),
      entry({ questionId: 'q1', judgement: 'rather_no', turn: 5 }),
    ]
    const m = movements(log)
    expect(m).toHaveLength(1)
    expect(m[0]?.delta).toBe(-2)
  })

  it('ignore une question répondue une seule fois', () => {
    expect(movements([entry({ questionId: 'q1', judgement: 'yes', turn: 1 })])).toHaveLength(0)
  })

  it('ne signale rien quand la position revient à son point de départ', () => {
    const log = [
      entry({ questionId: 'q1', judgement: 'yes', turn: 1 }),
      entry({ questionId: 'q1', judgement: 'no', turn: 2 }),
      entry({ questionId: 'q1', judgement: 'yes', turn: 3 }),
    ]
    expect(movements(log)).toHaveLength(0)
    // Mais l'aller-retour compte comme une hésitation.
    expect(hesitations(log)).toContain('q1')
  })

  it('trie par tour, quel que soit l’ordre d’insertion', () => {
    const log = [
      entry({ questionId: 'q1', judgement: 'no', turn: 9 }),
      entry({ questionId: 'q1', judgement: 'yes', turn: 2 }),
    ]
    expect(answersTo(log, 'q1').map((e) => e.turn)).toEqual([2, 9])
    expect(movements(log)[0]?.delta).toBe(rank('no') - rank('yes'))
  })
})

describe('positions stables et hésitations', () => {
  it('relève une position inchangée répondue plusieurs fois', () => {
    const log = [
      entry({ questionId: 'q1', judgement: 'yes', turn: 1 }),
      entry({ questionId: 'q1', judgement: 'yes', turn: 4 }),
    ]
    expect(stablePositions(log)).toEqual(['q1'])
    expect(movements(log)).toHaveLength(0)
  })

  it('compte « je ne sais pas » comme une hésitation', () => {
    expect(hesitations([entry({ questionId: 'q1', judgement: 'dont_know', turn: 1 })])).toEqual(['q1'])
  })
})

describe('relance', () => {
  it('cite la position précédente et le texte du joueur, sans le commenter', () => {
    const previous = entry({
      questionId: 'q1', judgement: 'rather_yes', turn: 1,
      freeText: 'les études sont un investissement',
    })
    const s = relaunchSentence(previous, 'Il y a douze minutes')
    expect(s).toBe(
      'Il y a douze minutes, ta réponse était « plutôt oui ». ' +
      'Tu avais écrit : « les études sont un investissement ». Qu’en penses-tu maintenant ?',
    )
    // Aucun mot de reproche dans le CADRE posé par le jeu. L'assertion
    // porte sur la phrase privée de la citation : ce que le joueur écrit
    // lui appartient et n'a pas à être filtré.
    const frame = s.replace(/« [^»]* »/g, '')
    for (const word of ['pourtant', 'alors que', 'contradiction', 'incohérent']) {
      expect(frame.toLowerCase()).not.toContain(word)
    }
  })

  it('reste correcte quand le joueur n’a rien écrit', () => {
    const previous = entry({ questionId: 'q1', judgement: 'no', turn: 1 })
    expect(relaunchSentence(previous, 'Tout à l’heure')).toBe(
      'Tout à l’heure, ta réponse était « non ». Qu’en penses-tu maintenant ?',
    )
  })
})
