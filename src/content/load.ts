import bundleJson from '../../content/bundle.json' with { type: 'json' }
import type { ContentBundleT } from '@/schemas/index.ts'
export { toBudgetLines, toStocks, traitsOf } from './mapping.ts'
import { LINE_SIGN } from './mapping.ts'
import { registerLineSigns } from '../core/world.ts'
import type { BudgetLine } from '../core/types.ts'

/**
 * Le paquet est valide au BUILD, pas a l'execution.
 *
 * Revalider ici couterait du temps de demarrage et embarquerait Zod dans le
 * bundle du jeu pour verifier une propriete deja garantie par la chaine de
 * compilation. `npm run build:content` echoue si le contenu est invalide,
 * donc un paquet present est un paquet valide.
 */
export const bundle = bundleJson as unknown as ContentBundleT

// Le moteur plafonne chaque effet selon le sens du poste (recette ou
// dépense) : il l'apprend ici, une fois, du catalogue.
registerLineSigns(bundle.budgetLines.map((l) => [l.code, LINE_SIGN(l.group as BudgetLine['group'])] as const))

/** Libelle lisible d'un poste, depuis le referentiel partage. */
export function labelFor(code: string): string {
  return bundle.budgetLines.find((l) => l.code === code)?.label ?? code
}

export const characters = bundle.characters
export const events = bundle.events
export const reforms = bundle.reforms

/** Effets d'une option de reforme, pour le moteur de monde. */
export const optionLookup = (reformId: string, optionId: string) =>
  bundle.reforms.find((r) => r.id === reformId)?.options.find((o) => o.id === optionId)
    ?.effects as never
