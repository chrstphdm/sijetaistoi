// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/ui/App.tsx'

afterEach(cleanup)

describe('boucle : vivre, décider, voir les conséquences', () => {
  it('présente le personnage et son relevé', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Claire')
    expect(screen.getByText('Relevé du mois')).toBeTruthy()
  })

  it('annonce le contrat AVANT le vote, pas après', () => {
    // Sans contrat préalable, découvrir plus tard qu'on subit sa propre règle
    // est une embuscade. C'est la pièce anti-gotcha centrale du jeu.
    render(<App />)
    const contract = screen.getByText(/s’appliquera à tous les personnages/)
    expect(contract).toBeTruthy()
    // Il précède bien les boutons de décision dans l'ordre du document.
    const buttons = screen.getAllByRole('button', { name: 'Décider ceci' })
    expect(buttons.length).toBeGreaterThan(0)
    expect(contract.compareDocumentPosition(buttons[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('offre le statu quo et la contestation du cadrage', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Ne rien changer' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /conteste la façon dont la question est posée/ })).toBeTruthy()
  })

  it('attribue le problème à un acteur fictif, jamais à une nécessité constatée', () => {
    render(<App />)
    expect(screen.getByText(/acteur fictif de ce jeu/)).toBeTruthy()
  })

  it('signale l’incertitude de chaque effet', () => {
    render(<App />)
    expect(screen.getAllByText(/effet débattu/).length).toBeGreaterThan(0)
  })

  it('cite la phrase du joueur mot pour mot après le vote', async () => {
    const user = userEvent.setup()
    render(<App />)

    const phrase = "celui qui consomme doit payer, c'est tout"
    await user.type(screen.getByLabelText(/qu’est-ce qui te paraît juste/), phrase)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)

    const registry = screen.getByRole('heading', { name: 'Le registre des lois' }).closest('section')!
    expect(within(registry).getByText(`« ${phrase} »`)).toBeTruthy()
  })

  it('montre les conséquences sur tous les personnages, pas seulement l’incarné', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
    await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))

    const impacts = screen.getByRole('heading', { name: 'Le choix vu par chacun' }).closest('section')!
    expect(within(impacts).getByText('Claire')).toBeTruthy()
    expect(within(impacts).getByText('Marc et Anne')).toBeTruthy()
  })

  it('propose les quatre échelles et change la mesure sans changer les faits', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
    await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))

    for (const label of ['en euros', 'en % du revenu', 'en % du reste à vivre', 'en jours de dépenses']) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }

    const impacts = () => screen.getByRole('heading', { name: 'Le choix vu par chacun' }).closest('section')!
    const enEuros = within(impacts()).getByLabelText('en euros')
    await user.click(enEuros)
    const textEuros = impacts().textContent ?? ''

    await user.click(within(impacts()).getByLabelText('en % du reste à vivre'))
    const textSlack = impacts().textContent ?? ''

    // Même règle, même monde : seule la mesure affichée diffère.
    expect(textEuros).not.toBe(textSlack)
  })
})

describe('question « bien et juste » et rappel', () => {
  const voteFor = async (user: ReturnType<typeof userEvent.setup>, phrase?: string) => {
    if (phrase) await user.type(screen.getByLabelText(/qu’est-ce qui te paraît juste/), phrase)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
  }

  it('pose la question après le vote, avec les cinq réponses', async () => {
    const user = userEvent.setup()
    render(<App />)
    await voteFor(user)

    expect(screen.getByRole('heading', { name: /bien et juste/ })).toBeTruthy()
    for (const label of ['non', 'plutôt non', 'je ne sais pas', 'plutôt oui', 'oui']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy()
    }
  })

  it('ne présélectionne aucune réponse : aucune n’est suggérée', async () => {
    const user = userEvent.setup()
    render(<App />)
    await voteFor(user)
    for (const r of screen.getAllByRole('radio')) {
      expect(r.getAttribute('aria-checked')).toBe('false')
    }
  })

  it('donne aux cinq réponses la même largeur de base', async () => {
    const user = userEvent.setup()
    render(<App />)
    await voteFor(user)
    // Une réponse plus large serait une réponse mise en avant.
    const flex = screen.getAllByRole('radio').map((b) => getComputedStyle(b).flex)
    expect(new Set(flex).size).toBe(1)
  })

  it('cite le joueur verbatim dans le rappel, après changement de personnage', async () => {
    const user = userEvent.setup()
    render(<App />)
    const phrase = 'celui qui consomme doit payer'
    await voteFor(user, phrase)
    await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Marc et Anne')
    expect(screen.getByText(phrase)).toBeTruthy()
  })

  it('affiche toujours les deux volets du rappel : ici ET ailleurs', async () => {
    const user = userEvent.setup()
    render(<App />)
    await voteFor(user, 'ma phrase')
    await user.click(screen.getByRole('radio', { name: 'oui' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))

    expect(screen.getByText(/Ce que cette règle a produit ici/)).toBeTruthy()
    expect(screen.getByText(/Ce qu’elle a produit ailleurs/)).toBeTruthy()
  })

  it('repose la question en citant la position précédente, sans la commenter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await voteFor(user, 'ma phrase')
    await user.click(screen.getByRole('radio', { name: 'plutôt non' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))

    const relaunch = screen.getByRole('heading', { name: 'La même question' }).closest('section')!
    expect(within(relaunch).getByText(/ta réponse était « plutôt non »/)).toBeTruthy()
    for (const word of ['pourtant', 'contradiction', 'incohérent']) {
      expect(relaunch.textContent?.toLowerCase()).not.toContain(word)
    }
  })
})

describe('bilan de fin de partie', () => {
  const playThrough = async (user: ReturnType<typeof userEvent.setup>, phrase: string) => {
    await user.type(screen.getByLabelText(/qu’est-ce qui te paraît juste/), phrase)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
    await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
    await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
    await user.click(screen.getByRole('button', { name: /Quelques mois plus tard/ }))
    await user.click(screen.getByRole('radio', { name: 'plutôt non' }))
    await user.click(screen.getByRole('button', { name: /Terminer la partie/ }))
  }

  it('restitue les décisions et les personnages incarnés', async () => {
    const user = userEvent.setup()
    render(<App />)
    await playThrough(user, 'ma règle à moi')

    const head = screen.getByRole('heading', { name: 'Ce que tu as décidé' }).closest('section')!
    expect(within(head).getByText('« ma règle à moi »')).toBeTruthy()
    expect(head.textContent).toContain('Claire')
    expect(head.textContent).toContain('Marc et Anne')
  })

  it('n’affiche aucun score ni étiquette politique', async () => {
    const user = userEvent.setup()
    render(<App />)
    await playThrough(user, 'ma phrase')

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const forbidden of ['de gauche', 'de droite', 'ton score', 'tu es plutôt', '%']) {
      expect(text).not.toContain(forbidden)
    }
  })

  it('dit explicitement quand la partie est trop courte pour conclure', async () => {
    const user = userEvent.setup()
    render(<App />)
    await playThrough(user, 'ma phrase')
    // Deux réponses seulement : sous le seuil de preuve.
    expect(screen.getByText(/trop courte pour qu’on puisse en dire quoi que ce soit/)).toBeTruthy()
  })

  it('pose la question KPI, qui ne porte pas sur l’opinion politique', async () => {
    const user = userEvent.setup()
    render(<App />)
    await playThrough(user, 'ma phrase')

    const kpi = screen.getByRole('heading', { name: 'Une dernière question' }).closest('section')!
    expect(kpi.textContent).toContain('pas réalisé')
    for (const word of ['impôt', 'taxe', 'réforme']) {
      expect(kpi.textContent?.toLowerCase()).not.toContain(word)
    }
  })
})
