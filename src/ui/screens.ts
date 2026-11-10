import { lazyScreen } from './lazyScreen.tsx'

/**
 * Les écrans qui ne servent pas au premier affichage.
 *
 * L'accueil est ce que reçoit d'abord chaque visiteur ; la page méthode, les
 * mentions légales et les écrans de partie n'arrivent qu'après un clic. Ils
 * sont livrés dans des fichiers à part, demandés dès que l'accueil est
 * affiché (`preloadScreens`), si bien qu'en pratique ils sont là avant le
 * clic et se rendent sans attente.
 *
 * Ce qui reste dans le fichier principal, et pourquoi : le moteur, le paquet
 * de contenu et `useGame`, parce que la partie est tirée — ou reprise — dès
 * le montage, de façon synchrone, et que la rendre asynchrone toucherait au
 * déterminisme ; l'accueil et le contrat ; le rail, l'écran de préparation
 * (porte de service, atteinte directement par l'adresse) et la comparaison
 * entre personnages, dont App emprunte `rotationOrder`.
 */

export const MethodScreen = lazyScreen(() =>
  import('./components/MethodScreen.tsx').then((m) => m.MethodScreen))
export const LegalScreen = lazyScreen(() =>
  import('./components/LegalScreen.tsx').then((m) => m.LegalScreen))

export const CharacterIntro = lazyScreen(() =>
  import('./components/CharacterIntro.tsx').then((m) => m.CharacterIntro))
export const MonthScreen = lazyScreen(() =>
  import('./components/MonthScreen.tsx').then((m) => m.MonthScreen))
export const MonthlyBudget = lazyScreen(() =>
  import('./components/MonthlyBudget.tsx').then((m) => m.MonthlyBudget))
export const MonthTrend = lazyScreen(() =>
  import('./components/MonthTrend.tsx').then((m) => m.MonthTrend))
export const ReformVote = lazyScreen(() =>
  import('./components/ReformVote.tsx').then((m) => m.ReformVote))
export const JudgementScale = lazyScreen(() =>
  import('./components/JudgementScale.tsx').then((m) => m.JudgementScale))
export const CallbackPanel = lazyScreen(() =>
  import('./components/Callback.tsx').then((m) => m.CallbackPanel))
export const QuotaBlockedNote = lazyScreen(() =>
  import('./components/Callback.tsx').then((m) => m.QuotaBlockedNote))
export const SummaryScreen = lazyScreen(() =>
  import('./components/Summary.tsx').then((m) => m.SummaryScreen))
export const ImpactProjection = lazyScreen(() =>
  import('./components/ImpactProjection.tsx').then((m) => m.ImpactProjection))

const ALL = [
  MethodScreen, LegalScreen, CharacterIntro, MonthScreen, MonthlyBudget, MonthTrend,
  ReformVote, JudgementScale, CallbackPanel, QuotaBlockedNote, SummaryScreen, ImpactProjection,
]

/** Demande tous les écrans différés. Sans effet s'ils sont déjà là. */
export const preloadScreens = (): Promise<unknown> => Promise.all(ALL.map((s) => s.preload()))
