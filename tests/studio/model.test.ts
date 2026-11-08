import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import {
  duplicate, serialise, slugify, summarise, validate, type Draft,
} from '@/studio/model.ts'
import type { LexiconEntry } from '@/quality/lexicon.ts'

const read = (rel: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../content/${rel}`, import.meta.url)), 'utf8'))

const lexicon = (read('lexicon.json') as { entries: LexiconEntry[] }).entries
const claire = read('characters/claire.json')

const draft = (over: Partial<Draft> = {}): Draft => ({
  kind: 'character', id: 'claire', path: 'content/characters/claire.json',
  text: JSON.stringify(claire), dirty: false, ...over,
})

describe('validation dans l’Atelier', () => {
  it('accepte un contenu réel du corpus', () => {
    const v = validate(draft(), lexicon)
    expect(v.valid).toBe(true)
    expect(v.diagnostics).toEqual([])
  })

  it('signale un JSON invalide sans lever', () => {
    const v = validate(draft({ text: '{ "id": ' }), lexicon)
    expect(v.valid).toBe(false)
    expect(v.diagnostics[0]?.message).toContain('JSON invalide')
  })

  it('applique EXACTEMENT les règles du build', () => {
    // Deux jeux de règles divergents seraient pires que pas d'Atelier.
    const sansVulnerabilite = { ...claire, parity: { ...claire.parity, vulnerability: '' } }
    const v = validate(draft({ text: JSON.stringify(sansVulnerabilite) }), lexicon)
    expect(v.valid).toBe(false)
    expect(v.diagnostics.some((d) => d.path.includes('vulnerability'))).toBe(true)
  })

  it('montre schéma ET lexique ensemble, pas en cascade', () => {
    // Corriger une faute de schéma ne doit pas demander de relancer pour
    // découvrir les termes proscrits : c'est le défaut relevé sur la chaîne
    // de build, où une erreur de schéma masquait les suivantes.
    const fautif = {
      ...claire,
      parity: { ...claire.parity, vulnerability: '' },
      narrative: { story: 'Elle vit de l’assistanat depuis des années, avec ce matraquage fiscal permanent et sans aucune perspective de changement.' },
    }
    const v = validate(draft({ text: JSON.stringify(fautif) }), lexicon)
    expect(v.diagnostics.some((d) => d.path.includes('vulnerability'))).toBe(true)
    expect(v.diagnostics.some((d) => d.message.includes('assistanat'))).toBe(true)
    expect(v.diagnostics.some((d) => d.message.includes('matraquage'))).toBe(true)
  })

  it('distingue ce qui bloque de ce qui s’examine', () => {
    const avecAvertissement = {
      ...claire,
      narrative: { story: 'Claire travaille de nuit. Évidemment, cela complique tout, et elle a appris à composer avec des horaires que personne ne choisirait vraiment.' },
    }
    const v = validate(draft({ text: JSON.stringify(avecAvertissement) }), lexicon)
    expect(v.diagnostics.some((d) => d.severity === 'warning')).toBe(true)
    expect(v.valid).toBe(true)
  })
})

describe('duplication', () => {
  it('vide les champs narratifs plutôt que de les recopier', () => {
    // Dupliquer puis changer trois chiffres produirait deux personnages qui
    // se ressemblent, ce que la charte interdit.
    const copie = duplicate(claire, 'nouvelle-personne') as Record<string, unknown>
    expect(copie['id']).toBe('nouvelle-personne')
    expect(copie['toRewrite']).toContain('narrative')
    expect(copie['toRewrite']).toContain('parity')
    expect(copie['toRewrite']).toContain('embodiedDetails')
  })

  it('ne modifie pas la source', () => {
    const avant = JSON.stringify(claire)
    duplicate(claire, 'autre')
    expect(JSON.stringify(claire)).toBe(avant)
  })

  it('produit un contenu que le schéma refuse tant qu’il n’est pas réécrit', () => {
    const copie = duplicate(claire, 'nouvelle-personne')
    const v = validate(draft({ text: JSON.stringify(copie) }), lexicon)
    expect(v.valid).toBe(false)
  })
})

describe('utilitaires', () => {
  it('dérive un identifiant lisible d’un libellé', () => {
    expect(slugify('Marc et Anne')).toBe('marc-et-anne')
    expect(slugify('Révision annuelle du loyer !')).toBe('revision-annuelle-du-loyer')
  })

  it('sérialise de façon stable', () => {
    expect(serialise(claire)).toBe(serialise(JSON.parse(serialise(claire))))
    expect(serialise(claire).endsWith('\n')).toBe(true)
  })

  it('résume les diagnostics en français', () => {
    expect(summarise([])).toBe('Aucun problème')
    expect(summarise([{ severity: 'blocking', path: 'a', message: '' }])).toBe('1 bloquant')
    expect(summarise([
      { severity: 'blocking', path: 'a', message: '' },
      { severity: 'blocking', path: 'b', message: '' },
      { severity: 'warning', path: 'c', message: '' },
    ])).toBe('2 bloquants, 1 à examiner')
  })
})
