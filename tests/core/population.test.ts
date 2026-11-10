import { describe, expect, it } from 'vitest'
import { bundle } from '@/content/load.ts'
import { consumptionUnits, decileOf, householdKind, percentileOf } from '@/core/population.ts'

const deciles = bundle.population.livingStandardDeciles.values

describe('situer un personnage dans la population', () => {
  it('compte les unités de consommation comme l’Insee', () => {
    expect(consumptionUnits({ householdSize: 1, childCount: 0 })).toBe(1)
    expect(consumptionUnits({ householdSize: 2, childCount: 0 })).toBe(1.5)
    expect(consumptionUnits({ householdSize: 4, childCount: 2 })).toBeCloseTo(2.1)
    expect(consumptionUnits({ householdSize: 2, childCount: 1 })).toBeCloseTo(1.3)
  })

  it('place chaque seuil de décile exactement sur son rang', () => {
    deciles.forEach((d, i) => expect(percentileOf(d, deciles)).toBeCloseTo((i + 1) * 10))
    expect(percentileOf(bundle.population.livingStandardDeciles.values[4]!, deciles)).toBeCloseTo(50)
  })

  it('ne recule jamais quand le niveau de vie augmente', () => {
    let last = -1
    for (let nv = 0; nv < 90_000; nv += 500) {
      const p = percentileOf(nv, deciles)
      expect(p).toBeGreaterThanOrEqual(last)
      expect(p).toBeLessThanOrEqual(99)
      last = p
    }
    expect(decileOf(0)).toBe(1)
    expect(decileOf(99)).toBe(10)
  })

  it('reconnaît les compositions de ménage', () => {
    expect(householdKind({ householdSize: 1, childCount: 0 })).toBe('single')
    expect(householdKind({ householdSize: 2, childCount: 1 })).toBe('loneParent')
    expect(householdKind({ householdSize: 4, childCount: 2 })).toBe('coupleWithChildren')
  })

  it('ne cite que des repères sourcés, et des parts qui somment à cent', () => {
    const ids = new Set(bundle.sources.map((s) => s.id))
    const p = bundle.population
    for (const b of [p.livingStandardDeciles, p.tenure, p.households]) expect(ids.has(b.sourceId)).toBe(true)
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
    expect(sum(p.tenure.shares)).toBeCloseTo(100, 0)
    expect(sum(p.households.shares)).toBeCloseTo(100, 0)
  })
})
