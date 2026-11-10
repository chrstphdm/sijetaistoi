import type { Command } from '@/core/game.ts'
import { JUDGEMENT_LABEL } from '@/core/opinion.ts'
import { characters, events, reforms } from '@/content/load.ts'

/**
 * « Ce qui s'est passé » : la partie relue, en lecture seule.
 *
 * Pas de bouton « précédent » qui permettrait de revenir CHANGER un choix :
 * voter, voir l'effet sur chacun, puis revenir modifier son vote reviendrait
 * à optimiser au lieu de vivre la conséquence, et le jeu perdrait son objet.
 * Relire, en revanche, est utile : se rappeler une question, un choix, la
 * phrase qu'on avait écrite.
 *
 * Tout est relu dans le journal de commandes, la seule source de vérité de
 * la partie : rien n'est tenu à part, rien ne peut diverger.
 */

export type HistoryAct = {
  readonly act: number
  readonly who: string
  readonly months: readonly { readonly event: string; readonly choice: string }[]
  readonly decision: {
    readonly question: string
    readonly choice: string
    readonly wording: string | null
    readonly judgement: string | null
  } | null
  /** Réponses données plus tard à une question déjà posée (la relance). */
  readonly relaunches: readonly { readonly question: string; readonly judgement: string }[]
}

const nameOf = (id: string) => characters.find((c) => c.id === id)?.identity.firstName ?? id
const reformTitle = (id: string) => reforms.find((r) => r.id === id)?.descriptiveTitle ?? id

export function buildHistory(journal: readonly Command[]): HistoryAct[] {
  const acts: {
    act: number; who: string
    months: { event: string; choice: string }[]
    decision: { reformId: string; question: string; choice: string; wording: string | null; judgement: string | null } | null
    relaunches: { question: string; judgement: string }[]
  }[] = []
  const current = () => acts[acts.length - 1]

  for (const c of journal) {
    if (c.type === 'cast') {
      acts.push({ act: acts.length + 1, who: nameOf(c.draw.picked), months: [], decision: null, relaunches: [] })
    } else if (c.type === 'resolve_event' && current()) {
      const e = events.find((x) => x.id === c.eventId)
      current()!.months.push({
        event: e?.descriptiveTitle ?? c.eventId,
        choice: e?.options.find((o) => o.id === c.optionId)?.label ?? c.optionId,
      })
    } else if (c.type === 'vote' && current()) {
      current()!.decision = {
        reformId: c.rule.reformId,
        question: reformTitle(c.rule.reformId),
        choice: c.rule.shortLabel,
        wording: c.rule.playerWording,
        judgement: null,
      }
    } else if (c.type === 'answer' && current()) {
      const act = current()!
      const label = JUDGEMENT_LABEL[c.entry.judgement]
      // Le premier avis sur la décision de l'acte ; un avis sur une autre
      // question est une relance.
      if (act.decision && act.decision.reformId === c.entry.questionId && act.decision.judgement === null)
        act.decision.judgement = label
      else act.relaunches.push({ question: reformTitle(c.entry.questionId), judgement: label })
    }
  }
  return acts.map(({ decision, ...rest }) => ({
    ...rest,
    decision: decision && {
      question: decision.question, choice: decision.choice,
      wording: decision.wording, judgement: decision.judgement,
    },
  }))
}
