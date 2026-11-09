import { describe, expect, it } from 'vitest'
import { characters, events, toBudgetLines, traitsOf } from '@/content/load.ts'
import { evaluate, type Condition } from '@/core/conditions.ts'
import { isMeaningful, resolveEvent } from '@/core/eventResolve.ts'

const who = (id: string) => characters.find((c) => c.id === id)!
const ev = (id: string) => events.find((e) => e.id === id)!
const resolved = (eventId: string, charId: string) => {
  const c = who(charId)
  return resolveEvent(ev(eventId), toBudgetLines(c), traitsOf(c))
}
const rentOf = (charId: string) =>
  Math.abs(toBudgetLines(who(charId)).find((l) => l.code === 'logement')!.amountCents) / 100

describe('montants proportionnels à la situation', () => {
  it('révise un loyer en proportion du loyer, pas d’un montant unique', () => {
    // 34 € pour tous valaient 10 % du loyer de Lucie et 2 % de celui de Rachid.
    const lucie = resolved('hausse-loyer', 'lucie')
    const rachid = resolved('hausse-loyer', 'rachid')
    expect(lucie.cost.amount).toBe(Math.round(rentOf('lucie') * 0.03))
    expect(rachid.cost.amount).toBe(Math.round(rentOf('rachid') * 0.03))
    for (const id of ['lucie', 'rachid', 'claire', 'yanis']) {
      const share = resolved('hausse-loyer', id).cost.amount / rentOf(id)
      expect(share, id).toBeLessThanOrEqual(0.035 + 0.005)
    }
  })

  it('écrit dans le texte le montant calculé, et jamais un chiffre fixe', () => {
    const r = resolved('hausse-loyer', 'lucie')
    expect(r.text).not.toContain('{montant}')
    expect(r.text).toContain(`${r.cost.amount} €`)
  })

  it('applique aux effets le même calcul qu’au coût annoncé', () => {
    const r = resolved('hausse-loyer', 'rachid')
    const accept = r.options.find((o) => o.id === 'accepter')!
    expect(accept.effects[0]).toMatchObject({ amount: r.cost.amount })
  })

  it('ne fait pas porter à une salariée l’arrêt maladie sur le revenu de son conjoint', () => {
    // Les lignes sont celles du foyer : Sophie est salariée, le revenu
    // indépendant du foyer n'est pas le sien.
    const sophie = who('sophie')
    const salary = toBudgetLines(sophie).find((l) => l.code === 'salaire-net')!.amountCents / 100
    expect(resolved('arret-maladie', 'sophie').cost.amount).toBe(Math.round(salary * 0.12))
  })
})

describe('conditions d’option', () => {
  it('ne propose pas de rembourser un crédit à qui n’en a pas', () => {
    // `availableIf` existait dans le schéma et n'était lu nulle part.
    const rachid = resolved('prime', 'rachid')
    expect(rachid.options.map((o) => o.id)).not.toContain('rembourser')
    const claire = resolved('prime', 'claire')
    expect(claire.options.map((o) => o.id)).toContain('rembourser')
  })
})

describe('éligibilité cohérente', () => {
  const eligible = (eventId: string, charId: string) =>
    evaluate(ev(eventId).eligibility as Condition, { ...traitsOf(who(charId)), month: 4, year: 2027 })

  it('ne fait pas payer la chaudière à un locataire', () => {
    for (const c of characters.filter((x) => x.traits.tenure.startsWith('tenant')))
      expect(eligible('chaudiere', c.id), c.id).toBe(false)
  })

  it('ne parle de voiture qu’à qui en a une', () => {
    for (const c of characters) expect(eligible('voiture', c.id), c.id).toBe(c.traits.hasCar)
  })

  it('n’arrête pour maladie que qui a un revenu d’activité', () => {
    expect(eligible('arret-maladie', 'michele')).toBe(false)
    expect(eligible('arret-maladie', 'lucie')).toBe(false)
    expect(eligible('arret-maladie', 'patrick')).toBe(false)
  })

  it('laisse à chaque personnage assez d’événements pour un acte entier', () => {
    for (const c of characters) {
      const traits = { ...traitsOf(c), month: 4, year: 2027 }
      const usable = events.filter(
        (e) => evaluate(e.eligibility as Condition, traits) && isMeaningful(resolveEvent(e, toBudgetLines(c), traits)),
      )
      expect(usable.length, c.id).toBeGreaterThanOrEqual(3)
    }
  })
})
