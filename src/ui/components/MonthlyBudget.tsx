import type { ReactNode } from 'react'
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

/**
 * Deux presentations du MEME releve.
 *
 * `sheet` : le document entier, ligne a ligne.
 * `panel` : la version de la colonne laterale, qui reste visible pendant que
 * la colonne principale se consacre a l'evenement du mois. La repartition et
 * les totaux sont visibles ; les lignes sont repliees, parce qu'un releve de
 * quinze lignes ne tient pas dans une colonne collee a l'ecran. Rien n'y est
 * retire : le detail se deplie sur place.
 */
export function MonthlyBudget({
  budget, month, variant = 'sheet', owner, children,
}: {
  budget: Budget
  month: string
  variant?: 'sheet' | 'panel'
  owner?: string
  children?: ReactNode
}) {
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

  /*
   * LE CAS DU DEFICIT, qui etait mal rendu deux fois.
   *
   * Chez Claire, 1 730 EUR entrent et 1 855 EUR sont deja engages : le reste a
   * vivre vaut −125 EUR.
   *
   *  1. Le solde s'affichait « 125 € », sans signe : `formatEuros` rend la
   *     valeur absolue et le signe n'etait ajoute que pour un flux. L'ecran
   *     affirmait donc qu'il RESTE 125 EUR a quelqu'un a qui il en MANQUE 125.
   *     C'est exactement l'affirmation fausse que la charte interdit, et elle
   *     jouait dans le sens de l'adoucissement des situations les plus dures.
   *
   *  2. La barre additionnait 107 %, 4 % et 0 % et debordait de son cadre.
   *
   * Les deux ont ete releves sur une CAPTURE D'ECRAN. Aucun test de DOM ne
   * pouvait les voir : l'element existait, son texte etait « 125 € », et la
   * somme des largeurs n'est pas une assertion que l'on pense a ecrire.
   */
  const deficit = budget.slackCents < 0

  // Largeurs bornees : la part engagee ne peut pas depasser le cadre, et les
  // deux autres se partagent ce qui subsiste. Les POURCENTAGES annonces,
  // eux, restent calcules sur ce qui entre : « 107 % de ce qui entre est deja
  // engage » est vrai, et c'est l'information la plus parlante de l'ecran.
  const engagedWidth = Math.min(100, pct(engaged, resources))
  const adjustableWidth = Math.min(100 - engagedWidth, pct(adjustable, resources))
  const leftWidth = Math.max(0, 100 - engagedWidth - adjustableWidth)

  const bar = (
    <>
      {/* Répartition : même traitement visuel pour les trois segments. */}
      <div className={`bar${deficit ? ' bar--over' : ''}`} role="img"
        aria-label={
          `Sur ${Math.round(resources / 100)} € qui entrent : ${pct(engaged, resources)} % déjà engagés, ` +
          `${pct(adjustable, resources)} % prévus mais ajustables, ${pct(left, resources)} % disponibles.` +
          (deficit ? ` Les dépenses déjà engagées dépassent ce qui entre.` : '')
        }>
        <span className="bar__seg bar__seg--a" style={{ width: `${engagedWidth}%` }} />
        <span className="bar__seg bar__seg--b" style={{ width: `${adjustableWidth}%` }} />
        <span className="bar__seg bar__seg--c" style={{ width: `${leftWidth}%` }} />
      </div>
      <p className="bar__legend">
        <span><i className="bar__key bar__key--a" />déjà engagé {pct(engaged, resources)} %</span>
        <span><i className="bar__key bar__key--b" />ajustable {pct(adjustable, resources)} %</span>
        <span><i className="bar__key bar__key--c" />disponible {pct(left, resources)} %</span>
      </p>
    </>
  )
  const groups = (
    <>
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
    </>
  )
  const slack = (
    <>
      {/* Même poids typographique que le total engagé, délibérément. */}
      <dl className="ledger-list">
        <div className="ledger-row ledger-row--slack">
          {/* « Il manque » et non « il reste » : un solde négatif annoncé
              comme un reste est une affirmation fausse, et elle adoucit
              précisément les situations les plus dures. */}
          <dt>{deficit ? 'Il manque, une fois l’engagé payé' : 'Il reste, une fois l’engagé payé'}</dt>
          <dd>
            <Amount
              cents={budget.slackCents} nature="fiction" signed={deficit} compact
              label={deficit ? 'Il manque' : 'Reste à vivre'}
            />
          </dd>
        </div>
      </dl>
      {deficit ? (
        <p className="provenance">
          Ce qui est déjà engagé dépasse ce qui entre&nbsp;: le mois ne se boucle pas sans
          toucher à {Math.round(adjustable / 100)} € de dépenses ajustables, puiser dans
          l’épargne, ou passer à découvert.
        </p>
      ) : (
        <p className="provenance">
          Sur ce montant, {Math.round(adjustable / 100)} € sont déjà prévus pour des dépenses que
          {' '}{budget.adjustableCents === 0 ? 'personne' : 'le personnage'} peut décaler.
        </p>
      )}
    </>
  )

  if (variant === 'panel') {
    return (
      // Un repère de page à part entière : hors de <main>, le relevé doit
      // rester atteignable directement par un lecteur d'écran.
      <aside className="ledger-panel" aria-labelledby="ledger-title">
        <p className="sheet__kicker">{month}</p>
        <h2 id="ledger-title">Relevé{owner ? ` de ${owner}` : ' du mois'}</h2>
        {bar}
        {/* Les totaux, au même poids que le reste : aucun n'est un score. */}
        <dl className="ledger-list ledger-panel__totals">
          {sections.map((s) => s.lines.length === 0 ? null : (
            <div className="ledger-row" key={s.title}>
              <dt>{s.title}</dt>
              <dd><Amount cents={s.total} nature="fiction" signed compact label={`Total ${s.title}`} /></dd>
            </div>
          ))}
        </dl>
        {slack}
        {children}
        <details className="ledger-panel__detail">
          <summary>Le détail, ligne par ligne</summary>
          {groups}
        </details>
      </aside>
    )
  }

  return (
    <section className="sheet ledger-sheet" aria-labelledby="ledger-title">
      <p className="sheet__kicker">{month}</p>
      <h2 id="ledger-title">Relevé du mois</h2>
      {bar}
      {groups}
      {slack}
    </section>
  )
}
