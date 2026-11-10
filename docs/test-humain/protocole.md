# Test humain — protocole

Ce kit sert à mener la vérification que `PLAN.md` (section « Vérification ») appelle
« la seule qui compte vraiment » : des personnes de sensibilités différentes jouent une
partie complète, puis on cherche si elles peuvent dire, avec leurs propres mots :

> « Je n'avais pas réalisé que cette décision que je trouvais évidente pouvait être vécue
> comme ça par quelqu'un d'autre. »

Cette phrase est le **critère**, pas une consigne. Elle n'est jamais lue, montrée ni
suggérée au joueur. Si c'est l'animateur qui la prononce, la séance ne mesure plus rien.

Quatre documents :

| Fichier | Quand | Qui |
|---|---|---|
| `protocole.md` (ce fichier) | avant et pendant la séance | l'animateur |
| `grille-observation.md` | pendant la partie | l'animateur (ou un second observateur) |
| `entretien.md` | après la partie, 10 min | l'animateur |
| `synthese.md` | une fois toutes les séances faites | l'équipe |

Le risque à garder en tête pendant toute la séance est celui de **SPENT** (`PLAN.md`,
« Le risque principal ») : un jeu de budget contraint qui a fait croire à ses joueurs
qu'on s'en sort en faisant de meilleurs choix. On observe donc deux choses à la fois :
le déclic, et la lecture « il suffisait de bien gérer ».

---

## 1. Qui recruter

**Trois à cinq personnes.** Trois est le minimum du plan ; cinq permet de distinguer un
problème réel d'une réaction individuelle.

### Diversifier les sensibilités sans ficher personne

On ne demande **jamais** à quelqu'un pour qui il vote, à quel parti il se sent proche, ni
de se placer sur un axe gauche-droite. Ce serait collecter une opinion politique (donnée
sensible au sens de l'article 9 du RGPD) pour un besoin qu'on peut couvrir autrement, et
cela installerait d'emblée le joueur dans un rôle de « représentant de son camp ».

À la place :

1. **Recruter par désaccord croisé.** Pour chaque nouvelle personne, chercher quelqu'un
   dont vous savez déjà, par la vie courante, qu'il ne serait **pas d'accord** avec les
   personnes déjà retenues sur au moins un des sujets du jeu (retraites, impôts, loyers,
   chômage, salaire minimum, transports, études…). Ce que vous savez reste dans votre
   tête : rien n'est noté.
2. **Passer par des réseaux différents.** Pas trois collègues, pas trois amis du même
   cercle. Famille, voisinage, association, ancien collègue, club sportif…
3. **Varier des critères de situation, pas d'opinion.** Viser de l'écart sur au moins
   trois de ces critères :
   - âge (moins de 30 ans / 30-60 / plus de 60) ;
   - situation : salarié, indépendant, étudiant, retraité, sans emploi ;
   - logement : locataire, propriétaire, hébergé ;
   - territoire : grande ville, ville moyenne, rural ;
   - aisance avec les chiffres et les écrans.

   Ces critères servent à **choisir** les personnes. On ne les inscrit nulle part.

### Qui éviter

- Les personnes qui ont participé au projet, l'ont relu, ou en ont entendu parler en
  détail : elles connaissent l'intention.
- Les personnes qui vous doivent quelque chose (subordonné, élève) : elles chercheront à
  vous faire plaisir.
- Les personnes en situation financière difficile **en ce moment**, sauf si elles se
  proposent elles-mêmes en connaissant le sujet : le jeu met en scène des fins de mois
  contraintes.

### Qui anime

Idéalement **pas l'auteur du jeu**. Si c'est l'auteur, il le dit au joueur au début (« j'ai
fait ce jeu, ce qui ne marche pas m'intéresse plus que ce qui marche ») et redouble de
vigilance sur la section 4. Un second observateur silencieux est utile mais pas
obligatoire.

---

## 2. Consentement et données

### Ce qu'on dit avant de commencer (à lire tel quel ou presque)

> « Je teste un jeu sur des décisions collectives — des règles qui s'appliquent à tout le
> monde. Ce n'est pas toi qu'on évalue, c'est le jeu. Il n'y a pas de bonne réponse.
>
> Le jeu va te demander ton avis sur des sujets politiques. Ce que tu réponds dans le jeu
> reste dans ce navigateur : le jeu n'envoie rien, à personne, et tout disparaît quand on
> ferme la fenêtre à la fin.
>
> Moi, je vais prendre des notes sur ce que tu fais et ce que tu dis, sans ton nom. Je
> ne note pas tes opinions, sauf si tu es d'accord pour que je note quelle décision tu as
> prise, pour comprendre ce qui s'est passé.
>
> Tu peux t'arrêter quand tu veux, sans te justifier, et me demander de jeter mes notes.
> D'accord ? »

Recueillir trois accords oraux, et les cocher en tête de la grille :

- [ ] participer et être observé ;
- [ ] que l'animateur note **quelles décisions** ont été prises et les réponses
      « bien et juste » (facultatif — sans cet accord, on note seulement les
      comportements et les citations) ;
- [ ] enregistrement audio (facultatif, déconseillé : les notes suffisent).

### Ce qui est conservé, et combien de temps

| Donnée | Où | Durée |
|---|---|---|
| Réponses dans le jeu | navigateur du poste, `sessionStorage` | effacées à la fermeture de la fenêtre, à la fin de la séance, devant le joueur |
| Grille et notes d'entretien | papier ou fichier de l'animateur, sous un code (`P1`, `P2`…) | jusqu'à la synthèse, puis 30 jours au plus |
| Correspondance code ↔ prénom | nulle part | ne pas l'écrire |
| Audio (si accepté) | appareil de l'animateur | supprimé dès les citations recopiées |
| Synthèse | `synthese.md` | durable, **sans** opinion individuelle identifiable |

On n'écrit dans les notes ni nom, ni employeur, ni détail qui permettrait de reconnaître
la personne. On ne publie aucun résultat agrégé sur les opinions des joueurs (charte, G1).

*Ces indications sont des précautions raisonnables, pas un avis juridique.*

---

## 3. Préparer la séance

À faire **la veille**, pas devant le joueur.

1. **Choisir une graine commune.** Ouvrir
   `https://chrstphdm.github.io/sijetaistoi/?graine=XXXX` (4 caractères au moins, lettres
   et chiffres). Une même graine donne à tous le même premier personnage et les mêmes
   décisions collectives dans le même ordre ; la suite peut différer selon les votes.
   C'est ce qui rend les séances comparables.
2. **Jouer la partie soi-même en entier avec cette graine**, et vérifier qu'au début de
   l'acte II apparaît bien un **rappel** (« Cet écart vient de la décision prise en…,
   quand tu incarnais quelqu'un d'autre ») suivi de l'écran « La même question,
   maintenant ». Ce n'est pas garanti : sans rappel, il n'y a pas de seconde question, et
   la séance perd son moment central. Si le rappel ne vient pas, essayer une autre graine.
3. **Ne pas imposer les personnages**, sauf nécessité. L'écran de préparation
   (`https://chrstphdm.github.io/sijetaistoi/#preparation`, lié depuis aucune page) permet
   d'imposer personnages et décisions, mais le jeu affiche alors « partie préparée à la
   main » en bas de page, et choisir les personnages revient à choisir ce que le joueur
   va ressentir. À réserver au cas où une graine ne suffit pas (par exemple pour imposer
   les mêmes trois décisions à tous).
4. **Le poste.** Un ordinateur portable ou une tablette, pas le téléphone du joueur (on
   doit voir l'écran). Une **fenêtre de navigation privée neuve** par joueur : une partie
   reprise ou une sauvegarde d'un joueur précédent fausserait tout. Son coupé, rien
   d'autre ouvert.
5. **Imprimer** la grille et l'entretien, un exemplaire par joueur. Un chronomètre.
6. Noter sur la grille : code joueur, date, graine, appareil.

Prévoir un créneau de **45 minutes** pour une séance qui en dure 35.

---

## 4. Déroulé minute par minute (~35 min)

| Temps | Étape | Ce que fait l'animateur |
|---|---|---|
| 0:00 – 0:03 | Accueil, consentement | Lire le texte de la section 2. Cocher les accords. |
| 0:03 – 0:05 | Consignes | Lire les consignes ci-dessous. Faire l'échauffement. |
| 0:05 – 0:27 | La partie | Se taire, observer, remplir la grille. Relancer la parole si silence de plus de 30 s. |
| 0:27 – 0:37 | Entretien | Suivre `entretien.md`, dans l'ordre. |
| 0:37 – 0:40 | Clôture | Fermer la fenêtre privée devant le joueur. Remercier. Répondre à ses questions **maintenant seulement**. |

La partie dure environ 20 minutes (8 mois vécus, 3 décisions collectives). Si elle
dépasse 30 minutes, ne pas presser : raccourcir l'entretien en gardant les questions 1, 2,
5 et 6.

### Consignes (à lire)

> « Joue comme tu jouerais seul chez toi. Va à ton rythme, ouvre ce que tu as envie
> d'ouvrir, saute ce que tu as envie de sauter.
>
> Je te demande une seule chose : **pense à voix haute**. Dis ce que tu regardes, ce que
> tu cherches, ce qui t'étonne, ce qui t'agace. Même les petites choses. Si tu te tais, je
> te dirai juste "qu'est-ce que tu regardes ?".
>
> Je ne vais pas t'aider, pas parce que c'est un piège, mais parce que je veux voir ce que
> le jeu fait tout seul. Si tu es bloqué, dis-le. »

**Échauffement (30 s)** : sur l'écran d'accueil, avant de cliquer, demander « Dis-moi ce
que tu vois sur cette page. » Cela installe la parole sans toucher au contenu.

### Pendant la partie, l'animateur peut dire

- « Qu'est-ce que tu regardes ? »
- « Continue à me dire ce que tu penses. »
- « Qu'est-ce que tu t'attendais à trouver ? »
- « Qu'est-ce que tu ferais si je n'étais pas là ? »
- « Mm. » / « D'accord. » — sur le même ton quelle que soit la remarque.

### L'animateur ne dit jamais

- **Rien sur le but du jeu** : ni « déclic », ni « se mettre à la place », ni « voir les
  choses autrement », ni la phrase-critère.
- **Rien qui évalue un choix** : ni « bon choix », ni « intéressant », ni « ah ! », ni
  silence appuyé après une réponse.
- **Rien qui oriente l'attention** : ne pas montrer du doigt un bouton, le relevé, le
  rappel, le sélecteur d'échelle ou la page méthode. Si le joueur ne les voit pas, c'est
  une observation, pas un incident.
- **Aucune explication de concept** pendant la partie (« reste à vivre », échelles,
  « hypothèse »). Noter l'incompréhension ; on l'explique **après** l'entretien.
- **Aucune lecture « correcte »** d'un écran ou d'un chiffre.
- **Aucune opinion** sur les sujets du jeu, même si le joueur la demande : « Je te
  répondrai à la fin, là je ne veux pas t'influencer. »
- **Aucune défense du jeu.** Si le joueur dit que c'est orienté, faux ou caricatural :
  « Merci, c'est exactement ce que je cherche à savoir. Qu'est-ce qui te fait dire ça ? »
  Puis noter mot pour mot.

### Si le joueur est bloqué

1. Attendre 20 secondes. Le blocage est une donnée.
2. « Qu'est-ce que tu cherches à faire ? »
3. Si le blocage dure plus de 2 minutes **et porte sur l'interface** (il ne trouve pas
   comment avancer), donner l'aide minimale : « Le bouton pour continuer est plus bas. »
   Jamais d'aide sur le contenu.
4. Noter l'incident dans la grille (« aide donnée », écran, durée).

### Si le joueur est mal à l'aise ou contrarié

Le jeu montre des fins de mois difficiles, des renoncements (soins, lunettes, chauffage)
et des décisions qui coûtent à certains. Quelqu'un peut s'y reconnaître.

- Proposer une pause, sans insister : « On peut s'arrêter un moment, ou tout arrêter. »
- Ne pas faire parler la personne de sa propre situation, ne pas consoler longuement, ne
  pas minimiser (« ce n'est qu'un jeu »).
- S'il veut arrêter : arrêter, fermer la fenêtre, proposer de jeter les notes. Une séance
  interrompue garde de la valeur : noter jusqu'où il est allé et pourquoi il a arrêté.
- S'il s'énerve contre le contenu politique : ne pas débattre. Écouter, noter, remercier.
  Une colère est une donnée sur le cadrage perçu, à reporter dans la grille.

### La dernière question du jeu

À la fin, l'écran « Bilan » pose sa propre question (« Pendant cette partie, une décision
t'a-t-elle paru différente selon la personne que tu incarnais, ou est-elle restée la même à
tes yeux ? ») avec quatre réponses, puis une question ouverte facultative. Laisser le joueur y répondre seul,
sans commentaire, et noter sa réponse dans la grille. L'entretien vient **après**.

### Clôture

- Fermer la fenêtre privée devant le joueur : ses réponses disparaissent.
- Seulement alors : répondre à ses questions sur le jeu, expliquer ce qu'il n'a pas
  compris, donner son avis si on le souhaite.
- Relire ses notes dans l'heure qui suit, compléter les citations tant qu'elles sont
  fraîches.
