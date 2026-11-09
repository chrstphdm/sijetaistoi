import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
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

describe('la couleur du sceau est décorative, jamais porteuse d’identité', () => {
  it('le motif seul distingue déjà les personnages', () => {
    // Six teintes à luminance égale sont indistinguables en vision deutan :
    // mesuré à ΔE 0,9 pour un seuil de 8. La séparation repose donc sur le
    // motif et sur le prénom, jamais sur la couleur.
    const shapes = ids.map((id) =>
      sealCells(id).map((c) => `${c.col}:${c.row}`).sort().join(','),
    )
    expect(new Set(shapes).size).toBe(ids.length)
  })

  it('toutes les teintes gardent la même luminance et le même chroma', () => {
    // C'est la parité : aucun personnage ne peut paraître plus présent.
    // Elle est incompatible avec la séparation daltonienne, et on l'assume.
    const css = readFileSync(
      fileURLToPath(new URL('../../src/ui/styles/base.css', import.meta.url)),
      'utf8',
    )
    const fills = [...css.matchAll(/fill:\s*oklch\(([\d.]+)\s+([\d.]+)\s+var\(--seal-hue\)\)/g)]
    expect(fills.length).toBeGreaterThan(0)
    for (const f of fills) {
      // Seule la teinte varie : L et C sont des littéraux, pas des variables.
      expect(Number(f[1])).toBeGreaterThan(0)
      expect(Number(f[2])).toBeGreaterThan(0)
    }
  })
})
