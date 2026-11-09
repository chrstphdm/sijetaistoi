import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  DEFAULT_YEARS, firstUncertainYear, project, sharedScale, STARTS_AT,
  type ProjectedEffect,
} from '@/core/projection.ts'
import { euros } from '@/core/money.ts'

const recurring = (amount: number, horizon: ProjectedEffect['horizon'] = 'y1'): ProjectedEffect => ({
  monthlyCents: euros(amount), horizon,
})

describe('projection pluriannuelle', () => {
  it('cumule douze mois par année', () => {
    const p = project([recurring(-10)], 3)
    expect(p[0]?.cumulativeCents).toBe(euros(-120))
    expect(p[1]?.cumulativeCents).toBe(euros(-240))
    expect(p[2]?.cumulativeCents).toBe(euros(-360))
  })

  it('n’active un effet qu’à partir de son horizon, sans l’interpoler', () => {
    // Le modèle n'a aucune raison de supposer une montée en charge linéaire.
    const p = project([recurring(10, 'y5')], 6)
    expect(p[3]?.yearCents).toBe(0)
    expect(p[4]?.yearCents).toBe(euros(120))
    expect(STARTS_AT.y5).toBe(5)
  })

  it('ne compte un effet ponctuel que la première année', () => {
    const p = project([{ monthlyCents: euros(-1800), horizon: 'month', oneOff: true }], 3)
    expect(p[0]?.cumulativeCents).toBe(euros(-1800))
    expect(p[2]?.cumulativeCents).toBe(euros(-1800))
  })

  it('traite un gain exactement comme une perte', () => {
    // Étendre l'horizon amplifie tout : la symétrie doit tenir.
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50_000 }), (m) => {
        const gain = project([{ monthlyCents: m, horizon: 'y1' }], 10)
        const perte = project([{ monthlyCents: -m, horizon: 'y1' }], 10)
        // Le « + 0 » normalise -0 en 0 : Object.is(0, -0) est faux, et la
        // négation d'un cumul nul produit -0. C'est une particularité de
        // JavaScript, pas un défaut du calcul.
        gain.forEach((g, i) =>
          expect(g.cumulativeCents + 0).toBe(-perte[i]!.cumulativeCents + 0),
        )
      }),
    )
  })

  it('signale l’année à partir de laquelle le cumul devient incertain', () => {
    const p = project([recurring(-10), { monthlyCents: euros(5), horizon: 'y5', uncertain: true }], 10)
    expect(firstUncertainYear(p)).toBe(5)
    expect(firstUncertainYear(project([recurring(-10)], 10))).toBeNull()
  })

  it('fournit une échelle commune, pour que les courbes soient comparables', () => {
    // Des axes différents feraient paraître deux impacts très inégaux
    // identiques, ce qui serait exactement le contraire du propos.
    const a = project([recurring(-10)], 10)
    const b = project([recurring(-100)], 10)
    expect(sharedScale([a, b])).toBe(euros(12000))
  })

  it('projette dix ans par défaut', () => {
    expect(project([recurring(-1)]).length).toBe(DEFAULT_YEARS)
  })
})
