import { useState } from 'react'
import { ACT_COUNT, type GameState } from '@/core/game.ts'
import type { Step } from '../useGame.ts'

/**
 * Chronologie de la partie.
 *
 * Elle a ete refaite apres un retour de test : « la frise du haut n'est pas
 * claire ». Les intitules etaient du jargon de conception — « rencontre »,
 * « mois vecu » — et rien ne disait combien d'actes composaient la partie.
 *
 * Elle dit desormais trois choses en francais ordinaire : ou on en est,
 * qui on est, et surtout POUR QUI on decide a cette etape. Cette derniere
 * information est la reponse au defaut le plus grave releve : la confusion
 * entre decider pour son personnage et decider pour tout le monde.
 *
 * Elle situe, elle ne note pas : aucune barre de completion, aucun
 * pourcentage, aucun vocabulaire de progression chiffree.
 */

type PhaseKey = 'life' | 'decision' | 'consequences'

const PHASES: readonly { key: PhaseKey; label: string }[] = [
  { key: 'life', label: 'Sa vie' },
  { key: 'decision', label: 'Ta décision pour tous' },
  { key: 'consequences', label: 'Les conséquences' },
]

const PHASE_OF: Record<Step['kind'], PhaseKey> = {
  intro: 'life',
  callback: 'life',
  month: 'life',
  reform: 'decision',
  judgement: 'decision',
  impact: 'consequences',
  summary: 'consequences',
}

/** Phrase disant explicitement pour qui on decide a cette etape. */
function nowSentence(step: Step, who: string): string {
  switch (step.kind) {
    case 'intro':
    case 'callback':
      return `tu fais connaissance avec ${who}`
    case 'month':
      return `tu décides pour ${who}`
    case 'reform':
      return 'tu décides pour tout le monde'
    case 'judgement':
      return 'tu donnes ton avis'
    case 'impact':
      return 'tu vois ce que ça change pour chacun'
    case 'summary':
      return 'fin de partie'
  }
}

export function Timeline({
  state, step, nameOf, month,
}: {
  readonly state: GameState
  readonly step: Step
  readonly nameOf: (id: string) => string
  readonly month: string
}) {
  const [open, setOpen] = useState(false)
  const act = Math.max(1, state.act)
  const who = state.currentCharacterId ? nameOf(state.currentCharacterId) : ''
  const currentPhase = PHASE_OF[step.kind]
  const rules = state.world.rules

  return (
    <nav className="timeline" aria-label="Où tu en es dans la partie">
      <p className="timeline__head">
        <strong>
          {step.kind === 'summary' ? 'Fin de partie' : `Acte ${act} sur ${ACT_COUNT}`}
        </strong>
        {who && step.kind !== 'summary' && <> — tu es {who}</>}
        <span className="timeline__month">{step.kind === 'summary' ? '' : month}</span>
      </p>

      <ol className="timeline__phases">
        {PHASES.map((p, i) => {
          const here = p.key === currentPhase && step.kind !== 'summary'
          const done = PHASES.findIndex((x) => x.key === currentPhase) > i
          return (
            <li
              key={p.key}
              className={`timeline__phase${here ? ' timeline__phase--here' : ''}${done ? ' timeline__phase--done' : ''}`}
              aria-current={here ? 'step' : undefined}
            >
              {p.label}
            </li>
          )
        })}
      </ol>

      <p className="timeline__now">
        {/* La phrase qui lève la confusion : pour qui je décide, là, maintenant. */}
        En ce moment, {nowSentence(step, who)}.
        {rules.length > 0 && (
          <>
            {' '}
            <button type="button" className="timeline__toggle" aria-expanded={open}
              onClick={() => setOpen((v) => !v)}>
              Revoir {rules.length === 1 ? 'ta décision' : `tes ${rules.length} décisions`}
            </button>
          </>
        )}
      </p>

      {open && (
        <ol className="timeline__rules">
          {rules.map((r) => (
            <li key={r.id}>
              <strong>{r.shortLabel}</strong>
              <span className="provenance"> — décidé en {r.diegeticMonth}</span>
              {r.playerWording && <blockquote>« {r.playerWording} »</blockquote>}
            </li>
          ))}
        </ol>
      )}
    </nav>
  )
}
