/**
 * Lint de contenu — bloquant.
 *
 * Il verifie ce qu'un schema ne peut pas voir, parce que cela ne se mesure
 * qu'a l'echelle du corpus : le lexique employe, la parite narrative entre
 * personnages, l'equilibre de valence du corpus d'evenements.
 *
 * Il tourne sur les FICHIERS BRUTS et non sur le paquet compile. C'est
 * volontaire : il doit pouvoir signaler un terme proscrit meme dans un
 * fichier que le schema rejette par ailleurs. Corriger le contenu ne doit
 * pas demander trois passes.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLexicon, type LexiconEntry } from '../src/quality/lexicon.ts'
import { checkNarrativeParity, checkValenceBalance, type ParityProfile } from '../src/quality/parity.ts'
import type { Violation } from '../src/quality/types.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')

function allJsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name)
    if (e.isDirectory()) return allJsonFiles(full)
    if (!e.name.endsWith('.json') || e.name === 'bundle.json') return []
    return [full]
  })
}

const lexicon = JSON.parse(readFileSync(join(CONTENT, 'lexicon.json'), 'utf8')) as {
  entries: LexiconEntry[]
}

const violations: Violation[] = []
const files = allJsonFiles(CONTENT).sort()

/* ---------------------------------------------------- lexique, tous fichiers */
for (const file of files) {
  const label = relative(CONTENT, file)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    violations.push({
      rule: 'json', severity: 'blocking', where: label,
      message: `fichier illisible : ${(e as Error).message}`,
    })
    continue
  }
  violations.push(...checkLexicon(parsed, lexicon.entries, label))
}

/* ------------------------------------------- parité narrative et valence */
type RawCharacter = {
  id: string
  narrative?: { story?: string }
  parity?: { strength?: string; vulnerability?: string; aspirations?: string[]; concerns?: string[] }
  embodiedDetails?: string[]
}

const characters = allJsonFiles(join(CONTENT, 'characters'))
  .map((f) => JSON.parse(readFileSync(f, 'utf8')) as RawCharacter)

const profiles: ParityProfile[] = characters.map((c) => ({
  id: c.id,
  storyLength: c.narrative?.story?.length ?? 0,
  strengthLength: c.parity?.strength?.length ?? 0,
  vulnerabilityLength: c.parity?.vulnerability?.length ?? 0,
  detailCount: c.embodiedDetails?.length ?? 0,
  aspirationCount: c.parity?.aspirations?.length ?? 0,
  concernCount: c.parity?.concerns?.length ?? 0,
}))
violations.push(...checkNarrativeParity(profiles))

const events = allJsonFiles(join(CONTENT, 'events'))
  .map((f) => JSON.parse(readFileSync(f, 'utf8')) as { valence?: string })
violations.push(...checkValenceBalance(events.map((e) => e.valence ?? 'neutral')))

/* ---------------------------------------------------------------- sortie */
const blocking = violations.filter((v) => v.severity === 'blocking')
const warnings = violations.filter((v) => v.severity === 'warning')

const print = (list: readonly Violation[], head: string) => {
  if (list.length === 0) return
  console.error(`\n${head}`)
  for (const v of list) console.error(`  [${v.rule}] ${v.where}\n    ${v.message}`)
}

print(warnings, `⚠ ${warnings.length} avertissement(s) — à examiner en revue, non bloquants`)
print(blocking, `✗ ${blocking.length} manquement(s) bloquant(s)`)

if (blocking.length > 0) {
  console.error('')
  process.exit(1)
}

console.log(
  `✓ lint de contenu — ${files.length} fichiers, ${lexicon.entries.length} entrées de lexique, ` +
    `${profiles.length} personnages` + (warnings.length ? ` (${warnings.length} avertissement)` : ''),
)
