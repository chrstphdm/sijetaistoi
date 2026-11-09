import { z } from 'zod'
import { Id } from './primitives.ts'

/**
 * L'affiliation d'une source est declaree, jamais jugee.
 * Le jeu n'etablit aucune hierarchie de credibilite entre un organisme
 * statistique et un think tank : il affiche l'affiliation et laisse le
 * joueur en faire ce qu'il veut.
 */
export const Affiliation = z.enum([
  'public_institution',
  'statistics_body',
  'academic',
  'think_tank',
  'professional_body',
  'international',
])

export const Source = z.object({
  id: Id,
  name: z.string().min(3),
  organisation: z.string().min(2),
  affiliation: Affiliation,
  url: z.url(),
  vintage: z.string().regex(/^\d{4}(-\d{2})?$/, { error: 'millésime attendu : AAAA ou AAAA-MM' }),
  scope: z.string().min(3),
})

/**
 * Une hypothese du modele porte TOUJOURS au moins deux lectures, chacune
 * nommee par un mecanisme.
 *
 * C'est la regle qui empeche le jeu de trancher en silence un debat ouvert.
 * Une hypothese a lecture unique est un contenu invalide, pas un contenu
 * incomplet : elle presenterait une these comme un fait.
 */
export const Hypothesis = z.object({
  id: Id,
  question: z.string().min(10),
  status: z.enum(['consensual', 'debated', 'highly_debated']),
  whyDebated: z.string().min(20),
  /**
   * Qui applique l'hypothese.
   *
   * `content` : elle calibre une ligne de budget, et un poste doit la citer.
   * `engine` : elle est appliquee par le moteur — le seuil de tresorerie qui
   * decide si « payer en une fois » est possible, par exemple. Aucun fichier
   * de contenu ne la cite alors, et le controle des references orphelines ne
   * doit pas la signaler : elle est publiee sur la page methode, a cote de la
   * regle qu'elle gouverne.
   */
  appliedBy: z.enum(['content', 'engine']).default('content'),
  readings: z
    .array(
      z.object({
        id: z.enum(['A', 'B']),
        mechanismLabel: z.string().min(5),
        parameters: z.record(z.string(), z.number()),
        sourceIds: z.array(Id),
      }),
    )
    .min(2, { error: 'une hypothèse doit exposer au moins deux lectures' }),
})

export const LineGroup = z.enum(['resource', 'levy', 'constrained', 'adjustable', 'credit'])

/**
 * Le caractere contraint d'une depense n'est pas une propriete objective :
 * c'est un arbitrage. Il est donc declare ici, poste par poste, et peut etre
 * surcharge par personnage AVEC JUSTIFICATION (voir Character.lineOverrides).
 * `kappa` mesure la compressibilite : 0 = incompressible, 1 = entierement
 * arbitrable.
 */
export const BudgetLineRef = z.object({
  code: Id,
  label: z.string().min(2),
  group: LineGroup,
  constrained: z.boolean(),
  kappa: z.number().min(0).max(1),
  methodNote: z.string().min(10),
})

export type SourceT = z.infer<typeof Source>
export type HypothesisT = z.infer<typeof Hypothesis>
export type BudgetLineRefT = z.infer<typeof BudgetLineRef>
