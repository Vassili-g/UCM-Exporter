# Unified Component Exporter — guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG. Il ne
modifie jamais le document Figma.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) pour le comportement touché ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `src/contract/types.ts` et les tests voisins pour la forme concrète.

La maturité et les priorités vivent dans [ROADMAP.md](./ROADMAP.md). Les idées
non décidées dans [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Carte du code

```text
src/
  code.ts                    routage UI → commandes
  contract/
    exportComponent.ts       orchestration et métadonnées
    componentTree.ts         axes, matrice et wrapper de layout
    layoutNodes.ts           élection du node de layout, une fois par variant
    exportableNodes.ts       parcours de l'arbre, hors dépendances composées
    parsers.ts               propriétés Figma → API publique
    merge*.ts                doc et icônes des règles, rangées sur leur axe
    semantics.ts             vocabulaire sémantique partagé
    extract*.ts              structure, layout, tailles, tokens et règles
    flexLayout.ts            propriétés de flux et avertissements non portables
    slotNames.ts             nommage des slots et calques d'icônes
    composedComponents.ts    dépendances entre composants
    nodeBindings.ts          groupes complets de liaisons Figma
    types.ts                 schéma TypeScript du contrat
  tokens/exportTokens.ts     export DTCG
  variables.ts               index commun, collisions et alias
  utils.ts                   normalisation et identifiant de code
  config.ts                  configuration GitHub locale
  github.ts                  branche, fichier et pull request
  ui/                        interface du plugin
tests/
  test-exports/              petit corpus d’exports réels
```

## Invariants

- Aucune logique liée au nom d’un composant.
- Figma reste traçable après toute normalisation (`figmaName`,
  `figmaLayer`).
- Un enum renommé utilise la même clé dans `props`, `variantAxes` et les arbres
  de variantes.
- Les tokens restent des références et leurs alias ne sont jamais aplatis.
- `normalizeName()` et `indexVariables()` sont communs aux deux commandes.
- Une collision feuille/groupe ou deux chemins identiques sont tranchés avant
  de construire l’arbre ; aucun alias ne doit pointer vers une variable
  rejetée.
- Un composant unifié imbriqué est déclaré dans `composes`. Le critère « ce node
  porte les règles de X » n’existe qu’une fois (`rulesContainerOwner`) : ce qui
  autorise un export et ce qui reconnaît une dépendance sont la même règle. Le
  parent ne réexporte pas ses internes.
- `composes` ne désigne que le calque qui EST l’instance. Un calque qui
  l’enveloppe appartient au contrat parent : il publie son flux et range la
  dépendance dans `children`, comme tout conteneur. Sans cette distinction, son
  alignement atterrit sur le composant, dont `structure.sizing` le neutralise.
- Une typographie appartient à UN calque texte et vient de son text style.
  `textStyles` lie le style à ses variables ; `variantTypography` situe son
  usage sur chaque variant par un chemin de slots. Un slot à plusieurs textes
  décrit donc ses parts dans `children`. Les nodes représentés dans ses parts
  portent leurs visibilités ; les cibles graphiques non représentées restent
  dans `visibilityTargets`.
- Un auto-layout linéaire publie son alignement (`justifyContent`, `alignItems`)
  et ses slots publient seulement leurs exceptions (`alignSelf`, `flexGrow`).
  Une absence signifie hors flux ou non applicable, jamais `flex-start` deviné.
- Le menu de dimensionnement Figma fait autorité, axe par axe : un axe ne décide
  jamais de l’autre. Pour un slot, `Fill` se publie et `Fixed` cite une variable
  dans `size` ; l’absence vaut donc `Hug`, et une dimension figée sans variable
  avertit plutôt que de disparaître. Pour le composant, `structure.sizing` est
  toujours publié, en vocabulaire CSS (`stretch`, `fit-content`) et par
  propriété (`width`, `height`) : sa taille n’est pas une propriété de flux. Une
  largeur fixe posée sur un variant présente le component set, elle ne décrit
  pas le composant, et vaut donc `stretch`.
- Le node de layout d’un variant s’élit au score, donc en fonction de la racine
  d’où part la recherche. `layoutNodes.ts` en est l’unique autorité, et
  `findLayoutNode` n’y est pas seulement documenté : il y vit. Aucune extraction
  ne choisit le calque qu’elle décrit — toutes reçoivent l’élection, `sizes`
  comprise, dont les représentants de tailles sont élus avant l’appel. Une
  seconde élection ferait décrire quatre arbres différents au même contrat : les
  slots, les icônes, les chemins de la typographie et les dimensions par taille.
- Ce que l’élection écarte est dit. Un calque posé hors du node élu, ou à côté
  d’une dépendance dans son cadre, ne reçoit ni slot, ni typographie, ni
  visibilité alors que ses couleurs entrent dans `variantTokens` : il produit
  donc un avertissement.
- Une propriété Figma que le schéma ne sait pas porter — grille, wrap, bornes
  min/max, position absolue — avertit au lieu de disparaître. `layout` reste
  publié parce que sa forme l’exige, mais un repli `flex-row` se signale.
- Un axe publié est documentable. Les axes d’API vivent dans `props`, l’axe
  d’états dans `stateModel` : une règle `@prop` suit cette répartition au lieu
  de la contredire. N’est une faute de frappe que ce que le contrat ne publie
  nulle part.
- Masquer et remplacer sont deux libertés distinctes. Le booléen Figma dit SI
  une icône s’affiche, la prop runtime dit LAQUELLE rendre : une icône toujours
  visible est modifiable comme une autre, et son absence de booléen ne se
  signale pas.
- Un slot d’icône porte un rôle stable ; `icons.*.slot` et `icons.*.size`
  indiquent où et comment placer chaque icône. `slotNames.ts` est l’unique
  autorité sur le nommage des slots : un `icons.*.slot` publié désigne toujours
  un slot réel de `structure.children`.
- Une liaison composée n’est valide que si tout le groupe requis est lié :
  deux paddings, deux dimensions, quatre coins, etc.
- Une donnée facultative incomplète avertit. Les préconditions explicitement
  définies dans la spécification bloquent.
- On n’avertit que sur ce qu’on publie. Une valeur que le contrat va jeter —
  les dimensions du calque de référence quand `sizes` existe — n’est ni
  relevée ni signalée : le geste demandé au designer ne changerait rien.
- Un avertissement s’adresse au designer : nom Figma exact, ce qui manquera,
  geste à faire. Il lui parvient par le corps de la pull request.
- `tokensUsed` se dérive du contrat terminé ; le relever pendant l’extraction y
  ferait entrer des tokens lus pour décider puis écartés.
- Un changement de forme du JSON incrémente `contractVersion` et met à jour la
  spécification et les consommateurs.

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

Un nouveau `tests/*.test.ts` est découvert automatiquement. Tout bug corrigé
reçoit un test de régression.

Le corpus `tests/test-exports/` reste petit et représentatif. Il est produit
depuis Figma, pas édité à la main, et verrouille la version actuelle du
contrat.

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
