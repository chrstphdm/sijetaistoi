import type { Violation } from './types.ts'

/**
 * Parite narrative entre personnages.
 *
 * Le schema impose deja que chacun porte une force, une vulnerabilite et une
 * opinion contraire a son interet. Mais un schema ne voit pas les
 * DESEQUILIBRES RELATIFS : un personnage dont l'histoire fait 600 signes
 * quand un autre en fait 180 recoit plus d'attention, plus d'epaisseur, et
 * donc plus d'empathie. Ce desequilibre-la est invisible fiche par fiche et
 * n'apparait qu'a l'echelle du corpus.
 */

export type ParityProfile = {
  readonly id: string
  readonly storyLength: number
  readonly strengthLength: number
  readonly vulnerabilityLength: number
  readonly detailCount: number
  readonly aspirationCount: number
  readonly concernCount: number
}

/**
 * Ecart relatif tolere entre le plus petit et le plus grand.
 *
 * 0,5 signifie que le plus long ne peut pas depasser le double du plus
 * court. Le seuil a ete cale sur le corpus reel : les ecarts observes vont
 * de 0 a 39 %, donc la regle laisse respirer la redaction tout en
 * interdisant qu'un personnage recoive deux fois plus de texte qu'un autre.
 * Un seuil qu'aucun contenu ne peut franchir ne garantit rien.
 */
export const MAX_SPREAD = 0.5

function spread(values: readonly number[]): number {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === 0) return 0
  return (max - min) / max
}

const DIMENSIONS = [
  ['storyLength', 'longueur de l’histoire'],
  ['strengthLength', 'longueur de la force'],
  ['vulnerabilityLength', 'longueur de la vulnérabilité'],
  ['detailCount', 'nombre de détails incarnés'],
  ['aspirationCount', 'nombre d’aspirations'],
  ['concernCount', 'nombre d’inquiétudes'],
] as const

export function checkNarrativeParity(profiles: readonly ParityProfile[]): readonly Violation[] {
  if (profiles.length < 2) return []
  const out: Violation[] = []

  for (const [key, label] of DIMENSIONS) {
    const values = profiles.map((p) => p[key])
    const s = spread(values)
    if (s <= MAX_SPREAD) continue

    const sorted = [...profiles].sort((a, b) => a[key] - b[key])
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    out.push({
      rule: 'parité narrative',
      severity: 'blocking',
      where: 'personnages',
      message:
        `écart de ${Math.round(s * 100)} % sur la ${label} (toléré : ${MAX_SPREAD * 100} %) — ` +
        `${low.id} ${low[key]} contre ${high.id} ${high[key]}. ` +
        `Un personnage plus détaillé reçoit plus d’empathie, ce qui est un biais que le lecteur ne perçoit pas.`,
    })
  }
  return out
}

/**
 * Equilibre de valence du corpus d'evenements.
 *
 * Un corpus fait de malheurs raconte que la vie est une suite de malheurs,
 * quelle que soit la neutralite de chaque evenement pris isolement.
 */
export const MIN_POSITIVE_SHARE = 0.2

export function checkValenceBalance(
  valences: readonly string[],
): readonly Violation[] {
  if (valences.length === 0) return []
  const positive = valences.filter((v) => v === 'positive').length
  const share = positive / valences.length
  if (share >= MIN_POSITIVE_SHARE) return []
  return [
    {
      rule: 'équilibre de valence',
      severity: 'blocking',
      where: 'événements',
      message:
        `${positive} événement(s) favorable(s) sur ${valences.length}, soit ${Math.round(share * 100)} % ` +
        `(minimum ${MIN_POSITIVE_SHARE * 100} %). Un corpus fait de malheurs raconte une thèse sur la vie, ` +
        `même si chaque événement pris isolément est neutre.`,
    },
  ]
}
