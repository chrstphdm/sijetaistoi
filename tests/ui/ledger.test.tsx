// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonthlyBudget } from '@/ui/components/MonthlyBudget.tsx'
import type { BudgetLine, MonthlyBudget as Budget } from '@/core/types.ts'

/**
 * Un mois qui ne se boucle pas.
 *
 * Chez Claire, apres un choix qui ajoute une depense recurrente, 1 730 EUR
 * entrent et 1 855 EUR sont deja engages : le reste a vivre vaut −125 EUR.
 * L'ecran affichait « Il reste, une fois l'engage paye : 125 € ».
 *
 * Deux fautes dans une seule ligne : le signe disparaissait, parce que
 * `formatEuros` rend la valeur absolue et que le signe n'etait ajoute que pour
 * un flux ; et le mot « reste » transformait un manque en disponibilite.
 * L'erreur jouait dans un seul sens — elle adoucissait la situation la plus
 * dure du corpus.
 *
 * Releve sur une CAPTURE D'ECRAN alors que 262 tests passaient au vert.
 *
 * Les largeurs se verifient bien ici, exceptionnellement : elles sont ecrites
 * en pourcentages litteraux dans l'attribut `style`, donc leur somme se lit
 * sans aucune mise en page. Ce qui demande un vrai navigateur, c'est de savoir
 * si un element DEBORDE ; ici il suffit de savoir ce que le code a demande.
 */

const line = (code: string, group: BudgetLine['group'], amountCents: number): BudgetLine => ({
  code, group, amountCents,
  value: { amount: Math.abs(amountCents) / 100, unit: 'EUR_month', nature: 'fiction' },
})

function budgetOf(resources: number, engaged: number, adjustable: number): Budget {
  const lines = [
    line('salaire', 'resource', resources),
    line('logement', 'constrained', -engaged),
    line('loisirs', 'adjustable', -adjustable),
  ]
  return {
    lines,
    resourcesCents: resources,
    leviesCents: 0,
    netIncomeCents: resources,
    constrainedCents: -engaged,
    slackCents: resources - engaged,
    adjustableCents: -adjustable,
    savingsCapacityCents: resources - engaged - adjustable,
  } as Budget
}

const widths = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.bar__seg')].map((el) =>
    Number.parseFloat(el.style.width),
  )

describe('relevé d’un mois en déficit', () => {
  const deficit = budgetOf(173_000, 185_500, 7_000)

  it('annonce un manque, et non un reste', () => {
    render(<MonthlyBudget budget={deficit} month="avril 2027" />)
    expect(screen.getByText(/Il manque, une fois l’engagé payé/)).toBeTruthy()
    expect(screen.queryByText(/Il reste, une fois l’engagé payé/)).toBeNull()
  })

  it('affiche le signe : « 125 € » seul se lit comme un disponible', () => {
    const { container } = render(<MonthlyBudget budget={deficit} month="avril 2027" />)
    const row = container.querySelector('.ledger-row--slack')!
    expect(row.textContent).toContain('−')
    expect(row.textContent).toContain('125')
  })

  it('le fait entendre aussi au lecteur d’écran', () => {
    const { container } = render(<MonthlyBudget budget={deficit} month="avril 2027" />)
    const announced = container.querySelector('.ledger-row--slack .sr-only')!.textContent!
    expect(announced).toMatch(/Il manque/)
    expect(announced).toMatch(/en moins/)
  })

  it('ne laisse pas la barre dépasser 100 %', () => {
    // 107 % + 4 % + 0 % faisaient 111 % : le segment engagé sortait du cadre.
    const { container } = render(<MonthlyBudget budget={deficit} month="avril 2027" />)
    const sum = widths(container).reduce((a, b) => a + b, 0)
    expect(sum).toBeLessThanOrEqual(100)
  })

  it('dit le dépassement au lieu de seulement le masquer', () => {
    const { container } = render(<MonthlyBudget budget={deficit} month="avril 2027" />)
    // Borner les largeurs ne doit pas effacer l'information : « 107 % de ce
    // qui entre est déjà engagé » est l'énoncé le plus parlant de l'écran.
    expect(container.querySelector('.bar__legend')!.textContent).toMatch(/déjà engagé 107 %/)
    expect(container.textContent).toMatch(/dépasse ce qui entre/)
  })
})

describe('relevé d’un mois qui se boucle', () => {
  const ok = budgetOf(300_000, 200_000, 20_000)

  it('continue de dire « il reste », sans signe', () => {
    const { container } = render(<MonthlyBudget budget={ok} month="avril 2027" />)
    const row = container.querySelector('.ledger-row--slack')!
    expect(row.textContent).toMatch(/Il reste, une fois l’engagé payé/)
    expect(row.textContent).not.toContain('−')
  })

  it('répartit la barre sans la saturer', () => {
    const { container } = render(<MonthlyBudget budget={ok} month="avril 2027" />)
    expect(widths(container)).toEqual([67, 7, 26])
  })

  /** Un revenu nul ne doit pas produire de division par zero. */
  it('supporte un revenu nul', () => {
    const none = budgetOf(0, 0, 0)
    const { container } = render(<MonthlyBudget budget={none} month="avril 2027" />)
    expect(widths(container).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100)
  })
})
