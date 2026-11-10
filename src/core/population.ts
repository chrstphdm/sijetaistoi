import type { MonthlyBudget } from './types.ts'

/**
 * Situer un personnage dans la population — sans jamais le declarer
 * representatif.
 *
 * Tout ce qui suit est CALCULE a partir du releve du personnage et de
 * reperes publies par l'Insee, selon la definition de l'Insee : le niveau de
 * vie est le revenu disponible du menage divise par son nombre d'unites de
 * consommation. Rien n'est saisi a la main, si bien que la position affichee
 * ne peut pas deriver du budget qu'on montre au joueur.
 */

export type HouseholdKind = 'single' | 'loneParent' | 'coupleNoChild' | 'coupleWithChildren' | 'other'

export type HouseholdTraits = {
  readonly householdSize: number
  readonly childCount: number
}

/**
 * Unites de consommation, echelle de l'OCDE modifiee retenue par l'Insee :
 * 1 pour le premier adulte, 0,5 par autre personne de 14 ans ou plus,
 * 0,3 par enfant de moins de 14 ans.
 *
 * Approximation declaree : l'age des enfants n'est pas connu, ils comptent
 * tous pour 0,3. Un adolescent compterait 0,5, et le niveau de vie de sa
 * famille serait un peu plus bas que celui affiche.
 */
export function consumptionUnits(t: HouseholdTraits): number {
  const adults = Math.max(1, t.householdSize - t.childCount)
  return 1 + 0.5 * (adults - 1) + 0.3 * t.childCount
}

/** Niveau de vie annuel, en euros : revenu disponible annuel / unites de consommation. */
export function annualLivingStandard(budget: MonthlyBudget, t: HouseholdTraits): number {
  return Math.round((budget.netIncomeCents * 12) / 100 / consumptionUnits(t))
}

/**
 * Part de la population dont le niveau de vie est INFERIEUR, en %.
 *
 * Interpolation lineaire entre les neuf deciles publies. Au-dela du
 * neuvieme, l'Insee ne publie rien d'aussi simple : la valeur est bornee a
 * 99, et l'affichage dit seulement « parmi les 10 % les plus aises ».
 */
export function percentileOf(livingStandard: number, deciles: readonly number[]): number {
  const xs = [0, ...deciles.map((_, i) => (i + 1) * 10)]
  const ys = [0, ...deciles]
  const top = ys[ys.length - 1]!
  if (livingStandard >= top) return Math.min(99, 90 + (10 * (livingStandard - top)) / top)
  for (let i = 1; i < ys.length; i++) {
    if (livingStandard <= ys[i]!) {
      return xs[i - 1]! + ((livingStandard - ys[i - 1]!) / (ys[i]! - ys[i - 1]!)) * 10
    }
  }
  return 99
}

/** Decile (1 a 10) correspondant a un rang. */
export const decileOf = (percentile: number): number => Math.min(10, Math.floor(percentile / 10) + 1)

export function householdKind(t: HouseholdTraits): HouseholdKind {
  const adults = t.householdSize - t.childCount
  if (t.householdSize === 1) return 'single'
  if (adults === 1 && t.childCount > 0) return 'loneParent'
  if (adults === 2 && t.childCount === 0) return 'coupleNoChild'
  if (adults === 2 && t.childCount > 0) return 'coupleWithChildren'
  return 'other'
}

export const HOUSEHOLD_LABEL: Record<HouseholdKind, string> = {
  single: 'Personne seule',
  loneParent: 'Famille monoparentale',
  coupleNoChild: 'Couple sans enfant',
  coupleWithChildren: 'Couple avec enfants',
  other: 'Autre composition',
}

export const TENURE_LABEL: Record<string, string> = {
  owner_outright: 'Propriétaire sans emprunt',
  owner_with_loan: 'Propriétaire qui rembourse un emprunt',
  tenant_social: 'Locataire du parc social',
  tenant_private: 'Locataire du parc privé',
  housed: 'Logé gratuitement',
}
