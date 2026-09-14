# Plan : modes de tokens et aides à l'implémentation

Plan d'implémentation, à valider avant exécution. Il est l'unique plan sur ces
deux sujets. Trois statuts qualifient les faits : **mesuré** (relevé dans le
code, les fichiers ou une documentation citée), **repris** (mesuré par une
étude antérieure, non réexécuté), **à mesurer**. Une règle proposée devient une
garantie du produit après son implémentation et ses contrôles.

## 1. Besoins et réponses

| Besoin | Réponse | Section |
|---|---|---|
| des modes dans un fichier de tokens | un document Resolver DTCG `2025.10`, `tokens.resolver.json`, à côté de `tokens.json` inchangé ; un modifier par axe | 7 |
| beaucoup de modes, sur plusieurs étages et collections | un axe par collection, un axe de marque pour les collections étendues, une feuille CSS factorisée, des croisements par `@scope` | 7, 8, 10 |
| des aides concrètes pour l'agent (contour, typographie, icônes, états…) | un catalogue d'aides : un sens fixé par UCM, une écriture remplaçable par le repository | 14.1, 14.2 |
| une personne qui change une aide facilement | une section `## <aide>` dans `.ucm/conventions.md`, sans commande ; `ucm aides` montre le catalogue | 14.4 |
| une skill économe en tokens | `ucm guide <contrat>` imprime en une commande le déroulé, l'extraction et les seules aides que le contrat emploie | 14.5 |
| des préférences de stack | le texte d'en-tête de `.ucm/conventions.md`, qui l'emporte sur les écritures par défaut | 14.4 |
| des gabarits | un composant d'exemple publié par l'adaptateur de stack, vérifié par la parité, copié dans le repository | 14.9 |
| une installation simple dans un repository quelconque | `ucm init --agents` : relais lus par Claude Code, Codex, Cursor et OpenCode, conventions, gabarit | 14.6 |
| un développeur sans agent | la même sortie de `ucm guide`, en Markdown, et la liste des commandes | 14.10 |

## 2. Décisions prises

| Décision | Conséquence |
|---|---|
| Les axes se publient dans un document Resolver DTCG `2025.10` | `tokens.resolver.json` à côté de `tokens.json`, qui ne change pas ; options comparées en section 7.1 |
| Le propriétaire d'une feuille à modes est le modifier qui la définit | chaque feuille est définie par un modifier au plus ; aucun lecteur ne déduit la propriété d'un préfixe |
| UCM génère la feuille CSS des tokens, base et modes | `ucm tokens css` écrit un seul fichier ; Style Dictionary n'est plus nécessaire sur le web, et `tokens.json` reste lisible par tout outil pour une autre plateforme (section 10) |
| Les collections étendues sont exportées | une extension devient un contexte d'un axe de marque ; des jetons synthétiques gardent les modifiers orthogonaux, et l'algorithme CSS ne change pas (section 7.3) |
| Le consommateur se met en place depuis ce que les paquets publient | une dépendance, une commande de build, un import, une section de configuration, `ucm init --agents` ; aucun outil écrit à la main |
| Le nom normalisé d'un mode est sa seule identité publique | renommer un mode est une rupture que le diff sémantique signale |
| Une cible d'alias porte le même `$type` dans tous les modes | constat à l'export, refus à la génération ; le contrôle typographique reste un parcours de `$value` (section 12). Le module Resolver pose la même exigence |
| Aucun document de tokens sélectionné par contexte | pas de commande `ucm tokens contexte` ; déclencheur en section 19 |
| Aucune variable d'identité de mode | pas de `--ucm-mode-<axe>` ; un composant ne lit pas le mode, et l'application connaît celui qu'elle pose. Exception : le repli par style queries de la section 17, s'il est retenu par L0 |
| La feuille CSS refuse un littéral dont UCM ne fixe pas l'écriture | la section 10.4 énumère les écritures ; un alias de tout type s'écrit `var()` |
| Les croisements d'axes sont livrés avec la première génération | leur preuve de cascade précède L3 |
| Une aide sépare son sens de son écriture | le sens appartient à UCM et suit la version du format ; l'écriture appartient au repository (section 14.1) |
| Le repository répond dans un seul fichier, `.ucm/conventions.md` | personnaliser une aide revient à y ajouter une section, sans commande ; `ucm.config.json` ne porte que les attributs d'axe et le repli de famille |
| Un gabarit est publié par un adaptateur de stack, jamais par le noyau | `@ucm-kit/adapter-typescript` publie le premier (section 14.9) ; aucune bibliothèque runtime |
| Le rôle `ring` publie un contour qui se dessine | `rendering.roles.ring` reçoit la déclaration fixe `outline-style: solid`, dans un champ distinct de `cssProperties` puisqu'elle ne reçoit aucun token ; la forme exacte se décide avec `types.ts` en L2. Classe 13 de `COMPATIBILITE.md`, contrat en version mineure. Aujourd'hui un agent qui applique le rôle à la lettre ne dessine rien (P12) |
| Un mode fixé dans un composant se mesure avant de se publier | aucun champ de contrat avant la mesure de L6 |

## 3. Vocabulaire

| Terme | Sens |
|---|---|
| résolveur | `tokens.resolver.json`, un document du module Resolver DTCG `2025.10` |
| axe | un modifier du résolveur : une collection Figma qui compte au moins deux modes, ou la parente et les extensions d'une collection étendue |
| mode | une valeur de cet axe, un contexte du modifier, sous son nom normalisé : `marque1`, `marque-2` |
| feuille à modes | une feuille qu'un modifier du résolveur définit |
| propriétaire d'une feuille | le modifier qui la définit |
| jeton synthétique | une feuille que l'export crée sous le groupe réservé `ucm-extensions`, pour qu'une valeur de collection étendue dépende d'un seul axe |
| cône d'un axe | le plus petit ensemble qui contient les feuilles dont l'axe est propriétaire, et toute feuille dont une valeur, dans un mode quelconque, est un alias vers une feuille du cône |
| portée | un élément de l'interface qui porte l'attribut d'un axe, et ses descendants |
| contexte | un mode choisi pour chaque axe |
| feuille CSS des tokens | la feuille que `ucm tokens css` écrit : la base sur `:root`, puis les règles de mode |
| caractéristique | un fait qu'un contrat présente et qu'une aide interprète : une grille, un contour `ring`, une troncature de texte |
| aide | l'instruction qui dit à un agent comment transcrire une caractéristique ; elle a un sens et une écriture |
| sens | ce que la caractéristique oblige à rendre, indépendamment de la technologie ; fixé par UCM |
| écriture | comment le repository rend ce sens dans sa stack ; fournie par défaut par UCM, remplaçable par une section de `.ucm/conventions.md` |
| ancrage | une aide dont UCM ne fournit pas d'écriture : le repository doit la donner |
| relais | une skill de quelques lignes, écrite dans le repository, qui renvoie à `ucm guide` |
| gabarit | un composant d'exemple complet et son contrat, publiés par un adaptateur de stack et copiés dans le repository |

## 4. Les problèmes

### Le corpus de référence

Mesuré par indexation du fichier courant de `UCM-Playground` : `tokens.json`
en version 2, 757 feuilles, un seul axe (`color-brand-tokens`, modes
`marque1` et `marque-2`, 10 feuilles à modes). Le cône de l'axe compte 60
feuilles : les 10 feuilles à modes et 50 feuilles `components.button.colors.*`.
Toutes les valeurs de mode sont des alias.

| Contrat | Taille | Références | Traversent l'axe | Composition |
|---|---|---|---|---|
| `Button` | 54,6 Ko | 255 | 50 | aucune |
| `Alert` | 14,4 Ko | 39 | 0 | `Button` |
| `StressTest` | | 82 | 0 | `Alert`, `Button` ×3, `TileLink` ×7 |
| `TileLink` | | 11 | 0 | aucune |

Les nombres de références sont repris. Les tailles, le compte des feuilles, le
cône et l'absence de collision de noms CSS sont mesurés. L0 enregistre les
empreintes du corpus. Les tests emploient des documents synthétiques
indépendants des noms du corpus.

### P1. Les ressources CSS n'exposent que le mode par défaut

- **Preuve (mesuré).** `style-dictionary.config.mjs` produit la base depuis
  `$value` sans lire `com.ucm.modes`. La feuille générée ne contient aucune
  valeur de `marque-2`.
- **Conséquence.** Aucun composant ne se rend en `marque-2` sans CSS écrit à la
  main.

### P2. Une portée locale exige de redéclarer le cône

- **Preuve (norme, puis repris).** Le module CSS Custom Properties substitue
  `var()` au calcul de la valeur, sur l'élément qui déclare la propriété, avant
  l'héritage ([CSS Custom Properties](https://www.w3.org/TR/css-variables-1/#using-variables)).
  `--components-button-colors-primary-contained-default-background` est
  calculée sur `:root` dans la marque par défaut. Repris : dans Chrome 152,
  seule la redéclaration du cône entier rend la bonne couleur dans un
  sous-arbre.
- **Conséquence.** Le générateur doit connaître le cône de chaque axe, donc le
  graphe d'alias de `tokens.json`.

### P3. Deux axes croisés rendent une feuille dépendante d'un mode posé plus haut

- **Constat.** Un thème qui cite la marque place ses feuilles dans le cône de
  la marque. Une portée de thème sous une portée de marque doit redéclarer ces
  feuilles, avec une expression qui dépend du mode de marque hérité.
- **Preuve (repris).** Sur huit arbres à deux axes, une redéclaration naïve se
  trompe dans deux cas ; une règle `@scope` par mode de marque les rend justes
  tous les huit. Le corpus n'a qu'un axe : le cas vient du besoin exprimé.
- **Conséquence.** Sans règle de proximité, une section sombre dans une page
  `marque-2` retombe sur la marque par défaut.

### P4. `tokens.json` ne nomme ni le mode par défaut ni le propriétaire d'une feuille

- **Preuve (mesuré).** `buildLeaf` (`packages/plugin/src/tokens/exportTokens.ts`)
  écrit la valeur de `defaultModeId` dans `$value`, puis une clé par mode.
  Aucune donnée n'est écrite pour la collection.
- **Conséquence.** Deux modes de même valeur rendent le défaut indécidable. Deux
  collections `Color` et `Color/Brand` ont des préfixes imbriqués que le chemin
  d'une feuille ne départage pas.

### P5. Aucune convention ne relie un axe à un attribut

- **Preuve (mesuré).** `ucm.config.json` décrit trois chemins
  (`format/configuration.ts`), aucun mode.
- **Conséquence.** Chaque projet invente son attribut, et un agent ne sait pas
  placer un sous-arbre dans un mode.

### P6. La projection de nom est recopiée chez le consommateur

- **Preuve (mesuré).** `variableCss` (`style-dictionary.config.mjs`) remplace
  `[^a-z0-9]+`, `tokenCssVariable` (`format/names.ts`) remplace
  `[^\p{L}\p{N}]+`. Un chemin accentué, que `normalizeName` conserve, donne deux
  noms.
- **Conséquence.** Une feuille de modes écrite à part citerait une variable que
  la base ne déclare pas ; la propriété deviendrait invalide au calcul, sans
  erreur visible.

### P7. Le type d'un alias peut changer d'un mode à l'autre

- **Preuve (mesuré).** `resolveRoot` (`exportTokens.ts`) décide `$type` sur la
  chaîne du mode par défaut. `feuilleRacine`
  (`packages/kit/src/lecteurs/typography-token-types.mjs`) ne lit que `$value`.
  Sous Figma, un alias `FLOAT` peut viser une `dimension` dans un mode et un
  `number` dans un autre.
- **Conséquence.** Un faux vert sur un contrôle qui bloque la fusion. Non
  observé dans le corpus.

### P8. Un mode fixé dans un composant disparaît du contrat

- **Preuve (mesuré).** Aucune occurrence de `explicitVariableModes` ni de
  `resolvedVariableModes` dans `packages/`.
- **Conséquence.** Deux vues identiques pour deux rendus différents, sans
  diagnostic. Ampleur à mesurer dans le fichier Figma.

### P9. Les nombreux modes rencontrent des bornes que le moteur tait

- **Preuve (mesuré).** Figma borne une collection à 10 modes en Professional et
  20 en Organization
  ([Figma, modes](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)).
  Les collections étendues, en Enterprise, servent leurs surcharges par
  `valuesByModeForCollectionAsync` ; `buildLeaf` lit `valuesByMode`
  ([Figma, Variable](https://developers.figma.com/docs/plugins/api/Variable/)).
- **Conséquence.** « Beaucoup de modes » se traduit par plusieurs axes. Une
  collection étendue perdrait ses surcharges sans message.

### P10. Aucun agent d'un repository consommateur ne trouve les aides

- **Preuve (mesuré).** La skill est rangée dans
  `UCM-Exporter/.agents/skills/consommer-contrat/`, hors de tout paquet. Claude
  Code découvre les skills dans `.claude/skills/`, `~/.claude/skills/` et les
  plugins, jamais dans `node_modules`
  ([Claude Code, skills](https://code.claude.com/docs/en/skills)). Codex lit
  `.agents/skills/` du répertoire courant jusqu'à la racine
  ([Codex, skills](https://developers.openai.com/codex/skills)). Le paquet npm `ucm` existe et
  n'est pas UCM : `npx ucm` lance un autre paquet.
- **Conséquence.** L'agent d'un projet tiers ignore comment appliquer
  `rendering.roles`, qu'une matrice ne se reconstitue pas par cartésien, et
  comment se comporter face aux modes.

### P11. La skill mêle aides générales et protocole de recette

- **Preuve (mesuré).** §0 déclare le composant jetable, §2.6 exige que le
  fichier ait été supprimé, §2.7 interdit de créer un test. L'en-tête YAML écrit
  `name` et `description` sur la même ligne.
- **Conséquence.** Appliquée en production, la skill arrête l'agent devant un
  fichier existant et lui interdit les tests.

### P12. Une aide mêle ce qu'il faut rendre et comment l'écrire, et personne ne peut la changer

- **Constat.** Une quinzaine d'aides (contours, typographie et troncature,
  icônes, états et focus, grilles, position absolue, dimensions, composition,
  échantillons, modes) sont écrites dans la skill. Chacune mêle une obligation
  du contrat et une technique CSS.
- **Preuve (mesuré).** La skill, §4.2, écrit « un contour ne consomme pas la
  boîte » (obligation) et `box-shadow` (technique) dans le même paragraphe.
  `rendering.roles.ring` publie `outline-color` et `outline-width` sans
  `outline-style`, qui vaut `none` par défaut : le contour ne se dessine pas.
  `docs/FORMAT.md`, section 8, recommande le repli `box-shadow` « dès que la
  fidélité l'exige », la skill ne l'emploie « que si ces propriétés ne suffisent
  pas ».
- **Conséquence.** Un repository qui écrit ses styles autrement (classes
  utilitaires, CSS Modules, autre plateforme) ne peut changer une technique
  qu'en réécrivant la skill, et perd la mise à jour suivante. Rien ne protège
  l'obligation pendant cette réécriture.

### P13. Les questions laissées au repository n'ont ni emplacement ni suivi

- **Preuve (mesuré).** La skill, §6, énumère sept ancrages ; les modes en
  ajoutent trois. Le Playground répond à trois d'entre eux dans un tableau de
  son `AGENTS.md`, qu'aucun outil ne lit.
- **Conséquence.** Un agent ne sait pas si un ancrage est tranché. Un ancrage
  ajouté par une nouvelle version n'atteint pas le repository.

### P14. Transcrire un contrat coûte surtout des tours

- **Preuve (mesuré).** Une reconstruction relevée a pris 66 tours, avec un
  contexte moyen de 99 000 tokens et une sortie de 3,7 % du trafic facturé. La
  skill compte 452 lignes et 23 065 octets, et une skill activée reste en
  contexte jusqu'à la fin de la session. §2.1 de la skill fait écrire à l'agent
  sa propre commande d'extraction.
- **Conséquence.** Chaque ligne chargée tôt est relue à chaque tour, et chaque
  lecture supplémentaire ajoute un tour.

### P15. Rien ne dit dans quels modes vérifier un composant

- **Preuve (mesuré).** `Alert` et `StressTest` ne citent aucune référence qui
  traverse l'axe, et composent `Button`, qui en cite 50.
- **Conséquence.** Une vérification limitée aux références propres oublie deux
  contrats sur trois ; toutes les combinaisons du fichier coûtent le produit de
  tous les axes.

### Ce qui n'est pas un problème

- **Le contrat et les modes.** `Button` cite la même référence dans les deux
  marques. Le contrat ne change pas.
- **La comparaison littérale des références.** Elle reste juste sous plusieurs
  modes.
- **Le transport des obligations de rendu.** `rendering.roles` voyage dans
  chaque contrat. Le défaut est la valeur publiée pour `ring` (section 2) et la
  séparation du sens et de l'écriture (P12).
- **Les contraintes entre modes.** Figma n'en exprime aucune.

## 5. Contraintes que la solution tient

| Contrainte | Autorité |
|---|---|
| Les alias ne sont jamais aplatis | `AGENTS.md`, tokens et variables |
| Toute projection d'un nom a son propriétaire dans `format/names.ts` | `AGENTS.md`, tokens et variables |
| Le chemin d'un token s'assemble dans `joinTokenPath` seul | `packages/plugin/src/variables.ts` |
| La version du format de tokens est lue à la racine seule ; un groupe ne porte aucune métadonnée, une feuille peut en porter | `format/tokens.ts`, `conformiteDtcg.test.ts` |
| `@ucm-kit/core/format` cible ES2019 et ne dépend de rien | `format/index.ts` |
| Les lecteurs du kit et les documents portables ne promettent aucune stack | `registrePortable.test.mjs`, `registrePortableDocuments.test.ts` |
| Aucune logique ni aucun test ne dépend du nom d'un composant | `AGENTS.md`, portée du contrat |
| Une information a un propriétaire | `CONCEPT.md`, section 3 |
| Le code de production ne lit pas le contrat au runtime | `CONCEPT.md`, section 3 |
| `ucm init` n'écrit que des fichiers absents | `packages/cli/src/init.mjs` |
| Le Playground n'écrit aucun outillage UCM, et ses composants sont reconstruits à froid | `UCM-Playground/AGENTS.md`, règles 1 et 2 |
| UCM n'a aucun consommateur externe : une solution coûteuse pour un confort hypothétique est refusée | décision du mainteneur |

## 6. Vue d'ensemble

```text
Figma
  │  export : tokens.json inchangé, tokens.resolver.json, constats (section 7)
  ▼
tokens.json + tokens.resolver.json + contrats
  │
  └─ @ucm-kit/core/lecteurs : résolveur, axes, cônes, caractéristiques d'un contrat
       │
       ▼
     @ucm-kit/cli
       ├─ ucm tokens css            feuille CSS des tokens, base et modes (section 10)
       ├─ ucm guide <contrat>       déroulé, extraction, aides employées (section 14.5)
       ├─ ucm aides [aide]          catalogue des aides (section 14.4)
       ├─ ucm init --agents         relais, conventions, gabarit (sections 14.6 et 14.9)
       └─ aides/                    catalogue : sens et écriture par défaut
     @ucm-kit/adapter-typescript
       └─ gabarits/                 composant d'exemple et son contrat (section 14.9)
  │
  ▼
repository : .agents/skills/ et .claude/skills/ (relais), .ucm/conventions.md, .ucm/gabarits/
application : feuille CSS des tokens ; un attribut par axe (section 11)
```

| Problème | Solution | Lot |
|---|---|---|
| P1, P2, P3 | sections 8 et 10 | L1, L3 |
| P4 | section 7 | L1, L2 |
| P5 | sections 9 et 11 | L1, L3 |
| P6 | section 10, par construction | L3, L5 |
| P7 | section 12 | L1, L2 |
| P8 | section 13 | L6, L7 conditionnel |
| P9 | section 7.3 | L2 |
| P10, P11 | sections 14.5, 14.6 et 14.7 | L4 |
| P12 | sections 14.1 à 14.4 ; décision sur `ring` en section 2 | L2, L4 |
| P13 | sections 14.2 et 14.4 | L4 |
| P14 | section 14.5 | L4, L5 |
| P15 | sections 8 et 14.5 | L1, L4 |

## 7. Publier les axes dans un document Resolver

**Résout** P4 et P9.

### 7.1. Options comparées

Cinq représentations des modes ont été comparées sur six critères : conformité
à la norme DTCG, lecture par un outil tiers, compatibilité avec les kits publiés
et Style Dictionary, propriétaire et défaut explicites, collections étendues,
coût.

| Option | Norme | Outils tiers | Kits publiés et Style Dictionary | Coût | Verdict |
|---|---|---|---|---|---|
| A. Extension privée dans `tokens.json` : `com.ucm.axes` à la racine, `com.ucm.axis` sur chaque feuille | extension permise, sens privé | aucun | lisent `tokens.json` | faible | écartée : un format maison à maintenir, puis à migrer le jour où un outil exige le Resolver |
| B. Résolveur seul, toutes les sources écrites dans le fichier | conforme | lecteurs du module | rompt : le kit et Style Dictionary lisent `tokens.json` | fort | écartée |
| C. `tokens.json` inchangé, et `tokens.resolver.json` à côté, qui le cite en `set` et déclare un modifier par axe | conforme | lecteurs du module | inchangés : `tokens.json` ne bouge pas | moyen : pull request à deux fichiers, lecture et résolution conformes dans le kit | **retenue** |
| D. Un fichier par contexte, la forme de l'export natif de Figma, et un résolveur qui les cite | conforme | lecteurs du module, import Figma | `tokens.json` perd ses modes | fort : une pull request de N fichiers à relire | écartée ; reste une piste d'import |
| E. A et C à la fois | mixte | lecteurs du module | inchangés | le plus fort | écartée : deux déclarations du même fait |

Ce que C apporte :

- **Le sens vient de la norme.** Le propriétaire d'une feuille est le modifier
  qui la définit, le défaut est `default`, l'ordre des modes est celui de
  `contexts`. P4 se résout sans extension privée.
- **Le schéma est publié.** `https://www.designtokens.org/schemas/2025.10/resolver.json`
  valide la forme, comme le schéma du format valide déjà `tokens.json`.
- **La résolution est définie.** Le module fixe l'ordre de fusion, la résolution
  des alias après fusion et les erreurs d'entrée
  ([Resolver 2025.10](https://www.designtokens.org/tr/2025.10/resolver/)).
  `resoudreContexte` (section 8) l'implémente une fois ; l'oracle des tests,
  `ucm guide` et une future commande de contexte la partagent.
- **Aucun lecteur ne casse.** `tokens.json` garde sa forme, sa marque et
  `com.ucm.modes`. Un kit publié et Style Dictionary ignorent le fichier ajouté.

Limites de C :

- un modifier ne peut dépendre d'aucun autre ; les collections étendues passent
  par des jetons synthétiques (section 7.3) ;
- la norme ne dit pas depuis quel dossier se résout un `$ref` relatif ; les deux
  fichiers restent dans le même dossier ;
- Style Dictionary 5 ne lit pas le résolveur
  ([releases](https://github.com/style-dictionary/style-dictionary/releases)) ;
  Terrazzo 2 le lit et avertit sur un résolveur non orthogonal
  ([Terrazzo, CSS](https://terrazzo.app/docs/integrations/css/)). Les deux
  constats sont à revérifier au début de L1 ;
- la résolution rend un document par contexte, sans règle d'imbrication : la
  feuille CSS reste à la charge d'UCM (section 10).

### 7.2. Forme

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
  "version": "2025.10",
  "sets": {
    "base": { "sources": [{ "$ref": "tokens.json" }] }
  },
  "modifiers": {
    "color-brand-tokens": {
      "default": "marque1",
      "contexts": {
        "marque1": [{ "color-brand-tokens": { "primary": { "default": {
          "$type": "color", "$value": "{color.brands.marque1.primary.500}" } } } }],
        "marque-2": [{ "color-brand-tokens": { "primary": { "default": {
          "$type": "color", "$value": "{color.brands.marque-2.primary.500}" } } } }]
      }
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/base" },
    { "$ref": "#/modifiers/color-brand-tokens" }
  ]
}
```

- Le fichier s'appelle `tokens.resolver.json` et se range à côté de
  `tokens.json`. L'extension `.resolver.json` est celle que la norme recommande.
  Son chemin se déduit de la clé `tokens` de `ucm.config.json`.
- Un modifier par axe. Son nom est le préfixe canonique que `joinTokenPath`
  écrit pour la collection : `Marques/Client` donne `marques.client`.
  `prefixeDeCollection`, extrait de `joinTokenPath`, le calcule pour les deux
  usages.
- `contexts` reçoit les modes dans l'ordre de `collection.modes`, sous les noms
  normalisés de `com.ucm.modes`. L'ordre des clés d'un objet JSON n'a pas de
  sens normatif ([norme JSON](https://www.rfc-editor.org/rfc/rfc8259)) : aucun
  lecteur n'en dépend. Chaque contexte porte
  les feuilles de l'axe avec leur valeur dans ce mode. `default` est le nom
  normalisé de `defaultModeId`.
- Une feuille est définie par un modifier au plus : le résolveur est orthogonal.
- Résolu avec le contexte `default` de chaque axe, le résolveur rend pour chaque
  feuille la valeur résolue de `tokens.json`. La comparaison porte sur les
  valeurs résolues : sous une collection étendue, une feuille vaut un alias
  synthétique dans le résolveur et un littéral dans `tokens.json` (section 7.3).
- Le schéma du module ne connaît ni `string` ni `boolean`, et refuse
  `$value: null`. Une feuille à modes de ces types, ou dont un mode vaut `null`,
  n'entre pas dans le résolveur : l'export publie un constat, et la feuille garde
  ses modes dans `com.ucm.modes`. Pour une famille de police restée `string`, le
  constat demande le geste qui la prouve, le scope `FONT_FAMILY` seul. Le
  résolveur reste ainsi valide contre le schéma.
- Un fichier de variables sans axe ne produit pas de résolveur.
- `tokens.json` ne change pas : `com.ucm.modes` y reste pour les lecteurs publiés.

### 7.3. Collections étendues

Une collection étendue, réservée à Enterprise, reprend les modes de sa parente
et surcharge des valeurs mode par mode
([ExtendedVariableCollection](https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/)).
Une valeur dépend alors de l'extension et du mode de la parente, alors qu'un
modifier ne peut dépendre d'aucun autre.

L'export produit deux modifiers orthogonaux :

- l'axe des modes de la parente, sous le préfixe de la collection ;
- un axe de marque, sous ce préfixe suivi de `-extensions`, dont les contextes
  sont la parente et chacune de ses extensions, à toute profondeur. Son défaut
  est la parente.

Une variable qu'aucune extension ne surcharge reste dans l'axe de la parente.
Une variable surchargée par au moins une extension passe dans l'axe de marque.
Dans le contexte d'une extension `e`, elle vaut l'alias
`{ucm-extensions.e.<chemin>}`. Ce jeton synthétique appartient à l'axe de la
parente et porte, dans chaque mode, la valeur effective de `e`. La parente
reçoit ses propres jetons synthétiques.

Exemple : `color.bg` vaut blanc en `light` et noir en `dark`. L'extension
`marque-b` le surcharge en bleu nuit pour `dark` seulement.

| Feuille | Propriétaire | `light` | `dark` |
|---|---|---|---|
| `ucm-extensions.color.color.bg` | `color` | blanc | noir |
| `ucm-extensions.marque-b.color.bg` | `color` | blanc | bleu nuit |

| Feuille | Propriétaire | contexte `color` | contexte `marque-b` |
|---|---|---|---|
| `color.bg` | `color-extensions` | `{ucm-extensions.color.color.bg}` | `{ucm-extensions.marque-b.color.bg}` |

`color.bg` dépend d'un seul axe et cite l'axe voisin par alias. La section 10.2
traite déjà ce croisement : l'algorithme CSS ne change pas.

- Une parente à un seul mode n'a besoin d'aucun jeton synthétique : l'axe de
  marque définit directement les feuilles surchargées.
- Le groupe `ucm-extensions` est réservé. Une collection dont le préfixe entre
  en collision avec lui, ou avec le nom d'un axe de marque, est écartée sous un
  constat.
- Le nom d'un contexte de l'axe de marque tient en un segment : les points que
  `normalizeName` produit pour un `/` deviennent des tirets. Le chemin
  `ucm-extensions.<contexte>.<chemin>` se lit ainsi d'une seule façon. Une
  extension dont le nom normalisé égale celui de sa parente est écartée sous un
  constat.
- Les modes d'une extension ont leurs propres identifiants et désignent le mode
  de la parente par `parentModeId` ; `variableOverrides` est indexé par
  l'identifiant du mode de l'extension. L'export remonte la chaîne de
  `parentModeId` jusqu'à la parente pour nommer chaque valeur.
- La valeur effective d'une extension se lit par
  `valuesByModeForCollectionAsync`. La documentation ne dit ni quelles clés de
  mode cette méthode rend, ni qu'une extension garde les identifiants de
  variables de sa parente. **À mesurer** : le mainteneur n'a pas de fichier
  Enterprise. L2 prouve l'export sur une simulation de l'API ; la preuve sur un
  vrai fichier attend qu'un utilisateur en fournisse un.
- Une extension dont la parente vient d'une bibliothèque publiée ne trouve pas
  les variables de sa parente par `getLocalVariablesAsync`. L'export écarte
  alors l'axe de marque sous un constat « parente distante », à mesurer.
- `etatDesTokensDuFichier` et `modeCollisionWarnings` (`exportTokens.ts`)
  parcourent chaque collection : une extension y compterait deux fois les
  variables héritées. L2 les corrige, test à l'appui.
- La borne de 20 modes par collection porte sur les modes de la parente, et ne
  limite plus le nombre de marques.

### 7.4. Cas écartés et constats

Un axe écarté garde `com.ucm.modes` sur ses feuilles dans `tokens.json`, et
n'entre pas dans le résolveur. Les messages sont rédigés avec la skill
`rediger-diagnostics-ucm` pendant L2.

| Cas | Traitement |
|---|---|
| deux collections à modes ont le même préfixe | écarter les deux axes ; demander de renommer une collection |
| le préfixe de la collection est vide | écarter l'axe ; demander de renommer la collection |
| un nom de mode normalisé est vide ou entre en collision | écarter l'axe ; réutiliser le constat de collision |
| `defaultModeId` ne désigne aucun mode déclaré | écarter l'axe, sans inventer de défaut |
| dans un mode, un alias vise une feuille d'un autre `$type` que la feuille qui le porte | garder l'axe ; constat qui nomme la variable, le mode et la cible, et demande de lier une variable du même type (section 12) |
| deux extensions d'une même parente ont le même nom normalisé | écarter l'axe de marque ; demander de renommer une extension |
| une collection entre en collision avec `ucm-extensions` ou avec le nom d'un axe de marque | écarter la collection ; demander de la renommer |
| une extension porte le nom normalisé de sa parente | écarter l'axe de marque ; demander de renommer l'extension |
| la parente d'une extension vient d'une bibliothèque publiée | écarter l'axe de marque ; constat « parente distante » |
| une feuille à modes est `string` ou `boolean`, ou un de ses modes vaut `null` | la garder hors du résolveur ; constat, qui demande le scope `FONT_FAMILY` seul pour une famille |

Des préfixes imbriqués sont admis : un modifier définit ses feuilles par leur
chemin complet. Deux chemins identiques restent tranchés avant la construction
de l'arbre.

### 7.5. Compatibilité et publication

`tokens.json` ne change pas, ni sa marque, ni `TOKENS_FORMAT_VERSION`. Un kit
publié et Style Dictionary ignorent `tokens.resolver.json`.
`docs/COMPATIBILITE.md` reçoit une classe 12 : ajout d'un fichier facultatif à
côté de `tokens.json` ; aucun numéro ; un dépôt déjà fusionné reste lu, sans axe
générable jusqu'au réexport. Le résolveur porte le numéro de la norme,
`version: "2025.10"`. Le kit le classe comme il classe `com.ucm.formatVersion` :
une autre valeur refuse la génération.

Le plugin publie les deux fichiers dans un seul commit et une seule pull request.
Le travail dépasse l'en-tête de la pull request :

- `publishArtifact` écrit aujourd'hui un fichier par un PUT (`github.ts`). Il
  passe par l'API Git Data : un arbre qui porte les deux fichiers, ou la
  suppression du résolveur quand le réexport n'a plus d'axe, puis un commit.
- L'immobilité se juge sur la paire, sur la branche de base et dans les pull
  requests d'export ouvertes (`lireAvantEcriture`, `exportsEnVol`).
- `TokensExport` rend un fichier ; il rend la paire, et le téléchargement local
  livre les deux fichiers.
- L'invariant de `AGENTS.md` « une pull request par artefact » devient « une
  pull request par export ». L'en-tête de la pull request annonce les deux
  chemins, la version du format de tokens et celle du résolveur.

### 7.6. Tests et documentation

- `exportTokens.test.ts`, sur `fichierDeVariables.ts` étendu : défaut qui n'est
  pas le premier mode, préfixe à plusieurs segments, préfixes imbriqués,
  préfixes égaux écartés, segment vide, mode vide, collision hors défaut, alias
  de type différent dans un mode, parente à deux modes et deux extensions dont
  une de second niveau, parente à un mode, collision avec `ucm-extensions`,
  extension homonyme de sa parente, nom d'extension à plusieurs segments,
  chaîne de `parentModeId`, parente distante, variables héritées comptées une
  fois, feuille à modes `string`, `boolean` ou `null` gardée hors du résolveur,
  aucun résolveur sans axe.
- `conformiteResolver.test.ts` : chaque résolveur exporté est valide contre le
  schéma `2025.10`, figé dans `packages/kit/schema/dtcg-2025.10/` avec son
  empreinte et publié avec le kit, qui valide à l'exécution. Il est orthogonal,
  et sa résolution par défaut égale `tokens.json` résolu.
- Tests de `github.ts` : commit unique par l'API Git Data, immobilité sur la
  paire dans la base et dans une pull request ouverte, suppression du résolveur,
  téléchargement des deux fichiers.
- Interopérabilité : si une version publiée de Terrazzo lit le résolveur, un test
  passe l'export à cette version exacte et compare sa résolution de chaque
  contexte à `resoudreContexte`. Sinon le relevé de L2 le dit, et la preuve reste
  le schéma.
- `styleDictionary.test.ts` reste inchangé : il prouve que `tokens.json` se lit
  toujours seul.
- `docs/FORMAT.md` partie 2, `packages/plugin/SPEC.md` partie 2,
  `docs/CHANGELOG-FORMAT.md`, `AGENTS.md` : invariants sur l'orthogonalité,
  l'égalité du contexte par défaut et de `$value`, et le groupe réservé.

## 8. Le modèle de modes du kit

**Résout** le cône (P2) et les axes d'un composant (P15).

Modules `packages/kit/src/lecteurs/resolver.mjs` et `modes-tokens.mjs`, types
dans `index.d.mts`, exportés par `@ucm-kit/core/lecteurs`. Ils ne produisent
aucun CSS.

| Fonction | Sortie |
|---|---|
| `lireResolver(chemin)` | le document, ses sources chargées et `constats` : schéma `2025.10` figé dans le kit, `$ref` résolus depuis le dossier du résolveur, pointeurs internes |
| `resoudreContexte(resolver, entree)` | le document de tokens d'un contexte, selon l'algorithme du module : entrée validée, fusion dans l'ordre de `resolutionOrder`, alias résolus après fusion |
| `axesDuResolver(resolver)` | `{ axes: [{ nom, modes, defaut, feuilles }], constats }` |
| `conesDesAxes(resolver, axes)` | `Map<chemin, Set<axe>>` : les axes dont le cône contient chaque feuille |
| `axesDuContrat(contrat, contratsParNom, cones)` | `{ axes, constats }` : références directes et composition transitive ; une dépendance absente ou ambiguë empêche de conclure |

Règles :

- Le kit lit et résout tout résolveur conforme au module. La génération CSS
  exige en plus la forme que l'export produit : les ensembles d'abord, puis des
  modifiers orthogonaux qui ont chacun un `default`. Elle refuse un autre
  résolveur en nommant la règle enfreinte.
- Une différence entre la résolution par défaut du résolveur et la résolution de
  `tokens.json` produit un constat bloquant pour la génération.
- Un document de tokens sans résolveur n'a aucun axe générable. `ucm guide` le
  dit, et `ucm tokens css` écrit la base seule.
- Le graphe inverse des alias de la base et de tous les contextes se construit
  une fois ; chaque couple `(feuille, axe)` se propage une fois. Borne
  `O(A × (V + E))` en temps. Le cône est conservateur.
- Les noms de modes sont lus dans des `Map` : `__proto__` reste une donnée.
- Alias manquants, valeurs `null` et cycles restent des constats explicites.
- `axesDuContrat` relève les références par `collecterReferences` et
  `sansEchantillon` (`references-token.mjs`), comme le contrôle du repository.

Tests `packages/kit/tests/resolver.test.mjs` et `modes-tokens.test.mjs`, sur des
documents synthétiques : exemples de la norme, `$ref` vers un fichier et vers un
pointeur, modifier sans défaut, entrée inconnue ou manquante, ensemble placé
après un modifier, résolveur non orthogonal, deux et trois axes croisés dans les
deux sens, défaut non premier, nom accentué, `__proto__`, cycle, jetons
synthétiques d'une collection étendue, contrat touché par une dépendance de
dépendance, dépendance absente, doublon de nom, cycle de composition.

`resoudreContexte` sert d'oracle au harnais de la section 10.6.

## 9. L'attribut de chaque axe

**Résout** P5 pour le nommage.

`format/names.ts` reçoit `attributDeMode(axe)` : `data-` suivi du nom rendu par
`tokenCssVariable`, sans ses deux tirets initiaux. `color-brand-tokens` donne
`data-color-brand-tokens`. L'invariant de `AGENTS.md` sur les projections de
nom la nomme.

`ucm.config.json` reçoit une section facultative :

```json
{
  "components": "src/components",
  "tokens": "src/tokens/tokens.json",
  "implementation": "{dir}/{id}.tsx",
  "modes": { "color-brand-tokens": "data-brand" },
  "css": { "fontFamilyFallback": "sans-serif" }
}
```

- `css.fontFamilyFallback`, facultatif, est ajouté après chaque famille que la
  feuille CSS écrit (section 10.4). Le repli est un choix du repository.
- Un axe absent prend `attributDeMode(axe)`.
- Une valeur est `data-` suivi de lettres Unicode minuscules, chiffres ou
  tirets, avec au moins une lettre ou un chiffre.
- Deux axes partagent un attribut si leurs listes de modes sont égales : un
  clair et sombre réparti sur plusieurs collections se pose par un seul
  attribut. Deux axes aux listes différentes sur le même attribut sont refusés
  après application des défauts.
- Une clé qui ne nomme aucun axe est refusée par les commandes qui lisent les
  deux fichiers.
- `format/configuration.ts` porte la grammaire, `configuration.test.mjs` les
  refus. Une CLI antérieure ignore la section, comme toute clé inconnue.

## 10. `ucm tokens css`

**Résout** P1, P2 et P3 sur le web, et P6 par construction.

```sh
ucm tokens css --out src/generated/tokens.css
```

### 10.1. Entrées et effet chez le consommateur

- Le fichier de tokens de la configuration, en état `courante` ou `ancienne`, et
  le résolveur à côté s'il existe.
- Les sections `modes` et `css` de la configuration.

Aujourd'hui l'outil du consommateur produit la base et UCM produirait les modes.
Ce partage exige trois choses : que la configuration du consommateur importe
`tokenCssVariable`, qu'un relevé lexical prouve que la base déclare ce que les
modes citent, et que l'application charge les deux feuilles dans le bon ordre.
Une commande qui écrit base et modes dans un seul fichier, nommés par la même
fonction, retire les trois.

| Chez le consommateur web | Avant | Après |
|---|---|---|
| dépendance | Style Dictionary et sa configuration | `@ucm-kit/cli` |
| script de build | `style-dictionary build --config …` | `ucm tokens css --out …` |
| nommage des variables | recopié dans la configuration | aucun |
| feuilles importées | une, puis deux avec les modes | une |

Une plateforme autre que le web garde son outil : `tokens.json` et le résolveur
restent lisibles par tout outil DTCG.

Un fichier sans résolveur produit la base seule, code 0. Sans fichier de tokens,
la commande écrit une feuille vide qui le dit en commentaire et rend 0 : un
repository vidé pour rejouer la recette garde un build qui passe. Une
invocation ou une configuration invalide produit le code 2 ; un refus sur les
données ou le CSS, le code 1. La sortie s'écrit après validation, par
remplacement du fichier terminé ; un échec conserve la sortie précédente.
`--out` est obligatoire et ne désigne jamais une entrée.

### 10.2. Règles émises

Pour une feuille `f` et un mode `m` de son propriétaire, `expr(f, m)` est la
valeur de `f` dans `m` ; pour une feuille sans propriétaire, `expr(f)` est sa
`$value`. Un alias `{p}` s'écrit `var(tokenCssVariable(p))`, un littéral selon la
section 10.4.

**Base.** Une règle `:root` déclare chaque feuille dans le contexte par défaut :
`var()` pour un alias, la section 10.4 pour un littéral. Elle précède les règles
de mode dans le fichier. Sur `<html>`, `:root` et un attribut ont la même
spécificité : l'ordre du fichier décide, et UCM le fixe.

Pour chaque axe `a`, dans l'ordre de `resolutionOrder` :

1. **Une règle par mode** `m`, défaut compris, sur `[attribut(a)="m"]` : chaque
   feuille dont `a` est propriétaire, `expr(f, m)`.
2. **Une règle commune** sur `:is([attribut(a)="m1"], …, [attribut(a)="mk"])` :
   chaque autre feuille du cône de `a`, `expr(f, defaut(b))` si un autre axe `b`
   en est propriétaire, `expr(f)` sinon. Ces expressions ne dépendent pas du
   mode de `a`. `:is()` prend la spécificité de son argument le plus spécifique.
   Un sélecteur `[attribut(a)]` sans valeur redéclarerait le défaut de `b` sous
   un mode inconnu.
3. **Croisement.** Pour chaque feuille `f` dont `b` est propriétaire et qui
   appartient au cône de `a`, et pour chaque mode `n` de `b` :
   `@scope ([attribut(b)="n"]) { :where(:scope, :scope *):is([attribut(a)="m1"], …) { f: expr(f, n); } }`.
   Les déclarations d'un même couple `(b, n)` partagent un bloc.

Toutes les règles ont la spécificité `(0,1,0)`. À origine, importance, couche et
spécificité égales, la proximité départage ; une règle sans portée a une distance infinie
([CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort)). Deux
attributs sur le même élément : la racine du `@scope` est l'élément, distance 0,
et le croisement l'emporte. La feuille CSS se charge hors couche et sans
`!important`. `@scope` est Baseline depuis Firefox 146, Chrome
118 et Safari 17.4. Un attribut dont la valeur est inconnue n'active aucune
règle : il laisse le mode valide hérité.

Chaque feuille a un seul propriétaire : un troisième axe se traite par
croisements deux à deux. Cet argument suppose des contextes valides, des alias
sans cycle actif et le profil de la section 10.5 ; L0 le prouve.

Taille : Σ_a (|possédées_a| × M_a + |cône_a − possédées_a|), plus les
croisements. La commande imprime le nombre de règles et d'octets.

Sortie attendue sur le corpus :

```css
/* Généré par ucm tokens css depuis src/tokens/tokens.json et tokens.resolver.json. Relancer la commande plutôt que modifier ce fichier. */
:root {
  --color-brands-marque1-primary-500: color(srgb 0.07 0.31 0.62 / 1);
  /* … une déclaration par feuille … */
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

Sur le corpus, chaque règle de mode déclare 10 feuilles et la règle commune 50.

### 10.3. Exemple de croisement

`theme.blue` et `theme.red` ont les modes `light` et `dark` ; `brand.primary`
vaut `{theme.blue}` en `a` et `{theme.red}` en `b` ; `button.bg` vaut
`{brand.primary}`.

```css
[data-theme="dark"] { --theme-blue: …; --theme-red: …; }
:is([data-theme="light"], [data-theme="dark"]) {
  --brand-primary: var(--theme-blue);   /* défaut de brand */
  --button-bg: var(--brand-primary);
}
@scope ([data-brand="b"]) {
  :where(:scope, :scope *):is([data-theme="light"], [data-theme="dark"]) { --brand-primary: var(--theme-red); }
}
```

Sous `<div data-brand="b"><section data-theme="dark"><button>`, la règle
`@scope` l'emporte sur la règle commune : `--brand-primary` vaut le rouge
sombre, et `--button-bg` se recalcule sur la section.

### 10.4. Littéraux

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
| `$value: null`, un alias dont l'export n'a pas trouvé la cible | aucune déclaration ; la feuille est nommée sur la sortie d'erreur, sans changer le code |
| toute autre forme | refus, code 1, qui nomme la feuille et le mode |

Un alias de tout type s'écrit `var()`. Structure, nombres finis, unités et bornes
des courbes sont validés avant la sérialisation. La table couvre les six types
que `dtcgType` produit (`exportTokens.ts`) et `fontFamily`, que le kit déclare.

### 10.5. Contrôles

Code 1, sans sortie remplacée, si :

- deux chemins de tokens distincts donnent le même nom CSS (`a.b-c` et `a-b.c`) ;
- un alias émis cite une feuille absente, une feuille sans déclaration ou un
  cycle actif ;
- le résolveur n'a pas la forme de génération de la section 8, ou un constat de
  cette section est bloquant.

Base et modes sortent du même fichier, nommés par `tokenCssVariable` : une
variable citée sans être déclarée ne peut pas se produire, et aucun relevé de CSS
n'est nécessaire. L'intégration s'engage à ne pas redéclarer les tokens ailleurs.
`ucm guide` imprime la mise en place : dépendance, commande, import CSS.

### 10.6. Déterminisme, tests et preuve de cascade

La sortie ne dépend que des entrées. Tests `packages/cli/tests/tokens.test.mjs` :
corpus synthétique, fichier sans résolveur, croisements dans les deux sens et à
trois axes, jetons synthétiques d'une collection étendue, défaut non premier,
littéraux de chaque type en base et en mode, repli de famille, chaque refus avec un cas voisin accepté
(noms non ASCII, cycle jamais actif), attribut de configuration, sortie
identique sur deux exécutions, conservation de la sortie sur erreur.

Les tests du générateur ne prouvent pas le rendu. L0 fournit un harnais de
navigateur conservé, avec un oracle indépendant : résoudre le graphe
synthétique dans le contexte effectif de l'élément et comparer aux valeurs
calculées. Il passe dans les trois navigateurs en L0 et à la recette, puis dans
Chromium seul sur la commande empaquetée avant chaque publication.

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

Le relevé de L0 joint le harnais, la version de chaque navigateur, les
entrées, le CSS émis et les résultats.

## 11. La convention runtime

**Résout** P5 pour l'usage.

- **Poser.** Un attribut sur n'importe quel élément : `data-brand="marque-2"`.
  Le mode vaut pour ses descendants.
- **Revenir au défaut.** Poser le nom du défaut. Retirer l'attribut rend le mode
  hérité.
- **Choisir le mode.** L'application en décide (compte, déploiement, préférence,
  rendu serveur) et connaît donc le mode qu'elle pose.
- **Rendu hors CSS** (canvas, graphique) : lire la valeur calculée de la
  variable sur l'élément, jamais `tokens.json`.
- **Portail.** Reproduire les axes effectifs sur le conteneur de destination.
- **Iframe.** Charger la feuille dans son document et y poser les axes.
- **Shadow DOM.** Hors garantie initiale.

Un composant n'expose ni marque ni thème en prop, ne lit pas le mode pour
choisir une référence, et ne déclare aucune variable de token.

## 12. Le type d'un alias dans chaque mode

**Résout** P7.

Une cible d'alias porte, dans chaque mode, le `$type` de la feuille qui la cite.
L'export le constate (section 7.4) ; `axesDuResolver` rend un constat bloquant pour
la génération ; `typography-token-types.mjs` refuse une référence typographique
dont la chaîne traverse une feuille en écart. Sous cette règle, toute chaîne
d'alias aboutit au même type dans tout contexte : le parcours de `$value` reste
exact et aucun parcours par contexte n'est nécessaire.

Tests de `typography-token-types.test.mjs` : écart dans un mode non défaut
refusé avec le nom de la feuille et du mode, cas voisin sans écart accepté. Le
test de l'écart échoue avec le lecteur actuel.

## 13. Les modes fixés dans un composant

**Instruit** P8.

**L6, mesure.** Un script en lecture seule, par le serveur MCP Figma si le
mainteneur l'autorise, relève sur le fichier du design system les calques de
composants publiés dont `explicitVariableModes` n'est pas vide, en distinguant
la racine et les calques internes, et les variables `BOOLEAN` et `STRING` à
plusieurs modes liées à `visible` ou `characters`. Chaque cas est situé :
calque, collection, mode fixé, mode hérité, liaison, différence de rendu,
représentation actuelle dans le contrat.

**L7, conditionnel.**

| Endroit du mode | Traitement |
|---|---|
| page, section ou cadre qui contient le composant | contexte de présentation, exclu du contrat |
| racine du composant ou du component set | décision sur les cas relevés |
| calque interne ou instance d'une dépendance | candidat : champ `modes` sur le slot de la vue exacte, classe 2 de compatibilité |

Si un mode fixé change le rendu portable, son omission ne se présente pas comme
une couverture portable.

## 14. Les aides à l'implémentation

**Résout** P10 à P15.

### 14.1. Sens et écriture

`CONCEPT.md` donne un propriétaire à chaque information. Une aide en réunit
deux, que le plan sépare :

| Part | Contenu | Propriétaire | Change avec |
|---|---|---|---|
| sens | ce que la caractéristique oblige à rendre : un contour se dessine hors du flux, du côté que dit `align` ; une clé absente n'est pas écrite ; une matrice ne se reconstitue pas par cartésien | UCM | la version du format |
| écriture | comment le repository rend ce sens : `outline` et `outline-offset`, une classe utilitaire, un modificateur SwiftUI ; le helper de résolution d'une référence ; le gabarit d'un composant | repository | la décision du repository |

Un repository remplace une écriture et ne touche jamais un sens : les deux ne
sont pas dans le même fichier. Un ancrage est une aide dont UCM ne fournit pas
d'écriture. Les préférences de stack et les gabarits sont l'écriture de l'aide
`composant`, rangée dans `.ucm/conventions.md`.

### 14.2. Caractéristiques et catalogue

`packages/kit/src/lecteurs/caracteristiques.mjs` exporte `CARACTERISTIQUES`, la
liste fermée des identifiants, et `caracteristiquesDuContrat(contrat,
contratsParNom, cones)`, qui rend l'ensemble qu'un contrat présente. La
fonction lit les champs du contrat et de ses vues exactes, jamais le nom du
composant.

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
| `etats` | un état autre que `default` | `etats`, ancrage `focus-clavier` si un sélecteur de focus est publié |
| `composition` | `composes` | `composition`, ancrage `comptage-dependances` |
| `echantillon` | `samples` | `echantillon` |
| `modes` | `axesDuContrat` rend au moins un axe | `modes`, ancrages `chargement-feuilles`, `portee-mode` |
| `couverture-partielle` | `meta.coverage.portable` vaut `partial` | `couverture-partielle` |

Le catalogue publié est `packages/cli/aides/<aide>.md`, un fichier par aide :

```markdown
---
aide: contour-ring
quand: contour-ring
---

## Sens

Un `ring` se dessine hors du flux et ne déplace aucun voisin. `align` dit de
quel côté de la boîte : `outside` à l'extérieur, `inside` à l'intérieur,
`center` à cheval. Les propriétés à écrire sont celles de
`rendering.roles.ring`, jamais une propriété déduite d'un nom.

## Écriture par défaut

`outline: <width> solid <color>` ; `outline-offset` vaut `0` pour `outside`,
moins la largeur pour `inside`, moins la demi-largeur pour `center`. Une largeur
par côté se rend en `box-shadow`. Un `outline` à décalage négatif se peint
au-dessus des enfants.
```

Un ancrage n'a pas de section « Écriture par défaut ».

Lois tenues par `packages/cli/tests/aides.test.mjs` :

- chaque identifiant de `CARACTERISTIQUES` est le `quand` d'au moins une aide ;
- chaque `quand` est un identifiant de `CARACTERISTIQUES` ;
- chaque aide a une section « Sens » ;
- un contrat fabriqué qui porte chaque champ de la table rend la caractéristique
  attendue, et un contrat qui ne le porte pas ne la rend pas ;
- chaque couple (définition, propriété) du schéma publié,
  `ucm-contract.schema.json`, figure dans la table des champs qu'exporte
  `caracteristiques.mjs`, ou dans `SANS_AIDE`, une liste fermée qui donne pour
  chaque champ la raison de son absence d'aide (`meta.figma`, identités Figma).
  Le parcours suit les `$ref`, marque les définitions visitées à cause des deux
  définitions récursives, et note `*` pour une clé de dictionnaire ;
- pour un champ qui déclenche une aide selon sa valeur (`layout`, rôle de
  contour, `position`), chaque valeur de l'énumération du schéma figure dans la
  table ou dans `SANS_AIDE`.

Mesuré : le schéma déclare 259 propriétés sur 68 définitions, avec 85 `$ref`.

Un champ ajouté au format sans aide fait ainsi échouer la suite : la dernière loi
lit le schéma dérivé de `types.ts`, et non la table écrite à la main.
`registrePortableDocuments.test.ts` ajoute les aides à `PORTABLES`. Les sens ne
citent aucune technologie ; les écritures par défaut sont en CSS, la seule stack
du consommateur réel, et un repository d'une autre plateforme les remplace.

Le contenu des aides vient de la skill `consommer-contrat` actuelle, §1 à §6,
découpée par caractéristique. La décision sur `ring` (section 2) aligne `rendering.roles.ring` sur l'écriture
par défaut de `contour-ring`, et `docs/FORMAT.md`, section 8, retire la
recommandation du repli.

### 14.3. `SKILL.md` publié

`packages/cli/skills/implementer-depuis-un-contrat/SKILL.md`, moins de 60
lignes : lancer `ucm guide`, appliquer chaque aide imprimée, rendre un ancrage
sans réponse sous forme de question au développeur, rapporter un manque
du contrat au lieu de le compenser. L'ordre d'autorité : le contrat décide des
données de rendu, le sens de l'aide décide de l'obligation, l'écriture décide de
la forme du code. Il ne contient aucune règle de format : elles sont dans les
sens.

### 14.4. Conventions du repository

Le repository écrit toutes ses réponses dans un seul fichier,
`.ucm/conventions.md`, que `ucm init --agents` crée. Personnaliser une aide
revient à y ajouter une section : aucune commande n'est nécessaire.

```markdown
---
defauts: non
controles:
  contour-ring: npm run lint:css
---

Stack : React 19 et CSS Modules. Un composant par dossier.
Gabarit : `.ucm/gabarits/composant.tsx`.

## contour-ring

Classe `ring` de `src/styles/contours.module.css`, qui reçoit `--ring-width`,
`--ring-color` et `--ring-offset`.

## icone-composant

`src/Icone.tsx`, qui reçoit `nom` et `taille`.
```

- **Le texte d'en-tête**, avant la première section `##`, est l'écriture de
  l'aide `composant` : stack, structure de fichier, gabarit, bonnes pratiques.
  `ucm guide` l'imprime avant toute aide, et il l'emporte sur les écritures par
  défaut.
- **Une section `## <aide>`** remplace l'écriture par défaut de cette aide, ou
  répond à un ancrage. Sans section, l'écriture par défaut s'applique.
- `defauts: non`, facultatif dans l'en-tête YAML : `ucm guide` imprime le sens
  seul des aides sans section, et l'agent les transcrit selon le texte
  d'en-tête, sans question au développeur. Un repository dont la stack n'est pas
  CSS ne reçoit ainsi aucune écriture CSS.
- `controles`, facultatif dans l'en-tête YAML, associe un identifiant d'aide à
  une commande du repository, par exemple une règle de lint qui refuse `border`
  sur un contour. `ucm guide` reprend la commande de chaque aide imprimée avec
  les contrôles.
- Sans `defauts: non`, `ucm guide` imprime les écritures par défaut sous une
  règle écrite une fois : le texte d'en-tête et les sections l'emportent sur une
  écriture par défaut.
- **Lecture.** `ucm guide` lit le fichier en CommonMark, dans cet ordre : retrait
  des commentaires HTML, puis découpage aux titres `##` situés hors des blocs de
  code. Un titre est l'identifiant exact d'une aide du catalogue. Un titre
  inconnu, une section en double, une section `## composant` et une clé inconnue
  de `controles` sont imprimés en tête de la sortie, avant le contrat.
- `ucm guide` n'imprime que l'en-tête et les sections des aides que le contrat
  emploie.
- `ucm aides` liste le catalogue : identifiant, caractéristique qui déclenche
  l'aide, origine de l'écriture (UCM, conventions, ancrage sans réponse).
  `ucm aides <aide>` imprime son sens et son écriture par défaut, à copier dans
  une section.
- Le fichier que crée `init` contient un en-tête vide et, en commentaire HTML, la
  marche à suivre et un exemple de section. `ucm guide` retire les commentaires.
- Une section ne contient ni référence de token, ni valeur de contrat : elle dit
  comment écrire, jamais quoi. En recette, conventions et gabarit sont admis
  s'ils existent avant la reconstruction et ne sont extraits d'aucun composant
  reconstruit.

`ucm check` ne lit pas les conventions.

### 14.5. `ucm guide <contrat>`

Une commande, une sortie, dans l'ordre :

1. `SKILL.md`, puis `.ucm/conventions.md` s'il existe ;
2. l'extraction : `meta.contractVersion`, `meta.coverage`, `meta.diagnostics`,
   `props`, axes de variantes, `structure`, `stateModel`, `intent`, `variants`
   avec leur renvoi de vue, chaque vue utilisée une fois, chaque entrée de
   catalogue de second niveau une fois, les entrées utilisées d'`icons`,
   `textStyles` et des définitions de liaison, l'API publique et l'échantillon
   de chaque dépendance ; les renvois restent des renvois ;
3. pour chaque caractéristique présente, chaque aide : son sens, puis sa
   section des conventions ou, sauf sous `defauts: non`, l'écriture par défaut ;
4. les ancrages sans section, sous « non tranché : demander au développeur » ;
   les sections qui ne nomment aucune aide du catalogue ;
5. les axes qui touchent le contrat, composition comprise, les contextes à
   vérifier comme couverture conservatrice, leur nombre et leurs facteurs, et la
   mise en place des modes ;
6. les icônes que le contrat réclame, par la lecture d'`ucm icons` ;
7. les commandes de `controles` des aides imprimées ;
8. les octets de chaque partie.

**Portée.** `ucm guide` sert tout contrat que le schéma accepte, quel que soit le
composant. La sélection des aides lit les champs présents et jamais un nom. La
loi du schéma de la section 14.2 refuse un champ du format sans aide. Trois
limites restent :

- ce que le contrat ne décrit pas (comportement, accessibilité, événements)
  relève des conventions et de la relecture ;
- ce que l'export n'a pas su décrire arrive par `meta.diagnostics` et
  `meta.coverage`, que la sortie imprime ; l'agent le rapporte au lieu de
  l'inventer ;
- l'application d'un sens reste un travail de l'agent. La parité de
  l'adaptateur, `ucm check` et les commandes de `controles` le vérifient ; la sortie
  de `guide` ne le prouve pas.

- L'extraction réutilise `vueExacteDuVariant` et `compositionsExactesDuVariant`
  (`variant-views.mjs`). Elle ne recopie aucune vue dans un variant et ne
  fusionne rien.
- Le contrat est lu au développement, comme par `ucm check`.
- L'énumération détaillée des contextes exige une option et une limite ; une
  liste tronquée le dit.
- `--out <fichier>` écrit la sortie dans un fichier au lieu du terminal.
- La commande compare le pin de chaque relais à sa version et nomme la ligne à
  changer.
- Codes : 0 ; 2 pour une configuration refusée, un contrat illisible ou absent ;
  1 pour un graphe de composition ou de tokens incohérent. La version est
  classée avant la lecture des tokens.

Tests `packages/cli/tests/guide.test.mjs`, sur un repository temporaire avec deux
contrats dont l'un compose l'autre : vue partagée imprimée une fois, aide
imprimée seulement si sa caractéristique est présente, section des conventions
préférée au défaut, en-tête imprimé avant les aides, section d'une aide absente
du contrat non imprimée, `defauts: non` qui retire les écritures par défaut sans
poser de question, ancrage sans section listé, section inconnue signalée,
commande de `controles` reprise, commentaires retirés, `##` dans un bloc de
code ignoré, titre inconnu et section en double imprimés en tête, relais en retard, dépendance
manquante, cycle, version future, contextes au-delà de la limite.

### 14.6. Découverte par l'agent

`ucm init --agents` écrit, sans écraser un fichier existant, deux relais
identiques : `.agents/skills/ucm-implementer/SKILL.md`, lu par Codex, et par
Cursor et OpenCode selon la table de
[vercel-labs/skills](https://github.com/vercel-labs/skills), et
`.claude/skills/ucm-implementer/SKILL.md`, lu par Claude Code. Il écrit aussi
`.ucm/conventions.md` (section 14.4) et, quand un adaptateur de stack est
installé, son gabarit (section 14.9).

```markdown
---
name: ucm-implementer
description: Implémenter ou modifier un composant décrit par un fichier *.contract.json. Charger avant d'écrire le code du composant.
---

Lancer `npx --yes @ucm-kit/cli@<version> guide <chemin du contrat>`, puis suivre sa sortie.
```

- La version est celle du paquet qui écrit, comme dans le workflow qu'`init`
  écrit déjà. Le commentaire d'en-tête d'`init.mjs`, qui dit n'écrire « aucun
  numéro de version », vise la version du format ; L4 le précise.
- L'activation dépend de la `description`, qui nomme le déclencheur.
- Le contenu vit dans le paquet : une montée de version change le pin des deux
  relais et rien d'autre.
- `lireArgumentsInit` accepte une option sans valeur.
- Aucune documentation n'écrit `npx ucm`.

### 14.7. Deux skills

| Skill | Contenu | Domicile |
|---|---|---|
| `implementer-depuis-un-contrat` | section 14.3, et le catalogue d'aides | `packages/cli/skills/` et `packages/cli/aides/`, publiés : `files` de `@ucm-kit/cli` les reçoit |
| `consommer-contrat` | le protocole de recette : composant jetable, fichier supprimé avant de commencer, aucun test, contrôles limités, rapport des manques ; sources admises : la sortie de `ucm guide` et les conventions existantes avant la reconstruction ; le gabarit seulement dans l'épreuve qui le mesure | `.agents/skills/consommer-contrat/SKILL.md`, en-tête sur deux lignes |

### 14.8. Mesure du coût

Deux conditions : la skill actuelle seule, puis le relais et `ucm guide`, sans
gabarit dans l'une comme dans l'autre. Trois
reconstructions par condition, sur `Alert` puis sur `Button`, même modèle et
même effort. Relevés : tours, contexte moyen, trafic facturé, fichiers ouverts
par l'agent, octets de chaque partie de la sortie de `guide`. Critère fixé avant
la mesure : la seconde condition prend moins de tours et moins de trafic, sur
les deux composants, en médiane des trois passes. La variance d'un agent rend
une comparaison passe par passe aléatoire. La fidélité ne recule pas : `ucm
check` reste vert, et la comparaison à Figma ne relève pas plus d'écarts que
dans la première condition, sur une liste fermée de propriétés fixée avant la
mesure. Un coût plus bas obtenu avec plus d'écarts ne valide pas la
seconde condition.

### 14.9. Gabarit de composant

**Résout** l'homogénéité des composants écrits par des personnes et des agents
différents.

Un gabarit dépend de la stack : il n'entre ni dans `@ucm-kit/cli` ni dans le
kit. Chaque adaptateur de stack en publie un, et
`@ucm-kit/adapter-typescript` publie le premier :

- `gabarits/exemple.contract.json`, un contrat synthétique qui présente les
  caractéristiques les plus courantes : props, variants, vue exacte, états,
  composition, icône, contour `ring`, dimensions par taille ;
- `gabarits/composant.tsx`, le composant complet qui implémente ce contrat,
  avec en tête de fichier l'ordre suivi : imports, types générés, table
  littérale des variants, rendu de la vue, résolution des états, styles.

Le gabarit est écrit en React, la stack que la parité suppose déjà en comptant
les compositions dans le JSX. Ses styles suivent les écritures par défaut. Un
repository qui écrit ses styles autrement remplace cette partie dans sa copie.

Tests de l'adaptateur :

- la parité du gabarit contre son contrat ne relève aucun écart ;
- le contrôle de types passe ;
- `ucm guide` sur le contrat d'exemple imprime chaque aide que le gabarit
  illustre.

Ces tests couvrent ce que la parité mesure : props, types booléens, unions
d'enum, nombre de compositions. Un changement du format qui touche les contours,
les dimensions ou les styles ne les fait pas échouer. Le gabarit se relit alors à
la montée de version du contrat, comme les aides.

`ucm init --agents` copie les deux fichiers dans `.ucm/gabarits/` quand
`chargerAdaptateur` trouve un adaptateur, sans écraser. L'adaptateur déclare le
chemin de ses gabarits dans l'objet qu'il exporte. Le texte d'en-tête des
conventions désigne le gabarit. La copie appartient ensuite au repository, qui
la modifie librement. Un repository sans adaptateur écrit son propre gabarit et
le désigne de la même façon.

Le gabarit montre une forme et ne prouve rien sur un autre composant. La parité
de l'adaptateur contrôle la surface publique et la composition. Les commandes de
`controles` contrôlent ce que le repository choisit d'outiller. Le reste relève
de la relecture.

En recette, le gabarit est une seconde source à côté du contrat. Il n'entre donc
ni dans la reconstruction à froid, ni dans la mesure de la section 14.8 : une
épreuve à part le mesure (section 15).

### 14.10. Un développeur sans agent

La sortie de `ucm guide` est du Markdown. Un développeur qui implémente à la main
suit le chemin de l'agent :

1. lancer `ucm guide src/components/Button/Button.contract.json --out guide.md`,
   puis lire `guide.md` ;
2. écrire le composant en partant du gabarit que désignent les conventions ;
3. lancer `ucm check`, puis les commandes de `controles` que le guide liste.

Le designer ne change rien : il exporte depuis Figma et lit le rapport de la
pull request.

`ucm --help` et `packages/cli/README.md` listent les commandes :

| Commande | Effet | Ajoutée par ce plan |
|---|---|---|
| `ucm init` | installe la configuration, le workflow et les fichiers d'éditeur | non |
| `ucm init --agents` | ajoute les relais, `.ucm/conventions.md` et, avec un adaptateur, le gabarit | oui |
| `ucm check` | contrôle les contrats et rend le rapport | non |
| `ucm icons` | liste les icônes que les contrats réclament | non |
| `ucm tokens css` | écrit la feuille CSS des tokens, base et modes | oui |
| `ucm guide <contrat>` | imprime ce qu'il faut pour implémenter ce contrat | oui |
| `ucm aides [aide]` | liste le catalogue des aides, ou en imprime une | oui |

## 15. Recette

Deux passages : un repository temporaire depuis les archives `npm pack` et un
export du plugin local, puis le Playground depuis les versions publiées et le
plugin Community. Le premier réussit avant publication.

**Mise en place dans le Playground, depuis les paquets seuls :**

1. `@ucm-kit/cli` et `@ucm-kit/adapter-typescript` en `devDependencies`,
   versions exactes, la CLI identique au pin du workflow.
2. `ucm.config.json` : `"modes": { "color-brand-tokens": "data-brand" }` et
   `"css": { "fontFamilyFallback": "sans-serif" }`.
3. Scripts `dev` et `build` : `ucm tokens css --out src/generated/tokens.css`
   remplace Style Dictionary ; `style-dictionary.config.mjs` et la dépendance
   `style-dictionary` sont retirés. Style Dictionary ajoutait `sans-serif` aussi
   aux familles restées `string` sous un segment `fontfamily`. La feuille générée
   ne le fait pas, et l'épreuve 1 relève ces feuilles.
4. `src/index.css` : l'import de `tokens.css` ne change pas.
5. `ucm init --agents`, puis `.ucm/conventions.md` : le texte d'en-tête et les
   sections `resolution-token` et `icone-composant` reprennent les réponses du
   tableau de `AGENTS.md`. Le gabarit copié par `init` existe avant toute
   reconstruction.
6. `AGENTS.md`, règle 4 : l'empreinte du produit se limite aux fichiers qu'`ucm
   init` écrit, aux conventions que le repository complète, et à la mise en
   place que les paquets publiés documentent. La ligne « Traduire
   `{chemin.du.token}` » du tableau renvoie à `tokenCssVariable`. La règle 2
   admet la sortie de `ucm guide` et les conventions ; le gabarit n'entre que
   dans l'épreuve 8.

**Épreuves :**

1. `npm run build` passe ; `tokens.css` déclare chaque feuille sur `:root`, puis
   contient deux règles de mode de 10 déclarations et une règle commune de 50.
2. Galerie : bascule de marque sur `<html>`, `Alert` en `marque-2` dans une page
   `marque1`, puis l'inverse ; couleur calculée du fond du bouton dans chaque
   case.
3. Le harnais de L0 rejoue la section 10.6 sur la sortie de la commande
   installée, après le build Vite, dans Chrome, Safari et Firefox.
4. Reconstructions à froid d'`Alert` et de `Button` par le relais et `ucm guide`,
   sans accès à `UCM-Exporter` ; comparaison à Figma dans les deux marques ;
   mesure de la section 14.8 ; activation du relais relevée.
5. Conventions : la section `contour-ring` et le gabarit changent sans toucher
   aux paquets ; une nouvelle reconstruction les suit, et `ucm check` reste vert.
6. Faute volontaire, sur une copie temporaire du repository : un alias de
   `tokens.json` vers une feuille absente fait échouer le build et nomme la
   feuille.
7. Le résolveur exporté est valide contre le schéma `2025.10`, et
   `resoudreContexte` rend pour `marque-2` les valeurs que Figma montre.
8. Gabarit : une reconstruction d'`Alert` part du gabarit copié par `init`, après
   l'épreuve 4 ; ses écarts de forme et son coût se comparent à ceux de
   l'épreuve 4.

Les `.tsx` du Playground ne changent qu'aux épreuves 4 et 5, par la
reconstruction.

## 16. Lots

Les règles de code, de test et de livraison sont celles de
[CONTRIBUTING.md](../../CONTRIBUTING.md). Une preuve de refus comporte un cas
voisin accepté. Une montée de `@ucm-kit/core` entraîne celle de `@ucm-kit/cli` et
de `@ucm-kit/adapter-typescript` ; le noyau part en premier.

| Lot | Contenu | Problèmes | Dépend de | Preuve de sortie |
|---|---|---|---|---|
| L0 | Empreintes du corpus ; harnais CSS, oracle `resoudreContexte`, arbres de la section 10.6 sur la forme factorisée, jetons synthétiques d'une collection étendue ; taille et recalcul sur un fichier synthétique de 20 marques, deux thèmes et un cône de 519 couleurs ; `outline` qui suit `border-radius` ; littéraux `fontFamily` et `string` rendus par les navigateurs | P2, P3, P12 | rien | résultats dans les trois navigateurs, joints au relevé |
| L1 | Kit : `resolver.mjs` (lecture, schéma, résolution par contexte), `modes-tokens.mjs`, `attributDeMode`, sections `modes` et `css` de la configuration, contrôle de type des alias, `caracteristiques.mjs` et sa table des champs | P2, P4, P5, P7, P15 | rien | tests des sections 8, 9 et 12 ; test de la section 12 vu rouge ; support du résolveur par Style Dictionary et Terrazzo revérifié |
| L2 | Plugin : `tokens.resolver.json`, collections étendues et jetons synthétiques, cas écartés et constats, commit à deux fichiers par l'API Git Data et téléchargement des deux fichiers ; rôle `ring` et classe 13 ; classe 12 ; schéma Resolver figé ; `FORMAT.md`, `SPEC.md`, `CHANGELOG-FORMAT.md`, `COMPATIBILITE.md`, `AGENTS.md` | P4, P7, P9, P12 | L1 | tests de la section 7.6 et `semantics.test.ts` ; export local lancé dans Figma par le mainteneur |
| L3 | CLI : `ucm tokens css`, base, forme factorisée et croisements | P1, P2, P3, P6 | L0, L1 | tests de la section 10.6 ; harnais sur la commande empaquetée |
| L4 | CLI : catalogue d'aides et loi du schéma, `SKILL.md`, `ucm guide`, `ucm aides`, `ucm init --agents` avec relais et conventions ; `consommer-contrat` réduite ; `AGENTS.md`, `ROADMAP.md`, `docs/RECETTE.md`, `packages/cli/README.md`, `PISTES-EVOLUTION.md` | P10 à P15 | L1 | `aides.test.mjs`, `guide.test.mjs`, tests d'`init` et d'`aides` ; archive qui contient `skills/` et `aides/` |
| L4b | Adaptateur : gabarit et contrat d'exemple, chemin des gabarits dans l'objet exporté ; copie par `init --agents` | homogénéité | L4 | tests de la section 14.9 ; archive de l'adaptateur qui contient `gabarits/` |
| L5 | Recette des archives, puis Playground | tous sauf P8 | L2, L3, L4, L4b empaquetés ; paquets publiés après le premier passage | épreuves de la section 15 ; critère de la section 14.8 |
| L6 | Mesure des modes fixés | P8 | rien | relevé écrit dans cette note |
| L7 | Conditionnel : traitement des modes fixés | P8 | L6 et décision produit | loi de forme, contrôle croisé contrat et tokens, recette du rendu |

L1, L2 et L4 progressent pendant L0. L3 attend sa preuve de cascade.

## 17. Risques

| Risque | Statut | Parade |
|---|---|---|
| La cascade `@scope` diffère selon le navigateur | à mesurer | L0 avant L3, harnais sur les archives avant publication |
| `@scope` échoue dans un navigateur ou sous le minificateur | à mesurer | repli passé au même harnais : l'attribut pose `--ucm-mode-<axe>`, et `@container style()` sélectionne les croisements, disponible dans les trois moteurs depuis Firefox 151. Une style query interroge le parent, jamais l'élément qui porte l'attribut : deux attributs posés sur le même élément reçoivent donc une règle composée, `[data-brand="b"]:is([data-theme="light"], [data-theme="dark"])`. L0 passe les deux formes au harnais et retient la plus simple qui réussit. La décision « aucune variable d'identité de mode » tombe si L0 retient ce repli |
| Un axe clair et sombre possède presque tout son cône, et la factorisation gagne peu | à mesurer | L0 mesure taille et recalcul à la borne de Figma ; la commande imprime ses statistiques. Au-delà d'un seuil de taille fixé avant la mesure, `ucm tokens contexte` sort du hors-périmètre pour l'axe de marque |
| Le minificateur du consommateur réécrit `@scope` ou `:where(:scope, :scope *)` | à mesurer | épreuve 3 sur le CSS du build Vite |
| Un axe dépasse la borne de modes de Figma | borne externe | en Enterprise, les collections étendues portent les marques sans borne de modes (section 7.3). En Organization, deux collections donnent deux axes aux chemins distincts, et un composant ne cite qu'un chemin : la borne est de 20 marques |
| La norme ne dit pas depuis quel dossier se résout un `$ref` relatif | restriction | résolveur et `tokens.json` dans le même dossier ; le kit résout depuis le dossier du résolveur |
| Aucun outil tiers publié ne lit le résolveur | à revérifier en L1 | `tokens.json` reste lisible seul ; la preuve d'interopérabilité se limite au schéma tant qu'aucun outil publié ne le lit |
| `tokens.json` et le résolveur d'un même export divergent | contrôlé | même pull request ; le kit refuse un contexte par défaut différent de `$value` |
| `valuesByModeForCollectionAsync` ne rend pas les surcharges attendues | à mesurer | simulation de l'API en L2 ; relevé sur un vrai fichier Enterprise dès qu'un utilisateur en fournit un. Jusque-là, la section 7.3 est une garantie sur simulation |
| Le gabarit vieillit par rapport au format | contrôlé | tests de l'adaptateur (section 14.9) |
| Trois pins de la CLI dans le Playground (dépendance, workflow, relais) | accepté | montés dans le même commit ; `ucm guide` nomme un relais en retard |
| Un agent n'active pas le relais | à mesurer | `description` qui nomme le déclencheur ; `AGENTS.md` du Playground désigne le relais ; épreuve 4 |
| Une écriture du repository contredit le sens de son aide | relecture | le sens est imprimé avant l'écriture, et l'agent fait primer le sens sur l'écriture (section 14.3) |
| Un champ du format arrive sans aide | contrôlé | loi du schéma de `aides.test.mjs` |
| La sortie de `guide` dépasse le contrat et la skill actuelle | à mesurer | octets par partie ; renvois conservés |
| Une feuille du repository redéclare un token après la génération | borne d'intégration | engagement de l'intégration, recette de l'application |
| Deux collections à modes ont le même préfixe | restriction | le designer renomme une collection |

## 18. Critères de validation

| Proposition | Condition de clôture |
|---|---|
| résolveur conforme, `tokens.json` inchangé | L2 valide chaque export par le schéma `2025.10` figé ; un kit publié antérieur et Style Dictionary lisent `tokens.json` du même export |
| collections étendues | L0 passe le harnais sur des jetons synthétiques ; L2 sur une simulation de l'API |
| feuille CSS des tokens générée par UCM | épreuves 1 et 6 de la section 15 ; Style Dictionary retiré du Playground |
| gabarit | tests de la section 14.9 |
| type d'alias identique dans tous les modes | L1 refuse l'écart dans un mode non défaut, accepte le cas voisin |
| algorithme CSS factorisé sur deux et trois axes | L0 passe la section 10.6 dans les trois navigateurs ; L3 rejoue sur ses sorties |
| sens et écriture séparés, catalogue par caractéristique | `aides.test.mjs` passe ; épreuve 5 |
| coût de la transcription | critère de la section 14.8 |
| découverte des aides | épreuve 4 : relais activé par Claude Code et par Codex |
| modes fixés | L6 documente les cas ; décision avant L7 |
| rôle `ring` | `semantics.test.ts` et loi de forme : `outline-style` publié |

## 19. Hors périmètre

| Sujet | Raison ou déclencheur |
|---|---|
| `ucm tokens contexte`, document de tokens figé sur un contexte | un repository qui fixe son mode au build, une plateforme autre que le web, ou le seuil de taille de L0 dépassé (section 17). `resoudreContexte` existe dans le kit : la commande n'ajoute que l'écriture du fichier |
| variable d'identité `--ucm-mode-<axe>` | une application qui doit lire le mode effectif d'un élément qu'elle n'a pas posé |
| retrait de `com.ucm.modes` de `tokens.json` | une version 3 du format de tokens, quand plus aucun lecteur publié ne lit cette extension |
| attribut d'axe écrit dans le résolveur ou dans `tokens.json` | ces fichiers servent aussi un build non web ; `ucm.config.json` porte la réponse |
| profils de stack (`profile.json`) | un second repository de la même stack |
| gabarit pour une stack sans adaptateur | l'adaptateur de cette stack |
| génération de composants depuis le contrat | un consommateur de production dont les erreurs de transcription sont mesurées ; contraire à la règle 2 du Playground |
| `ucm doctor`, `init --update` | des fichiers installés qui divergent sans que `ucm guide` le signale |
| `ucm guide --json` | une intégration d'agent qui lit une sortie structurée |
| import d'un export natif de Figma, un fichier par mode (option D de la section 7.1) | un repository dont les tokens ne viennent pas du plugin |
| sélecteur de classe pour un axe | une demande réelle |
| `prefers-color-scheme` et `color-scheme` | le premier axe clair et sombre réel |
| bibliothèque runtime par framework | un besoin qui dépasse la pose d'un attribut |
| contrôles de code (mode figé, variable de token déclarée dans un composant) | un relevé des références dans le code par l'adaptateur |
| contour `border` en couleurs forcées, où `box-shadow` vaut `none` | à ouvrir dans les pistes du format |

Le diff sémantique, `PLAN-DIFF-SEMANTIQUE.md`, reçoit quatre cas : mode renommé,
ajouté ou retiré ; défaut changé ; modifier retiré ; cible d'alias changée dans
un seul mode.
