// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ALL_TERMS, entryOf, findTerm, firstOccurrences, segment } from '@/ui/glossary.ts'
import { GlossaryDefinitions, GlossaryList, Term } from '@/ui/components/Term.tsx'
import { bundle } from '@/content/load.ts'

describe('glossaire — repérage des termes', () => {
  it('reconnaît une graphie déclarée, sans égard à la casse ni à l’apostrophe', () => {
    expect(findTerm('Les Déciles de revenu', 'decile')).toEqual({ index: 4, length: 7 })
    expect(findTerm("la prime d'activité", 'prime-d-activite')).not.toBeNull()
    expect(findTerm('la prime d’activité', 'prime-d-activite')).not.toBeNull()
  })

  it('reconnaît un terme dont le paquet a rendu les espaces insécables', () => {
    expect(findTerm('son reste à vivre', 'reste-a-vivre')).not.toBeNull()
  })

  it('ne reconnaît pas un terme à l’intérieur d’un autre mot', () => {
    expect(findTerm('les décilesques', 'decile')).toBeNull()
    expect(findTerm('une graineterie', 'graine')).toBeNull()
  })

  it('isole la première apparition de chaque terme, et elle seule', () => {
    const parts = segment('le reste à vivre, puis le reste à vivre', ['reste-a-vivre'])
    expect(parts.filter((p) => p.id)).toHaveLength(1)
    expect(parts.map((p) => p.text).join('')).toBe('le reste à vivre, puis le reste à vivre')
  })

  it('marque chaque terme une fois par écran, dans le premier texte qui l’emploie', () => {
    const marks = firstOccurrences(
      ['rien ici', 'un décile et le reste à vivre', 'encore un décile', 'la trésorerie'],
      ALL_TERMS, ['reste-a-vivre'],
    )
    expect(marks).toEqual([[], ['decile'], [], ['tresorerie']])
  })

  it('chaque définition tient dans sa bulle', () => {
    for (const id of ALL_TERMS) expect(entryOf(id)!.definition.length).toBeLessThanOrEqual(160)
  })
})

describe('glossaire — le terme et sa bulle', () => {
  const definition = entryOf('decile')!.definition

  it('annonce la définition sans rien ouvrir', () => {
    render(<><p>Le <Term id="decile">décile</Term></p><GlossaryDefinitions /></>)
    const button = screen.getByRole('button', { name: 'décile' })
    expect(button.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(definition)
  })

  it('s’ouvre au focus, et se ferme à Échap', () => {
    const { container } = render(<Term id="decile" />)
    expect(container.querySelector('.gloss__tip')).toBeNull()
    fireEvent.focus(screen.getByRole('button'))
    expect(container.querySelector('.gloss__tip')?.textContent).toContain(definition)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(container.querySelector('.gloss__tip')).toBeNull()
  })

  it('s’ouvre au survol, et au toucher sans survol ni focus', () => {
    const { container } = render(<Term id="decile" />)
    fireEvent.mouseEnter(container.querySelector('.gloss')!)
    expect(container.querySelector('.gloss__tip')).not.toBeNull()
    fireEvent.mouseLeave(container.querySelector('.gloss')!)
    expect(container.querySelector('.gloss__tip')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('.gloss__tip')).not.toBeNull()
    fireEvent.pointerDown(document.body)
    expect(container.querySelector('.gloss__tip')).toBeNull()
  })

  it('la page méthode liste tous les termes', () => {
    const { container } = render(<GlossaryList />)
    expect(container.querySelectorAll('dt')).toHaveLength(bundle.glossary.length)
  })
})
