/**
 * Toute somme d'argent du jeu est un entier de CENTIMES.
 *
 * Raison : un budget mensuel est une somme d'une quinzaine de lignes, comparee
 * a des seuils. En virgule flottante, 0.1 + 0.2 !== 0.3, et un reste a vivre
 * calcule a 0,004 EUR pres peut basculer d'un palier d'intensite a l'autre.
 * Le palier pilote la mise en scene : une imprecision de calcul deviendrait
 * une difference de traitement visuel entre deux personnages.
 */
export type Cents = number

export const euros = (amount: number): Cents => Math.round(amount * 100)
export const toEuros = (c: Cents): number => c / 100

/** Somme exacte. Jamais de reduce sur des flottants. */
export const sum = (values: readonly Cents[]): Cents => {
  let total = 0
  for (const v of values) total += v
  return total
}

/**
 * Formatage francais : espace insecable fine comme separateur de milliers,
 * espace insecable avant le symbole monetaire.
 * Le signe n'est JAMAIS porte par la seule couleur : voir <Amount>, qui ajoute
 * un glyphe et un mot. Cette fonction ne produit que le nombre.
 */
export const formatEuros = (c: Cents): string => {
  const abs = Math.abs(c)
  const whole = Math.round(abs / 100)
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped} €`
}
