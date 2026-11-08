import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { Value } from '@/schemas/primitives.ts'
import { Hypothesis } from '@/schemas/referentials.ts'
import { Character } from '@/schemas/character.ts'
import { LifeEvent } from '@/schemas/event.ts'
import { ContentBundle } from '@/schemas/index.ts'

const bundlePath = fileURLToPath(new URL('../../content/bundle.json', import.meta.url))
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'))

const rejects = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  expect(schema.safeParse(value).success).toBe(false)

describe('couche de provenance', () => {
  it('accepte un fait correctement sourcé', () => {
    expect(
      Value.safeParse({ amount: 110, unit: 'EUR_month', nature: 'fact', sourceId: 'cnaf-cout-garde' })
        .success,
    ).toBe(true)
  })

  it('refuse un fait sans source : il se présenterait comme établi sans l’être', () => {
    rejects(Value, { amount: 110, unit: 'EUR_month', nature: 'fact' })
  })

  it('refuse une valeur de modèle qui ne désigne pas son hypothèse', () => {
    rejects(Value, { amount: 340, unit: 'EUR_month', nature: 'hypothesis' })
  })

  it('refuse qu’une valeur fictive cite une source : elle se ferait passer pour un fait', () => {
    rejects(Value, { amount: 40, unit: 'EUR_month', nature: 'fiction', sourceId: 'anil-loyers' })
  })

  it('attrape l’erreur de facteur 1000 sur les milliards', () => {
    // 8,9 milliards mal écrits : l'erreur reelle qui a motive ce garde-fou.
    rejects(Value, { amount: 8900, unit: 'EUR_bn', nature: 'fiction' })
    expect(Value.safeParse({ amount: 8.9, unit: 'EUR_bn', nature: 'fiction' }).success).toBe(true)
  })

  it('refuse une valeur centrale hors de sa propre fourchette', () => {
    rejects(Value, { amount: 1800, unit: 'EUR', nature: 'fiction', range: [100, 300] })
  })
})

describe('hypothèses', () => {
  const base = {
    id: 'test-hypothese',
    question: 'Une question suffisamment longue pour passer ?',
    status: 'debated',
    whyDebated: 'Une explication de longueur suffisante pour le schéma.',
  }

  it('refuse une hypothèse à lecture unique : elle trancherait un débat en silence', () => {
    rejects(Hypothesis, {
      ...base,
      readings: [{ id: 'A', mechanismLabel: 'Lecture unique', parameters: {}, sourceIds: [] }],
    })
  })

  it('accepte une hypothèse à deux lectures nommées par un mécanisme', () => {
    expect(
      Hypothesis.safeParse({
        ...base,
        readings: [
          { id: 'A', mechanismLabel: 'Première lecture', parameters: { x: 1 }, sourceIds: [] },
          { id: 'B', mechanismLabel: 'Seconde lecture', parameters: { x: 2 }, sourceIds: [] },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('personnages', () => {
  const claire = bundle.characters.find((c: { id: string }) => c.id === 'claire')

  it('le corpus réel valide', () => {
    expect(Character.safeParse(claire).success).toBe(true)
  })

  it('refuse un personnage sans vulnérabilité déclarée', () => {
    rejects(Character, { ...claire, parity: { ...claire.parity, vulnerability: '' } })
  })

  it('refuse un personnage sans opinion contraire à son propre intérêt', () => {
    rejects(Character, { ...claire, parity: { ...claire.parity, opinionAgainstOwnInterest: '' } })
  })

  it('refuse une liquidité à 60 jours inférieure à celle à 7 jours', () => {
    rejects(Character, { ...claire, stocks: { ...claire.stocks, liquid60d: 10 } })
  })

  it('refuse des postes budgétaires en double', () => {
    rejects(Character, {
      ...claire,
      budget: { lines: [...claire.budget.lines, claire.budget.lines[0]] },
    })
  })

  it('exige que chaque personnage porte force ET vulnérabilité', () => {
    for (const c of bundle.characters) {
      expect(c.parity.strength.length).toBeGreaterThan(20)
      expect(c.parity.vulnerability.length).toBeGreaterThan(20)
      expect(c.parity.opinionAgainstOwnInterest.length).toBeGreaterThan(20)
    }
  })
})

describe('événements', () => {
  it('le corpus réel valide', () => {
    for (const e of bundle.events) expect(LifeEvent.safeParse(e).success).toBe(true)
  })

  it('refuse un événement dont toutes les options coûtent pareil : ce n’est pas un arbitrage', () => {
    const e = bundle.events.find((x: { id: string }) => x.id === 'chaudiere')
    rejects(LifeEvent, {
      ...e,
      options: [
        { id: 'a', label: 'A', effects: [{ type: 'one_off', amount: 1800 }] },
        { id: 'b', label: 'B', effects: [{ type: 'one_off', amount: 1800 }] },
      ],
    })
  })

  it('le corpus comporte au moins un événement favorable', () => {
    // Sans RESPIRATION, le corpus devient misérabiliste par construction.
    expect(bundle.events.some((e: { valence: string }) => e.valence === 'positive')).toBe(true)
  })
})

describe('paquet compilé', () => {
  it('valide son propre schéma', () => {
    const r = ContentBundle.safeParse(bundle)
    expect(r.success, r.success ? '' : JSON.stringify(r.error?.issues?.slice(0, 3))).toBe(true)
  })
})
