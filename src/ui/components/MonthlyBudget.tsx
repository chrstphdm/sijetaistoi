import type { MonthlyBudget as Budget, BudgetLine } from '@/core/types.ts'
import { Amount } from './Amount.tsx'

/**
 * Le releve mensuel.
 *
 * Ce n'est pas un tableau de bord : c'est un document date que le personnage
 * aurait reellement sous les yeux. Aucune jauge, aucun indicateur permanent,
 * aucune barre de progression — le vocabulaire visuel du defi est proscrit.
 *
 * La part CONTRAINTE a le meme poids typographique que le reste a vivre :
 * afficher le solde plus gros ferait lire le reste a vivre comme un score
 * d'habilete, ce qui est precisement l'echec mesure du precedent SPENT.
 */

const LABELS: Record<string, string> = {
  salaire_net: 'Salaire net',
  prestations: 'Prestations',
  logement: 'Logement',
  energie: 'Énergie',
  alimentation: 'Alimentation',
  transport: 'Transport',
  enfants: 'Enfants',
  sante: 'Santé',
  credit_conso: 'Crédit en cours',
  credit_immo: 'Crédit immobilier',
  loisirs: 'Loisirs',
  habillement: 'Habillement',
}

const labelOf = (l: BudgetLine) => LABELS[l.code] ?? l.code

export function MonthlyBudget({ budget, month }: { budget: Budget; month: string }) {
  const resources = budget.lines.filter((l) => l.group === 'resource')
  const constrained = budget.lines.filter((l) => l.group === 'constrained' || l.group === 'credit')
  const adjustable = budget.lines.filter((l) => l.group === 'adjustable')

  return (
    <section className="sheet" aria-labelledby="ledger-title">
      <p className="sheet__kicker">{month}</p>
      <h2 id="ledger-title">Relevé du mois</h2>

      <table className="ledger">
        <tbody>
          <tr><th scope="row" colSpan={2}>Ce qui entre</th></tr>
          {resources.map((l) => (
            <tr key={l.code}>
              <td>{labelOf(l)}</td>
              <td><Amount cents={l.amountCents} nature={l.value.nature} label={labelOf(l)} /></td>
            </tr>
          ))}

          <tr><th scope="row" colSpan={2}>Ce qui est déjà engagé</th></tr>
          {constrained.map((l) => (
            <tr key={l.code}>
              <td>{labelOf(l)}</td>
              <td><Amount cents={l.amountCents} nature={l.value.nature} label={labelOf(l)} /></td>
            </tr>
          ))}
          <tr className="group-end">
            <td>Total engagé</td>
            <td><Amount cents={budget.constrainedCents} nature="fiction" label="Total engagé" /></td>
          </tr>

          <tr className="total">
            <td>Il reste</td>
            <td><Amount cents={budget.slackCents} nature="fiction" label="Reste à vivre" /></td>
          </tr>
          {adjustable.map((l) => (
            <tr key={l.code}>
              <td>{labelOf(l)}</td>
              <td><Amount cents={l.amountCents} nature={l.value.nature} label={labelOf(l)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
