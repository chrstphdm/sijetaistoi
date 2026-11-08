import { applyRule, emptyWorld, type Rule, type WorldState } from './world.ts'
import type { CallbackSign } from './callback.ts'
import type { Judgement, OpinionEntry } from './opinion.ts'
import type { Draw } from './casting.ts'

/**
 * La partie est un JOURNAL DE COMMANDES, et rien d'autre.
 *
 *   state = journal.reduce(apply, initialState(seed, contentVersion))
 *
 * Rien de calcule n'est persiste. Trois consequences, toutes recherchees :
 *
 *   - une sauvegarde est minuscule et lisible ;
 *   - une partie est rejouable a l'identique, donc auditable : on peut
 *     montrer au joueur, apres coup, pourquoi il a tire tel personnage ;
 *   - le mode groupe futur devient trivial, puisqu'il suffit de rejouer le
 *     meme journal pour plusieurs participants.
 *
 * Le reducteur est PUR : aucune date, aucun aleatoire, aucun acces au DOM.
 * Les tirages sont effectues en amont et entrent dans le journal comme des
 * faits accomplis, ce qui les rend verifiables.
 */

export type Command =
  | { readonly type: 'start'; readonly seed: string; readonly contentVersion: string; readonly hypothesisSetId: string }
  | { readonly type: 'cast'; readonly draw: Draw }
  | { readonly type: 'advance_month'; readonly month: string }
  | { readonly type: 'resolve_event'; readonly eventId: string; readonly optionId: string }
  | { readonly type: 'vote'; readonly rule: Rule }
  | { readonly type: 'answer'; readonly entry: OpinionEntry }
  | { readonly type: 'emit_callback'; readonly ruleId: string; readonly sign: CallbackSign }
  | { readonly type: 'open_other_characters' }
  | { readonly type: 'end' }

export type GameState = {
  readonly seed: string
  readonly contentVersion: string
  readonly world: WorldState
  readonly act: number
  readonly month: string | null
  readonly castHistory: readonly Draw[]
  readonly currentCharacterId: string | null
  readonly resolvedEvents: readonly { readonly eventId: string; readonly optionId: string }[]
  readonly opinions: readonly OpinionEntry[]
  readonly callbackSigns: readonly CallbackSign[]
  /**
   * Le joueur a-t-il consulte les fiches des autres personnages ?
   * Journalise pour le bilan — « tu avais lu la fiche de Léa avant de voter »
   * — et jamais pour l'en dissuader.
   */
  readonly consultedOthers: number
  readonly finished: boolean
}

export function initialState(seed: string, contentVersion: string, hypothesisSetId: string): GameState {
  return {
    seed,
    contentVersion,
    world: emptyWorld(hypothesisSetId),
    act: 0,
    month: null,
    castHistory: [],
    currentCharacterId: null,
    resolvedEvents: [],
    opinions: [],
    callbackSigns: [],
    consultedOthers: 0,
    finished: false,
  }
}

export function apply(state: GameState, command: Command): GameState {
  switch (command.type) {
    case 'start':
      return initialState(command.seed, command.contentVersion, command.hypothesisSetId)

    case 'cast':
      // Un nouveau personnage ouvre un acte : les deux sont indissociables.
      return {
        ...state,
        act: state.act + 1,
        currentCharacterId: command.draw.picked,
        castHistory: [...state.castHistory, command.draw],
      }

    case 'advance_month':
      return { ...state, month: command.month }

    case 'resolve_event':
      return {
        ...state,
        resolvedEvents: [
          ...state.resolvedEvents,
          { eventId: command.eventId, optionId: command.optionId },
        ],
      }

    case 'vote':
      return { ...state, world: applyRule(state.world, command.rule) }

    case 'answer':
      return { ...state, opinions: [...state.opinions, command.entry] }

    case 'emit_callback':
      return { ...state, callbackSigns: [...state.callbackSigns, command.sign] }

    case 'open_other_characters':
      return { ...state, consultedOthers: state.consultedOthers + 1 }

    case 'end':
      return { ...state, finished: true }
  }
}

/** Rejoue un journal depuis le debut. C'est l'unique facon de charger une partie. */
export function replay(journal: readonly Command[]): GameState {
  const first = journal[0]
  if (first?.type !== 'start') {
    throw new Error('un journal commence toujours par « start »')
  }
  return journal.reduce(apply, initialState(first.seed, first.contentVersion, first.hypothesisSetId))
}

/* ------------------------------------------------------------------ */
/* Structure de la partie                                             */
/* ------------------------------------------------------------------ */

/**
 * Trois actes, et non deux.
 *
 * Avec deux personnages, le joueur percoit un piege : on lui a montre
 * l'envers de sa decision. Avec trois, il percoit un systeme. C'est la
 * difference entre se sentir pris en faute et comprendre un arbitrage.
 */
export const ACT_COUNT = 3

/** Mois vecus par acte : le premier personnage a besoin de plus de temps. */
export const MONTHS_PER_ACT = [3, 3, 2] as const

export const isLastAct = (state: GameState): boolean => state.act >= ACT_COUNT

export function answersFor(state: GameState, questionId: string): readonly OpinionEntry[] {
  return state.opinions.filter((o) => o.questionId === questionId)
}

export function lastJudgement(state: GameState, questionId: string): Judgement | null {
  const answers = answersFor(state, questionId)
  return answers[answers.length - 1]?.judgement ?? null
}
