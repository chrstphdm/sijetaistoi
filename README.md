# Si j'étais toi

Un jeu de rôle sur les choix politiques et fiscaux. Le joueur incarne successivement plusieurs
personnages aux situations très différentes, vote des règles, puis **vit les conséquences des règles
qu'il a lui-même votées** en incarnant quelqu'un d'autre.

Le jeu ne cherche pas à convaincre. Il n'y a pas de bonne réponse cachée, pas de score, pas de
conclusion. Son seul critère de réussite est qu'à la fin d'une partie, le joueur puisse se dire :

> « Je n'avais pas réalisé que cette décision que je trouvais évidente pouvait être vécue comme ça
> par quelqu'un d'autre. »

## État

Étape 1 sur 15. Le moteur pur, la grammaire d'animation et un écran de démonstration fonctionnent.
Voir [PLAN.md](PLAN.md) pour la conception complète et la feuille de route.

## Démarrer

```bash
npm install
npm run dev        # serveur de développement
npm test           # 24 tests
npm run build      # vérification de types + build de production
```

Node 22.12+ requis.

## Architecture

Trois domaines strictement séparés — c'est l'invariant central du projet :

```
content/        le CONTENU NARRATIF      (JSON validé par schéma, aucune logique)
src/fiscal/     le MODÈLE SOCIO-FISCAL   (interchangeable : MVP aujourd'hui, OpenFisca demain)
src/core/       le MOTEUR DE JEU         (TypeScript pur : ni Date, ni Math.random, ni window)
src/motion/     la GRAMMAIRE D'ANIMATION (spec publique versionnée)
```

## Neutralité

La neutralité politique ne repose pas sur la bonne volonté de l'auteur, mais sur des mécanismes
vérifiables. Deux exemples déjà en place :

**La mise en scène est aveugle au signe et à l'identité.** La fonction qui décide de l'intensité
d'une animation ne reçoit ni l'identité du personnage, ni la mesure concernée, ni l'opinion du
joueur — on ne peut pas biaiser avec ce qu'on ne reçoit pas. Le signe est détruit par un `Math.abs`
en un point unique, ce qui fait de la symétrie gain/perte un théorème plutôt qu'une intention. Les
tests vérifient que ce point n'a pas été contourné.

**Aucune échelle de comparaison n'est neutre, et le jeu le dit.** Rapporter un choc au reste à vivre
présuppose une conception fondée sur le besoin ; au revenu, une conception proportionnelle ; aux
euros absolus, une conception nominale. Plutôt que de trancher en silence, le jeu expose les quatre
échelles et montre que le classement des personnages les plus touchés change selon celle qu'on
choisit.

## Données

Les personnages et les montants du MVP sont **fictifs**, construits pour être plausibles au regard
des ordres de grandeur publics. Chaque valeur numérique porte sa nature — fait sourcé, hypothèse du
modèle, extrapolation ou fiction — et cette provenance est vérifiée au build.

## Licence

AGPL-3.0-or-later.
