/**
 * Typographie française, appliquée au BUILD et en un seul endroit.
 *
 * Le contenu est écrit à la main, dans des fichiers JSON, par des personnes
 * et des outils différents : on y trouvait l'apostrophe droite ' à côté de
 * l'apostrophe typographique ’, et des espaces ordinaires devant « : » et
 * « ? ». Une espace ordinaire devant un deux-points laisse le navigateur
 * renvoyer la ponctuation seule en début de ligne. Corriger chaque fichier
 * ne tiendrait pas : la prochaine saisie réintroduirait l'écart. La règle
 * vit donc ici, et scripts/build-content.ts l'applique à toutes les chaînes
 * lisibles du paquet.
 *
 * Elle ne fait que trois choses, et ne touche ni aux identifiants, ni aux
 * adresses, ni aux nombres :
 *
 *   1. l'apostrophe droite entre deux lettres devient ’ (« l’État ») ;
 *   2. devant ; ? ! l'espace devient une espace fine insécable (U+202F) ;
 *   3. devant : et à l'intérieur des guillemets « », elle devient une espace
 *      insécable (U+00A0).
 *
 * Elle ne crée pas d'espace là où l'auteur n'en a pas mis devant : ; ? ! —
 * « https: », « 14:30 » ou « (?) » n'en veulent pas — sauf à l'intérieur des
 * guillemets français, où l'absence d'espace n'est jamais voulue.
 *
 * Fonction pure, idempotente : l'appliquer deux fois ne change rien.
 */

export const NBSP = '\u00A0'
export const NNBSP = '\u202F'

/** Toute espace horizontale, y compris celles que cette fonction pose. */
const SPACE = '[ \\t\\u00A0\\u202F]'

export function frenchTypography(text: string): string {
  return (
    text
      // 1. Apostrophe d'élision, entre deux lettres.
      .replace(/(?<=\p{L})'(?=\p{L})/gu, '’')
      // 2. Espace fine insécable devant ; ? !
      .replace(new RegExp(`${SPACE}+([;?!])`, 'gu'), `${NNBSP}$1`)
      // 3. Espace insécable devant :
      .replace(new RegExp(`${SPACE}+:`, 'gu'), `${NBSP}:`)
      // … et à l'intérieur des guillemets, qu'il y ait une espace ou non.
      .replace(new RegExp(`«${SPACE}*`, 'gu'), `«${NBSP}`)
      .replace(new RegExp(`${SPACE}*»`, 'gu'), `${NBSP}»`)
  )
}

/**
 * Clés dont la valeur n'est pas du texte lu : identifiants, références,
 * adresses, codes, valeurs d'énumération. Elles sont laissées intactes même
 * si la règle ne devrait pas les modifier — la prudence ne coûte rien ici.
 */
const VERBATIM_KEY = /^(id|ids|url|href|code|of|unit|vintage|date|status|kind|type|group|appliedBy|affiliation|nature|horizon|uncertainty|valence|settlement|contentVersion|charterVersion)$|(Id|Ids|Code|Codes)$/

/**
 * Applique `frenchTypography` à toutes les chaînes d'une valeur JSON, sauf
 * sous les clés de VERBATIM_KEY. Renvoie une copie ; l'entrée n'est pas
 * modifiée.
 */
export function normaliseStrings<T>(value: T, key = ''): T {
  if (typeof value === 'string') return (VERBATIM_KEY.test(key) ? value : frenchTypography(value)) as T
  if (Array.isArray(value)) return value.map((v) => normaliseStrings(v, key)) as T
  if (value && typeof value === 'object') {
    // Une clé verbatim protège tout ce qu'elle contient.
    if (key && VERBATIM_KEY.test(key)) return value
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normaliseStrings(v, k)]),
    ) as T
  }
  return value
}
