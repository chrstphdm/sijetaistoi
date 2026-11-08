import type { Cents } from './money.ts'

/* ------------------------------------------------------------------ */
/* Provenance — l'invariant central du projet.                         */
/* Toute valeur numerique affichee porte d'ou elle vient.              */
/* ------------------------------------------------------------------ */

export type Nature = 'fact' | 'hypothesis' | 'extrapolation' | 'fiction'

export type Unit = 'EUR' | 'EUR_month' | 'EUR_year' | 'EUR_bn' | 'pct'

export type Horizon = 'month' | 'y1' | 'y5' | 'y10'

export type Value = {
  readonly amount: number
  readonly unit: Unit
  readonly nature: Nature
  /** REQUIS si nature === 'fact'. Verifie au build. */
  readonly sourceId?: string
  /** REQUIS si nature === 'hypothesis'. Verifie au build. */
  readonly hypothesisId?: string
  readonly range?: readonly [number, number]
  readonly horizon?: Horizon
  readonly note?: string
}

/* ------------------------------------------------------------------ */
/* Budget                                                              */
/* ------------------------------------------------------------------ */

/**
 * Le groupe d'une ligne determine sa semantique dans le calcul.
 * `constrained` et `adjustable` ne sont pas une propriete objective des
 * depenses : c'est un arbitrage, declare poste par poste et surchargeable
 * par personnage avec justification. Voir Character.lineOverrides.
 */
export type LineGroup =
  | 'resource'    // salaire, pension, prestations, bourse
  | 'levy'        // impots et cotisations (montant negatif)
  | 'constrained' // logement, energie, transport contraint, garde (negatif)
  | 'adjustable'  // loisirs, habillement (negatif)
  | 'credit'      // mensualites de credit (negatif)

export type BudgetLine = {
  readonly code: string
  readonly group: LineGroup
  /** Signe : ressources positives, tout le reste negatif. */
  readonly amountCents: Cents
  readonly value: Value
}

export type MonthlyBudget = {
  readonly resourcesCents: Cents
  readonly leviesCents: Cents        // <= 0
  readonly netIncomeCents: Cents     // ressources + prelevements
  readonly constrainedCents: Cents   // <= 0, contraint + credit
  readonly adjustableCents: Cents    // <= 0
  /** Reste a vivre : ce qui subsiste une fois le contraint paye. */
  readonly slackCents: Cents
  /** Capacite d'epargne : reste a vivre moins les depenses ajustables. */
  readonly savingsCapacityCents: Cents
  readonly lines: readonly BudgetLine[]
}

/* ------------------------------------------------------------------ */
/* Stocks — ce qui permet d'absorber un choc                           */
/* ------------------------------------------------------------------ */

export type Stocks = {
  /** Liquidite mobilisable sous 7 jours. */
  readonly liquid7dCents: Cents
  /** Liquidite mobilisable sous 60 jours (inclut la precedente). */
  readonly liquid60dCents: Cents
  readonly authorisedOverdraftCents: Cents
  readonly netWealthCents: Cents
  /** Nombre de mois de reste a vivre que le personnage refuse d'entamer. */
  readonly precautionFloorMonths: number
}
