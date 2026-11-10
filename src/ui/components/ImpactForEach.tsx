import { computeMonthlyBudget } from '@/core/budget.ts'
import { comparabilityMetrics, absorptionRegime, type Scale } from '@/core/impact.ts'
import { formatMetric, formatRecurring, regimeSentence } from '@/core/phrasing.ts'
import {
  activeEffectsFor, applyEffectsToLines, inForceNow, rulesInForce, startsAtYear, type WorldState,
} from '@/core/world.ts'
import { motionFor } from '@/motion/table.ts'
import { optionLookup, reforms, toBudgetLines, toStocks, traitsOf } from '@/content/load.ts'
import { useState } from 'react'
import type { CharacterT } from '@/schemas/index.ts'
import { Amount } from './Amount.tsx'
import { Seal } from './Seal.tsx'
import { Term } from './Term.tsx'

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
      {`À partir de la ${year === 1 ? '1re' : `${year}ᵉ`} année, `}
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

/**
 * Une barre divergente : vers la droite pour ce qui s'ajoute, vers la gauche
 * pour ce qui se retranche, depuis un axe central.
 *
 * MEME COULEUR dans les deux sens : les accents du jeu encodent le point de
 * vue, jamais le gain ou la perte. Le sens est porte par la direction, et
 * ecrit a cote — glyphe et mot —, jamais par la seule couleur.
 */
function Bar({ value, max, later = false }: { value: number; max: number; later?: boolean }) {
  const width = max > 0 ? (Math.abs(value) / max) * 50 : 0
  return (
    <span
      className={`impact__bar${value < 0 ? ' impact__bar--minus' : ''}${later ? ' impact__bar--later' : ''}${width === 0 ? ' impact__bar--zero' : ''}`}
      style={{ '--w': `${width}%` } as React.CSSProperties}
    />
  )
}

/** La valeur dans l'echelle choisie, signee par les trois canaux du jeu. */
function Signed({ cents, metric }: { cents: number; metric: string }) {
  const plus = cents > 0
  return (
    <span className="amount">
      {plus ? '▲' : '▼'} {plus ? '+' : '−'}{metric}{' '}
      <span className="amount__word">{plus ? 'en plus' : 'en moins'}</span>
    </span>
  )
}

export function ImpactForEach({ characters, world: fullWorld, scale, onScaleChange, screenIndex }: Props) {
  const order = rotationOrder(characters.length, screenIndex)

  /*
   * QUELLE DÉCISION A PROVOQUÉ QUOI.
   *
   * À partir du deuxième acte, cet écran additionnait toutes les règles en
   * vigueur sans dire laquelle produisait quoi : on ne pouvait pas relier un
   * effet à une décision. Par défaut, il montre maintenant la décision que
   * le joueur vient de prendre, SEULE, et la nomme ; un sélecteur montre le
   * cumul ; chaque rangée dépliée détaille la part de chaque règle.
   */
  const inForce = rulesInForce(fullWorld)
  const latest = inForce[inForce.length - 1]
  const [mode, setMode] = useState<'last' | 'all'>('last')
  const only = (ruleId: string): WorldState => ({ ...fullWorld, rules: fullWorld.rules.filter((r) => r.id === ruleId) })
  const world = mode === 'last' && latest ? only(latest.id) : fullWorld

  // Motion IDENTIQUE pour tous : calculee une fois, hors de la boucle.
  const motion = motionFor({ amountCents: 0, netIncomeCents: 1, slackCents: 1, scale: 'slack' })

  /*
   * Les calculs d'abord, le rendu ensuite : la longueur des barres se
   * rapporte au plus grand effet de l'écran, il faut donc les connaître tous.
   */
  const rows = order.map((i) => {
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
     * le cacher serait l'erreur inverse. Il est date, et separe : dans
     * le graphique aussi, ou il a sa propre barre, en pointilles.
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

    // Valeur SIGNEE dans l'echelle choisie : c'est elle que trace la barre.
    const signedMetric = (cents: number) =>
      Math.sign(cents) * comparabilityMetrics(cents, before)[scale]

    // La part de chaque règle, calculée seule : c'est ce qui permet de dire
    // quelle décision a provoqué quoi pour cette personne.
    const byRule = inForce.length > 1
      ? inForce.map((r) => {
          const own = activeEffectsFor(only(r.id), traits, optionLookup)
          const now = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(c), inForceNow(own))).slackCents - before.slackCents
          const total = computeMonthlyBudget(applyEffectsToLines(toBudgetLines(c), own)).slackCents - before.slackCents
          return { rule: r, now, later: total - now }
        })
      : []

    return {
      character: c, before, effects, reasons, delta, deltaDiffere, aPartirDe, byRule,
      now: signedMetric(delta), later: signedMetric(deltaDiffere),
    }
  })
  // Une seule echelle pour tout l'ecran : sans elle, les barres ne se
  // compareraient pas d'une personne a l'autre.
  const max = Math.max(0, ...rows.flatMap((r) => [Math.abs(r.now), Math.abs(r.later)]))

  return (
    <section className="sheet" aria-labelledby="impact-title">
      <h2 id="impact-title">Le choix vu par chacun</h2>

      {latest && (
        <p className="impact-decision">
          <span className="impact-decision__label">Ta décision</span>
          <strong>{latest.shortLabel}</strong>
          <span className="impact-decision__q">{reforms.find((r) => r.id === latest.reformId)?.descriptiveTitle}</span>
        </p>
      )}

      {/* Le cumul n'a de sens qu'à partir de deux règles. */}
      {inForce.length > 1 && (
        <fieldset className="impact-mode">
          <legend>Ce que montrent les barres</legend>
          <label>
            <input type="radio" name="impact-mode" checked={mode === 'last'} onChange={() => setMode('last')} />{' '}
            cette décision seule
          </label>
          <label>
            <input type="radio" name="impact-mode" checked={mode === 'all'} onChange={() => setMode('all')} />{' '}
            toutes tes décisions ({inForce.length}), cumulées
          </label>
        </fieldset>
      )}

      <p role="note">
        Changer d’échelle change la mesure, pas les faits. Aucune de ces quatre mesures n’est
        neutre&nbsp;: rapporter au <Term id="reste-a-vivre">reste à vivre</Term> suppose que ce qui compte est le besoin, rapporter
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

      {/* Repère commun à toutes les barres : sens écrit, pas seulement suggéré. */}
      <p className="impact-axis" aria-hidden="true">
        <span>◄ en moins</span>
        <span className="impact-axis__scale">{SCALES.find((x) => x.id === scale)?.label}, même échelle pour tous</span>
        <span>en plus ►</span>
      </p>

      <ul className="impacts">
        {rows.map((r) => {
          const c = r.character
          const { delta, deltaDiffere, aPartirDe, reasons, effects, before } = r
          return (
            <li
              key={c.id}
              className="enter-rise impact"
              style={{ '--enter-ms': `${motion.enterMs}ms`, '--translate-px': '6px' } as React.CSSProperties}
            >
              {/* Replié de la même façon pour tout le monde : la barre et la
                  valeur restent visibles, ce qui permet de comparer les treize
                  d'un coup d'œil ; les phrases se déplient à la demande. */}
              <details className="impact__fold">
              <summary className="impact__head">
                {/* QUI EST QUI. Le prénom seul ne disait pas de qui il
                    s'agit : sans sa fiche en tête, « Malik » ne dit pas
                    « intérimaire, hébergé chez sa mère ». L'âge et la ligne
                    d'identité suivent le prénom, comme sur sa fiche. */}
                <span className="impact__who">
                  <Seal id={c.id} allIds={characters.map((x) => x.id)} size={22} />
                  <span className="impact__id">
                    <strong>{c.identity.firstName}</strong>
                    <span className="impact__profile">
                      {c.identity.age} ans · {c.identity.identityLine}
                    </span>
                  </span>
                </span>
                {/* Le dessin double la phrase en dessous : décoratif pour un
                    lecteur d'écran, qui lit la phrase. */}
                <span className="impact__track" aria-hidden="true">
                  <Bar value={r.now} max={max} />
                  {deltaDiffere !== 0 && aPartirDe !== null && <Bar value={r.later} max={max} later />}
                </span>
                <span className="impact__value">
                  {delta !== 0 ? (
                    <Signed cents={delta} metric={formatMetric(scale, comparabilityMetrics(delta, before))} />
                  ) : deltaDiffere !== 0 && aPartirDe !== null ? (
                    <>
                      <span className="impact__now">rien maintenant</span>
                      <span className="impact__later">
                        an {aPartirDe}&nbsp;: <Signed cents={deltaDiffere} metric={formatMetric(scale, comparabilityMetrics(deltaDiffere, before))} />
                      </span>
                    </>
                  ) : (
                    'aucun effet'
                  )}
                </span>
              </summary>
              <div className="impact__text">
                {delta === 0 ? (
                  <>
                    Pour l’instant, aucun effet sur son budget courant.
                    {/* POURQUOI, et pas seulement « aucun effet ».
                        Le controle de couverture du build oblige l'auteur a
                        ecrire, pour chaque personne qu'une option ne touche
                        pas, quelle portee l'exclut et pour quelle raison. Cet
                        ecran jetait ce travail : il affichait treize fois la
                        meme phrase vide. La portee declaree est reprise telle
                        quelle. */}
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
                {/* La part de chaque décision, calculée seule. */}
                {r.byRule.length > 0 && (
                  <ul className="impact__byrule" aria-label={`Part de chaque décision pour ${c.identity.firstName}`}>
                    {r.byRule.map((b) => (
                      <li key={b.rule.id}>
                        <strong>{b.rule.shortLabel}</strong>{' : '}
                        {b.now === 0 && b.later === 0 ? 'aucun effet' : (
                          <>
                            {b.now !== 0 ? <><Amount cents={b.now} nature="hypothesis" signed label={b.rule.shortLabel} /> par mois</> : 'rien maintenant'}
                            {b.later !== 0 && <>, puis <Amount cents={b.later} nature="hypothesis" signed label={`${b.rule.shortLabel}, à terme`} /> à terme</>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              </details>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
