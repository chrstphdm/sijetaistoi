import { bundle, characters } from '@/content/load.ts'
import { LoopDiagram } from './LoopDiagram.tsx'
import { ScaleDemo } from './ScaleDemo.tsx'
import { Seal } from './Seal.tsx'

/**
 * Accueil et contrat.
 *
 * Deux ecrans, prevus au plan et longtemps absents. Le second n'est pas une
 * formalite : l'analyse game design le decrit comme la piece ANTI-EMBUSCADE
 * centrale du jeu.
 *
 * Sans lui, decouvrir trois actes plus tard qu'on subit sa propre regle est
 * un piege, et le joueur a raison de se sentir pris en faute. Avec lui,
 * c'est un engagement qu'il a accepte en connaissance de cause — et la
 * difference entre les deux est exactement la difference entre une lecon et
 * un declic.
 */

export function HomeScreen({ onStart, onMethod }: {
  readonly onStart: () => void
  readonly onMethod: () => void
}) {
  const i = bundle.intro
  const principles = bundle.principles.principles

  return (
    <article className="sheet home">
      <h1 className="home__title">{i.title}</h1>
      <p className="home__tagline">{i.tagline}</p>

      {i.pitch.map((p) => (
        <p key={p}>{p}</p>
      ))}

      {/* Le bouton est répété : en haut pour qui veut jouer tout de suite,
          en bas pour qui a lu la page. Rien n'oblige à lire. */}
      <p className="home__actions">
        <button type="button" className="home__start" onClick={onStart}>
          {i.startLabel}
        </button>
        <span className="provenance">{i.duration}</span>
      </p>

      <section aria-labelledby="h-goal">
        <h2 id="h-goal">{i.goalTitle}</h2>
        {i.goal.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section aria-labelledby="h-rules">
        <h2 id="h-rules">{i.rulesTitle}</h2>
        <LoopDiagram />
        <ol className="home__cards">
          {i.rules.map((r) => (
            <li key={r.id}>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Chaque théorie porte son objection, et le schéma l'exige. Une
          théorie présentée sans ce qu'on lui reproche serait recommandée,
          pas expliquée — et le jeu se réclamerait d'une doctrine. */}
      <section aria-labelledby="h-cast">
        <h2 id="h-cast">Les six personnes que tu peux incarner</h2>
        <p className="provenance">
          Tu en incarnes trois par partie, tirées au sort. Chacune est représentée par
          un motif abstrait plutôt que par un visage — un portrait de « mère
          célibataire » serait une caricature en puissance. Les six motifs ont
          exactement la même densité.
        </p>
        <ul className="cast">
          {characters.map((c) => (
            <li key={c.id}>
              <Seal id={c.id} allIds={characters.map((x) => x.id)} size={44} />
              <span>
                <strong>{c.identity.firstName}</strong>, {c.identity.age} ans
                <span className="provenance">{c.identity.identityLine}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-demo">
        <h2 id="h-demo">Essaie tout de suite&nbsp;: la même somme, quatre mesures</h2>
        <ScaleDemo />
      </section>

      <section aria-labelledby="h-theory">
        <h2 id="h-theory">{i.theoryTitle}</h2>
        <p className="provenance">{i.theoryLead}</p>
        {i.theories.map((t) => (
          <div key={t.id} className="home__theory">
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <p className="home__objection">
              <span className="home__objection-tag">Ce qu’on lui reproche</span>
              {t.objection}
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="h-principles">
        <h2 id="h-principles">{i.principlesTitle}</h2>
        <p className="provenance">{bundle.principles.note}</p>
        <dl className="home__principles">
          {principles.map((p) => (
            <div key={p.id}>
              <dt>{p.label}</dt>
              <dd>
                {p.definition}
                <span className="home__objection">
                  <span className="home__objection-tag">Ce qu’on lui reproche</span>
                  {p.objection}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="h-look">
        <h2 id="h-look">{i.lookTitle}</h2>
        <ol className="home__cards">
          {i.look.map((l) => (
            <li key={l.id}>
              <h3>{l.title}</h3>
              <p>{l.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-not">
        <h2 id="h-not">{i.notTitle}</h2>
        <ul>
          {i.notList.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <p className="home__actions">
        <button type="button" className="home__start" onClick={onStart}>
          {i.startLabel}
        </button>
      </p>

      <p>
        <button type="button" className="timeline__toggle" onClick={onMethod}>
          {i.methodLabel}
        </button>
      </p>
    </article>
  )
}

export function ContractScreen({ onStart, hypothesisSet }: {
  readonly onStart: () => void
  readonly hypothesisSet: string
}) {
  const i = bundle.intro
  return (
    <article className="sheet home" aria-labelledby="contract-title">
      <h1 id="contract-title">{i.contractTitle}</h1>

      <ol className="contract-list">
        {i.contract.map((c) => (
          <li key={c.id}>
            <h2>{c.title}</h2>
            <p>{c.body}</p>
          </li>
        ))}
      </ol>

      <p className="provenance">{i.fiction}</p>
      <p className="provenance">
        Cette partie utilise le jeu d’hypothèses «&nbsp;{hypothesisSet}&nbsp;», tiré au sort.
        Les points où les travaux disponibles ne convergent pas sont signalés à mesure.
      </p>

      <p className="home__actions">
        <button type="button" className="home__start" onClick={onStart}>
          {i.contractStartLabel}
        </button>
      </p>
    </article>
  )
}
