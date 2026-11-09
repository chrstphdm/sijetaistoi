// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/ui/App.tsx'

afterEach(cleanup)

type User = ReturnType<typeof userEvent.setup>

/** Traverse l'accueil et le contrat jusqu'au premier personnage. */
async function enterGame(user: User) {
  // Le bouton est répété en haut et en bas de l'accueil : on prend le premier.
  await user.click(screen.getAllByRole('button', { name: 'Commencer' })[0]!)
  await user.click(screen.getByRole('button', { name: /je commence/i }))
}

/**
 * Traverse les mois restants jusqu'à l'écran de réforme.
 * Gère les trois états possibles : options repliées, options déjà dépliées,
 * et mois sans événement.
 */
async function walkMonths(user: User) {
  for (let guard = 0; guard < 12; guard++) {
    const reveal = screen.queryByRole('button', { name: /Voir les possibilités/ })
    if (reveal) {
      await user.click(reveal)
      continue
    }
    const choose = screen.queryAllByRole('button', { name: 'Choisir' })
    if (choose.length > 0) {
      await user.click(choose[0]!)
      continue
    }
    const skip = screen.queryByRole('button', { name: /Mois suivant/ })
    if (skip) {
      await user.click(skip)
      continue
    }
    break
  }
}

/** Traverse un acte : intro, les mois, la réforme, la question, l'impact. */
async function playAct(user: User, phrase?: string) {
  await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
  await walkMonths(user)

  if (phrase) await user.type(screen.getByLabelText(/qu’est-ce qui te paraît juste/), phrase)
  await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
  await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
  await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
}

describe('accueil et contrat', () => {
  it('ouvre sur une page d’accueil, pas sur une partie déjà commencée', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Si j’étais toi' })).toBeTruthy()
    // Répété en haut et en bas : on peut jouer tout de suite ou lire d'abord.
    expect(screen.getAllByRole('button', { name: 'Commencer' })).toHaveLength(2)
    // Aucun personnage n'est imposé avant que le joueur ait accepté.
    expect(screen.queryByText(/^Tu es /)).toBeNull()
  })

  it('annonce les trois engagements AVANT la première décision', async () => {
    // C'est la pièce anti-embuscade : sans elle, découvrir trois actes plus
    // tard qu'on subit sa propre règle est un piège.
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Commencer' })[0]!)

    expect(screen.getByRole('heading', { name: /Trois choses avant de commencer/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Tu ne choisis pas qui tu es/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Ce que tu décides reste en vigueur/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Tes réponses restent sur cet appareil/ })).toBeTruthy()
  })

  it('ne lance la partie qu’après acceptation explicite', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Commencer' })[0]!)
    expect(screen.queryByText(/^Tu es /)).toBeNull()
    await user.click(screen.getByRole('button', { name: /je commence/i }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Tu es \w+/)
  })

  it('présente le personnage par des détails non économiques avant tout chiffre', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    const intro = screen.getByRole('heading', { level: 1 }).closest('section')!
    expect(intro.textContent).toMatch(/Tu es \w+/)
    expect(screen.queryByText('Relevé du mois')).toBeNull()
  })

  it('publie les règles du tirage, accessibles depuis le premier écran', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    // Replié par défaut pour ne pas encombrer l'écran de décision, mais
    // toujours présent : la transparence ne doit pas dépendre d'une page à part.
    const draw = screen
      .getByText('Comment ce jeu choisit tes personnages')
      .closest('details')!
    expect(draw.textContent).toContain('tiré au hasard')
    expect(draw.textContent).toContain(
      'jamais le personnage pour qui une décision serait la plus douloureuse',
    )
  })
})

describe('un mois vécu', () => {
  it('oblige à regarder le relevé avant de proposer les options', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

    expect(screen.getByText('Relevé du mois')).toBeTruthy()
    // Les options ne sont pas offertes d'emblée.
    expect(screen.queryByRole('button', { name: 'Choisir' })).toBeNull()
    expect(screen.getByRole('button', { name: /Voir les possibilités/ })).toBeTruthy()
  })

  it('n’affiche aucun score ni vocabulaire de réussite', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const word of ['score', 'bravo', 'réussi', 'perdu', 'gagné', 'points', 'félicitations', 'game over']) {
      expect(text).not.toContain(word)
    }
  })

  it('montre ce qui n’est pas possible pour ce personnage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    await user.click(screen.getByRole('button', { name: /Voir les possibilités/ }))
    // L'absence de choix est une donnée du modèle, pas un oubli.
    expect(screen.getByText(/Ce qui n’est pas possible pour/)).toBeTruthy()
  })
})

describe('une partie complète en trois actes', () => {
  it('se déroule jusqu’au bilan, en citant le joueur', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)

    await playAct(user, 'celui qui consomme doit payer')
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Voir le bilan/ }))

    const head = screen.getByRole('heading', { name: 'Ce que tu as décidé' }).closest('section')!
    expect(within(head).getByText('« celui qui consomme doit payer »')).toBeTruthy()
    // Trois actes, donc trois règles décidées.
    expect(within(head).getAllByRole('listitem')).toHaveLength(3)
  })

  it('incarne trois personnages différents', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await playAct(user, 'ma phrase')
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Voir le bilan/ }))

    const head = screen.getByRole('heading', { name: 'Ce que tu as décidé' }).closest('section')!
    const line = head.textContent?.match(/Tu as incarné ([^.]+)\./)?.[1] ?? ''
    expect(new Set(line.split(', ')).size).toBe(3)
  })

  it('n’affiche jamais de score ni d’étiquette politique au bilan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await playAct(user, 'ma phrase')
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await playAct(user)
    await user.click(screen.getByRole('button', { name: /Voir le bilan/ }))

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const f of ['de gauche', 'de droite', 'ton score', 'tu es plutôt']) {
      expect(text).not.toContain(f)
    }
    expect(screen.getByText(/pas réalisé/)).toBeTruthy()
  })
})

describe('registre et consultation', () => {
  it('rend les décisions relisables depuis la chronologie', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    // Aucune décision prise : rien à relire, donc rien à afficher.
    expect(screen.queryByRole('button', { name: /Revoir ta décision/ })).toBeNull()

    await playAct(user, 'ma règle')
    const toggle = screen.getByRole('button', { name: /Revoir ta décision/ })
    await user.click(toggle)
    const timeline = screen.getByRole('navigation', { name: /Où tu en es/ })
    expect(within(timeline).getByText('« ma règle »')).toBeTruthy()
  })

  it('situe le joueur en français ordinaire, sans jamais le noter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    const rail = screen.getByRole('navigation', { name: /Où tu en es/ })
    // Trois actes, chacun nommé, le premier marqué comme étape courante.
    expect(rail.textContent).toContain('Acte 1')
    expect(rail.textContent).toContain('Acte 3')
    expect(rail.querySelector('[aria-current="step"]')).toBeTruthy()
    // Aucun vocabulaire de progression chiffrée ni de jargon de conception.
    for (const w of ['%', 'progression', 'complété', 'étape 1 sur']) {
      expect(rail.textContent?.toLowerCase()).not.toContain(w)
    }
  })

  it('montre l’avancement des mois, et l’écrit pour les lecteurs d’écran', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

    const months = screen.getByRole('list', { name: /Mois vécus/ })
    expect(months.children.length).toBeGreaterThan(1)
    // L'état de chaque mois est écrit, jamais porté par la seule forme.
    expect(months.textContent).toContain('en cours')
    expect(months.textContent).toContain('à venir')
  })

  it('donne à chaque personnage un sceau, sans dessiner aucun corps', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    const seal = document.querySelector('.seal')
    expect(seal).toBeTruthy()
    expect(seal?.querySelectorAll('rect').length).toBe(12)
  })

  it('dit à chaque instant POUR QUI le joueur décide', async () => {
    // C'est la confusion la plus grave relevée en test : si la différence
    // entre décider pour son personnage et décider pour tout le monde n'est
    // pas évidente, le mécanisme central du jeu ne fonctionne plus.
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    const timeline = () => screen.getByRole('navigation', { name: /Où tu en es/ })

    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    expect(timeline().textContent).toMatch(/tu décides pour \w+/)
    expect(screen.getByText('Décision personnelle')).toBeTruthy()
    expect(screen.getByText(/n’engage que .* ce mois-ci/)).toBeTruthy()

    await walkMonths(user)

    expect(timeline().textContent).toContain('tu décides pour tout le monde')
    expect(screen.getByText('Décision collective')).toBeTruthy()
    expect(screen.getByText(/devient une règle pour/)).toBeTruthy()
  })

  it('marque CHAQUE option, pas seulement le haut de l’écran', async () => {
    // Relevé en test sur « Financer le programme par l'emprunt » : arrivé
    // aux options, le joueur a perdu le bandeau de vue.
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    await user.click(screen.getByRole('button', { name: /Voir les possibilités/ }))

    const personalCards = document.querySelectorAll('.option--personal')
    expect(personalCards.length).toBeGreaterThan(1)
    expect(screen.getAllByText(/Engage .* seulement/).length).toBe(personalCards.length)

    await walkMonths(user)

    const collectiveCards = document.querySelectorAll('.option--collective')
    expect(collectiveCards.length).toBeGreaterThan(1)
    expect(screen.getAllByText('Engage tout le monde').length).toBe(collectiveCards.length)
  })

  it('toutes les options d’un même écran portent le MÊME marqueur', async () => {
    // Un marqueur qui varierait d'une option à l'autre introduirait une
    // hiérarchie entre elles. Il distingue des types d'écran, jamais des
    // options entre elles.
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    await user.click(screen.getByRole('button', { name: /Voir les possibilités/ }))

    const marks = [...document.querySelectorAll('.option .mark')].map((m) => m.className)
    expect(new Set(marks).size).toBe(1)
  })

  it('permet de consulter les autres personnages sans y inciter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await enterGame(user)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    await walkMonths(user)
    // Accessible, mais replié : la consultation est possible sans être incitée.
    const others = screen.getByText('Consulter les autres personnages').closest('details')!
    expect(others.open).toBe(false)
    await user.click(within(others).getByText('Consulter les autres personnages'))
    expect(others.textContent).toMatch(/Claire|Marc et Anne|Yanis|Michèle/)
  })
})

describe('page méthode', () => {
  it('est accessible depuis le jeu et expose la partialité résiduelle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Comment ce jeu est construit/ }))

    expect(screen.getByRole('heading', { level: 1, name: /Comment ce jeu est construit/ })).toBeTruthy()
    // Le cœur du dispositif : dire ce qu'on ne parvient PAS à éviter.
    expect(screen.getByRole('heading', { name: /ne parvient pas à éviter/ })).toBeTruthy()
    expect(screen.getByText(/Le cadrage lui-même/)).toBeTruthy()
    expect(screen.getByText(/Le choix du dénominateur/)).toBeTruthy()
  })

  it('affiche les règles telles qu’elles sont réellement appliquées', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Comment ce jeu est construit/ }))

    // Ces valeurs sont lues dans le code, pas recopiées : une page méthode
    // qui dérive de ce que le programme fait serait pire que pas de page.
    const rules = screen.getByRole('heading', { name: /telles qu’elles sont réellement appliquées/ })
      .closest('section')!
    expect(rules.textContent).toContain('2 %')
    expect(rules.textContent).toContain('400 ms')
    expect(rules.textContent).toContain('150 € par mois')
    expect(rules.textContent).toContain('1.0.0')
  })

  it('nomme les deux lectures de chaque hypothèse contestée', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Comment ce jeu est construit/ }))

    const hypo = screen.getByRole('heading', { name: /hypothèses contestées/ }).closest('section')!
    expect(within(hypo).getAllByText(/Lecture A/).length).toBeGreaterThan(0)
    expect(within(hypo).getAllByText(/Lecture B/).length)
      .toBe(within(hypo).getAllByText(/Lecture A/).length)
  })

  it('déclare que rien ne quitte l’appareil', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Comment ce jeu est construit/ }))
    expect(screen.getByText(/ne sont transmis à aucun serveur/)).toBeTruthy()
    expect(screen.getByText(/ne constitue pas un avis juridique/)).toBeTruthy()
  })

  it('permet de revenir au jeu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Comment ce jeu est construit/ }))
    await user.click(screen.getByRole('button', { name: 'Revenir au jeu' }))
    // On revient à l'endroit d'où l'on vient : l'accueil.
    expect(screen.getAllByRole('button', { name: 'Commencer' }).length).toBeGreaterThan(0)
  })
})

describe('page d’accueil visuelle', () => {
  it('montre la boucle en schéma ET en texte', async () => {
    render(<App />)
    // Un schéma ne porte jamais seul une information : la liste dit la même
    // chose, et c'est elle que lit un lecteur d'écran sur petit écran.
    const figure = document.querySelector('figure.loop')!
    expect(figure).toBeTruthy()
    expect(figure.querySelector('svg')?.getAttribute('aria-label')).toContain('cinq temps')
    expect(figure.querySelectorAll('.loop__list li')).toHaveLength(5)
  })

  it('présente les six personnages avec un sceau de densité identique', () => {
    render(<App />)
    const cast = screen.getByRole('heading', { name: /six personnes/ }).closest('section')!
    const seals = cast.querySelectorAll('.seal')
    expect(seals).toHaveLength(6)
    // Même nombre de cases pour chacun : aucun ne paraît plus présent.
    const counts = [...seals].map((s) => s.querySelectorAll('rect').length)
    expect(new Set(counts).size).toBe(1)
  })

  it('laisse essayer le sélecteur d’échelle avant de commencer', async () => {
    const user = userEvent.setup()
    render(<App />)
    const demo = screen.getByRole('heading', { name: /quatre mesures/ }).closest('section')!

    const order = () => [...demo.querySelectorAll('.demo__name')].map((n) => n.textContent)
    const enEuros = order()

    await user.click(within(demo).getByRole('button', { name: 'en % du reste à vivre' }))
    const enReste = order()

    // C'est tout le propos : la même somme, un classement différent.
    expect(enReste).not.toEqual(enEuros)
    expect(new Set(enReste)).toEqual(new Set(enEuros))
  })

  it('ne présente aucune échelle comme la bonne', async () => {
    const user = userEvent.setup()
    render(<App />)
    const demo = screen.getByRole('heading', { name: /quatre mesures/ }).closest('section')!

    // Une seule est active à la fois, et le texte dit que le choix est une position.
    const pressed = [...demo.querySelectorAll('[aria-pressed="true"]')]
    expect(pressed).toHaveLength(1)
    expect(demo.textContent).toContain('Choisir le dénominateur, c’est déjà choisir ce qui compte')

    await user.click(within(demo).getByRole('button', { name: 'en jours de dépenses' }))
    expect(demo.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1)
  })

  it('les barres emploient une seule couleur, l’identité étant portée par le nom', () => {
    render(<App />)
    const fills = [...document.querySelectorAll('.demo__fill')]
    expect(fills.length).toBe(6)
    // Une seule série : les barres comparent une grandeur, pas des identités.
    const classes = new Set(fills.map((f) => f.className))
    expect(classes.size).toBe(1)
    expect(document.querySelectorAll('.demo__name')).toHaveLength(6)
  })
})
