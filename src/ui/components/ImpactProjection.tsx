import { computeMonthlyBudget } from '@/core/budget.ts'
import { formatEuros } from '@/core/money.ts'
import { project, sharedScale, firstUncertainYear, DEFAULT_YEARS, type HorizonKey, type ProjectedEffect, type ProjectionPoint } from '@/core/projection.ts'
import { activeEffectsFor, type WorldState } from '@/core/world.ts'
import { characters, optionLookup, toBudgetLines } from '@/content/load.ts'
import type { CharacterT } from '@/schemas/index.ts'
import { Seal } from './Seal.tsx'

/**
 * Projection sur dix ans, en PETITS MULTIPLES.
 *
 * Pourquoi six petits graphiques et non six courbes superposees : les six
 * teintes de personnage sont indistinguables en vision deuteranope — mesure
 * a 0,9 de delta E pour un seuil de 8 — parce qu'elles ont volontairement la
 * meme luminance, ce qui garantit qu'aucun personnage ne parait plus present
 * qu'un autre. Superposer six courbes forcerait la couleur a porter
 * l'identite, ce qu'elle ne peut pas faire ici.
 *
 * Les petits multiples resolvent les deux problemes a la fois : chaque
 * courbe porte un nom ecrit, et une seule couleur suffit.
 *
 * ECHELLE COMMUNE a tous les cadres. Des axes propres a chacun feraient
 * paraitre identiques des impacts tres inegaux, soit l'exact contraire du
 * propos.
 */

const W = 150
const H = 56
const PAD = 4

function pathFor(points: readonly ProjectionPoint[], scale: number): string {
  const x = (year: number) => PAD + ((year - 1) / (DEFAULT_YEARS - 1)) * (W - 2 * PAD)
  const y = (cents: number) => H / 2 - (scale === 0 ? 0 : (cents / scale) * (H / 2 - PAD))
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.year).toFixed(1)} ${y(p.cumulativeCents).toFixed(1)}`).join(' ')
}

function effectsFor(character: CharacterT, world: WorldState): ProjectedEffect[] {
  const traits = { ...character.traits, incomeDecile: character.identity.incomeDecile }
  return activeEffectsFor(world, traits, optionLookup).map((r) => ({
    monthlyCents: r.deltaCents,
    horizon: (r.effect.horizon ?? 'y1') as HorizonKey,
    uncertain: r.effect.uncertainty !== 'established',
  }))
}

export function ImpactProjection({ world }: { readonly world: WorldState }) {
  const allIds = characters.map((c) => c.id)

  const series = characters.map((c) => {
    const points = project(effectsFor(c, world))
    const last = points[points.length - 1]!
    return {
      id: c.id,
      name: c.identity.firstName,
      points,
      total: last.cumulativeCents,
      slack: computeMonthlyBudget(toBudgetLines(c)).slackCents,
      uncertainFrom: firstUncertainYear(points),
    }
  })

  const scale = sharedScale(series.map((s) => s.points))
  if (scale === 0) return null

  return (
    <section className="sheet" aria-labelledby="proj-title">
      <h2 id="proj-title">Si rien d’autre ne changeait, sur dix ans</h2>

      <p>
        Le cumul des règles que tu as décidées, année après année. L’échelle est la même
        pour les six&nbsp;: les courbes sont donc comparables entre elles.
      </p>

      <ul className="proj">
        {series.map((s) => (
          <li key={s.id}>
            <p className="proj__head">
              <Seal id={s.id} allIds={allIds} size={20} />
              <strong>{s.name}</strong>
              <span className="proj__total">
                {s.total >= 0 ? '+' : '−'}
                {formatEuros(s.total)} en dix ans
              </span>
            </p>

            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="proj__chart"
              role="img"
              aria-label={`${s.name} : cumul de ${s.total >= 0 ? 'plus' : 'moins'} ${formatEuros(s.total)} au bout de dix ans, contre un reste à vivre mensuel de ${formatEuros(s.slack)}.`}
            >
              {/* Ligne de zéro : sans elle, le signe ne se lit pas. */}
              <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} className="proj__zero" />
              <path d={pathFor(s.points, scale)} className="proj__line" />
            </svg>

            <p className="provenance">
              Soit {formatEuros(Math.abs(s.total) / 120)} par mois en moyenne, pour un reste à
              vivre de {formatEuros(s.slack)}.
              {s.uncertainFrom !== null && (
                <>
                  {' '}À partir de la {s.uncertainFrom}
                  <sup>{s.uncertainFrom === 1 ? 're' : 'e'}</sup> année, le cumul dépend d’un
                  effet débattu.
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      {/* La limite est enoncee a cote du graphique, pas en note de bas de page. */}
      <p className="proj__caveat">
        <strong>Ce que ce calcul suppose.</strong> Que rien d’autre ne bouge pendant dix ans&nbsp;:
        ni les prix, ni les revalorisations, ni la situation de chacun. Or en dix ans un crédit se
        solde, des enfants partent, une carrière change. Cette projection dit «&nbsp;si tout restait
        identique&nbsp;», et rien de plus. Étendre l’horizon grossit aussi bien les gains que les
        coûts&nbsp;: c’est une lecture parmi d’autres, pas la vraie.
      </p>
    </section>
  )
}
