# Unified Component Exporter — guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG. Il ne
modifie jamais le document Figma.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) pour le comportement touché ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `src/contract/types.ts` et les tests voisins pour la forme concrète.

Les [invariants](#invariants) sont groupés par domaine — portée du contrat,
tokens, couleurs, composition, arbre des slots, layout, grilles, diagnostics,
versionnage. Lire le groupe que la tâche touche, pas la section entière.

Pour créer ou modifier un message destiné au designer, charger aussi la skill
[`rediger-diagnostics-ucm`](./.agents/skills/rediger-diagnostics-ucm/SKILL.md).

La maturité et les priorités vivent dans [ROADMAP.md](./ROADMAP.md). Les idées
non décidées dans [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Carte du code

```text
src/
  code.ts                    routage UI → commandes
  contract/
    exportComponent.ts       orchestration et métadonnées
    componentTree.ts         axes, matrice et wrapper de layout
    compactVariants.ts       catalogue v10 des vues et liaisons exactes
    layoutNodes.ts           élection du node de layout, une fois par variant
    exportableNodes.ts       parcours de l'arbre, hors dépendances composées
    parsers.ts               propriétés Figma → API publique
    merge*.ts                doc et icônes des règles, rangées sur leur axe
    rulesModel.ts            modèle pur des règles d’usage
    semantics.ts             vocabulaire sémantique partagé
    colorKeys.ts             clé d'une couleur dans la feuille d'un variant
    structureTree.ts         qui est un conteneur, qui est une feuille
    unsupportedProperties.ts ce qu'un calque publié porte et que le schéma ignore
    extract*.ts              structure, layout, tailles, tokens et règles
    flexLayout.ts            propriétés de flux et avertissements non portables
    slotNames.ts             nommage des slots et calques d'icônes
    slotRelations.ts         composition et visibilité dans un slot
    composedComponents.ts    dépendances entre composants
    nodeBindings.ts          groupes complets de liaisons Figma
    propertyBindings.ts      component properties situées dans chaque variant
    types.ts                 schéma TypeScript du contrat
  tokens/exportTokens.ts     export DTCG
  variables.ts               index commun, collisions et alias
  utils.ts                   normalisation et identifiant de code
  config.ts                  configuration GitHub locale
  github.ts                  branche, fichier et pull request
  ui/                        interface du plugin
tests/
  test-exports/              petit corpus d’exports réels
schema/
  ucm-contract.schema.json   forme du contrat, dérivée de types.ts
```

## Invariants

Chaque entrée donne la règle, sa borne, et l’autorité qui la porte dans le code.
Le raisonnement vit dans la spécification, en lien.

### Portée et forme du contrat

- Le contrat publié est portable : aucune donnée d’extraction Figma n’entre dans
  l’artefact. Toute limite de traduction produit un diagnostic et rend
  `meta.coverage.portable` partiel.
- Aucune logique liée au nom d’un composant.
- Figma reste traçable après normalisation (`figmaName`, `figmaLayer`).
- `variants` décrit chaque combinaison réellement présente — `COMPONENT` sans axe
  et matrice clairsemée comprises — et référence une vue de `variantViews`. Deux
  vues ne se partagent que par égalité stricte du bloc JSON : ni merge, ni
  héritage, ni défaut. `structure` reste la projection du variant de référence.
  → [spec](./UCM-EXPORTER-SPEC.md#sortie)
- Une propriété native garde son type (`INSTANCE_SWAP`, `SLOT`) et ses liaisons
  `visible`, `characters`, `mainComponent` : définition dans
  `propertyBindingDefinitions`, `nodeId` dans `variants[].bindings`, aucun
  rapprochement par nom de calque. → [spec](./UCM-EXPORTER-SPEC.md#1-props)
- Un enum renommé porte la même clé dans `props`, `variantAxes` et les arbres de
  variantes. → [spec](./UCM-EXPORTER-SPEC.md#1-props)
- Les axes d’API vivent dans `props`, l’axe d’états dans `stateModel` ; une règle
  `@prop` suit cette répartition. N’est une faute de frappe que ce que le contrat
  ne publie nulle part.
  → [spec](./UCM-EXPORTER-SPEC.md#7-intention-et-documentation-des-props)

### Tokens et variables

- Les tokens restent des références ; leurs alias ne sont jamais aplatis.
- `normalizeName()` et `indexVariables()` sont communs aux deux commandes.
- Une collision feuille/groupe ou deux chemins identiques sont tranchés avant la
  construction de l’arbre ; aucun alias ne pointe vers une variable rejetée.
  → [spec](./UCM-EXPORTER-SPEC.md#partie-2--export-tokens)
- `tokensUsed` se dérive du contrat terminé, jamais pendant l’extraction.
  → [spec](./UCM-EXPORTER-SPEC.md#8-rendu-sémantique-et-garde-fous)

### Couleurs

- Aucune couleur n’est perdue par troncature. Le dernier segment est la base de
  la clé ; deux couleurs qui cohabitent dans une même feuille en le partageant
  l’allongent des segments qui les séparent (`userinput.background` /
  `divider.background`).
- `colorKeys.ts` en est l’unique autorité et décide sur toute la matrice : la clé
  d’un token est la même dans toutes les feuilles. Borne du coût : sélection
  exacte jusqu’à seize profondeurs candidates, gloutonne et déterministe au-delà.
  → [spec](./UCM-EXPORTER-SPEC.md#2-tokens-de-variantes)
- Ce qu’une couleur peint se lit sur le calque qui la porte, jamais sur le nom de
  son token. `rendering.roles` publie le rendu de chaque clé qui ne nomme aucun
  rôle partagé. Un nom qui EST un rôle partagé l’emporte, et se lit sur le
  dernier segment du TOKEN, jamais sur la clé publiée.
- Le contrat ne publie que les couleurs liées. `lirePeintures` est l’unique
  lecture : ce qui est retenu et ce dont on avertit en sortent ensemble, la liste
  du node servant de repli. Une peinture posée à la main sur un calque parcouru
  avertit et rend `meta.coverage.portable` partiel. Réserves muettes : paint
  masqué ou d’opacité nulle, stroke d’épaisseur zéro, peinture non `SOLID`.
- `variantViews.*.paintPlacements` situe fills et strokes par les chemins de
  l’arbre publié ; `[]` cible la racine, et les chemins sont collectés pendant
  l’unique extraction de `structure.children`. Le chemin est celui du calque
  PUBLIÉ qui porte la peinture : une couleur sous une feuille appartient à cette
  feuille, et deux tracés d’une même icône ne donnent qu’une cible. Les deux
  relevés ne parcourent pas le même arbre ; leur égalité n’est pas exigée.
  → [spec](./UCM-EXPORTER-SPEC.md#2-tokens-de-variantes)

### Composition

- Un composant unifié imbriqué est déclaré dans `composes`. Le critère « ce node
  porte les règles de X » n’existe qu’une fois (`rulesContainerOwner`), indexé sur
  toutes les pages. Les règles documentent sans autoriser : tout `COMPONENT` ou
  `COMPONENT_SET` sélectionné est exportable, et le parent ne réexporte pas les
  internes d’une dépendance reconnue.
- Le parcours conserve le calque de l’instance pour le décrire comme un slot ;
  ce qu’il porte reste hors du contrat parent. Ses couleurs appartiennent à son
  contrat (`getSlotTokens`), ses dimensions ne le font pas élire node de layout
  (`findLayoutNode`).
- `composes` ne désigne que le calque qui EST l’instance. Un calque qui
  l’enveloppe appartient au contrat parent : il publie son flux et range la
  dépendance dans `children`. Trois liens donnent trois enfants, et le cadre ne
  reprend une `visibilityProp` que lorsqu’une seule dépendance l’occupe.
  → [spec](./UCM-EXPORTER-SPEC.md#cadre-de-dépendance)
- Ce cadre publie TOUS ses calques, pas seulement les branches de dépendance.
  `structureTree.publishesChildren` tranche l’unique exception : un cadre dont
  aucune branche ne mène à une dépendance ne publie rien. Chemins de typographie
  et signatures suivent cette réponse.
- Chaque `variantViews[variants[].view].composes` se dérive de SON arbre publié,
  dans son ordre ; le `composes` global en est l’union ordonnée à cardinalité
  maximale. Une dépendance non située sort des deux champs à la fois, sous
  avertissement. → [spec](./UCM-EXPORTER-SPEC.md#composition-et-dépendances)

### Arbre des slots

- `structure.children` descend dès qu’un descendant porte une information qu’une
  feuille ne sait pas exprimer — texte, icône, dépendance, liaison de variable —
  à n’importe quelle profondeur. Borne : un calque dont aucun descendant ne porte
  d’information reste une feuille. `structureTree.ts` en est l’unique autorité ;
  extraction, `textSlots` et signatures la consultent sans la recalculer.
  Profondeur bornée à 12 niveaux, coupure dite dès qu’elle emporte autre chose
  qu’un dessin. → [spec](./UCM-EXPORTER-SPEC.md#6-structure)
- Un conteneur publie TOUS ses calques rendables, à quelque profondeur qu’ils
  vivent — jamais une sélection. `variants[].tokens` relève les couleurs du
  variant entier.
- Une typographie appartient à UN calque texte et vient de son text style.
  `textStyles` lie le style à ses variables, la vue exacte situe son usage par un
  chemin de slots. Un slot à plusieurs textes décrit ses parts dans `children` :
  les nodes représentés y portent leur visibilité, les cibles graphiques non
  représentées restent dans `visibilityTargets`.
  → [spec](./UCM-EXPORTER-SPEC.md#5-typographie)
- `icons.*.slot` et `icons.*.size` disent où et à quelle taille placer chaque
  icône. `slotNames.ts` est l’unique autorité sur le nommage : un `icons.*.slot`
  publié désigne toujours un slot réel de `structure.children`.
- Masquer et remplacer sont deux libertés distinctes : le booléen Figma dit SI
  une icône s’affiche, la prop runtime dit LAQUELLE rendre. Une icône toujours
  visible est modifiable comme une autre, sans booléen et sans signalement.
  → [spec](./UCM-EXPORTER-SPEC.md#7-intention-et-documentation-des-props)

### Layout, dimensions et bornes

- Le node de layout d’un variant s’élit au score, donc en fonction de la racine
  d’où part la recherche. `layoutNodes.ts` en est l’unique autorité. Aucune
  extraction ne choisit le calque qu’elle décrit : toutes reçoivent l’élection,
  `sizes` comprise. → [spec](./UCM-EXPORTER-SPEC.md#3-layout)
- Ce que l’élection écarte est dit. Un calque hors du node élu, ou à côté d’une
  dépendance dans son cadre, ne reçoit ni slot, ni typographie, ni visibilité,
  alors que ses couleurs entrent dans `variants[].tokens` : il avertit.
- Un auto-layout linéaire publie ses alignements (`justifyContent`,
  `alignItems`) ; ses slots ne publient que leurs exceptions (`alignSelf`,
  `flexGrow`). Une absence signifie hors flux ou non applicable, jamais
  `flex-start` deviné. → [spec](./UCM-EXPORTER-SPEC.md#flux-et-alignement)
- Le menu de dimensionnement Figma fait autorité, axe par axe ; un axe ne décide
  jamais de l’autre. Pour un slot : `Fill` se publie, `Fixed` cite une variable
  dans `size`, l’absence vaut `Hug`, une dimension figée sans variable avertit.
  Pour le composant : `structure.sizing` est toujours publié, en vocabulaire CSS
  (`stretch`, `fit-content`) et par propriété (`width`, `height`).
- Ce qui sépare une taille de maquette d’une décision du design system est la
  liaison, jamais le fait d’être figé : sans variable une largeur fixe vaut
  `stretch`, avec variable elle publie son token. Un nombre brut n’est jamais
  contractuel, une variable liée l’est toujours.
  → [spec](./UCM-EXPORTER-SPEC.md#dimensions-et-bornes)
- `bounds` publie les bornes sur le composant et sur chaque slot, indépendamment
  du menu de dimensionnement, à la règle commune. Le geste demandé est de nommer
  la borne, jamais de la retirer. Un calque intermédiaire n’en est pas
  propriétaire et avertit. → [spec](./UCM-EXPORTER-SPEC.md#dimensions-et-bornes)
- Une valeur uniforme n’est valide que si tout le groupe requis est lié. Les
  côtés d’un même champ peuvent citer des variables différentes : le contrat
  publie alors le détail (`padding.x`, `padding.y`, `radius`, largeur d’un
  stroke), et garde la forme courte quand ils la partagent. Un groupe par côté
  peut être partiel si les côtés absents valent zéro ; un côté fixe non neutre
  avertit. La taille d’un slot n’en est pas un et exige une variable unique.
  L’élection du node de layout ne compte que `hasCompleteBinding`.
- `wrap` est une propriété de flux et reste au niveau haut même sous `sizes`.
  `rowGap` est un token à la règle commune ; son absence sous `wrap` vaut `gap`.
  → [spec](./UCM-EXPORTER-SPEC.md#passage-à-la-ligne)
- Une propriété Figma que le schéma ne sait pas porter avertit au lieu de
  disparaître. `layout` reste publié parce que sa forme l’exige, et son repli
  `flex-row` se signale.
- Une propriété à effet visuel que le schéma ne sait pas écrire avertit, mais
  seulement sur un calque PUBLIÉ et jamais pour une valeur au défaut de Figma.
  Ces deux réserves écartent `clipsContent`, le masque d’une icône et
  l’alignement d’un texte en `Hug`.
  → [spec](./UCM-EXPORTER-SPEC.md#propriétés-non-portables)

### Grilles

- Sous une grille, la cellule fixe la boîte ; les pistes (`columnSizes`,
  `rowSizes`) et la place de chaque enfant (`columnStart`, `rowStart`, spans) la
  décrivent. Le menu de dimensionnement n’y fait plus autorité : un enfant ne
  publie sa dimension que s’il cite une variable, et son absence ne se réclame
  jamais. Borne : un alignement explicite le détache de sa cellule et la règle
  commune revient.
- Exception propre aux grilles : une piste `FIXED` publie sa valeur en pixels
  sous une notice, sans devenir un token ni dégrader la couverture. Un runtime
  qui n’expose pas les pistes ne publie rien et n’avertit de rien.
- L’exception s’étend de la piste à la cellule, et là seulement : sous une piste
  `HUG`, `GridTrackSize.value` n’existe pas et la mesure ne vit que sur l’enfant,
  publiée en pixels dans `structuralSize`. Trois bornes — une variable liée
  l’emporte et se publie dans `size`, qui reste strictement tokenisé ; une seule
  piste non `HUG` sous l’étendue de l’enfant rend l’axe indécis et rien n’est
  publié ; un alignement explicite retire l’exception, sans quoi la valeur
  contredirait l’avertissement de `resolveSlotSize` sur le même axe.
  → [spec](./UCM-EXPORTER-SPEC.md#grilles)

### Diagnostics

- Une donnée facultative incomplète avertit. Les préconditions explicitement
  définies dans la spécification bloquent.
- On n’avertit que sur ce qu’on publie. Une valeur que le contrat va jeter — les
  dimensions du calque de référence quand `sizes` existe — n’est ni relevée ni
  signalée.
- Un avertissement s’adresse au designer : nom Figma exact, ce qui manquera,
  geste à faire. Il lui parvient par le corps de la pull request. Avertissement
  et note ne partagent pas le même canal.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)

### Versionnage

- Un changement de forme du JSON incrémente `contractVersion` et met à jour la
  spécification et les consommateurs.
- `schema/ucm-contract.schema.json` est dérivé de `types.ts` par `npm run
  schema`, jamais rédigé. Il décrit la forme, pas la cohérence : il ignore les
  renvois internes et le format des valeurs tokenisées, et ne remplace aucun
  contrôle du consommateur. Sa propre `description` énonce ses limites.

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

Un nouveau `tests/*.test.ts` est découvert automatiquement. Tout bug corrigé
reçoit un test de régression.

Un changement dans `src/contract/types.ts` demande `npm run schema` : le schéma
commité en est dérivé, et `tests/schema.test.ts` refuse la version périmée en
la régénérant pour la comparer. Ce contrôle vit dans `npm test`, à la
différence de `check:fixtures`, parce qu’un agent peut le satisfaire seul.
C’est aussi pourquoi ce test ne confronte au schéma que les contrats du corpus
qui déclarent la version COURANTE : `contractVersion.const` refuserait les
autres d’avance, et `npm test` redeviendrait rouge pour la seule raison qu’un
humain n’a pas encore rouvert Figma.

Le corpus `tests/test-exports/` reste petit et représentatif. Il est produit
depuis Figma, pas édité à la main, et verrouille la version actuelle du
contrat. `npm run check:fixtures` le constate, et se lance avant une pull
request plutôt que dans `npm test` : il ne dit rien du code, seulement qu'un
humain a relancé le plugin depuis le dernier changement de forme. Un agent ne
peut pas le satisfaire seul, et ne doit pas chercher à le faire — retoucher un
fichier du corpus détruirait ce qui en fait la valeur.

## Limites d’environnement

- L’agent ne peut pas exécuter l’export dans Figma. Une validation runtime
  nécessite un réexport utilisateur.
- Le réseau du plugin est limité à `https://api.github.com`.
- La configuration GitHub est facultative ; toute erreur conserve un
  téléchargement local.
- Le plugin ouvre une pull request par artefact et ne fusionne jamais
  automatiquement.

Avant de terminer une modification, relire les documents directement affectés
et retirer toute description devenue fausse ou dupliquée.
