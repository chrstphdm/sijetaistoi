import type { CharacterT } from '@/schemas/index.ts'

/**
 * L'arrivee dans un personnage.
 *
 * L'attachement doit se faire en moins de quarante secondes, et il passe par
 * des DETAILS NON ECONOMIQUES. Un personnage qu'on presente d'abord par son
 * revenu est un dossier, pas quelqu'un.
 */
export function CharacterIntro({
  character, month, act, onContinue,
}: {
  readonly character: CharacterT
  readonly month: string
  readonly act: number
  readonly onContinue: () => void
}) {
  const { identity, embodiedDetails, shortTermGoal, narrative } = character
  return (
    <section className="sheet" aria-labelledby="intro-title">
      <p className="sheet__kicker">
        {month} · acte {act}
      </p>
      <h1 id="intro-title">Tu es {identity.firstName}.</h1>
      <p>
        {identity.age} ans, {identity.identityLine}.
      </p>

      <ul className="details">
        {embodiedDetails.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <p>{narrative.story}</p>

      <p>
        <strong>Ce que tu veux ces prochains mois</strong>&nbsp;: {shortTermGoal.label}.
      </p>

      <button type="button" onClick={onContinue}>
        Commencer le mois
      </button>
    </section>
  )
}
