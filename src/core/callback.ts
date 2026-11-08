import type { Cents } from './money.ts'
import type { Stream } from './rng.ts'
import type { Rule } from './world.ts'

/**
 * Le rappel : la juxtaposition entre une phrase que le joueur a ecrite et la
 * situation qu'il vit maintenant.
 *
 * C'est le seul mecanisme qui produit le declic vise par le projet. Tout le
 * reste existe pour l'amener.
 *
 * Il se deroule en quatre temps :
 *   T0 MARQUAGE      au vote : « cette decision s'appliquera aussi aux
 *                    personnages que tu incarneras plus tard »
 *   T1 RENCONTRE     la regle est un fait du monde, sans auteur nomme
 *   T2 ATTRIBUTION   une seule fois, au moment ou la ligne devient une
 *                    decision : la phrase du joueur, citee verbatim
 *   T3 RESTITUTION   ce que la regle a produit ICI, et ce qu'elle a produit
 *                    AILLEURS — les deux toujours ensemble
 *
 * Le jeu cite, il ne juge pas. Aucun adverbe, aucune synthese morale.
 */

export type CallbackSign = 'unfavourable' | 'neutral' | 'favourable'

export type CallbackCandidate = {
  readonly rule: Rule
  readonly characterId: string
  readonly deltaCents: Cents
  /** Effet constate sur le personnage incarne. */
  readonly here: string
  /** Effet constate ailleurs : sur les finances publiques, sur d'autres. */
  readonly elsewhere: string
}

export type Callback = CallbackCandidate & { readonly sign: CallbackSign }

/**
 * Seuil de perceptibilite, en centimes mensuels.
 * En deca, l'effet existe mais ne se vit pas : le rappel est alors `neutral`,
 * et c'est un contenu a part entiere, pas une absence de contenu.
 */
export const PERCEPTIBLE_CENTS = 500

export function signOf(deltaCents: Cents): CallbackSign {
  if (deltaCents <= -PERCEPTIBLE_CENTS) return 'unfavourable'
  if (deltaCents >= PERCEPTIBLE_CENTS) return 'favourable'
  return 'neutral'
}

export const withSign = (c: CallbackCandidate): Callback => ({ ...c, sign: signOf(c.deltaCents) })

/* ------------------------------------------------------------------ */
/* Quota de signe                                                      */
/* ------------------------------------------------------------------ */

/**
 * REGLE S1, la seule qui ne cede jamais : au plus la moitie des rappels
 * d'une partie peuvent etre defavorables.
 *
 * Sans elle, le jeu ne montre au joueur que les consequences douloureuses de
 * ses propres choix. Ce serait le biais le plus probable du projet, et le
 * plus difficile a voir de l'interieur : chaque rappel pris isolement
 * paraitrait justifie.
 */
export const unfavourableCap = (total: number): number => Math.ceil(total / 2)

export function respectsSignQuota(history: readonly CallbackSign[], next: CallbackSign): boolean {
  if (next !== 'unfavourable') return true
  const total = history.length + 1
  const unfavourable = history.filter((s) => s === 'unfavourable').length + 1
  return unfavourable <= unfavourableCap(total)
}

export type Selection =
  | { readonly kind: 'selected'; readonly callback: Callback }
  | { readonly kind: 'none_available' }
  /**
   * Aucun candidat ne respecte le quota. Le moteur NE VIOLE PAS la regle en
   * silence : il remonte le cas, et l'interface le dit au joueur. Un
   * dispositif qui contourne discretement sa propre garantie ne vaut rien.
   */
  | { readonly kind: 'quota_blocked'; readonly blocked: readonly Callback[] }

/**
 * Choisit un rappel parmi les candidats.
 *
 * Le tirage est ALEATOIRE parmi les candidats admissibles, jamais un argmax.
 * Selectionner le rappel le plus douloureux produirait un jeu qui envoie
 * toujours le joueur la ou ca fait mal — un biais que le joueur detecterait
 * des sa deuxieme partie, et qu'il aurait raison de reprocher.
 */
export function selectCallback(
  candidates: readonly CallbackCandidate[],
  history: readonly CallbackSign[],
  stream: Stream,
): Selection {
  if (candidates.length === 0) return { kind: 'none_available' }

  const all = candidates.map(withSign)
  const eligible = all.filter((c) => respectsSignQuota(history, c.sign))

  if (eligible.length === 0) return { kind: 'quota_blocked', blocked: all }

  // Ordre melange puis premier element : le tirage ne depend d'aucune
  // propriete du candidat, seulement du flux de presentation.
  const picked = stream.shuffle(eligible)[0]!
  return { kind: 'selected', callback: picked }
}

/**
 * Cible de composition sur une partie de trois actes :
 * un defavorable, un favorable ou neutre, un quelconque.
 * C'est une CIBLE, pas une contrainte dure — contrairement a S1.
 */
export function describeComposition(history: readonly CallbackSign[]): {
  readonly unfavourable: number
  readonly neutral: number
  readonly favourable: number
  readonly withinCap: boolean
} {
  const count = (s: CallbackSign) => history.filter((h) => h === s).length
  const unfavourable = count('unfavourable')
  return {
    unfavourable,
    neutral: count('neutral'),
    favourable: count('favourable'),
    withinCap: history.length === 0 || unfavourable <= unfavourableCap(history.length),
  }
}
