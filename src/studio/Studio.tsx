import { useMemo, useState } from 'react'
import { bundle } from '@/content/load.ts'
// Importe directement plutot que via le paquet compile : le lexique ne sert
// qu'a l'Atelier, et n'a donc rien a faire dans le paquet du jeu.
import lexiconFile from '../../content/lexicon.json' with { type: 'json' }
import type { LexiconEntry } from '@/quality/lexicon.ts'
import {
  duplicate, KIND_DIR, KIND_LABEL, KIND_PLURAL, serialise, slugify, summarise, validate,
  type ContentKind, type Draft,
} from './model.ts'
import { canWriteToDisk, connectFolder, downloadFile, isConnected, writeFile } from './disk.ts'

/**
 * L'Atelier : creer et modifier du contenu sans toucher au code.
 *
 * Il applique les MEMES regles que la chaine de build — memes schemas, meme
 * lexique — et les montre toutes ensemble pendant la frappe. Un auteur voit
 * donc immediatement si son personnage manque de vulnerabilite et si son
 * texte emploie un terme proscrit, sans avoir a relancer quoi que ce soit.
 *
 * Il est charge a la demande : son code et Zod restent hors du paquet du jeu.
 */

const lexicon = (lexiconFile as { entries: LexiconEntry[] }).entries

type Item = { kind: ContentKind; id: string; value: unknown }

function allItems(): Item[] {
  return [
    ...bundle.characters.map((c) => ({ kind: 'character' as const, id: c.id, value: c })),
    ...bundle.events.map((e) => ({ kind: 'event' as const, id: e.id, value: e })),
    ...bundle.reforms.map((r) => ({ kind: 'reform' as const, id: r.id, value: r })),
  ]
}

const pathOf = (kind: ContentKind, id: string) => `${KIND_DIR[kind]}/${id}.json`

export function Studio({ onBack }: { readonly onBack: () => void }) {
  const items = useMemo(allItems, [])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [selected, setSelected] = useState<string>(`character:${items[0]?.id ?? ''}`)
  const [folder, setFolder] = useState(isConnected())
  const [saved, setSaved] = useState<string | null>(null)

  const draftFor = (item: Item): Draft => {
    const key = `${item.kind}:${item.id}`
    return (
      drafts[key] ?? {
        kind: item.kind,
        id: item.id,
        path: pathOf(item.kind, item.id),
        text: serialise(item.value),
        dirty: false,
      }
    )
  }

  const current = items.find((i) => `${i.kind}:${i.id}` === selected)
  const draft = current ? draftFor(current) : null
  const result = draft ? validate(draft, lexicon) : null

  const edit = (text: string) => {
    if (!draft) return
    setDrafts((d) => ({ ...d, [selected]: { ...draft, text, dirty: true } }))
    setSaved(null)
  }

  const save = async () => {
    if (!draft || !result?.valid) return
    const pretty = serialise(JSON.parse(draft.text))
    if (folder && (await writeFile(draft.path, pretty))) {
      setSaved(`Écrit dans content/${draft.path}`)
    } else {
      downloadFile(`${draft.id}.json`, pretty)
      setSaved(`Téléchargé. À déposer dans content/${KIND_DIR[draft.kind]}/`)
    }
    setDrafts((d) => ({ ...d, [selected]: { ...draft, text: pretty, dirty: false } }))
  }

  const makeCopy = () => {
    if (!current || !draft) return
    const label = prompt('Nom du nouveau contenu ?')
    if (!label) return
    const id = slugify(label)
    const copy = duplicate(JSON.parse(draft.text), id)
    const key = `${current.kind}:${id}`
    setDrafts((d) => ({
      ...d,
      [key]: { kind: current.kind, id, path: pathOf(current.kind, id), text: serialise(copy), dirty: true },
    }))
    setSelected(key)
  }

  const byKind = (kind: ContentKind) => items.filter((i) => i.kind === kind)
  const extra = Object.values(drafts).filter((d) => !items.some((i) => i.id === d.id && i.kind === d.kind))

  return (
    <div className="studio">
      <header className="studio__bar">
        <h1>Atelier</h1>
        <div className="studio__bar-actions">
          {canWriteToDisk() ? (
            <button type="button" onClick={async () => setFolder(await connectFolder())}>
              {folder ? 'Dossier content/ relié' : 'Relier le dossier content/'}
            </button>
          ) : (
            <span className="provenance">
              Ce navigateur ne permet pas l’écriture directe : les modifications seront
              téléchargées.
            </span>
          )}
          <button type="button" onClick={onBack}>Revenir au jeu</button>
        </div>
      </header>

      <div className="studio__body">
        <nav className="studio__list" aria-label="Contenu du jeu">
          {(['character', 'event', 'reform'] as const).map((kind) => (
            <section key={kind}>
              <h2>{KIND_PLURAL[kind]}</h2>
              <ul>
                {[...byKind(kind), ...extra.filter((d) => d.kind === kind).map((d) => ({ kind, id: d.id, value: null }))]
                  .map((i) => {
                    const key = `${i.kind}:${i.id}`
                    const d = drafts[key]
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          aria-current={selected === key ? 'true' : undefined}
                          className={selected === key ? 'studio__item studio__item--on' : 'studio__item'}
                          onClick={() => setSelected(key)}
                        >
                          {i.id}
                          {d?.dirty && <span className="studio__dirty" aria-label="modifié"> ·</span>}
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </nav>

        <main className="studio__editor">
          {draft && result ? (
            <>
              <div className="studio__editor-head">
                <h2>
                  {KIND_LABEL[draft.kind]} · {draft.id}
                </h2>
                <p className="provenance">content/{draft.path}</p>
                <div className="studio__bar-actions">
                  <button type="button" onClick={makeCopy}>Dupliquer</button>
                  <button type="button" onClick={save} disabled={!result.valid || !draft.dirty}>
                    Enregistrer
                  </button>
                </div>
                {saved && <p className="provenance">{saved}</p>}
              </div>

              <label className="sr-only" htmlFor="editor">
                Contenu de {draft.id}, au format JSON
              </label>
              <textarea
                id="editor"
                className="studio__text"
                spellCheck
                value={draft.text}
                onChange={(e) => edit(e.target.value)}
              />

              <section className="studio__diag" aria-live="polite">
                <h3>
                  {summarise(result.diagnostics)}
                  {result.valid && draft.dirty && ' — prêt à enregistrer'}
                </h3>
                <ul>
                  {result.diagnostics.map((d, i) => (
                    <li key={`${d.path}-${i}`} className={`diag diag--${d.severity}`}>
                      <span className="diag__tag">
                        {d.severity === 'blocking' ? 'Bloquant' : 'À examiner'}
                      </span>
                      <code>{d.path}</code> — {d.message}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <p>Choisis un contenu à gauche.</p>
          )}
        </main>
      </div>
    </div>
  )
}
