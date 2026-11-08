import type { ReformT, ReformOptionT } from '@/schemas/index.ts'

/**
 * L'ecran de vote.
 *
 * Trois proprietes non negociables :
 *   1. Le CONTRAT est annonce avant le vote, pas apres. Sans lui, decouvrir
 *      plus tard qu'on subit sa propre regle est une embuscade ; avec lui,
 *      c'est un engagement.
 *   2. Le probleme est attribue a un ACTEUR FICTIF NOMME, jamais presente
 *      comme une necessite constatee.
 *   3. Les options sont empilees verticalement, de surface identique. Pas de
 *      balayage gauche/droite : en France ce geste reproduit litteralement
 *      l'axe politique.
 */

type Props = {
  readonly reform: ReformT
  readonly order: readonly number[]
  readonly onVote: (option: ReformOptionT) => void
}

const UNCERTAINTY_LABEL: Record<string, string> = {
  established: 'effet établi',
  debated: 'effet débattu',
  highly_debated: 'effet très débattu',
}

export function ReformVote({ reform, order, onVote }: Props) {
  return (
    <section className="sheet" aria-labelledby="reform-title">
      <p className="sheet__kicker">Avril 2027 · décision collective</p>
      <h2 id="reform-title">{reform.descriptiveTitle}</h2>

      <p>{reform.context}</p>
      <p className="provenance">
        Objectif de {reform.objective.amount} Md€ posé par {reform.statedBy}.{' '}
        {reform.objective.note}
      </p>

      <p className="contract" role="note">
        <strong>Cette décision entre en vigueur en avril 2027.</strong> Elle s’appliquera à tous les
        personnages de cette partie, y compris ceux que tu incarneras plus tard.
      </p>

      <p className="provenance">Options présentées dans un ordre tiré au sort.</p>

      <ol className="options">
        {order.map((i) => {
          const o = reform.options[i]!
          return (
            <li key={o.id}>
              <article className="option">
                <h3>{o.label}</h3>
                <p>{o.decisionDescription}</p>

                <details>
                  <summary>Ce qu’on peut dire pour et contre</summary>
                  <p className="option__side">Pour</p>
                  <ul>{o.argumentsFor.map((a) => <li key={a}>{a}</li>)}</ul>
                  <p className="option__side">Contre</p>
                  <ul>{o.argumentsAgainst.map((a) => <li key={a}>{a}</li>)}</ul>
                </details>

                <ul className="effects">
                  {o.effects.map((e) => (
                    <li key={e.id}>
                      {e.scope.description}
                      {e.monthlyDelta !== undefined && e.monthlyDelta !== 0 && (
                        <> : {e.monthlyDelta > 0 ? '+' : '−'}{Math.abs(e.monthlyDelta)} €/mois</>
                      )}
                      {e.publicBillions !== undefined && (
                        <> : {e.publicBillions > 0 ? '+' : '−'}{Math.abs(e.publicBillions)} Md€</>
                      )}
                      {' '}<span className="provenance">({UNCERTAINTY_LABEL[e.uncertainty]})</span>
                      {e.note && <div className="provenance">{e.note}</div>}
                    </li>
                  ))}
                </ul>

                <button type="button" onClick={() => onVote(o)}>
                  Décider ceci
                </button>
              </article>
            </li>
          )
        })}
      </ol>

      <p className="provenance">
        <strong>Ce que ce modèle ne prend pas en compte.</strong> {reform.modelLimitations}
      </p>
    </section>
  )
}
