import type { Cents } from './money.ts'
import type { MonthlyBudget, Stocks } from './types.ts'

/**
 * Ce qu'un personnage peut materiellement choisir.
 *
 * Defaut constate : l'option « payer en une fois » etait proposee a tout le
 * monde. Claire disposait de 180 EUR et pouvait regler une chaudiere a
 * 1 800 EUR. Le schema prevoyait bien un champ `availableIf` sur chaque
 * option, mais rien ne l'evaluait : la contrainte etait declaree et jamais
 * appliquee — le meme defaut que plusieurs garanties de neutralite ecrites en
 * commentaire et non verifiees.
 *
 * PRINCIPE : une option impossible n'est pas masquee, elle est montree barree
 * avec son motif chiffre.
 *
 * C'est le cœur du jeu, pas une politesse d'interface. Masquer l'option
 * reviendrait a faire disparaitre la contrainte : le joueur verrait deux
 * choix chez Claire et trois chez Marc et Anne sans savoir pourquoi, et
 * conclurait que Claire a « moins d'options » par nature. La montrer barree
 * rend visible ce qui est justement a ressentir : la meme panne n'est pas la
 * meme panne. Marc et Anne paient sans y penser ; Claire ne peut pas.
 *
 * Le precedent SPENT echouait exactement la : il presentait l'absence de
 * choix comme un echec du joueur plutot que comme une donnee de la situation.
 *
 * STATUT : hypothese de modele, pas fait source. Les seuils ci-dessous sont
 * des conventions, declarees dans HYPOTHESES.md et sur la page methode.
 */

/**
 * ENONCES PUBLICS de la regle de tresorerie, affiches tels quels sur la page
 * methode.
 *
 * Meme discipline que `CONSTRAINT_STATEMENTS` pour le tirage : une regle qui
 * change ce que le joueur peut choisir n'a pas le droit d'exister sans etre
 * enoncee. C'est une hypothese de modele, pas un fait source.
 */
export const AVAILABILITY_STATEMENTS: readonly string[] = [
  'Une somme à régler tout de suite n’est choisissable que si le personnage en dispose : trésorerie mobilisable sous sept jours, découvert autorisé compris.',
  'Le découvert autorisé compte comme mobilisable. L’en exclure reviendrait à décider à la place du personnage qu’il refuse de s’en servir ; le jeu signale qu’il est mobilisé, et s’arrête là.',
  'Mobiliser la réserve que le personnage déclare garder de côté reste possible : c’est signalé, jamais interdit.',
  'Un étalement et une dépense récurrente ne sont jamais bloqués : refuser un crédit supposerait de simuler la décision d’un prêteur, donc d’inventer une conséquence.',
  'Un revenu qui n’arrive pas n’est pas une somme à financer : une perte de revenu est subie, et ne rend aucune option impossible.',
  'Une option impossible reste affichée, barrée, avec son motif chiffré. La faire disparaître ferait disparaître la contrainte avec elle.',
]

export type Availability =
  /** Choisissable sans rien entamer. */
  | { readonly kind: 'available' }
  /**
   * Choisissable, mais seulement en mobilisant une reserve ou un decouvert.
   * Le motif est enonce ; le jeu ne dit pas si c'est raisonnable.
   */
  | { readonly kind: 'strained'; readonly reason: string }
  /** Non choisissable : l'argent n'existe pas. */
  | { readonly kind: 'impossible'; readonly reason: string }

/** Effets tels que le schema d'evenement les decrit. */
export type EffectLike =
  | {
      readonly type: 'one_off'
      readonly amount: number
      readonly settlement?: 'payment' | 'income_loss' | undefined
    }
  | { readonly type: 'spread'; readonly amount: number; readonly months: number }
  | { readonly type: 'recurring'; readonly amount: number; readonly code: string }
  | { readonly type: 'none' }

const eur = (cents: Cents): string => {
  const whole = Math.round(Math.abs(cents) / 100)
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`
}

/**
 * Tresorerie atteignable en sept jours, decouvert autorise compris.
 *
 * Le decouvert autorise en fait partie : il est effectivement mobilisable, et
 * l'exclure reviendrait a decider a la place du personnage qu'il refuse de
 * l'utiliser. Le jeu signale qu'il est mobilise, et s'arrete la.
 */
export function reachableCents(stocks: Stocks): Cents {
  return stocks.liquid7dCents + stocks.authorisedOverdraftCents
}

/**
 * Liquidite mobilisable sans entamer le coussin que le personnage declare
 * garder. Identique au calcul de `absorptionRegime`, volontairement : deux
 * definitions de la meme chose finiraient par se contredire.
 */
export function usableLiquidityCents(budget: MonthlyBudget, stocks: Stocks): Cents {
  const floor = Math.max(0, budget.slackCents) * stocks.precautionFloorMonths
  return Math.max(0, stocks.liquid7dCents - floor)
}

/**
 * Disponibilite d'une option, d'apres ses seuls effets.
 *
 * Seul le decaissement immediat est contraint. Un etalement ne l'est pas :
 * refuser un credit supposerait de simuler la decision d'un preteur, donc
 * d'inventer une consequence pour appuyer une these. Le jeu s'y refuse. Une
 * mensualite qui ne passe pas produit un mois en deficit, ce qui est un vecu
 * legitime et non une impossibilite.
 */
export function optionAvailability(
  effects: readonly EffectLike[],
  budget: MonthlyBudget,
  stocks: Stocks,
  who = 'ce personnage',
): Availability {
  /*
   * Seules les sommes a REGLER contraignent le choix.
   *
   * Un revenu qui n'arrive pas (`income_loss`) n'est pas finance : il est
   * subi. Confondre les deux revenait a declarer qu'un arret de travail a
   * 980 EUR est « hors de portee » de qui a 310 EUR sur son compte, ce qui
   * n'a aucun sens — et fermait l'ecran sans aucune option. Erreur relevee
   * par le controle de build ajoute en meme temps que ce module.
   */
  const immediate = effects
    .filter((e) => e.type === 'one_off' && e.settlement === 'payment')
    .reduce((sum, e) => sum + Math.round((e as { amount: number }).amount * 100), 0)

  // Un encaissement immediat ne contraint rien.
  if (immediate <= 0) return { kind: 'available' }

  const reachable = reachableCents(stocks)
  if (immediate > reachable) {
    return {
      kind: 'impossible',
      reason:
        stocks.authorisedOverdraftCents > 0
          ? `${eur(immediate)} à régler tout de suite, pour ${eur(stocks.liquid7dCents)} disponibles et ${eur(stocks.authorisedOverdraftCents)} de découvert autorisé.`
          : `${eur(immediate)} à régler tout de suite, pour ${eur(stocks.liquid7dCents)} disponibles et aucun découvert autorisé.`,
    }
  }

  if (immediate > stocks.liquid7dCents) {
    return {
      kind: 'strained',
      reason: `Possible en passant à découvert de ${eur(immediate - stocks.liquid7dCents)}.`,
    }
  }

  const usable = usableLiquidityCents(budget, stocks)
  if (immediate > usable) {
    return {
      kind: 'strained',
      reason: `Possible en entamant les ${eur(stocks.liquid7dCents - usable)} que ${who} garde de côté pour les imprévus.`,
    }
  }

  return { kind: 'available' }
}

/**
 * Au moins une option doit rester choisissable, sans quoi le mois est bloque.
 *
 * Aucun evenement du corpus ne peut donc n'offrir que des decaissements
 * immediats : le build le verifie pour tous les personnages eligibles.
 */
export function hasChoosableOption(
  options: readonly { readonly effects: readonly EffectLike[] }[],
  budget: MonthlyBudget,
  stocks: Stocks,
): boolean {
  return options.some((o) => optionAvailability(o.effects, budget, stocks).kind !== 'impossible')
}
