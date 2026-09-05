# Unified Component Exporter — spécification

Ce document décrit le MOTEUR : ce que le plugin lit dans Figma, ce qu'il élit,
ce dont il avertit, et ce qu'il dépose sur GitHub. La forme de ce qu'il produit
est décrite dans [docs/FORMAT.md](../../docs/FORMAT.md).

## Objet

Ce document est la référence du comportement actuel du plugin. Le pourquoi et
la répartition des responsabilités vivent dans [CONCEPT.md](../../CONCEPT.md).

Le plugin produit :

- un contrat JSON décrivant la partie visuelle d’un composant ;
- un export DTCG des variables locales, avec leurs alias et leurs modes.

Ce que ces deux artefacts contiennent, et ce que leur silence dit, est décrit
par [docs/FORMAT.md](../../docs/FORMAT.md) — jusqu'à ce que le moteur y
soit contraint, ce document-ci ne parle que de la LECTURE de Figma.

## Contexte technique

- Plugin Figma (Plugin API) : pas d'API Variables REST ni de Code Connect.
  `api.github.com` est autorisé pour le dépôt optionnel des artefacts via PR ;
- Tourne dans l'éditeur, produit des fichiers en téléchargement sans config
  valide, ou les dépose sur une branche GitHub dédiée avec une config valide.
- Deux commandes indépendantes qui partagent le même code Figma :
  **Export composant** (Partie 1) et **Export tokens** (Partie 2).
- Stack : TypeScript, `@figma/plugin-typings`, build esbuild. L'UI expose le
  statut GitHub, les deux commandes, la configuration, un journal, un retour
  en direct sur la sélection, et en pied de page la version de schéma que le
  bundle chargé produit — Figma peut servir un bundle plus ancien que celui du
  disque, et rien d'autre ne le dirait.

- **Les deux commandes projettent un nom de la même façon**, et citent un token
  sous la même forme. La règle est celle du format —
  [Nommer et citer un token](../../docs/FORMAT.md#nommer-et-citer-un-token) —,
  et `normalizeName()` en est l'implémentation partagée. Ce qui appartient à ce
  document est le fait qu'une SEULE implémentation serve les deux commandes :
  deux projections du même nom divergeraient, et un contrat citerait alors un
  token que `tokens.json` n'écrit pas sous ce nom.

## Hypothèses sur le design system

Ce que le contrat suppose d'un design system — clé de base, allongement, déclaration d'un rôle — est décrit par [Hypothèses sur le design system](../../docs/FORMAT.md#hypothèses-sur-le-design-system).

Les noms de collections et le nombre de niveaux d’alias sont libres. Le moteur
gère les chaînes profondes et les alias de tous types.

Le fichier Figma de référence utilise plusieurs niveaux — primitives, marques,
tokens sémantiques, composants et dimensions — uniquement pour éprouver cette
généricité. Sa structure n’est pas imposée aux autres design systems.

---

## Partie 1 — Export composant (moteur générique)

Décrit **n'importe quel** composant ou component set en lisant sa vraie
structure Figma.
**Rien n'est codé en dur sur un composant précis** : les règles « intelligentes »
sont auto-détectées (nom d'axe, valeurs, rôle de calque) et centralisées dans
`semantics.ts`. Button sert d'exemple de référence.

**Entrée** : exactement un `COMPONENT` ou un `COMPONENT_SET` sélectionné. Les
règles `<Nom>-Rules` enrichissent l'intention mais ne conditionnent pas la
fidélité de l'export. Ce qu'un set clairsemé produit dans `variants`, et ce
qu'un consommateur a le droit d'en composer, est décrit par
[Partie 1](../../docs/FORMAT.md#ce-que-le-contrat-publie-champ-par-champ).

### Algorithme

#### La règle commune

Le silence commun à ces champs — une variable se publie, un nombre brut avertit, une valeur neutre reste absente sans un mot — est décrit par [La règle commune](../../docs/FORMAT.md#la-règle-commune).

Le geste demandé au designer est toujours de NOMMER la valeur, jamais de la
retirer du design.

#### 1. Props

Ce que `props` CONTIENT est décrit par [1. Props](../../docs/FORMAT.md#1-props). Ce document garde la lecture des component properties de Figma et l'élection de la surface publique.

#### 2. Tokens de variantes

Ce que `tokens` et `strokes` CONTIENNENT — la clé d'une couleur, son allongement, les rôles, les emplacements de peinture — est décrit par [2. Tokens de variantes](../../docs/FORMAT.md#2-tokens-de-variantes). Ce document garde la façon dont le moteur lit les peintures d'un calque et ce qu'il en dit.

La couleur publiée et l'avertissement sortent de la MÊME lecture, peinture par
peinture : la variable d'un paint est celle qu'il porte lui-même. Une peinture
sans effet ne publie donc pas plus sa couleur qu'elle ne réclame la sienne, et
un fill masqué relié ne couvre pas le fill visible posé à la main. Quand cette
lecture ne peut pas conclure, la liste du node reprend la main sans avertir :
perdre une couleur coûterait plus qu'un diagnostic manquant.

#### 3. Layout

Ce que `layout`, `sizes` et les bornes CONTIENNENT est décrit par [3. Layout](../../docs/FORMAT.md#3-layout). Ce document garde l'élection du node de layout et ce que cette élection écarte.

Le **node de layout** d'un variant est le calque dont les
enfants directs deviennent ses slots. Il s'élit au score : le calque qui porte
le plus de dimensions complètes liées, la racine à défaut. Ce score dépend de la
racine d'où part la recherche, si bien que l'élection a lieu **une seule fois
par variant**, avec la même règle pour tous : depuis le wrapper de dimensions
quand le composant en possède un, sinon depuis le variant. Les slots, les slots
d'icônes et les chemins de `variantViews[variants[].view].typography` décrivent donc toujours le même
arbre. Un variant privé de ce wrapper est signalé plutôt que rattrapé en
silence.

Ce que l'élection écarte n'est pas oublié : un calque posé **à côté** du node
élu — un badge, un liseré, un second bloc — ne reçoit ni slot, ni typographie,
ni visibilité, alors que ses couleurs entrent bien dans `variants[].tokens`, relevé
sur le variant entier. Chaque calque écarté produit donc un avertissement.

La liste s'arrête là, et c'est délibéré : `RECTANGLE`, `ELLIPSE` et `LINE` en
sont exclus. Ce sont les formes dont le type ne dit rien de l'usage — une
surface, un liseré, un séparateur dont la hauteur est une vraie décision —, et
la règle « le type du node ne tranche pas » les vise nommément.

**Applicabilité avant liaison.** Un gap et des paddings n'existent que sous un
auto-layout, et une liaison de variable survit à sa désactivation. L'exporteur
tranche donc l'applicabilité **avant** de regarder les liaisons, sans quoi un
`itemSpacing` resté lié exporterait un écart que le rendu n'a pas. Deux cas
produisent chacun leur propre diagnostic, distinct de « aucune variable
reliée » :

#### 4. Modèle d'interaction

Ce que `stateModel` CONTIENT est décrit par [4. Modèle d'interaction](../../docs/FORMAT.md#4-modèle-dinteraction).

#### 5. Typographie

Ce que `textStyles` et `variantViews.*.typography` CONTIENNENT est décrit par
[5. Typographie](../../docs/FORMAT.md#5-typographie).

Chaque calque texte de chaque variant doit porter un text
style Figma unique. Le moteur lit l'objet `TextStyle`, conserve son nom exact
dans `textStyles.<clé>.figmaName`, puis résout ses `boundVariables` :
`fontFamily`, `fontSize`, `fontWeight` (fallback `fontStyle`), `lineHeight` et
`letterSpacing`. La clé du catalogue est le nom normalisé du style ; aucun lien
vers les tokens n'est déduit de ce nom. Chaque propriété non liée produit un
warning et n'est jamais remplacée par une valeur brute.

#### 6. Structure

Ce que `structure` et `children` CONTIENNENT — descente, bornes, flux, dimensions, place hors du flux — est décrit par [6. Structure](../../docs/FORMAT.md#6-structure). Ce document ne garde que ce que le moteur DÉCIDE en lisant Figma : ce dont il avertit, ce qu'il arrondit, et où il relève.

##### Un dessin que rien ne déclare

**Un dessin qu'aucune règle ne désigne avertit.** Le contrat n'exporte aucun
tracé : le seul moyen de dire « dessine ceci » est une règle `@icons`, qui nomme
l'icône à rendre. Un calque dont le sous-arbre ne porte ni texte, ni dépendance,
ni icône déclarée, mais bien un tracé, est donc publié avec sa place et ses
couleurs, et son dessin manque. C'est presque toujours l'icône qu'on a oublié de
déclarer, et le geste est le même dans les autres cas : la déclarer.

Le déclencheur est le TRACÉ, jamais l'absence de texte : un cadre vide ou une
surface colorée se décrivent entièrement par leurs tokens. Le message part une
seule fois par dessin, et nomme le calque le plus profond qui contienne encore
tout le dessin, celui que le designer déclarerait : « skull », jamais le
« Vector » que Figma a nommé pour lui ni le cadre qui l'enveloppe. Un composant
qui EST un dessin de bout en bout ne dit rien : une icône exportée pour
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
parent, ne publie rien et n'avertit de rien — mieux vaut une absence qu'un
`NaNpx`.

##### Rotation : le seuil de neutralité

Sous le centième de degré, rien n'est publié : Figma stocke des flottants, et
une transformation successive y laisse des résidus qu'aucun écran ne rend et
qu'aucun designer ne peut remettre à zéro.

La mesure est arrondie à deux décimales. Elle vient d'un calcul de Figma, dont
les dix-sept chiffres feraient bouger l'artefact d'un export à l'autre sans
qu'aucun design ait changé.

##### Propriétés non portables : la portée du relevé

Ce relevé vit dans l'extraction, jamais dans un balayage à part : on n'avertit
que sur ce qu'on publie, et les entrailles d'une icône ou les calques d'une
dépendance ne regardent pas ce contrat-ci. Aucune valeur au défaut de Figma ne
produit de message : un `clip content` activé ne manque à personne, et un
rapport que le designer cesse de lire ne protège plus rien. C'est la seule
réserve, et elle se lit sur la valeur, jamais sur l'usage supposé du calque. Les
tracés internes d’une icône restent hors de la portée du relevé. Le seuil de
neutralité de la rotation est un centième de degré, très en dessous du premier
pixel visible et très au-dessus du bruit de flottant.

##### Passage à la ligne : les mots du message

Sous le wrap, Figma scinde son champ gap en deux. Les messages emploient donc
« horizontal gap » et « vertical gap », les intitulés que le panneau affiche.

#### 9. Échantillon de maquette

Ce qu'un échantillon CONTIENT, ce qu'il n'a pas le droit de porter et comment ses adresses se résolvent est décrit par [9. Échantillon de maquette](../../docs/FORMAT.md#9-échantillon-de-maquette). Ce document garde ce que le moteur RELÈVE dans Figma, et ce qu'il omet plutôt que de deviner.

**Une notice, jamais un avertissement.** Deux échantillons là où le design en
attendait un révèlent un libellé retouché dans un seul variant. Le constat suit
ses jumeaux sur la structure et la composition, et emprunte le même canal :
rien ne manque, rien n'est à corriger.

#### 7. Intention et documentation des props

**Toute cette section vit dans [7. Intention et documentation des props](../../docs/FORMAT.md#7-intention-et-documentation-des-props), et c'est un cas limite qu'il faut nommer.**

La grammaire des règles — un conteneur `<Nom>-Rules` sur la même page, une
instance par règle, un tag par variante — décrit ce que le moteur LIT dans
Figma, donc ce document. Mais chaque règle n'a de sens qu'à côté du champ
qu'elle remplit : `@icons` et sa politique, son slot, sa prop runtime, ses
variants forment une seule explication, et la couper en deux la rendrait
illisible des deux côtés.

La frontière de T8.3 tranche ce cas : une règle à cheval va du côté du
CONSOMMATEUR, et le moteur y renvoie — c'est le moteur qui a le code sous la
main, pas le repository qui lit l'artefact. Cette section est donc un renvoi,
volontairement, et non un oubli du dédoublonnage.

#### 8. Rendu sémantique et garde-fous

Toute propriété pertinente sans variable liée → warning précis (calque + propriété), non
exportée, **export non bloqué**. C'est la seule décision de ce document dans
cette section : comment un rôle se REND — et pourquoi aucun rôle de contour ne
cite une propriété qui consomme la boîte — appartient au format,
[8. Rendu sémantique et garde-fous](../../docs/FORMAT.md#8-rendu-sémantique-et-garde-fous).

### Ce que l'export écrit

#### Le nom du fichier, et ce qu'il unifie

Le moteur ne choisit pas librement le nom de ce qu'il dépose : il projette le
nom Figma par `codeIdentifier`, l'unique autorité du kit sur cette question, et
n'écrit nulle part une seconde règle de nommage. La forme obtenue et les
exemples qui l'illustrent sont
[du format](../../docs/FORMAT.md#fichier-et-exemple) ; ce qui appartient au
moteur est qu'il conserve le nom Figma **intact** dans `name` à côté de
l'identifiant projeté. Aucune des deux valeurs ne se déduit de l'autre en
sécurité, et publier les deux évite au consommateur d'avoir à inverser une
normalisation qui perd de l'information.

**Ce que l'export unifie avant d'écrire.** Un composant se présente dans Figma
comme un `COMPONENT_SET`, parfois enveloppé d'un wrapper qui porte ses propres
component properties. Le moteur en publie UN contrat, pas deux : il élit une
surface publique unique — owner direct plus wrapper élu — et le contrat décrit
cette API unifiée. C'est une décision d'extraction, prise dans
`propertySurface.ts`, et le format n'en garde que le résultat.

Les dimensions géométriques ne figurent qu'à UN endroit : `sizes` les porte
dès que le composant expose un axe de tailles ; sinon `gap` / `padding` /
`radius` restent au niveau haut de `structure`. Cette question se tranche
**avant** de relever quoi que ce soit, et les avertissements suivent la même
réponse : dès qu'un axe de tailles existe, les dimensions du calque de
référence ne sont ni relevées ni signalées. Les signaler enverrait le designer
relier une variable sur un calque dont rien ne sera publié — et le message le
nommerait par un nom de layer commun à tous les variants du set, sans lui dire
lequel ouvrir. Toute la typographie appartient au catalogue `textStyles` et aux
usages exacts de chaque `variantViews`.

#### Composition et dépendances

Ce que `composes` et le cadre de dépendance CONTIENNENT est décrit par [Composition et dépendances](../../docs/FORMAT.md#composition-et-dépendances). Ce document garde la façon dont le moteur reconnaît une dépendance dans l'arbre Figma, et ce qu'il en dit.

#### Métadonnées

Le moteur écrit dans `meta.diagnostics` tout ce qu’il a eu à signaler en
lisant Figma, et rien d’autre : **un diagnostic parle de l’EXPORT, jamais du
composant.** La forme d’une entrée et la règle qui la relie à
`coverage.portable` appartiennent au format et sont décrites
[là-bas](../../docs/FORMAT.md#métadonnées) ; ce qui relève du moteur est ce
qu’il décide d’émettre.

Cette décision se prend en deux temps, dans `exportComponent.ts`. Le moteur
accumule d’abord ses constats sous forme de messages, puis les classe au moment
d’écrire — une perte de projection portable l’emporte toujours sur une simple
note, de sorte qu’un même texte relevé des deux côtés reste un point à
corriger. Les messages sont dédoublonnés par leur TEXTE : deux extracteurs qui
concluent la même chose ne le disent qu’une fois.

Le compte que le plugin affiche et que la pull request appelle
« avertissement » n’est pas ce catalogue entier : c’est la part qui demande un
geste au designer. `meta.diagnostics` porte tout, y compris ce dont il n’a rien
à faire.

**`meta.figma.url` est absent des contrats produits aujourd’hui, et c’est un
état normal du format.** L’URL se construit depuis `figma.fileKey`, que l’API ne
donne qu’aux plugins déclarant `enablePrivatePluginApi` — un drapeau réservé aux
plugins privés d’une organisation. Le plugin se distribue par la Figma Community
(T4.4, arbitrage dans `PISTES-EVOLUTION.md §2`), le drapeau est donc retiré du
manifest et la clé n’arrive jamais. `url` reste OPTIONNEL dans le schéma, sans
changement de version : un contrat produit avant cette décision le porte encore,
et un lecteur doit accepter les deux.

La traçabilité repose donc sur `nodeId` et `fileName`, que le contrat porte
toujours, et que le corps de la pull request annonce sur sa page de couverture —
c’est là que se constate si elle suffit à une revue. **L’absence de lien ne
produit aucun diagnostic** : elle n’est plus l’exception mais la règle, et un
constat que le designer ne peut pas corriger, répété à chaque export,
apprendrait à survoler la liste où vivent les gestes à faire.

---

## Partie 2 — Export tokens

La forme de `tokens.json` est décrite par [Partie 2 — Export tokens](../../docs/FORMAT.md#partie-2--export-tokens). Ce document garde la lecture des variables Figma, leurs collisions et leurs alias.

**1. Lister** —
```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables   = await figma.variables.getLocalVariablesAsync();
```

---

## Partie 3 — Configuration et dépôt GitHub

La configuration est optionnelle et locale à la machine via
`figma.clientStorage`. Elle contient l'URL du repository, la branche de base,
les chemins des composants et des tokens, ainsi qu'un PAT fine-grained. Le PAT n'est
jamais écrit dans le document Figma, renvoyé à l'UI après sauvegarde, ni logué.
Il doit donner au repository cible les permissions **Contents: read/write** et
**Pull requests: read/write**.

L'en-tête expose en permanence l'état `connecté` / `non connecté` et un accès à
la page de configuration via une icône `gear` Font Awesome Free embarquée.
Le test `GET /repos/{owner}/{repo}` est automatique à l'ouverture et après
chaque sauvegarde. Le manifest n'autorise que
`https://api.github.com` pour GitHub.

Chaque commande conserve son périmètre :

- **Exporter le composant** → PR contenant uniquement
  `{componentsPath}/{IdentifiantCode}/{IdentifiantCode}.contract.json` ;
- **Exporter les tokens** → PR contenant uniquement
  `{tokensPath}/tokens.json`.

Pour un artefact modifié, le plugin lit la ref de base, crée la branche
`ucm-exporter/export-{component|tokens}-{YYYYMMDD-HHmmss}` (le type d'artefact
et les secondes évitent toute collision quand on exporte le contrat puis les
tokens dans la même minute), écrit le fichier avec l'API Contents puis
ouvre une PR vers la branche de base, puis l'ouvre dans le navigateur par
défaut (`figma.openExternal` : l'iframe de l'UI est isolée et ne peut pas
naviguer elle-même) — le libellé du bouton l'annonce, faute de quoi trois
exports d'affilée ouvrent trois onglets que rien n'avait laissé prévoir. Le
lien reste dans le journal pour y revenir. Si le
contenu est identique — la
comparaison ignore `meta.exportedAt`, régénéré à chaque export — aucune
branche ni PR n'est créée. Config absente/invalide ou erreur GitHub : repli
automatique vers le téléchargement local avec message explicite.

**« Identique » se juge à DEUX endroits : la branche de base, et les pull
requests d'export encore ouvertes.** Un artefact déposé et pas encore fusionné
n'est justement pas sur la branche de base ; ne regarder qu'elle rouvrait, pour
un réexport strictement identique, une seconde pull request en tout point
pareille à la première. Les deux genres d'artefact sont concernés : le doublon
ne demande qu'un chemin et deux exports. Le journal du plugin dit LEQUEL des
deux endroits a répondu, et donne le lien de la pull request quand c'est elle —
sans quoi « aucun changement » enverrait chercher sur la branche de base un
fichier qui n'y est pas encore, et le designer conclurait que son export s'est
perdu. Un contenu DIFFÉRENT pendant qu'une pull request d'export est ouverte
n'est pas bloqué pour autant : réexporter après avoir corrigé dans Figma est le
geste normal, et c'est Git qui signale le reste — deux branches qui modifient le
même fichier depuis la même base entrent en conflit à la seconde fusion.

L'API Contents omet le contenu des fichiers supérieurs à 1 Mo : dans ce cas,
le plugin lit le blob Git correspondant avant de comparer, afin de ne pas
créer une PR inchangée. Au-delà de la limite GitHub de 100 Mo, il n'essaie pas
de créer une branche et conserve directement le téléchargement local.

**Le corps de la pull request a deux zones, et la frontière compte.**
L'en-tête dit l'IDENTITÉ de ce qui est déposé : le chemin du fichier, et — pour
un contrat seulement — le schéma qu'il porte. La liste qui suit ne porte que des
GESTES à faire dans Figma.

C'est la page que le plugin ouvre juste après l'export : le designer
y lit ce qui n'a pas pu être décrit sans ouvrir le JSON ni le journal du plugin.
Les deux artefacts sont couverts par le même mécanisme — `tokens.json` n'a aucun
champ où transporter les siens, là où un contrat les garde aussi dans
`meta.diagnostics`. Un avertissement ne bloque jamais : seules les préconditions
arrêtent un export (cf. [CONCEPT.md](../../CONCEPT.md)).

**Le schéma annoncé est lu DANS le fichier déposé, jamais dans la constante du
plugin.** `Schéma de contrat : 12.0` est le seul champ qui décide si le fichier
entier est lisible par le repository — hors de la fenêtre que ses lecteurs
supportent, le contrat est refusé en bloc —, et il est enfoui au milieu d'un
diff de plusieurs milliers de lignes. Sur la couverture, celui qui décide de
fusionner le voit sans ouvrir le JSON, et les pull requests d'export restées
ouvertes disent lesquelles précèdent une bascule de version. Annoncer la
constante du plugin ferait de cette ligne un énoncé sur le PLUGIN déguisé en
énoncé sur le FICHIER : deux autorités pour la même chose, dont le désaccord
serait muet. `tokens.json` n'en reçoit aucune — c'est un arbre DTCG, il ne porte
aucun schéma UCM. Un contrat dont la version est illisible la voit annoncée
telle quelle, et un contrat qui n'en porte aucune le dit : le contrôle du
repository le refusera pour champ absent, et la cause se lit ici en une ligne.

Chaque avertissement nomme l'élément Figma concerné avec l'intitulé que Figma
affiche, dit ce qui manquera au développeur, puis le geste à faire dans Figma.
Les trois sont exigés : un constat qui ne nomme aucun geste est une note, et
une note n'entre pas dans la pull request. Elle reste dans `meta.diagnostics`,
sous le code `UCM_EXPORT_INFO`, et dans le journal du plugin. La raison tient en
une phrase : une liste dont la conclusion est toujours « rien à faire » apprend
à son lecteur qu'elle se survole, et il survolera ensuite celles qui demandent
un geste. La règle et le vocabulaire vivent dans
[CONTRIBUTING.md](../../CONTRIBUTING.md).

**Un avertissement arrive inerte dans la page GitHub.** Le message cite les
intitulés de Figma tels quels, et GitHub lit dans certains d'entre eux autre
chose que le designer : `@icons`, nom d'une variante de règle, y devenait le
profil d'un inconnu — notifié à chaque export — au lieu du mot à taper dans le
composant, et un calque nommé `#12` renverrait de même à une issue. Ces formes
sont donc publiées en `code`, seule zone que l'autoliaison de GitHub épargne :
le message reste celui que le journal du plugin affiche, et le designer y lit
le nom exact qu'il doit écrire.

Tous les champs de configuration sont validés et les chemins restent
relatifs. Aucune branche ne survit à un export qui n'a pas ouvert de PR : si
le commit ou la PR échoue, la branche créée est supprimée avant le repli
local.

---

## Hors périmètre MVP

Pas d'écriture dans le document Figma, pas d'auto-merge, pas de
multi-composant en une commande, pas de scoring. Aucun domaine réseau autre que
GitHub API déclarée dans le manifest.

---

## Versions

Ce qu'un numéro de version engage est décrit par [Versions](../../docs/FORMAT.md#versions).
