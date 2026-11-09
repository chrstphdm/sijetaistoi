import { z } from 'zod'
import { Id, Value, Condition } from './primitives.ts'

/**
 * Fonction dramatique d'un mois.
 *
 * `RESPIRATION` n'est pas un confort : le moteur en impose au moins une par
 * partie. Sans elle, le corpus devient misérabiliste par construction, et le
 * jeu raconte une thèse qu'il prétend ne pas défendre.
 */
export const DramaticFunction = z.enum(['CALIBRATION', 'CHOC', 'TRAINE', 'RESPIRATION'])

const EventOption = z.object({
  id: Id,
  label: z.string().min(3),
  effects: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('one_off'),
        amount: z.number(),
        /**
         * Une somme a sortir tout de suite, ou un flux du mois qui change ?
         *
         * Les deux etaient confondus, et c'etait une erreur de modele, pas
         * une imprecision de redaction. Une chaudiere a 1 800 EUR doit etre
         * REGLEE : il faut disposer de la somme. Un arret de travail a
         * 980 EUR est un revenu qui n'arrive pas : on ne peut pas « ne pas
         * avoir les moyens » de perdre un revenu, on le subit.
         *
         * Seul `payment` est soumis a la tresorerie disponible. Le champ est
         * facultatif ici parce qu'un encaissement (montant negatif) n'a pas a
         * le porter, mais le build exige qu'il soit declare des que le
         * montant est positif : un defaut silencieux est exactement ce qui a
         * produit l'erreur.
         */
        settlement: z.enum(['payment', 'income_loss']).optional(),
      }),
      z.object({ type: z.literal('spread'), amount: z.number(), months: z.number().int().min(2) }),
      z.object({ type: z.literal('recurring'), amount: z.number(), code: Id }),
      z.object({ type: z.literal('none') }),
    ]),
  ),
  availableIf: Condition.optional(),
  /** Trace laissée dans le bilan : un renoncement n'est pas qu'un chiffre. */
  narrativeTrace: Id.optional(),
})

export const LifeEvent = z
  .object({
    id: Id,
    charterVersion: z.string(),
    descriptiveTitle: z.string().min(5),
    valence: z.enum(['negative', 'neutral', 'positive']),
    intensity: z.number().int().min(0).max(4),
    dramaticFunction: z.array(DramaticFunction).min(1),
    eligibility: Condition,
    probability: z.literal('uniform'),
    cost: Value,
    text: z.string().min(30),
    options: z.array(EventOption).min(2),
    microQuestion: z
      .object({ text: z.string().min(20), principlesInTension: z.array(Id).min(2) })
      .optional(),
  })
  .check((ctx) => {
    const e = ctx.value
    if (e.options.length < 2) return
    // Un evenement dont toutes les options coutent la meme chose n'offre
    // aucun arbitrage : c'est une annonce deguisee en choix.
    const costs = e.options.map((o) =>
      o.effects.reduce((s, f) => s + ('amount' in f ? Math.abs(f.amount) : 0), 0),
    )
    if (new Set(costs).size === 1) {
      ctx.issues.push({
        code: 'custom',
        input: e,
        path: ['options'],
        message: 'toutes les options ont le même coût : il n’y a pas d’arbitrage réel',
      })
    }
  })

export type LifeEventT = z.infer<typeof LifeEvent>
