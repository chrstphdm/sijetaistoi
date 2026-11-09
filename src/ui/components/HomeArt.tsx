import type { CSSProperties, ReactNode } from 'react'
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
 * Les six personnages, en grand, dans le bandeau d'ouverture.
 *
 * Meme tuile, meme taille, ordre alphabetique, apparition SIMULTANEE : une
 * cascade mettrait le premier en avant, exactement ce que l'ecran d'impact
 * s'interdit. Les prenoms sont repetes dans la section des personnages, ou
 * ils sont lus ; ici ils ne servent qu'au reperage.
 */
export function HeroCast() {
  const all = ids()
  return (
    <div className="hero-cast" aria-hidden="true">
      {characters.map((c) => (
        <div
          key={c.id}
          className="hero-cast__tile"
          style={{ ['--seal-hue' as string]: sealHue(c.id, all) } as CSSProperties}
        >
          <Seal id={c.id} allIds={all} size={80} />
          <span>{c.identity.firstName}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ Pictogrammes */

function Icon({ children }: { readonly children: ReactNode }) {
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
