# Roadmap — UCM

Ce document suit la maturité du projet et les validations restantes. Les
principes sont dans [CONCEPT.md](./CONCEPT.md), le comportement actuel dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), et les options non engagées dans
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
| Contrat 10.1 | L’Exporter situe les peintures dans les vues exactes, signale toute peinture posée à la main, conserve les pistes FIXED de grille en pixels et publie dans `structuralSize` la mesure d’une cellule dont la piste hug |
| Consommation 10.1 | Le Playground valide `structuralSize` comme une mesure en pixels distincte de `size`, et la pose telle quelle sur les tuiles de StressTest ; un test de rendu l’exerce |
| Validation Figma 10.1 | Les quatre composants ont été réexportés depuis Figma en 10.1, fusionnés dans le Playground et déposés dans le corpus `tests/test-exports/` de l’Exporter. L’export de Button ne porte plus aucun avertissement et ses 90 variants partagent enfin la même vue ; celui de StressTest publie la mesure de ses cellules sous une piste qui hug |
| Export DTCG | Variables locales, alias et modes exportés ; collisions et cycles diagnostiqués |
| Structure portable | Flex, wrap, grille, position absolue, arbres récursifs, tailles, bornes, typographie, icônes et composition couverts dans le vocabulaire du contrat |
| Dépendances composées | Détection sur toutes les pages, graphe acyclique, cardinalité et dépendances conditionnelles contrôlés |
| Contrôles du Playground | Forme et version des contrats, graphe, parité statique, références de tokens, tests de rendu co-localisés, génération des types et du CSS |
| Rapport CI | Les constats et avertissements de l’export sont agrégés dans le terminal, le résumé CI et le commentaire de pull request |
| Test froid | Les quatre composants du Playground ont été reconstruits depuis les seuls contrats et le skill, et `npm run check` est vert. Le test a trouvé deux pertes réelles — une icône dont le fill avait perdu sa variable, et une grille dont les pistes qui hug retombaient à zéro — toutes deux fermées : la première par un avertissement d’export et une correction dans Figma, la seconde par `structuralSize` |
| Multi-composants | Button, Alert, TileLink et StressTest ont une implémentation ; StressTest exerce grille, wrap, champs asymétriques et composition multiple, et TileLink publie désormais son sizing tokenisé |
| Protection de fusion | Non disponible sur le plan GitHub actuel : la CI détecte, mais une pull request rouge reste fusionnable |
| Interopérabilité | Le JSON Schema du contrat est publié dans `schema/`, dérivé de `types.ts` et vendu au Playground pour l’éditeur ; il décrit la forme, jamais la cohérence, et ne bloque aucune fusion. `tokens.json` n’a toujours pas de version propre |
| Multi-marque au runtime | Les modes sont exportés, mais leur projection CSS et leur sélection ne sont pas implémentées |

Le projet est un **prototype avancé**. Le pipeline Figma → pull request → CI →
`main` est éprouvé avec des contrats réels de la version courante, que le
corpus de référence de
l’Exporter verrouille et qu’un test de rendu exerce. Cette preuve porte sur
l’extraction, la validation et la consommation statique ; elle ne prouve ni la
fraîcheur d’un export, ni une ressemblance visuelle complète avec Figma.

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

### La CI détecte sans empêcher la fusion

Les repositories privés n’ont pas accès aux protections de branche avec le plan
GitHub actuel. Sans protection de `main` ni `CODEOWNERS`, les contrôles restent
consultatifs. La documentation doit donc parler de détection, jamais de
prévention.

### La preuve du rendu reste ciblée

Les références de tokens littérales sont comparables au contrat ; un chemin
assemblé à l’exécution est refusé. En revanche, une donnée visuelle recopiée
dans une règle de code peut échapper à l’analyse statique. Des tests de rendu
pilotés par le contrat existent pour Alert et Button, mais ils doivent suivre la
résolution v10 et aucun vérificateur générique n’exerce encore tous les composants
et toutes leurs vues exactes. La proposition correspondante est détaillée dans
[PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md) ; elle n’est pas engagée.

## Prochaines validations

### 1. Fermer la validation 10.1

1. Vérifier visuellement TilesGrid, Divider, TileLink, ScaleWrap et les
   peintures situées de StressTest dans le navigateur, sans modifier ses TSX :
   la conformité statique est verte, la ressemblance ne l’est pas encore.
2. Étendre les tests de rendu aux états que `renderToStaticMarkup` n’atteint
   pas. La perte de Button vivait sur `hover`, et aucun test co-localisé ne
   franchit aujourd’hui l’état par défaut.

### 2. Éprouver d’autres familles de composants

Choisir les cas pour leur différence, pas pour leur nombre :

- un composant interactif avec booléens et états ;
- un composé avec plusieurs types de dépendances ;
- un composant qui exerce réellement wrap, grille ou position absolue ;
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
