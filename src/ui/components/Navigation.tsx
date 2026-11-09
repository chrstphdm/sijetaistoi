import { SCREEN_TITLE_ATTR, useScrolledDown } from '../navigation.ts'

/**
 * Lien d'evitement.
 *
 * Premier element focusable de la page, invisible jusqu'a ce qu'il recoive le
 * focus. Sans lui, qui navigue au clavier doit traverser tout le rail de
 * progression — jusqu'a une douzaine d'arrets — avant d'atteindre le contenu,
 * et cela a chaque ecran.
 */
export function SkipLink() {
  return (
    <a className="skip-link" href="#contenu">
      Aller au contenu
    </a>
  )
}

/**
 * Retour en haut de page.
 *
 * Les ecrans de relevé et de bilan depassent largement une hauteur d'ecran sur
 * telephone ; il n'existait aucun moyen de remonter autrement qu'en faisant
 * defiler. C'est un vrai lien vers `#contenu` et non un bouton : il fonctionne
 * donc sans JavaScript et s'annonce correctement.
 */
export function BackToTop() {
  const visible = useScrolledDown()
  return (
    <a
      /* Vers le HAUT DE LA PAGE et non vers `#contenu` : sur téléphone, le
         rail de progression occupe le haut de l'écran, et viser le contenu
         laissait la page à 146 px du sommet alors que le lien promet le
         sommet. Relevé par le test mobile, pas par le test bureau. */
      className={`back-to-top${visible ? ' back-to-top--visible' : ''}`}
      href="#haut"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span aria-hidden="true">↑</span> Haut de page
    </a>
  )
}

/**
 * Titre de l'ecran : un `h1`, et un seul par ecran.
 *
 * Quatre ecrans de jeu sur neuf n'en avaient aucun — le mois, la decision, le
 * jugement, la comparaison : leur hierarchie de titres commencait a `h2`.
 * Rien ne nommait donc la page, un lecteur d'ecran ne pouvait pas annoncer ou
 * l'on venait d'arriver, et la remise a zero du focus n'avait pas de cible.
 *
 * Il porte `tabIndex={-1}` pour etre focusable par le script sans entrer dans
 * l'ordre de tabulation, et reprend mot pour mot le titre du document : le
 * meme ecran ne doit pas s'appeler autrement dans l'onglet et dans la page.
 */
export function ScreenTitle({ children }: { readonly children: string }) {
  return (
    <h1 className="screen-title" tabIndex={-1} {...{ [SCREEN_TITLE_ATTR]: true }}>
      {children}
    </h1>
  )
}
