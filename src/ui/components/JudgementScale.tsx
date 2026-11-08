import { JUDGEMENT_LABEL, SCALE, type Judgement } from '@/core/opinion.ts'

/**
 * L'echelle « bien et juste ».
 *
 * Cinq boutons de SURFACE STRICTEMENT IDENTIQUE, dans l'ordre fixe de
 * l'echelle, « je ne sais pas » au milieu et non relegue a part.
 *
 * Pas de curseur : un curseur a une position de depart, et cette position
 * est une suggestion. Pas d'ordre tire au sort non plus — ici l'ordre porte
 * du sens, c'est une echelle ordinale.
 *
 * Aucune reponse n'est presentee comme attendue : pas de bouton par defaut,
 * pas de mise en avant, et « je ne sais pas » est une reponse comme les
 * autres, pas un echappatoire.
 */
export function JudgementScale({
  value, onChange, legend,
}: {
  readonly value: Judgement | null
  readonly onChange: (j: Judgement) => void
  readonly legend: string
}) {
  return (
    <fieldset className="scale">
      <legend>{legend}</legend>
      <div className="scale__row" role="radiogroup" aria-label={legend}>
        {SCALE.map((j) => (
          <button
            key={j}
            type="button"
            role="radio"
            aria-checked={value === j}
            className={value === j ? 'scale__btn scale__btn--on' : 'scale__btn'}
            onClick={() => onChange(j)}
          >
            {JUDGEMENT_LABEL[j]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
