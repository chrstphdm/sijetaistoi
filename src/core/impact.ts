import type { Cents } from './money.ts'
import type { MonthlyBudget, Stocks } from './types.ts'

/**
 * Regime d'absorption : COMMENT un personnage encaisse un choc, et non
 * combien il coute.
 *
 * C'est la reponse au probleme central du projet : 1 800 EUR ne veut rien dire
 * hors contexte. Le regime, lui, est comparable entre personnages, parce qu'il
 * decrit un vecu et non un montant.
 *
 * Il est calcule identiquement pour un gain et pour une perte : voir
 * `absorptionRegime`, qui travaille sur la valeur absolue. Un gain de 1 800 EUR
 * et une panne de 1 800 EUR produisent le meme regime pour un meme personnage.
 */
export const REGIME = {
  /** Sous le seuil de perception : rien a arbitrer. */
  IMPERCEPTIBLE: 0,
  /** Couvert par la liquidite, sans toucher aux depenses. */
  ABSORBED: 1,
  /** Oblige a arbitrer sur des depenses ajustables (loisirs, habillement). */
  ADJUSTABLE_TRADEOFF: 2,
  /** Oblige a toucher a des depenses contraintes, ou a s'endetter. */
  CONSTRAINED_TRADEOFF: 3,
  /** Non couvrable : il manque de l'argent. */
  SHORTFALL: 4,
} as const

export type Regime = (typeof REGIME)[keyof typeof REGIME]

/** Seuil de perception, exprime en part du reste a vivre. PUBLIE. */
export const PERCEPTION_THRESHOLD = 0.02

/**
 * Plancher du denominateur, en centimes. PUBLIE.
 *
 * Sans lui, le reste a vivre tend vers zero chez les personnages contraints,
 * le ratio explose, et le dispositif dramatise systematiquement les plus
 * modestes. Le plancher est une decision assumee, declaree dans la page
 * methode, et non un detail d'implementation.
 */
export const DENOMINATOR_FLOOR_CENTS: Cents = 15_000

export function absorptionRegime(
  deltaCents: Cents,
  budget: MonthlyBudget,
  stocks: Stocks,
): Regime {
  const magnitude = Math.abs(deltaCents)

  const denominator = Math.max(budget.slackCents, DENOMINATOR_FLOOR_CENTS)
  if (magnitude / denominator < PERCEPTION_THRESHOLD) return REGIME.IMPERCEPTIBLE

  // Ce que le personnage accepte de mobiliser sans entamer son coussin de precaution.
  const precautionFloor = Math.max(0, budget.slackCents) * stocks.precautionFloorMonths
  const usableLiquidity = Math.max(0, stocks.liquid7dCents - precautionFloor)
  if (magnitude <= usableLiquidity) return REGIME.ABSORBED

  const remaining = magnitude - usableLiquidity

  // Les depenses ajustables sont stockees en negatif : on prend leur magnitude.
  const adjustableRoom = Math.abs(budget.adjustableCents)
  if (remaining <= adjustableRoom) return REGIME.ADJUSTABLE_TRADEOFF

  const stillRemaining = remaining - adjustableRoom
  const lastResort =
    Math.max(0, stocks.liquid60dCents - stocks.liquid7dCents) + stocks.authorisedOverdraftCents
  if (stillRemaining <= lastResort) return REGIME.CONSTRAINED_TRADEOFF

  return REGIME.SHORTFALL
}

/* ------------------------------------------------------------------ */
/* Comparabilite                                                       */
/* ------------------------------------------------------------------ */

/**
 * Les quatre echelles proposees au joueur.
 *
 * AUCUNE N'EST NEUTRE, et c'est le point. Rapporter au reste a vivre
 * presuppose une conception fondee sur le besoin ; au revenu, une conception
 * proportionnelle ; aux euros absolus, une conception nominale. Le jeu ne
 * tranche pas en silence : il expose les quatre et montre que le classement
 * des personnages les plus touches change selon celle qu'on choisit.
 */
export type Scale = 'euros' | 'income' | 'slack' | 'days'

export type ComparabilityMetrics = Readonly<Record<Scale, number>>

/**
 * Pour chaque echelle, la grandeur comparable correspondante.
 * `euros`  : le montant lui-meme, en euros.
 * `income` : part du revenu net mensuel.
 * `slack`  : part du reste a vivre mensuel.
 * `days`   : nombre de jours de depenses courantes que le montant represente.
 */
export function comparabilityMetrics(
  deltaCents: Cents,
  budget: MonthlyBudget,
): ComparabilityMetrics {
  const magnitude = Math.abs(deltaCents)
  const income = Math.max(budget.netIncomeCents, DENOMINATOR_FLOOR_CENTS)
  const slack = Math.max(budget.slackCents, DENOMINATOR_FLOOR_CENTS)

  // Depenses courantes = tout ce qui sort chaque mois, contraint et ajustable.
  const monthlySpend = Math.max(
    Math.abs(budget.constrainedCents) + Math.abs(budget.adjustableCents),
    DENOMINATOR_FLOOR_CENTS,
  )

  return {
    euros: magnitude / 100,
    income: magnitude / income,
    slack: magnitude / slack,
    days: (magnitude / monthlySpend) * 30,
  }
}
