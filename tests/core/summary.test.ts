import { describe, expect, it } from 'vitest'
import {
  buildSummary, KPI_OPTIONS, KPI_QUESTION, MIN_OBSERVATIONS,
  tendencySentence, totalMovement,
} from '@/core/summary.ts'
import { apply, initialState, type Command, type GameState } from '@/core/game.ts'
import type { Draw } from '@/core/casting.ts'
import type { Rule } from '@/core/world.ts'
import type { Judgement } from '@/core/opinion.ts'

const draw = (picked: string): Draw => ({
  picked, pool: ['claire', 'marc-anne', 'michele'], eligible: [picked],
  applied: [], relaxed: [], uniform: true,
})

const rule = (id: string, wording: string | null): Rule => ({
  id, reformId: 'ref', optionId: 'opt', shortLabel: 'Contribution énergie',
  playerWording: wording, playerJudgement: null, diegeticMonth: 'avril 2027',
  replaces: null, status: 'in_force',
})

const answer = (
  judgement: Judgement, turn: number, characterId: string | null = null,
  freeText: string | null = null,
): Command => ({
  type: 'answer',
  entry: { questionId: 'ref', judgement, freeText, turn, characterId, context: '' },
})

const build = (commands: Command[]): GameState =>
  commands.reduce(apply, initialState('g', '0.1.0', 'h'))

describe('le bilan ne note jamais', () => {
  const state = build([
    { type: 'cast', draw: draw('claire') },
    { type: 'vote', rule: rule('r1', 'celui qui consomme doit payer') },
    answer('rather_yes', 1, 'claire', 'celui qui consomme doit payer'),
    { type: 'cast', draw: draw('marc-anne') },
    answer('rather_no', 2, 'marc-anne'),
    { type: 'cast', draw: draw('michele') },
    answer('no', 3, 'michele'),
  ])
  const summary = buildSummary(state)

  it('ne produit aucun score ni pourcentage d’orientation politique', () => {
    const serialised = JSON.stringify(summary)
    for (const forbidden of ['score', 'gauche', 'droite', 'centre', '%', 'niveau', 'rang']) {
      expect(serialised.toLowerCase()).not.toContain(forbidden)
    }
  })

  it('ne qualifie jamais un mouvement de position', () => {
    for (const m of summary.moved) {
      for (const word of ['revirement', 'incohérent', 'contradiction', 'prise de conscience', 'pourtant', 'enfin', 'finalement']) {
        expect(m.sentence.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('restitue les décisions avec la phrase du joueur, mot pour mot', () => {
    expect(summary.decisions).toHaveLength(1)
    expect(summary.decisions[0]?.wording).toBe('celui qui consomme doit payer')
  })

  it('liste les personnages incarnés, dans l’ordre', () => {
    expect(summary.charactersPlayed).toEqual(['claire', 'marc-anne', 'michele'])
  })
})

describe('seuil de preuve', () => {
  it('refuse d’énoncer une tendance sur trop peu de réponses', () => {
    // Avec deux réponses on peut écrire n'importe quelle phrase qui sonne
    // juste. Le bilan doit se taire plutôt que d'inventer.
    const s = buildSummary(build([answer('yes', 1, 'claire'), answer('no', 2, 'claire')]))
    expect(s.insufficientEvidence).toBe(true)
    expect(tendencySentence(s)).toBeNull()
  })

  it('accepte d’énoncer une tendance au-delà du seuil', () => {
    const s = buildSummary(build([answer('yes', 1, 'claire'), answer('yes', 2, 'claire'), answer('yes', 3, 'claire')]))
    expect(s.insufficientEvidence).toBe(false)
    expect(tendencySentence(s)).toBe('Tes réponses n’ont pas changé au cours de la partie.')
  })

  it('le seuil vaut trois, soit le nombre d’actes d’une partie', () => {
    expect(MIN_OBSERVATIONS).toBe(3)
  })

  it('se tait aussi quand il n’y a rien à comparer', () => {
    const s = buildSummary(build([answer('yes', 1, 'claire')]))
    expect(tendencySentence(s)).toBeNull()
  })
})

describe('mouvements de position', () => {
  it('attribue un changement au personnage incarné entre les deux réponses', () => {
    const s = buildSummary(build([
      { type: 'cast', draw: draw('claire') },
      answer('rather_yes', 1, 'claire'),
      { type: 'cast', draw: draw('yanis') },
      answer('rather_no', 2, 'yanis'),
      answer('no', 3, 'yanis'),
    ]))
    expect(s.moved).toHaveLength(1)
    expect(s.moved[0]?.incarnatedBetween).toBe('yanis')
    expect(s.moved[0]?.sentence).toContain('Après avoir incarné yanis')
  })

  it('s’abstient d’attribuer quand un seul personnage a été incarné', () => {
    const s = buildSummary(build([
      { type: 'cast', draw: draw('claire') },
      answer('yes', 1, 'claire'), answer('no', 2, 'claire'), answer('no', 3, 'claire'),
    ]))
    expect(s.moved[0]?.incarnatedBetween).toBeNull()
    expect(s.moved[0]?.sentence).not.toContain('Après avoir incarné')
  })

  it('cite la première formulation du joueur dans la phrase du mouvement', () => {
    const s = buildSummary(build([
      { type: 'cast', draw: draw('claire') },
      answer('yes', 1, 'claire', 'les études sont un investissement'),
      { type: 'cast', draw: draw('yanis') },
      answer('no', 2, 'yanis'), answer('no', 3, 'yanis'),
    ]))
    expect(s.moved[0]?.sentence).toContain('« les études sont un investissement »')
  })

  it('mesure l’écart parcouru sans en faire une note', () => {
    const s = buildSummary(build([
      answer('yes', 1, 'claire'), answer('no', 2, 'claire'), answer('no', 3, 'claire'),
    ]))
    expect(totalMovement(s)).toBe(4)
  })
})

describe('question KPI', () => {
  it('mesure l’objectif du projet, et non l’opinion du joueur', () => {
    // Elle ne souffle pas la réponse attendue : la phrase du déclic n'y figure
    // pas, et les deux issues sont offertes à égalité.
    expect(KPI_QUESTION).not.toContain('pas réalisé')
    expect(KPI_QUESTION).toContain('différente')
    expect(KPI_QUESTION).toContain('restée la même')
    for (const word of ['impôt', 'taxe', 'juste', 'politique', 'réforme']) {
      expect(KPI_QUESTION.toLowerCase()).not.toContain(word)
    }
  })

  it('propose quatre réponses, sans « je ne sais pas »', () => {
    // Ici on mesure un fait vécu, pas une position : l'échappatoire n'a pas
    // le même sens que sur l'échelle « bien et juste ».
    expect(KPI_OPTIONS).toHaveLength(4)
    expect(KPI_OPTIONS).not.toContain('je ne sais pas')
  })
})

describe('attribution : ne jamais affirmer ce qu’on ne sait pas', () => {
  const answerAs = (j: Judgement, turn: number, characterId: string): Command => ({
    type: 'answer',
    entry: { questionId: 'ref', judgement: j, freeText: null, turn, characterId, context: '' },
  })

  it('s’abstient quand plusieurs personnages se sont succédé entre deux réponses', () => {
    // Désigner l'un d'eux serait arbitraire. Le bilan doit se taire.
    const s = buildSummary(build([
      { type: 'cast', draw: draw('claire') },
      answerAs('yes', 1, 'claire'),
      { type: 'cast', draw: draw('yanis') },
      answerAs('rather_yes', 2, 'yanis'),
      { type: 'cast', draw: draw('michele') },
      answerAs('no', 3, 'michele'),
    ]))
    expect(s.moved).toHaveLength(1)
    expect(s.moved[0]?.incarnatedBetween).toBeNull()
    expect(s.moved[0]?.sentence).not.toContain('Après avoir incarné')
  })

  it('attribue quand un seul personnage s’est intercalé', () => {
    const s = buildSummary(build([
      { type: 'cast', draw: draw('claire') },
      answerAs('yes', 1, 'claire'),
      { type: 'cast', draw: draw('michele') },
      answerAs('no', 2, 'michele'),
      answerAs('no', 3, 'michele'),
    ]))
    expect(s.moved[0]?.incarnatedBetween).toBe('michele')
  })

  it('n’attribue rien si le personnage n’a pas changé', () => {
    const s = buildSummary(build([
      answerAs('yes', 1, 'claire'), answerAs('no', 2, 'claire'), answerAs('no', 3, 'claire'),
    ]))
    expect(s.moved[0]?.incarnatedBetween).toBeNull()
  })
})
