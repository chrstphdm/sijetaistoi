import { bundle } from '@/content/load.ts'
import { CONSTRAINT_STATEMENTS, RELAXATION_ORDER } from '@/core/casting.ts'
import { MOTION_SPEC_VERSION, THRESHOLDS, DENOMINATOR_FLOOR_CENTS } from '@/motion/intensity.ts'
import { MOTION_TABLE } from '@/motion/table.ts'
import { unfavourableCap } from '@/core/callback.ts'
import { MIN_OBSERVATIONS } from '@/core/summary.ts'

/**
 * La page methode.
 *
 * Le plan la decrit comme « le principal mecanisme de neutralite du
 * dispositif » : publier la partialite residuelle vaut mieux que pretendre
 * ne pas en avoir.
 *
 * Elle tire ses chiffres des DONNEES ET DU CODE REELS — nombre de sources,
 * seuils de mise en scene, plafond de rappels defavorables, contraintes de
 * tirage — plutot que de les recopier. Une page methode qui derive de ce
 * que le programme fait vraiment serait pire que pas de page du tout.
 */
export function MethodScreen({ onBack }: { readonly onBack?: () => void }) {
  const m = bundle.method
  const debated = bundle.hypotheses.filter((h) => h.status !== 'consensual')

  return (
    <article className="sheet method">
      <h1>{m.title}</h1>
      <p className="method__intro">{m.intro}</p>

      {m.sections.map((s) => (
        <section key={s.id} aria-labelledby={`m-${s.id}`}>
          <h2 id={`m-${s.id}`}>{s.title}</h2>
          <p className="provenance">{s.lead}</p>
          <ul>
            {s.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </section>
      ))}

      {/* Tout ce qui suit est lu dans les données et le code, jamais recopié. */}
      <section aria-labelledby="m-chiffres">
        <h2 id="m-chiffres">Les règles, telles qu’elles sont réellement appliquées</h2>
        <p className="provenance">
          Ces valeurs sont lues dans le programme au moment de l’affichage. Elles ne peuvent pas
          diverger de ce qu’il fait.
        </p>
        <dl className="ledger-list">
          <div className="ledger-row">
            <dt>Rappels défavorables, au plus</dt>
            <dd>{unfavourableCap(2)} sur 2 · {unfavourableCap(3)} sur 3</dd>
          </div>
          <div className="ledger-row">
            <dt>Paliers de mise en scène</dt>
            <dd>{THRESHOLDS.map((t) => `${Math.round(t * 100)} %`).join(' · ')}</dd>
          </div>
          <div className="ledger-row">
            <dt>Durée d’animation maximale</dt>
            <dd>{Math.max(...Object.values(MOTION_TABLE).map((p) => p.enterMs))} ms</dd>
          </div>
          <div className="ledger-row">
            <dt>Plancher du dénominateur</dt>
            <dd>{DENOMINATOR_FLOOR_CENTS / 100} € par mois</dd>
          </div>
          <div className="ledger-row">
            <dt>Réponses minimales avant d’énoncer une tendance</dt>
            <dd>{MIN_OBSERVATIONS}</dd>
          </div>
          <div className="ledger-row">
            <dt>Version de la grammaire d’animation</dt>
            <dd>{MOTION_SPEC_VERSION}</dd>
          </div>
          <div className="ledger-row">
            <dt>Corpus</dt>
            <dd>
              {bundle.characters.length} personnages · {bundle.events.length} événements ·{' '}
              {bundle.reforms.length} décisions collectives
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="m-tirage">
        <h2 id="m-tirage">Comment les personnages sont tirés</h2>
        <p>
          Le premier personnage est tiré au hasard parmi les {bundle.characters.length}, sans
          aucune contrainte : aucun biais n’est possible sur le point d’entrée. Les suivants sont
          tirés au hasard parmi ceux qui satisfont les règles ci-dessous. Le jeu ne choisit jamais
          le personnage pour qui une décision serait la plus douloureuse.
        </p>
        <ul>
          {Object.values(CONSTRAINT_STATEMENTS).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="provenance">
          Quand aucun personnage ne satisfait toutes ces règles, elles sont relâchées dans cet
          ordre : {RELAXATION_ORDER.join(', puis ')}. Rejouer un personnage déjà incarné est le
          dernier recours.
        </p>
      </section>

      <section aria-labelledby="m-hypotheses">
        <h2 id="m-hypotheses">Les hypothèses contestées, et leurs deux lectures</h2>
        <p className="provenance">
          {debated.length} hypothèse{debated.length > 1 ? 's' : ''} du modèle port
          {debated.length > 1 ? 'ent' : 'e'} sur des points où les travaux disponibles ne
          convergent pas. Le jeu ne tranche pas : il nomme les deux lectures.
        </p>
        {debated.map((h) => (
          <div key={h.id} className="method__hypo">
            <h3>{h.question}</h3>
            <p>{h.whyDebated}</p>
            <ul>
              {h.readings.map((r) => (
                <li key={r.id}>
                  <strong>Lecture {r.id}</strong> — {r.mechanismLabel}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="m-sources">
        <h2 id="m-sources">Les sources utilisées pour calibrer</h2>
        <ul>
          {bundle.sources.map((s) => (
            <li key={s.id}>
              {s.name} — {s.organisation} ({s.vintage}). {s.scope}
            </li>
          ))}
        </ul>
        <p className="provenance">
          L’affiliation de chaque source est déclarée, jamais jugée : le jeu n’établit aucune
          hiérarchie de crédibilité entre un organisme statistique et un centre de réflexion.
        </p>
      </section>

      <p className="method__closing">{m.closing}</p>

      {onBack && (
        <button type="button" onClick={onBack}>
          Revenir au jeu
        </button>
      )}
    </article>
  )
}
