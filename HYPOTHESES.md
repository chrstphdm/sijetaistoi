# Hypothèses du modèle

Les hypothèses vivent dans [`content/hypotheses.json`](content/hypotheses.json), pas
ici : ce document explique **pourquoi** elles existent et comment les lire. La liste à
jour est affichée dans le jeu, sur la page « Comment ce jeu est construit ».

## La règle

Une hypothèse du modèle porte **au moins deux lectures**, chacune nommée par un
mécanisme et non par un camp. Le schéma refuse une hypothèse à lecture unique : elle
trancherait en silence un débat ouvert, ce qui est exactement ce que ce projet
s'interdit.

Un effet de réforme dont l'incertitude n'est pas « établie » doit désigner
l'hypothèse dont il dépend. Le joueur voit donc, à côté de chaque chiffre contesté,
la mention de son degré d'incertitude.

## Trois statuts

| Statut | Signification |
|---|---|
| `consensual` | Les travaux disponibles convergent. |
| `debated` | Les travaux divergent sur l'ampleur. |
| `highly_debated` | Les travaux divergent sur l'ampleur **et** sur le mécanisme, ou le désaccord est méthodologique. |

## Ce que le modèle ignore volontairement

Le modèle du MVP calcule un effet de **première année** sur le budget mensuel d'un
ménage. Il ignore :

- les changements de comportement provoqués par la mesure ;
- les effets de second tour et l'équilibre général ;
- l'incidence fiscale réelle, c'est-à-dire qui supporte finalement un prélèvement —
  question ouverte en économie, que le jeu ne tranche pas ;
- les effets à long terme, sauf quand un effet porte explicitement un horizon
  différent ;
- la valeur des services publics reçus en contrepartie, sauf mention explicite.

Chaque réforme déclare ses propres limites dans un champ `modelLimitations`, affiché
au joueur.

## Remplacement prévu

Le calcul socio-fiscal passe par l'interface `FiscalEngine`
([`src/fiscal/contract.ts`](src/fiscal/contract.ts)), qui accepte un **lot** de
situations dès maintenant. Trois implémentations sont prévues :

1. `MvpFiscalEngine` — barème réel simplifié, aujourd'hui ;
2. `PrecomputedFiscalEngine` — lit des calculs OpenFisca faits hors ligne ;
3. `OpenFiscaHttpEngine` — appel direct, seulement si un serveur existe un jour.

La structure `situation` des personnages est déjà écrite au format attendu par
OpenFisca (individus, famille, foyer fiscal, ménage), pour que ce remplacement ne
demande pas de réécrire le contenu.
