# Plan d'action du template de règles

> Statut : recommandations en attente de la porte H1. Ce document est le
> livrable de la [section 12](./RECHERCHE-TEMPLATE-REGLES.md#12-livrable-attendu)
> du plan de recherche, rédigé en plan d'action à la demande du mainteneur. Une
> revue indépendante l'a relu ; la [section 14](#14-revue-indépendante) dit ce
> qui en a été retenu. Il ne contient aucune implémentation et rien n'a été
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

Sept constats modifient la demande ou l'ordre du travail.

1. **Le maître `.componentRules` n'est pas sur la page des composants.**
   Mesuré : il est rangé sur la page « Règles [.componentRules] », et la page
   « Components » ne porte que cinq instances. Avec D5, la source du template
   est donc le plus souvent une instance déjà posée, lue par
   `getMainComponentAsync`. Une page qui ne porte encore ni maître ni instance
   ne permet pas de créer le premier template.
2. **Une règle fraîchement posée publie son texte d'exemple.** Mesuré : chaque
   variant de `.ruleItem` est livré avec un texte dans `content` (« A quoi sert
   le composant ») et une cible fictive dans `prop` (`prop.name`). Une instance
   neuve de `@usage`, `@do`, `@dont` ou `@pairs` exporte ce texte comme
   documentation réelle, aujourd'hui déjà, sans template.
3. **Remplir un slot d'instance est documenté par Figma, avec des réserves.**
   Le guide MCP de Figma écrit qu'on ajoute un contenu au slot d'une instance
   « like any other node », et qu'un handle peut être invalidé par l'ajout. La
   référence de `SlotNode` n'en dit rien, et les deux sources se contredisent
   sur `resetSlot`. Rapporté : une issue ouverte donne l'erreur « Cannot move
   node. New parent is an instance », un fil du forum dit qu'un enfant existant
   d'un slot d'instance ne se retire pas. Le template repose sur ces gestes :
   un essai dans Figma précède le code.
4. **La surface publique ne se lit pas sur le component set seul.** Mesuré, et
   confirmé par la revue : sur le component set de test à trois variant
   properties, le conteneur rédigé documente aussi un axe de tailles et trois
   boolean properties portés par le wrapper `.sizeWrapperButton`. Un template
   construit sur les seules définitions du set perdrait 6 des 17 règles de
   propriétés rédigées. Une analyse les publie toutes.
5. **Sélectionner l'instance créée efface la carte.** Mesuré : un changement
   de sélection réinitialise la carte du composant (`CarteComposant.afficher`),
   conformément à la règle « un résultat ne survit pas à son sujet ».
6. **L'annulation d'une création faite plugin ouvert n'est pas établie.**
   Documenté : « By default, plugin actions are not committed to undo
   history », avec un exemple qui se termine par `closePlugin`. Rien n'est écrit
   sur un plugin qui reste ouvert, ce qui est le cas du plugin UCM. La loi du
   document intact refuse aujourd'hui `commitUndo`.
7. **La liste des avertissements est plus courte qu'on le croit.** Mesuré :
   l'export fusionne les phrases identiques (`exportComponent.ts`,
   `Array.from(new Set(…))`), et `buildRules` écrit la même phrase pour toutes
   les règles vides d'un même tag. Un template de 29 règles aux textes vidés
   donne 14 lignes, pas 29, et 9 d'entre elles ne disent pas quelle règle est
   en cause (section 6.2).

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

| Variant | Calques texte | Texte d'exemple | Effet d'une instance neuve à l'export |
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
absent. L'écart compte pour la section 6.2 : un designer qui suit le format
remplit `prop` et laisse ce `content` intact. Le calque qui affiche `OR`
s'appelle `or`, sans effet sur le moteur.

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
défaut d'un slot d'instance. Les quatre autres conteneurs de la page n'ont pas
été relevés règle par règle (tâche 2.1).

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
du composant. »

### 4.2. Les appels nécessaires et la loi

| Geste | Appel | Motif actuel de la loi |
|---|---|---|
| Lire le maître d'une instance | `getMainComponentAsync` | lecture |
| Créer le conteneur et chaque règle | `ComponentNode.createInstance` | aucun |
| Choisir le variant d'une règle | `createInstance` sur la bonne variante | aucun |
| Écrire `component-name`, `prop`, `icon` | affectation de `characters`, après `loadFontAsync` | aucun |
| Étirer une règle à la largeur du slot | affectation de `layoutSizingHorizontal` | aucun |
| Ranger une règle dans un slot | `appendChild`, `insertChild` | `déplacement de node` |
| Retirer les exemples du maître | `.remove()` ou `resetSlot` | `suppression de node`, aucun |
| Placer le conteneur | affectation de `x` et `y` | aucun |
| Défaire un échec à mi-parcours | `.remove()` sur le conteneur créé | `suppression de node` |
| Isoler l'annulation, si l'essai E6 l'exige | `figma.commitUndo()` | `entrée d'annulation` |

Mesuré : aucun de ces motifs n'apparaît dans le sandbox, et la liste
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

| Option | Exclusion de la loi | Avantage | Limite |
|---|---|---|---|
| A. Un dossier `src/template/` exclu | un chemin de dossier | simple | un fichier de lecture ajouté au dossier échappe à la loi sans que rien ne le dise |
| B. Un dossier `src/template/`, un seul fichier exclu : `src/template/ecriture.ts` | un chemin de fichier | la construction pure et la recherche des maîtres restent balayées | un fichier de plus |

Recommandation : B. Trois fichiers :

- `src/template/modele.ts`, pur : du contrat analysé au modèle du template
  (sections, règles, tag, cible) ;
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
  propriétés. Créer une instance d'un maître distant est non vérifié.
- Mesuré : `rulesContainerOwner` est synchrone, et `extractRules` parcourt déjà
  toute la page à chaque sélection, appelé par `reportSelectionState`.
- Mesuré : le maître `.componentRules` range un exemple de chaque tag dans la
  section de ce tag (3.1). Ce rangement se lit sur le maître sans qu'aucun nom
  de section entre dans le code.
- Mesuré : une analyse charge toutes les pages et indexe tous les conteneurs du
  document (`indexContractedNamesInDocument`). Un conteneur rangé sur une autre
  page y est donc connu sans parcours de plus.

### 5.2. Ordre des sources

| Option | Ce qu'elle fait | Coût | Limite |
|---|---|---|---|
| A. Maître sur la page d'abord, instance ensuite | cherche un `COMPONENT` dont le nom compacté vaut `.componentrules`, puis lit le maître d'une instance qui porte `component-name` | un prédicat de plus dans le parcours existant, un appel asynchrone au clic | le nom du maître devient une convention lue, en plus du calque |
| B. Instance seulement | lit le maître de la première instance qui porte `component-name` | aucun parcours de plus | une page qui ne porte que le maître ne permet pas de créer |

Recommandation : A. La page de règles d'un design system porte le maître, la
page d'un composant porte des instances, et les deux cas se rencontrent. Une
instance qui documente un autre composant sert seulement à lire son maître ;
elle n'est ni lue ni modifiée. D5 reste tenu : la recherche ne parcourt que la
page active, et le maître lu peut vivre ailleurs.

Le maître de chaque règle et de chaque section se lit sur les exemples du
maître `.componentRules`, par `getMainComponentAsync`. La variante d'une règle
se choisit par le calque de tag que porte l'exemple (`ruleTagFromLayerName`),
jamais par le nom de la variant property `Type`. Un tag dont le maître ne range
aucun exemple ne reçoit aucune règle, et la confirmation le dit.

### 5.3. Le conteneur vierge

Le message de 5.5 demande au designer de coller une instance. Cette instance
écrit le nom par défaut du maître. Si le plugin en créait une seconde, la
première resterait sur la page et le composant qui porte ce nom par défaut
recevrait la note de doublon.

Recommandation : au clic, une instance de la page dont `component-name` égale
le texte du maître et dont aucune règle n'est rédigée (critère de 6.2) est un
conteneur vierge. Le plugin la remplit à sa place au lieu d'en créer une. Les
deux conditions sont nécessaires : dans le fichier de référence, le nom par
défaut du maître est celui d'un vrai composant, dont le conteneur rédigé ne
l'a jamais changé.

### 5.4. Au changement de sélection

Aucun appel asynchrone de plus. Le parcours de la page que fait déjà
`extractRules` relève en même temps : un conteneur pour ce nom, un conteneur
orphelin (calque `component-name` vide), une source sur la page. La résolution
des maîtres, la recherche du conteneur vierge et le chargement des polices se
font au clic, avant toute écriture.

### 5.5. Page sans source

Texte proposé, sous le bouton inactif : « Aucune instance de
« .componentRules » sur cette page. Collez-en une depuis la page de vos règles
pour créer celles de ce composant. »

## 6. Du contrat aux règles

### 6.1. Correspondance

La source est un contrat que le moteur produit pour le composant sélectionné
(décision H1-C). Il publie la surface élue, les clés sémantiques (`size`) et
l'axe d'états.

| Ce que le contrat publie | Règle posée | Calque `prop` ou `icon` | Recommandation |
|---|---|---|---|
| `props.<clé>` de type `enum`, une règle par valeur | `@prop` | `<clé>.<valeur>`, clé et valeur publiées | poser |
| `props.<clé>` de type `enum`, une règle par axe | `@default` | `<clé>.` | poser, sans valeur |
| `stateModel.states`, une règle par état | `@prop` | `<axe>.<état>` | décision H1-E, recommandation : ne pas poser |
| `props.<clé>` de type `boolean` | `@boolean` | `<clé>`, forme publiée (`iconLeft`) | poser, sauf `disabled` issu de l'axe d'états |
| `props.<clé>` de type `string`, `instance-swap`, `slot` | aucune | sans objet | ne rien poser (D2) |
| dessin qu'aucune règle `@icons` ne désigne | `@icons` | nom du calque que l'avertissement nomme | décision H1-E, recommandation : poser |
| intention | `@usage`, `@do`, `@dont`, `@pairs`, une de chaque | sans objet | poser |

Chaque règle va dans la section où le maître range l'exemple du même tag.

La clé publiée est la seule forme que `mergePropDescriptions` retrouve à coup
sûr : un axe renommé par la couche sémantique (`size`) ne se retrouve pas par
son nom Figma. `normalizePropKey` accepte aussi `icon-left`, forme que le
designer du corpus écrit ; le template écrit la forme publiée.

Les dessins non déclarés sont ceux que `warnUndeclaredDrawing` signale pendant
l'analyse. Le résultat d'analyse expose leur nom dans un champ interne, sans
rien ajouter au contrat. Une règle `@icons` sans politique n'entre pas dans
`iconRules`, donc l'avertissement « dessin non déclaré » continue de partir à
côté de celui de la politique : deux messages pour une icône. La tâche 2.4
propose de taire le premier quand une règle nomme déjà le calque.

### 6.2. Le texte de départ

Volume mesuré pour le component set de test, états compris : 12 `@prop` d'axes
d'API, 5 `@prop` d'états, 3 `@default`, 3 `@boolean`, 2 `@icons`, 4 règles
d'intention, soit 29 règles. Sans les états, 24.

| Option | Ce que le designer lit au premier export, 29 règles | Changement du moteur | Défaut |
|---|---|---|---|
| A. Le plugin vide `content` | 14 lignes : une par tag pour les `@prop` et les `@boolean`, 4 pour l'intention, 3 `@default` sans valeur, 2 politiques d'icône, « aucune règle @usage », 2 dessins non déclarés. Seules les 5 lignes `@default` et `@icons` nomment leur règle | aucun | le designer ne sait pas quelles règles restent vides |
| A'. Comme A, et la ligne vide de `buildRules` porte ses nodes | les mêmes lignes, cliquables | `RuleEntry` reçoit le node de la règle | le constat 2 subsiste pour les règles posées à la main |
| B. Le plugin laisse le texte d'exemple. Le moteur reconnaît une règle « à rédiger » et les regroupe dans une note | 6 lignes : la note « 27 règles ne sont pas rédigées », qui les sélectionne au clic, 2 politiques d'icône, « aucune règle @usage », 2 dessins non déclarés | critère par tag dans `extractRules` ; FORMAT.md et SPEC.md, section 7 | un texte identique à l'exemple, écrit exprès, n'est pas lu |
| B'. Comme B, sans note | 5 lignes | le même | une règle oubliée ne se voit plus à l'export |
| C. Le plugin écrit « À rédiger » | les lignes de A sans les vides | aucun | le texte est publié comme documentation réelle |

Recommandation : B. Elle corrige aussi le constat 2, qui existe sans template.
Elle réduit les écritures de texte à `prop`, `icon` et `component-name`, et ce
sont les écritures que le forum dit fragiles dans un slot.

Critère par tag, pour qu'aucune règle rédigée selon le format ne disparaisse :

| Tag | Une règle est à rédiger quand |
|---|---|
| `@usage`, `@do`, `@dont`, `@pairs`, `@prop`, `@boolean` | son calque `content` égale le calque `content` de son maître |
| `@default` | son calque `prop` égale celui de son maître, ou se termine par un point sans valeur. Son `content` n'est jamais lu |
| `@icons` | jamais : l'avertissement de politique existant nomme déjà la règle et le geste |

La comparaison porte sur le maître déjà obtenu par `isRuleInstance`, sans appel
asynchrone de plus. La note se forme une fois à la fin de `extractRules`, par
`pousserNote` sur le conteneur puis `noter` pour chaque règle, mécanisme que
`localisation.ts` fournit déjà. Le changement ne touche pas la forme du
contrat : `contractVersion` ne monte pas.

Borne à écrire dans FORMAT.md : la comparaison porte sur le maître de la règle.
Un texte d'exemple modifié dans le contenu par défaut d'un slot du maître
`.componentRules` ou d'une `.rulesSection` lui échappe. Mesuré : le fichier de
référence n'a aucune modification de texte à ces niveaux.

Texte proposé pour la note, selon `rediger-diagnostics-ucm` : « Layer
« .componentRules » : 27 règles ne sont pas rédigées. Le développeur ne
recevra pas leur documentation. Rédigez-les ou supprimez-les, puis
réexportez. »

Pour `@default`, préremplir la position du variant contredit
`RulesResult.enumDefaults`. La règle porte `<clé>.` sans valeur et rejoint la
note.

### 6.3. Sections et exemples du maître

Deux chemins d'écriture, que l'essai départage :

| Chemin | Gestes | Risque |
|---|---|---|
| E. Réutiliser les sections par défaut | écrire `prop` ou `icon` dans l'exemple de chaque tag, puis ajouter les règles suivantes dans le `Rules-Wrapper` existant de la section | ajout dans un slot imbriqué dans le contenu d'un slot d'instance |
| F. Reconstruire les sections | retirer les sections par défaut, créer chaque `.rulesSection` sur la page, la remplir, l'ajouter au slot du conteneur | retrait rapporté impossible ; deux niveaux de création |

Recommandation : essayer E en premier. Il évite le retrait et la moitié des
créations. Les exemples inutilisés, `@pairs` d'un composant sans intention par
exemple, restent en place et rejoignent la note de B. Dans les deux chemins, une
règle ajoutée reçoit Fill en largeur, sauf si le réglage `stretchChildOnInsert`
du slot le fait déjà pour un ajout par l'API (non vérifié).

Ordre dans une section : axes dans l'ordre de `props`, valeurs dans l'ordre de
`values`. Les séparateurs `divider` ne sont pas posés : ils ne portent aucune
information et chacun coûte une écriture.

### 6.4. Exemple pour un component set fictif `Button`

Deux variant properties publiées, `variant` (`contained`, `outlined`) et `size`
(`small`, `medium`), une boolean property `iconLeft`, un dessin non déclaré
`arrow-left`, pas d'axe d'états. 13 règles.

```text
.componentRules                       à droite de Button
  component-name   Button
  Section=general
    @usage         content : texte d'exemple
    @default       prop : variant.
    @default       prop : size.
  Section=props
    @prop          prop : variant.contained     content : texte d'exemple
    @prop          prop : variant.outlined      content : texte d'exemple
    @prop          prop : size.small            content : texte d'exemple
    @prop          prop : size.medium           content : texte d'exemple
  Section=options
    @boolean       prop : iconLeft              content : texte d'exemple
  Section=icons
    @icons         icon : arrow-left            strict et modifiable visibles
  Section=documentation
    @do, @dont, @pairs                          content : texte d'exemple
```

Relu par le moteur sous l'option B : aucune documentation publiée, et quatre
lignes. La note « 11 règles ne sont pas rédigées », la politique de
`arrow-left`, « aucune règle @usage, @do, @dont ou @pairs n'est déclarée », et
le dessin non déclaré `arrow-left`, qui disparaît si la tâche 2.4 est retenue.

## 7. Cas limites

| Cas | Constat | Recommandation |
|---|---|---|
| Sélection vide, multiple ou instance | `etatDeCible` refuse | pas de bouton |
| Variant seul sélectionné | `etatDeCible` l'accepte ; le template écrirait « Color=Primary, … » dans `component-name` | pas de bouton quand le parent est un `COMPONENT_SET` |
| Composant sans propriété | le contrat ne publie aucune prop | template d'intention seule |
| Un conteneur existe pour ce nom sur la page | la lecture le trouve déjà | pas de bouton (H1-D) |
| Un conteneur orphelin est sur la page | `extractRules` le signale et demande d'y écrire le nom | pas de bouton : l'avertissement existant donne le geste |
| Un conteneur existe sur une autre page | l'index de l'analyse le connaît ; la lecture des règles ne le voit pas | refuser au clic : « Un « .componentRules » d'une autre page documente déjà Button. Rangez le composant et ses règles sur la même page, puis analysez-le. » |
| Un conteneur vierge est sur la page | il écrit le nom par défaut du maître | le remplir (5.3) |
| Component set dans un frame ou une section | documenté : `SectionNode` accepte `appendChild` ; mesuré : le set de test est dans un frame, lui-même dans une section | section ancêtre la plus proche, sinon la page, à 80 px à droite du set en coordonnées absolues. Chevauchement non vérifié |
| Parent en auto layout | un ajout décalerait les voisins | jamais dans un parent en auto layout |
| Fichier en lecture seule | rapporté : un utilisateur en lecture seule ne lance pas de plugin de design | aucun état à prévoir |
| Maître de bibliothèque | non vérifié | essai E9 |
| Police absente du poste | documenté : `hasMissingFont` rend `fontName` illisible | vérifier toutes les polices avant la première écriture ; refuser sans rien créer |
| Échec à mi-parcours | quota, slot refusé, limite `limitViolations` | supprimer le conteneur créé ; deux textes selon que la suppression réussit ou non |
| Clic pendant une analyse ou une publication | `operationEnCours` refuse | la carte est inerte |
| « Annuler » pendant la création | le drapeau `annulationDemandee` n'est lu par aucune création | pas de bouton d'annulation pendant la création, qui se défait par son retour arrière |
| Clic répété | le premier clic crée un conteneur | le relevé de sélection est relancé après la création, et le bouton disparaît |

## 8. Interface

### 8.1. Placement et source

Décision H1-C. Trois options :

| Option | Quand le bouton se voit | Source des règles | Coût |
|---|---|---|---|
| P1. Sous « Analyser », au repos, sur le component set seul | dès qu'un composant sans conteneur est sélectionné | définitions du component set | 6 règles de propriétés sur 17 manquent sur le composant mesuré |
| P1-bis. Sous « Analyser », au repos, avec analyse au clic | dès qu'un composant sans conteneur est sélectionné | un contrat produit au clic par `handleExportComponent`, sans lecture du dépôt ni publication | le clic dure le temps d'une analyse ; un objet de plus, dans cet état seulement |
| P2. Dans le résultat de l'analyse | après une analyse, quand aucun conteneur n'existe | le contrat de l'analyse gardée | sept chemins de `code.ts` à traiter : refus, verdict identique, erreur après production, annulation, publication réussie, réglages enregistrés, jeton supprimé |

Recommandation : P1-bis. Le bouton ne dépend ni du verdict, ni de la
publication, ni des réglages ; le contrat est frais au clic ; D1 est respecté
à la lettre. Le relevé de sélection (5.4) décide de sa présence, dans l'état
même où la carte affiche déjà « Aucune règle d'usage exploitable ».

### 8.2. Libellé et rang

- Libellé : « Créer les règles d'usage ». « Générer template de règles »
  mélange deux langues ; « règles d'usage » est le terme du plugin
  (`reportSelectionState`) et de FORMAT.md.
- Variante `secondary`, juste sous « Analyser le composant » : les deux gestes
  portent sur le sujet. Après une analyse, il reste visible et repousse le
  verdict d'une ligne ; les captures de la galerie jugent si le verdict reste
  lisible sans défiler.
- Pendant la création : les deux boutons sont inactifs, la note suit les
  étapes par le message `status` existant, sans bouton d'annulation.
- Après la création : le résultat d'une analyse précédente est effacé, puisque
  le contrat suivant change, et le relevé de sélection est relancé.
- Sélection : décision H1-F. Recommandation : garder le component set
  sélectionné et cadrer ensemble le component set et le conteneur. La
  confirmation reste lisible dans la carte.

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
│ 13 règles créées à droite du         │
│ composant. Rédigez-les, puis         │
│ analysez le composant.               │
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

### 8.4. Messages et galerie

Le message `cible` porte un champ de plus, l'offre de création : `a-creer`,
`sans-source` ou absente. L'opération passe par `status`, qui pilote déjà
`occuper` et la note. Deux états de galerie s'ajoutent pour l'offre, trois pour
l'opération (en cours, créée, échec), avec le pire contenu réel : 29 règles et
un nom de composant long. Le protocole de relecture (a) à (e) passe sur les
captures, compte d'objets (e) compris.

## 9. Documents et tests touchés

| Fichier | Ce qui change |
|---|---|
| `AGENTS.md` | première phrase ; invariant de la frontière d'écriture ; invariant de la règle à rédiger ; carte du code, `src/template/` |
| `packages/plugin/SPEC.md` | « Hors périmètre MVP » et sa sous-section ; nouvelle sous-section sur la création des règles ; section 7, conteneur sur une autre page |
| `docs/format/FORMAT.md` | section 7 : règle à rédiger et sa borne ; `@default` sans valeur ; phrase « sans jamais écrire dans Figma » |
| `packages/plugin/README.md`, `packages/plugin/package.json` | promesse de lecture seule ; geste de création des règles |
| `docs/guides/POUR-LES-DESIGNERS.md` | promesse ; geste de création des règles |
| `CONTRIBUTING.md` | aucun changement : le bouton est un geste de la commande composant |
| `packages/plugin/src/messages.ts` | `creer-regles` ; offre dans `cible` |
| `packages/plugin/src/code.ts` | routage, `creerRegles`, valeur d'`operationEnCours`, commentaire de `montrerLesCalques` |
| `packages/plugin/src/contract/extractRules.ts`, `rulesModel.ts` | règle à rédiger, note groupée, relevé de l'offre au parcours de page |
| `packages/plugin/src/contract/exportComponent.ts` | champs internes : dessins non déclarés, index des conteneurs |
| `packages/plugin/src/contract/extractLayout.ts`, `structureTree.ts` | si la tâche 2.4 est retenue |
| `packages/plugin/src/template/` | trois fichiers (4.3) |
| `packages/plugin/src/ui/` | `CarteComposant.ts`, `index.ts`, `styles.css` |
| `packages/plugin/galerie/etats.cjs` | cinq états |
| `packages/plugin/tests/loiDuDocumentIntact.test.ts` | motifs ajoutés ; exclusion d'un fichier ; test des imports |
| `tests/inventaireInvariants.test.ts` | phrases figées de SPEC.md ; groupes d'`AGENTS.md` si un groupe s'ajoute |
| `packages/plugin/tests/rules.test.ts` | règle à rédiger par tag, `@default` sans valeur, note groupée |
| `packages/plugin/tests/code.test.ts` | routage de `creer-regles`, refus croisés avec l'analyse et la publication |
| `packages/plugin/tests/template.test.ts`, nouveau | modèle depuis un contrat synthétique ; relecture d'un template simulé par `extractRules` |
| `packages/plugin/tests/galerie.test.ts`, `stylesUi.test.ts`, `interface/interface.test.mjs` | nouveaux états, classes et interactions |

Le test de relecture construit un component set synthétique à noms neutres
(`Root`, axes `tone` et `scale`), produit le modèle, simule sa pose avec les
objets Figma minimaux de `rules.test.ts`, puis vérifie que `extractRules` rend
la note « à rédiger », et aucun autre message.

## 10. Plan d'action

Chaque phase se termine par `npm test`, `npm run typecheck` et `npm run build`
dans un worktree isolé, puis par un commit poussé sur `main`. Une loi ajoutée
ou modifiée est vue rouge avant d'être crue, et le commit le dit.

### Phase 0. Décisions du mainteneur (H1)

Les décisions de la section 11. Sans H1-A, la phase 1 ne commence pas ; sans
H1-B, la phase 2 ne commence pas ; sans H2, la phase 4 ne commence pas.

### Phase 1. Essai dans Figma

Objectif : établir les gestes d'API dont dépend la fonction, avant toute ligne
de code, sur une copie du fichier de tests. `use_figma` exécute l'API des
plugins, sans la fenêtre du plugin, sans son manifeste et sans son historique
d'annulation : les essais qui en dépendent reviennent au mainteneur, avec un
plugin de développement jetable, hors du dépôt, au manifeste identique.

| Essai | Mené par | Geste | Critère de succès |
|---|---|---|---|
| E1 | mainteneur | `createInstance` sur le maître lu par `getMainComponentAsync` depuis une instance, maître rangé sur une autre page, sous `dynamic-page` | l'instance apparaît sur la page active |
| E2 | agent | chemin E de 6.3 : écrire `prop` dans les exemples, ajouter des règles dans les `Rules-Wrapper` existants | les règles sont dans les slots, instances vivantes |
| E3 | agent | chemin F de 6.3 : `.remove()` puis `resetSlot` sur les sections par défaut ; section créée, remplie, ajoutée | le slot est vidé, puis l'arbre de 3.1 est reproduit |
| E4 | agent | plusieurs écritures de `characters` dans un même sous-arbre de slot, avant et après l'ajout ; polices chargées, dont celle de `component-name` | les textes tiennent ; les ids relevés avant et après |
| E5 | agent | largeur d'une règle ajoutée ; `limitViolations` des deux slots | la règle fait la largeur du slot, sans rognure ni violation |
| E6 | mainteneur | Ctrl+Z plugin ouvert, focus dans le canevas puis dans la fenêtre du plugin, sans puis avec `commitUndo` avant et après la création | un Ctrl+Z retire tout le conteneur et rien de ce que le designer a fait avant le clic |
| E7 | mainteneur | analyse UCM du composant avec le moteur actuel | les règles créées sont lues |
| E8 | mainteneur | pose dans la section ancêtre, sélection gardée, cadrage | position, chevauchement et cadrage relevés |
| E9 | agent | les gestes de E2 avec un maître de bibliothèque | parent du maître `.ruleItem`, création, lecture |
| E10 | agent | 29 règles ; retour arrière après un échec provoqué au milieu | durée mesurée ; le conteneur partiel est supprimé |

Livrable : `ESSAI-TEMPLATE-REGLES.md` dans ce dossier, un tableau par essai
avec le code exécuté et le résultat. Porte H2 quand E1 échoue, quand E2 et E3
échouent l'un et l'autre, ou quand E4 ou E7 échoue. Le mainteneur choisit alors entre un template
partiel (exemples conservés, option B indispensable), une liste des règles à
créer affichée dans la carte sans rien écrire, et l'abandon.

### Phase 2. Règles à rédiger (moteur)

Indépendante de l'écriture : elle corrige la publication des textes d'exemple.

1. Relever, sur les cinq conteneurs du fichier de tests, les règles que le
   critère de 6.2 retirerait. Un résultat non nul revient au mainteneur avant
   la suite.
2. Tests rouges dans `rules.test.ts` : une règle de chaque tag dont le calque
   critère égale celui du maître n'est pas lue ; un `@default` rédigé dont le
   `content` est intact reste lu ; un `@default` sans valeur rejoint la note ;
   la note porte les nodes de toutes ces règles.
3. `extractRules.ts` et `rulesModel.ts` ; FORMAT.md et SPEC.md, section 7 ;
   invariant d'`AGENTS.md`.
4. Si H1-E le retient : un dessin qu'une règle `@icons` nomme, même sans
   politique, ne produit plus l'avertissement « dessin non déclaré ». Le nom
   rejoint un ensemble lu par `warnUndeclaredDrawing` seul, jamais par
   l'attribution des slots.

### Phase 3. Les motifs de la loi du document intact

La liste `ECRITURES` reçoit les motifs de 4.2, et rien d'autre ne change :
aucune exclusion, aucune promesse réécrite. La loi est vue rouge sur un
`createInstance` posé dans `src/contract/`.

### Phase 4. Le modèle et les sources

1. `src/template/modele.ts` : contrat et dessins non déclarés vers sections et
   règles, selon 6.1 et H1-E.
2. `src/template/sources.ts` : relevé synchrone de l'offre ; conteneur vierge ;
   résolution asynchrone des maîtres de règles et de sections.
3. `exportComponent.ts` : champs internes des dessins non déclarés et de
   l'index des conteneurs.
4. `extractRules.ts` et `code.ts` : offre dans le message `cible`, garde du
   variant seul.
5. `tests/template.test.ts` : contrats synthétiques, dont un axe renommé
   `size`, un axe d'états, un composant sans propriété ; test de relecture.

### Phase 5. L'écriture et sa frontière

1. `src/template/ecriture.ts` selon le chemin validé en phase 1 : polices
   vérifiées et chargées d'abord, conteneur construit ou conteneur vierge
   rempli, rangé, placé ; échec défait par suppression du conteneur.
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
2. Cinq états de galerie, captures, protocole de relecture (a) à (e).
3. `interface.test.mjs` : bouton visible, inactif, absent.
4. README du plugin, `package.json`, POUR-LES-DESIGNERS.md, en-tête
   d'`extractRules.ts`, commentaire de `montrerLesCalques`, relus contre
   `rediger-sans-tics-ia`.

### Phase 7. Recette dans Figma

Le mainteneur rejoue dans Figma : création sur une page de composants, sur une
page qui ne porte que le maître, avec un conteneur vierge collé, dans une
section, suppression après création, rédaction de trois règles, analyse,
publication. L'agent ne peut pas exécuter l'export dans Figma
([AGENTS.md](../../../../AGENTS.md#limites-denvironnement)).

## 11. Décisions attendues à H1

| Id | Question | Options | Recommandation | Ce qui en dépend |
|---|---|---|---|---|
| H1-A | Qui mène l'essai de la phase 1 ? | agent seul, par `use_figma` ; mainteneur seul ; partage | partage : l'agent sur une copie du fichier, le mainteneur pour E1 et E6 à E8 | tout le reste |
| H1-B | Que devient une règle qui garde le texte d'exemple ? | A vider ; A' vider et localiser ; B note groupée ; B' silence | B, avec le critère par tag | phase 2, texte des règles posées |
| H1-C | Quand le bouton apparaît, et d'où viennent les règles ? | P1 set seul ; P1-bis analyse au clic ; P2 après analyse | P1-bis | modèle, interface, galerie |
| H1-D | Que fait le plugin quand un conteneur existe déjà ? | rien ; compléter les règles manquantes ; créer un second conteneur | pas de bouton sur la page, refus s'il est ailleurs, remplissage d'un conteneur vierge ; compléter plus tard | cas limites, messages |
| H1-E | Que contient le template ? | états ; `@default` par axe ; intention ; icônes détectées, avec ou sans la tâche 2.4 | tout sauf les états, avec la tâche 2.4 | modèle, volume |
| H1-F | Que montre Figma après la création ? | garder le composant sélectionné et cadrer les deux ; sélectionner le conteneur | garder et cadrer | interface |
| H1-G | D5 est-il confirmé, sachant qu'une page sans maître ni instance ne permet pas de créer ? | confirmer, avec le message de 5.5 ; chercher le maître sur tout le document | confirmer : l'analyse charge déjà les pages, la question est une règle de produit | sources, messages |
| H1-H | Comment se défait une création ? | supprimer le conteneur, seul calque créé ; Ctrl+Z, avec `commitUndo` dans le seul module d'écriture si E6 l'exige | la suppression comme promesse ; `commitUndo` seulement si E6 montre que Ctrl+Z défait aussi un geste antérieur au clic | loi du document intact, SPEC.md |

## 12. Questions à l'équipe consommatrice

La première question du plan de recherche a sa réponse dans
[RECHERCHE-REGLAGES.md](../R%C3%A9glages%20du%20plugin/RECHERCHE-REGLAGES.md#11-utilisateurs) :
les composants de l'équipe portent un `.componentRules`. Restent :

- son maître `.componentRules` vient-il d'une bibliothèque ? L'essai E9 en
  dépend, et `isRuleInstance` avec lui ;
- ses designers ont-ils le droit de modifier les fichiers de composants ?

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
le code ou à sa source avant d'être retenu.

| Point de la revue | Suite |
|---|---|
| Les avertissements identiques sont fusionnés : 14 lignes et non 29 | retenu, vérifié dans `exportComponent.ts` ; constat 7 et 6.2 réécrits |
| L'exemple se trompait sur le dessin non déclaré, le compte de la note et « aucune règle @usage » | retenu, vérifié dans `rulesModel.ts` et `exportComponent.ts` ; 6.4 réécrit, tâche 2.4 ajoutée |
| Le `content` de `@default` rendait l'option B dangereuse | retenu ; critère par tag |
| Un variant seul est une cible valide | retenu, vérifié dans `cible.ts` ; garde ajoutée |
| L'ajout dans un slot d'instance est documenté par le guide MCP de Figma | retenu, page relue ; constat 3 et sources |
| Le regroupement de l'annulation était présenté comme documenté | retenu ; constat 6 et H1-H |
| `inventaireInvariants.test.ts` manquait | retenu, vérifié ; 4.1 et 9 |
| Imprécisions : cinq instances, quatre faux positifs pour `.name`, onze promesses, ordre de la carte | retenues, vérifiées |
| L'essai par `use_figma` ne reproduit ni la fenêtre du plugin ni son annulation | retenu ; essai partagé |
| P2 laisse sept chemins de `code.ts` sans traitement ; P1-bis les évite | retenu, chemins vérifiés ; recommandation changée |
| Conteneur vierge collé, conteneur sur une autre page, conteneur orphelin | retenu. Ajout : le vierge exige aussi qu'aucune règle ne soit rédigée, sans quoi le conteneur du composant qui porte le nom par défaut serait réécrit |
| Réutiliser les sections par défaut | retenu comme chemin E, essayé en premier |
| Largeur des règles dans un slot | retenu, mesuré dans Figma ; essai E5 et motif de la loi |
| Motifs manquants, `figma.union` compris, et refus de `loadAllPagesAsync` dans `src/template/` | retenu, aucun faux positif mesuré |
| Exclusion et promesses trop tôt dans l'ordre des phases | retenu ; déplacées en phase 5 |
| Bouton « Annuler » sans effet pendant la création | retenu ; retiré pendant la création |
| Un message `regles` doublait `status` | retenu ; offre portée par `cible` |
| Phrase de confirmation sur les composants imbriqués, sans détection | retenu ; phrase retirée |
| Troisième issue à H2 : lister les règles sans écrire | retenu comme option |
