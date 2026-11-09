# Journal des arbitrages

Les décisions d'architecture et de conception qui ne se déduisent ni du code ni du
plan, avec ce qui les a motivées. Ordre chronologique.

## 1 — Zéro backend pour le MVP

Site statique, contenu en fichiers validés, moteur en TypeScript pur, progression en
stockage local.

Ce n'était pas qu'une économie. Les réponses du joueur sont des opinions politiques,
donc des données sensibles. Ne pas avoir de serveur est la protection la plus solide
qu'on puisse offrir : il n'y a rien à sécuriser, rien à divulguer, rien à réclamer.

## 2 — Le journal de commandes est l'unique format de sauvegarde

`state = journal.reduce(apply, initialState)`. Rien de calculé n'est persisté.

Imposé par le panel de juges. Une partie devient rejouable à l'identique, donc
auditable : on peut montrer au joueur, après coup, pourquoi il a tiré tel personnage.
Le mode groupe futur se réduit à rejouer le même journal.

## 3 — Quatre flux d'aléa nommés et indépendants

`events`, `characters`, `presentation`, `hypotheses`.

Avec un flux unique, ajouter une randomisation d'affichage déplacerait tous les
tirages suivants et changerait le **contenu** tiré. Aucun test de référence ne
survivrait à une modification de l'interface.

## 4 — Le contenu ne stocke que des magnitudes positives

Le signe est déduit du groupe de la ligne budgétaire. Un auteur ne manipule jamais de
signe, donc ne peut pas transformer une dépense en ressource par inadvertance. Toute
une classe d'erreurs éditoriales disparaît.

## 5 — La neutralité de la mise en scène passe par la signature de type

`ShockInput` ne reçoit ni `characterId`, ni `measureId`, ni l'opinion du joueur. On ne
peut pas biaiser avec ce qu'on ne reçoit pas.

Le signe est détruit par un `Math.abs` en un point unique, ce qui fait de la symétrie
gain/perte un **théorème** plutôt qu'une discipline. Les tests ne vérifient pas la
symétrie : ils vérifient que ce point n'a pas été contourné.

## 6 — Aucun dénominateur par défaut imposé en silence

Rapporter au reste à vivre présuppose le besoin ; au revenu, la proportionnalité ; aux
euros, le nominalisme. Aucun n'est neutre.

Plutôt que de trancher, le jeu en fait un objet jouable : un sélecteur montre que le
classement des personnages les plus touchés change selon l'échelle. L'obstacle devient
le contenu.

## 7 — Aucun corps humain

Deux analyses de direction artistique ont conclu indépendamment qu'un portrait est une
caricature en puissance : tout corps encode vêtement, teint, corpulence, posture,
décor.

Remplacé par un sceau procédural dont la **parité est garantie par construction** —
même surface d'encre pour tous, teinte attribuée par rang alphabétique.

## 8 — Trois actes, et non deux

Avec deux personnages, le joueur perçoit un piège : on lui a montré l'envers de sa
décision. Avec trois, il perçoit un système.

## 9 — Le seuil de parité narrative est calé sur le corpus réel

Fixé d'abord à 60 %, puis mesuré : les écarts réels allaient de 0 à 39 %. Un seuil
qu'aucun contenu ne peut franchir ne garantit rien. Resserré à 50 %.

## 10 — Le lint tourne sur les fichiers bruts, pas sur le paquet compilé

Il doit pouvoir signaler un terme proscrit même dans un fichier que le schéma rejette
par ailleurs. Corriger du contenu ne doit pas demander trois passes.

## 11 — Le lexique contrôlé est publié et justifié

Un lexique est lui-même un artefact politique : décider qu'un mot est connoté est un
jugement. Il vit donc dans `content/`, chaque entrée justifie son exclusion, et un
test vérifie qu'il coupe dans tous les sens.

## 12 — La page méthode lit le code, elle ne le recopie pas

Seuils, plafonds, contraintes de tirage et taille du corpus sont lus dans les données
et les constantes au moment de l'affichage. Une page méthode qui dériverait de ce que
le programme fait vraiment serait pire que pas de page du tout.

## 13 — Écarté : les programmes de la présidentielle 2027

Décision du porteur du projet. Le jeu ne nomme aucun candidat, aucun parti, et ne se
rattache à aucune échéance électorale.

Cela retire du projet l'essentiel de son exposition juridique — droit électoral,
réglementation des sondages — et son principal risque de basculement en mode tribal :
dès qu'un nom apparaît, beaucoup cessent de raisonner sur la mesure.

## 14 — Durci par erreur, puis assumé : le joueur ne choisit pas son personnage

Le brief disait « pas **nécessairement** ». L'implémentation dit « jamais ».

L'écart a été signalé au porteur du projet. Argument pour le tirage : c'est ce qui
rend crédible la phrase « le jeu ne t'envoie pas là où ça fait mal ». Décision en
attente.

## 15 — Déploiement sur GitHub Pages plutôt que Cloudflare

J'avais argumenté pour Cloudflare Pages, au motif que lui seul permet des en-têtes
HTTP personnalisés, donc une vraie Content-Security-Policy — un site qui manipule des
opinions politiques ne devant charger aucune ressource tierce.

Vérification faite, cet argument tenait moins qu'annoncé : le site ne charge **aucune**
ressource externe, n'émet **aucune** requête réseau, et n'utilise que des polices
système. La CSP était une défense en profondeur, pas une protection indispensable.

Et le porteur du projet n'a pas de compte Cloudflare : ses cinq autres sites sont sur
GitHub Pages. Imposer un second hébergeur pour un bénéfice théorique n'était pas
défendable.

Ce que le choix coûte réellement, et qui n'est pas nul : une balise `meta` couvre la
plupart des directives CSP, mais pas `frame-ancestors` ni `Permissions-Policy`. Le site
peut donc être inclus dans une iframe tierce. Le risque est faible — aucun identifiant,
aucune action aux conséquences durables — mais il existe.

`public/_headers` est conservé : il ne sert à rien sur Pages, et resservira si le site
change un jour d'hébergeur.

## 16 — L'Atelier n'existe qu'en développement

Question du porteur du projet : « tout le monde peut modifier le jeu depuis
/#atelier ? »

Sur la sécurité, non : l'Atelier n'a aucun serveur où écrire. Il emploie la File
System Access API, qui fait désigner un dossier sur la machine du visiteur, ou
retombe sur un téléchargement. Le site déployé est fait de fichiers statiques que
personne ne peut modifier sans accès au dépôt.

Mais la question a révélé un défaut de conception : sur un site déployé, l'Atelier ne
sert à **rien**. Le jeu lit un paquet compilé au moment du build ; un visiteur peut
éditer, enregistrer, et ne rien voir changer — ni pour lui, ni pour personne. Une
fonctionnalité qui semble agir sans agir est pire qu'une fonctionnalité absente.

Il est donc réservé au développement. `import.meta.env.DEV` vaut `false` à la
compilation, donc l'import dynamique tombe en code mort et Rollup retire le fichier
entier : vérifié, ni le code de l'Atelier ni Zod ne sont envoyés au visiteur.

Conséquence sur les tests : l'Atelier est désormais testé sur le serveur de
développement, et un test vérifie qu'il est bien **absent** du build de production.
Tester l'Atelier sur le build vérifierait quelque chose qui n'est pas livré.

## 17 — La couleur des sceaux est décorative, par nécessité mathématique

En rendant la page d'accueil plus visuelle, la palette des six sceaux a été passée au
validateur plutôt qu'appréciée à l'œil. Résultat : **échec sur la séparation en vision
deutéranope**, delta E de 0,9 là où le seuil est de 8. Monter le chroma de 0,10 à 0,17
ne change rien.

La cause est structurelle. Six teintes à **luminance égale** ne peuvent pas être
séparées en vision deutan : l'axe rouge-vert s'effondre, et l'égalité de luminance
supprime justement l'indice qui resterait.

Deux règles du projet sont donc mathématiquement incompatibles :

- **parité** — même luminance et même chroma pour tous, sinon un personnage paraît
  plus présent qu'un autre ;
- **séparation** — des luminances différentes, sinon une partie des joueurs ne
  distingue pas les teintes.

La parité l'emporte, parce qu'elle protège d'un biais que le joueur ne peut pas
corriger. La séparation est assurée autrement : le **motif** du sceau diffère d'un
personnage à l'autre, et son **prénom** est toujours écrit à côté. La couleur n'ajoute
qu'un confort de repérage.

Conséquence écrite dans le code et vérifiée par test : la couleur d'un sceau ne porte
jamais l'identité à elle seule, nulle part.

## 18 — Une graine par partie, inscrite dans l'adresse

Relevé en test utilisateur : « j'ai essayé de le refaire pour voir les autres
propositions, mais je tombe toujours sur le même parcours. »

La graine était codée en dur. Le tirage uniforme des personnages, le mélange des
réformes et la sélection des événements fonctionnaient tous — mais sur **une seule
combinaison**. Il n'existait qu'une partie possible, et tout le travail sur les
contraintes déclarées de tirage ne servait à rien.

Chaque partie tire désormais sa propre graine, et la graine figure dans l'adresse.
Cela donne trois choses d'un coup : rouvrir l'adresse rejoue exactement la même
partie, on peut la partager, et on peut vérifier que le tirage n'était pas arrangé —
c'est la contrepartie concrète de la transparence promise sur le tirage.

L'alphabet de la graine exclut les caractères ambigus à l'oral, 0/O et 1/l/i : elle
doit pouvoir se dicter.

Conséquence sur les tests, qui compte : les parcours de bout en bout fixent
désormais une graine. Deux passages successifs ne présentaient plus les mêmes
personnages, ce qui faisait échouer le test de la lecture muette — lui compare deux
rendus de la MÊME partie. Les tests de variété, eux, ouvrent volontairement sans
graine et vérifient que les six personnages apparaissent bien en ouverture.

## 19 — Les effets récurrents s'annoncent à l'année, et aussi au mois

Demande du porteur du projet : « au lieu de ça coûte 17 € par mois, ça lui coûte
200 € par an. C'est la même chose mais la somme étant plus grande ça a plus
d'impact. »

C'est juste : 204 € se perçoit, 17 € passe inaperçu.

Mais **choisir l'horizon est un choix de cadrage, de même nature que choisir le
dénominateur**. Annualiser multiplie tout par douze — les coûts comme les gains —
donc le traitement reste symétrique et n'avantage aucun camp, mais l'ensemble du
sujet paraît plus lourd. Or le jeu expose déjà quatre dénominateurs précisément
parce qu'aucun n'est neutre.

Les deux horizons sont donc donnés **ensemble**, l'annuel en tête comme demandé. Le
mois reste présent parce que c'est l'unité dans laquelle une contrainte budgétaire SE
VIT : un loyer se paie au mois, un reste à vivre se compte au mois.

Deux garde-fous vérifiés par test : un gain est annualisé exactement comme une perte ;
et les parts en pourcentage sont inchangées, puisqu'un rapport est invariant par
changement d'horizon — annualiser ne déforme donc aucune comparaison.

Ce qui n'est PAS annualisé : le relevé mensuel, qui est un document daté, et les
événements ponctuels. Une chaudière à 1 800 € ne coûte pas 21 600 € par an.

## 20 — Contraste et couverture : ce qu'une réforme doit faire apparaître

Une capture de l'écran « le choix vu par chacun » a montré **cinq personnages sur six
affichant « aucun effet »**. Un écran de comparaison qui ne compare rien ne produit
aucun déclic, c'est-à-dire rien du tout.

Mon test censé l'empêcher comptait les *descriptions de portée*, pas les personnages
réellement atteints : une réforme visant les seuls retraités avait bien trois
descriptions distinctes tout en ne touchant qu'une personne sur six.

Deux contrôles le remplacent, et leur répartition compte.

**La couverture, option par option.** Chaque personnage doit être atteint par un
effet, même nul. C'est la règle posée dès l'étape 7 — « un effet nul est un CONTENU,
pas une absence de contenu ». Une réforme peut légitimement ne concerner que les
indépendants ; ce qu'elle ne peut pas faire, c'est laisser les autres dans un silence
que l'interface traduit par « aucune règle ne le concerne ».

**Le contraste, au niveau de la réforme.** Une option peut légitimement ne rien coûter
à personne la première année — le statu quo, le financement par l'emprunt — et c'est
même une information importante. Le contraste se joue ENTRE les options : au moins
l'une doit toucher plusieurs personnes, et toutes ne doivent pas produire la même
répartition.

J'avais d'abord exigé que *chaque option* touche trois personnages. C'était un
mauvais contrôle : il forçait à inventer des effets là où il n'y en a pas, soit
exactement la fabrication de conséquences que le projet s'interdit.

Les neuf manquements relevés étaient réels, et leur correction a amélioré le fond :
plusieurs réformes ne modélisaient que le côté bénéficiaire et jamais le côté
financement. Nommer qui paie est pourtant l'objet même du jeu. Les contreparties
ajoutées sont ciblées — une économie publique est supposée alléger les ménages
imposables, pas tout le monde indistinctement — et chacune porte la mention que cette
répartition est elle-même une hypothèse.

## 21 — Les bases de la navigation web manquaient toutes

Relevé en jouant, pas par un test : « parfois, lorsqu'on arrive sur la page suivante,
on est tout en bas », « il faut pouvoir rapidement remonter en haut d'une page… on
dirait que l'on a oublié les bases de la navigation du web non ? »

C'était exact, et l'audit a rendu une liste d'**absences** : aucun `scrollTo`, aucun
`pushState`, aucun lien d'évitement, aucune mise à jour de `document.title`, aucune
sauvegarde. Dans une application d'une seule page, changer d'écran ne réinitialise
rien — du point de vue du navigateur, on n'a pas changé de page.

Quatre écrans de jeu sur neuf n'avaient en outre **aucun `h1`** : le mois, la
décision, le jugement, la comparaison. Leur hiérarchie de titres commençait à `h2`.
Rien ne nommait la page, et la remise à zéro du focus n'avait donc aucune cible.
« Tu es Claire. » et « Ce que tu as décidé » sont passés en `h2` : deux `h1` sur une
page valent aucun.

Le bouton Précédent reste volontairement sans effet sur les étapes du jeu. Le faire
revenir en arrière supposerait d'annuler un vote, alors que l'irréversibilité des
décisions est le mécanisme central — c'est l'engagement n° 2 du contrat. Le dommage
réel, lui, était la perte de la partie en quittant la page : il est traité par la
sauvegarde, pas par une fausse navigation.

## 22 — Une partie est conservée dans l'onglet, pas sur l'appareil

Le plan promettait une « progression conservée localement » et listait
`src/persistence/` dès l'étape 1. Rien n'avait été écrit : recharger la page perdait
tout.

Le stockage par défaut est `sessionStorage` et non `localStorage`. Ce n'est pas de la
prudence excessive. Le journal contient les jugements du joueur sur des questions
politiques et le texte libre qu'il a écrit : des opinions politiques, donc des données
sensibles au sens de l'article 9 du RGPD. Sur un poste partagé — salle de classe,
centre social, ordinateur familial — le défaut durable exposerait à la personne
suivante ce que la précédente pense de l'impôt. Qui veut reprendre plus tard l'active
explicitement, et le jeu le dit en toutes lettres sur l'écran de contrat.

**Les flux aléatoires sont replacés où ils en étaient.** `createRandom` repart sinon de
générateurs neufs, et le personnage de l'acte suivant n'est plus celui qu'une partie
ininterrompue aurait donné : « même graine, même partie » tomberait dès le premier
rechargement, en silence. `advance` avance chaque flux jusqu'à sa position
enregistrée, ce qui est exact puisque mulberry32 est à état unique.

Conséquence à assumer : rouvrir l'adresse **reprend** désormais la partie au lieu de la
rejouer. La phrase affichée sur le bilan — « la rouvrir rejoue exactement la même
partie » — serait devenue fausse. Elle est corrigée, et un bouton « rejouer cette
partie depuis le début » rend à la graine son usage : vérifier qu'un tirage n'était
pas arrangé suppose de pouvoir le rejouer.

## 23 — Payer en une fois dépend de ce qu'on a de côté

« Quand on a la possibilité de payer en une fois, est-ce que ça ne dépend pas de la
somme que l'on a de côté ? » Si. Claire réglait une réparation de 750 € avec 180 €
disponibles et 200 € de découvert autorisé.

Le schéma d'événement prévoyait pourtant un champ `availableIf` sur chaque option.
Il n'était **jamais évalué** — le même défaut que plusieurs garanties de neutralité
écrites en commentaire et non vérifiées par le test censé les tenir.

**Une option impossible n'est pas masquée, elle est barrée avec son motif chiffré.**
La faire disparaître ferait disparaître la contrainte : le joueur verrait deux choix
chez Claire et trois chez Marc et Anne sans savoir pourquoi, et en conclurait que
Claire a « moins d'options » par nature. Barrée, elle rend visible ce qui est
justement à ressentir — Marc et Anne paient sans y penser, Claire ne peut pas.

Le contrôle de build ajouté avec la règle a immédiatement trouvé une erreur de modèle,
et non de rédaction : `one_off` confondait **une somme à régler** et **un revenu qui
n'arrive pas**. Un arrêt de travail à 980 € était déclaré « hors de portée » de qui a
310 € sur son compte, et l'écran se fermait sans aucune option. Le schéma distingue
désormais `payment` de `income_loss`, et le build refuse tout décaissement positif qui
ne déclare pas lequel : un défaut silencieux est exactement ce qui a produit l'erreur.

## 24 — « Il reste 125 € » à quelqu'un à qui il en manque 125

Relevé sur une **capture d'écran**, alors que 262 tests passaient au vert.

Chez Claire, après un choix qui ajoute une dépense récurrente, 1 730 € entrent et
1 855 € sont déjà engagés : le reste à vivre vaut −125 €. L'écran affichait « Il reste,
une fois l'engagé payé : 125 € ».

Deux fautes dans une seule ligne. `formatEuros` rend la valeur absolue, et le signe
n'était ajouté que pour un flux, jamais pour un solde ; et le mot « reste »
transformait un manque en disponibilité. L'erreur jouait dans un seul sens : elle
adoucissait la situation la plus dure du corpus. C'est précisément l'affirmation
fausse que la charte interdit.

La barre de répartition additionnait par ailleurs 107 %, 4 % et 0 % et débordait de son
cadre. Les largeurs sont bornées, mais les pourcentages restent calculés sur ce qui
entre : « 107 % de ce qui entre est déjà engagé » est vrai, et c'est l'énoncé le plus
parlant de l'écran. Le masquer aurait effacé l'information avec le débordement.

Aucun test de DOM ne pouvait voir ni l'un ni l'autre : l'élément existait, son texte
était « 125 € », et personne n'écrit spontanément une assertion sur la somme des
largeurs d'une barre.

## 25 — Une porte de service pour préparer une partie

Demandée pour l'animation de séances collectives : « prévoit un lien caché pour pouvoir
sélectionner ses persos et ses réformes/décisions globales avant de commencer ».

Elle vit sur `#preparation` et **n'est liée depuis aucune page**. Ce n'est pas un
oubli : choisir soi-même ses personnages, c'est choisir ce qu'on va ressentir, soit
l'inverse du propos. Toute place laissée libre retombe sur le tirage normal.

Deux points de méthode, et non de confort.

**Une partie préparée le dit.** La page méthode affirme que le premier personnage est
tiré au hasard parmi les six. Dans une partie préparée c'est faux, et ce serait la
seule affirmation inexacte du jeu sur son propre fonctionnement. Le tirage porte donc
un drapeau `imposed`, et le registre de bas de page change d'énoncé.

**Imposer ne consomme aucun aléatoire.** Si `castChosen` tirait dans un flux, ouvrir
l'écran de préparation décalerait tout l'aléatoire en aval : à graine égale les
événements du mois ne seraient plus les mêmes, et comparer une partie préparée à une
partie tirée n'aurait plus de sens.

Dividende imprévu : la porte de service rend testables deux choses qui dépendaient
jusque-là du tirage — l'option hors de portée, qui ne se voit que chez un personnage
peu liquide, et le mois en déficit.

## 26 — Le corpus porté à treize situations et treize décisions

Demandé ainsi : « il nous faut TOUT les personnages et les plus grandes réformes qui
opposent les programmes politiques des différents partis pour la présidentielle 2027 ».

**Lecture retenue, validée avant d'écrire une ligne.** La demande désigne un *critère de
sélection des sujets* — ceux sur lesquels le débat est réellement divisé — et non une
consigne de nommer les partis et de leur attribuer des mesures. La seconde lecture est
celle que l'auteur avait lui-même écartée (« on écarte l'idée des programmes 2027 »),
et c'est la seule qui pose problème : à cinq mois du scrutin, la fenêtre de l'article
L. 52-1 du code électoral est ouverte. Aucun parti, aucun candidat, aucun programme
n'est nommé nulle part. Ce refus a un coût, et il est désormais écrit sur la page
méthode : le joueur ne peut pas savoir qui propose quoi, et doit donc juger la mesure
plutôt que son auteur. C'est une position, pas une neutralité.

**Sept situations ajoutées**, choisies sur la liste des manques que la page méthode
déclarait déjà : Nadia (temps partiel subi, trois enfants, parc social, Seine-Saint-Denis),
Lucie (invalidité reconnue, parc social), Patrick (sans emploi, onze mois de droits
restants, en déficit mensuel structurel), Malik (intérim, hébergé chez sa mère),
Hélène (cadre dont le salaire est absorbé par l'Ehpad d'un parent et les études d'un
fils), Rachid (huitième décile, locataire en première couronne, patrimoine nul),
Bérangère (dernier décile, revenus du patrimoine, caution personnelle sur le prêt de
son entreprise).

Le corpus couvre désormais les **dix déciles**, les **six situations d'activité** et les
**cinq statuts d'occupation**. Un test le vérifie, parce que le contrôle de couverture
du build ne le pouvait pas : il vérifie que chaque personnage est atteint par chaque
décision, jamais qu'une situation entière manque au corpus.

**Sept décisions ajoutées** : âge de la retraite, conditions d'accès aux minima sociaux,
durée et financement de l'assurance chômage, encadrement des loyers, imposition des
revenus du patrimoine, niveau du salaire minimum, tarification des transports urbains.
Deux d'entre elles — l'encadrement des loyers et le salaire minimum — sont les
**premières décisions du jeu qui ne cherchent aucune somme** : leur objectif budgétaire
est nul, et c'est écrit dans le contenu. Onze réformes sur treize restent cadrées en
« somme à trouver », ce que la page méthode dit maintenant en chiffres.

**Quatre postes budgétaires** ont été créés plutôt que réutilisés : pension de retraite
(distincte des prestations — une pension est la contrepartie de cotisations, une
prestation est attribuée sous conditions, et une réforme peut toucher l'une sans
l'autre), allocation chômage, revenus du patrimoine, aide à un proche. Sans eux, une
mesure sur l'assurance chômage aurait dû prélever sur la ligne « prestations », qui
porte aussi les allocations familiales : un mécanisme inventé.

**Trois attributs** ont été ouverts au vocabulaire fermé des conditions, chacun parce
qu'une mesure ne s'écrit pas sans lui : `age` (un décalage de l'âge de départ),
`housingZone` (l'encadrement des loyers, dont le zonage est le critère juridique), et
`recognisedDisability` (un minimum social versé à ce titre n'obéit pas aux mêmes règles
que celui versé à un actif).

**Deux partitions du corpus** se sont dégagées en écrivant ces effets nuls, et elles
valent d'être notées plutôt que redécouvertes. *Par statut* — salariés, indépendants sans
activité salariée, retraités, demandeurs d'emploi, personnes sans activité — pour toute
mesure assise sur un revenu : cinq groupes disjoints qui couvrent les treize, chacun
associé au poste de ressource que ses membres possèdent réellement. *Par éligibilité* —
deux premiers déciles, troisième décile, demandeurs d'emploi, retraités, salariés et
indépendants au-dessus du quatrième — pour toute mesure sous conditions de ressources.
Le dernier point est celui qui coûte : un effet nul posé sur un poste que le personnage
n'a pas est déclaré et invisible, soit le pire des deux mondes. Le script qui a servi à
produire ces portées n'est pas versionné — rien ne le vérifierait, et un générateur en
désaccord avec le schéma serait un piège ; le contrôle de couverture du build, lui, est
exécuté à chaque compilation.

Le contrôle de couverture a trouvé sept silences à l'ajout des nouveaux personnages :
une contribution assise sur la propriété ne disait rien de la personne hébergée, une
cotisation « universelle » assise sur l'activité ne disait rien de qui n'en a pas. Les
sept sont désormais des effets nuls explicites, chacun avec son motif.

## 27 — « Concerné de façon perceptible » ne sélectionnait plus personne

Le registre affiche au joueur : « le tirage privilégie un personnage qu'une règle déjà
décidée concerne de façon perceptible ». Le moteur l'implémentait par « au moins un
effet le vise ».

Or le contrôle de couverture oblige chaque option à atteindre tout le corpus, effet nul
compris : **cinquante-deux options sur soixante-cinq** atteignent les treize personnages.
La contrainte était donc vraie de chacun — donc ne filtrait rien — tout en restant
affichée comme si elle agissait. Une règle que le moteur n'applique pas n'a pas le droit
d'être publiée.

« Perceptible » veut dire : son budget mensuel change, maintenant. L'énoncé public a été
précisé dans les mêmes termes.

## 28 — Un effet à cinq ans n'est pas un effet d'aujourd'hui

Trouvé par un test écrit pour autre chose.

La contribution énergie coûte 14 € par mois dès le premier mois aux ménages en chauffage
collectif, et leur rend 31 € « après rénovation effective » — effet déclaré à l'horizon
`y5`, avec sa note, depuis l'étape 7. Le moteur ne lisait `horizon` nulle part en dehors
de la projection à dix ans : le relevé mensuel, le rappel et l'écran de comparaison
additionnaient tout au présent. Claire voyait donc **un gain de 17 € par mois** pour une
mesure qui lui coûte 14 € maintenant et ne lui rendra rien avant cinq ans.

L'erreur jouait dans un seul sens : elle faisait passer un prélèvement pour un gain,
auprès des ménages à qui il coûte d'abord.

`inForceNow` filtre désormais sur l'année de début, à chaque endroit qui parle du
présent. L'écran de comparaison garde les effets différés — ils sont l'effet de la
décision, les cacher serait l'erreur inverse — mais sur une ligne séparée et datée.

Le corpus d'origine portait l'horizon `y1` presque partout, ce qui rendait la confusion
invisible. Les sept réformes ajoutées utilisent `y5` et `y10` pour des mesures dont
c'est la nature même — un plafonnement de loyer n'agit qu'à la relocation, un décalage
de l'âge de départ pas avant une décennie —, et le défaut est devenu visible.

## 29 — « Aucun effet » sans dire pourquoi

Relevé sur une capture d'écran : avec treize situations, l'écran « le choix vu par
chacun » affichait neuf fois la phrase « aucun effet sur son budget courant » et rien
d'autre. Une comparaison faite de neuf phrases identiques ne compare rien.

Ce n'était pas une erreur de calcul : les effets nuls sont la réponse exacte pour une
mesure qui ne concerne qu'une partie du corpus. C'était une perte de contenu. Le
contrôle de couverture oblige l'auteur à écrire, pour chaque personne qu'une option ne
touche pas, quelle portée l'exclut ; l'écran jetait ce travail. La portée déclarée est
maintenant reprise telle quelle — « locataires du parc social », « personnes hébergées »,
« propriétaires occupants » —, et l'écran redevient une carte de qui est dedans et qui
est dehors.

## 30 — Un montant unique pour tout le monde n'est pas neutre

« 34 € de plus par mois, ce n'est pas trop peu ? »

Ce n'était pas trop peu : c'était le même chiffre pour tout le monde. La révision de loyer
valait 10 % du loyer de Lucie et 2 % de celui de Rachid, alors que la loi la plafonne en
pourcentage. Et l'erreur pesait d'abord sur les loyers modestes. L'audit qui a suivi a
trouvé la même faute dans presque toutes les décisions collectives : une cotisation
retraite de 42 € qui coûtait 11 % de son salaire à Yanis et 0,8 % à Rachid, une hausse du
salaire minimum de 110 € versée à un temps partiel de 390 €.

Un montant peut désormais être une **part d'une ligne du relevé** : `share` pour les
événements, `monthlyShare` pour les décisions. Le montant fixe reste comme valeur de
repère pour les contrôles de corpus.

**Les lignes sont celles du foyer.** Une cotisation « sur les salaires » vise désormais
tout foyer qui perçoit un salaire, et non le seul personnage salarié. Avant, le conjoint
salarié de Thomas échappait aux cotisations et Bérangère, sans salaire, se voyait créer un
salaire négatif. Le salaire du conjoint de Sophie était codé en revenu indépendant : il
est rangé avec les salaires.

**Le moteur fabriquait de l'argent.** Un effet sur un poste absent créait ce poste, rangé
d'après le signe du montant : une baisse d'impôt chez qui n'en paie pas devenait une
recette, et la gratuité des transports rendait 85 € à Yanis, qui en dépense 35. Chaque
effet est maintenant ramené dans les bornes du relevé : une baisse de dépense ne dépasse
pas la dépense, une perte de recette ne dépasse pas la recette.

**`availableIf` n'était lu nulle part.** On proposait à tout le monde d'accélérer le
remboursement d'un crédit, y compris à qui n'en a pas.

Ont été corrigés au passage :
- une chaudière à remplacer facturée à des locataires ;
- un arrêt maladie proposé aux retraités ;
- une voiture supposée à tout le monde ;
- la pénibilité appliquée à vingt ans ;
- un maintien du remboursement des soins compté comme un gain ;
- « trois derniers déciles » codés sur quatre ;
- une option d'héritage qui gardait l'argent et supprimait la mensualité.

Le contexte de deux décisions a été corrigé :
- les loyers ne sont pas « fixés librement à la relocation » en zone tendue ;
- les loyers perçus ne relèvent pas du prélèvement forfaitaire.
