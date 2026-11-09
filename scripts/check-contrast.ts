/**
 * Verification des contrastes declares.
 *
 * Les ratios annonces dans le plan et dans les commentaires du systeme de
 * design sont recalcules ici a partir des valeurs reellement presentes dans
 * tokens.css. Un chiffre annonce mais faux serait exactement la faute que
 * le projet interdit a son contenu.
 *
 * Ce controle complete axe-core, il ne le remplace pas : axe mesure ce qui
 * est rendu, ce script mesure ce qui est declare. Les deux peuvent diverger
 * si une regle CSS applique une couleur non prevue.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(ROOT, 'src/ui/styles/tokens.css'), 'utf8')

/** Extrait les jetons d'un bloc de declaration donne. */
function tokensIn(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]!] = m[2]!.toLowerCase()
  return out
}

const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('@media'))
const darkBlock = css.slice(css.indexOf("[data-theme='dark']"))
const light = tokensIn(lightBlock)
const dark = tokensIn(darkBlock)

/** Luminance relative, formule WCAG 2.x. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}

const ratio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** min : seuil WCAG applicable. 4.5 texte courant, 3 gros texte et objets. */
type Pair = { fg: string; bg: string; min: number; what: string }

const PAIRS: readonly Pair[] = [
  { fg: 'ink', bg: 'paper', min: 4.5, what: 'texte principal' },
  { fg: 'ink', bg: 'paper-raised', min: 4.5, what: 'texte sur feuille' },
  { fg: 'ink', bg: 'paper-sunk', min: 4.5, what: 'texte sur fond creusé' },
  { fg: 'ink-2', bg: 'paper', min: 4.5, what: 'texte secondaire' },
  { fg: 'ink-2', bg: 'paper-raised', min: 4.5, what: 'texte secondaire sur feuille' },
  { fg: 'ink-2', bg: 'paper-sunk', min: 4.5, what: 'intitulé du bandeau personnel' },
  { fg: 'ink-3', bg: 'paper', min: 4.5, what: 'mentions de provenance' },
  { fg: 'ink-3', bg: 'paper-raised', min: 4.5, what: 'provenance sur feuille' },
  { fg: 'perspective-a', bg: 'paper', min: 4.5, what: 'accent A' },
  { fg: 'perspective-b', bg: 'paper', min: 4.5, what: 'accent B' },
  { fg: 'perspective-a', bg: 'paper-raised', min: 4.5, what: 'accent A sur feuille' },
  { fg: 'ink', bg: 'tint-a', min: 4.5, what: 'texte sur aplat A' },
  { fg: 'ink', bg: 'tint-b', min: 4.5, what: 'texte sur aplat B' },
  { fg: 'paper-raised', bg: 'perspective-a', min: 4.5, what: 'marqueur collectif (texte inversé)' },
  { fg: 'paper-raised', bg: 'perspective-a', min: 4.5, what: 'bouton de départ' },
  { fg: 'paper', bg: 'ink', min: 4.5, what: 'bandeau d’ouverture' },
  { fg: 'paper-sunk', bg: 'ink', min: 4.5, what: 'accroche du bandeau' },
  { fg: 'rule-strong', bg: 'paper', min: 3, what: 'bordure de composant' },
]

/**
 * Paires ecrites en dur dans base.css, hors du jeu de jetons.
 *
 * Les bandes sombres de la page d'accueil forcent les accents clairs ; le
 * script ne peut pas les deduire de tokens.css. Les omettre a laisse passer
 * un bouton a 1,98:1, attrape seulement par axe-core au navigateur.
 */
const LITERAL_PAIRS: readonly { fg: string; bg: string; min: number; what: string }[] = [
  { fg: '#1e1b16', bg: '#73c0c6', min: 4.5, what: 'bouton de départ sur bande sombre' },
  { fg: '#73c0c6', bg: '#1e1b16', min: 4.5, what: 'chiffres sur bande sombre' },
  { fg: '#e0a85a', bg: '#1e1b16', min: 4.5, what: 'chiffre zéro sur bande sombre' },
  { fg: '#e8e3d8', bg: '#1e1b16', min: 4.5, what: 'légende des chiffres' },
]

const problems: string[] = []
const rows: string[] = []

for (const p of LITERAL_PAIRS) {
  const r = ratio(p.fg, p.bg)
  rows.push(`  ${'littéral'.padEnd(7)} ${p.what.padEnd(38)} ${r.toFixed(2).padStart(6)}:1  (min ${p.min})`)
  if (r < p.min) {
    problems.push(`littéral · ${p.what} : ${r.toFixed(2)}:1 entre ${p.fg} et ${p.bg}, minimum ${p.min}:1`)
  }
}

for (const [theme, tokens] of [['clair', light], ['sombre', dark]] as const) {
  for (const p of PAIRS) {
    const fg = tokens[p.fg]
    const bg = tokens[p.bg]
    if (!fg || !bg) {
      problems.push(`${theme} · ${p.what} : jeton manquant (${!fg ? p.fg : p.bg})`)
      continue
    }
    const r = ratio(fg, bg)
    rows.push(`  ${theme.padEnd(7)} ${p.what.padEnd(38)} ${r.toFixed(2).padStart(6)}:1  (min ${p.min})`)
    if (r < p.min) {
      problems.push(
        `${theme} · ${p.what} : ${r.toFixed(2)}:1 entre ${fg} et ${bg}, minimum ${p.min}:1`,
      )
    }
  }
}

/**
 * PARITE DES ACCENTS.
 *
 * Les deux accents encodent un POINT DE VUE, jamais un gain ou une perte.
 * S'ils n'avaient pas la meme force perceptive, l'un porterait plus que
 * l'autre, et le dispositif prendrait parti sans le dire.
 */
const MAX_ACCENT_GAP = 0.15
for (const [theme, tokens] of [['clair', light], ['sombre', dark]] as const) {
  const bg = tokens['paper']!
  const a = ratio(tokens['perspective-a']!, bg)
  const b = ratio(tokens['perspective-b']!, bg)
  const gap = Math.abs(a - b) / Math.max(a, b)
  rows.push(`  ${theme.padEnd(7)} ${'écart entre les deux accents'.padEnd(38)} ${(gap * 100).toFixed(1).padStart(6)} %  (max ${MAX_ACCENT_GAP * 100} %)`)
  if (gap > MAX_ACCENT_GAP) {
    problems.push(
      `${theme} · les deux accents n'ont pas la même force : ${a.toFixed(2)}:1 contre ${b.toFixed(2)}:1, écart ${(gap * 100).toFixed(1)} %`,
    )
  }
}

console.log(rows.join('\n'))

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} contraste(s) insuffisant(s)`)
  for (const p of problems) console.error(`  ${p}`)
  console.error('')
  process.exit(1)
}
console.log(`\n✓ contrastes — ${PAIRS.length * 2} paires vérifiées, parité des accents respectée`)
