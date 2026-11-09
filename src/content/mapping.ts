import type { CharacterT } from '../schemas/index.ts'
import type { BudgetLine, Stocks } from '../core/types.ts'
import { euros } from '../core/money.ts'

/**
 * Conversion contenu -> moteur, SANS dependance au paquet compile.
 *
 * Ces deux fonctions vivaient dans `load.ts`, qui importe `bundle.json`.
 * Or le script de build a besoin de la meme conversion pour verifier le
 * contenu AVANT de produire ce paquet : l'importer depuis `load.ts` aurait
 * boucle, et la recopier aurait cree deux definitions de la meme chose,
 * condamnees a diverger.
 */

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

/**
 * Traits tels que l'evaluateur de conditions les attend.
 *
 * Cette fonction est la SEULE construction autorisee du sac d'attributs.
 * Elle a longtemps ete recopiee a l'identique dans quatre composants ; le
 * jour ou l'age est devenu interrogeable, trois de ces copies ont continue a
 * ne pas le fournir, et une condition d'age s'y evaluait silencieusement a
 * faux. Les copies ont ete supprimees.
 */
export function traitsOf(character: CharacterT) {
  return {
    ...character.traits,
    incomeDecile: character.identity.incomeDecile,
    age: character.identity.age,
  }
}
