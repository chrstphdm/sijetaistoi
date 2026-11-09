import { REGIME, type Regime, type Scale } from './impact.ts'

/**
 * Phrases decrivant un impact.
 *
 * Centralisees ici, et non recopiees dans chaque ecran, pour une raison de
 * neutralite : les formulations d'un GAIN et d'une PERTE doivent rester
 * structurellement paralleles — meme longueur, meme ton, meme construction.
 * Deux jeux de phrases ecrits separement divergent, et la divergence
 * raconte quelque chose.
 *
 * Le besoin a ete revele par une capture d'ecran : pour un gain de 10 EUR,
 * le jeu affichait « cette somme est absorbé sans toucher aux depenses » —
 * accord faux, et phrase qui suppose un cout la ou il y a un apport.
 */

type Pair = { readonly loss: string; readonly gain: string }

/**
 * Le regime mesure une AMPLEUR rapportee a la marge de manoeuvre, pas une
 * difficulte. Pour un gain, les memes paliers decrivent donc ce que la
 * somme represente, dans la meme gradation.
 */
const SENTENCES: Readonly<Record<Regime, Pair>> = {
  [REGIME.IMPERCEPTIBLE]: {
    loss: 'ne change rien à son mois',
    gain: 'ne change rien à son mois',
  },
  [REGIME.ABSORBED]: {
    loss: 'est couverte sans toucher à ses dépenses',
    gain: 's’ajoute sans changer ses dépenses',
  },
  [REGIME.ADJUSTABLE_TRADEOFF]: {
    loss: 'l’oblige à renoncer à des dépenses non contraintes',
    gain: 'représente plus que son budget non contraint',
  },
  [REGIME.CONSTRAINED_TRADEOFF]: {
    loss: 'l’oblige à toucher à des dépenses contraintes',
    gain: 'dépasse ce qu’il peut mobiliser rapidement',
  },
  [REGIME.SHORTFALL]: {
    loss: 'ne peut pas être couverte ce mois-ci',
    gain: 'dépasse largement sa marge habituelle',
  },
}

export function regimeSentence(regime: Regime, deltaCents: number): string {
  const p = SENTENCES[regime]
  return deltaCents >= 0 ? p.gain : p.loss
}

/* ------------------------------------------------------------------ */
/* Formats francais                                                    */
/* ------------------------------------------------------------------ */

/** Virgule decimale, espace insecable fine devant l'unite. */
const number = (v: number, digits: number) =>
  v.toFixed(digits).replace('.', ',')

/**
 * Une part trop petite pour s'ecrire avec une decimale est dite telle
 * quelle. « 0,0 % » se lit comme zero, alors que la valeur ne l'est pas :
 * c'est une fausse precision, et le projet s'interdit la fausse precision.
 */
export function formatShare(ratio: number): string {
  const pct = ratio * 100
  if (pct > 0 && pct < 0.1) return 'moins de 0,1 %'
  return `${number(pct, 1)} %`
}

export function formatDays(days: number): string {
  if (days > 0 && days < 0.1) return 'moins d’un dixième de journée'
  return `${number(days, 1)} jour${days >= 2 ? 's' : ''}`
}

/** Formate une grandeur de comparabilite selon l'echelle choisie. */
export function formatMetric(scale: Scale, metrics: Readonly<Record<Scale, number>>): string {
  const v = metrics[scale]
  if (scale === 'euros') return `${Math.round(v)} €`
  if (scale === 'days') return formatDays(v)
  return formatShare(v)
}
