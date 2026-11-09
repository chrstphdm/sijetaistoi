import { describe, expect, it } from 'vitest'
import { characters, optionLookup, toBudgetLines, traitsOf } from '@/content/load.ts'
import { activeEffectsFor, applyEffectsToLines, applyRule, emptyWorld, type Rule } from '@/core/world.ts'

const who = (id: string) => characters.find((c) => c.id === id)!

const rule = (reformId: string, optionId: string): Rule => ({
  id: 'r1', reformId, optionId, shortLabel: optionId, playerWording: null,
  playerJudgement: null, diegeticMonth: 'mars 2027', replaces: null, status: 'in_force',
})

/** Variation mensuelle totale, en euros, d'un poste donné pour un personnage. */
const delta = (reformId: string, optionId: string, charId: string, code?: string) => {
  const world = applyRule(emptyWorld('A'), rule(reformId, optionId))
  return activeEffectsFor(world, traitsOf(who(charId)), optionLookup)
    .filter((e) => code === undefined || e.effect.code === code)
    .reduce((s, e) => s + e.deltaCents, 0) / 100
}

const lineOf = (charId: string, code: string) =>
  Math.abs(toBudgetLines(who(charId)).find((l) => l.code === code)?.amountCents ?? 0) / 100

describe('des contributions proportionnelles', () => {
  it('ne fait pas payer à Yanis la même cotisation qu’à Rachid', () => {
    // 42 € pour tous les salariés : 11 % du salaire de Yanis, 0,8 % de celui de Rachid.
    const yanis = delta('age-retraite', 'cotisation-relevee', 'yanis')
    const rachid = delta('age-retraite', 'cotisation-relevee', 'rachid')
    expect(yanis / lineOf('yanis', 'salaire-net')).toBeCloseTo(rachid / lineOf('rachid', 'salaire-net'), 3)
    expect(Math.abs(rachid)).toBeGreaterThan(Math.abs(yanis) * 10)
  })

  it('proportionne une hausse du salaire minimum aux heures travaillées', () => {
    expect(delta('salaire-minimum', 'hausse-brut', 'yanis')).toBeCloseTo(lineOf('yanis', 'salaire-net') * 0.1, 0)
  })

  it('fait cotiser le conjoint salarié d’un indépendant, pas le revenu absent d’un autre', () => {
    // Thomas est indépendant ; le salaire du foyer est celui de son conjoint.
    expect(delta('age-retraite', 'cotisation-relevee', 'thomas', 'salaire-net')).toBeLessThan(0)
    // Bérangère n'a pas de salaire : aucune ligne fantôme.
    const world = applyRule(emptyWorld('A'), rule('financement-dependance', 'cotisation-universelle'))
    const lines = applyEffectsToLines(
      toBudgetLines(who('berangere')),
      activeEffectsFor(world, traitsOf(who('berangere')), optionLookup),
    )
    expect(lines.find((l) => l.code === 'salaire-net')).toBeUndefined()
  })
})

describe('aucun revenu fantôme', () => {
  it('ne rend jamais plus qu’on ne dépense', () => {
    // La gratuité rendait 85 € à Yanis, qui en dépense 35.
    for (const c of characters) {
      const gain = delta('gratuite-transports', 'gratuite-totale', c.id, 'transport')
      expect(gain, c.id).toBeLessThanOrEqual(lineOf(c.id, 'transport') + 0.001)
    }
  })

  it('ne transforme pas une baisse d’impôt en recette chez qui n’en paie pas', () => {
    for (const c of characters.filter((x) => lineOf(x.id, 'impots') === 0)) {
      const world = applyRule(emptyWorld('A'), rule('enseignement-superieur', 'frais-inscription'))
      const lines = applyEffectsToLines(toBudgetLines(c), activeEffectsFor(world, traitsOf(c), optionLookup))
      const impots = lines.find((l) => l.code === 'impots')
      expect(impots?.amountCents ?? 0, c.id).toBeLessThanOrEqual(0)
    }
  })
})

describe('des portées cohérentes', () => {
  it('ne fait pas porter la pénibilité à vingt ans', () => {
    expect(delta('age-retraite', 'age-recule', 'yanis')).toBe(0)
  })

  it('épargne au statu quo des soins une personne en affection de longue durée', () => {
    expect(delta('tva-taux-reduit', 'statu-quo', 'lucie', 'sante')).toBe(0)
    expect(delta('tva-taux-reduit', 'statu-quo', 'michele', 'sante')).toBeLessThan(0)
  })

  it('ne présente pas le maintien d’un remboursement comme un gain', () => {
    for (const c of characters) expect(delta('tva-taux-reduit', 'hausse-uniforme', c.id, 'sante'), c.id).toBe(0)
  })
})
