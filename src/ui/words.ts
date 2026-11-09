/**
 * Nombres ecrits en toutes lettres.
 *
 * Le corpus comptait six personnages, et six etait ecrit en clair dans six
 * endroits de l'interface. En passant a treize, ces phrases sont devenues
 * fausses sans qu'aucun test ne le voie : elles sont du texte, pas une
 * donnee. Les compter a partir du corpus est la seule facon de ne pas
 * recommencer.
 */
const WORDS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf', 'vingt',
] as const

/** Au-dela de vingt, le chiffre se lit mieux que la lettre. */
export const spellCount = (n: number): string =>
  Number.isInteger(n) && n >= 0 && n <= 20 ? WORDS[n]! : String(n)
