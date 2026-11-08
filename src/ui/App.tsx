import { useMemo, useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import type { Scale } from '@/core/impact.ts'
import {
  selectCallback, type CallbackCandidate, type CallbackSign, type Selection,
} from '@/core/callback.ts'
import {
  movements, relaunchSentence, type Judgement, type OpinionEntry,
} from '@/core/opinion.ts'
import { createRandom } from '@/core/rng.ts'
import {
  activeEffectsFor, applyEffectsToLines, applyRule, emptyWorld,
  rulesInForce, type Rule, type WorldState,
} from '@/core/world.ts'
import { characters, optionLookup, reforms, toBudgetLines } from '@/content/load.ts'
import { formatEuros } from '@/core/money.ts'
import type { ReformOptionT } from '@/schemas/index.ts'
import { MonthlyBudget } from './components/MonthlyBudget.tsx'
import { ReformVote } from './components/ReformVote.tsx'
import { ImpactForEach, rotationOrder } from './components/ImpactForEach.tsx'
import { JudgementScale } from './components/JudgementScale.tsx'
import { CallbackPanel, QuotaBlockedNote } from './components/Callback.tsx'
import { SummaryScreen } from './components/Summary.tsx'
import { buildSummary, type KpiAnswer } from '@/core/summary.ts'
import { replay, type Command } from '@/core/game.ts'

const REFORM = reforms[0]!
const SEED = 'demo-2027'

type Phase = 'living' | 'judging' | 'impact' | 'collision' | 'summary'

const traitsOf = (c: (typeof characters)[number]) => ({
  ...c.traits,
  incomeDecile: c.identity.incomeDecile,
})

export function App() {
  const [world, setWorld] = useState<WorldState>(() => emptyWorld('sensibilite-faible'))
  const [phase, setPhase] = useState<Phase>('living')
  const [scale, setScale] = useState<Scale>('slack')
  const [wording, setWording] = useState('')
  const [judgement, setJudgement] = useState<Judgement | null>(null)
  const [log, setLog] = useState<readonly OpinionEntry[]>([])
  const [signs, setSigns] = useState<readonly CallbackSign[]>([])
  const [who, setWho] = useState(0)
  const [kpi, setKpi] = useState<KpiAnswer | null>(null)

  /**
   * Le journal de commandes. C'est lui, et non les états locaux ci-dessus,
   * qui sert à construire le bilan : le même chemin que pour une sauvegarde
   * rechargée, donc le même résultat. Les états locaux ne pilotent que
   * l'affichage immédiat.
   */
  const [journal, setJournal] = useState<readonly Command[]>(() => [
    { type: 'start', seed: SEED, contentVersion: '0.1.0', hypothesisSetId: 'sensibilite-faible' },
    { type: 'cast', draw: { picked: characters[0]!.id, pool: characters.map((c) => c.id),
      eligible: characters.map((c) => c.id), applied: [], relaxed: [], uniform: true } },
  ])
  const record = (...cmds: Command[]) => setJournal((j) => [...j, ...cmds])

  const random = useMemo(() => createRandom(SEED), [])
  const current = characters[who]!
  const budget = computeMonthlyBudget(toBudgetLines(current))

  const vote = (option: ReformOptionT) => {
    const rule: Rule = {
      id: `rule-${world.rules.length + 1}`,
      reformId: REFORM.id,
      optionId: option.id,
      shortLabel: option.label,
      playerWording: wording.trim() || null,
      playerJudgement: null,
      diegeticMonth: 'avril 2027',
      replaces: null,
      status: 'in_force',
    }
    setWorld((w) => applyRule(w, rule))
    record({ type: 'vote', rule })
    setPhase('judging')
  }

  const answer = (j: Judgement) => {
    setJudgement(j)
    const entry = {
      questionId: REFORM.id,
      judgement: j,
      freeText: wording.trim() || null,
      turn: log.length + 1,
      characterId: current.id,
      context: `vote sur ${REFORM.descriptiveTitle}`,
    }
    setLog((l) => [...l, entry])
    record({ type: 'answer', entry })
  }

  /* --- Collision : incarner l'autre personnage et subir sa propre règle ---
   *
   * Le rappel est CALCULE AU MOMENT DE LA TRANSITION, puis figé dans l'état.
   * Le recalculer à chaque rendu serait un bug subtil : une fois le signe
   * ajouté à l'historique, le quota le compterait deux fois et bloquerait
   * le rappel qu'il vient lui-même d'autoriser. Un test l'a attrapé.
   */
  const [collision, setCollision] = useState<Selection | null>(null)

  const buildCollision = (target: (typeof characters)[number]): Selection => {
    const effects = activeEffectsFor(world, traitsOf(target), optionLookup)
    if (effects.length === 0) return { kind: 'none_available' }

    const before = computeMonthlyBudget(toBudgetLines(target))
    const after = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(target), effects))
    const delta = after.slackCents - before.slackCents

    const candidate: CallbackCandidate = {
      rule: rulesInForce(world)[0]!,
      characterId: target.id,
      deltaCents: delta,
      here: `Son reste à vivre passe de ${formatEuros(before.slackCents)} à ${formatEuros(after.slackCents)} par mois.`,
      elsewhere:
        'Le programme de rénovation est financé à hauteur de 3 Md€. Les logements les plus mal isolés sont traités en premier.',
    }
    return selectCallback([candidate], signs, random.presentation)
  }

  const goToCollision = () => {
    const nextIndex = (who + 1) % characters.length
    const result = buildCollision(characters[nextIndex]!)
    if (result.kind === 'selected') setSigns((s) => [...s, result.callback.sign])
    setCollision(result)
    record({
      type: 'cast',
      draw: { picked: characters[nextIndex]!.id, pool: characters.map((c) => c.id),
        eligible: characters.map((c) => c.id), applied: ['not_already_played'], relaxed: [], uniform: true },
    })
    if (result.kind === 'selected')
      record({ type: 'emit_callback', ruleId: result.callback.rule.id, sign: result.callback.sign })
    setWho(nextIndex)
    setPhase('collision')
  }

  const previousAnswer = log.find((e) => e.questionId === REFORM.id)

  const summary = useMemo(() => buildSummary(replay(journal)), [journal])

  const nameOf = (id: string) =>
    characters.find((c) => c.id === id)?.identity.firstName ?? id

  return (
    <main>
      {phase !== 'collision' && (
        <>
          <div className="sheet">
            <p className="sheet__kicker">Mars 2027</p>
            <h1>Tu es {current.identity.firstName}.</h1>
            <p>{current.identity.identityLine}</p>
            <p>{current.narrative.story}</p>
            <p>
              <strong>Ce que tu veux ces prochains mois</strong>&nbsp;:{' '}
              {current.shortTermGoal.label}.
            </p>
          </div>
          <MonthlyBudget budget={budget} month="Mars 2027" />
        </>
      )}

      {phase === 'living' && (
        <>
          <section className="sheet">
            <label htmlFor="wording">
              <strong>Avant de décider</strong>, en une phrase&nbsp;: qu’est-ce qui te paraît juste
              ici&nbsp;?
            </label>
            <textarea
              id="wording" rows={3} value={wording}
              onChange={(e) => setWording(e.target.value)}
              placeholder="Facultatif. Ce que tu écris sera cité tel quel, plus tard."
            />
            <p className="provenance">Ce texte reste sur cet appareil. Il n’est envoyé nulle part.</p>
          </section>
          <ReformVote reform={REFORM} order={rotationOrder(REFORM.options.length, 0)} onVote={vote} />
        </>
      )}

      {phase === 'judging' && (
        <section className="sheet" aria-labelledby="judge-title">
          <h2 id="judge-title">Est-ce que cette décision te semble bien et juste&nbsp;?</h2>
          <JudgementScale value={judgement} onChange={answer} legend="Ta réponse" />
          {judgement && (
            <p>
              <button type="button" onClick={() => setPhase('impact')}>
                Voir ce que cela change pour chacun
              </button>
            </p>
          )}
        </section>
      )}

      {phase === 'impact' && (
        <>
          <ImpactForEach
            characters={characters} world={world} scale={scale}
            onScaleChange={setScale} screenIndex={rulesInForce(world).length}
          />
          <section className="sheet">
            <button type="button" onClick={goToCollision}>
              Quelques mois plus tard…
            </button>
          </section>
        </>
      )}

      {phase === 'collision' && (
        <>
          <div className="sheet">
            <p className="sheet__kicker">Septembre 2027</p>
            <h1>Tu es {current.identity.firstName}.</h1>
            <p>{current.identity.identityLine}</p>
          </div>

          {collision?.kind === 'selected' && (
            <CallbackPanel
              callback={collision.callback}
              characterName={current.identity.firstName}
            />
          )}
          {collision?.kind === 'quota_blocked' && <QuotaBlockedNote />}
          {collision?.kind === 'none_available' && (
            <section className="sheet">
              <p>
                Aucune des règles en vigueur ne concerne {current.identity.firstName}. Ce n’est pas
                la même chose qu’un effet nul&nbsp;: aucune ne s’applique à sa situation.
              </p>
            </section>
          )}

          {previousAnswer && (
            <section className="sheet" aria-labelledby="relaunch-title">
              <h2 id="relaunch-title">La même question</h2>
              <p>{relaunchSentence(previousAnswer, 'Il y a quelques minutes')}</p>
              <JudgementScale value={judgement} onChange={answer} legend="Ta réponse maintenant" />
              {movements(log).length > 0 && (
                <p className="provenance">
                  Ta position sur cette question a changé depuis la première fois. Le jeu le note,
                  sans en tirer de conclusion.
                </p>
              )}
            </section>
          )}
        </>
      )}

      {phase === 'collision' && (
        <section className="sheet">
          <button type="button" onClick={() => setPhase('summary')}>
            Terminer la partie
          </button>
        </section>
      )}

      {phase === 'summary' && (
        <SummaryScreen summary={summary} characterName={nameOf} kpi={kpi} onKpi={setKpi} />
      )}

      <section className="sheet" aria-labelledby="registry-title">
        <h2 id="registry-title">Le registre des lois</h2>
        {world.rules.length === 0 ? (
          <p>Aucune règle décidée pour l’instant.</p>
        ) : (
          <ol>
            {world.rules.map((r) => (
              <li key={r.id}>
                <strong>{r.shortLabel}</strong> — décidé en {r.diegeticMonth}
                {r.playerWording && <blockquote>« {r.playerWording} »</blockquote>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
