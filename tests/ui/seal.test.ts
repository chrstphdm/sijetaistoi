import { describe, expect, it } from 'vitest'
import { sealCells, sealHue } from '@/ui/components/Seal.tsx'
import { characters } from '@/content/load.ts'

const ids = characters.map((c) => c.id)

describe('sceau procédural', () => {
  it('donne à chaque personnage EXACTEMENT la même surface d’encre', () => {
    // Parité par construction, et non vérifiée après coup : aucun personnage
    // ne peut paraître plus dense, plus chaleureux ou plus présent qu'un autre.
    const counts = ids.map((id) => sealCells(id).length)
    expect(new Set(counts).size).toBe(1)
    expect(counts[0]).toBe(12)
  })

  it('produit un motif différent par personnage', () => {
    const shapes = ids.map((id) =>
      sealCells(id).map((c) => `${c.col}:${c.row}`).sort().join(','),
    )
    expect(new Set(shapes).size).toBe(ids.length)
  })

  it('est symétrique verticalement', () => {
    for (const id of ids) {
      const set = new Set(sealCells(id).map((c) => `${c.col}:${c.row}`))
      for (const cell of sealCells(id)) {
        expect(set.has(`${4 - cell.col}:${cell.row}`)).toBe(true)
      }
    }
  })

  it('est déterministe', () => {
    expect(sealCells('claire')).toEqual(sealCells('claire'))
  })

  it('attribue la teinte par rang ALPHABÉTIQUE, jamais par situation', () => {
    // Règle publiée et auditable : manifestement indépendante du revenu,
    // de l'âge ou de la situation du personnage.
    const sorted = [...ids].sort()
    const hues = sorted.map((id) => sealHue(id, ids))
    for (let i = 1; i < hues.length; i++) expect(hues[i]!).toBeGreaterThan(hues[i - 1]!)

    // Le même identifiant garde sa teinte quel que soit l'ordre d'entrée.
    expect(sealHue('claire', ids)).toBe(sealHue('claire', [...ids].reverse()))
  })

  it('n’attribue pas la teinte selon le décile de niveau de vie', () => {
    const byDecile = [...characters].sort((a, b) => a.identity.incomeDecile - b.identity.incomeDecile)
    const hues = byDecile.map((c) => sealHue(c.id, ids))
    const monotone = hues.every((h, i) => i === 0 || h > hues[i - 1]!)
    expect(monotone).toBe(false)
  })
})
