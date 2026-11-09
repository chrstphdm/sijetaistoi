/**
 * Schema de la boucle de jeu.
 *
 * Le viewBox tient compte de la LARGEUR DES ETIQUETTES, pas seulement du
 * cercle : la premiere version calait le cadre sur le rayon, et les textes
 * places a droite et en bas debordaient hors de la page. Une capture l'a
 * montre, aucun test de DOM ne pouvait le voir.
 *
 * Marge horizontale = demi-largeur maximale d'une etiquette ; marge basse =
 * hauteur des deux lignes de texte sous le dernier noeud.
 */

const STEPS = [
  { n: 1, label: 'Tu vis quelques mois\nde la vie de quelqu’un' },
  { n: 2, label: 'Tu décides une règle\npour tout le monde' },
  { n: 3, label: 'Tu vois l’effet\nsur les six' },
  { n: 4, label: 'Tu deviens\nquelqu’un d’autre' },
  { n: 5, label: 'Ta règle\nte revient' },
] as const

const R = 132
const LABEL_HALF = 95
const W = 2 * (R + LABEL_HALF)
const CX = W / 2
const CY = R + 34
const H = CY + R + 58

const angle = (i: number) => (i / STEPS.length) * 2 * Math.PI - Math.PI / 2
const at = (i: number) => ({ x: CX + R * Math.cos(angle(i)), y: CY + R * Math.sin(angle(i)) })

/**
 * La fleche se place dans l'intervalle entre deux noeuds, jamais sur un
 * noeud : la premiere version la posait a 0 degre, ou elle chevauchait
 * l'etiquette du deuxieme temps. Visible sur une capture, invisible pour
 * un test de DOM.
 */
const ARROW_A = (angle(1) + angle(2)) / 2
const ARROW = {
  x: CX + R * Math.cos(ARROW_A),
  y: CY + R * Math.sin(ARROW_A),
  deg: (ARROW_A * 180) / Math.PI + 90,
}

export function LoopDiagram() {
  const description =
    'La boucle du jeu, en cinq temps qui se répètent : ' +
    STEPS.map((s) => `${s.n}. ${s.label.replace('\n', ' ')}`).join(' ; ') +
    '. Puis tout recommence avec un nouveau personnage.'

  return (
    <figure className="loop">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={description}
        className="loop__svg"
      >
        <circle cx={CX} cy={CY} r={R} className="loop__ring" />
        <path
          d="M -7 -8 L 0 0 L -7 8"
          className="loop__arrow"
          transform={`translate(${ARROW.x} ${ARROW.y}) rotate(${ARROW.deg})`}
        />

        {STEPS.map((s, i) => {
          const { x, y } = at(i)
          return (
            <g key={s.n}>
              <circle cx={x} cy={y} r={26} className="loop__disc" />
              <text x={x} y={y + 7} className="loop__num">
                {s.n}
              </text>
              {s.label.split('\n').map((line, k) => (
                <text key={line} x={x} y={y + 46 + k * 16} className="loop__label">
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </svg>

      {/*
        Équivalent textuel du schéma, destiné aux lecteurs d'écran.
        Il n'est pas affiché : les cinq cartes numérotées à côté disent
        exactement la même chose, et les répéter allongeait la page sans
        rien apporter. L'information reste intégralement disponible.
      */}
      <figcaption className="sr-only">
        <ol className="loop__list">
          {STEPS.map((s) => (
            <li key={s.n}>{s.label.replace('\n', ' ')}</li>
          ))}
        </ol>
        <p className="provenance">
          Puis tout recommence, avec quelqu’un d’autre — et les règles déjà décidées
          continuent de s’appliquer.
        </p>
      </figcaption>
    </figure>
  )
}
