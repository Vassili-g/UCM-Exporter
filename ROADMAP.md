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
| Contrat 10.3 | L’Exporter publie les vues exactes et un `samples` récursif non normatif. Les `args` d’une dépendance viennent de sa surface publique directe et de son seul wrapper élu ; le contenu rendu suit la visibilité effective ; les comparaisons positionnelles s’arrêtent aux `SLOT`. Ces lois sont couvertes par des arbres synthétiques sans nom de composant du corpus |
| Consommation 10.3 | Le Playground documente une reconstruction récursive relative au propriétaire immédiat, sans recherche globale ni limite de profondeur. `validation-echantillons.mjs` joint TOUTES les adresses d’un échantillon — clés et valeurs d’`args`, `masterPath`, `composes` imbriqué, `slotPath` d’une racine et d’un texte — sur des contrats synthétiques, cas absents, ambigus et profonds compris. Aucun ne regarde QUELLE valeur est placée, et une racine omise reste tolérée |
| Validation Figma 10.3 | **À refaire après cette correction.** Seul un réexport humain peut confirmer les valeurs produites par l’API Figma. Les composants actuels du Playground sont des sondes jetables, pas des hypothèses du moteur ni un critère de généralité |
| Export DTCG | Variables locales, alias et modes exportés ; collisions et cycles diagnostiqués |
| Structure portable | Flex, wrap, grille, position absolue, arbres récursifs, tailles, bornes, typographie, icônes et composition couverts dans le vocabulaire du contrat |
| Dépendances composées | Détection sur toutes les pages, graphe acyclique, cardinalité et dépendances conditionnelles contrôlés |
| Contrôles du Playground | Forme et version des contrats, graphe, parité statique, références de tokens, tests de rendu co-localisés, génération des types et du CSS |
| Rapport CI | Les constats et avertissements de l’export sont agrégés dans le terminal, le résumé CI et le commentaire de pull request |
| Test froid | Le protocole générique est documenté et ses lois d’adressage sont testées. La preuve visuelle doit encore être rejouée sur un export frais ; aucun composant existant n’est considéré comme une preuve durable |
| Corpus de démonstration | Les composants et tests actuels servent d’exemples remplaçables. La maturité se mesure sur les invariants synthétiques, puis sur de nouvelles familles Figma choisies sans règle liée à leur nom |
| Protection de fusion | Non disponible sur le plan GitHub actuel : la CI détecte, mais une pull request rouge reste fusionnable |
| Interopérabilité | Le JSON Schema du contrat est publié dans `schema/`, dérivé de `types.ts` et vendu au Playground pour l’éditeur ; il décrit la forme, jamais la cohérence, et ne bloque aucune fusion. `tokens.json` n’a toujours pas de version propre |
| Multi-marque au runtime | Les modes sont exportés, mais leur projection CSS et leur sélection ne sont pas implémentées |

Le projet est un **prototype avancé**. Le pipeline Figma → pull request → CI →
`main` a déjà été exercé sur des contrats réels, mais les corrections de
projection compatibles avec la 10.3 exigent un nouveau passage humain dans
Figma. Les preuves durables portent sur des lois du moteur ; les composants du
corpus constatent un comportement à une date donnée et restent remplaçables.

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
dans une règle de code peut échapper à l’analyse statique. Quelques tests de
rendu pilotés par le contrat existent dans le corpus de démonstration, mais ils
restent jetables et aucun vérificateur générique n’exerce encore toutes les vues
exactes d’un composant arbitraire. La proposition correspondante est détaillée dans
[PLAN-CONFORMITE-DEV.md](./PLAN-CONFORMITE-DEV.md) ; elle n’est pas engagée.

C’est là, et nulle part ailleurs, que vit la preuve de bout en bout. Les
jointures d’adresses du Playground constatent que deux contrats se joignent ;
elles ne constatent à aucun moment qu’une reconstruction a effectivement
consommé l’échantillon. Le vérificateur générique le ferait — un embryon existe
déjà, qui rend le TSX et compte les dépendances de chaque composé. Ce qu’il ne
faut PAS faire en attendant : écrire dans le Playground une fonction de
reconstruction. Ce serait une seconde implémentation du protocole que porte le
skill `consommer-contrat`, deux implémentations divergent, et c’est celle qui
n’est pas jetable qui deviendrait la vérité — exactement ce que le corpus de
démonstration est censé ne jamais devenir.

### Un remplacement natif publie un identifiant, pas un nom

La valeur par défaut d’une component property `INSTANCE_SWAP` ou `SLOT`, et les
clés de ses `preferredValues`, sortent de Figma comme identifiants opaques
(« 1:1 », clé de publication) et sont republiées telles quelles. Le développeur
ne peut ni les lire, ni les écrire, ce que la règle du contrat portable
interdit. Latent tant qu’aucun composant du corpus n’expose de remplacement
natif — les props d’icône synthétiques des règles `@icons` publient `null` —
mais sur le chemin nominal de la composition d’icônes. La correction demande de
nommer le node maître, que `parsers.ts` n’a pas et ne doit pas aller chercher
lui-même : elle est détaillée dans [PLAN-SWAP-NOMME.md](./PLAN-SWAP-NOMME.md),
et n’est pas engagée.

## Prochaines validations

### 1. Fermer la validation 10.3

1. Réexporter depuis Figma un composant composé choisi après l’implémentation,
   avec plusieurs occurrences, des homonymes, un wrapper exposé, un `SLOT` et
   au moins trois niveaux d’imbrication. Ne corriger aucun JSON à la main.
2. Reconstruire ce composant en contexte froid avec le protocole récursif,
   sans modifier un composant existant et sans ajouter de branche liée à son
   nom. Comparer ensuite le rendu à Figma.

Le coût du relevé de composition sur une grosse matrice n’entre pas dans cette
clôture : c’est une dette de performance, elle a maintenant une cause nommée, et
elle est rangée avec les fragilités connues.

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

- documenter le schéma là où il est muet : 85 de ses 179 propriétés n’ont
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
