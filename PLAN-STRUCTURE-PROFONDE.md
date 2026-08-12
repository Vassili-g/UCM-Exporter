# Plan — structure profonde et propriétés de mise en page

**Statut : révisé le 12 août 2026 — la livraison Flex 4.4 est validée sur
Alert et Button ; aucune extension structurelle supplémentaire n'est engagée.**

Les principes vivent dans [CONCEPT.md](./CONCEPT.md), le comportement actuel
dans [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), la maturité dans
[ROADMAP.md](./ROADMAP.md) et les options non engagées dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Ce que les contrats couvrent aujourd'hui

La 4.3 rend `structure.children` récursif uniquement pour les branches qui
portent plusieurs calques texte. Chaque vrai `TEXT` conserve ainsi sa
typographie et sa visibilité ; les dessins voisins et les composants unifiés
imbriqués ne deviennent pas des parts. Le slot direct reste l'identité publique
des icônes et de la composition.

La 4.4 ajoute le minimum de flux Flex justifié par les reconstructions froides :

- le conteneur auto-layout linéaire publie `justifyContent` et `alignItems` ;
- un slot direct publie seulement son `alignSelf` ou `flexGrow: 1` quand Figma
  le déclare ;
- les valeurs neutres, un node hors flux et les propriétés non applicables sont
  absents, jamais remplacés par un défaut CSS supposé ;
- les divergences de flux entre variants et les layers `Absolute` avertissent
  plutôt que d'être généralisés depuis le variant de référence.

Cette forme n'est pas un arbre Figma général : elle décrit les slots nécessaires
à une reconstruction vérifiable, sans exporter grille, wrap, coordonnées ou
dimensionnement implicite.

## Validations réalisées

Le 12 août 2026, les contrats Figma 4.4 d'Alert et de Button ont été reçus par
le Playground et reconstruits à froid, sans lecture du JSON au runtime.

| Observation | Résultat |
|---|---|
| Alert | Le contrat décrit le centrage vertical du flux racine, le remplissage du contenu, son flux interne et l'étirement de l'action. La reconstruction les reproduit et un test de rendu les relit dans le contrat. |
| Button | Le contrat décrit le centrage sur les deux axes de son flux. La reconstruction et son test de rendu le reprennent. |
| Tokens, icônes, booléens, composition et variantes | Les tests de rendu sont pilotés par les contrats ; `check-contract` confirme 36 références Alert et 255 références Button. |
| Chaîne de consommation | `npm run check` et `npm run build` du Playground passent avec 77 tests. |
| Exporteur | Le corpus réel Button 4.4 est déposé depuis son export Figma ; les 172 tests, le typecheck et le build passent. |

La reconstruction n'a révélé aucun nouveau champ nécessaire au-delà de la 4.4.
Elle confirme donc la limite actuelle au lieu de justifier une nouvelle version.

## Livraison 4.4 clôturée

Le corpus de l'Exporter contient désormais l'export Button 4.4 réellement
produit par Figma, sans simulation ni retouche. Il verrouille les alignements
Flex de la version au même titre que les contrats consommés par le Playground.
Une prochaine version de contrat devra de nouveau fournir son propre export
Figma avant de modifier ce corpus.

## Prochaine mesure, sans changement de schéma

Avant toute extension, continuer les reconstructions froides sur des composants
choisis pour exposer une limite distincte :

1. un composant composé de plusieurs dépendances ;
2. un composant interactif à booléens et états, tel que Checkbox ou TextField ;
3. un composant qui emploie réellement wrap, une grille, un padding asymétrique
   ou une propriété typographique non couverte.

Pour chaque cas, relever uniquement une décision qu'un agent ne peut pas prendre
depuis le contrat : node Figma concerné, propriété manquante, effet visuel et
propriété du contrat minimale qui la fermerait. L'absence d'écart est aussi un
résultat : elle interdit d'ajouter un champ par anticipation.

## Conditions avant un arbre général

Un arbre de layout plus général reste **non engagé**. Il ne pourra être proposé
qu'après une limite observée et avec, dans le même changement :

- une fonction pure unique qui décide si un node est un conteneur contractuel,
  une feuille, une dépendance composée ou un élément graphique interne ;
- des gardes d'applicabilité : auto-layout linéaire avant Flex, `WRAP` avant
  `rowGap`, `GRID` avant les propriétés de grille ;
- un traitement explicite de `figma.mixed` et des liaisons de texte par plage,
  qui ne doivent jamais disparaître silencieusement à la sérialisation ;
- des groupes conservés comme un seul élément de flux, sans les aplatir ;
- une comparaison de structure sur la matrice entière, une limite de profondeur
  et des diagnostics adressés au designer ;
- des chemins de slots définis en même temps que les validateurs du Playground,
  les icônes et la composition ;
- une migration de version et un réexport Figma des fixtures.

Les candidats `letterSpacing`, `textCase`, `textDecoration`, padding à quatre
côtés, wrap et grille restent des pistes. Ils ne deviennent pas des champs du
contrat tant qu'un composant réel n'établit pas leur propriétaire, leur forme et
leur comportement en cas de donnée facultative incomplète.
