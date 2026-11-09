import { useState } from 'react'
import { computeMonthlyBudget } from '@/core/budget.ts'
import { comparabilityMetrics, type Scale } from '@/core/impact.ts'
import { characters, toBudgetLines } from '@/content/load.ts'
import { euros } from '@/core/money.ts'
import { Seal } from './Seal.tsx'

/**
 * Demonstration du selecteur d'echelle, sur la page d'accueil.
 *
 * C'est l'idee centrale du jeu, et elle se montre bien mieux qu'elle ne
 * s'explique : le MEME prelevement de 100 EUR change completement de
 * classement selon la facon dont on le mesure.
 *
 * Choix de representation, suivant les regles de visualisation :
 *
 *   UNE SEULE SERIE, donc UNE SEULE COULEUR. Les barres comparent une
 *   grandeur, pas des identites : les colorer par personnage ajouterait un
 *   canal inutile, et surtout impossible a rendre lisible en vision
 *   daltonienne a luminance egale. Chaque barre porte son prenom en clair.
 *
 *   UN SEUL AXE, et il est commun aux six barres. La largeur est toujours
 *   relative au maximum de l'echelle affichee, et ce maximum est ecrit.
 *
 *   AUCUNE ECHELLE N'EST PRESENTEE COMME LA BONNE. L'ordre des boutons est
 *   fixe, aucun n'est mis en avant, et le texte dit explicitement que le
 *   choix du denominateur est deja une position.
 */

const SCALES: readonly { id: Scale; label: string; hint: string }[] = [
  { id: 'euros', label: 'en euros', hint: 'un euro est un euro' },
  { id: 'income', label: 'en % du revenu', hint: 'ce qui compte est la proportion' },
  { id: 'slack', label: 'en % du reste à vivre', hint: 'ce qui compte est le besoin' },
  { id: 'days', label: 'en jours de dépenses', hint: 'ce qui compte est le temps gagné ou perdu' },
]

/** Prélèvement forfaitaire : identique pour tous, en euros. */
const LEVY = euros(-100)

const format = (scale: Scale, v: number) =>
  scale === 'euros' ? `${Math.round(v)} €`
  : scale === 'days' ? `${v.toFixed(1)} j`
  : `${(v * 100).toFixed(1)} %`

export function ScaleDemo() {
  const [scale, setScale] = useState<Scale>('euros')

  const rows = characters
    .map((c) => {
      const budget = computeMonthlyBudget(toBudgetLines(c))
      return {
        id: c.id,
        name: c.identity.firstName,
        value: comparabilityMetrics(LEVY, budget)[scale],
      }
    })
    .sort((a, b) => b.value - a.value)

  const max = Math.max(...rows.map((r) => r.value))
  const allIds = characters.map((c) => c.id)
  const current = SCALES.find((s) => s.id === scale)!

  return (
    <div className="demo">
      <p>
        Imaginons un prélèvement de <strong>100 € par mois</strong>, le même pour tout
        le monde. Voici qui il touche le plus — et change de mesure pour voir le
        classement se recomposer.
      </p>

      <fieldset className="demo__scales">
        <legend className="sr-only">Échelle de comparaison</legend>
        {SCALES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scale === s.id}
            className={scale === s.id ? 'demo__scale demo__scale--on' : 'demo__scale'}
            onClick={() => setScale(s.id)}
          >
            {s.label}
          </button>
        ))}
      </fieldset>

      <p className="provenance">
        Mesuré {current.label} — autrement dit&nbsp;: {current.hint}.
      </p>

      {/* Une seule série, une seule couleur : les barres comparent une
          grandeur, pas des identités. Chaque barre porte son prénom. */}
      <ol className="demo__bars">
        {rows.map((r, i) => (
          <li key={r.id}>
            <span className="demo__rank">{i + 1}</span>
            <Seal id={r.id} allIds={allIds} size={20} />
            <span className="demo__name">{r.name}</span>
            <span className="demo__track">
              <span
                className="demo__fill"
                style={{ width: `${max > 0 ? (r.value / max) * 100 : 0}%` }}
              />
            </span>
            <span className="demo__value">{format(scale, r.value)}</span>
          </li>
        ))}
      </ol>

      <p className="demo__point">
        Aucune de ces quatre mesures n’est neutre. Choisir le dénominateur, c’est déjà
        choisir ce qui compte — et c’est souvent là que se situe le désaccord, bien
        avant les chiffres.
      </p>
      <p className="provenance">
        Personnages fictifs, montants construits pour être plausibles. Le détail de
        chaque chiffre est indiqué dans le jeu.
      </p>
    </div>
  )
}
