# Note de méthode

> Le texte affiché au joueur vit dans [`content/method.json`](content/method.json) et
> s'affiche dans le jeu sous « Comment ce jeu est construit ». Les chiffres de cette
> page sont lus dans le code au moment de l'affichage : ils ne peuvent pas diverger de
> ce que le programme fait.
>
> Ce document-ci s'adresse à qui veut auditer le dispositif.

## Le principe

Ce jeu prétend ne pas chercher à convaincre. Une telle prétention ne vaut rien si elle
n'est pas vérifiable.

La neutralité n'est donc pas une intention affichée : c'est un ensemble de règles qui
bloquent la mise en ligne quand elles sont enfreintes, plus la publication de ce
qu'elles n'arrivent pas à couvrir. Le second point compte autant que le premier.

## Ce que le dispositif contrôle automatiquement

| Vecteur de biais | Mécanisme | Où |
|---|---|---|
| Chiffres sans provenance | couche `Value`, composant `Amount` unique | `src/schemas/primitives.ts` |
| Erreur d'ordre de grandeur | bornes par unité | `src/schemas/primitives.ts` |
| Hypothèse présentée comme un fait | deux lectures minimum | `src/schemas/referentials.ts` |
| Option à sens unique | symétrie bilatérale | `src/schemas/reform.ts` |
| Cadrage à somme nulle | statu quo et contestation obligatoires | `src/schemas/reform.ts` |
| Personnage unidimensionnel | force, vulnérabilité, opinion à contre-intérêt | `src/schemas/character.ts` |
| Mots chargés | lexique contrôlé, 50 entrées | `content/lexicon.json` |
| Parité narrative | écart maximal de 50 % | `src/quality/parity.ts` |
| Corpus misérabiliste | 20 % d'événements favorables minimum | `src/quality/parity.ts` |
| Rappels à charge | plafond de moitié | `src/core/callback.ts` |
| Casting orienté | tirage uniforme sous contraintes publiées | `src/core/casting.ts` |
| Mise en scène partiale | fonction aveugle au signe et à l'identité | `src/motion/intensity.ts` |
| Parité visuelle | sceau à encre constante, accents isoluminants | `src/ui/components/Seal.tsx` |
| Dépendance à la couleur | trois canaux redondants | vérifié par axe-core |

## Ce que le dispositif ne couvre pas

Listé dans `content/method.json`, section « Ce que ce jeu ne parvient pas à éviter », et
affiché au joueur. En résumé : le cadrage des questions, le choix des sujets, le choix
du dénominateur par défaut, la composition du corpus, la simplicité du modèle, et la
voix de l'écriture.

Aucun de ces six points n'est résolu. Ils sont déclarés.

## Comment vérifier

```bash
npm run build:content    # schémas, provenance, intégrité référentielle
npm run lint:content     # lexique, parité narrative, équilibre de valence
npm run check:contrast   # 30 paires de couleurs, parité des accents
npm test                 # moteur, motion, contenu, interface
npm run test:e2e         # axe-core, clavier, 400 px, lecture muette
```

Chacune de ces commandes échoue si une règle est enfreinte. Elles ont toutes été
vérifiées sur du contenu volontairement fautif.

## Limites de cette note

Elle a été écrite par la même personne que le dispositif qu'elle décrit. Une relecture
contradictoire par des personnes de sensibilités différentes reste à organiser : c'est
le principal manque du dispositif de neutralité à ce jour.
