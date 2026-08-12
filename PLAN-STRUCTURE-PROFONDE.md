# Plan — structure profonde et propriétés de mise en page

**Statut : révisé le 12 août 2026 — 4.4 Flex mise en œuvre, arbre général non
engagé.** Ce document conserve la recherche et les formes invalidées
pour expliquer la décision. La seule séquence exécutable est celle du §10.

Les principes vivent dans [CONCEPT.md](./CONCEPT.md), le comportement actuel
dans [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md), la maturité dans
[ROADMAP.md](./ROADMAP.md), les options non engagées dans
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

Deux livrables distincts :

- **Partie A** — quatre manques sans récursion, traitables séparément ;
- **Partie B** — l’arbre profond et le layout, à repenser avant exécution.

---

## 1. Le besoin

L’auto-layout Figma est un modèle de flux **proche** de flexbox, pas une identité
avec CSS : certaines propriétés se traduisent directement, d’autres dépendent
de leur applicabilité ou n’ont pas d’équivalent unique. `primaryAxisAlignItems`
n’est toutefois pas une inférence sur un nom de calque : c’est une valeur que
le designer a réglée délibérément. Elle relève donc de Figma au sens de
l’arbitrage des sources ([CONCEPT.md](./CONCEPT.md) §3), et le contrat est
aujourd’hui incomplet sur son propre domaine — ni alignement, ni wrap, ni
grille.

Le gain visé n’est pas la génération de code. C’est que **le layout devienne
vérifiable** : un développeur peut aujourd’hui écrire `justify-content: center`
là où Figma dit `space-between` sans qu’aucun contrôle le relève.

`structure.children` porte déjà les slots, leur ordre, leur optionalité, la
prop de visibilité, la typographie, la taille et `composes`. La couche
structurelle existe ; la question est jusqu’où l’étendre.

---

## 2. Relevé des propriétés Figma

**Source** : `@figma/plugin-typings@1.130.0`, installé dans le repository et
plus récent que la documentation web. Chaîne de mixins résolue intégralement
(`BaseFrameMixin` 129 propriétés, `TextNode` 119) puis filtrée sur la mise en
page.

### 2.1 Conteneur — `AutoLayoutMixin`

| Figma | CSS |
|---|---|
| `layoutMode: NONE \| HORIZONTAL \| VERTICAL \| GRID` | `flex-direction`, `display: grid` |
| `primaryAxisAlignItems: MIN \| MAX \| CENTER \| SPACE_BETWEEN` | `justify-content` |
| `counterAxisAlignItems: MIN \| MAX \| CENTER \| BASELINE` | `align-items` |
| `counterAxisAlignContent: AUTO \| SPACE_BETWEEN` | règle d’alignement, **pas** une valeur CSS |
| `layoutWrap: NO_WRAP \| WRAP` | `flex-wrap` |
| `itemSpacing`, `counterAxisSpacing` | `gap`, `row-gap` |
| `paddingTop/Right/Bottom/Left` | `padding`, quatre côtés |
| `clipsContent` | `overflow: hidden` |

### 2.2 Enfant — `AutoLayoutChildrenMixin`, `LayoutMixin`

| Figma | CSS |
|---|---|
| `layoutSizingHorizontal/Vertical: FIXED \| HUG \| FILL` | intention de dimensionnement |
| `layoutGrow` | `flex-grow` |
| `layoutAlign: STRETCH \| INHERIT` | `align-self` |
| `layoutPositioning: AUTO \| ABSOLUTE` | `position: absolute` |
| `minWidth/maxWidth/minHeight/maxHeight` | identiques |

### 2.3 Grille — `GridLayoutMixin`, `GridChildrenMixin`

| Figma | CSS |
|---|---|
| `gridRowCount`, `gridColumnCount` | nombre de pistes |
| `gridRowSizes`, `gridColumnSizes` (`GridTrackSize`) | `grid-template-rows/columns` |
| `gridRowGap`, `gridColumnGap` | `row-gap`, `column-gap` |
| `gridAutoTracks`, `gridItemsPositioning` | `grid-auto-flow` |
| `gridRowAnchorIndex`, `gridColumnAnchorIndex` | `grid-row/column-start` |
| `gridRowSpan`, `gridColumnSpan` | `span N` |
| `gridChildHorizontalAlign/VerticalAlign: MIN \| CENTER \| MAX \| AUTO` | `justify-self`, `align-self` |

`GridTrackSize` = `{ type: 'FLEX' \| 'FIXED' \| 'HUG', value?: number }` →
`1fr` / `<value>px` / `auto`.

### 2.4 Texte — `TextNode`

| Figma | CSS |
|---|---|
| `textAlignHorizontal`, `textAlignVertical` | `text-align` |
| `textAutoResize`, `textTruncation`, `maxLines` | largeur, ellipse, `line-clamp` |
| `textCase`, `textDecoration` | `text-transform`, `text-decoration` |
| `letterSpacing`, `paragraphSpacing`, `paragraphIndent` | identiques |

### 2.5 Ce qu’on n’exporte pas

`x`, `y`, `absoluteBoundingBox`, `relativeTransform`, `rotation`, `constraints`,
`layoutGrids`, `itemReverseZIndex`, `cornerSmoothing` : géométrie absolue et
prototypage ne décrivent pas une intention de mise en page. Les exporter
fabriquerait la « reproduction brute de l’arbre Figma » interdite par
[PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md). `width` et `height` font exception
quand le schéma demande explicitement une taille tokenisée et que les deux
liaisons forment un groupe complet — c’est déjà le cas de la taille d’un slot.

`inferredAutoLayout` est **refusé pour un autre motif** : c’est une inférence
de Figma, pas une décision du designer. Un frame sans auto-layout doit produire
un avertissement, jamais une devinette. C’est la ligne qui sépare cet export
des outils de handoff génériques.

---

## 3. Le clivage tokens / énumérations

`VariableBindableNodeField` et `VariableBindableTextField` délimitent
exactement ce qui peut porter un token.

**Bindable** — `itemSpacing`, `counterAxisSpacing`, les quatre `padding*`,
`gridRowGap`, `gridColumnGap`, `min/maxWidth/Height`, `width`, `height`,
`cornerRadius` et ses quatre coins, `strokeWeight` et ses quatre côtés,
`visible`, `opacity`, `characters` ; côté texte `fontFamily`, `fontSize`,
`fontStyle`, `fontWeight`, `letterSpacing`, `lineHeight`, `paragraphSpacing`,
`paragraphIndent`.

**Non bindable** — toutes les propriétés de flux, sans exception.

L’invariant « les tokens restent des références » s’applique donc **aux
distances** et **jamais aux énumérations**. Une énumération écrite en clair
n’est pas une valeur brute au sens du projet ; la forme du contrat doit rendre
ce clivage lisible, sinon un relecteur y verra une régression.

**Limite** : `GridTrackSize.value` n’est pas bindable. Une piste `FIXED` ne peut
pas être tokenisée.

---

## Partie A — manques indépendants de l’arbre

Quatre points qui ne demandent aucune récursion.

| Manque | État vérifié |
|---|---|
| `padding` à quatre côtés | `types.ts:244` et `:264`, `extractSizes.ts:88`, `extractLayout.ts:270` portent `{ x, y }`. **Non corrigé.** |
| `letterSpacing` | Bindable, absent de `TypographyTokens`. Un token lié est perdu en silence. |
| `textCase` | Non exporté. Un label en capitales dans Figma et en minuscules dans le code est un écart invisible. |
| `textDecoration` | Non exporté, même motif. |

Le padding n’est pas faux, il est **refusé** : `resolveTokenName` détecte
l’asymétrie et avertit (`nodeBindings.ts:139-147`). La limite réelle est qu’un
padding asymétrique n’est pas exprimable.

### Règle proposée pour les valeurs facultatives

Répond à « faut-il tokeniser un `letterSpacing` nul ? » — **non**.

| Dans Figma | Contrat | Avertissement |
|---|---|---|
| Variable liée | référence de token | non |
| Pas de variable, valeur au défaut | rien | non |
| Pas de variable, valeur ≠ défaut | rien | oui |

Écrire `0` violerait « aucune valeur brute » et ajouterait une ligne morte sur
chaque calque texte du catalogue. Exiger un token sur une valeur nulle
produirait un avertissement partout, donc du bruit que personne ne lira. En
revanche une valeur **non nulle et non tokenisée** est un écart réel que le
développeur ne peut pas deviner.

### Ce qu’il reste à trancher avant d’écrire la partie A

1. **`figma.mixed`** — voir §6, point 1. Bloquant.
2. **La branche « style de texte »** : un `TextStyle` Figma porte déjà
   `textCase`, `textDecoration` et `letterSpacing`. `extractTypography`
   (`extractLayout.ts:78-86`) renvoie le nom du style et s’arrête. Publier ces
   champs à côté du nom recopierait le style dans le contrat.
3. **La forme d’un padding symétrique** une fois passé à quatre côtés : quatre
   fois la même référence dégrade le diff et prive le consommateur du
   `paddingInline`/`paddingBlock` qu’il utilise.
4. **Les deux unités du `letterSpacing` nul** : `{0,'PIXELS'}` et
   `{0,'PERCENT'}` sont le même défaut visuel.
5. **La formulation de l’invariant de complétude** dans `AGENTS.md` : quatre
   groupes d’un champ affaiblissent « deux paddings, deux dimensions, quatre
   coins ».

**A n’est pas livrable seul** : tout incrément de `contractVersion` exige un
réexport humain du corpus depuis Figma et un relèvement de
`VERSION_CONTRAT_MAXIMALE` côté consommateur (§6, point 7).

---

## Partie B — l’arbre profond

### 5.1 Principes retenus

1. **Un seul fichier.** La structure est de la vérité design comme le reste.
   Deux fichiers créeraient deux versions, deux dates, et la question « lequel
   fait foi ».
2. **Les couleurs ne descendent pas sur les nœuds.** Elles restent une matrice
   par rôle × combinaison d’axes dans `variantTokens`. C’est ce qui garde le
   contrat **linéaire** au lieu de combinatoire.
3. **Un seul arbre, pas un arbre par variante.** La variance est signalée par
   comparaison, jamais par duplication.
4. **`composes` coupe la descente.** Un nœud composé porte son placement,
   jamais l’arbre de sa dépendance.
5. **Silence = défaut Figma**, avec la nuance du §6 point 4.
6. **Clés plates** sur le nœud plutôt que des sous-objets, les défauts étant
   omis. La racine cesse d’être un cas particulier : c’est le premier nœud.

### 5.2 Forme envisagée

`ChildStructure` devient récursif et gagne, en plus de ses champs actuels
(`slot`, `figmaLayer`, `optional`, `visibilityProp`, `visibilityTargets`,
`size`, `typography`, `composes`) :

- **dispose ses enfants** : `direction`, `justify`, `align`, `wrap`, `clip`,
  `gap`, `rowGap`, `padding` ;
- **se place chez son parent** : `absolute` ;
- **texte** : `textAlign`, `textCase`, `textDecoration`, `truncate`,
  `maxLines` ;
- `children?: ChildStructure[]`.

`ContractStructure` perd `layout: 'flex-row' | 'flex-column'` et porte les
mêmes clés que ses enfants.

**Écartés du premier jet**, faute de limite observée : `sizing`, `grow`,
`alignSelf`, la grille, `min`/`max`, `opacity`, `paragraphIndent`.

### 5.3 Points durs

**Les slots deviennent des chemins.** `slot` reste unique dans son parent ;
l’identité globale devient `content/title`. `icons.*.slot` publiera un chemin —
rupture pour les consommateurs. `slotNames.ts` reste l’unique autorité.
`visibilityTargets` (`types.ts:139-143`) existe *parce que* la structure était
plate : une partie de ses cas devient un vrai nœud, à réexaminer.

**La structure peut varier selon les variantes.** Refus explicite d’un arbre
par variante. À la place, une comparaison entre variantes qui avertit sur
divergence. Non bloquant, cohérent avec « seules les préconditions bloquent ».

**`sizes`.** Reste au niveau racine. Si un nœud profond porte des distances qui
varient selon la taille, on avertit au lieu de généraliser l’indexation.

**Arrêts de la descente.** `composes` coupe ; profondeur maximale ;
`layoutMode: 'NONE'` avec plusieurs enfants produit un avertissement, jamais
une disposition affirmée.

---

## 6. Ce qu’une relecture indépendante a invalidé

Points **vérifiés dans le code**, à traiter avant toute écriture.

**1. `figma.mixed` — le plus grave.** `textCase`, `textDecoration`,
`letterSpacing`, `fontSize`, `lineHeight` valent `figma.mixed` dès qu’un calque
porte plusieurs styles. L’export sérialise par `JSON.stringify`
(`exportComponent.ts:326`), **qui supprime toute propriété dont la valeur est
un Symbol**. La clé disparaîtrait sans trace et serait relue comme un défaut.
Divergence invisible, contre le principe « les divergences doivent être
visibles ». *Vérifié empiriquement.*

Corollaire : `boundVariables` expose les liaisons de texte comme des
**tableaux**, une entrée par plage. `firstVariableAlias` prend la première, sans
avertir sur les autres.

**2. Il n’existe aucune règle de feuille.** `getAllNodes`
(`exportableNodes.ts:99-131`) n’élague que les sous-arbres statiquement masqués
et les instances contractées. Rien ne teste `VECTOR`, `BOOLEAN_OPERATION`, ni
une instance sans contrat. Une descente récursive naïve publierait les tracés
d’une icône comme des slots — c’est-à-dire fabriquerait l’interdit. **Une règle
de feuille explicite est un préalable, pas un détail.**

**3. Retirer `findLayoutNode` sans le remplacer rouvre le problème des
wrappers.** L’extraction part aujourd’hui du wrapper *puis* élit au score le
nœud porteur des liaisons (`extractLayout.ts:43-63`). C’est ce mécanisme, et
non la seule `WrapperReference`, qui empêche un frame intermédiaire de devenir
un slot. `extractSizes.ts:44` et `extractIconLayers` s’en servent également.

**4. « Absence = défaut, jamais inconnu » est faux.** `counterAxisSpacing: null`
signifie « reprendre `gap` », pas zéro. Une propriété non applicable (pas de
grille, parent non auto-layout) n’a pas de défaut choisi. `mixed` produit une
absence qui n’est ni l’un ni l’autre. Formulation tenable : *absence = défaut
Figma **ou** propriété non applicable*, avec obligation de ne jamais écrire une
clé non rattachable à une propriété applicable.

**5. Amputer les unions de leur valeur par défaut ne marche pas.**
`gridChildHorizontalAlign` a pour défaut `AUTO` : `MIN` est alors une valeur
non par défaut qu’une union amputée ne peut pas porter. Le bénéfice serait
d’ailleurs interne au plugin — les consommateurs lisent du JSON et
redéclareraient le défaut chez eux, soit une convention cachée de plus.

**6. `layoutAlign` : `MIN`, `CENTER`, `MAX` sont dépréciés** (typings, verbatim) ;
l’alignement d’axe secondaire vit sur le conteneur. Et `layoutSizing*` est
documenté comme **un raccourci** de `layoutGrow` + `layoutAlign` + les deux
`*SizingMode` : publier les deux dupliquerait la même information.

**7. Toute version nouvelle est une passe coordonnée.** Sur `main` avant les
changements étudiés, `VERSION_CONTRAT_MINIMALE` et `MAXIMALE` valent toutes
deux `4.2` dans le consommateur. La livraison 4.3 porte la maximale à `4.3` et
adapte ses parcours de structure. Le corpus de test de l’exporteur rougit de
toute façon jusqu’à un réexport humain depuis Figma — que l’agent ne peut pas
produire.

**8. Deux consommateurs cassaient plus tôt que prévu.**
`compositionsDesSlots` n’est pas récursif
(`UCM-Playground/scripts/validation-graphe-contrats.mjs:16-23`) et
`validation-contrat.mjs:90-95` ne construit l’ensemble des slots qu’au premier
niveau. Dès qu’un `composes` descend d’un cran, le graphe casse — donc **avant**
l’étape des chemins de slots. La livraison 2 du §10 rend le graphe récursif ;
la validation des icônes reste volontairement limitée aux slots de premier
niveau, conformément à leur contrat.

**9. Le nommage actuel ne produit pas de chemins lisibles.**
`semanticSlotName` renvoie `label` pour tout sous-arbre contenant un texte
(`slotNames.ts:52-57`) : un arbre profond donnerait `label/label`, pas
`content/title`.

**10. Un `GroupNode` n’est pas transparent.** Il porte `layoutAlign`,
`layoutGrow`, `layoutPositioning` via `LayoutMixin`, et compte pour **un**
élément dans le flux de son parent. L’aplatir ferait affirmer N éléments là où
Figma en rend 1.

**11. L’invariant du lieu unique est déjà entamé.**
`children[1].typography.fontSize` et `sizes.medium.fontSize` portent le même
token dans `tests/test-exports/Button.contract.json`.

**12. Bruit induit.** `extractChild` marque `optional: true` tout enfant sans
texte et appelle `resolveField(slotSize)` (`extractLayout.ts:202-213`), qui
avertit en l’absence de liaison. Chaque frame intermédiaire du nouvel arbre
gagnerait un `optional: true` faux et un avertissement « width et height ».

**13. Gardes d’applicabilité absentes.** Ne lire `justify`/`align`/`gap`/
`padding` que si `layoutMode ∈ {HORIZONTAL, VERTICAL}` ; `wrap`/`rowGap` que si
`layoutWrap === 'WRAP'` ; la grille que si le parent est `GRID`. Un frame
repassé en `NONE` conserve ses anciennes valeurs.

---

## 7. Décisions ouvertes

- Quelle règle de feuille exactement, et où elle vit pour n’exister qu’une fois.
- Quel point d’entrée remplace `findLayoutNode`, sachant qu’`extractSizes` et
  `extractIconLayers` s’en servent aussi.
- Comment un `TextStyle`, qui porte déjà `textCase` et `textDecoration`,
  cohabite avec ces champs sans les recopier.
- À quoi ressemble un padding symétrique une fois passé à quatre côtés.
- Si la comparaison entre variantes doit nommer chaque variante ou agréger, un
  mécanisme équivalent existant déjà dans `composedComponents.ts:160-179`.
- Comment revoir `semanticSlotName` pour que les chemins soient lisibles.

---

## 8. Ordre initial proposé — invalidé

1. **Le test froid instrumenté, seul.** Relever chaque propriété de layout
   qu’un agent doit deviner. C’est lui qui justifie les champs, conformément à
   la règle « un nouveau champ ne se justifie qu’à partir d’une limite réelle ».
2. **Poser la règle de feuille et le point d’entrée**, avant tout type.
3. **Livrer l’arbre sans grille, sans `sizing`, sans `alignSelf`** :
   `direction`, `justify`, `align`, `gap`, `padding`, `absolute` seulement,
   unions complètes, gardes d’applicabilité explicites.
4. **Traiter les chemins de slots et les deux validateurs du consommateur comme
   une seule livraison versionnée.**
5. **Ne spécifier la grille que le jour où un composant réel en contient une.**

---

## 9. Verdict de la relecture

**Partie A** : à amender puis livrable, en une passe coordonnée sur les deux
repositories.

**Partie B** : à repenser, pas à exécuter. Le plan était plus *court* que sa
version précédente, pas plus *robuste* : il déplaçait la complexité de
l’exportateur vers le lecteur du contrat. Les trois défauts structurants —
absence de règle de feuille, corollaire « absence = défaut » faux, unions
amputées — produisent chacun des contrats **faux** plutôt qu’incomplets, ce qui
est l’inverse de la ligne du projet.

---

## 10. Plan révisé et exécutable

L’audit du projet global confirme le verdict, mais montre aussi que deux sujets
ont été mélangés dans la première révision de ce document :

- **pré-acquis non commité** : la mise à jour 4.3 des textes corrige déjà la
  limite historique d’Alert en rendant `structure.children` récursif ;
- **extension générale non justifiée** : reproduire toute la profondeur de
  Figma avec les propriétés de flex, de grille et de texte.

La 4.3 reste acquise, sans rouvrir son choix de forme. Le test froid a depuis
établi le minimum Flex nécessaire ; il est livré en 4.4 sans engager l'arbre
général.

### Livraison 1 — stabiliser le socle 4.3 (terminée)

La mise à jour des textes est la version 4.3 décidée. Il ne faut pas la ramener
à 4.2, mais terminer sa livraison coordonnée :

1. avoir livré `contractVersion: 4.3` dans l’exporteur et la borne maximale 4.3
   dans le consommateur ;
2. garder provisoirement le corpus Figma 4.2 inchangé — il ne peut être rafraîchi que par un
   réexport utilisateur ;
3. ne pas faire passer le test du corpus en modifiant le JSON à la main ;
4. terminer ou isoler les changements sans rapport déjà présents dans les deux
   worktrees avant la livraison versionnée.

État initial constaté le 12 août 2026 : l’exporteur annonçait déjà 4.3 et sa
suite échouait sur la fixture 4.2 ; le Playground acceptait déjà 4.3 sans
contrôler toute la nouvelle structure textuelle. La livraison 2 corrige les
parcours et leurs tests. Le réexport Figma du corpus reste la seule étape
humaine.

### Livraison 2 — finaliser la récursion textuelle 4.3

Objectif : durcir la mise à jour déjà présente sans transformer sa récursion
textuelle en reproduction générale de l’arbre Figma.

1. Conserver `children?: ChildStructure[]`, la forme 4.3 déjà décidée.
2. Ne faire descendre cette récursion que dans les branches qui mènent à un
   calque texte. Un dessin interne ou une instance composée ne devient pas une
   part simplement parce qu’il partage le conteneur d’un titre et d’une
   description.
3. Une typographie reste portée par le vrai calque `TEXT`, jamais par un frame
   intermédiaire qui ne fait que l’envelopper.
4. Conserver le slot direct comme identité publique : `icons.*.slot` ne devient
   pas un chemin et `slotNames.ts` reste l’unique autorité de nommage.
5. Remplacer `visibilityTargets` uniquement pour les nodes effectivement
   représentés dans l’arbre textuel; conserver les cibles des autres
   descendants.
6. Ne pas exporter `layout: flex-row` quand `layoutMode` vaut `NONE`. Si le
   conteneur de plusieurs textes n’est pas en auto-layout, omettre `layout` et
   avertir le designer que leur disposition manquera.
7. Pour `gap`, ne lire `itemSpacing` que sur un auto-layout horizontal ou
   vertical. Une valeur non liée avertit et reste absente; le champ ne doit pas
   devenir `null` si `null` n’a pas de sémantique publique distincte.
8. Comparer l’arbre textuel sur tous les variants. En cas de divergence de
   cardinalité, d’ordre ou de noms Figma, avertir en nommant les variants. Le
   contrat continue de décrire le variant de référence; il ne fusionne jamais
   plusieurs arbres par supposition.
9. Quand un axe de tailles existe et plusieurs textes sont présents, ne plus
   publier un unique `sizes.*.fontSize`. Les typographies des parts en sont les
   propriétaires. Si elles varient selon la taille et que la 4.3 ne sait pas
   les indexer, avertir explicitement au lieu de conseiller de
   supprimer des textes du composant.

Tests indispensables avant le changement de version :

- titre + description avec deux typographies distinctes ;
- visibilité d’un seul texte sans rendre tout le slot optionnel ;
- conteneur `layoutMode: NONE` : aucun faux `flex-row` ;
- groupe ou vecteur interne : aucune part graphique publiée ;
- instance composée : descente coupée ;
- structure des textes différente entre deux variants : warning déterministe ;
- `tokensUsed` contient les tokens des deux typographies ;
- les validateurs du Playground parcourent la forme récursive et refusent un
  enfant mal formé ; le graphe de composition relève aussi un `composes`
  descendu dans l’arbre.

La livraison coordonnée comprend : types, extraction, spécification,
`contractVersion`, validation du consommateur, génération de types si elle lit
la structure, tests des deux repositories, puis réexport humain du petit corpus
et des contrats de validation. La borne maximale du Playground ne passe à la
nouvelle version qu’après ces adaptations.

**Statut** : code, spécification, validateurs et tests adaptés. Aucun composant
JSX/TSX, test de rendu ou contrat JSON du Playground n’est modifié : ces
artefacts produits à froid restent la preuve de qualité des contrats. Le corpus
Figma 4.2 attend son réexport humain dans le dernier schéma, désormais 4.4.

### Livraison 3 — fermer le minimum Flex révélé par le test froid

**Engagée et implémentée en 4.4.** La nouvelle génération froide d'Alert a
établi une limite précise : le contrat 4.3 ne disait pas que son auto-layout
aligne les enfants au centre sur l'axe secondaire. L'icône pouvait donc être
placée en haut sans qu'aucune donnée du contrat ne le contredise. Le même test
a montré que le remplissage horizontal du label ne peut pas être inventé.

La 4.4 ajoute uniquement les données Figma nécessaires à ce flux :

1. `justifyContent` et `alignItems` sur le node de layout linéaire ;
2. `alignSelf` et `flexGrow: 1` sur les slots directs qui dérogent au flux
   commun ou remplissent l'axe principal ;
3. une comparaison de ces données sur toute la matrice de variants ;
4. un warning pour un layer `Absolute`, dont les coordonnées restent hors de
   la forme publique.

Cette livraison ne transforme pas `children` en arbre général et ne couvre ni
grille, ni wrap, ni coordonnées absolues. Aucun JSX/TSX ni contrat JSON froid
n'est modifié : un prochain réexport Figma et une prochaine génération froide
doivent démontrer que `alignItems: "center"` est maintenant cité par le contrat.

### Livraison 4 — mesurer le layout restant

**Non engagée.** Elle précède toute extension structurelle au-delà de la 4.4.

Instrumenter le test froid sans changer le schéma. Pour chaque composant de
validation, relever les décisions impossibles à prendre depuis le contrat et
les classer : conteneur, placement d’enfant, texte ou grille. Le relevé doit
nommer le node Figma et la propriété nécessaire; une impression générale de
ressemblance ne suffit pas.

À partir de ce corpus seulement, proposer un type de node de layout distinct du
type de slot. Le préalable architectural est une fonction pure unique qui
décide :

- si un node est exposé comme élément structurel ;
- s’il est une feuille (`TEXT`, dessin interne, instance composée, etc.) ;
- s’il peut avoir des enfants contractuels ;
- quelles propriétés Figma lui sont applicables.

Cette décision doit être réutilisée par l’extraction, le nommage des chemins,
les icônes et la comparaison de variants. `findLayoutNode` reste en place tant
que ce point d’entrée n’a pas de remplaçant commun aux dimensions, tailles et
icônes.

### Livraison 5 — arbre général, seulement si le test froid le justifie

Spécifier alors, dans un document séparé, le plus petit arbre qui ferme les
limites mesurées. Exigences minimales :

- discriminants explicites entre conteneur, texte, slot et dépendance ;
- unions publiques complètes, sans convention cachée « absence = valeur par
  défaut » ;
- absence signifiant uniquement « non applicable » ou « non exportable avec
  warning », jamais une valeur devinée ;
- gardes d’applicabilité pour auto-layout, wrap et grille ;
- traitement explicite de `figma.mixed` et des liaisons de texte par plage ;
- groupes conservés comme éléments de flux, jamais aplatis par défaut ;
- chemins de slots définis et validés dans le même changement sur les deux
  repositories ;
- comparaison de structure sur toute la matrice de variants ;
- limite de profondeur avec diagnostic adressé au designer ;
- migration versionnée et réexport humain des fixtures.

Le padding à quatre côtés, `letterSpacing`, `textCase`, `textDecoration`, wrap
et grille ne rejoignent cette livraison que si un cas réel établit leur forme
et leur propriétaire. Les ajouter parce que l’API Figma les expose ne suffit
pas à justifier une nouvelle surface publique.
