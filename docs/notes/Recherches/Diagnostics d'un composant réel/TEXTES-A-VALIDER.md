# Textes à valider avant L6 et L9

Porte H1 du [plan](./PLAN-DIAGNOSTICS-COMPOSANT-REEL.md). Chaque message
nouveau ou modifié par L6 et L9 est proposé en deux ou trois rédactions, ses
trois parties séparées. L'exemple rendu reprend le composant de la section 1
du plan sous des noms neutres : un component set « Button » de 140 variants,
nommés comme « Color=Primary, Variant=Filled, State=Focused ».

Le mainteneur choisit une rédaction par message, ou la réécrit. L6 et L9
reprennent le texte retenu mot pour mot. La section « Textes retenus » en bas de
ce fichier donne ce que L6 et L9 écrivent.

## L6 : un message sur la racine d'un variant se regroupe

Trois messages visent aujourd'hui la racine de chaque variant du set exporté,
une ligne par variant, parce que leur sujet écrit le nom du variant :

- une borne sans variable : 140 lignes « il fixe min width sans variable
  Figma » ;
- une propriété sans champ : 28 lignes « effect : le contrat n'a aucun champ
  pour cette propriété » ;
- un champ sans variable, que `resolveField` relève sur la racine (`gap`,
  `padding`, `corner radius`) : absent du composant de la section 1, possible
  sur un autre.

Après L6, chacun donne une ligne. Ses cibles restent les racines concernées, et
le bouton de la carte dit « Sélectionner les 140 calques ». Le texte ne peut
pas porter le nombre de variants : le moteur émet la ligne variant par variant,
et la fusion se fait sur le texte.

Un message qui parle d'un variant précis garde le genre `Variant` et le nom de
ce variant, par exemple « il ne contient pas l'instance … ».

### Le sujet

Le sujet actuel, `Layer « Color=Primary, Variant=Filled, State=Default »`,
nomme un seul des 140 calques. `Layer « Button »` ferait chercher la propriété
sur le component set, qui ne la porte pas.

| | Sujet | Rendu du titre |
|---|---|---|
| A | `Variants de « Button »` | Variants de « Button » : ils fixent min width sans variable Figma. |
| B | `Component Set « Button »`, et « des variants » dans le constat | Component Set « Button » : des variants fixent min width sans variable Figma. |
| C | `Variant « … »` du premier variant, suivi de « et les autres variants concernés » | Variant « Color=Primary, Variant=Filled, State=Default » et les autres variants concernés : il fixe min width sans variable Figma. |

A nomme ce qui porte la propriété et le set où la trouver. B garde un genre que
Figma affiche, mais le constat doit alors dire « des variants ». C montre un
nom exact que le designer peut chercher, et le titre devient long.

### La borne sans variable

Texte actuel, pour une racine :

- titre : Layer « Color=Primary, Variant=Filled, State=Default » : il fixe min
  width sans variable Figma.
- impact : Le contrat ne publie que les bornes reliées à une variable : le
  développeur rendra ce layer sans elles.
- action : Reliez ces bornes à une variable, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Variants de « Button » : ils fixent min width sans variable Figma. | Le contrat ne publie que les bornes reliées à une variable : le développeur rendra ce composant sans elles. | Reliez ces bornes à une variable dans chaque variant, puis réexportez. |
| 2 | Variants de « Button » : ils fixent min width sans variable Figma. | Le développeur rendra ce composant sans min width. | Sélectionnez ces variants, reliez min width à une variable, puis réexportez. |
| 3 | Component Set « Button » : des variants fixent min width sans variable Figma. | Le contrat ne publie que les bornes reliées à une variable : le développeur rendra ces variants sans elles. | Reliez ces bornes à une variable dans chaque variant concerné, puis réexportez. |

La rédaction 2 nomme la borne dans l'impact et fait de la sélection le premier
geste ; elle suppose que le designer lise le bouton de la carte.

### La propriété sans champ

Texte actuel, pour une racine :

- titre : Layer « Color=Primary, Variant=Filled, State=Focused », effect : le
  contrat n'a aucun champ pour cette propriété.
- impact : Le développeur n'aura pas l'ombre ou le flou de ce layer.
- action : Retirez cet effect si le rendu peut s'en passer, ou signalez cette
  limite au mainteneur du plugin, puis réexportez.

Le même gabarit sert à `opacity`, `blend mode`, `mask` et aux autres propriétés
de `unsupportedProperties.ts`. Seul le mot qui désigne le porteur change : « ce
layer » devient le pluriel du sujet retenu.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Variants de « Button », effect : le contrat n'a aucun champ pour cette propriété. | Le développeur n'aura pas l'ombre ou le flou de ces variants. | Retirez cet effect si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 2 | Variants de « Button », effect : le contrat n'a aucun champ pour cette propriété. | Le développeur rendra ces variants sans leur ombre ou leur flou. | Retirez cet effect de chaque variant si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| 3 | Component Set « Button », effect : des variants portent une propriété que le contrat n'a pas de champ pour écrire. | Le développeur n'aura pas l'ombre ou le flou de ces variants. | Retirez cet effect si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |

### Le champ sans variable

Texte actuel, pour une racine :

- titre : Layer « Color=Primary, Variant=Filled, State=Default », gap : aucune
  variable Figma n'est reliée.
- impact : Le développeur n'aura pas cette valeur.
- action : Reliez-la à une variable, puis réexportez.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | Variants de « Button », gap : aucune variable Figma n'est reliée. | Le développeur n'aura pas cette valeur. | Reliez-la à une variable dans chaque variant, puis réexportez. |
| 2 | Variants de « Button », gap : aucune variable Figma n'est reliée. | Le développeur n'aura pas cette valeur. | Reliez-la à une variable, puis réexportez. |

La rédaction 2 garde le texte actuel et ne change que le sujet ; le bouton de
la carte porte seul le nombre de variants.

## L9 : le message de collision nomme les fichiers

Le refus actuel ne nomme que les composants. Sur le composant de la section 1,
le dépôt de recette portait déjà un contrat « Button » exporté depuis un autre
fichier Figma. Le designer lit :

> « Button » et « Button » produisent le même identifiant : leurs deux contrats
> s'écrivent dans `components/Button/Button.contract.json`, et cet export
> écraserait celui de « Button » (branche main). Renommez l'un des
> deux composants dans Figma, puis relancez l'export.

Le kit lit `fileName` des deux contrats. Deux cas se distinguent : les deux
composants viennent de deux fichiers, ou du même fichier. Un contrat existant
sans `fileName` garde le texte actuel.

### Deux fichiers différents

Exemple : le contrat existant vient de « Fichier de recette », le candidat de
« Design system ».

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | « Button » du fichier « Design system » et « Button » du fichier « Fichier de recette » produisent le même identifiant. | Cet export écraserait, dans `components/Button/Button.contract.json`, le contrat venu de « Fichier de recette » (branche main). | Si ce dépôt doit recevoir le composant de « Design system », un développeur supprime d'abord l'autre contrat du dépôt ; sinon, renommez l'un des deux composants dans Figma. Relancez ensuite l'export. |
| 2 | Ce dépôt porte déjà un contrat « Button », exporté depuis le fichier « Fichier de recette ». | Exporter le « Button » du fichier « Design system » écraserait ce contrat dans `components/Button/Button.contract.json` (branche main). | Exportez vers le dépôt de ce design system, ou renommez l'un des deux composants dans Figma, puis relancez l'export. |
| 3 | « Button » vient du fichier « Design system », et le contrat « Button » du dépôt vient du fichier « Fichier de recette ». | Les deux s'écrivent dans `components/Button/Button.contract.json` : cet export écraserait le contrat existant (branche main). | Choisissez un autre dépôt dans la configuration du plugin, ou renommez l'un des deux composants dans Figma, puis relancez l'export. |

La rédaction 2 part de ce que le dépôt contient ; les rédactions 2 et 3
proposent de changer de dépôt, ce que le plugin permet sans développeur.

### Même fichier

Exemple : deux composants du fichier « Design system », « Button » et
« button », que la normalisation confond.

| | Titre | Impact | Action |
|---|---|---|---|
| 1 | « Button » et « button », du fichier « Design system », produisent le même identifiant. | Leurs deux contrats s'écrivent dans `components/Button/Button.contract.json`, et cet export écraserait celui de « button » (branche main). | Renommez l'un des deux composants dans Figma, puis relancez l'export. |
| 2 | Le fichier « Design system » porte deux composants au même identifiant : « Button » et « button ». | Cet export écraserait le contrat de « button » dans `components/Button/Button.contract.json` (branche main). | Renommez l'un des deux composants dans Figma, puis relancez l'export. |

## Textes retenus

Le mainteneur a réécrit les rédactions proposées. Le moteur n'a que trois
parties par message : l'intitulé devient le titre, et la phrase qui le suit
ouvre l'impact. Aucun titre de L6 ne nomme un calque, et `**` met un passage en
gras dans le plugin et dans la demande de fusion.

### L6

| Message | Titre | Impact | Action |
|---|---|---|---|
| Borne sans variable | Propriété sans token associé. | Des variants déclarent un **min width** sans token. Le contrat ne publiera que les paramètres reliés à un token. | Reliez ces paramètres à une variable dans chaque variant concerné, puis réexportez. |
| Propriété sans champ (`effect`) | Propriété non supportée par le moteur. | Le contrat n'exportera pas l'ombre ou le flou de ces variants. | Retirez cet effect si le rendu peut s'en passer, ou signalez cette limite au mainteneur du plugin, puis réexportez. |
| Champ sans variable (`gap`) | gap : aucun token n'est relié à cette propriété. | Le contrat n'exportera pas cette propriété. | Reliez-la à un token, puis réexportez. |

Deux bornes sans variable sur les mêmes racines s'écrivent « des variants
déclarent **min width** et **max width** sans token ».

### L9

| Cas | Titre | Impact | Action |
|---|---|---|---|
| Deux fichiers Figma | « Button » vient du fichier « Design system », et le contrat « Button » du dépôt vient du fichier « Fichier de recette ». | Les deux s'écrivent dans `components/Button/Button.contract.json` : cet export écraserait le contrat existant (branche main). | Choisissez un autre dépôt dans la configuration du plugin, ou renommez l'un des deux composants dans Figma, puis relancez l'export. |
| Même fichier Figma | Le fichier « Design system » porte deux composants avec le même identifiant : « Button » et « button ». | Cet export écraserait le contrat de « button » dans `components/Button/Button.contract.json` (branche main). | Renommez l'un des deux composants dans Figma, puis relancez l'export. |

Le composant exporté est nommé en premier, le contrat déjà présent en second.

### Opacité sans variable (E2)

Retenu à la porte H1 du [plan d'évolution](./PLAN-EVOLUTION-MOTEUR.md), avec
les autres textes de ce plan, que le journal
[PREUVES-EVOLUTION-MOTEUR.md](./PREUVES-EVOLUTION-MOTEUR.md) recopie en
entier. Un texte entre ici avec le lot qui l'écrit.

| Cible | Titre | Impact | Action |
|---|---|---|---|
| Un layer | Layer « Overlay », opacity : aucune variable associée. | Le contrat ne transmettra pas l'opacité de ce layer. | Reliez opacity à une variable, puis réexportez. |
| Les racines | opacity : aucune variable associée. | Le contrat ne transmettra pas l'opacité des variants concernés. | Reliez opacity à une variable dans chaque variant concerné, puis réexportez. |

### Effets (E3)

Ces textes remplacent celui de la propriété sans champ `effect` retenu pour L6.

| Message | Titre | Impact | Action |
|---|---|---|---|
| Effet sans style, un layer | Layer « Card », effect : aucun effect style appliqué. | Le contrat ne transmettra pas l’ombre ou le flou de ce layer. | Appliquez à ce layer un effect style qui correspond au rendu souhaité, puis réexportez. |
| Effet sans style, les racines | effect : aucun effect style appliqué. | Le contrat ne transmettra pas les ombres ou les flous des variants concernés. | Appliquez un effect style à chaque variant concerné, puis réexportez. |
| Style introuvable | Layer « Card » : l’effect style appliqué est introuvable. | Le contrat ne transmettra pas l’ombre ou le flou de ce layer. | Appliquez de nouveau un effect style accessible dans Figma, puis réexportez. |
| Effets modifiés | Layer « Card » : ses effects diffèrent du style « Shadow/Focus ». | Le contrat transmettra les réglages du style, sans les modifications propres à ce layer. | Réappliquez le style pour retrouver ses réglages, ou créez et appliquez un style correspondant au rendu souhaité, puis réexportez. |
| Réglage sans variable | Effect style « Shadow/Focus », y : aucune variable associée. | Le contrat ne transmettra pas le décalage vertical de cette ombre. | Dans l’effect style, reliez y à une variable, puis réexportez. |
| Effet non pris en charge | Effect style « Glass/Frost » : l’effet Glass n’est pas pris en charge. | Le contrat transmettra ce style sans l’effet Glass. | Si cet effet est nécessaire, signalez cette limite au mainteneur du plugin. Sinon, retirez-le du style, puis réexportez. |

Le réglage sans variable décrit chaque champ : la couleur, le décalage
horizontal ou vertical, le flou et l’étendue d’une ombre, le rayon d’un flou.
Une ombre hors du mode « Normal » se nomme « Drop shadow en mode de fusion
« Multiply » », une ombre visible derrière le calque « Drop shadow visible
derrière le layer ». Le style introuvable et l’écart au style n’ont pas de texte
de groupe : ils gardent une ligne par racine.

### Sans auto layout (E4)

| Message | Titre | Impact | Action |
|---|---|---|---|
| Dimension sans variable, un layer | Layer « Badge », height : aucune variable associée. | Le contrat ne transmettra pas la hauteur de ce layer sans auto layout. | Reliez height à une variable, ou configurez un auto layout adapté au contenu, puis réexportez. |
| Dimension sans variable, les racines | height : aucune variable associée sur des variants sans auto layout. | Le contrat ne transmettra pas la hauteur des variants concernés. | Reliez height à une variable dans chaque variant concerné, ou configurez leur taille avec un auto layout, puis réexportez. |
| Absence d'auto layout, les racines | Variants sans auto layout. | Leurs layers ne se déplaceront pas automatiquement lorsque le contenu d’un layer voisin grandit. | Si la disposition doit s’adapter au contenu, configurez un auto layout dans chaque variant concerné, puis réexportez. |
| Gap et padding, les racines | gap et padding : aucun auto layout configuré. | Le contrat ne transmettra aucune valeur de gap ou de padding pour ces variants. | Pour transmettre ces espacements, configurez un auto layout et reliez les valeurs de gap et de padding à des variables, puis réexportez. |

Sur un layer, « il n'utilise pas d'auto layout », « il range N layers » et « il
enveloppe » gardent leur titre et leur action, et prennent un impact nouveau
quand les layers sont placés par leurs contraintes : « Les layers ne se
déplaceront pas automatiquement pour laisser de la place à un texte plus long ou
à un layer voisin plus grand. » La largeur s'écrit « width » et « la largeur ».

### Propriétés sans champ, sur les racines (E6)

| Propriété | Titre | Impact | Action |
|---|---|---|---|
| Fill non uni | fill : dégradé ou image non pris en charge. | Le contrat ne transmettra pas les fills en dégradé ou en image. | Si ce rendu est nécessaire, signalez cette limite au mainteneur du plugin. Sinon, remplacez les fills concernés par des couleurs unies reliées à des variables, puis réexportez. |
| Blend mode | blend mode : ce mode de fusion n’est pas pris en charge. | Le contrat ne transmettra pas le mode de fusion des variants concernés. | Si ce mode de fusion est nécessaire, signalez cette limite au mainteneur du plugin. Sinon, choisissez « Normal » dans chaque variant concerné, puis réexportez. |
| Mask | mask : le masquage n’est pas pris en charge. | Le contrat ne transmettra pas le découpage produit par ces masks. | Si ce découpage est nécessaire, signalez cette limite au mainteneur du plugin. Sinon, désactivez les masks concernés, puis réexportez. |
| Pointillé | stroke : le pointillé n’est pas pris en charge. | Le contrat ne transmettra pas le motif de pointillé de ces strokes. | Si le pointillé est nécessaire, signalez cette limite au mainteneur du plugin. Sinon, choisissez un trait plein dans chaque variant concerné, puis réexportez. |

Le stroke non uni reprend le texte du fill, « fill » devenant « stroke ».

### Refus d'un champ, sur les racines (E7)

| Message | Titre | Impact | Action |
|---|---|---|---|
| Vertical gap « Auto » | vertical gap : la valeur « Auto » n'est pas exportée. | Le contrat ne transmettra pas la répartition automatique de l'espace entre les lignes. | Pour transmettre un espacement fixe, reliez vertical gap à une variable dans chaque variant concerné, puis réexportez. |
| Côtés sur des variables différentes | stroke weight : les côtés utilisent des variables différentes. | Le contrat ne transmettra pas l'épaisseur du stroke des variants concernés. | Dans chaque variant concerné, reliez les épaisseurs des côtés à une même variable, puis réexportez. |
| Réglages contradictoires | corner radius : plusieurs variables définissent la même valeur. | Le contrat ne transmettra pas le corner radius des variants concernés. | Dans chaque variant concerné, retirez les liaisons contradictoires pour ne conserver qu'une variable pour cette valeur, puis réexportez. |
| Côtés sans variable | horizontal padding : certains côtés n'ont pas de variable associée. | Le contrat transmettra uniquement les valeurs des côtés reliés à une variable. | Reliez les côtés manquants à des variables dans chaque variant concerné, puis réexportez. |

Un rayon dit « coins » au lieu de « côtés ». Une variable introuvable s'écrit
« certains côtés utilisent une variable introuvable ». Un autre champ que le
stroke weight écrit « le <champ> » dans l'impact et « les côtés » dans l'action
des côtés reliés à des variables différentes. `nodeBindings.ts` emploie
l'apostrophe droite.

### Disposition illisible (E8)

| Message | Titre | Impact | Action |
|---|---|---|---|
| Alignement d'auto layout, les racines | auto layout : l'alignement ne peut pas être lu. | Le contrat ne transmettra pas l'alignement des layers dans les variants concernés. | Définissez de nouveau l'alignement sur les deux axes dans chaque variant concerné, puis réexportez. |
| Piste de grille, les racines | Grille, colonne 2 : la taille ne peut pas être lue. | Le contrat indiquera une taille automatique pour cette colonne. | Définissez de nouveau la taille de la colonne 2 dans chaque variant concerné, puis réexportez. |
| Alignement d'un enfant de racine | Layer « Label » : son alignement dans l'auto layout ne peut pas être lu. | Le contrat ne précisera pas comment aligner ce layer dans les variants concernés. | Définissez de nouveau son alignement dans l'auto layout de chaque variant concerné, puis réexportez. |
| Layout grow d'un enfant de racine | Layer « Label » : son réglage d'étirement n'est pas pris en charge. | Le contrat ne précisera pas si ce layer doit occuper l'espace disponible. | Choisissez Fill ou Fixed pour sa largeur dans un auto layout horizontal, ou pour sa hauteur dans un auto layout vertical, puis réexportez. |

Une ligne de grille s'écrit « ligne 2 » et « cette ligne ». `flexLayout.ts`
emploie l'apostrophe droite.

### Ajustements de forme

- Les titres de L6 finissent par un point : la phrase compacte de
  `meta.diagnostics` et de la demande de fusion joint titre, impact et action.
- « reliées » devient « reliés », qui s'accorde avec « paramètres ».
- Chaque fichier garde son apostrophe : droite dans `nodeBindings.ts` et
  `depot.ts`, typographique dans `unsupportedProperties.ts`.

## Reste à valider

L6 n'écrit un texte de groupe que pour ce que le mainteneur a validé. Sur la
racine d'un variant, ces messages gardent une ligne par variant jusqu'au lot qui
écrit leur texte retenu :

- les côtés sans variable d'un groupe qui ne publie aucun côté.
