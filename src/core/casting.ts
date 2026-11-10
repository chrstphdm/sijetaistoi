import type { Stream } from './rng.ts'

/**
 * Tirage des personnages.
 *
 * C'est le point du jeu ou un biais passerait le plus facilement inapercu.
 * Un algorithme qui envoie toujours le joueur la ou ca fait mal EST un
 * biais, et le joueur le detectera des sa deuxieme partie — il aura raison
 * de le reprocher, et tout le dispositif perdra sa credibilite d'un coup.
 *
 * Trois decisions en decoulent :
 *
 *   1. Le PREMIER personnage est tire UNIFORMEMENT parmi tous. Aucun biais
 *      n'est possible sur le point d'entree.
 *
 *   2. Les suivants sont tires UNIFORMEMENT parmi ceux qui survivent a des
 *      contraintes DECLAREES PUBLIQUEMENT. Jamais un argmax : les
 *      contraintes filtrent, elles ne classent pas.
 *
 *   3. Chaque tirage est JOURNALISE — contraintes appliquees, contraintes
 *      relachees, ensemble admissible, resultat — et le journal est
 *      consultable par le joueur depuis un ecran dedie.
 */

export type CastingProfile = {
  readonly id: string
  readonly incomeDecile: number
  /** Le personnage est-il concerne de facon perceptible par une regle en vigueur ? */
  readonly concernedByRule: boolean
}

export type ConstraintId = 'not_already_played' | 'concerned_by_a_rule' | 'social_distance'

/**
 * Enonces publics des contraintes, affiches tels quels au joueur.
 * Toute contrainte non enoncee ici n'a pas le droit d'exister dans le code.
 */
export const CONSTRAINT_STATEMENTS: Readonly<Record<ConstraintId, string>> = {
  not_already_played: 'Un personnage déjà incarné n’est pas retiré.',
  /*
   * « DE FACON PERCEPTIBLE » veut dire quelque chose de precis, et l'enonce
   * doit le dire : son budget mensuel change, des maintenant. Formule
   * autrement, l'enonce etait vrai de tout le monde — le controle de
   * couverture du build oblige chaque option a atteindre tous les
   * personnages, effet nul compris — et la contrainte ne selectionnait donc
   * personne tout en restant affichee comme si elle agissait.
   */
  concerned_by_a_rule:
    'À partir du deuxième acte, le tirage privilégie un personnage dont le budget mensuel est déjà modifié par une règle décidée. Être visé par une règle sans que rien ne change, ou pas avant cinq ans, ne compte pas.',
  social_distance:
    'Le tirage privilégie un personnage dont le niveau de vie s’écarte d’au moins trois déciles du précédent.',
}

/**
 * ORDRE DE RELACHEMENT, publie.
 *
 * Quand aucun personnage ne survit a toutes les contraintes, on en relache
 * une, dans cet ordre, jusqu'a ce que l'ensemble ne soit plus vide. La
 * derniere relachee est donc la plus prioritaire.
 *
 * `not_already_played` n'est jamais relachee tant qu'il reste un personnage
 * jamais incarne : rejouer deux fois le meme priverait le joueur d'une
 * perspective.
 */
export const RELAXATION_ORDER: readonly ConstraintId[] = ['social_distance', 'concerned_by_a_rule']

export type Draw = {
  readonly picked: string
  readonly pool: readonly string[]
  /** Ensemble admissible apres filtrage, avant tirage. */
  readonly eligible: readonly string[]
  readonly applied: readonly ConstraintId[]
  readonly relaxed: readonly ConstraintId[]
  readonly uniform: boolean
  /**
   * Vrai quand le personnage a ete IMPOSE et non tire.
   *
   * Sans ce drapeau, une partie preparee a la main depuis l'ecran de
   * preparation ferait mentir la page methode, qui affirme que le premier
   * personnage est tire au hasard parmi les six. Le registre de bas de page
   * lit ce drapeau et change d'enonce en consequence.
   */
  readonly imposed?: boolean
}

const FILTERS: Record<
  ConstraintId,
  (c: CastingProfile, ctx: { played: readonly string[]; previousDecile: number | null }) => boolean
> = {
  not_already_played: (c, ctx) => !ctx.played.includes(c.id),
  concerned_by_a_rule: (c) => c.concernedByRule,
  social_distance: (c, ctx) =>
    ctx.previousDecile === null || Math.abs(c.incomeDecile - ctx.previousDecile) >= 3,
}

export function castFirst(pool: readonly CastingProfile[], stream: Stream): Draw {
  const ids = pool.map((c) => c.id)
  const picked = stream.pick(ids)
  if (picked === undefined) throw new Error('aucun personnage disponible')
  return { picked, pool: ids, eligible: ids, applied: [], relaxed: [], uniform: true }
}

/**
 * Personnage IMPOSE, depuis l'ecran de preparation.
 *
 * Aucun aleatoire n'est consomme : c'est voulu. Si cette fonction tirait dans
 * un flux, le simple fait d'ouvrir l'ecran de preparation decalerait la suite
 * de la partie, et deux parties de meme graine ne seraient plus identiques.
 */
export function castChosen(picked: string, pool: readonly CastingProfile[]): Draw {
  const ids = pool.map((c) => c.id)
  if (!ids.includes(picked)) throw new Error(`personnage inconnu : ${picked}`)
  return { picked, pool: ids, eligible: [picked], applied: [], relaxed: [], uniform: false, imposed: true }
}

export function castNext(
  pool: readonly CastingProfile[],
  played: readonly string[],
  previousDecile: number | null,
  stream: Stream,
): Draw {
  const ids = pool.map((c) => c.id)
  const ctx = { played, previousDecile }

  let active: ConstraintId[] = ['not_already_played', 'concerned_by_a_rule', 'social_distance']
  const relaxed: ConstraintId[] = []

  const survivors = (cs: readonly ConstraintId[]) =>
    pool.filter((c) => cs.every((id) => FILTERS[id](c, ctx)))

  let eligible = survivors(active)
  for (const toRelax of RELAXATION_ORDER) {
    if (eligible.length > 0) break
    active = active.filter((c) => c !== toRelax)
    relaxed.push(toRelax)
    eligible = survivors(active)
  }

  // Dernier recours : tout le monde, y compris deja joue. Signale comme tel.
  if (eligible.length === 0) {
    relaxed.push('not_already_played')
    active = []
    eligible = [...pool]
  }

  const picked = stream.pick(eligible.map((c) => c.id))
  if (picked === undefined) throw new Error('aucun personnage disponible')

  return {
    picked,
    pool: ids,
    eligible: eligible.map((c) => c.id),
    applied: active,
    relaxed,
    uniform: true,
  }
}
