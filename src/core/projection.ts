import type { Cents } from './money.ts'

/**
 * Projection pluriannuelle d'un effet recurrent.
 *
 * Elle repond a un besoin reel : un ecart de 9 EUR par mois ne se percoit
 * pas, 108 EUR par an se percoit, et ce que dix ans accumulent se percoit
 * encore autrement.
 *
 * AVERTISSEMENT, et il est serieux : etendre l'horizon AMPLIFIE tout, les
 * couts comme les gains. C'est symetrique, donc aucun camp n'est avantage,
 * mais l'ensemble du sujet parait plus lourd — exactement le meme probleme
 * que le choix du denominateur. La projection est donc presentee comme une
 * lecture parmi d'autres, et son modele est enonce a cote.
 *
 * CE QUE CE MODELE NE FAIT PAS, volontairement :
 *   - aucune inflation, aucune revalorisation ;
 *   - aucun interet, aucune capitalisation de l'epargne degagee ;
 *   - aucun changement de comportement ;
 *   - aucun changement de situation du personnage, alors qu'en dix ans un
 *     credit se solde, des enfants partent, une carriere evolue.
 *
 * Ce dernier point est le plus limitant : la projection suppose un
 * personnage figé, ce qu'aucune vie n'est. Elle dit « si tout restait
 * identique », et rien de plus.
 */

export type HorizonKey = 'month' | 'y1' | 'y5' | 'y10'

/** Annee a partir de laquelle un effet produit son plein effet. */
export const STARTS_AT: Readonly<Record<HorizonKey, number>> = {
  month: 1,
  y1: 1,
  y5: 5,
  y10: 10,
}

export type ProjectedEffect = {
  /** Variation MENSUELLE, signee. */
  readonly monthlyCents: Cents
  readonly horizon: HorizonKey
  /** Un effet ponctuel ne vaut que la premiere annee. */
  readonly oneOff?: boolean
  readonly uncertain?: boolean
}

export type ProjectionPoint = {
  readonly year: number
  /** Effet de l'annee seule. */
  readonly yearCents: Cents
  /** Cumul depuis la premiere annee. */
  readonly cumulativeCents: Cents
  /** Vrai des qu'un effet debattu entre dans le calcul. */
  readonly uncertain: boolean
}

export const DEFAULT_YEARS = 10

/**
 * Projette un ensemble d'effets sur N annees.
 *
 * Fonction PURE. Un effet a horizon `y5` ne compte qu'a partir de la
 * cinquieme annee : le modele ne l'interpole pas, parce qu'il n'a aucune
 * raison de supposer une montee en charge lineaire.
 */
export function project(
  effects: readonly ProjectedEffect[],
  years: number = DEFAULT_YEARS,
): readonly ProjectionPoint[] {
  const out: ProjectionPoint[] = []
  let cumulative = 0

  for (let year = 1; year <= years; year++) {
    let yearCents = 0
    let uncertain = false

    for (const e of effects) {
      if (year < STARTS_AT[e.horizon]) continue
      if (e.oneOff && year > 1) continue
      yearCents += e.oneOff ? e.monthlyCents : e.monthlyCents * 12
      if (e.uncertain) uncertain = true
    }

    cumulative += yearCents
    out.push({ year, yearCents, cumulativeCents: cumulative, uncertain })
  }
  return out
}

/** Annee a partir de laquelle le cumul devient incertain, s'il le devient. */
export function firstUncertainYear(points: readonly ProjectionPoint[]): number | null {
  return points.find((p) => p.uncertain)?.year ?? null
}

/** Amplitude maximale sur un ensemble de projections, pour un axe commun. */
export function sharedScale(series: readonly (readonly ProjectionPoint[])[]): Cents {
  let max = 0
  for (const points of series) {
    for (const p of points) max = Math.max(max, Math.abs(p.cumulativeCents))
  }
  return max
}
