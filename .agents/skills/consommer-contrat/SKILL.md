---
name: consommer-contrat
description: Reconstruire à froid un composant jetable dans le sandbox depuis son contrat UCM, uniquement quand cette reconstruction est explicitement demandée. Utiliser le contrat comme seule source du rendu, sans consulter une ancienne implémentation ni générer un moteur de contrat au runtime.
---

# Reconstruire un composant depuis son contrat

## 0. Périmètre

Ce skill autorise uniquement la reconstruction à froid explicitement demandée.
Le composant est un artefact jetable du sandbox, jamais une implémentation de
production. Le créer depuis zéro, sans consulter une ancienne version, un
historique, un diff, une sauvegarde ou une capture Figma. Une comparaison
visuelle éventuelle vient après la reconstruction, jamais avant.

Le contrat décrit la partie visuelle : `props`, `variants`, `variantViews`,
`structure`, `stateModel`, `rendering`, `icons`, `textStyles`, `intent`. Ne
compléter que l'API applicative : événements, accessibilité, attributs natifs.

**Sources autorisées**

- le contrat co-localisé du composant ;
- les contrats des dépendances qu'il compose, récursivement ;
- les types générés et les points d'intégration publics du projet (§6) ;
- le code partagé strictement requis pour employer ces APIs.

**Ne pas modifier** le contrat, les tokens, un fichier généré ou un garde-fou.
Limiter les changements au composant demandé et à son export public.

Le livrable est une **transcription statique** du contrat. Le fichier produit ne
doit ni charger le contrat ni l'interpréter à l'exécution.

---

## 1. Les trois lois

Un contrat ne recopie rien. Tout le reste du skill en découle.

**Loi 1, Une vue est un jeu de renvois.**
`variantViews[variant.view].structure` est une **chaîne** : la clé d'une entrée de
`viewStructures`, jamais l'arbre lui-même. Idem `typography` →
`viewTypographies`, `composes` → `viewComposes`, `icons` → `viewIcons`,
`paintPlacements` → `viewPaintPlacements`. `structure.view` renvoie au même
catalogue de structures. Ces renvois se résolvent par l'outil que le projet
fournit (§6), jamais à la main.

**Loi 2, Une valeur vide n'est pas écrite.**
Une clé absente ne veut pas dire « inconnu » : elle veut dire « rien à
publier ». `strokes` absent = aucun contour lié ; `padding` absent = aucun
padding tokenisé ; `props` absent = aucune prop. Seule exception : sous un
**dictionnaire**, la clé est une donnée, `stateModel.states.default` vaut `{}` et
existe bel et bien.

**Loi 3, Ce qui se dérive n'est pas publié.**
Le contrat ne porte ni index de ses tokens, ni miroir en texte brut de ses
diagnostics. Les références de tokens se relèvent dans le contrat, `samples` et
`meta` exclus ; les messages de l'export se lisent dans `meta.diagnostics`, sans
filtrer sur `severity` ; le nom Figma d'un variant vient de `figmaVariantLabels`
quand `variants[].figmaName` est absent.

---

## 2. Déroulé

### 2.1 Une seule extraction

Ne jamais afficher linéairement un gros contrat, et ne jamais l'ouvrir en
plusieurs lectures successives : **une commande unique, en lecture seule, sort
tout ce qui suit d'un coup.** Chaque lecture supplémentaire est un tour, et les
tours sont le poste de dépense dominant.

Ce que l'extraction doit ramener :

1. `meta.contractVersion`, `meta.coverage`, `meta.diagnostics` ;
2. `props`, `structure.variantAxes`, `structure.sizing`, `structure.sizes`,
   `stateModel`, `intent` ;
3. pour chaque entrée de `variants` : `values`, `tokens`, `strokes`, `view`,
   `sample`, `bindings` ;
4. chaque `variantViews[id]` réellement référencée, résolue ;
5. les définitions de binding référencées, puis les entrées utilisées de
   `icons`, `textStyles`, `samples` ;
6. la liste des contrats cités dans les `composes` des vues utilisées.

Les contrats des dépendances se lisent ensuite, un par un, ciblés sur leur API
publique et leur échantillon, jamais par une commande qui en affiche plusieurs
à la fois.

`meta.figma`, `variants[].nodeId` et `variants[].figmaName` ne servent qu'au
diagnostic : ils tracent Figma, ils ne décident pas du rendu. À l'inverse,
`figmaLayer`/`figmaPath` situent certaines jointures, et `icons.*.figmaName`
peut être le nom d'icône à rendre. `tokensUsed` est un inventaire de contrôle,
jamais une source de style ou de localisation.

Si la couverture est partielle ou qu'un diagnostic annonce une perte utile au
rendu : transcrire ce qui est décrit, signaler précisément le manque, ne rien
inventer pour le masquer.

### 2.2 Construire la surface publique

- Exposer chaque entrée de `props`. Un `default` publié est une décision du
  designer : l'appliquer tel quel. Son absence n'est pas un oubli, elle laisse
  le choix au développeur, qui peut ne poser aucun défaut.
- Importer les unions d'`enum` depuis les types générés. Employer le type des
  combinaisons exactes pour typer les tables internes quand il existe.
- Garder un booléen en booléen, et **le lire effectivement** : un booléen
  contractuel déclaré mais jamais consulté est un défaut de transcription. Une
  prop `icon`, `string` ou `instance-swap`
  accepte sa valeur déclarée et l'absence de valeur lorsque son défaut le
  permet. Une prop `slot` demande une API explicite ; ne pas lui inventer une
  sémantique absente du contrat.
- Ne pas exposer l'axe de `stateModel` comme prop, sauf s'il existe aussi dans
  `props`. L'état est alors piloté par ses sélecteurs.
- Ajouter seulement les responsabilités applicatives : contenu remplaçable,
  accessibilité, événements, attributs natifs.

Le contrat possède ses noms de props. En cas de collision avec un attribut natif
de la plateforme, **la prop contractuelle conserve son nom et son type**, et la
collision se soustrait mécaniquement (§6.2), jamais par une liste tenue à la
main.

Pour une liaison native, partir de `variants[].bindings`, ouvrir sa définition,
puis appliquer `prop` à `target` (`visible`, `characters` ou `mainComponent`)
sur le `figmaPath` déclaré. Le `nodeId` distingue les occurrences côté Figma ;
ne jamais remplacer cette adresse par un rapprochement au nom d'une prop.

### 2.3 Transcrire la matrice

`variants` énumère les faits. Construire une table littérale
`values → { tokens, strokes, view, sample }` avec ses seules entrées :

- respecter l'ordre de `structure.variantAxes` pour former une clé stable ;
- conserver chaque référence `{chemin.du.token}` en toutes lettres ;
- ne jamais produire un produit cartésien, un chemin interpolé ou une règle
  métier qui reproduit la table ;
- ne reprendre aucun token d'une autre entrée lorsqu'une clé manque ;
- omettre `sample` lorsqu'il n'est pas publié.

Toute référence visuelle passe par le résolveur du projet (§6.3). Ne coder en
dur ni couleur, ni dimension tokenisée, ni famille, ni graisse. Les pixels de
`structuralSize` et des pistes de grille sont les seules valeurs structurelles
brutes prévues ; ils ne passent pas par le résolveur.

Puisque `structure.variantAxes` fixe déjà l'ordre des coordonnées, la table peut
s'écrire positionnellement plutôt qu'en répétant les noms de clés à chaque
entrée. La littéralité doit rester entière : chaque valeur écrite telle quelle,
aucune combinaison absente du contrat.

### 2.4 Rendre la vue exacte

Résoudre `variantViews[variant.view]`, puis construire son `structure.children`
récursivement et dans l'ordre. Un chemin est une suite de valeurs `slot` ; `[]`
désigne la racine. Ne jamais rechercher globalement un `figmaLayer` pour situer
un élément.

Une entrée de `variants` et la vue qu'elle référence forment une description
complète. Voir §4 pour la matière du rendu.

### 2.5 États, dépendances, échantillons

Voir §4.5, §4.6 et §4.7. Ces trois volets se traitent après l'arbre, dans cet
ordre : l'arbre situe, l'état sélectionne, l'échantillon remplit.

### 2.6 Écrire

**Le chemin du composant est supposé absent** : la suppression relève d'un geste
manuel préalable, hors de ce skill. Y écrire directement, en une fois.

Si le fichier existe encore, la suppression n'a pas eu lieu : **s'arrêter et le
signaler**. Ne pas l'ouvrir, ne pas le contourner, ne pas travailler autour.
Ouvrir l'ancienne implémentation ruine la reconstruction à froid, qui est tout
l'objet de l'exercice.

### 2.7 Vérifier

Relire d'abord le composant contre le contrat :

- chaque `visibilityProp` retire sa cible à `false` et la rend à `true` ;
- les variantes représentatives sélectionnent leurs vue, peintures, icônes et
  compositions exactes ;
- les dépendances répétées gardent leur cardinalité ;
- les contenus applicatifs remplacent les valeurs de sample.

Puis exécuter **seulement** le contrôle de contrat (qui balaie le repository,
faute de commande ciblée) et le contrôle de type de la cible (§6.6). **Ne pas lancer la suite globale du
projet** : elle porte sur le moteur, pas sur ce composant, elle ne peut rien
apprendre sur le travail en cours, et sa sortie encombre le contexte jusqu'à la
fin de la session. L'orchestrateur la lancera une fois, à la fin.

Ne créer aucun test pour ce composant. Ces composants sont des sondes jetables :
leur reconstruction évalue la robustesse du contrat, pas la pérennité de leur
implémentation.

### 2.8 Rapporter

Un échec, une jointure ambiguë ou une donnée normative absente **est un résultat
de la reconstruction**. Le rapporter avec le champ et la combinaison concernés,
sans corriger l'artefact exporté ni compenser dans le code. Rapporter également
toute règle de §5 qu'on a enfreinte, même par accident : la signaler coûte moins
cher que de laisser une transcription douteuse passer pour propre.

---

## 3. Carte du contrat

| Champ | Autorité pour la reconstruction |
|---|---|
| `props` | API visuelle, types et défauts |
| `structure` | entrée générale, ordre des axes, comportement externe, dimensions par taille |
| `variants[]` | seules combinaisons existantes ; couleurs, contours, vue et sample exacts |
| `variantViews[id]` | arbre, typographie, icônes, dépendances et cibles de peinture de cette combinaison |
| `propertyBindingDefinitions` + `variants[].bindings` | prop native, cible et chemin exacts dans chaque variant |
| `stateModel` | déclencheurs runtime et priorité des états |
| `rendering.roles` | nature d'une clé de couleur et propriétés à appliquer |
| `icons` | politique, nom de repli, taille, visibilité et prop runtime |
| `textStyles` | références typographiques par style |
| `composes` | union ordonnée à cardinalité maximale des dépendances |
| `samples` | contenu indicatif et configuration montrés dans la maquette |
| `intent` | usage et restrictions, sans donnée de rendu |

---

## 4. Règles de rendu

### 4.1 Conteneurs et dimensions

- `flex-row` / `flex-column` → conteneur linéaire dans la direction indiquée ;
  `grid` → conteneur bidimensionnel.
- Recopier les valeurs publiées de `justifyContent`, `alignItems`, `alignSelf`,
  `flexGrow`, `wrap`, `gap`, `rowGap`, `columnGap`. Sous `wrap`, un `rowGap`
  absent reprend `gap` ; ailleurs, une absence n'autorise aucun défaut inventé.
- `sizing.width|height` vaut `fit-content`, `stretch`, ou une référence de token
  à appliquer sur l'axe. Traduire l'intention `stretch` par la technique adaptée
  au conteneur ; **une référence ne devient jamais un remplissage**.
- `bounds` s'ajoute à `sizing` ou `size` ; chaque borne est tokenisée.
- Un slot `stretch` borné conserve son remplissage et sa borne, puis centre sa
  boîte ; la taille propre d'une dépendance ne remplace jamais celle du cadre.
- Un `size` chaîne fixe les deux axes. Un objet ne fixe que ses clés présentes.
  Sans `size`, un slot épouse son contenu ; sous une grille il remplit sa
  cellule, sauf alignement explicite.
- `structuralSize` contient des pixels qui dimensionnent une piste épousant son
  contenu : les appliquer tels quels. Une `size` tokenisée l'emporte.
- Appliquer `padding.x|y` et `radius` sous leur forme courte ou côté par côté,
  sans compléter les côtés absents.
- En grille, `columns`/`rows` donnent le nombre de pistes ; conserver
  `columnSizes` et `rowSizes` telles quelles, puis appliquer `columnStart`,
  `rowStart`, `columnSpan`, `rowSpan` et `justifySelf` à chaque enfant.
- `position: "absolute"` retire le slot du flux. Appliquer les contraintes
  publiées sans inventer les distances aux bords.
- `optional` ne masque rien à lui seul. `visibilityProp` masque le slot entier ;
  `visibilityTargets` masque seulement les descendants désignés par leur
  `figmaPath`.

Quand `structure.sizes` existe, identifier l'unique prop enum dont les valeurs
correspondent aux clés du catalogue, puis sélectionner exactement son entrée. Ce
groupe remplace `gap`, `rowGap`, `columnGap`, `padding` et `radius` du node de
layout représenté par la projection générale. Dans la vue exacte, ce node est la
racine ou l'unique conteneur dont les enfants correspondent aux
`structure.children` de référence. Si la prop ou le node est introuvable ou
ambigu, **rapporter l'ambiguïté** au lieu de placer les dimensions au hasard.

Un slot conteneur reste un élément du composant courant. Un enfant portant
`composes` est l'instance d'une dépendance. Ne jamais fusionner le cadre et la
dépendance : leurs flux et dimensionnements appartiennent à deux contrats.

### 4.2 Peintures et contours

Les clés d'une feuille sont celles du design system. Certaines sont partagées
par tous les contrats (`background`, `foreground`, `icon`, `border`, `ring`)
mais **ne pas présumer qu'il n'y en a que celles-là** : un composant qui peint
plusieurs surfaces expose ses propres clés. Une clé peut contenir des points et
ne nomme pas forcément un rôle partagé.

Pour chaque clé de `variant.tokens`, lire `view.paintPlacements.fills[clé]`,
résoudre tous ses chemins, appliquer la référence aux cibles. **Les propriétés à
écrire sont celles que publie `rendering.roles[clé]`, jamais une propriété
déduite du nom du token, du nom de la clé, ni d'une table mémorisée.** Ce qui
compte est la couleur peinte et le token employé.

Procéder de même avec `variant.strokes[clé]` et
`view.paintPlacements.strokes[clé]`. **Un contour ne consomme pas la boîte** :
le rendre sans déplacer la mise en page, par le moyen que la cible offre pour
cela. Sa géométrie est contractuelle :

- `inside` → l'épaisseur entière vers l'intérieur ;
- `outside` → l'épaisseur entière vers l'extérieur ;
- `center` → moitié à l'intérieur, moitié à l'extérieur.

Une largeur par côté se rend côté par côté. Un `width: null` ne se rend pas.
Lorsque plusieurs contours visent la même cible, composer une seule déclaration,
les tracés intérieurs d'abord.

Un `ring` se rend avec les propriétés publiées par `rendering.roles.ring` ; son
repli ne sert que si ces propriétés ne suffisent pas. S'il vise la même cible
qu'un autre contour, composer les deux sans écraser l'un par l'autre. Pour un
état associé au focus, le ring contractuel remplace l'indicateur natif et
n'apparaît qu'au focus clavier, jamais au simple clic (§6.5).

### 4.3 Typographie

Pour chaque usage de `view.typography`, joindre `slotPath` dans l'arbre puis
`textStyles[usage.style]`. Appliquer uniquement les références présentes parmi
`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, toutes
par le résolveur. `figmaName` est une identité, jamais un chemin de token ni un
contenu.

### 4.4 Icônes

La vue exacte décide quelles icônes existent et où : partir de `view.icons`,
puis joindre sa clé au catalogue global `icons`.

- `slotPath` situe l'icône dans cette vue ;
- `size` définit sa boîte et alimente le point d'intégration (§6.4) ;
- `strict` rend toujours `figmaName` ;
- `modifiable` rend la valeur de `runtimeProp`, avec `figmaName` en repli ;
- `visibilityProp` décide seulement si elle est visible, indépendamment du nom
  à rendre.

Ne pas réintroduire dans une vue une icône absente de `view.icons`. Ne pas
transformer les combinaisons de `icons.*.variants` en heuristique : si une table
est nécessaire, la recopier littéralement.

### 4.5 États

`stateModel.states` associe chaque état à son sélecteur ; `stateModel.precedence`
les classe du plus fort au plus faible. Sélectionner l'entrée de `variants` dont
`values[stateModel.axis]` égale l'état effectif.

Reproduire les sélecteurs avec les événements de pointage et de clavier de la
cible. L'état désactivé vient du booléen applicatif correspondant. Le focus
clavier se distingue du clic par le moyen de la plateforme (§6.5). À chaque
rendu, résoudre tous les états actifs selon `precedence`, sans coder leur
priorité ailleurs. Un état au sélecteur `null` autre que le défaut n'a pas de
déclencheur portable : le signaler.

### 4.6 Dépendances

`view.composes` est la séquence exacte de la combinaison courante. Le `composes`
global est son union ordonnée **à cardinalité maximale** : il donne les imports
et le nombre maximal d'occurrences, pas la liste à rendre dans chaque vue.

Pour chaque slot portant `composes`, importer le composant local correspondant
et le rendre à cet emplacement. **Conserver chaque occurrence explicitement dans
le source** : le contrôle de parité les compte statiquement (§5, §6.7). Une
occurrence absente de la vue courante se neutralise sur place, elle ne se retire
pas du source. Respecter `visibilityProp` sur l'instance ou son cadre.

Lire le contrat enfant pour son API, sa taille propre et son échantillon. Ne
recopier aucun de ses calques, tokens ou styles dans le parent.

### 4.7 Échantillons

`samples` est la seule donnée non normative : contenus et réglages montrés par
la maquette, jamais un token, une dimension ou un layout. Les rendre comme
défauts applicatifs remplaçables. En cas de conflit, toute donnée normative
l'emporte.

Résoudre `variants[].sample`, puis :

1. appliquer `sample.args` seulement aux clés réellement exposées ; l'axe d'état
   sert à choisir la variante, il ne se transmet pas comme prop ;
2. joindre chaque `sample.text[].slotPath` dans la vue et utiliser `value` comme
   contenu par défaut du slot ; ne jamais utiliser `figmaLayer` comme texte ;
3. joindre une dépendance racine par son `slotPath` ;
4. choisir la variante du contrat enfant avec ses `args`, complétés par les
   défauts de l'enfant, puis appliquer d'abord son propre sample ;
5. superposer les `args`, `overrides`, `swaps` et `composes` du parent, puis
   recommencer récursivement sans limite arbitraire.

Pour un échantillon d'instance imbriqué, rester relatif au propriétaire
immédiat : parcourir sa séquence de dépendances directes dans l'ordre, puis
rapprocher `component` et `figmaLayer`. Deux occurrences homonymes sont deux
positions, jamais une map par nom.

Une valeur `false` est explicite ; une clé absente laisse le défaut enfant.
`overrides` ne change que le texte ou la visibilité du `figmaPath` visé. Pour
chaque `swap`, joindre le dernier segment de `masterPath` à exactement un
`icons.*.figmaName` du contrat enfant, puis passer `component` à son
`runtimeProp`. Zéro ou plusieurs correspondances : omettre cet atome et
rapporter l'ambiguïté.

---

## 5. Ce qui ne s'invente pas

Ces interdits valent partout, à chaque étape. Ils sont rassemblés ici parce
qu'une règle oubliée coûte la reconstruction entière.

**Ne pas ouvrir l'ancienne implémentation du composant**, ni son export public,
ni un composant voisin pris comme modèle, ni un historique, un diff ou une
capture. Ni directement, ni par une commande qui affiche plusieurs fichiers à la
fois. Les identifiants publics attendus par les consommateurs se découvrent par
les erreurs du contrôle de type (§6.6), jamais en lisant un source.

**Ne pas fusionner deux vues.** Une vue avec la vue par défaut, avec la
projection `structure`, ou avec une autre vue : jamais. Une clé absente d'une
vue reste absente.

**Ne pas déduire d'un nom.** Ni la propriété à écrire, ni la cible d'une
peinture, ni un rapprochement de slot : le contrat publie ces liens, on les lit.

**Ne pas produire de cartésien**, ni de chemin interpolé, ni de règle métier qui
reconstitue une table énumérée.

**Ne pas combler une clé absente**, ni par un défaut inventé, ni en reprenant la
valeur d'une entrée voisine.

**Ne pas retirer une occurrence de dépendance du source.** Le contrôle de parité
compte les occurrences statiquement, sans exécuter le branchement : la
cardinalité maximale publiée par `composes` doit se retrouver littéralement dans
le fichier, quelles que soient les variantes qui les affichent réellement.

**Ne pas affaiblir un test ou un contrôle**, ni corriger l'artefact exporté, ni
compenser dans le code un manque du contrat. Un manque se rapporte (§2.8).

---

## 6. Ancrage projet

Le contrat et les règles ci-dessus sont indépendants de la technologie cible.
Seuls les sept points suivants en dépendent. Leur forme concrète se lit dans le
document de conventions du projet, pas dans le source d'un composant.

1. **Identifiants publics**, comment se nomment le point d'entrée du composant
   et sa surface de propriétés, et ce que le contrôle statique attend d'eux.
2. **Attributs natifs**, le moyen de soustraire mécaniquement les collisions
   entre les noms de props contractuels et ceux de la plateforme, sans liste
   maintenue à la main.
3. **Résolution d'une référence de token**, le helper qui transforme
   `{chemin.du.token}` en valeur utilisable par la cible.
4. **Point d'intégration d'icône**, ce qui reçoit un nom et une taille et rend
   l'icône.
5. **Focus clavier** (le moyen de le distinguer d'un clic, pour §4.2 et §4.5.
6. **Contrôles**) la commande de contrôle de contrat, et le contrôle de
   type/syntaxe de la cible. Ce sont les deux seules à lancer depuis ce skill
   (§2.7). **Aucune ne cible un composant**, et il ne faut pas en chercher une :
   le contrôle de contrat balaie tout le repository et rend un rapport où le
   composant en cours se retrouve à son nom. Un contrôle qui balaie coûte
   quelques secondes de plus ; un contrôle qu'on croit ciblé et qui ne l'est pas
   ferait lire un verdict portant sur autre chose.
7. **Comptage statique des dépendances**, la forme que doit prendre une
   occurrence dans le source pour que le contrôle de parité la compte (§5).
