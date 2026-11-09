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

/**
 * Une part d'une ligne du releve du personnage, a la place d'un montant fixe.
 *
 * Un montant fixe s'appliquait a l'identique a tout le monde : la meme
 * revision de loyer de 34 EUR representait 10 % du loyer de Lucie et 2 % de
 * celui de Rachid, alors que la loi la plafonne en pourcentage. L'erreur
 * pesait surtout sur les loyers modestes. Une part se calcule sur la
 * situation reelle de chacun.
 *
 * `rate` porte le signe, avec la convention des montants : positif pour ce
 * qui sort, negatif pour ce qui entre. `of` designe la ligne de base, prise
 * en valeur absolue dans le releve courant — regles et choix deja faits
 * compris. Sans cette ligne, la part vaut zero : on ne perd pas un salaire
 * qu'on ne touche pas.
 */
export const Share = z.object({
  // Jusqu'a 60 : le capital restant d'un credit s'exprime en mensualites.
  rate: z.number().min(-60).max(60).refine((r) => r !== 0, 'une part nulle ne decrit rien'),
  of: Id,
  /**
   * Condition sur le PERSONNAGE. Les lignes du releve sont celles du foyer :
   * sans elle, l'arret maladie d'une salariee amputait le revenu
   * independant de son conjoint.
   */
  when: Condition.optional(),
})
export type ShareT = z.infer<typeof Share>

/**
 * `amount` reste obligatoire : c'est la valeur de repere, celle d'un menage
 * type, qui sert aux controles de corpus. Quand `share` est present, c'est
 * lui qui fixe le montant reel.
 */
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
        share: Share.optional(),
      }),
      z.object({
        type: z.literal('spread'), amount: z.number(), months: z.number().int().min(2),
        share: Share.optional(),
      }),
      z.object({ type: z.literal('recurring'), amount: z.number(), code: Id, share: Share.optional() }),
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
    /**
     * Le montant en jeu, calcule sur la situation du personnage : somme de
     * parts de lignes. `cost.amount` reste la valeur de repere. Le texte doit
     * alors ecrire `{montant}` la ou le chiffre apparait — un chiffre fixe dans
     * le texte contredirait le montant affiche a cote.
     */
    costShare: z.array(Share).min(1).optional(),
    text: z.string().min(30),
    options: z.array(EventOption).min(2),
    microQuestion: z
      .object({ text: z.string().min(20), principlesInTension: z.array(Id).min(2) })
      .optional(),
  })
  .check((ctx) => {
    const e = ctx.value
    const hasSlot = e.text.includes('{montant}')
    if (e.costShare && !hasSlot)
      ctx.issues.push({
        code: 'custom', input: e, path: ['text'],
        message: 'un coût calculé exige `{montant}` dans le texte, à la place du chiffre',
      })
    if (!e.costShare && hasSlot)
      ctx.issues.push({
        code: 'custom', input: e, path: ['text'],
        message: '`{montant}` sans `costShare` : rien ne le remplacerait',
      })
    if (e.costShare && e.cost.range)
      ctx.issues.push({
        code: 'custom', input: e, path: ['cost', 'range'],
        message: 'une fourchette fixe n’a pas de sens pour un coût calculé sur chaque situation',
      })
    if (e.options.length < 2) return
    // Un evenement dont toutes les options coutent la meme chose n'offre
    // aucun arbitrage : c'est une annonce deguisee en choix.
    const costs = e.options.map((o) =>
      // Une part compte pour son taux : deux options a 3 % et a 1 % d'une
      // meme ligne n'ont pas le meme cout, quel que soit le montant de repere.
      o.effects.reduce(
        (s, f) => s + ('share' in f && f.share ? Math.abs(f.share.rate) * 1e6 : 'amount' in f ? Math.abs(f.amount) : 0),
        0,
      ),
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
