import { describe, expect, it } from 'vitest'
import { REGIME } from '@/core/impact.ts'
import { formatDays, formatMetric, formatShare, regimeSentence } from '@/core/phrasing.ts'

describe('phrases d’impact', () => {
  it('ne décrit jamais un gain comme un coût', () => {
    // Relevé sur une capture : « cette somme est absorbé sans toucher aux
    // dépenses » pour un gain de 10 €. Accord faux, et sens faux.
    const gain = regimeSentence(REGIME.ABSORBED, 1000)
    expect(gain).not.toContain('couverte')
    expect(gain).toContain('s’ajoute')
  })

  it('garde des formulations parallèles entre gain et perte', () => {
    // Deux jeux de phrases écrits séparément divergent, et la divergence
    // raconte quelque chose. Ils doivent rester de même facture.
    for (const r of Object.values(REGIME)) {
      const loss = regimeSentence(r, -1000)
      const gain = regimeSentence(r, 1000)
      const ratio = loss.length / gain.length
      expect(ratio, `palier ${r}`).toBeLessThan(1.8)
      expect(ratio, `palier ${r}`).toBeGreaterThan(0.55)
      // Aucun des deux ne porte de qualificatif affectif.
      for (const word of ['heureusement', 'malheureusement', 'hélas', 'enfin', 'seulement']) {
        expect(loss.toLowerCase()).not.toContain(word)
        expect(gain.toLowerCase()).not.toContain(word)
      }
    }
  })

  it('traite les deux signes au même palier imperceptible', () => {
    expect(regimeSentence(REGIME.IMPERCEPTIBLE, 10)).toBe(
      regimeSentence(REGIME.IMPERCEPTIBLE, -10),
    )
  })
})

describe('formats français', () => {
  it('emploie la virgule décimale', () => {
    expect(formatShare(0.051)).toBe('5,1 %')
    expect(formatDays(2.5)).toBe('2,5 jours')
  })

  it('refuse la fausse précision plutôt que d’écrire zéro', () => {
    // « 0,0 % » se lit comme zéro alors que la valeur ne l'est pas.
    expect(formatShare(0.0004)).toBe('moins de 0,1 %')
    expect(formatShare(0)).toBe('0,0 %')
  })

  it('accorde le pluriel des jours', () => {
    expect(formatDays(1.4)).toContain('jour')
    expect(formatDays(1.4)).not.toContain('jours')
    expect(formatDays(2)).toContain('jours')
  })

  it('formate chaque échelle dans son unité', () => {
    const m = { euros: 100, income: 0.023, slack: 0.31, days: 3.2 }
    expect(formatMetric('euros', m)).toBe('100 €')
    expect(formatMetric('income', m)).toBe('2,3 %')
    expect(formatMetric('slack', m)).toBe('31,0 %')
    expect(formatMetric('days', m)).toBe('3,2 jours')
  })
})
