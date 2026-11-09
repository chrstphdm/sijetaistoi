/**
 * Evaluateur de conditions — pur, sans eval, sans acces a l'exterieur.
 *
 * Le contenu decrit QUI est concerne par un evenement ou un effet, mais il ne
 * contient jamais de logique : il pose des triplets [chemin, operateur,
 * valeur] combines par and / or / not. Le moteur les evalue.
 *
 * Le vocabulaire des chemins est FERME (voir TRAIT_VOCABULARY). Un contenu
 * qui interroge un attribut inexistant est rejete au build, et non
 * silencieusement evalue a faux — une condition toujours fausse rendrait un
 * evenement invisible sans que personne s'en apercoive.
 */

export type Operator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'contains'

export type Condition =
  | readonly [string, Operator, unknown]
  | { readonly and: readonly Condition[] }
  | { readonly or: readonly Condition[] }
  | { readonly not: Condition }

/** Type attendu pour chaque attribut interrogeable. Vocabulaire ferme. */
export const TRAIT_VOCABULARY = {
  'activities': 'string[]',
  'tenure': 'string',
  'heating': 'string',
  'householdSize': 'number',
  'childCount': 'number',
  'hasSchoolAgedChild': 'boolean',
  'incomeDecile': 'number',
  /**
   * L'age vient de l'identite, pas des traits : il y est deja, et le
   * dupliquer dans `traits` aurait cree deux ages pour une personne.
   * Il est interrogeable parce qu'une mesure d'age — un report de l'age de
   * depart — ne peut pas s'ecrire sans lui, et qu'on ne la deduit d'aucun
   * autre attribut.
   */
  'age': 'number',
  /**
   * Zone tendue au sens du zonage reglementaire du logement. C'est le
   * critere juridique qui commande l'encadrement des loyers : sans lui, une
   * mesure de loyer ne pourrait viser que « les locataires », ce qui serait
   * faux.
   */
  'housingZone': 'string',
  /** Handicap ou invalidite reconnus. Un minimum social verse a ce titre
   * n'obeit pas aux memes regles qu'un minimum social verse a un actif :
   * les confondre ferait disparaitre la question meme. */
  'recognisedDisability': 'boolean',
  'hasCar': 'boolean',
  /**
   * Les lignes que porte le releve du personnage. Calcule, pas declare : il
   * permet a une option de ne s'offrir qu'a qui la peut — on n'accelere pas
   * le remboursement d'un credit qu'on n'a pas.
   */
  'budgetLines': 'string[]',
  // Contexte de partie, fourni par le moteur et non par le personnage.
  'month': 'number',
  'year': 'number',
} as const

export type TraitPath = keyof typeof TRAIT_VOCABULARY

/** Operateurs admis pour chaque type d'attribut. */
export const OPERATORS_BY_TYPE: Record<string, readonly Operator[]> = {
  'string': ['eq', 'ne', 'in'],
  'number': ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in'],
  'boolean': ['eq', 'ne'],
  'string[]': ['contains'],
}

export type TraitBag = Readonly<Record<string, unknown>>

const compare = (left: unknown, op: Operator, right: unknown): boolean => {
  switch (op) {
    case 'eq': return left === right
    case 'ne': return left !== right
    case 'lt': return typeof left === 'number' && typeof right === 'number' && left < right
    case 'lte': return typeof left === 'number' && typeof right === 'number' && left <= right
    case 'gt': return typeof left === 'number' && typeof right === 'number' && left > right
    case 'gte': return typeof left === 'number' && typeof right === 'number' && left >= right
    case 'in': return Array.isArray(right) && right.includes(left)
    case 'contains': return Array.isArray(left) && left.includes(right)
  }
}

/**
 * Les formes composees sont testees AVANT la forme tuple : `Array.isArray`
 * ne restreint pas un tuple en lecture seule, alors que l'operateur `in` le
 * fait correctement sur une union de types objet.
 */
export function evaluate(condition: Condition, traits: TraitBag): boolean {
  if ('and' in condition) return condition.and.every((c) => evaluate(c, traits))
  if ('or' in condition) return condition.or.some((c) => evaluate(c, traits))
  if ('not' in condition) return !evaluate(condition.not, traits)
  const [path, op, expected] = condition
  return compare(traits[path], op, expected)
}

/**
 * Verifie qu'une condition n'interroge que des attributs connus, avec des
 * operateurs admis pour leur type. Retourne la liste des problemes.
 * Appele au build, jamais a l'execution.
 */
export function validateCondition(condition: Condition, trail = 'eligibility'): string[] {
  if ('and' in condition) return condition.and.flatMap((c, i) => validateCondition(c, `${trail}.and[${i}]`))
  if ('or' in condition) return condition.or.flatMap((c, i) => validateCondition(c, `${trail}.or[${i}]`))
  if ('not' in condition) return validateCondition(condition.not, `${trail}.not`)

  const [path, op] = condition
  const type = TRAIT_VOCABULARY[path as TraitPath]
  if (!type) {
    const known = Object.keys(TRAIT_VOCABULARY).join(', ')
    return [`${trail} : attribut inconnu « ${path} ». Vocabulaire disponible : ${known}`]
  }
  const allowed = OPERATORS_BY_TYPE[type] ?? []
  if (!allowed.includes(op)) {
    return [`${trail} : opérateur « ${op} » invalide pour « ${path} » (${type}). Admis : ${allowed.join(', ')}`]
  }
  return []
}
