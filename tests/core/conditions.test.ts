import { describe, expect, it } from 'vitest'
import { evaluate, validateCondition, type Condition } from '@/core/conditions.ts'

const claire = {
  activities: ['employee'],
  tenure: 'tenant_private',
  heating: 'collective',
  householdSize: 2,
  childCount: 1,
  hasSchoolAgedChild: true,
  incomeDecile: 2,
}

describe('evaluate', () => {
  it('évalue les opérateurs de base', () => {
    expect(evaluate(['tenure', 'eq', 'tenant_private'], claire)).toBe(true)
    expect(evaluate(['tenure', 'ne', 'owner_with_loan'], claire)).toBe(true)
    expect(evaluate(['incomeDecile', 'lte', 3], claire)).toBe(true)
    expect(evaluate(['incomeDecile', 'gt', 5], claire)).toBe(false)
    expect(evaluate(['tenure', 'in', ['tenant_private', 'tenant_social']], claire)).toBe(true)
    expect(evaluate(['activities', 'contains', 'employee'], claire)).toBe(true)
    expect(evaluate(['activities', 'contains', 'retired'], claire)).toBe(false)
  })

  it('compose avec and, or et not', () => {
    const c: Condition = {
      and: [['hasSchoolAgedChild', 'eq', true], { or: [['incomeDecile', 'lte', 3], ['childCount', 'gte', 3]] }],
    }
    expect(evaluate(c, claire)).toBe(true)
    expect(evaluate({ not: c }, claire)).toBe(false)
  })

  it('renvoie faux sur un attribut absent plutôt que de lever', () => {
    // C'est precisement pourquoi validateCondition existe : a l'execution une
    // faute de frappe serait invisible, donc elle doit etre attrapee au build.
    expect(evaluate(['attributInexistant', 'eq', 'x'], claire)).toBe(false)
  })
})

describe('validateCondition', () => {
  it('accepte une condition du vocabulaire', () => {
    expect(validateCondition(['heating', 'eq', 'individual'])).toEqual([])
  })

  it('refuse un attribut hors vocabulaire', () => {
    const errs = validateCondition(['housing.heating', 'eq', 'individual'])
    expect(errs).toHaveLength(1)
    expect(errs[0]).toContain('attribut inconnu')
  })

  it('refuse un opérateur incompatible avec le type de l’attribut', () => {
    // `contains` n'a pas de sens sur un scalaire.
    const errs = validateCondition(['tenure', 'contains', 'x'])
    expect(errs).toHaveLength(1)
    expect(errs[0]).toContain('invalide')
    // `lt` n'a pas de sens sur un booleen.
    expect(validateCondition(['hasSchoolAgedChild', 'lt', 1])).toHaveLength(1)
  })

  it('descend dans les combinaisons et signale le chemin', () => {
    const errs = validateCondition({ and: [['heating', 'eq', 'individual'], ['inconnu', 'eq', 1]] })
    expect(errs).toHaveLength(1)
    expect(errs[0]).toContain('and[1]')
  })
})
