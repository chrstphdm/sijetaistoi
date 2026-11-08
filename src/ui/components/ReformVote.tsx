import { useState } from 'react'
import type { ReformT, ReformOptionT } from '@/schemas/index.ts'
import { ScopeBand, ScopeMark } from './ScopeBand.tsx'

/**
 * L'ecran de vote.
 *
 * Contrainte de lisibilite, apprise d'un retour de test : cinq options
 * affichant chacune leurs effets chiffres, leur incertitude et quatre
 * arguments, cela fait une quarantaine de lignes a lire avant de pouvoir
 * decider. Le joueur se perd, et un joueur perdu ne delibere pas.
 *
 * D'ou une divulgation progressive. Mais elle ne doit pas devenir un moyen
 * de cacher ce qui derange : la regle est donc que TOUTES les options ont
 * exactement la meme structure et la meme quantite d'information visible.
 * On replie le detail, jamais le desaccord.
 *
 * Trois proprietes restent non negociables :
 *   1. Le CONTRAT est annonce avant le vote.
 *   2. Le probleme est attribue a un ACTEUR FICTIF NOMME.
 *   3. Les options sont empilees verticalement, de surface identique :
 *      pas de balayage gauche/droite, qui reproduirait l'axe politique
 *      dans le geste meme.
 */

type Props = {
  readonly reform: ReformT
  readonly order: readonly number[]
  readonly who: string
  readonly onVote: (option: ReformOptionT) => void
}

const UNCERTAINTY_LABEL: Record<string, string> = {
  established: 'effet établi',
  debated: 'effet débattu',
  highly_debated: 'effet très débattu',
}

/** Resume d'une option en une ligne : qui paie, qui y gagne. */
function oneLiner(option: ReformOptionT): string {
  const budget = option.effects.filter((e) => e.kind === 'budget_line' && e.monthlyDelta)
  const losers = budget.filter((e) => (e.monthlyDelta ?? 0) < 0)
  const winners = budget.filter((e) => (e.monthlyDelta ?? 0) > 0)
  if (budget.length === 0) return 'Aucun effet chiffré sur le budget des ménages.'
  const part = (list: typeof budget) =>
    list.map((e) => e.scope.description.toLowerCase()).join(', ')
  if (losers.length && winners.length)
    return `Coûte à : ${part(losers)}. Profite à : ${part(winners)}.`
  if (losers.length) return `Coûte à : ${part(losers)}.`
  return `Profite à : ${part(winners)}.`
}

export function ReformVote({ reform, order, who, onVote }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="sheet" aria-labelledby="reform-title">
      <p className="sheet__kicker">Une question posée à tout le pays</p>
      <h2 id="reform-title">{reform.descriptiveTitle}</h2>

      <ScopeBand scope="collective" who={who} />

      <p>{reform.context}</p>

      <p className="provenance">
        {reform.options.length} possibilités, dans un ordre tiré au sort. Déplie-en une pour voir
        ses effets chiffrés et ce qu’on peut dire pour et contre.
      </p>

      <ol className="options">
        {order.map((i) => {
          const o = reform.options[i]!
          const expanded = open === o.id
          return (
            <li key={o.id}>
              <article className="option option--collective">
                <ScopeMark scope="collective" />
                <h3>{o.label}</h3>
                <p className="option__summary">{o.decisionDescription}</p>
                <p className="option__who">{oneLiner(o)}</p>

                <div className="option__actions">
                  <button type="button" onClick={() => onVote(o)}>
                    Décider ceci
                  </button>
                  <button
                    type="button"
                    className="option__more"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : o.id)}
                  >
                    {expanded ? 'Replier le détail' : 'Voir le détail'}
                  </button>
                </div>

                {expanded && (
                  <div className="option__detail">
                    <p className="option__side">Effets retenus par le modèle</p>
                    <ul className="effects">
                      {o.effects.map((e) => (
                        <li key={e.id}>
                          {e.scope.description}
                          {e.monthlyDelta !== undefined && e.monthlyDelta !== 0 && (
                            <>
                              {' : '}
                              {e.monthlyDelta > 0 ? '+' : '−'}
                              {Math.abs(e.monthlyDelta)} €/mois
                            </>
                          )}
                          {e.publicBillions !== undefined && e.publicBillions !== 0 && (
                            <>
                              {' : '}
                              {e.publicBillions > 0 ? '+' : '−'}
                              {Math.abs(e.publicBillions)} Md€
                            </>
                          )}{' '}
                          <span className="provenance">({UNCERTAINTY_LABEL[e.uncertainty]})</span>
                          {e.note && <div className="provenance">{e.note}</div>}
                        </li>
                      ))}
                    </ul>

                    <p className="option__side">Ce qu’on peut dire pour</p>
                    <ul>{o.argumentsFor.map((a) => <li key={a}>{a}</li>)}</ul>
                    <p className="option__side">Ce qu’on peut dire contre</p>
                    <ul>{o.argumentsAgainst.map((a) => <li key={a}>{a}</li>)}</ul>
                  </div>
                )}
              </article>
            </li>
          )
        })}
      </ol>

      <details className="footnote">
        <summary>D’où vient ce chiffre, et ce que ce modèle ignore</summary>
        <p className="provenance">
          Objectif de {reform.objective.amount} Md€ posé par {reform.statedBy}.{' '}
          {reform.objective.note}
        </p>
        <p className="provenance">{reform.modelLimitations}</p>
      </details>
    </section>
  )
}
