import { computeMonthlyBudget } from '@/core/budget.ts'
import { comparabilityMetrics, absorptionRegime, type Scale } from '@/core/impact.ts'
import { formatMetric, formatRecurring, regimeSentence } from '@/core/phrasing.ts'
import {
  activeEffectsFor, applyEffectsToLines, inForceNow, startsAtYear, type WorldState,
} from '@/core/world.ts'
import { motionFor } from '@/motion/table.ts'
import { optionLookup, toBudgetLines, toStocks, traitsOf } from '@/content/load.ts'
import type { CharacterT } from '@/schemas/index.ts'
import { Amount } from './Amount.tsx'
import { Seal } from './Seal.tsx'

/**
 * « Le choix vu par chacun ».
 *
 * Deux regles valent sur cet ecran, et seulement sur celui-ci :
 *
 *   ORDRE — permutation deterministe par rotation, declaree publiquement.
 *   L'ordre alphabetique donnerait toujours la premiere position au meme
 *   personnage ; l'ordre par revenu installe l'echelle sociale comme grille
 *   de lecture unique ; l'ordre par ampleur d'impact est l'argmax de douleur
 *   explicitement proscrit.
 *
 *   MOTION CONSTANTE — sur un ecran dont le message EST la comparaison,
 *   differencier la mise en scene ajoute un second canal redondant qui
 *   amplifie un personnage. Les blocs apparaissent donc ensemble, meme
 *   duree, quelle que soit la valeur.
 */

/** Rotation en carre latin : chaque personnage occupe chaque position. */
export function rotationOrder(count: number, screenIndex: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + screenIndex) % count)
}

const SCALES: readonly { id: Scale; label: string }[] = [
  { id: 'euros', label: 'en euros' },
  { id: 'income', label: 'en % du revenu' },
  { id: 'slack', label: 'en % du reste à vivre' },
  { id: 'days', label: 'en jours de dépenses' },
]

type Props = {
  readonly characters: readonly CharacterT[]
  readonly world: WorldState
  readonly scale: Scale
  readonly onScaleChange: (s: Scale) => void
  readonly screenIndex: number
}

/**
 * La part differee d'un effet, datee.
 *
 * Toujours sous la ligne du present, jamais fondue dedans : c'est la
 * confusion des deux qui a fait annoncer un gain immediat a des menages a qui
 * la mesure coute d'abord.
 */
function Differe({ cents, year, name }: { cents: number; year: number | null; name: string }) {
  if (cents === 0 || year === null) return null
  return (
    <div className="provenance">
      {`À partir de la ${year}ᵉ année, `}
      {/* `signed` comme partout ailleurs sur cet ecran : un montant signe se
          rend d'une seule facon dans tout le jeu — signe, glyphe et mot —, et
          un second vocabulaire pour dire la meme chose (« s'y ajoute », « s'en
          retranche ») reintroduisait la variation que ce composant existe
          precisement pour supprimer. */}
      <Amount cents={cents * 12} nature="hypothesis" signed label={name} />
      {` par an, soit ${formatRecurring(cents).split(', soit ')[1]}.`}
    </div>
  )
}

export function ImpactForEach({ characters, world, scale, onScaleChange, screenIndex }: Props) {
  const order = rotationOrder(characters.length, screenIndex)

  // Motion IDENTIQUE pour tous : calculee une fois, hors de la boucle.
  const motion = motionFor({ amountCents: 0, netIncomeCents: 1, slackCents: 1, scale: 'slack' })

  return (
    <section className="sheet" aria-labelledby="impact-title">
      <h2 id="impact-title">Le choix vu par chacun</h2>

      <p role="note">
        Changer d’échelle change la mesure, pas les faits. Aucune de ces quatre mesures n’est
        neutre&nbsp;: rapporter au reste à vivre suppose que ce qui compte est le besoin, rapporter
        au revenu que ce qui compte est la proportion, compter en euros qu’un euro est un euro.
      </p>

      <fieldset>
        <legend>Échelle de comparaison</legend>
        {SCALES.map((s) => (
          <label key={s.id}>
            <input
              type="radio" name="scale" value={s.id}
              checked={scale === s.id} onChange={() => onScaleChange(s.id)}
            />{' '}
            {s.label}
          </label>
        ))}
      </fieldset>

      <ul className="impacts">
        {order.map((i) => {
          const c = characters[i]!
          const traits = traitsOf(c)
          const before = computeMonthlyBudget(toBudgetLines(c))
          const effects = activeEffectsFor(world, traits, optionLookup)
          /* Dedupliquee : plusieurs regles en vigueur peuvent viser la meme
             portee, et la repeter donnerait l'impression de plusieurs
             exclusions la ou il n'y en a qu'une. */
          const reasons = [...new Set(effects.map((e) => e.effect.scope.description))]

          /*
           * CE QUI S'APPLIQUE MAINTENANT EN TETE, LE DIFFERE ENSUITE.
           *
           * Cet ecran additionnait tous les effets d'une regle sans regarder
           * leur horizon. La contribution energie coute 14 EUR par mois des
           * le premier mois aux menages en chauffage collectif, et leur rend
           * 31 EUR « apres renovation effective », a cinq ans. Le total, +17,
           * s'affichait au present : l'ecran annoncait un gain immediat a
           * ceux a qui la mesure coute d'abord. L'erreur jouait dans un seul
           * sens, et elle a vecu plusieurs mois pendant que les tests
           * passaient au vert, parce qu'aucun ne lisait `horizon`.
           *
           * Le differe n'est pas masque — c'est un effet de la decision, et
           * le cacher serait l'erreur inverse. Il est date, et separe.
           */
          const deltaTotal =
            computeMonthlyBudget(applyEffectsToLines(toBudgetLines(c), effects)).slackCents -
            before.slackCents
          const delta =
            computeMonthlyBudget(applyEffectsToLines(toBudgetLines(c), inForceNow(effects)))
              .slackCents - before.slackCents
          const deltaDiffere = deltaTotal - delta
          const differes = effects.filter(
            (e) => startsAtYear(e.effect.horizon) > 1 && e.deltaCents !== 0,
          )
          const aPartirDe = differes.length
            ? Math.min(...differes.map((e) => startsAtYear(e.effect.horizon)))
            : null

          return (
            <li
              key={c.id}
              className="enter-rise"
              style={{ '--enter-ms': `${motion.enterMs}ms`, '--translate-px': '6px' } as React.CSSProperties}
            >
              <Seal id={c.id} allIds={characters.map((x) => x.id)} size={22} />
              {' '}
              <strong>{c.identity.firstName}</strong>
              {' — '}
              {delta === 0 ? (
                <>
                  aucun effet sur son budget courant.
                  {/* POURQUOI, et pas seulement « aucun effet ».
                      Le controle de couverture du build oblige l'auteur a
                      ecrire, pour chaque personne qu'une option ne touche
                      pas, quelle portee l'exclut et pour quelle raison. Cet
                      ecran jetait ce travail : il affichait treize fois la
                      meme phrase vide. Avec un corpus de treize situations,
                      la plupart des lignes sont des effets nuls, et une
                      comparaison faite de phrases identiques ne compare
                      rien. La portee declaree est reprise telle quelle. */}
                  {reasons.length > 0 && (
                    <div className="provenance">Portée déclarée&nbsp;: {reasons.join(' ; ')}.</div>
                  )}
                  <Differe cents={deltaDiffere} year={aPartirDe} name={c.identity.firstName} />
                </>
              ) : (
                <>
                  {/* L'annuel en tête : 204 € se perçoit, 17 € passe inaperçu.
                      C'est le même fait, et les deux sont donnés. */}
                  <Amount cents={delta * 12} nature="hypothesis" signed label={c.identity.firstName} />
                  {' par an, soit '}
                  {formatRecurring(delta).split(', soit ')[1]}
                  {scale !== 'euros' && <> — {formatMetric(scale, comparabilityMetrics(delta, before))}</>}
                  {'. Cette somme '}
                  {regimeSentence(absorptionRegime(delta, before, toStocks(c)), delta)}.
                  <Differe cents={deltaDiffere} year={aPartirDe} name={c.identity.firstName} />
                </>
              )}
              {effects.length === 0 && (
                <div className="provenance">
                  Aucune des règles en vigueur ne le concerne. Ce n’est pas la même chose qu’un
                  effet nul&nbsp;: aucune ne s’applique à sa situation.
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
