/**
 * Simulateur de parties — rapports de symétrie.
 *
 *   node scripts/simulate.ts --runs 10000 [--json] [--policies uniforme,adverse]
 *
 * Il rejoue SANS INTERFACE l'orchestration de `src/ui/useGame.ts` : même
 * graine, mêmes flux, mêmes appels au moteur, dans le même ordre. Ce que la
 * charte promet (F2 : quota de rappels défavorables ; F3 : tirage uniforme
 * sous contraintes déclarées) ne se vérifie pas sur une partie : un biais de
 * tirage ne se voit qu'à l'échelle de milliers. Les tests unitaires
 * vérifient chaque fonction ; ce script vérifie leur ASSEMBLAGE, là où un
 * biais passerait inaperçu.
 *
 * Le joueur est simulé par des POLITIQUES explicites (voir `POLICIES`). Le
 * quota doit tenir sous toutes, y compris sous une politique qui cherche
 * délibérément à le faire céder : une garantie qui ne tient que face à un
 * joueur docile n'en est pas une.
 *
 * Code de sortie 1 si une seule partie viole le plafond de rappels
 * défavorables, ou si le premier tirage s'écarte de l'uniforme.
 *
 * Le simulateur ne corrige rien. Ce qu'il trouve, il le rapporte.
 */
import { computeMonthlyBudget } from '../src/core/budget.ts'
import { castFirst, castNext, type CastingProfile, type Draw } from '../src/core/casting.ts'
import {
  describeComposition, selectCallback, signOf, unfavourableCap,
  type CallbackCandidate, type CallbackSign, type Selection,
} from '../src/core/callback.ts'
import { evaluate, type Condition } from '../src/core/conditions.ts'
import { apply, initialState, MONTHS_PER_ACT, ACT_COUNT, type Command, type GameState } from '../src/core/game.ts'
import { euros, formatEuros, type Cents } from '../src/core/money.ts'
import { advance, createRandom, seedOffset, type RandomSource, type Stream } from '../src/core/rng.ts'
import {
  activeEffectsFor, applyEffectsToLines, applyRule, inForceNow, perceptiblyConcerned, rulesInForce,
  type Rule, type WorldState,
} from '../src/core/world.ts'
import { isMeaningful, resolveEvent } from '../src/core/eventResolve.ts'
import { optionAvailability } from '../src/core/availability.ts'
import type { BudgetLine } from '../src/core/types.ts'
import { characters, events, optionLookup, reforms, toBudgetLines, toStocks, traitsOf } from '../src/content/load.ts'
import type { CharacterT, LifeEventT, ReformT } from '../src/schemas/index.ts'

/* ------------------------------------------------------------------ */
/* Ce que l'interface fait et que le moteur ne porte pas              */
/* ------------------------------------------------------------------ */

/**
 * Copie de `rotationOrder` (src/ui/components/ImpactForEach.tsx).
 *
 * Recopiée et non importée : Node n'exécute pas le JSX du composant. Le test
 * `tests/core/simulate.test.ts` vérifie que les deux restent identiques ;
 * sans ce garde-fou, le rapport d'équilibre positionnel décrirait un
 * classement qui n'est plus celui de l'écran.
 */
export function rotationOrder(count: number, screenIndex: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + screenIndex) % count)
}

const traitsCache = new Map<string, ReturnType<typeof traitsOf>>()
const traitsFor = (c: CharacterT) => {
  let t = traitsCache.get(c.id)
  if (!t) traitsCache.set(c.id, (t = traitsOf(c)))
  return t
}
const byId = (id: string): CharacterT => characters.find((c) => c.id === id)!

/** Effets récurrents accumulés par les choix d'événements (comme dans le hook). */
type Recurring = { readonly code: string; readonly amountCents: Cents }

/** Relevé du mois : même calcul que le `lines` de `useGame`. */
function linesFor(character: CharacterT, world: WorldState, recurring: readonly Recurring[]): BudgetLine[] {
  const base = applyEffectsToLines(
    toBudgetLines(character),
    inForceNow(activeEffectsFor(world, traitsFor(character), optionLookup)),
  )
  const byCode = new Map(base.map((l) => [l.code, { ...l }]))
  for (const r of recurring) {
    const found = byCode.get(r.code)
    if (found) byCode.set(r.code, { ...found, amountCents: found.amountCents - r.amountCents })
    else
      byCode.set(r.code, {
        code: r.code, group: 'constrained', amountCents: -r.amountCents,
        value: { amount: Math.abs(r.amountCents) / 100, unit: 'EUR_month', nature: 'fiction' },
      })
  }
  return [...byCode.values()]
}

/** Événements éligibles ET porteurs d'un enjeu : le filtre de `pickEvent`. */
function eligibleEvents(
  used: readonly string[], character: CharacterT, lines: readonly BudgetLine[], monthIndex: number,
): LifeEventT[] {
  // Comme `pickEvent` : le mois et l'année sont fournis aux conditions.
  const m = (2 + monthIndex) % 12
  const traits = { ...traitsFor(character), month: m + 1, year: 2027 + Math.floor((2 + monthIndex) / 12) }
  return events.filter(
    (e) =>
      !used.includes(e.id) &&
      evaluate(e.eligibility as Condition, traits) &&
      isMeaningful(resolveEvent(e, lines, traits)),
  )
}

/** Variation de reste à vivre que le rappel annoncerait : le `deltaCents` de `buildCallback`. */
function callbackDelta(target: CharacterT, world: WorldState): { effects: number; delta: Cents } {
  const effects = inForceNow(activeEffectsFor(world, traitsFor(target), optionLookup))
  const before = computeMonthlyBudget(toBudgetLines(target))
  const after = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(target), effects))
  return { effects: effects.length, delta: after.slackCents - before.slackCents }
}

/** Copie de `buildCallback` (useGame.ts), au texte près qui n'influe sur rien. */
function buildCallback(target: CharacterT, state: GameState, stream: Stream): Selection {
  const inForce = rulesInForce(state.world)
  if (inForce.length === 0) return { kind: 'none_available' }
  const all = inForceNow(activeEffectsFor(state.world, traitsFor(target), optionLookup))
  if (all.length === 0) return { kind: 'none_available' }
  // Comme `buildCallback` : la règle citée est celle dont on chiffre l'effet.
  const before = computeMonthlyBudget(toBudgetLines(target))
  const byRule = [...inForce].reverse()
    .map((r) => {
      const effects = all.filter((e) => e.rule.id === r.id)
      return { rule: r, effects, after: computeMonthlyBudget(applyEffectsToLines(toBudgetLines(target), effects)) }
    })
    .filter((x) => x.effects.length > 0)
  if (byRule.length === 0) return { kind: 'none_available' }
  const { rule, after } = byRule.find((x) => x.after.slackCents !== before.slackCents) ?? byRule[0]!
  const candidate: CallbackCandidate = {
    rule,
    characterId: target.id,
    deltaCents: after.slackCents - before.slackCents,
    here: `Son reste à vivre passe de ${formatEuros(before.slackCents)} à ${formatEuros(after.slackCents)} par mois.`,
    elsewhere: '',
  }
  return selectCallback([candidate], state.callbackSigns, stream)
}

/**
 * Part de la variation annoncée qui revient à la SEULE règle citée.
 *
 * Le rappel cite la dernière règle votée, mais chiffre la somme de toutes
 * les règles en vigueur. On mesure ici à quelle fréquence les deux
 * divergent de signe : le joueur lirait alors sa propre phrase à côté d'un
 * effet produit par une autre décision.
 */
function deltaOfRuleAlone(target: CharacterT, world: WorldState, rule: Rule): Cents {
  const effects = inForceNow(activeEffectsFor(world, traitsFor(target), optionLookup))
  return effects.filter((e) => e.rule.id === rule.id).reduce((s, e) => s + e.deltaCents, 0)
}

function castingPool(world: WorldState): CastingProfile[] {
  return characters.map((c) => ({
    id: c.id,
    incomeDecile: c.identity.incomeDecile,
    concernedByRule: perceptiblyConcerned(activeEffectsFor(world, traitsFor(c), optionLookup)),
  }))
}

/* ------------------------------------------------------------------ */
/* Politiques du joueur                                                */
/* ------------------------------------------------------------------ */

export type PolicyId = 'uniforme' | 'premier-affiche' | 'statu-quo' | 'adverse' | 'bienveillant'

/**
 * Ce que le joueur choisit, énoncé.
 *
 * Les choix du joueur ne tirent JAMAIS dans les flux de la partie : un
 * joueur réel ne les fait pas avancer, et le simulateur décalerait sinon les
 * tirages qu'il prétend observer. Ils ont leur propre générateur, dérivé de
 * la graine et du nom de la politique.
 */
export const POLICIES: Readonly<Record<PolicyId, string>> = {
  'uniforme':
    'Option de réforme et option d’événement tirées uniformément parmi celles proposées (choisissables).',
  'premier-affiche':
    'Toujours la première option affichée — ordre de rotation de l’écran de vote ; premier choix possible pour un événement. Mesure l’effet de la position.',
  'statu-quo':
    'Toujours le statu quo au vote ; événements au hasard.',
  'adverse':
    'Adversaire omniscient : au vote, rejoue en secret le tirage du personnage suivant pour chaque option et choisit celle qui rend son rappel le plus défavorable (au dernier acte : la pire pour la moyenne des personnages). Événements au hasard.',
  'bienveillant':
    'Miroir de l’adversaire : l’option qui rend le rappel suivant le plus favorable. Événements au hasard.',
}

type VoteContext = {
  readonly reform: ReformT
  readonly displayOrder: readonly number[]
  readonly state: GameState
  readonly seed: string
  readonly random: RandomSource
  readonly character: CharacterT
  readonly player: Stream
}

/**
 * Le personnage que l'acte suivant tirerait si le monde était `world`.
 *
 * Exact et non estimé : un flux se rejoue à l'identique depuis sa graine
 * (voir `advance`), on le clone donc au point exact où en est la partie.
 */
function foreseeNext(ctx: VoteContext, world: WorldState): CharacterT {
  const clone = createRandom(ctx.seed)
  advance(clone, { characters: ctx.random.characters.draws })
  const played = ctx.state.castHistory.map((d) => d.picked)
  const draw = castNext(castingPool(world), played, ctx.character.identity.incomeDecile, clone.characters)
  return byId(draw.picked)
}

function ruleFor(ctx: VoteContext, optionIndex: number): Rule {
  const option = ctx.reform.options[optionIndex]!
  return {
    id: `rule-${ctx.state.world.rules.length + 1}`,
    reformId: ctx.reform.id, optionId: option.id, shortLabel: option.label,
    playerWording: null, playerJudgement: null, diegeticMonth: '', replaces: null, status: 'in_force',
  }
}

/** Score d'une option du point de vue de l'oracle : delta du rappel à venir. */
function foreseenDelta(ctx: VoteContext, optionIndex: number): Cents {
  const world = applyRule(ctx.state.world, ruleFor(ctx, optionIndex))
  if (ctx.state.act < ACT_COUNT) return callbackDelta(foreseeNext(ctx, world), world).delta
  // Dernier acte : aucun rappel ne suit. On retient l'effet moyen sur tous.
  return characters.reduce((s, c) => s + callbackDelta(c, world).delta, 0) / characters.length
}

/** Parmi l'ordre affiché, l'indice d'option qui minimise `score` (premier affiché en cas d'égalité). */
const argminDisplayed = (order: readonly number[], score: (i: number) => number): number => {
  let best = order[0]!
  let bestScore = score(best)
  for (const i of order.slice(1)) {
    const s = score(i)
    if (s < bestScore) [best, bestScore] = [i, s]
  }
  return best
}

function voteFor(policy: PolicyId, ctx: VoteContext): number {
  switch (policy) {
    case 'uniforme': return ctx.player.int(ctx.reform.options.length)
    case 'premier-affiche': return ctx.displayOrder[0]!
    case 'statu-quo': {
      const i = ctx.reform.options.findIndex((o) => o.isStatusQuo)
      return i >= 0 ? i : 0
    }
    case 'adverse': return argminDisplayed(ctx.displayOrder, (i) => foreseenDelta(ctx, i))
    case 'bienveillant': return argminDisplayed(ctx.displayOrder, (i) => -foreseenDelta(ctx, i))
  }
}

/* ------------------------------------------------------------------ */
/* Une partie                                                          */
/* ------------------------------------------------------------------ */

export type MonthRecord = {
  readonly act: number
  readonly characterId: string
  readonly eventId: string | null
  /** Événement déjà présenté plus tôt dans la même partie. */
  readonly repeated: boolean
  /** Même événement que le mois précédent, chez le même personnage. */
  readonly consecutive: boolean
  /** Événement présenté sans aucune option choisissable : le mois est bloqué. */
  readonly blocked: boolean
}

export type CallbackRecord = {
  readonly act: number
  readonly characterId: string
  readonly kind: Selection['kind']
  readonly sign: CallbackSign | null
  /** Signe de la seule règle citée, quand un rappel est émis. */
  readonly citedRuleSign: CallbackSign | null
}

export type GameRecord = {
  readonly seed: string
  readonly casts: readonly Draw[]
  readonly reformIds: readonly string[]
  readonly votes: readonly { readonly reformId: string; readonly optionId: string; readonly position: number }[]
  readonly months: readonly MonthRecord[]
  readonly callbacks: readonly CallbackRecord[]
  readonly signs: readonly CallbackSign[]
  readonly withinCap: boolean
  /** Position, sur l'écran « Le choix vu par chacun » de son acte, du personnage incarné. */
  readonly playedImpactPositions: readonly number[]
}

/**
 * Une partie complète, sans préparation (`EMPTY_SETUP`), telle que le hook
 * la déroule en production.
 *
 * Deux fidélités sont voulues, même quand elles reproduisent un défaut :
 *
 *   - le mois suivant est tiré DANS `resolveEvent`, avec l'état du rendu en
 *     cours : la liste des événements déjà vus n'y contient pas encore celui
 *     qu'on vient de résoudre, et le relevé n'y porte pas encore son effet
 *     récurrent. Le premier mois d'un acte, tiré depuis `startMonths`, voit
 *     au contraire l'état à jour ;
 *   - la liste des événements vus n'est pas remise à zéro entre les actes.
 *
 * Un simulateur qui « corrigerait » l'un ou l'autre mesurerait un autre jeu.
 */
export function playGame(seed: string, policy: PolicyId): GameRecord {
  const random = createRandom(seed)
  const player = createRandom(`joueur::${policy}::${seed}`).events

  const firstPool: CastingProfile[] = characters.map((c) => ({
    id: c.id, incomeDecile: c.identity.incomeDecile, concernedByRule: true,
  }))
  const journal: Command[] = [
    { type: 'start', seed, contentVersion: '0.1.0', hypothesisSetId: 'sensibilite-faible' },
    { type: 'cast', draw: castFirst(firstPool, random.characters) },
  ]
  const reformOrder = random.events.shuffle(reforms)
  let state = journal.reduce(apply, initialState(seed, '0.1.0', 'sensibilite-faible'))
  const record = (...cmds: Command[]) => {
    for (const c of cmds) {
      journal.push(c)
      state = apply(state, c)
    }
  }

  let usedEvents: string[] = []
  let monthIndex = 0
  let reformIndex = 0
  const months: MonthRecord[] = []
  const callbacks: CallbackRecord[] = []
  const votes: { reformId: string; optionId: string; position: number }[] = []
  const playedImpactPositions: number[] = []
  const seen = new Set<string>()

  for (;;) {
    const character = byId(state.currentCharacterId!)
    let recurring: Recurring[] = []

    // startMonths : état à jour.
    let pending: LifeEventT | null =
      random.events.pick(eligibleEvents(usedEvents, character, linesFor(character, state.world, recurring), monthIndex)) ?? null
    const target = MONTHS_PER_ACT[state.act - 1] ?? 2
    for (let done = 0; done < target; done++) {
      const event = pending
      // Le choix se fait sur l'événement tel que l'écran le montre : chiffré
      // sur le relevé du moment.
      const linesNow = linesFor(character, state.world, recurring)
      const usedBefore = usedEvents
      const linesBefore = linesNow
      let blocked = false
      if (event) {
        const resolved = resolveEvent(event, linesNow, traitsFor(character))
        const budget = computeMonthlyBudget(linesNow)
        const stocks = toStocks(character)
        const choosable = resolved.options.filter(
          (o) => optionAvailability(o.effects, budget, stocks).kind !== 'impossible',
        )
        blocked = choosable.length === 0
        const previous = done > 0 ? months[months.length - 1]!.eventId : null
        months.push({
          act: state.act, characterId: character.id, eventId: event.id,
          repeated: seen.has(event.id), consecutive: previous === event.id, blocked,
        })
        seen.add(event.id)
        if (!blocked) {
          const option = policy === 'premier-affiche' ? choosable[0]! : choosable[player.int(choosable.length)]!
          record({ type: 'resolve_event', eventId: event.id, optionId: option.id })
          usedEvents = [...usedEvents, event.id]
          for (const f of option.effects)
            if (f.type === 'recurring') recurring = [...recurring, { code: f.code, amountCents: euros(f.amount) }]
        }
      } else {
        months.push({ act: state.act, characterId: character.id, eventId: null, repeated: false, consecutive: false, blocked: false })
      }
      monthIndex += 1
      // Mois suivant, tiré avec l'état du rendu courant, l'événement qui vient
      // d'être vécu exclu (comme `resolveEvent` → `pickEvent(justUsed)`).
      if (done + 1 < target)
        pending = random.events.pick(
          eligibleEvents(event ? [...usedBefore, event.id] : usedBefore, character, linesBefore, monthIndex),
        ) ?? null
    }

    // La relance et le jugement ne consomment aucun aléatoire et n'agissent
    // sur aucun tirage : ils sont omis.
    const reform = reformOrder[Math.min(reformIndex, reformOrder.length - 1)]!
    const displayOrder = rotationOrder(reform.options.length, state.act + seedOffset(seed, 'vote', reform.options.length))
    const optionIndex = voteFor(policy, { reform, displayOrder, state, seed, random, character, player })
    const option = reform.options[optionIndex]!
    votes.push({ reformId: reform.id, optionId: option.id, position: displayOrder.indexOf(optionIndex) })
    record({
      type: 'vote',
      rule: {
        id: `rule-${state.world.rules.length + 1}`,
        reformId: reform.id, optionId: option.id, shortLabel: option.label,
        playerWording: null, playerJudgement: null, diegeticMonth: '', replaces: null, status: 'in_force',
      },
    })

    // Écran d'impact : `screenIndex={state.act}`.
    const order = rotationOrder(characters.length, state.act + seedOffset(seed, 'impact', characters.length))
    playedImpactPositions.push(order.indexOf(characters.indexOf(character)))

    // nextAct
    if (state.act >= ACT_COUNT) {
      record({ type: 'end' })
      break
    }
    const played = state.castHistory.map((d) => d.picked)
    const draw = castNext(castingPool(state.world), played, character.identity.incomeDecile, random.characters)
    const next = byId(draw.picked)
    const selection = buildCallback(next, state, random.presentation)
    const cmds: Command[] = [{ type: 'cast', draw }]
    if (selection.kind === 'selected')
      cmds.push({ type: 'emit_callback', ruleId: selection.callback.rule.id, sign: selection.callback.sign })
    const citedRuleSign =
      selection.kind === 'selected'
        ? signOf(deltaOfRuleAlone(next, state.world, selection.callback.rule))
        : null
    callbacks.push({
      act: state.act + 1,
      characterId: next.id,
      kind: selection.kind,
      sign: selection.kind === 'selected' ? selection.callback.sign : null,
      citedRuleSign,
    })
    record(...cmds)
    reformIndex = Math.min(reformIndex + 1, reformOrder.length - 1)
  }

  return {
    seed,
    casts: state.castHistory,
    reformIds: reformOrder.slice(0, ACT_COUNT).map((r) => r.id),
    votes,
    months,
    callbacks,
    signs: state.callbackSigns,
    withinCap: describeComposition(state.callbackSigns).withinCap && withinCapAtEveryStep(state.callbackSigns),
    playedImpactPositions,
  }
}

/**
 * Le plafond vérifié à chaque préfixe, et pas seulement en fin de partie.
 *
 * Recalculé ici plutôt que repris du moteur : un rapport qui se contenterait
 * de relire le verdict de la fonction qu'il contrôle ne contrôlerait rien.
 */
function withinCapAtEveryStep(signs: readonly CallbackSign[]): boolean {
  let unfavourable = 0
  for (let n = 1; n <= signs.length; n++) {
    if (signs[n - 1] === 'unfavourable') unfavourable++
    if (unfavourable > unfavourableCap(n)) return false
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Agrégation                                                          */
/* ------------------------------------------------------------------ */

type Counter = Record<string, number>
const inc = (c: Counter, k: string, by = 1) => {
  c[k] = (c[k] ?? 0) + by
}

export type PolicyReport = {
  readonly policy: PolicyId
  readonly runs: number
  readonly drawsByAct: readonly Counter[]
  readonly firstDrawChi2: number
  readonly relaxations: readonly Counter[]
  readonly eligibleSizeByAct: readonly Counter[]
  readonly reformsByAct: readonly Counter[]
  readonly voteOptions: Counter
  readonly votePositions: Counter
  readonly eventsByCharacter: Readonly<Record<string, Counter>>
  readonly monthsByCharacter: Counter
  readonly emptyMonthsByCharacter: Counter
  readonly repeatedMonths: number
  readonly consecutiveMonths: number
  readonly blockedMonths: number
  readonly totalMonths: number
  readonly gamesWithRepeat: number
  readonly callbackKindsByAct: readonly Counter[]
  readonly callbackSignsByAct: readonly Counter[]
  readonly citedRuleSignMismatch: number
  readonly emittedCallbacks: number
  readonly perGameComposition: Counter
  readonly capViolations: number
  readonly strictHalfViolations: number
  readonly gamesWithoutCallback: number
  readonly playedImpactPositions: Counter
}

export function simulatePolicy(policy: PolicyId, runs: number, seedPrefix = 'sim'): PolicyReport {
  const drawsByAct: Counter[] = [{}, {}, {}]
  const relaxations: Counter[] = [{}, {}, {}]
  const eligibleSizeByAct: Counter[] = [{}, {}, {}]
  const reformsByAct: Counter[] = [{}, {}, {}]
  const voteOptions: Counter = {}
  const votePositions: Counter = {}
  const eventsByCharacter: Record<string, Counter> = {}
  const monthsByCharacter: Counter = {}
  const emptyMonthsByCharacter: Counter = {}
  const callbackKindsByAct: Counter[] = [{}, {}, {}]
  const callbackSignsByAct: Counter[] = [{}, {}, {}]
  const perGameComposition: Counter = {}
  const playedImpactPositions: Counter = {}
  let repeatedMonths = 0, consecutiveMonths = 0, blockedMonths = 0, totalMonths = 0, gamesWithRepeat = 0
  let citedRuleSignMismatch = 0, emittedCallbacks = 0
  let capViolations = 0, strictHalfViolations = 0, gamesWithoutCallback = 0

  for (let i = 0; i < runs; i++) {
    const g = playGame(`${seedPrefix}-${i}`, policy)
    g.casts.forEach((d, a) => {
      inc(drawsByAct[a]!, d.picked)
      inc(eligibleSizeByAct[a]!, String(d.eligible.length))
      if (a > 0) inc(relaxations[a]!, d.relaxed.length === 0 ? 'aucune' : d.relaxed.join(' + '))
    })
    g.reformIds.forEach((r, a) => inc(reformsByAct[a]!, r))
    for (const v of g.votes) {
      inc(voteOptions, v.optionId)
      inc(votePositions, String(v.position + 1))
    }
    for (const m of g.months) {
      totalMonths++
      inc(monthsByCharacter, m.characterId)
      if (m.eventId === null) inc(emptyMonthsByCharacter, m.characterId)
      else inc((eventsByCharacter[m.characterId] ??= {}), m.eventId)
      if (m.repeated) repeatedMonths++
      if (m.consecutive) consecutiveMonths++
      if (m.blocked) blockedMonths++
    }
    if (g.months.some((m) => m.repeated)) gamesWithRepeat++
    for (const c of g.callbacks) {
      inc(callbackKindsByAct[c.act - 1]!, c.kind)
      if (c.sign) {
        emittedCallbacks++
        inc(callbackSignsByAct[c.act - 1]!, c.sign)
        if (c.citedRuleSign !== c.sign) citedRuleSignMismatch++
      }
    }
    const u = g.signs.filter((s) => s === 'unfavourable').length
    const f = g.signs.filter((s) => s === 'favourable').length
    const n = g.signs.length - u - f
    inc(perGameComposition, `${u}D ${n}N ${f}F`)
    if (!g.withinCap) capViolations++
    if (g.signs.length > 0 && 2 * u > g.signs.length) strictHalfViolations++
    if (g.signs.length === 0) gamesWithoutCallback++
    for (const p of g.playedImpactPositions) inc(playedImpactPositions, String(p + 1))
  }

  return {
    policy, runs, drawsByAct, firstDrawChi2: chi2Uniform(drawsByAct[0]!, characters.map((c) => c.id), runs),
    relaxations, eligibleSizeByAct, reformsByAct, voteOptions, votePositions,
    eventsByCharacter, monthsByCharacter, emptyMonthsByCharacter,
    repeatedMonths, consecutiveMonths, blockedMonths, totalMonths, gamesWithRepeat,
    callbackKindsByAct, callbackSignsByAct, citedRuleSignMismatch, emittedCallbacks,
    perGameComposition, capViolations, strictHalfViolations, gamesWithoutCallback,
    playedImpactPositions,
  }
}

/** Statistique du khi-deux contre l'uniforme. */
export function chi2Uniform(counts: Counter, keys: readonly string[], total: number): number {
  const expected = total / keys.length
  return keys.reduce((s, k) => s + ((counts[k] ?? 0) - expected) ** 2 / expected, 0)
}

/**
 * Seuil du khi-deux à p = 0,001 (approximation de Wilson-Hilferty).
 *
 * Un seuil aussi strict est voulu : le script tourne sur des graines fixes,
 * et un faux positif bloquerait sans raison. Un biais réel, lui, grandit
 * avec le nombre de parties et finit toujours par le franchir.
 */
export function chi2Critical(df: number): number {
  const z = 3.0902
  const a = 2 / (9 * df)
  return df * (1 - a + z * Math.sqrt(a)) ** 3
}

/**
 * Capacité structurelle de chaque personnage : événements éligibles et
 * porteurs d'enjeu sur son relevé de base, sans règle votée ni événement
 * déjà vu. En deçà du nombre de mois d'un acte, des mois passent à vide
 * même dans le meilleur des cas.
 */
export function eventCapacity(): Record<string, number> {
  return Object.fromEntries(
    characters.map((c) => [c.id, eligibleEvents([], c, linesFor(c, { rules: [], hypothesisSetId: 'sensibilite-faible' }, []), 0).length]),
  )
}

/** Positions occupées, sur les trois écrans d'impact d'une partie, par chaque personnage. */
export function impactScreenPositions(): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (let act = 1; act <= ACT_COUNT; act++) {
    const order = rotationOrder(characters.length, act)
    characters.forEach((c, i) => (out[c.id] ??= []).push(order.indexOf(i) + 1))
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

const pct = (n: number, d: number, digits = 1) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(digits)} %`)
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))
const lpad = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s)

function table(rows: readonly string[], cols: readonly string[], cell: (r: string, c: string) => string, head = ''): string {
  const w0 = Math.max(head.length, ...rows.map((r) => r.length)) + 2
  const ws = cols.map((c) => Math.max(c.length, 9) + 2)
  const line = (first: string, cells: readonly string[]) =>
    '  ' + pad(first, w0) + cells.map((c, i) => lpad(c, ws[i]!)).join('')
  return [line(head, cols), ...rows.map((r) => line(r, cols.map((c) => cell(r, c))))].join('\n')
}

export function formatReport(reports: readonly PolicyReport[]): string {
  const out: string[] = []
  const ids = characters.map((c) => c.id)
  const P = reports.map((r) => r.policy)
  const R = (p: string) => reports.find((r) => r.policy === p)!
  const runs = reports[0]!.runs
  const crit = chi2Critical(ids.length - 1)

  out.push(`SIMULATION — ${runs} parties par politique, ${reports.length} politiques`)
  out.push(`Corpus : ${characters.length} personnages, ${events.length} événements, ${reforms.length} réformes ; ${ACT_COUNT} actes de ${MONTHS_PER_ACT.join('/')} mois.`)
  out.push('')
  out.push('Politiques du joueur :')
  for (const p of P) out.push(`  - ${p} : ${POLICIES[p]}`)

  out.push('\n1. QUOTA DE RAPPELS DÉFAVORABLES (F2) — doit être nul')
  out.push(table(P, ['violations', 'moitié stricte', 'sans rappel'], (p, c) => {
    const r = R(p)
    if (c === 'violations') return `${r.capViolations} (${pct(r.capViolations, r.runs, 2)})`
    if (c === 'moitié stricte') return pct(r.strictHalfViolations, r.runs)
    return pct(r.gamesWithoutCallback, r.runs)
  }, 'politique'))
  out.push('  « violations » : plafond du moteur, ceil(n/2) défavorables pour n rappels, vérifié à chaque rappel.')
  out.push('  « moitié stricte » : parties où les défavorables dépassent strictement la moitié (F2 lu à la lettre) ;')
  out.push('  avec le plafond arrondi au supérieur, une partie à un seul rappel, défavorable, en fait partie.')

  out.push('\n2. PREMIER TIRAGE (F3) — doit être uniforme')
  out.push(table(ids, P, (id, p) => pct(R(p).drawsByAct[0]![id] ?? 0, runs), 'personnage'))
  out.push(`  attendu : ${pct(1, ids.length)} chacun. Khi-deux (ddl ${ids.length - 1}, seuil p=0,001 : ${crit.toFixed(1)}) : ` +
    reports.map((r) => `${r.policy} ${r.firstDrawChi2.toFixed(1)}`).join(', '))

  for (const act of [2, 3]) {
    out.push(`\n3.${act - 1}. TIRAGE À L'ACTE ${act === 2 ? 'II' : 'III'}`)
    out.push(table(ids, P, (id, p) => pct(R(p).drawsByAct[act - 1]![id] ?? 0, runs), 'personnage'))
    const sizes = (p: string) => {
      const c = R(p).eligibleSizeByAct[act - 1]!
      const n = Object.entries(c).reduce((s, [k, v]) => s + Number(k) * v, 0)
      return (n / runs).toFixed(1)
    }
    out.push(`  taille moyenne de l'ensemble admissible : ${P.map((p) => `${p} ${sizes(p)}`).join(', ')}`)
    const keys = [...new Set(reports.flatMap((r) => Object.keys(r.relaxations[act - 1]!)))].sort()
    out.push('  contraintes relâchées :')
    out.push(table(keys, P, (k, p) => pct(R(p).relaxations[act - 1]![k] ?? 0, runs), ''))
  }
  const never = (act: number) => P.flatMap((p) => ids.filter((id) => !R(p).drawsByAct[act - 1]![id]).map((id) => `${id} (${p})`))
  const neverAll = [2, 3].flatMap((a) => never(a).map((s) => `acte ${a} : ${s}`))
  out.push(neverAll.length ? `  JAMAIS TIRÉS : ${neverAll.join(' ; ')}` : '  Tous les personnages sont tirés au moins une fois à chaque acte.')

  out.push('\n4. RÉFORMES — fréquence par acte (politique uniforme ; l’ordre ne dépend pas du joueur)')
  const u = reports[0]!
  out.push(table(reforms.map((r) => r.id), ['acte I', 'acte II', 'acte III'], (id, c) =>
    pct(u.reformsByAct[['acte I', 'acte II', 'acte III'].indexOf(c)]![id] ?? 0, runs), 'réforme'))
  out.push(`  attendu : ${pct(1, reforms.length)}. Khi-deux acte I : ${chi2Uniform(u.reformsByAct[0]!, reforms.map((r) => r.id), runs).toFixed(1)} (seuil ${chi2Critical(reforms.length - 1).toFixed(1)}).`)

  out.push('\n5. VOTES — option retenue et position à l’écran')
  const sq = (r: PolicyReport) => r.voteOptions['statu-quo'] ?? 0
  const cc = (r: PolicyReport) => r.voteOptions['contester-cadrage'] ?? 0
  out.push(table(P, ['statu quo', 'contester', 'autres', 'pos. 1', 'pos. 5'], (p, c) => {
    const r = R(p)
    const total = runs * ACT_COUNT
    if (c === 'statu quo') return pct(sq(r), total)
    if (c === 'contester') return pct(cc(r), total)
    if (c === 'autres') return pct(total - sq(r) - cc(r), total)
    return pct(r.votePositions[c.slice(-1)] ?? 0, total)
  }, 'politique'))
  const optionsLen = reforms[0]!.options.length
  out.push(`  Ordre d'affichage du vote, rotationOrder(${optionsLen}, acte), avant le décalage propre à chaque graine :`)
  for (let act = 1; act <= ACT_COUNT; act++) {
    const order = rotationOrder(optionsLen, act)
    out.push(`    acte ${act} : ${order.map((i) => (i === 0 ? 'statu-quo' : i === optionsLen - 1 ? 'contester' : `option ${i}`)).join(' · ')}`)
  }

  out.push('\n6. ÉVÉNEMENTS PAR PERSONNAGE (politique uniforme)')
  const cap = eventCapacity()
  out.push(table(ids, ['capacité', 'mois joués', 'mois vides', 'distincts'], (id, c) => {
    if (c === 'capacité') return String(cap[id])
    if (c === 'mois joués') return String(u.monthsByCharacter[id] ?? 0)
    if (c === 'mois vides') return pct(u.emptyMonthsByCharacter[id] ?? 0, u.monthsByCharacter[id] ?? 0)
    return String(Object.keys(u.eventsByCharacter[id] ?? {}).length)
  }, 'personnage'))
  const maxMonths = Math.max(...MONTHS_PER_ACT)
  const short = ids.filter((id) => cap[id]! < maxMonths)
  out.push(`  « capacité » : événements éligibles et porteurs d'enjeu sur le relevé de base, sans règle ni événement déjà vu.`)
  out.push(short.length
    ? `  MOINS D'ÉVÉNEMENTS QUE DE MOIS (${maxMonths}) : ${short.map((id) => `${id} (${cap[id]})`).join(', ')}`
    : `  Chaque personnage dispose d'au moins ${maxMonths} événements.`)
  const evTotals: Counter = {}
  for (const c of Object.values(u.eventsByCharacter)) for (const [k, v] of Object.entries(c)) inc(evTotals, k, v)
  out.push('  fréquence globale (part des mois) : ' +
    [...events.map((e) => e.id)].sort((a, b) => (evTotals[b] ?? 0) - (evTotals[a] ?? 0))
      .map((e) => `${e} ${pct(evTotals[e] ?? 0, u.totalMonths)}`).join(', '))
  const absent = events.map((e) => e.id).filter((e) => !evTotals[e])
  if (absent.length) {
    const reachable = absent.filter((e) => characters.some((c) => evaluate(events.find((x) => x.id === e)!.eligibility as Condition, traitsFor(c))))
    out.push(`  JAMAIS PRÉSENTÉS : ${absent.join(', ')}` +
      (reachable.length < absent.length ? ' — éligibilité fausse pour tous les personnages (attribut absent du sac de traits ?)' : ''))
  }
  out.push(table(P, ['répétés', 'consécutifs', 'parties', 'bloqués'], (p, c) => {
    const r = R(p)
    if (c === 'répétés') return pct(r.repeatedMonths, r.totalMonths, 2)
    if (c === 'consécutifs') return pct(r.consecutiveMonths, r.totalMonths, 2)
    if (c === 'parties') return pct(r.gamesWithRepeat, r.runs, 2)
    return pct(r.blockedMonths, r.totalMonths, 2)
  }, 'politique'))
  out.push('  « répétés » : mois dont l’événement a déjà été présenté dans la partie ; « consécutifs » : le même que le mois')
  out.push('  précédent ; « parties » : parties avec au moins une répétition ; « bloqués » : aucune option choisissable.')

  out.push('\n7. RAPPELS — signe et disponibilité')
  for (const act of [2, 3]) {
    out.push(`  acte ${act === 2 ? 'II' : 'III'} :`)
    out.push(table(P, ['défavorable', 'neutre', 'favorable', 'aucun', 'bloqué'], (p, c) => {
      const r = R(p)
      const k = r.callbackKindsByAct[act - 1]!
      const s = r.callbackSignsByAct[act - 1]!
      if (c === 'défavorable') return pct(s['unfavourable'] ?? 0, runs)
      if (c === 'neutre') return pct(s['neutral'] ?? 0, runs)
      if (c === 'favorable') return pct(s['favourable'] ?? 0, runs)
      if (c === 'aucun') return pct(k['none_available'] ?? 0, runs)
      return pct(k['quota_blocked'] ?? 0, runs)
    }, 'politique'))
  }
  out.push('  « aucun » : aucune règle en vigueur ne touche le personnage tiré ; « bloqué » : rappel retenu par le quota.')
  out.push('  Composition des rappels par partie (D défavorable, N neutre, F favorable) :')
  const comps = [...new Set(reports.flatMap((r) => Object.keys(r.perGameComposition)))].sort()
  out.push(table(comps, P, (k, p) => pct(R(p).perGameComposition[k] ?? 0, runs), ''))
  out.push('  Rappels dont la règle citée, seule, n’a pas le signe de l’effet annoncé (qui cumule toutes les règles) :')
  out.push('  ' + reports.map((r) => `${r.policy} ${pct(r.citedRuleSignMismatch, r.emittedCallbacks)}`).join(', '))

  out.push('\n8. ÉQUILIBRE POSITIONNEL — écran « Le choix vu par chacun » (rotation décalée par la graine)')
  // Sur autant de graines que de parties simulées : part des écrans où chaque
  // personnage ouvre la liste, et part où il la ferme.
  const heads: Record<string, number> = {}
  const tails: Record<string, number> = {}
  for (let k = 0; k < runs; k++) {
    for (let act = 1; act <= ACT_COUNT; act++) {
      const order = rotationOrder(characters.length, act + seedOffset(`pos-${k}`, 'impact', characters.length))
      heads[characters[order[0]!]!.id] = (heads[characters[order[0]!]!.id] ?? 0) + 1
      tails[characters[order[order.length - 1]!]!.id] = (tails[characters[order[order.length - 1]!]!.id] ?? 0) + 1
    }
  }
  out.push(table(ids, ['en tête', 'en dernier'], (id, c) =>
    pct((c === 'en tête' ? heads[id] : tails[id]) ?? 0, runs * ACT_COUNT), 'personnage'))
  out.push(`  attendu : ${pct(1, ids.length)} pour chacun.`)
  out.push('  Position du personnage incarné sur l’écran de son acte (1 = en tête) :')
  const positions = Array.from({ length: ids.length }, (_, i) => String(i + 1))
  const mean = (r: PolicyReport) =>
    Object.entries(r.playedImpactPositions).reduce((s, [k, v]) => s + Number(k) * v, 0) / (r.runs * ACT_COUNT)
  out.push(table(positions, P, (k, p) => pct(R(p).playedImpactPositions[k] ?? 0, runs * ACT_COUNT), 'position'))
  out.push(`  moyenne (attendu ${((ids.length + 1) / 2).toFixed(1)}) : ${reports.map((r) => `${r.policy} ${mean(r).toFixed(2)}`).join(', ')}`)

  return out.join('\n')
}

/* ------------------------------------------------------------------ */
/* Point d'entrée                                                      */
/* ------------------------------------------------------------------ */

export type Verdict = { readonly ok: boolean; readonly failures: readonly string[] }

/** Ce qui fait échouer le script : le quota, et l'uniformité du premier tirage. */
export function verdict(reports: readonly PolicyReport[]): Verdict {
  const failures: string[] = []
  const crit = chi2Critical(characters.length - 1)
  for (const r of reports) {
    if (r.capViolations > 0) failures.push(`${r.policy} : ${r.capViolations} partie(s) violent le quota de rappels défavorables`)
    if (r.firstDrawChi2 > crit)
      failures.push(`${r.policy} : premier tirage non uniforme (khi-deux ${r.firstDrawChi2.toFixed(1)} > ${crit.toFixed(1)})`)
  }
  return { ok: failures.length === 0, failures }
}

function parseArgs(argv: readonly string[]) {
  const get = (name: string) => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const runs = Number(get('--runs') ?? 1000)
  if (!Number.isInteger(runs) || runs <= 0) throw new Error('--runs attend un entier positif')
  const policies = (get('--policies')?.split(',') ?? Object.keys(POLICIES)) as PolicyId[]
  for (const p of policies) if (!(p in POLICIES)) throw new Error(`politique inconnue : ${p}`)
  return { runs, policies, json: argv.includes('--json'), seedPrefix: get('--seed') ?? 'sim' }
}

if (import.meta.main) {
  const { runs, policies, json, seedPrefix } = parseArgs(process.argv.slice(2))
  const reports = policies.map((p) => simulatePolicy(p, runs, seedPrefix))
  const v = verdict(reports)
  if (json) {
    console.log(JSON.stringify({ runs, seedPrefix, eventCapacity: eventCapacity(), impactScreenPositions: impactScreenPositions(), reports, verdict: v }, null, 2))
  } else {
    console.log(formatReport(reports))
    console.log(v.ok ? '\n✓ Quota respecté dans toutes les parties ; premier tirage uniforme.' : `\n✗ ${v.failures.join('\n✗ ')}`)
  }
  process.exit(v.ok ? 0 : 1)
}
