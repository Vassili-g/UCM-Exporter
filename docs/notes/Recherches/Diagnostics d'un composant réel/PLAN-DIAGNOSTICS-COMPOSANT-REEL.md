# Plan de correction des diagnostics relevés sur un composant réel

> Statut : prêt à exécuter. Les faits de la section 3 ont été mesurés dans Figma
> ou relus dans le code, puis contrôlés par une relecture indépendante. L1 à L4,
> L6 et L9 corrigent le moteur sans changer la forme du contrat ; L2 et L3
> modifient un texte normatif de `FORMAT.md`. L5 et L7 modifient un invariant
> d'`AGENTS.md` et attendent H2. L8 prépare une évolution du format et attend
> H3.

## Instruction donnée à l'agent

Exécuter les lots dans l'ordre de la section 7. Après une interruption,
reprendre depuis le journal de preuves (section 6). Ne rendre la main qu'aux
portes humaines H1, H2 et H3, sur un contrôle de référence rouge, sur une
modification étrangère qui recouvre un fichier visé, ou quand le code contredit
un fait de la section 3. Dans ce dernier cas, le journal consigne le fait, la
mesure qui le contredit et le lot arrêté.

L'agent travaille dans `UCM-Exporter`. Il n'ouvre pas Figma et ne dispose pas
du fichier analysé : les faits de la section 3 sont sa seule source sur ce
composant. Il ne modifie aucun fichier d'UCM-Playground.

Avant d'écrire un document ou un commentaire, charger la skill
`rediger-sans-tics-ia`. Avant d'écrire un texte lu par le designer, charger
aussi `rediger-diagnostics-ucm` et passer par H1.

## 1. Point de départ

L'analyse d'un component set de bouton, pris dans un design system en
production, a produit environ 194 lignes « À corriger dans Figma ». Le set
compte 140 variants sur trois axes : une couleur à 7 valeurs, une variante à 4
valeurs et un état à 5 valeurs (`Default`, `Hover`, `Focused`, `Pressed`,
`Disabled`).

| Famille de messages | Lignes | Calques visés | Cause |
|---|---|---|---|
| `min width` sans variable, un message par variant | 140 | 140 | Figma pour le fond, moteur pour le regroupement (E1) |
| `effect` sans champ dans le contrat | 28 | 28 | Moteur : regroupement (E1) et format (E3) |
| Calque d'onde de pression et ses enfants | 11 | 28 chacun | Moteur (E5) |
| Dessin sans règle `@icons` dans un composant imbriqué | 2 | 280 | Moteur (E4) |
| `height` d'un calque texte masqué | 1 | 35 | Moteur (E8) |
| États `focused` et `pressed` non reconnus | 2 | aucun | Moteur (E2) |
| Aucune règle `@usage` | 1 | aucun | Moteur (E7) |
| Règle `@icons « icon-name »` | 1 | aucun | Figma (maître ancien), moteur pour la création (E6) |
| Règles à rédiger, conteneur en double, imbriqué sans règles, radius et stroke weight | 7 | variable | Figma |
| Collision d'identifiant de contrat | 1 | aucun | Contexte de recette, texte à préciser (E9) |

Le résultat visé est une liste où chaque ligne demande un geste distinct. La
section L10 donne la liste attendue sur ce composant après les lots.

## 2. Ce qui reste au design system

Ces points sont justes. Aucun lot ne les fait taire.

- Le composant d'icône imbriqué n'a pas de règles. Il déclare trois variant
  properties, et le point bloquant le dit.
- Deux instances de `.componentRules` écrivent le même nom de composant. La
  création refuse déjà de poser un second conteneur :
  `offreDeCreation` rend `null` dès que la page en porte un
  ([sources.ts:48](../../../../packages/plugin-exporter/src/template/sources.ts#L48)),
  et `extractRules` le cherche dans toute la page, cadres compris
  ([extractRules.ts:442](../../../../packages/plugin-exporter/src/contract/extractRules.ts#L442)).
  Le doublon vient d'une copie manuelle.
- Les 23 règles posées portent encore le marqueur `[À compléter]`.
- Le maître `.ruleItem` du fichier est antérieur au maître courant : son calque
  `icon` écrit `icon-name` sans marqueur (F13). La règle `@icons` déjà posée se
  rédige ou se supprime dans Figma.
- Chaque racine de variant fixe un `min width` de 32 sans variable.
- Le corner radius du wrapper n'est lié que dans trois variantes sur quatre, et
  le stroke weight ne l'est jamais.
- Le wrapper exposé porte un axe nommé `Property 1`, qui entre tel quel dans les
  props du parent.
- Le calque d'onde de pression est accroché en haut à gauche avec une taille
  fixe : il ne suit pas la largeur du bouton.

## 3. Faits vérifiés

Chaque fait porte sa source. Un fait mesuré dans Figma ne se remesure pas dans
ce plan ; le journal cite son numéro quand un test l'encode.

### Structure du composant

- **F1.** Chaque racine de variant est un auto layout vertical en hug, avec
  `minWidth` 32 sans variable. Son seul enfant dans le flux est une instance
  d'un composant interne dont le nom commence par un point. Cette instance est
  exposée (`isExposedInstance`), porte les paddings, la hauteur et le fill liés
  à des variables, et un axe `Property 1` à trois valeurs de taille.
- **F2.** Dans ce wrapper, deux instances d'un composant d'icône publié
  (variant properties `fontSize`, `Background`, `Color`) encadrent un cadre
  texte. Chaque icône contient une instance d'un composant distant fait d'un
  seul `VECTOR`.
- **F3.** 28 racines portent un effect style d'ombre : l'état focus de trois
  variantes sur quatre, et l'état pressé d'une variante. Les champs `offsetX`,
  `offsetY`, `radius` et `spread` de l'effet sont liés à des variables
  (`boundVariables.effects` présent, `effectStyleId` non vide). L'API permet ces
  liaisons (`VariableBindableEffectField`) et celle de l'opacité d'un calque
  (`VariableBindableNodeField` contient `opacity`).
- **F4.** Les 28 variants `Pressed` portent, à côté du wrapper, une instance en
  `layoutPositioning: ABSOLUTE`, contraintes `MIN/MIN`, taille fixe égale à
  celle du bouton, opacité 0,3. Elle contient deux `RECTANGLE` sans auto
  layout : un masque (`isMask`) et un cercle (radius 100), tous deux en
  contraintes `SCALE/SCALE`, avec leurs fills liés.

### Comportement de l'API Figma

- **F5.** Un enfant masqué d'un auto layout horizontal, réglé `Fill` en hauteur,
  rend `layoutSizingVertical: FIXED` et garde `layoutAlign: STRETCH`. Le même
  calque visible rend `FILL`. Le maître rend `FILL`, et l'instance ne porte
  aucune surcharge de dimensionnement sur ce calque. Sur le composant analysé,
  les 35 variants de la variante sans libellé masquent ce calque texte par une
  boolean property, et ce sont les 35 calques visés par le message `height`.

### Code du moteur

- **F6.** Les doublons se fusionnent sur la phrase entière
  ([localisation.ts:184](../../../../packages/plugin-exporter/src/contract/localisation.ts#L184)).
  `sujet()` écrit `Layer « nom du node »`
  ([localisation.ts:151](../../../../packages/plugin-exporter/src/contract/localisation.ts#L151)).
  Le nom d'une racine de variant change d'un variant à l'autre, donc chaque
  racine produit sa propre ligne. Le sujet se forme en trois endroits :
  `pousserLocalise`, `pousserNote(…, sujet(…))`
  ([extractLayout.ts:143](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L143))
  et `pointDe(sujet(…).texte, …)`
  ([unsupportedProperties.ts:315](../../../../packages/plugin-exporter/src/contract/unsupportedProperties.ts#L315)).
- **F7.** Chaque variant reçoit une vue exacte extraite depuis sa vraie racine
  ([extractStructure.ts:259](../../../../packages/plugin-exporter/src/contract/extractStructure.ts#L259)).
  Cette extraction passe la racine à `warnUnsupportedProperties`
  ([extractLayout.ts:749](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L749))
  et à `resolveSizeBounds`
  ([extractLayout.ts:776](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L776)),
  d'où les 140 messages `min width` et les 28 messages `effect`. Elle publie
  aussi les enfants de la racine, calque d'onde compris, et relève leurs
  propriétés ([extractLayout.ts:428](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L428)).
- **F8.** La projection de référence élit le wrapper
  ([layoutNodes.ts:35](../../../../packages/plugin-exporter/src/contract/layoutNodes.ts#L35)),
  et `warnLayersOutsideLayoutNode` avertit que le calque d'onde « n'y figure
  pas, et le développeur ne le rendra pas »
  ([extractLayout.ts:641](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L641)).
  Elle est appelée pour la référence
  ([extractLayout.ts:746](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L746))
  et pour chaque autre variant
  ([extractStructure.ts:207](../../../../packages/plugin-exporter/src/contract/extractStructure.ts#L207)),
  dans le canal `notices`, publié en `UCM_EXPORT_NOTICE`
  ([exportComponent.ts:366](../../../../packages/plugin-exporter/src/contract/exportComponent.ts#L366)).
  Le format fait des vues exactes l'autorité
  ([FORMAT.md, « Versions »](../../../format/FORMAT.md#versions) : la
  projection de référence « ne remplace jamais la vue exacte d’une variante »),
  et la procédure du consommateur rend la vue exacte de chaque variant
  ([procedure.md:22](../../../../packages/cli/procedure.md#L22)). Aucun
  consommateur ne rend `structure.children`. L'impact écrit par ce message est
  donc faux pour un calque que la vue exacte publie.
- **F9.** `fixedDimensions` tient pour figé tout axe qui ne lit ni `HUG` ni
  `FILL` ([flexLayout.ts:463](../../../../packages/plugin-exporter/src/contract/flexLayout.ts#L463)).
  Avec F5, un calque masqué en `Fill` réclame une variable de hauteur, alors que
  `flexItemProperties` publie pour lui `alignSelf: stretch`
  ([flexLayout.ts:569](../../../../packages/plugin-exporter/src/contract/flexLayout.ts#L569)).
  Le contrat se contredit sur ce calque. `fixedDimensions` ne reçoit pas le
  parent, et `resolveContainerSizing` l'appelle aussi sur la racine du
  composant ([nodeBindings.ts:864](../../../../packages/plugin-exporter/src/contract/nodeBindings.ts#L864)).
- **F10.** `STATE_SELECTORS` accepte `disabled` à côté de `disable`, mais
  aucune autre forme en `-ed`
  ([semantics.ts:28](../../../../packages/plugin-exporter/src/contract/semantics.ts#L28)).
  Aucun lecteur du kit, de la CLI ni de l'adaptateur ne lit ces noms d'état.
- **F11.** `warnUndeclaredDrawing`
  ([extractLayout.ts:161](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L161))
  s'applique à tout calque qui n'est pas une dépendance reconnue (garde en
  [extractLayout.ts:426](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L426)).
  Un composant publié sans règles n'est pas reconnu, donc ses dessins internes
  avertissent. Ce message rend `meta.coverage.portable` partiel
  (`addProjectionWarnings`,
  [exportComponent.ts:367](../../../../packages/plugin-exporter/src/contract/exportComponent.ts#L367)).
  Le point bloquant « intègre X, dont N propriétés ne sont pas documentées »
  ne passe pas par le moteur : `releverLesImbriques`
  ([code.ts:1205](../../../../packages/plugin-exporter/src/code.ts#L1205)) le
  calcule dans le sandbox, `signalerLesImbriques` l'envoie à l'interface seule
  ([code.ts:1317](../../../../packages/plugin-exporter/src/code.ts#L1317)), et
  il n'entre qu'au compteur
  ([code.ts:733](../../../../packages/plugin-exporter/src/code.ts#L733)). Il
  est absent de `meta.diagnostics` et de la demande de fusion. Deux fonctions
  disent « composant interne » : `dansUnComposantPublie`
  ([extractLayout.ts:593](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L593))
  et `estUnePieceInterne`
  ([code.ts:1056](../../../../packages/plugin-exporter/src/code.ts#L1056)).
  Le moteur connaît déjà le maître de chaque instance :
  `scanComposedMatrix` rend `mainByInstanceId`
  ([composedComponents.ts:497](../../../../packages/plugin-exporter/src/contract/composedComponents.ts#L497)).
- **F12.** Le message « aucune règle @usage » ne teste que `rules.intent`
  ([exportComponent.ts:415](../../../../packages/plugin-exporter/src/contract/exportComponent.ts#L415)).
  Une règle `@usage` marquée n'alimente pas `intent` et produit déjà sa ligne
  « contient encore [À compléter] » (`signalerNonRedigees`,
  [extractRules.ts:361](../../../../packages/plugin-exporter/src/contract/extractRules.ts#L361)).
  L'invariant d'`AGENTS.md` dit qu'une règle marquée « ne produit que son
  warning ». Le commentaire de
  [template.test.ts:505](../../../../packages/plugin-exporter/tests/template.test.ts#L505)
  renvoie pourtant l'absence d'intention « à l'export du composant » : la double
  ligne vient de ce renvoi.
- **F13.** Le maître `.ruleItem` courant porte le marqueur dans le calque
  `icon` de sa variante `@icons`
  ([template.test.ts:263](../../../../packages/plugin-exporter/tests/template.test.ts#L263)),
  et `CALQUES_LUS.icons` l'y cherche
  ([extractRules.ts:348](../../../../packages/plugin-exporter/src/contract/extractRules.ts#L348)).
  La création accepte un maître plus ancien qui écrit `icon-name` sans marqueur :
  `AIDES_LUES` exclut `@icons` par décision
  ([sources.ts:297](../../../../packages/plugin-exporter/src/template/sources.ts#L297),
  test en [template.test.ts:431](../../../../packages/plugin-exporter/tests/template.test.ts#L431)).
  La règle posée avec ce maître est lue comme rédigée, d'où « ni le layer
  modifiable ni le layer strict n'est visible seul ».
- **F14.** Les enfants d'un cadre sans auto layout ne reçoivent aucune place :
  `flexItemProperties` rend `{}` hors position absolue, grille et auto layout
  linéaire. Le moteur avertit alors « il range N layers mais n'utilise pas
  d'auto layout »
  ([extractLayout.ts:252](../../../../packages/plugin-exporter/src/contract/extractLayout.ts#L252)).
  Le format réserve `constraints` et `inset` aux calques en position `Absolute`
  ([FORMAT.md, « Position absolue »](../../../format/FORMAT.md#position-absolue)).
- **F15.** La détection de collision compare `componentKey`, puis `nodeId`
  ([identite.ts:91](../../../../packages/kit/src/format/identite.ts#L91)). Elle
  est juste. Le message nomme les deux composants par leur seul nom et demande
  d'en renommer un ([depot.ts:381](../../../../packages/plugin-exporter/src/depot.ts#L381)),
  alors que l'identité lue porte aussi `fileName`. `VerdictIdentite` est un
  type public du kit ([format/index.ts:69](../../../../packages/kit/src/format/index.ts#L69)).
- **F16.** Deux textes normatifs décrivent le comportement que L2 et L3
  changent. `FORMAT.md` énumère les états reconnus et leur priorité
  ([« 4. Modèle d'interaction »](../../../format/FORMAT.md#4-modèle-dinteraction)).
  `FORMAT.md` (« Flux et alignement ») et l'invariant d'`AGENTS.md` sur le menu
  de dimensionnement disent que ce menu prévaut sur `layoutAlign` et
  `layoutGrow`, et qu'un axe `Fixed` cite une variable.
- **F17.** Les messages sur les représentants de tailles d'un wrapper nomment
  leur variant, et un test l'exige
  ([extractSizes.test.ts:307](../../../../packages/plugin-exporter/tests/extractSizes.test.ts#L307)).
  Ces représentants sont des variants d'un autre component set que celui
  exporté.

## 4. Décisions prises et hors périmètre

- Aucune loi existante ne se relâche pour faire passer un lot. Un conflit avec
  un invariant d'`AGENTS.md` arrête le lot et part à la porte concernée.
- Les tests construisent des arbres synthétiques à noms neutres (`Root`,
  `Wrapper`, `Glyph`, `Overlay`). Aucun test ne reconstruit le composant
  analysé ni ne cite un de ses noms de calque.
- Un comportement de l'API mesuré dans Figma (F5) s'encode dans le faux node du
  test et dans un commentaire « Mesuré : … » au site qui en dépend.
- `contractVersion` ne change dans aucun lot de ce plan. L2 change le contenu
  de `stateModel` sans changer sa forme.
- Hors périmètre : la publication npm, les captures de galerie, une refonte de
  l'élection du node de layout, le relevé des propriétés d'un composant exposé
  (`Property 1`).

## 5. Règles d'exécution

Chaque lot suit cette séquence :

1. écrire le test du comportement visé, sur un arbre synthétique ;
2. le lancer et constater l'échec pour la raison attendue ;
3. appliquer le changement minimal ;
4. passer les tests ciblés, puis `npm test`, `npm run typecheck` et
   `npm run build` à la racine ;
5. muter la ligne exacte que le test protège, constater le rouge, restaurer par
   copie de sauvegarde, constater le vert ;
6. relire le diff, puis `git diff --check` ;
7. mettre à jour le journal ;
8. commiter par chemins, puis pousser sur `main`.

Un lot qui change un comportement décrit par `FORMAT.md`, `SPEC.md` ou
`AGENTS.md` met ce texte à jour dans son commit.

Règles de dépôt :

- Commiter avec `git commit --only -F <message> -- <chemins>`, jamais sans
  chemins : d'autres sessions partagent l'index. Lire `git diff --cached
  --name-only` avant. Pousser si `git rev-list --left-right --count
  origin/main...main` ne montre aucun retard ; sinon `git pull --ff-only`,
  jamais de rebase.
- Aucune branche, aucune pull request.
- Ne jamais restaurer un fichier par `git checkout --` : copier avant la
  mutation, recopier après.
- Vérifier les fins de ligne par `git ls-files --eol` avant d'écrire un
  fichier ; le dépôt est en LF.
- Si une autre session modifie la copie de travail pendant un lot, vérifier le
  lot dans un worktree isolé : `git -c core.autocrlf=false worktree add
  --detach <dossier> <commit>`, `npm ci`, étapes du build lancées une par une.
- Aucun identifiant du fichier analysé, de son équipe ni de son design system
  dans le dépôt, messages de commit compris. Ce plan n'en contient aucun ;
  relire chaque diff avec cette règle avant de commiter.
- Un plafond de compteur ne bouge qu'à la fin du lot qui change les fichiers
  mesurés.
- Le message de commit termine par la ligne d'attribution demandée par
  l'environnement.

## 6. Journal de preuves

L0 crée `PREUVES-DIAGNOSTICS-COMPOSANT-REEL.md` dans ce dossier, sous cette
forme :

```markdown
# Preuves des diagnostics d'un composant réel

## État

- Lot courant : L0
- Branche et HEAD :
- Dernière porte franchie : aucune

## Lots

### L0 : référence

- Commit :
- Commandes :
- Résultats :
- Mutations :
- Écart ou réserve : aucun
```

Chaque commande porte son code de sortie et un résultat court. Une réserve non
résolue arrête le lot suivant.

Au début du travail et après une interruption : lire `AGENTS.md`,
`CONTRIBUTING.md`, ce plan et le journal ; relever `git rev-parse HEAD` et
`git status --short` ; comparer au journal ; relancer le dernier contrôle vert ;
reprendre à la première action sans preuve.

## 7. Lots

Ordre : L0, L1, L2, L3, L4, H1, L6, L9, R1, H2, L5, L7, L8, H3, L10.

### L0 : référence et scénario de reproduction

But : fixer un état vert et un scénario qui reproduit les défauts avant tout
changement.

Fichiers autorisés : le journal ; un module d'aides de test
`packages/plugin-exporter/tests/aides/figmaFaux.ts` ; un fichier de test
`packages/plugin-exporter/tests/diagnosticsComposantReel.test.ts` ;
`exportComponent.test.ts`, seulement pour importer les aides déplacées.

- [ ] Relever la branche, `HEAD` et l'état ; passer `npm test`,
      `npm run typecheck`, `npm run build`.
- [ ] Déplacer vers le module d'aides les fabriques du faux `figma`
      d'`exportComponent.test.ts` (`node`, `regle`, `conteneurDeRegles`) et la
      fonction `handleExportComponent` de ce test, qui applique les lois.
      Aucune n'est exportée aujourd'hui. Vérifier que `exportComponent.test.ts`
      reste vert après le déplacement, sans changer un seul attendu.
- [ ] Construire un component set synthétique de trois variants qui réunit F1 à
      F5 : racine à `minWidth` brut et effet visible, wrapper interne en `.`,
      composant publié imbriqué à une variant property contenant un `VECTOR`,
      calque texte masqué par une boolean property qui rend `FIXED` et
      `STRETCH`, calque en position absolue à côté du wrapper contenant deux
      `RECTANGLE` en `SCALE`, axe d'état à valeurs `default`, `focused`,
      `pressed`. Le conteneur de règles porte un `@usage` marqué et une règle
      `@icons` dont le calque `icon` écrit `icon-name` sans marqueur.
- [ ] Faire passer le scénario par l'aide `handleExportComponent`, donc par
      `lois.ts`, la loi de localisation et la loi des parties.
- [ ] Consigner dans le journal le nombre de lignes par famille. Ces nombres
      sont les attendus rouges des lots suivants ; le test de L0 ne les fige
      pas.

Le point bloquant de l'imbriqué sans règles n'apparaît pas dans ce scénario :
il est produit par le sandbox, hors de `exporterLeComposant` (F11).

Critère de sortie : le scénario tourne, les lois passent, et chaque famille du
tableau de la section 1 marquée « Moteur » y apparaît au moins une fois, sauf
la collision (L9 a son propre test).

### L1 : une règle d'intention marquée ne produit que sa ligne (E7)

Faits : F12. Tests : `rules.test.ts`, `exportComponent.test.ts`.

- [ ] Exposer depuis `extractRules` les tags qui ont des règles marquées
      (la carte `nonRedigees` existe déjà,
      [extractRules.ts:517](../../../../packages/plugin-exporter/src/contract/extractRules.ts#L517)).
- [ ] Dans `exportComponent.ts`, ne pas pousser « aucune règle @usage, @do,
      @dont ou @pairs » quand l'un de ces quatre tags a une règle marquée.
- [ ] Réécrire le commentaire de `template.test.ts:505` : l'export ne redit
      l'absence d'intention que lorsqu'aucune règle d'intention n'est posée.
- [ ] Test : un conteneur dont la seule règle d'intention est un `@usage`
      marqué produit une ligne, celle du marqueur. Un conteneur sans règle
      d'intention garde le message actuel.
- [ ] Mutation : retirer la nouvelle condition, constater deux lignes.

### L2 : les formes en `-ed` des états (E2)

Faits : F10, F16. Test : `semantics.test.ts`.

- [ ] Ajouter `hovered`, `focused` et `pressed` à `STATE_SELECTORS`, avec le
      sélecteur de leur forme courte, et les ranger dans `STATE_PRECEDENCE` à
      côté de cette forme.
- [ ] Ne pas ajouter `active` : le mot désigne un état sélectionné dans
      beaucoup de design systems, et le rendre en `:active` fabriquerait un
      déclencheur faux. L'écrire dans le commentaire de la table.
- [ ] Laisser le texte de l'action inchangé : les formes ajoutées sont des
      graphies acceptées, la liste citée reste valide.
- [ ] Mettre à jour la section « 4. Modèle d'interaction » de `FORMAT.md` :
      graphies reconnues et priorité.
- [ ] Test : un axe `default | focused | pressed | disabled` ne produit aucun
      message et publie `:focus-visible`, `:active` et `[disabled]` ; l'ordre
      de `precedence` place `disabled`, puis `pressed`, puis `focused`.
- [ ] Mutation : retirer `focused` de la table, constater le message.

### L3 : un calque en `Fill` masqué ne réclame pas de variable (E8)

Faits : F5, F9, F16. Tests : `nodeBindings.test.ts`, `extractLayout.test.ts`.

- [ ] Localiser toutes les lectures du menu de dimensionnement :
      `fixedDimensions`, `childSizing`, et les appelants de `fixedDimensions`
      (`resolveSlotSize`, `gridStructuralSize`, `extractIconLayers`,
      `resolveContainerSizing`).
- [ ] Écrire une seule fonction qui lit un axe d'enfant avec son parent : sous
      un auto layout linéaire, un axe secondaire en `FIXED` avec
      `layoutAlign: STRETCH` se lit `FILL`, et un axe principal en `FIXED` avec
      `layoutGrow: 1` se lit `FILL`. `HUG` reste `HUG` quelle que soit la
      valeur historique. `fixedDimensions` et `childSizing` la consultent.
- [ ] Exclure de cette lecture la racine du composant, un enfant en position
      absolue (`isAbsolutePositioned`) et un enfant de grille : leur règle ne
      change pas.
- [ ] Commentaire au site : « Mesuré : un enfant masqué en Fill rend `FIXED` et
      garde `layoutAlign: STRETCH`. » Le cas `layoutGrow` n'a pas été mesuré :
      le commentaire le dit, et le test le couvre au même titre.
- [ ] Amender l'invariant d'`AGENTS.md` sur le menu de dimensionnement et la
      section « Flux et alignement » de `FORMAT.md` : ils disent aujourd'hui
      que le menu prévaut sur `layoutAlign` et `layoutGrow`, sans exception.
- [ ] Test : un calque masqué `FIXED` et `STRETCH` sur l'axe secondaire ne
      produit aucun message de dimension et publie `alignSelf: stretch`. Un
      calque visible `FIXED` sans `STRETCH` réclame toujours sa variable. Un
      calque `HUG` avec `STRETCH` garde `alignSelf` absent.
- [ ] Mutation : retirer la lecture de `layoutAlign`, constater le message
      `height`.

### L4 : la règle `@icons` créée porte le marqueur (E6)

Faits : F13. Test : `template.test.ts`.

Ce lot corrige les créations à venir. La règle déjà posée dans le fichier
analysé garde sa ligne (section 2).

- [ ] Dans `poserUnElement`, pour une règle `@icons` dont le calque `icon` du
      maître ne porte pas le marqueur, écrire dans ce calque le texte du maître
      précédé du marqueur. Un maître qui le porte déjà n'est pas réécrit.
      Relire l'écriture, comme les autres écritures de ce module.
- [ ] Vérifier que `aRediger` et la ligne « contient encore [À compléter] »
      comptent cette règle, et que le message de visibilité ne sort plus pour
      elle.
- [ ] Laisser `AIDES_LUES` inchangé : la création accepte toujours un maître
      ancien. Réécrire le commentaire de `sources.ts:297` et le test de
      `template.test.ts:431` pour dire que la création pose le marqueur.
- [ ] Test : avec un maître ancien, la règle `@icons` créée porte le marqueur
      dans `icon` et son analyse la compte parmi les règles à rédiger ; avec le
      maître courant, son texte reste celui du maître.
- [ ] Mutation : retirer l'écriture, constater le message de visibilité.

### Porte H1 : textes du designer

Avant L6 et L9, l'agent écrit `TEXTES-A-VALIDER.md` dans ce dossier. Pour
chaque message nouveau ou modifié, il propose deux ou trois rédactions côte à
côte, les trois parties séparées (titre, impact, action), avec un exemple rendu
sur le composant de la section 1. Pour L6, il propose aussi le genre du sujet :
`Layer « nom du set »` ferait chercher au designer un calque qui n'existe pas.
Il s'arrête. Le mainteneur choisit ou réécrit ; l'agent reprend avec le texte
retenu, mot pour mot.

### L6 : un message sur la racine se regroupe sur les variants (E1)

Faits : F6, F7, F17. Attend H1. Tests : `localisation.test.ts`,
`extractSizes.test.ts`, le scénario de L0.

- [ ] Recenser les sites qui peuvent viser une racine de variant du set
      exporté : au minimum `resolveSizeBounds` et `warnUnsupportedProperties`
      depuis la vue exacte, et tout `resolveField` sur cette racine. Les trois
      formes de F6 sont concernées.
- [ ] Passer aux sites l'identité du set exporté. Une racine se reconnaît à son
      appartenance à ce set, jamais au seul fait que son parent est un
      component set : les représentants de tailles d'un wrapper gardent le nom
      de leur variant (F17).
- [ ] Nommer le sujet d'une telle racine selon H1 et garder chaque variant
      comme cible. `sujetNomme`
      ([localisation.ts:168](../../../../packages/plugin-exporter/src/contract/localisation.ts#L168))
      sépare déjà le nom affiché du node ciblé. Le choix se fait à un seul
      endroit, que les trois formes consultent.
- [ ] Garder le genre `Variant` pour les messages qui parlent d'un variant
      précis (« il ne contient pas l'instance … »).
- [ ] Vérifier que `meta.diagnostics` et le corps de la demande de fusion
      portent la même ligne unique que la liste du plugin, et que
      « Sélectionner les N calques » sélectionne les N racines.
- [ ] Test : trois variants à `minWidth` brut donnent une ligne à trois
      cibles ; deux variants sur trois donnent une ligne à deux cibles ; le
      test de `extractSizes.test.ts:307` reste vert sans changement.
- [ ] Mutation : rendre le nom du node au sujet, constater trois lignes.
- [ ] Mettre à jour l'état de galerie ou le test d'interface qui cite un de
      ces messages, s'il en existe.

### L9 : le message de collision nomme les fichiers (E9)

Faits : F15. Attend H1. Tests : `packages/kit/tests/` pour l'identité,
`depot.test.ts` ou son équivalent pour le message.

- [ ] Faire porter à `VerdictIdentite` le `fileName` de chaque côté, déjà lu
      par `identiteDeContrat`. Ce champ ajouté change l'API publique du kit :
      le journal le note pour la prochaine publication.
- [ ] Écrire le message retenu à H1 : il nomme le fichier Figma de chaque
      composant quand les deux diffèrent, et propose le geste adapté au cas.
- [ ] Test : deux contrats de même nom venant de deux fichiers produisent le
      message qui nomme les deux fichiers.
- [ ] Mutation : retirer le `fileName` du message, constater l'échec.

### Revue R1 : conception de L5 et L7

Avant d'écrire du code pour L5 et L7, faire relire leur conception par un
agent indépendant, avec ce plan, F7, F8, F11, F14 et le code cité. La revue
élargit la recherche de défauts ; l'agent vérifie chaque affirmation dans le
code avant de la retenir, et consigne dans le journal ce qu'il retient et ce
qu'il rejette, avec la raison.

### Porte H2 : invariants de L5 et L7

L'agent présente au mainteneur la conception de L5 et de L7, le résultat de
R1 et les textes touchés, puis s'arrête. Il dit en particulier :

- pour L5, que le point bloquant entre dans `meta.diagnostics` et dans la
  demande de fusion, et quel code il y porte ;
- pour L7, que la vue exacte publie presque tout calque écarté par
  l'élection : l'invariant « Ce que l'élection écarte est dit » disparaît en
  pratique.

### L5 : les internes d'un imbriqué sans règles se taisent (E4)

Faits : F2, F11. Attend R1 et H2. Tests : `code.test.ts` pour le point
bloquant, `extractLayout.test.ts` pour le silence.

Faire taire les dessins sans rien mettre à leur place retirerait au contrat sa
seule trace du défaut : `meta.coverage.portable` passerait à complet, et la
demande de fusion ne dirait rien. Le point bloquant entre donc d'abord dans le
canal du moteur.

- [ ] Écrire une seule définition de « ce composant imbriqué attend ses
      règles » : publié (ni `.` ni `_` en tête), non contracté, et qui n'est pas
      lui-même une icône. Elle absorbe `dansUnComposantPublie` et
      `estUnePieceInterne`. `releverLesImbriques` et l'extraction la
      consultent. Les maîtres se lisent dans `mainByInstanceId`, sans nouvel
      appel asynchrone.
- [ ] Porter le point bloquant dans les avertissements du moteur, avec son
      texte actuel, en perte de portabilité. Vérifier que l'interface le range
      toujours en tête et ne l'affiche pas deux fois, et que le compteur de
      [code.ts:744](../../../../packages/plugin-exporter/src/code.ts#L744) ne
      le compte plus en double.
- [ ] Dans l'extraction, ne pas émettre `warnUndeclaredDrawing` pour un dessin
      dont l'enfant examiné ou l'un de ses ancêtres, jusqu'au composant, est
      une instance d'un tel composant. Le calque que nomme le message est une
      instance d'icône distante que `estUneIcone` jugerait icône : la garde
      porte sur les ancêtres, pas sur ce calque.
- [ ] Relever, sur le scénario de L0, les autres messages dont toutes les
      cibles vivent dans une telle instance. Consigner la liste. N'étendre le
      silence à ces messages que si chacun disparaît une fois l'imbriqué
      contracté ; sinon, arrêter et consigner.
- [ ] Mettre à jour l'invariant d'`AGENTS.md` (« Un composant imbriqué sans
      ses règles se signale… ») dans le même commit.
- [ ] Test : un parent qui abrite un composant publié sans règles contenant un
      `VECTOR` produit le point bloquant dans `meta.diagnostics`, rend la
      couverture partielle, et ne produit aucun message de dessin. Le même
      parent, avec le composant contracté, ne produit ni l'un ni l'autre. Un
      parent qui abrite un composant publié sans propriété, qui est un dessin,
      garde le message de dessin.
- [ ] Mutation : retirer la garde, constater le message de dessin.

### L7 : un calque publié par la vue exacte n'est pas dit perdu (E5)

Faits : F4, F7, F8. Attend R1 et H2. Tests : `layoutSilences.test.ts:123`,
`tests/interface/interface.test.mjs:186`, `galerie/etats.cjs:80`, qui citent
ce message.

- [ ] Pour chaque variant, ne pas émettre « il n'est pas à l'intérieur de … »
      pour un calque que la vue exacte de ce variant publie. Les chemins publiés
      de chaque vue sont déjà relevés (`exactPathsByVariant`,
      [extractStructure.ts:274](../../../../packages/plugin-exporter/src/contract/extractStructure.ts#L274)).
      Le relevé des calques écartés doit donc suivre l'extraction des vues
      exactes, ou les consulter. Les deux sites de F8 sont concernés.
- [ ] Recenser les cas où un calque écarté par l'élection n'est publié par
      aucune vue exacte. Garder le message pour eux seuls, avec un impact
      exact validé à H2.
- [ ] Mettre à jour l'invariant d'`AGENTS.md` et le paragraphe « Ce que
      l'élection écarte n'est pas oublié » de
      [SPEC.md, « 3. Layout »](../../../../packages/plugin-exporter/SPEC.md#3-layout),
      dans le même commit.
- [ ] Adapter les trois tests cités : chacun garde un cas qui produit encore le
      message, ou disparaît avec lui si R1 montre qu'aucun cas ne le produit.
- [ ] Test : un calque absolu à côté du wrapper élu ne produit plus ce message
      et figure dans la vue exacte.
- [ ] Mutation : retirer la consultation des vues exactes, constater le
      message.

Les propriétés du calque d'onde (opacité, masque, placement de ses enfants,
dimensions sous `SCALE`) restent signalées après L7. Elles relèvent de L8.

### L8 : recherche sur les propriétés visuelles non portées (E3, E5)

Faits : F3, F4, F14. Ce lot produit une note de décision, pas de code.

Fichier autorisé : `DECISION-PROPRIETES-VISUELLES.md` dans ce dossier.

La note compare, pour chaque sujet, au moins deux formes de publication, et dit
pour chacune le coût sur le format, le kit, le schéma, les lecteurs et la
compatibilité. Elle part de la piste 1.1 de
[PISTES-EVOLUTION.md](../Evolutions%20globales/PISTES-EVOLUTION.md).

- [ ] Ombre : un catalogue d'effect styles sur le modèle de `textStyles`
      (style lié à ses variables, littéraux pour le reste), ou un champ par
      calque. Dire comment une ombre se compose avec le `border` déjà rendu en
      `box-shadow` (`FORMAT.md`, rôles de rendu ;
      [types.ts:161](../../../../packages/kit/src/format/types.ts#L161)), et
      ce que `tokens.json` publierait (type DTCG `shadow`).
- [ ] Opacité d'un calque : champ tokenisé, puisque Figma la lie à une
      variable (F3), et règle pour une opacité brute.
- [ ] Enfants d'un cadre sans auto layout : étendre `constraints` et `inset`
      à tout enfant placé par ses contraintes (F14), et ne plus réclamer de
      variable pour un axe en `STRETCH` ou `SCALE`, que l'`inset` détermine.
- [ ] Masque : publier la découpe, ou garder l'avertissement. Dire ce qu'un
      consommateur CSS en ferait (`mask`, `clip-path`, `overflow`).
- [ ] Pour chaque sujet, l'incrément de `contractVersion`, les entrées de
      `CHANGELOG-FORMAT.md` et la fenêtre de lecture du kit.

### Porte H3 : évolution du format

Le mainteneur lit la note de L8 et décide, sujet par sujet : publier, garder
l'avertissement, ou reporter. Une décision de publier donne un plan à part,
relu par un agent indépendant avant son exécution. Ce plan-ci ne l'implémente
pas.

### L10 : fermeture

- [ ] Passer `npm test`, `npm run typecheck`, `npm run build` à la racine.
- [ ] Lancer `npm run build` dans `packages/plugin-exporter` de la copie de
      travail partagée, puis vérifier par `grep` qu'un nom introduit par L6 est
      présent dans `dist/code.js` : Figma charge ce fichier.
- [ ] Écrire dans le journal la liste attendue sur le composant de la
      section 1 après L1 à L7 :
  - le point bloquant de l'imbriqué sans règles ;
  - le conteneur de règles en double ;
  - trois lignes de règles marquées (`@usage`, `@prop`, `@boolean`) ;
  - la règle `@icons « icon-name »`, posée avec le maître ancien ;
  - une ligne `min width` et une ligne `effect`, regroupées par L6 ;
  - le corner radius et le stroke weight du wrapper ;
  - les propriétés du calque d'onde que L8 n'a pas tranchées : opacité,
    masque, disposition sans auto layout, dimensions ;
  - la collision, si l'export vise le même dépôt de recette.
- [ ] Demander au mainteneur de relancer l'analyse du composant réel et de
      comparer la liste obtenue à celle du journal. Consigner son retour.
- [ ] Fermer le journal sans réserve ouverte.

## 8. Conditions de fin

- [ ] Chaque lot L1 à L7 et L9 a son test vu rouge, sa mutation consignée et
      son commit poussé sur `main`.
- [ ] Aucune loi existante n'a été relâchée ; les invariants et textes
      normatifs modifiés l'ont été dans le commit de leur lot, après la porte
      qui les concerne.
- [ ] Sur le scénario de L0, `meta.diagnostics` et le corps de la demande de
      fusion portent la même liste que le plugin, point bloquant compris
      après L5.
- [ ] La note de L8 existe et H3 porte une décision par sujet.
- [ ] `dist/code.js` de la copie partagée contient les corrections.
