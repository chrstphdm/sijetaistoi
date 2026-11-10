import { REPO_URL } from '../links.ts'

/**
 * Mentions légales et avertissement.
 *
 * La loi pour la confiance dans l'économie numérique (art. 6-III) impose à
 * tout site d'indiquer qui l'édite et qui l'héberge. Un particulier qui
 * publie à titre non professionnel peut ne pas publier son identité, à
 * condition de l'avoir communiquée à l'hébergeur (art. 6-III-2) : c'est
 * l'option retenue ici.
 */

/** L'avertissement, repris tel quel en bas de l'accueil et sur l'écran du contrat. */
export const DISCLAIMER =
  'Ce jeu est une fiction pédagogique. Les personnages et les instances qui posent les questions sont fictifs ; ' +
  'les montants sont des ordres de grandeur, ni des prévisions, ni un conseil financier ou juridique. ' +
  'Il n’est lié à aucun parti ni à aucun candidat, et ne publie aucun résultat sur les opinions de ses joueurs.'

export function LegalScreen({ onBack }: { readonly onBack: () => void }) {
  return (
    <article className="sheet legal" aria-labelledby="legal-title">
      <h1 id="legal-title">Mentions légales</h1>

      <section aria-labelledby="legal-warning">
        <h2 id="legal-warning">Avertissement</h2>
        <p>{DISCLAIMER}</p>
        <p>
          Le Conseil budgétaire, le Conseil du logement, le Conseil du travail et les autres
          instances qui posent les questions du jeu n’existent pas : leurs noms décrivent un rôle,
          ils ne désignent aucun organisme réel. Les organismes publics cités comme sources —
          Insee, Drees, Cnaf, COR, Unédic… — le sont pour leurs chiffres, et n’ont ni écrit ni
          validé ce jeu.
        </p>
      </section>

      <section aria-labelledby="legal-editor">
        <h2 id="legal-editor">Éditeur</h2>
        <p>
          Ce site est édité à titre non professionnel par une personne physique qui, comme le
          permet l’article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
          l’économie numérique, ne publie pas son identité ; celle-ci a été communiquée à
          l’hébergeur. Pour tout contact, signalement ou demande&nbsp;:{' '}
          <a href={`${REPO_URL}/issues`} rel="noopener noreferrer">le dépôt public du projet&nbsp;↗</a>.
        </p>
      </section>

      <section aria-labelledby="legal-host">
        <h2 id="legal-host">Hébergeur</h2>
        <p>
          GitHub, Inc. (service GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco,
          CA 94107, États-Unis. Contact&nbsp;:{' '}
          <a href="https://support.github.com/contact" rel="noopener noreferrer">formulaire de GitHub&nbsp;↗</a>
          {' '}; délégué à la protection des données&nbsp;: dpo@github.com. GitHub ne publie pas
          de numéro de téléphone dans ses documents officiels.
        </p>
      </section>

      <section aria-labelledby="legal-data">
        <h2 id="legal-data">Données personnelles</h2>
        <p>
          Le site ne dépose aucun cookie, ne mesure aucune audience et ne charge aucune
          ressource extérieure. Tes réponses portent sur des opinions politiques, qui sont des
          données sensibles&nbsp;: elles restent dans ton navigateur, ne sont transmises à aucun
          serveur, et l’éditeur n’y a pas accès. Une partie n’est conservée sur l’appareil, au-delà
          de l’onglet ouvert, que si tu le demandes.
        </p>
      </section>

      <section aria-labelledby="legal-licence">
        <h2 id="legal-licence">Licence</h2>
        <p>
          Le code est publié sous licence GNU AGPL 3.0 ou ultérieure, sur{' '}
          <a href={REPO_URL} rel="noopener noreferrer">le dépôt public&nbsp;↗</a>. Les données
          statistiques citées restent celles de leurs producteurs, sous leurs conditions de
          réutilisation.
        </p>
      </section>

      <p>
        <button type="button" className="btn-primary" onClick={onBack}>Revenir</button>
      </p>
    </article>
  )
}
