import { useState, type CSSProperties, type ReactNode } from 'react'
import { characters } from '@/content/load.ts'
import { Seal, sealHue } from './Seal.tsx'

/**
 * Illustrations de la page d'accueil.
 *
 * Toutes GENEREES, toutes decoratives (aria-hidden) : chacune double un texte
 * qui reste lisible sans elle. Aucune ne dessine un corps ou un visage — la
 * regle qui vaut pour les personnages vaut pour toute la page.
 */

const ids = () => characters.map((c) => c.id)

/**
 * Tous les personnages du corpus, en anneau, dans le bandeau d'ouverture.
 *
 * Un ANNEAU plutot qu'une grille : selon le nombre de personnages, une grille
 * laisse une tuile orpheline au dernier rang, et un rang est toujours
 * « premier ». Sur un cercle, chaque place vaut les autres. L'anneau est
 * decale d'un demi-cran pour qu'aucune tuile ne tienne le sommet.
 *
 * Meme tuile, meme taille, ordre alphabetique, apparition SIMULTANEE : une
 * cascade mettrait le premier en avant, exactement ce que l'ecran d'impact
 * s'interdit. Les prenoms sont repetes dans la section des personnages, ou
 * ils sont lus ; ici ils ne servent qu'au reperage.
 */
export function HeroCast() {
  const all = ids()
  const n = characters.length
  /*
   * Un tirage, une fois, au chargement : un balayage passe sur toutes les
   * tuiles à égalité, puis trois s'allument — au hasard, et différentes à
   * chaque visite. C'est le mécanisme du jeu, montré plutôt que dit.
   * Décoratif (tout le bloc est aria-hidden), et coupé si moins de
   * mouvement est demandé.
   */
  const [drawn] = useState(() => {
    const pool = Array.from({ length: n }, (_, i) => i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    return new Set(pool.slice(0, 3))
  })
  return (
    // Le nombre de tuiles règle le moment où le tirage s'allume : écrit en dur,
    // il précédait la fin du balayage dès que le corpus a grandi.
    <div className="hero-cast" aria-hidden="true" style={{ ['--n-tiles' as string]: n } as CSSProperties}>
      {characters.map((c, i) => {
        const a = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2
        return (
          <div
            key={c.id}
            className={`hero-cast__tile${drawn.has(i) ? ' hero-cast__tile--drawn' : ''}`}
            style={{
              ['--i' as string]: i,
              ['--seal-hue' as string]: sealHue(c.id, all),
              ['--x' as string]: `${50 + 41 * Math.cos(a)}%`,
              ['--y' as string]: `${50 + 41 * Math.sin(a)}%`,
            } as CSSProperties}
          >
            <Seal id={c.id} allIds={all} size={40} />
            <span>{c.identity.firstName}</span>
          </div>
        )
      })}
      <p className="hero-cast__center">
        <b>3</b>
        <span>tirées au sort parmi {n}</span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ Pictogrammes */

export function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      className="pictogram"
      viewBox="0 0 48 48"
      width="48" height="48"
      fill="none" stroke="currentColor" strokeWidth={2.2}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BalanceIcon() {
  return (
    <Icon>
      <path d="M24 9v30M15 39h18M9 15h30" />
      <path d="M9 15l-5 11M9 15l5 11M39 15l-5 11M39 15l5 11" />
      <path d="M3 26a6 4 0 0 0 12 0zM33 26a6 4 0 0 0 12 0z" />
      <circle cx="24" cy="9" r="2" fill="currentColor" />
    </Icon>
  )
}

const THEORY_ICONS: Record<string, ReactNode> = {
  // Un rideau : on decide sans voir quelle place on occupera.
  voile: (
    <Icon>
      <path d="M5 8h38" />
      <path d="M8 8c0 12 3 23 11 32M14 8c0 11 1 22 5 32" />
      <path d="M40 8c0 12-3 23-11 32M34 8c0 11-1 22-5 32" />
      <path d="M21.5 22a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v1" />
      <circle cx="24" cy="31" r="0.6" fill="currentColor" />
    </Icon>
  ),
  principes: <BalanceIcon />,
  // Un de : le precedent etait un jeu, et c'est sa mecanique qu'on lui reproche.
  spent: (
    <Icon>
      <rect x="8" y="8" width="32" height="32" rx="6" />
      <circle cx="17" cy="17" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="31" cy="31" r="2.4" fill="currentColor" stroke="none" />
    </Icon>
  ),
  // Un mouvement : la mise en scene est une figure de rhetorique.
  rhetorique: (
    <Icon>
      <path d="M22 13l16 11-16 11z" />
      <path d="M5 18h10M3 24h13M5 30h10" />
    </Icon>
  ),
}

export function TheoryIcon({ id }: { readonly id: string }) {
  return THEORY_ICONS[id] ?? null
}

/* ---------------------------------------------------- Vignettes de l'allure */

function SealSet() {
  const all = ids()
  return (
    <div className="art-seals">
      {all.map((id) => <Seal key={id} id={id} allIds={all} size={34} />)}
    </div>
  )
}

/** Un releve date, pas une jauge : des lignes et des montants, rien qui se « remplit ». */
function Statement() {
  return (
    <svg className="art-doc" viewBox="0 0 120 84" aria-hidden="true">
      <rect x="20" y="4" width="80" height="76" rx="3" className="art-doc__sheet" />
      <rect x="30" y="14" width="34" height="5" rx="1.5" className="art-doc__ink" />
      <rect x="74" y="14" width="16" height="5" rx="1.5" className="art-doc__soft" />
      {[30, 40, 50].map((y, k) => (
        <g key={y}>
          <rect x="30" y={y} width={[38, 30, 34][k]} height="3.5" rx="1.5" className="art-doc__soft" />
          <rect x="78" y={y} width="12" height="3.5" rx="1.5" className="art-doc__ink" />
        </g>
      ))}
      <path d="M30 60h60" className="art-doc__rule" />
      <rect x="30" y="66" width="24" height="4" rx="1.5" className="art-doc__ink" />
      <rect x="74" y="66" width="16" height="4" rx="1.5" className="art-doc__ink" />
    </svg>
  )
}

/** Deux accents de meme force, et un signe ecrit en toutes lettres. */
function Accents() {
  return (
    <div className="art-accents">
      <span className="art-accents__swatch art-accents__swatch--a" />
      <span className="art-accents__swatch art-accents__swatch--b" />
      <span className="art-accents__sign">− 40 € <em>en moins</em></span>
    </div>
  )
}

const LOOK_ART: Record<string, () => ReactNode> = {
  'pas-de-corps': SealSet,
  document: Statement,
  couleurs: Accents,
}

export function LookArt({ id }: { readonly id: string }) {
  const Art = LOOK_ART[id]
  return Art ? <div className="look__art" aria-hidden="true"><Art /></div> : null
}

/* ---------------------------------------------- Garanties de la méthode */

const TRUST_ICONS: Record<string, ReactNode> = {
  // Une coche dans un bouclier : une règle vérifiée, qui bloque.
  checks: (
    <Icon>
      <path d="M24 5l15 6v11c0 10-6.5 17-15 21-8.5-4-15-11-15-21V11z" />
      <path d="M17 24l5 5 10-11" />
    </Icon>
  ),
  // Un document cité.
  sources: (
    <Icon>
      <path d="M12 5h17l9 9v29H12z" />
      <path d="M29 5v9h9M18 22h14M18 29h14M18 36h9" />
    </Icon>
  ),
  // Deux lectures d'un même point : deux chemins depuis un nœud.
  hypotheses: (
    <Icon>
      <circle cx="24" cy="10" r="4" />
      <path d="M24 14v7M24 21l-11 9v9M24 21l11 9v9" />
      <circle cx="13" cy="41" r="2.5" /><circle cx="35" cy="41" r="2.5" />
    </Icon>
  ),
  // Une calculette : les montants recalculés selon la loi.
  law: (
    <Icon>
      <rect x="10" y="5" width="28" height="38" rx="4" />
      <rect x="15" y="10" width="18" height="8" rx="1.5" />
      <path d="M16 25h2M23 25h2M30 25h2M16 31h2M23 31h2M30 31h2M16 37h2M23 37h9" />
    </Icon>
  ),
  // Une loupe : ce qu'on n'a pas su éviter, mis en évidence.
  biases: (
    <Icon>
      <circle cx="21" cy="21" r="12" />
      <path d="M30 30l11 11M21 15v8M21 27v.5" />
    </Icon>
  ),
}

export function TrustIcon({ id }: { readonly id: string }) {
  return TRUST_ICONS[id] ?? null
}
