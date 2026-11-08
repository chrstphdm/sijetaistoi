# Si j'étais toi — plan de développement

## Contexte

Projet greenfield. Node 25.5.0, npm 11.8.0.

L'objectif n'est pas politique mais **épistémique** : produire chez le joueur une phrase, une seule, à la
fin d'une partie —

> « Je n'avais pas réalisé que cette décision que je trouvais évidente pouvait être vécue comme ça par
> quelqu'un d'autre. »

Tout le reste — moteur, données, fiscalité, interface — n'existe que pour servir ce déclic. Le déclic ne
naît pas d'un simulateur. Il naît de la **juxtaposition entre une phrase que le joueur a écrite lui-même
et une situation qu'il vit ensuite**. Tout ce qui ne sert pas cette juxtaposition est un coût.

### Le risque principal n'est pas technique

**SPENT** (Urban Ministries of Durham, 2011) fait exactement ce que fait l'acte I de ce jeu : vivre un mois
de budget contraint dans la peau d'un parent seul. Une étude randomisée (*Cyberpsychology*, 193 sujets,
SPENT contre jeu témoin) trouve : aucun effet sur l'attribution structurelle de la pauvreté ; un soutien
accru aux politiques favorables aux plus pauvres, médié par l'empathie ; **mais moins de signatures de
pétition sur le salaire minimum que le groupe témoin**. Colleen Macklin (Parsons) en donne la cause : les
mécaniques communiquent un message, et celles de SPENT suggèrent que la situation se modifie en faisant de
meilleurs choix — alors que dans la réalité les gens n'ont souvent pas le choix.

Conséquences, non négociables :

- jamais de score, de barre de réussite, de *streak*, de « tu as bouclé ton mois », de game over budgétaire,
  ni d'effet de récompense ;
- l'écran de fin de mois est un **relevé**, pas un bilan de performance ;
- la part **non choisie** du résultat (dépenses contraintes) a le même poids typographique que le solde ;
- chaque personnage porte des `unavailableOptions` motivées : l'absence de choix est une donnée du modèle,
  pas un oubli.

---

## Décisions arbitrées

| Sujet | Décision |
|---|---|
| Infrastructure | **Zéro backend.** Site statique, contenu en JSON validé par schéma, moteur TypeScript pur côté navigateur, progression en stockage local. Hébergement gratuit. |
| Langue | **Code et identifiants en anglais**, contenu narratif et interface en français. |
| Contenu MVP | Généré puis validé par le porteur du projet. |
| Périmètre | **Boucle complète uniquement.** Expériences de justice et voile d'ignorance : modélisés, non implémentés. |
| Programmes 2027 | **Écarté.** Aucun candidat, aucun parti, aucune échéance électorale. |
| Personnages | **Aucun corps humain.** Un portrait est une caricature en puissance. |
| Échelle d'impact | **Sélecteur jouable** : euros / % du revenu / % du reste à vivre / jours de dépenses. |
| Consultation des autres fiches | Possible mais non incitée, et journalisée pour le bilan. |
| Esquive d'un personnage | Impossible. Protection par la brièveté des actes et la reprise différée. |

---

## Les six difficultés de conception, et leur réponse

**1. La persistance des règles doit produire de l'appropriation, pas de la punition.**
Un **contrat annoncé avant chaque vote** (« cette décision s'appliquera à tous les personnages de cette
partie, y compris ceux que tu incarneras plus tard »), puis un rappel en quatre temps : marquage au vote,
rencontre neutre (la règle est un fait du monde, sans auteur nommé), attribution une seule fois au moment
où la ligne devient une décision, et **restitution bilatérale** — ce que la règle a produit *ici* et ce
qu'elle a produit *ailleurs*. Le jeu cite, il ne juge pas.

**2. Ne montrer que les retours de bâton est le biais le plus probable du projet.**
Un **quota de signe** vérifié par le moteur. Sur une partie de 3 actes : au plus la moitié des collisions à
charge, cible 1 défavorable / 1 favorable ou neutre / 1 mixte. Un effet nul est un **contenu** rédigé, pas
une absence de contenu. Si la contrainte est insatisfiable avec le corpus disponible, le jeu le dit au
joueur plutôt que de la violer en silence.

**3. Un algorithme qui envoie toujours le joueur là où ça fait mal est un biais.**
Premier personnage tiré **uniformément** parmi les six ; suivants tirés **uniformément sous contraintes
déclarées publiquement** (distance sociale, couverture, pertinence au regard des règles votées). Jamais un
argmax de douleur. Le journal des tirages est consultable par le joueur.

**4. Il n'existe pas de dénominateur neutre.**
Rapporter au reste à vivre présuppose le besoin ; au revenu, la proportionnalité ; aux euros absolus, le
nominalisme. Réponse : **en faire un objet de jeu**. Le sélecteur d'échelle montre que changer de mesure
change le classement des personnages les plus touchés — « change la mesure, pas les faits ». Le défaut est
déclaré et justifié dans la page méthode, et le dénominateur est borné par un **plancher publié**
(150 €/mois) pour supprimer l'explosion du ratio chez les personnages contraints.

**5. L'animation est un canal d'argumentation.**
L'intensité du traitement visuel est une fonction **pure** d'une grandeur objective, dont la signature rend
structurellement impossible de passer le signe, le personnage, la mesure ou l'opinion du joueur. Le signe
est détruit par un `Math.abs` en un point unique ; les tests ne vérifient pas la symétrie — elle est un
théorème — ils vérifient que ce point n'a pas été contourné.

**6. La neutralité ne peut pas reposer sur la bonne volonté de l'auteur.**
Trois couches séparées physiquement (`facts` → `hypotheses` → `narrative`, le graphe de dépendances allant
dans ce sens et jamais l'inverse), une couche de **provenance** portée par chaque valeur numérique, un
**lexique contrôlé** appliqué aussi aux chaînes d'interface, et un lint bloquant au build.

---

## Architecture fonctionnelle

Trois domaines strictement séparés — c'est l'invariant architectural central :

```
content/        ← le CONTENU NARRATIF      (JSON, aucune logique)
src/fiscal/     ← le MODÈLE SOCIO-FISCAL   (interchangeable : MVP aujourd'hui, OpenFisca demain)
src/core/       ← le MOTEUR DE JEU         (TypeScript 100 % pur : aucun import de Date,
                                            Math.random, window, fetch)
```

La frontière se lit dans les signatures, pas dans les intentions :

```ts
// src/core/budget.ts — pur
export function computeMonthlyBudget(
  character: Character, world: WorldState, fiscal: FiscalEngine, month: DiegeticMonth
): MonthlyBudget

// src/core/world.ts — l'état du monde est la liste ordonnée des règles décidées
export function applyRule(world: WorldState, rule: Rule): WorldState
export function activeEffectsFor(world: WorldState, character: Character): ResolvedEffect[]

// src/core/impact.ts — classe tout delta en régime d'absorption 0..4
export function absorptionRegime(delta: Money, stocks: Stocks, budget: MonthlyBudget): 0|1|2|3|4
export function comparabilityMetrics(delta: Money, budget: MonthlyBudget): Record<Scale, number>

// src/core/game.ts — réducteur pur
export function reduce(state: GameState, action: GameAction): GameState

// src/fiscal/contract.ts — le point d'extension OpenFisca
export interface FiscalEngine {
  readonly id: string;
  readonly lawVintage: string;
  compute(situations: HouseholdSituation[], period: Period): FiscalResult[]
}
```

`FiscalEngine` accepte un **lot** de situations dès le départ : c'est ce qui rendra l'appel à OpenFisca
viable sans réécrire le moteur. Trois implémentations prévues : `MvpFiscalEngine` (barème IR réel +
quotient familial + TVA par poste, aujourd'hui), `PrecomputedFiscalEngine` (lit des *baselines* calculées
hors ligne par OpenFisca, étape suivante), `OpenFiscaHttpEngine` (plus tard, et seulement si un backend
existe).

### Deux greffes imposées par le panel de juges

- **Le journal de commandes est l'unique format de sauvegarde.** Rien de calculé n'est persisté :
  `state = journal.reduce(apply, initialState(seed, contentVersion))`. Une partie reste rejouable,
  diffable, et le mode groupe futur devient trivial.
- **Quatre flux d'aléa nommés et indépendants** dérivés de la graine : `events`, `characters`,
  `presentation`, `hypotheses`. Avec un flux unique, ajouter une randomisation d'affichage modifierait le
  contenu tiré, ce qui invaliderait toute reproductibilité et tous les tests de référence.

---

## Modèle de données

### La couche de provenance — l'invariant central

```ts
type Nature = 'fact' | 'hypothesis' | 'extrapolation' | 'fiction';

type Value = {
  amount: number;
  unit: 'EUR' | 'EUR_month' | 'EUR_year' | 'EUR_bn' | 'pct';
  nature: Nature;
  sourceId?: string;        // REQUIS si nature === 'fact'
  hypothesisId?: string;    // REQUIS si nature === 'hypothesis'
  range?: [number, number];
  horizon?: 'month' | 'y1' | 'y5' | 'y10';
  note?: string;
};
```

**Invariants testés, bloquants au build** : `fact` ⇒ `sourceId` résolu ; `hypothesis` ⇒ `hypothesisId`
résolu *et* l'hypothèse porte au moins deux lectures nommées par un mécanisme ; aucun littéral numérique
formaté en euros hors du composant `<Amount>` (lint AST) ; aucun chiffre en clair dans un champ de la
couche narrative.

> Un juge a relevé dans deux propositions d'architecture un `{"amount": 8900, "unit": "EUR_bn"}` pour
> 8,9 milliards — une erreur de facteur 1000 glissée dans le document qui prétend interdire les chiffres
> faux mais crédibles. D'où le test d'ordre de grandeur par unité, bloquant lui aussi.

### Référentiels partagés

```ts
type Source = { id, name, organisation, url, vintage, scope,
  affiliation: 'public_institution' | 'statistics_body' | 'academic'
             | 'think_tank' | 'professional_body' | 'international' };

type Hypothesis = {
  id, question, status: 'consensual' | 'debated' | 'highly_debated', whyDebated: string,
  readings: { id: 'A' | 'B', mechanismLabel: string,
              parameters: Record<string, number>, sourceIds: string[] }[]
};
// Contrainte de schéma : readings.length >= 2.
// Une hypothèse à lecture unique est un contenu invalide.

type BudgetLineRef = {
  code, label, constrained: boolean,
  group: 'resource' | 'levy' | 'constrained' | 'adjustable' | 'savings' | 'credit',
  kappa: number,            // 0..1, compressibilité du poste
  layer: 'fact' | 'hypothesis', methodNote: string
};

type Principle = { id, label, definition: string, objection: string };
// 18 principes, jamais l'un sans son objection — contrainte de schéma.
```

### Entités de jeu

| Entité | Rôle | Champs saillants |
|---|---|---|
| `Character` | personnage jouable | `identity` (prénom, âge, ligne d'identité, décile, sources de calibrage) · `situation` (individus, famille, foyer fiscal, ménage — structure compatible OpenFisca dès maintenant) · `budget.lines[]` · `stocks` (liquidité 7 j / 60 j, découvert, patrimoine net, plancher de précaution) · `parity` · `shortTermGoal` · `embodiedDetails[]` · `unavailableOptions[]` · `equivalenceRefs[]` · `narrative` · `review[]` |
| `LifeEvent` | événement de vie | `valence` · `intensity` · `dramaticFunction[]` · `eligibility` (arbre booléen) · `probability` · `cost: Value` · `options[]` · `microQuestion` |
| `Reform` | choix collectif | `framing` · `objective: Value` · `contextRefs[]` · `leverFamilies[]` · `options[]` |
| `ReformOption` | une option | `isStatusQuo` · `isCompromise` · `families[]` · `effects[]` · `legitimateArgumentsFor[]` · `legitimateArgumentsAgainst[]` |
| `Effect` | effet déclaratif | `type` · `scope` · `horizon` · `uncertainty: 'established'｜'debated'｜'highly_debated'` · `hypothesisId?` · `multiHorizonDisplay` forcé à `true` quand le signe à 1 an diffère du signe à 10 ans |
| `Rule` | règle en vigueur | `reformId` · `optionId` · `shortLabel` · **`playerWording`** (verbatim, jamais reformulé) · `playerJudgement` · `diegeticMonth` · `replaces?` · `status: 'in_force'｜'amended'｜'repealed'` |
| `WorldState` | le monde | liste ordonnée de `Rule` + jeu d'hypothèses actif |
| `GameState` | la partie | `seed` · `contentVersion` · `engineVersion` · `commandJournal[]` |
| `OpinionEntry` | position | `questionId` · `scale5` · **`freeText`** · `at` · `context` — **magasin séparé** |
| `PhraseTemplate` | gabarit de phrase | DSL déclaratif `when` / `requires` / `template`, sélection par slot et priorité |

`OpinionEntry` est isolé physiquement : ce sont des opinions politiques, donc des données sensibles au sens
de l'article 9 du RGPD. Elles ne sont jamais exportées avec l'état de partie par défaut, et le mode groupe
futur devra typer `freeText: never` côté participant — un pseudo en atelier ou en classe est immédiatement
ré-identifiable.

---

## Architecture technique

Versions **vérifiées sur npm le 8 novembre 2026** — aucune citée de mémoire :

| Paquet | Version | Rôle |
|---|---|---|
| `typescript` | 7.0.2 | strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| `vite` | 8.3.6 | build et serveur de développement |
| `react` / `react-dom` | 19.3.1 | les deux seules dépendances de production |
| `zod` | 4.6.7 | schémas de contenu — build et Atelier uniquement, absent du bundle du jeu |
| `vitest` | 5.1.0 | tests unitaires |
| `fast-check` | 4.10.2 | tests de propriété sur la symétrie et le budget |

Pas de bibliothèque de style, pas de routeur tiers (micro-routeur par hash, ~45 lignes), pas de
bibliothèque d'animation (quatre animations CSS, voir plus bas). Les scripts d'outillage s'exécutent par
`node script.ts` : Node 25 lit TypeScript nativement, donc ni `tsx` ni `ts-node`.

**Hébergement** : Cloudflare Pages, offre gratuite. Une `Content-Security-Policy` en en-têtes interdit toute
requête tierce — une police distante suffirait à transmettre une adresse IP corrélée à une session portant
des opinions politiques. Polices auto-hébergées, budget ≤ 180 Ko woff2.

---

## Direction artistique

**Thèse : « le dossier vivant ».** Aucun indicateur permanent, aucune jauge, aucun HUD. Tout chiffre vit dans
un artefact daté et nommé que le personnage aurait réellement sous les yeux : relevé, avis d'échéance,
ticket, courrier, calendrier. C'est la différence entre incarner quelqu'un et remplir un formulaire fiscal.
L'effort graphique porte sur la **matière** et les **transitions entre artefacts**, jamais sur
l'amplification d'un montant.

Deux références ont tranché la tension « type jeu vidéo » contre « très sobre » : Lucas Pope sur l'écran de
fin de journée de *Papers Please* — « it's just a few dots with some text » — là où le joueur choisit entre
médicaments et chauffage ; et Jon Ingold (*80 Days*) — « the UI is a core part of the game experience, in a
sense it is the game ». Le sentiment « jeu vidéo » vient de la **tactilité** et des **niveaux de contraste**,
pas de l'effet.

### Palette

Fixer L\* et C\*, ne faire tourner que la teinte : deux couleurs de même clarté et même chroma sont
perceptivement d'égale force. La parité n'est pas une opinion, c'est une propriété de l'espace
colorimétrique.

```
Mode clair  papier       #F4F1EA   feuille      #FBF9F5   creux        #E8E3D8
            encre        #1E1B16   (15,2:1)     encre-2  #5A5348 (6,7:1)
            encre-3      #6E6759   (4,97:1)     filet    #A79C85 (2,41:1)
            filet fort   #8E8470   (3,27:1)
            perspective-a #236268  (6,17:1)     perspective-b #804E10 (6,17:1)   ← ΔL* = 0,03

Mode sombre papier       #14130F   (jamais #000)
            encre        #EDE8DC   (15,2:1)
            perspective-a #73C0C6  (8,93:1)     perspective-b #E0A85A (8,78:1)
```

Les deux accents encodent le **point de vue**, jamais le gain ou la perte.

Interdits vérifiés au build : aucune couleur à moins de 12 unités OKLCH du bleu France `#000091` ni du rouge
Marianne `#E1000F` ; le DSFR est interdit d'usage hors administration, et le reprendre serait une faute de
neutralité autant que de licence ; aucune teinte réservée à un personnage par sa situation — le créneau de
teinte est attribué par **ordre alphabétique d'identifiant**, règle publiée et auditable.

Le signe se porte par **trois canaux redondants** : signe arithmétique, glyphe de même surface d'encre, mot
en toutes lettres (« en plus » / « en moins », sept caractères chacun). Jamais le rouge et le vert — c'est à
la fois un problème d'accessibilité et un cadrage moral.

### Typographie

Toutes vérifiées sur l'API Fontsource, toutes en OFL-1.1 : **Newsreader** (titres, voix narrative, variable),
**Spectral** (texte courant long, dessinée par une fonderie française pour la lecture à l'écran),
**Public Sans** (interface, chiffres, `tabular-nums lining-nums` sur tous les montants), **IBM Plex Mono**
(fac-similés uniquement, interdite dans le narratif). Option « lisibilité renforcée » : **Atkinson
Hyperlegible Next**, et **Luciole** (CC BY 4.0, conçue avec le Centre Technique Régional pour la Déficience
Visuelle — auto-hébergement et attribution obligatoires).

Mesure de ligne 34ch mobile / 56ch au-delà de 720 px, jamais plus de 66ch en narratif. Fer à gauche, jamais
de justification. Espaces insécables avant `: ; ! ?` et avant le symbole €, séparateur de milliers en espace
insécable fine.

### Représentation des personnages — aucun corps humain

Un sceau procédural déterministe (grille 5×5 à symétrie verticale, **quotas de formes et de surface d'encre
strictement identiques** pour les six) plus trois objets métonymiques tirés d'un **vocabulaire fermé**.
Règle anti-typage décisive : **chaque objet apparaît chez au moins deux personnages**, donc aucun objet ne
devient la marque d'une catégorie sociale.

Interdits par schéma : tout objet dont la valeur marchande est le signifié principal ; tout objet de
misérabilisme (assiette vide, pile de factures, tirelire cassée, matelas au sol) ; tout marqueur d'origine
ou de religion ; tout marqueur de validité utilisé comme attribut de portrait — ces éléments n'existent que
comme événements chiffrés ; toute marque déposée ; **tout corps humain ou partie de corps**.

### Grammaire d'animation neutre

```ts
// src/motion/intensity.ts — SPEC PUBLIQUE VERSIONNÉE
export const MOTION_SPEC_VERSION = '1.0.0';

/** Entrées AUTORISÉES. N'apparaissent volontairement PAS :
 *  characterId, measureId, reformId, playerOpinion, playerVote, actIndex, seed.
 *  L'absence de paramètre est la garantie : on ne peut pas biaiser
 *  avec ce qu'on ne reçoit pas. */
export interface ShockInput {
  amountCents: number;      // signé
  netIncomeCents: number;
  slackCents: number;       // reste à vivre habituel
  scale: 'euros' | 'income' | 'slack';
}

export const DENOMINATOR_FLOOR_CENTS = 15_000;        // 150 €/mois — PUBLIÉ
export const THRESHOLDS = [0.02, 0.08, 0.20, 0.50];   // PUBLIÉS

export function ratio(i: ShockInput): number {
  const num = Math.abs(i.amountCents);  // ← LE SIGNE EST DÉTRUIT ICI, EN UN POINT UNIQUE
  const raw = i.scale === 'euros'  ? REFERENCE_EUROS_CENTS
            : i.scale === 'income' ? i.netIncomeCents
            :                        i.slackCents;
  return num / Math.max(raw, DENOMINATOR_FLOOR_CENTS);
}
```

**Théorème, par construction et non par test** : pour tout `a`, `motionFor(+a) === motionFor(-a)`, puisque
`ratio` n'utilise `amountCents` qu'à travers `Math.abs`. Les tests ne vérifient pas la symétrie, ils
vérifient que ce point unique n'a pas été contourné.

| Palier | r | durée | translateY | compteur |
|---|---|---|---|---|
| I0 | < 2 % | 0 ms | 0 px | 0 ms |
| I1 | 2 – 8 % | 180 ms | 4 px | 200 ms |
| I2 | 8 – 20 % | 240 ms | 6 px | 400 ms |
| I3 | 20 – 50 % | 320 ms | 10 px | 600 ms |
| I4 | ≥ 50 % | 400 ms | 14 px | 800 ms |

La table n'a **aucune colonne** `signe`, `direction`, `couleur`, `son`, `vibration`, `modale`, `scrim`,
`scale`, `shake`. Ces dimensions n'existent pas dans le type, donc elles ne peuvent pas être asymétriques.

**Exactement quatre animations dans tout le jeu** : `enter-rise` (toute apparition de bloc), `count-roll`
(tout montant quel que soit son signe, partant de la valeur **précédente** et jamais de zéro, en
interpolation **linéaire** — une courbe décélérante ferait « atterrir » le chiffre, donc le dramatiserait),
`bar-grow`, `seal-turn` (rappel de vote, identique pour les six).

**Interdits absolus** (extraits des 18 règles) : jamais de tremblement, de rebond, de compte à rebours, de
musique ou d'ambiance sonore, de son ou de vibration déclenchés par un **résultat**, de plein écran ou de
modale réservés à une catégorie d'événements, de direction de mouvement dépendante du signe, de durée
dépendante du personnage ou de l'opinion du joueur, de durée proportionnelle en continu à la magnitude —
cinq paliers discrets et saturants, sinon le gradient de dramatisation entre personnages revient.

`prefers-reduced-motion: reduce` ⇒ toutes les durées à 0, compteur rendu directement à sa valeur finale.
**Aucune information n'est portée par le mouvement seul, donc aucune perte** — c'est littéralement le
troisième test ci-dessous.

### La ligne rouge, en trois tests opposables

1. **Test de permutation.** Inverser le signe de l'événement et permuter les personnages à ratio identique.
   Si un seul paramètre de mise en scène change, la maquette est refusée. Pas d'exception d'intention.
2. **Test de la phrase d'encodage.** Pour chaque paramètre animé, écrire « ce paramètre encode *telle
   grandeur* = *telle valeur* ». Si la phrase doit mentionner un sentiment, une personne, une mesure ou une
   intention, le paramètre est supprimé.
3. **Test de la lecture muette.** Couper motion, couleur et son. Si la conclusion d'un lecteur change, la
   mise en scène portait un argument : refusée.

> **Frontière, en une ligne.** Faire ressentir = donner au joueur le temps et la place de percevoir une
> grandeur qui est écrite à côté. Manipuler = ajouter par le canal sensoriel une information affective
> absente de la donnée affichée.

---

## Déroulement d'une partie MVP

Cible **20 minutes médianes, plafond 28**. 3 actes, 3 personnages incarnés sur 6, 8 mois vécus (3 + 3 + 2),
3 réformes, 1 amendement. Contrainte moteur : **la première collision tombe entre la 8ᵉ et la 10ᵉ minute**.

Chaque mois porte une **fonction dramatique** parmi `CALIBRATION`, `CHOC`, `TRAÎNE`, `RESPIRATION`.
Interdiction de deux mois consécutifs de même fonction. **Au moins une `RESPIRATION` par partie**, sinon le
jeu est perçu comme misérabiliste. La `TRAÎNE` — la conséquence du choc qui persiste, plus un petit besoin
affectivement chargé — est le mois qui produit réellement le sentiment de contrainte.

**Accueil** (30 s) → **Contrat** (25 s, non escamotable) : tu ne choisis pas qui tu es ; les règles que tu
décides restent en vigueur pour tous les personnages ; cette partie utilise tel jeu d'hypothèses, tiré au
sort, tu peux en changer ; tes réponses restent sur cet appareil.

**Acte I ≈ 8 min** — intro 40 s (attachement par des détails **non économiques** et un objectif court
terme) · mois `CALIBRATION` 45 s · mois `CHOC` 75 s, en révélation à trois temps (le fait seul, un temps où
le joueur consulte lui-même son relevé, puis les options) · mois `TRAÎNE` 60 s + micro-question à un tap ·
réforme #1 120 s · « le choix vu par chacun » 60 s · question « bien et juste » 45 s.

**Acte II ≈ 6 min** — intro 30 s · mois 1 avec **première collision** 90 s · mois 2 60 s · réforme #2 ·
question · **relance comparative** (« il y a 12 minutes tu considérais cette mesure comme juste ; qu'en
penses-tu maintenant ? ») · écran d'amendement 60 s.

**Acte III ≈ 4 min** — intro 30 s · mois 1 · **collision majeure** cumulant toutes les règles 90 s ·
question finale.

**Fin ≈ 2 min** — bilan en cinq blocs, puis question KPI du déclic.

Le rappel, dans sa forme canonique :

> Septembre 2027. Tu es Yanis, 20 ans, étudiant en L2 à Lyon. Inscription universitaire : **1 170 €**.
>
> *(une seule fois, au moment où la ligne devient une décision)*
> Ces frais incluent la hausse de 1 000 €/an décidée en mars 2027, quand tu incarnais Marc. Tu avais alors
> écrit : « les études sont un investissement, c'est normal d'en payer une part ».
>
> **Ce que cette règle a produit ici** : Yanis travaille 8 h de plus par semaine ; son temps d'étude passe
> de 22 h à 14 h.
> **Ce que cette règle a produit ailleurs** : 1,4 Md€ de dépense publique en moins ; le budget des bourses
> n'a pas été réduit.

Aucun commentaire, aucun adverbe, aucune synthèse morale.

---

## Écrans

| Id | Écran | Rôle |
|---|---|---|
| `home` | Accueil | Poser le contrat de lecture en 30 s, sans écran de configuration |
| `contract` | Contrat et hypothèses | Rendre l'engagement explicite avant tout choix |
| `character-intro` | Arrivée dans un personnage | Attachement en moins de 40 s, par des détails non économiques |
| `month` | Un mois vécu | Faire ressentir la marge de manœuvre par un arbitrage réel, 3 taps maximum |
| `event` | Événement | Le renoncement chargé affectivement, par révélation en trois temps |
| `reform-context` | Contexte d'une réforme | Poser le problème en l'attribuant à un **acteur fictif nommé**, jamais comme une nécessité constatée |
| `reform-vote` | Vote | Options d'au moins trois familles de leviers, **dont le statu quo et la contestation du cadrage** |
| `impact-for-each` | Le choix vu par chacun | Six cartes de format strictement identique + sélecteur d'échelle |
| `judgement` | Bien et juste | Capter la **formulation libre** — matière première de tout le reste |
| `callback` | Collision | Juxtaposer et se taire |
| `rule-registry` | Le registre des lois | Transformer « le jeu me punit » en « j'ai construit un monde ». Accessible en un tap |
| `amendment` | Amender une règle | Faire passer le joueur de coupable à législateur |
| `transition` | Changement de personnage | Rendre le tirage transparent **avant** que le joueur ne cherche le motif |
| `summary` | Bilan | Fournir la juxtaposition brute. Aucune phrase du jeu ne formule le déclic |
| `kpi` | Question du déclic | Instrumenter la seule métrique de succès, hors de tout contexte politique |
| `method` | Note de méthode | Publier la partialité résiduelle — principal mécanisme de neutralité |
| `studio` | Atelier (back-office) | CRUD complet sans toucher au code, sans serveur, aperçu jouable immédiat |

Sur `impact-for-each`, l'ordre des six est une **permutation déterministe par rotation** (carré latin),
publiquement déclarée, équilibre positionnel vérifié en CI. La motion y est **constante** et seule la donnée
varie : apparition simultanée, pas de cascade, même durée de comptage pour les six.

---

## Arborescence

```
sijetaistoi/
├── package.json              # 2 dépendances de production : react, react-dom
├── tsconfig.json             # strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├── vite.config.ts
├── DECISIONS.md              # journal des arbitrages d'architecture
├── HYPOTHESES.md             # toutes les hypothèses du modèle, statut et sources
├── CHARTE.md                 # charte éditoriale opposable
├── NOTE-DE-METHODE.md        # biais résiduels assumés — publiée telle quelle sur /method
│
├── content/                  # LE CONTENU — aucune logique
│   ├── bundle.json           # GÉNÉRÉ, ne pas éditer
│   ├── sources.json             hypotheses.json       hypothesis-sets.json
│   ├── budget-lines.json        principles.json       lexicon.json
│   ├── game-structure.json      ui-strings.json       # soumis au lexique, comme le reste
│   ├── characters/           # 6 fichiers
│   ├── events/               # 12 fichiers
│   ├── reforms/              # 6 fichiers
│   ├── templates/phrases.json
│   └── baselines/            # VIDE au MVP — rempli à l'étape OpenFisca
│
├── src/
│   ├── schemas/              # Zod — une source de vérité : validation, types, formulaires Atelier
│   ├── core/                 # 100 % PUR
│   │   ├── types.ts  rng.ts  budget.ts  world.ts  impact.ts
│   │   └── phrases.ts  casting.ts  callback.ts  game.ts  summary.ts
│   ├── fiscal/
│   │   ├── contract.ts  mvp-engine.ts  precomputed-engine.ts
│   │   ├── parameters-2026.json        # importés d'OpenFisca, datés, commités
│   │   └── openfisca-mapping.json
│   ├── motion/               # intensity.ts  table.ts — spec publique versionnée
│   ├── quality/              # fonctions pures bundle -> violations, partagées CI / Atelier
│   │   └── lexicon.ts  symmetry.ts  narrative-parity.ts  valence.ts  magnitude.ts
│   ├── persistence/          # journal de commandes ; magasin d'opinions SÉPARÉ
│   ├── ui/
│   │   ├── screens/          # un fichier par écran du tableau ci-dessus
│   │   ├── components/
│   │   │   ├── Amount.tsx    # SEUL composant autorisé à rendre un nombre
│   │   │   ├── MonthlyBudget.tsx  CharacterCard.tsx  Callback.tsx
│   │   │   └── JudgementScale.tsx  ScaleSelector.tsx  ProvenanceDrawer.tsx
│   │   └── styles/tokens.css  base.css
│   └── studio/               # chargé en lazy, hors du bundle du jeu
│
├── scripts/                  # exécutés par `node script.ts` (Node 25 lit le TS nativement)
│   └── build-content.ts  lint-content.ts  simulate.ts  check-contrast.ts
└── tests/
    ├── core/        budget · world · impact · casting · callback · summary
    ├── motion/      symmetry · blindness · bounds
    ├── content/     schema · lexicon · balance · provenance · magnitude
    └── e2e/         full-run.spec.ts
```

---

## Dispositif de neutralité

| Vecteur de biais | Mécanisme structurel | Vérification |
|---|---|---|
| Mots employés | Lexique contrôlé, appliqué **aussi** à `ui-strings.json` | lint bloquant |
| Chiffres sans provenance | Couche `Value` + `<Amount>` seul autorisé à rendre un nombre | lint AST |
| Hypothèse présentée comme un fait | `hypothesis` ⇒ ≥ 2 lectures nommées par un mécanisme | schéma |
| Options déséquilibrées | Toute option a des effets favorables **et** défavorables identifiés | lint bilatéral |
| Cadrage à somme nulle | Toute réforme offre le statu quo **et** la contestation du cadrage | schéma |
| Rappels à charge | Quota de signe sur les collisions | moteur + test |
| Casting orienté | Tirage uniforme sous contraintes déclarées, journal consultable | test + écran |
| Ordre d'affichage | Rotation en carré latin, équilibre positionnel | test |
| Mise en scène | Fonction d'intensité aveugle au signe et à l'identité | théorème + test |
| Parité narrative | Longueur de fiche, force/vulnérabilité, opinion à contre-intérêt obligatoires | lint |
| Parité visuelle | L\* et C\* fixés, seule la teinte tourne, créneau par ordre alphabétique | test de contraste |
| Partialité résiduelle | `NOTE-DE-METHODE.md` publiée telle quelle sur `/method` | — |

Sur le RGPD : le stockage strictement local sans transmission est le choix qui protège le mieux des données
d'opinion. Par défaut `sessionStorage` (éphémère), bascule explicite vers `localStorage`, purge à 30 jours,
export et effacement total accessibles. Mention au contrat : « ces réponses portent sur tes opinions : ne
les laisse pas sur un ordinateur partagé ». **Cette analyse est informative et ne constitue pas un conseil
juridique** — une vérification s'impose avant toute ouverture de comptes ou de mode groupe.

---

## Étapes de développement

| # | Étape | Livrable vérifiable | Tests |
|---|---|---|---|
| 1 | Squelette Vite + TS strict + CI | `npm run dev` affiche un écran, `npm test` passe | smoke |
| 2 | `core/budget` + `core/impact` purs | budget ventilé et régime d'absorption pour une fixture | unitaires + fast-check (budget équilibré, bornes 0..4) |
| 3 | Schémas Zod + `build-content` + 1 personnage réel | `node scripts/build-content.ts` produit `bundle.json` | invariants de provenance |
| 4 | `motion/intensity` + `motion/table` | spec publiée, bornes respectées | **symétrie, cécité au personnage, bornes dures** |
| 5 | `<Amount>`, `<MonthlyBudget>`, jetons CSS | un relevé mensuel lisible, clair et sombre | contraste calculé en CI, axe-core |
| 6 | Boucle d'un mois jouable, 1 personnage, 3 mois | **acte I jouable de bout en bout** | réducteur pur, journal rejouable |
| 7 | `core/world` + réforme + vote | une règle votée modifie le budget des six | application des règles, idempotence |
| 8 | `impact-for-each` + sélecteur d'échelle | six cartes, quatre échelles, ordre en carré latin | équilibre positionnel, déterminisme |
| 9 | Question « bien et juste » + registre + `core/callback` | la première collision cite le joueur verbatim | quota de signe, callback à effet nul |
| 10 | `core/casting` + changement de personnage | actes II et III, journal des tirages consultable | uniformité du 1ᵉʳ tirage, contraintes déclarées |
| 11 | `core/summary` + KPI | bilan en cinq blocs, aucune phrase ne formule le déclic | absence de score, descriptivité |
| 12 | `quality/*` + lint bloquant | `npm run lint:content` rouge sur un contenu fautif | lexique, symétrie, parité, magnitude |
| 13 | Corpus complet : 6 personnages, 12 événements, 6 réformes | partie complète de 20 min | `simulate.ts` sur 10 000 parties |
| 14 | Atelier | CRUD complet dans le navigateur, aperçu jouable | formulaires générés depuis Zod |
| 15 | Accessibilité, mobile, perf, `/method`, déploiement | Cloudflare Pages en ligne | axe-core, Lighthouse, parcours Playwright |

L'étape 1 produit quelque chose d'exécutable. L'étape 6 produit le premier acte réellement jouable — c'est
le premier moment où le concept est testable sur quelqu'un d'autre.

---

## Vérification

- `npm test` — unitaires et propriétés sur le noyau, la motion et le contenu.
- `node scripts/lint-content.ts` — doit **échouer** sur un contenu volontairement fautif : chiffre sans
  source, option à sens unique, terme du lexique, erreur d'ordre de grandeur.
- `node scripts/simulate.ts --runs 10000` — rapports de symétrie : distribution des signes de collisions,
  couverture des personnages, équilibre positionnel, part de parties violant le quota (doit être nulle).
- `node scripts/check-contrast.ts` — tous les ratios annoncés dans ce document, recalculés.
- Parcours Playwright complet, clavier uniquement, puis avec `prefers-reduced-motion`.
- **Test humain** : trois personnes de sensibilités différentes jouent une partie complète et répondent à la
  question KPI. C'est la seule vérification qui compte vraiment.
