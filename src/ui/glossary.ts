import { bundle } from '@/content/load.ts'
import type { GlossaryEntryT } from '@/schemas/index.ts'

/**
 * Le glossaire, cote interface : retrouver un terme dans un texte.
 *
 * Un terme est marque a sa PREMIERE apparition sur un ecran, pas a chacune :
 * souligner dix fois « reste a vivre » transformerait la page en sommaire et
 * multiplierait les arrets de tabulation. Les ecrans qui affichent des
 * textes du contenu calculent donc, dans l'ordre de lecture, ou chaque terme
 * apparait d'abord (`firstOccurrences`), et ne marquent que la.
 */

export const glossary: readonly GlossaryEntryT[] = bundle.glossary
export const ALL_TERMS: readonly string[] = glossary.map((g) => g.id)

const byId = new Map(glossary.map((g) => [g.id, g]))
export const entryOf = (id: string): GlossaryEntryT | undefined => byId.get(id)

/** Identifiant de l'element qui porte la definition, pour aria-describedby. */
export const definitionId = (id: string) => `glossaire-def-${id}`

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Motif d'un terme : toutes ses graphies, la plus longue d'abord, en
 * frontiere de lettre, sans egard a la casse, a l'apostrophe (droite ou
 * typographique) ni au type d'espace (le paquet pose des insecables).
 */
const patterns = new Map(
  glossary.map((g) => {
    const forms = [g.term, ...g.forms].sort((a, b) => b.length - a.length).map((f) =>
      escape(f).replace(/['’]/g, '[\'’]').replace(/ /g, '[\\s\\u00A0\\u202F]'),
    )
    return [g.id, new RegExp(`(?<!\\p{L})(?:${forms.join('|')})(?!\\p{L})`, 'iu')]
  }),
)

/** Position de la premiere apparition d'un terme dans un texte, ou null. */
export function findTerm(text: string, id: string): { index: number; length: number } | null {
  const m = patterns.get(id)?.exec(text)
  return m ? { index: m.index, length: m[0].length } : null
}

export type Segment = { readonly text: string; readonly id?: string }

/**
 * Decoupe un texte en morceaux, en isolant la premiere apparition de chacun
 * des termes demandes. Deux termes qui se chevauchent (« niveau de vie »
 * dans « niveaux de vie ») : le premier rencontre l'emporte.
 */
export function segment(text: string, ids: readonly string[]): Segment[] {
  const hits = ids
    .map((id) => ({ id, hit: findTerm(text, id) }))
    .filter((h): h is { id: string; hit: { index: number; length: number } } => h.hit !== null)
    .sort((a, b) => a.hit.index - b.hit.index)

  const out: Segment[] = []
  let at = 0
  for (const { id, hit } of hits) {
    if (hit.index < at) continue
    if (hit.index > at) out.push({ text: text.slice(at, hit.index) })
    out.push({ text: text.slice(hit.index, hit.index + hit.length), id })
    at = hit.index + hit.length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

/**
 * Pour une suite de textes dans l'ordre de lecture d'un ecran, les termes a
 * marquer dans chacun : chaque terme dans le premier texte ou il apparait,
 * et nulle part ailleurs. `already` : termes deja marques plus haut sur
 * l'ecran, par le code.
 */
export function firstOccurrences(
  texts: readonly string[],
  candidates: readonly string[] = ALL_TERMS,
  already: readonly string[] = [],
): string[][] {
  const seen = new Set(already)
  return texts.map((text) => {
    const here = candidates.filter((id) => !seen.has(id) && findTerm(text, id) !== null)
    here.forEach((id) => seen.add(id))
    return here
  })
}
