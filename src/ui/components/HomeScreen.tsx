import { useState, type CSSProperties } from 'react'
import { bundle, characters } from '@/content/load.ts'
import { durability, setDurability } from '../persistence.ts'
import { BalanceIcon, HeroCast, LookArt, TheoryIcon } from './HomeArt.tsx'
import { LoopDiagram } from './LoopDiagram.tsx'
import { ScaleDemo } from './ScaleDemo.tsx'
import { Seal, sealHue } from './Seal.tsx'
import { spellCount } from '../words.ts'

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
  const byId = new Map(principles.map((p) => [p.id, p]))
  const allIds = characters.map((c) => c.id)

  const start = (
    <button type="button" className="home__start" onClick={onStart}>
      {i.startLabel}
    </button>
  )

  return (
    <div className="page">
      {/* Bandeau d'ouverture : le titre, la promesse, et l'action. Rien
          d'autre — on doit pouvoir jouer sans lire une ligne de plus. */}
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__text">
            <h1 className="hero__title">{i.title}</h1>
            <p className="hero__tagline">{i.tagline}</p>
            <p className="hero__actions">
              {start}
              <span className="hero__note">{i.duration}</span>
            </p>
          </div>
          <HeroCast />
        </div>
      </header>

      <main className="page__body">
        {/* Ce que contient une partie, d'un coup d'œil. Le dernier chiffre
            est un zéro, et c'est volontairement le plus parlant. */}
        <section className="figures" aria-label="Le jeu en chiffres">
          <ul>
            <li><b>3</b><span>personnes incarnées, tirées au sort</span></li>
            <li><b>6</b><span>situations dans le corpus</span></li>
            <li><b>4</b><span>façons de mesurer un même montant</span></li>
            <li><b>20</b><span>minutes environ</span></li>
            <li className="figures--zero"><b>0</b><span>score, classement ou étiquette</span></li>
          </ul>
        </section>

        {/* Le critère de réussite, en grand : c'est la seule promesse du jeu. */}
        <section className="band">
          <blockquote className="pull">
            Je n’avais pas réalisé qu’une décision que je trouvais évidente pouvait
            être vécue comme ça par quelqu’un d’autre.
            <cite>Le seul objectif de ce jeu, et le seul critère de sa réussite.</cite>
          </blockquote>
          <div className="prose">
            {i.goal.slice(1).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>

        <section className="band band--tint" aria-labelledby="h-rules">
          <h2 id="h-rules">{i.rulesTitle}</h2>
          <div className="split">
            <LoopDiagram />
            <ol className="cards cards--numbered">
              {i.rules.map((r) => (
                <li key={r.id}>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band" aria-labelledby="h-demo">
          <h2 id="h-demo">La même somme, quatre façons de la mesurer</h2>
          <p className="lead">
            C’est l’idée centrale du jeu, et tu peux l’essayer tout de suite.
          </p>
          <ScaleDemo />
        </section>

        <section className="band band--tint" aria-labelledby="h-cast">
          <h2 id="h-cast">Les {spellCount(characters.length)} personnes que tu peux incarner</h2>
          <p className="lead">
            Tu en incarnes trois par partie, tirées au sort. Chacune est représentée
            par un motif abstrait plutôt que par un visage — un portrait de «&nbsp;mère
            célibataire&nbsp;» serait une caricature en puissance. Les{' '}
            {spellCount(characters.length)} motifs ont exactement la même densité.
          </p>
          <ul className="cast">
            {characters.map((c) => (
              <li
                key={c.id}
                style={{ ['--seal-hue' as string]: sealHue(c.id, allIds) } as CSSProperties}
              >
                <span className="cast__tile">
                  <Seal id={c.id} allIds={allIds} size={64} />
                </span>
                <span className="cast__text">
                  <strong>{c.identity.firstName}</strong>
                  <span className="cast__age">{c.identity.age} ans</span>
                  <span className="provenance">{c.identity.identityLine}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Chaque thèse porte son objection, au même format et au même
            poids visuel. L'afficher plus discrètement reviendrait à
            recommander la thèse. */}
        <section className="band" aria-labelledby="h-theory">
          <h2 id="h-theory">{i.theoryTitle}</h2>
          <p className="lead">{i.theoryLead}</p>
          {/* Repliées comme les principes, et pour la même raison : la
              page faisait plus de 10 000 pixels sur petit écran. Thèse et
              objection sont repliées ENSEMBLE, jamais l'une sans l'autre. */}
          <ul className="theories">
            {i.theories.map((t) => (
              <li key={t.id} className="theory">
                <span className="theory__icon"><TheoryIcon id={t.id} /></span>
                <h3>{t.title}</h3>
                <details className="theory__more">
                  <summary>Thèse et objection</summary>
                  <p>{t.body}</p>
                  <p className="objection">
                    <span className="objection__tag">Ce qu’on lui reproche</span>
                    {t.objection}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="band band--tint" aria-labelledby="h-principles">
          <h2 id="h-principles">{i.principlesTitle}</h2>
          <p className="lead">{bundle.principles.note}</p>

          {/* En paires opposées : c'est la tension entre deux principes
              également défendables qui fait un désaccord politique, pas un
              principe pris isolément.

              Les détails sont repliés, parce que quatorze définitions
              rendaient la page interminable sur petit écran — plus de
              13 000 pixels de haut, mesurés. La règle est préservée : on
              replie la définition ET son objection ENSEMBLE, jamais l'une
              sans l'autre. Ce qui reste visible, le nom des deux principes
              et ce qui les oppose, est l'information qui compte ici. */}
          <div className="tensions">
            {bundle.principles.tensions.map((t) => {
              const a = byId.get(t.a)
              const b = byId.get(t.b)
              if (!a || !b) return null
              return (
                <details key={`${t.a}-${t.b}`} className="tension">
                  <summary>
                    <span className="tension__about">{t.about}</span>
                    <span className="tension__pair">
                      <strong>{a.label}</strong>
                      <span className="tension__vs"><BalanceIcon />contre</span>
                      <strong>{b.label}</strong>
                    </span>
                    <span className="tension__more">Définitions et objections</span>
                  </summary>
                  <div className="tension__row">
                    {[a, b].map((p) => (
                      <article key={p.id}>
                        <h3>{p.label}</h3>
                        <p>{p.definition}</p>
                        <p className="objection">
                          <span className="objection__tag">Ce qu’on lui reproche</span>
                          {p.objection}
                        </p>
                      </article>
                    ))}
                  </div>
                </details>
              )
            })}
          </div>
        </section>

        <section className="band" aria-labelledby="h-look">
          <h2 id="h-look">{i.lookTitle}</h2>
          {/* Dépliées : trois paragraphes courts, qui n'ont pas d'objection
              à replier avec eux. Chacun a sa vignette, qui montre ce que le
              texte décrit. */}
          <ul className="looks">
            {i.look.map((l) => (
              <li key={l.id} className="look">
                <LookArt id={l.id} />
                <h3>{l.title}</h3>
                <p>{l.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="band band--tint" aria-labelledby="h-not">
          <h2 id="h-not">{i.notTitle}</h2>
          {/* Le mot barré est un repère visuel ; c'est la phrase qui le dit,
              et c'est elle que lit un lecteur d'écran. */}
          <ul className="nots">
            {i.notList.map((n) => (
              <li key={n.id} className="not">
                <span className="not__head" aria-hidden="true">
                  <span className="not__pre">Ce n’est pas</span>
                  <s className="not__word">{n.label}</s>
                </span>
                <p>{n.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="band band--close">
          <p className="hero__actions">
            {start}
            <button type="button" className="timeline__toggle" onClick={onMethod}>
              {i.methodLabel}
            </button>
          </p>
        </section>
      </main>
    </div>
  )
}

export function ContractScreen({ onStart, hypothesisSet }: {
  readonly onStart: () => void
  readonly hypothesisSet: string
}) {
  const i = bundle.intro
  const [keep, setKeep] = useState(() => durability() === 'device')
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

      {/* OU VIT LA PARTIE, dit avant de commencer et non enfoui dans une
          mention légale. Les jugements du joueur sur des questions politiques
          sont des opinions politiques : des données sensibles. Le défaut est
          donc le plus prudent — l'onglet — et la conservation durable est un
          choix explicite. Voir src/ui/persistence.ts. */}
      <fieldset className="keep">
        <legend>Cette partie et toi</legend>
        <p className="provenance">
          Ce que tu réponds reste sur cet appareil&nbsp;: le jeu n’envoie rien, à personne.
          Par défaut, ta partie vit le temps de cet onglet — tu peux recharger la page sans
          rien perdre, et tout disparaît quand tu le fermes.
        </p>
        <label className="keep__choice">
          <input
            type="checkbox" checked={keep}
            onChange={(e) => { setKeep(e.target.checked); setDurability(e.target.checked ? 'device' : 'session') }}
          />
          <span>
            Garder cette partie sur cet appareil pour la reprendre plus tard.
            <span className="provenance">
              {' '}À éviter sur un ordinateur partagé&nbsp;: la personne suivante pourrait lire
              ce que tu as répondu.
            </span>
          </span>
        </label>
      </fieldset>

      <p className="home__actions">
        <button type="button" className="home__start" onClick={onStart}>
          {i.contractStartLabel}
        </button>
      </p>
    </article>
  )
}
