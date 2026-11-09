import type { CSSProperties } from 'react'
import type { MonthEntry } from '../monthLog.ts'
import { Amount } from './Amount.tsx'

/**
 * L'evolution du releve, mois par mois, dans l'acte en cours.
 *
 * UNE COLONNE PAR MOIS, decoupee exactement comme la barre du releve : deja
 * engage, ajustable, disponible. Ce n'est pas une courbe du reste a vivre,
 * et c'est delibere. Une courbe du solde seul se lit comme un score qui
 * monte quand on a « bien joue » ; le releve s'interdit deja de grossir ce
 * solde pour cette raison (voir MonthlyBudget). La repartition entiere, elle,
 * montre ce qui a change sans designer de gagnant.
 *
 * La somme exceptionnelle du mois est ECRITE sous la colonne, signe, glyphe
 * et mot compris, comme partout ailleurs : elle n'est pas fondue dans la
 * barre, ou elle se confondrait avec ce qui revient chaque mois.
 *
 * Accessibilite : chaque colonne est decrite en toutes lettres. Le dessin
 * n'est qu'un repere visuel ; la liste dit la meme chose.
 */

const pct = (part: number, whole: number) => (whole <= 0 ? 0 : Math.round((part / whole) * 100))

/** « mars 2027 » → « mars » : l'annee est rappelee dans le titre du releve. */
const short = (month: string) => month.split(' ')[0] ?? month

function Column({ entry, state }: { readonly entry: MonthEntry; readonly state: 'past' | 'here' }) {
  const engaged = Math.min(100, pct(entry.engagedCents, entry.resourcesCents))
  const adjustable = Math.min(100 - engaged, pct(entry.adjustableCents, entry.resourcesCents))
  const left = Math.max(0, 100 - engaged - adjustable)
  const deficit = entry.slackCents < 0

  const description =
    `${entry.month}${state === 'here' ? ', mois en cours' : ''} : ` +
    `${pct(entry.engagedCents, entry.resourcesCents)} % déjà engagé, ` +
    `${pct(entry.adjustableCents, entry.resourcesCents)} % ajustable, ` +
    `${deficit ? 'rien de disponible' : `${pct(Math.max(0, entry.slackCents - entry.adjustableCents), entry.resourcesCents)} % disponible`}.`

  return (
    <li className={`trend__month trend__month--${state}`}>
      <span className="sr-only">{description}</span>
      <span className="trend__col" aria-hidden="true">
        {/* Empilée depuis le bas : l'engagé d'abord, comme on le paie. */}
        <span className="bar__seg bar__seg--c" style={{ '--h': `${left}%` } as CSSProperties} />
        <span className="bar__seg bar__seg--b" style={{ '--h': `${adjustable}%` } as CSSProperties} />
        <span className="bar__seg bar__seg--a" style={{ '--h': `${engaged}%` } as CSSProperties} />
      </span>
      <span className="trend__label" aria-hidden="true">{short(entry.month)}</span>
      <span className="trend__extra">
        {entry.exceptionalCents !== null && entry.exceptionalCents !== 0 ? (
          <Amount
            cents={entry.exceptionalCents} nature="fiction" signed
            label={`Somme exceptionnelle en ${entry.month}`}
          />
        ) : state === 'here' ? (
          <span className="trend__none">en cours</span>
        ) : (
          <span className="trend__none">rien d’exceptionnel</span>
        )}
      </span>
    </li>
  )
}

export function MonthTrend({
  past, current, total,
}: {
  readonly past: readonly MonthEntry[]
  /** `null` une fois tous les mois vécus : il n'y a plus de mois en cours. */
  readonly current: MonthEntry | null
  readonly total: number
}) {
  const upcoming = Math.max(0, total - past.length - (current ? 1 : 0))
  return (
    <figure className="trend">
      <figcaption className="trend__title">Mois après mois, dans cet acte</figcaption>
      <ol className="trend__months">
        {past.map((e) => <Column key={e.month} entry={e} state="past" />)}
        {current && <Column entry={current} state="here" />}
        {Array.from({ length: upcoming }, (_, i) => (
          <li key={`a-venir-${i}`} className="trend__month trend__month--next">
            <span className="trend__col" aria-hidden="true" />
            <span className="trend__label">à venir</span>
            <span className="trend__extra" />
          </li>
        ))}
      </ol>
    </figure>
  )
}
