import { useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { absorptionRegime, comparabilityMetrics, REGIME, type Scale } from '@/core/impact.ts'
import { euros } from '@/core/money.ts'
import type { BudgetLine, LineGroup, Stocks } from '@/core/types.ts'
import { motionFor } from '@/motion/table.ts'
import { Amount } from './components/Amount.tsx'
import { MonthlyBudget } from './components/MonthlyBudget.tsx'

/*
 * Écran de démonstration de l'étape 1.
 *
 * Deux personnages, un même événement, et le sélecteur d'échelle : c'est le
 * noyau conceptuel du jeu réduit à un écran. Le contenu est ici codé en dur
 * uniquement le temps de valider le moteur — il passera en fichiers JSON
 * validés par schéma à l'étape 3, et ce fichier disparaîtra.
 */

const line = (code: string, group: LineGroup, amount: number): BudgetLine => ({
  code,
  group,
  amountCents: euros(amount),
  value: { amount, unit: 'EUR_month', nature: 'fiction' },
})

const CHARACTERS = [
  {
    id: 'claire',
    firstName: 'Claire',
    identityLine: 'aide-soignante en Ehpad, une fille de 6 ans, locataire à Amiens',
    budget: computeMonthlyBudget([
      line('salaire_net', 'resource', 1210),
      line('prestations', 'resource', 430),
      line('logement', 'constrained', -665),
      line('energie', 'constrained', -135),
      line('alimentation', 'constrained', -340),
      line('credit_conso', 'credit', -165),
      line('loisirs', 'adjustable', -40),
    ]),
    stocks: {
      liquid7dCents: euros(180),
      liquid60dCents: euros(180),
      authorisedOverdraftCents: euros(200),
      netWealthCents: euros(-1800),
      precautionFloorMonths: 0,
    } satisfies Stocks,
  },
  {
    id: 'marc-anne',
    firstName: 'Marc et Anne',
    identityLine: 'menuisier et cadre en mutuelle, deux adolescents, propriétaires près de Rennes',
    budget: computeMonthlyBudget([
      line('salaire_net', 'resource', 6240),
      line('logement', 'constrained', -1850),
      line('energie', 'constrained', -260),
      line('alimentation', 'constrained', -920),
      line('credit_immo', 'credit', -950),
      line('loisirs', 'adjustable', -400),
    ]),
    stocks: {
      liquid7dCents: euros(14_200),
      liquid60dCents: euros(14_200),
      authorisedOverdraftCents: euros(2000),
      netWealthCents: euros(310_000),
      precautionFloorMonths: 1,
    } satisfies Stocks,
  },
] as const

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

const SHOCK = euros(-1800)

function formatMetric(scale: Scale, metrics: Record<Scale, number>): string {
  const v = metrics[scale]
  if (scale === 'euros') return `${Math.round(v)} €`
  if (scale === 'days') return `${v.toFixed(1)} jours`
  return `${(v * 100).toFixed(0)} %`
}

export function App() {
  const [scale, setScale] = useState<Scale>('slack')
  const [who, setWho] = useState(0)
  const current = CHARACTERS[who]!

  return (
    <main>
      <div className="sheet">
        <p className="sheet__kicker">Mars 2027</p>
        <h1>Tu es {current.firstName}.</h1>
        <p>{current.identityLine}</p>
        <p>
          <button type="button" onClick={() => setWho((w) => (w + 1) % CHARACTERS.length)}>
            Voir l’autre personnage
          </button>
        </p>
      </div>

      <MonthlyBudget budget={current.budget} month="Mars 2027" />

      <section className="sheet" aria-labelledby="shock-title">
        <p className="sheet__kicker">Ce mois-ci</p>
        <h2 id="shock-title">La chaudière ne redémarre pas.</h2>
        <p>
          Devis&nbsp;: <Amount cents={SHOCK} nature="fiction" signed label="Coût de la réparation" />
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
          {CHARACTERS.map((c) => {
            const metrics = comparabilityMetrics(SHOCK, c.budget)
            const regime = absorptionRegime(SHOCK, c.budget, c.stocks)
            const motion = motionFor({
              amountCents: SHOCK,
              netIncomeCents: c.budget.netIncomeCents,
              slackCents: c.budget.slackCents,
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
                <strong>{c.firstName}</strong> — {formatMetric(scale, metrics)}. Cette somme{' '}
                {REGIME_SENTENCE[regime]}.
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
