import { characters, reforms } from '@/content/load.ts'
import { ACT_COUNT } from '@/core/game.ts'
import { SEED_PARAM } from './seed.ts'

/**
 * Preparation d'une partie : choisir ses personnages et ses decisions.
 *
 * Accessible par `#preparation` uniquement, sans lien depuis le jeu. C'est
 * une porte de service, pour trois usages :
 *  - l'animation d'une seance collective, ou l'on veut confronter un groupe a
 *    un enchainement precis plutot qu'a un tirage ;
 *  - la demonstration, ou l'on veut montrer un cas en particulier ;
 *  - le test, ou l'on veut rejouer une situation sans chercher la graine.
 *
 * Elle reste cachee parce qu'une partie preparee n'est plus une partie : le
 * joueur qui choisit ses personnages choisit ce qu'il va ressentir, ce qui
 * est exactement l'inverse du propos. Le jeu le dit explicitement, et le
 * registre de bas de page remplace « tiree au hasard » par « imposee ».
 */

export type Setup = {
  /** Personnages imposes, dans l'ordre des actes. Vide = tirage normal. */
  readonly characterIds: readonly string[]
  /** Decisions collectives imposees, dans l'ordre des actes. Vide = tirage normal. */
  readonly reformIds: readonly string[]
}

export const EMPTY_SETUP: Setup = { characterIds: [], reformIds: [] }

/** Nombre d'actes, donc de personnages et de decisions dans une partie. */
export const SLOTS = ACT_COUNT

const PARAM_CHARACTERS = 'persos'
const PARAM_REFORMS = 'decisions'

/**
 * Lit une preparation depuis l'adresse.
 *
 * Les identifiants inconnus sont ignores plutot que de faire echouer le
 * chargement : une adresse partagee survit ainsi a un renommage de contenu,
 * en retombant sur le tirage normal pour les places manquantes.
 */
export function setupFromUrl(search: string): Setup {
  const params = new URLSearchParams(search)
  const known = (list: readonly { id: string }[], raw: string | null) =>
    (raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((id) => list.some((x) => x.id === id))
      .slice(0, SLOTS)

  return {
    characterIds: known(characters, params.get(PARAM_CHARACTERS)),
    reformIds: known(reforms, params.get(PARAM_REFORMS)),
  }
}

/**
 * Adresse d'une partie preparee.
 *
 * La graine y reste : elle pilote tout ce que la preparation ne fixe pas —
 * les evenements du mois, l'ordre de comparaison, les places laissees vides.
 */
export function urlForSetup(seed: string, setup: Setup): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.set(SEED_PARAM, seed)
  for (const [key, ids] of [
    [PARAM_CHARACTERS, setup.characterIds],
    [PARAM_REFORMS, setup.reformIds],
  ] as const) {
    if (ids.length > 0) url.searchParams.set(key, ids.join(','))
    else url.searchParams.delete(key)
  }
  return url.toString()
}

export const isPrepared = (s: Setup): boolean =>
  s.characterIds.length > 0 || s.reformIds.length > 0
