/**
 * Schema de la boucle de jeu.
 *
 * Il remplace trois paragraphes : le mecanisme central se saisit d'un coup
 * d'oeil, alors qu'il demande un effort a lire.
 *
 * SVG en ligne, pas une image : il suit la taille du texte, s'imprime, et
 * se colore avec le theme. Il porte un equivalent textuel complet, parce
 * qu'un schema qui porterait seul une information la retirerait a qui ne
 * le voit pas — la liste numerotee en dessous dit exactement la meme chose.
 */

const STEPS = [
  { n: 1, label: 'Tu vis quelques\nmois de sa vie' },
  { n: 2, label: 'Tu décides une règle\npour tout le monde' },
  { n: 3, label: 'Tu vois l’effet\nsur les six' },
  { n: 4, label: 'Tu deviens\nquelqu’un d’autre' },
  { n: 5, label: 'Ta règle\nte revient' },
] as const

const R = 148
const CX = 190
const CY = 170

/** Position d'une étape sur le cercle, en commençant en haut. */
const at = (i: number) => {
  const a = (i / STEPS.length) * 2 * Math.PI - Math.PI / 2
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
}

export function LoopDiagram() {
  const description =
    'La boucle du jeu, en cinq temps qui se répètent : ' +
    STEPS.map((s) => `${s.n}. ${s.label.replace('\n', ' ')}`).join(' ; ') +
    '. Puis tout recommence avec un nouveau personnage.'

  return (
    <figure className="loop">
      <svg viewBox="0 0 380 340" role="img" aria-label={description} className="loop__svg">
        <circle cx={CX} cy={CY} r={R} className="loop__ring" />

        {/* La flèche dit le sens : la boucle tourne, elle ne s'arrête pas. */}
        <path
          d={`M ${CX + R - 8} ${CY - 10} l 8 10 l -8 10`}
          className="loop__arrow"
        />

        {STEPS.map((s, i) => {
          const { x, y } = at(i)
          const lines = s.label.split('\n')
          return (
            <g key={s.n} className="loop__node">
              <circle cx={x} cy={y} r={21} className="loop__disc" />
              <text x={x} y={y + 5} className="loop__num">
                {s.n}
              </text>
              {lines.map((line, k) => (
                <text
                  key={line}
                  x={x}
                  y={y + 40 + k * 15}
                  className="loop__label"
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </svg>

      {/* Équivalent textuel : le schéma ne porte jamais seul l'information. */}
      <figcaption>
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
