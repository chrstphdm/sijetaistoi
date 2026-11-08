import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { motionFor, type MotionParams } from '@/motion/table.ts'

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../src/motion/${rel}`, import.meta.url)), 'utf8')

/** Le code seul, commentaires retires : on teste ce qui s'execute, pas ce qui s'explique. */
const codeOf = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

/**
 * Ces tests ne verifient PAS la symetrie : elle est un theoreme, garanti par
 * le Math.abs unique de `ratio`. Ils verifient que ce point n'a pas ete
 * contourne par une modification ulterieure — c'est-a-dire qu'on n'a pas
 * introduit dans la couche de motion une dependance a l'identite, a l'opinion
 * ou au signe.
 */
describe('R2 — cecite au personnage, a la mesure et a l opinion', () => {
  const FORBIDDEN = [
    'characterId', 'character_id', 'personnage',
    'measureId', 'reformId', 'reform',
    'playerOpinion', 'opinion', 'playerVote', 'vote', 'judgement',
    'actIndex', 'turnIndex', 'seed', 'eventKind', 'valence',
  ]

  it('la couche de motion ne mentionne jamais une entree interdite', () => {
    // On ignore les commentaires : ils expliquent justement ce qui est interdit.
    const code = codeOf('intensity.ts') + codeOf('table.ts')
    for (const token of FORBIDDEN) {
      expect(code, `"${token}" ne doit pas apparaitre dans le code de motion`).not.toContain(token)
    }
  })

  it('le Math.abs unique de ratio() est toujours present', () => {
    const code = codeOf('intensity.ts')
    expect(code).toContain('Math.abs(i.amountCents)')
    // Un seul endroit detruit le signe. S'il y en avait deux, l'un pourrait
    // etre contourne sans que les tests de symetrie le voient.
    expect(code.match(/Math\.abs/g)?.length).toBe(1)
  })

  it('aucune dimension de mise en scene interdite n existe dans le type', () => {
    const forbiddenParams = [
      'sign', 'direction', 'colour', 'color', 'sound', 'haptics',
      'modal', 'scrim', 'fullscreen', 'blocksInput', 'shake',
      'overshoot', 'scale', 'loop', 'blur', 'delay',
    ]
    const params: MotionParams = motionFor({
      amountCents: -180_000,
      netIncomeCents: 164_000,
      slackCents: 33_500,
      scale: 'slack',
    })
    for (const key of forbiddenParams) {
      expect(Object.keys(params)).not.toContain(key)
    }
  })

  it('des proprietes superflues passees a la fonction ne changent rien', () => {
    const base = {
      amountCents: -180_000,
      netIncomeCents: 164_000,
      slackCents: 33_500,
      scale: 'slack',
    } as const
    const pollue = { ...base, characterId: 'claire', playerOpinion: 'non' }
    // Le type n'expose pas ces champs ; on verifie qu'a l'execution non plus
    // ils n'ont aucun effet, meme si quelqu'un les passait en contournant TS.
    expect(motionFor(pollue)).toEqual(motionFor(base))
  })
})
