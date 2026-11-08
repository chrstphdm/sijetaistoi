import { z } from 'zod'
import { Character, LifeEvent, Reform } from '@/schemas/index.ts'
import { checkLexicon, type LexiconEntry } from '@/quality/lexicon.ts'
import type { Violation } from '@/quality/types.ts'

/**
 * Noyau d'edition de l'Atelier. PUR : aucun acces au disque, au DOM ni au
 * reseau. Toute la logique d'edition se teste donc sans navigateur.
 *
 * L'Atelier applique EXACTEMENT les memes regles que la chaine de build :
 * memes schemas Zod, meme lexique. Un contenu accepte ici passe le build,
 * et un contenu refuse ici serait refuse au build. Deux jeux de regles
 * divergents seraient pires que pas d'Atelier du tout.
 */

export type ContentKind = 'character' | 'event' | 'reform'

export const KIND_LABEL: Record<ContentKind, string> = {
  character: 'Personnage',
  event: 'Événement',
  reform: 'Décision collective',
}

/** Pluriels écrits, parce que « Décision collectives » ne s'invente pas. */
export const KIND_PLURAL: Record<ContentKind, string> = {
  character: 'Personnages',
  event: 'Événements',
  reform: 'Décisions collectives',
}

export const KIND_DIR: Record<ContentKind, string> = {
  character: 'characters',
  event: 'events',
  reform: 'reforms',
}

const SCHEMA: Record<ContentKind, z.ZodType<unknown>> = {
  character: Character as unknown as z.ZodType<unknown>,
  event: LifeEvent as unknown as z.ZodType<unknown>,
  reform: Reform as unknown as z.ZodType<unknown>,
}

export type Draft = {
  readonly kind: ContentKind
  readonly id: string
  /** Texte brut en cours d'edition. Source de verite pendant la frappe. */
  readonly text: string
  /** Fichier d'origine, pour savoir ou ecrire. */
  readonly path: string
  readonly dirty: boolean
}

export type Diagnostic = {
  readonly severity: 'blocking' | 'warning'
  readonly path: string
  readonly message: string
}

export type Validation = {
  readonly parsed: unknown | null
  readonly diagnostics: readonly Diagnostic[]
  readonly valid: boolean
}

/**
 * Valide un brouillon : JSON, puis schema, puis lexique.
 *
 * Les trois niveaux sont rendus ENSEMBLE et non en cascade : un auteur qui
 * corrige une faute de schema doit voir du meme coup les termes proscrits
 * de son texte, sans avoir a relancer. C'est la correction du defaut releve
 * sur la chaine de build, ou une erreur de schema masquait les suivantes.
 */
export function validate(
  draft: Draft,
  lexicon: readonly LexiconEntry[],
): Validation {
  let parsed: unknown
  try {
    parsed = JSON.parse(draft.text)
  } catch (e) {
    return {
      parsed: null,
      valid: false,
      diagnostics: [
        { severity: 'blocking', path: '(fichier)', message: `JSON invalide : ${(e as Error).message}` },
      ],
    }
  }

  const diagnostics: Diagnostic[] = []

  const result = SCHEMA[draft.kind].safeParse(parsed)
  if (!result.success) {
    for (const issue of result.error.issues) {
      diagnostics.push({
        severity: 'blocking',
        path: issue.path.join('.') || '(racine)',
        message: issue.message,
      })
    }
  }

  // Le lexique tourne sur le JSON brut, meme si le schema a echoue.
  for (const v of checkLexicon(parsed, lexicon, draft.id)) {
    diagnostics.push({
      severity: v.severity,
      path: v.where.replace(`${draft.id} · `, ''),
      message: v.message,
    })
  }

  return {
    parsed: result.success ? result.data : null,
    valid: diagnostics.every((d) => d.severity !== 'blocking'),
    diagnostics,
  }
}

/** Identifiant libre, derive d'un libelle. */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Duplique un contenu sous un nouvel identifiant.
 *
 * Les champs NARRATIFS sont vides plutot que recopies, et marques a
 * reecrire. Dupliquer un personnage puis changer trois chiffres produirait
 * deux personnages qui se ressemblent, ce que la charte interdit : chacun
 * doit porter sa propre force, sa propre vulnerabilite et sa propre
 * opinion a contre-interet.
 */
const NARRATIVE_FIELDS = [
  'narrative', 'parity', 'embodiedDetails', 'fictionNote',
  'text', 'context', 'decisionDescription', 'argumentsFor', 'argumentsAgainst',
]

/** Vide une valeur en gardant sa forme, pour que les erreurs restent precises. */
function blank(value: unknown): unknown {
  if (typeof value === 'string') return ''
  if (Array.isArray(value)) return []
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blank(v)]))
  }
  return value
}

export function duplicate(source: unknown, newId: string): unknown {
  const clone = structuredClone(source) as Record<string, unknown>
  clone['id'] = newId

  // Les champs narratifs sont reellement VIDES, pas seulement signales.
  // Leur structure est conservee pour que le schema designe precisement
  // chaque champ a reecrire plutot que de dire « objet manquant ».
  const emptied: string[] = []
  for (const field of NARRATIVE_FIELDS) {
    if (field in clone) {
      clone[field] = blank(clone[field])
      emptied.push(field)
    }
  }
  clone['toRewrite'] = emptied
  return clone
}

/** Mise en forme stable : deux exports du meme contenu sont identiques. */
export const serialise = (value: unknown): string => JSON.stringify(value, null, 2) + '\n'

export function summarise(diagnostics: readonly Diagnostic[]): string {
  const blocking = diagnostics.filter((d) => d.severity === 'blocking').length
  const warnings = diagnostics.length - blocking
  if (blocking === 0 && warnings === 0) return 'Aucun problème'
  const parts: string[] = []
  if (blocking > 0) parts.push(`${blocking} bloquant${blocking > 1 ? 's' : ''}`)
  if (warnings > 0) parts.push(`${warnings} à examiner`)
  return parts.join(', ')
}

export type { Violation }
