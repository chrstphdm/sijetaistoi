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
