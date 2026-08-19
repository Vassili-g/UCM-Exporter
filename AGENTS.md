# Unified Component Exporter — guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG. Il ne
modifie jamais le document Figma.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) pour le comportement touché ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `src/contract/types.ts` et les tests voisins pour la forme concrète.

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

- La v10 publie uniquement le contrat portable : les données Figma utilisées
  pendant l'extraction ne sont pas embarquées dans l'artefact. Toute limite de
  traduction produit un diagnostic et rend `meta.coverage.portable` partiel.
- `variants` décrit chaque combinaison réellement présente depuis sa vraie
  racine, y compris un COMPONENT sans axe et une matrice clairsemée. Chaque
  entrée porte ses tokens et strokes exacts et référence une vue complète de
  `variantViews` pour son arbre, ses usages typographiques, ses icônes et ses
  dépendances. Deux vues ne sont réunies que par égalité stricte, sans héritage
  ni merge. `structure` reste la projection du variant de référence ; les enums
  ne réautorisent pas leur produit cartésien.
- Une propriété native garde son type (`INSTANCE_SWAP`, `SLOT`) et ses liaisons
  `visible`, `characters` ou `mainComponent` : leur définition stable vit dans
  `propertyBindingDefinitions`, leur `nodeId` exact dans `variants[].bindings`,
  sans rapprochement par nom de calque.
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
  porte les règles de X » n’existe qu’une fois (`rulesContainerOwner`) et est
  indexé sur toutes les pages. Les règles documentent mais n'autorisent plus
  l'export : tout COMPONENT ou COMPONENT_SET sélectionné est capturable. Le
  parent ne réexporte pas les internes d'une dépendance reconnue.
- Le parcours conserve le calque de l’instance pour que la structure puisse le
  décrire comme un slot ; tout ce qu’il PORTE reste hors du contrat parent. Ses
  couleurs appartiennent à son contrat (`getSlotTokens`), et ses dimensions ne
  la font pas élire node de layout (`findLayoutNode`) — l’élire viderait
  `structure.children`, le parcours d’une dépendance s’arrêtant à elle.
- `composes` ne désigne que le calque qui EST l’instance. Un calque qui
  l’enveloppe appartient au contrat parent : il publie son flux et range la
  dépendance dans `children`, comme tout conteneur. Sans cette distinction, son
  alignement atterrit sur le composant, dont `structure.sizing` le neutralise.
  Leur nombre ne change pas la règle : un cadre qui range trois liens publie
  trois enfants, chacun avec son emplacement et sa visibilité — le cadre n’en
  reprend une que lorsqu’une seule dépendance l’occupe.
- Ce cadre publie TOUS ses calques, pas seulement les branches de dépendance :
  un tag, un texte, un dessin y sont des calques de ce contrat, décrits par la
  règle commune. `structureTree.publishesChildren` tranche l’unique exception —
  un cadre dont aucune branche ne mène à une dépendance ne publie rien — et les
  chemins de typographie des vues comme les signatures suivent cette même
  réponse, sinon ils désigneraient des slots absents de `structure.children`.
- Chaque `variantViews[variants[].view].composes` se dérive de SON arbre
  publié, dans son ordre ;
  le `composes` global en est l'union ordonnée à cardinalité maximale, comme
  `tokensUsed` se dérive du contrat terminé.
  Le scan dit ce que Figma contient, `structure.children` dit ce que le contrat
  décrit, et seul le second engage le développeur. Une dépendance que l’arbre
  n’a pas su situer sort donc des deux champs à la fois, sous un avertissement :
  deux relevés indépendants de la même information finiraient par se
  contredire, et le consommateur refuse un contrat dont les deux séquences
  diffèrent.
- `structure.children` descend dès qu'un descendant porte une information qu'une
  feuille ne sait pas exprimer — un texte, une icône, une dépendance, ou une
  liaison de variable — et à n'importe quelle profondeur. La borne compte autant
  que la règle : un calque dont aucun descendant ne porte d'information reste une
  feuille, sinon l'export publierait les tracés d'une icône importée.
  `structureTree.ts` en est l'unique autorité : l'extraction, `textSlots` et les
  signatures la consultent, aucun ne la recalcule. Un second calcul finirait par
  viser un slot que `structure.children` ne contient pas, et le consommateur
  refuse une typographie qui désigne un slot absent. La profondeur est bornée, et
  la coupure est dite dès qu'elle emporte autre chose qu'un dessin.
- Un conteneur publie TOUS ses calques rendables, à quelque profondeur qu'il
  vive — jamais une sélection. `variants[].tokens` relève les couleurs du variant
  entier : n'en publier qu'une partie ferait annoncer au contrat des peintures
  qu'aucun calque publié ne porte.
- Une propriété Figma à effet visuel que le schéma ne sait pas écrire produit un
  avertissement — mais seulement sur un calque que le contrat PUBLIE, et jamais
  pour une valeur au défaut de Figma. Les deux réserves sont ce qui distingue un
  diagnostic d'un rapport que le designer cesse de lire : `clipsContent` est
  activé par défaut sur toute frame, un masque est le mécanisme normal d'une
  icône, et l'alignement d'un texte en `Hug` n'a aucun effet.
- Une typographie appartient à UN calque texte et vient de son text style.
  `textStyles` lie le style à ses variables ; la vue exacte situe son
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
  propriété (`width`, `height`) : sa taille n’est pas une propriété de flux.
- Une dimension figée du composant reliée à une variable publie son token. Ce
  qui distingue une taille de maquette d’une décision du design system est la
  liaison, jamais le fait d’être figé : sans variable, la largeur présente le
  component set et vaut `stretch` ; avec variable, elle décrit le composant et
  l’emporte. C’est le signal qui vaut partout ailleurs — un nombre brut n’est
  jamais contractuel, une variable liée l’est toujours.
- Le node de layout d’un variant s’élit au score, donc en fonction de la racine
  d’où part la recherche. `layoutNodes.ts` en est l’unique autorité, et
  `findLayoutNode` n’y est pas seulement documenté : il y vit. Aucune extraction
  ne choisit le calque qu’elle décrit — toutes reçoivent l’élection, `sizes`
  comprise, dont les représentants de tailles sont élus avant l’appel. Une
  seconde élection ferait décrire quatre arbres différents au même contrat : les
  slots, les icônes, les chemins de la typographie et les dimensions par taille.
- Ce que l’élection écarte est dit. Un calque posé hors du node élu, ou à côté
  d’une dépendance dans son cadre, ne reçoit ni slot, ni typographie, ni
  visibilité alors que ses couleurs entrent dans `variants[].tokens` : il produit
  donc un avertissement.
- Une propriété Figma que le schéma ne sait pas porter avertit au lieu de
  disparaître. `layout` reste publié parce que sa forme l’exige, mais un repli
  `flex-row` se signale.
- Le wrap, lui, se publie : `wrap` est une propriété de flux et reste au niveau
  haut même sous `sizes` ; `rowGap` est un token et suit la règle commune. Son
  absence sous `wrap` vaut `gap` — Figma synchronise les deux champs sans le
  dire, et son API renvoie alors la valeur d’`itemSpacing` sans liaison propre.
  Réclamer une variable là avertirait tous les conteneurs déjà corrects.
- Une borne de taille est une décision de design, pas une gêne à contourner :
  `bounds` la publie sur le composant et sur chaque slot. Elle est indépendante
  du menu de dimensionnement — un axe en `Fill` qu’un `max width` retient est le
  cas courant — et suit la règle commune, un nombre brut avertit et une variable
  liée se publie. Le geste demandé est de nommer la borne, jamais de la retirer.
  Un calque intermédiaire n’en est pas propriétaire et avertit : sa borne retient
  le contenu, la porter sur le composant dirait autre chose.
- Un axe publié est documentable. Les axes d’API vivent dans `props`, l’axe
  d’états dans `stateModel` : une règle `@prop` suit cette répartition au lieu
  de la contredire. N’est une faute de frappe que ce que le contrat ne publie
  nulle part.
- Masquer et remplacer sont deux libertés distinctes. Le booléen Figma dit SI
  une icône s’affiche, la prop runtime dit LAQUELLE rendre : une icône toujours
  visible est modifiable comme une autre, et son absence de booléen ne se
  signale pas.
- Aucune couleur n’est perdue par troncature de clé. Le dernier segment est la
  BASE de la clé ; quand deux couleurs COHABITENT dans la feuille d’un même
  variant en la partageant, la clé s’allonge des segments qui les séparent
  (`userinput.background` / `divider.background`). Le design system nommait déjà
  ces surfaces distinctement — c’est l’export qui tronquait, et le geste demandé
  au designer compensait un bug du moteur.
- `colorKeys.ts` est l’unique autorité sur cette clé, et la décide sur TOUTE la
  matrice : la clé d’un token est la même dans toutes les feuilles. Jusqu'à
  seize profondeurs candidates, elle minimise exactement le nombre de clés ;
  au-delà, une sélection gloutonne déterministe borne le coût et retire les
  profondeurs inutiles. Allonger « jusqu’à ce que chaque token soit unique »
  publierait une clé par variant et rendrait la feuille inindexable.
- Ce qu’une couleur peint se lit sur le calque qui la porte, jamais sur le nom
  de son token. La clé est une identité, et `rendering.roles` publie le rendu de
  chacune qui ne nomme aucun rôle partagé — clés allongées comprises. Un nom qui
  EST un rôle partagé reste une déclaration du designer et l’emporte : c’est le
  seul moyen de distinguer un `ring` d’un `border`, et cette déclaration se lit
  sur le dernier segment du TOKEN, jamais sur la clé publiée.
- Le contrat ne publie que les couleurs LIÉES, et ce que le relevé retient comme
  ce dont il avertit sortent d'une seule lecture (`lirePeintures`). Chaque
  peinture porte sa propre liaison ; `node.boundVariables.fills` est une liste
  que Figma n'aligne pas sur `fills`, et deux lectures d'une même chose
  finissaient par se contredire — un fill masqué relié équilibrait le compte
  d'un fill visible posé à la main, rien n'était dit, et c'est la couleur du
  paint MASQUÉ que le contrat publiait. La liste du node reste le repli quand la
  lecture exacte ne conclut pas : ne perdre aucune couleur passe avant gagner un
  diagnostic. Une peinture posée à la main sur
  un calque que l'export parcourt avertit donc au lieu de disparaître, et rend
  `meta.coverage.portable` partiel : sans ce mot, la vue exacte cessait de citer
  le calque dans `paintPlacements`, le rendu le laissait sans encre, et rien ne
  ramenait le designer dessus — un variant sur quatre-vingt-dix suffit à le
  rendre invisible en relecture. Les réserves sont ce qui distingue ce
  diagnostic d'un rapport qu'on cesse de lire : un paint masqué ou d'opacité
  nulle ne peint rien, un stroke d'épaisseur zéro non plus, et une peinture non
  SOLID n'est liable à aucune variable de couleur — le geste demandé
  n'existerait pas.
- Chaque `variantViews.*.paintPlacements` situe les fills et strokes par les
  chemins exacts de l'arbre publié ; `[]` cible la racine. Les chemins sont
  collectés pendant l'unique extraction de `structure.children`. Le chemin d'une
  peinture est celui du calque PUBLIÉ qui la porte : une couleur posée sous une
  feuille appartient à cette feuille. Les deux relevés ne parcourent pas le même
  arbre — les couleurs descendent partout, l'arbre s'arrête aux icônes — et
  exiger l'égalité des deux ferait perdre l'encre de toute icône, puisque le
  fill vit sur son tracé. C'est aussi ce que le rendu applique : `color` et
  `fill` cascadent du slot vers le dessin. Deux tracés d'une même icône ne
  donnent donc qu'une cible, et aucun geste n'est demandé au designer — le
  moteur refuse par principe de publier ces tracés.
- Un slot d’icône porte un rôle stable ; `icons.*.slot` et `icons.*.size`
  indiquent où et comment placer chaque icône. `slotNames.ts` est l’unique
  autorité sur le nommage des slots : un `icons.*.slot` publié désigne toujours
  un slot réel de `structure.children`.
- Une valeur uniforme n’est valide que si tout le groupe requis est lié. Les côtés d’un même champ
  peuvent en revanche citer des variables DIFFÉRENTES : le contrat publie alors
  le détail (`padding.x`, `padding.y`, `radius`, largeur d’un stroke) au lieu de
  tout perdre, et garde la forme courte quand ils la partagent. Le design system
  nommait déjà ces variables séparément — c’est le moteur qui exigeait
  l’aplatissement. La taille d’un slot n’en est pas : ses deux axes ne sont pas
  deux côtés, et deux variables y décrivent une dimension inexprimable. Un
  groupe par côté peut être partiel quand les côtés absents valent zéro ; un
  côté fixe non neutre avertit. Cette publication ne change pas l'élection du
  node de layout, qui continue de compter seulement `hasCompleteBinding`.
- Sous une grille, la CELLULE décide de la boîte, et les pistes (`columnSizes`,
  `rowSizes`) avec la place de chaque enfant (`columnStart`, `rowStart`, spans)
  la décrivent. Remplir sa cellule est le DÉFAUT d’un enfant de grille —
  `stretch` en CSS, « Fill » dans le panneau — et le menu de dimensionnement
  cesse d’y faire autorité : Figma n’expose pas de remplissage dans une piste qui
  hug, pas plus qu’une piste `FLEX` sous un conteneur qui hug, et son API rend
  alors la taille CALCULÉE là où le panneau affiche « Fill ». Un enfant ne publie
  donc sa dimension que s’il cite une variable, et son absence ne se réclame
  jamais. Seul un alignement explicite le décolle de sa cellule : la règle
  commune revient, le même mot qu’en CSS. Exception propre aux grilles, une
  piste FIXED publie sa valeur structurelle en pixels avec une notice explicite,
  sans devenir un token ni dégrader la couverture ; un runtime qui n’expose pas
  les pistes ne publie rien et ne dit rien.
- Cette exception s’étend de la piste à la CELLULE, et là seulement : sous une
  piste qui hug, la cellule ne décide de rien — c’est l’enfant qui la mesure —
  et la mesure ne vit que sur lui, `GridTrackSize.value` n’existant que sur
  `FIXED` et `FLEX`. `structuralSize` la publie donc en pixels, sous la même
  notice sans geste, pendant que `size` reste strictement tokenisé : une
  variable liée l’emporte toujours et se publie là-bas. Sans elle, une piste qui
  hug retombait à zéro et le contrat décrivait une grille que personne ne
  pouvait rendre. La borne compte autant que la règle : une seule piste non
  `HUG` sous l’étendue de l’enfant rend l’axe indécis, et rien n’est publié.
  L’exception ne parle par ailleurs que là où la dimension s’est tue : elle
  n’existe que parce que le panneau affiche « Fill », et un alignement explicite
  le retire. La réclamer alors contredirait mot pour mot l’avertissement que
  `resolveSlotSize` vient d’écrire sur le même axe — et cet avertissement serait
  faux, puisque la valeur serait publiée.
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
- `schema/ucm-contract.schema.json` est dérivé de `types.ts` par `npm run
  schema`, jamais rédigé. Il décrit la forme, pas la cohérence : il ignore les
  renvois internes et le format des valeurs tokenisées. Il ne remplace aucun
  contrôle du consommateur, et sa propre `description` énonce ses limites.

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
