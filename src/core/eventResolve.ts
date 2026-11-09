import type { LifeEventT, ShareT } from '@/schemas/event.ts'
import type { BudgetLine } from './types.ts'
import { evaluate, type Condition, type TraitBag } from './conditions.ts'

/**
 * Un evenement tel qu'il se presente a CE personnage, ce mois-ci.
 *
 * Le contenu peut exprimer un montant comme une part d'une ligne du releve
 * (voir `Share` dans le schema). Ce module la convertit en euros, sur le
 * releve courant, et rend un evenement aux montants concrets : le reste du
 * jeu — affichage, disponibilite des options, journal des mois — ne voit
 * jamais une part, seulement des euros.
 *
 * Il retire aussi les options dont `availableIf` n'est pas satisfaite. Le
 * champ existait dans le schema et n'etait lu nulle part : une option
 * reservee a qui a un credit s'offrait a tout le monde.
 */

const base = (lines: readonly BudgetLine[], code: string): number =>
  Math.abs(lines.find((l) => l.code === code)?.amountCents ?? 0)

/** Une part, en euros entiers, avec le signe du taux. Zero si sa condition echoue. */
export function shareEuros(share: ShareT, lines: readonly BudgetLine[], traits: TraitBag): number {
  if (share.when && !evaluate(share.when as Condition, traits)) return 0
  return Math.round((share.rate * base(lines, share.of)) / 100)
}

/** « 1 240 € », espace fine insecable comme partout dans le jeu. */
const formatEuro = (n: number) =>
  `${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`

export function resolveEvent(
  event: LifeEventT,
  lines: readonly BudgetLine[],
  traits: TraitBag,
): LifeEventT {
  const cost = event.costShare
    ? event.costShare.reduce((sum, s) => sum + shareEuros(s, lines, traits), 0)
    : event.cost.amount

  const options = event.options
    .filter((o) => !o.availableIf || evaluate(o.availableIf as Condition, traits))
    .map((o) => ({
      ...o,
      effects: o.effects.map((f) =>
        'share' in f && f.share ? { ...f, amount: shareEuros(f.share, lines, traits) } : f,
      ),
    }))

  return {
    ...event,
    cost: { ...event.cost, amount: Math.abs(cost) },
    text: event.costShare ? event.text.replaceAll('{montant}', formatEuro(cost)) : event.text,
    options,
  }
}

/**
 * Un evenement n'a de sens pour ce personnage que s'il met quelque chose en
 * jeu et laisse un choix. Une part d'une ligne absente vaut zero : l'arret
 * maladie ne coute rien a qui n'a pas de revenu d'activite, et ne doit donc
 * pas lui etre propose — meme si l'eligibilite l'avait laisse passer.
 */
export function isMeaningful(resolved: LifeEventT): boolean {
  if (resolved.options.length < 2) return false
  if (resolved.costShare && resolved.cost.amount === 0) return false
  return true
}
