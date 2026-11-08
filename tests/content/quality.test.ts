import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { checkLexicon, walkStrings, type LexiconEntry } from '@/quality/lexicon.ts'
import {
  checkNarrativeParity, checkValenceBalance, MAX_SPREAD, MIN_POSITIVE_SHARE,
  type ParityProfile,
} from '@/quality/parity.ts'

const read = (rel: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../content/${rel}`, import.meta.url)), 'utf8'))

const lexicon = read('lexicon.json') as { entries: LexiconEntry[] }

describe('lexique contrôlé', () => {
  it('repère un terme proscrit et propose la formulation neutre', () => {
    const v = checkLexicon({ texte: 'les charges sociales pèsent' }, lexicon.entries, 'test')
    expect(v).toHaveLength(1)
    expect(v[0]?.message).toContain('cotisations sociales')
    expect(v[0]?.severity).toBe('blocking')
  })

  it('ignore les accents et la casse', () => {
    expect(checkLexicon({ t: 'MATRAQUAGE FISCAL' }, lexicon.entries, 'x')).toHaveLength(1)
    expect(checkLexicon({ t: 'le trou de la Sécu' }, lexicon.entries, 'x')).toHaveLength(1)
  })

  it('respecte les frontières de mot', () => {
    // « pigeons » est proscrit ; « pigeonnier » ne doit pas déclencher.
    expect(checkLexicon({ t: 'un pigeonnier en ruine' }, lexicon.entries, 'x')).toHaveLength(0)
    expect(checkLexicon({ t: 'les pigeons se sont mobilisés' }, lexicon.entries, 'x')).toHaveLength(1)
  })

  it('parcourt les structures imbriquées et nomme le chemin', () => {
    const v = checkLexicon({ a: { b: ['rien', 'des assistés'] } }, lexicon.entries, 'f.json')
    expect(v[0]?.where).toBe('f.json · a.b[1]')
  })

  it('COUPE DANS TOUS LES SENS : des termes des deux bords sont proscrits', () => {
    // Un lexique qui ne viserait qu'un camp serait lui-même un acte
    // politique. Échantillon pris volontairement de part et d'autre.
    const depuisUnBord = ['assistanat', 'fainéants', 'trou de la sécu', 'écologie punitive']
    const depuisLAutre = ['cadeau fiscal', 'nantis', 'ultra-riches', 'premiers de cordée']
    const avoided = lexicon.entries.map((e) => e.avoid)
    for (const t of [...depuisUnBord, ...depuisLAutre]) expect(avoided).toContain(t)
  })

  it('chaque entrée justifie pourquoi le terme est écarté', () => {
    // Sans justification, le lexique serait une liste d'interdits arbitraires
    // impossible à contester.
    for (const e of lexicon.entries) {
      expect(e.why.length, `entrée « ${e.avoid} » sans justification`).toBeGreaterThan(20)
    }
  })

  it('n’applique pas le lexique à sa propre liste de termes', () => {
    expect(checkLexicon(lexicon, lexicon.entries, 'lexicon.json')).toHaveLength(0)
  })

  it('walkStrings visite toutes les chaînes, et elles seules', () => {
    const seen: string[] = []
    walkStrings({ a: 'x', b: 2, c: [true, 'y'], d: { e: 'z' } }, (t) => seen.push(t))
    expect(seen).toEqual(['x', 'y', 'z'])
  })
})

describe('parité narrative', () => {
  const profile = (id: string, storyLength: number): ParityProfile => ({
    id, storyLength, strengthLength: 100, vulnerabilityLength: 100,
    detailCount: 3, aspirationCount: 2, concernCount: 2,
  })

  it('accepte des longueurs comparables', () => {
    expect(checkNarrativeParity([profile('a', 500), profile('b', 540)])).toHaveLength(0)
  })

  it('refuse qu’un personnage reçoive deux fois plus de texte qu’un autre', () => {
    const v = checkNarrativeParity([profile('a', 200), profile('b', 550)])
    expect(v).toHaveLength(1)
    expect(v[0]?.message).toContain('longueur de l’histoire')
    expect(v[0]?.severity).toBe('blocking')
  })

  it('ne dit rien sur un corpus d’un seul personnage', () => {
    expect(checkNarrativeParity([profile('a', 500)])).toHaveLength(0)
  })

  it('le seuil autorise au plus un rapport de un à deux', () => {
    expect(MAX_SPREAD).toBe(0.5)
  })

  it('le corpus réel respecte la parité', () => {
    const ids = ['claire', 'marc-anne', 'michele', 'yanis']
    const profiles = ids.map((id) => {
      const c = read(`characters/${id}.json`)
      return {
        id,
        storyLength: c.narrative.story.length,
        strengthLength: c.parity.strength.length,
        vulnerabilityLength: c.parity.vulnerability.length,
        detailCount: c.embodiedDetails.length,
        aspirationCount: c.parity.aspirations.length,
        concernCount: c.parity.concerns.length,
      }
    })
    expect(checkNarrativeParity(profiles)).toEqual([])
  })
})

describe('équilibre de valence', () => {
  it('refuse un corpus sans aucun événement favorable', () => {
    const v = checkValenceBalance(['negative', 'negative', 'negative'])
    expect(v).toHaveLength(1)
    expect(v[0]?.message).toContain('raconte une thèse sur la vie')
  })

  it('accepte un corpus suffisamment équilibré', () => {
    expect(checkValenceBalance(['negative', 'negative', 'positive', 'neutral'])).toHaveLength(0)
  })

  it('le corpus réel comporte assez d’événements favorables', () => {
    const ids = ['augmentation', 'chaudiere', 'voyage-scolaire']
    const valences = ids.map((id) => read(`events/${id}.json`).valence as string)
    expect(checkValenceBalance(valences)).toEqual([])
    expect(MIN_POSITIVE_SHARE).toBe(0.2)
  })
})
