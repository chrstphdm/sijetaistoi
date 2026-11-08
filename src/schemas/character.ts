import { z } from 'zod'
import { Id, Value } from './primitives.ts'
import { LineGroup } from './referentials.ts'

/**
 * La « parite » d'un personnage : les champs qui empechent qu'il soit
 * unidimensionnel.
 *
 * Chacun est OBLIGATOIRE, et c'est le point. Un personnage aise doit avoir
 * une vulnerabilite ; un personnage modeste doit avoir une force ; chacun
 * doit porter une opinion qui va contre son propre interet materiel.
 * Sans cette contrainte de schema, l'auteur produirait mecaniquement des
 * figures : le nanti serene et le precaire accable.
 */
const Parity = z.object({
  strength: z.string().min(20),
  vulnerability: z.string().min(20),
  aspirations: z.array(z.string().min(10)).min(2),
  concerns: z.array(z.string().min(10)).min(2),
  nonMonetaryConstraint: z.string().min(20),
  nonMonetaryAdvantage: z.string().min(20),
  /** Une position que le personnage défend bien qu'elle le desserve. */
  opinionAgainstOwnInterest: z.string().min(20),
})

const CharacterBudgetLine = z.object({
  code: Id,
  group: LineGroup,
  /** Magnitude positive : le signe vient du groupe. */
  value: Value,
})

const Stocks = z.object({
  liquid7d: z.number().min(0),
  liquid60d: z.number().min(0),
  authorisedOverdraft: z.number().min(0),
  netWealth: z.number(),
  precautionFloorMonths: z.number().min(0).max(6),
})

export const Character = z
  .object({
    id: Id,
    charterVersion: z.string(),
    /** Toujours true au MVP. Un personnage non fictif exigerait un consentement. */
    fictional: z.literal(true),
    fictionNote: z.string().min(40),

    identity: z.object({
      firstName: z.string().min(2),
      age: z.number().int().min(16).max(110),
      identityLine: z.string().min(20).max(160),
      incomeDecile: z.number().int().min(1).max(10),
      calibrationSourceIds: z.array(Id).min(1),
    }),

    budget: z.object({ lines: z.array(CharacterBudgetLine).min(3) }),
    stocks: Stocks,
    parity: Parity,

    shortTermGoal: z.object({
      label: z.string().min(10),
      amount: z.number().min(0),
      deadline: z.string().regex(/^\d{4}-\d{2}$/),
    }),

    /** Details non economiques : c'est ce qui cree l'attachement en 40 s. */
    embodiedDetails: z.array(z.string().min(10)).min(3),

    /**
     * Options que ce personnage NE PEUT PAS prendre, avec le motif.
     * L'absence de choix est une donnee du modele, pas un oubli : c'est la
     * parade au reproche fait a SPENT, qui laissait croire que la situation
     * se resout en faisant de meilleurs choix.
     */
    unavailableOptions: z.array(z.object({ option: Id, reason: z.string().min(15) })),

    /** Reperes concrets servant a formuler les equivalences d'impact. */
    equivalenceRefs: z
      .array(z.object({ code: Id, monthlyAmount: z.number().min(0), narrativeLabel: z.string().min(5) }))
      .min(2),

    narrative: z.object({ story: z.string().min(120) }),

    lineOverrides: z
      .array(z.object({ code: Id, constrained: z.boolean(), justification: z.string().min(20) }))
      .default([]),
  })
  .check((ctx) => {
    const c = ctx.value
    const codes = c.budget.lines.map((l) => l.code)
    const dupes = codes.filter((v, i) => codes.indexOf(v) !== i)
    if (dupes.length) {
      ctx.issues.push({
        code: 'custom',
        input: c,
        path: ['budget', 'lines'],
        message: `postes budgétaires en double : ${[...new Set(dupes)].join(', ')}`,
      })
    }
    if (!c.budget.lines.some((l) => l.group === 'resource')) {
      ctx.issues.push({
        code: 'custom',
        input: c,
        path: ['budget', 'lines'],
        message: 'un personnage sans aucune ressource ne peut pas être simulé',
      })
    }
    if (c.stocks.liquid60d < c.stocks.liquid7d) {
      ctx.issues.push({
        code: 'custom',
        input: c,
        path: ['stocks', 'liquid60d'],
        message: 'la liquidité à 60 jours inclut celle à 7 jours : elle ne peut pas être inférieure',
      })
    }
  })

export type CharacterT = z.infer<typeof Character>
