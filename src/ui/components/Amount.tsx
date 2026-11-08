import { formatEuros, type Cents } from '@/core/money.ts'
import type { Value } from '@/core/types.ts'

/**
 * LE SEUL composant autorise a rendre un montant.
 *
 * Deux raisons, toutes deux verifiees par le lint de contenu :
 *   1. Tout chiffre affiche doit porter sa provenance (fait, hypothese,
 *      extrapolation, fiction). Centraliser le rendu rend cette regle
 *      applicable plutot que seulement souhaitable.
 *   2. Le signe ne doit JAMAIS etre porte par la seule couleur. Ici il l'est
 *      par trois canaux redondants : le signe arithmetique, un glyphe de meme
 *      surface d'encre dans les deux sens, et un mot en toutes lettres.
 */

const NATURE_LABEL: Record<Value['nature'], string> = {
  fact: 'donnée sourcée',
  hypothesis: 'hypothèse du modèle',
  extrapolation: 'extrapolation',
  fiction: 'valeur fictive',
}

type Props = {
  readonly cents: Cents
  readonly nature: Value['nature']
  /** Affiche le signe explicitement. Pour un flux, pas pour un solde. */
  readonly signed?: boolean
  /**
   * Mode compact : le signe arithmetique seul a l'ecran, le mot en toutes
   * lettres etant reserve au lecteur d'ecran. Pour un releve ou chaque
   * ligne repeterait « en moins » douze fois de suite, ce qui le rend
   * illisible sans rien ajouter — la colonne et le signe suffisent a
   * porter l'information visuellement.
   */
  readonly compact?: boolean
  readonly label?: string
}

export function Amount({ cents, nature, signed = false, compact = false, label }: Props) {
  const negative = cents < 0
  // Les deux glyphes ont la meme surface d'encre : aucun n'est plus saillant.
  const glyph = negative ? '▼' : '▲'
  const word = negative ? 'en moins' : 'en plus'
  const text = formatEuros(cents)

  const description = signed
    ? `${text} ${word}, ${NATURE_LABEL[nature]}`
    : `${text}, ${NATURE_LABEL[nature]}`

  return (
    <span className="amount" data-nature={nature} title={NATURE_LABEL[nature]}>
      <span aria-hidden="true">
        {signed && !compact && <span aria-hidden="true">{glyph} </span>}
        {signed && negative ? '−' : signed ? '+' : ''}
        {text}
        {signed && !compact && <span className="amount__word"> {word}</span>}
      </span>
      <span className="sr-only">{label ? `${label} : ${description}` : description}</span>
    </span>
  )
}
