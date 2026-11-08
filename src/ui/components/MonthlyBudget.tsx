import type { MonthlyBudget as Budget, BudgetLine } from '@/core/types.ts'
import { labelFor } from '@/content/load.ts'
import { Amount } from './Amount.tsx'

/**
 * Le releve mensuel.
 *
 * Ce n'est pas un tableau de bord : c'est un document date que le personnage
 * aurait reellement sous les yeux. Aucune jauge de reussite, aucun score,
 * aucun vocabulaire du defi — le precedent SPENT a echoue mesurablement pour
 * avoir laisse croire que la situation se resout en faisant de meilleurs
 * choix.
 *
 * Deux regles de mise en forme en decoulent :
 *
 *   1. Le reste a vivre a EXACTEMENT le meme poids typographique que le
 *      total deja engage. Le grossir ferait lire le solde comme un score
 *      d'habilete, alors que l'essentiel du resultat n'a pas ete choisi.
 *
 *   2. La barre de proportion emploie le meme traitement visuel pour les
 *      trois segments. Elle montre une repartition, elle ne hierarchise pas.
 */

type Group = { readonly title: string; readonly lines: readonly BudgetLine[]; readonly total: number }

const pct = (part: number, whole: number) => (whole <= 0 ? 0 : Math.round((part / whole) * 100))

export function MonthlyBudget({ budget, month }: { budget: Budget; month: string }) {
  const pick = (...groups: BudgetLine['group'][]) =>
    budget.lines.filter((l) => groups.includes(l.group)).sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents))

  const sections: Group[] = [
    { title: 'Ce qui entre', lines: pick('resource'), total: budget.resourcesCents },
    {
      title: 'Ce qui est déjà engagé',
      lines: pick('constrained', 'credit', 'levy'),
      total: budget.constrainedCents + budget.leviesCents,
    },
    { title: 'Ce qui est prévu, mais ajustable', lines: pick('adjustable'), total: budget.adjustableCents },
  ]

  const resources = budget.resourcesCents
  const engaged = Math.abs(budget.constrainedCents + budget.leviesCents)
  const adjustable = Math.abs(budget.adjustableCents)
  const left = Math.max(0, budget.savingsCapacityCents)

  return (
    <section className="sheet ledger-sheet" aria-labelledby="ledger-title">
      <p className="sheet__kicker">{month}</p>
      <h2 id="ledger-title">Relevé du mois</h2>

      {/* Répartition : même traitement visuel pour les trois segments. */}
      <div className="bar" role="img"
        aria-label={`Sur ${Math.round(resources / 100)} € qui entrent : ${pct(engaged, resources)} % déjà engagés, ${pct(adjustable, resources)} % prévus mais ajustables, ${pct(left, resources)} % disponibles.`}>
        <span className="bar__seg bar__seg--a" style={{ width: `${pct(engaged, resources)}%` }} />
        <span className="bar__seg bar__seg--b" style={{ width: `${pct(adjustable, resources)}%` }} />
        <span className="bar__seg bar__seg--c" style={{ width: `${pct(left, resources)}%` }} />
      </div>
      <p className="bar__legend">
        <span><i className="bar__key bar__key--a" />déjà engagé {pct(engaged, resources)} %</span>
        <span><i className="bar__key bar__key--b" />ajustable {pct(adjustable, resources)} %</span>
        <span><i className="bar__key bar__key--c" />disponible {pct(left, resources)} %</span>
      </p>

      {sections.map((s) =>
        s.lines.length === 0 ? null : (
          <div className="ledger-group" key={s.title}>
            <h3 className="ledger-group__title">{s.title}</h3>
            <dl className="ledger-list">
              {s.lines.map((l) => (
                <div className="ledger-row" key={l.code}>
                  <dt>{labelFor(l.code)}</dt>
                  <dd>
                    <Amount cents={l.amountCents} nature={l.value.nature} signed compact label={labelFor(l.code)} />
                  </dd>
                </div>
              ))}
              <div className="ledger-row ledger-row--total">
                <dt>Total</dt>
                <dd><Amount cents={s.total} nature="fiction" signed compact label={`Total ${s.title}`} /></dd>
              </div>
            </dl>
          </div>
        ),
      )}

      {/* Même poids typographique que le total engagé, délibérément. */}
      <dl className="ledger-list">
        <div className="ledger-row ledger-row--slack">
          <dt>Il reste, une fois l’engagé payé</dt>
          <dd><Amount cents={budget.slackCents} nature="fiction" label="Reste à vivre" /></dd>
        </div>
      </dl>
      <p className="provenance">
        Sur ce montant, {Math.round(adjustable / 100)} € sont déjà prévus pour des dépenses que
        {' '}{budget.adjustableCents === 0 ? 'personne' : 'le personnage'} peut décaler.
      </p>
    </section>
  )
}
