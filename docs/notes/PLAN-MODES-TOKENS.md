# Plan : modes de tokens et consommation des contrats

Plan d'implémentation, soumis à une revue indépendante avant exécution. Il part
des décisions prises avec le mainteneur (section 1.1). Il remplace les
recommandations de `PLAN-MODES-ET-CONSOMMATION.md` là où les deux divergent
(section 1.2).

Chaque problème est énoncé en section 2, avec sa preuve, avant toute solution.
Chaque section de solution commence par les problèmes qu'elle résout. Trois
statuts qualifient les faits : **mesuré** (relevé dans le code ou les fichiers
pour ce plan), **repris** (mesuré par une note antérieure, non réexécuté),
**à mesurer**.

## 1. Cadre

### 1.1. Décisions prises

| Décision | Conséquence pour ce plan |
|---|---|
| UCM génère la feuille CSS des modes | la CLI publie `ucm tokens css-modes` ; la feuille de base reste produite par l'outil du consommateur |
| Le consommateur fait sa mise en place à partir de ce que les paquets npm fournissent | le repository ajoute une dépendance, une commande de build, un import et une entrée de configuration, tous documentés par les paquets ; aucun outil n'y est écrit à la main. La règle 4 du Playground est reformulée en ce sens |
| La skill de consommation se scinde, et sa part générale est publiée | `implementer-depuis-un-contrat` part dans `@ucm-kit/cli` ; `consommer-contrat` garde le protocole de recette |
| Le nom normalisé d'un mode est sa seule identité publique | aucun identifiant Figma publié ; renommer un mode est une rupture que le diff sémantique signale |
| `ucm.config.json` reçoit la seule correspondance entre axe et attribut | les autres réponses du projet restent dans son document de conventions |
| Un mode fixé dans un composant se mesure avant de se publier | aucun champ de contrat avant la mesure |
| UCM ne publie ni gabarit ni bibliothèque runtime | gabarits et helpers de mise en page appartiennent au repository |

### 1.2. Ce qui change par rapport à la note précédente

| Point | Note précédente | Ce plan | Raison |
|---|---|---|---|
| Emplacement de la déclaration d'axe | sur le groupe de la collection, version 3 du format de tokens | à la racine, sous `$extensions["com.ucm.axes"]`, sans monter la version | mesuré : `conformiteDtcg.test.ts` exige qu'aucun groupe ne porte `$extensions`, et `GroupeDeTokens` (`format/tokens.ts`) déclare qu'un groupe ne porte aucune métadonnée. La racine est déjà l'unique point de lecture du kit, et un ajout facultatif n'y casse aucun lecteur (section 5.4) |
| Contrôles C1 et C2 (alias de mode absent, forme d'une valeur de mode) dans le rapport de CI | proposés | retirés | le plugin écrit `null` pour une cible absente et garantit la forme ; la feuille de modes refuse à la génération ce qu'une autre source casserait (section 9.5) |
| `resoudre(document, chemin, contexte)` | proposé | retiré | aucun lot ne consomme une valeur terminale ; il revient avec un contrôle de rendu par contexte |
| Place du générateur CSS | CLI ou kit | CLI ; le kit garde le modèle sans CSS | le kit reste sans hypothèse de plateforme, et `registrePortable.test.mjs` juge ses lecteurs |
| Cohérence de la déclaration d'axe (C4) | rapport de CI | commandes de la CLI | une incohérence viendrait du producteur et ne demande aucun geste au designer |

### 1.3. Vocabulaire

| Terme | Sens |
|---|---|
| axe | une collection Figma qui compte au moins deux modes |
| mode | une valeur de cet axe, sous son nom normalisé : `intencial`, `marque-2` |
| feuille à modes | une feuille qui porte `$extensions["com.ucm.modes"]` |
| propriétaire d'une feuille | l'axe déclaré dont le groupe contient une feuille à modes |
| cône d'un axe | le plus petit ensemble qui contient les feuilles dont l'axe est propriétaire, et toute feuille dont une valeur, dans un mode quelconque, est un alias vers une feuille du cône |
| portée | un élément de l'interface qui porte l'attribut d'un axe, et ses descendants |
| contexte | un mode choisi pour chaque axe |
| feuille de base | la feuille CSS que l'outil du consommateur produit depuis `$value` |
| feuille de modes | la feuille CSS que `ucm tokens css-modes` produit |
| ancrage | une question que le format laisse ouverte et que le repository tranche |

## 2. Les problèmes

### 2.1. Le corpus de référence

Mesuré sur `UCM-Playground` : `tokens.json` en version 2, 757 feuilles, un seul
axe (`color-brand-tokens`, modes `intencial` et `marque-2`, 10 feuilles à
modes). Le cône de l'axe compte 60 feuilles : les 10 feuilles à modes et 50
feuilles `components.button.colors.*`. Toutes les valeurs de mode sont des alias.

| Contrat | Références | Traversent l'axe | Composition |
|---|---|---|---|
| `Button` | 255 | 50 | aucune |
| `Alert` | 39 | 0 | `Button` |
| `StressTest` | 82 | 0 | `Alert`, `Button` ×3, `TileLink` ×7 |
| `TileLink` | 11 | 0 | aucune |

Les noms de ce tableau servent de preuve dans ce document. Aucun test du plan ne
les cite.

### P1. Les ressources CSS n'exposent que le mode par défaut

- **Constat.** La feuille de base du Playground ne contient aucune valeur de
  `marque-2`.
- **Preuve (mesuré).** `src/generated/tokens.css` : zéro occurrence de
  `marque-2`. `style-dictionary.config.mjs` lit `$value`, et Style Dictionary
  ignore `$extensions`.
- **Conséquence.** Aucun composant ne peut se rendre en `marque-2`, ni par une
  bascule globale ni sur une partie de la page, sans CSS écrit à la main.

### P2. Une portée locale exige de redéclarer toute la chaîne d'alias

- **Constat.** Redéclarer les 10 feuilles à modes sous un sélecteur de portée
  ne change pas la couleur d'un bouton placé dans cette portée.
- **Preuve.** Le module CSS Custom Properties substitue `var()` au calcul de la
  valeur, sur l'élément qui déclare la propriété, avant l'héritage.
  `--components-button-colors-primary-contained-default-background` est déclarée
  sur `:root` et y vaut déjà la couleur `intencial`. Repris : dans Chrome 152,
  seule la redéclaration du cône entier rend la bonne couleur dans un
  sous-arbre.
- **Conséquence.** Le générateur doit connaître le cône de chaque axe. Le graphe
  d'alias qui le définit est dans `tokens.json`. La feuille de base ne le porte
  plus sous une forme exploitable.

### P3. Deux axes croisés rendent une feuille dépendante d'un mode posé plus haut

- **Constat.** Quand une feuille à modes de la marque cite une feuille à modes
  du thème, une portée de thème placée sous une portée de marque doit
  redéclarer la feuille de marque. L'expression à écrire dépend alors du mode de
  marque hérité, qu'un sélecteur de thème ignore.
- **Preuve (repris).** Sur huit arbres à deux axes, une redéclaration naïve se
  trompe dans deux cas. Une règle `@scope` par mode de marque les rend justes
  tous les huit. Le corpus n'a qu'un axe : le problème est anticipé par le
  besoin exprimé (marques et clair/sombre), non observé.
- **Conséquence.** Sans règle de proximité, une section sombre dans une page
  `marque-2` retombe sur la marque par défaut.

### P4. Le fichier de tokens ne nomme pas le mode par défaut

- **Constat.** `$value` porte la valeur du mode par défaut, sans son nom.
- **Preuve (mesuré).** `buildLeaf` (`packages/plugin/src/tokens/exportTokens.ts`)
  écrit `valueForMode(collection.defaultModeId)` dans `$value`, puis une clé par
  mode dans l'ordre de `collection.modes`. Aucune donnée n'est écrite au niveau
  de la collection.
- **Conséquence.** Deux modes de même valeur rendent le défaut indécidable, et
  l'ordre des clés ne le désigne pas. Sans ce nom, la feuille de modes ne peut
  pas écrire la règle qui ramène une portée imbriquée au défaut, ni dire quel
  mode `:root` porte.

### P5. Aucune convention ne relie un axe à un moyen de le poser

- **Constat.** Rien ne dit quel attribut porte un axe, où le poser, ni comment
  lire le mode effectif d'un élément.
- **Preuve (mesuré).** `ucm.config.json` décrit trois chemins
  (`format/configuration.ts`). La skill énumère sept ancrages, et aucun ne
  concerne un mode.
- **Conséquence.** Chaque projet invente la convention. Un agent qui implémente
  un composant ne sait pas comment le placer dans un mode.

### P6. La projection de nom est recopiée chez le consommateur

- **Constat.** Le Playground ne nomme pas ses variables par `tokenCssVariable`.
- **Preuve (mesuré).** `variableCss` (`style-dictionary.config.mjs`) remplace
  `[^a-z0-9]+`, et `tokenCssVariable` (`format/names.ts`) remplace
  `[^\p{L}\p{N}]+`. Les deux rendent les mêmes noms sur le corpus, qui est en
  ASCII. Un chemin accentué, que `normalizeName` conserve, donne deux noms.
- **Conséquence.** Une feuille de modes produite par UCM et une feuille de base
  produite par un autre outil peuvent nommer différemment la même variable. Une
  `var()` sans déclaration rend la propriété invalide au calcul, sans erreur
  visible.

### P7. Le contrôle typographique bloquant ne lit que le mode par défaut

- **Constat.** Le contrôle des types typographiques suit une chaîne d'alias par
  `$value` seul.
- **Preuve (mesuré).** `feuilleRacine`
  (`packages/kit/src/lecteurs/typography-token-types.mjs`) lit
  `feuille.$value` et jamais `com.ucm.modes`. Sous Figma, un alias `FLOAT` peut
  viser une `dimension` dans un mode et un `number` dans un autre, le type DTCG
  dépendant du chemin de la cible.
- **Conséquence.** Un faux vert sur un contrôle qui bloque la fusion. Non
  observé dans le corpus, qui n'a aucun axe typographique.

### P8. Un mode fixé dans un composant disparaît du contrat

- **Constat.** Un designer peut fixer un mode sur un calque ou une variante.
  Le contrat publie alors deux vues identiques pour deux rendus différents.
- **Preuve (mesuré).** Aucune occurrence de `explicitVariableModes` ni de
  `resolvedVariableModes` dans `packages/`. Le moteur reconnaît une variable liée
  à `visible` (`exportableNodes.ts`) ; ce que le contrat publie quand sa valeur
  change avec le mode n'est pas établi.
- **Conséquence.** Une perte de rendu sans diagnostic. Son ampleur est à mesurer
  dans le fichier Figma.

### P9. La procédure de lecture d'un contrat n'atteint pas un consommateur

- **Constat.** Un repository consommateur reçoit le contrat, sans les règles qui
  disent comment le transcrire.
- **Preuve (mesuré).** La skill est rangée dans
  `UCM-Exporter/.agents/skills/consommer-contrat/`. Le `files` de
  `@ucm-kit/cli` publie `src`, `README.md` et `LICENSE`, et celui de
  `@ucm-kit/core` ne contient aucune skill.
- **Conséquence.** L'agent d'un projet tiers ignore comment appliquer
  `rendering.roles`, qu'une matrice ne se reconstitue pas par cartésien, et
  comment se comporter face aux modes.

### P10. La skill mêle règles générales et protocole de recette

- **Constat.** Les règles de transcription et les consignes propres à la
  reconstruction à froid sont dans le même fichier.
- **Preuve (mesuré).** §0 déclare le composant jetable. §2.6 exige que le
  fichier ait été supprimé. §2.7 interdit de créer un test. Son en-tête YAML
  écrit `name` et `description` sur la même ligne, ce qui ne se lit pas comme
  deux champs.
- **Conséquence.** Appliquée en production, la skill arrête l'agent devant un
  fichier existant et lui interdit les tests.

### P11. Les ancrages ne suivent pas la version du format

- **Constat.** La liste des questions que le projet doit trancher vit hors des
  paquets, et elle change quand le format change.
- **Preuve (mesuré).** §6 de la skill : sept ancrages. Les modes en ajoutent
  quatre (section 13.3), et aucun paquet ne les porte.
- **Conséquence.** Un repository qui monte la version de la CLI ne reçoit pas
  les nouvelles questions, et son agent les tranche au hasard.

### P12. Rien ne dit dans quels modes vérifier un composant

- **Constat.** L'impact d'un axe sur un composant passe aussi par sa composition.
- **Preuve (mesuré).** `Alert` et `StressTest` ne citent aucune référence qui
  traverse l'axe, et composent `Button`, qui en cite 50.
- **Conséquence.** Une vérification limitée aux références propres oublie deux
  contrats sur trois. Une vérification de toutes les combinaisons du fichier
  coûte le produit de tous les axes pour chaque composant.

### 2.2. Ce qui n'est pas un problème

- **Le contrat et les modes.** `Button` cite
  `{components.button.colors.primary.contained.default.background}`, référence
  identique dans les deux marques. Le contrat ne change pas.
- **La comparaison littérale des références.** Elle reste juste sous plusieurs
  modes. Comparer une valeur résolue dans un seul mode deviendrait faux ; aucun
  contrôle actuel ne le fait.
- **Les aides de rendu.** `border` en `box-shadow` et `ring` en `outline` sont
  publiés dans chaque contrat par `rendering.roles`. Le problème est leur
  procédure d'application (P9), pas leur contenu.
- **Les contraintes entre modes.** Figma n'en exprime aucune : chaque variable a
  une valeur dans chaque mode de sa collection.

## 3. Contraintes que la solution tient

| Contrainte | Autorité |
|---|---|
| Les alias ne sont jamais aplatis | `AGENTS.md`, tokens et variables |
| Toute projection d'un nom a son propriétaire dans `format/names.ts` | `AGENTS.md`, tokens et variables |
| Le chemin d'un token s'assemble dans `joinTokenPath` seul | `packages/plugin/src/variables.ts` |
| La version du format de tokens est lue à la racine seule ; un groupe ne porte aucune métadonnée | `format/tokens.ts`, `conformiteDtcg.test.ts` |
| `@ucm-kit/core/format` cible ES2019 et ne dépend de rien | `format/index.ts`, `format/configuration.ts` |
| Les lecteurs du kit ne promettent aucune stack | `packages/kit/tests/registrePortable.test.mjs` |
| Aucune logique ni aucun test ne dépend du nom d'un composant | `AGENTS.md`, portée du contrat |
| Un avertissement nomme le calque, ce qui manque et le geste | `AGENTS.md`, diagnostics ; skill `rediger-diagnostics-ucm` |
| Le code de production ne lit pas le contrat au runtime | `CONCEPT.md`, section 3 |
| `ucm init` n'écrase jamais un fichier | `packages/cli/src/init.mjs` |
| Le Playground n'écrit aucun outillage UCM | `UCM-Playground/AGENTS.md`, règle 1 |

## 4. Vue d'ensemble

```text
Figma
  │  export des tokens : déclaration des axes à la racine (section 5)
  ▼
tokens.json ───────────────────────────────┐
  │                                         │
  │  outil du consommateur (Style Dictionary)│  @ucm-kit/core/lecteurs : modèle de modes (section 6)
  ▼                                         ▼
feuille de base (tokens.css)     @ucm-kit/cli
                                   ├─ ucm tokens contexte   document DTCG d'un contexte (section 8)
                                   ├─ ucm tokens css-modes  feuille de modes, contrôle des noms (section 9)
                                   ├─ ucm guide [contrat]   axes, contextes à vérifier, skill (section 13)
                                   └─ skills/implementer-depuis-un-contrat
  │
  ▼
application : feuille de base, puis feuille de modes ; attribut par axe (section 10)
```

| Problème | Solution | Lot |
|---|---|---|
| P1 | sections 8 et 9 | L2, L3 |
| P2 | section 6 (cône), section 9 | L1, L3 |
| P3 | section 9.3 | L3 |
| P4 | section 5 | L1, L2 |
| P5 | sections 7 et 10 | L1, L3 |
| P6 | section 9.5 | L3 |
| P7 | section 11 | L1 |
| P8 | section 12 | L6 |
| P9, P10, P11 | section 13 | L4 |
| P12 | sections 6 et 13.4 | L1, L4 |

## 5. Déclarer les axes dans `tokens.json`

**Résout** P4.

### 5.1. Forme

```json
{
  "$extensions": {
    "com.ucm.formatVersion": 2,
    "com.ucm.axes": {
      "color-brand-tokens": { "modes": ["intencial", "marque-2"], "default": "intencial" }
    }
  },
  "color-brand-tokens": { "…": "…" }
}
```

- La clé est le segment de collection que `joinTokenPath` écrit en tête des
  chemins de cette collection.
- `modes` suit l'ordre de `collection.modes`, sous les noms normalisés que
  `com.ucm.modes` emploie ; un nom que la normalisation confond ne figure qu'une
  fois, comme dans les feuilles.
- `default` est le nom normalisé du mode `defaultModeId`.
- Seule une collection d'au moins deux modes, dont une feuille au moins est
  exportée, est déclarée.

### 5.2. Cas écartés

Chaque cas omet la déclaration de l'axe. Les feuilles gardent `com.ucm.modes`.

| Cas | Traitement |
|---|---|
| Deux collections donnent le même segment, et l'une a plusieurs modes | avertissement : « Collections « A » et « a » : elles donnent le même groupe « a » dans le fichier de tokens. Le développeur ne pourra pas changer de mode dans « A ». Renommez l'une des deux, puis réexportez. » |
| Le segment de la collection est vide après normalisation | avertissement sur la collection, geste : la renommer |
| Le mode par défaut porte un nom normalisé déjà pris par un mode précédent | pas de nouveau message : `modeCollisionWarnings` signale déjà la collision et nomme le geste ; son impact mentionne la bascule perdue quand le mode écarté est le défaut |

Les phrases sont des propositions, à relire avec la skill
`rediger-diagnostics-ucm`.

### 5.3. Implémentation

- `packages/plugin/src/variables.ts` : extraire de `joinTokenPath` le calcul du
  segment de collection (`segmentDeCollection`), que `joinTokenPath` et la
  déclaration appellent. Le chemin reste assemblé par `joinTokenPath` seul.
- `packages/plugin/src/tokens/exportTokens.ts` : `declarationsDAxes(collections,
  variableByPath)` rend les déclarations et les points à corriger ;
  `handleExportTokens` les écrit dans l'objet `$extensions` de la racine, après
  la marque de version.
- `packages/kit/src/format/tokens.ts` : constante `EXTENSION_AXES_TOKENS`, type
  `DeclarationDAxe = { modes: string[]; default: string }`, et
  `ExtensionsDuDocument` qui reçoit la clé facultative.

### 5.4. Compatibilité

Aucun numéro ne monte. Un kit qui ne connaît pas la clé la saute, puisqu'il ne
lit que `com.ucm.formatVersion`. Style Dictionary ignore `$extensions` à la
racine : la classe 11 de `COMPATIBILITE.md` repose déjà sur ce fait, et
`styleDictionary.test.ts` le prouvera sur un export qui porte la déclaration.
Monter `TOKENS_FORMAT_VERSION` ferait refuser le fichier en `future` par chaque
kit publié, sans qu'aucune valeur ait changé de forme.

`docs/COMPATIBILITE.md` reçoit une classe 12 : ajout d'une déclaration
facultative sous `$extensions` à la racine de `tokens.json` ; aucun numéro ; un
fichier déjà fusionné reste lu ; personne ne migre, la déclaration arrive au
réexport.

Un fichier sans déclaration reste lisible. Le kit y déduit les axes des feuilles
et rend un défaut inconnu (section 6.1).

### 5.5. Tests et documentation

- `exportTokens.test.ts`, sur `fichierDeVariables.ts` étendu : défaut qui n'est
  pas le premier mode, deux collections au même segment, segment vide, défaut
  écarté par collision, collection à modes sans feuille exportée.
- `conformiteDtcg.test.ts` : l'assertion d'égalité sur `tokens.$extensions`
  devient « la marque vaut la version courante, et la déclaration d'axes est
  celle du fichier simulé » ; l'absence de `$extensions` sur les groupes reste
  exigée.
- `styleDictionary.test.ts` : l'export simulé porte une déclaration et le build
  reste sans valeur vide ni référence non résolue.
- `docs/FORMAT.md`, partie 2, point 3 : la déclaration d'axes remplace « Modes =
  marques ». `packages/plugin/SPEC.md`, partie 2 : la lecture de `defaultModeId`
  et les cas écartés. `docs/CHANGELOG-FORMAT.md`, section `tokens.json` : l'entrée
  de classe 12. `AGENTS.md` : un invariant sur la déclaration et son autorité.

## 6. Le modèle de modes du kit

**Résout** le calcul du cône (P2) et la liste des axes d'un composant (P12).

### 6.1. Fonctions

Module `packages/kit/src/lecteurs/modes-tokens.mjs`, types dans `index.d.mts`,
exporté par `@ucm-kit/core/lecteurs`. Le modèle ne produit aucun CSS et ne cite
aucune plateforme.

| Fonction | Entrée | Sortie |
|---|---|---|
| `axesDeTokens(document)` | un document de tokens analysé | `{ axes: [{ nom, modes, defaut, source }], constats }` ; `source` vaut `declaree` ou `deduite` ; `defaut` vaut `null` pour un axe déduit |
| `conesDesAxes(document, axes)` | le document et ses axes | `Map<chemin, Set<axe>>` : les axes dont le cône contient chaque feuille |
| `documentDansLeContexte(document, contexte)` | un contexte partiel `{ axe: mode }` | `{ document, erreurs }` ; chaque feuille à modes d'un axe reçoit dans `$value` la valeur du mode choisi, ou du défaut déclaré pour un axe absent du contexte ; `com.ucm.modes` et `com.ucm.axes` sont retirés ; la marque de version et tous les alias restent |
| `axesDuContrat(contrat, contratsParNom, cones)` | un contrat, les contrats du repository indexés par `name`, les cônes | les axes qui touchent ses références ou celles de ses dépendances, par `composes[].component`, en suivant la composition jusqu'au bout avec une garde de cycle |
`feuillesRacines(reference, index)` rejoint `tokens-dtcg.mjs`, qui définit déjà
la feuille et la référence : elle rend les feuilles terminales atteintes en
suivant les alias de `$value` et de chaque mode, avec une garde de cycle.

`axesDuContrat` relève les références par `collecterReferences` et
`sansEchantillon` (`references-token.mjs`), comme le contrôle du repository.

### 6.2. Règles

- Un axe déclaré dont une feuille du groupe n'a pas exactement les modes
  déclarés, ou dont `$value` n'égale pas la valeur du défaut, produit un constat.
  L'égalité se juge sur la valeur écrite : deux références différentes ne sont
  pas égales.
- Une feuille à modes hors de tout groupe déclaré, dans un document qui déclare
  au moins un axe, produit un constat. Dans un document sans déclaration, ses
  axes sont déduits par groupe de premier niveau.
- Le cône se calcule en une passe : graphe inverse des alias de tous les modes,
  puis parcours en largeur depuis les feuilles dont chaque axe est propriétaire.
  Coût linéaire dans le nombre de feuilles et d'alias.
- Un mode inconnu ou un axe inconnu dans un contexte est une erreur qui nomme
  l'axe et les modes admis. Un axe absent du contexte, et dont le défaut est
  inconnu, est une erreur.
- Les noms de modes sont lus dans des `Map` : un mode nommé `__proto__` ou
  `constructor` reste une donnée.

### 6.3. Tests

`packages/kit/tests/modes-tokens.test.mjs`, sur des documents synthétiques qui
ne reprennent aucun nom du corpus : deux axes croisés dans les deux sens, trois
modes, deux modes de même valeur, défaut qui n'est pas le premier mode, nom de
mode accentué, `__proto__`, cycle d'alias, feuille à modes hors déclaration,
contrat qui touche un axe par une dépendance de dépendance.

## 7. Noms : attribut, identité, configuration

**Résout** P5 pour la convention de nommage, et prépare le contrôle de P6.

### 7.1. Deux projections dans `format/names.ts`

| Fonction | Rend | Exemple |
|---|---|---|
| `attributDeMode(axe)` | `data-` suivi de la règle de `tokenCssVariable` appliquée au nom de l'axe | `data-color-brand-tokens` |
| `variableDIdentiteDeMode(axe)` | `tokenCssVariable("ucm-mode." + axe)` | `--ucm-mode-color-brand-tokens` |

`AGENTS.md` dit aujourd'hui qu'un nom de token se projette de trois façons, et
l'invariant nomme désormais aussi ces deux projections d'un nom d'axe.
`names.test.ts` couvre un nom accentué et deux axes projetés sur le même
attribut.

### 7.2. Section `modes` de `ucm.config.json`

```json
{
  "components": "src/components",
  "tokens": "src/tokens/tokens.json",
  "implementation": "{dir}/{id}.tsx",
  "modes": { "color-brand-tokens": "data-brand" }
}
```

- `modes` est facultatif. Un axe absent prend `attributDeMode(axe)`.
- Chaque valeur est un attribut `data-` en minuscules, lettres, chiffres et
  tirets. Deux axes sur le même attribut sont refusés.
- `format/configuration.ts` porte la grammaire, et `configuration.test.mjs` les
  refus. Le commentaire d'en-tête, « trois chemins », est mis à jour.
- Une clé qui ne nomme aucun axe du fichier de tokens est refusée par les
  commandes qui lisent les deux fichiers ; la grammaire seule ne le sait pas.

L'attribut seul est retenu. Un projet qui pose son thème par une classe CSS
reste hors de ce plan ; le déclencheur est une demande réelle.

## 8. `ucm tokens contexte`

**Résout** P1 pour une application qui fixe ses modes au build, sur toute
plateforme.

```sh
ucm tokens contexte color-brand-tokens=marque-2 --out build/tokens.marque-2.json
```

- Lit `ucm.config.json`, puis le fichier de tokens qu'il désigne.
- Appelle `documentDansLeContexte` et écrit le document, sérialisé comme
  `tokens.json`.
- Codes : 0 écrit ; 2 invocation fautive, configuration refusée, format de
  tokens `future` ou `invalide`, axe ou mode inconnu, défaut inconnu pour un axe
  absent.
- Le document produit se passe à l'outil habituel du consommateur, pour
  n'importe quelle plateforme. UCM n'y écrit aucun CSS.
- Tests : `packages/cli/tests/tokens.test.mjs`, sur un repository temporaire.

## 9. `ucm tokens css-modes`

**Résout** P1 et P2 sur le web, P3, et P6 par le contrôle de la section 9.5.

```sh
ucm tokens css-modes --base-css src/generated/tokens.css --out src/generated/modes.css
```

### 9.1. Entrées et préconditions

- Le fichier de tokens de la configuration, en état `courante` ou `ancienne`.
- Au moins un axe déclaré. Un fichier qui porte des feuilles à modes et aucune
  déclaration est refusé (code 2) : « tokens.json ne déclare pas ses axes ;
  réexportez les tokens avec un plugin qui les déclare. »
- La feuille de base, lue pour le contrôle des noms (section 9.5).
- La section `modes` de la configuration.

### 9.2. Règles émises

Notations : pour une feuille `f` et un mode `m` de son propriétaire,
`expr(f, m)` est la valeur de `f` dans `m` ; pour une feuille sans
propriétaire, `expr(f)` est sa `$value`. Un alias `{p}` s'écrit
`var(tokenCssVariable(p))`. Un littéral se convertit selon la section 9.4.

Pour chaque axe `a`, dans l'ordre de la déclaration :

1. **Identité par défaut** : `:root { variableDIdentiteDeMode(a): defaut(a); }`.
2. **Une règle par mode** `m` de `a`, défaut compris, sur le sélecteur
   `[attribut(a)="m"]`. Elle déclare l'identité `m`, puis chaque feuille `f` du
   cône de `a` dans l'ordre du document :
   - `expr(f, m)` si `a` est propriétaire de `f` ;
   - `expr(f, defaut(b))` si un autre axe `b` est propriétaire de `f` ;
   - `expr(f)` sinon.
3. **Croisement.** Pour chaque feuille `f` dont `b` est propriétaire et qui
   appartient au cône d'un autre axe `a`, et pour chaque mode `n` de `b` :
   `@scope ([attribut(b)="n"]) { :where(:scope, *)[attribut(a)] { f: expr(f, n); } }`.
   Les déclarations d'un même couple `(b, n)` partagent un bloc `@scope`.

Toutes les règles ont la spécificité `(0,1,0)`. Une règle `@scope` l'emporte
sur une règle sans portée de même spécificité, et la portée la plus proche
l'emporte entre deux portées : c'est ce qui rend la règle 3 juste quand un
élément porte les deux attributs, et quand deux portées du même axe s'emboîtent.
La feuille de modes se charge après la feuille de base.

Sortie attendue sur le corpus, sans croisement :

```css
/* Généré par ucm tokens css-modes depuis src/tokens/tokens.json. Relancer la commande plutôt que modifier ce fichier. */
:root { --ucm-mode-color-brand-tokens: intencial; }

[data-brand="intencial"] {
  --ucm-mode-color-brand-tokens: intencial;
  --color-brand-tokens-primary-default: var(--color-brands-intencial-primary-500);
  --components-button-colors-primary-contained-default-background: var(--color-brand-tokens-primary-default);
}

[data-brand="marque-2"] {
  --ucm-mode-color-brand-tokens: marque-2;
  --color-brand-tokens-primary-default: var(--color-brands-marque-2-primary-500);
  --components-button-colors-primary-contained-default-background: var(--color-brand-tokens-primary-default);
}
```

Chaque règle de mode déclare 61 propriétés sur le corpus : l'identité et les 60
feuilles du cône. L'extrait en montre trois.

### 9.3. Exemple de croisement

Document synthétique : `theme.blue` et `theme.red` ont les modes `light` et
`dark` ; `brand.primary` vaut `{theme.blue}` en `a` et `{theme.red}` en `b` ;
`button.bg` vaut `{brand.primary}`. Configuration : `theme` sur `data-theme`,
`brand` sur `data-brand`.

```css
[data-theme="dark"] {
  --theme-blue: …; --theme-red: …;
  --brand-primary: var(--theme-blue);   /* défaut de brand */
  --button-bg: var(--brand-primary);
}
@scope ([data-brand="b"]) {
  :where(:scope, *)[data-theme] { --brand-primary: var(--theme-red); }
}
```

Sous `<div data-brand="b"><section data-theme="dark"><button>`, la règle
`@scope` l'emporte sur la déclaration sans portée : `--brand-primary` vaut le
rouge sombre, et `--button-bg` se recalcule sur la section.

### 9.4. Littéraux de mode

| `$type` | Écriture CSS |
|---|---|
| `color` en `srgb` ou `display-p3` | `color(srgb r g b / alpha)`, composantes sans arrondi |
| `dimension` en `px` | `16px` |
| `duration` en `s` | `0.2s` |
| `cubicBezier` | `cubic-bezier(x1, y1, x2, y2)` |
| `number` | le nombre |
| `fontFamily`, `string`, `boolean`, `null`, ou toute autre forme | refus, code 1, qui nomme la feuille et le mode |

Le repli d'une famille est une décision du consommateur, que l'outil de sa
feuille de base porte déjà. Le corpus ne compte aucun littéral de mode.

### 9.5. Contrôles à la génération

Code 1 et aucune feuille écrite si l'un échoue :

- chaque variable que la feuille de modes déclare ou cite par `var()` est
  déclarée dans la feuille de base, sous le même nom ;
- aucune variable d'identité n'est déjà déclarée par la feuille de base ;
- aucune valeur de mode n'est un alias vers une feuille absente ;
- aucun constat de cohérence sur les axes à émettre (section 6.2).

Le premier contrôle tient P6 : une projection divergente chez le consommateur
arrête le build et nomme les variables manquantes. La lecture de la feuille de
base relève les déclarations `--nom:` ; elle ne résout pas le CSS.

Une feuille à modes hors de tout axe déclaré, dans un fichier qui en déclare,
est écartée avec un message sur la sortie d'erreur, code 0 : l'export a déjà
averti le designer (section 5.2), et le mode par défaut continue de se rendre.

### 9.6. Déterminisme et tests

La sortie ne dépend que des entrées : ordre du document, ordre des modes, aucune
date. Tests dans `packages/cli/tests/tokens.test.mjs` : corpus synthétique sans
croisement, croisement dans les deux sens, défaut non premier, littéraux de
chaque type, chaque refus de la section 9.5, projection divergente, attribut de
configuration, sortie identique sur deux exécutions.

Aucun navigateur n'est installé dans le dépôt : la justesse de la cascade se
prouve en recette (section 14), sur les arbres de la section 9.7.

### 9.7. Arbres de recette

| Arbre, du plus haut au plus bas | Attendu |
|---|---|
| aucun attribut | défaut de chaque axe |
| marque `b` sur `<html>` | `b` |
| `b`, puis `a` dans un sous-arbre | `a` dans le sous-arbre |
| `a`, puis `b`, puis `a` | `a` au niveau le plus bas |
| marque `b`, puis thème sombre | `b` sombre |
| thème sombre, puis marque `b` | `b` sombre |
| `b` et sombre sur le même élément | `b` sombre |
| `a`, puis `b`, puis thème clair | `b` clair |
| `b` sur un conteneur en `display: contents` | `b` |

Repris : Chrome 152 rend juste chacun de ces arbres avec cette stratégie. À
mesurer : Safari et Firefox. `@scope` est disponible dans Chrome 118, Safari
17.4 et Firefox 146.

## 10. La convention runtime

**Résout** P5 pour l'usage.

- **Poser.** Un attribut sur n'importe quel élément : `data-brand="marque-2"`.
  Le mode vaut pour ses descendants.
- **Revenir au défaut.** Poser le nom du défaut, `data-brand="intencial"`.
  Retirer l'attribut rend le mode hérité.
- **Lire le mode effectif.**
  `getComputedStyle(element).getPropertyValue("--ucm-mode-color-brand-tokens")`,
  défaut compris. À mesurer.
- **Rendu hors CSS** (canvas, graphique) : lire la valeur calculée de la
  variable sur l'élément, jamais `tokens.json`.
- **Choisir le mode** : l'application en décide (compte du client, déploiement,
  préférence persistée, rendu serveur).
- **Portail.** Poser l'attribut sur le conteneur du portail. **Shadow DOM.**
  Charger la feuille de modes dans la racine fantôme qui pose un mode. **Iframe.**
  Son document charge ses propres feuilles. Les trois sont à mesurer.

Un composant n'expose ni marque ni thème en prop, ne lit pas le mode pour
choisir une référence, et ne déclare aucune variable de token.

La correspondance avec `prefers-color-scheme` et `color-scheme` attend le
premier axe clair et sombre réel.

## 11. Le contrôle typographique sur tous les modes

**Résout** P7.

- `erreursTypesTypographiques` appelle `feuillesRacines` au lieu de
  `feuilleRacine`, et rend une erreur par feuille terminale dont le type n'est
  pas admis. L'erreur nomme le mode quand la branche fautive n'est pas celle de
  `$value`.
- Sévérité inchangée : le contrôle bloque.
- Test de régression dans `typography-token-types.test.mjs` : une référence dont
  `$value` aboutit à une `dimension` et un mode à un `number`. La loi est vue
  rouge sur l'ancienne fonction avant d'être crue.
- Le message du rapport suit la skill `rediger-diagnostics-ucm`.

## 12. Les modes fixés dans un composant

**Résout** P8, en deux temps.

### 12.1. Mesure (L6)

Un script en lecture seule relève, sur le fichier Figma du design system, les
calques de composants publiés dont `explicitVariableModes` n'est pas vide, en
distinguant la racine du composant ou du component set et les calques internes.
Il relève aussi les variables `BOOLEAN` et `STRING` à plusieurs modes liées à
`visible` ou à `characters`. Le script passe par le serveur MCP Figma si le
mainteneur l'autorise, sinon le mainteneur fait le relevé à la main.

### 12.2. Décision après mesure (L7, conditionnel)

| Endroit du mode | Traitement |
|---|---|
| page, section ou cadre qui contient le composant | jamais lu : c'est la présentation |
| racine du composant ou du component set | tranché sur les cas relevés |
| calque interne ou instance d'une dépendance | publié : `modes` sur le slot de la vue exacte, par exemple `{ "color-brand-tokens": "marque-2" }` |

Un avertissement seul est écarté : retirer le mode efface une intention, et le
garder ne rend le contrat ni plus juste ni plus portable. Aucun geste honnête
n'existe donc à nommer. La publication relève de la classe 2 (majeure) : un
lecteur qui ignore le champ rend une autre couleur. Elle ajoute une loi à
`packages/plugin/tests/lois.ts` : chaque clé de `modes` nomme un axe.

## 13. Skill publiée et `ucm guide`

**Résout** P9, P10, P11, et donne P12 à l'agent.

### 13.1. Deux skills

| Skill | Contenu | Domicile |
|---|---|---|
| `implementer-depuis-un-contrat` | les trois lois ; l'extraction ; la surface publique ; la matrice ; la vue exacte ; les règles de rendu ; les interdits ; les ancrages ; les modes | `packages/cli/skills/implementer-depuis-un-contrat/SKILL.md`, publiée : `files` de `@ucm-kit/cli` reçoit `skills` |
| `consommer-contrat` | le protocole de recette : composant jetable, fichier supprimé avant de commencer, aucun test, contrôles limités, rapport des manques ; renvoi à la précédente pour tout le reste | `.agents/skills/consommer-contrat/SKILL.md` |

- La skill publiée a un en-tête YAML valide, `name` et `description` sur deux
  lignes.
- Elle ne nomme ni `React`, ni `.tsx`, ni le Playground :
  `tests/registrePortableDocuments.test.ts` l'ajoute à `PORTABLES`.
- Elle ne contient aucun lien relatif vers ce dépôt, puisqu'elle est lue depuis
  `node_modules`.
- Chaque règle du format y porte son moyen de contrôle : `ucm check`,
  adaptateur, linter du projet, ou relecture. Une règle confiée à la relecture
  le dit.

### 13.2. Section sur les modes

1. Écrire la référence que le contrat publie, jamais une cible de sa chaîne
   d'alias : une cible peut n'exister que dans un mode. Contrôle : relecture.
2. Ne déclarer aucune variable de token dans un composant. Contrôle : linter du
   projet.
3. Ne pas lire un mode pour choisir une référence. Contrôle : relecture.
4. N'exposer ni marque ni thème en prop. Contrôle : relecture. La parité de
   l'adaptateur TypeScript (`ecartsDeParite`) relève les props du contrat
   absentes du code, jamais une prop du code absente du contrat.
5. Pour un rendu hors CSS, lire la valeur calculée sur l'élément. Contrôle :
   relecture.
6. Vérifier le rendu dans chaque contexte que `ucm guide` donne pour le
   composant. Contrôle : relecture.

### 13.3. Ancrages

Les sept de la skill actuelle, plus quatre :

| Ancrage | Réponse attendue du repository |
|---|---|
| attribut de chaque axe | section `modes` de `ucm.config.json`, lue par les outils |
| chargement des feuilles | où la feuille de modes est importée, après la feuille de base |
| placement d'un sous-arbre dans un mode | le moyen de l'application (attribut posé directement, composant conteneur) |
| choix du mode de l'application | la source : compte, déploiement, préférence |

Les réponses autres que l'attribut vivent dans le document de conventions du
repository. Préférences de goût et gabarits n'y ont aucune structure UCM : un
gabarit copié dans chaque composant est admis, un helper partagé qui lit le
contrat au runtime ne l'est pas (`CONCEPT.md`, section 3).

### 13.4. `ucm guide [contrat]`

Sans argument, la commande imprime :

- le chemin de la skill publiée, dans le paquet installé ;
- les axes du fichier de tokens, leurs modes, leur défaut, leur attribut, et la
  source de la déclaration ;
- la mise en place des modes : dépendance, commande de build, import, section de
  configuration, avec la version du paquet qui s'exécute ;
- les ancrages, avec la réponse de la configuration pour l'attribut.

Avec le chemin d'un contrat, elle ajoute :

- ses dépendances, composition suivie jusqu'au bout ;
- les axes qui le touchent (`axesDuContrat`) et les contextes à vérifier : le
  produit des modes de ces seuls axes ;
- les icônes que le contrat réclame, par la même lecture qu'`ucm icons`.

La commande énumère ce qu'il y a à faire, jamais ce qui est fait. Codes : 0 ; 2
pour une configuration refusée, un contrat illisible ou absent. Tests dans
`packages/cli/tests/guide.test.mjs` sur un repository temporaire avec deux
contrats, dont l'un compose l'autre.

`ucm init` affiche à la fin de l'installation la ligne à ajouter au document de
conventions du repository : « Avant d'implémenter un composant, lancer
`ucm guide <chemin du contrat>` et suivre la skill qu'il désigne. » La commande
n'écrit pas dans ce document.

### 13.5. Ce qui se met à jour avec la scission

`AGENTS.md` (paragraphe de la skill et carte du code), `ROADMAP.md`,
`docs/RECETTE.md`, `docs/notes/PISTES-EVOLUTION.md`, `packages/cli/README.md`.
Côté Playground : `README.md`, qui désigne la skill dans `node_modules`, et
`AGENTS.md`.

## 14. Recette dans le Playground

Préalables : paquets publiés (L1 à L4), plugin publié sur la Community, tokens
réexportés.

**Mise en place, depuis les paquets seuls :**

1. `@ucm-kit/cli` en `devDependencies`, version exacte, identique au pin du
   workflow.
2. `ucm.config.json` : `"modes": { "color-brand-tokens": "data-brand" }`.
3. Script `build` : `ucm tokens css-modes --base-css src/generated/tokens.css
   --out src/generated/modes.css` après Style Dictionary.
4. `src/index.css` : import de `modes.css` après `tokens.css`.
5. `AGENTS.md`, règle 4 reformulée : l'empreinte du produit se limite aux
   fichiers qu'`ucm init` écrit et à la mise en place que les paquets publiés
   documentent.

**Épreuves :**

1. `npm run build` passe, et `modes.css` contient deux règles de 61
   déclarations.
2. Galerie : une bascule de marque sur `<html>`, une case qui place `Alert` en
   `marque-2` dans une page `intencial`, puis l'imbrication inverse. Mesure de
   la couleur calculée du fond du bouton dans chaque case.
3. Une page statique jetable, hors dépôt, rejoue les arbres de la section 9.7
   sur un document à deux axes produit par la commande, dans Chrome, Safari et
   Firefox.
4. Reconstruction à froid de `Button` avec la seule sortie de `ucm guide` et la
   skill du paquet, sans accès à `UCM-Exporter`. Comparaison à Figma dans les
   deux marques, le mode fixé sur le cadre de comparaison.
5. `ucm tokens contexte color-brand-tokens=marque-2` passé à Style Dictionary :
   la feuille produite ne contient que des valeurs `marque-2` pour l'axe.
6. Faute volontaire : une variable renommée dans la feuille de base fait
   échouer le build et nomme la variable ; restauration par copie.

Les `.tsx` du Playground ne changent qu'au geste 4, par la reconstruction.

## 15. Lots

Règles communes à tous les lots :

- une loi ou un contrôle ajouté est vu rouge sur une source volontairement
  cassée, puis vert après restauration par copie, et le commit le dit ;
- aucun test ne cite un nom de composant du corpus ;
- tout bug corrigé reçoit un test de régression ;
- `npm test`, `npm run typecheck` et `npm run build` passent avant le commit ;
  si une autre session travaille dans la même copie, la vérification se fait
  dans un worktree extrait de l'index ;
- commit par chemins explicites, puis poussée sur `main` ;
- un paquet dont le contenu publié change monte son numéro, et l'agent le
  publie : kit, puis CLI, puis adaptateur.

| Lot | Contenu | Problèmes | Dépend de | Preuve de sortie |
|---|---|---|---|---|
| L1 | Kit : `EXTENSION_AXES_TOKENS` et types ; `modes-tokens.mjs` ; `attributDeMode` et `variableDIdentiteDeMode` ; section `modes` de la configuration ; contrôle typographique sur tous les modes | P2, P4, P5, P7, P12 | rien | tests de la section 6.3, `names.test.ts`, `configuration.test.mjs`, régression de la section 11 vue rouge |
| L2 | Plugin : déclaration des axes et cas écartés ; classe 12 ; `FORMAT.md`, `SPEC.md`, `CHANGELOG-FORMAT.md`, `AGENTS.md` | P4 | L1 | tests de la section 5.5 ; publication Community par le mainteneur ; réexport des tokens |
| L3 | CLI : `ucm tokens contexte` et `ucm tokens css-modes` | P1, P2, P3, P6 | L1 | tests des sections 8 et 9.6 ; chaque refus de 9.5 vu rouge |
| L4 | Skill publiée, `consommer-contrat` réduite, `ucm guide`, ligne d'`ucm init`, documents de la section 13.5 | P9, P10, P11, P12 | L1 ; L3 pour la mise en place décrite | `guide.test.mjs` ; `registrePortableDocuments.test.ts` couvre la skill ; le paquet empaqueté (`npm pack`) contient `skills/` |
| L5 | Recette Playground | tous sauf P8 | L2 publié et réexporté, L3, L4 publiés | épreuves de la section 14 |
| L6 | Mesure des modes explicites et des variables `BOOLEAN` et `STRING` à modes | P8 | rien | relevé écrit dans cette note |
| L7 | Conditionnel : champ `modes` du contrat | P8 | L6 | loi de forme vue rouge ; recette sur un composant de test |

L2 et L3 avancent en parallèle après L1. L4 peut commencer par la scission, qui
ne dépend de rien.

## 16. Risques et mesures restantes

| Risque | Statut | Parade |
|---|---|---|
| La cascade `@scope` diffère dans Safari ou Firefox | à mesurer | épreuve 3 de la section 14 avant d'annoncer l'imbrication |
| Style Dictionary lit mal un objet imbriqué sous `$extensions` à la racine | à mesurer | `styleDictionary.test.ts` de L2 |
| La variable d'identité ne se lit pas par `getComputedStyle` | à mesurer | épreuve 2 ; la détection par `closest` reste disponible |
| Coût de rendu d'un grand nombre de règles `@scope` | à mesurer | les règles de croisement ne portent que sur les feuilles dont un axe est propriétaire et qui appartiennent au cône d'un autre |
| Deux pins de la CLI dans le Playground (dépendance et workflow) | accepté | la montée de version touche les deux dans le même commit, comme aujourd'hui pour le workflow |
| Le type DTCG d'une `FLOAT` se décide sur l'alias du mode par défaut (`resolveRoot`) | connu | sans effet sur la feuille de modes, qui écrit des `var()` ; la section 11 couvre la typographie |
| Collections étendues (plan Enterprise) | hors plan | le moteur ne lit pas `valuesByModeForCollectionAsync` ; déclencheur : un fichier réel qui en emploie |

## 17. Points que la revue doit attaquer

1. **Déclaration à la racine sans montée de version.** La classe 12 est-elle
   juste, et un lecteur existant peut-il mal lire un fichier qui porte la
   déclaration ?
2. **L'algorithme de la section 9.2.** Existe-t-il un arbre, un croisement à
   trois axes ou une chaîne d'alias pour lesquels les règles 2 et 3 rendent une
   valeur fausse ?
3. **Le refus d'un fichier sans déclaration** par `css-modes`, plutôt qu'un
   défaut deviné. Bloque-t-il un cas légitime ?
4. **La place du modèle** dans `@ucm-kit/core/lecteurs` plutôt que dans
   `@ucm-kit/core/format`. Un client navigateur en a-t-il besoin ?
5. **La skill dans `@ucm-kit/cli`** plutôt que dans `@ucm-kit/core`. Un
   repository qui n'installe que le kit en est-il privé à tort ?
6. **Le contrôle des noms par lecture de la feuille de base.** Une feuille de
   base produite autrement (plusieurs fichiers, sélecteur autre que `:root`,
   variables filtrées) le fait-elle échouer à tort ou passer à tort ?
7. **Les cas écartés de la section 5.2.** En manque-t-il un, et chaque message
   nomme-t-il un geste réel ?

## 18. Hors périmètre

| Sujet | Déclencheur |
|---|---|
| Document de résolution DTCG `2025.10` | un outil du consommateur qui l'exige ; il se dérive de la déclaration d'axes |
| Contraintes ou profils entre modes | une contrainte que le design system, et non l'application, doit porter |
| Sélecteur de classe pour un axe | une demande réelle |
| Correspondance avec `prefers-color-scheme` et `color-scheme` | le premier axe clair et sombre réel |
| Bibliothèque runtime par framework | un besoin qui dépasse la pose d'un attribut |
| Contrôles de code (référence qui fige un mode, variable de token déclarée dans un composant) | un relevé des références dans le code par l'adaptateur |
| Capture et contraste par contexte | la conformité du rendu (`PLAN-CONFORMITE-RENDU.md`) |
| Gabarits générés depuis le contrat | un consommateur de production dont les erreurs de transcription sont mesurées |
| Contour en couleurs forcées, où `box-shadow` vaut `none` | à ouvrir dans les pistes du format ; il porte sur `rendering.roles` |

Le diff sémantique, `PLAN-DIFF-SEMANTIQUE.md`, reçoit quatre cas : mode
renommé, ajouté ou retiré ; défaut changé ; déclaration d'axe retirée ; cible
d'alias changée dans un seul mode.
