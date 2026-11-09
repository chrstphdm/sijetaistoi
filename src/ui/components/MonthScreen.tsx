import { useState } from 'react'
import type { MonthlyBudget as Budget } from '@/core/types.ts'
import type { LifeEventT } from '@/schemas/index.ts'
import { absorptionRegime } from '@/core/impact.ts'
import { regimeSentence } from '@/core/phrasing.ts'
import type { Stocks } from '@/core/types.ts'
import { euros } from '@/core/money.ts'
import { optionAvailability } from '@/core/availability.ts'
import { motionFor } from '@/motion/table.ts'
import { Amount } from './Amount.tsx'
import { MonthlyBudget } from './MonthlyBudget.tsx'
import { ScopeBand, ScopeMark } from './ScopeBand.tsx'

/**
 * Un mois vecu.
 *
 * Revelation en trois temps : le fait seul, un temps pour consulter son
 * propre releve, puis les options. Le joueur doit avoir regarde son budget
 * AVANT de choisir — c'est la seule facon de ressentir une contrainte
 * plutot que de la lire.
 *
 * Aucun score, aucune barre de reussite, aucun « tu as bouclé ton mois ».
 * Le precedent SPENT a echoue mesurablement pour avoir laisse croire que la
 * situation se resout en faisant de meilleurs choix.
 */

export function MonthScreen({
  budget, stocks, month, event, firstName, unavailable, onResolve,
}: {
  readonly budget: Budget
  readonly stocks: Stocks
  readonly month: string
  readonly event: LifeEventT | null
  readonly firstName: string
  readonly unavailable: readonly { option: string; reason: string }[]
  readonly onResolve: (optionId: string | null) => void
}) {
  const [revealed, setRevealed] = useState(false)

  const cost = event ? euros(event.cost.amount) : 0
  const signedCost = event?.valence === 'positive' ? cost : -cost
  const motion = event
    ? motionFor({
        amountCents: signedCost,
        netIncomeCents: budget.netIncomeCents,
        slackCents: budget.slackCents,
        scale: 'slack',
      })
    : null

  return (
    <>
      <MonthlyBudget budget={budget} month={month} />

      {event ? (
        <section
          className="sheet enter-rise"
          aria-labelledby="event-title"
          style={
            motion
              ? ({ '--enter-ms': `${motion.enterMs}ms`, '--translate-px': `${motion.translatePx}px` } as React.CSSProperties)
              : undefined
          }
        >
          <p className="sheet__kicker">Ce mois-ci</p>
          <h2 id="event-title">{event.descriptiveTitle}</h2>
          <ScopeBand scope="personal" who={firstName} />
          <p>{event.text}</p>

          <p>
            <Amount cents={signedCost} nature={event.cost.nature} signed label="Montant en jeu" />
            {event.cost.range && (
              <span className="provenance">
                {' '}— fourchette {event.cost.range[0]} à {event.cost.range[1]} €
              </span>
            )}
          </p>

          {!revealed ? (
            <>
              <p className="provenance">
                Prends le temps de regarder le relevé de {firstName} avant de décider.
              </p>
              <button type="button" className="btn-primary" onClick={() => setRevealed(true)}>
                Voir les possibilités
              </button>
            </>
          ) : (
            <>
              <p>
                Cette somme {regimeSentence(absorptionRegime(signedCost, budget, stocks), signedCost)}.
              </p>
              {/* La disponibilite de chaque option est calculee, pas decorative.
                  Une option impossible reste affichee, barree, avec son motif
                  chiffre : c'est la contrainte qu'il s'agit de faire ressentir,
                  pas une option a escamoter. Voir src/core/availability.ts. */}
              <ol className="options">
                {event.options.map((o) => {
                  const a = optionAvailability(o.effects, budget, stocks, firstName)
                  return (
                    <li key={o.id}>
                      <article
                        className={`option option--personal${
                          a.kind === 'impossible' ? ' option--impossible' : ''
                        }`}
                      >
                        <ScopeMark scope="personal" who={firstName} />
                        <h3>{o.label}</h3>
                        {a.kind === 'impossible' ? (
                          <>
                            <p className="option__barred">Hors de portée</p>
                            <p className="provenance">{a.reason}</p>
                          </>
                        ) : (
                          <>
                            {a.kind === 'strained' && (
                              <p className="provenance">{a.reason}</p>
                            )}
                            <button type="button" onClick={() => onResolve(o.id)}>
                              Choisir
                            </button>
                          </>
                        )}
                      </article>
                    </li>
                  )
                })}
              </ol>

              {unavailable.length > 0 && (
                <>
                  <p className="option__side">Ce qui n’est pas possible pour {firstName}</p>
                  <ul className="provenance">
                    {unavailable.map((u) => (
                      <li key={u.option}>{u.reason}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="sheet">
          <p className="sheet__kicker">Ce mois-ci</p>
          <p>Rien de particulier. Le mois passe.</p>
          <button type="button" className="btn-primary" onClick={() => onResolve(null)}>
            Mois suivant
          </button>
        </section>
      )}
    </>
  )
}
