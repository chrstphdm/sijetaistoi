/**
 * Aleatoire deterministe, a QUATRE FLUX NOMMES ET INDEPENDANTS.
 *
 * Pourquoi quatre et pas un : avec un flux unique, ajouter une randomisation
 * de PRESENTATION (l'ordre des options a l'ecran) deplacerait tous les
 * tirages suivants et changerait le CONTENU tire — les evenements, les
 * personnages. Une partie ne serait plus rejouable, et aucun test de
 * reference ne survivrait a l'ajout d'un evenement.
 *
 * Les flux sont donc separes par usage, chacun derive de la meme graine mais
 * avance independamment.
 */

export const STREAMS = ['events', 'characters', 'presentation', 'hypotheses'] as const
export type StreamName = (typeof STREAMS)[number]

/** Hachage de chaine vers un entier 32 bits (xmur3). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** Generateur mulberry32 : rapide, deterministe, suffisant pour du tirage de jeu. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Stream = {
  /** Flottant dans [0, 1). */
  next(): number
  /** Entier dans [0, max). */
  int(max: number): number
  /** Un element, ou undefined si la liste est vide. */
  pick<T>(items: readonly T[]): T | undefined
  /** Copie melangee, sans modifier l'original. */
  shuffle<T>(items: readonly T[]): T[]
  /** Nombre de tirages effectues : sert a journaliser et a auditer. */
  readonly draws: number
}

function makeStream(seed: string, name: StreamName): Stream {
  const rand = mulberry32(xmur3(`${seed}::${name}`)())
  let draws = 0
  const next = () => {
    draws++
    return rand()
  }
  return {
    next,
    int: (max) => (max <= 0 ? 0 : Math.floor(next() * max)),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    shuffle: (items) => {
      const out = [...items]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j]!, out[i]!]
      }
      return out
    },
    get draws() {
      return draws
    },
  }
}

export type RandomSource = Readonly<Record<StreamName, Stream>>

export function createRandom(seed: string): RandomSource {
  return Object.fromEntries(STREAMS.map((n) => [n, makeStream(seed, n)])) as RandomSource
}

/** Nombre de tirages consommes par chaque flux. */
export type DrawCounts = Partial<Record<StreamName, number>>

export const drawCounts = (random: RandomSource): DrawCounts =>
  Object.fromEntries(STREAMS.map((n) => [n, random[n].draws])) as DrawCounts

/**
 * Avance les flux jusqu'a une position deja atteinte.
 *
 * C'est ce qui rend une partie RECHARGEE identique a une partie ininterrompue.
 * Sans cela, relire une sauvegarde repartirait de flux neufs : le personnage
 * tire a l'acte suivant ne serait pas celui qu'une partie non interrompue
 * aurait donne, et la promesse « meme graine, meme partie » tomberait des le
 * premier rechargement — sans que rien ne le signale.
 *
 * Avancer est exact parce que mulberry32 est un generateur a etat unique : la
 * n-ieme valeur ne depend que de n et de la graine.
 */
export function advance(random: RandomSource, counts: DrawCounts): void {
  for (const name of STREAMS) {
    const target = counts[name] ?? 0
    for (let i = random[name].draws; i < target; i++) random[name].next()
  }
}
