# Plan de recherche sur le template de règles

> Statut : à instruire par un agent. Ce plan prépare un bouton « Générer
> template de règles » qui pose, à côté du component set sélectionné, une
> instance de `.componentRules` préremplie avec les propriétés du composant. Il
> fixe la demande, l'état du code, les conflits avec les invariants du dépôt et
> les questions ouvertes. Il ne contient aucune implémentation.

## Instruction donnée à l'agent

Instruire les sections 4 à 9, puis écrire le rapport décrit en
[section 12](#12-livrable-attendu). Rendre la main au mainteneur à la fin du
rapport : c'est la porte humaine H1.

Règles de travail :

- **Ne modifier aucun code ni aucun document d'autorité.** Le seul fichier écrit
  est `RAPPORT-TEMPLATE-REGLES.md`, dans le dossier de ce plan.
- **Ne rien écrire dans un fichier Figma.** Les lectures passent par le MCP
  Figma (`get_metadata`, `get_design_context`, `get_screenshot`). Un essai
  d'écriture se décrit dans le rapport, il ne s'exécute pas.
- **Vérifier dans le code chaque fait cité ici avant de s'en servir.** Ce plan
  décrit le commit `1ec3f6e`, et d'autres sessions commitent sur `main` pendant
  le travail. Relever le commit lu dans le rapport.
- **Recommander, sans trancher.** Chaque sujet ouvert reçoit une comparaison
  d'options, une recommandation et ses impacts. Le mainteneur décide à H1.
- **Aucun identifiant privé.** Le rapport ne cite ni clé de fichier Figma, ni
  équipe consommatrice, ni compte. Un composant d'exemple s'appelle `Button`.
- **Sources extérieures.** Citer l'adresse de la documentation de l'API des
  plugins Figma pour chaque comportement d'API invoqué. Une affirmation sans
  source se marque « non vérifié ».
- **Aucun nom de composant du corpus dans une recommandation de test.** Les
  composants de test sont remplaçables ; un test décrit une forme de component
  set, jamais un composant nommé.

Lire avant de commencer :

1. [AGENTS.md](../../../../AGENTS.md), pour la carte du code et les invariants ;
2. [FORMAT.md, section 7](../../../format/FORMAT.md#7-intention-et-documentation-des-props),
   qui fait autorité sur la grammaire des règles ;
3. [SPEC.md, « Hors périmètre MVP »](../../../../packages/plugin/SPEC.md#hors-périmètre-mvp)
   et sa sous-section « Sélectionner et cadrer ne sont pas modifier » ;
4. [CONTRIBUTING.md, Interface du plugin](../../../../CONTRIBUTING.md#interface-du-plugin) ;
5. la skill [`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md)
   avant d'écrire le rapport, et la skill
   [`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md)
   avant de proposer un texte affiché dans le plugin.

## 1. Contexte

### 1.1. Demande

- Un bouton « Générer template de règles », placé sous « Analyser le
  composant » dans la carte du composant.
- Un clic pose une instance de `.componentRules` dont le calque
  `component-name` écrit le nom du component set sélectionné.
- L'instance contient une règle par propriété utilisée par le component set,
  prête à recevoir le texte du designer.

### 1.2. Le composant `.componentRules` de référence

Le mainteneur fournit le lien du fichier de tests. Le composant est rangé sur la
page « Règles [.componentRules] », node `713:1390`. Le même fichier range des
composants de test sur la page « Components », node `3:122` : ils servent à
mesurer la section 6. Structure relevée par
`get_metadata` :

```
.componentRules (COMPONENT, 588 × 1214)
├─ Label / « REGLES D’UTILISATION »
└─ Wrapper
   ├─ component-name-wrap / component-name (TEXT)
   └─ Sections-Wrapper (SLOT)
      ├─ .rulesSection « GÉNÉRAL »        Rules-Wrapper (SLOT) : 2 × .ruleItem
      ├─ .rulesSection « PROPRIÉTÉS »     Rules-Wrapper (SLOT) : 1 × .ruleItem (@prop)
      ├─ .rulesSection « OPTIONS »        Rules-Wrapper (SLOT) : 1 × .rulesItems (@boolean)
      ├─ .rulesSection « ICONES »         Rules-Wrapper (SLOT) : 1 × .ruleItem
      └─ .rulesSection « DOCUMENTATION »  Rules-Wrapper (SLOT) : 3 × .ruleItem
```

Une règle `@prop` contient : `rule-ids` (calques texte `prop` et `@prop`),
`divider`, `content`. Le maître est livré avec des règles d'exemple et un
`component-name` prérempli.

À relever par l'agent : les variants de `.ruleItem` et leurs calques par tag,
les propriétés exposées par `.rulesSection` et `.componentRules`, le nom du
component set de l'instance nommée `.rulesItems` dans la section `OPTIONS`.
`isRuleInstance` compare le nom du component set maître à `.ruleitem` : si ce
maître s'appelle `.rulesItems`, la règle de cette section est ignorée à
l'export.

### 1.3. État actuel du code

| Fait | Où le vérifier |
|---|---|
| Le plugin ne modifie jamais le document Figma | `AGENTS.md`, première phrase ; SPEC.md, « Hors périmètre MVP » |
| Un test de source refuse `figma.create*`, `appendChild`, `insertChild`, `.remove()`, `setPluginData`, `commitUndo` hors de `src/ui` | `tests/loiDuDocumentIntact.test.ts` |
| Aucun membre de `UiRequest` n'écrit dans le document | commentaire de `HORS_SANDBOX`, `tests/loiDuDocumentIntact.test.ts` ; `UiRequest`, `src/messages.ts` |
| Le conteneur se reconnaît au calque `component-name` d'une instance, jamais à son maître | `rulesContainerOwner`, `src/contract/extractRules.ts` |
| Une règle se reconnaît au nom du component set de son maître, `.ruleItem` | `isRuleInstance`, `RULES_COMPONENT_NAME`, `src/contract/extractRules.ts` |
| Le tag se lit sur le calque `@…`, puis sur la valeur de variante | `ruleTagOf`, `src/contract/extractRules.ts` |
| Une règle sans texte ni cible est écartée sans warning | `nEcritRien`, `src/contract/extractRules.ts` |
| Une règle dont `content` est vide, hors `@icons` et `@default`, produit un warning et n'est pas exportée | `buildRules`, `src/contract/rulesModel.ts` |
| Plusieurs conteneurs pour un même nom produisent une note ; seul le premier est lu | `extractRules`, `src/contract/extractRules.ts` |
| Les règles se lisent sur la page courante | `extractRules`, `figma.currentPage.findAll` |
| Un conteneur `.componentRules` déclare son composant comme dépendance UCM | `RULES_CONTAINER_NAME`, `src/contract/composedComponents.ts` |
| Les types de propriétés lus : `VARIANT`, `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `SLOT` | `src/contract/parsers.ts` |
| L'axe `State`/`Status` est publié par `stateModel`, et ses règles `@prop` y sont rangées | FORMAT.md, section 7 ; `isStateProperty` |
| Un axe sans `@default` ne publie aucun défaut, et la position d'un variant n'est pas une décision | `RulesResult.enumDefaults`, `src/contract/rulesModel.ts` |
| La cible sélectionnée est décrite par `etatDeCible` | `src/cible.ts` |
| La carte du composant porte le bouton « Analyser le composant » | `createCarteComposant`, `src/ui/components/CarteComposant.ts` |
| Le manifeste déclare `documentAccess: "dynamic-page"` | `manifest.json` |
| `loadAllPagesAsync` n'est appelé que par l'index des dépendances | `src/contract/composedComponents.ts` |

Tous les chemins partent de `packages/plugin/` sauf mention contraire.

## 2. Décisions prises

| Décision | Conséquence pour la recherche |
|---|---|
| D1. Le bouton vit dans la carte du composant, sous « Analyser le composant » | Instruire son rang, son état et ses textes, pas son existence |
| D2. Le template suit la grammaire actuelle de FORMAT.md, section 7 | Aucun nouveau tag ni calque. Une propriété sans tag se signale au mainteneur |
| D3. Le moteur reste générique | Aucun nom de composant du corpus dans le code ou les tests. Les noms `.componentRules`, `.ruleItem`, `component-name` restent des conventions |
| D4. Un seul module du sandbox a le droit d'écrire dans le document. `loiDuDocumentIntact.test.ts` garde sa liste d'appels refusés et exclut ce module nommément | Instruire la forme de l'exclusion et les phrases d'autorité à réécrire, pas le choix de l'écriture |
| D5. Le plugin cherche `.componentRules` sur la page active, jamais sur tout le document | Aucun `loadAllPagesAsync` ni aucune clé de bibliothèque. Sans `.componentRules` sur la page active, le bouton ne crée rien |

## 3. Contraintes

- **Document intact.** Hors du module de D4, rien n'écrit dans le document.
  Voir la [section 4](#4-lécriture-bornée-à-un-module).
- **Hiérarchie de l'information.** « Une carte est une commande, et il n'y en a
  que deux » ([CONTRIBUTING.md](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation)).
  Un second bouton dans la carte du composant ajoute un geste à cette commande.
- **Galerie.** Chaque type de message de `messages.ts` a au moins un état dans
  `galerie/etats.cjs`. `tests/galerie.test.ts` échoue sinon.
- **Sandbox.** Aucune boîte de dialogue : une confirmation passe par un second
  clic sur le même bouton.
- **Interface construite à la main.** `tests/stylesUi.test.ts` exige une règle
  CSS pour chaque classe posée.
- **Diagnostics.** Un message au designer suit la forme manque, impact, action,
  et la loi de localisation (`tests/loiDeLocalisation.test.ts`).

## 4. L'écriture bornée à un module

La feature écrit dans le document. D4 retient une écriture bornée à un seul
module du sandbox. Ce sujet conditionne tous les autres.

### 4.1. Faits à établir

- Les passages d'`AGENTS.md`, `SPEC.md`, `CONCEPT.md`, `README.md`,
  `POUR-LES-DESIGNERS.md` et du README du plugin qui promettent que le plugin
  n'écrit pas dans Figma. Relever chaque phrase.
- Les appels d'API nécessaires : import ou recherche du maître, `createInstance`,
  écriture de `characters`, `loadFontAsync`, ajout d'enfants dans un `SLOT`,
  positionnement. Pour chacun, dire quel motif de `loiDuDocumentIntact.test.ts`
  il déclenche.
- Le comportement d'annulation : une création faite par un plugin s'annule-t-elle
  en un seul Ctrl+Z ? Citer la documentation, sinon marquer « non vérifié ».

### 4.2. Questions à instruire sur la borne

- **Emplacement du module.** Proposer son chemin, par exemple `src/template/`,
  et sa frontière : la construction du template en fonction pure d'un côté, les
  appels d'écriture de l'autre.
- **Forme de l'exclusion.** La loi exclut un chemin exact, pas un motif. Deux
  assertions protègent déjà l'exclusion de `src/ui` : le dossier existe, et
  aucun fichier exclu n'est balayé. Proposer leurs équivalents pour le module,
  et un test qui refuse l'import de ce module par `src/contract/`,
  `src/tokens/` et le chemin d'analyse et de publication.
- **Appels couverts.** Lister les appels d'écriture du module et vérifier que la
  liste `ECRITURES` les nomme tous. L'affectation de `characters`, `x` ou `y`
  n'y figure pas : hors du module, elle passerait la loi. Dire s'il faut
  étendre la liste.
- **Déclenchement.** Seule la demande du bouton atteint le module. Relever dans
  `code.ts` le routage qui le garantit, et le commentaire de `HORS_SANDBOX` à
  réécrire.
- **Phrases d'autorité.** Proposer la nouvelle promesse : l'analyse et la
  publication ne modifient jamais le document, et seul le bouton du template y
  crée une instance de `.componentRules`.

Appliquer à la loi modifiée le protocole du dépôt : casser ce
qu'elle protège, constater le rouge, restaurer.

## 5. Obtenir le maître `.componentRules`

Le plugin crée une instance d'un maître qu'il ne connaît que par son nom. D5
borne la recherche à la page active, où deux sources sont possibles :

| Source sur la page active | À instruire |
|---|---|
| Le composant maître `.componentRules` | Recherche par nom compacté, homonymes, maître rangé dans un frame ou une section |
| Une instance de `.componentRules` | Son maître se lit par `getMainComponentAsync`, même s'il est rangé sur une autre page ou dans une bibliothèque. Cette lecture respecte-t-elle D5 ? Coût et échec de l'appel |

Questions :

- Quelle source passe en premier quand la page active porte les deux ?
- L'instance trouvée documente déjà un autre composant : sert-elle seulement à
  lire le maître, ou est-elle écartée ?
- Le maître de `.ruleItem` se lit-il sur les règles d'exemple du maître
  `.componentRules`, sans autre recherche ?
- Quel message affiche le bouton quand la page active ne porte aucun
  `.componentRules` ? Le proposer selon `rediger-diagnostics-ucm`.
- Le bouton est-il désactivé d'avance dans ce cas ? Mesurer le coût d'une
  recherche sur la page à chaque changement de sélection.

La construction sans maître est écartée : `isRuleInstance` exige des instances
de `.ruleItem`, et des frames créés par le plugin ne produiraient aucune règle
lisible.

L'équipe consommatrice utilise-t-elle `.componentRules` ? La question est
ouverte dans
[RECHERCHE-REGLAGES.md](../Réglages%20du%20plugin/RECHERCHE-REGLAGES.md#10-questions-ouvertes).

## 6. Du component set aux règles

### 6.1. Correspondance à instruire

| Propriété Figma | Tag candidat | Contenu du calque `prop` | Question |
|---|---|---|---|
| `VARIANT`, une règle par valeur | `@prop` | `axe.valeur` | Une règle par valeur, ou seulement l'axe ? Volume sur un component set de 5 axes |
| `VARIANT`, défaut | `@default` | `axe.` sans valeur ? | Voir 6.2 |
| `VARIANT` axe `State`/`Status` | `@prop` | `state.hover` | Section « PROPRIÉTÉS » ou section dédiée ? |
| `BOOLEAN` | `@boolean` | nom sans suffixe `#id` | Nom Figma affiché ou forme normalisée (`iconLeft`) ? `normalizePropKey` accepte les deux |
| `TEXT`, `INSTANCE_SWAP`, `SLOT` | aucun | sans objet | D2 : signaler, ou poser une règle `@usage` à la place ? |
| Calques d'icône du composant | `@icons` | calque `icon` | Quelle fonction du moteur liste les calques graphiques ? Politique `modifiable`/`strict` à laisser au designer |
| Intention | `@usage`, `@do`, `@dont`, `@pairs` | sans objet | Poser une règle vide de chaque, ou aucune ? |

Réutiliser les fonctions de lecture du moteur plutôt que d'en écrire de
nouvelles : `parsers.ts` pour les définitions, `componentTree.ts` pour les axes.
Relever celles qui supposent une analyse complète.

### 6.2. Le texte de départ des règles

Un template porte des règles sans texte. Le moteur en tire deux comportements :

- une règle dont `content` est vide mais `prop` rempli produit un warning « le
  layer content est vide » à chaque export, soit un warning par règle non
  rédigée ;
- une règle dont `content` contient un texte d'exemple est exportée comme
  documentation réelle.

Options à comparer : texte vide et warnings acceptés, texte d'exemple reconnu
et ignoré par le moteur (ce qui change `buildRules` et FORMAT.md), calque
`prop` vide lui aussi pour que `nEcritRien` écarte la règle. Mesurer le nombre
de warnings sur un component set réel du corpus avant de recommander.

Pour `@default`, préremplir la valeur du variant par défaut de Figma contredit
la décision écrite dans `RulesResult.enumDefaults` : la position d'un variant
n'est pas une décision. Instruire une règle `@default` sans valeur, et le
warning qu'elle produit.

### 6.3. Sections

Les sections du maître sont `GÉNÉRAL`, `PROPRIÉTÉS`, `OPTIONS`, `ICONES` et
`DOCUMENTATION`. Le moteur ignore les sections. Établir la correspondance entre
tag et section utilisée par le fichier de référence, et dire si le template la
reproduit. Instruire la suppression des règles d'exemple du maître et l'ajout
d'instances dans un `SLOT` d'une instance imbriquée : l'API l'autorise-t-elle,
et la documentation Figma le décrit-elle ?

## 7. Cas limites

| Cas | Question |
|---|---|
| Sélection : variant seul, instance, plusieurs component sets, composant sans propriété | Le bouton est-il actif ? Reprendre les cas de `etatDeCible` |
| Un conteneur existe déjà pour ce nom | Refuser, compléter les règles manquantes, ou créer un second conteneur, ce qui déclenche la note de doublon |
| Un conteneur existe sur une autre page | D5 : la recherche ne le voit pas, et le bouton en crée un second sur la page active. L'ancien n'est pas lu à l'export mais compte comme dépendance |
| Le component set est rangé dans une section ou un frame | Emplacement de l'instance, chevauchement avec les nodes voisins |
| Fichier en lecture seule, ou bibliothèque non modifiable | Message d'erreur et état du bouton |
| Police du maître absente du poste | `loadFontAsync` échoue : comportement attendu |
| Composant imbriqué dans d'autres composants | Le conteneur créé fait de ce composant une dépendance UCM, ce qui change les contrats de ses parents à leur prochain export. Le designer doit-il en être averti ? |
| Nom du component set avec espaces ou casse différente | `compactName` rapproche les deux. Écrire le nom Figma exact |
| Clic pendant une analyse ou une publication | `occuper` rend la carte inerte : le bouton suit-il ? |
| Clic répété | Deux conteneurs créés |

## 8. Interface

- Rang du bouton dans la hiérarchie de CONTRIBUTING.md, variante (`secondary` ?),
  état désactivé, libellé exact. « Générer template de règles » est la demande ;
  proposer une forme conforme à `rediger-diagnostics-ucm` si le libellé change.
- Retour après le clic : sélection et cadrage de l'instance créée (déjà admis
  par SPEC.md), texte de confirmation, place de ce texte dans la carte.
- Relation avec le résultat d'une analyse affichée : le clic l'invalide-t-il ?
  Le conteneur créé change le contrat suivant.
- Maquettes en texte à 320 px : carte au repos, après génération, en échec.
- États de galerie à ajouter.

## 9. Documents et tests touchés

| Fichier | Ce qui change |
|---|---|
| `AGENTS.md` | Première phrase, invariants, carte du code |
| `packages/plugin/SPEC.md` | « Hors périmètre MVP », section 7 |
| `docs/format/FORMAT.md` | Section 7, si le texte de départ ou `@default` sans valeur change la grammaire |
| `CONCEPT.md`, `README.md`, `packages/plugin/README.md`, `docs/guides/POUR-LES-DESIGNERS.md` | Promesse de lecture seule, documentation des règles |
| `CONTRIBUTING.md` | Règle des cartes, si le second geste la touche |
| `packages/plugin/src/messages.ts` | Nouvelle demande et nouveau message |
| `packages/plugin/galerie/etats.cjs` | États du bouton et du résultat |
| `packages/plugin/tests/` | `loiDuDocumentIntact.test.ts`, `rules.test.ts`, `galerie.test.ts`, `stylesUi.test.ts`, `code.test.ts`, `interface/interface.test.mjs`, et un test de génération |

Le rapport complète cette liste. Un test de génération doit prouver qu'un
template généré puis relu par `extractRules` rend les propriétés attendues, sans
warning autre que ceux retenus en 6.2.

Commandes de vérification, depuis la racine :

```sh
npm test
npm run galerie --workspace ucm-exporter-plugin
```

## 10. Questions au mainteneur

- Un warning par règle non rédigée est-il acceptable pendant la rédaction ?
- Le template doit-il lister les propriétés `TEXT`, `INSTANCE_SWAP` et `SLOT`,
  qu'aucun tag ne documente ?
- Faut-il régénérer un template existant quand le component set gagne une
  propriété ?

## 11. Questions à l'équipe consommatrice

- Ses fichiers contiennent-ils `.componentRules` et `.ruleItem` ?
- Ses designers ont-ils le droit de modifier les fichiers de composants ?

## 12. Livrable attendu

`RAPPORT-TEMPLATE-REGLES.md`, dans le dossier de ce plan, avec :

1. le commit lu et les faits de la section 1.3 vérifiés ou corrigés ;
2. la structure relevée de `.componentRules`, `.rulesSection` et `.ruleItem`,
   variants et calques compris ;
3. pour chaque sujet des sections 4 à 8 : faits vérifiés avec leur fichier ou
   leur source, options comparées dans un tableau, recommandation, impacts sur
   le code, les tests, la galerie et les documents ;
4. la table de correspondance de la section 6.1 complétée, et un exemple de
   template produit pour un component set fictif `Button` à deux axes, un
   booléen et une icône ;
5. les maquettes en texte de la section 8 ;
6. un ordre de mise en œuvre qui respecte la
   [section 13](#13-dépendances-entre-les-sujets).

Après H1, le mainteneur décide. Le plan d'implémentation qui suit passe par une
revue indépendante avant d'être exécuté.

## 13. Dépendances entre les sujets

| Sujet amont | Sujet qu'il conditionne |
|---|---|
| Borne de l'écriture (4) | Tous les autres sujets |
| Obtention du maître (5) | Cas du maître absent (7), messages d'échec (8) |
| Texte de départ des règles (6.2) | Warnings à l'export, test de génération (9) |
| Conteneur existant (7) | Libellé et comportement du bouton (8) |
