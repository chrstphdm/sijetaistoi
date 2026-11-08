import { z } from 'zod'

/** Identifiant stable, utilisable comme nom de fichier et comme ancre d'URL. */
export const Id = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, {
  error: 'un identifiant doit être en minuscules, chiffres, tirets ou tirets bas',
})

export const Nature = z.enum(['fact', 'hypothesis', 'extrapolation', 'fiction'])
export const Unit = z.enum(['EUR', 'EUR_month', 'EUR_year', 'EUR_bn', 'pct'])
export const Horizon = z.enum(['month', 'y1', 'y5', 'y10'])

/**
 * Bornes de plausibilite par unite.
 *
 * Ce garde-fou existe a cause d'une erreur reelle, reperee en revue : un
 * montant de 8,9 milliards ecrit `{ amount: 8900, unit: 'EUR_bn' }`, soit un
 * facteur 1000. C'est exactement le « chiffre faux mais credible » que le
 * projet s'interdit, et aucun schema de forme ne l'aurait attrape.
 */
export const MAGNITUDE_BOUNDS: Record<z.infer<typeof Unit>, readonly [number, number]> = {
  EUR: [0, 1_000_000],
  EUR_month: [0, 50_000],
  EUR_year: [0, 600_000],
  EUR_bn: [0, 500],
  pct: [-100, 1000],
}

/**
 * Toute valeur numerique du jeu porte sa provenance.
 *
 * Les montants sont stockes en MAGNITUDE POSITIVE : le signe est deduit du
 * groupe de la ligne budgetaire. Un auteur de contenu ne peut donc pas se
 * tromper de signe, et une depense ne peut pas devenir une ressource par
 * inadvertance.
 */
export const Value = z
  .object({
    amount: z.number().finite(),
    unit: Unit,
    nature: Nature,
    sourceId: Id.optional(),
    hypothesisId: Id.optional(),
    range: z.tuple([z.number(), z.number()]).optional(),
    horizon: Horizon.optional(),
    note: z.string().min(1).optional(),
  })
  .check((ctx) => {
    const v = ctx.value

    if (v.nature === 'fact' && !v.sourceId) {
      ctx.issues.push({
        code: 'custom',
        input: v,
        path: ['sourceId'],
        message: 'une valeur donnée pour un fait doit citer une source',
      })
    }
    if (v.nature === 'hypothesis' && !v.hypothesisId) {
      ctx.issues.push({
        code: 'custom',
        input: v,
        path: ['hypothesisId'],
        message: 'une valeur issue du modèle doit désigner l’hypothèse dont elle dépend',
      })
    }
    if (v.nature !== 'fact' && v.sourceId) {
      ctx.issues.push({
        code: 'custom',
        input: v,
        path: ['sourceId'],
        message: 'seule une valeur de nature « fact » cite une source : sinon elle se ferait passer pour un fait',
      })
    }

    const [min, max] = MAGNITUDE_BOUNDS[v.unit]
    if (v.amount < min || v.amount > max) {
      ctx.issues.push({
        code: 'custom',
        input: v,
        path: ['amount'],
        message: `ordre de grandeur invraisemblable : ${v.amount} ${v.unit} sort de [${min}, ${max}]. Erreur d’unité ?`,
      })
    }

    if (v.range) {
      const [lo, hi] = v.range
      if (lo > hi) {
        ctx.issues.push({ code: 'custom', input: v, path: ['range'], message: 'fourchette inversée' })
      }
      if (v.amount < lo || v.amount > hi) {
        ctx.issues.push({
          code: 'custom',
          input: v,
          path: ['range'],
          message: 'la valeur centrale doit se situer dans sa propre fourchette',
        })
      }
    }
  })

export type ValueInput = z.infer<typeof Value>
