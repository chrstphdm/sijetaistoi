// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { App } from '@/ui/App.tsx'

afterEach(cleanup)

describe('App — rendu de bout en bout', () => {
  it('affiche un personnage, son relevé et l événement', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Claire')
    expect(screen.getByText('Relevé du mois')).toBeTruthy()
    expect(screen.getByText(/La chaudière ne redémarre pas/)).toBeTruthy()
  })

  it('porte le signe autrement que par la couleur, pour les lecteurs d écran', () => {
    render(<App />)
    // Le coût de la réparation est annoncé en toutes lettres, avec sa provenance.
    expect(screen.getByText(/Coût de la réparation : 1.800.€ en moins, valeur fictive/)).toBeTruthy()
  })

  it('propose les quatre échelles de comparaison', () => {
    render(<App />)
    for (const label of ['en euros', 'en % du revenu', 'en % du reste à vivre', 'en jours de dépenses']) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
  })

  it('montre que la même somme se vit différemment selon le personnage', () => {
    render(<App />)
    expect(screen.getByText(/ne peut pas être couvert ce mois-ci/)).toBeTruthy()
    expect(screen.getByText(/sans toucher aux dépenses/)).toBeTruthy()
  })
})
