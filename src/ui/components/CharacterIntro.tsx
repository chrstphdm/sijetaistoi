import type { CharacterT } from '@/schemas/index.ts'
import { Seal } from './Seal.tsx'
import { Standing } from './PopulationPlace.tsx'

/**
 * L'arrivee dans un personnage.
 *
 * L'attachement doit se faire en moins de quarante secondes, et il passe par
 * des DETAILS NON ECONOMIQUES. Un personnage qu'on presente d'abord par son
 * revenu est un dossier, pas quelqu'un.
 */
export function CharacterIntro({
  character, month, act, allIds, onContinue,
}: {
  readonly character: CharacterT
  readonly month: string
  readonly act: number
  readonly allIds: readonly string[]
  /** Absent quand l'écran ajoute d'autres blocs avant le bouton (le rappel). */
  readonly onContinue?: () => void
}) {
  const { identity, embodiedDetails, shortTermGoal, narrative } = character
  return (
    <section className="sheet" aria-labelledby="intro-title">
      <p className="sheet__kicker">
        {month} · acte {act}
      </p>
      <div className="intro__head">
        <Seal id={character.id} allIds={allIds} size={64}
          label={`Motif de ${identity.firstName}`} />
        {/* h2 et non h1 : le titre de l’écran est posé une seule fois,
            par App. Deux h1 sur une page, c’est aucun. */}
        <h2 id="intro-title" className="intro__name">Tu es {identity.firstName}.</h2>
      </div>
      <p>
        {identity.age} ans, {identity.identityLine}.
      </p>

      <ul className="details">
        {embodiedDetails.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <p>{narrative.story}</p>

      {/* Après l'histoire, jamais avant (charte C7) : présenté d'abord par
          son revenu, un personnage devient un dossier. */}
      <Standing character={character} />

      <p>
        <strong>Ce que tu veux ces prochains mois</strong>&nbsp;: {shortTermGoal.label}.
      </p>

      {onContinue && (
        <button type="button" className="btn-primary" onClick={onContinue}>
          Commencer le mois
        </button>
      )}
    </section>
  )
}
