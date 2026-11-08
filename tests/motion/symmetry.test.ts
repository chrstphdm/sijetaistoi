import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { intensity, ratio, THRESHOLDS, type ShockInput, type Scale } from '@/motion/intensity.ts'
import { MOTION_TABLE, motionFor } from '@/motion/table.ts'

const scales: readonly Scale[] = ['euros', 'income', 'slack']

const context = fc.record({
  netIncomeCents: fc.integer({ min: 0, max: 2_000_000 }),
  slackCents: fc.integer({ min: -100_000, max: 1_000_000 }),
  scale: fc.constantFrom(...scales),
})

describe('R1 — symetrie de signe', () => {
  it('un gain et une perte de meme montant recoivent une mise en scene IDENTIQUE', () => {
    fc.assert(
      fc.property(context, fc.integer({ min: 0, max: 5_000_000 }), (ctx, magnitude) => {
        const gain: ShockInput = { ...ctx, amountCents: magnitude }
        const perte: ShockInput = { ...ctx, amountCents: -magnitude }
        expect(motionFor(gain)).toEqual(motionFor(perte))
        expect(intensity(gain)).toBe(intensity(perte))
        expect(ratio(gain)).toBe(ratio(perte))
      }),
    )
  })

  it('un heritage de 1 800 EUR est traite comme une chaudiere de 1 800 EUR', () => {
    const ctx = { netIncomeCents: 164_000, slackCents: 33_500, scale: 'slack' } as const
    expect(motionFor({ ...ctx, amountCents: 180_000 })).toEqual(
      motionFor({ ...ctx, amountCents: -180_000 }),
    )
  })
})

describe('R3 — saturation', () => {
  it('ne depasse jamais le palier 4, quel que soit le montant', () => {
    fc.assert(
      fc.property(context, fc.integer({ min: -1e12, max: 1e12 }), (ctx, amountCents) => {
        const level = intensity({ ...ctx, amountCents })
        expect(level).toBeGreaterThanOrEqual(0)
        expect(level).toBeLessThanOrEqual(4)
      }),
    )
  })

  it('est monotone : un montant plus grand ne recoit jamais un palier plus bas', () => {
    fc.assert(
      fc.property(
        context,
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (ctx, a, b) => {
          const [small, large] = a <= b ? [a, b] : [b, a]
          expect(intensity({ ...ctx, amountCents: large })).toBeGreaterThanOrEqual(
            intensity({ ...ctx, amountCents: small }),
          )
        },
      ),
    )
  })

  it('les seuils publies correspondent bien aux bascules de palier', () => {
    const ctx = { netIncomeCents: 100_000, slackCents: 100_000, scale: 'slack' } as const
    THRESHOLDS.forEach((t, i) => {
      const justBelow = Math.floor(t * 100_000) - 1
      const atThreshold = Math.ceil(t * 100_000)
      expect(intensity({ ...ctx, amountCents: justBelow })).toBe(i)
      expect(intensity({ ...ctx, amountCents: atThreshold })).toBe(i + 1)
    })
  })
})

describe('R5 — bornes dures de la table', () => {
  it('respecte les plafonds annonces publiquement', () => {
    for (const params of Object.values(MOTION_TABLE)) {
      expect(params.enterMs).toBeLessThanOrEqual(400)
      expect(params.countUpMs).toBeLessThanOrEqual(800)
      expect(params.enterMs + params.countUpMs).toBeLessThanOrEqual(1200)
      expect(params.translatePx).toBeLessThanOrEqual(14)
      expect(params.translatePx).toBeGreaterThanOrEqual(0)
      expect(params.opacityFrom).toBe(0)
    }
  })

  it('n utilise qu une seule courbe d entree et un compteur lineaire', () => {
    const easings = new Set(Object.values(MOTION_TABLE).map((p) => p.easing))
    const counts = new Set(Object.values(MOTION_TABLE).map((p) => p.countEasing))
    expect(easings.size).toBe(1)
    expect(counts.size).toBe(1)
    expect([...counts][0]).toBe('linear')
  })
})
