import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { bundle } from '@/content/load.ts'
import { definitionId, entryOf, glossary, segment } from '../glossary.ts'

/**
 * Un terme technique, et sa definition a portee de main.
 *
 * La definition s'ouvre au survol, a la prise de focus ET au toucher : rien
 * n'est reserve a la souris. Concretement :
 *
 *   - le terme est un <button>, donc atteignable a la tabulation et
 *     activable au doigt ;
 *   - sa definition lui est rattachee par aria-describedby, vers un texte
 *     toujours present dans la page (GlossaryDefinitions) : un lecteur
 *     d'ecran l'entend sans rien ouvrir ;
 *   - la bulle reste ouverte tant que le pointeur est sur le terme ou sur
 *     elle, ou tant que le terme a le focus ; Echap la ferme ; un toucher
 *     ailleurs aussi (WCAG 1.4.13).
 *
 * La bulle n'est rendue que lorsqu'elle est ouverte : fermee, elle ne pese
 * ni sur le texte de la page, ni sur sa mise en page.
 */
export function Term({ id, children }: { readonly id: string; readonly children?: ReactNode }) {
  const entry = entryOf(id)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const open = !dismissed && (hover || focus || pinned)

  // Ouverte au toucher, elle se referme d'un toucher ailleurs ; Echap la
  // ferme quelle que soit la facon dont elle s'est ouverte.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) { setPinned(false); setHover(false) }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDismissed(true); setPinned(false) }
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  // La bulle ne sort pas de l'ecran : decalee vers l'interieur si besoin.
  useLayoutEffect(() => {
    const el = tip.current
    if (!open || !el) return
    el.style.setProperty('--gloss-shift', '0px')
    const r = el.getBoundingClientRect()
    const margin = 8
    const width = document.documentElement.clientWidth
    let shift = 0
    if (r.right > width - margin) shift = width - margin - r.right
    if (r.left + shift < margin) shift = margin - r.left
    el.style.setProperty('--gloss-shift', `${Math.round(shift)}px`)
  }, [open])

  if (!entry) return <>{children}</>
  const source = entry.sourceId ? bundle.sources.find((s) => s.id === entry.sourceId) : undefined

  return (
    <span
      className="gloss" ref={wrap}
      onMouseEnter={() => { setHover(true); setDismissed(false) }}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button" className="gloss__term" aria-describedby={definitionId(entry.id)}
        onFocus={() => { setFocus(true); setDismissed(false) }}
        onBlur={() => { setFocus(false); setPinned(false) }}
        onClick={() => { setPinned((p) => !p); setDismissed(false) }}
      >
        {children ?? entry.term}
      </button>
      {open && (
        // Doublon visuel de la definition : le lecteur d'ecran l'a deja par
        // aria-describedby, il ne l'entend pas deux fois.
        <span className="gloss__tip" ref={tip} aria-hidden="true">
          <span className="gloss__word">{entry.term}</span>
          {entry.definition}
          {source && <span className="gloss__source">Source&nbsp;: {source.organisation}</span>}
        </span>
      )}
    </span>
  )
}

/**
 * Un texte du contenu, avec ses termes du glossaire marques.
 *
 * `mark` : les termes a marquer dans CE texte — en general calcules par
 * firstOccurrences, pour qu'un terme ne le soit qu'une fois par ecran.
 */
export function Glossed({ text, mark }: { readonly text: string; readonly mark?: readonly string[] | undefined }) {
  if (!mark || mark.length === 0) return <>{text}</>
  return (
    <>
      {segment(text, mark).map((s, k) => (
        <Fragment key={k}>{s.id ? <Term id={s.id}>{s.text}</Term> : s.text}</Fragment>
      ))}
    </>
  )
}

/**
 * Les definitions, toujours presentes et invisibles : c'est vers elles que
 * pointe l'aria-describedby de chaque terme. Montees une fois, a la racine.
 */
export function GlossaryDefinitions() {
  return (
    <div hidden>
      {glossary.map((g) => (
        <span key={g.id} id={definitionId(g.id)}>{g.definition}</span>
      ))}
    </div>
  )
}

/** Le glossaire complet, en liste de definitions, pour la page methode. */
export function GlossaryList() {
  const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term, 'fr'))
  return (
    <dl className="glossary">
      {sorted.map((g) => {
        const source = g.sourceId ? bundle.sources.find((s) => s.id === g.sourceId) : undefined
        return (
          <div key={g.id} className="glossary__entry" id={`glossaire-${g.id}`}>
            <dt>{g.term}</dt>
            <dd>
              {g.definition}
              {source && (
                <span className="provenance glossary__source">
                  {' '}Source&nbsp;: <a href={source.url} rel="noopener noreferrer">{source.organisation}, {source.name.toLowerCase()}&nbsp;↗</a>
                </span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
