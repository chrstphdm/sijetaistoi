import { clear } from './persistence.ts'

/**
 * La graine d'une partie.
 *
 * Elle vit dans la couche d'interface, pas dans le moteur : celui-ci reste
 * pur et la recoit comme une entree. C'est elle qui determine tout ce qui
 * est tire — les personnages, l'ordre des reformes, les evenements.
 *
 * Elle etait codee en dur, ce qui donnait exactement UNE partie possible.
 * Tout le travail sur le tirage uniforme et les contraintes declarees
 * fonctionnait, mais sur une seule combinaison.
 *
 * Elle est lisible dans l'adresse : un joueur peut rejouer la meme partie,
 * la partager, ou verifier que le tirage n'etait pas arrange. C'est la
 * contrepartie concrete de la promesse de transparence du tirage.
 */

/** Nom du parametre d'adresse portant la graine. Partage avec setup.ts. */
export const SEED_PARAM = 'graine'
const PARAM = SEED_PARAM

/** Graine courte, lisible, sans ambiguite a l'oral (ni 0/O ni 1/l). */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

export function makeSeed(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Graine demandee dans l'adresse, si elle est valide. */
export function seedFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get(PARAM)
  if (!value) return null
  const clean = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
  return clean.length >= 4 ? clean : null
}

/** Adresse permettant de rejouer exactement cette partie. */
export function urlForSeed(seed: string): string {
  if (typeof window === 'undefined') return `?${PARAM}=${seed}`
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.set(PARAM, seed)
  return url.toString()
}

/**
 * Ouvre une partie neuve : nouvelle graine, et l'adresse la reflète.
 *
 * La partie precedente est EFFACEE, pas seulement ignoree. Elle le serait de
 * toute facon au chargement, puisque la graine ne correspondrait plus — mais
 * elle resterait ecrite dans le stockage de l'appareil avec les jugements
 * politiques du joueur. Rien ne justifie de les y laisser.
 */
export function startFreshGame(): void {
  clear()
  window.location.href = urlForSeed(makeSeed())
}

/**
 * Rejoue la MEME partie depuis le debut.
 *
 * Sans cela, la sauvegarde rendrait la graine inutilisable pour ce a quoi
 * elle sert : verifier qu'une partie n'etait pas arrangee suppose de pouvoir
 * la rejouer, et rouvrir l'adresse la reprend desormais la ou on l'avait
 * laissee.
 */
export function replaySameSeed(): void {
  clear()
  window.location.reload()
}
