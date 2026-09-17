# Plan d'action du template de règles

> Statut : décisions H1 prises, deux questions ouvertes (section 11). Ce
> document est le livrable de la
> [section 12](./RECHERCHE-TEMPLATE-REGLES.md#12-livrable-attendu) du plan de
> recherche, rédigé en plan d'action à la demande du mainteneur. Une revue
> indépendante en a relu la première version ; la
> [section 14](#14-revue-indépendante) dit ce qui en a été retenu. Rien n'a été
> écrit dans Figma.

Commit lu : `94ec0a9`. Fichier Figma lu : le fichier de tests du mainteneur,
pages « Components » et « Règles [.componentRules] », par `get_metadata` et
`get_design_context` seulement.

Quatre statuts qualifient les faits :

- **mesuré** : relevé dans le code du commit lu ou dans le fichier Figma ;
- **documenté** : écrit par Figma, dans sa documentation, dans son guide MCP ou
  dans `@figma/plugin-typings` 1.138.0, la version installée ;
- **rapporté** : écrit par un tiers (issue, forum), sans confirmation de Figma ;
- **non vérifié** : aucune source, à mesurer pendant l'essai de la phase 1.

## 1. Ce que la recherche change au plan

Sept constats ont modifié la demande ou l'ordre du travail.

1. **Le maître `.componentRules` n'est pas sur la page des composants.**
   Mesuré : il est rangé sur la page « Règles [.componentRules] », et la page
   « Components » ne porte que cinq instances. Avec D5, la source du template
   est donc le plus souvent une instance déjà posée, lue par
   `getMainComponentAsync`. Une page qui ne porte ni maître ni instance ne
   permet pas de créer le premier template.
2. **Une règle fraîchement posée publie son texte d'exemple.** Mesuré : chaque
   variant de `.ruleItem` est livré avec un texte dans `content` (« A quoi sert
   le composant ») et une cible fictive dans `prop` (`prop.name`). Une instance
   neuve de `@usage`, `@do`, `@dont` ou `@pairs` exporte ce texte comme
   documentation réelle, aujourd'hui déjà, sans template. Le marqueur
   `[À compléter]` (section 6.2) corrige ce défaut.
3. **Remplir un slot d'instance est documenté par Figma, avec des réserves.**
   Le guide MCP de Figma écrit qu'on ajoute un contenu au slot d'une instance
   « like any other node », et qu'un handle peut être invalidé par l'ajout. La
   référence de `SlotNode` n'en dit rien, et les deux sources se contredisent
   sur `resetSlot`. Rapporté : une issue ouverte donne l'erreur « Cannot move
   node. New parent is an instance », un fil du forum dit qu'un enfant existant
   d'un slot d'instance ne se retire pas. Le template retire des sections par
   défaut : un essai dans Figma précède le code.
4. **La surface publique ne se lit pas sur le component set seul.** Mesuré :
   sur le component set de test à trois variant properties, le conteneur rédigé
   documente aussi un axe de tailles et trois boolean properties portés par le
   wrapper `.sizeWrapperButton`. Un template construit sur les seules
   définitions du set perdrait 6 des 17 règles de propriétés rédigées. Une
   analyse les publie toutes.
5. **Sélectionner l'instance créée efface la carte.** Mesuré : un changement
   de sélection réinitialise la carte du composant (`CarteComposant.afficher`),
   conformément à la règle « un résultat ne survit pas à son sujet ».
6. **L'annulation d'une création faite plugin ouvert n'est pas établie.**
   Documenté : « By default, plugin actions are not committed to undo
   history », avec un exemple qui se termine par `closePlugin`. Rien n'est écrit
   sur un plugin qui reste ouvert, ce qui est le cas du plugin UCM.
7. **L'export fusionne les avertissements identiques.** Mesuré
   (`exportComponent.ts`, `Array.from(new Set(…))`) : deux sites qui écrivent la
   même phrase donnent une ligne, et `noter` garde les nodes des deux. Un
   avertissement groupé par tag s'appuie sur ce mécanisme (section 6.2).

## 2. Faits de la section 1.3, vérifiés

| Fait du plan de recherche | Verdict | Vérifié dans |
|---|---|---|
| Le plugin ne modifie jamais le document | Exact. La promesse est écrite à onze endroits (4.1) | `AGENTS.md`, `SPEC.md` |
| Un test refuse `figma.create*`, `appendChild`, `insertChild`, `.remove()`, `setPluginData`, `commitUndo` hors de `src/ui` | Exact, neuf motifs. `createInstance`, `setProperties`, l'affectation de `characters`, `x` et `y` n'y figurent pas, ni `figma.union` et ses voisins, qui créent des nodes | `tests/loiDuDocumentIntact.test.ts` |
| Aucun membre de `UiRequest` n'écrit | Exact | `src/messages.ts` |
| Le conteneur se reconnaît au calque `component-name` d'une instance | Exact, type `INSTANCE` exigé | `nomDeComposantEcrit`, `extractRules.ts` |
| Une règle se reconnaît au nom du component set de son maître | Exact. Un maître sans parent donne son propre nom (`Type=@prop`) et la règle est ignorée. Documenté : un maître distant n'a pas toujours de parent. L'effet sur une bibliothèque est non vérifié | `isRuleInstance`, typings de `BaseNode.parent` |
| Le tag se lit sur le calque, puis sur la valeur de variante | Exact | `ruleTagOf` |
| Une règle sans texte ni cible est écartée sans avertissement | Exact, calques `content`, `prop`, `icon` | `nEcritRien` |
| `content` vide hors `@icons` et `@default` avertit | Exact. Le message ne porte aucun node et reste identique d'une règle à l'autre du même tag | `buildRules`, `pousserSansNode` |
| Plusieurs conteneurs donnent une note, le premier est lu | Exact | `extractRules` |
| Les règles se lisent sur la page courante | Exact | `figma.currentPage.findAll` |
| Un conteneur déclare son composant comme dépendance | Corrigé : c'est `rulesContainerOwner`, sur tout le document, et non `RULES_CONTAINER_NAME` | `indexContractedNamesInDocument`, `composedComponents.ts` |
| Types de propriétés lus | Exact | `parsers.ts` |
| L'axe `State`/`Status` est publié par `stateModel` | Exact | `mergePropDescriptions.ts` |
| Un axe sans `@default` ne publie aucun défaut | Exact | `RulesResult.enumDefaults`, `parsers.ts` |
| La cible est décrite par `etatDeCible` | Exact. Un variant seul est un `COMPONENT` et devient une cible valide, `getSelectedComponent` compris | `cible.ts`, `exportComponent.ts` |
| La carte porte « Analyser le composant » | Exact. Le bouton reste visible et inactif après une analyse | `CarteComposant.ts` |
| `documentAccess: "dynamic-page"` | Exact | `manifest.json` |
| `loadAllPagesAsync` n'est appelé que par l'index des dépendances | Exact, un appel | `composedComponents.ts` |
| Section 1.2 : l'instance `.rulesItems` de la section d'options est ignorée | Infirmé. Le calque s'appelle `.rulesItems`, son maître est la variante `@boolean` de `.ruleItem`, la règle est lue | `get_design_context` |

## 3. Structure relevée dans Figma

Relevé fait avant la décision H1-B : les textes cités sont ceux d'avant le
marqueur `[À compléter]`.

### 3.1. `.componentRules`

Mesuré sur le maître :

```text
.componentRules (COMPONENT, 588 × 1214, auto layout vertical)
├─ Label / « REGLES D’UTILISATION »                texte d'habillage
└─ Wrapper
   ├─ component-name-wrap / component-name (TEXT)  « Button », style Headline/Medium
   └─ Sections-Wrapper (SLOT, 546 px, contenu rogné)  contenu par défaut :
      ├─ .rulesSection Section=general        @usage, @default
      ├─ .rulesSection Section=props          @prop
      ├─ .rulesSection Section=options        @boolean
      ├─ .rulesSection Section=icons          @icons
      └─ .rulesSection Section=documentation  @do, @dont, @pairs
```

Aucun texte n'est exposé en component property. Le calque `component-name`
emploie un text style dont la famille est une variable (Open Sans Bold). Le
maître écrit un nom de composant : toute instance neuve revendique ce nom tant
qu'on ne l'a pas changé, ce que `extractRules` signale déjà par sa note de
doublon.

### 3.2. `.rulesSection`

Mesuré : component set à une variant property, `Section`, de valeurs
`general`, `props`, `options`, `icons`, `documentation`. Chaque variant porte
un titre en capitales et un slot `Rules-Wrapper` dont le contenu par défaut est
listé en 3.1. Le moteur ignore les sections (FORMAT.md, section 7).

### 3.3. `.ruleItem`

Mesuré : component set à une variant property, `Type`. Chaque variant mesure
689 px de large, alors que les règles rangées dans un slot sont en Fill à
526 px. Tous les textes sont en Open Sans Regular 16 et aucun n'est exposé en
component property.

| Variant | Calques texte | Texte d'exemple relevé | Effet d'une instance neuve à l'export |
|---|---|---|---|
| `Type=@usage` | `@usage`, `content` | « A quoi sert le composant » | publié dans `intent.usage` |
| `Type=@default` | `prop`, `@default`, `content` | `prop.name`, « Quel est la variante par défaut du composant » | avertissement : aucune variant property `prop` |
| `Type=@prop` | `prop`, `@prop`, `content` | `prop.name`, « Lister chaque prop du composant et leur usage » | avertissement : aucune variant property `prop` |
| `Type=@boolean` | `prop`, `@boolean`, `content` | `boolean-name`, « Lister chaque propriété booléenne du composant » | avertissement : aucune boolean property `booleanName` |
| `Type=@icons` | `icon`, `@icons`, `strict`, `or`, `modifiable` | `icon-name`, les trois mots visibles | avertissement : aucune politique visible seule |
| `Type=@do` | `@do`, `content` | « Décrit un usage autorisé du composant » | publié dans `intent.do` |
| `Type=@dont` | `@dont`, `content` | « Décrit un usage interdit du composant » | publié dans `intent.dont` |
| `Type=@pairs` | `@pairs`, `content` | « Décrit les composants avec qui ce composant est fréquemment utilisé » | publié dans `intent.pairs` |
| `Type=divider` | aucun | aucun | écarté sans avertissement |

La variante `@default` porte un calque `content`, que FORMAT.md, section 7, dit
absent : le moteur ne le lit pas. Le calque qui affiche `OR` s'appelle `or`,
sans effet sur le moteur.

### 3.4. Un conteneur rédigé

Mesuré sur l'instance qui documente le component set de test à trois variant
properties. Elle montre ce qu'un designer écrit quand il remplit les règles à
la main :

| Section | Contenu rédigé |
|---|---|
| général | 1 `@usage`, aucun `@default` |
| propriétés | 12 `@prop`, groupées par axe (3, 6 et 3 valeurs) et séparées par deux `divider` |
| options | 3 `@boolean`, cibles écrites en kebab-case |
| icônes | 2 `@icons`, `modifiable` seul visible |
| documentation | 2 `@dont`, ni `@do` ni `@pairs` |

Aucune des cinq valeurs de l'axe d'états n'est documentée. Les exemples du
maître ont disparu de tous les slots : le geste manuel retire les enfants par
défaut d'un slot d'instance. Le template de la section 6 reprend cette forme.

## 4. L'écriture bornée à un module

### 4.1. Les promesses à réécrire

Mesuré par recherche dans le dépôt :

| Fichier | Phrase |
|---|---|
| `AGENTS.md`, ligne 3 | « Il ne modifie jamais le document Figma. » |
| `packages/plugin/SPEC.md`, « Hors périmètre MVP » | « Pas d'écriture dans le document Figma » et la sous-section « Sélectionner et cadrer ne sont pas modifier » |
| `packages/plugin/SPEC.md`, partie 2 | « il ne modifie jamais le document » (profil de couleur) |
| `packages/plugin/README.md`, « Ce que le plugin ne fait pas » | « Il n'écrit rien dans le document Figma : aucun calque créé… » |
| `packages/plugin/README.md`, règles d'usage | « Le plugin ne modifie jamais ces règles. » |
| `packages/plugin/package.json` | `description` : « Il ne modifie jamais le document. » |
| `docs/guides/POUR-LES-DESIGNERS.md`, ligne 25 | « … jamais votre document Figma. » |
| `docs/format/FORMAT.md`, section 7 | « lue sans jamais écrire dans Figma » |
| `src/contract/extractRules.ts`, en-tête | « Le plugin n'écrit jamais dans Figma » |
| `tests/loiDuDocumentIntact.test.ts` | commentaire de `HORS_SANDBOX` et message d'échec |
| `src/code.ts`, `montrerLesCalques` | « Rien n'est écrit dans le document », « ce que ce plugin ne fait jamais » |

Le plan des réglages, encore ouvert, pose aussi « Le plugin n'écrit rien dans
le document Figma » parmi ses contraintes
([RECHERCHE-REGLAGES.md](../R%C3%A9glages%20du%20plugin/RECHERCHE-REGLAGES.md#3-contraintes)).
`CONCEPT.md` et le `README.md` racine ne portent aucune promesse de ce genre.

Trois phrases de SPEC.md sont figées par `tests/inventaireInvariants.test.ts` :
« Tranché, et la question se reposera. », « Ce qui reste à vérifier, et qui
n'est pas vérifiable depuis ce dépôt : » et « La frontière que cette décision
ne déplace pas. », ainsi que le titre de la sous-section. Le même test fige la
liste des dix groupes d'invariants d'`AGENTS.md`. Les réécrire fait passer ce
test au rouge : il change dans le même commit.

Nouvelle promesse proposée, pour `AGENTS.md` et SPEC.md : « L'analyse et la
publication ne modifient jamais le document Figma. Un seul geste y écrit : la
création des règles d'usage, qui pose une instance de `.componentRules` à côté
du composant, ou remplit une instance vierge. Supprimer cette instance défait
la création. »

### 4.2. Les appels nécessaires et la loi

| Geste | Appel | Motif actuel de la loi |
|---|---|---|
| Lire le maître d'une instance | `getMainComponentAsync` | lecture |
| Créer le conteneur, chaque règle et chaque séparateur | `ComponentNode.createInstance` | aucun |
| Écrire `component-name` et `prop` | affectation de `characters`, après `loadFontAsync` | aucun |
| Étirer une règle à la largeur du slot | affectation de `layoutSizingHorizontal` | aucun |
| Ranger une règle dans un slot | `appendChild`, `insertChild` | `déplacement de node` |
| Retirer les sections et les exemples inutiles | `.remove()` ou `resetSlot` | `suppression de node`, aucun |
| Placer le conteneur | affectation de `x` et `y` | aucun |
| Défaire un échec à mi-parcours | `.remove()` sur le conteneur créé | `suppression de node` |

Le template n'écrit jamais `content` ni `icon` : ces calques gardent le texte
d'aide du maître et son marqueur.

Mesuré : aucun des motifs suivants n'apparaît dans le sandbox, et la liste
`ECRITURES` peut les nommer sans faux positif :

- `.createInstance(`, `.setProperties(`, `.detachInstance(`,
  `.swapComponent(`, `.resetSlot(`, `.clone(` ;
- l'affectation de `.characters`, `.x`, `.y`, `.mainComponent`,
  `.layoutSizingHorizontal`, `.layoutSizingVertical` ;
- `.removeOverrides(`, `.resetOverrides(`, `.insertCharacters(`,
  `.deleteCharacters(`, `.setRange…(` ;
- `figma.union(`, `figma.subtract(`, `figma.intersect(`, `figma.exclude(`,
  `figma.flatten(`, qui créent des nodes et passent aujourd'hui la loi.

L'affectation de `.name` (quatre classes d'erreur) et de `.visible` (un objet
d'échantillon) produiraient des faux positifs : elles restent hors de la liste.
Borne à écrire dans le commentaire de la loi : elle lit la source ligne par
ligne, et une écriture par `Object.assign` ou par crochets lui échappe.

### 4.3. Emplacement et frontière

Un dossier `src/template/`, dont un seul fichier est exclu de la loi. Un dossier
entier exclu laisserait un fichier de lecture ajouté plus tard échapper au
balayage sans que rien ne le dise.

- `src/template/modele.ts`, pur : du contrat analysé au modèle du template
  (sections, règles, séparateurs, tag, cible) ;
- `src/template/sources.ts`, lecture seule : trouver sur la page active un
  conteneur, un conteneur vierge et la source des maîtres ;
- `src/template/ecriture.ts`, seul fichier exclu : poser le modèle dans le
  document.

Assertions de la loi, sur le modèle de celles de `src/ui` : le fichier exclu
existe ; exactement un fichier est exclu hors de `src/ui`. Un second test lit
les imports : seul `src/code.ts` importe `src/template/ecriture.ts`, aucun
fichier de `src/contract/`, `src/tokens/`, `src/forges/`, ni `src/depot.ts` ou
`src/prevol.ts` n'importe `src/template/`, et `src/template/` n'appelle ni
`loadAllPagesAsync` ni `importComponentByKeyAsync` (D5).

### 4.4. Déclenchement

Une demande `{ type: 'creer-regles' }` s'ajoute à `UiRequest`, et
`traiterMessage` la route vers une fonction `creerRegles` de `code.ts`, seule à
importer `ecriture.ts`. `operationEnCours` reçoit une valeur propre à la
création : une analyse ou une publication en cours refuse la demande, et la
création refuse les deux. Le commentaire de `UiRequest`, celui de
`HORS_SANDBOX` et le message d'échec de la loi sont réécrits. Un test de
`code.test.ts` vérifie qu'aucune autre demande n'appelle l'écriture.

## 5. Obtenir les maîtres

### 5.1. Faits

- Documenté : `ComponentNode.createInstance` crée l'instance sous
  `figma.currentPage`. Un maître obtenu par `getMainComponentAsync` peut être
  distant ou sans parent, et un maître distant refuse qu'on change ses
  propriétés. Créer une instance d'un maître distant est non vérifié ; c'est le
  cas de l'équipe consommatrice (section 12).
- Mesuré : `rulesContainerOwner` est synchrone, et `extractRules` parcourt déjà
  toute la page à chaque sélection, appelé par `reportSelectionState`.
- Mesuré : le maître `.componentRules` range un exemple de chaque tag dans la
  section de ce tag (3.1). Ce rangement se lit sur le maître sans qu'aucun nom
  de section entre dans le code.

### 5.2. Ordre des sources

1. Un `COMPONENT` de la page active dont le nom compacté vaut
   `.componentrules`.
2. Sinon, le maître d'une instance de la page active qui porte
   `component-name`, quel que soit le composant qu'elle documente. Cette
   instance n'est ni lue ni modifiée.

La page de règles d'un design system porte le maître, la page d'un composant
porte des instances. D5 reste tenu : la recherche ne parcourt que la page
active, et le maître lu peut vivre ailleurs.

Le maître de chaque règle et de chaque section se lit sur les exemples du
maître `.componentRules`, par `getMainComponentAsync`. La variante d'une règle
se choisit par le calque de tag que porte l'exemple (`ruleTagFromLayerName`),
jamais par le nom de la variant property `Type`. La variante du séparateur est
celle du component set de `.ruleItem` qui ne porte aucun calque texte ; sans
component set lisible, le template ne pose aucun séparateur.

### 5.3. Le conteneur vierge

Décision H1-D : une instance collée et jamais remplie est remplie par le
plugin, qui n'en crée pas une seconde.

Une instance est vierge quand son calque `component-name` contient
`[À compléter]` et qu'aucune de ses règles n'est rédigée au sens de 6.2. La
seconde condition protège un conteneur dont on aurait effacé le nom par erreur :
le remplir détruirait ses règles. Le plugin remplit la première instance
vierge de la page, à l'endroit où le designer l'a posée. Une instance au nom
marqué qui porte une règle rédigée n'est pas vierge : le plugin crée alors une
instance à côté du composant.

### 5.4. Au changement de sélection

Aucun appel asynchrone de plus. Le parcours de la page que fait déjà
`extractRules` relève en même temps :

| Relevé | Offre |
|---|---|
| un conteneur écrit le nom du composant | pas de bouton |
| un variant seul est sélectionné | pas de bouton |
| une instance dont `component-name` contient `[À compléter]` | bouton : il remplira cette instance |
| un maître ou une instance qui porte `component-name` | bouton : il créera une instance |
| rien de tout cela | bouton inactif, avec le message de 5.5 |

Un conteneur rangé sur une autre page n'est pas cherché (décision H1-D) : le
bouton en crée un sur la page active. La résolution des maîtres, la
vérification du conteneur vierge, la vérification des textes d'aide et le
chargement des polices se font au clic, avant toute écriture.

### 5.5. Page sans source

Texte proposé, sous le bouton inactif : « Aucune instance de
« .componentRules » sur cette page. Collez-en une depuis la page de vos règles
pour créer celles de ce composant. »

## 6. Du contrat aux règles

### 6.1. Contenu du template

Décision H1-E : le template ne pose que les règles que le composant emploie.
La source est le contrat que `handleExportComponent` produit au clic : il
publie la surface élue, les clés sémantiques (`size`) et l'axe d'états.

| Section, lue sur le maître | Quand elle apparaît | Règles posées | Calque `prop` écrit |
|---|---|---|---|
| celle de l'exemple `@usage` | toujours | une `@usage` | aucun |
| celle de l'exemple `@prop` | dès qu'un axe est publié | une `@prop` par valeur, groupées par axe dans l'ordre de `props`, l'axe d'états en dernier ; un `divider` entre deux axes | `<clé>.<valeur>`, clé et valeur publiées |
| celle de l'exemple `@boolean` | dès qu'une boolean property est publiée | une `@boolean` par boolean property, hors `disabled` issu de l'axe d'états | `<clé>`, forme publiée (`iconLeft`) |
| celle de l'exemple `@icons` | toujours | une `@icons` | aucun : `icon` garde son texte d'aide |

Ne sont pas posés : `@default`, `@do`, `@dont`, `@pairs`, et les propriétés
`TEXT`, `INSTANCE_SWAP` et `SLOT`, qu'aucun tag ne documente (section 15).
Une section sans règle est retirée du conteneur.

La clé publiée est la seule forme que `mergePropDescriptions` retrouve à coup
sûr : un axe renommé par la couche sémantique (`size`) ne se retrouve pas par
son nom Figma. `normalizePropKey` accepte aussi `icon-left`, forme que le
designer du corpus écrit ; le template écrit la forme publiée.

La section des icônes reçoit une règle vide même quand le composant n'a pas
d'icône. L'analyse sait pourtant nommer les dessins qu'aucune règle ne
désigne : c'est l'avertissement « dessin non déclaré » de
`warnUndeclaredDrawing`. Écrire ces noms dans `icon` reste possible plus tard
(section 15).

Volume mesuré sur le component set de test : 1 `@usage`, 17 `@prop` réparties
sur quatre axes (3, 6, 3, et 5 états) avec 3 séparateurs, 3 `@boolean`, 1
`@icons`, soit 22 règles.

### 6.2. Le marqueur `[À compléter]`

Décision H1-B : un texte d'aide commence par `[À compléter]`. Une règle dont un
calque lu contient ce marqueur n'est pas rédigée : elle n'entre pas dans le
contrat et produit un avertissement. Le marqueur sert à toute règle, posée par
le template ou à la main.

| Tag | Calques où le marqueur se cherche |
|---|---|
| `@usage`, `@do`, `@dont`, `@pairs` | `content` |
| `@prop`, `@boolean` | `content`, `prop` |
| `@default` | `prop` ; son `content` n'est pas lu |
| `@icons` | `icon` |
| conteneur | `component-name` : le conteneur est vierge (5.3) |

Comparaison : la chaîne `[À compléter]` après normalisation Unicode, sans tenir
compte de la casse. Le marqueur est une constante d'`extractRules.ts`, à côté
de `component-name`. La vérification précède `buildRules` : une règle marquée
ne produit ni l'avertissement « content est vide » ni celui de politique
d'icône. Le changement ne touche pas la forme du contrat : `contractVersion` ne
monte pas.

Forme de l'avertissement, une ligne par tag, localisée sur toutes les règles de
ce tag par `pousserLocalise` puis `noter`, mécanisme que `localisation.ts`
fournit déjà :

> Layer « .ruleItem » : 17 règles @prop contiennent encore « [À compléter] ».
> Le développeur ne recevra pas leur documentation. Rédigez-les ou
> supprimez-les, puis réexportez.

Au singulier : « une règle @usage contient encore « [À compléter] » ». Un clic
sur la ligne sélectionne toutes les règles concernées. Sur le component set de
test, le premier export après création donne quatre lignes de ce genre, plus
« aucune règle @usage, @do, @dont ou @pairs n'est déclarée » et un
avertissement par dessin non déclaré.

Une instance vierge relevée en 5.4 et laissée telle quelle rejoint le constat
existant du conteneur orphelin, reformulé : son calque `component-name`
contient encore le marqueur au lieu d'être vide.

### 6.3. Les textes d'aide du maître

Le template n'écrit ni `content` ni `icon` : les textes d'aide viennent du
maître. Le mainteneur les réécrit dans Figma, dans le composant du design
system. Proposition, à l'impératif et en une phrase :

| Maître et variant | Calque | Texte proposé |
|---|---|---|
| `.componentRules` | `component-name` | « [À compléter] Nom du composant » |
| `.ruleItem`, `@usage` | `content` | « [À compléter] Décrivez à quoi sert le composant et quand le choisir. » |
| `.ruleItem`, `@prop` | `prop` | « [À compléter] propriété.valeur » |
| `.ruleItem`, `@prop` | `content` | « [À compléter] Décrivez quand choisir cette valeur. » |
| `.ruleItem`, `@boolean` | `prop` | « [À compléter] nom-de-la-propriété » |
| `.ruleItem`, `@boolean` | `content` | « [À compléter] Décrivez ce que cette option affiche, et quand l'activer. » |
| `.ruleItem`, `@icons` | `icon` | « [À compléter] Nom exact du calque d'icône » |
| `.ruleItem`, `@default` | `prop` | « [À compléter] propriété.valeur » |
| `.ruleItem`, `@default` | `content` | « Écrivez dans prop la valeur par défaut, par exemple size.medium. » |
| `.ruleItem`, `@do` | `content` | « [À compléter] Décrivez un usage recommandé. » |
| `.ruleItem`, `@dont` | `content` | « [À compléter] Décrivez un usage à éviter. » |
| `.ruleItem`, `@pairs` | `content` | « [À compléter] Listez les composants souvent associés, séparés par des virgules. » |

Au clic, avant toute écriture, le plugin vérifie que les calques qu'il ne
remplit pas portent le marqueur : `content` de `@usage`, `@prop` et `@boolean`,
`icon` de `@icons`. Sinon il refuse, sans rien créer : « Les textes d'aide de
« .ruleItem » ne commencent pas par « [À compléter] ». Ajoutez-le dans le
composant « .ruleItem », puis recommencez. » Sans cette vérification, un
maître encore à l'ancienne ferait publier ses textes d'aide comme documentation.

### 6.4. Écriture dans les slots

Deux chemins, que l'essai départage :

| Chemin | Gestes | Risque |
|---|---|---|
| E. Réutiliser les sections par défaut | retirer les sections et les exemples sans usage ; écrire `prop` dans l'exemple de chaque tag gardé ; ajouter les règles suivantes et les séparateurs dans le `Rules-Wrapper` existant | ajout dans un slot imbriqué dans le contenu d'un slot d'instance |
| F. Reconstruire les sections | vider le slot du conteneur ; créer chaque `.rulesSection` utile sur la page, la remplir, l'ajouter au slot | deux niveaux de création |

Les deux chemins retirent des enfants de slot d'instance : la section de
documentation et l'exemple `@default` au moins. Ce retrait est rapporté
impossible par le forum, et le guide MCP dit que `resetSlot` vide le slot d'une
instance. L'essai E2 tranche ; son échec ferme les deux chemins (porte H2).

Dans les deux chemins, une règle ajoutée reçoit Fill en largeur, sauf si le
réglage `stretchChildOnInsert` du slot le fait déjà pour un ajout par l'API
(non vérifié).

### 6.5. Exemple pour un component set fictif `Button`

Deux variant properties publiées, `variant` (`contained`, `outlined`) et `size`
(`small`, `medium`), une boolean property `iconLeft`, pas d'axe d'états.

```text
.componentRules                       à droite de Button
  component-name   Button
  Section=general
    @usage         content : [À compléter] Décrivez à quoi sert…
  Section=props
    @prop          prop : variant.contained     content : [À compléter] …
    @prop          prop : variant.outlined      content : [À compléter] …
    divider
    @prop          prop : size.small            content : [À compléter] …
    @prop          prop : size.medium           content : [À compléter] …
  Section=options
    @boolean       prop : iconLeft              content : [À compléter] …
  Section=icons
    @icons         icon : [À compléter] Nom exact du calque d'icône
```

Sept règles et un séparateur. Relu par le moteur : aucune documentation
publiée ; quatre lignes « contient encore « [À compléter] » » (`@usage`,
`@prop` avec ses quatre règles, `@boolean`, `@icons`) ; « aucune règle @usage,
@do, @dont ou @pairs n'est déclarée » ; un avertissement par dessin non
déclaré.

## 7. Cas limites

| Cas | Constat | Comportement |
|---|---|---|
| Sélection vide, multiple ou instance | `etatDeCible` refuse | pas de bouton |
| Variant seul sélectionné | `etatDeCible` l'accepte ; le template écrirait « Color=Primary, … » dans `component-name` | pas de bouton quand le parent est un `COMPONENT_SET` |
| Composant sans propriété | le contrat ne publie aucune prop | sections générale et icônes seulement |
| Un conteneur existe pour ce nom sur la page | la lecture le trouve déjà | pas de bouton |
| Un conteneur existe sur une autre page | la recherche ne le voit pas | le bouton en crée un sur la page active |
| Une instance vierge est sur la page | son `component-name` porte le marqueur | le bouton la remplit |
| Une règle existante porte le marqueur | elle n'est pas rédigée | avertissement de 6.2 |
| Textes d'aide du maître sans marqueur | le template ferait publier l'aide | refus au clic, message de 6.3 |
| Conteneur orphelin, `component-name` vide | `extractRules` le signale et demande d'y écrire le nom | il n'est pas vierge : le bouton crée une instance à côté |
| Component set dans un frame ou une section | documenté : `SectionNode` accepte `appendChild` ; mesuré : le set de test est dans un frame, lui-même dans une section | section ancêtre la plus proche, sinon la page, à 80 px à droite du set en coordonnées absolues. Chevauchement non vérifié |
| Parent en auto layout | un ajout décalerait les voisins | jamais dans un parent en auto layout |
| Fichier en lecture seule | rapporté : un utilisateur en lecture seule ne lance pas de plugin de design | aucun état à prévoir |
| Maître de bibliothèque | non vérifié ; cas de l'équipe consommatrice | essai E9 |
| Police absente du poste | documenté : `hasMissingFont` rend `fontName` illisible | vérifier les polices avant la première écriture ; refuser sans rien créer |
| Échec à mi-parcours | quota, slot refusé, limite `limitViolations` | supprimer le conteneur créé ; deux textes selon que la suppression réussit ou non. Une instance vierge remplie ne se supprime pas : le texte d'échec le dit |
| Clic pendant une analyse ou une publication | `operationEnCours` refuse | la carte est inerte |
| « Annuler » pendant la création | le drapeau `annulationDemandee` n'est lu par aucune création | pas de bouton d'annulation pendant la création |
| Clic répété | le premier clic crée un conteneur | le relevé de sélection est relancé après la création, et le bouton disparaît |

## 8. Interface

### 8.1. Placement

Décision H1-C : P1-bis. Le bouton « Créer les règles d'usage » est visible sous
« Analyser le composant » dès que le relevé de 5.4 l'offre. Le clic produit un
contrat par `handleExportComponent`, sans lecture du dépôt ni publication, puis
crée les règles. Le bouton ne dépend ni du verdict, ni de la publication, ni
des réglages.

### 8.2. Libellé et rang

- Libellé : « Créer les règles d'usage ». « Générer template de règles »
  mélange deux langues ; « règles d'usage » est le terme du plugin
  (`reportSelectionState`) et de FORMAT.md.
- Variante `secondary`, juste sous « Analyser le composant ». Après une
  analyse, il reste visible et repousse le verdict d'une ligne ; les captures
  de la galerie jugent si le verdict reste lisible sans défiler.
- Pendant la création : les deux boutons sont inactifs, la note suit les
  étapes par le message `status` existant, sans bouton d'annulation.
- Après la création : le résultat d'une analyse précédente est effacé, puisque
  le contrat suivant change, et le relevé de sélection est relancé.
- Décision H1-F : le component set reste sélectionné, et le plugin cadre
  ensemble le component set et le conteneur.

### 8.3. Maquettes à 320 px

Ordre réel de la carte : sujet, gestes, publication, note, compte rendu.

Au repos, composant sans conteneur :

```text
┌──────────────────────────────────────┐
│ COMPOSANT                            │
│ Button                               │
│ Component set · 4 variants           │
│ Aucune règle d’usage exploitable…    │
│ [ Analyser le composant ]  (primary) │
│ [ Créer les règles d’usage ]         │
└──────────────────────────────────────┘
```

Au repos, aucune source sur la page :

```text
│ Aucune règle d’usage exploitable…    │
│ [ Analyser le composant ]  (primary) │
│ [ Créer les règles d’usage ] inactif │
│ Aucune instance de « .componentRules │
│ » sur cette page. Collez-en une      │
│ depuis la page de vos règles pour    │
│ créer celles de ce composant.        │
```

Pendant la création :

```text
│ [ Analyser le composant ]    inactif │
│ [ Créer les règles d’usage ] inactif │
│ Lecture des composants imbriqués…    │
```

Après la création :

```text
┌──────────────────────────────────────┐
│ COMPOSANT                            │
│ Button                               │
│ Component set · 4 variants           │
│ Aucune règle d’usage exploitable…    │
│ [ Analyser le composant ]  (primary) │
│ 7 règles créées à droite du          │
│ composant. Remplacez chaque          │
│ « [À compléter] », puis analysez     │
│ le composant.                        │
└──────────────────────────────────────┘
```

En échec, conteneur retiré :

```text
│ [ Analyser le composant ]  (primary) │
│ [ Créer les règles d’usage ]         │
│ La création a échoué et le fichier   │
│ est inchangé. Réessayez ; si l’erreur│
│ persiste, relancez le plugin.        │
```

En échec, conteneur resté en place :

```text
│ La création s’est arrêtée en route.  │
│ Supprimez le « .componentRules »     │
│ incomplet à droite du composant, puis│
│ réessayez.                           │
```

Textes d'aide du maître sans marqueur :

```text
│ [ Créer les règles d’usage ]         │
│ Les textes d’aide de « .ruleItem »   │
│ ne commencent pas par « [À           │
│ compléter] ». Ajoutez-le dans le     │
│ composant « .ruleItem », puis        │
│ recommencez.                         │
```

### 8.4. Messages et galerie

Le message `cible` porte un champ de plus, l'offre de création : `creer`,
`remplir`, `sans-source` ou absente. L'opération passe par `status`, qui pilote
déjà `occuper` et la note. Trois états de galerie s'ajoutent pour l'offre,
quatre pour l'opération (en cours, créée, échec, textes d'aide sans marqueur),
avec le pire contenu réel : 22 règles et un nom de composant long. Le protocole
de relecture (a) à (e) passe sur les captures, compte d'objets (e) compris.

## 9. Documents et tests touchés

| Fichier | Ce qui change |
|---|---|
| `AGENTS.md` | première phrase ; invariant de la frontière d'écriture ; invariant du marqueur ; carte du code, `src/template/` |
| `packages/plugin/SPEC.md` | « Hors périmètre MVP » et sa sous-section ; nouvelle sous-section sur la création des règles |
| `docs/format/FORMAT.md` | section 7 : le marqueur `[À compléter]`, ses calques par tag, le conteneur vierge ; phrase « sans jamais écrire dans Figma » |
| `packages/plugin/README.md`, `packages/plugin/package.json` | promesse de lecture seule ; geste de création des règles ; marqueur |
| `docs/guides/POUR-LES-DESIGNERS.md` | promesse ; geste de création des règles ; marqueur |
| `CONTRIBUTING.md` | aucun changement : le bouton est un geste de la commande composant |
| `packages/plugin/src/messages.ts` | `creer-regles` ; offre dans `cible` |
| `packages/plugin/src/code.ts` | routage, `creerRegles`, valeur d'`operationEnCours`, commentaire de `montrerLesCalques` |
| `packages/plugin/src/contract/extractRules.ts`, `rulesModel.ts` | marqueur, avertissement par tag, conteneur vierge, relevé de l'offre |
| `packages/plugin/src/template/` | trois fichiers (4.3) |
| `packages/plugin/src/ui/` | `CarteComposant.ts`, `index.ts`, `styles.css` |
| `packages/plugin/galerie/etats.cjs` | sept états |
| `packages/plugin/tests/loiDuDocumentIntact.test.ts` | motifs ajoutés ; exclusion d'un fichier ; test des imports |
| `tests/inventaireInvariants.test.ts` | phrases figées de SPEC.md ; groupes d'`AGENTS.md` si un groupe s'ajoute |
| `packages/plugin/tests/rules.test.ts` | marqueur par tag, casse et normalisation, avertissement groupé, conteneur vierge |
| `packages/plugin/tests/code.test.ts` | routage de `creer-regles`, refus croisés avec l'analyse et la publication |
| `packages/plugin/tests/template.test.ts`, nouveau | modèle depuis un contrat synthétique ; relecture d'un template simulé par `extractRules` |
| `packages/plugin/tests/galerie.test.ts`, `stylesUi.test.ts`, `interface/interface.test.mjs` | nouveaux états, classes et interactions |
| Fichier Figma du design system, hors dépôt | textes d'aide de `.ruleItem` et `component-name` de `.componentRules` (6.3), par le mainteneur |

Le test de relecture construit un component set synthétique à noms neutres
(`Root`, axes `tone` et `scale`, un booléen `mark`), produit le modèle, simule
sa pose avec les objets Figma minimaux de `rules.test.ts`, puis vérifie que
`extractRules` rend les avertissements du marqueur, et aucun autre message des
règles.

## 10. Plan d'action

Chaque phase de code se termine par `npm test`, `npm run typecheck` et
`npm run build` dans un worktree isolé, puis par un commit poussé sur `main`.
Une loi ajoutée ou modifiée est vue rouge avant d'être crue, et le commit le
dit.

### Phase 1. Essai dans Figma

Décision H1-A : le mainteneur mène tous les essais. L'agent prépare un plugin
d'essai jetable, hors du dépôt, au manifeste identique à celui du plugin : un
bouton par essai, et le résultat affiché dans sa fenêtre. Le mainteneur le lance
sur une copie du fichier de tests et transmet les résultats. L'agent les
consigne dans `ESSAI-TEMPLATE-REGLES.md`, dans ce dossier.

| Essai | Geste | Critère de succès |
|---|---|---|
| E1 | `createInstance` sur le maître lu par `getMainComponentAsync` depuis une instance, maître rangé sur une autre page, sous `dynamic-page` | l'instance apparaît sur la page active |
| E2 | `.remove()`, puis `resetSlot`, sur une section par défaut du slot `Sections-Wrapper`, et sur un exemple d'un `Rules-Wrapper` | l'enfant disparaît du slot, instance vivante |
| E3 | chemin E de 6.4, puis chemin F | l'arbre attendu est reproduit, instances vivantes |
| E4 | plusieurs écritures de `characters` dans un même sous-arbre de slot, avant et après l'ajout ; polices chargées, dont celle de `component-name` | les textes tiennent ; les ids relevés avant et après |
| E5 | largeur d'une règle ajoutée ; `limitViolations` des deux slots | la règle fait la largeur du slot, sans rognure ni violation |
| E6 | Ctrl+Z après une création, plugin ouvert, focus dans le canevas puis dans la fenêtre du plugin | relever ce qui est défait, et si un geste antérieur au clic l'est aussi |
| E7 | analyse UCM du composant avec le moteur actuel | les règles créées sont lues |
| E8 | pose dans la section ancêtre, sélection gardée, cadrage | position, chevauchement et cadrage relevés |
| E9 | E1 à E3 et E7 avec un maître de bibliothèque | création, parent du maître `.ruleItem`, variante `divider` atteignable, lecture par le moteur |
| E10 | 22 règles et 3 séparateurs ; retour arrière après un échec provoqué au milieu | durée mesurée ; le conteneur partiel est supprimé |

Porte H2 quand E1, E2, E4 ou E7 échoue, ou quand E3 échoue sur les deux
chemins. Le mainteneur choisit alors entre une liste des règles à créer
affichée dans la carte sans rien écrire, et l'abandon. Un échec de E9 seul
touche l'équipe consommatrice : la section 12 donne l'issue.

### Phase 2. Le marqueur dans le moteur

Indépendante de l'écriture : elle corrige la publication des textes d'exemple,
et sert les règles posées à la main.

1. Tests rouges dans `rules.test.ts` : une règle de chaque tag marquée dans
   chacun de ses calques lus n'est pas lue ; le marqueur est reconnu sans
   tenir compte de la casse ; le `content` d'un `@default` n'est pas lu ;
   l'avertissement regroupe les règles d'un même tag et porte leurs nodes ;
   un conteneur dont `component-name` est marqué rejoint le constat orphelin.
2. `extractRules.ts` et `rulesModel.ts`.
3. FORMAT.md et SPEC.md, section 7 ; invariant d'`AGENTS.md` ; README du
   plugin et POUR-LES-DESIGNERS.md pour le geste du designer.
4. Dans Figma, en parallèle, par le mainteneur : textes d'aide de 6.3.

### Phase 3. Les motifs de la loi du document intact

La liste `ECRITURES` reçoit les motifs de 4.2, et rien d'autre ne change :
aucune exclusion, aucune promesse réécrite. La loi est vue rouge sur un
`createInstance` posé dans `src/contract/`.

### Phase 4. Le modèle et les sources

1. `src/template/modele.ts` : contrat vers sections, règles et séparateurs,
   selon 6.1.
2. `src/template/sources.ts` : relevé synchrone de l'offre ; conteneur vierge ;
   résolution asynchrone des maîtres de règles, de sections et du séparateur ;
   vérification des textes d'aide.
3. `extractRules.ts` et `code.ts` : offre dans le message `cible`, garde du
   variant seul.
4. `tests/template.test.ts` : contrats synthétiques, dont un axe renommé
   `size`, un axe d'états, un composant sans propriété ; test de relecture.

### Phase 5. L'écriture et sa frontière

1. `src/template/ecriture.ts` selon le chemin validé en phase 1 : textes d'aide
   et polices vérifiés d'abord, conteneur créé ou instance vierge remplie,
   sections retirées, règles et séparateurs rangés, conteneur placé ; échec
   défait par suppression du conteneur créé.
2. `loiDuDocumentIntact.test.ts` : exclusion du seul `ecriture.ts`, ses deux
   assertions, test des imports, vus rouges sur un import de `src/template/`
   depuis `src/depot.ts`.
3. `messages.ts`, `code.ts` : `creer-regles`, `operationEnCours`, refus croisés,
   relevé de sélection relancé ; `code.test.ts`.
4. `AGENTS.md`, SPEC.md et `inventaireInvariants.test.ts` : nouvelle promesse et
   invariant, dans le commit qui livre l'écriture. Avant ce commit, la promesse
   actuelle reste vraie.

### Phase 6. L'interface et les documents

1. `CarteComposant.ts`, `index.ts`, `styles.css` selon 8.2 et 8.3.
2. Sept états de galerie, captures, protocole de relecture (a) à (e).
3. `interface.test.mjs` : bouton visible, inactif, absent.
4. README du plugin, `package.json`, POUR-LES-DESIGNERS.md, en-tête
   d'`extractRules.ts`, commentaire de `montrerLesCalques`, relus contre
   `rediger-sans-tics-ia`.

### Phase 7. Recette dans Figma

Le mainteneur rejoue dans Figma : création sur une page de composants, sur une
page qui ne porte que le maître, avec une instance vierge collée, dans une
section, avec un maître de bibliothèque, suppression après création, rédaction
de trois règles, analyse, publication. L'agent ne peut pas exécuter l'export
dans Figma ([AGENTS.md](../../../../AGENTS.md#limites-denvironnement)).

## 11. Décisions prises à H1

| Id | Question | Décision |
|---|---|---|
| H1-A | Qui mène l'essai de la phase 1 ? | le mainteneur, pour tous les essais ; l'agent prépare le plugin d'essai et consigne les résultats |
| H1-B | Que devient une règle non rédigée ? | un texte d'aide commence par `[À compléter]` ; un calque lu qui le contient rend la règle non rédigée, avec un avertissement |
| H1-C | Quand le bouton apparaît, et d'où viennent les règles ? | P1-bis : sous « Analyser », contrat produit au clic |
| H1-D | Que fait le plugin quand un conteneur existe déjà ? | sur la page : pas de bouton ; sur une autre page : non cherché ; instance vierge : remplie ; règle marquée : avertissement |
| H1-E | Que contient le template ? | les règles que le composant emploie, selon 6.1 |
| H1-F | Que montre Figma après la création ? | le composant reste sélectionné, composant et conteneur sont cadrés |
| H1-G | D5 est-il confirmé ? | sans réponse explicite ; tenu, conformément à H1-D |
| H1-H | Comment se défait une création ? | par la suppression du conteneur ; `commitUndo` n'entre dans le module que si E6 montre un Ctrl+Z qui défait aussi un geste antérieur au clic |

Précisions confirmées : une règle `@prop` par valeur, groupées par axe ; ni
`@default` ni la section de documentation (`@do`, `@dont`, `@pairs`) ne sont
posés ; l'avertissement du marqueur est groupé par tag, une ligne cliquable
par tag.

Reste ouverte : les valeurs de l'axe d'états (`State`, `Status`) sont-elles
posées ?

| Option | Effet | Risque |
|---|---|---|
| Les poser, en dernier groupe | une règle par état, à rédiger ou à supprimer | quelques règles évidentes (`hover`, `focus`) à supprimer à la main |
| Ne pas les poser | aucune règle d'état | un axe d'états qui porte un comportement propre au composant (`loading`, `expanded`, `error`) ne reçoit aucune invite |

Recommandation : les poser. Le plugin ne sait pas juger quel état va de soi, et
le designer le sait. Supprimer une règle évidente coûte un geste, alors qu'un
état oublié laisse le développeur sans explication. Le conteneur rédigé du
component set de test n'en documente aucune, et son export ne perd que leur
description.

## 12. L'équipe consommatrice

Réponse du mainteneur : le `.componentRules` de l'équipe est une instance du
composant d'origine, publié par le fichier du design system du mainteneur. Le
maître est donc distant pour l'équipe.

Deux conséquences :

- les textes d'aide réécrits en 6.3 arrivent chez l'équipe par la mise à jour
  de la bibliothèque, sauf dans les calques qu'elle a déjà modifiés ;
- le template chez l'équipe dépend de l'essai E9 : créer une instance d'un
  maître distant, et lire le parent de `.ruleItem`, dont `isRuleInstance`
  dépend déjà aujourd'hui.

Recommandation : garder l'instance de bibliothèque, qui propage les textes
d'aide et garde une seule source. Si E9 échoue, donner la source à l'équipe
pour qu'elle la range dans son propre design system : le maître devient local
chez elle, et les essais E1 à E8 couvrent ce cas.

Reste une question à l'équipe : ses designers ont-ils le droit de modifier les
fichiers de composants ?

## 13. Sources

| Source | Ce qu'elle établit | Statut |
|---|---|---|
| [figma.commitUndo](https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/) | par défaut, les actions d'un plugin n'entrent pas dans l'historique ; exemple terminé par `closePlugin`, rien sur un plugin resté ouvert | documenté |
| [Guide MCP de Figma, component patterns](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-use/references/component-patterns.md) | ajout dans le slot d'une instance ; handle invalidé par l'ajout ; `resetSlot` vide le slot d'une instance ; `setProperties` refuse un slot | documenté |
| [SlotNode](https://developers.figma.com/docs/plugins/api/SlotNode/) | `resetSlot` rend le contenu d'origine du composant, en contradiction avec le guide MCP ; `limitViolations` | documenté |
| [Mise à jour de l'API, slots](https://developers.figma.com/docs/plugins/updates/2026/06/10/update/) | `createSlot`, `SlotSettings` dont `stretchChildOnInsert`, type `SLOT` des component properties | documenté |
| [Working with text](https://developers.figma.com/docs/plugins/working-with-text/) | `characters` exige la police chargée ; `hasMissingFont` | documenté |
| `@figma/plugin-typings` 1.138.0 | `createInstance` sous `currentPage` ; maître distant en lecture seule, parfois sans parent ; `figma.union` et ses voisins créent des nodes | documenté |
| [plugin-typings, issue 351](https://github.com/figma/plugin-typings/issues/351) | `appendChild` dans le slot d'une instance lève une erreur ; ouverte en mars 2026, sans commentaire | rapporté |
| [Forum Figma, connecteur et slots](https://forum.figma.com/share-your-feedback-26/figma-connector-with-claude-ai-and-slots-feature-52864) | l'ajout fonctionne, textes écrits avant ; une seule écriture de texte sûre par sous-arbre de slot ; un enfant existant ne se retire pas | rapporté |
| [Forum Figma, annulation groupée](https://forum.figma.com/t/enable-a-single-undo-for-multiple-operations/28276) | plugin ouvert, chaque opération peut recevoir sa propre entrée ; page non relue, extrait de recherche seulement | rapporté |
| [Forum Figma, plugins en lecture seule](https://forum.figma.com/t/can-users-with-view-access-only-run-plugins/25383) | seul un utilisateur qui peut éditer lance un plugin de design | rapporté |

## 14. Revue indépendante

Un agent sans le contexte de la recherche a relu la première version de ce
plan, le code du commit lu et le fichier Figma. Chaque point a été vérifié dans
le code ou à sa source avant d'être retenu. Les décisions H1, prises ensuite,
ont remplacé certaines suites.

| Point de la revue | Suite |
|---|---|
| Les avertissements identiques sont fusionnés : 14 lignes et non 29 | retenu, vérifié dans `exportComponent.ts` ; sert l'avertissement groupé de 6.2 |
| L'exemple se trompait sur le dessin non déclaré, le compte de la note et « aucune règle @usage » | retenu, vérifié ; exemple réécrit |
| Le `content` de `@default` rendait dangereuse la comparaison au maître | retenu ; le marqueur (H1-B) ne lit jamais ce calque |
| Un variant seul est une cible valide | retenu, vérifié dans `cible.ts` ; garde ajoutée |
| L'ajout dans un slot d'instance est documenté par le guide MCP de Figma | retenu, page relue |
| Le regroupement de l'annulation était présenté comme documenté | retenu ; constat 6 et H1-H |
| `inventaireInvariants.test.ts` manquait | retenu, vérifié ; 4.1 et 9 |
| Imprécisions : cinq instances, quatre faux positifs pour `.name`, onze promesses, ordre de la carte | retenues, vérifiées |
| L'essai par `use_figma` ne reproduit ni la fenêtre du plugin ni son annulation | retenu ; tous les essais passent par un plugin d'essai (H1-A) |
| P2 laisse sept chemins de `code.ts` sans traitement ; P1-bis les évite | retenu, chemins vérifiés ; H1-C |
| Conteneur vierge, conteneur sur une autre page, conteneur orphelin | vierge retenu, défini par le marqueur ; autre page non cherchée (H1-D) ; orphelin non rempli |
| Réutiliser les sections par défaut | retenu comme chemin E |
| Largeur des règles dans un slot | retenu, mesuré dans Figma ; essai E5 et motif de la loi |
| Motifs manquants, `figma.union` compris, et refus de `loadAllPagesAsync` dans `src/template/` | retenu, aucun faux positif mesuré |
| Exclusion et promesses trop tôt dans l'ordre des phases | retenu ; déplacées en phase 5 |
| Bouton « Annuler » sans effet pendant la création | retenu ; retiré pendant la création |
| Un message `regles` doublait `status` | retenu ; offre portée par `cible` |
| Phrase de confirmation sur les composants imbriqués, sans détection | retenu ; phrase retirée |
| Troisième issue à H2 : lister les règles sans écrire | retenu comme option de H2 |

## 15. Hors de cette version

- Les tags `@text`, `@slot` et `@swap`, pour documenter les propriétés `TEXT`,
  `SLOT` et `INSTANCE_SWAP`. Ils changent la grammaire de FORMAT.md, section 7,
  et le contrat devra dire où leur description se range.
- Écrire dans `icon` les noms des dessins que l'analyse signale comme non
  déclarés, au lieu d'une règle d'icône vide.
- Compléter un conteneur existant avec les règles qui lui manquent quand le
  composant gagne une propriété.
- Chercher un conteneur ou un maître sur les autres pages.
