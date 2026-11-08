/**
 * Bandeau de portee.
 *
 * Il repond au defaut le plus grave releve en test : « j'ai du mal a faire
 * la difference entre les decisions pour mon personnage et celles pour la
 * politique du pays ».
 *
 * Si cette distinction n'est pas evidente, le mecanisme central du jeu ne
 * fonctionne plus : tout repose sur le fait qu'une decision COLLECTIVE
 * revienne frapper le joueur quand il incarne quelqu'un d'autre. Une
 * decision personnelle, elle, ne suit pas.
 *
 * Les deux portees different donc par la forme ET par les mots, jamais par
 * la seule couleur : intitule explicite, phrase de portee, et traitement
 * visuel distinct.
 */
export function ScopeBand({
  scope, who,
}: {
  readonly scope: 'personal' | 'collective'
  readonly who: string
}) {
  const personal = scope === 'personal'
  return (
    <p className={`scope scope--${scope}`} role="note">
      <span className="scope__tag">
        {personal ? 'Décision personnelle' : 'Décision collective'}
      </span>
      <span className="scope__text">
        {personal ? (
          <>
            Ce choix n’engage que {who}, ce mois-ci. Il ne s’applique à personne d’autre.
          </>
        ) : (
          <>
            Ce choix devient une règle pour <strong>tout le monde</strong>, et pour toute la
            partie — y compris pour les personnages que tu incarneras ensuite.
          </>
        )}
      </span>
    </p>
  )
}
