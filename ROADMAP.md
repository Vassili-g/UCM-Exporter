# Roadmap — UCM

Ce document suit la maturité du projet et les validations restantes. Les
principes sont dans [CONCEPT.md](./CONCEPT.md), la forme publiée dans
[docs/FORMAT.md](./docs/FORMAT.md), le comportement actuel dans
[packages/plugin/SPEC.md](./packages/plugin/SPEC.md), et les options non engagées dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Objectif du MVP

Le MVP doit éprouver un flux complet :

```text
Figma → contrat et tokens → code → contrôles CI → utilisation par un agent
```

Il doit établir deux résultats :

- **robustesse** : les divergences couvertes sont détectées avant fusion et
  reçoivent un diagnostic actionnable ;
- **confiance** : le contrat suffit pour utiliser correctement l’API visuelle
  de plusieurs familles de composants.

Le but n’est pas de couvrir tout un catalogue, mais de tenir sans règle liée au
nom d’un composant, dont au moins un composant composé.

## État actuel

Ce tableau décrit la branche courante des deux repositories. Une capacité qui
dépend de Figma n’est validée qu’après un export réel ; les JSON de référence ne
sont jamais corrigés à la main.

| Domaine | État |
|---|---|
| Forme du contrat | L’Exporter publie les vues exactes sous cinq catalogues de parties et un `samples` récursif non normatif. Il élide les valeurs neutres, ne publie ni `tokensUsed` ni `meta.warnings`, et sérialise une entrée par ligne sur deux niveaux. Les `args` d’une dépendance viennent de sa surface publique directe et de son seul wrapper élu ; le contenu positionnel suit la visibilité effective et s’arrête aux `SLOT`. `packages/plugin/tests/lois.ts` porte ces lois et `exportComponent.test.ts` les applique à chaque contrat que le moteur fabrique : renvois résolus, catalogues sans doublon ni orphelin, adresses qui désignent un calque réel, aucune valeur neutre écrite, chaque clé de couleur résolue vers un rôle de la bonne nature, accord avec le schéma publié, aller-retour de l’écriture. Aucune ne connaît le nom d’un composant |
| Consommation | `@ucm-kit/core` lit la version courante et la précédente, publie le schéma et porte les contrôles indépendants du langage. `@ucm-kit/cli` exécute ces contrôles et découvre dans le repository l’adaptateur TypeScript optionnel. `@ucm-kit/adapter-typescript` compare les props et la composition TS/TSX puis génère les types dérivés ; sa dépendance de 23 Mo à TypeScript n’est donc payée par aucun consommateur non-TypeScript. Le Playground n’héberge plus aucune de ces implémentations, ni le moindre contrôle local : il installe les paquets publiés le temps de sa CI, et son verrou de parité sur le vrai `StressTest` a rejoint les fixtures de l’adaptateur |
| Validation Figma | Les quatre composants du Playground ont été réexportés à la forme courante, puis reconstruits à froid chacun depuis son seul contrat. Ces exports vivent là-bas et nulle part ailleurs, sur `main`, aux côtés des sondes qu’ils ont servi à reconstruire. La comparaison du rendu obtenu avec Figma n’est consignée nulle part : c’est l’objet de la recette N6 du [plan de neutralisation](./PLAN-NEUTRALISATION-PLAYGROUND.md). Ces quatre composants sont des sondes jetables, pas un critère de généralité du moteur |
| Export DTCG | Variables locales, alias et modes exportés ; collisions et cycles diagnostiqués |
| Structure portable | Flex, wrap, grille, arbres récursifs, tailles, bornes, typographie, icônes et composition couverts dans le vocabulaire du contrat. Un calque hors du flux est PLACÉ — `constraints` et `inset` — et sa `rotation` est écrite en vocabulaire CSS : les deux étaient des avertissements sans geste possible, Figma ne permettant de lier ni une position ni une rotation |
| Dépendances composées | Détection sur toutes les pages, graphe acyclique, cardinalité et dépendances conditionnelles contrôlés |
| Contrôles chez le consommateur | Forme et version des contrats, graphe de composition, adresses des échantillons, références de tokens, et la parité statique quand l’adaptateur TypeScript est installé. Tout vient du workflow qu’`ucm init` écrit et du paquet publié qu’il appelle : le repository n’a plus ni script, ni test générique, ni dépendance `@ucm-kit`. Aucun contrôle n’exécute le rendu |
| Rapport CI | Les constats et avertissements de l’export sont agrégés dans le terminal, le résumé CI et le commentaire de pull request |
| Test froid | Le protocole générique est documenté par le skill `consommer-contrat` et ses lois d’adressage sont testées. Les quatre composants du Playground ont été régénérés à froid depuis leur seul contrat. La preuve visuelle, elle, dépend d’une comparaison avec Figma qu’aucun repository ne consigne ; un composant existant ne vaut que pour le contrat qu’il accompagne |
| Corpus de démonstration | Quatre composants, chez le consommateur, sondes jetables à ne pas réécrire pour obtenir du vert. Aucun ne publie de `SLOT` ni de propriété `INSTANCE_SWAP` native : ces deux chemins du moteur ne sont éprouvés que par des tests synthétiques. La maturité se mesure aussi sur les invariants du moteur et sur de nouvelles familles Figma choisies sans règle liée à leur nom |
| Protection de fusion | Non disponible sur le plan GitHub actuel : la CI détecte, mais une pull request rouge reste fusionnable |
| Interopérabilité | Le JSON Schema du contrat est publié dans `schema/` et dérivé de `types.ts` ; `ucm init` écrit l’association qui le donne à l’éditeur, dans le paquet installé. Il décrit la forme, jamais la cohérence, et ne bloque aucune fusion. `tokens.json` n’a toujours pas de version propre |
| Multi-marque au runtime | Les modes sont exportés, mais leur projection CSS et leur sélection ne sont pas implémentées |

Le projet est un **prototype avancé**. L’Exporter écrit une forme, et le
Playground la relit avec les seuls paquets publiés. Les preuves durables
portent sur les lois du moteur ; les composants du Playground constatent un
comportement à une date donnée et restent remplaçables.

## Fragilités connues

### Une instance détachée n’est plus identifiable

Une instance détachée redevient un `FRAME`. L’Exporter ne peut plus savoir
qu’elle provenait d’un composant unifié : ses calques entrent dans le contrat du
parent au lieu d’apparaître dans `composes`, sans diagnostic spécifique.

### Le scan des dépendances charge toutes les pages

L’Exporter appelle `figma.loadAllPagesAsync()` puis indexe les conteneurs de
règles une seule fois. Cette lecture reconnaît correctement une dépendance
placée sur une autre page, mais son coût reste à mesurer sur un très gros fichier
Figma.

### Le relevé de composition résout trois fois le même maître

`scanComposedMatrix` parcourt le sous-arbre de chaque dépendance distincte trois
fois, avec un `getMainComponentAsync` par instance à chaque passe :
`indexMasterInstances` pour les positions du maître, puis
`indexDependencyPropertySurfaces` qui enchaîne `scanComposedInstances` et
`findWrapperReference`. Le coût est linéaire dans les occurrences et se paie une
fois par owner, jamais par variant — trente variants qui embarquent le même
composant n'en font pas trente. Il reste que le runtime du plugin est
mono-thread, et que ces allers-retours s'additionnent.

La correction connue est une mémoïsation de `getMainComponentAsync` par id de
node, partagée entre les trois passes. Elle traverse quatre signatures et n'a
aucun effet sur le contrat produit : elle attend d'être justifiée par une mesure
plutôt que par une intuition. C'est cette mesure, et non la mémoïsation, qui
manque.

### La CI détecte sans empêcher la fusion

Les repositories privés n’ont pas accès aux protections de branche avec le plan
GitHub actuel. Sans protection de `main` ni `CODEOWNERS`, les contrôles restent
consultatifs. La documentation doit donc parler de détection, jamais de
prévention.

### La preuve du rendu reste ciblée

Les références de tokens littérales sont comparables au contrat ; un chemin
assemblé à l’exécution est refusé. En revanche, une donnée visuelle recopiée
dans une règle de code peut échapper à l’analyse statique. Aucun contrôle
n’exerce le rendu : le Playground ne porte plus aucun test par composant, et
aucun vérificateur générique n’exerce les vues exactes d’un composant
arbitraire. Les contrôles disponibles et cette limite sont détaillés dans
[PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md).

C’est là, et nulle part ailleurs, que vit la preuve de bout en bout. Les
jointures d’adresses constatent que deux contrats se joignent ; elles ne
constatent à aucun moment qu’une reconstruction a effectivement consommé
l’échantillon. Le vérificateur générique le ferait. Ce qui en approche le plus
aujourd’hui reste statique : `@ucm-kit/adapter-typescript` lit l’API publique
avec le vérificateur de types et compte, dans le JSX, les occurrences de chaque
dépendance déclarée. Ce qu’il ne faut PAS faire en attendant : écrire chez le
consommateur une fonction de reconstruction. Ce serait une seconde
implémentation du protocole que porte le skill `consommer-contrat`, deux implémentations divergent, et c’est celle qui
n’est pas jetable qui deviendrait la vérité — exactement ce que le corpus de
démonstration est censé ne jamais devenir.

## Prochaines validations

### 1. Fermer la validation de projection

Le composé le plus large du Playground a été réexporté et reconstruit à froid. Il
couvre les occurrences multiples, les homonymes — sept d’une même dépendance,
trois d’une autre —, trois niveaux d’imbrication et un `swaps` avec
`masterPath`.

Deux trous restent, et aucun contrat existant ne les touche : aucun ne publie
de `SLOT`, aucun ne publie de propriété `INSTANCE_SWAP` native. Ces deux
chemins du moteur n’ont donc jamais vu de donnée Figma réelle, seulement des
tests synthétiques.

1. Réexporter depuis Figma un composé qui exerce réellement un `SLOT`, une
   `INSTANCE_SWAP` native et un wrapper de dimensions exposé. Ne corriger aucun
   JSON à la main.
2. Reconstruire ce composant en contexte froid avec le protocole récursif,
   sans modifier un composant existant et sans ajouter de branche liée à son
   nom. Comparer ensuite le rendu à Figma, et consigner cette comparaison :
   c’est la seule preuve visuelle du projet, et elle n’est écrite nulle part.

Le coût du relevé de composition sur une grosse matrice n’entre pas dans cette
clôture : c’est une dette de performance, elle a maintenant une cause nommée, et
elle est rangée avec les fragilités connues.

### 2. Éprouver d’autres familles de composants

Choisir les cas pour leur différence, pas pour leur nombre :

- un composant interactif avec booléens et états ;
- un composé avec plusieurs types de dépendances ;
- un composant qui exerce réellement wrap ou grille ;
- un composant dont la typographie ou la structure varie entre deux vues ;
- un composant qui expose un champ à côtés asymétriques.

Une limite ne justifie un nouveau champ que si le contrat ne permet aucune
décision correcte sur un cas réel. Les options correspondantes restent dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

### 3. Éprouver le workflow d’équipe

- rendre les contrôles bloquants après décision sur le plan GitHub ou la
  visibilité des repositories ;
- faire relire de vraies pull requests d’export par un designer et un
  développeur ;
- vérifier que chaque diagnostic est compréhensible sans ouvrir les logs ;
- mesurer les faux positifs et le coût quotidien des contrôles.

### 4. Renforcer la parité utile

Les prochains contrôles candidats sont les valeurs d’enum réellement gérées,
les valeurs par défaut et les exceptions volontaires documentées. Leur coût et
leurs faux positifs doivent être mesurés sur plusieurs composants avant de les
rendre bloquants.

### 5. Stabiliser l’interopérabilité

Le JSON Schema est publié, avant la clôture du point 1 et non après. Ce
décalage est assumé : le schéma est dérivé de `types.ts`, il ne bloque aucune
fusion et il ne prétend rien prouver, donc il ne dépend d’aucune validation en
cours. Un contrôle bloquant, lui, aurait dû attendre.

Restent ouverts :

- documenter le schéma là où il est muet : 118 de ses 236 propriétés n’ont
  aucune `description`, dont `ContractDiagnostic`, `ContractCoverage` et toutes
  les formes de `props`. Le texte vient des commentaires de `types.ts`, donc le
  geste est d’écrire là-bas ce qu’un consommateur d’un autre langage n’a nulle
  part ailleurs ;
- versionner le format de `tokens.json` ;
- documenter la politique de compatibilité ;
- évaluer un diff sémantique pour les revues.

## Critères de sortie du MVP

Le MVP est validé lorsque :

- plusieurs familles de composants passent sans règle liée à leur nom ;
- un composé réutilise réellement plusieurs dépendances et passe la parité ;
- les références de tokens cassées et les écarts d’API couverts empêchent la
  fusion avec un diagnostic actionnable ;
- un contrat peut précéder son code sans désactiver les contrôles futurs ;
- un agent en contexte froid n’invente ni prop, ni variante, ni token ;
- les limites non vérifiables sont documentées sans être présentées comme des
  garanties.

À ce stade, le projet pourra être proposé à une expérimentation sur un
catalogue plus large.
