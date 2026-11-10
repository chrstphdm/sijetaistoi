# Synthèse des séances

À remplir une fois toutes les séances faites, à partir des grilles et des entretiens.
Ce document ne contient **aucune opinion individuelle identifiable** et ne se publie pas
comme un résultat sur ce que « pensent les joueurs » (charte, G1). Il porte sur le jeu.

---

## 1. Coder chaque séance

### Le déclic — le seul critère de réussite du projet

Pour chaque joueur, attribuer **un** niveau, à partir de la question 1 de l'entretien
(prioritaire) et de la grille :

| Niveau | Il faut… |
|---|---|
| **Déclic attesté** | Le joueur cite, **avec ses mots et sans relance suggestive**, une décision précise **et** une personne précise **et** ce qu'il n'avait pas vu. La décision lui paraissait claire au départ (réponse « oui » ou « non », pas « je ne sais pas »), ou il le dit. |
| **Déclic partiel** | Il manque un des éléments : il dit oui sans pouvoir nommer de moment ; ou il nomme un moment, mais ce qu'il découvre est une **information** (« je ne savais pas que ça coûtait autant ») plutôt qu'une **expérience vécue par quelqu'un d'autre** ; ou la décision était déjà incertaine pour lui. |
| **Pas de déclic** | Il répond non, ou ne cite rien qui ressemble au critère. |
| **Contre-effet** | Lecture SPENT dominante (les difficultés viennent des choix individuels ; voir grille §7 et entretien Q4), **ou** rejet du jeu comme partisan qui a empêché toute lecture. |

La réponse donnée **dans le jeu** à la dernière question se note à côté, mais ne suffit
pas : un « oui » sans moment cité reste un déclic partiel au mieux. Une divergence entre
la réponse dans le jeu et l'entretien est elle-même un résultat (la question du jeu
suggère-t-elle sa réponse ?).

### Tableau comparatif

| | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| Graine / partie préparée | | | | | |
| Durée de la partie | | | | | |
| Réponse dans le jeu (dernière question) | | | | | |
| **Niveau de déclic** | | | | | |
| Décision et personnage cités (Q1) | | | | | |
| Rappel de l'acte II vu et lu | | | | | |
| Relance apparue / réponse changée | | | | | |
| A écrit une phrase avant de décider | | | | | |
| Relevé regardé avant de choisir (mois sur 8) | | | | | |
| « Voir le détail » ouvert (options sur total) | | | | | |
| Échelle changée | | | | | |
| Autres personnages consultés | | | | | |
| Page méthode ouverte | | | | | |
| Signes SPENT (nombre, exemple) | | | | | |
| Lecture Q4 (choix / situation / règles) | | | | | |
| Penchant perçu : sens et déclencheur | | | | | |
| Q7 reste à vivre : juste / partiel / faux | | | | | |
| Q8 échelles : juste / partiel / faux | | | | | |
| Q9 fiction / réel : juste / partiel / faux | | | | | |
| Changement souhaité (Q10) | | | | | |
| Incidents, aides données | | | | | |

---

## 2. Décider

### Pour le critère du déclic

| Verdict | Condition (sur 3 à 5 joueurs) |
|---|---|
| **Succès** | Au moins deux tiers de déclics attestés (2 sur 3, 3 sur 4 ou 5), **aucun** contre-effet, et des déclics chez des joueurs de sensibilités différentes. |
| **Succès partiel** | Au moins un déclic attesté, et le reste en déclic partiel ; aucun contre-effet. |
| **Échec** | Aucun déclic attesté, **ou** un seul contre-effet SPENT, **ou** plusieurs joueurs qui rejettent le jeu comme partisan. |

Un seul contre-effet SPENT suffit à conclure à l'échec : c'est le mode de défaillance
connu et mesuré du précédent, et le projet l'a déclaré non négociable.

Avec si peu de joueurs, ce verdict dit **où regarder**, pas si le jeu « marche » au sens
statistique. Un succès justifie une deuxième série avec d'autres personnes ; un échec
justifie de corriger avant d'en faire une autre.

### Pour le penchant perçu

| Constat | Lecture |
|---|---|
| Personne ne perçoit de penchant | Bon signe, sans plus : on ne voit pas toujours ce qui va dans son sens. |
| Des joueurs de sensibilités différentes perçoivent des penchants **opposés** | Plutôt sain : chacun voit le côté qui le contrarie. Examiner quand même chaque déclencheur cité. |
| Des joueurs de sensibilités différentes perçoivent le **même** penchant | Signal fort d'un biais réel. Prioritaire. |
| Un seul joueur perçoit un penchant, sur un déclencheur précis | Vérifier le contenu cité contre la charte ; ne pas conclure sur un seul avis. |

---

## 3. Quel constat entraîne quel type de changement

**Seuil** : un constat partagé par au moins deux joueurs entraîne une action. Un constat
isolé se note et se surveille à la série suivante — sauf un signe SPENT ou un biais
perçu dans le même sens par des sensibilités différentes, qui s'examinent dès la première
occurrence.

| Constat | Type | Où regarder |
|---|---|---|
| Un argument jugé caricatural, un personnage cliché, un mot jugé chargé | **Contenu** | `content/reforms/`, `content/characters/`, `content/lexicon.json` ; charte B7, C7, C8, D |
| Un chiffre contesté ou incompris | **Contenu** | provenance de la valeur, `content/sources.json`, `content/hypotheses.json` ; charte A |
| Penchant perçu dans le même sens par plusieurs sensibilités | **Contenu**, puis cadrage | options et arguments de la décision citée ; charte B ; page méthode, « ce que ce jeu ne parvient pas à éviter » |
| Signes SPENT : optimisation des mois, « il n'a qu'à », envie de rejouer pour mieux faire | **Mécanique** | événements et options des mois, disponibilité des options, part non choisie du relevé ; `PLAN.md`, « Le risque principal » |
| Rappels vécus comme une punition | **Mécanique** | sélection des rappels, quota de signe (`src/core/callback.ts`) |
| Relance absente de la partie, ou déclic qui n'arrive jamais à la seconde question | **Mécanique** | conditions d'apparition du rappel et de la relance |
| Pas de déclic alors que les écrans clés ont été vus et compris | **Mécanique**, puis contenu | juxtaposition phrase du joueur / situation vécue : le joueur a-t-il écrit une phrase ? lui a-t-elle été rendue ? |
| Rappel pas vu, bouton ou panneau pas trouvé, écran d'impact jamais déplié | **Interface** | place et ordre des blocs à l'écran |
| « Reste à vivre » ou échelles mal compris | **Interface**, puis contenu | libellés, phrase d'explication sur l'écran d'impact |
| Fiction et réel confondus | **Interface**, puis contenu | contrat, avertissements, mention de la nature des chiffres |
| Partie trop longue (plus de 28 min) ou abandon | **Mécanique** ou **interface** selon l'endroit | grille §8 et temps par écran |
| Malaise fort, jeu jugé plombant | **Contenu** | équilibre des événements favorables ; charte F1, F2 |

Pour chaque action retenue, noter ci-dessous ce qui sera changé et comment on vérifiera
à la série suivante que le changement a eu l'effet voulu.

---

## 4. Décisions prises

| Constat | Joueurs | Type | Changement décidé | Comment on le vérifiera |
|---|---|---|---|---|
| | | | | |
| | | | | |

## 5. Ce qu'on n'a pas pu conclure

| |
|---|
| |

## 6. Prochaine série

- Date visée :
- Nombre de joueurs :
- Ce qu'on teste en priorité :
- Même graine que cette série ? (oui pour mesurer l'effet d'un changement, non pour élargir)
