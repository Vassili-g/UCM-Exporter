# État de l'art des outils pour l'implémenteur de contrats

> Statut : recherche d'antériorité. Ce relevé répond à une seule question : pour
> chacune des seize sous-parties du module décrit par le
> [plan de l'implémenteur](../Formalisation%20de%20la%20solution/PLAN-IMPLEMENTEUR.md),
> existe-t-il un outil qui la couvre, et coûte-t-il moins que de l'écrire.
>
> **Ce qu'il a lu.** [AGENTS.md](../../../../../AGENTS.md),
> [CONCEPT.md](../../../../../CONCEPT.md), l'[index du dossier](../README.md),
> le plan de l'implémenteur, le point 7 de
> l'[audit des prémisses](./AUDIT-PREMISSES-IMPLEMENTEUR.md), la section sur les
> plateformes de [PISTES-EVOLUTION.md](../../Evolutions%20globales/PISTES-EVOLUTION.md),
> le contrat `Button` du Playground et son implémentation de référence. Côté
> extérieur : documentations officielles, dépôts, pages de tarifs, et les
> métadonnées du registre npm pour trente-sept paquets.
>
> **Ce qu'il a éprouvé.** Deux essais exécutés dans un dossier temporaire hors
> du dépôt. Panda CSS 1.12.1 a compilé deux fois une tranche réelle de `Button`,
> une fois avec son preset et une fois sans, et la feuille produite a été lue.
> `class-variance-authority` 0.7.1 a été exécuté sur la même tranche. Les
> versions, licences et dates de publication des tables ci-dessous viennent du
> registre npm.
>
> **Ce qu'il n'a pas fait.** Aucune installation dans le dépôt. Aucun essai
> d'une plateforme commerciale, faute de compte. Aucun rendu dans un navigateur,
> donc aucune vérification des candidats de la sous-partie 9 sur le corpus.
> Aucun appel à un fournisseur de modèle. Les coûts d'intégration en sessions de
> travail sont des estimations, jamais des mesures.
>
> Il ne modifie ni le plan, ni l'audit, ni le banc. Les points où la recherche
> les contredit sont rassemblés au §7.

## 1. La réponse en une page

| # | Sous-partie | Verdict | Candidat retenu |
|---|---|---|---|
| 1 | Pipeline complet | Écrire nous-mêmes | Aucun. Les neuf candidats prennent la maquette en entrée, pas le contrat |
| 2 | Lecture d'une spécification, format standardisé à viser | Écrire nous-mêmes | Aucun. Le groupe W3C qui visait ce méta-modèle a fermé |
| 3 | Représentation intermédiaire | Écrire nous-mêmes | Mitosis instruit et écarté : son entrée est un dialecte JSX |
| 4 | Émission multi-stack | Écrire nous-mêmes | Stencil et Lit sont des cibles d'adaptateur, pas des émetteurs |
| 5 | Émission des styles par combinaison | Écrire nous-mêmes | Aucun. Éprouvé : Panda et `class-variance-authority` ne portent pas la combinaison |
| 6 | Comportement, états, accessibilité | Adopter partiellement | Les pratiques WAI-ARIA comme source des recettes ; Zag.js pour les composants à machine, dont le corpus ne porte aucun |
| 7 | Tokens vers variables CSS, modes | Garder l'existant | Style Dictionary 5. Terrazzo écarté. Le module Resolver du DTCG reste à surveiller |
| 8 | Types dérivés | Garder l'existant | `generation.mjs`. `json-schema-to-typescript` ne produit pas le type des combinaisons exactes |
| 9 | Porte de conformité de rendu | Adopter | Playwright. Tous les comparateurs d'image sont rejetés par le besoin lui-même |
| 10 | Épreuve de la porte par mutation | Écrire nous-mêmes | Stryker ne mute ni le CSS ni une valeur de token |
| 11 | Port fournisseur, sortie structurée | Adopter partiellement | La bibliothèque `ai` de Vercel pour l'appel, `ajv` pour la validation. Le refus avant appel reste à écrire |
| 12 | Remplacement exact de fragments | Écrire nous-mêmes | Une comparaison de chaîne sur une région délimitée. `ts-morph` en second recours |
| 13 | Diff structuré entre deux spécifications | Adopter | `microdiff` |
| 14 | Relevé de décisions et mémoire par signature | Écrire nous-mêmes | La pratique nommée existe et ne se rejoue pas : voir §11 |
| 15 | Orchestration, budgets, journal de coût | Écrire nous-mêmes | Les noms d'attributs des conventions sémantiques GenAI d'OpenTelemetry pour le journal |
| 16 | Installation et intégration continue | Garder l'existant | `ucm init`. Aucune découverte |

Trois lignes portent tout le résultat. Aucun outil ne couvre les sous-parties 3
à 5, qui sont le cœur du lot 2 et le gain de taille du §7.1 du plan. Les
adoptions réelles sont Playwright, la bibliothèque `ai` et `microdiff`, et elles
retirent au total une fraction du lot 3, une fraction du lot 4 et une fraction
du lot 5. Les lots 1 et 2, sans dépense de modèle, restent entiers.

## 2. Le pipeline complet, et pourquoi ce projet n'en emploie aucun

### 2.1. Les candidats, et ce que chacun prend en entrée

| Candidat | Ce qu'il fait | État |
|---|---|---|
| [Figma Code Connect](https://developers.figma.com/docs/code-connect/) | Associe un composant Figma à une implémentation déjà écrite, et montre ce code dans Figma | Vivant. Paquet `@figma/code-connect` 2.0.1, licence MIT |
| [Builder.io Visual Copilot](https://www.builder.io/blog/figma-to-code-visual-copilot) | Un modèle convertit une maquette Figma en code, par crédits d'agent | Vivant |
| [Anima](https://www.animaapp.com/pricing) | Plugin Figma qui produit du code, par quota de générations | Vivant |
| [Locofy](https://www.locofy.ai/pricing) | Plugin Figma qui produit du code après étiquetage des calques | Vivant |
| [quest.ai](https://www.quest.ai/) | Produit du code React depuis une maquette | Non établi : page instruite sans conclusion sur l'activité |
| [TeleportHQ](https://teleporthq.io/) | Constructeur visuel qui exporte du code | Vivant |
| [UXPin Merge](https://www.uxpin.com/docs/merge/merge-design-system-documentation/) | Importe une bibliothèque de composants codés dans l'outil de conception | Vivant, par siège |
| [Specify](https://specifyapp.com/) | Moteur de tokens entre la conception et le code | Fermé. La page d'accueil porte l'annonce de fin |
| [Backlight](https://backlight.dev/) | Atelier de design system dans le navigateur | Fermé. La page d'accueil porte la date d'arrêt |

Deux des neuf n'existent plus, et les deux étaient ceux que
[CONCEPT.md](../../../../../CONCEPT.md#7-ucm-parmi-les-outils-de-design-system)
et [PISTES-EVOLUTION.md](../../Evolutions%20globales/PISTES-EVOLUTION.md)
citaient comme points de comparaison. La table de CONCEPT.md cite encore
Backlight comme une solution disponible.

### 2.2. Ce qui les disqualifie tous, sans regarder leur prix

Sept des neuf prennent le fichier Figma en entrée au moment où le code se
produit. Le plan exige au §1.3 que le module fonctionne sans Figma ouvert, et le
seul consommateur existant reçoit des contrats par demande de fusion, sans accès
au fichier de conception. Un plugin Figma ne rend donc pas le service demandé,
quel que soit la qualité de sa sortie.

Les mêmes sept confient au modèle la rédaction du fichier. Le §8 de la commande
tranche ce point : le modèle répond à des questions fermées. Un outil bâti sur
un modèle qui écrit le composant ne répond pas au besoin. Ce constat vaut aussi
pour Visual Copilot, dont le tarif se compte en crédits d'agent, ce qui replace
le coût variable au niveau que le plan cherche à quitter.

Aucun des neuf ne porte de porte de conformité qui oppose le style calculé du
rendu à une valeur attendue lue par un second chemin. Aucun ne lit un contrat
relu et versionné.

### 2.3. Code Connect, et l'argument budgétaire déjà tranché

Code Connect mérite d'être traité à part, parce qu'il va dans l'autre sens : il
part du code existant pour enrichir Figma, et ne produit aucun composant. Il ne
couvre donc aucune sous-partie du module.

Sa condition d'accès confirme l'argument de légitimité du projet. La
documentation officielle pose que Code Connect est disponible « sur un siège Dev
ou Full, sur les offres Organization et Enterprise ». La
[page de tarifs Figma](https://www.figma.com/pricing/) chiffre le siège Dev à
25 USD par mois sur Organization et à 35 USD sur Enterprise, facturation
annuelle, et le siège Full à 55 et 90 USD. Pour les deux équipes du projet, la
facture porte sur chaque développeur de l'équipe consommatrice, qui n'ouvre
jamais le fichier de conception. Dix développeurs sur Organization coûtent
250 USD par mois pour une lecture qu'un contrat dans le dépôt rend gratuite.
Le paquet `@figma/code-connect` est sous licence MIT ; la capacité qu'il pilote
ne l'est pas.

Builder.io, Anima et Locofy tombent sous la même forme d'argument, par crédits
plutôt que par sièges. Le plan gratuit d'Anima est chiffré en « 5 générations de
code dans le plugin Figma », et son offre Enterprise commence à 500 USD par
mois. Les tarifs Locofy relevés par des sources secondaires se contredisent, de
9 à 99,9 USD par mois : non établi.

### 2.4. La conclusion du niveau supérieur

Il n'existe aucun outil qui fasse le pipeline demandé, et l'absence ne tient pas
au marché. Elle tient à la forme de l'entrée. Tous les produits du marché vont
de la maquette au code en une passe, sans artefact intermédiaire relu. UCM pose
un contrat relu entre les deux, et c'est ce contrat qui rend possibles la porte,
le cycle de mise à jour et le mode hors ligne. Un produit qui n'a pas ce
maillon ne peut pas rendre ces trois services.

## 3. Sous-partie 2 : un format de contrat de composant à viser

Le kit lit déjà la spécification et résout ses renvois. La seule question
ouverte est celle d'un standard que UCM devrait viser.

### 3.1. Le groupe W3C qui visait exactement ce méta-modèle a fermé

Le [UI Specification Schema Community Group](https://www.w3.org/groups/cg/uispec)
du W3C portait la même ambition que le contrat UCM : « définir un méta-modèle
commun, indépendant de l'implémentation, pour spécifier le dessin, la
disposition, le comportement et les contraintes des éléments d'interface ». Ses
livrables annoncés comprenaient un schéma JSON d'écriture et de validation, des
spécifications de référence pour les composants courants, et un alignement de
vocabulaire avec Open UI et avec le groupe des design tokens.

Sa page de groupe porte aujourd'hui un seul état : fermé. Le groupe a donc été
proposé, chartré et clos sans publier de schéma.

| Champ | Relevé |
|---|---|
| Couverture | Le méta-modèle complet visé par le contrat UCM, anatomie, états et variantes compris |
| Preuve | [www.w3.org/groups/cg/uispec](https://www.w3.org/groups/cg/uispec), page officielle du groupe, qui porte la mission et la fermeture |
| Licence | Sans objet, aucun livrable publié |
| Coût | Sans objet |
| Verdict | Rien à viser |

### 3.2. Ce que les deux standards vivants couvrent, et ce qu'ils laissent

| Standard | Ce qu'il normalise | Ce qu'il laisse au contrat UCM |
|---|---|---|
| [Open UI](https://open-ui.org/) | L'anatomie et les états des contrôles natifs du navigateur, en vue d'un changement de HTML, de ARIA ou de CSS | Les variantes d'un design system, les placements de peinture, les tailles, la composition, les règles d'usage |
| [DTCG, module Format 2025.10](https://www.designtokens.org/tr/drafts/format/) | Les tokens, leurs alias, leurs types et leurs extensions | Tout le composant |

Open UI décrit un `select` du navigateur, jamais un `Button` de marque avec
quatre-vingt-dix combinaisons. Le format DTCG est déjà emprunté par
`tokens.json`. Aucun des deux ne concurrence le contrat.

**Verdict de la sous-partie 2 : écrire nous-mêmes, et rien à viser.** Ce relevé
ne change rien au kit. Il retire en revanche un argument que le projet pourrait
croire à sa portée : il n'existe pas de standard de contrat de composant vers
lequel converger, et la seule tentative connue s'est arrêtée avant son premier
schéma.

## 4. Sous-parties 3 et 4 : représentation intermédiaire et émission multi-stack

### 4.1. Fiche Mitosis

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | La sous-partie 4 seule, et par un chemin que le plan n'emprunte pas. Mitosis compile un composant écrit dans son dialecte JSX vers React, Vue, Svelte, Solid, Angular, Qwik et React Native |
| Ce qu'il laisse dehors | L'entrée. La documentation officielle pose que Mitosis emploie « un sous-ensemble statique de JSX, inspiré de Solid, qui peut être analysé vers une structure JSON simple ». La structure JSON est le produit de l'analyse, pas une entrée publiée. Les greffons la reçoivent après analyse. Aucune page de la documentation ne décrit la construction directe d'un composant depuis cette structure, ni ne publie son schéma ni sa politique de compatibilité |
| Preuve | [mitosis.builder.io/docs/overview](https://mitosis.builder.io/docs/overview/) pour le sous-ensemble JSX, [docs/customizability](https://mitosis.builder.io/docs/customizability/) pour les greffons |
| Licence | MIT, compatible avec une redistribution MIT |
| Coût réel | Gratuit |
| Sans clé d'API | Conforme |
| Sans Figma ouvert | Conforme |
| Pas de lecture du contrat au runtime | Conforme, la compilation est au build |
| Aucune logique liée au nom d'un composant | Conforme |
| Frontière contrat et code | Neutre, Mitosis ne décide de rien |
| Portabilité entre stacks | C'est sa raison d'être |
| Maturité | Version 0.14.0, publiée deux mois avant ce relevé. Vingt-trois mainteneurs au registre. Numéro de version toujours sous 1.0 après plusieurs années, donc aucune promesse de stabilité de forme. Éditeur unique, Builder.io, dont le produit commercial est Visual Copilot |
| Coût d'intégration contre coût d'écriture | Employer Mitosis demande d'émettre son dialecte JSX depuis la représentation du §6, puis de le lui faire analyser pour qu'il retrouve une structure que le compilateur possédait déjà. L'aller-retour ajoute une étape et un format à tenir. Le coût d'écriture retiré est celui d'un second adaptateur, soit une fraction du lot 6, au prix d'une dépendance dans le lot 2 |
| Réversibilité | Faible coût d'abandon si Mitosis ne sert qu'au second adaptateur. Coût élevé s'il devient la représentation intermédiaire, parce que le dialecte JSX deviendrait la forme pivot |
| Verdict | **Écrire nous-mêmes.** La représentation intermédiaire du §6 est assemblée depuis les lecteurs du kit et porte le chemin de contrat de chaque fragment ; passer par un dialecte JSX perdrait ce lien, dont la porte a besoin |

Le point décisif n'est pas la qualité de Mitosis. C'est que le plan a déjà une
représentation, tirée de `vueExacteDuVariant` et du variant, et que cette
représentation porte la provenance. Mitosis prend un composant et le traduit ;
le module prend un contrat et l'émet.

### 4.2. Stencil, Lit et les composants web

Ces trois ne sont pas des candidats de la sous-partie 4. Ce sont des cibles
d'émission, c'est-à-dire ce que le second adaptateur du §11 produirait.

| Candidat | Version et licence | Rôle possible |
|---|---|---|
| [Stencil](https://stenciljs.com/) | `@stencil/core` 4.45.0, MIT, publié le mois de ce relevé | Cible d'un adaptateur hors processus. Ses cibles de sortie produisent des enveloppes React ou Vue autour d'un élément personnalisé, jamais un composant natif de ces stacks |
| [Lit](https://lit.dev/) | `lit` 3.3.3, BSD-3-Clause, huit mainteneurs | Cible d'un adaptateur qui émet des éléments personnalisés |
| [Enhance](https://enhance.dev/) | Non instruit en détail | Cible possible, rendu côté serveur |

Le plan note au §11 que le second adaptateur ne réutilise pas tout le fichier
CSS du premier, parce qu'un élément personnalisé ne porte ni l'attribut
`disabled` d'un contrôle de formulaire ni le comportement de focus d'un
`button`. Ce constat vaut pour Stencil comme pour Lit, et il n'est pas levé par
le choix de l'un des deux.

**Verdict de la sous-partie 4 : écrire nous-mêmes l'émission, et retenir Lit ou
Stencil comme cible du second adaptateur.** Le choix de la cible appartient au
lot 6.

## 5. Sous-partie 5 : l'émission des styles par combinaison

C'est la sous-partie où le marché paraît le plus fourni, et celle où l'essai
donne le résultat le plus net.

### 5.1. Ce que le besoin demande exactement

Le §7.2 du plan demande trois choses ensemble : une règle par combinaison de
variantes, sélectionnée par des attributs `data-*` ; les règles d'état écrites
du plus faible au plus fort ; et, dans chaque règle d'état, la redéclaration de
toute propriété qu'une autre règle du même groupe peut écrire, avec une valeur
de remise à zéro quand le contrat n'en donne pas. L'audit chiffre à
cinquante-quatre les couples de fuite sur les dix-huit combinaisons de `color`
et `variant` de `Button`.

La troisième exigence vient d'une propriété du format :
`variants[].tokens` décrit une combinaison en entier, jamais un écart. Les six
bibliothèques candidates reposent toutes sur l'opération inverse, la fusion
d'une base et d'un ensemble de variantes.

### 5.2. L'essai, et ce qu'il a montré

L'essai a repris une tranche réelle de `Button` : `color: primary`,
`variant: text`, avec un état `hover` qui déclare le fond et le texte, et un
état désactivé qui ne déclare que le texte. C'est exactement le couple de fuite
que le plan donne comme vérifiable à la main.

**Panda CSS 1.12.1.** La combinaison a été écrite en `compoundVariants`, et la
feuille a été produite par `panda cssgen`. Résultat lu dans la sortie :

- les variantes donnent une classe par **valeur** d'axe, `.ucmbtn--color_primary`
  et `.ucmbtn--variant_text`, jamais une règle par combinaison, et jamais un
  sélecteur d'attribut ;
- la combinaison n'a aucune existence dans la feuille. Panda dissout le
  `compoundVariants` en classes utilitaires atomiques, une par déclaration :
  une classe porte le fond du survol, une autre porte le texte du survol, une
  troisième porte le texte de l'état désactivé. La composition redevient le
  travail du JavaScript ;
- la fuite subsiste à l'identique. Le fond du survol et le texte désactivé sont
  portés par deux classes indépendantes, et rien dans Panda n'exprime la remise
  à zéro d'une propriété entre deux états.

Un second passage a ajouté `eject: true` et `presets: []`, réglage nécessaire
pour que Panda cesse d'imposer sa propre table de tokens. Au premier passage,
Panda avait réécrit `background: transparent` en
`background: var(--colors-transparent)`, c'est-à-dire en un token à lui. Le
second passage retire cette table, et retire en même temps la condition
`_hover` : la déclaration de survol sort alors sans aucun sélecteur, donc
s'applique toujours. Panda a produit une feuille fausse sans rien signaler.

**`class-variance-authority` 0.7.1.** L'appel rend une chaîne de noms de
classes, et aucun fichier CSS. Sortie exacte de l'essai :

```text
sortie hover  : ucmbtn c-primary v-text s-hover bg-hover fg-hover
sortie disable: ucmbtn c-primary v-text s-disable fg-disable
```

La bibliothèque choisit des noms ; la feuille reste à écrire à la main, avec ses
cinquante-quatre couples de fuite intacts. Elle replace en outre la sélection de
l'état dans une prop `state` lue au rendu, ce que le §7.1 du plan cherche à
retirer du JavaScript.

### 5.3. Fiche commune aux six bibliothèques de recettes

| Champ | Relevé |
|---|---|
| Ce qu'elles couvrent | Le nommage des variantes et leur typage. Panda, Vanilla Extract, StyleX et Griffel produisent en plus du CSS au build |
| Ce qu'elles laissent dehors | La règle par combinaison, le sélecteur d'attribut `data-*`, et la remise à zéro d'une propriété entre deux états. Éprouvé sur Panda et `class-variance-authority`, documenté pour les quatre autres, qui partagent le modèle de fusion base plus variantes |
| Preuve | Essais exécutés pour les deux premières. Pour les autres : [recettes Vanilla Extract](https://vanilla-extract.style/documentation/packages/recipes/), [Tailwind Variants](https://www.tailwind-variants.org/), [StyleX](https://stylexjs.com/), [Griffel](https://griffel.js.org/) |
| Licences | Voir la table ci-dessous. Toutes permissives |
| Coût réel | Gratuit |
| Pas de lecture du contrat au runtime | Conforme pour Panda, Vanilla Extract, StyleX, Griffel. `class-variance-authority` et Tailwind Variants calculent au rendu, ce qui ne lit pas le contrat mais garde la sélection en JavaScript |
| Aucune logique liée au nom d'un composant | Conforme |
| Portabilité entre stacks | `class-variance-authority`, Tailwind Variants et Vanilla Extract sont indépendants de React. Griffel vise React. StyleX vise React et React Native |
| Coût d'intégration contre coût d'écriture | L'émission demandée produit du texte CSS depuis une table déjà résolue. Écrire ce générateur est une fraction du lot 2. Passer par une bibliothèque demande de traduire la table en sa forme de configuration, puis de réintroduire à la main les déclarations de remise à zéro dans chaque entrée. Le coût d'intégration dépasse le coût d'écriture |
| Réversibilité | Élevée pour un générateur de texte écrit ici. Faible pour Panda, dont l'éjection du preset a produit une feuille fausse sans avertissement |
| Verdict | **Écrire nous-mêmes.** Aucune des six n'exprime la combinaison comme une unité, et c'est la seule chose dont le contrat a besoin |

| Bibliothèque | Version | Licence | Dernière publication | Mainteneurs au registre |
|---|---|---|---|---|
| `@pandacss/dev` | 1.12.1 | MIT | 2026-09-04 | 1 |
| `@vanilla-extract/recipes` | 0.5.7 | MIT | 2025-06-12 | 5 |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | 2024-11-26 | 1 |
| `tailwind-variants` | 3.3.1 | MIT | 2026-08-03 | 1 |
| `@stylexjs/stylex` | 0.19.1 | MIT | 2026-09-15 | 5 |
| `@griffel/react` | 1.7.7 | MIT | 2026-08-03 | 4 |

Trois de ces six portent un seul mainteneur au registre npm.
`class-variance-authority` n'a pas publié depuis près de deux ans.

## 6. Sous-partie 6 : comportement, états d'interaction et accessibilité

C'est la sous-partie où le marché apporte le plus, et où le corpus en profite le
moins.

### 6.1. Ce que le contrat ne porte pas, et que le genre `hote` demande

L'audit établit au point 1.4 qu'aucun champ du schéma ne nomme un élément. Le
genre `hote` a donc besoin d'une liste de primitives, que l'adaptateur déclare,
et le genre `accessibilite` a besoin d'une recette par primitive. Ce sont deux
catalogues à écrire, pas deux dépendances à installer.

### 6.2. Fiche Zag.js

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | Le comportement et l'accessibilité de cinquante et quelques composants, sous forme de machines à états indépendantes du framework, avec des connecteurs React, Vue, Svelte, Solid et sans framework |
| Ce qu'il laisse dehors | Le corpus. La liste de ses machines ne contient aucune entrée `button`, et aucun des quatre contrats du Playground n'a d'équivalent : `Button` et `TileLink` sont des contrôles natifs, `Alert` est un dessin, `StressTest` est une composition. Sur le corpus mesuré, Zag.js couvre zéro question |
| Preuve | [zagjs.com](https://zagjs.com/), navigation des composants |
| Licence | MIT, compatible |
| Coût réel | Gratuit |
| Sans clé d'API, sans Figma | Conforme |
| Pas de lecture du contrat au runtime | Conforme. Une machine lit son propre état, jamais le contrat |
| Frontière contrat et code | Conforme, et elle la renforce : la machine appartient au code, le contrat décrit le visuel |
| Portabilité entre stacks | Conforme, c'est sa raison d'être |
| Maturité | `@zag-js/core` 1.44.0, publié la semaine de ce relevé. Version au-dessus de 1.0. Un seul mainteneur au registre, et un seul éditeur, Chakra Systems |
| Coût d'intégration contre coût d'écriture | Nul aujourd'hui, puisque rien du corpus ne l'emploie. Le jour où un contrat décrit un `Select` ou un `Tooltip`, Zag.js retire tout le contenu de la recette d'accessibilité correspondante, soit une part du lot 4 que le corpus actuel ne permet pas de chiffrer |
| Réversibilité | Bonne. Une machine s'emploie composant par composant |
| Verdict | **Adopter partiellement, en réserve.** À déclarer comme capacité d'adaptateur, sans travail tant que le corpus ne porte aucun composant à machine |

### 6.3. Les bibliothèques de primitives, et ce qu'elles coûteraient

| Candidat | Version, licence | Ce qu'il apporte | Ce qui gêne |
|---|---|---|---|
| [Base UI](https://base-ui.com/) | `@base-ui/react` 1.8.0, MIT, sept mainteneurs | Trente-cinq composants non stylés, avec une propriété de rendu qui laisse choisir l'élément | React seul. Impose sa propre structure d'arbre, que le contrat décrit déjà |
| [React Aria](https://react-spectrum.adobe.com/react-aria/) | `react-aria` 3.52.1, Apache-2.0 | Des crochets de comportement et d'accessibilité, sans arbre imposé | React seul |
| [Radix Primitives](https://www.radix-ui.com/primitives) | `radix-ui` 1.6.7, MIT, dernière publication deux mois avant ce relevé | Les mêmes primitives, plus anciennes | React seul. Plusieurs de ses auteurs travaillent désormais sur Base UI |
| [Ark UI](https://ark-ui.com/) | `@ark-ui/react` 5.39.2, MIT | Les machines Zag.js habillées d'une interface de composants, pour React, Vue, Svelte et Solid | Deux mainteneurs, un éditeur, et il ramène la structure d'arbre |
| [Headless UI](https://headlessui.com/) | `@headlessui/react` 2.2.10, MIT | Un petit jeu de composants | React et Vue. Catalogue restreint |
| [Melt UI](https://melt-ui.com/) | `melt` 0.44.0, MIT, un mainteneur | Constructeurs pour Svelte | Svelte seul, version sous 1.0 |

Aucune de ces six ne convient pour l'arbre. La coque du §7.3 monte l'arbre des
emplacements de la vue du variant, décrit par le contrat ; une primitive impose
le sien. Leur apport possible porte sur le comportement d'un composant à
machine, et Zag.js le porte déjà sans arbre.

### 6.4. Les pratiques WAI-ARIA, source des recettes

Les [pratiques de rédaction WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/)
du W3C décrivent, pour chaque motif d'interface, le rôle, les attributs et le
clavier attendus. C'est exactement le contenu d'une recette du genre
`accessibilite`, et c'est une spécification, pas un paquet.

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | Le contenu de chaque recette d'accessibilité, motif par motif |
| Ce qu'il laisse dehors | Le code. Ce sont des prescriptions à transcrire dans l'adaptateur |
| Licence | Document du W3C, citable, non redistribué sous forme de code |
| Coût | Gratuit |
| Coût d'intégration contre coût d'écriture | Il retire la recherche, pas l'écriture. Une fraction du lot 4 |
| Verdict | **Adopter comme source.** L'adaptateur transcrit les motifs applicables aux primitives qu'il déclare |

**Verdict de la sous-partie 6 : adopter partiellement.** Les pratiques WAI-ARIA
comme source, Zag.js en réserve, et le catalogue de primitives de l'adaptateur
écrit ici.

## 7. Sous-partie 7 : tokens et modes

Style Dictionary est retenu par le §8 de la commande, et la question est celle
d'un manque avéré sur les modes.

### 7.1. Ce que le relevé change, et ce qu'il ne change pas

`ucm tokens css` produit déjà la feuille qui résout les références, modes
compris, et le §7.4 du plan en tire que les modes ne coûtent rien à l'émission
CSS. Aucun manque avéré n'est ressorti de la recherche.

Un fait extérieur mérite d'être connu. Le DTCG a publié un
[module Resolver](https://www.designtokens.org/tr/drafts/resolver/), qui décrit
la façon de travailler avec des tokens dans plusieurs contextes, dont les modes
clair et sombre, les tailles et les modes d'accessibilité. Son en-tête pose
qu'il s'agit d'une ébauche de prévisualisation, à ne pas implémenter. Le module
Format, lui, a atteint sa première version stable en 2025.10, celle que
`tokens.json` emprunte déjà.

### 7.2. Fiche Terrazzo

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | La même fonction que Style Dictionary : produire du code depuis des tokens DTCG, avec une notion de modes qui lui est propre |
| Ce qu'il laisse dehors | La compatibilité avec ce que le dépôt produit. Sa documentation pose que les modes ne sont pas dans la spécification DTCG, et que la direction retenue par le DTCG est désormais celle des resolvers |
| Preuve | [terrazzo.app/docs/guides/modes](https://terrazzo.app/docs/guides/modes/), [dépôt](https://github.com/terrazzoapp/terrazzo) |
| Licence | MIT |
| Coût réel | Gratuit |
| Maturité | `@terrazzo/cli` 2.7.1, un mainteneur au registre. Projet issu du renommage de Cobalt |
| Coût d'intégration contre coût d'écriture | Remplacer Style Dictionary demande de refaire `tokens-css.mjs` et la suite `tests/cascade`, sans gain établi. Le lot retiré est nul |
| Réversibilité | Sans objet, puisque rien ne motive le changement |
| Verdict | **Garder Style Dictionary.** Aucun manque avéré sur les modes. Le module Resolver du DTCG est le point à surveiller, et il n'est pas implémentable |

| Outil | Version | Licence | Dernière publication |
|---|---|---|---|
| `style-dictionary` | 5.5.5 | Apache-2.0 | 2026-09-20 |
| `@terrazzo/cli` | 2.7.1 | MIT | 2026-08-11 |

## 8. Sous-partie 8 : types dérivés d'une spécification

`generation.mjs` dérive déjà les unions depuis les contrats, et
`types-variants.mjs` fixe la forme des unions produites.

| Candidat | Version, licence | Ce qu'il couvre | Ce qu'il laisse dehors |
|---|---|---|---|
| `json-schema-to-typescript` | 16.0.0, MIT | Un type TypeScript par schéma JSON | Le contrat n'est pas un schéma : c'est une instance. Le schéma publié par le kit décrit la forme d'un contrat, donc un type générique de contrat, jamais les unions de `Button` |
| `quicktype` | 26.0.0, Apache-2.0 | Un type inféré depuis un échantillon de données | La même limite, et l'inférence remplacerait une dérivation exacte par une devinette |
| `ts-morph` | 28.0.0, MIT | La construction et la lecture de sources TypeScript par l'arbre du compilateur | Rien de la dérivation. Il sert déjà à `parite.mjs`, par la même dépendance TypeScript |

Le type des combinaisons exactes est le cas décisif. `Button` porte
quatre-vingt-dix combinaisons réelles sur une matrice de cent huit ; le type
attendu est l'union des combinaisons présentes, pas le produit cartésien des
axes. Aucun générateur générique ne sait cela, parce qu'aucun ne sait que
`variants[]` est clairsemé.

**Verdict de la sous-partie 8 : garder l'existant.** Aucun des trois ne retire
une fraction de lot.

## 9. Sous-partie 9 : la porte de conformité de rendu

### 9.1. Le besoin rejette une famille entière de candidats

Le besoin est de comparer le style calculé de chaque variante, taille et mode à
la valeur attendue. Les valeurs attendues sont lues par un second chemin, les
références du contrat résolues contre la feuille de `ucm tokens css`.

Chromatic, Percy, Loki, BackstopJS et `jest-image-snapshot` comparent des
images. Une image ne dit pas quelle propriété a changé, ne se rattache pas à un
chemin de contrat, et ne distingue pas un écart de token d'un écart de
disposition. Ils sont donc rejetés par le besoin lui-même, avant tout argument
de coût. Deux d'entre eux sont en plus à l'arrêt de fait.

| Candidat | Version | Dernière publication | Coût |
|---|---|---|---|
| `loki` | 0.35.1 | 2024-08-27 | Gratuit |
| `backstopjs` | 6.3.25 | 2024-09-07 | Gratuit |
| `jest-image-snapshot` | 6.5.2 | 2026-03-09 | Gratuit |
| Chromatic | Service | Actif | 179 USD par mois pour 35 000 captures, selon des sources secondaires |
| Percy | Service | Actif | Facturation à l'usage, chiffre non établi sur la page officielle |

Le coût de Chromatic vaut d'être dit même s'il est rejeté : une capture se
compte par navigateur et par fenêtre, et `Button` porte quatre-vingt-dix
variants. Deux navigateurs et deux modes portent le corpus à plusieurs milliers
de captures par exécution.

### 9.2. Fiche Playwright

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | Le pilotage d'un navigateur sans interface, le rendu d'une page locale, et la lecture du style calculé d'un élément. `getComputedStyle` rend la valeur résolue d'une propriété, et `getPropertyValue` rend celle d'une propriété personnalisée |
| Ce qu'il laisse dehors | Tout le jugement. La construction de la page d'épreuve, la résolution des références du contrat contre la feuille de tokens, la comparaison, la localisation d'un écart sur un chemin de contrat, et l'atteinte des états d'interaction restent à écrire. `toHaveCSS` ne lit pas les propriétés personnalisées, ce qui impose de passer par `evaluate` |
| Preuve | [playwright.dev](https://playwright.dev/), et le défaut de `toHaveCSS` sur les propriétés personnalisées, ouvert au dépôt Playwright sous le numéro 12629 |
| Licence | Apache-2.0, compatible avec une redistribution MIT |
| Coût réel | Gratuit, sans quota ni service distant. Les navigateurs se téléchargent une fois |
| Sans clé d'API | Conforme |
| Sans Figma ouvert | Conforme |
| Pas de lecture du contrat au runtime | Conforme, la porte est un contrôle, pas du code de production |
| Aucune logique liée au nom d'un composant | Conforme, la page d'épreuve se construit depuis le contrat |
| Frontière contrat et code | Conforme, et il est le seul candidat capable de voir un sélecteur qu'un hôte ne porte pas, cas que le §7.2 du plan signale comme invisible aux contrôles existants |
| Portabilité entre stacks | Le navigateur est la seule dépendance. Une stack sans CSS demanderait un autre vérificateur |
| Maturité | `@playwright/test` 1.63.0, publié le mois de ce relevé, cinq mainteneurs au registre, éditeur Microsoft. Rythme de publication mensuel, compatibilité de forme tenue depuis la version 1 |
| Coût d'intégration contre coût d'écriture | Il retire le pilotage du navigateur et la capture du style, soit environ la moitié du lot 3. La résolution des valeurs attendues et l'atteinte des états restent la part difficile |
| Réversibilité | Bonne. Le port vérificateur du §10.4 isole déjà l'outil derrière quatre entrées et deux sorties |
| Verdict | **Adopter.** C'est le seul candidat qui lise ce que la porte doit comparer |

Le test-runner de Storybook, `@storybook/test-runner` 0.24.5, MIT, pilote lui
aussi Playwright. Il ajoute une dépendance à Storybook et à un format de
stories, que le corpus ne porte pas. À écarter tant qu'aucun besoin de story
n'existe.

`axe-core` 4.13.0 mérite une ligne à part : il contrôle l'accessibilité rendue,
que la porte du §14 ne couvre pas. Sa licence est MPL-2.0, un copyleft faible au
fichier. Employé comme dépendance de développement et non redistribué, il ne
gêne pas une publication sous MIT. À considérer pour le genre `accessibilite`,
une fois ce genre exercé.

## 10. Sous-parties 10 à 13

### 10.1. Sous-partie 10 : l'épreuve de la porte par mutation

| Champ | Relevé pour Stryker |
|---|---|
| Ce qu'il couvre | La mutation de sources JavaScript et TypeScript, et le verdict sur une suite de tests |
| Ce qu'il laisse dehors | Le sujet. Les six altérations du banc portent sur une référence de token, un variant, un contour et un emplacement d'icône, c'est-à-dire sur du CSS émis et sur des données du contrat. Aucun mutateur de Stryker ne touche une feuille de style ni un fichier JSON |
| Preuve | [stryker-mutator.io](https://stryker-mutator.io/docs/stryker-js/introduction/), liste des mutateurs |
| Licence | Apache-2.0 |
| Coût réel | Gratuit |
| Maturité | `@stryker-mutator/core` 10.0.0, trois mainteneurs, publication un mois avant ce relevé |
| Coût d'intégration contre coût d'écriture | Le harnais demandé altère un artefact émis, relance la porte, et exige un rouge. Écrit à la main, c'est une boucle sur une liste d'altérations, soit une petite part du lot 3. Stryker demanderait d'écrire des mutateurs pour le CSS et pour le contrat, donc plus de travail que la boucle |
| Réversibilité | Sans objet |
| Verdict | **Écrire nous-mêmes.** Le dépôt connaît déjà cette pratique : une loi se vérifie en cassant ce qu'elle protège et en constatant le rouge |

### 10.2. Sous-partie 11 : le port fournisseur

Le besoin a quatre parties : un appel, un schéma de réponse, plusieurs
fournisseurs, et un refus avant appel si un réglage n'est pas pris en charge.
Les bibliothèques couvrent les trois premières et manquent la quatrième.

| Champ | Relevé pour la bibliothèque `ai` de Vercel |
|---|---|
| Ce qu'il couvre | `generateObject` contraint la sortie à un schéma, sur une vingtaine de fournisseurs, et rend un relevé d'usage par appel |
| Ce qu'il laisse dehors | Le refus avant appel. Sa documentation pose que les modèles produisent de la sortie structurée « par des modes JSON ou par des outils », et ne publie aucune interrogation des capacités d'un fournisseur avant l'appel. Le repli d'une forme sur l'autre est donc silencieux, ce que le §5 du plan interdit explicitement |
| Preuve | [ai-sdk.dev](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) |
| Licence | Apache-2.0, compatible |
| Coût réel | Gratuit. Le coût réside dans les appels au fournisseur, hors de l'outil |
| Sans clé d'API | Conforme : le mode hors ligne n'appelle rien, et la bibliothèque n'est chargée que sur le chemin en ligne |
| Sans Figma ouvert | Conforme |
| Pas de lecture du contrat au runtime | Conforme |
| Aucune logique liée au nom d'un composant | Conforme, la signature d'une question ne nomme rien |
| Portabilité entre stacks | TypeScript seul. Un adaptateur hors processus en Python ou en Go n'en profite pas, mais le port fournisseur vit dans le noyau, qui est en Node |
| Maturité | `ai` 7.0.109, publié le jour de ce relevé, cinq mainteneurs, éditeur Vercel. Rythme de publication quotidien, et deux ruptures de forme majeures depuis la version 3 |
| Coût d'intégration contre coût d'écriture | Il retire les quatre fichiers `fournisseurs/` du §10.1, soit la plus grosse part du lot 4. Le refus avant appel, le journal d'usage normalisé et les deux tours du §10.3 restent à écrire |
| Réversibilité | Bonne si le port `fournisseur.mjs` reste la seule frontière. Le rythme de rupture de forme de cette bibliothèque en fait le risque principal |
| Verdict | **Adopter partiellement.** Elle porte l'appel et le schéma ; elle ne porte pas le refus, qui est la clause du plan |

Les autres candidats, en une ligne chacun :

| Candidat | Verdict et raison |
|---|---|
| LiteLLM | Écarté. Python, alors que le noyau est en Node. Un mandataire distant sur le chemin nominal violerait en plus le §10.6 |
| OpenRouter | Écarté. Service distant, un seul point de passage, contraire au §10.6 |
| Instructor | Écarté. Même famille que la bibliothèque `ai`, sans avantage sur le refus avant appel |
| BAML | Écarté. Apache-2.0, mais il introduit un langage dédié et sa chaîne de compilation pour une tâche dont le schéma est déjà dérivé du jeu de questions |
| Outlines | Écarté. Apache-2.0. Il contraint la génération au niveau des jetons, ce qui demande l'accès aux logits, donc un modèle local. Le chemin nominal du module passe par des API distantes |
| `ajv` | **Adopter.** Version 8.20.0, MIT. Déjà une dépendance des lecteurs du kit. Il valide le relevé de décisions contre le schéma dérivé, sans rien ajouter à l'arbre de dépendances |

### 10.3. Sous-partie 12 : le remplacement exact de fragments

Le besoin du mode `possede` est précis : remplacer une table générée dans un
fichier que le développeur possède, et échouer proprement s'il l'a modifiée. Le
§9 du plan décrit déjà la méthode : produire le fragment attendu pour l'ancien
contrat, le chercher, le remplacer par celui du nouveau, et traiter l'absence
comme un échec.

Cette méthode est une comparaison de chaînes. Elle n'a besoin d'aucun arbre
syntaxique, et elle a une propriété que les outils d'arbre n'ont pas : une
modification du développeur fait échouer la recherche, ce qui est le
comportement demandé. Un outil d'arbre retrouverait la table malgré la
modification et l'écraserait.

| Candidat | Version, licence | Ce qu'il apporterait | Verdict |
|---|---|---|---|
| Région délimitée par commentaires | Convention, sans paquet | Le repérage, et la relecture. Le marqueur `linguist-generated` de `.gitattributes` replie le diff d'un fichier généré sur les plateformes Git | **Adopter la convention.** Elle coûte deux lignes |
| `ts-morph` | 28.0.0, MIT | Le repérage d'une déclaration par son nom, sans marqueur | **Second recours.** À employer si le mainteneur refuse les marqueurs dans le corpus existant. Il est déjà tiré par `parite.mjs` |
| `jscodeshift` | 17.4.0, MIT | La transformation en lot sur plusieurs fichiers | Écarté. Le besoin porte sur un fragment connu d'un fichier connu |
| `recast` | 0.24.0, MIT | La réimpression d'un arbre en préservant la mise en forme | Écarté, sauf par `magicast` |
| `magicast` | 0.5.5, MIT | Une interface simple au-dessus de `recast` pour du code peu structuré | Écarté. Il vise les fichiers de configuration, pas une table de quatre-vingt-dix entrées |

**Verdict de la sous-partie 12 : écrire nous-mêmes**, avec la convention de
région délimitée, et `ts-morph` en second recours.

### 10.4. Sous-partie 13 : le diff structuré

Le §8.3 du plan pose que les quatre cas du cycle se décident en comparant deux
jeux de questions, objets que le compilateur produit lui-même.

| Candidat | Version | Licence | Dernière publication | Verdict |
|---|---|---|---|---|
| `microdiff` | 1.6.0 | MIT | 2026-08-02 | **Adopter.** Sans dépendance, rend un tableau de changements typés par chemin, ce qui est la forme attendue par les quatre cas |
| `deep-object-diff` | 1.1.9 | MIT | 2022-11-12 | Écarté. Aucune publication depuis près de quatre ans, et sa sortie est un objet imbriqué, moins commode qu'une liste de chemins |
| `json-diff-ts` | 4.10.4 | MIT | 2026-04-06 | Écarté au profit de `microdiff`. Il vise le diff avec clés de correspondance dans des tableaux, besoin que le jeu de questions n'a pas, puisqu'une question porte déjà sa signature |

`microdiff` retire une petite fraction du lot 5, de l'ordre d'une demi-session.
L'inversion du graphe de `composes` pour trouver les dépendants, au §8.2, reste
à écrire, et le kit porte déjà la validation de ce graphe.

## 11. Sous-parties 14 et 15 : relevé de décisions, budgets et journal

### 11.1. La pratique nommée existe, et elle ne se rejoue pas

La pratique nommée du relevé de décisions est le relevé de décision
d'architecture, et sa forme la plus employée est un
[gabarit Markdown](https://adr.github.io/madr/) en version 4.0.0. Le site
[adr.github.io](https://adr.github.io/) en porte le catalogue.

| Champ | Relevé |
|---|---|
| Ce qu'il couvre | La forme d'un fichier commité qui retient une décision, son contexte et ses conséquences, et la règle du journal en ajout seul : une décision qui change s'écrit dans un nouveau relevé qui remplace l'ancien |
| Ce qu'il laisse dehors | Le rejeu. Un relevé de décision d'architecture s'écrit pour un humain, ne porte ni signature calculée ni domaine fermé, et aucun outil ne le relit pour remplir une réponse. Le §4.4 du plan demande l'inverse : une clé calculée sur des caractéristiques, et une résolution sans appel |
| Preuve | [adr.github.io](https://adr.github.io/), [MADR](https://adr.github.io/madr/) |
| Licence | Gabarits sous licence permissive, à vérifier au fichier avant reprise |
| Coût | Gratuit |
| Coût d'intégration contre coût d'écriture | Il retire le choix d'une forme, pas son implémentation. Le lot 4 garde `memoire.mjs` et `decisions.mjs` entiers |
| Verdict | **Écrire nous-mêmes**, en reprenant deux règles du gabarit : le journal en ajout seul, et le champ de provenance |

La règle du journal en ajout seul mérite d'être posée, parce que le §5 du plan
donne quatre valeurs à `source` et qu'une correction humaine ne doit jamais
repartir au modèle. Un relevé qui remplace au lieu d'écraser rend cette garantie
lisible dans Git.

### 11.2. Sous-partie 15 : le journal de coût

Aucun outil ne couvre la boucle bornée ni le plafond de dépense. Une seule
chose vaut d'être reprise du dehors : les noms.

| Champ | Relevé pour les conventions sémantiques GenAI d'OpenTelemetry |
|---|---|
| Ce qu'il couvre | Un vocabulaire d'attributs pour un appel de modèle, dont `gen_ai.usage.input_tokens` et `gen_ai.usage.output_tokens`, stable pour les opérations de conversation |
| Ce qu'il laisse dehors | Tout le reste : la boucle, le budget, le prix appliqué, l'empreinte du dossier. Les conventions d'orchestration et d'outils y sont encore provisoires |
| Preuve | [opentelemetry.io, attributs Gen AI](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) |
| Licence | Spécification, reprise de noms sans code |
| Coût | Gratuit, et sans dépendance : le journal reste un fichier JSON |
| Coût d'intégration contre coût d'écriture | Il retire le choix des noms de champs de `journal.mjs`, ce qui est faible mais rend le relevé lisible par un outil d'observation si le besoin apparaît |
| Verdict | **Adopter les noms seuls.** Aucune bibliothèque, aucun collecteur, aucun serveur |

Le §10.5 pose qu'un budget atteint rend `echec`. Aucun outil du marché ne
connaît cette règle, qui appartient à l'orchestrateur.

## 12. Ce que le module garde en propre

C'est la liste de ce qu'aucun outil instruit ne couvre, et elle est la valeur
spécifique du projet.

| Ce qui reste en propre | Pourquoi aucun outil ne le couvre |
|---|---|
| La représentation intermédiaire qui porte le chemin de contrat de chaque fragment | C'est ce lien qui permet à la porte de rattacher un écart de rendu à un champ. Aucune représentation du marché ne transporte la provenance |
| Les trois règles d'adressage du §3.4 | Résoudre une adresse contre la vue du variant et non contre `structure`, lire `viewIcons[].slotPath` comme seule adresse d'icône, et traiter une entrée de `variants[]` comme une description complète. Ce sont des règles du format UCM |
| L'émission d'une règle par combinaison, avec la remise à zéro entre états | Éprouvé absent des six bibliothèques de recettes. Elles fusionnent toutes base et variantes |
| Le refus d'un état dont le nom est inconnu | Le format ouvre ce cas, le corpus ne le porte pas, et aucun outil ne sait qu'il faut refuser plutôt qu'émettre |
| Le jeu de questions, ses six genres et leurs domaines fermés | Les domaines sont dérivés du contrat et des capacités déclarées de l'adaptateur. Aucun catalogue extérieur ne les connaît |
| La signature d'une question, calculée sans nom de composant | L'invariant d'AGENTS.md n'a aucun équivalent ailleurs |
| Le refus d'un fournisseur avant appel | Les bibliothèques de sortie structurée replient silencieusement sur une autre forme |
| Le mode hors ligne comme mode nominal | Tous les produits instruits supposent un service |
| La résolution des valeurs attendues par un second chemin | La porte lit les références du contrat contre la feuille de `ucm tokens css`, jamais par le code de transformation. Aucun outil ne porte cette exigence d'indépendance |
| Les vingt et une caractéristiques et les aides qui les couvrent | Ce catalogue existe déjà dans le kit, et il n'a pas d'équivalent public |

## 13. Les décisions que ce relevé ouvre

Numérotées à la suite des quatorze du §17 du plan de l'implémenteur.

| N | Décision | Où elle se pose | Ce qu'elle change |
|---|---|---|---|
| 15 | Playwright est-il adopté pour le port vérificateur, ou la porte reste-t-elle à instruire ? | §9.2 de ce relevé, lot 3 | Environ la moitié du lot 3, et la seule façon connue de voir un sélecteur que l'hôte ne porte pas |
| 16 | Le port fournisseur s'appuie-t-il sur la bibliothèque `ai`, au prix de son rythme de rupture de forme, ou les quatre fichiers `fournisseurs/` sont-ils écrits ici ? | §10.2 de ce relevé, lot 4 | La plus grosse part du lot 4, et l'exposition à une dépendance qui publie tous les jours |
| 17 | Le mode `possede` repose-t-il sur des marqueurs de région dans les fichiers existants, ou sur un repérage par `ts-morph` sans marqueur ? | §10.3 de ce relevé, lot 2 | Ce que l'équipe accepte de voir apparaître dans les quatre fichiers écrits à la main, et le comportement en cas de modification par le développeur |
| 18 | Zag.js est-il déclaré dès maintenant comme capacité d'adaptateur, ou attend-il qu'un contrat porte un composant à machine ? | §6.2 de ce relevé, lot 6 | Le contenu du catalogue de capacités, et le domaine du genre `accessibilite` |
| 19 | CONCEPT.md cite Backlight, qui n'existe plus, parmi les outils comparés. La table est-elle corrigée, et avec quoi ? | §2.1 de ce relevé | L'exactitude d'un document d'autorité |
| 20 | Le relevé de décisions reprend-il la règle du journal en ajout seul, ou écrase-t-il une réponse corrigée ? | §11.1 de ce relevé, lot 4 | La lisibilité dans Git d'une correction humaine, et la garantie qu'une réponse `humain` ne repart pas au modèle |

## 14. Ce que ce relevé n'a pas pu trancher

### 14.1. Les points où la recherche contredit les documents du dossier

Le plan au §3.2 et l'audit au point 7.1 écrivent tous deux que
`packages/cli/aides/` porte vingt-neuf fichiers. Le dossier en porte vingt-huit
au moment de ce relevé. Le décompte des vingt et une caractéristiques de
`caracteristiques.mjs` est en revanche exact, vérifié nom par nom. L'écart d'une
aide ne change aucune conclusion du plan, et sa cause n'a pas été cherchée :
l'architecte tranche s'il faut corriger le chiffre ou retrouver l'aide.

Aucune autre contradiction n'est apparue. Les affirmations du plan sur le
marché, en particulier le fait qu'aucun outil ne couvre le pipeline, sont
confirmées.

### 14.2. Ce qui manquait pour trancher

| Point | Ce qui manquait |
|---|---|
| La couverture réelle de Supernova, zeroheight et Knapsack sur la sous-partie 1 | Un compte sur chacune des trois. Leurs documentations décrivent des exportateurs de tokens et de documentation, jamais l'émission d'un composant depuis une spécification ; l'absence n'est pas établie pour autant |
| L'activité de quest.ai | Aucune source primaire datée n'a été trouvée sur l'état du produit |
| Les tarifs Locofy | Les sources secondaires se contredisent, de 9 à 99,9 USD par mois, et la page officielle n'a pas rendu de chiffre |
| La part de la porte que Playwright retire vraiment | Une exécution. L'estimation d'une demi-part du lot 3 n'a pas été mesurée |
| Le comportement de la bibliothèque `ai` face à un fournisseur sans sortie structurée native | Un appel réel à deux fournisseurs. La documentation ne publie pas d'interrogation des capacités ; si un repli silencieux existe, il n'a pas été observé |
| Le coût des six bibliothèques de recettes sur les quatre non éprouvées | Quatre essais de plus. Le verdict repose sur le modèle de fusion qu'elles partagent avec les deux éprouvées, ce qui est un raisonnement, pas une mesure |
| La reprise de Zag.js | Un contrat de composant à machine, que le corpus n'offre pas |
