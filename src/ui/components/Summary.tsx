import {
  KPI_OPTIONS, KPI_QUESTION, tendencySentence, type KpiAnswer, type Summary,
} from '@/core/summary.ts'

/**
 * L'ecran de fin.
 *
 * Il fournit la juxtaposition brute et se tait. Aucune phrase du jeu ne
 * formule le declic a la place du joueur : s'il le formulait, il n'y aurait
 * plus de declic, seulement une lecon.
 *
 * Ce qui est interdit ici, et verifie par test :
 *   - tout score, pourcentage, jauge, classement ;
 *   - toute etiquette politique ;
 *   - tout qualificatif sur un changement de position ;
 *   - toute affirmation que les donnees ne soutiennent pas.
 */
export function SummaryScreen({
  summary, characterName, kpi, onKpi,
}: {
  readonly summary: Summary
  readonly characterName: (id: string) => string
  readonly kpi: KpiAnswer | null
  readonly onKpi: (a: KpiAnswer) => void
}) {
  const tendency = tendencySentence(summary)

  return (
    <>
      <section className="sheet" aria-labelledby="summary-title">
        <p className="sheet__kicker">Fin de partie</p>
        <h2 id="summary-title" className="intro__name">Ce que tu as décidé</h2>

        {/* 1 — les décisions, avec la phrase du joueur */}
        <ol>
          {summary.decisions.map((d) => (
            <li key={d.rule.id}>
              <strong>{d.rule.shortLabel}</strong>, en {d.rule.diegeticMonth}
              {d.wording && <blockquote>« {d.wording} »</blockquote>}
            </li>
          ))}
        </ol>

        <p className="provenance">
          Tu as incarné {summary.charactersPlayed.map(characterName).join(', ')}.
          {summary.consultedOthers > 0 && (
            <> Tu as consulté la fiche d’autres personnages {summary.consultedOthers} fois.</>
          )}
        </p>
      </section>

      {/* 2 et 3 — ce qui a bougé, ce qui n'a pas bougé */}
      <section className="sheet" aria-labelledby="positions-title">
        <h2 id="positions-title">Tes réponses</h2>

        {summary.insufficientEvidence ? (
          <p>
            Cette partie est trop courte pour qu’on puisse en dire quoi que ce soit sur tes
            positions. Le jeu préfère ne rien affirmer plutôt que d’écrire une phrase qui sonnerait
            juste.
          </p>
        ) : (
          <>
            {tendency && <p>{tendency}</p>}

            {summary.moved.length > 0 && (
              <>
                <p className="option__side">Ce qui a changé</p>
                <ul>
                  {summary.moved.map((m) => (
                    <li key={m.questionId}>{m.sentence}</li>
                  ))}
                </ul>
              </>
            )}

            {summary.stable.length > 0 && (
              <>
                <p className="option__side">Ce qui n’a pas changé</p>
                <p>
                  {summary.stable.length} question
                  {summary.stable.length > 1 ? 's ont reçu' : ' a reçu'} la même réponse les deux
                  fois.
                </p>
              </>
            )}

            {summary.hesitated.length > 0 && (
              <>
                <p className="option__side">Où tu as hésité</p>
                <p>
                  {summary.hesitated.length} question
                  {summary.hesitated.length > 1 ? 's' : ''} où tu as répondu « je ne sais pas », ou
                  changé d’avis plus d’une fois.
                </p>
              </>
            )}
          </>
        )}

        <p className="provenance">
          Le jeu décrit ce que tu as répondu. Il n’en tire aucune conclusion sur toi, et ne range
          tes réponses dans aucune catégorie.
        </p>
      </section>

      {/* La seule mesure du jeu, et elle ne porte pas sur l'opinion */}
      <section className="sheet" aria-labelledby="kpi-title">
        <h2 id="kpi-title">Une dernière question</h2>
        <fieldset className="scale">
          <legend>{KPI_QUESTION}</legend>
          <div
            className="scale__row"
            role="radiogroup"
            aria-label={KPI_QUESTION}
            style={{ '--scale-count': KPI_OPTIONS.length } as React.CSSProperties}
          >
            {KPI_OPTIONS.map((o) => (
              <button
                key={o} type="button" role="radio" aria-checked={kpi === o}
                className={kpi === o ? 'scale__btn scale__btn--on' : 'scale__btn'}
                onClick={() => onKpi(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
        {kpi && (
          <p className="provenance">
            Merci. Cette réponse reste sur cet appareil, comme le reste.
          </p>
        )}
      </section>
    </>
  )
}
