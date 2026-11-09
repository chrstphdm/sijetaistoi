import { lazy, Suspense, useEffect, useState } from 'react'
import { buildSummary, type KpiAnswer } from '@/core/summary.ts'
import { lastJudgement } from '@/core/game.ts'
import type { Scale } from '@/core/impact.ts'
import { characters, reforms } from '@/content/load.ts'
import { CONSTRAINT_STATEMENTS } from '@/core/casting.ts'
import { useGame } from './useGame.ts'
import { CharacterIntro } from './components/CharacterIntro.tsx'
import { ContractScreen, HomeScreen } from './components/HomeScreen.tsx'
import { GameRail } from './components/GameRail.tsx'
import { MethodScreen } from './components/MethodScreen.tsx'

/**
 * L'Atelier n'existe QU'EN DÉVELOPPEMENT.
 *
 * Sur un site déployé il serait décoratif et trompeur : il écrit dans un
 * dossier de la machine du visiteur, alors que le jeu lit un paquet figé au
 * moment du build. Un visiteur pourrait éditer, « enregistrer », et ne rien
 * voir changer — ni pour lui, ni pour personne.
 *
 * `import.meta.env.DEV` vaut `false` à la compilation, donc l'import
 * dynamique tombe en code mort et Rollup retire le fichier entier : le code
 * de l'Atelier et Zod ne sont pas même envoyés au visiteur.
 */
const STUDIO_AVAILABLE = import.meta.env.DEV

const Studio = STUDIO_AVAILABLE
  ? lazy(() => import('@/studio/Studio.tsx').then((m) => ({ default: m.Studio })))
  : null
import { MonthScreen } from './components/MonthScreen.tsx'
import { ReformVote } from './components/ReformVote.tsx'
import { ImpactForEach, rotationOrder } from './components/ImpactForEach.tsx'
import { JudgementScale } from './components/JudgementScale.tsx'
import { CallbackPanel, QuotaBlockedNote } from './components/Callback.tsx'
import { SummaryScreen } from './components/Summary.tsx'
import { ImpactProjection } from './components/ImpactProjection.tsx'
import { relaunchSentence } from '@/core/opinion.ts'
import { makeSeed, replaySameSeed, seedFromUrl, startFreshGame } from './seed.ts'
import { setupFromUrl, isPrepared, EMPTY_SETUP } from './setup.ts'
import { SetupScreen } from './components/SetupScreen.tsx'
import { useScreenChange } from './navigation.ts'
import { BackToTop, ScreenTitle, SkipLink } from './components/Navigation.tsx'
import type { Step } from './useGame.ts'
import { spellCount } from './words.ts'

/**
 * Titre de chaque ecran, pour l'onglet et pour le lecteur d'ecran.
 *
 * Le titre du document ne changeait jamais : tous les ecrans s'appelaient
 * « Si j'etais toi », donc l'historique du navigateur etait illisible et un
 * lecteur d'ecran n'annoncait aucun changement de page.
 */
function titleOf(step: Step, act: number, firstName: string): string {
  switch (step.kind) {
    case 'home': return 'Accueil'
    case 'contract': return 'Avant de commencer'
    case 'intro': return `Acte ${act} — ${firstName}`
    case 'month': return `Acte ${act} — un mois de ${firstName}`
    case 'callback': return `Acte ${act} — ${firstName}, sous tes règles`
    case 'reform': return `Acte ${act} — une décision collective`
    case 'judgement': return `Acte ${act} — ton jugement`
    case 'impact': return `Acte ${act} — ce que cela change pour chacun`
    case 'summary': return 'Bilan'
  }
}


export function App() {
  /**
   * Une graine par partie, lue dans l'adresse si elle y est.
   *
   * Elle était codée en dur, ce qui donnait exactement UNE partie possible :
   * mêmes personnages, même ordre de réformes, mêmes événements. Relevé en
   * test utilisateur — « je tombe toujours sur le même parcours ».
   *
   * La laisser dans l'adresse permet de rejouer une partie à l'identique,
   * de la partager, et de vérifier que le tirage n'était pas arrangé. C'est
   * la contrepartie concrète de la transparence promise sur le tirage.
   */
  const [seed] = useState(
    () => (typeof window === 'undefined' ? 'hors-navigateur' : seedFromUrl(window.location.search) ?? makeSeed()),
  )
  /**
   * Preparation lue dans l'adresse : personnages et decisions imposes.
   *
   * Vide dans une partie normale, auquel cas tout reste tire au hasard.
   */
  const [setup] = useState(() =>
    typeof window === 'undefined' ? EMPTY_SETUP : setupFromUrl(window.location.search),
  )
  const game = useGame(seed, setup)
  const { state, step, character, budget, stocks, month, reform, actions } = game
  const [scale, setScale] = useState<Scale>('slack')
  const [kpi, setKpi] = useState<KpiAnswer | null>(null)
  const [showOthers, setShowOthers] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [hash, setHash] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hash,
  )
  const showStudio = STUDIO_AVAILABLE && hash === '#atelier'
  /** Porte de service : preparer une partie. Aucun lien ne la designe. */
  const showSetup = hash === '#preparation'

  /**
   * Le fragment d'URL est écouté, pas seulement lu au démarrage.
   *
   * Sans cela, coller « #atelier » dans la barre d'adresse d'une page déjà
   * ouverte ne faisait rien, et le bouton Précédent ne ramenait pas au jeu.
   * Relevé par un test de bout en bout.
   */
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  /*
   * Remise a zero a chaque changement d'ecran : defilement, focus, titre.
   *
   * Appele AVANT tout retour conditionnel : un hook doit s'executer a chaque
   * rendu, dans le meme ordre. La cle inclut le mois et l'acte, sans quoi
   * passer du mois 1 au mois 2 — meme `kind` — ne declencherait rien, ce qui
   * est precisement le cas ou l'on arrivait en bas de page.
   */
  useScreenChange(
    showSetup
      ? { key: 'preparation', title: 'Préparer une partie' }
      : showMethod
        ? { key: 'methode', title: 'Comment ce jeu est construit' }
        : {
            key: `${step.kind}-${state.act}-${game.monthsDone}`,
            title: titleOf(step, state.act, character.identity.firstName),
          },
  )

  const nameOf = (id: string) =>
    characters.find((c) => c.id === id)?.identity.firstName ?? id
  const judgement = lastJudgement(state, reform.id)

  const allIds = characters.map((c) => c.id)

  if (showSetup) {
    return (
      <div className="layout layout--single" id="haut">
        <SkipLink />
        <main className="layout__main" id="contenu" tabIndex={-1}>
          <SetupScreen
            seed={seed} setup={setup}
            onCancel={() => { window.location.hash = ''; setHash('') }}
          />
        </main>
      </div>
    )
  }

  if (showStudio && Studio) {
    return (
      <Suspense fallback={<p className="sheet">Chargement de l’Atelier…</p>}>
        <Studio
          onBack={() => {
            window.location.hash = ''
            setHash('')
          }}
        />
      </Suspense>
    )
  }

  // La page méthode remplace le jeu plutôt que de s'y superposer : c'est un
  // document qu'on lit, pas une infobulle.
  if (showMethod) {
    return (
      <div className="layout layout--single" id="haut">
        <SkipLink />
        <main className="layout__main" id="contenu" tabIndex={-1}>
          <MethodScreen onBack={() => setShowMethod(false)} />
        </main>
        <BackToTop />
      </div>
    )
  }

  if (step.kind === 'home') {
    return (
      <div className="layout layout--single" id="haut">
        <SkipLink />
        <main className="layout__main" id="contenu" tabIndex={-1}>
          <HomeScreen onStart={actions.toContract} onMethod={() => setShowMethod(true)} />
        </main>
        <BackToTop />
      </div>
    )
  }

  if (step.kind === 'contract') {
    return (
      <div className="layout layout--single" id="haut">
        <SkipLink />
        <main className="layout__main" id="contenu" tabIndex={-1}>
          <ContractScreen
            onStart={actions.beginGame}
            hypothesisSet="sensibilité faible des comportements"
          />
        </main>
        <BackToTop />
      </div>
    )
  }

  return (
    <div className="layout" id="haut">
      <SkipLink />
      <GameRail
        state={state} step={step} nameOf={nameOf} allIds={allIds}
        month={month} monthsDone={game.monthsDone}
      />

      <main className="layout__main" id="contenu" tabIndex={-1}>
      <ScreenTitle>{titleOf(step, state.act, character.identity.firstName)}</ScreenTitle>

      {step.kind === 'intro' && (
        <CharacterIntro
          character={character} month={month} act={state.act} allIds={allIds}
          onContinue={actions.startMonths}
        />
      )}

      {step.kind === 'month' && (
        <MonthScreen
          /* La clé force un remontage à chaque mois. Sans elle, React
             réutilise l'instance et conserve l'état « relevé déjà consulté » :
             la révélation en trois temps sauterait dès le deuxième mois, et
             le joueur choisirait sans avoir regardé son budget. */
          key={`${state.act}-${game.monthsDone}`}
          budget={budget} stocks={stocks} month={month} event={step.event}
          firstName={character.identity.firstName}
          unavailable={character.unavailableOptions}
          onResolve={(optionId) => actions.resolveEvent(step.event, optionId)}
        />
      )}

      {step.kind === 'callback' && (
        <>
          <CharacterIntro
            character={character} month={month} act={state.act} allIds={allIds}
            onContinue={actions.startMonths}
          />
          {step.selection.kind === 'selected' && (
            <CallbackPanel
              callback={step.selection.callback}
              characterName={character.identity.firstName}
            />
          )}
          {step.selection.kind === 'quota_blocked' && <QuotaBlockedNote />}
          {step.selection.kind === 'none_available' && state.world.rules.length > 0 && (
            <section className="sheet">
              <p>
                Aucune des règles que tu as décidées ne concerne {character.identity.firstName}.
                Ce n’est pas la même chose qu’un effet nul&nbsp;: aucune ne s’applique à sa
                situation.
              </p>
            </section>
          )}

          {/* LA RELANCE. On repose la question sur la décision dont le joueur
              vient de voir l'effet, maintenant qu'il l'a vécue d'en face.
              Sans elle, chaque acte posant une réforme différente, aucune
              question n'était jamais reposée — et le suivi des changements
              d'opinion, pourtant au cœur du projet, ne produisait rien. */}
          {step.selection.kind === 'selected' && (() => {
            const askedId = step.selection.callback.rule.reformId
            const earlier = state.opinions.filter((o) => o.questionId === askedId)[0]
            const latest = lastJudgement(state, askedId)
            const alreadyAnswered = state.opinions.filter((o) => o.questionId === askedId).length > 1
            return (
              <section className="sheet" aria-labelledby="relaunch-title">
                <h2 id="relaunch-title">La même question, maintenant</h2>
                {earlier && <p>{relaunchSentence(earlier, `À l’acte ${state.act - 1}`)}</p>}
                <JudgementScale
                  value={alreadyAnswered ? latest : null}
                  onChange={(j) => actions.answerFor(askedId, j)}
                  legend="Ta réponse maintenant"
                />
                {alreadyAnswered && earlier && latest !== earlier.judgement && (
                  <p className="provenance">
                    Ta réponse a changé. Le jeu le note, sans en tirer de conclusion.
                  </p>
                )}
              </section>
            )
          })()}
        </>
      )}

      {step.kind === 'reform' && (
        <>
          <section className="sheet">
            <label htmlFor="wording">
              <strong>Avant de décider</strong>, en une phrase&nbsp;: qu’est-ce qui te paraît juste
              ici&nbsp;?
            </label>
            <textarea
              id="wording" rows={3} value={game.wording}
              onChange={(e) => game.setWording(e.target.value)}
              placeholder="Facultatif. Ce que tu écris sera cité tel quel, plus tard."
            />
            <p className="provenance">Ce texte reste sur cet appareil. Il n’est envoyé nulle part.</p>
          </section>

          <ReformVote
            reform={reform}
            order={rotationOrder(reform.options.length, state.act)}
            who={character.identity.firstName}
            onVote={actions.vote}
          />

          <aside className="footer-tools">
            <details
              open={showOthers}
              onToggle={(e) => {
                const opened = e.currentTarget.open
                if (opened && !showOthers) actions.consultOthers()
                setShowOthers(opened)
              }}
            >
              <summary>Consulter les autres personnages</summary>
              <ul className="details">
                {characters
                  .filter((c) => c.id !== character.id)
                  .map((c) => (
                    <li key={c.id}>
                      <strong>{c.identity.firstName}</strong> — {c.identity.identityLine}
                    </li>
                  ))}
              </ul>
            </details>
          </aside>
        </>
      )}

      {step.kind === 'judgement' && (
        <section className="sheet" aria-labelledby="judge-title">
          <h2 id="judge-title">Est-ce que cette décision te semble bien et juste&nbsp;?</h2>
          <JudgementScale value={judgement} onChange={actions.answer} legend="Ta réponse" />
          {judgement && (
            <p>
              <button type="button" onClick={actions.toImpact}>
                Voir ce que cela change pour chacun
              </button>
            </p>
          )}
        </section>
      )}

      {step.kind === 'impact' && (
        <>
          <ImpactForEach
            characters={characters} world={state.world} scale={scale}
            onScaleChange={setScale} screenIndex={state.act}
          />
          <section className="sheet">
            <button type="button" onClick={actions.nextAct}>
              {state.act >= 3 ? 'Voir le bilan' : 'Quelques mois plus tard…'}
            </button>
          </section>
        </>
      )}

      {step.kind === 'summary' && (
        <>
          <SummaryScreen
            summary={buildSummary(state)} characterName={nameOf} kpi={kpi} onKpi={setKpi}
          />
          <ImpactProjection world={state.world} />
          <section className="sheet" aria-labelledby="again-title">
            <h2 id="again-title">Rejouer</h2>
            <p>
              Une autre partie tire d’autres personnages et d’autres décisions parmi les{' '}
              {spellCount(characters.length)} personnages et les {spellCount(reforms.length)}{' '}
              décisions du corpus. Une partie n’en présente que trois de chaque.
            </p>
            <p>
              <button type="button" onClick={startFreshGame}>
                Commencer une nouvelle partie
              </button>
              {' '}
              {/* REJOUER LA MÊME, et pas seulement en ouvrir une autre.
                  Depuis qu'une partie est conservée localement, rouvrir
                  l'adresse la REPREND au lieu de la recommencer : sans ce
                  bouton, la phrase ci-dessous serait devenue fausse. */}
              <button type="button" className="timeline__toggle" onClick={replaySameSeed}>
                Rejouer cette partie depuis le début
              </button>
            </p>
            <p className="provenance">
              Cette partie-ci porte la graine <code>{seed}</code>, inscrite dans l’adresse.
              La rouvrir te ramène là où tu en étais&nbsp;; la rejouer depuis le début donne
              exactement la même partie, ce qui permet de la partager ou de vérifier que le
              tirage n’était pas arrangé.
            </p>
          </section>
        </>
      )}

      {/* Pied de page : toujours accessible, jamais encombrant. Le registre
          transforme « le jeu me punit » en « j'ai construit un monde », et la
          transparence du tirage permet de vérifier que le jeu n'envoie pas le
          joueur là où ça fait mal. Les deux restent repliés par défaut. */}
      <aside className="footer-tools">
        {/* Une partie reprise le dit. Retrouver un jeu en cours sans savoir
            pourquoi est déroutant, surtout plusieurs heures après. */}
        {game.restored && (
          <p className="provenance">
            Partie reprise là où tu l’avais laissée, depuis cet appareil.
          </p>
        )}
        <p>
          <button type="button" className="timeline__toggle" onClick={() => setShowMethod(true)}>
            Comment ce jeu est construit, et ce qu’il ne parvient pas à éviter
          </button>
        </p>
        {STUDIO_AVAILABLE && (
          <p>
            <button type="button" className="timeline__toggle"
              onClick={() => { window.location.hash = '#atelier' }}>
              Ouvrir l’Atelier et modifier le contenu
            </button>
          </p>
        )}
        <details>
          <summary>Comment ce jeu choisit tes personnages</summary>
          {/* Une partie préparée à la main ne doit PAS être décrite comme
              tirée au hasard : ce serait la seule affirmation fausse du jeu
              sur son propre fonctionnement. Voir src/ui/setup.ts. */}
          {isPrepared(setup) ? (
            <p className="provenance">
              Cette partie a été <strong>préparée à la main</strong> depuis l’écran de
              préparation&nbsp;: les personnages et les décisions marqués ci-dessous ont été
              imposés, non tirés. Les places laissées libres, elles, ont bien été tirées au
              hasard selon les règles ci-dessous.
            </p>
          ) : (
            <p className="provenance">
              Le premier personnage est tiré au hasard parmi les {characters.length}, sans aucune
              contrainte. Les suivants sont tirés au hasard parmi ceux qui satisfont les règles
              ci-dessous. Le jeu ne choisit jamais le personnage pour qui une décision serait la
              plus douloureuse.
            </p>
          )}
          <ul className="provenance">
            {Object.values(CONSTRAINT_STATEMENTS).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="provenance">
            Personnages&nbsp;:{' '}
            {state.castHistory
              .map((d) => `${nameOf(d.picked)}${d.imposed ? ' (imposé)' : ''}`)
              .join(' → ')}.
            {reforms.length > 0 && ` Réformes du corpus : ${reforms.length}.`}
          </p>
        </details>
      </aside>
      </main>
      <BackToTop />
    </div>
  )
}
