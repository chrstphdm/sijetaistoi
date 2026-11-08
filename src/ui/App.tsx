import { useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import type { Scale } from '@/core/impact.ts'
import { applyRule, emptyWorld, rulesInForce, type Rule, type WorldState } from '@/core/world.ts'
import { characters, reforms, toBudgetLines } from '@/content/load.ts'
import type { ReformOptionT } from '@/schemas/index.ts'
import { MonthlyBudget } from './components/MonthlyBudget.tsx'
import { ReformVote } from './components/ReformVote.tsx'
import { ImpactForEach, rotationOrder } from './components/ImpactForEach.tsx'

/*
 * Démonstration du cœur de la boucle : vivre, décider, voir les conséquences
 * sur tout le monde. Les actes, le changement de personnage et le rappel
 * arrivent aux étapes suivantes.
 */

const REFORM = reforms[0]!

export function App() {
  const [world, setWorld] = useState<WorldState>(() => emptyWorld('sensibilite-faible'))
  const [scale, setScale] = useState<Scale>('slack')
  const [wording, setWording] = useState('')
  const [who, setWho] = useState(0)

  const current = characters[who]!
  const budget = computeMonthlyBudget(toBudgetLines(current))
  const voted = rulesInForce(world).length > 0

  const vote = (option: ReformOptionT) => {
    const rule: Rule = {
      id: `rule-${world.rules.length + 1}`,
      reformId: REFORM.id,
      optionId: option.id,
      shortLabel: option.label,
      playerWording: wording.trim() || null,
      playerJudgement: null,
      diegeticMonth: '2027-04',
      replaces: null,
      status: 'in_force',
    }
    setWorld((w) => applyRule(w, rule))
  }

  return (
    <main>
      <div className="sheet">
        <p className="sheet__kicker">Mars 2027</p>
        <h1>Tu es {current.identity.firstName}.</h1>
        <p>{current.identity.identityLine}</p>
        <p>{current.narrative.story}</p>
        <p>
          <strong>Ce que tu veux ces prochains mois</strong>&nbsp;: {current.shortTermGoal.label}.
        </p>
        <button type="button" onClick={() => setWho((w) => (w + 1) % characters.length)}>
          Voir l’autre personnage
        </button>
      </div>

      <MonthlyBudget budget={budget} month="Mars 2027" />

      {!voted ? (
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
            <p className="provenance">
              Ce texte reste sur cet appareil. Il n’est envoyé nulle part.
            </p>
          </section>

          <ReformVote
            reform={REFORM}
            order={rotationOrder(REFORM.options.length, 0)}
            onVote={vote}
          />
        </>
      ) : (
        <>
          <ImpactForEach
            characters={characters}
            world={world}
            scale={scale}
            onScaleChange={setScale}
            screenIndex={rulesInForce(world).length}
          />

          <section className="sheet" aria-labelledby="registry-title">
            <h2 id="registry-title">Le registre des lois</h2>
            <ol>
              {world.rules.map((r) => (
                <li key={r.id}>
                  <strong>{r.shortLabel}</strong> — décidé en {r.diegeticMonth}
                  {r.playerWording && (
                    <blockquote>« {r.playerWording} »</blockquote>
                  )}
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setWorld(emptyWorld('sensibilite-faible'))}>
              Revenir au vote
            </button>
          </section>
        </>
      )}
    </main>
  )
}
