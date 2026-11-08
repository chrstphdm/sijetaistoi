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

    const impacts = screen.getByRole('heading', { name: 'Le choix vu par chacun' }).closest('section')!
    expect(within(impacts).getByText('Claire')).toBeTruthy()
    expect(within(impacts).getByText('Marc et Anne')).toBeTruthy()
  })

  it('propose les quatre échelles et change la mesure sans changer les faits', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)

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
