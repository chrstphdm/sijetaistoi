import { z } from 'zod'
import { Id, Value, Horizon, Condition } from './primitives.ts'

/**
 * Degre de certitude d'un effet. Il est affiche au joueur, toujours.
 * `debated` et `highly_debated` exigent de designer l'hypothese concernee :
 * le jeu ne presente jamais une these contestee comme un resultat.
 */
export const Uncertainty = z.enum(['established', 'debated', 'highly_debated'])

/**
 * Familles de leviers. Une reforme doit en proposer au moins trois, dont
 * obligatoirement le statu quo et la contestation du cadrage.
 *
 * Sans `challenge_framing`, le dispositif imposerait sa propre these : que
 * la politique se reduit a un arbitrage budgetaire a somme nulle. C'est
 * precisement le « cadrage implicite » que le projet s'interdit.
 */
export const LeverFamily = z.enum([
  'public_spending',
  'levies',
  'scope_efficiency',
  'debt_financing',
  'status_quo',
  'challenge_framing',
])

const Scope = z.object({
  /** Condition sur les attributs du personnage. Vocabulaire fermé. */
  when: Condition.optional(),
  description: z.string().min(5),
})

export const Effect = z
  .object({
    id: Id,
    kind: z.enum(['budget_line', 'public_finance', 'service_level']),
    /** Poste budgétaire touché, pour kind === 'budget_line'. */
    code: Id.optional(),
    /**
     * Variation mensuelle en euros. Signé : négatif = le ménage paie plus.
     * Avec `monthlyShare`, c'est la valeur de repère d'un ménage type, et la
     * part fixe le montant réel.
     */
    monthlyDelta: z.number().optional(),
    /**
     * La variation comme PART d'une ligne du personnage, même signe que
     * `monthlyDelta`. Une cotisation de 1,2 point ne coûte pas la même chose
     * sur 390 € et sur 5 100 € : un montant unique faisait payer autant
     * Yanis que Rachid.
     */
    monthlyShare: z.object({ rate: z.number().min(-2).max(2), of: Id }).optional(),
    /** Impact sur les finances publiques, en milliards. Signé. */
    publicBillions: z.number().optional(),
    scope: Scope,
    horizon: Horizon,
    uncertainty: Uncertainty,
    hypothesisId: Id.optional(),
    note: z.string().min(10).optional(),
  })
  .check((ctx) => {
    const e = ctx.value
    if (e.kind === 'budget_line' && (e.code === undefined || e.monthlyDelta === undefined)) {
      ctx.issues.push({
        code: 'custom', input: e, path: ['code'],
        message: 'un effet sur le budget doit désigner un poste et une variation mensuelle',
      })
    }
    if (e.kind === 'public_finance' && e.publicBillions === undefined) {
      ctx.issues.push({
        code: 'custom', input: e, path: ['publicBillions'],
        message: 'un effet sur les finances publiques doit porter un montant en milliards',
      })
    }
    if (e.uncertainty !== 'established' && !e.hypothesisId) {
      ctx.issues.push({
        code: 'custom', input: e, path: ['hypothesisId'],
        message: 'un effet débattu doit désigner l’hypothèse dont il dépend, sinon il se présente comme acquis',
      })
    }
  })

export const ReformOption = z
  .object({
    id: Id,
    label: z.string().min(5),
    decisionDescription: z.string().min(20),
    families: z.array(LeverFamily).min(1),
    isStatusQuo: z.boolean().default(false),
    isCompromise: z.boolean().default(false),
    effects: z.array(Effect).min(1),
    /** Arguments légitimes, dans les deux sens. Obligatoires et équilibrés. */
    argumentsFor: z.array(z.string().min(25)).min(2),
    argumentsAgainst: z.array(z.string().min(25)).min(2),
  })
  .check((ctx) => {
    const o = ctx.value
    // REGLE DE SYMETRIE BILATERALE.
    // Une option qui ne ferait que des perdants, ou que des gagnants, est un
    // epouvantail ou un cadeau : dans les deux cas elle oriente le joueur
    // sans le dire.
    const deltas = o.effects
      .filter((e) => e.kind === 'budget_line' && e.monthlyDelta !== undefined)
      .map((e) => e.monthlyDelta as number)
    if (deltas.length > 0) {
      const hasLoser = deltas.some((d) => d < 0)
      const hasWinnerOrNeutral = deltas.some((d) => d >= 0)
      if (hasLoser && !hasWinnerOrNeutral && !o.isStatusQuo) {
        ctx.issues.push({
          code: 'custom', input: o, path: ['effects'],
          message: 'option à sens unique : tous les effets sur les ménages sont défavorables. Identifier qui y gagne, ou expliciter que personne n’y gagne via un effet de niveau de service.',
        })
      }
    }
    const ratio = o.argumentsFor.length / o.argumentsAgainst.length
    if (ratio > 2 || ratio < 0.5) {
      ctx.issues.push({
        code: 'custom', input: o, path: ['argumentsFor'],
        message: `déséquilibre argumentatif : ${o.argumentsFor.length} pour contre ${o.argumentsAgainst.length} contre`,
      })
    }
  })

export const Reform = z
  .object({
    id: Id,
    charterVersion: z.string(),
    descriptiveTitle: z.string().min(10),
    /** Acteur FICTIF qui pose le problème. Jamais « il faut », jamais « l'État doit ». */
    statedBy: z.string().min(5),
    context: z.string().min(50),
    objective: Value,
    contextSourceIds: z.array(Id),
    options: z.array(ReformOption).min(3),
    modelLimitations: z.string().min(50),
  })
  .check((ctx) => {
    const r = ctx.value
    const families = new Set(r.options.flatMap((o) => o.families))
    if (!families.has('status_quo')) {
      ctx.issues.push({
        code: 'custom', input: r, path: ['options'],
        message: 'toute réforme doit offrir le statu quo : ne rien faire est une décision',
      })
    }
    if (!families.has('challenge_framing')) {
      ctx.issues.push({
        code: 'custom', input: r, path: ['options'],
        message: 'toute réforme doit permettre de contester le cadrage, sinon le jeu impose sa propre thèse : que la politique se réduit à un arbitrage à somme nulle',
      })
    }
    if (families.size < 3) {
      ctx.issues.push({
        code: 'custom', input: r, path: ['options'],
        message: `seulement ${families.size} famille(s) de leviers : le choix est trop étroit pour être un vrai choix`,
      })
    }
    if (r.options.filter((o) => o.isStatusQuo).length !== 1) {
      ctx.issues.push({
        code: 'custom', input: r, path: ['options'],
        message: 'exactement une option doit être marquée comme statu quo',
      })
    }
  })

export type ReformT = z.infer<typeof Reform>
export type ReformOptionT = z.infer<typeof ReformOption>
export type EffectT = z.infer<typeof Effect>
