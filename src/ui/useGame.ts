import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { castChosen, castFirst, castNext, type CastingProfile } from '@/core/casting.ts'
import { selectCallback, type CallbackCandidate, type Selection } from '@/core/callback.ts'
import { evaluate, type Condition } from '@/core/conditions.ts'
import { apply, initialState, MONTHS_PER_ACT, ACT_COUNT, type Command, type GameState } from '@/core/game.ts'
import { euros, formatEuros, type Cents } from '@/core/money.ts'
import type { Judgement } from '@/core/opinion.ts'
import { advance, createRandom, drawCounts } from '@/core/rng.ts'
import {
  activeEffectsFor, applyEffectsToLines, inForceNow, perceptiblyConcerned, rulesInForce,
  type Rule,
} from '@/core/world.ts'
import type { BudgetLine } from '@/core/types.ts'
import { characters, events, optionLookup, reforms, toBudgetLines, toStocks, traitsOf } from '@/content/load.ts'
import type { CharacterT, LifeEventT, ReformOptionT } from '@/schemas/index.ts'
import { EMPTY_SETUP, type Setup } from './setup.ts'
import { FORMAT_VERSION, load, save, type Saved } from './persistence.ts'
import { entryOf, exceptionalOf, type MonthEntry } from './monthLog.ts'
import { isMeaningful, resolveEvent as resolveFor } from '@/core/eventResolve.ts'

/**
 * Orchestration d'une partie.
 *
 * Toute decision passe par le journal de commandes : l'etat affiche est
 * derive de `journal.reduce(apply, …)`, jamais maintenu en parallele.
 * C'est ce qui garantit qu'une sauvegarde rechargee produira exactement la
 * meme partie, et que le bilan decrit ce qui s'est reellement passe.
 */

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export type Step =
  | { readonly kind: 'home' }
  | { readonly kind: 'contract' }
  | { readonly kind: 'intro' }
  | { readonly kind: 'month'; readonly event: LifeEventT | null }
  | { readonly kind: 'callback'; readonly selection: Selection }
  /**
   * La relance : la meme question sur une decision deja prise, posee APRES
   * les mois vecus chez le personnage qu'elle concerne. Elle venait des
   * l'arrivee, avant que le joueur ait vu ses revenus et son releve : il
   * devait rejuger une regle sur une personne qu'il ne connaissait pas
   * encore.
   */
  | { readonly kind: 'relaunch'; readonly questionId: string }
  | { readonly kind: 'reform' }
  | { readonly kind: 'judgement' }
  | { readonly kind: 'impact' }
  | { readonly kind: 'summary' }

const CONTENT_VERSION = '0.1.0'

/**
 * Etape, sous une forme stockable.
 *
 * L'etape elle-meme porte un evenement complet et une selection de rappel ;
 * on n'en conserve que ce qui ne se recalcule pas, pour que relire une
 * sauvegarde ne depende jamais d'un objet de contenu fige dans le stockage.
 */
type StepSnapshot =
  | { readonly kind: 'month'; readonly eventId: string | null }
  | { readonly kind: 'callback'; readonly selection: Selection }
  | { readonly kind: 'relaunch'; readonly questionId: string }
  | { readonly kind: Exclude<Step['kind'], 'month' | 'callback' | 'relaunch'> }

const snapshotStep = (step: Step): StepSnapshot =>
  step.kind === 'month'
    ? { kind: 'month', eventId: step.event?.id ?? null }
    : step.kind === 'callback'
      ? { kind: 'callback', selection: step.selection }
      : step.kind === 'relaunch'
        ? { kind: 'relaunch', questionId: step.questionId }
        : { kind: step.kind }

const restoreStep = (snap: StepSnapshot): Step => {
  if (snap.kind === 'month')
    return { kind: 'month', event: events.find((e) => e.id === snap.eventId) ?? null }
  if (snap.kind === 'callback') return { kind: 'callback', selection: snap.selection }
  if (snap.kind === 'relaunch') return { kind: 'relaunch', questionId: snap.questionId }
  return { kind: snap.kind }
}

/** Effets recurrents accumules par les choix d'evenements. */
type Recurring = { readonly code: string; readonly amountCents: Cents }

export function useGame(seed: string, setup: Setup = EMPTY_SETUP) {
  /**
   * Partie sauvegardee, relue UNE FOIS au montage.
   *
   * Ecartee si elle porte une autre graine : l'adresse fait foi, sans quoi
   * ouvrir un lien partage rouvrirait la partie precedente a la place.
   */
  const restored = useMemo<Saved<StepSnapshot> | null>(() => {
    if (typeof window === 'undefined') return null
    const found = load<StepSnapshot>(CONTENT_VERSION)
    return found && found.seed === seed ? found : null
  }, [seed])

  const random = useMemo(() => {
    const r = createRandom(seed)
    // Replacer les flux la ou ils en etaient : voir `advance` dans rng.ts.
    // Sans cela une partie rechargee divergerait de la meme partie jouee
    // d'une traite, en silence.
    if (restored) advance(r, restored.cursor.draws)
    return r
  }, [seed, restored])

  const monthIndex = useRef(restored?.cursor.monthIndex ?? 0)

  const profiles = useMemo(
    () =>
      characters.map((c) => ({
        id: c.id,
        incomeDecile: c.identity.incomeDecile,
        concernedByRule: true,
      })),
    [],
  )

  const [journal, setJournal] = useState<readonly Command[]>(() => {
    if (restored) return restored.journal
    /*
     * Une place preparee est IMPOSEE, les autres restent tirees.
     *
     * `castChosen` ne consomme aucun aleatoire, de sorte qu'imposer le
     * premier personnage ne decale pas le reste de la partie : a graine
     * egale, les evenements du mois restent les memes.
     */
    const first = setup.characterIds[0]
    const draw = first ? castChosen(first, profiles) : castFirst(profiles, random.characters)
    return [
      { type: 'start', seed, contentVersion: '0.1.0', hypothesisSetId: 'sensibilite-faible' },
      { type: 'cast', draw },
    ]
  })

  const [step, setStep] = useState<Step>(() =>
    restored ? restoreStep(restored.cursor.step) : { kind: 'home' },
  )
  const [monthsDone, setMonthsDone] = useState(restored?.cursor.monthsDone ?? 0)
  const [recurring, setRecurring] = useState<readonly Recurring[]>(restored?.cursor.recurring ?? [])
  const [oneOff, setOneOff] = useState<Cents>(restored?.cursor.oneOffCents ?? 0)
  const [wording, setWording] = useState(restored?.cursor.wording ?? '')
  const [usedEvents, setUsedEvents] = useState<readonly string[]>(restored?.cursor.usedEvents ?? [])
  const [reformIndex, setReformIndex] = useState(restored?.cursor.reformIndex ?? 0)
  // Optionnel dans le curseur : une sauvegarde plus ancienne reprend avec un
  // historique vide plutôt que d'être écartée.
  const [monthLog, setMonthLog] = useState<readonly MonthEntry[]>(restored?.cursor.monthLog ?? [])
  /** Question a reposer une fois les mois de l'acte vecus. Optionnel dans le curseur. */
  const [pendingRelaunch, setPendingRelaunch] = useState<string | null>(restored?.cursor.pendingRelaunch ?? null)

  /**
   * Ordre des reformes, tire une fois au debut de la partie.
   *
   * Le corpus en compte plus qu'une partie n'en presente : sans tirage,
   * chaque partie montrerait les memes, et les autres ne seraient jamais
   * vues. Le tirage passe par le flux `events`, qui porte deja ce qui
   * survient dans le monde.
   */
  const reformOrder = useMemo(() => {
    const drawn = random.events.shuffle(reforms)
    if (setup.reformIds.length === 0) return drawn
    /*
     * Les decisions imposees passent devant, dans l'ordre demande ; le
     * tirage fournit les suivantes, en retirant celles deja placees pour ne
     * pas reposer deux fois la meme question.
     */
    const chosen = setup.reformIds
      .map((id) => reforms.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
    const taken = new Set(chosen.map((r) => r.id))
    return [...chosen, ...drawn.filter((r) => !taken.has(r.id))]
  }, [random, setup.reformIds])

  const state: GameState = useMemo(
    () => journal.reduce(apply, initialState(seed, '0.1.0', 'sensibilite-faible')),
    [journal, seed],
  )
  const record = useCallback((...cmds: Command[]) => setJournal((j) => [...j, ...cmds]), [])

  const character = characters.find((c) => c.id === state.currentCharacterId) ?? characters[0]!
  const traits = traitsOf(character)
  const reform = reformOrder[Math.min(reformIndex, reformOrder.length - 1)]!

  /* ------------------------------------------------------------ budget */
  const lines: BudgetLine[] = useMemo(() => {
    // `inForceNow` : le releve du mois ne montre que ce qui s'applique
    // deja. Un effet d'horizon y5 y figurait comme acquis.
    const base = applyEffectsToLines(
      toBudgetLines(character),
      inForceNow(activeEffectsFor(state.world, traits, optionLookup)),
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
  }, [character, state.world, traits, recurring])

  const budget = useMemo(() => computeMonthlyBudget(lines), [lines])
  const stocks = useMemo(() => toStocks(character), [character])

  /* ------------------------------------------------- date diégétique */
  const month = useMemo(() => {
    const m = (2 + monthIndex.current) % 12
    const y = 2027 + Math.floor((2 + monthIndex.current) / 12)
    return `${MONTH_NAMES[m]!} ${y}`
  }, [monthsDone, state.act])

  /* ----------------------------------------------------- événements */
  /*
   * `justUsed` : l'événement que l'on vient de résoudre. Appelée depuis
   * `resolveEvent`, cette fonction voit encore l'état d'AVANT la mise à jour
   * — `usedEvents` ne contient pas l'événement du mois écoulé — et le même
   * événement revenait le mois suivant dans 13,8 % des mois et 78 % des
   * parties. Relevé par le simulateur (scripts/simulate.ts).
   *
   * Le mois et l'année sont fournis aux conditions : le vocabulaire les
   * déclare « fournis par le moteur », mais personne ne les fournissait, et
   * le voyage scolaire — réservé aux mois de mars à mai — n'apparaissait
   * jamais.
   */
  const pickEvent = useCallback((justUsed: readonly string[] = []): LifeEventT | null => {
    const m = (2 + monthIndex.current) % 12
    const context = { ...traits, month: m + 1, year: 2027 + Math.floor((2 + monthIndex.current) / 12) }
    // Écartés aussi : ceux qui, chiffrés sur CETTE situation, ne mettent
    // rien en jeu ou ne laissent plus de choix.
    const eligible = events.filter(
      (e) =>
        !usedEvents.includes(e.id) && !justUsed.includes(e.id) &&
        evaluate(e.eligibility as Condition, context) &&
        isMeaningful(resolveFor(e, lines, context)),
    )
    return random.events.pick(eligible) ?? null
  }, [usedEvents, traits, lines, random])

  /* ------------------------------------------------------ callbacks */
  const buildCallback = useCallback(
    (target: CharacterT): Selection => {
      const inForce = rulesInForce(state.world)
      if (inForce.length === 0) return { kind: 'none_available' }
      // Le rappel parle du mois en cours — « son reste a vivre passe de X a
      // Y » — donc des seuls effets deja en vigueur.
      const all = inForceNow(activeEffectsFor(state.world, traitsOf(target), optionLookup))
      if (all.length === 0) return { kind: 'none_available' }

      /*
       * LA RÈGLE CITÉE EST CELLE DONT ON CHIFFRE L'EFFET.
       *
       * Le rappel citait la dernière règle votée, mais chiffrait l'effet de
       * TOUTES les règles en vigueur : dans 8 à 14 % des rappels, la règle
       * citée allait seule dans le sens inverse du montant affiché. On cite
       * maintenant la plus récente qui touche réellement ce personnage, et le
       * montant ne porte que sur elle.
       */
      const before = computeMonthlyBudget(toBudgetLines(target))
      const byRule = [...inForce].reverse()
        .map((r) => {
          const effects = all.filter((e) => e.rule.id === r.id)
          const after = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(target), effects))
          return { rule: r, effects, after }
        })
        .filter((x) => x.effects.length > 0)
      if (byRule.length === 0) return { kind: 'none_available' }
      const chosen = byRule.find((x) => x.after.slackCents !== before.slackCents) ?? byRule[0]!
      const { rule, effects, after } = chosen

      const candidate: CallbackCandidate = {
        rule,
        characterId: target.id,
        deltaCents: after.slackCents - before.slackCents,
        here: `Son reste à vivre passe de ${formatEuros(before.slackCents)} à ${formatEuros(after.slackCents)} par mois.`,
        elsewhere: effects
          .map((e) => e.effect.scope.description)
          .filter((d, i, a) => a.indexOf(d) === i)
          .join(' · '),
      }
      return selectCallback([candidate], state.callbackSigns, random.presentation)
    },
    [state.world, state.callbackSigns, random],
  )

  /* -------------------------------------------------------- actions */
  const toContract = () => setStep({ kind: 'contract' })
  const beginGame = () => setStep({ kind: 'intro' })
  const startMonths = () => setStep({ kind: 'month', event: pickEvent() })

  const resolveEvent = (event: LifeEventT | null, optionId: string | null) => {
    // Le relevé tel qu'il était CE mois-ci, avant que le choix ne modifie
    // les suivants.
    setMonthLog((log) => [
      ...log,
      { ...entryOf(budget, month), exceptionalCents: exceptionalOf(event, optionId), label: event?.descriptiveTitle ?? null },
    ])
    if (event && optionId) {
      const option = event.options.find((o) => o.id === optionId)
      record({ type: 'resolve_event', eventId: event.id, optionId })
      setUsedEvents((u) => [...u, event.id])
      for (const f of option?.effects ?? []) {
        if (f.type === 'one_off') setOneOff((v) => v + euros(f.amount))
        if (f.type === 'spread') setOneOff((v) => v + euros(f.amount / f.months))
        if (f.type === 'recurring')
          setRecurring((r) => [...r, { code: f.code, amountCents: euros(f.amount) }])
      }
    }
    monthIndex.current += 1
    const done = monthsDone + 1
    setMonthsDone(done)
    const target = MONTHS_PER_ACT[state.act - 1] ?? 2
    if (done >= target)
      setStep(pendingRelaunch ? { kind: 'relaunch', questionId: pendingRelaunch } : { kind: 'reform' })
    else setStep({ kind: 'month', event: pickEvent(event ? [event.id] : []) })
  }

  const vote = (option: ReformOptionT) => {
    const rule: Rule = {
      id: `rule-${state.world.rules.length + 1}`,
      reformId: reform.id,
      optionId: option.id,
      shortLabel: option.label,
      playerWording: wording.trim() || null,
      playerJudgement: null,
      diegeticMonth: month,
      replaces: null,
      status: 'in_force',
    }
    record({ type: 'vote', rule })
    setStep({ kind: 'judgement' })
  }

  const answer = (judgement: Judgement) => answerFor(reform.id, judgement)

  /**
   * Repond a une question donnee, pas forcement celle de l'acte en cours.
   *
   * C'est ce qui permet la RELANCE : reposer la question sur une decision
   * deja prise, au moment ou le joueur vient d'en voir l'effet sur
   * quelqu'un d'autre. Sans cela, chaque acte posant une reforme
   * differente, aucune question n'etait jamais reposee — et le suivi des
   * changements d'opinion, pourtant au coeur du projet, ne produisait rien.
   */
  const answerFor = (questionId: string, judgement: Judgement) => {
    record({
      type: 'answer',
      entry: {
        questionId, judgement, freeText: wording.trim() || null,
        turn: state.opinions.length + 1, characterId: character.id,
        context: `acte ${state.act}`,
      },
    })
  }

  const toImpact = () => setStep({ kind: 'impact' })

  const nextAct = () => {
    if (state.act >= ACT_COUNT) {
      record({ type: 'end' })
      setStep({ kind: 'summary' })
      return
    }
    const played = state.castHistory.map((d) => d.picked)
    const pool: CastingProfile[] = characters.map((c) => ({
      id: c.id,
      incomeDecile: c.identity.incomeDecile,
      concernedByRule: perceptiblyConcerned(
        activeEffectsFor(state.world, traitsOf(c), optionLookup),
      ),
    }))
    // La place preparee de cet acte, s'il y en a une et si elle n'a pas
    // deja ete jouee : imposer deux fois le meme personnage n'aurait pas
    // de sens, et le tirage normal reprend la main.
    const imposed = setup.characterIds[state.act]
    const draw =
      imposed !== undefined && !played.includes(imposed)
        ? castChosen(imposed, pool)
        : castNext(pool, played, character.identity.incomeDecile, random.characters)
    const target = characters.find((c) => c.id === draw.picked)!
    const selection = buildCallback(target)

    const cmds: Command[] = [{ type: 'cast', draw }]
    if (selection.kind === 'selected')
      cmds.push({ type: 'emit_callback', ruleId: selection.callback.rule.id, sign: selection.callback.sign })
    record(...cmds)

    setMonthsDone(0)
    setMonthLog([])
    setPendingRelaunch(selection.kind === 'selected' ? selection.callback.rule.reformId : null)
    setRecurring([])
    setOneOff(0)
    setWording('')
    setReformIndex((i) => Math.min(i + 1, reformOrder.length - 1))
    setStep({ kind: 'callback', selection })
  }

  const consultOthers = () => record({ type: 'open_other_characters' })

  /** Fin de la relance : on passe a la decision collective de l'acte. */
  const toReform = () => {
    setPendingRelaunch(null)
    setStep({ kind: 'reform' })
  }

  /**
   * Sauvegarde a chaque changement notable, et jamais depuis l'accueil.
   *
   * Ecrire des l'accueil enregistrerait une partie que personne n'a commencee,
   * et la proposerait a la reprise au prochain chargement.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (step.kind === 'home' || step.kind === 'contract') return
    save({
      format: FORMAT_VERSION,
      seed,
      contentVersion: CONTENT_VERSION,
      journal,
      cursor: {
        step: snapshotStep(step),
        monthsDone,
        monthIndex: monthIndex.current,
        reformIndex,
        usedEvents,
        recurring: recurring.map((r) => ({ code: r.code, amountCents: r.amountCents })),
        oneOffCents: oneOff,
        monthLog,
        pendingRelaunch,
        wording,
        draws: drawCounts(random),
      },
    })
  }, [seed, journal, step, monthsDone, reformIndex, usedEvents, recurring, oneOff, monthLog, pendingRelaunch, wording, random])

  /*
   * L'événement du mois, chiffré sur la situation courante. L'étape garde
   * l'événement BRUT — c'est lui que la sauvegarde référence — et l'écran
   * reçoit toujours sa version résolue.
   */
  const event = useMemo(
    () => (step.kind === 'month' && step.event ? resolveFor(step.event, lines, traits) : null),
    [step, lines, traits],
  )

  return {
    state, step, event, character, budget, stocks, lines, month, reform,
    monthsDone, monthLog, oneOff, wording, setWording, journal,
    restored: restored !== null,
    actions: { toContract, beginGame, startMonths, resolveEvent, vote, answer, answerFor, toImpact, nextAct, toReform, consultOthers },
  }
}
