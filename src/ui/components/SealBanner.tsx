import { characters } from '@/content/load.ts'
import { sealCells, sealHue } from './Seal.tsx'

/**
 * Composition decorative du bandeau d'ouverture.
 *
 * Les six sceaux, en grand, repetes et decales. C'est la seule image du
 * site, et elle est GENEREE : aucun fichier a charger, aucune photo, aucun
 * corps humain.
 *
 * Purement decorative — aria-hidden. Elle ne porte aucune information, donc
 * son absence ne retire rien. C'est la seule raison pour laquelle elle peut
 * se permettre des opacites et des teintes qui ne passeraient pas un
 * controle de contraste : rien n'y est a lire.
 */
export function SealBanner() {
  const ids = characters.map((c) => c.id)
  // Trois rangees decalees, pour une trame plutot qu'un alignement.
  const rows = [0, 1, 2]

  return (
    <div className="banner" aria-hidden="true">
      <svg viewBox="0 0 120 60" preserveAspectRatio="xMidYMid slice" className="banner__svg">
        {rows.map((row) =>
          ids.map((id, i) => {
            const size = 9
            const x = i * 20 + (row % 2) * 10 - 6
            const y = row * 20 - 4
            const hue = sealHue(id, ids)
            return (
              <g key={`${row}-${id}`} transform={`translate(${x} ${y}) scale(${size / 5})`}>
                {sealCells(id).map((c) => (
                  <rect
                    key={`${c.col}-${c.row}`}
                    x={c.col} y={c.row} width={0.86} height={0.86} rx={0.16}
                    fill={`oklch(0.72 0.14 ${hue})`}
                    opacity={0.22 + ((row + i) % 3) * 0.06}
                  />
                ))}
              </g>
            )
          }),
        )}
      </svg>
    </div>
  )
}
