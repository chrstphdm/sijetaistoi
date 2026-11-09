import { describe, expect, it } from 'vitest'
import {
  hasChoosableOption,
  optionAvailability,
  reachableCents,
  usableLiquidityCents,
  type EffectLike,
} from '@/core/availability.ts'
import type { MonthlyBudget, Stocks } from '@/core/types.ts'

const budget = (slackCents: number): MonthlyBudget =>
  ({
    resourcesCents: 200_000,
    leviesCents: -20_000,
    netIncomeCents: 180_000,
    constrainedCents: -150_000,
    slackCents,
    adjustableCents: -10_000,
    savingsCapacityCents: slackCents - 10_000,
  }) as MonthlyBudget

const stocks = (over: Partial<Stocks> = {}): Stocks => ({
  liquid7dCents: 18_000,
  liquid60dCents: 18_000,
  authorisedOverdraftCents: 20_000,
  netWealthCents: 0,
  precautionFloorMonths: 0,
  ...over,
})

const payment = (eur: number): EffectLike[] => [
  { type: 'one_off', amount: eur, settlement: 'payment' },
]

describe('disponibilité d’une option', () => {
  it('laisse choisir ce que la trésorerie couvre', () => {
    expect(optionAvailability(payment(100), budget(30_000), stocks()).kind).toBe('available')
  })

  it('refuse ce que ni la trésorerie ni le découvert ne couvrent', () => {
    const a = optionAvailability(payment(1800), budget(30_000), stocks())
    expect(a.kind).toBe('impossible')
    // Le motif doit être chiffré : « hors de portée » sans montant
    // n'apprend rien et ressemble à une punition arbitraire.
    if (a.kind === 'impossible') expect(a.reason).toMatch(/180 €|1 800/)
  })

  it('signale le passage à découvert sans l’interdire', () => {
    // 250 € pour 180 € disponibles et 200 € de découvert autorisé.
    const a = optionAvailability(payment(250), budget(30_000), stocks())
    expect(a.kind).toBe('strained')
  })

  /**
   * LE DEFAUT D'ORIGINE, en test.
   *
   * Un revenu qui n'arrive pas n'est pas une somme a financer. Avoir confondu
   * les deux declarait un arret de travail « hors de portee » de qui a peu
   * d'epargne, et fermait l'ecran sans aucune option choisissable.
   */
  it('ne contraint jamais une perte de revenu', () => {
    const loss: EffectLike[] = [{ type: 'one_off', amount: 980, settlement: 'income_loss' }]
    expect(optionAvailability(loss, budget(5_000), stocks({
      liquid7dCents: 100, authorisedOverdraftCents: 0,
    })).kind).toBe('available')
  })

  it('ne contraint ni l’étalement ni le récurrent', () => {
    const poor = stocks({ liquid7dCents: 0, authorisedOverdraftCents: 0 })
    const spread: EffectLike[] = [{ type: 'spread', amount: 1880, months: 4 }]
    const rec: EffectLike[] = [{ type: 'recurring', amount: 95, code: 'energie' }]
    expect(optionAvailability(spread, budget(5_000), poor).kind).toBe('available')
    expect(optionAvailability(rec, budget(5_000), poor).kind).toBe('available')
  })

  it('ne contraint pas un encaissement', () => {
    const gain: EffectLike[] = [{ type: 'one_off', amount: -450, settlement: 'payment' }]
    expect(optionAvailability(gain, budget(5_000), stocks()).kind).toBe('available')
  })

  it('tient compte du coussin de précaution déclaré', () => {
    // 3 mois de reste à vivre mis de côté sur 300 € : 150 € seulement
    // sont mobilisables sans y toucher.
    const s = stocks({ liquid7dCents: 30_000, precautionFloorMonths: 3 })
    const b = budget(5_000)
    expect(usableLiquidityCents(b, s)).toBe(15_000)
    expect(optionAvailability(payment(200), b, s).kind).toBe('strained')
    expect(optionAvailability(payment(100), b, s).kind).toBe('available')
  })

  it('compte le découvert autorisé dans ce qui est atteignable', () => {
    expect(reachableCents(stocks())).toBe(38_000)
  })
})

describe('aucun mois sans issue', () => {
  it('détecte un événement dont toutes les options exigent un décaissement', () => {
    const poor = stocks({ liquid7dCents: 0, authorisedOverdraftCents: 0 })
    const dead = [{ effects: payment(500) }, { effects: payment(900) }]
    expect(hasChoosableOption(dead, budget(5_000), poor)).toBe(false)
    expect(
      hasChoosableOption([...dead, { effects: [{ type: 'none' } as EffectLike] }], budget(5_000), poor),
    ).toBe(true)
  })
})
