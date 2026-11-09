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
