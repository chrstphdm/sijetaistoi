import { describe, expect, it } from 'vitest'
import {
  applyRule, activeEffectsFor, applyEffectsToLines, emptyWorld,
  inForceNow, perceptiblyConcerned, publicFinanceImpact, rulesInForce, startsAtYear,
  type Effect, type Rule, type WorldState,
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

/**
 * HORIZON : ce qui s'applique maintenant, et ce qui s'appliquera.
 *
 * Tant que tout le corpus portait l'horizon `y1`, rien ne distinguait les
 * deux. Des mesures a effet differe — un plafonnement de loyer qui n'agit
 * qu'a la relocation, un decalage de l'age de depart qui n'agit pas avant dix
 * ans — ont rendu la confusion fausse : le releve mensuel les affichait comme
 * acquises.
 */
describe('horizon d’un effet', () => {
  const differes: Record<string, Effect[]> = {
    'mixte': [
      { id: 'maintenant', kind: 'budget_line', code: 'energie', monthlyDelta: -20,
        scope: { description: 'tous' }, horizon: 'y1', uncertainty: 'established' },
      { id: 'plus-tard', kind: 'budget_line', code: 'logement', monthlyDelta: 150,
        scope: { description: 'tous' }, horizon: 'y5', uncertainty: 'established' },
      { id: 'bien-plus-tard', kind: 'budget_line', code: 'logement', monthlyDelta: 40,
        scope: { description: 'tous' }, horizon: 'y10', uncertainty: 'established' },
    ],
    'tout-differe': [
      { id: 'seul', kind: 'budget_line', code: 'logement', monthlyDelta: 150,
        scope: { description: 'tous' }, horizon: 'y5', uncertainty: 'established' },
    ],
    'nul-partout': [
      { id: 'zero', kind: 'budget_line', code: 'logement', monthlyDelta: 0,
        scope: { description: 'propriétaires occupants' }, horizon: 'y1', uncertainty: 'established' },
    ],
  }
  const lk = (_r: string, o: string) => differes[o]
  const qui = { heating: 'collective', activities: ['employee'], incomeDecile: 4 }
  const monde = (optionId: string) => applyRule(emptyWorld('x'), rule({ optionId }))
  const ligne = (code: string, group: BudgetLine['group'], amount: number): BudgetLine => ({
    code, group, amountCents: amount,
    value: { amount: Math.abs(amount) / 100, unit: 'EUR_month', nature: 'fiction' },
  })

  it('date le début de chaque horizon', () => {
    expect(startsAtYear('month')).toBe(1)
    expect(startsAtYear('y1')).toBe(1)
    expect(startsAtYear('y5')).toBe(5)
    expect(startsAtYear('y10')).toBe(10)
  })

  it('ne retient dans le mois en cours que ce qui s’y applique', () => {
    const tous = activeEffectsFor(monde('mixte'), qui, lk)
    expect(tous).toHaveLength(3)
    const now = inForceNow(tous)
    expect(now.map((e) => e.effect.id)).toEqual(['maintenant'])
  })

  it('un effet entièrement différé ne change pas le budget du mois', () => {
    const effets = activeEffectsFor(monde('tout-differe'), qui, lk)
    const lignes = [
      ligne('salaire-net', 'resource', euros(2000)),
      ligne('logement', 'constrained', euros(-700)),
    ]
    const maintenant = computeMonthlyBudget(applyEffectsToLines(lignes, inForceNow(effets)))
    const plusTard = computeMonthlyBudget(applyEffectsToLines(lignes, effets))
    expect(maintenant.slackCents).toBe(computeMonthlyBudget(lignes).slackCents)
    expect(plusTard.slackCents).not.toBe(maintenant.slackCents)
  })

  /*
   * CONTRAINTE DE CASTING PUBLIEE.
   *
   * « Le tirage privilégie un personnage qu'une règle déjà décidée concerne
   * de façon perceptible » est affiché au joueur dans le registre. Elle etait
   * implementee par « au moins un effet le vise », ce qui est vrai de tout le
   * monde depuis que le controle de couverture du build oblige chaque option
   * a atteindre les treize personnages, effet nul compris : cinquante-deux
   * options sur soixante-cinq les atteignent toutes. La contrainte ne
   * selectionnait donc plus personne, tout en restant affichee.
   */
  it('« concerné de façon perceptible » exige que le budget bouge, maintenant', () => {
    // Atteint par un effet déclaré, mais nul : non concerné perceptiblement.
    expect(perceptiblyConcerned(activeEffectsFor(monde('nul-partout'), qui, lk))).toBe(false)
    // Atteint par un effet réel, mais à cinq ans : pas encore perceptible.
    expect(perceptiblyConcerned(activeEffectsFor(monde('tout-differe'), qui, lk))).toBe(false)
    // Atteint par un effet réel et immédiat.
    expect(perceptiblyConcerned(activeEffectsFor(monde('mixte'), qui, lk))).toBe(true)
    // Aucune règle ne le vise : pas concerné non plus.
    expect(perceptiblyConcerned([])).toBe(false)
  })
})
