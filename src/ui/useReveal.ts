import { useEffect, type RefObject } from 'react'

/**
 * Animations d'entrée de la page d'accueil, au moment où chaque élément
 * devient visible.
 *
 * Trois règles, qui découlent de la charte (E3 : aucune information n'est
 * portée par le seul mouvement) :
 *
 *   1. RIEN N'EST CACHÉ SANS JAVASCRIPT. L'état d'attente (`.reveal` non
 *      encore vu) n'existe que lorsque ce hook a posé `data-reveal` sur la
 *      racine. Sans lui, tout est affiché d'emblée.
 *   2. MOINS DE MOUVEMENT DEMANDÉ = AUCUN MOUVEMENT. Tout est marqué vu
 *      immédiatement, et la feuille de style coupe les animations.
 *   3. UNE SEULE FOIS. Un élément vu ne se ré-anime pas en remontant.
 *
 * Les animations elles-mêmes sont en CSS : elles restent donc visibles par
 * `document.getAnimations()`, ce qui permet aux captures et aux contrôles
 * d'accessibilité d'attendre qu'elles soient finies.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const targets = el.querySelectorAll<HTMLElement>('.reveal, .count, .loop, .hero-cast')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      targets.forEach((t) => t.classList.add('is-in'))
      return
    }
    el.dataset.reveal = 'on'
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [root])
}
