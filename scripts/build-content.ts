/**
 * Compile content/ en content/bundle.json.
 *
 * Deux responsabilites, et seulement deux :
 *   1. valider chaque fichier contre son schema Zod ;
 *   2. verifier l'integrite referentielle, que le schema ne peut pas voir
 *      parce qu'elle traverse plusieurs fichiers.
 *
 * Aucune normalisation silencieuse. Si un contenu est douteux, le script
 * echoue et le dit — il ne corrige rien dans le dos de l'auteur.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { ContentBundle, IntroPage, MethodPage } from '../src/schemas/index.ts'
import { Source, Hypothesis, BudgetLineRef } from '../src/schemas/referentials.ts'
import { Character } from '../src/schemas/character.ts'
import { LifeEvent } from '../src/schemas/event.ts'
import { Reform } from '../src/schemas/reform.ts'
import { evaluate, validateCondition, type Condition } from '../src/core/conditions.ts'
import { computeMonthlyBudget } from '../src/core/budget.ts'
import { hasChoosableOption } from '../src/core/availability.ts'
import { toBudgetLines, toStocks, traitsOf } from '../src/content/mapping.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')

type Problem = { file: string; path: string; message: string }
const problems: Problem[] = []
let fileCount = 0

const readJson = (file: string): unknown => {
  fileCount++
  return JSON.parse(readFileSync(join(CONTENT, file), 'utf8'))
}

const listJson = (dir: string): string[] =>
  readdirSync(join(CONTENT, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dir, f))

function parseOne<T>(schema: z.ZodType<T>, file: string, raw: unknown): T | null {
  const r = schema.safeParse(raw)
  if (r.success) return r.data
  for (const issue of r.error.issues) {
    problems.push({ file, path: issue.path.join('.') || '(racine)', message: issue.message })
  }
  return null
}

/** Un fichier = un tableau d'entrees (referentiels partages). */
const parseArrayFile = <T>(schema: z.ZodType<T>, file: string): T[] =>
  parseOne(z.array(schema), file, readJson(file)) ?? []

/** Un fichier = une entree (personnages, evenements). */
const parseEachFile = <T>(schema: z.ZodType<T>, files: string[]): T[] =>
  files.map((f) => parseOne(schema, f, readJson(f))).filter((x): x is T => x !== null)

// ---------------------------------------------------------------- lecture
const sources = parseArrayFile(Source, 'sources.json')
const hypotheses = parseArrayFile(Hypothesis, 'hypotheses.json')
const budgetLines = parseArrayFile(BudgetLineRef, 'budget-lines.json')
const characters = parseEachFile(Character, listJson('characters'))
const events = parseEachFile(LifeEvent, listJson('events'))
const reforms = parseEachFile(Reform, listJson('reforms'))
const method = parseOne(MethodPage, 'method.json', readJson('method.json'))
const intro = parseOne(IntroPage, 'intro.json', readJson('intro.json'))
const principles = readJson('principles.json')

// --------------------------------------------------- integrite referentielle
const sourceIds = new Set(sources.map((s) => s.id))
const hypothesisIds = new Set(hypotheses.map((h) => h.id))
const lineCodes = new Set(budgetLines.map((l) => l.code))

const complain = (file: string, path: string, message: string) => problems.push({ file, path, message })

for (const c of characters) {
  const file = `characters/${c.id}.json`

  for (const id of c.identity.calibrationSourceIds) {
    if (!sourceIds.has(id)) complain(file, 'identity.calibrationSourceIds', `source inconnue : ${id}`)
  }

  for (const l of c.budget.lines) {
    if (!lineCodes.has(l.code)) complain(file, `budget.lines.${l.code}`, `poste budgétaire inconnu : ${l.code}`)
    if (l.value.sourceId && !sourceIds.has(l.value.sourceId))
      complain(file, `budget.lines.${l.code}.value.sourceId`, `source inconnue : ${l.value.sourceId}`)
    if (l.value.hypothesisId && !hypothesisIds.has(l.value.hypothesisId))
      complain(file, `budget.lines.${l.code}.value.hypothesisId`, `hypothèse inconnue : ${l.value.hypothesisId}`)
    // Le groupe declare sur la ligne doit correspondre au referentiel :
    // sinon une depense pourrait devenir une ressource selon le personnage.
    const ref = budgetLines.find((b) => b.code === l.code)
    if (ref && ref.group !== l.group)
      complain(file, `budget.lines.${l.code}.group`, `groupe « ${l.group} » contredit le référentiel (« ${ref.group} »)`)
  }

  for (const e of c.equivalenceRefs) {
    if (!lineCodes.has(e.code) && e.code !== 'projet')
      complain(file, `equivalenceRefs.${e.code}`, `poste inconnu : ${e.code}`)
  }
  for (const o of c.lineOverrides) {
    if (!lineCodes.has(o.code)) complain(file, `lineOverrides.${o.code}`, `poste inconnu : ${o.code}`)
  }
}

for (const e of events) {
  const file = `events/${e.id}.json`
  if (e.cost.sourceId && !sourceIds.has(e.cost.sourceId))
    complain(file, 'cost.sourceId', `source inconnue : ${e.cost.sourceId}`)
  if (e.cost.hypothesisId && !hypothesisIds.has(e.cost.hypothesisId))
    complain(file, 'cost.hypothesisId', `hypothèse inconnue : ${e.cost.hypothesisId}`)
  for (const o of e.options)
    for (const f of o.effects)
      if (f.type === 'recurring' && !lineCodes.has(f.code))
        complain(file, `options.${o.id}`, `poste inconnu : ${f.code}`)
}

// Les conditions ne peuvent interroger que le vocabulaire ferme d'attributs.
// Une condition portant sur un attribut inexistant s'evaluerait a faux en
// silence, rendant un evenement ou un effet invisible sans que personne le
// remarque.
for (const e of events) {
  for (const msg of validateCondition(e.eligibility as Condition))
    complain(`events/${e.id}.json`, 'eligibility', msg)
}

for (const r of reforms) {
  const file = `reforms/${r.id}.json`
  for (const id of r.contextSourceIds)
    if (!sourceIds.has(id)) complain(file, 'contextSourceIds', `source inconnue : ${id}`)

  for (const o of r.options) {
    for (const ef of o.effects) {
      if (ef.scope.when)
        for (const msg of validateCondition(ef.scope.when as Condition, `options.${o.id}.effects.${ef.id}.scope.when`))
          complain(file, `options.${o.id}`, msg)
      if (ef.code && !lineCodes.has(ef.code))
        complain(file, `options.${o.id}.effects.${ef.id}.code`, `poste budgétaire inconnu : ${ef.code}`)
      if (ef.hypothesisId && !hypothesisIds.has(ef.hypothesisId))
        complain(file, `options.${o.id}.effects.${ef.id}.hypothesisId`, `hypothèse inconnue : ${ef.hypothesisId}`)
    }
  }
}

/*
 * PORTEE REELLE D'UNE REFORME.
 *
 * Une reforme doit toucher plusieurs personnages du corpus, sinon l'ecran
 * « le choix vu par chacun » affiche cinq fois « aucun effet » et ne compare
 * rien — donc ne produit aucun declic, c'est-a-dire rien du tout.
 *
 * Le controle precedent comptait les DESCRIPTIONS de portee, pas les
 * personnages atteints : une reforme visant les seuls retraites avait bien
 * trois descriptions distinctes tout en ne touchant qu'une personne sur six.
 * Releve sur une capture d'ecran, pas par un test.
 */
/** Options devant presenter un contraste entre elles, au niveau de la reforme. */
const MIN_AFFECTED = 2

for (const r of reforms) {
  const file = `reforms/${r.id}.json`

  const reachedBy = (ef: { scope: { when?: unknown } }) =>
    characters.filter((c) => !ef.scope.when || evaluate(ef.scope.when as Condition, traitsOf(c)))

  /*
   * COUVERTURE, option par option.
   *
   * Chaque personnage doit etre atteint par un effet, meme nul. C'est la
   * regle posee des l'etape 7 : « un effet nul est un CONTENU, pas une
   * absence de contenu ».
   *
   * Une reforme peut legitimement ne concerner que les independants. Ce
   * qu'elle ne peut pas faire, c'est laisser les autres dans un silence que
   * l'interface traduit par « aucune regle ne le concerne » : l'auteur doit
   * ecrire qu'ils ne sont pas concernes, et pourquoi.
   */
  for (const o of r.options) {
    const lignes = o.effects.filter((e) => e.kind === 'budget_line')
    if (lignes.length === 0) continue

    const covered = new Set(lignes.flatMap((ef) => reachedBy(ef).map((c) => c.id)))
    const silent = characters.map((c) => c.id).filter((id) => !covered.has(id))
    if (silent.length > 0) {
      complain(
        file,
        `options.${o.id}`,
        `laisse ${silent.join(', ')} sans aucun effet déclaré. Un effet nul est un CONTENU : ` +
          `ajouter un effet de portée explicite à monthlyDelta 0, avec une note disant ` +
          `pourquoi ces situations ne sont pas concernées.`,
      )
    }
  }

  /*
   * CONTRASTE, au niveau de la REFORME et non de chaque option.
   *
   * Une option peut legitimement ne rien couter a personne la premiere
   * annee — le statu quo, le financement par l'emprunt — et c'est meme une
   * information importante. Le contraste se joue ENTRE les options : il
   * faut qu'au moins l'une d'elles touche plusieurs personnes, et que
   * toutes ne produisent pas la meme repartition.
   */
  const distributions = new Set<string>()
  let bestReach = 0
  for (const o of r.options) {
    const affected = new Set<string>()
    for (const ef of o.effects) {
      if (ef.kind !== 'budget_line' || !ef.monthlyDelta) continue
      for (const c of reachedBy(ef)) affected.add(c.id)
    }
    bestReach = Math.max(bestReach, affected.size)
    distributions.add([...affected].sort().join(','))
  }

  if (bestReach < MIN_AFFECTED) {
    complain(file, 'options',
      `aucune option ne touche plus de ${bestReach} personnage(s) : il n'y a rien à comparer.`)
  }
  if (distributions.size < 3) {
    complain(file, 'options',
      `seulement ${distributions.size} répartition(s) distincte(s) entre les options : ` +
        `le choix ne change pas qui est touché, donc ne fait rien apparaître.`)
  }
}

/*
 * TOUT DECAISSEMENT POSITIF DOIT DECLARER SA NATURE.
 *
 * Sans ce controle, omettre `settlement` fait silencieusement retomber
 * l'option dans « flux du mois », donc hors de toute contrainte de
 * tresorerie : une chaudiere a 1 800 EUR redeviendrait payable comptant par
 * qui n'a rien. Le defaut silencieux est precisement ce qui a produit
 * l'erreur d'origine ; il est interdit.
 */
for (const e of events) {
  for (const o of e.options) {
    for (const f of o.effects) {
      if (f.type === 'one_off' && f.amount > 0 && f.settlement === undefined) {
        complain(
          `events/${e.id}.json`,
          `options.${o.id}`,
          `montant ponctuel de ${f.amount} € sans \`settlement\` : préciser « payment » ` +
            `(une somme à régler, soumise à la trésorerie disponible) ou « income_loss » ` +
            `(un revenu qui n'arrive pas, qui est subi et non financé).`,
        )
      }
    }
  }
}

/*
 * AUCUN MOIS SANS ISSUE.
 *
 * Depuis que la disponibilite des options est calculee sur la tresorerie
 * (src/core/availability.ts), un evenement dont toutes les options exigent un
 * decaissement immediat enfermerait les personnages les moins liquides dans un
 * ecran sans bouton. Le controle est fait ici, pour chaque couple
 * personnage/evenement reellement possible, et non suppose a la lecture.
 */
for (const e of events) {
  for (const c of characters) {
    if (!evaluate(e.eligibility as Condition, traitsOf(c))) continue

    if (!hasChoosableOption(e.options, computeMonthlyBudget(toBudgetLines(c)), toStocks(c))) {
      complain(
        `events/${e.id}.json`,
        'options',
        `aucune option n'est à la portée de ${c.identity.firstName} : toutes exigent un ` +
          `décaissement immédiat qu'il ou elle ne peut pas régler. Ajouter un étalement, ` +
          `un report ou un renoncement, sans quoi le mois n'a pas d'issue.`,
      )
    }
  }
}

// Les sources et hypotheses orphelines ne sont pas une erreur, mais un
// signal : du contenu a peut-etre ete supprime sans nettoyer son appui.
const used = new Set<string>()
for (const c of characters) {
  c.identity.calibrationSourceIds.forEach((s) => used.add(s))
  c.budget.lines.forEach((l) => {
    if (l.value.sourceId) used.add(l.value.sourceId)
    if (l.value.hypothesisId) used.add(l.value.hypothesisId)
  })
}
for (const e of events) {
  if (e.cost.sourceId) used.add(e.cost.sourceId)
  if (e.cost.hypothesisId) used.add(e.cost.hypothesisId)
}
for (const r of reforms) {
  r.contextSourceIds.forEach((s) => used.add(s))
  for (const o of r.options) for (const ef of o.effects) if (ef.hypothesisId) used.add(ef.hypothesisId)
}
// Une source citee par une lecture d'hypothese est bien utilisee : c'est elle
// qui appuie le parametre retenu.
for (const h of hypotheses) {
  for (const r of h.readings) r.sourceIds.forEach((s) => used.add(s))
}
// Une hypothese appliquee par le MOTEUR n'est citee par aucun fichier de
// contenu : c'est son mode normal, pas un oubli.
const engineApplied = new Set(hypotheses.filter((h) => h.appliedBy === 'engine').map((h) => h.id))
const orphans = [...sourceIds, ...hypothesisIds].filter(
  (id) => !used.has(id) && !engineApplied.has(id),
)

// ---------------------------------------------------------------- sortie
if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problème(s) dans content/\n`)
  const byFile = new Map<string, Problem[]>()
  for (const p of problems) byFile.set(p.file, [...(byFile.get(p.file) ?? []), p])
  for (const [file, list] of byFile) {
    console.error(`  ${file}`)
    for (const p of list) console.error(`    ${p.path} — ${p.message}`)
  }
  console.error('')
  process.exit(1)
}

const bundle = {
  contentVersion: '0.1.0',
  builtFrom: { fileCount, charterVersion: '1.0' },
  sources,
  hypotheses,
  budgetLines,
  characters,
  events,
  reforms,
  method,
  intro,
  principles,
}

const verified = ContentBundle.safeParse(bundle)
if (!verified.success) {
  console.error('✗ le paquet compilé ne valide pas son propre schéma :')
  console.error(z.prettifyError(verified.error))
  process.exit(1)
}

writeFileSync(join(CONTENT, 'bundle.json'), JSON.stringify(verified.data, null, 2) + '\n', 'utf8')

console.log(
  `✓ content/bundle.json — ${fileCount} fichiers, ${characters.length} personnages, ` +
    `${events.length} événements, ${reforms.length} réformes`,
)
console.log(`  ${sources.length} sources, ${hypotheses.length} hypothèses, ${budgetLines.length} postes budgétaires`)
if (orphans.length) console.log(`  note : ${orphans.length} référence(s) jamais utilisée(s) — ${orphans.join(', ')}`)
