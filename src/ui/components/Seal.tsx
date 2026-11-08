/**
 * Sceau procedural : l'identite visuelle d'un personnage, sans aucun corps.
 *
 * Deux agents de direction artistique ont conclu independamment qu'il ne
 * fallait dessiner aucun corps humain : tout corps encode vetement, teint,
 * corpulence, posture, decor — autant de vecteurs de stereotype qu'on ne
 * peut pas neutraliser. Un portrait est une caricature en puissance.
 *
 * PARITE PAR CONSTRUCTION, et non verifiee apres coup.
 *
 * La grille fait 5x5 et possede une symetrie verticale, donc seules trois
 * colonnes sont libres. Le NOMBRE de cases remplies par colonne est FIXE et
 * identique pour tous : seules leurs POSITIONS varient. La surface d'encre
 * est donc rigoureusement la meme pour chaque personnage — aucun ne peut
 * paraitre plus dense, plus chaleureux ou plus present qu'un autre.
 *
 * La teinte est attribuee par ordre ALPHABETIQUE d'identifiant, jamais par
 * revenu, age ou situation. Regle publiee, auditable, et manifestement
 * independante de ce que le personnage represente.
 */

/** Cases remplies par colonne. Somme d'encre : 2*2 + 3*2 + 2 = 12, pour tous. */
const PER_COLUMN = [2, 3, 2] as const

const GRID = 5
const FREE_COLUMNS = 3

/** Hachage deterministe d'une chaine. N'utilise pas l'aleatoire de la partie. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Choisit `count` positions distinctes parmi `GRID`, de facon deterministe. */
function positions(seed: number, count: number): readonly number[] {
  const pool = Array.from({ length: GRID }, (_, i) => i)
  const out: number[] = []
  let h = seed || 1
  for (let k = 0; k < count; k++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const [picked] = pool.splice(h % pool.length, 1)
    out.push(picked!)
  }
  return out.sort((a, b) => a - b)
}

export type SealCell = { readonly col: number; readonly row: number }

/** Cases remplies du sceau, mirroir compris. Exportee pour les tests. */
export function sealCells(id: string): readonly SealCell[] {
  const base = hash(id)
  const cells: SealCell[] = []
  for (let col = 0; col < FREE_COLUMNS; col++) {
    for (const row of positions(base + col * 7919, PER_COLUMN[col]!)) {
      cells.push({ col, row })
      // Colonnes 0 et 1 sont mises en miroir ; la colonne 2 est l'axe.
      if (col < 2) cells.push({ col: GRID - 1 - col, row })
    }
  }
  return cells
}

/** Teinte attribuee par rang alphabetique, jamais par situation. */
export function sealHue(id: string, allIds: readonly string[]): number {
  const rank = [...allIds].sort().indexOf(id)
  const n = Math.max(1, allIds.length)
  return Math.round((rank / n) * 360)
}

export function Seal({
  id, allIds, size = 36, label,
}: {
  readonly id: string
  readonly allIds: readonly string[]
  readonly size?: number
  readonly label?: string
}) {
  const cells = sealCells(id)
  const hue = sealHue(id, allIds)
  const unit = size / GRID

  return (
    <svg
      className="seal"
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ ['--seal-hue' as string]: hue }}
    >
      {cells.map((c) => (
        <rect
          key={`${c.col}-${c.row}`}
          x={c.col} y={c.row} width={1} height={1}
          rx={0.18}
        />
      ))}
      <desc>Motif abstrait, identique en densité pour tous les personnages.</desc>
      {unit > 0 && null}
    </svg>
  )
}
