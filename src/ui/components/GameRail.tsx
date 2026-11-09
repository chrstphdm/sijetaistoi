import { useState } from 'react'
import { ACT_COUNT, MONTHS_PER_ACT, type GameState } from '@/core/game.ts'
import type { Step } from '../useGame.ts'
import { Seal } from './Seal.tsx'

/**
 * Colonne d'avancement.
 *
 * Elle repond a deux retours de test : « la frise du haut n'est pas claire »
 * et « pas assez visuel pour s'y retrouver ».
 *
 * Trois informations, dans cet ordre de priorite :
 *   1. QUI tu es, avec son sceau — reconnaissable d'un coup d'oeil ;
 *   2. OU tu en es dans les mois de cet acte ;
 *   3. POUR QUI tu decides a cet instant — la distinction dont depend tout
 *      le mecanisme du jeu.
 *
 * Elle situe, elle ne note pas : aucune barre de completion, aucun
 * pourcentage, aucun vocabulaire de progression chiffree. Les etats sont
 * ecrits en toutes lettres, jamais portes par la seule couleur.
 *
 * En colonne a partir de 900 px, en bandeau colle en haut en dessous.
 */

type Props = {
  readonly state: GameState
  readonly step: Step
  readonly nameOf: (id: string) => string
  readonly allIds: readonly string[]
  readonly month: string
  readonly monthsDone: number
}

const SCOPE_NOW: Record<Step['kind'], (who: string) => string> = {
  home: () => 'tu n’as pas encore commencé',
  contract: () => 'tu n’as pas encore commencé',
  intro: (w) => `tu fais connaissance avec ${w}`,
  callback: (w) => `tu fais connaissance avec ${w}`,
  month: (w) => `tu décides pour ${w}`,
  relaunch: () => 'tu redonnes ton avis sur une règle',
  reform: () => 'tu décides pour tout le monde',
  judgement: () => 'tu donnes ton avis',
  impact: () => 'tu vois ce que ça change pour chacun',
  summary: () => 'fin de partie',
}

export function GameRail({ state, step, nameOf, allIds, month, monthsDone }: Props) {
  const [open, setOpen] = useState(false)
  const act = Math.max(1, state.act)
  const who = state.currentCharacterId ? nameOf(state.currentCharacterId) : ''
  const monthsTarget = MONTHS_PER_ACT[act - 1] ?? 2
  const rules = state.world.rules
  const done = step.kind === 'summary'

  return (
    <nav className="rail" aria-label="Où tu en es dans la partie">
      <ol className="rail__acts">
        {Array.from({ length: ACT_COUNT }, (_, i) => i + 1).map((n) => {
          const draw = state.castHistory[n - 1]
          const here = n === act && !done
          const past = n < act || (done && n <= act)
          return (
            <li
              key={n}
              className={`rail__act${here ? ' rail__act--here' : ''}${past ? ' rail__act--past' : ''}`}
              aria-current={here ? 'step' : undefined}
            >
              <span className="rail__seal">
                {draw ? (
                  <Seal id={draw.picked} allIds={allIds} size={28} />
                ) : (
                  <span className="rail__seal--empty" aria-hidden="true" />
                )}
              </span>
              <span className="rail__who">
                <span className="rail__actno">Acte {n}</span>
                <span className="rail__name">{draw ? nameOf(draw.picked) : 'à venir'}</span>
              </span>

              {/* Les mois de l'acte en cours, un carré par mois. L'état est
                  aussi écrit, pour ne jamais dépendre de la seule forme. */}
              {here && step.kind !== 'reform' && step.kind !== 'judgement' && step.kind !== 'impact' && (
                <ol className="rail__months" aria-label={`Mois vécus : ${monthsDone} sur ${monthsTarget}`}>
                  {Array.from({ length: monthsTarget }, (_, m) => (
                    <li
                      key={m}
                      className={`rail__month${m < monthsDone ? ' rail__month--past' : ''}${m === monthsDone ? ' rail__month--here' : ''}`}
                    >
                      <span className="sr-only">
                        mois {m + 1} : {m < monthsDone ? 'vécu' : m === monthsDone ? 'en cours' : 'à venir'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          )
        })}
      </ol>

      <p className="rail__now">
        <span className="rail__month-label">{done ? 'Fin de partie' : month}</span>
        {!done && <>En ce moment, {SCOPE_NOW[step.kind](who)}.</>}
      </p>

      {rules.length > 0 && (
        <div className="rail__rules">
          <button type="button" className="timeline__toggle" aria-expanded={open}
            onClick={() => setOpen((v) => !v)}>
            Revoir {rules.length === 1 ? 'ta décision' : `tes ${rules.length} décisions`}
          </button>
          {open && (
            <ol>
              {rules.map((r) => (
                <li key={r.id}>
                  <strong>{r.shortLabel}</strong>
                  <span className="provenance"> — {r.diegeticMonth}</span>
                  {r.playerWording && <blockquote>« {r.playerWording} »</blockquote>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </nav>
  )
}
