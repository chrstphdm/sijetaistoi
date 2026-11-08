// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/ui/App.tsx'

afterEach(cleanup)

type User = ReturnType<typeof userEvent.setup>

/** Traverse un acte : intro, les mois, la réforme, la question, l'impact. */
async function playAct(user: User, phrase?: string) {
  await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

  // Les mois s'enchaînent jusqu'à ce que la réforme apparaisse.
  for (let guard = 0; guard < 12; guard++) {
    const reveal = screen.queryByRole('button', { name: /Voir les possibilités/ })
    if (reveal) {
      await user.click(reveal)
      await user.click(screen.getAllByRole('button', { name: 'Choisir' })[0]!)
      continue
    }
    const skip = screen.queryByRole('button', { name: /Mois suivant/ })
    if (skip) {
      await user.click(skip)
      continue
    }
    break
  }

  if (phrase) await user.type(screen.getByLabelText(/qu’est-ce qui te paraît juste/), phrase)
  await user.click(screen.getAllByRole('button', { name: 'Décider ceci' })[1]!)
  await user.click(screen.getByRole('radio', { name: 'plutôt oui' }))
  await user.click(screen.getByRole('button', { name: /ce que cela change pour chacun/i }))
}

describe('ouverture', () => {
  it('présente le personnage par des détails non économiques avant tout chiffre', () => {
    render(<App />)
    const intro = screen.getByRole('heading', { level: 1 }).closest('section')!
    expect(intro.textContent).toMatch(/Tu es \w+/)
    // Pas de relevé tant que le joueur n'a pas commencé le mois.
    expect(screen.queryByText('Relevé du mois')).toBeNull()
  })

  it('publie les règles du tirage dès le premier écran', () => {
    render(<App />)
    const draw = screen.getByRole('heading', { name: /Comment ce jeu choisit tes personnages/ })
      .closest('section')!
    expect(draw.textContent).toContain('tiré au hasard')
    expect(draw.textContent).toContain('jamais le personnage pour qui une décision serait la plus douloureuse')
  })
})

describe('un mois vécu', () => {
  it('oblige à regarder le relevé avant de proposer les options', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

    expect(screen.getByText('Relevé du mois')).toBeTruthy()
    // Les options ne sont pas offertes d'emblée.
    expect(screen.queryByRole('button', { name: 'Choisir' })).toBeNull()
    expect(screen.getByRole('button', { name: /Voir les possibilités/ })).toBeTruthy()
  })

  it('n’affiche aucun score ni vocabulaire de réussite', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))

    const text = document.body.textContent?.toLowerCase() ?? ''
    for (const word of ['score', 'bravo', 'réussi', 'perdu', 'gagné', 'points', 'félicitations', 'game over']) {
      expect(text).not.toContain(word)
    }
  })

  it('montre ce qui n’est pas possible pour ce personnage', async () => {
    const user = userEvent.setup()
    render(<App />)
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
  it('rend le registre consultable dès qu’une règle existe', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('Aucune règle décidée pour l’instant.')).toBeTruthy()

    await playAct(user, 'ma règle')
    const registry = screen.getByRole('heading', { name: /Le registre des lois/ }).closest('section')!
    expect(registry.textContent).toContain('(1)')
    await user.click(within(registry).getByRole('button', { name: 'Consulter' }))
    expect(within(registry).getByText('« ma règle »')).toBeTruthy()
  })

  it('permet de consulter les autres personnages sans y inciter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Commencer le mois/ }))
    for (let i = 0; i < 12; i++) {
      const reveal = screen.queryByRole('button', { name: /Voir les possibilités/ })
      if (reveal) { await user.click(reveal); await user.click(screen.getAllByRole('button', { name: 'Choisir' })[0]!); continue }
      const skip = screen.queryByRole('button', { name: /Mois suivant/ })
      if (skip) { await user.click(skip); continue }
      break
    }
    const btn = screen.getByRole('button', { name: /Consulter les autres personnages/ })
    await user.click(btn)
    expect(screen.getByRole('button', { name: /Masquer les autres personnages/ })).toBeTruthy()
  })
})
