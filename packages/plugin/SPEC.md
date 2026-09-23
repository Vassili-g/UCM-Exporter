# UCM Contract Exporter — spécification

Ce document décrit le **moteur** : ce que le plugin lit dans Figma, ce qu'il
élit, ce dont il avertit, et ce qu'il dépose sur une forge. La forme de ce qu'il
produit est décrite dans [docs/format/FORMAT.md](../../docs/format/FORMAT.md).

## Objet

[CONCEPT.md](../../CONCEPT.md) porte le pourquoi et la répartition des
responsabilités. Le plugin produit :

- un contrat JSON décrivant la partie visuelle d’un composant ;
- un export DTCG des variables locales, avec leurs alias et leurs modes.

Ce que ces deux artefacts contiennent, et ce que leur silence dit, appartient à
[docs/format/FORMAT.md](../../docs/format/FORMAT.md) : ce document-ci ne parle que de la
lecture de Figma.

## Contexte technique

- Plugin Figma (Plugin API) : pas d'API Variables REST ni de Code Connect.
  `api.github.com` et `gitlab.com` sont autorisés pour le dépôt optionnel des
  artefacts ;
- Tourne dans l'éditeur, produit des fichiers en téléchargement sans config
  valide, ou les dépose sur une branche dédiée de la forge avec une config valide.
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2). Le réglage
  « Gérer les tokens », dans l'onglet Général de la configuration, retire la
  seconde. Il est activé par défaut et rangé sur le poste.
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. L'UI expose le
  statut de la connexion, les commandes, la configuration, un compte rendu, un retour
  en direct sur la sélection, et en pied de page la version de schéma que le
  bundle chargé produit. Figma peut servir un bundle plus ancien que celui du
  disque, et rien d'autre ne le dirait.

- **Les deux commandes projettent un nom de la même façon**, et citent un token
  sous la même forme. La règle est celle du format,
  [Nommer et citer un token](../../docs/format/FORMAT.md#nommer-et-citer-un-token), et
  `normalizeName()` en est l'implémentation partagée. Ce qui appartient à ce
  document est le fait qu'une seule implémentation serve les deux commandes :
  deux projections du même nom divergeraient, et un contrat citerait alors un
  token que `tokens.json` n'écrit pas sous ce nom.

### Analyses et publication

Le routeur exécute une seule analyse ou publication à la fois. Chaque commande
conserve son résultat et la demande de publication indique lequel envoyer.
L'annulation se vérifie aussi après le dernier appel asynchrone du moteur.

Un changement des identifiants sélectionnés invalide le contrat conservé et
annule son analyse en cours, même si le nouveau composant porte le même nom.
La seconde notification d'une sélection inchangée conserve le résultat.
Une panne de configuration laisse téléchargeable le fichier déjà produit.

L'analyse d'un composant lit aussi l'état des tokens du repository
(`lireAvantEcriture`, option `avecTokens`) : sur la branche de base, dans une
demande d'export ouverte, ou nulle part. Dans les deux derniers cas, le verdict
garde l'action de publier et demande de faire fusionner les tokens d'abord, le
contrôle du repository refusant la demande du composant jusque-là. La
publication ne refait pas cette lecture.

Gestion des tokens désactivée, le plugin ne lit ni les collections du fichier
à l'ouverture, ni l'état des tokens du repository : le verdict d'un composant
ne porte aucune consigne sur les tokens. Le sandbox refuse l'analyse et la
publication des tokens, même si l'interface les demande. Les lectures de
variables qui servent au contrat restent actives. Basculer le réglage annule
une analyse en cours et laisse finir une publication.

Chaque résultat d'analyse ou de publication porte sa clé de destination : le
dépôt visé, le téléchargement ou l'export local, et le réglage des tokens. La publication
refuse une analyse dont la clé diffère de celle qu'elle relit, en nommant le
changement. L'interface vide ses cartes quand la clé change, et écarte les
résultats d'une autre destination.

## Hypothèses sur le design system

Ce que le contrat suppose d'un design system (clé de base, allongement,
déclaration d'un rôle) est décrit par [Hypothèses sur le design
system](../../docs/format/FORMAT.md#hypothèses-sur-le-design-system).

Les noms de collections et le nombre de niveaux d’alias sont libres. Le moteur
gère les chaînes profondes et les alias de tous types.

Le fichier Figma de référence utilise plusieurs niveaux (primitives, marques,
tokens sémantiques, composants et dimensions) uniquement pour éprouver cette
généricité. Sa structure n’est pas imposée aux autres design systems.

---

## Partie 1 — Export composant (moteur générique)

Décrit **n'importe quel** composant ou component set en lisant sa vraie
structure Figma. **Rien n'est codé en dur sur un composant précis** : les règles
« intelligentes » sont auto-détectées (nom d'axe, valeurs, rôle de calque) et
centralisées dans `semantics.ts`. Button sert d'exemple de référence.

**Entrée** : exactement un `COMPONENT` ou un `COMPONENT_SET` sélectionné. Les
règles de `.componentRules` enrichissent l'intention mais ne conditionnent pas
la fidélité de l'export. Ce qu'un set clairsemé produit dans `variants`, et ce
qu'un consommateur a le droit d'en composer, est décrit par [Partie
1](../../docs/format/FORMAT.md#ce-que-le-contrat-publie-champ-par-champ).

### Algorithme

#### La règle commune

Le silence commun à ces champs (une variable se publie, un nombre brut avertit,
une valeur neutre reste absente sans un mot) est décrit par [La règle
commune](../../docs/format/FORMAT.md#la-règle-commune).

Le geste demandé au designer est toujours de **nommer** la valeur, jamais de la
retirer du design.

#### 1. Props

Ce que `props` contient est décrit par [1. Props](../../docs/format/FORMAT.md#1-props).
Ce document garde la lecture des component properties de Figma et l'élection de
la surface publique.

Les props du contrat tiennent dans un espace de noms plat, là où deux component
properties parfaitement légales peuvent prétendre à la même clé : la
normalisation efface leur différence d'écriture (`Icon Left`, `icon-left` et
`iconLeft` donnent tous `iconLeft`). Deux règles tranchent, et la seconde est
une **précondition d'export**.

- **Les axes réservent leur clé avant les autres propriétés.** Sans cette
  priorité, une `BOOLEAN` déclarée plus haut dans le fichier prenait la clé de
  l'axe : `structure.variantAxes` citait alors un nom que `props` décrivait
  comme un booléen, et les valeurs des variants n'avaient plus d'enum où se
  lire. Le résultat cessait aussi de dépendre du seul fichier Figma pour
  dépendre de l'ordre de ses déclarations. L'axe d'états réserve sa clé comme
  les autres, sans devenir une prop.
- **Deux axes qui se confondent refusent l'export.** Ailleurs, le premier arrivé
  garde la clé et le second produit un avertissement ; ici, aucune des deux
  propriétés ne peut être servie sans l'autre, puisque leurs valeurs sont les
  coordonnées des variants. `structure.variantAxes` citerait deux fois le même
  nom et chaque variant ne publierait qu'une des deux coordonnées, ce que les
  lecteurs refusent. `collidingVariantAxes` (`parsers.ts`) nomme la paire,
  `handleExportComponent` lève avant toute extraction, et **aucun artefact ne
  sort**. Le geste appartient au designer : renommer l'une des deux dans Figma.

#### 2. Tokens de variantes

Ce que `tokens` et `strokes` contiennent (la clé d'une couleur, son allongement,
les rôles, les emplacements de peinture) est décrit par [2. Tokens de
variantes](../../docs/format/FORMAT.md#2-tokens-de-variantes). Ce document garde la
façon dont le moteur lit les peintures d'un calque et ce qu'il en dit.

La couleur publiée et l'avertissement sortent de la même lecture, peinture par
peinture : la variable d'un paint est celle qu'il porte lui-même. Une peinture
sans effet ne publie donc pas plus sa couleur qu'elle ne réclame la sienne, et
un fill masqué relié ne couvre pas le fill visible posé à la main. Quand cette
lecture ne peut pas conclure, la liste du node reprend la main sans avertir :
perdre une couleur coûterait plus qu'un diagnostic manquant.

#### 3. Layout

Ce que `layout`, `sizes` et les bornes contiennent est décrit par [3.
Layout](../../docs/format/FORMAT.md#3-layout). Ce document garde l'élection du node de
layout et ce que cette élection écarte.

Le **node de layout** d'un variant est le calque dont les enfants directs
deviennent ses slots. Il s'élit au score : le calque qui porte le plus de
dimensions complètes liées, la racine à défaut. Ce score dépend de la racine
d'où part la recherche, si bien que l'élection a lieu **une seule fois par
variant**, avec la même règle pour tous : depuis le wrapper de dimensions quand
le composant en possède un, sinon depuis le variant. Les slots, les slots
d'icônes et les chemins de `variantViews[variants[].view].typography` décrivent
donc toujours le même arbre. Un variant privé de ce wrapper est signalé plutôt
que rattrapé en silence.

Ce que l'élection écarte n'est pas oublié : un calque posé **à côté** du node
élu (un badge, un liseré, un second bloc) ne reçoit ni slot, ni typographie, ni
visibilité, alors que ses couleurs entrent bien dans `variants[].tokens`, relevé
sur le variant entier. Chaque calque écarté produit donc un avertissement.

La liste s'arrête là, délibérément : `RECTANGLE`, `ELLIPSE` et `LINE` en sont
exclus. Ce sont les formes dont le type ne dit rien de l'usage (une surface, un
liseré, un séparateur dont la hauteur est une vraie décision) et la règle « le
type du node ne tranche pas » les vise nommément.

**Applicabilité avant liaison.** Un gap et des paddings n'existent que sous un
auto-layout, et une liaison de variable survit à sa désactivation. L'exporteur
tranche donc l'applicabilité **avant** de regarder les liaisons, sans quoi un
`itemSpacing` resté lié exporterait un écart que le rendu n'a pas. Deux cas
produisent chacun leur propre diagnostic, distinct de « aucune variable reliée »
:

#### 4. Modèle d'interaction

Ce que `stateModel` contient est décrit par [4. Modèle
d'interaction](../../docs/format/FORMAT.md#4-modèle-dinteraction).

#### 5. Typographie

Ce que `textStyles` et `variantViews.*.typography` contiennent est décrit par
[5. Typographie](../../docs/format/FORMAT.md#5-typographie).

Chaque calque texte de chaque variant doit porter un text style Figma unique. Le
moteur lit l'objet `TextStyle`, conserve son nom exact dans
`textStyles.<clé>.figmaName`, puis résout ses `boundVariables` : `fontFamily`,
`fontSize`, `fontWeight` (fallback `fontStyle`), `lineHeight`,
`letterSpacing`, `paragraphSpacing` et `paragraphIndent`. La clé du catalogue
est le nom normalisé du style ; aucun lien vers les tokens n'est déduit de ce
nom. Chaque propriété non liée produit un warning et n'est jamais remplacée par
une valeur brute. `paragraphSpacing` et `paragraphIndent` à zéro ne réclament
aucune variable : un espacement nul ne change pas le rendu.

`textRendering.ts` lit sur le même `TextStyle` les propriétés qu'aucune
variable ne peut porter, et les publie dans `literals`. Un style sans variable
reliée est publié s'il porte des `literals`, et absent du catalogue sinon. Les
champs d'usage (`textAlign`, `alignContent`, `lineClamp`, `textOverflow`) sont
lus sur le calque texte.

Un calque peut modifier une propriété de son style. Quand `textCase`,
`textDecoration`, `textWrapStyle` ou `leadingTrim` diffère entre le calque et
son style, ou vaut « mixed » sur le calque, un warning nomme le layer et le
style. Le contrat publie la valeur du style. Le contrôle porte sur chaque
calque, y compris quand le style vient du cache de `loadTextStyle`.

Figma garde aussi le `textStyleId` quand une plage reçoit du gras ou de
l'italique par-dessus le style (`textStyleOverrides`, types `SEMANTIC_WEIGHT` et
`SEMANTIC_ITALIC`). Le moteur lit ces surcharges plage par plage et avertit. Il
ne compare pas le `fontName` du calque à celui du style : sous un mode de
variable, les deux diffèrent sans qu'aucune surcharge existe.

Une troncature sans `maxLines` avertit quand elle agit : sous `textAutoResize`
`NONE` ou `TRUNCATE`, ou sous un `maxHeight`. Sous `HEIGHT` ou
`WIDTH_AND_HEIGHT` sans `maxHeight`, la boîte suit le texte et rien n'est coupé.

Les cinq réglages du soulignement (`textDecorationStyle`,
`textDecorationOffset`, `textDecorationThickness`, `textDecorationColor`,
`textDecorationSkipInk`) et `openTypeFeatures` n'ont aucun champ. Figma ne
documente pas leurs valeurs par défaut : la valeur neutre, qui n'avertit pas,
est celle que CSS rend sans déclaration. Les cinq réglages du soulignement
donnent un seul message, leur geste étant le même.

#### 6. Structure

Ce que `structure` et `children` contiennent (descente, bornes, flux,
dimensions, place hors du flux) est décrit par [6.
Structure](../../docs/format/FORMAT.md#6-structure). Ce document ne garde que ce que le
moteur tranche en lisant Figma : ce dont il avertit, ce qu'il arrondit, et où il
relève.

##### Un dessin que rien ne déclare

**Un dessin qu'aucune règle ne désigne avertit.** Le contrat n'exporte aucun
tracé : le seul moyen de dire « dessine ceci » est une règle `@icons`, qui nomme
l'icône à rendre. Un calque dont le sous-arbre ne porte ni texte, ni dépendance,
ni icône déclarée, mais bien un tracé, est donc publié avec sa place et ses
couleurs, et son dessin manque. C'est presque toujours l'icône qu'on a oublié de
déclarer, et le geste est le même dans les autres cas : la déclarer.

Le déclencheur est le **tracé**, jamais l'absence de texte : un cadre vide ou
une surface colorée se décrivent entièrement par leurs tokens. Le message part
une seule fois par dessin, et nomme le calque le plus profond qui contienne
encore tout le dessin, celui que le designer déclarerait : « skull », jamais le
« Vector » que Figma a nommé pour lui ni le cadre qui l'enveloppe. Un composant
qui est un dessin de bout en bout ne dit rien : une icône exportée pour
elle-même n'a aucune règle à se donner.

##### Position absolue : pourquoi des pixels

**Pourquoi un nombre, ici.** Un offset Figma ne se relie à aucune variable :
Figma ne le permet pas. Le geste que réclamait l'ancien avertissement n'existait
donc pas, et son seul effet était de laisser le développeur coller le layer dans
un coin. C'est la même exception que pour les pistes d'une grille, et elle a la
même forme : la valeur est publiée en pixels sous une **notice**, sans devenir
un token et sans rendre la couverture portable partielle.

Les valeurs sont arrondies à deux décimales, comme celles d'une grille : les
dix-sept chiffres d'un flottant Figma feraient bouger l'artefact d'un export à
l'autre. Un runtime qui n'expose ni la géométrie du layer, ni celle de son
parent, ne publie rien et n'avertit de rien, mieux vaut une absence qu'un
`NaNpx`.

##### Rotation : le seuil de neutralité

Sous le centième de degré, rien n'est publié : Figma stocke des flottants, et
une transformation successive y laisse des résidus qu'aucun écran ne rend et
qu'aucun designer ne peut remettre à zéro.

La mesure est arrondie à deux décimales. Elle vient d'un calcul de Figma, dont
les dix-sept chiffres feraient bouger l'artefact d'un export à l'autre sans
qu'aucun design ait changé.

##### Propriétés non portables : la portée du relevé

Ce relevé appartient à l'extraction, jamais à un balayage à part : le moteur
n'avertit que sur ce qu'il publie, et les entrailles d'une icône ou les calques
d'une dépendance ne regardent pas ce contrat-ci. Aucune valeur au défaut de
Figma ne produit de message : un `clip content` activé ne manque à personne, et
un rapport que le designer cesse de lire ne protège plus rien. C'est la seule
réserve, et elle se lit sur la valeur, jamais sur l'usage supposé du calque. Les
tracés internes d’une icône restent hors de la portée du relevé. Le seuil de
neutralité de la rotation est un centième de degré, très en dessous du premier
pixel visible et très au-dessus du bruit de flottant.

##### Passage à la ligne : les mots du message

Sous le wrap, Figma scinde son champ gap en deux. Les messages emploient donc «
horizontal gap » et « vertical gap », les intitulés que le panneau affiche.

#### 9. Échantillon de maquette

Ce qu'un échantillon contient, ce qu'il n'a pas le droit de porter et comment
ses adresses se résolvent est décrit par [9. Échantillon de
maquette](../../docs/format/FORMAT.md#9-échantillon-de-maquette). Ce document garde ce
que le moteur relève dans Figma, et ce qu'il omet plutôt que de deviner.

**Une notice, jamais un avertissement.** Deux échantillons là où le design en
attendait un révèlent un libellé retouché dans un seul variant. Le constat suit
ses jumeaux sur la structure et la composition, et emprunte le même canal : rien
ne manque, rien n'est à corriger.

#### 7. Intention et documentation des props

**[7. Intention et documentation des
props](../../docs/format/FORMAT.md#7-intention-et-documentation-des-props) porte toute
cette section, et ce cas limite demande d'être nommé.**

La grammaire des règles décrit ce que le moteur lit dans Figma, donc ce
document. Une instance de `.componentRules` sur la même page, dont le calque
`component-name` écrit le nom du composant documenté ; une instance de
`.ruleItem` par règle, dont un calque nomme le tag. Un calque lu qui contient
le marqueur `[À compléter]` rend sa règle, ou son conteneur, non rédigé. La
lecture porte sur la
page courante, alors que le relevé des dépendances couvre tout le document :
un jeu de règles rangé sur une autre page déclare la dépendance sans documenter
le composant. Mais chaque règle n'a de sens qu'à côté du champ qu'elle
remplit : `@icons` et sa politique, son slot, sa prop runtime, ses variants
forment une seule explication, et la couper en deux la rendrait illisible des
deux côtés.

La frontière entre les deux documents tranche ce cas : une règle à cheval va du
côté du consommateur, et le moteur y renvoie, puisque le moteur a le code sous
la main et non le repository qui lit l'artefact. Cette section est donc un
renvoi voulu, et non un oubli du dédoublonnage.

#### 8. Rendu sémantique et garde-fous

Toute propriété pertinente sans variable liée → warning précis (calque +
propriété), non exportée, **export non bloqué**. C'est la seule décision de ce
document dans cette section : comment un rôle se rend, et pourquoi aucun rôle de
contour ne cite une propriété qui consomme la boîte, appartient au format, [8.
Rendu sémantique et
garde-fous](../../docs/format/FORMAT.md#8-rendu-sémantique-et-garde-fous).

### Ce que l'export écrit

#### Le nom du fichier, et ce qu'il unifie

Le moteur ne choisit pas librement le nom de ce qu'il dépose : il projette le
nom Figma par `codeIdentifier`, l'unique autorité du kit sur cette question, et
n'écrit nulle part une seconde règle de nommage. La forme obtenue et les
exemples qui l'illustrent sont [du
format](../../docs/format/FORMAT.md#fichier-et-exemple) ; ce qui appartient au moteur
est qu'il conserve le nom Figma **intact** dans `name` à côté de l'identifiant
projeté. Aucune des deux valeurs ne se déduit de l'autre en sécurité, et publier
les deux évite au consommateur d'avoir à inverser une normalisation qui perd de
l'information.

**Ce que l'export unifie avant d'écrire.** Un composant se présente dans Figma
comme un `COMPONENT_SET`, parfois enveloppé d'un wrapper qui porte ses propres
component properties. Le moteur en publie un contrat, pas deux : il élit une
surface publique unique, owner direct plus wrapper élu, et le contrat décrit
cette API unifiée. C'est une décision d'extraction, prise dans
`propertySurface.ts`, et le format n'en garde que le résultat.

Les dimensions géométriques ne figurent qu'à un endroit : `sizes` les porte dès
que le composant expose un axe de tailles ; sinon `gap` / `padding` / `radius`
restent au niveau haut de `structure`. Cette question se tranche **avant** de
relever quoi que ce soit, et les avertissements suivent la même réponse : dès
qu'un axe de tailles existe, les dimensions du calque de référence ne sont ni
relevées ni signalées. Les signaler enverrait le designer relier une variable
sur un calque dont rien ne sera publié, et le message le nommerait par un nom de
layer commun à tous les variants du set, sans lui dire lequel ouvrir. Toute la
typographie appartient au catalogue `textStyles` et aux usages exacts de chaque
`variantViews`.

#### Composition et dépendances

Ce que `composes` et le cadre de dépendance contiennent est décrit par
[Composition et dépendances](../../docs/format/FORMAT.md#composition-et-dépendances).
Ce document garde la façon dont le moteur reconnaît une dépendance dans l'arbre
Figma, et ce qu'il en dit.

#### Métadonnées

Le moteur écrit dans `meta.diagnostics` tout ce qu’il a eu à signaler en lisant
Figma, et rien de plus : **un diagnostic parle de l’export, jamais du
composant.** La forme d’une entrée et la règle qui la relie à
`coverage.portable` appartiennent au format et sont décrites
[là-bas](../../docs/format/FORMAT.md#métadonnées) ; ce qui relève du moteur est ce
qu’il décide d’émettre.

**Ce qui entre dans ce catalogue est borné :** un constat n’y est écrit que s’il
bloque l’export, s’il rend le contrat partiel, ou s’il demande une vérification
ou une correction dans Figma. Une transformation entièrement prise en charge :
une piste `FIXED` publiée en pixels, la distance aux bords d’un calque hors du
flux, une rotation, la structure propre à un variant que sa vue exacte conserve,
ne produit aucun diagnostic. Elle est décrite ici et dans le format ; l’écrire à
chaque export ferait relire au designer le fonctionnement interne de l’exporteur
pour lui dire qu’il n’a rien à faire.

Le classement se fait au moment d’écrire, dans `exportComponent.ts` : une perte
de projection portable l’emporte sur le reste, de sorte qu’un même texte relevé
des deux côtés dégrade bien `coverage.portable`. Les messages sont dédoublonnés
par leur texte : deux extracteurs qui concluent la même chose ne le disent
qu’une fois. Le compte que le plugin affiche, ce que la demande de fusion liste et ce
que `meta.diagnostics` publie sont désormais la même liste.

**`meta.figma.url` est absent des contrats produits aujourd’hui, ce qui est un
état normal du format.** L’URL se construit depuis `figma.fileKey`, que l’API ne
donne qu’aux plugins déclarant `enablePrivatePluginApi`, un drapeau réservé aux
plugins privés d’une organisation. Le plugin se distribue par la Figma
Community, le drapeau est donc retiré du manifest et la clé n’arrive jamais. `url` reste optionnel dans le schéma,
sans changement de version : un contrat produit avant cette décision le porte
encore, et un lecteur doit accepter les deux.

La traçabilité repose donc sur `nodeId` et `fileName`, que le contrat porte
toujours, et que le corps de la demande de fusion annonce sur sa page de couverture.
Une revue y constate si cette traçabilité suffit. **L’absence de lien ne produit
aucun diagnostic** : elle n’est plus l’exception mais la règle, et un constat
que le designer ne peut pas corriger, répété à chaque export, apprendrait à
survoler la liste qui porte les gestes à faire.

---

## Partie 2 — Export tokens

La forme de `tokens.json` est décrite par [Partie 2 : Export
tokens](../../docs/format/FORMAT.md#partie-2--export-tokens). Ce document garde la
lecture des variables Figma, leurs collisions et leurs alias.

**1. Lister**,
```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables   = await figma.variables.getLocalVariablesAsync();
const profil      = figma.root.documentColorProfile;
```

**Le profil colorimétrique se lit sur le document, une fois par export.**
`documentColorProfile` vaut `SRGB`, `DISPLAY_P3` ou `LEGACY`. Les deux premiers
donnent `srgb` et `display-p3`. Figma range les canaux d'une variable dans le
profil du document : l'export les recopie sans conversion ni arrondi.

`LEGACY` désigne un fichier créé avant la gestion des couleurs de Figma. Figma
le rend dans le profil préféré de la personne qui le regarde, ou en sRGB faute
de préférence : aucun profil n'est déclaré dans le fichier, et un réexport n'en
trouve pas. L'export écrit alors `srgb` et avertit une fois par export, jamais
une fois par couleur (`avertissementDeProfil`). Le message dit qu'aucun profil
de couleur n'est choisi, que les couleurs sont publiées en sRGB, et demande de
choisir sRGB ou Display P3 dans le menu **File color profile** de Figma. Le
plugin ne le choisit pas à sa place : un export ne modifie pas le document.

**Le type d'une graisse `STRING` se décide sur tout le graphe, avant d'écrire.**
L'index des variables est construit d'abord, puis chaque `STRING` reçoit un type
une seule fois, sur l'ensemble de ses modes :

1. chaque valeur littérale est classée par `poidsDeGraisse()`, la table
   partagée du kit, que le plugin ne recopie pas ;
2. chaque alias est suivi jusqu'à une variable dont le type est décidé ;
3. une variable dont le chemin contient le segment `fontweight` ou
   `font-weight` devient `number` si tous ses littéraux sont reconnus et si
   tous ses alias aboutissent à `number` ;
4. une variable faite uniquement d'alias devient `number` si toutes ses cibles
   aboutissent à `number`, même quand son propre nom ne contient pas ce
   segment ;
5. toute autre combinaison reste `string`, un mode sans valeur compris ;
6. une cible absente de l'index garde son avertissement et force `string` ;
7. une boucle, que Figma refuse de créer, est détectée par l'état de visite et
   force `string`, sans récursion infinie.

`graissesNumeriques` (`tokens/graisses.ts`) applique ces règles. La décision
est mémorisée par variable : elle ne dépend ni de l'ordre des
variables, ni de celui des collections, ni de celui des modes. La sérialisation
vient ensuite et publie chaque littéral reconnu en poids. Un alias reste une
référence et ne devient jamais le nombre qu'il résout. La table ne s'élargit
pas pour cette commande : la chaîne `"700"` n'y figure pas et reste `string`.

**Le type d'une famille `STRING` se décide sur une composante, pas sur une
feuille.** `figma.getLocalTextStylesAsync()` est appelé une fois par export, et
ses liaisons entrent dans la décision. Le graphe est celui des alias entre
variables `STRING`, arêtes de tous les modes confondues, restreint à celles que
`graissesNumeriques` n'a pas retenues. Chaque composante connexe reçoit un seul
type :

1. une liaison `TextStyle.boundVariables.fontFamily` vers un membre est une
   preuve positive ;
2. un membre dont les scopes portent `FONT_FAMILY` sans `ALL_SCOPES`,
   `FONT_STYLE` ni `TEXT_CONTENT` est une seconde preuve positive ;
3. une liaison vers un membre par un autre champ de chaîne du text style,
   `fontStyle` ou `fontWeight`, est un conflit ;
4. un membre dont les scopes portent `FONT_FAMILY` à côté de l'un des trois
   scopes ci-dessus est un conflit : le scope déclare une intention, il ne
   prouve pas l'exclusivité ;
5. un alias qui quitte l'ensemble des candidates est un conflit, la composante
   ne pouvant plus recevoir un type commun ;
6. une preuve sans conflit publie toute la composante en `fontFamily` ; une
   preuve avec conflit la laisse en `string` sous un constat ; une composante
   sans preuve reste `string`.

`famillesDeTokens` (`tokens/familles.ts`) applique ces règles. La décision
porte sur la composante et non sur la feuille courante : `resolveRoot` ne suit
que le mode par défaut, et une variable dont un autre mode alias une famille
recevrait sans cela un type différent de sa cible. Un nom de token n'entre
jamais dans la décision ; un segment `fontfamily` sur une composante sans
preuve produit un constat, et rien d'autre.

Une preuve porte sur les text styles **locaux**. Un style publié par une
bibliothèque relie les variables de cette bibliothèque, absentes de cet export.
Une erreur de lecture des text styles ne type aucune variable, et le constat
nomme le geste.

**Une `TIMING` est une durée, une `EASING` est une courbe ou rien.** Figma
compte une `TIMING` en secondes, et l'export recopie ce nombre sous l'unité
`s`, sans conversion ni arrondi. Une `EASING` se convertit dès que l'API joint
ses quatre points à la valeur, quel que soit son `type`. `CUSTOM_CUBIC_BEZIER`
les porte, et Figma joint aussi ceux de certains préréglages, dont « Ease in
and out back ». `LINEAR` a une courbe par définition. Un ressort n'en a jamais,
même accompagné de points. La validation exige quatre nombres
finis, et ne borne que les abscisses, à `[0, 1]` : DTCG laisse les ordonnées
libres, et une courbe à dépassement est valide.

`easingsSansCourbe` (`tokens/mouvement.ts`) relève, avant la construction de
l'arbre, chaque variable `EASING` qu'un seul de ses modes empêche de publier.
Ces variables quittent l'index : elles n'ont pas de feuille, un constat nomme
chacune et son mode, et un alias qui les vise suit la politique des cibles
absentes en nommant la variable à corriger.

Le constat dit ce que l'API rend, et non la section du sélecteur de Figma. Un
préréglage dont l'API ne joint pas les points porte pourtant une courbe dans
Figma : écrire qu'il n'est pas une courbe de Bézier serait faux. Cinq
causes s'écrivent donc séparément : les points absents d'un préréglage, un
ressort, reconnu à son `type` ou au champ `easingFunctionSpring`, un `HOLD`,
une courbe personnalisée sans ses quatre points, et une abscisse hors de
`[0, 1]`. Les trois premières demandent de changer d'easing, les deux
dernières de corriger la courbe en place. Publier le nom d'un préréglage sous
un type qui promet une courbe, ou une courbe choisie à sa place, tromperait le
développeur ; refuser l'export entier priverait le fichier de toutes ses
couleurs pour une animation.

**Les six types de variables sont traités sans branche par défaut.** `dtcgType`
et `formatValue` énumèrent les membres de `VariableResolvedDataType`, et un
septième membre des typings produit une erreur de compilation. Sans cette
borne, un nouveau type de Figma entrerait dans `tokens.json` sous
`$type: "string"` avec la valeur brute que l'API rend, ce que l'invariant de
portabilité interdit.

**La marque de version vient de la constante du kit.** Le moteur écrit
`TOKENS_FORMAT_VERSION` sous `$extensions["com.ucm.formatVersion"]`, à la racine
et avant les groupes. Le résultat de la commande annonce le module et la version
qu'il lit dans le fichier produit : « DTCG 2025.10, version 2 du format de
tokens ».

**Un axe se décide par collection, avant l'arbre.** `axesDesCollections` examine
une fois par export chaque collection à plusieurs modes, et chaque collection à
un seul mode que des collections étendues surchargent. La clé de son axe vient
de `prefixeDeCollection`, la fonction que `joinTokenPath` emploie pour le chemin
de ses variables : les deux ne peuvent pas diverger. L'axe est écarté sous un
constat quand son préfixe est vide, quand une autre collection à modes porte le
même préfixe, quand un mode n'a pas de nom ou quand le mode par défaut est
introuvable. Deux modes au même nom normalisé l'écartent sous le constat de
`modeCollisionWarnings`, un par nom en collision, dont l'impact dit que les modes
de la collection ne se généreront pas. `buildLeaf` écrit `com.ucm.axis`
sur la feuille d'un axe retenu, et la racine déclare les axes qui portent au
moins une feuille exportée, dans l'ordre des collections.

**Les collections étendues se lisent à titre expérimental.** Une collection dont
`isExtension` vaut `true` n'est pas un axe : ses variables et ses modes sont
ceux de sa collection racine, si bien que le résumé des tokens et
`modeCollisionWarnings` l'écartent. Chaque axe retenu reçoit les extensions dont
`rootVariableCollectionId` désigne sa collection. Le nom d'une extension est son
nom normalisé en un segment, `/` devenant `-` ; sa parente est `base` quand
`parentVariableCollectionId` désigne la racine. Chaque mode d'extension remonte
`parentModeId` jusqu'au mode de la racine, dont il prend le nom.
`variableOverrides` donne les surcharges, écrites creuses sous
`com.ucm.extensions` par la même mise en forme que les modes. Une extension dont
le nom CSS (`tokenCssVariable`) est vide ou vaut `base`, deux extensions de même
nom CSS ou une parente absente du fichier écartent toutes les extensions de
l'axe sous un constat. `ucm tokens css` déclare les extensions d'un axe sous
`axeDesExtensions` : une collection dont le préfixe donne ce nom CSS écarte
aussi ces extensions, sous un constat qui la nomme. Un axe à plusieurs modes
reste publié ; une collection à un seul mode dont toutes les extensions sont
écartées ne devient pas un axe.
Une extension locale dont la racine est dans une bibliothèque surcharge des
variables absentes du fichier : un constat par collection distante nomme ses
extensions.

Ce qui reste à mesurer sur un fichier Enterprise réel : la collection que
`variableCollectionId` désigne pour une variable héritée, les clés que rend
`valuesByModeForCollectionAsync`, ce que l'API rend pour une extension de
bibliothèque, et si Figma accepte une surcharge qui ferme un cycle d'alias.
Le plugin ne détecte pas ce cycle ; `ucm tokens css` le refuse. La décision de type d'une graisse et d'une famille ne lit pas les
surcharges : un nom de graisse que seule une surcharge porte reste la chaîne de
Figma, sous un constat qui nomme la collection étendue et le mode.

**Un alias d'un autre type dans un mode se constate après l'arbre.** Le type
d'une feuille se décide sur la chaîne du mode par défaut. Une fois les feuilles
insérées, chaque valeur de mode ou de surcharge qui cite une feuille d'un autre
`$type` produit un constat : il nomme la variable, le mode, la collection étendue
pour une surcharge, et la cible, et dit le type de chacune
en mots de designer, « une longueur » ou « un nombre sans unité ». L'axe reste
publié, puisque la faute porte sur une liaison que le designer corrige dans
Figma.

**Un nom que la feuille CSS refuse se constate aussi après l'arbre.** Deux
tokens dont `tokenCssVariable` rend la même propriété, et un token dont la
propriété commence par `PREFIXE_DES_INTERMEDIAIRES`, restent dans le fichier.
`ucm tokens css` refuse pourtant d'en écrire la feuille : un constat nomme les
variables et leurs tokens.

---

## Partie 3 — Configuration et dépôt sur une forge

La configuration est optionnelle et locale à la machine via
`figma.clientStorage`. Elle contient des dépôts, chacun avec son URL, sa branche
de base et son jeton, et le dépôt actif. Le jeton n'est jamais écrit dans le document Figma, renvoyé à l'UI après
sauvegarde, ni logué.

**La forge se déduit de l'hôte de l'URL.** `github.com` désigne GitHub,
`gitlab.com` désigne GitLab, et toute autre adresse est refusée avec un message
qui nomme les deux hôtes. La carte d'un dépôt n'a pas de sélecteur de forge. Une
instance GitLab auto-hébergée reste hors périmètre : son domaine devrait figurer
dans le manifest au moment du build.

**L'adresse d'une page du dépôt est acceptée.** Sur GitLab, tout ce qui suit
`/-/` est retiré, puis la requête et le fragment ; le reste est le chemin du
projet, sous-groupes compris. Sur GitHub, les deux premiers segments forment le
repository. La branche et le dossier d'une adresse sont ignorés, parce qu'un nom
de branche peut contenir `/`. Sous le champ, la carte affiche le dépôt
retenu et, quand un chemin a été retiré, dit que `ucm.config.json` décide où vont
les exports. `lireAdresseDuDepot()` (`src/config.ts`) est l'unique lecture ;
l'interface l'importe.

| Forge | Jeton | Droits |
|---|---|---|
| GitHub | Personal Access Token fine-grained | **Contents: read/write** et **Pull requests: read/write** sur le repository |
| GitLab | jeton personnel fine-grained limité au projet, ou jeton de scope **api** | **Project: Read**, **Repository: Read**, **Branch: Read + Delete**, **Commit: Create**, **Merge Request: Read + Create**. En scopes : **api** seul, car `read_repository` et `write_repository` ne couvrent ni les merge requests ni l'API de commits |

**Un jeton ne part que vers le dépôt qui l'a reçu.** Le stockage range les
dépôts dans la clé `depots`, un tableau d'entrées `{ repoUrl, baseBranch, jeton }`,
et l'identité du dépôt actif dans `depotActif`. L'identité d'un dépôt est sa
forge et son projet, le projet en minuscules. Le jeton et l'adresse voyagent
dans la même entrée, écrite en une seule écriture : aucune étape ne les sépare.
L'adresse d'une entrée enregistrée ne change plus, et le sandbox refuse une
modification qui la changerait ; pour un autre projet, le designer ajoute un
dépôt. Un projet ne s'enregistre qu'une fois. `validateSettings()` valide
chaque entrée avec son propre jeton : l'ouverture, le pré-vol, la publication et
l'enregistrement passent tous par elle. À la saisie, un jeton dont le préfixe
désigne l'autre forge est refusé : `ghp_` et `github_pat_` pour GitHub, `glpat-`
pour GitLab. L'interface ne reçoit que la présence d'un jeton, par dépôt.

| Geste | Écritures | Interruption entre deux écritures |
|---|---|---|
| Enregistrer un premier dépôt | `depots`, puis `depotActif` hors export local | Dépôt enregistré, aucun dépôt actif |
| Modifier la branche ou le jeton | `depots` | Aucune étape intermédiaire |
| Supprimer | `depots` sans l'entrée, puis retrait de `depotActif` si elle était active | `depotActif` désigne une entrée absente, lue comme « aucun dépôt actif » |
| Se connecter | `depotActif`, puis `exportLocal` à `false` | Dépôt actif changé, export local encore activé |

Une file du sandbox ordonne les écritures de la configuration et les lectures
qui préparent une analyse, une publication ou `settings` : une modification ne
peut pas relire la liste avant une suppression et l'écrire après elle. Deux
fenêtres du plugin ne partagent pas cette file. Une suppression et une
modification faites au même instant dans deux fenêtres peuvent encore faire
revenir une entrée.

**L'export local suspend toute publication vers une forge.** L'interrupteur
« Activer l'export local » de l'onglet Général écrit la clé `exportLocal`,
absente par défaut. Activé, il retire la configuration de publication :
`loadConfiguration()` n'en rend aucune, et `depotActif` reste écrit pour le
rebranchement. Aucun test ne part à l'ouverture, et les exports sont
téléchargés ; la pastille dit `export local` en couleur d'avertissement, comme
la ligne sous la carte du composant. Seul l'enregistrement d'un dépôt lance
encore un test, dont le résultat ne met à jour que la carte de ce dépôt. Le
premier dépôt d'une liste vide ne devient pas actif. Désactiver l'export local
rend la destination au dernier dépôt actif et le teste ; « Se connecter » le
désactive aussi. Une publication déjà lancée va à son terme vers le dépôt lu à
son départ.

La première ouverture reprend la configuration du plugin à un seul dépôt : les
clés `repoUrl`, `baseBranch`, `github_pat` et `forge_du_jeton`, où un jeton sans
`forge_du_jeton` appartient à GitHub. Une configuration valide devient la
première entrée, active ; une configuration invalide n'est pas reprise. Les
quatre clés sont ensuite effacées. L'écriture de `depots`, même vide, marque la
reprise faite : une ouverture suivante ne réimporte ni n'écrase rien. Une liste
`depots` illisible produit une erreur, et la reprise ne l'écrase pas.

La configuration ne contient aucun chemin. **L'endroit où un export atterrit
appartient au dépôt visé**, qui le déclare dans son `ucm.config.json` ou laisse
s'appliquer les défauts du kit ; la grammaire de ce fichier et ses valeurs par
défaut sont dans `packages/kit/src/format/configuration.ts`,
`CONFIGURATION_PAR_DEFAUT`. Un chemin rangé sur le poste du designer ne
servirait que face à un dépôt sans `ucm.config.json`, au moment précis où
`ucm check` applique ces mêmes défauts. L'export atterrirait alors hors de vue
du contrôle. Le plugin lit ce fichier au test de connexion, avant la
publication, pour que le designer découvre un fichier fautif avant de
travailler.

L'en-tête expose en permanence l'état de la connexion et un accès à la page de
configuration via une icône `gear` Font Awesome Free embarquée. Le test lit le
dépôt (`GET /repos/{owner}/{repo}` sur GitHub, `GET /projects/:id` sur GitLab),
automatiquement à l'ouverture, hors export local, et après chaque sauvegarde. Un 401, un 403 et un
404 donnent chacun leur cause et leur geste ; sur GitLab, le 404 dit que le
projet peut être privé et que le jeton doit y avoir accès. Le manifest n'autorise
que `https://api.github.com` et `https://gitlab.com`.

**Les mots d'une forge se lisent à un seul endroit.** `src/forges/termes.ts`
porte, pour chacune, le nom de la demande (« pull request », « merge request »),
son abréviation, le nom du dépôt, le nom et l'aide du jeton, les droits qu'un 403
réclame, les statuts de refus et de conflit, et ses limites. Tout texte du plugin
qui nomme une forge les lit ; aucun message ne teste la forge.

Chaque commande conserve son périmètre :

- **Exporter le composant** → demande contenant uniquement
  `{components}/{IdentifiantCode}/{IdentifiantCode}.contract.json` ;
- **Exporter les tokens** → demande contenant uniquement `{tokens}`, qui est un
  chemin de fichier et jamais un dossier.

`{components}` et `{tokens}` sont les deux champs de `ucm.config.json`.

Pour un artefact modifié, le plugin écrit sur la branche
`ucm-exporter/export-{component|tokens}-{YYYYMMDD-HHmmss}` (le type d'artefact
et les secondes évitent toute collision quand on exporte le contrat puis les
tokens dans la même minute), ouvre une demande vers la branche de base, puis
l'ouvre dans le navigateur par défaut (`figma.openExternal` : l'iframe de l'UI
est isolée et ne peut pas naviguer elle-même). Le lien reste dans le compte rendu pour y revenir. Si le contenu
est identique (la comparaison ignore `meta.exportedAt`, régénéré à chaque
export) aucune branche ni demande n'est créée. Config absente ou invalide,
export local activé, ou erreur de la forge : repli automatique vers le téléchargement local avec message
explicite.

La séquence d'écriture appartient à l'adaptateur de la forge (`src/forges/`),
derrière le port `Forge` ; `src/depot.ts` porte tout ce qui n'en dépend pas.

- **GitHub** lit la ref de base, crée la branche, écrit le fichier par l'API
  Contents, puis ouvre la pull request. L'API Contents omet le contenu des
  fichiers supérieurs à 1 Mo : le plugin lit alors le blob Git correspondant
  avant de comparer. Si l'écriture ou l'ouverture échoue, la branche est
  supprimée avant le repli local.
- **GitLab** crée la branche et le fichier par un seul commit
  (`POST /projects/:id/repository/commits`). Quand le fichier existe sur la base,
  le commit part du `commit_id` de sa lecture en action `update`, avec
  `last_commit_id` ; sinon il part de la tête de la base en action `create`.
  `force` n'est jamais posé. GitLab refuse en 400 une branche qui existe déjà et
  ne crée alors rien : l'adaptateur ne vérifie pas son absence avant. Le même
  statut sert aux règles de push du projet, si bien que le plugin affiche la
  réponse de GitLab et adresse le geste à un mainteneur du projet. La merge
  request s'ouvre avec `remove_source_branch`, et son échec supprime la branche.
  Le projet, le chemin d'un fichier et le nom d'une branche forment chacun un
  seul segment d'URL, et le jeton part dans l'en-tête `PRIVATE-TOKEN`.

GitLab ne vérifie pas `last_commit_id` quand le commit donne son point de
départ. Le commit part de la version lue : un changement de la base entre la
lecture et l'écriture apparaît donc en conflit dans la merge request, comme sur
GitHub.

| Forge | Au-delà de cette taille, le fichier reste téléchargé | Au-delà, le corps de la demande est refusé |
|---|---|---|
| GitHub | 100 Mo | 65 536 caractères |
| GitLab | 20 Mo, où l'API de commits commence à ralentir | 1 048 576 caractères |

**« Identique » se juge à deux endroits : la branche de base, et les demandes
d'export encore ouvertes.** Un artefact déposé et pas encore fusionné n'est pas
sur la branche de base, et ne regarder qu'elle rouvrait une seconde demande en
tout point pareille à la première. Le compte rendu du plugin dit lequel des deux
endroits a répondu, et donne le lien de la demande quand c'est elle : « aucun
changement » sans l'endroit enverrait le designer chercher sur la branche de
base un fichier qui n'y est pas encore. Un contenu différent pendant qu'une
demande d'export est ouverte n'est pas bloqué pour autant, réexporter après
correction étant le geste normal. Git signale le reste : deux branches qui
modifient le même fichier depuis la même base entrent en conflit à la seconde
fusion. Sur GitLab, une merge request venue d'une fourche n'est pas lue : sa
branche appartient à un autre projet.

**Le corps de la demande a deux zones, et la frontière compte.** L'en-tête dit
l'identité de ce qui est déposé : le chemin du fichier, puis le numéro de forme
qu'il porte, le schéma pour un contrat et la version du format de tokens pour
`tokens.json`. La liste qui suit ne porte que des gestes à faire dans Figma.

C'est la page que le plugin ouvre juste après l'export : le designer y lit ce
qui n'a pas pu être décrit sans ouvrir le JSON ni le journal du plugin. Les deux
artefacts sont couverts par le même mécanisme, `tokens.json` n'a aucun champ où
transporter les siens, là où un contrat les garde aussi dans `meta.diagnostics`.
Un avertissement ne bloque jamais : seules les préconditions arrêtent un export
(cf. [CONCEPT.md](../../CONCEPT.md)).

**Le corps s'arrête avant la limite de la forge.** Au-delà, la forge refuse la
demande et l'export entier échouait. La liste garde les premiers avertissements
qui tiennent, et une dernière ligne compte ceux qu'elle omet ; le compte rendu du
plugin les liste tous.

**Le schéma annoncé est lu dans le fichier déposé, jamais dans la constante du
plugin.** `Schéma de contrat : 12.0` est le seul champ qui décide si le fichier
entier est lisible par le dépôt, hors de la fenêtre que ses lecteurs
supportent le contrat étant refusé en bloc, et il est enfoui au milieu d'un diff
de plusieurs milliers de lignes. Sur la couverture, celui qui décide de
fusionner le voit sans ouvrir le JSON. Annoncer la constante du plugin ferait de
cette ligne un énoncé sur le plugin déguisé en énoncé sur le fichier : deux
autorités pour la même chose, dont le désaccord serait muet. Un contrat dont la
version est illisible la voit annoncée telle quelle, et un contrat qui n'en
porte aucune le dit.

`tokens.json` suit la même règle : `Version du format de tokens : 1` est lu à
la racine du fichier déposé, par `etatDuFormatDeTokens()`, jamais dans
`TOKENS_FORMAT_VERSION`. Une marque absente, future ou invalide est annoncée
telle quelle, dans les mots que le rapport du kit emploie pour elle.

Chaque avertissement nomme l'élément Figma concerné avec l'intitulé que Figma
affiche, dit ce qui manquera au développeur, puis le geste à faire dans Figma.
Les trois sont exigés, un constat qui ne nomme aucun geste n'étant pas émis :
une liste dont la conclusion est toujours « rien à faire » apprend à son lecteur
qu'elle se survole, et il survolera ensuite celles qui demandent un geste.
[CONTRIBUTING.md](../../CONTRIBUTING.md) porte la règle et le vocabulaire.

**Les trois parties voyagent séparées jusqu'à l'interface.** Un site d'émission
écrit un `Constat` (ce qui manque, ce que ça coûte, quel geste le corrige) et
`localisation.ts` en compose le titre puis la phrase compacte. La phrase est ce
que publient `meta.diagnostics`, la demande et le compte rendu ; les parties
sont ce que l'interface met en page, sous une pastille qui nomme la sévérité.
Une seule rédaction, deux formes. Sans cette séparation, l'interface n'aurait le
choix qu'entre afficher un paragraphe (où le geste se lit en dernier, après deux
phrases de contexte) et découper une `string` dans le DOM, c'est-à-dire
redéfinir chez elle une grammaire dont le moteur est propriétaire.

**Un avertissement arrive inerte dans la page de la forge.** Le message cite les
intitulés de Figma tels quels, et la forge lit dans certains d'entre eux autre
chose que le designer : `@icons`, nom d'une variante de règle, y devenait le
profil d'un inconnu, notifié à chaque export, au lieu du mot à taper dans le
composant, et un calque nommé `#12` renverrait de même à une issue. Ces formes
sont donc publiées en `code`, seule zone que l'autoliaison épargne : le message
reste celui que le compte rendu du plugin affiche, et le designer y lit le nom
exact qu'il doit écrire. Chaque forge neutralise ses propres formes :

- GitHub : `@nom` et `#123` ;
- GitLab : en plus, `!123`, `~label`, `%jalon`, `$123`, `&123`, la référence
  croisée `groupe/projet#123` ou `groupe/projet!123`, et une ligne qui commence
  par `/`. GitLab exécute cette ligne comme action rapide dans la description
  d'une merge request créée par l'API, et une ligne `/close` fermerait la
  demande à son ouverture. Un SHA de commit et `:emoji:` restent tels quels :
  leur lien ne notifie personne et ne modifie rien.

Tous les champs de configuration sont validés et les chemins restent relatifs.
Aucune branche ne survit à un export qui n'a pas ouvert de demande.

---

### Les variables d'environnement, et pourquoi elles ne sont pas une interface

Deux sortes de variables se distinguent : une entrée du diagnostic change le
verdict que le rapport rend, un secret n'y change rien.

**Une entrée du diagnostic ne passe par l'environnement qu'en dernier
recours.** `ucm check` calcule lui-même ce dont il a besoin, à partir de
`--base <sha>` et du dépôt Git : une commande qui dépend de variables posées
ailleurs ne se reproduit pas à la main, et le diagnostic qu'elle rend cesse
d'être explicable. Une seule entre par l'environnement : `ucm.mjs` lit
`UCM_ECHECS_DE_TESTS` avant de lancer `check`, parce qu'aucun argument ne sait
porter les échecs de tests d'un orchestrateur.

Les autres entrées du tableau appartiennent au consommateur de référence, dont
le script de contrôle est plus ancien que cette commande. Elles sont
documentées ici parce qu'un repository qui écrit son propre script rencontrera
les mêmes questions, **pas parce qu'elles sont une surface publique.**

| Variable | Qui l'écrit | Qui la lit | Ce qu'elle porte |
|---|---|---|---|
| `UCM_CONTRATS_MODIFIES` | le workflow, depuis `git diff` | le script de contrôle du consommateur | les contrats que la pull request touche, un par ligne ; borne les états informatifs du rapport |
| `UCM_TOKENS_MODIFIES` | le workflow, depuis `git diff` | idem | `"true"` si `tokens.json` change dans cette pull request |
| `UCM_ECHECS_DE_TESTS` | l'orchestrateur local, en JSON | idem | les échecs de tests que le rapport doit porter, parce qu'un test rouge doit atteindre le designer |

**Aucune de ces trois interfaces n'est figée, délibérément.** Geler une
interface publique avant qu'une CI tierce ne la lise fabriquerait une contrainte
à tenir sans savoir pour qui. Les trois peuvent changer de nom, de forme ou
disparaître le jour où `ucm check` reçoit un adaptateur : ce qui est stable est
ce que la commande accepte, ses options, pas ce que l'environnement d'un dépôt
contient.

**Un secret est une interface publique, et il ne s'écrit jamais en argument.**
`ucm rapport-gitlab` lit son jeton dans `UCM_GITLAB_TOKEN`, que le fichier
écrit par `ucm init --forge gitlab` attend : un argument apparaîtrait dans le
journal du job, que tout membre du projet lit. Son nom est figé comme une
option. Sans elle, la commande le dit et sort en 0 ; le rapport reste dans les
artefacts du job, et le verdict du contrôle ne change pas.

`CI`, `GITHUB_STEP_SUMMARY` et les variables `CI_*` de GitLab ne sont pas de ce
projet : la première est posée par tout runner, les autres par GitHub Actions et
GitLab CI, et toutes sont lues telles que leurs propriétaires les définissent.

## Hors périmètre MVP

Pas d'auto-merge, pas de multi-composant en une commande, pas de scoring. Aucun
domaine réseau autre que l'API de GitHub et gitlab.com déclaré dans le manifest.

L'analyse et la publication ne modifient jamais le document Figma. Un seul
geste y écrit : la création des règles d'usage, décrite ci-dessous.

### La création des règles d'usage

Le plugin pose une instance de `.componentRules` à côté du composant
sélectionné, ou remplit une instance vierge que le designer a collée, et y
range une règle par valeur de propriété publiée. Supprimer cette instance
défait la création ; un Ctrl+Z aussi, d'un seul appui, et le plugin n'appelle
pas `commitUndo`.

Ce que la création n'écrit pas est une décision : les calques `content` et
`icon` gardent le texte d'aide du maître et son marqueur `[À compléter]`, si
bien qu'une règle fraîchement posée ne documente rien tant que le designer ne
l'a pas rédigée, et que l'analyse le dit.

**Quelles propriétés publiées reçoivent une règle.** Le contrat d'un composant
porte aussi la surface d'un wrapper élu (voir
[FORMAT.md, section 3](../../docs/format/FORMAT.md#3-layout)), et le template ne
les traite pas toutes de la même façon.

La propriété est rendue à qui elle appartient : le **composant publié le plus
proche** rencontré en descendant du composant sélectionné jusqu'à celui qui la
déclare, lui compris. Un composant est publié tant que son nom ne commence ni
par `.` ni par `_` ; Figma retient les autres de la bibliothèque, et une pièce
interne n'aura donc jamais de règles à elle.

| Origine de la propriété | Règle posée | Pourquoi |
|---|---|---|
| Le composant sélectionné la déclare | oui | c'est son API |
| Une de ses pièces internes la déclare, et rien de publié ne s'interpose | oui | cette pièce fait partie de son architecture : personne ne l'instanciera seule, elle n'aura jamais de règles à elle, et le parent porte ses propriétés pour de bon |
| Un composant publié la déclare, ou l'une de ses pièces internes la déclare | non, et le point rouge de ce composant la nomme | il n'a été traversé que faute d'un conteneur de règles qui en fasse une dépendance |
| Aucun imbriqué ne la revendique, ou le chemin ne se lit pas | non, et un point rouge la nomme sans nommer son porteur | la taire ferait croire à un template complet |

**La profondeur tranche, pas le nom.** La même pièce interne se rencontre aux
deux endroits : posée dans le composant sélectionné, elle est à lui ; posée dans
un composant publié que le parcours a traversé, elle est à celui-là. Le plus
proche, et non le plus extérieur, pour qu'un Button rangé dans un Alert reste un
Button et garde son propre geste.

Le nom sert à reconnaître un composant publié parce qu'aucune lecture ne fait
mieux : `getPublishStatusAsync` dit tout le monde non publié sur une
bibliothèque qui ne l'a jamais été, et le vrai défaut passerait alors sous
silence.

### Les points rouges de la création

La création rend un point à corriger par **composant publié imbriqué qui n'a pas
ses règles**, et non par propriété absorbée. Un composé absorbe la surface d'un
seul wrapper élu ; le compter comme déclencheur laissait muets les autres
composants sans règles qu'il abrite, alors que chacun coûte la même chose au
contrat et demande le même geste.

Le point liste la surface publiée de ce composant, ce qu'il déclare et ce que
déclarent ses propres pièces internes : sans conteneur, pas une ligne n'en est
documentée. Il porte la sévérité `danger`, parce que le contrat décrit déjà le
composant de travers.

Le relevé part de `getAllNodes`, comme le contrat : un composant rangé sous un
calque statiquement masqué n'entre dans aucun contrat et ne demande aucun geste.

**Ce que le relevé écarte.**

| Cas | Écarté | Pourquoi |
|---|---|---|
| Un composant **contracté** et tout ce qu'il abrite | oui | le contrat s'arrête à cette dépendance. Contracté veut dire : un `.componentRules` écrit son nom, le même index que celui de la composition |
| Une **icône** : aucune propriété publique déclarée **et** un sous-arbre qui n'est qu'un dessin (`estUnDessinNonDeclare`) | oui | voir ci-dessous |
| Une **pièce interne** du composant sélectionné | oui | ses propriétés sont documentées par le parent |

**Pourquoi une icône n'est pas un composant à documenter.** Lui réclamer ses
règles n'est pas seulement un geste inutile : le conteneur posé la ferait entrer
dans les contractés, son entrée `icons` quitterait le contrat au profit d'une
dépendance, et l'avertissement qui demande une règle `@icons`
(`extractLayout.ts`, `warnUndeclaredDrawing`) **se tairait**. Le designer
fabriquerait un contrat faux en croyant corriger celui-ci. Son geste est une
règle `@icons` dans le conteneur du composant qui l'affiche.

Les deux conditions sont exigées ensemble. La première seule tairait un
séparateur fait de rectangles, qui mérite ses règles ; la seconde seule tairait
un `TileLink`, qui n'a pas de texte mais déclare ses propriétés. Un porteur dont
la lecture des propriétés lève n'est jamais écarté : ne rien savoir n'est pas
savoir qu'il n'y a rien.

**Un composant venu d'une bibliothèque** garde son point, mais change de geste :
l'index ne lit que le document courant, et ses règles vivent dans le fichier de
sa bibliothèque. Lui demander un conteneur ici serait demander l'impossible.

Un dernier point, sans nom de composant, rassemble ce que le contrat publie sans
qu'aucun imbriqué lisible le revendique.

**Un point par composant, contre la forme agrégée.**
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#messages-destinés-au-designer) prescrit
pour un diagnostic agrégé un seul titre suivi de la liste des composants
concernés. Le point de la création y déroge, et c'est délibéré : le geste vise un
composant à la fois, et un point agrégé perdrait le bouton « Sélectionner les
calques », seul moyen d'aller voir celui qui est en cause. Aucun plafond
n'agrège la pile ; l'état de galerie `creation-imbriques-nombreux` montre ce que
six donnent, et sert à rouvrir la question si un fichier passe la dizaine.

**Deux angles morts, assumés.**

- Une instance **détachée** est un `FRAME` : le relevé ne la voit pas, et le
  contrat en décrira les internes sans qu'un mot soit dit.
- Les gestes **en cascade** ne sont pas ordonnés. Un composé qui abrite un
  `Alert` sans règles, lui-même abritant un `Button` sans règles, rend deux
  points, alors que créer les règles de l'`Alert` change ce que le second
  devient.

L'écriture vit dans un seul fichier, `src/template/ecriture.ts`, atteint par
une seule porte, la demande `creer-regles`. `loiDuDocumentIntact.test.ts`
l'exclut nommément de son balayage et refuse à tout autre fichier du moteur
d'importer l'écriture, ou de poser un appel qui écrirait.

### Sélectionner et cadrer ne sont pas modifier

**Tranché, et la question se reposera.** Rendre un avertissement cliquable
demande de poser une sélection (`figma.currentPage.selection = […]`) et de
déplacer la vue (`figma.viewport.scrollAndZoomIntoView(…)`). Une relecture
rapide y voit une violation de « l'analyse ne modifie jamais le document » ; ce
n'en est pas une, et voici sur quoi la décision s'appuie plutôt que sur une
intuition. Elle vaut pour tout ce que le plugin fait hors de la création des
règles.

- **Aucun contenu de document n'est écrit.** Une sélection et un cadrage sont un
  état de l'éditeur, propre à la personne qui regarde. Rien n'entre dans le
  fichier, donc rien n'est transmis à un collaborateur ni à l'historique de
  versions.
- **Aucune entrée d'annulation n'est créée.** C'est écrit dans les typings que
  ce dépôt installe : « By default, plugin actions are **not committed to undo
  history**. Call `figma.commitUndo()` so that triggered undos can revert a
  subset of plugin actions » (`@figma/plugin-typings`, `commitUndo`). Le plugin
  n'appelle jamais `commitUndo()`, et un test de source le refuse.
- **Le cadrage a un équivalent au clavier.** Les mêmes typings décrivent
  `scrollAndZoomIntoView` comme « the equivalent of pressing Shift-1 » : un
  geste que le designer fait lui-même dix fois par heure.

**Ce qui reste à vérifier, et qui n'est pas vérifiable depuis ce dépôt :** que
sur un fichier réel, après un clic, Figma ne marque pas le document comme
modifié. Les trois points ci-dessus disent que ce ne devrait pas arriver ; seul
un fichier ouvert le prouve. Tant que cette observation n'est pas faite, la
décision tient sur la documentation de l'API, ce qui est écrit ici plutôt que
sous-entendu.

**La frontière que cette décision ne déplace pas.** Créer, renommer, déplacer,
supprimer un node, écrire une variable ou un style : tout cela reste interdit
partout ailleurs que dans `src/template/ecriture.ts`, et
`loiDuDocumentIntact.test.ts` le refuse en lisant la source. La différence est
celle entre regarder et écrire, non une affaire de degré, et la création des
règles est la seule exception, nommée dans la loi.

---

## Versions

Ce qu'un numéro de version engage est décrit par
[Versions](../../docs/format/FORMAT.md#versions).
