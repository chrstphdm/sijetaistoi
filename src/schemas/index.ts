import { z } from 'zod'
import { Source, Hypothesis, BudgetLineRef } from './referentials.ts'
import { Character } from './character.ts'
import { LifeEvent } from './event.ts'

export * from './primitives.ts'
export * from './referentials.ts'
export * from './character.ts'
export * from './event.ts'

/** Le paquet compile : ce que le jeu charge au demarrage. */
export const ContentBundle = z.object({
  contentVersion: z.string(),
  builtFrom: z.object({ fileCount: z.number().int(), charterVersion: z.string() }),
  sources: z.array(Source),
  hypotheses: z.array(Hypothesis),
  budgetLines: z.array(BudgetLineRef),
  characters: z.array(Character).min(1),
  events: z.array(LifeEvent),
})

export type ContentBundleT = z.infer<typeof ContentBundle>
