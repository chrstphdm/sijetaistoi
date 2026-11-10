import type { CSSProperties } from 'react'
import { bundle, characters, toBudgetLines } from '@/content/load.ts'
import { computeMonthlyBudget } from '@/core/budget.ts'
import {
  annualLivingStandard, decileOf, householdKind, percentileOf,
  HOUSEHOLD_LABEL, TENURE_LABEL,
} from '@/core/population.ts'
import type { CharacterT } from '@/schemas/index.ts'
import { Seal } from './Seal.tsx'

/**
 * Où se situe un personnage dans la population.
 *
 * Ce n'est pas un classement des personnages entre eux : c'est la position
 * de chacun par rapport à l'ensemble des Français, calculée sur son relevé
 * et sur des repères publiés par l'Insee. Le dessin double toujours une
 * phrase : la position n'est jamais portée par la seule forme.
 */

const pop = bundle.population
const deciles = pop.livingStandardDeciles.values
const sourceOf = (id: string) => bundle.sources.find((s) => s.id === id)

/** « 1 330 » avec espace fine insécable. */
const euros = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
/** « 9,5 » à la française. */
const pct = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

export type Place = {
  readonly id: string
  readonly name: string
  readonly monthly: number
  readonly percentile: number
  readonly decile: number
  readonly outOfScope: boolean
  readonly tenure: { readonly label: string; readonly share: number }
  readonly household: { readonly label: string; readonly share: number }
}

export function placeOf(c: CharacterT): Place {
  const budget = computeMonthlyBudget(toBudgetLines(c))
  const annual = annualLivingStandard(budget, c.traits)
  const percentile = percentileOf(annual, deciles)
  const kind = householdKind(c.traits)
  const tenureKey = c.traits.tenure as keyof typeof pop.tenure.shares
  return {
    id: c.id,
    name: c.identity.firstName,
    monthly: annual / 12,
    percentile,
    decile: decileOf(percentile),
    // La statistique de l'Insee exclut les ménages dont la personne de
    // référence est étudiante : on le dit plutôt que de le taire.
    outOfScope: c.traits.activities.includes('student') && c.traits.householdSize === 1,
    tenure: { label: TENURE_LABEL[c.traits.tenure] ?? c.traits.tenure, share: pop.tenure.shares[tenureKey] },
    household: { label: HOUSEHOLD_LABEL[kind], share: pop.households.shares[kind] },
  }
}

/** La phrase qui dit la position — c'est elle qui fait foi, le dessin la double. */
export function standingSentence(p: Place): string {
  if (p.percentile >= 90) return `Parmi les 10 % des personnes au niveau de vie le plus élevé.`
  const below = Math.max(1, Math.round(p.percentile))
  return `Son niveau de vie dépasse celui d’environ ${below} % des personnes en France.`
}

/** Jauge horizontale : la population de la plus modeste à la plus aisée, et la place du personnage. */
export function Standing({ character, compact = false }: { readonly character: CharacterT; readonly compact?: boolean }) {
  const p = placeOf(character)
  const allIds = characters.map((c) => c.id)
  return (
    <div className={`standing${compact ? ' standing--compact' : ''}`}>
      {!compact && <p className="standing__title">Où se situe {p.name} en France</p>}
      <p className="standing__value">
        <strong>{euros(p.monthly)}&nbsp;€</strong> de niveau de vie par mois
      </p>
      <div className="standing__bar" aria-hidden="true" style={{ '--at': `${p.percentile}%` } as CSSProperties}>
        {deciles.map((_, i) => <i key={i} style={{ left: `${(i + 1) * 10}%` }} />)}
        <span className="standing__marker"><Seal id={p.id} allIds={allIds} size={compact ? 16 : 22} /></span>
      </div>
      <p className="standing__ends" aria-hidden="true"><span>plus modestes</span><span>plus aisés</span></p>
      <p className="standing__sentence">{standingSentence(p)}</p>
      {!compact && (
        <ul className="standing__chips">
          <li><strong>{p.tenure.label}</strong> — comme {pct(p.tenure.share)}&nbsp;% des ménages</li>
          <li><strong>{p.household.label}</strong> — comme {pct(p.household.share)}&nbsp;% des ménages</li>
        </ul>
      )}
      {!compact && <SourcesNote outOfScope={p.outOfScope} />}
    </div>
  )
}

function SourcesNote({ outOfScope }: { readonly outOfScope: boolean }) {
  const ids = [pop.livingStandardDeciles.sourceId, pop.tenure.sourceId, pop.households.sourceId]
  return (
    <p className="standing__source">
      Calculé sur son relevé, comparé aux repères de l’Insee&nbsp;:{' '}
      {ids.map((id, k) => {
        const s = sourceOf(id)
        return s ? (
          <span key={id}>
            {k > 0 && ' · '}
            <a href={s.url} rel="noopener noreferrer">{s.name.toLowerCase()} ({s.vintage})</a>
          </span>
        ) : null
      })}.
      {outOfScope && ' Un ménage étudiant est hors du champ de cette statistique : sa position est indicative.'}
    </p>
  )
}

/**
 * La courbe des niveaux de vie en France, et tous les personnages du corpus dessus.
 *
 * Abscisse : la part de la population au niveau de vie inférieur. Ordonnée :
 * le niveau de vie mensuel. Au-delà du neuvième décile, l'Insee ne publie pas
 * de seuil comparable : la courbe s'arrête, et le dessin le montre.
 */
export function IncomeLadder() {
  const allIds = characters.map((c) => c.id)
  const places = characters.map(placeOf).sort((a, b) => a.percentile - b.percentile)
  const W = 560, H = 300, L = 48, R = 16, T = 18, B = 34
  const maxY = Math.ceil((deciles[8]! / 12) * 1.25 / 500) * 500
  const x = (p: number) => L + (p / 100) * (W - L - R)
  const y = (monthly: number) => H - B - (Math.min(monthly, maxY) / maxY) * (H - T - B)
  const pts = deciles.map((d, i) => `${x((i + 1) * 10)},${y(d / 12)}`)
  const curve = `M ${x(0)},${y(0)} L ${pts.join(' L ')}`
  const area = `${curve} L ${x(90)},${y(0)} Z`
  const ticks = [0, 1000, 2000, 3000, 4000].filter((v) => v <= maxY)

  // Les personnages proches se gênent : on les empile au-dessus de la courbe.
  let lastX = -99
  let lift = 0
  const marks = places.map((p) => {
    const px = x(p.percentile)
    lift = px - lastX < 24 ? lift + 1 : 0
    lastX = px
    return { p, px, py: y(Math.min(p.monthly, maxY)), lift }
  })

  return (
    <figure className="ladder">
      <svg viewBox={`0 0 ${W} ${H}`} className="ladder__svg" aria-hidden="true">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="ladder__grid" />
            <text x={L - 6} y={y(v) + 4} className="ladder__tick ladder__tick--y">{v === 0 ? '0' : `${v / 1000} k€`}</text>
          </g>
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
          <text key={p} x={x(p)} y={H - B + 16} className="ladder__tick">{`D${p / 10}`}</text>
        ))}
        <path d={area} className="ladder__area" />
        <path d={curve} className="ladder__curve" pathLength={100} />
        <line x1={x(90)} x2={x(100)} y1={y(deciles[8]! / 12)} y2={y(maxY * 0.98)} className="ladder__beyond" />
        {marks.map(({ p, px, py, lift: k }, i) => {
          const top = py - 14 - k * 24
          return (
            <g key={p.id} className="ladder__mark" style={{ '--i': i } as CSSProperties}>
              <line x1={px} x2={px} y1={py} y2={top + 9} className="ladder__stem" />
              <circle cx={px} cy={py} r={3} className="ladder__dot" />
              <svg x={px - 9} y={top - 9} width={18} height={18} overflow="visible">
                <Seal id={p.id} allIds={allIds} size={18} />
              </svg>
            </g>
          )
        })}
      </svg>
      {/* La même information, lisible : c'est elle qui fait foi. */}
      <figcaption>
        <ol className="ladder__list">
          {places.map((p) => (
            <li key={p.id}>
              <Seal id={p.id} allIds={allIds} size={14} />
              <span className="ladder__name">{p.name}</span>
              <span className="ladder__where">
                {p.percentile >= 90 ? '10 % les plus aisés' : `dépasse ${Math.max(1, Math.round(p.percentile))} %`}
              </span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  )
}

/** Combien des dix déciles le corpus couvre réellement, d'après les budgets. */
export const coveredDeciles = () => new Set(characters.map((c) => placeOf(c).decile)).size
