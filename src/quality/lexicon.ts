import type { Violation } from './types.ts'

/**
 * Lexique controle.
 *
 * AVERTISSEMENT, qui figure aussi dans le fichier de contenu : un lexique
 * est lui-meme un artefact politique. Decider qu'un mot est connote est un
 * jugement, et ce jugement doit pouvoir etre conteste. D'ou trois
 * precautions :
 *
 *   - le lexique vit dans content/, editable sans toucher au code ;
 *   - il vise la SYMETRIE, coupant dans tous les sens, et un test verifie
 *     qu'il ne cible pas un seul camp ;
 *   - il est publie sur la page methode.
 *
 * Il s'applique a TOUT le contenu, y compris aux chaines d'interface : rien
 * ne servirait d'interdire « assistanat » dans une fiche de personnage si le
 * libelle d'un bouton l'emploie.
 */

export type LexiconEntry = {
  readonly avoid: string
  readonly prefer: string
  readonly severity: 'blocking' | 'warning'
  readonly why: string
}

/** Normalise pour comparer sans se soucier des accents ni de la casse. */
const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Recherche en frontiere de mot, sur texte normalise.
 * Sans frontiere, « pigeons » declencherait sur « pigeonnier », et
 * « nantis » sur « Nantissement ».
 */
function occurrences(haystack: string, needle: string): boolean {
  const h = fold(haystack)
  const n = fold(needle)
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(h)
}

/** Parcourt recursivement un objet et visite chaque chaine, avec son chemin. */
export function walkStrings(
  value: unknown,
  visit: (text: string, path: string) => void,
  path = '',
): void {
  if (typeof value === 'string') return visit(value, path || '(racine)')
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, visit, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(v, visit, path ? `${path}.${k}` : k)
    }
  }
}

/**
 * Champs exclus du controle.
 *
 * `why` et `avoid` du lexique lui-meme citent necessairement les termes
 * proscrits ; les controler creerait une contradiction. Toute exclusion est
 * nommee ici, jamais implicite.
 */
const EXCLUDED_PATHS = [/^entries\[\d+\]\.(avoid|why|prefer)$/, /^note$/]

export function checkLexicon(
  content: unknown,
  entries: readonly LexiconEntry[],
  label: string,
): readonly Violation[] {
  const out: Violation[] = []
  walkStrings(content, (text, path) => {
    if (EXCLUDED_PATHS.some((re) => re.test(path))) return
    for (const entry of entries) {
      if (!occurrences(text, entry.avoid)) continue
      out.push({
        rule: 'lexique',
        severity: entry.severity,
        where: `${label} · ${path}`,
        message: entry.prefer
          ? `« ${entry.avoid} » → écrire plutôt « ${entry.prefer} ». ${entry.why}`
          : `« ${entry.avoid} » à supprimer. ${entry.why}`,
      })
    }
  })
  return out
}
