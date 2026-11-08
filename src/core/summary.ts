import type { GameState } from './game.ts'
import {
  answersTo, hesitations, movements, rank, stablePositions,
  JUDGEMENT_LABEL, type Movement, type OpinionEntry, type OpinionLog,
} from './opinion.ts'
import type { Rule } from './world.ts'

/**
 * Le bilan de fin de partie.
 *
 * Il obeit a une regle unique, dont tout le reste decoule : LE JEU NE
 * FORMULE JAMAIS LE DECLIC A LA PLACE DU JOUEUR. Il fournit la
 * juxtaposition brute et se tait.
 *
 * Concretement, ce module ne produit jamais :
 *   - de score, de pourcentage, de jauge, de classement ;
 *   - d'etiquette politique (« tu es plutot… ») ;
 *   - de qualificatif sur un mouvement de position (« revirement »,
 *     « incoherence », « prise de conscience ») ;
 *   - d'affirmation que les donnees ne soutiennent pas.
 *
 * Ce dernier point est le plus facile a trahir. Avec trois reponses, on peut
 * ecrire n'importe quelle phrase qui sonne juste. D'ou un seuil de preuve
 * explicite : en dessous, le bilan DIT qu'il ne peut rien dire.
 */

/**
 * Nombre minimal d'observations avant d'enoncer une tendance.
 *
 * Trois, parce qu'une partie comporte trois actes : en dessous, toute
 * « tendance » decrirait le hasard d'un seul arbitrage.
 */
export const MIN_OBSERVATIONS = 3

export type Decision = {
  readonly rule: Rule
  /** La phrase du joueur, verbatim. Jamais reformulee. */
  readonly wording: string | null
}

export type AttributedMovement = Movement & {
  /**
   * Personnage incarne entre les deux reponses, s'il est identifiable sans
   * ambiguite. `null` quand plusieurs personnages se sont succede : on
   * n'attribue pas un changement d'avis a un personnage au hasard.
   */
  readonly incarnatedBetween: string | null
  /** Phrase descriptive, sans qualificatif. */
  readonly sentence: string
}

export type Summary = {
  readonly decisions: readonly Decision[]
  readonly stable: readonly string[]
  readonly moved: readonly AttributedMovement[]
  readonly hesitated: readonly string[]
  readonly charactersPlayed: readonly string[]
  readonly consultedOthers: number
  /**
   * Vrai quand la partie ne fournit pas assez de matiere pour enoncer quoi
   * que ce soit sur les tendances du joueur. Le bilan le dit alors
   * explicitement, plutot que de produire une phrase qui sonne juste.
   */
  readonly insufficientEvidence: boolean
}

/**
 * Personnage a qui attribuer un changement d'avis.
 *
 * On n'attribue QUE si le joueur a change de personnage entre les deux
 * reponses, et qu'un seul nouveau personnage s'est intercale. Des que
 * plusieurs se sont succede, on s'abstient : designer l'un d'eux serait
 * arbitraire, et le bilan affirmerait quelque chose qu'il ne sait pas.
 */
function incarnatedBetween(state: GameState, from: OpinionEntry, to: OpinionEntry): string | null {
  if (from.characterId === null || to.characterId === null) return null
  if (from.characterId === to.characterId) return null

  // Personnages incarnes strictement entre les deux reponses, bornes incluses
  // pour la seconde : c'est celui qu'on vivait en changeant d'avis.
  const between = state.opinions
    .filter((o) => o.turn > from.turn && o.turn <= to.turn)
    .map((o) => o.characterId)
    .filter((id): id is string => id !== null && id !== from.characterId)

  const distinct = [...new Set(between)]
  return distinct.length === 1 ? distinct[0]! : null
}

/**
 * Phrase decrivant un mouvement.
 *
 * Volontairement plate. Pas de « pourtant », pas de « alors que », pas de
 * « finalement » : ces mots transforment un constat en recit, et un recit
 * porte une morale.
 */
function movementSentence(m: Movement, character: string | null): string {
  const from = JUDGEMENT_LABEL[m.from.judgement]
  const to = JUDGEMENT_LABEL[m.to.judgement]
  const head = character
    ? `Après avoir incarné ${character}, ta réponse est passée de « ${from} » à « ${to} ».`
    : `Ta réponse est passée de « ${from} » à « ${to} ».`
  return m.from.freeText ? `${head} Tu avais d’abord écrit : « ${m.from.freeText} »` : head
}

export function buildSummary(state: GameState): Summary {
  const log: OpinionLog = state.opinions
  const decisions: Decision[] = state.world.rules.map((rule) => ({
    rule,
    wording: rule.playerWording,
  }))

  const moved = movements(log).map((m) => {
    const who = incarnatedBetween(state, m.from, m.to)
    return { ...m, incarnatedBetween: who, sentence: movementSentence(m, who) }
  })

  return {
    decisions,
    stable: stablePositions(log),
    moved,
    hesitated: hesitations(log),
    charactersPlayed: state.castHistory.map((d) => d.picked),
    consultedOthers: state.consultedOthers,
    insufficientEvidence: log.length < MIN_OBSERVATIONS,
  }
}

/**
 * Enonce prudent sur les tendances, ou `null` si la partie n'en soutient
 * aucun.
 *
 * Retourner `null` est le comportement NORMAL d'une partie courte, pas un
 * echec. Une phrase absente vaut mieux qu'une phrase inventee.
 */
export function tendencySentence(summary: Summary): string | null {
  if (summary.insufficientEvidence) return null
  if (summary.moved.length === 0 && summary.stable.length === 0) return null

  if (summary.moved.length === 0) {
    return 'Tes réponses n’ont pas changé au cours de la partie.'
  }
  if (summary.stable.length === 0) {
    return 'Toutes les questions que tu as vues deux fois ont reçu une réponse différente la seconde fois.'
  }
  return `Sur ${summary.stable.length + summary.moved.length} questions revues, ${summary.moved.length} ont reçu une réponse différente.`
}

/** Ecart ordinal total parcouru. Sert a l'affichage, jamais a noter. */
export const totalMovement = (summary: Summary): number =>
  summary.moved.reduce((sum, m) => sum + Math.abs(m.delta), 0)

/**
 * La question KPI, posee hors de tout contexte politique.
 *
 * C'est le seul endroit du jeu ou l'on mesure quelque chose, et ce qu'on
 * mesure est l'objectif du projet — pas l'opinion du joueur.
 */
export const KPI_QUESTION =
  'Y a-t-il eu un moment, pendant cette partie, où tu t’es dit que tu n’avais pas réalisé qu’une décision pouvait être vécue comme ça par quelqu’un d’autre ?'

export const KPI_OPTIONS = ['oui', 'plutôt oui', 'plutôt non', 'non'] as const
export type KpiAnswer = (typeof KPI_OPTIONS)[number]

export { rank, answersTo }
