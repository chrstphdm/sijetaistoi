import { bundle } from '@/content/load.ts'
import { CONSTRAINT_STATEMENTS, RELAXATION_ORDER } from '@/core/casting.ts'
import { MOTION_SPEC_VERSION, THRESHOLDS, DENOMINATOR_FLOOR_CENTS } from '@/motion/intensity.ts'
import { MOTION_TABLE } from '@/motion/table.ts'
import { AVAILABILITY_STATEMENTS } from '@/core/availability.ts'
import { unfavourableCap } from '@/core/callback.ts'
import { MIN_OBSERVATIONS } from '@/core/summary.ts'
import { Icon } from './HomeArt.tsx'
import { Seal } from './Seal.tsx'
import { DOCUMENTS, REPO_URL } from '../links.ts'

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
 *
 * Elle emprunte la grammaire visuelle de l'accueil : bandeau sombre,
 * chiffres en grand, bandes alternees, cartes et schemas. Chaque schema est
 * decoratif et double un texte qui reste lisible sans lui.
 */

/** « Le cadrage lui-même. Poser des questions… » → titre et corps. */
function splitLead(item: string): { title: string | null; body: string } {
  const m = /^([^.]{3,60})\.\s+(.+)$/s.exec(item)
  return m ? { title: m[1]!, body: m[2]! } : { title: null, body: item }
}

/** L'affiliation est declaree, jamais jugee : un libelle, aucune hierarchie. */
const AFFILIATION: Record<string, string> = {
  public_institution: 'institution publique',
  statistics_body: 'organisme statistique',
  academic: 'recherche universitaire',
  think_tank: 'centre de réflexion',
  professional_body: 'organisation professionnelle',
  international: 'organisation internationale',
}

const STATUS: Record<string, string> = {
  debated: 'débattue',
  highly_debated: 'très débattue',
}

const CheckIcon = () => (
  <Icon><path d="M10 25l9 9 19-20" /></Icon>
)
const FilterIcon = () => (
  <Icon><path d="M6 9h36L28 26v12l-8 4V26z" /></Icon>
)
const DieIcon = () => (
  <Icon>
    <rect x="8" y="8" width="32" height="32" rx="6" />
    <circle cx="17" cy="17" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="31" cy="31" r="2.4" fill="currentColor" stroke="none" />
  </Icon>
)
const NumbersIcon = () => (
  <Icon>
    <path d="M6 40h36" />
    <rect x="10" y="26" width="6" height="14" />
    <rect x="21" y="16" width="6" height="24" />
    <rect x="32" y="8" width="6" height="32" />
  </Icon>
)
const DeviceIcon = () => (
  <Icon>
    <rect x="12" y="4" width="24" height="40" rx="4" />
    <rect x="18" y="20" width="12" height="10" rx="1.5" />
    <path d="M20 20v-3a4 4 0 0 1 8 0v3" />
  </Icon>
)

export function MethodScreen({ onBack, onLegal }: { readonly onBack?: () => void; readonly onLegal?: () => void }) {
  const m = bundle.method
  const debated = bundle.hypotheses.filter((h) => h.status !== 'consensual')
  const section = (id: string) => m.sections.find((s) => s.id === id)
  const known = new Set(['partialite-residuelle', 'ce-qui-est-verifie', 'donnees', 'donnees-personnelles'])
  const others = m.sections.filter((s) => !known.has(s.id))

  const biases = section('partialite-residuelle')
  const checks = section('ce-qui-est-verifie')
  const numbers = section('donnees')
  const privacy = section('donnees-personnelles')
  const allIds = bundle.characters.map((c) => c.id)
  const maxThreshold = THRESHOLDS[THRESHOLDS.length - 1]! * 1.2

  return (
    <div className="page method">
      <header className="hero hero--compact">
        <div className="hero__inner">
          <div className="hero__text">
            <p className="hero__kicker">Méthode</p>
            <h1 className="hero__title">{m.title}</h1>
            <p className="hero__tagline method__intro">{m.intro}</p>
          </div>
        </div>
      </header>

      {/* Les compteurs sont lus dans les données, pas recopiés. */}
      <section className="figures" aria-label="La méthode en chiffres">
        <ul>
          {biases && <li><b>{biases.items.length}</b><span>biais déclarés, et non supprimés</span></li>}
          {checks && <li><b>{checks.items.length}</b><span>règles qui bloquent la mise en ligne</span></li>}
          <li><b>{debated.length}</b><span>hypothèses à deux lectures</span></li>
          <li><b>{bundle.sources.length}</b><span>sources publiques citées</span></li>
          <li className="figures--zero"><b>0</b><span>donnée transmise à un serveur</span></li>
        </ul>
      </section>

      <div className="page__body">
        {biases && (
          <section className="band" aria-labelledby="m-partialite-residuelle">
            <h2 id="m-partialite-residuelle">{biases.title}</h2>
            <p className="lead">{biases.lead}</p>
            <ol className="biases">
              {biases.items.map((it) => {
                const { title, body } = splitLead(it)
                return (
                  <li key={it} className="bias">
                    {title && <h3>{title}</h3>}
                    <p>{body}</p>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {checks && (
          <section className="band band--tint" aria-labelledby="m-ce-qui-est-verifie">
            <h2 id="m-ce-qui-est-verifie">{checks.title}</h2>
            <p className="lead">{checks.lead}</p>
            <ul className="checks">
              {checks.items.map((it) => (
                <li key={it} className="check">
                  <span className="check__mark"><CheckIcon /></span>
                  <p>{it}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tout ce qui suit est lu dans les données et le code, jamais recopié. */}
        <section className="band" aria-labelledby="m-chiffres">
          <h2 id="m-chiffres">Les règles, telles qu’elles sont réellement appliquées</h2>
          <p className="lead">
            Ces valeurs sont lues dans le programme au moment de l’affichage. Elles ne peuvent pas
            diverger de ce qu’il fait.
          </p>
          <dl className="stats">
            <div className="stat stat--wide">
              <dt>Paliers de mise en scène</dt>
              <dd>{THRESHOLDS.map((t) => `${Math.round(t * 100)} %`).join(' · ')}</dd>
              {/* La même information, en échelle : décorative. */}
              <div className="stat__scale" aria-hidden="true">
                {THRESHOLDS.map((t, k) => (
                  <span key={t} style={{ left: `${(t / maxThreshold) * 100}%` }}>
                    <i />{k === 0 ? '' : `${Math.round(t * 100)} %`}
                  </span>
                ))}
              </div>
            </div>
            <div className="stat">
              <dt>Rappels défavorables, au plus</dt>
              <dd>{unfavourableCap(2)} sur 2 · {unfavourableCap(3)} sur 3</dd>
            </div>
            <div className="stat">
              <dt>Durée d’animation maximale</dt>
              <dd>{Math.max(...Object.values(MOTION_TABLE).map((p) => p.enterMs))} ms</dd>
            </div>
            <div className="stat">
              <dt>Plancher du dénominateur</dt>
              <dd>{DENOMINATOR_FLOOR_CENTS / 100} € par mois</dd>
            </div>
            <div className="stat">
              <dt>Réponses minimales avant d’énoncer une tendance</dt>
              <dd>{MIN_OBSERVATIONS}</dd>
            </div>
            <div className="stat">
              <dt>Version de la grammaire d’animation</dt>
              <dd>{MOTION_SPEC_VERSION}</dd>
            </div>
            <div className="stat">
              <dt>Corpus</dt>
              <dd>
                {bundle.characters.length} personnages · {bundle.events.length} événements ·{' '}
                {bundle.reforms.length} décisions collectives
              </dd>
            </div>
          </dl>
        </section>

        <section className="band" aria-labelledby="m-tresorerie">
          <h2 id="m-tresorerie">Ce qu’un personnage peut matériellement choisir</h2>
          <p className="lead">
            Toutes les options ne sont pas ouvertes à tout le monde. Payer une réparation en une
            fois suppose d’avoir la somme&nbsp;: la même panne n’est donc pas la même panne selon
            le compte en banque. Les règles ci-dessous sont lues dans le programme.
          </p>
          <ul className="details">
            {AVAILABILITY_STATEMENTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="provenance">
            Ces seuils sont une hypothèse de modèle, pas une donnée sourcée. Ils ont été ajoutés
            après avoir constaté que l’option «&nbsp;payer en une fois&nbsp;» était proposée à un
            personnage disposant de 180&nbsp;€ pour une dépense de 750&nbsp;€.
          </p>
        </section>

        <section className="band band--tint" aria-labelledby="m-tirage">
          <h2 id="m-tirage">Comment les personnages sont tirés</h2>
          <p className="lead">
            Le premier personnage est tiré au hasard parmi les {bundle.characters.length}, sans
            aucune contrainte : aucun biais n’est possible sur le point d’entrée. Les suivants sont
            tirés au hasard parmi ceux qui satisfont les règles ci-dessous. Le jeu ne choisit jamais
            le personnage pour qui une décision serait la plus douloureuse.
          </p>
          <ol className="draw">
            <li className="draw__step">
              <span className="draw__seals" aria-hidden="true">
                {allIds.map((id) => <Seal key={id} id={id} allIds={allIds} size={26} />)}
              </span>
              <p>Les {bundle.characters.length} personnages du corpus</p>
            </li>
            {Object.values(CONSTRAINT_STATEMENTS).map((s) => (
              <li key={s} className="draw__step">
                <span className="draw__icon"><FilterIcon /></span>
                <p>{s}</p>
              </li>
            ))}
            <li className="draw__step draw__step--last">
              <span className="draw__icon"><DieIcon /></span>
              <p>Tirage au hasard, à chances égales, parmi ceux qui restent</p>
            </li>
          </ol>
          <p className="provenance draw__relax">
            Quand aucun personnage ne satisfait toutes ces règles, elles sont relâchées dans cet
            ordre : {RELAXATION_ORDER.map((id) => `« ${CONSTRAINT_STATEMENTS[id].replace(/\.$/, '')} »`).join(', puis ')}.
            Rejouer un personnage déjà incarné est le dernier recours.
          </p>
        </section>

        <section className="band" aria-labelledby="m-hypotheses">
          <h2 id="m-hypotheses">Les hypothèses contestées, et leurs deux lectures</h2>
          <p className="lead">
            {debated.length} hypothèse{debated.length > 1 ? 's' : ''} du modèle port
            {debated.length > 1 ? 'ent' : 'e'} sur des points où les études disponibles ne
            convergent pas. Le jeu ne tranche pas : il nomme les deux lectures.
          </p>
          {/* Les lectures ont exactement le même traitement : aucune n'est en
              accent, aucune n'est présentée en premier comme la bonne. */}
          <div className="hypos">
            {debated.map((h) => (
              <article key={h.id} className="hypo">
                <p className="hypo__status">Hypothèse {STATUS[h.status] ?? h.status}</p>
                <h3>{h.question}</h3>
                <ul className="hypo__readings">
                  {h.readings.map((r) => (
                    <li key={r.id}>
                      <strong>Lecture {r.id}</strong>
                      <span>{r.mechanismLabel}</span>
                    </li>
                  ))}
                </ul>
                <details className="hypo__why">
                  <summary>Pourquoi les travaux divergent</summary>
                  <p>{h.whyDebated}</p>
                </details>
              </article>
            ))}
          </div>
        </section>

        {(numbers || privacy) && (
          <section className="band band--tint" aria-label="Les chiffres et vos données">
            <div className="duo">
              {[
                { s: numbers, icon: <NumbersIcon /> },
                { s: privacy, icon: <DeviceIcon /> },
              ].map(({ s, icon }) => s && (
                <section key={s.id} className="duo__card" aria-labelledby={`m-${s.id}`}>
                  <span className="duo__icon">{icon}</span>
                  <h2 id={`m-${s.id}`}>{s.title}</h2>
                  <p className="duo__lead">{s.lead}</p>
                  <ul>
                    {s.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        )}

        {others.map((s) => (
          <section key={s.id} className="band" aria-labelledby={`m-${s.id}`}>
            <h2 id={`m-${s.id}`}>{s.title}</h2>
            <p className="lead">{s.lead}</p>
            <ul className="plain">
              {s.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </section>
        ))}

        <section className="band" aria-labelledby="m-sources">
          <h2 id="m-sources">Les sources utilisées pour calibrer</h2>
          <p className="lead">
            L’affiliation de chaque source est déclarée, jamais jugée : le jeu n’établit aucune
            hiérarchie de crédibilité entre un organisme statistique et un centre de réflexion.
          </p>
          <ul className="sources">
            {bundle.sources.map((s) => (
              <li key={s.id} className="source">
                <span className="source__org" aria-hidden="true">{s.organisation}</span>
                <span className="source__text">
                  {/* Chaque source porte son adresse dans les données : la page
                      la taisait. Un lien, pas une ressource chargée. */}
                  <strong><a href={s.url} rel="noopener noreferrer">{s.name}</a></strong>
                  <span className="provenance">
                    {s.organisation} · {AFFILIATION[s.affiliation] ?? s.affiliation} · {s.vintage}
                  </span>
                  <span className="source__scope">{s.scope}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tout est consultable. La page affirmait que « le code et le contenu
            sont publics » sans jamais dire où. */}
        <section className="band band--tint" aria-labelledby="m-documents">
          <h2 id="m-documents">Les documents de travail, en entier</h2>
          <p className="lead">
            Cette page résume. Les documents qui fondent le jeu sont publiés tels quels, avec
            l’historique de chaque modification.
          </p>
          <ul className="docs">
            {DOCUMENTS.map((d) => (
              <li key={d.href} className="doc">
                <a href={d.href} rel="noopener noreferrer">{d.label}&nbsp;↗</a>
                <span>{d.what}</span>
              </li>
            ))}
          </ul>
          <p>
            <a href={REPO_URL} rel="noopener noreferrer">Le dépôt complet, code et contenu&nbsp;↗</a>
          </p>
        </section>

        <section className="band band--close">
          <p className="method__closing">{m.closing}</p>
          {onLegal && (
            <p>
              <button type="button" className="timeline__toggle" onClick={onLegal}>Mentions légales</button>
            </p>
          )}
          {onBack && (
            <p className="hero__actions">
              <button type="button" className="home__start" onClick={onBack}>
                Revenir au jeu
              </button>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
