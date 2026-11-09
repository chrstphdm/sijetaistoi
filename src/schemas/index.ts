import { z } from 'zod'
import { Id } from './primitives.ts'
import { Source, Hypothesis, BudgetLineRef } from './referentials.ts'
import { Character } from './character.ts'
import { LifeEvent } from './event.ts'
import { Reform } from './reform.ts'

export * from './primitives.ts'
export * from './referentials.ts'
export * from './character.ts'
export * from './event.ts'
export * from './reform.ts'

/** Le paquet compile : ce que le jeu charge au demarrage. */
export const MethodPage = z.object({
  title: z.string().min(5),
  intro: z.string().min(80),
  sections: z
    .array(
      z.object({
        id: Id,
        title: z.string().min(5),
        lead: z.string().min(10),
        items: z.array(z.string().min(40)).min(3),
      }),
    )
    .min(3),
  closing: z.string().min(40),
})

/**
 * Un principe de justice porte TOUJOURS son objection.
 *
 * Presenter un principe sans ce qu'on lui reproche reviendrait a le
 * recommander. Le schema rend donc l'objection obligatoire, et d'une
 * longueur comparable a la definition — une objection expediee en une
 * ligne face a une definition de cinq serait un epouvantail.
 */
export const Principle = z
  .object({
    id: Id,
    label: z.string().min(4),
    definition: z.string().min(100),
    objection: z.string().min(100),
  })
  .check((ctx) => {
    const p = ctx.value
    const ratio = p.definition.length / p.objection.length
    if (ratio > 2 || ratio < 0.5) {
      ctx.issues.push({
        code: 'custom', input: p, path: ['objection'],
        message: `déséquilibre entre la définition (${p.definition.length} signes) et l’objection (${p.objection.length}) : une objection expédiée est un épouvantail`,
      })
    }
  })

export const IntroPage = z.object({
  title: z.string().min(3),
  tagline: z.string().min(40),
  pitch: z.array(z.string().min(60)).min(3),
  duration: z.string().min(20),
  startLabel: z.string().min(3),
  contractTitle: z.string().min(10),
  /**
   * Le contrat porte exactement trois engagements, et le schema l'impose :
   * le non-choix du personnage, la persistance des regles, et le sort des
   * reponses. En retirer un reviendrait a transformer la partie en
   * embuscade sur ce point precis.
   */
  contract: z
    .array(z.object({ id: Id, title: z.string().min(10), body: z.string().min(80) }))
    .length(3),
  fiction: z.string().min(60),
  contractStartLabel: z.string().min(3),
  methodLabel: z.string().min(10),

  goalTitle: z.string().min(10),
  goal: z.array(z.string().min(80)).min(2),
  rulesTitle: z.string().min(10),
  rules: z.array(z.object({ id: Id, title: z.string().min(5), body: z.string().min(80) })).min(4),

  theoryTitle: z.string().min(10),
  theoryLead: z.string().min(40),
  /**
   * Chaque theorie porte SON objection, exigee par le schema et de longueur
   * comparable. Une theorie presentee sans ce qu'on lui reproche serait
   * recommandee, pas expliquee — et le jeu se reclamerait d'une doctrine.
   */
  theories: z
    .array(
      z.object({
        id: Id,
        title: z.string().min(5),
        body: z.string().min(150),
        objection: z.string().min(120),
      }),
    )
    .min(3),

  lookTitle: z.string().min(10),
  look: z.array(z.object({ id: Id, title: z.string().min(5), body: z.string().min(120) })).min(3),
  notTitle: z.string().min(10),
  /**
   * Chaque entree porte un mot court (affiche en grand, barre) ET la phrase
   * complete. Le mot seul ne suffit jamais : c'est la phrase qui dit ce que
   * le jeu n'est pas, et pourquoi.
   */
  notList: z
    .array(z.object({ id: Id, label: z.string().min(3).max(24), body: z.string().min(50) }))
    .min(3),
  principlesTitle: z.string().min(10),
})

export const ContentBundle = z.object({
  contentVersion: z.string(),
  builtFrom: z.object({ fileCount: z.number().int(), charterVersion: z.string() }),
  sources: z.array(Source),
  hypotheses: z.array(Hypothesis),
  budgetLines: z.array(BudgetLineRef),
  characters: z.array(Character).min(1),
  events: z.array(LifeEvent),
  reforms: z.array(Reform),
  method: MethodPage,
  intro: IntroPage,
  principles: z.object({
    note: z.string().min(40),
    principles: z.array(Principle).min(10),
    /** Les principes vont par paires opposees : c'est la tension qui compte. */
    tensions: z
      .array(z.object({ a: Id, b: Id, about: z.string().min(10) }))
      .min(5),
  }),
})

export type ContentBundleT = z.infer<typeof ContentBundle>
