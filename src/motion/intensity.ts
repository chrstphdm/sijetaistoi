/**
 * SPEC PUBLIQUE VERSIONNEE — grammaire d'animation neutre.
 *
 * Toute modification de ce fichier exige une revue et une montee de version,
 * parce qu'il decide de la mise en scene de tous les chiffres du jeu.
 *
 * ----------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE
 *
 * L'animation est un moyen de persuasion. Duree, amplitude, delai, ordre,
 * couleur, son et obligation de cliquer sont des figures de rhetorique.
 * Un jeu qui met en scene une panne de chaudiere et affiche un heritage en
 * texte plat raconte une these sans l'ecrire.
 *
 * La reponse n'est pas de renoncer a animer — une neutralite obtenue par
 * l'appauvrissement trahirait l'objet du jeu, qui est de faire RESSENTIR ce
 * qu'un montant represente pour quelqu'un. La reponse est de rendre la
 * mise en scene fonction d'une grandeur objective, declaree, et de rendre
 * STRUCTURELLEMENT IMPOSSIBLE d'y faire entrer autre chose.
 * ----------------------------------------------------------------------
 */
export const MOTION_SPEC_VERSION = '1.0.0'

export type Scale = 'euros' | 'income' | 'slack'

/** Palier d'intensite. Discret et saturant : jamais une rampe continue. */
export type Level = 0 | 1 | 2 | 3 | 4

/**
 * Entrees AUTORISEES.
 *
 * N'apparaissent volontairement PAS, et ne doivent jamais etre ajoutees :
 *   characterId, measureId, reformId, playerOpinion, playerVote,
 *   actIndex, turnIndex, seed, eventKind.
 *
 * L'absence de parametre est la garantie : on ne peut pas biaiser avec ce
 * qu'on ne recoit pas. C'est une propriete du TYPE, pas une discipline
 * d'equipe.
 */
export interface ShockInput {
  /** Signe : +160000 pour un heritage, -180000 pour une chaudiere. */
  readonly amountCents: number
  readonly netIncomeCents: number
  /** Reste a vivre mensuel habituel. */
  readonly slackCents: number
  readonly scale: Scale
}

/** Plancher anti-explosion du denominateur, en centimes. PUBLIE. */
export const DENOMINATOR_FLOOR_CENTS = 15_000

/** Etalon de l'echelle « euros », en centimes. PUBLIE. */
export const REFERENCE_EUROS_CENTS = 200_000

/** Bornes des cinq paliers. PUBLIEES. */
export const THRESHOLDS = [0.02, 0.08, 0.2, 0.5] as const

export function ratio(i: ShockInput): number {
  // ----------------------------------------------------------------
  // LE SIGNE EST DETRUIT ICI, EN UN POINT UNIQUE.
  // C'est ce qui rend la symetrie gain/perte demontrable plutot que
  // seulement testee. Ne jamais retirer ce Math.abs, ne jamais ajouter
  // de branche sur le signe en amont.
  // ----------------------------------------------------------------
  const magnitude = Math.abs(i.amountCents)

  const raw =
    i.scale === 'euros'
      ? REFERENCE_EUROS_CENTS
      : i.scale === 'income'
        ? i.netIncomeCents
        : i.slackCents

  return magnitude / Math.max(raw, DENOMINATOR_FLOOR_CENTS)
}

export function intensity(i: ShockInput): Level {
  const r = ratio(i)
  let level = 0
  for (const t of THRESHOLDS) if (r >= t) level++
  return level as Level
}
