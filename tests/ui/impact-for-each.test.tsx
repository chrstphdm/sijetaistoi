// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ImpactForEach } from '@/ui/components/ImpactForEach.tsx'
import { applyRule, emptyWorld, type Rule } from '@/core/world.ts'
import { characters, reforms } from '@/content/load.ts'

/**
 * « Le choix vu par chacun », avec un corpus de treize situations.
 *
 * Releve sur une CAPTURE D'ECRAN : neuf lignes sur treize affichaient la
 * phrase « aucun effet sur son budget courant » et rien d'autre.
 *
 * Ce n'etait pas un bug de calcul — les effets nuls sont la reponse exacte
 * pour une mesure qui ne concerne qu'une partie du corpus. C'etait une perte
 * de contenu : le controle de couverture du build OBLIGE l'auteur a ecrire,
 * pour chaque personne qu'une option ne touche pas, quelle portee l'exclut.
 * Cet ecran jetait ce travail et rendait treize fois la meme phrase vide,
 * donc une comparaison qui ne comparait rien.
 *
 * La garantie est verifiee ici plutot que decrite en commentaire, parce que
 * ce projet a deja trouve plusieurs garanties ecrites et non tenues.
 */

const ruleFor = (reformId: string, optionId: string): Rule => ({
  id: `${reformId}:${optionId}`,
  reformId,
  optionId,
  shortLabel: 'règle de test',
  playerWording: null,
  playerJudgement: null,
  diegeticMonth: 'juin 2027',
  status: 'in_force',
  replaces: null,
})

/** Une option dont la portee laisse volontairement des gens hors du champ. */
const CIBLEE = { reform: 'encadrement-loyers', option: 'plafonnement' } as const

/* Sans ceci, `screen` interroge aussi le DOM des tests precedents : le second
   rendu trouvait la section du premier, et l'assertion portait sur le mauvais
   ecran. Ce n'est pas automatique ici — les globals de vitest sont desactives. */
afterEach(cleanup)

describe('le choix vu par chacun', () => {
  const render13 = () => {
    const world = applyRule(emptyWorld('A'), ruleFor(CIBLEE.reform, CIBLEE.option))
    render(
      <ImpactForEach
        characters={characters}
        world={world}
        scale="slack"
        onScaleChange={() => {}}
        screenIndex={0}
      />,
    )
    return screen.getByRole('heading', { name: /vu par chacun/ }).closest('section')!
  }

  it('montre tout le corpus, et non les seuls personnages touchés', () => {
    const section = render13()
    expect(section.querySelectorAll('.impacts > li')).toHaveLength(characters.length)
  })

  it('dit POURQUOI, pour chaque personne qu’une mesure ne touche pas', () => {
    const section = render13()
    const rows = [...section.querySelectorAll('.impacts > li')]
    const nuls = rows.filter((li) => li.textContent?.includes('aucun effet sur son budget courant'))

    // La mesure choisie est ciblée : il DOIT y avoir des effets nuls, sinon
    // ce test ne vérifie rien.
    expect(nuls.length).toBeGreaterThan(0)

    for (const li of nuls) {
      const name = li.querySelector('strong')?.textContent ?? '(sans nom)'
      const portee = li.querySelector('.provenance')?.textContent ?? ''
      // Soit la portée déclarée est reprise, soit aucune règle en vigueur ne
      // concerne cette personne — et l'écran dit alors expressément que ce
      // n'est pas la même chose.
      expect(
        portee.includes('Portée déclarée') || portee.includes('Aucune des règles en vigueur'),
        `${name} : effet nul affiché sans sa portée déclarée`,
      ).toBe(true)
    }
  })

  it('reprend la portée telle que le contenu l’a écrite, sans la reformuler', () => {
    const section = render13()
    const reform = reforms.find((r) => r.id === CIBLEE.reform)!
    const option = reform.options.find((o) => o.id === CIBLEE.option)!
    const attendues = new Set(
      option.effects.filter((e) => e.kind === 'budget_line').map((e) => e.scope.description),
    )

    const affichees = [...section.querySelectorAll('.provenance')]
      .map((p) => p.textContent ?? '')
      .filter((t) => t.startsWith('Portée déclarée'))

    expect(affichees.length).toBeGreaterThan(0)
    for (const texte of affichees) {
      const citee = [...attendues].some((d) => texte.includes(d))
      expect(citee, `portée affichée absente du contenu : ${texte}`).toBe(true)
    }
  })

  it('ne répète pas deux fois la même portée', () => {
    const section = render13()
    for (const p of section.querySelectorAll('.provenance')) {
      const texte = p.textContent ?? ''
      if (!texte.startsWith('Portée déclarée')) continue
      const parts = texte.replace('Portée déclarée : ', '').replace(/\.$/, '').split(' ; ')
      expect(new Set(parts).size, `portée répétée : ${texte}`).toBe(parts.length)
    }
  })
})

/**
 * QUAND, et pas seulement COMBIEN.
 *
 * Le plafonnement des loyers n'agit qu'a la relocation : ses effets portent
 * l'horizon `y5`. L'ecran les additionnait et les presentait au present —
 * « cette somme s'ajoute sans changer ses dépenses » — pour une somme qui ne
 * s'ajoute pas avant cinq ans.
 */
describe('horizon affiché', () => {
  it('dit à partir de quand un effet différé commence', () => {
    const world = applyRule(emptyWorld('A'), ruleFor('encadrement-loyers', 'plafonnement'))
    render(
      <ImpactForEach
        characters={characters} world={world} scale="slack"
        onScaleChange={() => {}} screenIndex={0}
      />,
    )
    const section = screen.getByRole('heading', { name: /vu par chacun/ }).closest('section')!
    const rows = [...section.querySelectorAll('.impacts > li')]

    // Aucun effet de cette option n'est immédiat : TOUTES les lignes doivent
    // donc annoncer « aucun effet sur son budget courant », et celles qui
    // portent un montant doivent le dater.
    const chiffrees = rows.filter((li) => li.textContent?.includes('À partir de la'))
    expect(chiffrees.length).toBeGreaterThan(0)
    for (const li of chiffrees) {
      const name = li.querySelector('strong')?.textContent ?? '(sans nom)'
      const texte = li.textContent ?? ''
      expect(texte, `${name} : effet différé présenté au présent`)
        .toMatch(/aucun effet sur son budget courant/)
      expect(texte, `${name} : effet différé non daté`).toMatch(/À partir de la 5ᵉ année/)
    }
  })

  it('ne compte jamais un effet différé dans le montant du mois', () => {
    // La contribution énergie coûte 14 € par mois dès le premier mois aux
    // ménages en chauffage collectif, et leur rend 31 € « après rénovation
    // effective », à cinq ans. Le total affiché était +17 € : un GAIN annoncé
    // à ceux à qui la mesure coûte d'abord. L'erreur jouait dans un seul sens.
    const world = applyRule(emptyWorld('A'), ruleFor('contribution-energie', 'taxe-energie'))
    render(
      <ImpactForEach
        characters={characters} world={world} scale="euros"
        onScaleChange={() => {}} screenIndex={0}
      />,
    )
    const section = screen.getByRole('heading', { name: /vu par chacun/ }).closest('section')!
    const claire = [...section.querySelectorAll('.impacts > li')]
      .find((li) => li.querySelector('strong')?.textContent === 'Claire')!
    const texte = claire.textContent ?? ''

    // 14 € par mois en moins, maintenant.
    expect(texte).toMatch(/en moins/)
    expect(texte).toMatch(/14\u00A0€ par mois/)
    // 31 € par mois en plus, à partir de la cinquième année, et dit comme tel.
    expect(texte).toMatch(/À partir de la 5ᵉ année, ▲ \+372\u00A0€ en plus/)
    expect(texte).toMatch(/31\u00A0€ par mois/)
    // Et surtout : jamais le total de 17 €, qui mélangeait les deux.
    expect(texte).not.toMatch(/17\u00A0€ par mois/)
  })

  it('ne date rien quand l’effet est immédiat', () => {
    // La contribution énergie porte l'horizon y1 : aucune mention de date ne
    // doit apparaître, sans quoi l'avertissement perdrait son sens.
    const world = applyRule(emptyWorld('A'), ruleFor('contribution-energie', 'taxe-energie'))
    render(
      <ImpactForEach
        characters={characters} world={world} scale="slack"
        onScaleChange={() => {}} screenIndex={0}
      />,
    )
    const section = screen.getByRole('heading', { name: /vu par chacun/ }).closest('section')!
    expect(section.textContent ?? '').not.toMatch(/à partir de la \d+ᵉ année/)
  })
})
