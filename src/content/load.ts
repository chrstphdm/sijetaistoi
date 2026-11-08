import bundleJson from '../../content/bundle.json' with { type: 'json' }
import type { ContentBundleT, CharacterT } from '@/schemas/index.ts'
import type { BudgetLine, Stocks } from '@/core/types.ts'
import { euros } from '@/core/money.ts'

/**
 * Le paquet est valide au BUILD, pas a l'execution.
 *
 * Revalider ici couterait du temps de demarrage et embarquerait Zod dans le
 * bundle du jeu pour verifier une propriete deja garantie par la chaine de
 * compilation. `npm run build:content` echoue si le contenu est invalide,
 * donc un paquet present est un paquet valide.
 */
export const bundle = bundleJson as unknown as ContentBundleT

/**
 * Le contenu stocke des MAGNITUDES POSITIVES ; le signe est deduit du groupe.
 *
 * C'est ce qui rend impossible la classe d'erreurs la plus banale en
 * redaction de contenu : saisir une depense en positif et la voir compter
 * comme une ressource. L'auteur ne manipule jamais de signe.
 */
const SIGN: Record<BudgetLine['group'], 1 | -1> = {
  resource: 1,
  levy: -1,
  constrained: -1,
  adjustable: -1,
  credit: -1,
}

export function toBudgetLines(character: CharacterT): BudgetLine[] {
  return character.budget.lines.map((l) => ({
    code: l.code,
    group: l.group,
    amountCents: SIGN[l.group] * euros(l.value.amount),
    value: l.value,
  }))
}

export function toStocks(character: CharacterT): Stocks {
  const s = character.stocks
  return {
    liquid7dCents: euros(s.liquid7d),
    liquid60dCents: euros(s.liquid60d),
    authorisedOverdraftCents: euros(s.authorisedOverdraft),
    netWealthCents: euros(s.netWealth),
    precautionFloorMonths: s.precautionFloorMonths,
  }
}

/** Libelle lisible d'un poste, depuis le referentiel partage. */
export function labelFor(code: string): string {
  return bundle.budgetLines.find((l) => l.code === code)?.label ?? code
}

export const characters = bundle.characters
export const events = bundle.events
