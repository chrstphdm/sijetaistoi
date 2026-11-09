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
import { relaunchSentence } from '@/core/opinion.ts'

const SEED = 'partie-1'

export function App() {
  const game = useGame(SEED)
  const { state, step, character, budget, stocks, month, reform, actions } = game
  const [scale, setScale] = useState<Scale>('slack')
  const [kpi, setKpi] = useState<KpiAnswer | null>(null)
  const [showOthers, setShowOthers] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [showStudio, setShowStudio] = useState(
    () => STUDIO_AVAILABLE && typeof window !== 'undefined' && window.location.hash === '#atelier',
  )

  /**
   * Le fragment d'URL est écouté, pas seulement lu au démarrage.
   *
   * Sans cela, coller « #atelier » dans la barre d'adresse d'une page déjà
   * ouverte ne faisait rien, et le bouton Précédent ne ramenait pas au jeu.
   * Relevé par un test de bout en bout.
   */
  useEffect(() => {
    const sync = () => setShowStudio(STUDIO_AVAILABLE && window.location.hash === '#atelier')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const nameOf = (id: string) =>
    characters.find((c) => c.id === id)?.identity.firstName ?? id
  const judgement = lastJudgement(state, reform.id)
  const previous = state.opinions.filter((o) => o.questionId === reform.id)[0]

  const allIds = characters.map((c) => c.id)

  if (showStudio && Studio) {
    return (
      <Suspense fallback={<p className="sheet">Chargement de l’Atelier…</p>}>
        <Studio
          onBack={() => {
            window.location.hash = ''
            setShowStudio(false)
          }}
        />
      </Suspense>
    )
  }

  // La page méthode remplace le jeu plutôt que de s'y superposer : c'est un
  // document qu'on lit, pas une infobulle.
  if (showMethod) {
    return (
      <div className="layout layout--single">
        <main className="layout__main">
          <MethodScreen onBack={() => setShowMethod(false)} />
        </main>
      </div>
    )
  }

  if (step.kind === 'home') {
    return (
      <div className="layout layout--single">
        <main className="layout__main">
          <HomeScreen onStart={actions.toContract} onMethod={() => setShowMethod(true)} />
        </main>
      </div>
    )
  }

  if (step.kind === 'contract') {
    return (
      <div className="layout layout--single">
        <main className="layout__main">
          <ContractScreen
            onStart={actions.beginGame}
            hypothesisSet="sensibilité faible des comportements"
          />
        </main>
      </div>
    )
  }

  return (
    <div className="layout">
      <GameRail
        state={state} step={step} nameOf={nameOf} allIds={allIds}
        month={month} monthsDone={game.monthsDone}
      />

      <main className="layout__main">
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
          {previous && state.act > 1 && (
            <p>{relaunchSentence(previous, 'Lors d’un acte précédent')}</p>
          )}
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
        <SummaryScreen
          summary={buildSummary(state)} characterName={nameOf} kpi={kpi} onKpi={setKpi}
        />
      )}

      {/* Pied de page : toujours accessible, jamais encombrant. Le registre
          transforme « le jeu me punit » en « j'ai construit un monde », et la
          transparence du tirage permet de vérifier que le jeu n'envoie pas le
          joueur là où ça fait mal. Les deux restent repliés par défaut. */}
      <aside className="footer-tools">
        <p>
          <button type="button" className="timeline__toggle" onClick={() => setShowMethod(true)}>
            Comment ce jeu est construit, et ce qu’il ne parvient pas à éviter
          </button>
        </p>
        {STUDIO_AVAILABLE && (
          <p>
            <button type="button" className="timeline__toggle"
              onClick={() => { window.location.hash = '#atelier'; setShowStudio(true) }}>
              Ouvrir l’Atelier et modifier le contenu
            </button>
          </p>
        )}
        <details>
          <summary>Comment ce jeu choisit tes personnages</summary>
          <p className="provenance">
            Le premier personnage est tiré au hasard parmi les {characters.length}, sans aucune
            contrainte. Les suivants sont tirés au hasard parmi ceux qui satisfont les règles
            ci-dessous. Le jeu ne choisit jamais le personnage pour qui une décision serait la
            plus douloureuse.
          </p>
          <ul className="provenance">
            {Object.values(CONSTRAINT_STATEMENTS).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="provenance">
            Tirages effectués&nbsp;: {state.castHistory.map((d) => nameOf(d.picked)).join(' → ')}.
            {reforms.length > 0 && ` Réformes du corpus : ${reforms.length}.`}
          </p>
        </details>
      </aside>
      </main>
    </div>
  )
}
