# UCM Contract Exporter — spécification

Ce document décrit le **moteur** : ce que le plugin lit dans Figma, ce qu'il
élit, ce dont il avertit, et ce qu'il dépose sur GitHub. La forme de ce qu'il
produit est décrite dans [docs/FORMAT.md](../../docs/FORMAT.md).

## Objet

[CONCEPT.md](../../CONCEPT.md) porte le pourquoi et la répartition des
responsabilités. Le plugin produit :

- un contrat JSON décrivant la partie visuelle d’un composant ;
- un export DTCG des variables locales, avec leurs alias et leurs modes.

Ce que ces deux artefacts contiennent, et ce que leur silence dit, appartient à
[docs/FORMAT.md](../../docs/FORMAT.md) : ce document-ci ne parle que de la
lecture de Figma.

## Contexte technique

- Plugin Figma (Plugin API) : pas d'API Variables REST ni de Code Connect.
  `api.github.com` est autorisé pour le dépôt optionnel des artefacts via PR ;
- Tourne dans l'éditeur, produit des fichiers en téléchargement sans config
  valide, ou les dépose sur une branche GitHub dédiée avec une config valide.
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2).
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. L'UI expose le
  statut GitHub, les deux commandes, la configuration, un compte rendu, un retour
  en direct sur la sélection, et en pied de page la version de schéma que le
  bundle chargé produit. Figma peut servir un bundle plus ancien que celui du
  disque, et rien d'autre ne le dirait.

- **Les deux commandes projettent un nom de la même façon**, et citent un token
  sous la même forme. La règle est celle du format,
  [Nommer et citer un token](../../docs/FORMAT.md#nommer-et-citer-un-token), et
  `normalizeName()` en est l'implémentation partagée. Ce qui appartient à ce
  document est le fait qu'une seule implémentation serve les deux commandes :
  deux projections du même nom divergeraient, et un contrat citerait alors un
  token que `tokens.json` n'écrit pas sous ce nom.

## Hypothèses sur le design system

Ce que le contrat suppose d'un design system (clé de base, allongement,
déclaration d'un rôle) est décrit par [Hypothèses sur le design
system](../../docs/FORMAT.md#hypothèses-sur-le-design-system).

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
1](../../docs/FORMAT.md#ce-que-le-contrat-publie-champ-par-champ).

### Algorithme

#### La règle commune

Le silence commun à ces champs (une variable se publie, un nombre brut avertit,
une valeur neutre reste absente sans un mot) est décrit par [La règle
commune](../../docs/FORMAT.md#la-règle-commune).

Le geste demandé au designer est toujours de **nommer** la valeur, jamais de la
retirer du design.

#### 1. Props

Ce que `props` contient est décrit par [1. Props](../../docs/FORMAT.md#1-props).
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
variantes](../../docs/FORMAT.md#2-tokens-de-variantes). Ce document garde la
façon dont le moteur lit les peintures d'un calque et ce qu'il en dit.

La couleur publiée et l'avertissement sortent de la même lecture, peinture par
peinture : la variable d'un paint est celle qu'il porte lui-même. Une peinture
sans effet ne publie donc pas plus sa couleur qu'elle ne réclame la sienne, et
un fill masqué relié ne couvre pas le fill visible posé à la main. Quand cette
lecture ne peut pas conclure, la liste du node reprend la main sans avertir :
perdre une couleur coûterait plus qu'un diagnostic manquant.

#### 3. Layout

Ce que `layout`, `sizes` et les bornes contiennent est décrit par [3.
Layout](../../docs/FORMAT.md#3-layout). Ce document garde l'élection du node de
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
d'interaction](../../docs/FORMAT.md#4-modèle-dinteraction).

#### 5. Typographie

Ce que `textStyles` et `variantViews.*.typography` contiennent est décrit par
[5. Typographie](../../docs/FORMAT.md#5-typographie).

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
Structure](../../docs/FORMAT.md#6-structure). Ce document ne garde que ce que le
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
maquette](../../docs/FORMAT.md#9-échantillon-de-maquette). Ce document garde ce
que le moteur relève dans Figma, et ce qu'il omet plutôt que de deviner.

**Une notice, jamais un avertissement.** Deux échantillons là où le design en
attendait un révèlent un libellé retouché dans un seul variant. Le constat suit
ses jumeaux sur la structure et la composition, et emprunte le même canal : rien
ne manque, rien n'est à corriger.

#### 7. Intention et documentation des props

**[7. Intention et documentation des
props](../../docs/FORMAT.md#7-intention-et-documentation-des-props) porte toute
cette section, et ce cas limite demande d'être nommé.**

La grammaire des règles décrit ce que le moteur lit dans Figma, donc ce
document. Une instance de `.componentRules` sur la même page, dont le calque
`component-name` écrit le nom du composant documenté ; une instance de
`.rulesItems` par règle, dont un calque nomme le tag. La lecture porte sur la
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
garde-fous](../../docs/FORMAT.md#8-rendu-sémantique-et-garde-fous).

### Ce que l'export écrit

#### Le nom du fichier, et ce qu'il unifie

Le moteur ne choisit pas librement le nom de ce qu'il dépose : il projette le
nom Figma par `codeIdentifier`, l'unique autorité du kit sur cette question, et
n'écrit nulle part une seconde règle de nommage. La forme obtenue et les
exemples qui l'illustrent sont [du
format](../../docs/FORMAT.md#fichier-et-exemple) ; ce qui appartient au moteur
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
[Composition et dépendances](../../docs/FORMAT.md#composition-et-dépendances).
Ce document garde la façon dont le moteur reconnaît une dépendance dans l'arbre
Figma, et ce qu'il en dit.

#### Métadonnées

Le moteur écrit dans `meta.diagnostics` tout ce qu’il a eu à signaler en lisant
Figma, et rien de plus : **un diagnostic parle de l’export, jamais du
composant.** La forme d’une entrée et la règle qui la relie à
`coverage.portable` appartiennent au format et sont décrites
[là-bas](../../docs/FORMAT.md#métadonnées) ; ce qui relève du moteur est ce
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
qu’une fois. Le compte que le plugin affiche, ce que la pull request liste et ce
que `meta.diagnostics` publie sont désormais la même liste.

**`meta.figma.url` est absent des contrats produits aujourd’hui, ce qui est un
état normal du format.** L’URL se construit depuis `figma.fileKey`, que l’API ne
donne qu’aux plugins déclarant `enablePrivatePluginApi`, un drapeau réservé aux
plugins privés d’une organisation. Le plugin se distribue par la Figma
Community, le drapeau est donc retiré du manifest et la clé n’arrive jamais. `url` reste optionnel dans le schéma,
sans changement de version : un contrat produit avant cette décision le porte
encore, et un lecteur doit accepter les deux.

La traçabilité repose donc sur `nodeId` et `fileName`, que le contrat porte
toujours, et que le corps de la pull request annonce sur sa page de couverture.
Une revue y constate si cette traçabilité suffit. **L’absence de lien ne produit
aucun diagnostic** : elle n’est plus l’exception mais la règle, et un constat
que le designer ne peut pas corriger, répété à chaque export, apprendrait à
survoler la liste qui porte les gestes à faire.

---

## Partie 2 — Export tokens

La forme de `tokens.json` est décrite par [Partie 2 : Export
tokens](../../docs/FORMAT.md#partie-2--export-tokens). Ce document garde la
lecture des variables Figma, leurs collisions et leurs alias.

**1. Lister**,
```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables   = await figma.variables.getLocalVariablesAsync();
```

---

## Partie 3 — Configuration et dépôt GitHub

La configuration est optionnelle et locale à la machine via
`figma.clientStorage`. Elle contient l'URL du repository, la branche de base et
un PAT fine-grained. Le PAT n'est jamais écrit dans le document Figma, renvoyé à
l'UI après sauvegarde, ni logué. Il doit donner au repository cible les
permissions **Contents: read/write** et **Pull requests: read/write**.

Elle ne contient aucun chemin. **L'endroit où un export atterrit appartient au
repository visé**, qui le déclare dans son `ucm.config.json` ou laisse
s'appliquer les défauts du kit ; la grammaire de ce fichier et ses valeurs par
défaut sont dans `packages/kit/src/format/configuration.ts`,
`CONFIGURATION_PAR_DEFAUT`. Un chemin rangé sur le poste du designer ne
servirait que face à un repository sans `ucm.config.json`, au moment précis où
`ucm check` applique ces mêmes défauts. L'export atterrirait alors hors de vue
du contrôle. Le plugin lit ce fichier au test de connexion, avant la
publication, pour que le designer découvre un fichier fautif avant de
travailler.

L'en-tête expose en permanence l'état `connecté` / `non connecté` et un accès à
la page de configuration via une icône `gear` Font Awesome Free embarquée. Le
test `GET /repos/{owner}/{repo}` est automatique à l'ouverture et après chaque
sauvegarde. Le manifest n'autorise que `https://api.github.com` pour GitHub.

Chaque commande conserve son périmètre :

- **Exporter le composant** → PR contenant uniquement
  `{components}/{IdentifiantCode}/{IdentifiantCode}.contract.json` ;
- **Exporter les tokens** → PR contenant uniquement `{tokens}`, qui est un
  chemin de fichier et jamais un dossier.

`{components}` et `{tokens}` sont les deux champs de `ucm.config.json`.

Pour un artefact modifié, le plugin lit la ref de base, crée la branche
`ucm-exporter/export-{component|tokens}-{YYYYMMDD-HHmmss}` (le type d'artefact
et les secondes évitent toute collision quand on exporte le contrat puis les
tokens dans la même minute), écrit le fichier avec l'API Contents puis ouvre une
PR vers la branche de base, puis l'ouvre dans le navigateur par défaut
(`figma.openExternal` : l'iframe de l'UI est isolée et ne peut pas naviguer
elle-même) : le libellé du bouton l'annonce, faute de quoi trois exports
d'affilée ouvrent trois onglets que rien n'avait laissé prévoir. Le lien reste
dans le compte rendu pour y revenir. Si le contenu est identique (la comparaison
ignore `meta.exportedAt`, régénéré à chaque export) aucune branche ni PR n'est
créée. Config absente/invalide ou erreur GitHub : repli automatique vers le
téléchargement local avec message explicite.

**« Identique » se juge à deux endroits : la branche de base, et les pull
requests d'export encore ouvertes.** Un artefact déposé et pas encore fusionné
n'est pas sur la branche de base, et ne regarder qu'elle rouvrait une seconde
pull request en tout point pareille à la première. Le compte rendu du plugin dit
lequel des deux endroits a répondu, et donne le lien de la pull request quand
c'est elle : « aucun changement » sans l'endroit enverrait le designer chercher
sur la branche de base un fichier qui n'y est pas encore. Un contenu différent
pendant qu'une pull request d'export est ouverte n'est pas bloqué pour autant,
réexporter après correction étant le geste normal. Git signale le reste : deux
branches qui modifient le même fichier depuis la même base entrent en conflit à
la seconde fusion.

L'API Contents omet le contenu des fichiers supérieurs à 1 Mo : dans ce cas, le
plugin lit le blob Git correspondant avant de comparer, afin de ne pas créer une
PR inchangée. Au-delà de la limite GitHub de 100 Mo, il n'essaie pas de créer
une branche et conserve directement le téléchargement local.

**Le corps de la pull request a deux zones, et la frontière compte.** L'en-tête
dit l'identité de ce qui est déposé : le chemin du fichier, et, pour un contrat
seulement, le schéma qu'il porte. La liste qui suit ne porte que des gestes à
faire dans Figma.

C'est la page que le plugin ouvre juste après l'export : le designer y lit ce
qui n'a pas pu être décrit sans ouvrir le JSON ni le journal du plugin. Les deux
artefacts sont couverts par le même mécanisme, `tokens.json` n'a aucun champ où
transporter les siens, là où un contrat les garde aussi dans `meta.diagnostics`.
Un avertissement ne bloque jamais : seules les préconditions arrêtent un export
(cf. [CONCEPT.md](../../CONCEPT.md)).

**Le schéma annoncé est lu dans le fichier déposé, jamais dans la constante du
plugin.** `Schéma de contrat : 12.0` est le seul champ qui décide si le fichier
entier est lisible par le repository, hors de la fenêtre que ses lecteurs
supportent le contrat étant refusé en bloc, et il est enfoui au milieu d'un diff
de plusieurs milliers de lignes. Sur la couverture, celui qui décide de
fusionner le voit sans ouvrir le JSON. Annoncer la constante du plugin ferait de
cette ligne un énoncé sur le plugin déguisé en énoncé sur le fichier : deux
autorités pour la même chose, dont le désaccord serait muet. `tokens.json` n'en
reçoit aucune, c'est un arbre DTCG. Un contrat dont la version est illisible la
voit annoncée telle quelle, et un contrat qui n'en porte aucune le dit.

Chaque avertissement nomme l'élément Figma concerné avec l'intitulé que Figma
affiche, dit ce qui manquera au développeur, puis le geste à faire dans Figma.
Les trois sont exigés, un constat qui ne nomme aucun geste n'étant pas émis :
une liste dont la conclusion est toujours « rien à faire » apprend à son lecteur
qu'elle se survole, et il survolera ensuite celles qui demandent un geste.
[CONTRIBUTING.md](../../CONTRIBUTING.md) porte la règle et le vocabulaire.

**Les trois parties voyagent séparées jusqu'à l'interface.** Un site d'émission
écrit un `Constat` (ce qui manque, ce que ça coûte, quel geste le corrige) et
`localisation.ts` en compose le titre puis la phrase compacte. La phrase est ce
que publient `meta.diagnostics`, la pull request et le compte rendu ; les
parties sont ce que l'interface met en page, sous une pastille qui nomme la
sévérité. Une seule rédaction, deux formes. Sans cette séparation, l'interface
n'aurait le choix qu'entre afficher un paragraphe (où le geste se lit en
dernier, après deux phrases de contexte) et découper une `string` dans le DOM,
c'est-à-dire redéfinir chez elle une grammaire dont le moteur est propriétaire.

**Un avertissement arrive inerte dans la page GitHub.** Le message cite les
intitulés de Figma tels quels, et GitHub lit dans certains d'entre eux autre
chose que le designer : `@icons`, nom d'une variante de règle, y devenait le
profil d'un inconnu, notifié à chaque export, au lieu du mot à taper dans le
composant, et un calque nommé `#12` renverrait de même à une issue. Ces formes
sont donc publiées en `code`, seule zone que l'autoliaison de GitHub épargne :
le message reste celui que le compte rendu du plugin affiche, et le designer y
lit le nom exact qu'il doit écrire.

Tous les champs de configuration sont validés et les chemins restent relatifs.
Aucune branche ne survit à un export qui n'a pas ouvert de PR : si le commit ou
la PR échoue, la branche créée est supprimée avant le repli local.

---

### Les variables d'environnement, et pourquoi elles ne sont pas une interface

`ucm check` ne lit **aucune** variable d'environnement : il calcule lui-même ce
dont il a besoin, à partir de `--base <sha>` et du dépôt Git. C'est délibéré,
une commande qui dépend de variables posées ailleurs ne se reproduit pas à la
main, et le diagnostic qu'elle rend cesse d'être explicable.

Celles qui existent appartiennent donc au consommateur de référence, dont le
script de contrôle est plus ancien que cette commande. Elles sont documentées
ici parce qu'un repository qui écrit son propre script rencontrera les mêmes
questions, **pas parce qu'elles sont une surface publique.**

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

`CI` et `GITHUB_STEP_SUMMARY` ne sont pas de ce projet : la première est posée
par tout runner, la seconde par GitHub Actions, et les deux sont lues telles que
leurs propriétaires les définissent.

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de multi-composant
en une commande, pas de scoring. Aucun domaine réseau autre que GitHub API
déclarée dans le manifest.

### Sélectionner et cadrer ne sont pas modifier

**Tranché, et la question se reposera.** Rendre un avertissement cliquable
demande de poser une sélection (`figma.currentPage.selection = […]`) et de
déplacer la vue (`figma.viewport.scrollAndZoomIntoView(…)`). Une relecture
rapide y voit une violation de « le plugin ne modifie jamais le document » ; ce
n'en est pas une, et voici sur quoi la décision s'appuie plutôt que sur une
intuition.

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
supprimer un node, écrire une variable ou un style : tout cela reste interdit,
et `loiDuDocumentIntact.test.ts` le refuse en lisant la source. La différence
est celle entre regarder et écrire, non une affaire de degré.

---

## Versions

Ce qu'un numéro de version engage est décrit par
[Versions](../../docs/FORMAT.md#versions).
