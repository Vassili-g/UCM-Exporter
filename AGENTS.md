# Guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG. Il ne
modifie jamais le document Figma.

Ce document dit **ce que le projet garantit** : où se trouve chaque chose, et
quelles règles le code tient. [CONTRIBUTING.md](./CONTRIBUTING.md) dit **comment
travailler** : écrire du code, un message, un test, un document, et vérifier
avant de proposer un changement. Une règle du produit s'écrit ici ; une règle de
travail s'écrit là-bas.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [docs/FORMAT.md](./docs/FORMAT.md) si la tâche touche à la forme de ce qui
   est publié, [packages/plugin/SPEC.md](./packages/plugin/SPEC.md) si elle
   touche à la façon dont le plugin lit Figma. Ce que les versions précédentes
   publiaient est dans [docs/CHANGELOG-FORMAT.md](./docs/CHANGELOG-FORMAT.md),
   à ouvrir dès qu'une tâche touche à la compatibilité ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `packages/kit/src/format/types.ts` et les tests voisins pour la forme concrète.

Les [invariants](#invariants) sont groupés par domaine : portée du contrat,
tokens, couleurs, composition, arbre des slots, layout, grilles, diagnostics,
versionnage. Lire le groupe que la tâche touche, pas la section entière.

**Avant d'écrire une phrase, dans un document ou dans un commentaire, charger la
skill [`rediger-sans-tics-ia`](./.agents/skills/rediger-sans-tics-ia/SKILL.md).**
Un commentaire ne se justifie que par un fait absent du code : une décision, une
précondition, une conséquence, une limite. Six contrôles refusent le reste, et
[CONTRIBUTING.md](./CONTRIBUTING.md#rédiger-un-document) les énumère.

Pour créer ou modifier un message destiné au designer, charger aussi la skill
[`rediger-diagnostics-ucm`](./.agents/skills/rediger-diagnostics-ucm/SKILL.md).

Pour reconstruire à froid un composant depuis son contrat, ce qui est le geste
de la recette dans le repository consommateur, charger la skill
[`consommer-contrat`](./.agents/skills/consommer-contrat/SKILL.md). Elle est
rangée ici parce que c'est un savoir du format : le repository de recette, lui, ne doit
rien apprendre du produit.

Pour toucher à l'interface du plugin, lire d'abord
[CONTRIBUTING.md](./CONTRIBUTING.md#interface-du-plugin) : la hiérarchie de
l'information et le protocole de relecture y font autorité, et la galerie des
états rend chaque écran atteignable hors de Figma.

[ROADMAP.md](./ROADMAP.md) porte la maturité et les priorités,
[PISTES-EVOLUTION.md](./docs/notes/PISTES-EVOLUTION.md) les idées non décidées.

## Carte du code

```text
packages/plugin/         le moteur : extraction Figma, dépend du kit
  src/
    code.ts                    routage UI → commandes
    contract/
      exportComponent.ts       orchestration et métadonnées
      componentTree.ts         axes, matrice et wrapper de layout
      compactVariants.ts       catalogue par partie de vue, et liaisons exactes
      elideNeutrals.ts         ce que le contrat n’écrit pas : null, {} et []
      serializeJson.ts         une entrée par ligne, sur deux niveaux
      layoutNodes.ts           élection du node de layout, une fois par variant
      exportableNodes.ts       parcours de l'arbre, hors dépendances composées
      parsers.ts               propriétés Figma → API publique
      merge*.ts                doc et icônes des règles, rangées sur leur axe
      rulesModel.ts            modèle pur des règles d’usage
      semantics.ts             vocabulaire sémantique partagé
      colorKeys.ts             clé d'une couleur dans la feuille d'un variant
      structureTree.ts         qui est un conteneur, qui est une feuille
      unsupportedProperties.ts ce qu'un calque publié porte et que le schéma ignore
      localisation.ts          le Constat : où, quoi, impact et action, séparés
      extract*.ts              structure, layout, tailles, tokens et règles
      flexLayout.ts            propriétés de flux et avertissements non portables
      extractSamples.ts        ce que la maquette montre, sans rien exiger
      slotNames.ts             nommage des slots et calques d'icônes
      slotRelations.ts         composition et visibilité dans un slot
      composedComponents.ts    dépendances entre composants
      nodeBindings.ts          groupes complets de liaisons Figma
      propertyBindings.ts      component properties situées dans chaque variant
      propertySurface.ts       surface publique élue : owner direct et wrapper
    tokens/exportTokens.ts     export DTCG
    variables.ts               index commun, collisions et alias
    base64.ts                  encodage UTF-8/Base64 sans dépendance au sandbox
    config.ts                  configuration GitHub locale
    fenetre.ts                 la taille de la fenêtre, ses bornes et son rangement
    connexion.ts               ce que vaut la connexion au dépôt, et le geste qu'elle demande
    prevol.ts                  ce que l'analyse conclut avant d'écrire, et l'action qu'elle propose
    cible.ts                   ce sur quoi l'export porte, et pourquoi il ne porte pas
    github.ts                  branche, fichier et pull request
    messages.ts                les DEUX sens de la frontière sandbox ↔ UI
    ui/                        interface du plugin
  galerie/                   les états de l'UI, atteignables hors de Figma
  tests/
  README.md                  ouvrir le plugin, ses deux commandes, ses limites
  SPEC.md                    le moteur : ce que le plugin lit, élit et signale
  manifest.json              chargé dans Figma depuis packages/plugin/dist/

packages/kit/            le format et ses lecteurs : @ucm-kit/core, publié
  src/format/              sous-chemin SANS dépendance Node ni Figma
    types.ts                 schéma TypeScript du contrat
    version.ts               CONTRACT_VERSION, seul endroit où elle est écrite
    names.ts                 normalizeName, codeIdentifier, tokenCssVariable
    references.ts            la forme d'une référence de token, et son enveloppe
    configuration.ts         la grammaire de ucm.config.json, pour la CI et le plugin
    identite.ts              « ces deux contrats sont-ils le même composant ? »
    typography.ts            les graisses et styles DTCG qu'un text style emploie
    index.ts                 ce que le sous-chemin publie
  src/lecteurs/            ce qui juge un contrat écrit ; `ajv` et `node:fs`
    validation-contrat.mjs       la forme d'un contrat, champ par champ
    validation-graphe-contrats.mjs  composition, doublons et collisions d'identifiant
    validation-echantillons.mjs  les adresses que les échantillons visent
    variant-views.mjs            la vue exacte d'un variant
    version-contrat.mjs          la plage lue, et le SENS d'un écart de version
    references-token.mjs         la forme d'une référence, et son relevé
    tokens-dtcg.mjs              ce que le fichier de tokens contient, donc ce qui existe
    typography-token-types.mjs   les types DTCG qu'un style typographique exige
    schema-contrat.mjs           le schéma publié, chargé pour Ajv
    configuration.mjs            OUVRIR ucm.config.json ; sa grammaire est dans format/
    implementation.mjs           OÙ se trouve une implémentation, et SI elle est là
    trouver-contrats.mjs         retrouver les contrats d'un dossier
    controle-repository.mjs      le contrôle complet et le rapport du designer
    verdict-bilan.mjs            ce qui refuse une fusion, et le titre de ce refus
    perimetre-rapport.mjs        les états informatifs limités à la pull request
    avertissements-export.mjs    ce que l'export n'a pas su décrire
    diagnostic-tokens.mjs        les références que la source de tokens ne porte pas
    diagnostic-parite.mjs        l'écart contrat ↔ code : le juger et le dire
    diagnostic-tests.mjs         ce qu'une suite de tests rouge dit au designer
    diagnostic-markdown.mjs      le rendu markdown d'un diagnostic
    index.mjs                    la porte publique `@ucm-kit/core/lecteurs`
    index.d.mts                  ce que cette porte promet à un consommateur TS
  scripts/build-schema.ts  génère le schéma depuis types.ts
  scripts/generer-refus.mjs  les refus de version, rendus pour la relecture
  schema/                  le schéma commité, publié en `@ucm-kit/core/schema`
  fixtures/contrats/11.0/  jeu N-1 figé, que le moteur ne sait plus fabriquer
  tests/                   `.test.ts` pour le format, `.test.mjs` pour les lecteurs

packages/cli/            la ligne de commande : @ucm-kit/cli, publiée
  src/ucm.mjs              l'aiguillage et les codes de sortie
  src/init.mjs             installe ce qui manque, sans jamais écraser
  src/check.mjs            lance le contrôle du kit, imprime, écrit le rapport
  src/adaptateur.mjs       découvre l'adaptateur de stack installé dans le repo
  src/icons.mjs            les icônes que les contrats du repo réclament
  tests/                   dont recette.test.mjs, sur des repositories temporaires

packages/adapter-typescript/  l'adaptateur opt-in : parité TS/TSX et types générés
  src/parite.mjs              lit les props et la composition avec TypeScript
  src/generation.mjs          dérive les unions depuis les contrats
  src/types-variants.mjs      la forme des unions produites
  src/cli.mjs                 commande `ucm-typescript`
  src/index.mjs               ce que `ucm check` charge quand il le découvre
  src/index.d.mts             ce que cette porte promet à un consommateur TS

docs/                    le format, pour qui consomme un contrat
  README.md              le sommaire par profil de lecteur, et la table des autorités
  FORMAT.md              la forme de chaque champ, et ce que son absence dit
  CHANGELOG-FORMAT.md    ce que chaque version a publié, et ce qu'elle casse
  COMPATIBILITE.md       les classes de changement, et qui migre pour chacune
  POUR-LES-DESIGNERS.md  le guide du designer, et le vocabulaire du projet
  RECETTE.md             comment éprouver le produit à la main, hors des tests
  notes/                 les options non engagées, et rien dont le produit dépende

.agents/skills/          les procédures qu'un agent charge à la demande
  consommer-contrat/       reconstruire un composant depuis son seul contrat
  rediger-diagnostics-ucm/ écrire un message que le designer peut suivre
  rediger-sans-tics-ia/    le standard d'écriture, documents et commentaires

scripts/
  controle-style.mjs     les règles de style, pour le test et pour le hook
  hook-style.mjs         le même contrôle, au moment où un agent écrit
  mesurer-prose.mjs      le volume de la prose, document et commentaire
  pins-servis.mjs        les versions que le registre sert
  run-tests.cjs          le découvreur de tests
.claude/settings.json    le hook d'écriture, branché sur Write et Edit
.github/workflows/       ci.yml, et publish.yml qui publie sans jeton

tests/                   les tests du monorepo lui-même
  docLinks.test.ts       les liens et les ancres de la documentation
  inventaireInvariants.test.ts  l'accord d'AGENTS.md avec le code, dans les deux sens
  styleDocumentaire.test.ts  les tics de rédaction, interdits sans exemption
  pinDocumente.test.mjs  les versions montrées par une commande copiable
  registrePortableDocuments.test.ts  aucun document portable ne promet une stack
  versionSuitLeContenu.test.mjs  un numéro publié annonce bien ce qu'il publie
  monorepoCoherent.test.mjs  chaque paquet lit le kit d'à côté, jamais le registre
```

## Invariants

Chaque entrée donne la règle, sa borne, et l’autorité qui la porte dans le code.
La spécification en lien porte le raisonnement.

### Portée et forme du contrat

- Le contrat publié est portable : aucune donnée d’extraction Figma n’entre dans
  l’artefact. Toute limite de traduction produit un diagnostic et rend
  `meta.coverage.portable` partiel.
- Aucune logique liée au nom d’un composant.
- Figma reste traçable après normalisation (`figmaName`, `figmaLayer`).
- `variants` décrit chaque combinaison réellement présente, `COMPONENT` sans axe
  et matrice clairsemée comprises, et référence une vue de `variantViews`. Une
  vue est cinq renvois : `structure`, `typography`, `composes`, `icons`,
  `paintPlacements`, chacun catalogué à part et partagé par égalité stricte de
  son bloc JSON, à l’ordre des clés près. Ni merge, ni héritage, ni défaut.
  `structure` est la projection du variant de référence, publiée elle aussi par
  renvoi, inconditionnellement. → [spec](./docs/FORMAT.md#sortie)
- Le contrat n’écrit aucune valeur neutre : une clé qui vaudrait `null`, `{}` ou
  `[]` est absente. Cette borne porte tout : un seul passage, jamais de point
  fixe. Une valeur qui est vide ne s’écrit pas ; une valeur qui contient du vide
  s’écrit sans lui et reste : sous un dictionnaire, la clé est une donnée, et
  `stateModel.states.default` vaut `{}`. `elideNeutrals.ts` en est l’unique
  autorité, et chaque sous-arbre n’y passe qu’une fois.
- L’artefact s’écrit une entrée par ligne sur deux niveaux (`serializeJson.ts`),
  sans seuil : la forme du fichier ne dépend jamais du nombre de variants.
- Une propriété native garde son type (`INSTANCE_SWAP`, `SLOT`) et ses liaisons
  `visible`, `characters`, `mainComponent` : définition dans
  `propertyBindingDefinitions`, `nodeId` dans `variants[].bindings`, aucun
  rapprochement par nom de calque. → [spec](./docs/FORMAT.md#1-props)
- Un enum renommé porte la même clé dans `props`, `variantAxes` et les arbres de
  variantes. → [spec](./docs/FORMAT.md#1-props)
- Un axe possède sa clé publique : `parsers.ts` la lui réserve avant les autres
  propriétés, si bien que l'ordre des déclarations Figma ne décide de rien. Deux
  axes que la normalisation confond refusent l'export, aucun artefact ne sort et
  le designer en renomme un.
  → [spec](./packages/plugin/SPEC.md#1-props)
- La convention `State`/`Status` porte sur un axe, donc sur le seul type
  `VARIANT`. Une propriété d'un autre type qui porte ce nom reste une prop.
  → [spec](./docs/FORMAT.md#1-props)
- Les axes d’API sont dans `props`, l’axe d’états dans `stateModel` ; une règle
  `@prop` suit cette répartition. N’est une faute de frappe que ce que le contrat
  ne publie nulle part.
  → [spec](./docs/FORMAT.md#7-intention-et-documentation-des-props)

### Tokens et variables

- Les tokens restent des références ; leurs alias ne sont jamais aplatis.
- `normalizeName()` et `indexVariables()` sont communs aux deux commandes.
- Une collision feuille/groupe ou deux chemins identiques sont tranchés avant la
  construction de l’arbre ; aucun alias ne pointe vers une variable rejetée.
  → [spec](./docs/FORMAT.md#partie-2--export-tokens)
- Le contrat ne publie aucun index de ses tokens : `tokensUsed` se dérivait du
  contrat terminé, et ce qui se dérive ne se publie pas. Un consommateur qui en
  a besoin balaie les références du contrat, `samples` et `meta` exclus.
  → [spec](./docs/FORMAT.md#8-rendu-sémantique-et-garde-fous)
- Un nom de token se projette de trois façons, et chacune a un propriétaire, tous
  trois dans `packages/kit/src/format/names.ts` : `normalizeName` va du chemin
  Figma au token, `codeIdentifier` du nom Figma à l'identifiant de code, et
  `tokenCssVariable` du token à la propriété personnalisée CSS. Une projection
  recopiée ailleurs est une faute : elle diverge sans produire d'erreur. Borne
  de `tokenCssVariable` : elle ne coupe pas sur les bosses de casse, ce qui la
  distingue d'un `kebabCase` de bibliothèque, et elle n'est pas une bijection.
  → [spec](./docs/FORMAT.md#nommer-et-citer-un-token)

### Couleurs

- Aucune couleur n’est perdue par troncature. Le dernier segment est la base de
  la clé ; deux couleurs qui cohabitent dans une même feuille en le partageant
  l’allongent des segments qui les séparent (`userinput.background` /
  `divider.background`).
- `colorKeys.ts` en est l’unique autorité et décide sur toute la matrice : la clé
  d’un token est la même dans toutes les feuilles. Borne du coût : sélection
  exacte jusqu’à seize profondeurs candidates, gloutonne et déterministe au-delà.
  → [spec](./docs/FORMAT.md#2-tokens-de-variantes)
- Le site tranche la nature de ce qu’une couleur peint, le nom précise à
  l’intérieur de cette nature. Un dernier segment qui nomme un rôle partagé
  l’emporte seulement s’il est de la nature du calque, ce qui distingue un
  `ring` d’un `border`, et il ne tranche rien de plus. Un `…/foreground` posé
  en contour peint un contour, sans un mot. Le nom se lit sur le dernier segment
  du token, jamais sur la clé publiée.
- Une clé de couleur ne porte pas un rôle. `rendering.roles` est le vocabulaire
  partagé, identique dans tous les contrats ; `rendering.keyRoles` porte le rôle
  de chaque clé observée qui n’en porte pas le nom, en deux tables que `colorKeys`
  sépare comme il sépare ses feuilles (`fills`, `strokes`). Résolution :
  `roles[keyRoles[côté][clé] ?? clé]`, et `packages/plugin/tests/lois.ts` vérifie sur chaque
  contrat que la réponse existe et qu’elle est de la bonne nature.
- Un rôle de contour ne cite jamais une propriété CSS qui consomme la boîte :
  `border` se rend en `box-shadow` et `ring` en `outline`, jamais l'un ni
  l'autre en bordure, et `align` donne la forme de l'ombre.
  `defaultRenderingSemantics()` en est l’unique autorité.
  → [spec](./docs/FORMAT.md#8-rendu-sémantique-et-garde-fous)
- Le contrat ne publie que les couleurs liées. `lirePeintures` est l’unique
  lecture : ce qui est retenu et ce dont on avertit en sortent ensemble, la liste
  du node servant de repli. Une peinture posée à la main sur un calque parcouru
  avertit et rend `meta.coverage.portable` partiel. Réserves muettes : paint
  masqué ou d’opacité nulle, stroke d’épaisseur zéro, peinture non `SOLID`.
- `variantViews.*.paintPlacements` situe fills et strokes par les chemins de
  l’arbre publié ; `[]` cible la racine, et les chemins sont collectés pendant
  l’unique extraction de `structure.children`. Le chemin est celui du calque
  publié qui porte la peinture : une couleur sous une feuille appartient à cette
  feuille, et deux tracés d’une même icône ne donnent qu’une cible. Les deux
  relevés ne parcourent pas le même arbre ; leur égalité n’est pas exigée.
  → [spec](./docs/FORMAT.md#2-tokens-de-variantes)

### Composition

- Un composant unifié imbriqué est déclaré dans `composes`. Le critère « ce node
  porte les règles de X » n’existe qu’une fois (`rulesContainerOwner`), indexé sur
  toutes les pages. Les règles documentent sans autoriser : tout `COMPONENT` ou
  `COMPONENT_SET` sélectionné est exportable, et le parent ne réexporte pas les
  internes d’une dépendance reconnue. Une seule chose en remonte, et elle n’est
  pas normative : ce que ce parent a changé par rapport au maître, soit les
  surcharges de `InstanceNode.overrides`, soit le remplacement d’une instance,
  que ce relevé ne rapporte pas et qui se lit en comparant l’instance à son
  maître, position par position. → [échantillon](#échantillon-de-maquette)
- Le parcours conserve le calque de l’instance pour le décrire comme un slot ;
  ce qu’il porte reste hors du contrat parent. Ses couleurs appartiennent à son
  contrat (`getSlotTokens`), ses dimensions ne le font pas élire node de layout
  (`findLayoutNode`).
- `composes` ne désigne que le calque qui est l’instance. Un calque qui
  l’enveloppe appartient au contrat parent : il publie son flux et range la
  dépendance dans `children`. Trois liens donnent trois enfants, et le cadre ne
  reprend une `visibilityProp` que lorsqu’une seule dépendance l’occupe.
  → [spec](./docs/FORMAT.md#cadre-de-dépendance)
- Ce cadre publie tous ses calques, pas seulement les branches de dépendance.
  `structureTree.publishesChildren` tranche l’unique exception : un cadre dont
  aucune branche ne mène à une dépendance ne publie rien. Chemins de typographie
  et signatures suivent cette réponse.
- Chaque `variantViews[variants[].view].composes` se dérive de son arbre publié,
  dans son ordre ; le `composes` global en est l’union ordonnée à cardinalité
  maximale. Une dépendance non située sort des deux champs à la fois, sous
  avertissement. → [spec](./docs/FORMAT.md#composition-et-dépendances)

### Arbre des slots

- `structure.children` descend dès qu’un descendant porte une information qu’une
  feuille ne sait pas exprimer (texte, icône, dépendance, liaison de variable),
  à n’importe quelle profondeur. Borne : un calque dont aucun descendant ne porte
  d’information reste une feuille. `structureTree.ts` en est l’unique autorité ;
  extraction, `textSlots` et signatures la consultent sans la recalculer.
  Profondeur bornée à 12 niveaux, coupure dite dès qu’elle emporte autre chose
  qu’un dessin. → [spec](./docs/FORMAT.md#6-structure)
- Un conteneur publie tous ses calques rendables, à quelque profondeur qu’ils
  soient, jamais une sélection. `variants[].tokens` relève les couleurs du
  variant entier.
- Une typographie appartient à un calque texte et vient de son text style.
  `textStyles` lie le style à ses variables, la vue exacte situe son usage par un
  chemin de slots. Un slot à plusieurs textes décrit ses parts dans `children` :
  les nodes représentés y portent leur visibilité, les cibles graphiques non
  représentées restent dans `visibilityTargets`.
  → [spec](./docs/FORMAT.md#5-typographie)
- `icons.*.slot` et `icons.*.size` disent où et à quelle taille placer chaque
  icône. `slotNames.ts` est l’unique autorité sur le nommage : un `icons.*.slot`
  publié désigne toujours un slot réel de `structure.children`.
- Deux enfants d’un même parent ne portent jamais le même slot : `slotNames.ts`
  numérote parmi les slots déjà réservés sous ce parent, et les lecteurs refusent
  un arbre qui les confond. Deux parents distincts les nomment librement de la
  même façon, une adresse étant un chemin.
  → [spec](./docs/FORMAT.md#6-structure)
- Un dessin qu’aucune règle `@icons` ne désigne avertit : le contrat n’exporte
  aucun tracé, et le développeur recevra la place et les couleurs du calque,
  jamais son dessin. Le déclencheur est le tracé (`nodeBindings.estUnTrace`, la
  même autorité que pour les dimensions), jamais l’absence de texte. Un seul
  message par dessin, sur le calque le plus profond qui le contienne encore en
  entier ; un composant qui est un dessin ne dit rien.
- Masquer et remplacer sont deux libertés distinctes : le booléen Figma dit si
  une icône s’affiche, la prop runtime dit laquelle rendre. Une icône toujours
  visible est modifiable comme une autre, sans booléen et sans signalement.
  → [spec](./docs/FORMAT.md#7-intention-et-documentation-des-props)
- Le contrat donne le carré d’une icône, jamais son dessin ni de quoi le
  trouver : il ne nomme aucun jeu d’icônes, ne porte aucune correspondance vers
  l’identifiant d’un tel jeu, et ne dit rien de la taille du glyphe à
  l’intérieur de ce carré. Ces trois décisions appartiennent au repository
  consommateur, et `ucm icons` est leur contrepartie : elle énumère ce
  qu’il y a à couvrir, jamais ce qui est couvert.
  → [spec](./docs/FORMAT.md#ce-que-le-contrat-ne-dit-pas-dune-icône)

### Layout, dimensions et bornes

- Le node de layout d’un variant s’élit au score, donc en fonction de la racine
  d’où part la recherche. `layoutNodes.ts` en est l’unique autorité. Aucune
  extraction ne choisit le calque qu’elle décrit : toutes reçoivent l’élection,
  `sizes` comprise. → [spec](./docs/FORMAT.md#3-layout)
- Ce que l’élection écarte est dit. Un calque hors du node élu, ou à côté d’une
  dépendance dans son cadre, ne reçoit ni slot, ni typographie, ni visibilité,
  alors que ses couleurs entrent dans `variants[].tokens` : il avertit.
- Un auto-layout linéaire publie ses alignements (`justifyContent`,
  `alignItems`) ; ses slots ne publient que leurs exceptions (`alignSelf`,
  `flexGrow`). Une absence signifie hors flux ou non applicable, jamais
  `flex-start` deviné. → [spec](./docs/FORMAT.md#flux-et-alignement)
- Le menu de dimensionnement Figma fait autorité, axe par axe ; un axe ne décide
  jamais de l’autre. Pour un slot : `Fill` se publie, `Fixed` cite une variable
  dans `size`, l’absence vaut `Hug`, une dimension figée sans variable avertit.
  Pour le composant : `structure.sizing` est toujours publié, en vocabulaire CSS
  (`stretch`, `fit-content`) et par propriété (`width`, `height`).
- Ce qui sépare une taille de maquette d’une décision du design system est la
  liaison, jamais le fait d’être figé : sans variable une largeur fixe vaut
  `stretch`, avec variable elle publie son token. Un nombre brut n’est jamais
  contractuel, une variable liée l’est toujours, sauf là où Figma ne permet pas
  de lier. Ces exceptions sont énumérées : les pistes et cellules d’une
  grille, et la place d’un calque hors du flux. Toutes publient en pixels sous
  une notice, sans devenir des tokens et sans dégrader la couverture.
  → [spec](./docs/FORMAT.md#dimensions-et-bornes)
- Un tracé n’est pas une boîte : sur un `VECTOR`, `BOOLEAN_OPERATION`, `STAR` ou
  `POLYGON`, la dimension est le dessin, et le contrat ne lui réclame aucune
  variable ; liée, elle se publie comme partout ailleurs. `RECTANGLE`, `ELLIPSE`
  et `LINE` en sont exclus : ce sont les formes que la règle « le type du node ne
  tranche pas » vise nommément.
- Un calque hors du flux est placé : `constraints` dit à quels bords il
  s’accroche, `inset` à quelle distance, en pixels et avec une seule
  signification par clé : les côtés publiés sont ceux de l’accroche, les deux
  d’un axe sous `stretch`, `center` et `scale`. Le calcul passe par le centre.
  Rien n’est publié quand la géométrie manque.
  → [spec](./docs/FORMAT.md#position-absolue)
- La `rotation` d’un calque publié est écrite, en convention CSS, absente sous
  le centième de degré. `flexLayout.rotationDegrees` en est l’unique autorité.
  Une notice dit le seul écart restant : dans un auto layout, Figma espace ses
  voisins d’après la boîte tournée, CSS d’après la boîte droite.
- `bounds` publie les bornes sur le composant et sur chaque slot, indépendamment
  du menu de dimensionnement, à la règle commune. Le geste demandé est de nommer
  la borne, jamais de la retirer. Un calque intermédiaire n’en est pas
  propriétaire et avertit. → [spec](./docs/FORMAT.md#dimensions-et-bornes)
- Une valeur uniforme n’est valide que si tout le groupe requis est lié. Les
  côtés d’un même champ peuvent citer des variables différentes : le contrat
  publie alors le détail (`padding.x`, `padding.y`, `radius`, largeur d’un
  stroke), et garde la forme courte quand ils la partagent. Un groupe par côté
  peut être partiel si les côtés absents valent zéro ; un côté fixe non neutre
  avertit. La taille d’un slot n’en est pas un et exige une variable unique.
  L’élection du node de layout ne compte que `hasCompleteBinding`.
- `wrap` est une propriété de flux et reste au niveau haut même sous `sizes`.
  `rowGap` est un token à la règle commune ; son absence sous `wrap` vaut `gap`.
  → [spec](./docs/FORMAT.md#passage-à-la-ligne)
- Une propriété Figma qu’aucun champ du schéma ne porte avertit au lieu de
  disparaître. `layout` reste publié parce que sa forme l’exige, et son repli
  `flex-row` se signale.
- Une propriété à effet visuel qu’aucun champ du schéma n’écrit avertit, mais
  seulement sur un calque publié et jamais pour une valeur au défaut de Figma.
  La première réserve écarte le masque d’une icône, dont ce relevé ne voit jamais
  les tracés ; la seconde écarte `clipsContent` et l’alignement d’un texte en
  `Hug`. Aucune réserve ne se lit sur l’usage supposé d’un calque : sur un calque
  publié, `isMask` avertit comme le reste. Une propriété que le contrat écrit
  n’y figure jamais, `rotation` comprise.
  → [spec](./docs/FORMAT.md#propriétés-non-portables)

### Grilles

- Sous une grille, la cellule fixe la boîte ; les pistes (`columnSizes`,
  `rowSizes`) et la place de chaque enfant (`columnStart`, `rowStart`, spans) la
  décrivent. Le menu de dimensionnement n’y fait plus autorité : un enfant ne
  publie sa dimension que s’il cite une variable, et son absence ne se réclame
  jamais. Borne : un alignement explicite le détache de sa cellule et la règle
  commune revient.
- Exception propre aux grilles : une piste `FIXED` publie sa valeur en pixels,
  sans devenir un token ni dégrader la couverture, et **sans un mot au
  designer** : rien ne manque, aucun geste n’existe, et l’exception est écrite
  dans la spécification. Un runtime qui n’expose pas les pistes ne publie rien et
  n’avertit de rien ; une piste illisible, elle, avertit.
- L’exception s’étend de la piste à la cellule, et là seulement : sous une piste
  `HUG`, `GridTrackSize.value` n’existe pas et la mesure ne porte que sur l’enfant,
  publiée en pixels dans `structuralSize`, elle aussi sans diagnostic. Trois
  bornes : une variable liée l’emporte et se publie dans `size`, qui reste
  strictement tokenisé ; une seule piste non `HUG` sous l’étendue de l’enfant
  rend l’axe indécis et rien n’est publié ; un alignement explicite retire
  l’exception, sans quoi la valeur contredirait l’avertissement de
  `resolveSlotSize` sur le même axe. → [spec](./docs/FORMAT.md#grilles)

### Diagnostics

- Une donnée facultative incomplète avertit. Les préconditions explicitement
  définies dans la spécification bloquent. Unique exception, motivée plus bas :
  l’échantillon de maquette ne réclame jamais rien.
  → [échantillon](#échantillon-de-maquette)
- On n’avertit que sur ce qu’on publie. Une valeur que le contrat va jeter,
  comme les dimensions du calque de référence quand `sizes` existe, n’est ni
  relevée ni signalée.
- Un avertissement s’adresse au designer : nom Figma exact, ce qui manquera,
  geste à faire. Les trois sont exigés ; un constat qui ne nomme aucun geste
  n’est pas un avertissement, et il ne s’écrit nulle part.
- **Les trois parties voyagent séparées**, du site d’émission jusqu’à
  l’interface : un site écrit un `Constat` (`src/contract/localisation.ts`),
  jamais une phrase. La phrase compacte que publient `meta.diagnostics`, la
  pull request et le journal s’en dérive (`phraseDe`), sans seconde rédaction ;
  l’interface, elle, met les parties en page et ne recoupe rien. Deux lois le
  tiennent (`tests/loiDesParties.test.ts`) : l’une lit la source et refuse
  qu’un message s’écrive ailleurs qu’à l’autorité, l’autre lit la sortie du
  moteur et refuse un message sans ses parties.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- **Un export ne remonte que ce qui demande une décision.** Trois portes, et
  rien d’autre. Une transformation entièrement prise en charge est silencieuse
  dans le plugin, dans la pull request et dans `meta.diagnostics` ; la
  spécification et les tests du format portent cette règle.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- `meta.diagnostics` est l’unique propriétaire des messages publiés dans le
  contrat. Un consommateur qui veut la liste lisible lit `diagnostics[].message`,
  sans filtrer sur `severity`.
- Le corps de la pull request a deux zones. L’en-tête dit l’identité de ce qui
  est déposé : le chemin, et le schéma de contrat pour un contrat. La liste ne
  porte que des gestes. Ce que le plugin compte, ce que la pull request liste et
  ce que `meta.diagnostics` publie sont la même liste.
  → [CONTRIBUTING](./CONTRIBUTING.md#avertissements-de-lexport)
- `meta.figma.url` est absent des contrats produits aujourd’hui, ce qui est un
  état normal.
  Le plugin se distribue par la Community, donc sans
  `enablePrivatePluginApi`, donc sans `figma.fileKey`. Le champ reste optionnel
  au schéma, puisqu’un contrat plus ancien le porte encore, et son absence ne
  produit aucun diagnostic : la traçabilité passe par `fileName` et `nodeId`, annoncés
  dans le corps de la pull request.
  → [spécification](./docs/FORMAT.md#métadonnées)
- Le schéma annoncé dans l’en-tête est lu dans le fichier déposé
  (`versionDeContrat()`, `format/version.ts`), jamais dans `CONTRACT_VERSION`.
  `tokens.json` n’en reçoit aucun : il ne porte aucun schéma UCM.
  → [spécification](./packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-github)
- Un export identique n’ouvre jamais une seconde pull request. L’immobilité se
  juge sur la branche de base **et** sur les pull requests d’export encore
  ouvertes (`exportsEnVol()`, `src/github.ts`). Le verdict porte l’endroit où le
  contenu identique a été trouvé, et le journal le dit. Un contenu différent
  pendant qu’une pull request est ouverte est un réexport après correction, donc
  le geste normal, et il n’est pas refusé.
  → [spécification](./packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-github)
- Un avertissement entre dans le corps de la pull request en Markdown :
  `sansLienAutomatique()` (`src/github.ts`) publie `@nom` et `#123` en `code`.
  → [spécification](./packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-github)

### Échantillon de maquette

- `figmaLayer` est une **identité** Figma, jamais un contenu, que Figma nomme ou
  non un calque texte d’après ce qu’il dit. Le contenu se lit dans `samples`, ou
  nulle part.
- L’échantillon ne contient que des valeurs qu’un développeur pourrait écrire
  lui-même : texte, booléen, valeur d’enum, nom de composant. Jamais un token,
  une couleur, une dimension, un layout. Une donnée de rendu qui manquerait ici
  manque au contrat normatif, seul endroit où la corriger.
- Tout le non normatif tient sous `samples` et `variants[].sample`, et nulle part
  ailleurs. Les retirer laisse un contrat strictement normatif ; aucun contrôle
  ne compare ce contenu au code.
- Corollaire : une donnée non normative ne doit jamais pouvoir dégrader une
  structure normative, ni sa taille, ni sa déduplication, ni sa validation. D’où
  un catalogue à part, et non un champ dans `variantViews`.
- L’échantillon n’avertit de rien et ne dégrade jamais `meta.coverage.portable` :
  ce qu’il ne sait pas lire, il l’omet. En contrepartie, la spécification énumère
  ce qu’il ne sait structurellement pas porter, et `args` est publié comme un
  SOUS-ENSEMBLE. En cas de désaccord avec une donnée normative, la normative
  l’emporte.
- `args` est la projection fermée de la même surface publique que `props` :
  owner direct, puis unique wrapper de dimensions élu et exposé. Aucun repli
  sur une clé brute, aucune autre instance exposée, aucun `SLOT`. Une collision
  ou une provenance ambiguë s’omet au lieu de choisir une première occurrence.
- Ce que la visibilité effective filtre est le relevé positionnel nu (`text`,
  `override.text`, `swaps`), celui qui rapporte ce qu’un calque porte sans
  rapporter la condition qui le masque. Une valeur d’`args` n’en est jamais, le
  booléen qui la masque voyageant dans le même `args` : restent donc publiés
  sous un calque masqué une valeur `false` d’`args`, un `override.visible` et
  l’entrée d’une dépendance. La frontière de la remontée est la racine du
  composant exporté, jamais l’instance de dépendance, et `isVisibleInSample` en
  est l’unique autorité. Perte assumée : le variant qui affiche ce cadre publie,
  lui, ce que le relevé y trouve.
- Un `SLOT` ne borne que les comparaisons positionnelles, qui supposent
  l’instance isomorphe à son maître. Une lecture nominale, qui joint
  `componentPropertyReferences` à une propriété déclarée, le traverse.
- `propertySurfaces` est l’unique autorité sur la surface publique d’une
  dépendance, parce qu’elle a élu son wrapper, du même geste que l’export
  autonome de cette dépendance. Un owner absent de l’index laisse la
  dépendance sans `args`, plutôt qu’une surface fabriquée en dernier recours.
- L’adressage est asymétrique, et le nom de calque Figma en est la charnière :
  seule identité que deux contrats partagent, il adresse ce que ce contrat ne
  décrit pas, là où un slot adresse ce qu’il décrit. D’où `text` chez soi et
  `overrides` chez autrui.
  → [spec](./docs/FORMAT.md#9-échantillon-de-maquette)
- Un remplacement d’instance dans une dépendance se publie dans `swaps`, jamais
  dans `overrides` : les deux relevés n’ont ni la même source, Figma ne
  rapportant pas `mainComponent`, ni la même adresse. `masterPath` nomme les
  calques du maître, parce que Figma renomme le calque remplacé d’après son
  nouveau composant et que le nom du maître est le seul que le contrat de la
  dépendance publie. Bornes : on compare le composant propriétaire et non la
  variante, et le relevé s’arrête sur une dépendance de la dépendance, un
  `SLOT`, ou un calque déjà déclaré remplacé.
  → [spec](./docs/FORMAT.md#9-échantillon-de-maquette)
- `swaps` ne rapporte que ce qu’`args` ne sait pas dire. Une INSTANCE_SWAP native
  a déjà sa prop dans le contrat de la dépendance, `mergeIconRules` y posant
  `runtimeProp` plutôt qu’une prop de synthèse.
- Une valeur d’INSTANCE_SWAP se publie par le nom du composant propriétaire,
  jamais par l’identifiant de node que rend `componentProperties`.
  `propertyBindings.appliedValue` porte cette règle pour le composant exporté,
  `argumentsOf` pour ses dépendances ; ni l’un ni l’autre n’ajoute d’aller-retour.
  Un remplacement qu’on ne sait pas nommer est omis, et `swaps` reste seul.

### Versionnage

- Un changement de forme du JSON incrémente `contractVersion` et met à jour la
  spécification et les consommateurs.
- `packages/kit/schema/ucm-contract.schema.json` est dérivé de `types.ts` par `npm run
  schema`, jamais rédigé. Il décrit la forme, pas la cohérence : il ignore les
  renvois internes et le format des valeurs tokenisées, et ne remplace aucun
  contrôle du consommateur. Sa propre `description` énonce ses limites.

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

Chaque paquet a son `scripts/run-tests.cjs`, qui découvre les fichiers
`tests/*.test.ts` et `tests/*.test.mjs` de son dossier. Tout bug corrigé
reçoit un test de régression.

Un changement dans `packages/kit/src/format/types.ts` demande `npm run schema` :
le schéma commité en est dérivé, et `packages/kit/tests/schema.test.ts` refuse
une version périmée en la régénérant pour la comparer.

**Le moteur ne se teste sur aucun contrat commité.** Un `.contract.json`
appartient au repository qui le consomme, à côté du code qu’il décrit. Un
exemplaire commité pour juger le moteur serait un instantané : il ne bougerait
qu’au réexport, si bien qu’une régression ne s’y verrait jamais, et un test posé
dessus ne prouverait que sa propre immobilité. Les tests de
`packages/plugin/tests/` jugent ce que le moteur fabrique au moment du test.

**Le lecteur, lui, pose la question inverse.**
`packages/kit/fixtures/contrats/` porte un corpus de la version **précédente**,
quatre contrats 11.0, et ce corpus est nécessaire : la fenêtre de lecture à deux
versions n’est observable qu’à partir de contrats que le moteur ne produit
plus. L’immobilité, qui est le défaut de l’instantané côté moteur, est ici
la propriété recherchée.

Trois bornes le tiennent :

- il n’est **jamais** comparé à une sortie du moteur ; un tel test serait
  exactement ce que la règle ci-dessus interdit ;
- il n’est **jamais** rafraîchi : un réexport le rendrait inutile, puisqu’il
  cesserait d’être N‑1. Ses empreintes SHA‑256, dans le README voisin, sont ce
  qui empêche de le croire frais ;
- il **disparaît** quand la fenêtre de lecture se referme au-dessus de sa
  version, en même temps que le code de compatibilité qu’il couvre, jamais avant.

Il n’est pas publié : `files` du kit ne l’inclut pas.

`packages/plugin/tests/lois.ts` est l’unique autorité sur les lois de forme d’un
contrat, et `packages/plugin/tests/exportComponent.test.ts` les applique à chaque
contrat que le moteur fabrique : renvois qui se résolvent, catalogues sans doublon ni entrée
orpheline, adresses (slotPath de typographie, chemins de peintures,
`icons.*.slot`) qui désignent un calque de l’arbre qui les porte, absence de
valeur neutre écrite, résolution de chaque clé de couleur vers un rôle de la
bonne nature, `inset` réservé aux calques hors du flux, accord avec le schéma
publié, aller-retour de l’écriture.

La vérification est posée sur le chemin d’appel, une fois, et non à chaque
scénario : un cas ajouté demain y est soumis sans que personne y pense, et une
loi ajoutée à `lois.ts` s’applique du même geste à tous les cas existants.
Le même endroit porte la seule question que le schéma ne peut pas trancher
seul : accepte-t-il ce que le moteur écrit, et non ce que `types.ts` déclare ?
Un champ requis qu’une élision retire passe le compilateur et casse le
consommateur.

### La frontière de recette

Tout ce qui précède se prouve ici, hors de Figma et hors de GitHub. `npm test`
couvre le moteur sur ses propres sorties, les lecteurs sur des contrats
fabriqués, le CLI et l’adaptateur sur des fixtures, et `packages/cli/tests/`
`recette.test.mjs` sur des repositories temporaires, dont le cas nominal n’a
même pas de `package.json`. Aucun de ces tests n’ouvre un clone voisin.

Ce qui ne se prouve pas ici : **Figma, GitHub et une vraie pull request**. Ces
trois-là se rejouent dans
[UCM-Playground](https://github.com/Vassili-g/UCM-Playground), une application
React qui ne porte aucun outillage UCM local. Son empreinte du produit se limite
aux cinq fichiers qu’`ucm init` écrit, ce qui rend la recette probante : un
contrôle qui manque là-bas se referme ici, jamais par un script rendu au
consommateur. [docs/RECETTE.md](./docs/RECETTE.md) porte la marche à suivre, ses
critères de fin et le geste de publication qui la suit.

Aucun contrôle ne la réclame et `publish.yml` ne la mentionne pas : le numéro
publié est gardé par `npm test`, par l'épreuve du registre et par le contrôle
des pins servis. La rejouer est une décision du mainteneur.

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
