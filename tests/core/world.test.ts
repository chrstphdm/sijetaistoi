import { describe, expect, it } from 'vitest'
import {
  applyRule, activeEffectsFor, applyEffectsToLines, emptyWorld,
  publicFinanceImpact, rulesInForce, type Effect, type Rule, type WorldState,
} from '@/core/world.ts'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { euros } from '@/core/money.ts'
import type { BudgetLine } from '@/core/types.ts'

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: 'r1',
  reformId: 'contribution-energie',
  optionId: 'taxe-energie',
  shortLabel: 'Contribution énergie',
  playerWording: 'celui qui consomme doit payer',
  playerJudgement: 'rather_yes',
  diegeticMonth: '2027-04',
  replaces: null,
  status: 'in_force',
  ...over,
})

const EFFECTS: Record<string, Effect[]> = {
  'taxe-energie': [
    { id: 'a', kind: 'budget_line', code: 'energie', monthlyDelta: -14,
      scope: { when: { and: [['heating', 'eq', 'collective']] }, description: 'collectif' },
      horizon: 'y1', uncertainty: 'established' },
    { id: 'b', kind: 'budget_line', code: 'energie', monthlyDelta: -27,
      scope: { when: { and: [['heating', 'eq', 'individual']] }, description: 'individuel' },
      horizon: 'y1', uncertainty: 'established' },
    { id: 'c', kind: 'public_finance', publicBillions: 3,
      scope: { description: 'finances publiques' }, horizon: 'y1', uncertainty: 'established' },
  ],
  'frais-inscription': [
    { id: 'd', kind: 'budget_line', code: 'frais-inscription', monthlyDelta: -83,
      scope: { when: { and: [['activities', 'contains', 'student']] }, description: 'étudiants' },
      horizon: 'y1', uncertainty: 'established' },
  ],
}
const lookup = (_r: string, o: string) => EFFECTS[o]

const collectif = { heating: 'collective', activities: ['employee'], incomeDecile: 2 }
const individuel = { heating: 'individual', activities: ['self_employed'], incomeDecile: 9 }

describe('état du monde', () => {
  it('part vide et accumule les règles dans l’ordre', () => {
    let w = emptyWorld('sensibilite-faible')
    expect(rulesInForce(w)).toHaveLength(0)
    w = applyRule(w, rule())
    w = applyRule(w, rule({ id: 'r2', optionId: 'frais-inscription' }))
    expect(rulesInForce(w)).toHaveLength(2)
    expect(w.rules.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('amende sans effacer : le registre doit pouvoir montrer le revirement', () => {
    let w = applyRule(emptyWorld('x'), rule())
    w = applyRule(w, rule({ id: 'r2', optionId: 'statu-quo', replaces: 'r1' }))
    expect(w.rules).toHaveLength(2)
    expect(w.rules.find((r) => r.id === 'r1')?.status).toBe('amended')
    expect(rulesInForce(w).map((r) => r.id)).toEqual(['r2'])
  })

  it('conserve la formulation du joueur mot pour mot', () => {
    const w = applyRule(emptyWorld('x'), rule({ playerWording: "j'y suis plutôt favorable, mais…" }))
    expect(w.rules[0]?.playerWording).toBe("j'y suis plutôt favorable, mais…")
  })

  it('est immuable : appliquer une règle ne modifie pas l’état précédent', () => {
    const before = emptyWorld('x')
    const after = applyRule(before, rule())
    expect(before.rules).toHaveLength(0)
    expect(after).not.toBe(before)
  })
})

describe('portée des effets', () => {
  const world: WorldState = applyRule(emptyWorld('x'), rule())

  it('n’applique un effet qu’aux personnages concernés', () => {
    const a = activeEffectsFor(world, collectif, lookup)
    const b = activeEffectsFor(world, individuel, lookup)
    expect(a).toHaveLength(1)
    expect(a[0]?.deltaCents).toBe(euros(-14))
    expect(b).toHaveLength(1)
    expect(b[0]?.deltaCents).toBe(euros(-27))
  })

  it('ne renvoie aucun effet pour un personnage hors de toute portée', () => {
    const w = applyRule(emptyWorld('x'), rule({ optionId: 'frais-inscription' }))
    // Ni Claire ni Marc ne sont etudiants : la regle existe, mais ne les
    // touche pas. « Aucun effet » et « effet nul » sont distincts, et c'est
    // volontaire : un rappel a effet nul est un contenu a rediger.
    expect(activeEffectsFor(w, collectif, lookup)).toHaveLength(0)
  })

  it('agrège les finances publiques sur toutes les règles en vigueur', () => {
    expect(publicFinanceImpact(world, lookup)).toBe(3)
    const w2 = applyRule(world, rule({ id: 'r2', optionId: 'frais-inscription' }))
    expect(publicFinanceImpact(w2, lookup)).toBe(3)
  })
})

describe('application au budget', () => {
  const line = (code: string, group: BudgetLine['group'], amount: number): BudgetLine => ({
    code, group, amountCents: amount,
    value: { amount: Math.abs(amount) / 100, unit: 'EUR_month', nature: 'fiction' },
  })
  const base = [
    line('salaire-net', 'resource', euros(1210)),
    line('energie', 'constrained', euros(-135)),
  ]

  it('modifie le poste visé et laisse les autres intacts', () => {
    const w = applyRule(emptyWorld('x'), rule())
    const after = applyEffectsToLines(base, activeEffectsFor(w, collectif, lookup))
    expect(after.find((l) => l.code === 'energie')?.amountCents).toBe(euros(-149))
    expect(after.find((l) => l.code === 'salaire-net')?.amountCents).toBe(euros(1210))
  })

  it('crée la ligne quand le poste n’existait pas encore chez ce personnage', () => {
    const w = applyRule(emptyWorld('x'), rule({ optionId: 'frais-inscription' }))
    const etudiant = { heating: 'collective', activities: ['student'], incomeDecile: 1 }
    const after = applyEffectsToLines(base, activeEffectsFor(w, etudiant, lookup))
    const created = after.find((l) => l.code === 'frais-inscription')
    expect(created?.amountCents).toBe(euros(-83))
    expect(created?.group).toBe('constrained')
  })

  it('est idempotent à état du monde constant', () => {
    const w = applyRule(emptyWorld('x'), rule())
    const effects = activeEffectsFor(w, collectif, lookup)
    expect(applyEffectsToLines(base, effects)).toEqual(applyEffectsToLines(base, effects))
  })

  it('le reste à vivre baisse exactement du montant de la règle', () => {
    const w = applyRule(emptyWorld('x'), rule())
    const before = computeMonthlyBudget(base)
    const after = computeMonthlyBudget(applyEffectsToLines(base, activeEffectsFor(w, collectif, lookup)))
    expect(before.slackCents - after.slackCents).toBe(euros(14))
  })
})
