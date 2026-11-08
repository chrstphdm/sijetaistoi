import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { absorptionRegime, comparabilityMetrics, REGIME } from '@/core/impact.ts'
import { euros } from '@/core/money.ts'
import type { BudgetLine, LineGroup, Stocks } from '@/core/types.ts'

const line = (code: string, group: LineGroup, amountCents: number): BudgetLine => ({
  code,
  group,
  amountCents,
  value: { amount: amountCents / 100, unit: 'EUR_month', nature: 'fiction' },
})

/** Claire : aide-soignante, 335 EUR de reste a vivre, 180 EUR de liquidite. */
const claire = computeMonthlyBudget([
  line('salaire_net', 'resource', euros(1210)),
  line('prestations', 'resource', euros(430)),
  line('logement', 'constrained', euros(-665)),
  line('energie', 'constrained', euros(-135)),
  line('alimentation', 'constrained', euros(-340)),
  line('credit_conso', 'credit', euros(-165)),
  line('loisirs', 'adjustable', euros(-40)),
])
const claireStocks: Stocks = {
  liquid7dCents: euros(180),
  liquid60dCents: euros(180),
  authorisedOverdraftCents: euros(200),
  netWealthCents: euros(-1800),
  precautionFloorMonths: 0,
}

/** Marc et Anne : 2 260 EUR de reste a vivre, 14 200 EUR d'epargne. */
const marcAnne = computeMonthlyBudget([
  line('salaire_net', 'resource', euros(6240)),
  line('logement', 'constrained', euros(-1850)),
  line('energie', 'constrained', euros(-260)),
  line('alimentation', 'constrained', euros(-920)),
  line('credit_immo', 'credit', euros(-950)),
  line('loisirs', 'adjustable', euros(-400)),
])
const marcAnneStocks: Stocks = {
  liquid7dCents: euros(14_200),
  liquid60dCents: euros(14_200),
  authorisedOverdraftCents: euros(2000),
  netWealthCents: euros(310_000),
  precautionFloorMonths: 1,
}

describe('absorptionRegime', () => {
  it('la MEME depense produit des regimes differents selon le personnage', () => {
    const chaudiere = euros(-1800)
    expect(absorptionRegime(chaudiere, claire, claireStocks)).toBe(REGIME.SHORTFALL)
    expect(absorptionRegime(chaudiere, marcAnne, marcAnneStocks)).toBe(REGIME.ABSORBED)
  })

  it('traite identiquement un gain et une perte de meme montant', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500_000 }), (magnitude) => {
        for (const [b, s] of [
          [claire, claireStocks],
          [marcAnne, marcAnneStocks],
        ] as const) {
          expect(absorptionRegime(magnitude, b, s)).toBe(absorptionRegime(-magnitude, b, s))
        }
      }),
    )
  })

  it('reste dans les bornes 0..4 pour tout montant', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000_000, max: 10_000_000 }), (delta) => {
        const r = absorptionRegime(delta, claire, claireStocks)
        expect(r).toBeGreaterThanOrEqual(0)
        expect(r).toBeLessThanOrEqual(4)
      }),
    )
  })

  it('classe un petit montant comme imperceptible, chez les deux', () => {
    expect(absorptionRegime(euros(-2), claire, claireStocks)).toBe(REGIME.IMPERCEPTIBLE)
    expect(absorptionRegime(euros(-2), marcAnne, marcAnneStocks)).toBe(REGIME.IMPERCEPTIBLE)
  })
})

describe('comparabilityMetrics', () => {
  it('change le classement des personnages selon l echelle choisie', () => {
    // Une mesure forfaitaire : -100 EUR pour tout le monde.
    const forfait = euros(-100)
    const c = comparabilityMetrics(forfait, claire)
    const m = comparabilityMetrics(forfait, marcAnne)

    // En euros, les deux sont touches identiquement.
    expect(c.euros).toBe(m.euros)
    // En part du reste a vivre, Claire est touchee bien plus fortement.
    expect(c.slack).toBeGreaterThan(m.slack)
    // C'est tout l'interet du selecteur : la mesure change, pas les faits.
    expect(c.income).toBeGreaterThan(m.income)
  })

  it('ne divise jamais par une valeur sous le plancher publie', () => {
    const exsangue = computeMonthlyBudget([
      line('salaire_net', 'resource', euros(1000)),
      line('logement', 'constrained', euros(-1000)),
    ])
    const metrics = comparabilityMetrics(euros(-100), exsangue)
    expect(Number.isFinite(metrics.slack)).toBe(true)
    expect(metrics.slack).toBeLessThanOrEqual(100)
  })
})
