# Modes et aides à l'implémentation : analyse critique et proposition

Cette note examine [le plan courant](PLAN-MODES-TOKENS.md) à partir des besoins
du concepteur. Elle propose des corrections à valider avant implémentation.
Elle ne remplace ni les spécifications du produit ni le plan en cours de revue.
Le [plan alternatif](PLAN-MODES-TOKENS-ALTERNATIF.md) est aussi comparé.

La version examinée du plan courant a pour empreinte SHA256
`928AA2D4F24A2ED31DE0FDD138A3F139F3390B03B75313D3C9330AC7BD2AC77E`.
Les références de section ci-dessous désignent cette version. Les constats de
code viennent des fichiers locaux ; les conclusions sur le futur générateur
restent des analyses, sans exécution de son harnais dans cette revue.

## 1. Évaluation par besoin

Le plan répond bien à l'accès aux aides et à leur personnalisation. Sa réponse
aux modes multiples est plausible, mais plusieurs cas ne sont pas encore assez
définis pour engager l'implémentation. Sa promesse d'installation dans tout
repository dépasse la livraison web réellement décrite.

| Besoin | Réponse actuelle | Évaluation |
|---|---|---|
| Conserver les modes | `tokens.json` et un résolveur associé | Choix défendable ; deux représentations des valeurs à synchroniser |
| Beaucoup de modes imbriqués | Axes, alias, collections étendues, CSS par portée | Algorithme précis ; preuve navigateur et mesure de volume encore nécessaires |
| Règles concrètes personnalisables | Sens UCM et écriture locale dans les conventions | Bonne séparation ; conflits et limites des contrôles à préciser |
| Guide économe pour les agents | Relais court et `ucm guide` ciblé | Bonne direction ; sortie encore potentiellement volumineuse |
| Préférences de stack | En-tête libre dans les conventions | Simple pour un projet ; sélection par paquet nécessaire dans un monorepo |
| Architecture homogène | Gabarit fourni par l'adaptateur | Exemple utile ; aucun contrôle actuel ne prouve cette homogénéité |
| Mise en place partout | `ucm init --agents` | Installation des aides décrite ; installation des modes et choix techniques encore manuels |

## 2. Trois mécanismes à distinguer

Une marque, un thème et une densité sont trois choix indépendants. Un composant
peut utiliser « Intencial + sombre + compact ». Chaque choix doit garder sa
valeur lorsque l'on change un autre choix.

L'héritage d'une marque est un autre mécanisme : une filiale reprend les tokens
du groupe, puis change quelques couleurs. Une collection étendue Figma représente
ce cas. Il faut déterminer ses valeurs effectives avant de générer les styles.

L'imbrication dans l'interface décrit enfin la portée de ces choix :

```text
Page : marque Groupe, thème clair
  Espace client : marque Filiale
    Carte : thème sombre
      Formulaire : densité compacte
      Encadré : thème clair
```

Le formulaire doit garder la marque Filiale. L'encadré doit retrouver le clair
sans reprendre la marque Groupe. Une collection appelée `Couleurs/Marque` ne
crée pas, par son nom, l'une de ces portées.

Avec 500 marques, deux thèmes, trois densités et deux préférences de mouvement,
il existe 6 000 contextes. Cela n'impose pas 6 000 fichiers. Mais si chaque
contexte contient une décision différente, l'export doit bien conserver ces
décisions. La factorisation économise les répétitions ; elle ne supprime pas
l'information distincte.

## 3. Corrections nécessaires

### 3.1. Le standard autorise des recouvrements entre axes

Les sections 7.1 et 7.3 attribuent trop de contraintes au Resolver DTCG.
Le standard autorise plusieurs modifiers à définir la même feuille. L'ordre de
résolution tranche alors. Il interdit les références de structure entre
modifiers ; cela ne signifie pas qu'un alias de token ne puisse traverser
leurs valeurs. Il précise aussi la base relative des références de fichier.
Voir [Resolver, orthogonalité et références](https://www.designtokens.org/tr/2025.10/resolver/).

**Correction proposée :** présenter l'orthogonalité comme le profil choisi par
UCM pour simplifier son CSS. Les jetons synthétiques servent ce profil. Leur
nécessité ne découle pas du seul choix DTCG. Le chargement local des sources
reste une capacité explicite du lecteur.

### 3.2. La compatibilité des jetons synthétiques doit préciser ses comparaisons

La section 7.2 compare les valeurs résolues. Cela traite le cas de 7.3 où
`color.bg` devient un alias synthétique, alors que sa valeur d'origine est
blanche. Le jeton synthétique n'existe toutefois pas dans le fichier annoncé
inchangé. La comparaison doit préciser qu'elle porte sur les chemins publics
communs ; elle ne peut exiger deux documents identiques.

Une égalité après résolution peut préserver le rendu, mais elle ne prouve pas
la conservation des alias. La base CSS doit aussi inclure les feuilles ajoutées
par le résolveur, sous peine de citer une variable non déclarée.

**Correction proposée :** séparer deux comparaisons. Pour les feuilles
ordinaires dupliquées, comparer les expressions et les types, dans chaque mode.
Pour une feuille transformée par la projection d'une extension, comparer les
valeurs résolues et les types dans le contexte par défaut. Conserver la trace
interne de la transformation pour expliquer les alias synthétiques. Construire
la base CSS depuis le contexte par défaut fusionné, avant résolution des alias.

Un ancien lecteur doit encore rendre les chemins publics dans leur contexte
par défaut. Il n'acquiert pas, par cette compatibilité, le support des marques
étendues.

### 3.3. Le contrôle de la paire de fichiers doit couvrir tous les modes

La section 8 vérifie seulement l'accord du contexte par défaut avec `$value`.
Un `marque-2` périmé dans le résolveur pourrait donc passer, malgré une nouvelle
valeur dans `com.ucm.modes`. Une pull request commune réduit ce risque lors de
l'export ; elle ne couvre pas une modification manuelle ou un cherry-pick.

**Correction proposée :** comparer chaque valeur ordinaire dupliquée, le jeu
des modes et le propriétaire déclaré. Ajouter un cas de divergence dans un
mode non défaut. La version du standard décrit une grammaire ; elle ne prouve
pas que deux fichiers proviennent du même export.

### 3.4. Un axe perdu ne doit pas devenir un succès en mode par défaut

La section 7.4 écarte certains axes mais garde leurs valeurs dans
`com.ucm.modes`. Les sections 8 et 10 autorisent ensuite une base seule, code 0,
quand le résolveur manque. Si tous les axes ont été écartés, le consommateur
peut recevoir un CSS valide qui ignore les modes attendus.

**Correction proposée :** distinguer un fichier réellement sans mode, un ancien
export sans déclaration d'axes et un export incomplet. Des valeurs à modes
sans propriétaire exploitable bloquent la génération multimode. Une génération
du défaut seul reste une demande explicite, signalée comme telle. Avec un
résolveur partiel, vérifier aussi les feuilles qu'aucun modifier ne couvre.

La section 10.1 accepte aussi un fichier de tokens absent et écrit un CSS vide
avec un code de succès pour faciliter la recette. Ce cas doit être réservé à
une initialisation sans référence à satisfaire, ou à une demande explicite.
Si les contrats réclament des tokens, leur source manquante doit faire échouer
le build.

### 3.5. La preuve Enterprise ne peut pas se limiter à une simulation

Figma expose les modes hérités avec `parentModeId`. La lecture des valeurs
d'une collection étendue conserve les alias et renvoie les valeurs héritées ou
surchargées. Ces points viennent des documentations
[ExtendedVariableCollection](https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/)
et [Variable](https://developers.figma.com/docs/plugins/api/Variable/).

Les sections 7.3 et 18 acceptent une simulation comme condition de clôture.
Elle prouve que le code suit l'API simulée. Elle ne vérifie pas la correspondance
des identifiants, la disponibilité des bibliothèques ou les alias en situation.

La section 7.3 décrit la remontée de `parentModeId` et exclut les parentes
distantes sous constat. Cette restriction concerne directement une organisation
qui publie les fondations du groupe dans une bibliothèque.

**Correction proposée :** éprouver la normalisation des identifiants jusqu'à
la collection racine et annoncer la limite des parentes distantes. La recette
doit couvrir trois
générations, une surcharge partielle, un alias hérité et une cible issue d'une
autre collection. Sans fichier Enterprise réel, publier ce support comme
expérimental, avec sa limite annoncée. Ne pas annoncer un nombre illimité de
marques : l'absence de borne de modes sur cet axe ne borne ni le fichier ni le
coût de l'export.

### 3.6. Les modes qui changent le texte ou la visibilité ne sont pas du CSS de couleur

La section 13 relève les modes fixés et les variables liées à `characters` ou
`visible`, mais leur traitement arrive après la recette générale. Un booléen
écrit dans une variable CSS ne pilote pas, à lui seul, la présence d'un élément.
Une chaîne CSS ne remplace pas automatiquement un texte du composant.

Le problème existe aussi lorsqu'un mode est hérité de l'application. Il n'est
pas limité aux calques qui fixent un mode explicitement.

**Correction proposée :** dès le premier lot d'export, repérer les liaisons ou
obligations normatives perdues à cause d'un mode. Produire un diagnostic et une
couverture partielle pour ces pertes, selon les règles du produit. Distinguer
ces pertes du contenu indicatif : un texte d'échantillon traduit ne devient pas
une exigence contractuelle. Une valeur d'exemple de prop et une règle normative
de présence d'un calque n'ont pas non plus le même statut. Éprouver ces cas
voisins avant de décider d'un nouveau champ. Un bandeau toujours sombre
dans une carte claire est un cas distinct à éprouver : son mode interne ne
doit pas disparaître dans un export annoncé fidèle.

### 3.7. Le volume des tests ne couvre pas encore le besoin exprimé

L0 mesure 20 marques et deux thèmes. Ce volume éprouve une collection bornée,
pas plusieurs centaines de marques héritées. Le coût des jetons synthétiques
peut croître avec le nombre de marques, les modes de la parente et les feuilles
surchargées.

La détection des cycles demande aussi une règle précise. Exemple avec un seul
axe : en clair, `x` cite `y` et `y` vaut 1 ; en sombre, `y` cite `x` et `x`
vaut 2. L'union des alias contient un cycle, mais aucun contexte n'en contient.
Rejeter l'union serait un faux refus. Énumérer tous les contextes peut coûter
leur produit.

**Correction proposée :** mesurer séparément export, analyse des cycles,
génération, taille du CSS et recalcul navigateur. Prévoir un plafond explicite
pour une validation qui ne peut conclure dans le budget ; ne jamais convertir
une recherche interrompue en succès. Documenter cette limite avant de promettre
un nombre de modes pris en charge.

### 3.8. Deux collections synchronisées forment un choix applicatif

La section 9 partage un attribut entre deux axes si leurs listes de modes sont
égales. C'est insuffisant pour définir le défaut commun. Deux listes
`light/dark` peuvent avoir des défauts différents. Le nombre de contextes
atteignables change aussi : deux collections synchronisées ne forment pas deux
choix indépendants dans l'application.

**Correction proposée :** pour obtenir un défaut applicatif unique, exiger les
mêmes modes et le même défaut pour ce raccourci. C'est une restriction de
simplicité choisie : conserver les défauts individuels jusqu'à la première
sélection explicite serait aussi techniquement déterministe. Le refus doit
indiquer les défauts à harmoniser. Compter les contextes de recette après
synchronisation, tout en validant les autres contextes autorisés par le
résolveur publié. Si les noms
diffèrent, ajouter seulement sur besoin une correspondance explicite, par
exemple `sombre` vers `dark`. Ne pas déduire cette relation du nom des collections.

### 3.9. La personnalisation ne constitue pas un contrôle de conformité

La séparation du sens et de l'écriture en 14.1 est utile. La section 14.9
précise les limites de la parité pour les gabarits. La formulation générale de
14.5 sur la vérification du sens reste cependant plus large que le code actuel.
[`parite.mjs`](../../packages/adapter-typescript/src/parite.mjs) examine les
props et la composition. Il ne vérifie ni `outline`, ni l'ordre des fichiers,
ni le style d'architecture. Les lois du contrat jugent le contrat exporté.

**Correction proposée :** chaque aide indique une preuve attendue : contrôle
UCM existant, commande locale, comparaison visuelle ou relecture. Un sens
imprimé avant une écriture contradictoire reste une contradiction. L'agent doit
la signaler avant d'implémenter la partie concernée. Il ne faut pas promettre
qu'un lecteur de Markdown détectera toutes ces contradictions.

### 3.10. La correction de `ring` demande un classement de compatibilité

[`semantics.ts`](../../packages/plugin/src/contract/semantics.ts) publie
`outline-color` et `outline-width`, avec `box-shadow` en repli. Ajouter une
déclaration fixe de style peut corriger le rendu. Mais une classe nouvelle
annonçant une version mineure ne suffit pas à justifier cette compatibilité.
La [politique actuelle](../COMPATIBILITE.md) classe en majeure un ajout ignoré
par un ancien lecteur lorsque son rendu devient faux.

**Correction proposée :** appliquer le test du lecteur précédent. Si un champ
nouveau porte une obligation indispensable au rendu, suivre cette politique.
Si seule l'aide explicite une technique déjà permise, étudier une correction
des aides sans changer le format. Décider à partir du schéma et des lecteurs,
sans réserver d'avance un numéro de classe ou de version.

Le catalogue doit aussi préciser comment cumuler un contour et une ombre,
plutôt qu'écraser l'un des deux dans `box-shadow`. En couleurs forcées,
`box-shadow` disparaît : reporter entièrement ce cas contredit l'objectif de
bonnes pratiques d'implémentation. Voir
[CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties).
La recette doit éprouver un contour et un focus perceptibles dans ce mode,
avec une adaptation documentée qui conserve la géométrie autant que possible.

### 3.11. Le guide risque de réimprimer presque tout le contrat

La sélection par caractéristique de 14.5 retire les aides inutiles. Elle ne
réduit pas nécessairement l'extraction : un composant complexe utilise presque
tous ses variants, vues et catalogues. Les conventions sont aussi annoncées
en entier au premier point, puis filtrées ailleurs. Le `SKILL.md` imprimé
commence lui-même par demander de lancer `ucm guide`.

**Correction proposée :** imprimer uniquement l'en-tête utile et les sections
sélectionnées des conventions, une seule fois. Séparer le relais d'appel de la
procédure rendue par `guide`, pour éviter un nouvel appel récursif. Garder une
sortie complète au premier lot ; ajouter une lecture ciblée quand les mesures
montrent son intérêt, sans supprimer silencieusement des obligations.

Mesurer le coût total d'une implémentation correcte, dont les corrections et
les sorties d'outils. Les octets du guide ne sont pas les tokens facturés. Le
cache, les tarifs et le comportement du modèle influencent le coût ; ne pas
déduire une économie d'une simple multiplication du contexte par les tours.

### 3.12. L'installation ne réalise pas encore toute la mise en place annoncée

La section 15 demande une dépendance, un script de build, un import, de la
configuration et des conventions. `init --agents` n'en réalise qu'une partie.
Le gabarit dépend en plus d'un adaptateur de parité, alors qu'un projet peut
vouloir un exemple de stack sans contrôle TypeScript.

**Correction proposée :** une commande d'entrée diagnostique la mise en place,
crée les ressources absentes et imprime les modifications restantes avec leurs
chemins exacts. Un preset de stack peut contenir des conventions, des exemples
et une recette de build. L'adaptateur de parité reste facultatif. Une seule
version installée de la CLI doit guider l'exécution ; les relais utilisent
cette installation locale lorsque l'agent sait la lancer.

### 3.13. Un résolveur standard ne normalise pas les types de ses sources

Le [test de conformité actuel](../../packages/plugin/tests/conformiteDtcg.test.ts)
énumère le dialecte UCM : des feuilles `string`, `boolean` et des valeurs
`null` ne passent pas le schéma DTCG. Le
[schéma Resolver publié](https://www.designtokens.org/schemas/2025.10/resolver.json)
embarque aussi la validation des tokens. La section 7.2 écarte ces feuilles des
modifiers sous constat, mais elles restent dans `tokens.json`, cité comme
source. Valider la référence externe ne valide pas son contenu. L'exclusion
des modifiers retire en outre ces modes de la génération annoncée.

**Correction proposée :** séparer la conformité de la structure du résolveur,
celle de ses sources et la lecture par un outil tiers. Au premier lot, conserver
le dialecte UCM explicitement décrit et tester l'échange sur le sous-ensemble
standard. Refuser la génération multimode lorsqu'une obligation dépend d'une
feuille exclue ; les aides ne doivent pas annoncer ce mode disponible. Ne pas
annoncer une conformité intégrale. Une migration des types
demande une décision de format séparée ; retirer ou convertir silencieusement
les feuilles pour passer le schéma ferait perdre des informations.

## 4. Solutions comparées, besoin par besoin

### 4.1. Ranger les modes dans les fichiers de tokens

| Solution | Exemple concret | Intérêt | Coût ou limite |
|---|---|---|---|
| Extension UCM dans un seul `tokens.json` | Chaque token garde ses modes ; une table décrit axes et défauts | Modification la plus courte de l'export actuel | Les autres outils ignorent la signification UCM des modes |
| `tokens.json` et Resolver DTCG, choix du plan | Les valeurs courantes restent lisibles ; le fichier associé décrit les choix | Migration progressive et échange selon une spécification publique | Valeurs dupliquées, cohérence de deux fichiers à vérifier |
| Un Resolver autonome avec sources embarquées | Tout le jeu tient dans un fichier | Transport en un seul fichier | Migration des lecteurs ; conformité standard conditionnée aux types de feuilles |
| Sources par axe ou par marque, puis Resolver | `theme/light.json`, `theme/dark.json`, `brand/filiale.json` | Diff facile à relire sur une marque | Gestion de plusieurs fichiers et retraits d'anciennes sources |

Un fichier par axe ou marque ne signifie pas un fichier par combinaison.
Écarter cette solution au motif de 6 000 contextes serait excessif.

**Recommandation :** conserver la paire du plan pour la transition, avec une
autorité d'export commune et les contrôles de 3.2 à 3.4. Si « un fichier »
signifie une contrainte stricte de transport, préférer un Resolver embarqué
après migration. L'extension UCM reste une solution raisonnable pour un produit
centré sur ses propres lecteurs ; sa migration future n'est pas inévitable.

### 4.2. Gérer beaucoup de modes et leur imbrication

| Solution | Exemple concret | Intérêt | Coût ou limite |
|---|---|---|---|
| CSS factorisé par axes et portées, choix du plan | `data-brand="filiale"` autour d'une carte `data-theme="dark"` | Changement local sans bibliothèque applicative UCM | Preuve de cascade, recalcul des alias et compatibilité navigateur |
| Recalculer toutes les expressions à chaque frontière | Chaque conteneur de thème reçoit les déclarations nécessaires, avec le contexte complet | Référence de comparaison plus simple | Plus de CSS ; l'application doit connaître le contexte effectif |
| Fixer la marque au build, garder les thèmes dynamiques | Le site Filiale charge seulement ses tokens ; clair/sombre reste local | Réduit les données chargées par chaque site | Ne suffit pas à une page comparant plusieurs marques |
| Charger les styles des marques utilisées | La page charge Groupe puis Filiale à l'ouverture de son espace | Intéressant pour des centaines de marques | Chargement, rendu serveur et flash de mauvais thème à traiter |
| Provider applicatif qui propage les choix | Un provider connaît marque et thème, y compris pour une modale déplacée | Contrôle explicite des portails et des plateformes sans CSS | Code propre à la stack, maintenance et coût au runtime |
| Générateur tiers configuré par UCM | UCM prépare les données ; un outil existant produit les styles | Réutilise des conversions de types et des sorties de plateforme | Son support des contextes ne prouve pas l'imbrication arbitraire |

Terrazzo documente la génération CSS depuis un Resolver et les précautions
liées aux sélecteurs et aux tokens dépendants. C'est un candidat réel pour un
prototype comparatif, sans preuve suffisante qu'il couvre le besoin UCM.
Voir [Terrazzo CSS](https://terrazzo.app/docs/integrations/css/).
Style Dictionary propose la conservation des références dans ses formats ;
cela ne règle pas à elle seule l'héritage local des alias.
Voir [formats Style Dictionary](https://styledictionary.com/reference/hooks/formats/predefined/).

**Recommandation :** garder le générateur factorisé comme candidat principal.
Comparer son coût à la fixation de marque au build et à un générateur tiers
sur le même corpus. Conserver la génération de tous les modes pour une galerie
multimarque. Proposer une sélection de marques lorsque le volume mesuré le
justifie ; ne jamais dégrader silencieusement une page multimarque en site
monomarque.

Pour une modale déplacée sous `body`, le consommateur doit fournir un conteneur
de portail dans la bonne portée ou reporter les choix effectifs sur la racine
de la modale. Les changements ultérieurs de marque ou de thème doivent aussi
l'atteindre. Cette intégration appartient à l'application ; la génération CSS
ne relie pas automatiquement deux branches distinctes du document.

Sur le web, les attributs eux-mêmes ne s'héritent pas. Ce sont les valeurs des
propriétés CSS qui s'héritent. Les alias se calculent sur l'élément où ils sont
déclarés ; le générateur doit donc redéclarer les tokens dépendants à une
frontière de mode. C'est la raison du « cône » du plan.
Voir [CSS Custom Properties](https://www.w3.org/TR/css-variables-1/#using-variables).

### 4.3. Donner des règles concrètes et faciles à personnaliser

| Solution | Geste de personnalisation | Intérêt | Limite |
|---|---|---|---|
| Sens UCM et section Markdown locale, choix du plan | Écrire `## contour-ring` et nommer la classe à employer | Compréhensible, diff court, aucun fork | Contradictions en prose difficiles à détecter |
| Fiches de règles structurées | Choisir un identifiant de stratégie de contour et un fichier de styles | Validation des choix connus, édition guidée possible | Schéma et catalogue à maintenir ; moins libre |
| Fonctions ou classes partagées du projet | Modifier une classe de contour utilisée par tous les composants | Une modification agit sur le code existant | Dépend de la stack ; sa géométrie doit être testée |
| Copier toute la skill dans chaque repository | Modifier directement toutes les instructions | Liberté immédiate | Mises à jour difficiles et nombreuses copies divergentes |

Exemple : le sens impose un contour qui ne déplace pas le contenu. Le projet
utilise sa classe `.contour` pour produire l'ombre intérieure appropriée. La
convention dit à l'agent où la trouver. Modifier cette convention influence les
prochaines implémentations ; modifier la classe influence les composants qui
l'utilisent déjà. Ce sont deux effets différents à expliquer à la personne.

**Recommandation :** Markdown local et classes ou fonctions partagées quand le
projet en a. Ajouter des contrôles ciblés sur les obligations coûteuses à
relire. Garder les paramètres structurés pour les choix que la CLI doit
réellement interpréter.

### 4.4. Fournir une skill efficace et peu coûteuse

| Solution | Travail de l'agent | Intérêt | Limite |
|---|---|---|---|
| Manuel complet chargé au départ | Lire toutes les règles avant de coder | Simple à distribuer | Beaucoup de contenu inutile pour un composant court |
| Relais court et guide par contrat, choix du plan | Une commande donne données et aides pertinentes | Réduit les recherches et les extractions improvisées | Sortie longue sur un composant complexe |
| Guide avec index et sections à la demande | Charger d'abord le composant, puis la typographie ou une vue précise | Intéressant pour une correction locale | Davantage d'appels ; risque d'oublier une section obligatoire |
| Génération déterministe des parties répétitives | Générer les unions et le squelette, puis compléter le comportement | Évite de faire retranscrire des données par le modèle | Outillage et maintenance ; hors protocole actuel de recette froide |
| Service de contexte pour les agents | L'agent interroge une API au lieu de la CLI | Intégration possible à plusieurs outils | Service à installer ; gain à établir face à la commande locale |

Le format Agent Skills prévoit déjà des ressources chargées à la demande.
Cela justifie la séparation du relais, des aides et des exemples, sans garantir
un gain pour chaque tâche. Voir
[Agent Skills, chargement progressif](https://agentskills.io/specification).

**Recommandation :** livrer d'abord le guide ciblé avec les renvois partagés
conservés. Comparer ensuite une sortie complète et une lecture par section sur
une création, une correction locale et un composant composé. Mesurer les
tokens réellement consommés jusqu'à un résultat accepté, la durée, les erreurs
visuelles et les interventions humaines. Garder des sessions séparées et le
même outillage pour comparer les conditions.

### 4.5. Personnaliser la stack et les bonnes pratiques

| Solution | Exemple | Intérêt | Limite |
|---|---|---|---|
| Conventions Markdown locales, choix du plan | « CSS Modules, un composant par dossier, tests près du code » | Édition directe par un développeur ou avec un agent | Les outils ne peuvent pas valider toute la prose |
| Preset copié puis modifiable | Choisir React avec CSS Modules ; éditer les fichiers reçus | Mise en place rapide, liberté locale | La copie ne reçoit pas automatiquement les améliorations |
| Profil structuré avec héritage de presets | Chemins, commandes et capacités en JSON | Bon pour plusieurs paquets ou plusieurs repositories | Davantage de configuration et règles de priorité |
| Directives existantes du repository | Réutiliser le guide d'équipe et le composant de référence | Évite une seconde documentation de stack | Il faut indiquer précisément ce qui concerne la tâche |

**Recommandation :** commencer avec un point d'entrée `.ucm/conventions.md`,
qui peut renvoyer aux conventions déjà présentes. Des ressources de départ
remplissent les premières réponses pour la stack éprouvée. Définir un preset
réutilisable à partir de ces ressources lorsqu'un second consommateur en a
besoin. La recette d'un monorepo web et mobile exige une sélection par dossier ;
un en-tête global ne peut pas imposer deux stacks simultanément. Cette sélection
constitue un lot identifié, sans imposer un système général d'héritage de profils.

### 4.6. Obtenir des composants d'architecture similaire

| Solution | Exemple | Intérêt | Limite |
|---|---|---|---|
| Composant d'exemple copié, choix du plan | Un exemple montre imports, props, styles et tests | Facile à lire et modifier | Les agents peuvent copier ses détails accidentels |
| Petits modèles par famille | Un modèle de composant simple, un de composition, un d'interaction | Moins de règles inutiles à reproduire | Quelques exemples à maintenir |
| Générateur de squelette | Créer automatiquement les fichiers et points d'extension | Structure initiale identique | Ne contrôle pas les modifications ultérieures |
| Composant réel désigné comme référence | « Suivre l'organisation de `Carte` » | Conforme aux habitudes effectives de l'équipe | Peut importer des décisions propres à ce composant |
| Règles de lint et tests architecturaux | Refuser les imports interdits ; vérifier la séparation des styles | Détecte certaines divergences après génération | Chaque règle ne prouve que ce qu'elle inspecte |

**Recommandation :** commencer avec un exemple court pour la stack éprouvée,
associé à une liste des règles d'architecture. Le rendre accessible avec ou sans
adaptateur de parité. Le projet peut désigner son propre composant de référence.
Ajouter un modèle de composition lorsque la recette en établit le besoin.
Compiler les modèles publiés, vérifier les props par parité si disponible,
et éprouver leur rendu séparément. L'exemple d'un composant composé ne doit pas
imposer toutes ses structures à un bouton simple.

### 4.7. Installer l'ensemble dans un repository quelconque

| Solution | Parcours | Intérêt | Limite |
|---|---|---|---|
| CLI locale avec initialisation, choix du plan | Installer UCM, lancer `init`, compléter les choix locaux | Versions et contrôles reproductibles | Prérequis d'exécution et intégration au build |
| Archive d'aides et modèles | Copier un dossier de ressources | Accessible à un repository sans outillage Node | Mises à jour et génération de tokens à organiser séparément |
| Repository modèle | Créer un projet déjà configuré | Très court pour un projet neuf | S'adapte mal à une application existante |
| Plugin d'agent | Installer la skill dans l'outil de l'agent | Découverte commode dans cet outil | N'installe pas le build de l'application ; dépend de l'outil |
| Paquet de design system interne | Plusieurs applications dépendent du même preset et des mêmes styles | Mutualise les décisions d'une équipe | Publication et mises à jour à maintenir |

**Recommandation :** une CLI comme parcours principal, plus une archive de
ressources pour la lecture sans Node. Un seul point d'entrée d'installation
peut guider plusieurs étapes ; il ne dispense pas de choisir la stack, les
icônes ou la destination des styles. Pour un projet existant, présenter les
modifications concrètes au script et à l'import sans écraser ses fichiers.

Le plan doit distinguer trois garanties : aides accessibles dans toute stack,
génération des tokens pour les plateformes prises en charge, et activation
automatique pour les agents effectivement testés. Un format de skill commun
ne prouve pas que tous les agents la découvriront au même endroit.

## 5. Proposition de livraison corrigée

Conserver les décisions utiles du plan : alias préservés, noms centralisés,
propriétaire explicite, guide sélectionné par caractéristiques, conventions
locales et installation sans écrasement. Les lots ci-dessous corrigent leur
ordre et précisent leur condition de sortie.

| Lot | Travail proposé | Condition de sortie |
|---|---|---|
| A. Définition des cas | Décrire les choix indépendants, les collections étendues, les modes fixés et les usages texte/visibilité | Chaque cas a un rendu attendu ou un diagnostic défini |
| B. Prototype de résolution et CSS | Comparer la factorisation, le contexte fixé au build et un outil tiers ; définir l'analyse des cycles | Mesures reproductibles et aucune divergence sur les cas retenus |
| C. Publication des modes | Produire la paire cohérente, traiter les suppressions, construire la base fusionnée, contrôler les types ; livrer une sortie de tokens sélectionnée par contexte avec alias conservés | Aucun mode perdu silencieusement ; ancien lecteur correct sur le défaut public ; sélection vérifiée sur un contexte non défaut |
| D. Guide et personnalisation | Séparer relais et procédure ; publier les aides ; décrire les preuves et conflits | Guide exact, sections non dupliquées, préférences locales observées |
| E. Ressources de stack | Fournir les conventions de départ, un exemple et les commandes pour une première stack, indépendamment de la parité | Personnalisation d'un exemple et d'une règle sans modifier UCM |
| F. Mise en place | Installer les ressources absentes ; diagnostiquer le build et les imports ; tester la découverte | Parcours depuis les archives publiables, en repository neuf et existant |
| G. Recette produit | Comparer le rendu et le coût agent ; vérifier les scénarios de marque et d'accessibilité | Limites annoncées conformes aux cas réellement exécutés |
| H. Plusieurs cibles | Définir le preset réutilisable et la sélection des conventions par dossier à partir d'une seconde cible de recette | Un contrat web et un contrat non web chargent chacun leurs conventions |

D et E peuvent progresser pendant B. C dépend de la représentation validée par
B, notamment pour les jetons synthétiques. La mesure des modes fixés commence
en A ; son diagnostic minimal n'attend pas la fin de la livraison.

L'export d'un contexte sélectionné doit conserver les alias lorsque le fichier
reste un artefact de tokens. Une fonction de résolution peut calculer leurs
valeurs pour les comparaisons. La conversion finale d'une plateforme peut
produire des littéraux selon ses besoins ; cela ne change pas l'export source.

Le lot C livre la commande proposée `ucm tokens contexte`, avec un mode choisi
par axe et les autres axes au défaut déclaré. Le document produit garde les
feuilles nécessaires aux alias et la marque de format applicable. Les valeurs
alternatives ne restent pas présentées comme sélectionnables dans cette sortie.
Un mode inconnu ou une cible absente refuse l'écriture. Cette commande n'existe
pas encore ; elle fait partie de la proposition corrigée.

Pour une plateforme sans CSS, cette sortie constitue une entrée de conversion,
pas des ressources natives prêtes à compiler. La première livraison garantit
les aides génériques, la sélection des tokens et la génération CSS éprouvée.
La conversion native et les conventions de la seconde cible sont vérifiées
en H. Les types du dialecte UCM exigent un convertisseur qui les accepte ou
une décision explicite de migration.

## 6. Recette proposée au concepteur

Ces volumes sont des cibles de mesure proposées, pas des capacités démontrées.

| Épreuve | Attendu visible ou mesurable |
|---|---|
| 2 marques, clair/sombre | Les mêmes composants changent sans réécriture de leurs références |
| Groupe, filiale, sous-marque | Une surcharge partielle conserve les autres valeurs héritées |
| 20, 200 puis 1 000 marques | Rapport du nombre de feuilles, alias et octets, temps d'export et de génération |
| 4 axes, cinq niveaux de portée | Même contexte final, même rendu ; retours au défaut et retraits d'attribut éprouvés |
| 24 ordres pour quatre axes | Résultat indépendant de l'ordre d'imbrication pour le même contexte |
| Densité indépendante entre marque et thème | Aucun retour involontaire à une autre marque |
| Une dépendance seule utilise une marque | Le guide inclut cette marque dans la recette du parent |
| Mode non défaut divergent entre les deux fichiers | Refus explicite avant remplacement du CSS |
| Axe absent mais valeurs à modes présentes | État incomplet signalé, sans succès multimode |
| Cycle réel et cycle impossible selon les modes | Refus du premier ; acceptation du second ou limite d'analyse explicitement annoncée |
| Une modale rendue ailleurs dans le document | Intégration applicative vérifiée : mêmes choix qu'à son ouverture, puis propagation d'un changement pendant qu'elle reste ouverte |
| Contour, ombre et focus simultanés | Aucun effet écrasé ; taille et placement du contenu conservés |
| Couleurs forcées | Focus et limites nécessaires à la compréhension restent perceptibles |
| Modification de `contour-ring` et d'un modèle | Nouvelle implémentation conforme aux choix locaux, avec preuves distinctes du rendu et de l'architecture |
| Projet web, projet non web, monorepo mixte | Aides sélectionnées pour la bonne cible ; capacités de génération annoncées séparément |
| Deux exécutions d'initialisation | Aucun fichier utilisateur écrasé ; aucune copie supplémentaire inutile |

Fixer les budgets de taille, mémoire et durée avant la comparaison des
générateurs. Mesurer le recalcul sur des arbres d'interface constants et après
le build réel du consommateur. Pour le CSS par portée, comparer les valeurs
calculées à un oracle indépendant du générateur, puis conserver des cas
manuels dont le résultat est connu.

La proximité de portée intervient dans la cascade après la spécificité. Le
harnais doit donc utiliser le CSS réellement produit, avec ses couches et sa
minification. Voir [CSS Cascade](https://www.w3.org/TR/css-cascade-6/#cascade-sort).

## 7. Ce que le plan alternatif apporte et ce qu'il faut écarter

Le plan alternatif rend les profils, les contrôles locaux et la mise à jour
plus visibles. Son export par contexte donne une réponse utile aux sites qui
fixent leur marque au build. Sa mesure de volume mérite d'être reprise.

Il présente cependant plusieurs problèmes :

- L'exemple d'axes place `attribute` dans les tokens, alors que ce choix dépend
  de l'application web. Conserver cette information dans la configuration du
  consommateur.
- Il décrit `@ucm-kit/core/lecteurs` comme sans dépendance Node. Ce sous-chemin
  utilise actuellement Node et Ajv. Le sous-chemin sans ces dépendances est
  `@ucm-kit/core/format`. Une API pure éventuelle doit avoir une frontière de
  paquet explicite.
- Il affirme que le CSS émet les croisements nécessaires sans donner la preuve
  de cascade détaillée du plan courant. L'affirmation ne remplace pas cette
  preuve.
- Il associe la vérification des règles `ring` et `border` à la parité actuelle.
  Cette couverture n'existe pas dans l'adaptateur TypeScript.
- Sa commande `npx ucm` ne désigne pas explicitement le paquet
  `@ucm-kit/cli`. Garder les commandes publiées par le vrai paquet UCM.
- Il ajoute profils, conventions à rubriques, génération, mises à jour et
  `doctor` avant de démontrer le parcours minimal. Un preset éditable et un
  diagnostic d'installation couvrent une partie du besoin avec moins de code.

La proposition de cette note reprend le guide et la factorisation précise du
plan courant. Elle emprunte au plan alternatif l'attention au volume, aux
sorties sélectionnées et à la personnalisation des modèles. Les fonctions
supplémentaires restent conditionnées à un cas de consommation défini.

## 8. Limites de cette analyse

La revue a confronté les textes au code de l'export, au rendu sémantique, à la
parité et à la politique de compatibilité. Elle a consulté les sources
primaires liées dans les sections concernées. Elle n'a pas exécuté un export
Enterprise ni le futur générateur CSS. Aucune capacité de ces deux chemins
n'est présentée ici comme validée en situation.

La [revue indépendante](REVUE-INDEPENDANTE-ANALYSE-MODES-TOKENS.md) relève six
points. Leur traitement dans cette proposition est explicite :

| Point de revue | Traitement |
|---|---|
| Contenu indicatif et obligation normative | Section 3.6 : seuls une liaison ou un rendu normatifs perdus justifient la couverture partielle |
| Dialecte UCM et conformité | Sections 3.13 et 4.1 : conformité de la structure, des sources et lecture tierce distinguées |
| Portails | Sections 4.2 et 6 : conteneur ou propagation du contexte à la charge de l'application |
| Défauts synchronisés | Section 3.8 : défaut unique présenté comme un choix de simplicité ; autre solution expliquée |
| Livraison sans CSS | Lot C : sélection de tokens livrable ; lot H : conversion de la seconde cible à éprouver |
| Étendue des presets | Lot E limité à une stack et un exemple ; généralisation en H à partir d'un cas réel |

La correction de la sélection des tokens en C est un choix de cette proposition.
Elle répond au besoin de consommation hors du seul générateur web. Sa conversion
en ressources natives reste une capacité à éprouver, annoncée séparément.
