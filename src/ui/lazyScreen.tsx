import { lazy, useState, type ComponentType } from 'react'

/**
 * Un écran chargé à part, mais rendu SANS DÉTOUR une fois chargé.
 *
 * `React.lazy` seul suspend au premier rendu même si le fichier est déjà
 * arrivé : le contenu manquerait le temps d'un rendu, après que la remise à
 * zéro du focus et du défilement (navigation.ts) a déjà eu lieu. Ici, un
 * écran dont le module est déjà là se rend directement, exactement comme un
 * import ordinaire ; seul un écran demandé AVANT la fin du préchargement
 * passe par Suspense.
 *
 * Le choix est fait une fois par instance : basculer d'un composant à
 * l'autre en cours de vie remonterait l'écran et perdrait son état local.
 */
export type LazyScreen<P> = ComponentType<P> & { readonly preload: () => Promise<unknown> }

export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>): LazyScreen<P> {
  let loaded: ComponentType<P> | null = null
  let pending: Promise<ComponentType<P>> | null = null
  const preload = () =>
    (pending ??= load().then(
      (component) => (loaded = component),
      (error: unknown) => {
        // Un échec (réseau coupé) ne doit pas être définitif : on retentera.
        pending = null
        throw error
      },
    ))
  const Deferred = lazy(() => preload().then((component) => ({ default: component })))

  function Screen(props: P) {
    const [Ready] = useState(() => loaded)
    return Ready ? <Ready {...props} /> : <Deferred {...props} />
  }
  return Object.assign(Screen, { preload })
}
