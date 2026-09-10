# Pistes d’évolution à étudier

Cette étude s’adresse aux contributeurs qui choisissent les prochaines
expérimentations UCM. Chaque piste part d’une capacité ou d’une limite du code,
compare des solutions et propose un essai. Les directions indiquées restent
des hypothèses. Leur adoption relève de la [roadmap](../../ROADMAP.md).

La répartition des responsabilités est celle du [concept](../../CONCEPT.md) :
design dans Figma, comportement dans le code, association et contrôles dans le
repository consommateur. Les extensions du contrat relèvent du
[format](../FORMAT.md) et de sa [compatibilité](../COMPATIBILITE.md).

| Base de l’étude | Portée de la vérification |
|---|---|
| Code du dépôt et interfaces publiques | Points d’extension existants, limites des lecteurs et de la configuration |
| Sources officielles consultées le 2026-09-10 | Capacités documentées, restrictions et statut des solutions |
| Expérimentations proposées | Intégrations, coûts et bénéfices à mesurer ; aucun essai de service ni benchmark de modèle n’est présenté comme réalisé |

- [Étendre le contrat et l’export](#1-étendre-le-contrat-et-lexport)
- [Exploiter les contrats dans l’application](#2-exploiter-les-contrats-dans-lapplication)
- [Contrôler les écarts et les changements](#3-contrôler-les-écarts-et-les-changements)
- [Assister l’implémentation](#4-assister-limplémentation)
- [Partager et automatiser](#5-partager-et-automatiser)
- [Choisir les expérimentations](#6-choisir-les-expérimentations)

## Conditions communes aux modules proposés

Chaque module serait installable et activable par projet. Il disposerait d’une
entrée locale explicite, d’une sortie exploitable séparément et d’un adaptateur
pour ses éventuelles dépendances de framework ou de service. Un orchestrateur
resterait facultatif. Un module désactivé ne chargerait pas son service et ne
produirait aucun verdict de conformité.

Une dépendance de données resterait nécessaire : une comparaison de captures
demande des cas exécutables. Ces cas pourraient toutefois provenir de stories
existantes. Le générateur UCM serait un fournisseur possible, sans devenir un
prérequis à toute revue visuelle. La même séparation s’appliquerait aux tokens,
à la documentation et aux agents.

Le code offre une première base : les fonctions des
[lecteurs](../../packages/kit/src/lecteurs/index.mjs) sont publiques,
`controlerRepository` accepte un adaptateur et `ADAPTATEUR_VIDE` représente
l’absence d’analyse du code. La
[découverte du CLI](../../packages/cli/src/adaptateur.mjs) ne charge cependant
que l’adaptateur TypeScript officiel. Elle ne constitue pas encore un mécanisme
d’activation de modules arbitraires.

La [configuration](../../packages/kit/src/format/configuration.ts) lit trois
champs : `components`, `tokens` et `implementation`. Des clés supplémentaires
ordinaires sont ignorées, tandis que certaines clés de version sont refusées.
Ajouter `modules` aujourd’hui n’activerait donc rien. Une première intégration
pourrait utiliser les configurations natives des outils ; une configuration
commune demanderait ensuite une grammaire et un chargeur explicites.

Deux installations indépendantes éprouveraient chaque module retenu : chemins,
versions et options propres à chaque repository, sans import de fichier privé
de l’exporteur. Les consommateurs des contrats utiliseraient le kit pour leur
lecture. Le code de production consommerait du code et des ressources dérivées
au build, conformément au concept.

## 1. Étendre le contrat et l’export

### 1.1. Décrire les propriétés visuelles manquantes

**Besoin et appui dans le code.**
[unsupportedProperties.ts](../../packages/plugin/src/contract/unsupportedProperties.ts)
signale notamment `textCase` et `textDecoration` sur les calques publiés. Les
ajouter aurait un effet vérifiable : un texte en capitales ou souligné pourrait
être reconstruit depuis le contrat. La sélection des calques resterait celle de
[structureTree.ts](../../packages/plugin/src/contract/structureTree.ts).

**Solutions à comparer.** Une première extension pourrait décrire une valeur
uniforme par calque texte. Une seconde pourrait décrire des segments de texte
ayant des propriétés différentes. Figma permet de lire les propriétés par
plage et d’obtenir les segments stylés ; une valeur `figma.mixed` ne constitue
donc pas une valeur uniforme exploitable.
[Lecture des textes dans Figma](https://developers.figma.com/docs/plugins/working-with-text/).

**Direction proposée.** Commencer par les valeurs uniformes sur un composant
réel. Déterminer si la propriété appartient au text style ou à son usage local
avant de choisir son emplacement dans le contrat. La traduction de la casse
devrait préciser les effets de la langue et les différences entre
transformation du texte affiché et modification de son contenu.

Le support des segments demanderait une décision distincte : leurs adresses
peuvent dépendre d’un contenu de maquette indicatif. Des indices de caractères
ne peuvent pas devenir une obligation sur un texte applicatif remplaçable sans
définir cette relation.

**Module et validation.** L’extension appartiendrait au producteur et aux
lecteurs du format. Son exploitation par un générateur ou un comparateur
resterait facultative. Un consommateur incapable de traiter le champ
l’indiquerait dans sa couverture. L’essai porterait sur un texte uniforme, un
texte mixte et un contenu remplacé, avec une comparaison dans le navigateur.
Le coût comprend l’évolution du schéma, la compatibilité et les adaptateurs,
au-delà de la seule extraction Figma.

### 1.2. Publier la localisation des diagnostics

**Besoin et appui dans le code.**
[localisation.ts](../../packages/plugin/src/contract/localisation.ts) conserve
déjà les cibles Figma et les parties des messages pour l’interface. Le type
[ContractDiagnostic](../../packages/kit/src/format/types.ts) accepte `figma`
et `contractPath`, mais
[exportComponent.ts](../../packages/plugin/src/contract/exportComponent.ts)
ne publie que le code, la sévérité et le message. La piste concerne la
transmission de ces adresses aux consommateurs.

**Solutions à comparer.** Enrichir le registre actuel limiterait les
modifications, mais son indexation par phrase ne distingue pas deux cibles qui
produisent le même texte. Un collecteur d’objets typés pourrait conserver
l’identité du constat, ses occurrences et ses adresses jusqu’à la publication.
Cette seconde voie demanderait de revoir le dédoublonnage et ses lois.

**Direction proposée.** Spécifier d’abord ce que représente une occurrence :
un calque, plusieurs variants, un champ absent du contrat ou un problème sans
cible. `contractPath` désignerait un emplacement attendu même lorsque sa valeur
est absente. Il ne serait pas reconstitué depuis la phrase française.

**Module et validation.** Le producteur enrichirait le diagnostic ; un module
de rapport pourrait exploiter les adresses sans installer Figma. L’affichage
textuel resterait utilisable seul. L’essai suivrait une propriété perdue depuis
son calque jusqu’au rapport, puis deux calques homonymes et un constat agrégé.
Une localisation ambiguë serait conservée comme telle. Le critère utile serait
le temps nécessaire pour retrouver et corriger le problème.

### 1.3. Retrouver la source Figma depuis une revue

**Besoin et appui dans le code.** `buildMeta` conserve le nom du fichier,
l’identifiant du composant et, lorsqu’elle existe, sa clé de publication.
L’URL dépend de `figma.fileKey`, accessible aux plugins privés dans les
conditions précisées par Figma.
[Métadonnées de l’export](../../packages/plugin/src/contract/exportComponent.ts),
[API Figma](https://developers.figma.com/docs/plugins/api/figma/).

**Solutions à comparer.** Un réglage du plugin pourrait recevoir l’URL du
fichier fournie par le designer. Une association maintenue dans le repository
pourrait aussi relier une provenance de contrat à cette URL, puis enrichir
uniquement le rapport. Cette seconde option éviterait un changement d’export,
mais demanderait une identité de source assez précise : le nom d’un fichier
Figma peut être dupliqué.

**Direction proposée.** Essayer l’association côté revue avant d’ajouter une
saisie permanente dans le plugin. Vérifier la cible et conserver la provenance
de l’association. Une URL connue permet de naviguer ; elle ne prouve pas que
le contrat décrit l’état courant de la maquette.

**Module et validation.** Un adaptateur de liens fonctionnerait avec le seul
rapport. Sa désactivation retirerait les liens enrichis. L’essai comparerait le
temps de navigation sur plusieurs contrats, dont deux fichiers de même nom.
Si la saisie ou les liens erronés coûtent plus que la recherche manuelle,
l’intégration n’aurait pas de bénéfice établi.

### 1.4. Éprouver les assemblages à l’échelle d’un écran

**Besoin et appui dans le code.** Les vues exactes, les grilles et `composes`
permettent déjà de décrire des assemblages. En revanche,
[la cible d’export](../../packages/plugin/src/cible.ts) et
[l’exporteur](../../packages/plugin/src/contract/exportComponent.ts)
n’acceptent que `COMPONENT` et `COMPONENT_SET`. Un écran dessiné comme simple
`FRAME` n’est pas directement exportable.

**Solutions à comparer.** Le premier essai pourrait porter sur un écran déjà
modélisé en composant composé. Un second pourrait étudier un artefact
d’assemblage distinct si le premier révèle des besoins de responsive ou de
placement que le contrat de composant ne peut exprimer. Étendre l’entrée aux
frames arbitraires serait une troisième option, avec des règles d’extraction
à définir.

**Direction proposée.** Commencer par l’écran composé. Comparer plusieurs
largeurs avec des contenus courts et longs. Des maquettes desktop et mobile ne
donnent pas, à elles seules, le seuil ni la règle de transition entre les deux.
La navigation, les données et les événements resteraient applicatifs.

**Module et validation.** Un banc d’essai d’assemblage importerait les
composants existants et un montage fourni par le projet. Il pourrait être
activé sans contrôle visuel automatique. L’essai consignerait ce qui se décrit
avec le format courant, les informations manquantes et le coût de montage.
Un nouveau format ne serait étudié que pour les manques observés.

### 1.5. Diagnostiquer les lenteurs et les échecs de l’exporteur

**Besoin et appui dans le code.** Les lectures et résolutions Figma de
[l’exporteur](../../packages/plugin/src/contract/exportComponent.ts) peuvent
être difficiles à reproduire. Les limites de performance connues sont suivies
dans la [roadmap](../../ROADMAP.md#fragilités-connues).

**Solutions à comparer.** Des mesures locales par étape suffiraient pour une
lenteur. Une trace structurée exportable aiderait à reproduire un défaut dont
l’ordre des lectures compte. Un service de télémétrie ajouterait des comptes,
une collecte et une exploitation continue, à justifier par un usage d’équipe.

**Direction proposée.** Instrumenter un défaut réel avec un collecteur injecté
dans l’orchestration. Conserver seulement les durées, étapes et données utiles
à sa reproduction. Les diagnostics du designer continueraient à suivre leur
protocole existant.

**Module et validation.** Le collecteur serait activé pour une session de
diagnostic. Il n’alimenterait pas `meta.diagnostics`. Le même export, avec et
sans instrumentation, devrait produire le même contrat hors date d’export.
Le temps ajouté et l’utilité de la trace pour reproduire le défaut décideraient
du maintien de ce module.

## 2. Exploiter les contrats dans l’application

### 2.1. Relier un contrat à ses implémentations

**Besoin et appui dans le code.**
[cheminImplementation](../../packages/kit/src/lecteurs/implementation.mjs)
résout un motif avec `{dir}` et `{id}`. Il ne désigne pas un export public,
plusieurs implémentations ou un montage de démonstration. Ces informations
seraient utiles aux stories, aux contrôles et aux agents.

**Solutions à comparer.** Conserver le motif pour les projets réguliers ;
ajouter des exceptions par composant pour les organisations irrégulières ;
ou charger un adaptateur qui résout les exports de la stack. Une découverte
automatique des symboles limiterait la saisie, mais devrait rendre les
ambiguïtés visibles.

**Direction proposée.** Ajouter seulement ce que le motif ne permet pas de
calculer : cible d’implémentation, module importable, export nommé ou par défaut.
Les providers et données de démonstration appartiendraient au montage. Une
table de noms de props resterait une exception destinée à une API existante,
avec un contrôle des correspondances devenues inutiles.

**Module et validation.** Un résolveur d’implémentation serait partagé par les
adaptateurs qui en ont besoin. Le CLI devrait pouvoir choisir l’adaptateur
depuis le projet, y compris lorsqu’il est installé mais désactivé. L’essai
couvrirait deux organisations de dossiers, un export renommé, deux cibles de
framework et un contrat sans code. L’absence de montage ne bloquerait pas la
validation du contrat.

### 2.2. Déclarer les icônes disponibles dans un projet

**Besoin et appui dans le code.**
[ucm icons](../../packages/cli/src/icons.mjs) énumère les noms demandés et les
contrats qui les citent. Le choix du jeu, de l’export et de la place du glyphe
dans son carré appartient au consommateur selon le
[format](../FORMAT.md#ce-que-le-contrat-ne-dit-pas-dune-icône).

**Solutions à comparer.** Un manifeste de données pourrait associer les noms
Figma aux identifiants du jeu. Un adaptateur de code pourrait exposer des
imports explicites. Le manifeste serait lisible sans framework ; l’adaptateur
permettrait de vérifier la résolution effective des exports.

**Direction proposée.** Séparer le relevé des besoins, la correspondance
déclarée et la vérification des exports. Préférer des imports explicites aux
chargements par chaîne quand la stack permet de limiter ainsi le code livré.
Le comportement accessible d’une icône resterait défini par son usage dans
l’application.

**Module et validation.** Un contrôle de couverture consommerait la liste et
l’adaptateur d’icônes. Sa désactivation laisserait `ucm icons` utilisable. Deux
projets pourraient satisfaire le même nom avec des jeux différents. L’essai
couvrirait une icône fixe, une icône remplaçable, un export disparu et un glyphe
dont l’occupation visuelle diffère malgré un carré identique.

### 2.3. Produire les ressources de tokens

**Besoin et appui dans le code.**
[buildLeaf](../../packages/plugin/src/tokens/exportTokens.ts) écrit le mode
par défaut dans `$value` et les modes nommés dans `com.ucm.modes`.
[indexerTokensDtcg](../../packages/kit/src/lecteurs/tokens-dtcg.mjs) indexe les
feuilles et leurs types ; il ne compose pas des thèmes et ne valide pas tous
les alias dans tous les contextes.

| Solution | Capacité documentée | Travail propre à UCM |
|---|---|---|
| Style Dictionary | Transformations et sorties configurables ; références conservables dans les variables CSS | Lire `com.ucm.modes`, sélectionner un contexte et imposer le nommage du kit |
| Terrazzo | Lecture de documents de résolution DTCG et génération par permutations | Convertir la projection UCM et vérifier les formats de valeurs acceptés |
| Projection CSS dédiée | Périmètre limité aux types réellement exportés | Maintenir les conversions, alias et validations que les outils précédents fournissent en partie |

Style Dictionary documente la conservation des références avec
`outputReferences`. Certains filtres peuvent toutefois remplacer des références
par leurs valeurs. Son support de DTCG `2025.10` est annoncé comme incomplet.
[Formats et alias](https://styledictionary.com/reference/hooks/formats/),
[prise en charge DTCG](https://styledictionary.com/info/dtcg/).
Terrazzo documente les résolveurs et la sélection de thèmes.
[Résolveurs et thèmes](https://terrazzo.app/docs/guides/resolvers/).

**Direction proposée.** Comparer les deux outils avec le fichier réellement
exporté. Ses couleurs hexadécimales, dimensions textuelles et tokens booléens
demandent une vérification face à la grammaire DTCG visée. Une prise en charge
du standard ne suffit pas à prouver celle de cette projection.
[Types et valeurs DTCG](https://www.designtokens.org/tr/2025.10/format/).

Le module aurait une lecture UCM, une sélection de contexte et des adaptateurs
de sortie. Il utiliserait
[tokenCssVariable](../../packages/kit/src/format/names.ts) pour le CSS. Une
collision de noms, un alias absent ou un cycle empêcherait la sortie concernée.
La sélection conserverait tous les alias nécessaires, même lorsque leurs
cibles sont extérieures au groupe demandé.

**Module et validation.** La projection accepterait un fichier de tokens sans
contrat de composant. Elle serait utilisable sans Storybook, linter ou agent.
L’essai comparerait les valeurs, noms et alias produits par les deux outils,
avec une chaîne d’alias, une virgule dans un nom, une graisse typographique et
un mode incomplet. Le coût mesuré inclurait la configuration, le build et les
transformations à maintenir.

### 2.4. Consommer les modes Figma : marques et clair/sombre

**Besoin et appui dans le code.** Clair et sombre sont des modes configurés
sur les tokens dans Figma. `buildLeaf` parcourt déjà tous les modes de chaque
collection, sans condition sur leur nom, et conserve leurs valeurs et alias
sous `com.ucm.modes`. Cette lecture générique couvre donc le principe de
clair/sombre. Les
[tests d’export](../../packages/plugin/tests/exportTokens.test.ts) éprouvent
notamment la conservation et les collisions de noms de modes.

La piste restante porte sur la consommation : choisir les valeurs du mode
demandé lors de la production des ressources. Un nouvel axe de composant ou
un moteur propre à clair/sombre n’est pas nécessaire pour cet usage.

**Solutions à comparer.** Le module de tokens pourrait produire un fichier
par mode ou regrouper les valeurs sous des sélecteurs CSS configurés par le
projet. Les projets multi-marques utiliseraient la même lecture des modes.
Si plusieurs collections doivent être sélectionnées ensemble, la configuration
du consommateur préciserait cette association.

Un document DTCG de résolution constitue une autre sortie possible pour les
outils qui le lisent. Le module `2025.10` est stable et destiné à
l’implémentation ; il décrit la sélection et la combinaison de sources selon
des contextes. Cette conversion pourrait rester dérivée au build, sans changer
l’export Figma.
[Résolution DTCG](https://www.designtokens.org/tr/2025.10/resolver/).

**Module et validation.** Cette capacité serait une option du module de
tokens. Un projet utilisant seulement le mode par défaut garderait `$value`.
L’essai partirait d’une collection réelle avec modes clair et sombre, puis
vérifierait les valeurs et les alias dans l’export et dans les ressources
produites. Il serait étendu aux marques si le projet les utilise. Seul un
écart observé justifierait une correction du moteur.

### 2.5. Adapter la sortie à d’autres plateformes et à Code Connect

**Besoin et appui dans le code.** Les
[interfaces du kit](../../packages/kit/src/lecteurs/index.mjs) sont réutilisables
par des outils Node. Le contrat reste indépendant du framework. Une sortie
native ou une passerelle Figma ne demanderait donc pas de placer du code de
plateforme dans le contrat.

**Solutions à comparer.** Pour les tokens, réutiliser les sorties de plateforme
de Style Dictionary avant de créer un générateur dédié. Les unités, polices et
alias demanderaient des essais propres à la cible.
[Formats de sortie](https://styledictionary.com/reference/hooks/formats/).
Pour Code Connect, produire des fichiers de correspondance depuis la liaison
contrat–implémentation, puis compléter les exemples applicatifs dans le projet.

Code Connect documente des templates indépendants du framework et une interface
de correspondance vers plusieurs implémentations. Son accès dépend du siège
et du plan Figma. La publication des correspondances est une opération de
service distincte de l’export des contrats.
[Code Connect](https://developers.figma.com/docs/code-connect/).

**Direction proposée.** Un adaptateur par cible, avec génération locale
inspectable et publication séparée. L’association à Figma utiliserait une
source explicite, conformément à la piste 1.3. Les noms de props convenus dans
Figma resteraient la première correspondance.

**Module et validation.** Les adaptateurs CSS, natifs et Code Connect seraient
activés indépendamment. Chaque essai couvrirait un composant réel et un
changement de prop ou de token. Une démonstration sur le web ne vaudrait pas
validation native. Le coût comprendrait le maintien des adaptateurs, les
versions prises en charge et les éventuels sièges Figma.

## 3. Contrôler les écarts et les changements

### 3.1. Étendre la parité aux cas observables

**Besoin et appui dans le code.**
[parite.mjs](../../packages/adapter-typescript/src/parite.mjs) compare déjà les
props attendues, le type des booléens, les valeurs manquantes dans les unions,
l’utilisation des booléens et enums, ainsi que les occurrences de composants
dans le JSX. Ces contrôles ne démontrent pas que chaque branche rend le bon
état. Ils ne comparent pas les valeurs par défaut du code à celles du contrat.

**Solutions à comparer.** Étendre l’analyse statique aux écritures
reconnaissables, comme une table indexée par enum ou un `switch`. Tester les
autres cas dans un navigateur. Permettre enfin de déclarer les divergences
volontaires dans le repository, avec leur règle, leur portée et leur motif.

**Direction proposée.** Choisir chaque nouveau contrôle à partir d’un défaut
réel. Distinguer une contradiction prouvée d’une expression non analysable.
Une union large ou une prop lue ne prouve pas la gestion effective de toutes
ses valeurs. Le défaut ne serait comparé que si le contrat en publie un et si
l’adaptateur reconnaît l’écriture du code.

**Module et validation.** Chaque adaptateur annoncerait ses capacités et
permettrait de sélectionner ses contrôles. Les exceptions appartiendraient à
la configuration du projet, avec détection de celles devenues inutiles.
L’essai comparerait une table, un branchement, une valeur calculée et une
exception volontaire. Le taux de constats utiles et le temps d’analyse
détermineraient la portée retenue. La politique actuelle de verdict resterait
celle de [verdict-bilan.mjs](../../packages/kit/src/lecteurs/verdict-bilan.mjs).

### 3.2. Signaler les écarts dans l’éditeur

**Besoin et appui dans le code.** Les lecteurs et l’adaptateur TypeScript
produisent des relevés que le contrôle du repository agrège. Un linter pourrait
les rendre pendant l’écriture et ajouter des contrôles sur les appels et les
styles. L’autorité des règles communes resterait dans le kit ou l’adaptateur
concerné.

| Solution | Usage documenté | Limite pour UCM |
|---|---|---|
| ESLint | Règles, positions dans le code, suggestions et corrections | Une règle doit associer le fichier au contrat et invalider son cache au réexport |
| typescript-eslint | Accès aux types dans les règles | Coût du projet TypeScript et expressions que l’analyse ne permet pas de résoudre |
| Stylelint | Règles pour les feuilles de styles | Association au composant, cascade et correspondance entre nom CSS et token |

[Règles ESLint](https://eslint.org/docs/latest/extend/custom-rules),
[règles typées](https://typescript-eslint.io/developers/custom-rules/),
[plugins Stylelint](https://stylelint.io/developer-guide/plugins/).

**Direction proposée.** Commencer par des références littérales inconnues et
des coordonnées de variants statiquement impossibles. Un contrôle des valeurs
visuelles brutes demanderait de reconnaître leur emplacement : les pixels de
grille et de positionnement autorisés par le contrat ne sont pas des défauts.
Une référence hors contrat demanderait aussi de délimiter le code partagé et
les dépendances composées.

Les suggestions automatiques seraient limitées aux remplacements non ambigus.
Deux tokens de même valeur ne permettent pas de choisir le bon rôle. Une
référence calculée serait signalée comme non analysée selon la règle du projet,
sans inventer sa valeur.

**Module et validation.** Les règles s’activeraient dans la configuration
native du linter. Un projet sans feuilles CSS n’installerait pas Stylelint.
Un projet sans analyse typée pourrait conserver les règles syntaxiques.
L’essai vérifierait les mêmes constats dans l’éditeur et en CI, puis un
réexport sans modification du code. Mesurer les faux positifs, la latence et
les exceptions avant de rendre une règle bloquante.

### 3.3. Comparer deux exports et identifier leur impact

**Besoin et appui dans le code.**
[Le diff du CLI](../../packages/cli/src/check.mjs) relève les fichiers modifiés
pour limiter le rapport. Il ne compare pas le sens des contrats. Les fonctions
`vueExacteDuVariant`, `collecterReferences` et `indexerTokensDtcg` fournissent
une base de lecture, sans calcul d’impact transitif déjà prêt.

**Solutions à comparer.** Un diff JSON montre les modifications de structure.
JSON Patch décrit des opérations sur cette structure ; il ne classe pas leurs
effets sur une API de composant.
[Spécification JSON Patch](https://www.rfc-editor.org/info/rfc6902/).
Une comparaison UCM pourrait résoudre les vues et rapprocher les coordonnées
avant d’interpréter les changements.

**Direction proposée.** Recevoir deux ensembles identifiés de contrats et de
tokens. Comparer l’API, les vues exactes, les dépendances et les valeurs de
tokens dans leurs modes. L’identité d’une partie de catalogue ne serait pas
utilisée comme identité d’un changement visuel.

| Cas à distinguer | Résultat attendu du diff |
|---|---|
| Catalogues renumérotés à contenu identique | Aucun changement sémantique |
| Prop ou valeur retirée | Rupture potentielle à vérifier dans les usages |
| Prop retirée et autre prop ajoutée | Deux faits ; renommage éventuel à confirmer |
| Valeur ajoutée | Ajout à prendre en compte, notamment dans les traitements exhaustifs |
| Alias modifié à valeur calculée identique | Dépendance modifiée, même sans différence de capture |
| Token modifié dans un seul mode | Impact limité au mode et aux consommateurs concernés |
| Composition modifiée | Occurrences et vues concernées, puis parents potentiellement touchés |
| `samples` ou métadonnées modifiés | Changement séparé des obligations de rendu |
| Versions sans lecture commune | Comparaison non réalisée, avec sa cause |

L’impact suivrait les alias et la composition dans les deux révisions,
y compris les dépendances supprimées. Un parent potentiellement touché serait
un candidat à vérifier, sans présumer qu’il doit être réécrit. Les usages
applicatifs demanderaient une analyse de code supplémentaire.

**Module et validation.** Une bibliothèque et une commande locale rendraient
un relevé structuré, avec un adaptateur de rapport facultatif. Le module
fonctionnerait sans code, sans agent et sans service GitHub. L’essai utiliserait
deux exports réels et les cas du tableau. Le temps de revue et les changements
manqués seraient comparés au diff brut avant d’adopter sa présentation.

### 3.4. Dériver des cas exécutables et des stories

**Besoin et appui dans le code.**
[variant-views.mjs](../../packages/kit/src/lecteurs/variant-views.mjs) fournit
la vue exacte de chaque combinaison. `samples` peut fournir un contenu
d’exemple. Il manque une liaison au composant exécutable et un montage propre
au projet.

**Solutions à comparer.** Conserver des stories écrites à la main et contrôler
leur couverture ; générer les cas contractuels ; ou produire un catalogue de
cas traduit par différents adaptateurs de test. La génération devient utile
si le maintien manuel de la matrice produit des oublis mesurables.

Storybook décrit ses cas en `CSF`, propose des contrôles pour les arguments et
des fonctions `play` pour les interactions. La documentation distingue `CSF 3`
et `CSF Next` en préversion. L’adaptateur devrait cibler la forme prise en charge
par le projet installé.
[Format des stories](https://storybook.js.org/docs/api/csf),
[contrôles](https://storybook.js.org/docs/essentials/controls),
[interactions](https://storybook.js.org/docs/writing-tests/interaction-testing).

**Direction proposée.** Dériver d’abord un catalogue de cas depuis les
combinaisons réellement publiées. Lui associer un montage maintenu par le
consommateur : import, données, providers, icônes et déclenchement des états.
L’adaptateur Storybook écrirait des stories qui importent le code réel.

Les identifiants dépendraient du composant et de ses coordonnées, jamais du
rang dans un tableau ou du numéro d’un catalogue. Une matrice clairsemée
n’autoriserait pas toutes les combinaisons de contrôles indépendants. Le
survol et le focus demanderaient des actions effectivement obtenues dans le
navigateur ; `stateModel` ne fournit pas nécessairement une prop à passer.

**Module et validation.** Le catalogue pourrait être utilisé sans Storybook.
L’adaptateur Storybook pourrait utiliser les ressources de tokens déjà produites
par le projet. Les stories métier seraient maintenues séparément des fichiers
régénérables. Un composant impossible à monter resterait dans le relevé des cas
non exécutés.

L’essai porterait sur une matrice clairsemée, un composé et un état interactif.
Ajouter puis retirer un variant devrait modifier seulement les cas dérivés
correspondants. Le temps économisé sur leur maintien serait comparé au coût
des montages et des migrations de Storybook.

### 3.5. Comparer les captures et vérifier le rendu contractuel

**Besoin et appui dans le code.** Les contrôles de
[controle-repository.mjs](../../packages/kit/src/lecteurs/controle-repository.mjs)
n’observent pas le navigateur. La
[recherche sur la conformité](./PLAN-CONFORMITE-RENDU.md) propose de séparer
l’observation et la comparaison au contrat.

| Option | Ce qu’elle établit | Ce qui reste à fournir |
|---|---|---|
| Chromatic | Différence avec une capture acceptée, avec revue hébergée | Référence initiale, cas exécutables, environnements et abonnement adapté |
| Playwright | Différence avec des images de référence conservées par le projet | Environnement stable, stockage des résultats et procédure de revue |
| Comparateur UCM | Écart entre une obligation et une observation mesurable | Protocole d’observation, correspondance des slots et comparaisons à développer |

Chromatic documente les modes de test et la sélection des cas affectés par le
build. Les contrats et tokens lus pendant une génération doivent être pris
en compte dans cette sélection.
[Modes Chromatic](https://www.chromatic.com/docs/modes/),
[TurboSnap](https://www.chromatic.com/docs/turbosnap/setup/).
Playwright fournit des assertions de captures et recommande de stabiliser
l’environnement de production des références.
[Comparaisons Playwright](https://playwright.dev/docs/test-snapshots).

**Direction proposée.** Essayer d’abord la régression visuelle sur des cas
réels. La référence initiale serait relue avec Figma. Un rendu inchangé après
modification du contrat peut rester incorrect : le comparateur UCM constitue
une recherche séparée.

Ce comparateur recevrait une vue résolue et une observation normalisée. Un
adaptateur de navigateur identifierait les chemins de slots, les styles
calculés, la géométrie et l’état obtenu. Des attributs de test sont une option
à éprouver avec imbrication, plusieurs racines et portals. Une référence de
token ne se déduit pas de sa couleur calculée ; cette identité demanderait un
contrôle statique ou une autre expérience d’observation.

**Module et validation.** La capture serait utilisable sur les stories
existantes ou sur des pages de test. Le comparateur pourrait recevoir une
observation sans Chromatic. Les contrôles d’interaction et d’accessibilité
resteraient activables séparément selon le comportement défini par le code.

L’essai distinguerait un changement voulu, une régression, une capture absente
et un contrat modifié sans changement de rendu. Comparer un passage ciblé au
passage intégral avant d’optimiser les cas. Le coût serait calculé à partir
des captures effectivement exécutées, des environnements et des relances,
avec le temps de revue et la maintenance des références.
[Tarification Chromatic](https://www.chromatic.com/pricing).

### 3.6. Détecter les contrats à réexaminer après une modification Figma

**Besoin et appui dans le code.** `meta.exportedAt` date l’export.
`meta.figma` identifie sa source dans la limite des données disponibles.
Le contrôle du repository ne relit pas Figma. Une date ancienne ne prouve pas
un écart, et un export récent ne prouve pas l’absence de modification ultérieure.

**Solutions à comparer.** Un rappel fondé sur l’ancienneté ; une notification
de modification du fichier ; ou un réexport permettant une comparaison
sémantique. Les deux premières options fournissent un signal de revue. Seule
la dernière permettrait de comparer les obligations effectivement publiées.

Les webhooks Figma peuvent notifier des changements de fichier. `FILE_UPDATE`
est déclenché dans les trente minutes suivant l’inactivité d’édition ; il ne
constitue pas un événement détaillé par composant. Leur installation dépend
des droits, du contexte et du plan.
[Webhooks](https://developers.figma.com/docs/rest-api/webhooks/),
[événements](https://developers.figma.com/docs/rest-api/webhooks-events/).

**Direction proposée.** Commencer par une association explicite des contrats
aux fichiers suivis. Un webhook marquerait les sources à réexaminer. Un
réexport relu pourrait ensuite établir les différences. Reproduire
l’extracteur avec l’API REST demanderait une étude distincte, car les lectures
du plugin ne sont pas automatiquement transposables.

Dans le sens code vers maquette, un changement d’API visuelle pourrait ouvrir
une demande de revue design. Une correction de comportement dans le code ne
prouverait pas que la maquette est en retard.

**Module et validation.** Le suivi de fraîcheur serait un adaptateur facultatif
nécessitant un accès Figma et, pour les webhooks, un récepteur. Le contrôle
local des contrats resterait autonome. L’essai comparerait une modification
du composant suivi et une modification ailleurs dans le même fichier. Le
nombre de demandes de revue inutiles déterminerait l’intérêt du signal.

## 4. Assister l’implémentation

### 4.1. Préparer les données utiles à une tâche

**Besoin et appui dans le code.** Les
[lecteurs publics](../../packages/kit/src/lecteurs/index.mjs) savent valider un
contrat, résoudre une vue et relever les références de tokens. Un module
pourrait réunir ces résultats avec les dépendances et les conventions du
repository. Le calcul des alias transitifs resterait à ajouter à partir de
l’index des tokens.

**Solutions à comparer.** Fournir les fichiers et une méthode de lecture ;
produire un dossier de contexte ciblé ; ou compléter ce dossier par les
manifests d’un outil existant. Une recherche sémantique pourrait retrouver des
exemples dans un grand catalogue, mais elle ne remplacerait pas la résolution
exacte des dépendances.

Storybook propose des manifests de composants et de documentation destinés
aux agents. Cette capacité est en préversion et dépend du framework. Elle
constitue une source possible pour les exemples et l’API du code.
[Manifests Storybook](https://storybook.js.org/docs/ai/manifests).

**Direction proposée.** Préparer un dossier traçable : contrat cible,
dépendances, tokens nécessaires et conventions de montage ou d’icônes. Une
tâche d’adaptation ajouterait le code existant et le diff disponible. Les
obligations contractuelles, exemples et consignes du projet seraient identifiés
séparément. Une dépendance introuvable ou une limite de contexte serait visible
dans le résultat.

**Module et validation.** Le module accepterait un chemin de contrat et une
racine de projet. Il rendrait des données lisibles par un humain ou un agent,
sans imposer de modèle, de serveur ni de catalogue Storybook. Les données
locales non commitées seraient identifiées par leurs empreintes en complément
de la révision Git.

L’essai comparerait le dossier préparé aux fichiers nécessaires à une création
et à une adaptation réelles. Mesurer les dépendances oubliées, les informations
inutiles et les lectures supplémentaires. Un contexte plus court ne serait un
gain que s’il conserve les obligations utiles à la tâche.

### 4.2. Fournir une méthode de lecture ou une interface MCP

**Besoin et appui dans le code.** La
[skill de consommation](../../.agents/skills/consommer-contrat/SKILL.md)
décrit la reconstruction jetable à froid. Les lecteurs du kit fournissent les
données et contrôles. Ces deux responsabilités pourraient être exposées aux
outils de l’équipe sans recopier les règles du format.

| Option | Usage | Coût ou limite |
|---|---|---|
| Fichiers et commandes locales | Lecture directe du repository par un agent | L’agent doit sélectionner les données et appeler les contrôles |
| Skill adaptée au projet | Méthode de travail et conventions locales | Mise à jour des instructions ; aucune donnée courante servie par elle-même |
| Adaptateur MCP UCM | Ressources ciblées et appels aux lecteurs | Processus, compatibilité client et protocole à maintenir |
| MCP Storybook ou Figma | Contexte disponible dans un outil déjà installé | Accès, capacités et provenance propres à cet outil |

MCP distingue les ressources et les outils. Sa révision courante est
`2026-07-28` selon sa documentation de versionnement. Un adaptateur devrait
annoncer la révision de protocole qu’il prend en charge, indépendamment de la
version des contrats UCM.
[Versionnement MCP](https://modelcontextprotocol.io/specification/versioning).

| Interface documentée | Application envisagée |
|---|---|
| [Ressources MCP](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) | Servir le contrat et ses dépendances à une révision identifiée |
| [Outils MCP](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | Appeler les lecteurs et contrôles du kit |

Storybook documente son propre serveur MCP et les limites de production des
manifests selon le framework. Code Connect enrichit le contexte servi par
Figma avec les implémentations associées.
[MCP Storybook](https://storybook.js.org/docs/ai/mcp/overview),
[Code Connect](https://developers.figma.com/docs/code-connect/).

**Direction proposée.** Comparer d’abord la lecture locale et les interfaces
déjà installées. Si un adaptateur UCM apporte un gain, commencer par les
ressources de contrat, les vues exactes et les contrôles en lecture. Les
réponses indiqueraient les fichiers et révisions lus. Une lecture de Figma
différente du contrat suivi serait présentée comme un désaccord à résoudre.

Une skill destinée au code maintenu serait distincte du protocole de recette
à froid : adapter un composant exige de lire son comportement existant.
Générer des instructions depuis le projet demanderait de définir leur source
et leur mise à jour, sans produire une nouvelle spécification du format.

**Module et validation.** La skill serait distribuable seule. L’adaptateur MCP
appellerait le module de contexte et les lecteurs publics ; sa désactivation
laisserait les fichiers et commandes utilisables. L’essai utiliserait deux
clients réellement employés par l’équipe, puis un réexport entre deux lectures.
Comparer les erreurs de sélection, les révisions confondues et le temps passé
à fournir le contexte avant de décider de maintenir un serveur.

### 4.3. Proposer une création ou une adaptation de code

**Besoin et appui dans le code.** Le kit fournit des contrôles, et
[l’adaptateur TypeScript](../../packages/adapter-typescript/src/index.mjs)
peut générer des types. Aucun de ces modules ne produit une implémentation
applicative. Un assistant pourrait proposer un patch à partir du contexte,
puis faire exécuter les contrôles disponibles.

**Solutions à comparer.** Utiliser l’agent déjà choisi par le projet ; appeler
un agent en ligne de commande tel que Qwen Code ; ou développer une boucle
d’outils dédiée. Qwen Code documente un mode sans interface avec sorties
structurées. Cette possibilité justifie un essai avant de maintenir une boucle
spécifique.
[Mode sans interface de Qwen Code](https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/).

Le modèle et l’exécuteur seraient deux choix séparés. Un modèle hébergé
réduirait le travail d’exploitation locale. Un modèle à poids disponibles,
comme Qwen3-Coder-Next, permettrait d’étudier un hébergement maîtrisé, avec un
coût de matériel et d’exploitation. Sa fiche ne constitue pas une mesure de
qualité sur les contrats UCM.
[Fiche Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next).

vLLM documente des appels d’outils avec des exigences propres aux modèles et
parseurs. Une compatibilité avec une API ne prouve donc pas celle de la
combinaison modèle, serveur et agent choisie.
[Appels d’outils vLLM](https://docs.vllm.ai/en/latest/features/tool_calling/).

**Direction proposée.** Une demande manuelle viserait un contrat et un
périmètre de code. L’agent travaillerait dans un espace isolé, avec une limite
de coût et de tentatives. L’exécuteur recueillerait le patch et les résultats
effectifs des contrôles. Le résumé de l’agent ne remplacerait pas ces résultats.

Une adaptation conserverait les événements et le comportement applicatif
existants. Une création laisserait explicites les décisions que le contrat ne
porte pas. Le contrôle vérifierait aussi que l’agent n’a pas affaibli les
obligations ou supprimé des tests de référence pour faire accepter sa proposition.

**Module et validation.** L’assistant fonctionnerait sur demande sans
déclenchement automatique, sans MCP et sans publication GitHub obligatoire.
Il utiliserait les contrôles configurés dans le projet et préciserait les
vérifications non exécutées. Un adaptateur de forge pourrait ensuite présenter
le résultat dans une pull request en brouillon.

Le banc d’essai comparerait les créations et adaptations avec les sources
habituelles du projet, puis avec les contrats. Plusieurs exécutions à budgets
comparables mesureraient le coût jusqu’au patch accepté, les écarts restants
et le temps de correction humaine. Une spécialisation du modèle ne serait
étudiée qu’après identification d’erreurs répétées que le contexte et les
outils ne corrigent pas, sur un jeu d’évaluation distinct des exemples appris.

## 5. Partager et automatiser

### 5.1. Produire une documentation à partir des contrats

**Besoin et appui dans le code.** Les vues, props, icônes et règles d’usage
définies dans [types.ts](../../packages/kit/src/format/types.ts) peuvent
alimenter une référence dérivée. Les lecteurs savent déjà retrouver les vues
exactes. Ils ne fournissent pas de générateur de documentation de composant.

| Solution | Intérêt | Limite |
|---|---|---|
| Markdown conservé dans Git | Consultation et revue avec le contrat | Démonstrations exécutables à relier séparément |
| Storybook Autodocs et pages complémentaires | Documentation du code avec exemples exécutables | Les obligations issues du contrat demandent une projection distincte |
| zeroheight avec Markdown synchronisé | Intégration à une documentation utilisée par les designers | Offre compatible, synchronisation et publication à vérifier sur le compte cible |

Storybook Autodocs produit des pages depuis les stories et les métadonnées du
code. zeroheight documente l’affichage de Markdown depuis un repository et
une mise à jour par son menu. Cette fonction n’est pas disponible sur les
offres Free et Starter ; le rendu utilise CommonMark sans HTML incorporé.
[Autodocs](https://storybook.js.org/docs/writing-docs/autodocs),
[Markdown dans zeroheight](https://help.zeroheight.com/hc/en-us/articles/35886857994907-Sync-markdown-files-from-your-code-repositories).

La documentation de l’API zeroheight annonce la lecture des pages et
l’écriture de leurs statuts. Elle ne suffit pas à établir une capacité
d’écriture arbitraire des pages ou de rafraîchissement automatique du Markdown.
Cette automatisation resterait à confirmer avant de la retenir.
[Périmètre de l’API](https://help.zeroheight.com/hc/en-us/articles/35887050539035-Zeroheight-API-Use-the-zeroheight-REST-API).

**Direction proposée.** Produire une référence déterministe du contrat avec
sa provenance. Présenter l’API applicative depuis le code ou sa documentation,
sans fusionner silencieusement les deux sources. Les règles métier,
l’accessibilité et les explications humaines seraient conservées à part des
blocs régénérables. `samples` resterait un exemple de maquette.

**Module et validation.** Le générateur Markdown fonctionnerait avec un contrat
sans implémentation. Les adaptateurs Storybook et zeroheight seraient
facultatifs. La publication recevrait les liens d’exemples correspondant à la
livraison documentée.

L’essai réexporterait un variant puis régénérerait sa fiche. Vérifier la
conservation des explications humaines, les liens, les tableaux et le cas d’un
composant sans code. Le temps de mise à jour et les questions encore posées
sur l’API permettraient de mesurer l’intérêt de la documentation produite.

### 5.2. Distribuer un ensemble cohérent à plusieurs repositories

**Besoin et appui dans le code.** Les versions du format, des paquets et des
adaptateurs sont distinctes selon la [politique de compatibilité](../COMPATIBILITE.md).
Les [lecteurs de versions](../../packages/kit/src/lecteurs/version-contrat.mjs)
ne décrivent pas une livraison complète de design system. Plusieurs projets
pourraient avoir besoin du même ensemble de contrats et de tokens à des
rythmes différents.

**Solutions à comparer.** Maintenir des exports dans chaque repository ;
distribuer une archive versionnée ; ou publier un paquet de données avec un
index de livraison. Le paquet faciliterait la sélection d’une version, mais
introduirait une étape d’intégration aux dossiers de composants.

**Direction proposée.** Commencer par une livraison regroupant les contrats,
les tokens et leurs empreintes. Comparer cette unité à des paquets par famille
seulement si les projets ont des cycles de mise à jour réellement distincts.
Un import contrôlé pourrait déposer les contrats à côté du code, avec leur
provenance, afin de respecter la co-localisation définie par le concept.

Lire directement les contrats dans une dépendance externe constituerait une
autre direction. Elle demanderait de revoir cette règle du concept et la
résolution des implémentations avant d’être adoptée. Aucun manifeste ne
permettrait de prétendre que le CLI actuel traite déjà ce cas.

**Module et validation.** La distribution serait facultative pour les projets
recevant leurs exports directement. Elle ne fixerait pas les modules de
contrôle installés par chaque consommateur. L’essai utiliserait deux
repositories sur deux livraisons, puis une mise à jour et un retour à la
version précédente. Vérifier que contrats et tokens restent associés et que
les modifications locales sont présentées avant tout remplacement.

Le coût à comparer serait celui des réexports, des revues de mise à jour et
du support de plusieurs versions. Les écarts de lecture resteraient jugés par
le kit installé dans chaque projet.

### 5.3. Composer les modules dans un workflow

**Besoin et appui dans le code.**
[ucm init](../../packages/cli/src/init.mjs) installe le workflow de contrôle.
[ucm check](../../packages/cli/src/check.mjs) appelle le kit et peut écrire
un rapport. Ces commandes offrent une base locale, sans orchestrateur
générique des pistes de cette étude.

**Solutions à comparer.** Des scripts propres au projet appelant les commandes
de modules ; un workflow GitHub réutilisable ; ou un orchestrateur local
associé à plusieurs adaptateurs de CI. GitHub distingue les workflows
réutilisables, composés de jobs, et les actions composites, composées
d’étapes. Le choix dépend du niveau de réutilisation nécessaire.
[Réutilisation des workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations).

**Direction proposée.** Garder les traitements dans des bibliothèques et
commandes locales. Le workflow recevrait une liste explicite de modules
activés et leurs configurations. Un module installé ne serait pas exécuté par
simple présence. Le chargement partirait du repository contrôlé, comme le fait
la découverte de l’adaptateur TypeScript.

Un protocole de résultat commun permettrait de composer les modules :

| Information proposée | Usage |
|---|---|
| Identité du projet, révision et empreintes des entrées | Vérifier que les résultats décrivent le même état |
| Version du module et de son résultat | Refuser une sortie que l’agrégateur ne sait pas interpréter |
| Capacité et périmètre exécutés | Connaître les fichiers, variants ou modes réellement contrôlés |
| Cas attendus, exécutés, exclus et impossibles | Éviter de présenter une absence d’exécution comme un succès |
| Écarts et erreurs d’exécution distincts | Séparer le défaut observé d’un contrôle qui n’a pas abouti |
| Artefacts produits et dépendances d’entrée | Retrouver les captures, le patch et les rapports à invalider |

Ce protocole serait extérieur au contrat Figma. Les modules resteraient
appelables sans agrégateur. Une dépendance désactivée demanderait soit une
entrée équivalente fournie par le projet, soit un résultat non exécuté
expliquant ce qui manque. Elle ne serait pas réactivée implicitement.

| Déclenchement possible | Modules utiles | Décision humaine |
|---|---|---|
| Export proposé | Validation et diff | Accepter l’intention de design déposée |
| Demande d’adaptation | Contexte et assistant facultatif | Relire le patch et les comportements |
| Modification du code | Parité, lint et tests configurés | Relire le code et les effets visuels |
| Nouvelle révision | Invalidation et nouvelle exécution des modules concernés | Relire les résultats qui ont changé |
| Livraison retenue | Ressources et documentation dérivées | Autoriser la publication selon les règles du projet |

Le [plugin](../../packages/plugin/src/github.ts) publie un artefact par pull
request. Le workflow ne présumerait donc pas que contrat et nouveaux tokens
arrivent ensemble. Un contrat pourrait aussi précéder le code. L’état proposé
du repository déterminerait les modules exécutables.

**Exécution et publication.** Les contrôles de code seraient séparés des
opérations disposant des droits de publication. Un résultat ancien ne serait
pas publié après celui d’une révision plus récente. Une relance sur les mêmes
entrées ne créerait pas une nouvelle proposition identique.

Le choix de l’identité GitHub influe sur les déclenchements. La documentation
décrit notamment des exceptions pour les événements dispatch et des exécutions
de pull request soumises à approbation lorsqu’elles proviennent de
`GITHUB_TOKEN`. Ce parcours devrait être testé avec l’identité retenue.
[Déclenchement des workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Le [jeton local du plugin](../../packages/plugin/src/config.ts) pourrait
rester adapté à certains projets. Une organisation pourrait préférer une
GitHub App pour l’automatisation ou un intermédiaire imposé par sa politique.
Cette décision porterait sur l’authentification et l’exploitation du service ;
les lecteurs locaux n’en dépendraient pas.

**Module et validation.** Commencer par un workflow appelant deux modules,
puis vérifier la même exécution depuis les commandes locales. L’essai
couvrirait un module désactivé, une panne, un nouveau réexport pendant
l’exécution et une reprise après correction humaine. La portabilité serait
éprouvée depuis un deuxième repository avec une sélection de modules différente.

### 5.4. Comparer les modules développés aux plateformes existantes

**Besoin et appui dans le code.** Les lecteurs UCM sont utilisables sans
service. Avant d’ajouter des adaptateurs de publication ou de contexte, une
équipe pourrait comparer leur coût à une plateforme déjà disponible chez elle.
L’évaluation porterait sur des fonctions précises : tokens, documentation,
exemples, contexte agent et revue.

| Solution | Capacité documentée par l’éditeur | Question à éprouver avec UCM |
|---|---|---|
| Supernova | Exportateurs configurables, automatisation et accès aux données depuis ses outils de développement | Quelle donnée peut être exportée et consommée localement, avec quelle identité de version ? |
| zeroheight | Documentation et Markdown synchronisé depuis Git | Quel gain apporte l’adaptateur par rapport à la documentation déjà maintenue ? |
| Knapsack | Import de tokens et moteur de transformation ; intégration du design et du code | Comment réutiliser les contrats suivis et les montages du projet sans double maintenance ? |
| Storybook avec services de revue choisis | Exemples exécutables, documentation du code et contexte agent selon la stack | Quelle part du besoin reste spécifique au contrat UCM ? |

[Outils de développement Supernova](https://developers.supernova.io/),
[exportateurs Supernova](https://learn.supernova.io/latest/automation/exporters/using-exporters-IWuf5DLV),
[tokens Knapsack](https://docs.knapsack.cloud/design-tokens),
[documentation Knapsack](https://docs.knapsack.cloud/).
Les capacités zeroheight et Storybook sont précisées dans les pistes 5.1 et 4.2.

**Direction proposée.** Choisir une plateforme selon l’équipement réel de
l’équipe et la comparer sur un composant simple, un composé et un changement
de token. Vérifier les vues exactes, les modes, les alias et la provenance des
données effectivement accessibles. Une déclaration commerciale de prise en
charge des design systems ne prouve pas la lecture du format UCM.

**Module et validation.** Une plateforme pourrait remplacer un adaptateur ou
une fonction de publication. Son adoption ne rendrait pas les autres modules
obligatoires. L’essai comprendrait une sortie du service : récupérer les
artefacts et vérifier ce qui reste lisible et exécutable sans connexion.
L’accès hors ligne ne serait ni supposé impossible ni annoncé sans cet essai.

Comparer le coût total : sièges, quotas, intégration, exploitation, maintenance
et réversibilité. Les offres Supernova distinguent notamment sièges,
consommateurs MCP et crédits d’automatisation ; une comparaison par siège seul
serait incomplète.
[Offres Supernova](https://www.supernova.io/pricing).
Les tarifs et droits seraient consignés pour le scénario testé avant de choisir
un abonnement. Une capacité non établie resterait à vérifier, sans conclure à
l’absence de solution sur le marché.

## 6. Choisir les expérimentations

### 6.1. Vérifier l’indépendance des modules

Le [kit](../../packages/kit/src/lecteurs/index.mjs) et les
[tests de recette du CLI](../../packages/cli/tests/recette.test.mjs)
fournissent une base pour éprouver des installations dans des repositories
séparés. Les limites de données propres à chaque piste détermineraient les
combinaisons possibles.

| Module proposé | Entrée minimale | Utilisable sans | Effet de la désactivation |
|---|---|---|---|
| Projection de tokens | Fichier de tokens et configuration de sortie | Contrats de composants, navigateur, agent | Le projet fournit ses ressources existantes |
| Liaison au code et aux icônes | Contrats et associations du projet | Storybook, plateforme documentaire | La validation du format reste possible |
| Parité et lint | Sources, contrats et adaptateur de langage | Captures, assistant | Le rapport ne conclut pas sur les contrôles retirés |
| Diff | Deux révisions lisibles de contrats ou de tokens | Implémentation, Figma, modèle | La revue utilise le diff de fichiers |
| Cas dérivés | Contrats ; montage pour les exécuter | Service de capture | Le projet peut conserver ses cas écrits à la main |
| Capture et revue | Cas exécutables et références | Générateur UCM, MCP | Aucune conclusion sur la régression visuelle |
| Conformité du rendu | Vue exacte et observation | Chromatic, générateur de stories | Les autres contrôles gardent leur périmètre |
| Contexte | Contrat, dépendances et conventions du projet | Agent, MCP, accès Figma | Lecture directe des fichiers |
| MCP | Lecteurs et données du projet | Assistant UCM, publication | Fichiers et commandes toujours utilisables |
| Assistant | Demande, contexte et exécuteur | MCP, orchestration automatique | Implémentation par les moyens habituels du projet |
| Documentation | Contrats ; code et stories facultatifs | zeroheight, assistant | Documentation humaine conservée |
| Suivi des sources Figma | Association aux fichiers et accès autorisé | Génération de code | Aucune conclusion sur la fraîcheur de la maquette |
| Distribution | Ensemble identifié de contrats et tokens | Tous les modules applicatifs | Exports directs dans chaque repository |
| Orchestration | Modules explicitement activés et leurs entrées | Fournisseur IA ou documentation particulier | Exécution indépendante des commandes |

Un essai d’indépendance installerait le module seul, puis avec un autre module.
Il serait ensuite désactivé en restant installé. Vérifier l’absence d’appel à
son service, l’état des sorties dérivées et le maintien des fonctions encore
activées. Des résultats conservés sur disque ne seraient pas réutilisés comme
des résultats courants après un changement de configuration.

### 6.2. Choisir un essai selon le besoin observé

Les essais ci-dessous peuvent être engagés séparément. Ils ne constituent pas
un ordre de construction imposé. La [recette externe](../RECETTE.md) reste
le protocole de validation du produit existant.

| Besoin observé | Premier essai | Décision rendue possible |
|---|---|---|
| Les valeurs des modes restent inutilisées | Export clair/sombre réel, puis ressources par mode ; marques si utilisées | Correction éventuelle de l’export ou travail limité à la projection |
| Une propriété visuelle manque au rendu | Extension uniforme sur un composant réel | Ajouter le champ, ou conserver un diagnostic si la traduction reste ambiguë |
| La revue d’un export manque des changements | Diff sémantique comparé au diff brut | Délimiter les changements qui méritent un rapport spécifique |
| Les variants sont mal couverts par les exemples | Stories manuelles comparées aux cas dérivés | Choisir la génération, le contrôle de couverture ou les deux |
| Des régressions visuelles passent en revue | Captures Playwright ou Chromatic sur les mêmes cas | Choisir l’hébergement et la procédure d’acceptation |
| Le code reste incorrect malgré des captures stables | Comparateur ciblé sur une propriété observable | Déterminer si le protocole d’observation apporte une preuve utile |
| L’agent cherche ou invente des informations | Lecture locale comparée au contexte préparé et aux interfaces existantes | Retenir les données à préparer avant de développer un serveur ou un assistant |
| La documentation n’est pas mise à jour | Fiche dérivée et lien vers les exemples de la même livraison | Choisir le support de publication et mesurer le travail restant |
| Plusieurs projets réutilisent le même design system | Deux repositories, versions et modules différents | Choisir la distribution et identifier les dépendances cachées |
| Une maquette ou un contrat est souvent oublié | Notification de fichier comparée au réexport | Déterminer si le suivi réduit les oublis sans multiplier les faux signaux |

Pour une automatisation d’adaptation, commencer par le contexte et les contrôles
déjà disponibles. Une exécution automatique après export demanderait ensuite
un essai de reprise, d’invalidation et de publication. Le développement d’un
orchestrateur complet ne serait pas un préalable à l’essai d’un linter ou d’une
projection de tokens.

### 6.3. Mesurer le résultat et décider de poursuivre

Chaque essai aurait un besoin nommé, un responsable, un corpus et un budget.
Le résultat consignerait les versions des outils, les entrées exactes et les
cas exécutés. Une recherche documentaire établirait les possibilités ;
l’installation et l’exécution dans le projet établiraient la compatibilité.

| Mesure | Comparaison utile | Motif de réexamen |
|---|---|---|
| Temps d’installation et de mise à jour | Module seul puis combinaison, dans deux projets | L’installation impose les outils des autres modules |
| Temps jusqu’au résultat accepté | Pratique habituelle puis module, correction humaine comprise | Le temps économisé est absorbé par la configuration ou la revue |
| Défauts détectés et faux positifs | Cas connus, défauts introduits et changements légitimes | Les exceptions ou alertes inutiles dépassent les constats utiles |
| Couverture effective | Cas attendus, exécutés et impossibles | Des cas manquants sont présentés comme vérifiés |
| Coût d’exploitation | Calcul, stockage, abonnements et relances | Le volume réel dépasse le budget convenu |
| Maintien et retrait du module | Montée de version puis désactivation | Les sorties ou dépendances empêchent de revenir au workflow précédent |

Les seuils seraient fixés avant chaque essai selon le projet. Les gains sur un
composant serviraient à décider d’un essai plus large ; ils ne suffiraient pas
à annoncer un bénéfice pour toute une équipe. Une piste serait poursuivie si
elle traite le besoin observé, respecte les responsabilités du concept et reste
utilisable dans le périmètre de modules choisi par chaque consommateur.
