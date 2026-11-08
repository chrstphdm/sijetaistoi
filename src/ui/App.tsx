import { useMemo, useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import type { Scale } from '@/core/impact.ts'
import {
  selectCallback, type CallbackCandidate, type CallbackSign,
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

const REFORM = reforms[0]!
const SEED = 'demo-2027'

type Phase = 'living' | 'judging' | 'impact' | 'collision'

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
    setPhase('judging')
  }

  const answer = (j: Judgement) => {
    setJudgement(j)
    setLog((l) => [
      ...l,
      {
        questionId: REFORM.id,
        judgement: j,
        freeText: wording.trim() || null,
        turn: l.length + 1,
        context: `vote sur ${REFORM.descriptiveTitle}`,
      },
    ])
  }

  /* --- Collision : incarner l'autre personnage et subir sa propre règle --- */
  const other = characters[(who + 1) % characters.length]!
  const collision = useMemo(() => {
    const traits = traitsOf(other)
    const effects = activeEffectsFor(world, traits, optionLookup)
    if (effects.length === 0) return { kind: 'none_available' as const }

    const before = computeMonthlyBudget(toBudgetLines(other))
    const after = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(other), effects))
    const delta = after.slackCents - before.slackCents

    const candidate: CallbackCandidate = {
      rule: rulesInForce(world)[0]!,
      characterId: other.id,
      deltaCents: delta,
      here: `Son reste à vivre passe de ${formatEuros(before.slackCents)} à ${formatEuros(after.slackCents)} par mois.`,
      elsewhere:
        'Le programme de rénovation est financé à hauteur de 3 Md€. Les logements les plus mal isolés sont traités en premier.',
    }
    return selectCallback([candidate], signs, random.presentation)
  }, [world, other, signs, random])

  const goToCollision = () => {
    if (collision.kind === 'selected') setSigns((s) => [...s, collision.callback.sign])
    setWho((w) => (w + 1) % characters.length)
    setPhase('collision')
  }

  const previousAnswer = log.find((e) => e.questionId === REFORM.id)

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

          {collision.kind === 'selected' && (
            <CallbackPanel
              callback={collision.callback}
              characterName={current.identity.firstName}
            />
          )}
          {collision.kind === 'quota_blocked' && <QuotaBlockedNote />}
          {collision.kind === 'none_available' && (
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
