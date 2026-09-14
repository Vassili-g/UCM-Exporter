# Plan final : modes de tokens et aides à l'implémentation

Plan d'implémentation, seul plan sur ces deux sujets. Il a jugé quatre notes
qui ont quitté le dépôt : le plan précédent, appelé ici « plan courant », son
analyse critique, la revue de cette analyse et le plan alternatif. Leurs
dernières versions sont dans le commit `7226eee`. L'annexe A recopie ce que ce
plan reprend du plan courant. Une revue indépendante de ce plan a été intégrée ;
la section 10 dit comment.

Trois statuts qualifient les faits : **mesuré** (relevé dans le code, les
fichiers ou une norme citée), **repris** (mesuré par une note antérieure, non
réexécuté), **à mesurer**.

## 1. Les documents revus

### 1.1. Quelle version a été jugée

| Document | Empreinte SHA-256, en LF | Ce qu'il juge |
|---|---|---|
| `PLAN-MODES-TOKENS.md`, copie de travail | `928AA2D4…AC77E` | les besoins |
| `ANALYSE-CRITIQUE-MODES-TOKENS.md` | `B95E6D58…60D2E` | le plan, dans la version `928AA2D4…` |
| `REVUE-INDEPENDANTE-ANALYSE-MODES-TOKENS.md` | | l'analyse, dans les versions `7D936DEA…` puis `72CA02E3…` |

Mesuré : la copie de travail du plan est la version que l'analyse a jugée. La
revue indépendante n'a pas lu le plan : elle juge l'analyse. L'analyse a encore
changé après la clôture de la revue.

### 1.2. Le plan courant

Ce qu'il fait bien :

- Il énonce quinze problèmes, chacun avec sa preuve, avant toute solution.
- L'algorithme CSS factorisé (cône, règle commune, croisements par `@scope`,
  spécificité uniforme) tient l'imbrication. Sept arbres déroulés à la main, dont
  deux attributs sur le même élément et deux marques imbriquées, donnent la bonne
  valeur : la règle `@scope` du mode le plus proche l'emporte par la proximité,
  qui départage après la spécificité
  ([CSS Cascade 6](https://www.w3.org/TR/css-cascade-6/#cascade-sort)). La preuve
  dans les navigateurs reste à faire.
- La séparation du sens d'une aide et de son écriture répond à la demande de
  personnalisation sans fork.
- `ucm guide` vise le nombre de tours, qui est le coût mesuré d'une
  reconstruction (66 tours, sortie à 3,7 % du trafic facturé).
- La loi qui refuse un champ du schéma sans aide garde le catalogue à jour
  mécaniquement.

Ses défauts, par ordre de gravité :

1. **Le Resolver DTCG coûte plus qu'il ne rapporte, et il perd un besoin.** Le
   schéma du module ne connaît ni `string` ni `boolean`, et refuse
   `$value: null` ; le plan sort ces feuilles du résolveur (section 7.2). Une
   famille de police propre à chaque marque, restée `string` faute de scope
   `FONT_FAMILY`, n'est alors plus générée. Le besoin « instances de marques »
   perd sa typographie. Le choix duplique en plus chaque valeur de mode dans deux
   fichiers, ce qui oblige à contrôler leur accord mode par mode (analyse 3.3),
   à changer la publication GitHub en commit à deux fichiers par l'API Git Data,
   et à figer un schéma tiers dans le kit. Le gain, la lecture par un outil tiers,
   ne sert aucun consommateur : UCM n'en a pas d'externe, et Style Dictionary 5 ne
   lit pas le résolveur.
2. **Deux affirmations sur la norme sont fausses.** Mesuré dans [le module
   Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/) : les
   modifiers peuvent être orthogonaux sans y être tenus, un recouvrement se
   tranche par l'ordre, et le module ne pose aucune exigence de type entre
   contextes. L'orthogonalité et les jetons synthétiques sont donc un choix d'UCM
   pour son CSS, pas une contrainte de la norme.
3. **La correction de `ring` ajoute un champ sans nécessité et le classe mal.** Le
   plan annonce une « classe 13, version mineure ». [COMPATIBILITE.md](../COMPATIBILITE.md)
   ne connaît que onze classes, et un champ dont l'absence laisse un lecteur
   précédent s'écarter de la maquette relève de la classe 2, en majeure. La
   section 5.2 corrige le rendu sans toucher au contrat.
4. **Un axe perdu devient un succès silencieux.** Sans résolveur, `ucm tokens css`
   écrit la base seule et rend 0, même quand `tokens.json` porte des feuilles à
   modes (analyse 3.4). Sans fichier de tokens, elle écrit une feuille vide et
   rend 0, même quand des contrats citent des tokens.
5. **Le guide s'appelle lui-même.** La sortie de `ucm guide` commence par le
   `SKILL.md`, dont la première consigne est de lancer `ucm guide`.
6. **Les contextes à vérifier explosent.** Le produit des modes de 500 marques
   et de deux thèmes donne 1 000 contextes pour un seul composant, alors qu'un
   composant qui ne lit pas le mode rend la même chose dans chacun.
7. **La personnalisation passe par un en-tête YAML** (`defauts`, `controles`),
   que la CLI, qui ne dépend que du kit, devrait analyser sans bibliothèque.
8. **La mise en place reste en partie manuelle sans que la commande le dise** :
   dépendance, script de build et import CSS ne sont imprimés par aucune
   commande.
9. **Le document fait 1 378 lignes.** Un agent d'implémentation en relit
   l'essentiel à chaque tour.

### 1.3. L'analyse critique

Retenu : le recouvrement admis par la norme (3.1), l'axe perdu (3.4), la preuve
Enterprise limitée à une simulation (3.5), la règle de cycle par contexte (3.7),
la personnalisation qui ne prouve rien (3.9), le guide récursif (3.11), le
dialecte UCM face au schéma (3.13), les couleurs forcées.

Écarté :

- **Lot C, `ucm tokens contexte`.** Aucun consommateur ne fixe sa marque au build
  ni ne vise une autre plateforme que le web. La commande reste hors périmètre,
  avec son déclencheur.
- **Épreuves à 200 puis 1 000 marques et 24 ordres pour quatre axes.** Une mesure
  de taille sur un fichier synthétique de 500 marques suffit à décider (lot L0).
- **Archive d'aides pour un repository sans Node, lot H de plusieurs cibles,
  sélection de conventions par dossier comme lot à part.** Hors périmètre, sauf
  la lecture du fichier de conventions le plus proche (section 6.3), qui coûte
  une boucle.
- **Classement de `ring` en changement de format** (3.10). La section 5.2 ne
  change aucun champ.
- **Objection au modèle de coût** (3.11). La mesure préalable du lot L5 la
  tranche avant de construire `ucm guide`.

### 1.4. La revue indépendante

Juste :

- Point 1 : séparer contenu indicatif et obligation normative applique
  l'invariant de `samples`.
- Point 2 : le Resolver ne rend pas le dialecte UCM.
- Point 4 : un défaut commun à deux axes synchronisés est un choix, pas une
  nécessité.
- Point 6 : une seule cible et un seul exemple d'abord.

Ce qu'elle manque :

- Le point 3, les portails, figure déjà dans le plan courant (section 11). La
  revue ne l'a pas vu parce qu'elle n'a pas lu le plan.
- Son point 2 constate la faille du Resolver sans remettre en cause le choix du
  Resolver. C'est pourtant la conclusion que la faille impose.
- Le point 5 accepte que l'analyse ajoute `ucm tokens contexte` au premier lot,
  ce qui étend le périmètre sans consommateur.
- La clôture (section 8) ne vérifie ni le classement de `ring` ni l'objection au
  modèle de coût, que l'analyse affirme sans mesure.

## 2. Besoins et solutions retenues

| Besoin | Solution retenue | Section |
|---|---|---|
| des modes dans un fichier de tokens | `tokens.json` reste l'unique fichier ; la racine déclare les axes et chaque feuille à modes nomme son axe | 3 |
| beaucoup de modes, imbriqués, sur plusieurs collections | un axe par collection, un axe d'extension pour les marques d'une collection étendue, une feuille CSS factorisée par cône avec croisements `@scope`, dont la taille suit le nombre de surcharges | 3, 4 |
| règles concrètes pour l'agent (`ring`, `box-shadow`…) | un catalogue d'aides : sens fixé par UCM, écriture par défaut, preuve attendue | 6.1, 6.2 |
| les personnaliser facilement | une section `## <aide>` dans `.ucm/conventions.md` ; `ucm aides <aide> --personnaliser` l'ajoute avec l'écriture par défaut à éditer | 6.3 |
| une skill efficace et économe | un relais de trois lignes et `ucm guide <contrat>`, qui imprime en une commande procédure, extraction et seules aides employées ; l'extraction n'est gardée que si la mesure préalable le justifie | 6.4, 6.5, 6.8 |
| préférences de stack personnalisables | le texte libre en tête de `.ucm/conventions.md` ; le fichier le plus proche du contrat s'applique | 6.3 |
| gabarits pour une architecture homogène | un composant d'exemple et son contrat, publiés par l'adaptateur de stack, copiés dans `.ucm/gabarits/` ; ou un composant du repository désigné dans les conventions | 6.6 |
| tout installer facilement | `ucm init` écrit aussi relais, conventions et gabarit, puis imprime les lignes restantes à ajouter | 6.7 |

## 3. Les modes dans `tokens.json`

### 3.1. Forme

```json
{
  "$extensions": {
    "com.ucm.formatVersion": 2,
    "com.ucm.axes": {
      "color-brand-tokens": { "modes": ["marque1", "marque-2"], "default": "marque1" },
      "theme": { "modes": ["light", "dark"], "default": "light" }
    }
  },
  "color-brand-tokens": {
    "primary": {
      "default": {
        "$type": "color",
        "$value": "{color-brands.marque1.primary.500}",
        "$extensions": {
          "com.ucm.axis": "color-brand-tokens",
          "com.ucm.modes": {
            "marque1": "{color-brands.marque1.primary.500}",
            "marque-2": "{color-brands.marque-2.primary.500}"
          }
        }
      }
    }
  }
}
```

Règles :

- `com.ucm.axes` est écrit à la racine, après `com.ucm.formatVersion`, **dès
  qu'une feuille porte `com.ucm.modes`**, et vaut `{}` quand l'export a écarté
  tous les axes. Un groupe ne porte aucune métadonnée (`GroupeDeTokens`,
  `conformiteDtcg.test.ts`) ; une feuille le peut.
- La clé d'un axe est le préfixe que `joinTokenPath` écrit pour la collection.
  `prefixeDeCollection`, extrait de `joinTokenPath`, le calcule pour les deux
  usages.
- `modes` suit l'ordre de `collection.modes`, sous les noms normalisés.
  `default` est le nom normalisé de `defaultModeId`. Aucun lecteur ne déduit le
  défaut de l'ordre.
- `com.ucm.axis` désigne le propriétaire de la feuille. `joinTokenPath` n'ajoute
  pas le préfixe quand la variable le porte déjà (`variables.ts`) : le premier
  segment d'un chemin ne suffit donc pas à désigner la collection.
- `com.ucm.modes` ne change pas : une valeur par mode, de la forme de `$value`, un
  alias reste une référence. Les types `string`, `boolean` et les `null` du
  dialecte y restent.
- `TOKENS_FORMAT_VERSION` ne monte pas : aucune forme de valeur ne change, et
  `etatDuFormatDeTokens` ne lit que `com.ucm.formatVersion`. Un lecteur publié
  ignore les deux extensions.

Changements induits, à faire dans le même lot :

- `conformiteDtcg.test.ts` compare `tokens.$extensions` par égalité stricte à la
  seule marque : le test admet `com.ucm.axes` et garde la marque en tête.
- `format/tokens.ts` : `ExtensionsDuDocument` et le `$extensions` d'une feuille
  reçoivent les nouvelles clés.
- `docs/COMPATIBILITE.md` : classe 12, « ajout d'une extension facultative à
  `tokens.json` », migrée par personne ; le titre « Les onze classes » suit.

États qu'un lecteur distingue sans second fichier :

| État | Signe | Conséquence pour la génération |
|---|---|---|
| fichier sans mode | aucune feuille ne porte `com.ucm.modes` | base seule, code 0 |
| export antérieur aux axes | des feuilles portent `com.ucm.modes`, la racine ne porte pas `com.ucm.axes` | refus, code 1 : « réexporter les tokens depuis Figma » ; `--sans-modes` écrit la base et le dit |
| axe écarté par l'export | une feuille porte `com.ucm.modes` sans `com.ucm.axis` | refus, code 1, qui nomme la feuille et renvoie au constat de l'export ; même option |
| incohérent | `com.ucm.axis` nomme un axe absent de la racine, ou les clés de `com.ucm.modes` diffèrent des `modes` déclarés | refus, code 1, sans option |
| complet | chaque feuille à modes a un axe déclaré et ses modes | génération |

### 3.2. Pourquoi pas le Resolver DTCG

| Critère | Resolver à côté de `tokens.json` | Extension dans `tokens.json` |
|---|---|---|
| valeurs de mode écrites | deux fois | une fois |
| contrôle d'accord entre fichiers | mode par mode, feuille par feuille | aucun |
| feuilles `string`, `boolean`, `null` | hors du résolveur, donc hors génération | générées |
| publication GitHub | commit à deux fichiers par l'API Git Data, immobilité sur la paire | inchangée |
| schéma tiers figé dans le kit | oui | non |
| lecture par un outil tiers | lecteurs du module Resolver | aucune |

Le kit peut dériver un résolveur de `tokens.json` le jour où un outil l'exige :
`axesDeTokens` porte déjà l'information. Ce dérivé est hors périmètre
(section 9).

### 3.3. Collections étendues

Mesuré dans [ExtendedVariableCollection](https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/) :
Enterprise seulement, `parentVariableCollectionId`, `rootVariableCollectionId`,
`modes[].parentModeId`, `variableOverrides` indexé par identifiant de variable
puis par identifiant de mode de l'extension. La page ne dit pas si une extension
peut étendre une collection de bibliothèque.

Forme :

```json
"com.ucm.axes": {
  "color": {
    "modes": ["light", "dark"],
    "default": "light",
    "extensions": { "marque-b": { "parent": "base" }, "sous-marque": { "parent": "marque-b" } }
  }
}
```

et sur une feuille surchargée, à côté de `com.ucm.modes` qui garde les valeurs
de la collection :

```json
"com.ucm.extensions": { "marque-b": { "dark": "{palette.bleu-nuit}" } }
```

- **`base` nomme la collection elle-même** dans l'axe d'extension, et un nom
  d'extension `base` est écarté sous constat. Deux collections étendues par les
  mêmes marques ont ainsi le même ensemble de contextes et partagent un attribut
  (section 4.2).
- Une surcharge est creuse : seuls les couples extension et mode surchargés sont
  écrits.
- La valeur effective d'une extension `e` dans le mode `m` est la première
  surcharge trouvée en remontant `e`, son parent, jusqu'à `base`, puis
  `com.ucm.modes[m]`. Elle reste un alias quand la surcharge en est un. L'export
  remonte `parentModeId` jusqu'à la collection racine pour nommer `m`.
- Un nom d'extension tient en un segment, `/` devenant `-`. Deux extensions de
  même nom normalisé sont écartées sous constat.
- `etatDesTokensDuFichier` et `modeCollisionWarnings` ne comptent qu'une fois une
  variable héritée.
- **À mesurer** : les clés que rend `valuesByModeForCollectionAsync`, et la
  parente venue d'une bibliothèque. Sans fichier Enterprise réel, le support est
  publié comme expérimental dans `docs/FORMAT.md`, prouvé sur simulation.

Le générateur CSS fabrique les variables intermédiaires (section 4.3). Le format
reste la description fidèle de Figma et ne porte aucun jeton synthétique.

### 3.4. Constats de l'export

Rédigés avec la skill `rediger-diagnostics-ucm`. Un axe écarté garde
`com.ucm.modes` sur ses feuilles et n'y écrit pas `com.ucm.axis`.

| Cas | Traitement |
|---|---|
| deux collections à modes ont le même préfixe | écarter les deux axes ; renommer une collection |
| préfixe vide | écarter l'axe ; renommer la collection |
| nom de mode normalisé vide ou en collision | écarter l'axe ; constat de collision existant |
| `defaultModeId` absent des modes | écarter l'axe |
| dans un mode, un alias vise une feuille d'un autre `$type` | garder l'axe ; nommer variable, mode et cible ; lier une variable du même type |
| extensions homonymes, ou extension nommée `base` | écarter les extensions ; renommer |
| parente d'extension venue d'une bibliothèque | écarter les extensions ; constat « parente distante » |

### 3.5. Type d'un alias dans chaque mode

Repris du plan courant, section 12. Une cible d'alias porte le `$type` de la
feuille qui la cite dans tous les modes. L'export le constate ; la génération
refuse ; `typography-token-types.mjs` refuse une référence typographique dont la
chaîne traverse une feuille en écart. Le parcours de `$value` reste alors exact.

Ce refus change le verdict de `ucm check` sur un fichier inchangé : classe 6 de
`COMPATIBILITE.md`, écrite dans `CHANGELOG-FORMAT.md` et le README du kit. Mesuré :
le `tokens.json` du Playground ne présente aucun écart.

## 4. La feuille CSS des tokens

### 4.1. Modèle du kit

`packages/kit/src/lecteurs/modes-tokens.mjs`, exporté par
`@ucm-kit/core/lecteurs`, sans CSS :

| Fonction | Rend |
|---|---|
| `axesDeTokens(document)` | `{ etat, axes: [{ nom, modes, defaut, extensions, feuilles }], constats }` ; `etat` suit la table de 3.1 |
| `valeurDansLeContexte(document, chemin, contexte)` | la valeur de la feuille, alias conservés, chaîne d'extensions comprise |
| `conesDesAxes(document, axes)` | `Map<chemin, Set<axe>>` ; graphe inverse des alias de `$value`, des modes et des surcharges, construit une fois ; `O(A × (V + E))` |
| `cyclesActifs(document, axes)` | la liste des cycles actifs, ou un refus d'analyse (section 4.3) |
| `axesDuContrat(contrat, contratsParNom, cones)` | les axes qui touchent le contrat, composition transitive comprise ; dépendance absente ou ambiguë empêche de conclure |
| `contextesDeVerification(axesTouches, croisements)` | la liste de 4.5 |

`format/names.ts` reçoit `attributDeMode(axe)` : `data-` suivi de
`tokenCssVariable(axe)` sans ses deux tirets. L'invariant de `AGENTS.md` sur les
projections de nom la cite.

### 4.2. Configuration

```json
{
  "components": "src/components",
  "tokens": "src/tokens/tokens.json",
  "implementation": "{dir}/{id}.tsx",
  "modes": { "color-brand-tokens": "data-brand" },
  "css": { "fontFamilyFallback": "sans-serif" }
}
```

Règles en annexe A.1, avec une correction : deux axes partagent un
attribut si leurs ensembles de modes sont égaux, même quand leurs défauts
diffèrent. Sans attribut, chaque axe garde son défaut ; `ucm tokens css` et
`ucm guide` l'impriment. Deux ensembles différents sur un attribut sont refusés.
Une CLI antérieure ignore les deux sections.

### 4.3. `ucm tokens css --out <fichier>`

Algorithme des annexes A.2 à A.4 : base sur `:root`, puis
pour chaque axe une règle par mode sur les feuilles possédées, une règle commune
`:is(…)` sur le reste du cône, et les croisements
`@scope ([attr(b)="n"]) { :where(:scope, :scope *):is(…) { … } }`. Spécificité
`(0,1,0)` partout, fichier hors couche, sans `!important`. Les axes suivent
l'ordre de `com.ucm.axes`.

Changements :

- Le propriétaire d'une feuille est `com.ucm.axis`.
- Les littéraux de la table 10.4 couvrent `string` et `boolean`, puisque ces
  feuilles restent générées.
- **Axe d'extension.** Une collection à extensions produit l'axe
  `<axe>-extensions`, placé juste après son axe parent. Ses contextes sont `base`
  et les extensions ; son défaut est `base`.
  - Pour chaque feuille surchargée `f`, l'intermédiaire `--ucm-x-base--<f>`
    appartient à l'axe parent et vaut `com.ucm.modes[m]` dans chaque mode.
  - Pour chaque couple `(e, f)` où `e` surcharge `f` dans au moins un mode,
    l'intermédiaire `--ucm-x-<e>--<f>` appartient à l'axe parent. Dans le mode
    `m`, il vaut la surcharge de `e` si elle existe, sinon `var()` de
    l'intermédiaire de l'ancêtre surchargeant le plus proche, ou de `base`.
  - `f` appartient à l'axe d'extension. Une **règle de repli** unique,
    `:is([E="base"], [E="e1"], …)`, déclare chaque `f` à
    `var(--ucm-x-base--<f>)`. Elle précède les règles propres.
  - La **règle propre** d'un contexte `e` déclare seulement les `f` que `e` ou un
    de ses ancêtres surcharge, à `var()` de l'intermédiaire le plus proche dans sa
    chaîne. À même racine, l'ordre du fichier fait gagner la règle propre.
  - Les croisements suivent le même schéma : un bloc de repli
    `@scope (:is([E="base"], …))`, puis les blocs propres.
  - Le double tiret sépare `e` de `f` sans collision : `tokenCssVariable` réduit
    toute suite de séparateurs à un tiret. Un token dont la projection commence
    par `--ucm-x-` est refusé.
  - Les cônes se calculent sur le graphe qui contient les intermédiaires.
  - Taille : de l'ordre des contextes, plus les feuilles surchargées, plus les
    surcharges multipliées par la profondeur et par le nombre de modes. Elle ne
    dépend pas du produit des marques et des feuilles surchargées.
- **Refus.** Code 1, sortie conservée :
  - état « export antérieur » ou « axe écarté » sans `--sans-modes` ;
  - état « incohérent » ;
  - fichier de tokens absent alors qu'un contrat du repository cite une
    référence ;
  - collision de noms CSS ;
  - alias vers une feuille absente ;
  - cycle actif ou analyse de cycles interrompue ;
  - écart de type entre modes.
- **Sans fichier de tokens et sans référence dans les contrats**, la commande
  écrit une feuille vide commentée et rend 0.
- **Cycles.** Le graphe réunit les alias de tous les modes, des surcharges et des
  intermédiaires. Chaque arête porte sa condition : un mode d'un axe, ou aucune
  pour une feuille sans propriétaire. Un parcours de Tarjan isole les composantes
  fortement connexes ; sans composante, il n'y a aucun cycle, en `O(V + E)`. Dans
  une composante, les cycles élémentaires sont énumérés, et un cycle est actif si
  ses conditions ne demandent jamais deux modes du même axe. Au-delà de 10 000
  cycles énumérés, l'analyse s'arrête sur un refus qui le dit.
- La commande imprime règles, déclarations et octets.

### 4.4. Preuve de cascade

Harnais conservé dans `packages/cli/tests/cascade/`. Il charge le CSS émis dans
Chromium, Firefox et WebKit par Playwright, et compare chaque valeur calculée à
l'oracle `valeurDansLeContexte` appliqué au contexte effectif de l'élément.
Playwright est une `devDependencies` de la racine du monorepo : dans le
manifeste de la CLI, il imposerait une montée de version sans changer le paquet
publié. Le harnais se lance par `npm run cascade`, hors de `npm test`, et un job
de `ci.yml` installe les trois moteurs pour le lancer.

Il couvre les arbres de l'annexe A.5 et les sept arbres d'extension ci-dessous,
dont l'axe à trois générations. Document : collection `color` en `light` et
`dark`, défaut `light` ; extensions `marque-b` (parente `base`) et `sous-marque`
(parente `marque-b`) ; axe `densite` en `confort` et `compact`, dont les
feuilles citent des feuilles de `color`.

| Arbre, du plus haut au plus bas | Attendu |
|---|---|
| aucun attribut | `base` en `light` |
| `marque-b` sur `<html>`, puis `dark` | la surcharge de `marque-b` en `dark` |
| `dark` sur `<html>`, puis `sous-marque` | `sous-marque` en `dark` ; une feuille qu'elle ne surcharge pas prend la valeur de `marque-b` |
| `sous-marque` et `dark` sur le même élément | `sous-marque` en `dark` |
| `marque-b`, puis `sous-marque`, puis `base` | `base` au niveau le plus bas |
| `sous-marque` sur `<html>`, puis `compact` | la feuille de `densite` rend la valeur de `sous-marque` à travers son alias |
| `f2` cite `f1`, surchargées par `marque-b` dans deux modes différents | la valeur de chaque contexte, `marque-b` et `sous-marque` en `light` et en `dark` |

Safari réel est rejoué par le mainteneur à la recette ; WebKit ne le remplace
pas. Si `@scope` échoue, le repli par `@container style()` de l'annexe A.6 passe
au même harnais.

### 4.5. Contextes à vérifier pour un composant

Un composant ne lit pas le mode et ne déclare aucune variable de token
(section 4.6) : son rendu ne change d'un contexte à l'autre que par une faute du
composant, par exemple une référence figée, ou du générateur, que le harnais
couvre. `ucm guide` imprime donc un ensemble de taille bornée :

- le contexte par défaut ;
- pour chaque axe qui touche le composant, son premier mode non défaut, les
  autres axes au défaut ;
- pour chaque couple d'axes touchants dont les cônes se croisent, leurs premiers
  modes non défaut ensemble.

Au plus `1 + A + C` contextes, pour `A` axes touchants et `C` couples croisés.

### 4.6. Convention runtime

Reprise du plan courant, section 11. Un attribut par axe sur n'importe quel
élément ; retirer l'attribut rend le mode hérité ; un composant n'expose ni marque
ni thème en prop et ne déclare aucune variable de token. Un portail reçoit les
attributs effectifs sur son conteneur, et l'application les met à jour pendant
qu'il reste ouvert. Iframe : charger la feuille et poser les attributs. Shadow
DOM hors garantie.

## 5. Modes fixés dans un composant, et `ring`

### 5.1. Modes fixés

Repris du plan courant, section 13, avec la distinction de la revue, point 1.

- **Mesure.** Un relevé en lecture seule, par le serveur MCP Figma avec
  l'autorisation du mainteneur, liste les calques publiés dont
  `explicitVariableModes` n'est pas vide, racine et calques internes séparés, et
  les variables `BOOLEAN` et `STRING` à plusieurs modes liées à `visible` ou
  `characters`.
- **Classement de chaque cas.** Une valeur de `samples` qui change avec le mode
  (un texte traduit) ne dégrade rien : `samples` est non normatif. Une liaison
  normative perdue (visibilité d'un calque, mode interne qui change une couleur
  publiée) rend `meta.coverage.portable` partiel sous un avertissement, dès que
  la mesure montre un geste honnête à demander.
- Aucun champ de contrat avant la mesure.

### 5.2. Le contour `ring`

Mesuré : `defaultRenderingSemantics()` publie pour `ring`
`cssProperties: ['outline-color', 'outline-width']` et `fallback: 'box-shadow'`.
`outline-style` vaut `none` par défaut en CSS. [FORMAT.md](../FORMAT.md) recommande
le repli « dès que la fidélité l'exige » ; la skill ne l'emploie « que si ces
propriétés ne suffisent pas ». Un stroke pointillé avertit déjà
(`unsupportedProperties.ts`) : le trait publié est plein.

Décision : aucun changement de contrat.

- `docs/FORMAT.md`, section 8, écrit que `cssProperties` nomme la famille de
  propriétés qui porte les tokens, sans être la liste exhaustive des
  déclarations. Un rôle `stroke` rendu par `outline` pose `outline-style: solid`,
  et `align` et `width` donnent `outline-offset`.
- La même section remplace « recommandé dès que la fidélité l'exige » par la
  règle de l'aide `contour-ring` (section 6.2).
- Rendus par `outline` ou par `box-shadow`, une largeur uniforme donne la même
  géométrie. Un lecteur qui suivait le repli reste juste, et aucune version du
  contrat ne monte.

## 6. Les aides à l'implémentation

### 6.1. Sens, écriture, preuve

| Part | Contenu | Propriétaire |
|---|---|---|
| sens | ce que la caractéristique oblige à rendre, sans technologie | UCM, suit la version du format |
| écriture par défaut | une forme CSS de ce sens | UCM, remplaçable |
| preuve | ce qui vérifie le sens : contrôle UCM nommé, commande du repository, ou relecture | UCM ; le repository ajoute sa commande |

Un repository remplace une écriture et ne touche jamais un sens.

### 6.2. Catalogue

`packages/kit/src/lecteurs/caracteristiques.mjs` exporte `CARACTERISTIQUES` et
`caracteristiquesDuContrat(contrat, contratsParNom, cones)`. La table des
caractéristiques et des aides est celle de l'annexe A.7.

`packages/cli/aides/<aide>.md`, un fichier par aide :

```markdown
---
aide: contour-ring
quand: contour-ring
---

## Sens

Un `ring` se dessine hors du flux et ne déplace aucun voisin. Sa nature et ses
tokens viennent de `rendering.roles.ring` ; son trait est plein ; `align` et
`width` disent de quel côté de la boîte et sur quelle épaisseur.

## Écriture par défaut

`outline: <width> solid <color>` ; `outline-offset` vaut `0` pour `outside`,
moins la largeur pour `inside`, moins la demi-largeur pour `center`. Une largeur
qui diffère par côté se rend par une ombre décalée par côté, exacte pour
`inside` seulement ; signaler au développeur un autre alignement. Sur le même
calque qu'un `border`, le `border` garde `box-shadow` et le `ring` garde `outline`.

## Preuve

Relecture ; comparaison visuelle au focus clavier.
```

L'aide `contour-border`, en plus de `box-shadow`, pose un contour de secours pour
les couleurs forcées, où `box-shadow` vaut `none` et où `outline-color` reçoit une
couleur système
([CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties)) :

- `outline: <width> solid transparent`, avec `outline-offset` selon `align` :
  moins la largeur pour `inside`, moins la demi-largeur pour `center`, `0` pour
  `outside` ;
- ce contour cède à l'`outline` du `ring` dans les seuls états où le `ring`
  s'affiche ;
- il n'est jamais remis à `none`, focus compris.

Lois de `packages/cli/tests/aides.test.mjs`, reprises de l'annexe A.8, plus une : chaque aide a une section « Preuve ». Le front matter d'une aide
n'a que deux clés plates, lues ligne par ligne.

### 6.3. `.ucm/conventions.md`

```markdown
<!-- ucm : marche à suivre et exemple, retirés à la lecture -->
ecritures-par-defaut: oui

Stack : React 19 et CSS Modules. Un composant par dossier, tests à côté.
Gabarit : `.ucm/gabarits/composant.tsx`. Composant de référence : `src/components/Carte`.

## contour-ring
<!-- ucm:copie contour-ring 0.2.0 -->

Classe `ring` de `src/styles/contours.module.css`, qui reçoit `--ring-width`,
`--ring-color` et `--ring-offset`.

Contrôle : `npm run lint:css`

## icone-composant

`src/Icone.tsx`, qui reçoit `nom` et `taille`.
```

- **Le texte avant la première section** est l'écriture de l'aide `composant` :
  stack, architecture, bonnes pratiques, gabarit ou composant de référence.
- **Une section `## <aide>`** remplace l'écriture par défaut, ou répond à un
  ancrage.
- **Une ligne qui répond à `^Contrôle\s*:`**, espaces insécables compris, ajoute
  la commande entre accents graves à la preuve de l'aide.
- **`ecritures-par-defaut: non`**, sur la première ligne non vide après le retrait
  des commentaires : `ucm guide` imprime le sens seul des aides sans section. Un
  repository qui n'écrit pas de CSS l'emploie. Aucun autre en-tête n'existe.
- **Fichier le plus proche.** La recherche part du dossier du contrat, ou du
  chemin passé à `ucm aides --personnaliser`, et remonte jusqu'au dossier qui
  contient `ucm.config.json`. Le premier `.ucm/conventions.md` trouvé s'applique.
  Un monorepo web et mobile pose un fichier par application. Aucune fusion.
- **Lecture** : retrait des commentaires HTML sauf les marqueurs `ucm:copie`,
  découpage aux titres qui commencent par `## ` hors des blocs de code. Un titre setext n'ouvre
  pas de section. Titre inconnu, section en double, section `## composant` :
  signalés en tête de sortie.
- **Copie datée.** `ucm aides <aide> --personnaliser [chemin]` ajoute la section à
  la fin du fichier le plus proche, avec le marqueur `ucm:copie <aide> <version>`
  et l'écriture par défaut à éditer. Si la section existe, la commande le dit et
  n'écrit rien. Quand l'écriture par défaut a changé depuis la version du
  marqueur, `ucm guide` et `ucm aides` signalent la section à relire.
- `ucm aides` liste le catalogue et l'origine de chaque écriture (UCM,
  conventions, ancrage sans réponse). `ucm aides <aide>` imprime sens, écriture
  par défaut et preuve.
- `ucm init` crée le fichier avec, en commentaire, la marche à suivre et un
  exemple.
- Une section ne cite ni référence de token ni valeur de contrat.

### 6.4. Relais et procédure

`ucm init` écrit, sans écraser, deux relais identiques :
`.agents/skills/ucm-implementer/SKILL.md` et
`.claude/skills/ucm-implementer/SKILL.md`.

```markdown
---
name: ucm-implementer
description: Implémenter ou modifier un composant décrit par un fichier *.contract.json. Charger avant d'écrire le code du composant.
---

Lancer `npx --yes @ucm-kit/cli@<version> guide <chemin du contrat>`, puis suivre sa sortie.
```

`packages/cli/procedure.md`, moins de 60 lignes, porte la procédure :

- appliquer chaque aide imprimée ;
- le contrat décide des données, le sens de l'obligation, l'écriture de la forme
  du code ;
- un sens contredit par une écriture se signale au développeur avant d'écrire la
  partie concernée ;
- un ancrage sans réponse devient une question ;
- un manque du contrat se rapporte.

Elle ne dit pas de lancer `ucm guide`.

La skill actuelle se scinde : ses §1 à §6 deviennent les aides et la procédure ;
`.agents/skills/consommer-contrat/SKILL.md` garde le protocole de recette et
renvoie à `ucm guide`. Son en-tête YAML, aujourd'hui invalide, passe sur deux
lignes.

### 6.5. `ucm guide <contrat>`

Sortie Markdown, dans l'ordre :

1. les anomalies des conventions, les sections copiées à relire, les pins en
   désaccord ;
2. la procédure ;
3. le texte de tête des conventions, une fois ;
4. l'extraction de l'annexe A.9 ; chaque vue et chaque
   entrée de catalogue une fois, les renvois restent des renvois ;
5. pour chaque aide employée : sens, section des conventions ou écriture par
   défaut, preuve ;
6. les ancrages sans section, sous « non tranché : demander au développeur » ;
7. les axes qui touchent le contrat, les contextes de 4.5, la mise en place des
   modes ;
8. les icônes réclamées ;
9. les octets de chaque partie.

**Pins.** La commande compare entre eux la version des deux relais, celle du
workflow `.github/workflows/ucm.yml` et celle de `@ucm-kit/cli` dans
`package.json` s'il existe. Elle nomme chaque ligne en désaccord.

Option : `--out <fichier>`. Codes : 0 ; 2 pour une configuration refusée ou un
contrat illisible ; 1 pour un graphe de composition ou de tokens incohérent.
Tests : ceux de l'annexe A.10, plus le fichier de conventions le plus
proche, la section copiée à relire, les pins en désaccord, et une sortie qui ne
contient pas la consigne de lancer `guide`.

### 6.6. Gabarit

Repris du plan courant, section 14.9 : `@ucm-kit/adapter-typescript` publie
`gabarits/exemple.contract.json` et `gabarits/composant.tsx`, testés par parité,
contrôle de types et `ucm guide`. `@ucm-kit/cli` devient une `devDependencies` de
l'adaptateur pour ce dernier test.

- L'objet exporté reçoit `cheminGabarits`, facultatif, un chemin absolu calculé
  depuis `import.meta.url`. `chargerAdaptateur` ne l'exige pas.
- `files` de l'adaptateur reçoit `gabarits`.
- `ucm init` copie les deux fichiers dans `.ucm/gabarits/` quand l'adaptateur est
  trouvé.

Un repository sans adaptateur désigne un composant de référence dans le texte de
tête des conventions. Le gabarit montre une forme et ne prouve rien sur un autre
composant.

### 6.7. Installation

`npx --yes @ucm-kit/cli@<version> init` écrit, sans écraser :

- les cinq fichiers actuels ;
- les deux relais ;
- `.ucm/conventions.md` ;
- `.ucm/gabarits/` si l'adaptateur est installé.

Changements dans `packages/cli/src/init.mjs` et `ucm.mjs` :

- `lireArgumentsInit` accepte les drapeaux sans valeur, dont `--sans-agents`, qui
  retire relais, conventions et gabarit ;
- `init` devient asynchrone pour appeler `chargerAdaptateur` ; une erreur de
  chargement est rapportée dans le compte rendu et n'arrête pas l'installation ;
- sans adaptateur, le compte rendu dit de relancer `ucm init` après son
  installation pour recevoir le gabarit ;
- le commentaire d'en-tête d'`init.mjs` précise qu'aucune version du format n'est
  écrite, le pin de la CLI l'étant dans le workflow et les relais ;
- `files` de la CLI reçoit `aides` et `procedure.md`.

Le compte rendu imprime ensuite les lignes à ajouter, chacune avec son fichier :

1. `@ucm-kit/cli` en `devDependencies`, à la version exacte ;
2. `ucm tokens css --out src/generated/tokens.css` en tête des scripts `dev` et
   `build`, à la place de tout autre générateur de la même feuille ;
3. l'import de la feuille générée dans l'entrée CSS de l'application ;
4. si `tokens.json` déclare des axes, la section `modes` de `ucm.config.json`.

Un test sur `npm pack --dry-run` vérifie que l'archive de la CLI contient
`aides/` et `procedure.md`, et celle de l'adaptateur `gabarits/`.

### 6.8. Mesure du coût, avant `ucm guide`

La sortie de `ucm guide` reste dans le contexte à chaque tour. Si elle pèse plus
que ce qu'un agent lit de lui-même, elle coûte plus qu'elle ne rapporte. La mesure
précède donc la commande.

- Un script jetable, hors dépôt, assemble à partir du catalogue de L4 la sortie
  attendue pour `Alert` et `Button` : procédure, extraction, aides employées.
- Le mainteneur rejoue deux conditions : la skill actuelle seule, puis un relais
  qui lit ce fichier, sans gabarit. Trois reconstructions par condition sur
  chaque composant, même modèle et même effort.
- Critère fixé avant la mesure : médiane des tours et du trafic facturé plus
  basse sur les deux composants, et fidélité non dégradée sur une liste fermée de
  propriétés.
- Si le critère échoue, la section 6.5 retire l'extraction avant L6 : le guide
  imprime procédure, aides et contextes, et l'agent lit le contrat.

## 7. Recette

Mise en place du Playground, dans cet ordre :

1. réexporter `tokens.json` depuis le plugin publié, pour obtenir `com.ucm.axes` ;
2. installer `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` aux versions exactes ;
3. remplacer `style-dictionary build` par `ucm tokens css` dans `dev` et `build`,
   retirer `style-dictionary.config.mjs` et la dépendance ;
4. lancer `ucm init` ; déplacer le tableau « Ce qu'il faut / Où / Forme » de
   `AGENTS.md` dans `.ucm/conventions.md` ;
5. réécrire la règle 4 de `AGENTS.md` : l'empreinte du produit se limite aux
   fichiers qu'`ucm init` écrit, aux lignes qu'il imprime et à la feuille générée.

Épreuves, en plus de celles de l'annexe A.11 :

- `valeurDansLeContexte` rend pour `marque-2` les valeurs que Figma montre ;
- un `tokens.json` d'export antérieur fait échouer le build avec la phrase de
  réexport ; `--sans-modes` le fait passer ;
- `ucm aides contour-ring --personnaliser`, puis édition de la section : une
  nouvelle reconstruction suit la classe locale ;
- un `border` et un `ring` au focus restent visibles en couleurs forcées dans
  Chrome ;
- le harnais de cascade passe dans Safari réel.

## 8. Lots

Ordre d'exécution. `@ucm-kit/core` sort avant `@ucm-kit/cli` et
`@ucm-kit/adapter-typescript`. Le plugin sort après le kit qui lit ses
extensions ; les lecteurs publiés les ignorent, donc aucun ordre de version ne
s'impose au-delà.

| Lot | Contenu | Dépend de | Preuve de sortie | Exécutant |
|---|---|---|---|---|
| L0 | harnais de cascade Playwright, oracle provisoire sur documents synthétiques, arbres de l'annexe A.5 et d'extension ; taille sur 500 extensions aux 10 surcharges distinctes et 2 modes | rien | tests verts dans les trois moteurs, relevé de taille | agent |
| L1 | kit : forme de `com.ucm.axes`, `modes-tokens.mjs`, `attributDeMode`, configuration `modes` et `css`, type des alias par mode | rien | tests du kit, test du type vu rouge | agent |
| L2 | CLI : `ucm tokens css`, axes simples ; harnais branché sur la commande | L0, L1 | tests de la commande, harnais | agent |
| L3 | plugin : `com.ucm.axes`, `com.ucm.axis`, constats ; `conformiteDtcg.test.ts` ; documents du format et classe 12 | L1 | tests d'export sur fichier simulé | agent, puis export réel par le mainteneur |
| L4 | `FORMAT.md` section 8 pour `ring` ; `caracteristiques.mjs`, catalogue d'aides avec preuve, loi du schéma | L1 | `aides.test.mjs` | agent |
| L5 | mesure préalable du coût (section 6.8) | L4 | décision écrite dans cette note | mainteneur, script par l'agent |
| L6 | `procedure.md`, `ucm guide`, `ucm aides`, relais et conventions dans `ucm init`, scission de la skill, `files` de la CLI | L2, L4, L5 | `guide.test.mjs`, tests d'`init` et d'`aides`, `npm pack --dry-run` | agent |
| L7 | adaptateur : gabarit, `cheminGabarits`, copie par `init` | L6 | tests de l'adaptateur | agent |
| L8a | kit et CLI : extensions, intermédiaires, repli, cycles étiquetés | L2 | harnais à trois générations, taille de L0 respectée | agent |
| L8b | plugin : lecture des collections étendues, expérimental | L3, L8a | simulation de l'API | agent |
| L9 | recette : archives, puis Playground (section 7) | L2, L3, L6, L7 publiés | épreuves de la section 7 | mainteneur avec agent |
| L10 | mesure des modes fixés | autorisation Figma | relevé ; décision avant tout champ | mainteneur avec agent |

L1 et L10 peuvent commencer pendant L0. L8a et L8b ne bloquent pas L9.

## 9. Hors périmètre

| Sujet | Déclencheur |
|---|---|
| `tokens.resolver.json`, dérivé par le kit | un outil du consommateur qui l'exige |
| `ucm tokens contexte` | un repository qui fixe son mode au build, ou une plateforme autre que le web |
| variable `--ucm-mode-<axe>` | une application qui lit le mode d'un élément qu'elle n'a pas posé, ou le repli de L0 |
| profils de stack, `ucm doctor`, `init --update` | un second repository de la même stack |
| fusion de plusieurs fichiers de conventions | un monorepo qui en demande |
| gabarit sans adaptateur, plusieurs gabarits | l'adaptateur d'une autre stack |
| génération de composants depuis le contrat | un consommateur de production aux erreurs de transcription mesurées |
| `ucm guide --json` | une intégration d'agent qui lit une sortie structurée |
| `prefers-color-scheme` et `color-scheme` | le premier axe clair et sombre réel |
| cycles qui exigent plus de 10 000 cycles énumérés | un fichier réel qui atteint la borne |

Le plan du diff sémantique, `PLAN-DIFF-SEMANTIQUE.md`, reçoit
cinq cas : mode renommé, ajouté ou retiré ; défaut changé ; axe écarté ; cible
d'alias changée dans un seul mode ; surcharge d'extension ajoutée ou retirée.

## 10. Revue indépendante de ce plan

Un agent de revue a lu ce plan et le code cité, sans rien modifier. Chaque
constat retenu a été vérifié dans le code avant correction.

| Constat | Gravité | Traitement |
|---|---|---|
| la feuille des extensions croissait comme marques × feuilles surchargées | bloquant | intermédiaires limités aux surcharges, règle de repli par axe (4.3) ; L0 mesure 500 marques aux surcharges distinctes |
| une marque sur deux collections exigeait deux attributs | important | contexte racine nommé `base` (3.3) |
| états de lecture non décidables, induits oubliés | important | `com.ucm.axes` toujours écrit, état « incohérent », test de conformité, types, titre des classes (3.1) |
| le sens de `ring` contredisait son écriture | important | sens réécrit, `cssProperties` non exhaustif dans `FORMAT.md` ; pointillé déjà averti (5.2, 6.2) |
| contour de secours en couleurs forcées : géométrie et focus | important | décalage selon `align`, cession au `ring` par état, jamais `none` (6.2) |
| contextes à vérifier coûteux sans rien prouver | important | ensemble borné `1 + A + C` (4.5) |
| recherche de cycles inexacte à trois axes, le cas nominal des extensions | important | composantes fortement connexes et conditions par arête, borne annoncée (4.3) |
| coût mesuré après construction | important | lot L5 avant `ucm guide` (6.8) |
| deux générateurs de la même feuille dans le Playground | important | ordre de la recette (7) |
| contrôle des pins sans objet | mineur | comparaison des pins entre eux (6.5) |
| `init` incompatible avec le code actuel | mineur | drapeaux sans valeur, asynchrone, erreur rapportée (6.7) |
| dossiers absents de `files` | mineur | `files` et `npm pack --dry-run` (6.6, 6.7) |
| lecture des conventions ambiguë, copies qui vieillissent | mineur | règles de lecture et marqueur `ucm:copie` (6.3) |
| ordre des lots, Safari sur Windows | mineur | table des lots et colonne exécutant (8), Playwright et Safari réel (4.4) |
| collision des noms d'intermédiaires | mineur | double tiret (4.3) |
| refus de type qui change un verdict | mineur | classe 6 (3.5) |
| rang de l'axe d'extension | mineur | juste après son axe parent (4.3) |

La revue a déroulé sept arbres de cascade avec extension et thème, dont deux
attributs sur un même élément et un alias entre feuilles surchargées. Elle n'a
trouvé aucune valeur fausse, sous deux conditions désormais écrites en 3.3 et
4.3 : les cônes incluent les intermédiaires, et une valeur effective garde ses
alias.

## 11. Relevé L0

### Cascade

Harnais `packages/cli/tests/cascade/`, lancé par `npm run cascade` avec
Playwright 1.63.0.

| Moteur | Version | Cas | Résultat |
|---|---|---|---|
| Chromium | 153.0.8010.12 | 47 | vert |
| Firefox | 155.0 | 47 | vert |
| WebKit | 26.6 | 47 | vert |

Entrées, dans `documents.mjs` et `arbres.mjs`. Douze lignes de l'annexe A.5
donnent 17 arbres une fois les six ordres d'imbrication déroulés. Ils passent
sur un document à deux axes, dont le CSS est écrit à la main
(`attendu-deux-axes.css`), puis sur un document à quatre axes, dont le CSS vient
de l'émetteur provisoire. La ligne des trois attributs sur un élément passe sur
les six ordres de déclaration des axes. Les sept arbres d'extension de la
section 4.4 passent sur `attendu-extensions.css`, écrit à la main. Chaque sonde
compare toutes les feuilles du document à l'oracle, et l'émetteur provisoire
rend les deux CSS écrits à la main à l'octet près.

Vu rouge. Sans les croisements `@scope` dans l'émetteur, douze cas du document à
quatre axes échouent dans chaque moteur, avec l'égalité au CSS écrit à la main.
Sans le croisement qui fixe `--ucm-x-marque-b--color-f2` en `dark`, trois arbres
d'extension échouent dans chaque moteur.

Forme retenue : `@scope`. Le repli de l'annexe A.6 n'a pas été éprouvé.

### Taille sur 500 extensions

`documentDeTaille` : collection `color` à deux modes, 5 000 feuilles surchargées
chacune par une seule extension dans le mode `dark`, 5 000 feuilles de composant
qui les citent. 250 extensions ont `base` pour parente, les 250 autres une
extension de la première moitié.

| Mesure | Valeur |
|---|---|
| règles de style | 1 007 |
| déclarations | 80 000 |
| octets | 3 952 438 |
| émission par l'émetteur provisoire | 9,3 s |

Répartition des déclarations : `:root` 20 000 ; règles de mode de `color`
20 000 ; règle commune de `color` 10 000 ; croisements de `color` par l'axe
d'extension 12 500 ; règles de repli et règles propres de l'axe d'extension
12 500 ; sa règle commune 5 000.

Comparaison calculée, non émise : les mêmes 500 marques en modes d'un axe simple
déclareraient 10 000 feuilles sur `:root`, 5 000 par règle de mode et 5 000 dans
la règle commune, soit 2 515 000 déclarations. Le terme principal de la feuille
des extensions est l'intermédiaire, déclaré sur `:root` puis dans chaque mode de
l'axe parent. Le temps mesure l'émetteur provisoire, qui recalcule les noms pour
chaque extension, et ne borne pas `ucm tokens css`.

## Annexe A. Ce que ce plan reprend du plan courant

Recopié du commit `7226eee` et adapté à la forme de la section 3 : le
propriétaire d'une feuille est `com.ucm.axis`, et aucun résolveur n'existe.

### A.1. Configuration `modes` et `css`

- `css.fontFamilyFallback`, facultatif, est ajouté après chaque famille que la
  feuille CSS écrit. Le repli est un choix du repository.
- Un axe absent de `modes` prend `attributDeMode(axe)`.
- Une valeur est `data-` suivi de lettres Unicode minuscules, chiffres ou tirets,
  avec au moins une lettre ou un chiffre.
- Une clé qui ne nomme aucun axe est refusée par les commandes qui lisent
  `tokens.json` et la configuration.
- `format/configuration.ts` porte la grammaire, `configuration.test.mjs` les
  refus.

### A.2. Règles émises

Pour une feuille `f` et un mode `m` de son propriétaire, `expr(f, m)` est la
valeur de `f` dans `m` ; pour une feuille sans propriétaire, `expr(f)` est sa
`$value`. Un alias `{p}` s'écrit `var(tokenCssVariable(p))`, un littéral selon
A.3.

**Base.** Une règle `:root` déclare chaque feuille dans le contexte par défaut.
Elle précède les règles de mode. Sur `<html>`, `:root` et un attribut ont la même
spécificité : l'ordre du fichier décide.

Pour chaque axe `a` :

1. **Une règle par mode** `m`, défaut compris, sur `[attribut(a)="m"]` : chaque
   feuille dont `a` est propriétaire, `expr(f, m)`.
2. **Une règle commune** sur `:is([attribut(a)="m1"], …, [attribut(a)="mk"])` :
   chaque autre feuille du cône de `a`, `expr(f, defaut(b))` si un autre axe `b`
   en est propriétaire, `expr(f)` sinon. Un sélecteur `[attribut(a)]` sans valeur
   redéclarerait le défaut de `b` sous un mode inconnu.
3. **Croisement.** Pour chaque feuille `f` dont `b` est propriétaire et qui
   appartient au cône de `a`, et pour chaque mode `n` de `b` :
   `@scope ([attribut(b)="n"]) { :where(:scope, :scope *):is([attribut(a)="m1"], …) { f: expr(f, n); } }`.
   Les déclarations d'un même couple `(b, n)` partagent un bloc.

Toutes les règles ont la spécificité `(0,1,0)`. À spécificité égale, la
proximité départage, et une règle sans portée a une distance infinie. Deux
attributs sur le même élément : la racine du `@scope` est l'élément, distance 0,
et le croisement l'emporte. La feuille se charge hors couche et sans
`!important`. `@scope` est Baseline depuis Firefox 146, Chrome 118 et Safari
17.4. Un attribut de valeur inconnue n'active aucune règle et laisse le mode
hérité. Un troisième axe se traite par croisements deux à deux.

Taille, hors extensions : somme sur les axes des feuilles possédées fois les
modes, plus le reste du cône, plus les croisements.

Sortie attendue sur le corpus du Playground, 10 feuilles à modes et un cône de
60 :

```css
/* Généré par ucm tokens css depuis src/tokens/tokens.json. Relancer la commande plutôt que modifier ce fichier. */
:root {
  --color-brands-marque1-primary-500: color(srgb 0.07 0.31 0.62 / 1);
}

[data-brand="marque1"] {
  --color-brand-tokens-primary-default: var(--color-brands-marque1-primary-500);
}

[data-brand="marque-2"] {
  --color-brand-tokens-primary-default: var(--color-brands-marque-2-primary-500);
}

:is([data-brand="marque1"], [data-brand="marque-2"]) {
  --components-button-colors-primary-contained-default-background: var(--color-brand-tokens-primary-default);
}
```

Chaque règle de mode déclare 10 feuilles et la règle commune 50.

### A.3. Littéraux

| `$type` | Écriture CSS |
|---|---|
| `color` en `srgb` ou `display-p3` | `color(<colorSpace> r g b / alpha)`, sans arrondi |
| `dimension` en `px` | `16px` |
| `duration` en `s` | `0.2s` |
| `cubicBezier` | `cubic-bezier(x1, y1, x2, y2)` |
| `number`, graisse comprise | le nombre |
| `fontFamily` | chaque famille entre guillemets, séparées par des virgules, suivies de `css.fontFamilyFallback` s'il est configuré |
| `string` | une chaîne CSS entre guillemets, caractères échappés |
| `boolean` | `true` ou `false` |
| `$value: null`, alias dont l'export n'a pas trouvé la cible | aucune déclaration ; la feuille est nommée sur la sortie d'erreur, sans changer le code |
| toute autre forme | refus, code 1, qui nomme la feuille et le mode |

Un alias de tout type s'écrit `var()`. Structure, nombres finis, unités et bornes
des courbes sont validés avant la sérialisation.

### A.4. Contrôles et déterminisme

Base et modes sortent du même fichier, nommés par `tokenCssVariable` : une
variable citée sans être déclarée ne peut pas se produire. L'intégration
s'engage à ne pas redéclarer les tokens ailleurs. La sortie ne dépend que des
entrées, s'écrit après validation par remplacement du fichier terminé, et un
échec conserve la sortie précédente.

Tests `packages/cli/tests/tokens-css.test.mjs` : fichier sans mode, croisements
dans les deux sens et à trois axes, défaut non premier, littéraux de chaque type
en base et en mode, repli de famille, chaque refus avec un cas voisin accepté
(noms non ASCII, cycle jamais actif), attribut de configuration, sortie identique
sur deux exécutions, conservation de la sortie sur erreur.

### A.5. Arbres de la preuve de cascade

| Arbre, du plus haut au plus bas | Attendu |
|---|---|
| aucun attribut | défaut de chaque axe |
| `b` sur `<html>`, puis `a` dans un sous-arbre | `a` dans le sous-arbre |
| `a`, puis `b`, puis `a` | `a` au niveau le plus bas |
| marque `b`, puis thème sombre | `b` sombre |
| thème sombre, puis marque `b` | `b` sombre |
| `b` et sombre sur le même élément | `b` sombre |
| `b` sur un conteneur en `display: contents` | `b` |
| trois axes liés, dans les six ordres d'imbrication | même valeur pour le même contexte |
| trois attributs sur un élément, ordre de déclaration des axes permuté | même valeur |
| axe indépendant entre deux axes croisés | aucune réinitialisation de l'axe hérité |
| mode inconnu ou attribut vide entre deux portées valides | héritage du dernier mode valide |
| ajout, changement, puis retrait d'un attribut | valeur recalculée à chaque étape |
| alias changé dans un seul mode, dépendances en losange | valeur de chaque contexte |

Le relevé joint le harnais, la version de chaque moteur, les entrées, le CSS émis
et les résultats.

### A.6. Repli si `@scope` échoue

L'attribut pose `--ucm-mode-<axe>`, et `@container style()` sélectionne les
croisements, disponible dans les trois moteurs depuis Firefox 151. Une style
query interroge le parent, jamais l'élément qui porte l'attribut : deux attributs
posés sur le même élément reçoivent donc une règle composée,
`[data-brand="b"]:is([data-theme="light"], [data-theme="dark"])`. L0 passe les
deux formes au harnais et retient la plus simple qui réussit. Si le repli est
retenu, la variable d'identité de mode sort du hors périmètre.

### A.7. Caractéristiques et aides

| Caractéristique | Relevée quand | Aides |
|---|---|---|
| `toujours` | tout contrat | `composant` (lois, surface publique, matrice, vue exacte, interdits ; écriture : stack, structure de fichier, gabarits), ancrages `identifiants`, `attributs-natifs`, `controles` |
| `reference-token` | le contrat cite une référence | ancrage `resolution-token` |
| `liaison-native` | `propertyBindingDefinitions` | `liaison-native` |
| `disposition` | un conteneur `flex-row` ou `flex-column` | `disposition` |
| `grille` | un conteneur `grid` | `grille` |
| `dimensions` | `sizing`, `size`, `bounds` ou `structuralSize` | `dimensions` |
| `dimensions-par-taille` | `structure.sizes` | `dimensions-par-taille` |
| `position-absolue` | un slot `position: "absolute"` | `position-absolue` |
| `rotation` | une `rotation` | `rotation` |
| `peinture` | une clé de `fills` | `peinture` |
| `contour-border` | une clé de `strokes` dont le rôle est `border` | `contour-border` |
| `contour-ring` | une clé de `strokes` dont le rôle est `ring` | `contour-ring` |
| `typographie` | un usage de `typography` | `typographie` |
| `troncature` | un `lineClamp` | `troncature` |
| `icone` | une entrée de `icons` | `icone`, ancrage `icone-composant` |
| `etats` | un état autre que `default` | `etats` |
| `focus` | un état dont le `selector` contient `:focus` | ancrage `focus-clavier` |
| `composition` | `composes` | `composition`, ancrage `comptage-dependances` |
| `echantillon` | `samples` | `echantillon` |
| `modes` | `axesDuContrat` rend au moins un axe | `modes`, ancrages `chargement-feuilles`, `portee-mode` |
| `couverture-partielle` | `meta.coverage.portable` vaut `partial` | `couverture-partielle` |

La fonction lit les champs du contrat et de ses vues exactes, jamais le nom du
composant. Le contenu des aides vient des §1 à §6 de la skill `consommer-contrat`.
Un ancrage n'a pas de section « Écriture par défaut ».

### A.8. Lois du catalogue

- chaque identifiant de `CARACTERISTIQUES` est le `quand` d'au moins une aide ;
- chaque `quand` est un identifiant de `CARACTERISTIQUES` ;
- chaque aide a une section « Sens » ;
- un contrat fabriqué qui porte chaque champ de la table rend la caractéristique
  attendue, et un contrat qui ne le porte pas ne la rend pas ;
- chaque couple (définition, propriété) de `ucm-contract.schema.json` figure dans
  la table des champs qu'exporte `caracteristiques.mjs`, ou dans `SANS_AIDE`, liste
  fermée qui donne la raison de chaque absence d'aide (`meta.figma`, identités
  Figma). Le parcours suit les `$ref`, marque les définitions visitées à cause des
  deux définitions récursives, et note `*` pour une clé de dictionnaire ;
- pour un champ qui déclenche une aide selon sa valeur (`layout`, rôle de
  contour, `position`), chaque valeur de l'énumération du schéma figure dans la
  table ou dans `SANS_AIDE`.

Mesuré : le schéma déclare 259 propriétés sur 68 définitions, avec 85 `$ref`.
`registrePortableDocuments.test.ts` ajoute les aides à `PORTABLES` : les sens ne
citent aucune technologie.

### A.9. Extraction imprimée par `ucm guide`

`meta.contractVersion`, `meta.coverage`, `meta.diagnostics`, `props`, axes de
variantes, `structure`, `stateModel`, `intent`, `variants` avec leur renvoi de
vue, chaque vue utilisée une fois, chaque entrée de catalogue de second niveau
une fois, les entrées utilisées d'`icons`, `textStyles` et des définitions de
liaison, l'API publique et l'échantillon de chaque dépendance. L'extraction
réutilise `vueExacteDuVariant` et `compositionsExactesDuVariant`
(`variant-views.mjs`), ne recopie aucune vue dans un variant et ne fusionne rien.

Limites imprimées : ce que le contrat ne décrit pas (comportement, accessibilité,
événements) relève des conventions et de la relecture ; ce que l'export n'a pas
su décrire arrive par `meta.diagnostics` et `meta.coverage`, et l'agent le
rapporte ; la sortie de `guide` ne prouve pas qu'un sens a été appliqué.

### A.10. Tests de `ucm guide`

Sur un repository temporaire avec deux contrats dont l'un compose l'autre : vue
partagée imprimée une fois, aide imprimée seulement si sa caractéristique est
présente, section des conventions préférée au défaut, texte de tête imprimé avant
les aides, section d'une aide absente du contrat non imprimée,
`ecritures-par-defaut: non` qui retire les écritures par défaut sans poser de
question, ancrage sans section listé, section inconnue signalée, commande de
`Contrôle :` reprise, commentaires retirés, `##` dans un bloc de code ignoré,
titre inconnu et section en double imprimés en tête, dépendance manquante, cycle,
version future.

### A.11. Épreuves de recette

Deux passages : un repository temporaire depuis les archives `npm pack` et un
export du plugin local, puis le Playground depuis les versions publiées. Le
premier réussit avant publication.

1. `npm run build` passe ; `tokens.css` déclare chaque feuille sur `:root`, puis
   contient deux règles de mode de 10 déclarations et une règle commune de 50.
2. Galerie : bascule de marque sur `<html>`, `Alert` en `marque-2` dans une page
   `marque1`, puis l'inverse ; couleur calculée du fond du bouton dans chaque
   case.
3. Le harnais de cascade rejoue A.5 sur la sortie de la commande installée, après
   le build Vite.
4. Reconstructions à froid d'`Alert` et de `Button` par le relais et `ucm guide`,
   sans accès à `UCM-Exporter` ; comparaison à Figma dans les deux marques ;
   activation du relais relevée dans Claude Code et Codex.
5. Conventions : la section `contour-ring` et le gabarit changent sans toucher
   aux paquets ; une nouvelle reconstruction les suit, et `ucm check` reste vert.
6. Faute volontaire, sur une copie temporaire : un alias de `tokens.json` vers une
   feuille absente fait échouer le build et nomme la feuille.
7. Gabarit : une reconstruction d'`Alert` part du gabarit copié par `init`, après
   l'épreuve 4 ; ses écarts de forme et son coût se comparent à ceux de
   l'épreuve 4.

Les `.tsx` du Playground ne changent qu'aux épreuves 4, 5 et 7, par la
reconstruction.
