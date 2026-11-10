import { useRef, useState, type CSSProperties } from 'react'
import { bundle, characters } from '@/content/load.ts'
import { durability, setDurability } from '../persistence.ts'
import { BalanceIcon, HeroCast, LookArt, TheoryIcon, TrustIcon } from './HomeArt.tsx'
import { REPO_URL } from '../links.ts'
import { useReveal } from '../useReveal.ts'
import { DISCLAIMER } from './LegalScreen.tsx'
import { LoopDiagram } from './LoopDiagram.tsx'
import { ScaleDemo } from './ScaleDemo.tsx'
import { Seal, sealHue } from './Seal.tsx'
import { IncomeLadder, Standing, coveredDeciles } from './PopulationPlace.tsx'
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

/**
 * Un chiffre qui compte jusqu'à sa valeur quand il apparaît.
 *
 * La valeur réelle est dans le texte (lue par un lecteur d'écran, copiée,
 * indexée) ; le défilement n'est qu'un dessin par-dessus, en CSS. Sans
 * JavaScript ou avec moins de mouvement demandé, la valeur finale s'affiche
 * directement.
 */
function Count({ n }: { readonly n: number }) {
  return (
    <b className="count" style={{ '--to': n } as CSSProperties}>
      <span className="count__n">{n}</span>
    </b>
  )
}

/** Index de cascade, pour que les cartes d'une grille arrivent l'une après l'autre. */
const capitalised = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)

const at = (i: number) => ({ '--i': i }) as CSSProperties

export function HomeScreen({ onStart, onMethod, onLegal }: {
  readonly onStart: () => void
  readonly onMethod: () => void
  readonly onLegal?: () => void
}) {
  const i = bundle.intro
  const principles = bundle.principles.principles
  const byId = new Map(principles.map((p) => [p.id, p]))
  const allIds = characters.map((c) => c.id)
  const root = useRef<HTMLDivElement>(null)
  useReveal(root)

  /*
   * Les garanties de la méthode, chiffrées depuis les DONNÉES et non
   * recopiées : un compteur qui dériverait de ce que le jeu fait vraiment
   * serait pire que pas de compteur.
   */
  const section = (id: string) => bundle.method.sections.find((s) => s.id === id)
  const checks = section('ce-qui-est-verifie')?.items.length ?? 0
  const biases = section('partialite-residuelle')?.items.length ?? 0
  const debated = bundle.hypotheses.filter((h) => h.status !== 'consensual').length
  const organisations = [...new Set(bundle.sources.map((s) => s.organisation))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  )

  /*
   * Ce que couvre le corpus, calculé et non affirmé. On n'écrit pas
   * « représentatif » : treize situations ne représentent pas un pays, et la
   * page méthode le dit. On montre ce qui est vrai — la couverture.
   */
  const sourceById = new Map(bundle.sources.map((s) => [s.id, s]))
  const subjects = bundle.reforms.map((r) => ({
    id: r.id,
    title: r.descriptiveTitle,
    orgs: [...new Set(r.contextSourceIds.map((id) => sourceById.get(id)?.organisation).filter(Boolean))],
  }))
  const activities = new Set(characters.flatMap((c) => c.traits.activities)).size
  const tenures = new Set(characters.map((c) => c.traits.tenure)).size
  const insee = bundle.sources.find((s) => s.id === bundle.population.livingStandardDeciles.sourceId)

  const start = (
    <button type="button" className="home__start" onClick={onStart}>
      {i.startLabel}
    </button>
  )

  return (
    <div className="page" ref={root}>
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
            {/* Dès le bandeau : la façon dont le jeu se garde de convaincre
                n'est pas une annexe, c'est ce qui le fait fonctionner. */}
            <p className="hero__trust">
              <span>{checks} règles de neutralité vérifiées</span>
              <span>{bundle.sources.length} sources publiques</span>
              <span>{biases} biais déclarés</span>
              <span>Aides et impôts vérifiés avec OpenFisca</span>
              <a href="#confiance">Comment le jeu se garde de te convaincre&nbsp;↓</a>
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
            <li><Count n={3} /><span>personnes incarnées, tirées au sort</span></li>
            <li><Count n={characters.length} /><span>situations dans le corpus</span></li>
            <li><Count n={4} /><span>façons de mesurer un même montant</span></li>
            <li><Count n={20} /><span>minutes environ</span></li>
            <li className="figures--zero"><Count n={0} /><span>score, classement ou étiquette</span></li>
          </ul>
        </section>

        {/* LA MÉTHODE, LE PLUS TÔT POSSIBLE. Elle était au bout d'un lien en
            pied de page, alors que c'est elle qui commande tout le jeu : ce
            qu'il montre, dans quel ordre, avec quels chiffres. */}
        <section className="band trust reveal" id="confiance" aria-labelledby="h-trust">
          <h2 id="h-trust">Comment ce jeu se garde de te convaincre</h2>
          <p className="lead">
            Un jeu sur des choix politiques n’est jamais neutre. Celui-ci rend vérifiable ce qu’il
            fait, ce qu’il s’interdit, et surtout ce qu’il n’arrive pas à éviter.
          </p>
          <ul className="trust__grid">
            <li className="trust__card" style={at(0)}>
              <span className="trust__icon"><TrustIcon id="checks" /></span>
              <p className="trust__figure"><Count n={checks} /> règles vérifiées à chaque mise en ligne</p>
              <p>
                Elles bloquent la publication si elles sont enfreintes&nbsp;: chaque chiffre dit
                s’il est sourcé, supposé ou fictif&nbsp;; chaque option porte des arguments dans les
                deux sens&nbsp;; aucune n’a que des effets défavorables.
              </p>
            </li>
            <li className="trust__card" style={at(1)}>
              <span className="trust__icon"><TrustIcon id="sources" /></span>
              <p className="trust__figure"><Count n={bundle.sources.length} /> sources publiques</p>
              <p>
                Les montants sont calibrés sur des statistiques publiques. L’affiliation de chaque
                source est déclarée, jamais jugée.
              </p>
              <p className="trust__orgs">{organisations.join(' · ')}</p>
            </li>
            <li className="trust__card" style={at(2)}>
              <span className="trust__icon"><TrustIcon id="hypotheses" /></span>
              <p className="trust__figure"><Count n={debated} /> hypothèses contestées, deux lectures chacune</p>
              <p>
                Là où les études disponibles divergent, le jeu ne tranche pas&nbsp;: il nomme les
                deux lectures, et signale à quel moment un chiffre en dépend.
              </p>
            </li>
            <li className="trust__card" style={at(3)}>
              <span className="trust__icon"><TrustIcon id="biases" /></span>
              <p className="trust__figure"><Count n={biases} /> biais que nous n’avons pas su éviter</p>
              <p>
                Le cadrage des questions, le choix des sujets, la mesure affichée en premier… Ils
                sont publiés, pour pouvoir être contestés.
              </p>
            </li>
            <li className="trust__card trust__card--law" style={at(4)}>
              <span className="trust__icon"><TrustIcon id="law" /></span>
              <p className="trust__figure">
                <b className="trust__brand">OpenFisca</b> aides et impôts recalculés selon la loi
              </p>
              <p>
                Les prestations et l’impôt de chaque personnage sont vérifiés à chaque mise en ligne
                avec OpenFisca-France, le modèle libre de la législation socio-fiscale française.
                Un écart non expliqué bloque la publication. Les effets des décisions, eux, restent
                des estimations&nbsp;: les calculer ainsi est l’étape suivante.
              </p>
              <p className="trust__orgs">
                <a href="https://openfisca.org/fr/" rel="noopener noreferrer">openfisca.org&nbsp;↗</a>
                {' · '}
                <a href={`${REPO_URL}/blob/main/scripts/openfisca/dernier-audit.md`} rel="noopener noreferrer">le dernier audit&nbsp;↗</a>
              </p>
            </li>
          </ul>
          <p className="trust__actions">
            <button type="button" className="btn-primary" onClick={onMethod}>
              Lire comment le jeu est construit
            </button>
            <a href={REPO_URL} rel="noopener noreferrer">
              Charte, sources et code, sur le dépôt public&nbsp;↗
            </a>
          </p>
        </section>

        {/* DES MESURES, PAS DES PARTIS ; DES SITUATIONS, PAS UN ÉCHANTILLON.
            Les deux phrases qu'on attend d'un jeu politique, et qu'il faut
            pouvoir vérifier sur la page même. */}
        <section className="band band--tint reveal" aria-labelledby="h-corpus">
          <h2 id="h-corpus">Des mesures, pas des partis — et tout l’éventail des revenus</h2>
          <div className="corpus">
            <article className="corpus__card">
              <h3>Les grandes idées qui opposent les programmes — sans dire qui les porte</h3>
              <p>
                Les {spellCount(bundle.reforms.length)} décisions portent sur les sujets où le débat
                public est réellement divisé. Aucun parti, aucun candidat, aucun programme n’est
                nommé&nbsp;: tu juges une mesure, pas son auteur. Chaque option est nommée par ce
                qu’elle fait, jamais par le camp qui la défend.
              </p>
              <ul className="subjects">
                {subjects.map((x, k) => (
                  <li key={x.id} className="subject" style={at(k)}>
                    <span className="subject__title">{x.title}</span>
                    {x.orgs.length > 0 && <span className="subject__orgs">{x.orgs.join(' · ')}</span>}
                  </li>
                ))}
              </ul>
              <p className="corpus__note">
                Sous chaque sujet, les organismes publics dont les chiffres l’étayent. Pourquoi aucun
                parti n’est nommé&nbsp;: c’est écrit, avec son coût, dans{' '}
                <button type="button" className="timeline__toggle" onClick={onMethod}>
                  la page méthode
                </button>.
              </p>
            </article>

            <article className="corpus__card">
              <h3>{capitalised(spellCount(characters.length))} situations, du premier au dernier décile de revenu</h3>
              <p>
                Les personnages sont fictifs, mais leurs budgets sont calibrés sur les statistiques
                publiques. Calculés sur leurs relevés, ils occupent {spellCount(coveredDeciles())} des dix
                déciles de niveau de vie,{' '}
                {spellCount(activities)} situations d’activité et {spellCount(tenures)} façons
                d’être logé.
              </p>
              {/* Chaque personnage sur la courbe des niveaux de vie, à la
                  position calculée sur son relevé. La liste sous le dessin
                  dit la même chose, en toutes lettres. */}
              <IncomeLadder />
              <p className="corpus__note">
                Une couverture n’est pas un échantillon&nbsp;: treize situations ne représentent pas
                un pays, et certaines manquent —{' '}
                <button type="button" className="timeline__toggle" onClick={onMethod}>
                  lesquelles, et pourquoi
                </button>.
                {insee && (
                  <>
                    {' '}Repères&nbsp;: <a href={insee.url} rel="noopener noreferrer">{insee.organisation}, {insee.name.toLowerCase()} ({insee.vintage})&nbsp;↗</a>
                  </>
                )}
              </p>
            </article>
          </div>
        </section>

        {/* Le critère de réussite, en grand : c'est la seule promesse du jeu. */}
        <section className="band reveal">
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

        <section className="band band--tint reveal" aria-labelledby="h-rules">
          <h2 id="h-rules">{i.rulesTitle}</h2>
          <div className="split">
            <LoopDiagram />
            <ol className="cards cards--numbered">
              {i.rules.map((r, k) => (
                <li key={r.id} style={at(k)}>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band reveal" aria-labelledby="h-demo">
          <h2 id="h-demo">La même somme, quatre façons de la mesurer</h2>
          <p className="lead">
            C’est l’idée centrale du jeu, et tu peux l’essayer tout de suite.
          </p>
          <ScaleDemo />
        </section>

        <section className="band band--tint reveal" aria-labelledby="h-cast">
          <h2 id="h-cast">Les {spellCount(characters.length)} personnes que tu peux incarner</h2>
          <p className="lead">
            Tu en incarnes trois par partie, tirées au sort. Chacune est représentée
            par un motif abstrait plutôt que par un visage — un portrait de «&nbsp;mère
            célibataire&nbsp;» serait une caricature en puissance. Les{' '}
            {spellCount(characters.length)} motifs ont exactement la même densité.
          </p>
          <ul className="cast">
            {characters.map((c, k) => (
              <li
                key={c.id}
                style={{ ['--seal-hue' as string]: sealHue(c.id, allIds), '--i': k } as CSSProperties}
              >
                <span className="cast__tile">
                  <Seal id={c.id} allIds={allIds} size={64} />
                </span>
                <span className="cast__text">
                  <strong>{c.identity.firstName}</strong>
                  <span className="cast__age">{c.identity.age} ans</span>
                  <span className="provenance">{c.identity.identityLine}</span>
                  <Standing character={c} compact />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Chaque thèse porte son objection, au même format et au même
            poids visuel. L'afficher plus discrètement reviendrait à
            recommander la thèse. */}
        <section className="band reveal" aria-labelledby="h-theory">
          <h2 id="h-theory">{i.theoryTitle}</h2>
          <p className="lead">{i.theoryLead}</p>
          {/* Repliées comme les principes, et pour la même raison : la
              page faisait plus de 10 000 pixels sur petit écran. Thèse et
              objection sont repliées ENSEMBLE, jamais l'une sans l'autre. */}
          <ul className="theories">
            {i.theories.map((t, k) => (
              <li key={t.id} className="theory" style={at(k)}>
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

        <section className="band band--tint reveal" aria-labelledby="h-principles">
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

        <section className="band reveal" aria-labelledby="h-look">
          <h2 id="h-look">{i.lookTitle}</h2>
          {/* Dépliées : trois paragraphes courts, qui n'ont pas d'objection
              à replier avec eux. Chacun a sa vignette, qui montre ce que le
              texte décrit. */}
          <ul className="looks">
            {i.look.map((l, k) => (
              <li key={l.id} className="look" style={at(k)}>
                <LookArt id={l.id} />
                <h3>{l.title}</h3>
                <p>{l.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="band band--tint reveal" aria-labelledby="h-not">
          <h2 id="h-not">{i.notTitle}</h2>
          {/* Le mot barré est un repère visuel ; c'est la phrase qui le dit,
              et c'est elle que lit un lecteur d'écran. */}
          <ul className="nots">
            {i.notList.map((n, k) => (
              <li key={n.id} className="not" style={at(k)}>
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
          <p className="disclaimer">{DISCLAIMER}</p>
          {onLegal && (
            <p>
              <button type="button" className="timeline__toggle" onClick={onLegal}>Mentions légales</button>
            </p>
          )}
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
      <p className="provenance">{DISCLAIMER}</p>
      <p className="provenance">
        Cette partie utilise le jeu d’hypothèses «&nbsp;{hypothesisSet}&nbsp;», tiré au sort.
        Les points où les études disponibles ne convergent pas sont signalés à mesure.
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
