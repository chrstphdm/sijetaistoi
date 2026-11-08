import { sum } from './money.ts'
import type { BudgetLine, LineGroup, MonthlyBudget } from './types.ts'

const of = (lines: readonly BudgetLine[], ...groups: readonly LineGroup[]) =>
  sum(lines.filter((l) => groups.includes(l.group)).map((l) => l.amountCents))

/**
 * Agrege des lignes signees en un budget mensuel.
 *
 * Fonction PURE : aucun acces a Date, Math.random, window. Elle est le socle
 * de tout le reste, donc elle est testee en propriete et non seulement par
 * quelques cas.
 *
 * Invariant verifie par les tests :
 *   netIncome        = resources + levies
 *   slack            = netIncome + constrained          (constrained <= 0)
 *   savingsCapacity  = slack     + adjustable           (adjustable  <= 0)
 */
export function computeMonthlyBudget(lines: readonly BudgetLine[]): MonthlyBudget {
  const resourcesCents = of(lines, 'resource')
  const leviesCents = of(lines, 'levy')
  const constrainedCents = of(lines, 'constrained', 'credit')
  const adjustableCents = of(lines, 'adjustable')

  const netIncomeCents = resourcesCents + leviesCents
  const slackCents = netIncomeCents + constrainedCents
  const savingsCapacityCents = slackCents + adjustableCents

  return {
    resourcesCents,
    leviesCents,
    netIncomeCents,
    constrainedCents,
    adjustableCents,
    slackCents,
    savingsCapacityCents,
    lines,
  }
}
