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
})

export type ContentBundleT = z.infer<typeof ContentBundle>
