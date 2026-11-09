import type { MonthlyBudget } from '@/core/types.ts'
import { euros, type Cents } from '@/core/money.ts'
import type { LifeEventT } from '@/schemas/index.ts'

/**
 * Journal des mois vecus dans l'acte en cours, pour le releve lateral.
 *
 * Il ne decrit AUCUNE decision — le journal de commandes reste la seule
 * source de verite du bilan. Il garde seulement, mois par mois, la
 * repartition du releve que le joueur avait sous les yeux, et la somme
 * exceptionnelle du mois. C'est ce qui permet de montrer une evolution sans
 * recalculer le passe.
 *
 * Il ne garde PAS de « reste a vivre » isole : tracer le solde seul, mois
 * apres mois, le ferait lire comme un score qui monte ou qui baisse selon
 * qu'on a « bien joue ». On garde la repartition entiere, qui se lit comme
 * le releve lui-meme.
 */
export type MonthEntry = {
  readonly month: string
  readonly resourcesCents: Cents
  /** Valeurs absolues, comme la barre du releve. */
  readonly engagedCents: Cents
  readonly adjustableCents: Cents
  readonly slackCents: Cents
  /** Somme exceptionnelle du mois, signee : positive si elle entre. */
  readonly exceptionalCents: Cents | null
  /** Titre de l'evenement du mois, s'il y en a eu un. */
  readonly label: string | null
}

export function entryOf(budget: MonthlyBudget, month: string): Omit<MonthEntry, 'exceptionalCents' | 'label'> {
  return {
    month,
    resourcesCents: budget.resourcesCents,
    engagedCents: Math.abs(budget.constrainedCents + budget.leviesCents),
    adjustableCents: Math.abs(budget.adjustableCents),
    slackCents: budget.slackCents,
  }
}

/**
 * Ce que l'option choisie fait entrer ou sortir CE mois-ci.
 *
 * Convention du contenu : un montant positif est une sortie, un montant
 * negatif une entree. Une somme etalee ne compte que pour sa premiere
 * mensualite ; un effet recurrent n'est pas exceptionnel, il modifie le
 * releve des mois suivants. Sans effet ponctuel, `null` : « rien
 * d'exceptionnel » n'est pas « zero euro ».
 */
export function exceptionalOf(event: LifeEventT | null, optionId: string | null): Cents | null {
  if (!event || !optionId) return null
  const option = event.options.find((o) => o.id === optionId)
  if (!option) return null
  let out = 0
  let any = false
  for (const f of option.effects ?? []) {
    if (f.type === 'one_off') { out += euros(f.amount); any = true }
    if (f.type === 'spread') { out += euros(f.amount / f.months); any = true }
  }
  return any ? -out : null
}
