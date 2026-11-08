/**
 * Positions du joueur, et leur evolution.
 *
 * Deux exigences gouvernent ce module :
 *
 *   1. SEPARATION. Les positions sont des opinions politiques, donc des
 *      donnees sensibles au sens de l'article 9 du RGPD. Elles vivent dans
 *      leur propre magasin, jamais melangees a l'etat de partie, et ne sont
 *      pas exportees avec lui par defaut.
 *
 *   2. DESCRIPTION, JAMAIS JUGEMENT. Le jeu constate qu'une position a
 *      change. Il ne dit pas que c'est un progres, une incoherence, ni une
 *      prise de conscience. Le vocabulaire de ce module est volontairement
 *      neutre : « mouvement », pas « revirement ».
 */

export const SCALE = ['no', 'rather_no', 'dont_know', 'rather_yes', 'yes'] as const
export type Judgement = (typeof SCALE)[number]

export const JUDGEMENT_LABEL: Readonly<Record<Judgement, string>> = {
  no: 'non',
  rather_no: 'plutôt non',
  dont_know: 'je ne sais pas',
  rather_yes: 'plutôt oui',
  yes: 'oui',
}

export type OpinionEntry = {
  readonly questionId: string
  readonly judgement: Judgement
  /** Texte libre du joueur. Jamais reformule, jamais resume. */
  readonly freeText: string | null
  /** Rang du tour, et non horodatage : le moteur reste pur. */
  readonly turn: number
  /**
   * Personnage incarne au moment de la reponse.
   *
   * Indispensable pour attribuer correctement un changement d'avis dans le
   * bilan. Le deduire apres coup de l'historique des tirages donnerait une
   * attribution approximative — et affirmer « apres avoir incarne Yanis »
   * alors que c'etait quelqu'un d'autre serait une affirmation fausse sur
   * le joueur, exactement ce que le projet s'interdit.
   */
  readonly characterId: string | null
  /** Ce que le joueur avait vu ou vecu au moment de repondre. */
  readonly context: string
}

export type OpinionLog = readonly OpinionEntry[]

/**
 * Position ordinale sur l'echelle, pour mesurer un ecart.
 * « je ne sais pas » est AU MILIEU, et non hors echelle : passer de
 * « plutot oui » a « je ne sais pas » est un mouvement, pas une absence.
 */
export const rank = (j: Judgement): number => SCALE.indexOf(j)

export type Movement = {
  readonly questionId: string
  readonly from: OpinionEntry
  readonly to: OpinionEntry
  /** Negatif : vers le refus. Positif : vers l'accord. */
  readonly delta: number
}

/** Toutes les reponses a une question, dans l'ordre. */
export const answersTo = (log: OpinionLog, questionId: string): OpinionLog =>
  log.filter((e) => e.questionId === questionId).sort((a, b) => a.turn - b.turn)

/**
 * Mouvements constates : une question repondue au moins deux fois, dont la
 * premiere et la derniere reponse different.
 */
export function movements(log: OpinionLog): readonly Movement[] {
  const ids = [...new Set(log.map((e) => e.questionId))]
  const out: Movement[] = []
  for (const questionId of ids) {
    const answers = answersTo(log, questionId)
    const first = answers[0]
    const last = answers[answers.length - 1]
    if (!first || !last || answers.length < 2) continue
    const delta = rank(last.judgement) - rank(first.judgement)
    if (delta !== 0) out.push({ questionId, from: first, to: last, delta })
  }
  return out
}

/** Questions repondues au moins deux fois sans que la position bouge. */
export function stablePositions(log: OpinionLog): readonly string[] {
  return [...new Set(log.map((e) => e.questionId))].filter((id) => {
    const a = answersTo(log, id)
    return a.length >= 2 && new Set(a.map((e) => e.judgement)).size === 1
  })
}

/**
 * Hesitations : questions ou le joueur a repondu « je ne sais pas », ou a
 * change de position plus d'une fois.
 */
export function hesitations(log: OpinionLog): readonly string[] {
  return [...new Set(log.map((e) => e.questionId))].filter((id) => {
    const a = answersTo(log, id)
    if (a.some((e) => e.judgement === 'dont_know')) return true
    let changes = 0
    for (let i = 1; i < a.length; i++) if (a[i]!.judgement !== a[i - 1]!.judgement) changes++
    return changes > 1
  })
}

/**
 * Phrase de relance, affichee quand on repose une question deja repondue.
 *
 * Elle rappelle la position precedente et la cite, sans la commenter.
 * Aucun « pourtant », aucun « alors que » : ces mots transformeraient un
 * constat en reproche.
 */
export function relaunchSentence(previous: OpinionEntry, elapsedLabel: string): string {
  const label = JUDGEMENT_LABEL[previous.judgement]
  const quote = previous.freeText ? ` Tu avais écrit : « ${previous.freeText} ».` : ''
  return `${elapsedLabel}, ta réponse était « ${label} ».${quote} Qu’en penses-tu maintenant ?`
}
