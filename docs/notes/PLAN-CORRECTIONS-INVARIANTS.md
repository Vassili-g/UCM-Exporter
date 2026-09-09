# Corriger les invariants d'export et leurs contrôles

Liste de travail pour le mainteneur. Les cinq défauts énoncés ont été mesurés
dans le code avant d'être corrigés, et un sixième est apparu en vérifiant le
cinquième.

Les scénarios du moteur se construisent dans les tests, selon
[la règle de vérification](../../AGENTS.md#vérification). Chaque lot comprend
une reproduction du défaut, sa correction et une vérification du résultat.

## Ce que la mesure a corrigé dans cet énoncé

Les cinq défauts sont réels et se lisent tous dans le code. Trois points de
l'énoncé ont bougé.

- **Lot 2.** L'énoncé demandait de conserver les identités Figma brutes jusqu'à
  la résolution des collisions, puis de retenir un refus d'export. Les deux
  ensemble faisaient double emploi : dès lors que l'export refuse, aucun
  artefact ne sort et il n'y a plus rien à faire concorder. La correction tient
  en deux règles, la priorité des axes sur les autres propriétés et le refus
  d'une collision entre deux axes.
- **Lot 2, portée.** L'énoncé ne visait que la collision entre deux axes. Une
  collision entre un axe et une propriété d'un autre type cassait le même
  invariant, sans qu'aucun lecteur ne la refuse : l'axe perdait sa clé quand la
  propriété était déclarée avant lui, `structure.variantAxes` citait alors un
  nom que `props` décrivait comme un booléen. La priorité des axes la referme.
- **Lot 5, sixième défaut.** Faire consulter `estProtege` par la loi a montré
  que les motifs protégés se comparent sur un chemin découpé aux points. Une
  clé de couleur en porte un depuis la 5.5, et son placement vide sortait donc
  de la protection : l'élision le retirait en silence. Le lot 6 le corrige, et
  le lot 5 en dépend.

## 1. Rendre les adresses de slots non ambiguës

Dans [slotNames.ts](../../packages/plugin/src/contract/slotNames.ts),
`assignSlots` transformait les enfants `box`, `box`, `box-2` en slots `box`,
`box-2`, `box-2`. Les lois et le lecteur acceptaient cette collision.

- [x] Reproduire cette entrée dans `slotNames.test.ts` et par l'export de
  `exportComponent.test.ts`.
- [x] Attribuer les noms avec un ensemble des slots finaux déjà réservés par
  parent. Conserver le résultat actuel pour les arbres sans collision.
- [x] Vérifier les suffixes déjà présents, les noms normalisés identiques et
  les collisions avec les slots sémantiques `label` et `icon`.
- [x] Ajouter dans [lois.ts](../../packages/plugin/tests/lois.ts) une
  vérification récursive de l'unicité parmi les enfants d'un même parent.
  Autoriser un même nom sous deux parents distincts.
- [x] Ajouter le refus correspondant dans
  [validation-contrat.mjs](../../packages/kit/src/lecteurs/validation-contrat.mjs).
  Vérifier les structures exactes et la projection de référence.
- [x] Vérifier sur l'export que les chemins de typographie, de peintures,
  d'icônes et d'échantillons désignent chacun le calque attendu après renommage.

## 2. Traiter les collisions d'axes avant la publication

Avec `Kind=A, kind=B`, les props conservaient `kind: ["a"]`, les axes devenaient
`["kind", "kind"]` et le variant publiait `kind: "b"`. Le diagnostic annonçait
la conservation du premier axe, mais le lecteur refusait le contrat produit.

Fichiers concernés : [parsers.ts](../../packages/plugin/src/contract/parsers.ts)
et [exportComponent.ts](../../packages/plugin/src/contract/exportComponent.ts).

- [x] Reproduire les axes `Kind` et `kind`, puis inverser leur ordre de
  déclaration et vérifier aussi des noms distincts après ajout d'espaces.
- [x] Faire réserver aux axes leur clé publique avant les autres propriétés, ce
  qui rend la sortie indépendante de l'ordre des déclarations Figma et referme
  la collision entre un axe et une propriété d'un autre type.
- [x] Retenir un refus d'export lorsqu'une collision entre axes empêcherait de
  préserver leurs coordonnées. Définir cette précondition dans
  [SPEC.md](../../packages/plugin/SPEC.md#1-props) et vérifier qu'aucun artefact
  ne sort.
- [x] Rédiger le diagnostic avec
  [rediger-diagnostics-ucm](../../.agents/skills/rediger-diagnostics-ucm/SKILL.md) :
  désigner les deux propriétés et demander leur renommage dans Figma.
- [x] Vérifier que les collisions entre propriétés hors axes gardent leur
  traitement prévu et que les renommages sémantiques sans collision restent
  acceptés par le lecteur.

## 3. Limiter la convention State aux axes de variants

Dans [parsers.ts](../../packages/plugin/src/contract/parsers.ts), une propriété
`BOOLEAN` nommée `State#1:1` et une propriété `TEXT` nommée `Status#1:2`
disparaissaient sans diagnostic.

- [x] Reproduire cette perte dans `parsers.test.ts`.
- [x] Appliquer l'exclusion de `props` uniquement au type `VARIANT` pour les
  noms `State` et `Status`.
- [x] Vérifier les traductions des types `BOOLEAN`, `TEXT`, `INSTANCE_SWAP` et
  `SLOT` sous ces noms, avec leurs valeurs prises en charge.
- [x] Faire détenir sa clé publique à l'axe d'états, pour qu'une propriété
  homonyme d'un autre type soit signalée au lieu de la lui prendre.
- [x] Vérifier que les axes `State` et `Status` conservent leur `stateModel`,
  la prop dérivée `disabled` et la documentation des états, conformément à
  [la convention du format](../FORMAT.md#1-props).

## 4. Vérifier le contenu de l'union des dépendances

Dans [lois.ts](../../packages/plugin/tests/lois.ts),
`composesEstLUnionMaximale` acceptait le remplacement de `Child` par `Other`
dans l'agrégat global, ainsi que la suppression de cet agrégat. Le contrôle
du graphe chez le consommateur refuse ces deux mutations.

- [x] Construire un contrat composé valide par le moteur, vérifier son
  acceptation, puis muter son agrégat dans des tests de la loi.
- [x] Faire échouer la loi sur une dépendance remplacée, un agrégat absent,
  une occurrence manquante ou supplémentaire et une séquence permutée.
- [x] Comparer l'union ordonnée dérivée de `variants`, après résolution de leurs
  vues, au contenu du `composes` global. Inclure `component`, `figmaLayer` et
  `visibilityProp` dans l'identité comparée, sans appeler la fonction de fusion
  du moteur pour fabriquer l'attendu.
- [x] Vérifier les occurrences multiples et les dépendances dont la visibilité
  change entre variants. Accepter l'absence d'agrégat quand aucune vue ne
  contient de dépendance.
- [x] Conserver les tests du graphe dans le kit pour distinguer le contrôle
  interne du contrat de la présence effective des contrats voisins.

## 5. Accepter les tailles vides protégées par l'élision

Un export avec deux tailles `Small` et `Large`, des espacements et rayons à zéro,
sans dimensions liées, produit `sizes: { small: {}, large: {} }`. Le lecteur
acceptait cette forme, mais la loi d'élision la refusait : `sizes` manquait dans
sa liste de dictionnaires.

- [x] Ajouter ce scénario à `exportComponent.test.ts` en conservant le passage
  par toutes les lois, le schéma et le lecteur.
- [x] Corriger la loi selon les exceptions définies dans
  [elideNeutrals.ts](../../packages/plugin/src/contract/elideNeutrals.ts).
  Vérifier les chemins protégés au lieu d'autoriser tout objet vide.
- [x] Vérifier que `small` et `large` restent publiés et sélectionnables après
  sérialisation, avec une valeur `{}` pour chacun.
- [x] Conserver les refus des valeurs neutres interdites et les cas acceptés
  des états sans sélecteur et des chemins de peinture ciblant la racine.
- [x] Vérifier le passage unique d'élision, notamment la conservation des
  objets devenus vides pendant ce passage.

## 6. Protéger un placement dont la clé de couleur porte un point

Dans [elideNeutrals.ts](../../packages/plugin/src/contract/elideNeutrals.ts),
`estProtege` découpait le chemin aux points. Une clé de couleur allongée par
[colorKeys.ts](../../packages/plugin/src/contract/colorKeys.ts) en porte un, si
bien que `viewPaintPlacements.<vue>.strokes.base.border` comptait cinq segments
là où le motif en attend quatre : l'élision retirait ce placement vide, dont la
clé nomme pourtant la couleur.

- [x] Mesurer le retrait sur une valeur portant les deux écritures de clé, avec
  et sans point.
- [x] Transporter le chemin en segments, pour qu'une clé venue de Figma en
  occupe exactement un. Conserver les motifs écrits en toutes lettres.
- [x] Vérifier que la loi d'élision et le moteur lisent la même autorité, et que
  la clé pointée survit à l'élision comme à la loi.

## Validation et compatibilité

- [x] Exécuter les tests ciblés de chaque lot, puis `npm test`,
  `npm run typecheck` et `npm run build` après intégration.
- [x] Vérifier pour chaque scénario corrigé soit l'acceptation de l'artefact
  par les lois, le schéma et le lecteur, soit le refus d'export attendu.
- [x] Relire les sections concernées de `FORMAT.md`, `SPEC.md` et `AGENTS.md` ;
  y décrire les règles retenues et leurs limites.
- [x] Classer les changements selon [COMPATIBILITE.md](../COMPATIBILITE.md),
  en particulier le renommage des slots et les nouveaux refus du lecteur.
  Consulter [CHANGELOG-FORMAT.md](../CHANGELOG-FORMAT.md) avant de décider si
  la version de contrat doit changer. Aucune forme ne bouge : la version reste
  la 12.0, et le changelog nomme la classe de chacune des quatre corrections.
- [x] Ajuster les versions des paquets publiables modifiés et leurs pins selon
  les contrôles du dépôt. Régénérer le schéma si les types du format changent.
  `types.ts` n'a pas bougé, donc le schéma non plus.
- [x] Vérifier la fenêtre de lecture sans modifier les fixtures figées `11.0`.
  Aucun des quatre contrats ne porte de slots homonymes sous un même parent.
- [ ] Faire réexporter dans Figma les cas de collisions et de propriétés
  natives, puis vérifier les diagnostics et les artefacts obtenus. Consigner
  séparément cette vérification runtime et les résultats des tests synthétiques.
