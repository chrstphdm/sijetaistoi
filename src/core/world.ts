import type { Cents } from './money.ts'
import { euros } from './money.ts'
import { evaluate, type Condition, type TraitBag } from './conditions.ts'
import type { BudgetLine } from './types.ts'

/**
 * L'etat du monde est la LISTE ORDONNEE des regles decidees par le joueur.
 *
 * Rien de calcule n'y est stocke. Le budget d'un personnage sous un etat du
 * monde donne se recalcule toujours a partir de cette liste : c'est ce qui
 * rend une partie rejouable a l'identique, et ce qui permettra au mode
 * groupe de rejouer le meme monde pour plusieurs participants.
 */

export type RuleStatus = 'in_force' | 'amended' | 'repealed'

export type Rule = {
  readonly id: string
  readonly reformId: string
  readonly optionId: string
  readonly shortLabel: string
  /**
   * La phrase du joueur, VERBATIM. Jamais reformulee, jamais resumee.
   * C'est la matiere premiere du rappel : l'appropriation vient de la
   * juxtaposition entre sa propre formulation et ce qu'il vit ensuite.
   */
  readonly playerWording: string | null
  readonly playerJudgement: 'yes' | 'rather_yes' | 'rather_no' | 'no' | 'dont_know' | null
  readonly diegeticMonth: string
  /** Chaine des amendements : une regle amendee n'est jamais effacee. */
  readonly replaces: string | null
  readonly status: RuleStatus
}

export type WorldState = {
  readonly rules: readonly Rule[]
  readonly hypothesisSetId: string
}

export const emptyWorld = (hypothesisSetId: string): WorldState => ({
  rules: [],
  hypothesisSetId,
})

/**
 * Enregistre une regle. Si elle en remplace une autre, l'ancienne passe en
 * `amended` mais reste dans la liste : le registre doit pouvoir montrer au
 * joueur ce qu'il a decide puis change d'avis, sans effacer l'histoire.
 */
export function applyRule(world: WorldState, rule: Rule): WorldState {
  const rules = world.rules.map((r) =>
    rule.replaces !== null && r.id === rule.replaces ? { ...r, status: 'amended' as const } : r,
  )
  return { ...world, rules: [...rules, rule] }
}

export const rulesInForce = (world: WorldState): readonly Rule[] =>
  world.rules.filter((r) => r.status === 'in_force')

/* ------------------------------------------------------------------ */
/* Resolution des effets                                               */
/* ------------------------------------------------------------------ */

export type Effect = {
  readonly id: string
  readonly kind: 'budget_line' | 'public_finance' | 'service_level'
  readonly code?: string | undefined
  readonly monthlyDelta?: number | undefined
  readonly monthlyShare?: { readonly rate: number; readonly of: string } | undefined
  readonly publicBillions?: number | undefined
  readonly scope: { readonly when?: unknown; readonly description: string }
  readonly horizon: string
  readonly uncertainty: 'established' | 'debated' | 'highly_debated'
  readonly hypothesisId?: string | undefined
  readonly note?: string | undefined
}

export type ResolvedEffect = {
  readonly rule: Rule
  readonly effect: Effect
  readonly deltaCents: Cents
}

/** Une option de reforme, reduite a ce dont le moteur a besoin. */
export type OptionLookup = (reformId: string, optionId: string) => readonly Effect[] | undefined

/**
 * Effets DEJA EN VIGUEUR, par opposition a ceux qui le seront.
 *
 * Un effet d'horizon `y5` ne modifie pas le mois en cours. Tant que tout le
 * corpus portait l'horizon `y1`, la distinction ne se voyait pas ; elle est
 * devenue fausse le jour ou des mesures a effet differe sont entrees dans le
 * contenu — un plafonnement de loyer n'agit qu'a la relocation, un decalage
 * de l'age de depart n'agit pas avant dix ans. Le releve mensuel les
 * affichait comme acquis.
 *
 * Le filtre n'est pas un defaut applique partout : l'ecran de comparaison
 * montre bien les effets differes, mais en disant a partir de quand.
 */
export const startsAtYear = (horizon: string): number =>
  horizon === 'y10' ? 10 : horizon === 'y5' ? 5 : 1

export const inForceNow = (effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] =>
  effects.filter((e) => startsAtYear(e.effect.horizon) <= 1)

/**
 * Le personnage est-il concerne DE FACON PERCEPTIBLE par une regle en vigueur ?
 *
 * C'est l'enonce exact de la contrainte de casting publiee au joueur. Il etait
 * implemente par « au moins un effet le vise », ce qui a cesse de vouloir dire
 * quelque chose : le controle de couverture du build oblige chaque option a
 * atteindre tout le monde, effet nul compris. Cinquante-deux options sur
 * soixante-cinq atteignent ainsi les treize personnages, et la contrainte
 * etait donc vraie pour chacun — donc ne selectionnait personne, tout en
 * restant affichee dans le registre comme si elle agissait.
 *
 * « Perceptible » veut dire : son budget mensuel change, maintenant.
 */
export const perceptiblyConcerned = (effects: readonly ResolvedEffect[]): boolean =>
  inForceNow(effects).some((e) => e.deltaCents !== 0)

/** Cle, dans le sac d'attributs, des montants de base du releve (centimes signes). */
export const LINE_BAG = '__lineAmounts'

/**
 * Sens de chaque poste du catalogue : +1 pour une recette, -1 pour une
 * depense. Renseigne au chargement du contenu (et par le build) : le moteur
 * ne lit pas le contenu lui-meme.
 */
const lineSigns = new Map<string, 1 | -1>()
export function registerLineSigns(entries: Iterable<readonly [string, 1 | -1]>): void {
  lineSigns.clear()
  for (const [code, sign] of entries) lineSigns.set(code, sign)
}

/**
 * Ramene un effet dans les bornes du releve.
 *
 * Une baisse de depense ne peut pas depasser la depense ; une perte de
 * recette ne peut pas depasser la recette. Sans ce plafond, le moteur
 * fabriquait de l'argent : la gratuite des transports rendait 85 EUR a
 * Yanis, qui en depense 35 — soit 50 EUR de revenu fantome —, et une baisse
 * des « impots » de qui n'en paie pas devenait une recette. Dans l'autre
 * sens, une cotisation sur un salaire absent creait un salaire negatif.
 *
 * Les effets successifs sur un meme poste se cumulent avant le plafond.
 */
function bounded(current: number, delta: number, sign: 1 | -1 | undefined): number {
  if (sign === undefined) return delta
  const next = current + delta
  if (sign === 1 && next < 0) return -current
  if (sign === -1 && next > 0) return -current
  return delta
}

/**
 * Effets en vigueur sur un personnage donne.
 *
 * Un effet dont la portee ne couvre pas le personnage n'est pas ignore en
 * silence : il est simplement absent du resultat. L'appelant distingue
 * « aucun effet » de « effet nul », et cette distinction compte — un rappel
 * a effet nul est un contenu, pas une absence de contenu.
 */
export function activeEffectsFor(
  world: WorldState,
  traits: TraitBag,
  lookup: OptionLookup,
): readonly ResolvedEffect[] {
  const out: ResolvedEffect[] = []
  // Sans montants de base (un test qui construit ses attributs a la main),
  // ni part ni plafond : le comportement d'avant.
  const base = traits[LINE_BAG] as Readonly<Record<string, number>> | undefined
  const running = new Map<string, number>(base ? Object.entries(base) : [])
  for (const rule of rulesInForce(world)) {
    const effects = lookup(rule.reformId, rule.optionId)
    if (!effects) continue
    for (const effect of effects) {
      if (effect.kind !== 'budget_line') continue
      if (effect.scope.when && !evaluate(effect.scope.when as Condition, traits)) continue
      const raw =
        effect.monthlyShare && base
          ? Math.round(effect.monthlyShare.rate * Math.abs(base[effect.monthlyShare.of] ?? 0))
          : euros(effect.monthlyDelta ?? 0)
      if (!base || effect.code === undefined) {
        out.push({ rule, effect, deltaCents: raw })
        continue
      }
      const current = running.get(effect.code) ?? 0
      const delta = bounded(current, raw, lineSigns.get(effect.code))
      running.set(effect.code, current + delta)
      out.push({ rule, effect, deltaCents: delta })
    }
  }
  return out
}

/**
 * Applique les effets en vigueur aux lignes budgetaires d'un personnage.
 *
 * Un effet qui porte sur un poste absent du budget CREE la ligne : c'est le
 * cas des frais d'inscription pour un etudiant qui n'en payait pas.
 */
export function applyEffectsToLines(
  lines: readonly BudgetLine[],
  effects: readonly ResolvedEffect[],
): BudgetLine[] {
  const byCode = new Map(lines.map((l) => [l.code, { ...l }]))

  for (const { effect, deltaCents } of effects) {
    const code = effect.code
    if (code === undefined) continue
    const existing = byCode.get(code)
    // Un effet nul sur un poste absent ne crée rien : il affichait des
    // lignes « Impôts : 0 € » chez qui n'en paie pas.
    if (!existing && deltaCents === 0) continue
    if (existing) {
      byCode.set(code, { ...existing, amountCents: existing.amountCents + deltaCents })
    } else {
      byCode.set(code, {
        code,
        group: deltaCents >= 0 ? 'resource' : 'constrained',
        amountCents: deltaCents,
        value: {
          amount: Math.abs(deltaCents) / 100,
          unit: 'EUR_month',
          nature: effect.uncertainty === 'established' ? 'fiction' : 'hypothesis',
          ...(effect.hypothesisId ? { hypothesisId: effect.hypothesisId } : {}),
        },
      })
    }
  }
  return [...byCode.values()]
}

/** Total des effets d'une regle sur les finances publiques, en milliards. */
export function publicFinanceImpact(
  world: WorldState,
  lookup: OptionLookup,
): number {
  let total = 0
  for (const rule of rulesInForce(world)) {
    for (const e of lookup(rule.reformId, rule.optionId) ?? []) {
      if (e.kind === 'public_finance') total += e.publicBillions ?? 0
    }
  }
  return Math.round(total * 100) / 100
}
