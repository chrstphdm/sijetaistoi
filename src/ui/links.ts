/**
 * Le depot public, et les documents de travail qui fondent le jeu.
 *
 * La page methode affirmait que « le code et le contenu sont publics » sans
 * jamais dire ou. Une affirmation de transparence qu'on ne peut pas suivre ne
 * vaut pas mieux qu'une absence d'affirmation.
 *
 * Ce sont des LIENS, pas des ressources chargees : le site continue de ne rien
 * demander a aucun serveur tiers tant qu'on ne clique pas.
 */
export const REPO_URL = 'https://github.com/chrstphdm/sijetaistoi'

const file = (path: string) => `${REPO_URL}/blob/main/${path}`

export const DOCUMENTS: readonly { readonly label: string; readonly href: string; readonly what: string }[] = [
  {
    label: 'La charte éditoriale',
    href: file('CHARTE.md'),
    what: 'Les règles opposables à tout contenu du jeu, et celles qui bloquent la mise en ligne.',
  },
  {
    label: 'La note de méthode',
    href: file('NOTE-DE-METHODE.md'),
    what: 'Ce que le dispositif mesure, ce qu’il ignore, et pourquoi.',
  },
  {
    label: 'Les hypothèses du modèle',
    href: file('HYPOTHESES.md'),
    what: 'Les points où les travaux divergent, chacun avec ses deux lectures.',
  },
  {
    label: 'Le journal des décisions',
    href: file('DECISIONS.md'),
    what: 'Chaque choix de conception, avec ce qui l’a motivé — erreurs comprises.',
  },
  {
    label: 'Les sources',
    href: file('content/sources.json'),
    what: 'Chaque source citée, son organisme, son millésime et son affiliation.',
  },
]
