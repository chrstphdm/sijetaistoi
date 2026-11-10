import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { Value } from '@/schemas/primitives.ts'
import { Hypothesis } from '@/schemas/referentials.ts'
import { Character } from '@/schemas/character.ts'
import { LifeEvent } from '@/schemas/event.ts'
import { Reform, ReformOption, Effect } from '@/schemas/reform.ts'
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

describe('réformes — symétrie imposée par le schéma', () => {
  // Designee par son IDENTIFIANT, jamais par sa position. Ce bloc lisait
  // `reforms[0]`, qui a cesse de designer la contribution energie le jour ou
  // une reforme a ete ajoutee avant elle dans l'ordre alphabetique : trois
  // tests se sont alors mis a verifier le schema contre `undefined`, donc a
  // ne rien verifier du tout.
  const reform = bundle.reforms.find((r: { id: string }) => r.id === 'contribution-energie')
  const taxe = reform.options.find((o: { id: string }) => o.id === 'taxe-energie')

  it('les deux fixtures de ce bloc existent bien dans le corpus', () => {
    expect(reform, 'réforme contribution-energie introuvable').toBeTruthy()
    expect(taxe, 'option taxe-energie introuvable').toBeTruthy()
  })

  it('le corpus réel valide', () => {
    expect(Reform.safeParse(reform).success).toBe(true)
  })

  it('refuse une réforme sans statu quo : ne rien faire est une décision', () => {
    rejects(Reform, {
      ...reform,
      options: reform.options
        .filter((o: { isStatusQuo: boolean }) => !o.isStatusQuo),
    })
  })

  it('refuse une réforme sans contestation du cadrage', () => {
    // Sans cette option, le jeu impose sa propre thèse : que la politique se
    // réduit à un arbitrage budgétaire à somme nulle.
    rejects(Reform, {
      ...reform,
      options: reform.options.filter(
        (o: { families: string[] }) => !o.families.includes('challenge_framing'),
      ),
    })
  })

  it('refuse une option dont tous les effets sur les ménages sont défavorables', () => {
    const oneSided = {
      ...taxe,
      effects: taxe.effects.filter(
        (e: { monthlyDelta?: number }) => e.monthlyDelta === undefined || e.monthlyDelta < 0,
      ),
    }
    rejects(ReformOption, oneSided)
  })

  it('refuse un déséquilibre du nombre d’arguments pour et contre', () => {
    rejects(ReformOption, { ...taxe, argumentsAgainst: [taxe.argumentsAgainst[0]] , argumentsFor: [...taxe.argumentsFor, ...taxe.argumentsFor, ...taxe.argumentsFor] })
  })

  it('refuse un effet débattu qui ne désigne pas son hypothèse', () => {
    const e = taxe.effects[0]
    rejects(Effect, { ...e, uncertainty: 'debated', hypothesisId: undefined })
  })

  it('chaque option porte au moins deux arguments dans chaque sens', () => {
    for (const r of bundle.reforms) {
      for (const o of r.options) {
        expect(o.argumentsFor.length).toBeGreaterThanOrEqual(2)
        expect(o.argumentsAgainst.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('chaque réforme déclare ce que son modèle ne prend pas en compte', () => {
    for (const r of bundle.reforms) expect(r.modelLimitations.length).toBeGreaterThan(50)
  })
})

describe('corpus complet — ce que le jeu peut faire apparaître', () => {
  type Char = {
    identity: { incomeDecile: number }
    traits: {
      activities: string[]; tenure: string; childCount: number
      housingZone: string; recognisedDisability: boolean
    }
  }
  const chars = bundle.characters as Char[]

  it('comporte de quoi tirer trois actes contrastés et les comparer', () => {
    // Pas de nombre cible : trois personnages par partie et une règle de
    // contraste de trois déciles exigent un corpus large, et le plafond est
    // la lisibilité de l'écran « vu par chacun », pas un chiffre.
    expect(chars.length).toBeGreaterThanOrEqual(9)
    expect(bundle.events.length).toBeGreaterThanOrEqual(12)
    expect(bundle.reforms.length).toBeGreaterThanOrEqual(9)
  })

  it('déclare sur la page méthode chaque décile que le corpus n’occupe pas', () => {
    // Un corpus qui saute un décile laisse un trou dont personne ne parle.
    // Les absences doivent être DÉCLARÉES sur la page méthode, pas
    // découvertes par un joueur. Depuis que le décile est vérifié contre le
    // budget, le neuvième est vide : il est nommé.
    const ORDINAL = ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième',
      'sixième', 'septième', 'huitième', 'neuvième', 'dixième']
    const deciles = new Set(chars.map((c) => c.identity.incomeDecile))
    const manquants = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((d) => !deciles.has(d))
    expect(manquants.length, 'au plus un décile manquant').toBeLessThanOrEqual(1)
    const methode = JSON.stringify(bundle.method)
    for (const d of manquants) expect(methode, `décile ${d} absent et non déclaré`).toContain(ORDINAL[d - 1])
  })

  it('couvre les situations d’activité, y compris celles qui n’en sont pas une', () => {
    const activities = chars.flatMap((c) => c.traits.activities)
    for (const a of ['employee', 'self_employed', 'student', 'retired', 'unemployed', 'inactive']) {
      expect(activities, `aucun personnage « ${a} »`).toContain(a)
    }
  })

  it('couvre les cinq statuts d’occupation du logement', () => {
    const tenures = new Set(chars.map((c) => c.traits.tenure))
    for (const t of ['owner_with_loan', 'owner_outright', 'tenant_private', 'tenant_social', 'housed']) {
      expect([...tenures], `aucun personnage « ${t} »`).toContain(t)
    }
  })

  it('couvre les situations que le brief désignait comme manquantes', () => {
    // Chacune de ces absences changeait ce que le jeu pouvait faire
    // apparaître : une mesure sur le parc social, sur l'invalidité, sur les
    // familles nombreuses ou sur les zones tendues n'avait personne à
    // atteindre, et le contrôle de couverture du build ne pouvait pas le
    // voir — il vérifie que chacun est atteint, pas que chaque situation
    // existe.
    expect(chars.some((c) => c.traits.tenure === 'tenant_social'), 'parc social').toBe(true)
    expect(chars.some((c) => c.traits.childCount >= 3), 'famille nombreuse').toBe(true)
    expect(chars.some((c) => c.traits.recognisedDisability), 'handicap reconnu').toBe(true)
    expect(chars.some((c) => c.traits.housingZone === 'tendue'), 'zone tendue').toBe(true)
    expect(chars.some((c) => c.traits.housingZone === 'detendue'), 'hors zone tendue').toBe(true)
    expect(chars.some((c) => c.traits.activities.includes('unemployed')), 'sans emploi').toBe(true)
  })

  it('chaque réforme mobilise au moins trois familles de leviers', () => {
    for (const r of bundle.reforms) {
      const families = new Set(r.options.flatMap((o: { families: string[] }) => o.families))
      expect(families.size, `réforme ${r.id}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('aucune réforme ne concerne un seul personnage', () => {
    // Une réforme qui ne toucherait qu'une situation ne produirait aucune
    // comparaison, donc aucun déclic.
    for (const r of bundle.reforms) {
      const scopes = r.options.flatMap((o: { effects: { scope: { description: string } }[] }) =>
        o.effects.map((e) => e.scope.description),
      )
      expect(new Set(scopes).size, `réforme ${r.id}`).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('page d’accueil — toute thèse porte son objection', () => {
  const intro = bundle.intro

  it('expose le but, les règles, les théories et l’allure', () => {
    expect(intro.goal.length).toBeGreaterThanOrEqual(2)
    expect(intro.rules.length).toBeGreaterThanOrEqual(4)
    expect(intro.theories.length).toBeGreaterThanOrEqual(3)
    expect(intro.look.length).toBeGreaterThanOrEqual(3)
  })

  it('accompagne chaque théorie de ce qu’on lui reproche', () => {
    // Une théorie présentée sans objection serait recommandée, pas
    // expliquée — et le jeu se réclamerait d'une doctrine.
    for (const t of intro.theories) {
      expect(t.objection.length, `théorie « ${t.title} »`).toBeGreaterThan(120)
    }
  })

  it('donne à l’objection un poids comparable à la thèse', () => {
    for (const t of intro.theories) {
      const ratio = t.body.length / t.objection.length
      expect(ratio, `théorie « ${t.title} »`).toBeLessThan(3)
    }
  })

  it('nomme le voile d’ignorance sans en adopter les conclusions', () => {
    const voile = intro.theories.find((t: { id: string }) => t.id === 'voile')
    expect(voile).toBeTruthy()
    expect(voile.body).toContain('emprunte')
    expect(voile.objection).toContain('reproche')
  })

  it('déclare ce que le jeu n’est pas, dont sa propre partialité', () => {
    const joined = intro.notList.map((n: { body: string }) => n.body).join(' ')
    expect(joined).toContain('pas neutre')
  })
})

describe('principes de justice', () => {
  const principles = bundle.principles.principles

  it('en expose au moins dix, chacun avec son objection', () => {
    expect(principles.length).toBeGreaterThanOrEqual(10)
    for (const p of principles) {
      expect(p.definition.length, p.label).toBeGreaterThan(100)
      expect(p.objection.length, p.label).toBeGreaterThan(100)
    }
  })

  it('n’expédie aucune objection face à sa définition', () => {
    // Une objection en une ligne face à une définition de cinq serait un
    // épouvantail.
    for (const p of principles) {
      const ratio = p.definition.length / p.objection.length
      expect(ratio, p.label).toBeLessThan(2)
      expect(ratio, p.label).toBeGreaterThan(0.5)
    }
  })

  it('couvre les principes opposés deux à deux', () => {
    const ids = principles.map((p: { id: string }) => p.id)
    for (const pair of [
      ['besoin', 'merite'],
      ['egalite-de-traitement', 'equite'],
      ['solidarite', 'responsabilite-individuelle'],
      ['contribution-proportionnelle', 'contribution-progressive'],
      ['universalite', 'reciprocite'],
    ]) {
      for (const id of pair) expect(ids, `principe « ${id} » manquant`).toContain(id)
    }
  })
})
