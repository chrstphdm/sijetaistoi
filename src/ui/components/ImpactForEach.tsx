import { computeMonthlyBudget } from '@/core/budget.ts'
import { comparabilityMetrics, absorptionRegime, REGIME, type Scale } from '@/core/impact.ts'
import { activeEffectsFor, applyEffectsToLines, type WorldState } from '@/core/world.ts'
import { motionFor } from '@/motion/table.ts'
import { optionLookup, toBudgetLines, toStocks } from '@/content/load.ts'
import type { CharacterT } from '@/schemas/index.ts'
import { Amount } from './Amount.tsx'

/**
 * « Le choix vu par chacun ».
 *
 * Deux regles valent sur cet ecran, et seulement sur celui-ci :
 *
 *   ORDRE — permutation deterministe par rotation, declaree publiquement.
 *   L'ordre alphabetique donnerait toujours la premiere position au meme
 *   personnage ; l'ordre par revenu installe l'echelle sociale comme grille
 *   de lecture unique ; l'ordre par ampleur d'impact est l'argmax de douleur
 *   explicitement proscrit.
 *
 *   MOTION CONSTANTE — sur un ecran dont le message EST la comparaison,
 *   differencier la mise en scene ajoute un second canal redondant qui
 *   amplifie un personnage. Les blocs apparaissent donc ensemble, meme
 *   duree, quelle que soit la valeur.
 */

/** Rotation en carre latin : chaque personnage occupe chaque position. */
export function rotationOrder(count: number, screenIndex: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + screenIndex) % count)
}

const SCALES: readonly { id: Scale; label: string }[] = [
  { id: 'euros', label: 'en euros' },
  { id: 'income', label: 'en % du revenu' },
  { id: 'slack', label: 'en % du reste à vivre' },
  { id: 'days', label: 'en jours de dépenses' },
]

const REGIME_SENTENCE: Record<number, string> = {
  [REGIME.IMPERCEPTIBLE]: 'ne change rien à son mois',
  [REGIME.ABSORBED]: 'est absorbé sans toucher aux dépenses',
  [REGIME.ADJUSTABLE_TRADEOFF]: 'oblige à renoncer à des dépenses non contraintes',
  [REGIME.CONSTRAINED_TRADEOFF]: 'oblige à toucher à des dépenses contraintes',
  [REGIME.SHORTFALL]: 'ne peut pas être couvert ce mois-ci',
}

function formatMetric(scale: Scale, metrics: Record<Scale, number>): string {
  const v = metrics[scale]
  if (scale === 'euros') return `${Math.round(v)} €`
  if (scale === 'days') return `${v.toFixed(1)} jours`
  return `${(v * 100).toFixed(1)} %`
}

type Props = {
  readonly characters: readonly CharacterT[]
  readonly world: WorldState
  readonly scale: Scale
  readonly onScaleChange: (s: Scale) => void
  readonly screenIndex: number
}

export function ImpactForEach({ characters, world, scale, onScaleChange, screenIndex }: Props) {
  const order = rotationOrder(characters.length, screenIndex)

  // Motion IDENTIQUE pour les six : calculee une fois, hors de la boucle.
  const motion = motionFor({ amountCents: 0, netIncomeCents: 1, slackCents: 1, scale: 'slack' })

  return (
    <section className="sheet" aria-labelledby="impact-title">
      <h2 id="impact-title">Le choix vu par chacun</h2>

      <p role="note">
        Changer d’échelle change la mesure, pas les faits. Aucune de ces quatre mesures n’est
        neutre&nbsp;: rapporter au reste à vivre suppose que ce qui compte est le besoin, rapporter
        au revenu que ce qui compte est la proportion, compter en euros qu’un euro est un euro.
      </p>

      <fieldset>
        <legend>Échelle de comparaison</legend>
        {SCALES.map((s) => (
          <label key={s.id}>
            <input
              type="radio" name="scale" value={s.id}
              checked={scale === s.id} onChange={() => onScaleChange(s.id)}
            />{' '}
            {s.label}
          </label>
        ))}
      </fieldset>

      <ul className="impacts">
        {order.map((i) => {
          const c = characters[i]!
          const traits = { ...c.traits, incomeDecile: c.identity.incomeDecile }
          const before = computeMonthlyBudget(toBudgetLines(c))
          const effects = activeEffectsFor(world, traits, optionLookup)
          const after = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(c), effects))
          const delta = after.slackCents - before.slackCents

          return (
            <li
              key={c.id}
              className="enter-rise"
              style={{ '--enter-ms': `${motion.enterMs}ms`, '--translate-px': '6px' } as React.CSSProperties}
            >
              <strong>{c.identity.firstName}</strong>
              {' — '}
              {delta === 0 ? (
                <>aucun effet sur son budget courant.</>
              ) : (
                <>
                  <Amount cents={delta} nature="hypothesis" signed label={c.identity.firstName} />
                  {' par mois, soit '}
                  {formatMetric(scale, comparabilityMetrics(delta, before))}
                  {'. Cette somme '}
                  {REGIME_SENTENCE[absorptionRegime(delta, before, toStocks(c))]}.
                </>
              )}
              {effects.length === 0 && (
                <div className="provenance">
                  Aucune des règles en vigueur ne le concerne. Ce n’est pas la même chose qu’un
                  effet nul&nbsp;: aucune ne s’applique à sa situation.
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
