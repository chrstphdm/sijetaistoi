import { useState } from 'react'
import { characters, reforms } from '@/content/load.ts'
import { formatEuros } from '@/core/money.ts'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { toBudgetLines } from '@/content/mapping.ts'
import { SLOTS, urlForSetup, type Setup } from '../setup.ts'
import { SCREEN_TITLE_ATTR } from '../navigation.ts'

/**
 * Ecran de preparation, accessible par `#preparation` seulement.
 *
 * Il n'est lie depuis nulle part. Ce n'est pas un oubli : choisir soi-meme
 * ses personnages, c'est choisir ce qu'on va ressentir, et c'est l'inverse du
 * propos du jeu. Il existe pour l'animation d'une seance collective, pour la
 * demonstration et pour le test.
 *
 * Toute place laissee vide retombe sur le tirage normal : on peut n'imposer
 * que le premier personnage, ou que la deuxieme decision.
 */

export function SetupScreen({ seed, setup, onCancel }: {
  readonly seed: string
  readonly setup: Setup
  readonly onCancel: () => void
}) {
  const [picked, setPicked] = useState<readonly string[]>(() =>
    Array.from({ length: SLOTS }, (_, i) => setup.characterIds[i] ?? ''),
  )
  const [decisions, setDecisions] = useState<readonly string[]>(() =>
    Array.from({ length: SLOTS }, (_, i) => setup.reformIds[i] ?? ''),
  )

  const next: Setup = {
    characterIds: picked.filter((id) => id !== ''),
    reformIds: decisions.filter((id) => id !== ''),
  }

  // Un meme personnage deux fois n'a pas de sens : le deuxieme acte le
  // rejetterait et retomberait sur le tirage. Autant le dire ici.
  const duplicate = (list: readonly string[]) =>
    list.filter((id) => id !== '').some((id, i, a) => a.indexOf(id) !== i)

  const faulty = duplicate(picked) || duplicate(decisions)

  const setAt = (
    list: readonly string[],
    set: (v: readonly string[]) => void,
    index: number,
    value: string,
  ) => set(list.map((v, i) => (i === index ? value : v)))

  return (
    <article className="sheet sheet--doc">
      <p className="sheet__kicker">Porte de service</p>
      <h1 tabIndex={-1} {...{ [SCREEN_TITLE_ATTR]: true }}>Préparer une partie</h1>

      <p>
        Cet écran n’est lié depuis aucune page du jeu. Il sert à animer une séance
        collective, à montrer un cas précis, ou à rejouer une situation sans chercher
        sa graine.
      </p>
      <p className="provenance">
        Choisir soi-même ses personnages, c’est choisir ce qu’on va ressentir&nbsp;: c’est
        l’inverse de ce que le jeu cherche à produire. Une partie préparée est signalée
        comme telle dans le registre de bas de page, et la page méthode cesse d’y
        affirmer un tirage au hasard.
      </p>

      <h2>Les personnages, acte par acte</h2>
      <p className="provenance">
        Toute place laissée sur «&nbsp;tirage au hasard&nbsp;» le reste réellement.
      </p>
      <dl className="setup">
        {picked.map((value, i) => (
          <div key={`c${i}`} className="setup__row">
            <dt><label htmlFor={`perso-${i}`}>Acte {i + 1}</label></dt>
            <dd>
              <select
                id={`perso-${i}`} value={value}
                onChange={(e) => setAt(picked, setPicked, i, e.target.value)}
              >
                <option value="">Tirage au hasard</option>
                {characters.map((c) => {
                  const b = computeMonthlyBudget(toBudgetLines(c))
                  return (
                    <option key={c.id} value={c.id}>
                      {c.identity.firstName} — {c.identity.identityLine} — reste à vivre{' '}
                      {formatEuros(b.slackCents)}
                    </option>
                  )
                })}
              </select>
            </dd>
          </div>
        ))}
      </dl>

      <h2>Les décisions collectives, acte par acte</h2>
      <dl className="setup">
        {decisions.map((value, i) => (
          <div key={`r${i}`} className="setup__row">
            <dt><label htmlFor={`decision-${i}`}>Acte {i + 1}</label></dt>
            <dd>
              <select
                id={`decision-${i}`} value={value}
                onChange={(e) => setAt(decisions, setDecisions, i, e.target.value)}
              >
                <option value="">Tirage au hasard</option>
                {reforms.map((r) => (
                  <option key={r.id} value={r.id}>{r.descriptiveTitle}</option>
                ))}
              </select>
            </dd>
          </div>
        ))}
      </dl>

      {faulty && (
        <p className="option__barred">
          Un même personnage ou une même décision apparaît deux fois. Le jeu refuserait
          le doublon et retomberait sur le tirage&nbsp;: autant le corriger ici.
        </p>
      )}

      <p>
        <button
          type="button" disabled={faulty}
          onClick={() => { window.location.href = urlForSetup(seed, next) }}
        >
          Commencer cette partie
        </button>
        {' '}
        <button type="button" className="timeline__toggle" onClick={onCancel}>
          Revenir au jeu
        </button>
      </p>

      <p className="provenance">
        La graine <code>{seed}</code> continue de piloter tout ce que la préparation
        ne fixe pas&nbsp;: les événements de chaque mois, l’ordre de comparaison, et
        les places laissées au hasard.
      </p>
    </article>
  )
}
