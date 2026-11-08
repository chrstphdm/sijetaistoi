import { intensity, type Level, type ShockInput } from './intensity.ts'

/** Courbe decelerante SANS depassement. Une seule pour tout le produit. */
export const EASING_ENTER = 'cubic-bezier(0.2, 0, 0, 1)'

/**
 * Le compteur est LINEAIRE, volontairement.
 * Une courbe decelerante ferait « atterrir » le chiffre, c'est-a-dire le
 * dramatiserait. Un montant n'a pas de chute.
 */
export const EASING_COUNT = 'linear'

/**
 * Les SEULS parametres de mise en scene du jeu.
 *
 * Remarquer ce que ce type ne contient pas, et ne doit jamais contenir :
 * sign, direction, colour, sound, haptics, modal, scrim, fullscreen,
 * blocksInput, shake, overshoot, scale, loop, blur, delay.
 * Ces dimensions n'existent pas, donc elles ne peuvent pas etre asymetriques.
 */
export interface MotionParams {
  readonly enterMs: number
  readonly easing: string
  /** Translation VERS LE HAUT, de +N px vers 0. Identique gain et perte. */
  readonly translatePx: number
  readonly opacityFrom: 0
  /** Duree du compteur, de la valeur PRECEDENTE a la nouvelle. Jamais de zero. */
  readonly countUpMs: number
  readonly countEasing: string
}

export const MOTION_TABLE: Readonly<Record<Level, MotionParams>> = {
  0: { enterMs: 0,   easing: EASING_ENTER, translatePx: 0,  opacityFrom: 0, countUpMs: 0,   countEasing: EASING_COUNT },
  1: { enterMs: 180, easing: EASING_ENTER, translatePx: 4,  opacityFrom: 0, countUpMs: 200, countEasing: EASING_COUNT },
  2: { enterMs: 240, easing: EASING_ENTER, translatePx: 6,  opacityFrom: 0, countUpMs: 400, countEasing: EASING_COUNT },
  3: { enterMs: 320, easing: EASING_ENTER, translatePx: 10, opacityFrom: 0, countUpMs: 600, countEasing: EASING_COUNT },
  4: { enterMs: 400, easing: EASING_ENTER, translatePx: 14, opacityFrom: 0, countUpMs: 800, countEasing: EASING_COUNT },
}

/** Bornes dures, assertees en integration continue. */
export const MOTION_BOUNDS = {
  maxEnterMs: 400,
  maxCountUpMs: 800,
  maxTotalMs: 1200,
  maxTranslatePx: 14,
} as const

/**
 * THEOREME, par construction et non par test :
 *   pour tout a, motionFor({...ctx, amountCents: +a}) === motionFor({...ctx, amountCents: -a})
 * puisque `ratio` n'utilise `amountCents` qu'a travers Math.abs.
 *
 * Les tests ne verifient donc pas la symetrie : ils verifient que ce point
 * unique n'a pas ete contourne par une modification ulterieure.
 */
export function motionFor(i: ShockInput): MotionParams {
  return MOTION_TABLE[intensity(i)]
}

/**
 * prefers-reduced-motion: reduce.
 * Toutes les durees a zero, compteur rendu directement a sa valeur finale.
 * AUCUNE information n'est portee par le mouvement seul, donc aucune perte.
 */
export function reducedMotion(params: MotionParams): MotionParams {
  return { ...params, enterMs: 0, translatePx: 0, countUpMs: 0 }
}
