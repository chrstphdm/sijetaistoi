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
  for (const rule of rulesInForce(world)) {
    const effects = lookup(rule.reformId, rule.optionId)
    if (!effects) continue
    for (const effect of effects) {
      if (effect.kind !== 'budget_line') continue
      if (effect.scope.when && !evaluate(effect.scope.when as Condition, traits)) continue
      out.push({ rule, effect, deltaCents: euros(effect.monthlyDelta ?? 0) })
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
