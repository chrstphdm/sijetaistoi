import type { MonthEntry } from './monthLog.ts'
import type { Command } from '@/core/game.ts'
import type { DrawCounts } from '@/core/rng.ts'

/**
 * Sauvegarde locale d'une partie.
 *
 * Defaut constate : il n'existait AUCUNE sauvegarde. Recharger la page, ou
 * revenir dessus apres l'avoir quittee, perdait tout — alors que le plan
 * promettait une « progression conservee localement ». Le dossier
 * `src/persistence/` figurait a l'etape 1 et n'a jamais ete ecrit.
 *
 * OU EST STOCKEE LA PARTIE, ET POURQUOI
 *
 * Par defaut dans `sessionStorage` : la partie survit a un rechargement et
 * disparait a la fermeture de l'onglet.
 *
 * Ce n'est pas de la prudence excessive. Le journal contient les jugements du
 * joueur sur des questions politiques et le texte libre qu'il a ecrit — des
 * opinions politiques, donc des donnees sensibles au sens de l'article 9 du
 * RGPD. Sur un poste partage — une salle de classe, un centre social, un
 * ordinateur familial — les laisser par defaut dans `localStorage` reviendrait
 * a exposer a la personne suivante ce que la precedente pense de l'impot.
 *
 * Qui veut reprendre plus tard l'active explicitement : la partie passe alors
 * dans `localStorage`, et le jeu le dit en toutes lettres.
 *
 * Dans les deux cas, rien ne quitte l'appareil : le jeu n'emet aucune requete
 * reseau, ce que verifie un test de bout en bout.
 */

const KEY = 'sijetaistoi:partie'

/** Version du format de sauvegarde, independante de la version du contenu. */
const FORMAT = 2

/**
 * Curseur d'interface : ou en est le joueur dans l'ecran courant.
 *
 * Le journal reste la SEULE source de verite du bilan. Ces valeurs-la ne
 * decrivent aucune decision ; elles disent seulement quel ecran afficher et
 * quels evenements ont deja servi. Sans elles, recharger ramenerait a
 * l'accueil une partie pourtant intacte.
 */
export type Cursor<Step = unknown> = {
  /** Ecran courant, sous forme stockable. Defini par la couche d'interface. */
  readonly step: Step
  readonly monthsDone: number
  readonly monthIndex: number
  readonly reformIndex: number
  readonly usedEvents: readonly string[]
  readonly recurring: readonly { readonly code: string; readonly amountCents: number }[]
  readonly oneOffCents: number
  /**
   * Releve de chaque mois deja vecu dans l'acte, pour le releve lateral.
   * Optionnel : une sauvegarde anterieure reprend avec un historique vide.
   */
  readonly monthLog?: readonly MonthEntry[]
  readonly wording: string
  /**
   * Position de chaque flux aleatoire.
   *
   * Sans elle, reprendre repartirait de generateurs neufs et la suite de la
   * partie divergerait de ce qu'une partie ininterrompue aurait donne. Voir
   * `advance` dans src/core/rng.ts.
   */
  readonly draws: DrawCounts
}

export type Saved<Step = unknown> = {
  readonly format: number
  readonly seed: string
  readonly contentVersion: string
  readonly journal: readonly Command[]
  readonly cursor: Cursor<Step>
}

export type Durability = 'session' | 'device'

const PREFERENCE_KEY = 'sijetaistoi:conservation'

/**
 * Chaque acces est protege : en navigation privee, avec les donnees de site
 * bloquees, ou au-dela du quota, le simple fait de LIRE peut lever. Une
 * sauvegarde impossible n'est pas une erreur de jeu : on joue sans.
 */
function store(kind: Durability): Storage | null {
  try {
    return kind === 'device' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function durability(): Durability {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === 'device' ? 'device' : 'session'
  } catch {
    return 'session'
  }
}

export function setDurability(kind: Durability): void {
  try {
    if (kind === 'device') window.localStorage.setItem(PREFERENCE_KEY, 'device')
    else window.localStorage.removeItem(PREFERENCE_KEY)
  } catch {
    /* sans stockage, la preference ne tient pas : la partie reste en session */
  }
  // La partie suit la preference, sinon changer d'avis la perdrait.
  const current = load()
  if (current) {
    clear()
    save(current, kind)
  }
}

export function save<S>(saved: Saved<S>, kind: Durability = durability()): void {
  const s = store(kind)
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(saved))
  } catch {
    /* quota depasse ou ecriture refusee : la partie continue sans sauvegarde */
  }
}

/**
 * Relit une partie, ou rien.
 *
 * Une sauvegarde dont le format ou la version de contenu ne correspond plus
 * est ecartee sans bruit : rejouer un journal contre un contenu modifie
 * produirait une partie differente de celle que le joueur a vecue, et le bilan
 * lui attribuerait des decisions qu'il n'a pas prises.
 */
export function load<S>(contentVersion?: string): Saved<S> | null {
  for (const kind of ['device', 'session'] as const) {
    const s = store(kind)
    if (!s) continue
    let raw: string | null = null
    try {
      raw = s.getItem(KEY)
    } catch {
      continue
    }
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as Saved<S>
      if (parsed.format !== FORMAT) continue
      if (contentVersion !== undefined && parsed.contentVersion !== contentVersion) continue
      if (!Array.isArray(parsed.journal) || parsed.journal.length === 0) continue
      return parsed
    } catch {
      continue
    }
  }
  return null
}

export function clear(): void {
  for (const kind of ['device', 'session'] as const) {
    try {
      store(kind)?.removeItem(KEY)
    } catch {
      /* rien a faire : il n'y avait rien a effacer */
    }
  }
}

export const FORMAT_VERSION = FORMAT
