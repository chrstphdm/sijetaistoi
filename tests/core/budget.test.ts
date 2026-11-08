import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { euros, formatEuros } from '@/core/money.ts'
import type { BudgetLine, LineGroup } from '@/core/types.ts'

const line = (code: string, group: LineGroup, amountCents: number): BudgetLine => ({
  code,
  group,
  amountCents,
  value: { amount: amountCents / 100, unit: 'EUR_month', nature: 'fiction' },
})

describe('computeMonthlyBudget', () => {
  it('agrege un budget contraint de facon exacte', () => {
    const b = computeMonthlyBudget([
      line('salaire_net', 'resource', euros(1210)),
      line('prestations', 'resource', euros(430)),
      line('logement', 'constrained', euros(-665)),
      line('energie', 'constrained', euros(-135)),
      line('alimentation', 'constrained', euros(-340)),
      line('credit_conso', 'credit', euros(-165)),
      line('loisirs', 'adjustable', euros(-40)),
    ])

    expect(b.resourcesCents).toBe(euros(1640))
    expect(b.netIncomeCents).toBe(euros(1640))
    expect(b.constrainedCents).toBe(euros(-1305))
    expect(b.slackCents).toBe(euros(335))
    expect(b.savingsCapacityCents).toBe(euros(295))
  })

  it('maintient ses invariants pour tout budget (test de propriete)', () => {
    const amount = fc.integer({ min: 0, max: 2_000_00 })
    fc.assert(
      fc.property(
        fc.array(amount, { maxLength: 6 }),
        fc.array(amount, { maxLength: 4 }),
        fc.array(amount, { maxLength: 8 }),
        fc.array(amount, { maxLength: 5 }),
        (resources, levies, constrained, adjustable) => {
          const b = computeMonthlyBudget([
            ...resources.map((a, i) => line(`r${i}`, 'resource', a)),
            ...levies.map((a, i) => line(`l${i}`, 'levy', -a)),
            ...constrained.map((a, i) => line(`c${i}`, 'constrained', -a)),
            ...adjustable.map((a, i) => line(`a${i}`, 'adjustable', -a)),
          ])

          expect(b.netIncomeCents).toBe(b.resourcesCents + b.leviesCents)
          expect(b.slackCents).toBe(b.netIncomeCents + b.constrainedCents)
          expect(b.savingsCapacityCents).toBe(b.slackCents + b.adjustableCents)
          // Les prelevements et depenses ne sont jamais positifs.
          expect(b.leviesCents).toBeLessThanOrEqual(0)
          expect(b.constrainedCents).toBeLessThanOrEqual(0)
          expect(b.adjustableCents).toBeLessThanOrEqual(0)
          // Tout est entier : aucune derive en virgule flottante.
          expect(Number.isInteger(b.slackCents)).toBe(true)
        },
      ),
    )
  })

  it('formate en francais avec des espaces insecables', () => {
    expect(formatEuros(euros(1800))).toBe('1 800 €')
    expect(formatEuros(euros(-1800))).toBe('1 800 €') // le signe est porte ailleurs
    expect(formatEuros(euros(335))).toBe('335 €')
  })
})
