import { describe, expect, it } from 'vitest'
import {
  chi2Critical, playGame, POLICIES, rotationOrder, simulatePolicy, verdict, type PolicyId,
} from '../../scripts/simulate.ts'
import { rotationOrder as screenRotation } from '@/ui/components/ImpactForEach.tsx'
import { characters } from '@/content/load.ts'

/*
 * Version courte de `npm run simulate` : quelques centaines de parties par
 * politique, sur des graines fixes. Le rapport complet, sur dix mille
 * parties, reste l'affaire du script ; ce test garde les deux garanties qui
 * ne doivent jamais céder, à chaque `npm test`.
 */

const RUNS = 200
const reports = (Object.keys(POLICIES) as PolicyId[]).map((p) => simulatePolicy(p, RUNS, 'test'))

describe('simulateur de parties', () => {
  it('aucune partie ne viole le quota de rappels défavorables, quelle que soit la politique du joueur', () => {
    for (const r of reports) expect(r.capViolations, r.policy).toBe(0)
    expect(verdict(reports).ok).toBe(true)
  })

  it("l'adversaire omniscient fait bien céder des rappels au quota : le contrôle n'est pas vide", () => {
    const adverse = reports.find((r) => r.policy === 'adverse')!
    expect(adverse.callbackKindsByAct[2]!['quota_blocked'] ?? 0).toBeGreaterThan(0)
  })

  it('le premier tirage est uniforme parmi tous les personnages', () => {
    const r = reports[0]!
    expect(r.firstDrawChi2).toBeLessThan(chi2Critical(characters.length - 1))
    for (const c of characters) expect(r.drawsByAct[0]![c.id] ?? 0, c.id).toBeGreaterThan(0)
  })

  it('le premier tirage ne dépend pas de ce que fera le joueur', () => {
    const firsts = reports.map((r) => JSON.stringify(r.drawsByAct[0]))
    expect(new Set(firsts).size).toBe(1)
  })

  it('une partie est rejouable à l’identique depuis sa graine', () => {
    expect(playGame('rejeu', 'uniforme')).toEqual(playGame('rejeu', 'uniforme'))
  })

  it("la rotation recopiée est celle de l'écran d'impact", () => {
    for (let n = 1; n <= 15; n++)
      for (let s = 0; s <= 4; s++) expect(rotationOrder(n, s)).toEqual(screenRotation(n, s))
  })
})
