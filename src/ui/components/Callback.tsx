import type { Callback } from '@/core/callback.ts'
import { Amount } from './Amount.tsx'

/**
 * Le rappel, en quatre temps.
 *
 * T1 RENCONTRE     la regle est un fait du monde, sans auteur nomme
 * T2 ATTRIBUTION   une seule fois, la phrase du joueur citee VERBATIM
 * T3 RESTITUTION   ce que la regle a produit ICI et AILLEURS, ensemble
 *
 * Aucun commentaire, aucun adverbe, aucune synthese morale. Le jeu fournit
 * la juxtaposition brute et se tait : s'il formulait le declic a la place du
 * joueur, il n'y aurait plus de declic.
 *
 * La mise en scene est identique quel que soit le signe : le meme gabarit
 * sert a « tu paies 27 € de plus » et a « tu touches 31 € de plus ».
 */
export function CallbackPanel({ callback, characterName, month }: {
  readonly callback: Callback
  readonly characterName: string
  /** Le mois réel du rappel. Il était écrit en dur, « Septembre 2027 », quel que soit l'acte. */
  readonly month: string
}) {
  const { rule, deltaCents, here, elsewhere } = callback

  return (
    <section className="sheet" aria-labelledby="callback-title">
      <p className="sheet__kicker">{month}</p>
      <h2 id="callback-title">{rule.shortLabel}</h2>

      {/* T1 — la règle est un fait du monde */}
      <p>
        Sur le relevé de {characterName} ce mois-ci&nbsp;:{' '}
        <Amount cents={deltaCents} nature="hypothesis" signed label="Effet de la règle" /> par mois.
      </p>

      {/* T2 — attribution, une seule fois */}
      <p className="attribution">
        Cet écart vient de la décision prise en {rule.diegeticMonth}, quand tu incarnais quelqu’un
        d’autre.
        {rule.playerWording && (
          <>
            {' '}Tu avais alors écrit&nbsp;: <q>{rule.playerWording}</q>
          </>
        )}
      </p>

      {/* T3 — restitution bilatérale, les deux volets toujours ensemble */}
      <div className="restitution">
        <div>
          <p className="option__side">Ce que cette règle a produit ici</p>
          <p>{here}</p>
        </div>
        <div>
          <p className="option__side">Ce qu’elle a produit ailleurs</p>
          <p>{elsewhere}</p>
        </div>
      </div>
    </section>
  )
}

/**
 * Message affiche quand le quota de signe empeche tout rappel.
 *
 * Le moteur ne contourne pas sa propre garantie en silence : il le dit.
 */
export function QuotaBlockedNote() {
  return (
    <section className="sheet">
      <p role="note">
        Une règle que tu as décidée affecte ce personnage, mais ce jeu s’interdit de ne te montrer
        que les conséquences défavorables de tes propres choix. Ce rappel est donc mis de côté pour
        l’instant. Son effet reste visible sur l’écran « Le choix vu par chacun », après la
        prochaine décision.
      </p>
    </section>
  )
}
