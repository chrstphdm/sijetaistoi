import { useState } from 'react'
import { ACT_COUNT, type GameState } from '@/core/game.ts'
import type { Step } from '../useGame.ts'

/**
 * Chronologie de la partie.
 *
 * Elle repond a deux besoins distincts :
 *
 *   1. SE SITUER. Sans reperes, le joueur ne sait pas s'il en est au debut
 *      ou a la fin, ni combien de personnages il lui reste a incarner.
 *
 *   2. RELIRE SES DECISIONS. C'est ce qui transforme « le jeu me punit » en
 *      « j'ai construit un monde ». Une regle qu'on peut relire est une
 *      regle qu'on s'approprie ; une regle qui ressurgit sans qu'on puisse
 *      la retrouver est une embuscade.
 *
 * Elle n'affiche AUCUNE progression chiffree, aucune barre de completion,
 * aucun pourcentage : ce serait le vocabulaire du jeu-defi, que le projet
 * s'interdit. Elle situe, elle ne note pas.
 */

const STEP_LABEL: Record<Step['kind'], string> = {
  intro: 'rencontre',
  month: 'mois vécu',
  callback: 'rencontre',
  reform: 'décision',
  judgement: 'ton avis',
  impact: 'conséquences',
  summary: 'bilan',
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
  const acts = Array.from({ length: ACT_COUNT }, (_, i) => i + 1)
  const current = Math.max(1, state.act)

  return (
    <nav className="timeline" aria-label="Où tu en es dans la partie">
      <ol className="timeline__acts">
        {acts.map((n) => {
          const draw = state.castHistory[n - 1]
          const done = n < current
          const here = n === current && step.kind !== 'summary'
          return (
            <li
              key={n}
              className={`timeline__act${here ? ' timeline__act--here' : ''}${done ? ' timeline__act--done' : ''}`}
              aria-current={here ? 'step' : undefined}
            >
              <span className="timeline__n">{n}</span>
              <span className="timeline__who">
                {draw ? nameOf(draw.picked) : 'à venir'}
              </span>
              {/* Le statut est écrit, jamais porté par la seule couleur. */}
              <span className="timeline__state">
                {here ? STEP_LABEL[step.kind] : done ? 'terminé' : ''}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="timeline__now">
        {step.kind === 'summary' ? 'Fin de partie' : month}
        {state.world.rules.length > 0 && (
          <>
            {' · '}
            <button type="button" className="timeline__toggle" aria-expanded={open}
              onClick={() => setOpen((v) => !v)}>
              {state.world.rules.length} décision{state.world.rules.length > 1 ? 's' : ''} prise
              {state.world.rules.length > 1 ? 's' : ''}
            </button>
          </>
        )}
      </p>

      {open && (
        <ol className="timeline__rules">
          {state.world.rules.map((r) => (
            <li key={r.id}>
              <strong>{r.shortLabel}</strong>
              <span className="provenance"> — {r.diegeticMonth}</span>
              {r.playerWording && <blockquote>« {r.playerWording} »</blockquote>}
            </li>
          ))}
        </ol>
      )}
    </nav>
  )
}
