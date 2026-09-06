# Roadmap

L'état du projet et ce qu'il reste à valider. Les principes vivent dans
[CONCEPT.md](./CONCEPT.md), la forme publiée dans
[docs/FORMAT.md](./docs/FORMAT.md), le comportement du plugin dans
[packages/plugin/SPEC.md](./packages/plugin/SPEC.md), et les options non
engagées dans [docs/notes/PISTES-EVOLUTION.md](./docs/notes/PISTES-EVOLUTION.md).

Le projet est un **prototype avancé**. Les preuves durables portent sur les lois
du moteur, vérifiées à chaque test. Les composants du corpus constatent un
comportement à une date donnée et restent remplaçables.

## L'objectif du MVP

Éprouver un flux complet :

```text
Figma → contrat et tokens → code → contrôles CI → utilisation par un agent
```

Deux résultats à établir :

- **robustesse** : les divergences couvertes sont détectées avant la fusion et
  reçoivent un diagnostic actionnable ;
- **confiance** : le contrat suffit pour utiliser correctement l'API visuelle de
  plusieurs familles de composants.

Le but n'est pas de couvrir un catalogue entier, mais de tenir sans aucune règle
liée au nom d'un composant, sur au moins un composant composé.

## Ce qui fonctionne

| Domaine | État |
|---|---|
| Forme du contrat | Vues exactes publiées sous cinq catalogues de parties, plus un `samples` récursif non normatif. Valeurs neutres élidées, une entrée par ligne sur deux niveaux |
| Lois du moteur | `packages/plugin/tests/lois.ts` les porte, `exportComponent.test.ts` les applique à chaque contrat fabriqué. Aucune ne connaît le nom d'un composant |
| Export DTCG | Variables locales, alias et modes exportés. Collisions et cycles diagnostiqués |
| Structure portable | Flex, wrap, grille, arbres récursifs, tailles, bornes, typographie, icônes et composition, tous couverts par le vocabulaire du contrat |
| Position et rotation | Un calque hors du flux est placé par `constraints` et `inset`, sa `rotation` écrite en vocabulaire CSS |
| Dépendances composées | Détection sur toutes les pages, graphe acyclique, cardinalité et dépendances conditionnelles contrôlées |
| Consommation | `@ucm-kit/core` lit deux versions et porte les contrôles indépendants du langage. `@ucm-kit/cli` les exécute et découvre l'adaptateur optionnel. `@ucm-kit/adapter-typescript` compare props et composition, puis génère les types dérivés |
| Contrôles chez le consommateur | Forme, version, graphe de composition, adresses des échantillons, références de tokens, et parité statique quand l'adaptateur est installé. Tout vient du workflow qu'`ucm init` écrit |
| Rapport CI | Constats et avertissements agrégés dans le terminal, le résumé CI et le commentaire de pull request |
| Interopérabilité | JSON Schema publié dans `schema/`, dérivé de `types.ts`. Il décrit la forme, jamais la cohérence, et ne bloque aucune fusion |
| Validation Figma | Les quatre composants du Playground ont été réexportés à la forme courante, puis reconstruits à froid depuis leur seul contrat |

Aucun contrôle n'exécute le rendu.

## Ce qui n'est pas prouvé

| Limite | Ce qu'elle empêche de dire |
|---|---|
| La comparaison du rendu avec Figma n'est consignée nulle part | Le projet n'a aucune preuve visuelle écrite. C'est l'objet de la recette externe du [plan de neutralisation](./docs/plans/PLAN-NEUTRALISATION-PLAYGROUND.md) |
| Aucun contrat existant ne publie de `SLOT` ni de propriété `INSTANCE_SWAP` native | Ces deux chemins du moteur ne sont éprouvés que par des tests synthétiques |
| Le corpus compte quatre composants | La généralité du moteur se mesure sur ses invariants, pas sur ce corpus |
| Les protections de branche sont indisponibles sur le plan GitHub actuel | La CI détecte, elle n'empêche pas. Une pull request rouge reste fusionnable |
| `tokens.json` n'a pas de version propre | Un consommateur ne peut pas refuser un fichier de tokens d'une forme qu'il ne lit pas |
| La projection CSS des modes n'est pas implémentée | Le multi-marque au runtime n'existe pas |

## Fragilités connues

### Une instance détachée n'est plus identifiable

Une instance détachée redevient un `FRAME`. Le moteur ne peut plus savoir
qu'elle provenait d'un composant unifié : ses calques entrent dans le contrat du
parent au lieu d'apparaître dans `composes`, sans diagnostic spécifique.

### Le scan des dépendances charge toutes les pages

Le moteur appelle `figma.loadAllPagesAsync()` puis indexe les conteneurs de
règles une seule fois. Cette lecture reconnaît une dépendance placée sur une
autre page, mais son coût reste à mesurer sur un très gros fichier Figma.

### Le relevé de composition résout trois fois le même maître

`scanComposedMatrix` parcourt le sous-arbre de chaque dépendance distincte trois
fois, avec un `getMainComponentAsync` par instance à chaque passe. Le coût est
linéaire dans les occurrences et se paie une fois par composant propriétaire,
jamais par variant. Le runtime du plugin étant mono-thread, ces allers-retours
s'additionnent.

La correction connue est une mémoïsation de `getMainComponentAsync` par
identifiant de node, partagée entre les trois passes. Elle traverse quatre
signatures et n'a aucun effet sur le contrat produit. C'est la mesure qui
manque, pas la correction.

### La preuve du rendu reste ciblée

Une référence de token littérale est comparable au contrat, et un chemin
assemblé à l'exécution est refusé. Une donnée visuelle recopiée dans une règle
de code peut en revanche échapper à l'analyse statique.

Aucun contrôle n'exerce le rendu. Le Playground ne porte aucun test par
composant, et aucun vérificateur générique n'exerce les vues exactes d'un
composant arbitraire. Les contrôles disponibles et cette limite sont détaillés
dans [PLAN-CONFORMITE-DEV.md](./docs/plans/PLAN-CONFORMITE-DEV.md).

Ce qui en approche le plus reste statique : `@ucm-kit/adapter-typescript` lit
l'API publique avec le vérificateur de types et compte, dans le JSX, les
occurrences de chaque dépendance déclarée.

**Ce qu'il ne faut pas faire en attendant :** écrire chez le consommateur une
fonction de reconstruction. Ce serait une seconde implémentation du protocole
que porte la skill `consommer-contrat`, et c'est celle qui n'est pas jetable qui
deviendrait la vérité.

## Prochaines validations

### 1. Fermer la validation de projection

Le composé le plus large du Playground a été réexporté et reconstruit à froid.
Il couvre les occurrences multiples, les homonymes, trois niveaux d'imbrication
et un `swaps` avec `masterPath`.

Deux trous restent, et aucun contrat existant ne les touche.

1. Réexporter depuis Figma un composé qui exerce réellement un `SLOT`, une
   `INSTANCE_SWAP` native et un wrapper de dimensions exposé. Ne corriger aucun
   JSON à la main.
2. Reconstruire ce composant en contexte froid avec le protocole récursif, sans
   modifier un composant existant et sans ajouter de branche liée à son nom.
   Comparer ensuite le rendu à Figma, et consigner cette comparaison. C'est la
   seule preuve visuelle du projet, et elle n'est écrite nulle part.

Le coût du relevé de composition sur une grosse matrice n'entre pas dans cette
clôture : c'est une dette de performance, rangée avec les fragilités connues.

### 2. Éprouver d'autres familles de composants

Choisir les cas pour leur différence, pas pour leur nombre :

- un composant interactif avec booléens et états ;
- un composé avec plusieurs types de dépendances ;
- un composant qui exerce réellement wrap ou grille ;
- un composant dont la typographie ou la structure varie entre deux vues ;
- un composant qui expose un champ à côtés asymétriques.

Une limite ne justifie un nouveau champ que si le contrat ne permet aucune
décision correcte sur un cas réel.

### 3. Éprouver le workflow d'équipe

- rendre les contrôles bloquants après décision sur le plan GitHub ou la
  visibilité des repositories ;
- faire relire de vraies pull requests d'export par un designer et un
  développeur ;
- vérifier que chaque diagnostic est compréhensible sans ouvrir les logs ;
- mesurer les faux positifs et le coût quotidien des contrôles.

### 4. Renforcer la parité utile

L'adaptateur TypeScript avertit lorsqu'une union omet une valeur publiée ou
lorsqu'un enum déclaré n'a aucun effet dans le composant. Il ne prétend pas
analyser les branches, les tables, les valeurs transmises ni les règles métier.
Ces écarts restent non bloquants.

Le défaut d'un axe vient uniquement d'une règle Figma `@default`. Son absence
laisse le choix au développeur. La parité statique ne compare pas ce défaut à
celui du code, car elle ne saurait le faire pour toutes les écritures sans
présenter son silence comme une garantie.

### 5. Stabiliser l'interopérabilité

Le schéma dérive de `types.ts` et documente les champs dont l'absence ou la
valeur oriente une décision. La
[politique de compatibilité](./docs/COMPATIBILITE.md) relie le contrat, le
schéma, les tokens, les paquets et les adaptateurs.

`tokens.json` reste sans version tant que sa grammaire ne bouge pas. Le premier
changement de projection rouvrira cette décision avec un lecteur réel à écrire.
Le diff sémantique reste différé jusqu'au premier cycle de changement réel : il
sera spécifié sur deux artefacts successifs et leur revue, pas sur un corpus
inventé.

### 6. Passer la recette externe

La prochaine validation est N6 du
[plan de neutralisation](./docs/plans/PLAN-NEUTRALISATION-PLAYGROUND.md). Elle
charge le bundle dans Figma, réexporte les tokens et au moins un composant vers
une vraie pull request du Playground, compare la sonde reconstruite à Figma et
laisse le workflow publier son rapport. Cette recette précède la publication
des versions de paquets déjà préparées dans le dépôt.

## Critères de sortie du MVP

Le MVP est validé lorsque :

- plusieurs familles de composants passent sans règle liée à leur nom ;
- un composé réutilise réellement plusieurs dépendances et passe la parité ;
- les contrats invalides, les versions incompatibles et les tests rouges
  empêchent la fusion avec un diagnostic actionnable ;
- les écarts de parité statique couverts avertissent sans accuser le contrat ni
  bloquer la fusion ;
- un contrat peut précéder son code sans désactiver les contrôles futurs ;
- un agent en contexte froid n'invente ni prop, ni variante, ni token ;
- les limites non vérifiables sont documentées sans être présentées comme des
  garanties.

La recette externe N6 et l'observation de l'interface dans Figma restent les
deux preuves nécessaires avant de proposer le projet à une expérimentation sur
un catalogue plus large.
