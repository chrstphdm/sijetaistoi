import { useEffect, useRef, useState } from 'react'

/**
 * Les bases de la navigation web, qui manquaient toutes.
 *
 * Dans une application d'une seule page, changer d'ecran ne reinitialise rien :
 * ni le defilement, ni le focus, ni le titre du document. Du point de vue du
 * navigateur, on n'a pas change de page.
 *
 * Consequences constatees :
 *  - on arrive « tout en bas » de l'ecran suivant, parce qu'on etait en bas du
 *    precedent et que personne n'a remis le defilement a zero ;
 *  - au clavier et au lecteur d'ecran c'est pire : le focus etait sur un bouton
 *    qui vient de disparaitre, il retombe donc sur la racine du document, et
 *    rien n'annonce le changement d'ecran.
 */

export type ScreenInfo = {
  /** Change a chaque nouvel ecran : declenche la remise a zero. */
  readonly key: string
  /** Titre du document, pour l'onglet et l'historique du navigateur. */
  readonly title: string
}

/** Attribut a poser sur le titre de chaque ecran, avec tabIndex={-1}. */
export const SCREEN_TITLE_ATTR = 'data-screen-title'

/** Identifiant du conteneur de contenu, cible du lien d'evitement. */
export const CONTENT_ID = 'contenu'

export function useScreenChange({ key, title }: ScreenInfo): void {
  const previous = useRef<string | null>(null)

  useEffect(() => {
    document.title = `${title} · Si j’étais toi`

    const isFirstRender = previous.current === null
    const changed = previous.current !== key
    previous.current = key
    if (isFirstRender || !changed) return

    // `instant` et non `smooth` : un defilement anime sur plusieurs milliers
    // de pixels est desagreable, et il ignorerait prefers-reduced-motion.
    window.scrollTo({ top: 0, behavior: 'instant' })

    /*
     * Le focus va au titre de l'ecran, a defaut au conteneur du contenu.
     *
     * Jamais a la racine du document : le lecteur d'ecran n'annoncerait alors
     * aucun changement, et la tabulation repartirait du haut de la page, donc
     * de tout le rail de progression.
     */
    const target =
      document.querySelector<HTMLElement>(`[${SCREEN_TITLE_ATTR}]`) ??
      document.getElementById(CONTENT_ID)
    target?.focus({ preventScroll: true })
  }, [key, title])
}

/**
 * Vrai au-dela d'un defilement notable. Seuil haut volontairement : sur un
 * ecran court, un bouton « remonter » serait du bruit.
 */
export function useScrolledDown(threshold = 700): boolean {
  const [down, setDown] = useState(false)

  useEffect(() => {
    const onScroll = () => setDown(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return down
}
