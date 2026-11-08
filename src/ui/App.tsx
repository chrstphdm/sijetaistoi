import { useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { absorptionRegime, comparabilityMetrics, REGIME, type Scale } from '@/core/impact.ts'
import { characters, events, toBudgetLines, toStocks } from '@/content/load.ts'
import { euros } from '@/core/money.ts'
import { motionFor } from '@/motion/table.ts'
import { Amount } from './components/Amount.tsx'
import { MonthlyBudget } from './components/MonthlyBudget.tsx'

/*
 * Écran de démonstration.
 *
 * Plus aucun personnage ni montant n'est écrit ici : tout vient de content/,
 * validé au build. Ce fichier ne contient que de l'affichage, et il sera
 * remplacé par les écrans réels aux étapes suivantes.
 */

const REGIME_SENTENCE: Record<number, string> = {
  [REGIME.IMPERCEPTIBLE]: 'ne change rien à son mois',
  [REGIME.ABSORBED]: 'est couvert par ce qui est disponible, sans toucher aux dépenses',
  [REGIME.ADJUSTABLE_TRADEOFF]: 'oblige à renoncer à des dépenses non contraintes',
  [REGIME.CONSTRAINED_TRADEOFF]: 'oblige à toucher à des dépenses contraintes, ou à s’endetter',
  [REGIME.SHORTFALL]: 'ne peut pas être couvert ce mois-ci',
}

const SCALES: readonly { id: Scale; label: string }[] = [
  { id: 'euros', label: 'en euros' },
  { id: 'income', label: 'en % du revenu' },
  { id: 'slack', label: 'en % du reste à vivre' },
  { id: 'days', label: 'en jours de dépenses' },
]

const PREPARED = characters.map((c) => ({
  character: c,
  budget: computeMonthlyBudget(toBudgetLines(c)),
  stocks: toStocks(c),
}))

const EVENT = events.find((e) => e.id === 'chaudiere')!
const SHOCK = -euros(EVENT.cost.amount)

function formatMetric(scale: Scale, metrics: Record<Scale, number>): string {
  const v = metrics[scale]
  if (scale === 'euros') return `${Math.round(v)} €`
  if (scale === 'days') return `${v.toFixed(1)} jours`
  return `${(v * 100).toFixed(0)} %`
}

export function App() {
  const [scale, setScale] = useState<Scale>('slack')
  const [who, setWho] = useState(0)
  const current = PREPARED[who]!
  const { character } = current

  return (
    <main>
      <div className="sheet">
        <p className="sheet__kicker">Mars 2027</p>
        <h1>Tu es {character.identity.firstName}.</h1>
        <p>{character.identity.identityLine}</p>
        <p>{character.narrative.story}</p>
        <p>
          <strong>Ce que tu veux ces prochains mois</strong> : {character.shortTermGoal.label}.
        </p>
        <p>
          <button type="button" onClick={() => setWho((w) => (w + 1) % PREPARED.length)}>
            Voir l’autre personnage
          </button>
        </p>
      </div>

      <MonthlyBudget budget={current.budget} month="Mars 2027" />

      <section className="sheet" aria-labelledby="shock-title">
        <p className="sheet__kicker">Ce mois-ci</p>
        <h2 id="shock-title">{EVENT.descriptiveTitle}</h2>
        <p>{EVENT.text}</p>
        <p>
          Devis&nbsp;: <Amount cents={SHOCK} nature={EVENT.cost.nature} signed label="Coût de la réparation" />
          {EVENT.cost.range && (
            <span className="amount__word">
              {' '}— fourchette {EVENT.cost.range[0]} à {EVENT.cost.range[1]} €
            </span>
          )}
        </p>

        <h3>Le même montant, vu par chacun</h3>
        <p role="note">
          Changer d’échelle change la mesure, pas les faits. Aucune de ces quatre mesures n’est
          neutre&nbsp;: chacune suppose une idée différente de ce qui compte.
        </p>

        <fieldset>
          <legend>Échelle de comparaison</legend>
          {SCALES.map((s) => (
            <label key={s.id} style={{ marginInlineEnd: '1rem' }}>
              <input
                type="radio"
                name="scale"
                value={s.id}
                checked={scale === s.id}
                onChange={() => setScale(s.id)}
              />{' '}
              {s.label}
            </label>
          ))}
        </fieldset>

        <ul>
          {PREPARED.map(({ character: c, budget, stocks }) => {
            const metrics = comparabilityMetrics(SHOCK, budget)
            const regime = absorptionRegime(SHOCK, budget, stocks)
            const motion = motionFor({
              amountCents: SHOCK,
              netIncomeCents: budget.netIncomeCents,
              slackCents: budget.slackCents,
              scale: scale === 'days' ? 'slack' : scale,
            })
            return (
              <li
                key={c.id}
                className="enter-rise"
                style={
                  {
                    '--enter-ms': `${motion.enterMs}ms`,
                    '--translate-px': `${motion.translatePx}px`,
                  } as React.CSSProperties
                }
              >
                <strong>{c.identity.firstName}</strong> — {formatMetric(scale, metrics)}. Cette
                somme {REGIME_SENTENCE[regime]}.
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
