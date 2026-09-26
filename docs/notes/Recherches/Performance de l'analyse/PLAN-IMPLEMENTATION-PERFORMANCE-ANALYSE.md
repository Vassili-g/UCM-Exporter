# Plan d'implémentation : accélérer l'analyse d'un composant

## Résultat attendu

L'analyse ne charge plus que les pages qui portent les maîtres des
dépendances du composant, sous réserve de la sonde S6. Elle y cherche les
conteneurs de règles sans descendre dans les calques masqués d'instance. Le
contrat ne dépend que du fichier Figma. Chaque maître d'instance est
résolu une fois par analyse. Une retouche ne fait rebalayer que sa page. Un
changement de sélection arrête l'analyse après au plus 200 ms de calcul, plus
la durée de l'appel Figma en cours. Si la sonde S2 le permet, l'index est prêt
avant le clic.

Ce plan est destiné à l'agent qui réalisera les changements. Il applique la
[conception](./CONCEPTION-PERFORMANCE-ANALYSE.md), qui fait autorité sur tout
choix technique et porte les décisions du mainteneur. Les tâches marquées
**[mainteneur]** se font dans Figma Desktop ou demandent sa validation :
l'agent prépare ce qu'elles consomment et ne les exécute pas.

## Autorités

Lire dans cet ordre :

1. la [conception](./CONCEPTION-PERFORMANCE-ANALYSE.md), sections 2, 4 et 5 ;
2. le [plan de recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md),
   section 6, pour le protocole de mesure ;
3. [AGENTS.md](../../../../AGENTS.md), groupes « Composition » et « Écriture
   dans le document », puis « Vérification » ;
4. [SPEC.md](../../../../packages/plugin-exporter/SPEC.md), section 7 ;
5. [CONTRIBUTING.md](../../../../CONTRIBUTING.md), sections « Code »,
   « Rédiger un document » et « Messages destinés au designer ».

Avant d'écrire un commentaire ou un document, charger la skill
[`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md).
Avant de toucher à un message destiné au designer, charger aussi
[`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md).

## Règles de travail

- Chaque tâche cochée finit par un commit sur `main`, poussé aussitôt. Le
  commit passe par `git commit --only` suivi des chemins de la tâche : d'autres
  sessions travaillent dans le même arbre. Un fichier neuf s'ajoute par
  `git add <chemin>` avant ce commit. Relire `git status` après.
- `npm test`, `npm run typecheck` et `npm run build` passent dans un worktree
  isolé avant chaque commit. Figma charge `packages/plugin-exporter/dist/code.js`
  de la copie de travail : à la fin de chaque lot, reconstruire le plugin dans
  la copie de travail pour le mainteneur.
- Une loi nouvelle se voit rouge avant d'être crue : casser ce qu'elle protège,
  constater l'échec, restaurer par copie, jamais par `git checkout --`. Le
  message de commit le dit.
- Aucun `.contract.json` commité ne sert de preuve.
- Un code dont l'antislash ou l'accent grave compte s'écrit avec les outils
  d'édition, jamais par un heredoc du shell.
- Un message destiné au designer ne s'écrit pas sans la validation du
  mainteneur. L'agent propose le texte sous la tâche, avec au moins deux
  rédactions, et passe à la suite.
- Une tâche bloquée s'arrête. L'agent écrit le constat sous la tâche, puis
  passe au lot suivant quand celui-ci n'en dépend pas.

## Ordre d'exécution

| Lot | Contenu | Dépend de | Porte |
|---|---|---|---|
| L0 | Trace de mesure, scripts des sondes | | |
| M0 | Mesure de départ et sondes **[mainteneur]** | L0 | |
| L1 | Portée d'analyse, maîtres, `contientDesInstances`, banc de parité | L0 | |
| L2 | Index par pages des maîtres (D1, D4) | L1 | S6 pour le repli |
| L4 | Rendre la main | L1 | |
| L3 | Préchauffage | L2 | Seuil de S2 atteint |
| M1 | Mesure après L1 à L4 **[mainteneur]** | L2, L4 | |
| L5 | Accélérations conditionnelles | M1 | Seuils de la conception, section 5.7 |
| L7 | Documents | chaque lot | |
| L8 | Mesure dans le build courant, barre d'avancement | L4 | |
| L9 | Mesure de la structure, affichage de l'avancement, accélération | L8 | Trace de L9.3 pour L9.8 |

L4 ne dépend que de L1 et peut passer avant L2.

## État au 2026-09-26

L0, L1, L2, L4 et L8 sont faits et poussés sur `main`, avec L7.1 à L7.3. Le
plugin de la copie de travail est reconstruit. Le mainteneur a testé L1 à L4
dans Figma sans voir d'analyse plus rapide. L8 rend la mesure visible dans le
plugin, à chaque analyse : c'est elle qui dira où le temps passe. Le reste
attend le mainteneur :

1. M0, la mesure de départ, sur le commit `97095bb` (L0 seul, voir M0.2) ;
   à défaut, les traces de L8 sur `main` suffisent à décider L5 ;
2. S6, qui décide L2.8 ;
3. le choix d'une des deux rédactions de L2.9 ;
4. S2 (L3.0), qui ouvre ou retire L3 ;
5. M1, qui décide chaque tâche de L5.

L7.4 se fait en fin de plan.

## Lot L0 : trace de mesure et sondes

- [x] **L0.1** Créer `packages/plugin-exporter/src/contract/mesure.ts` :
  `ouvrirLaMesure()`, `etape(nom)` qui clôt l'étape précédente,
  `compter(nom, n = 1)`, `fermerLaMesure(content)` qui calcule l'empreinte et
  imprime la trace. Champs : conception, section 5.1. Toutes les fonctions
  sont sans effet quand `__UCM_MESURE__` vaut faux ou n'est pas défini.
  *Fait. La garde est écrite en ligne dans chaque fonction : esbuild ne
  replie pas l'appel d'une fonction qui rend `false`.*
- [x] **L0.2** Déclarer `__UCM_MESURE__` dans un fichier `.d.ts` du plugin.
  Ajouter `--define:__UCM_MESURE__=false` à `build:code` dans
  `packages/plugin-exporter/package.json`, et un script `build:code:mesure` qui
  passe `true`. Vérifier que la chaîne `[ucm:mesure]` est absente du bundle de
  `build:code`.
  *Fait, avec un écart : `--define` seul laisse `if (false) { … }` et la chaîne
  dans le bundle (esbuild 0.28.2, sans minification). Les deux scripts passent
  donc aussi `--minify-syntax`, qui retire le code mort. La chaîne est absente
  du bundle de `build:code` et présente dans celui de `build:code:mesure`. La
  déclaration est dans `src/build.d.ts`.*
- [x] **L0.3** Poser les étapes dans `handleExportComponent`, et les compteurs
  qui ne demandent aucun point de passage nouveau : `appelsGetAllNodes` et
  `nodesParcourus` dans `getAllNodes`, `pagesChargees` et `pagesBalayees` dans
  l'index actuel, `tailleIndex`.
  *Fait. `handleExportComponent` ouvre et ferme la trace autour de
  `exporterLaSelection`, et chaque annonce ouvre une étape. Le compteur
  `appelsFindAllWithCriteria` est posé dans le relevé des calques
  `component-name`.*
- [x] **L0.4** Tests dans `tests/mesure.test.ts` : sans la constante, aucune
  sortie console et un contrat inchangé ; avec la constante posée sur
  `globalThis`, une seule sortie `[ucm:mesure]` par analyse ; l'empreinte est
  la même pour deux exports du même composant à deux dates, et change quand le
  composant change.
  *Fait. Vus rouges : garde retirée d'`ouvrirLaMesure` et de
  `fermerLaMesure`, `console.log` retiré, date non neutralisée dans
  l'empreinte.*
- [x] **L0.5** Écrire un script par sonde S1, S2, S5 et S6 dans
  `docs/notes/Recherches/Performance de l'analyse/sondes/`, à coller dans la
  console d'un plugin de développement. Chaque script imprime son constat et
  n'écrit rien dans le document. S2 porte le battement et le seuil de la
  conception, section 6, et rejoue le calcul de L2 sur le composant
  sélectionné ; tant que L2 n'existe pas, il charge les pages des maîtres des
  instances de la sélection.
  *Fait : `sondes/S1-nodechange.js`, `S2-prechauffage.js`,
  `S5-ordre-findAll.js`, `S6-page-du-maitre.js`. S2 rejoue le calcul en tours
  de la conception, section 5.4, avec un battement `setTimeout(0)`.*
- [x] **L0.6** Documenter dans le
  [README du plugin](../../../../packages/plugin-exporter/README.md) comment
  produire le build de mesure et lire la trace.
  *Fait : section « Mesurer une analyse ».*

## Lot M0 : mesure de départ et sondes [mainteneur]

- [ ] **M0.1** **[mainteneur]** Préparer le corpus C1, C2, C3 selon le plan de
  recherche, section 6. C3 est un fichier jetable. Décrire chaque fichier par
  ses nombres de pages, nodes, variants et instances imbriquées.
- [ ] **M0.2** **[mainteneur]** Avec `build:code:mesure`, relever les traces à
  froid, à chaud et après retouche, cinq fois chacune. Consigner médiane et
  maximum par étape et par compteur dans `MESURES-PERFORMANCE-ANALYSE.md`, dans
  ce dossier, avec la version de Figma et les empreintes.
  *L1, L2 et L4 sont déjà sur `main` : le départ se mesure sur `97095bb`,
  qui ne porte que la trace. Extraire ce commit dans un worktree, y lancer
  `npm ci`, puis dans `packages/plugin-exporter` `npm run build:code:mesure`,
  `npm run build:ui` et `npm run build:manifest`, et importer ce manifeste
  dans Figma. M1 se mesure ensuite sur `main`, où L8 a retiré
  `build:code:mesure` : la trace y court dans le build courant, et « Copier la
  trace » du pied de page la rend.*
- [ ] **M0.3** **[mainteneur]** Lancer S1, S5 et S6, et consigner les constats
  dans le même fichier. S2 se lance après L2.
  *Les scripts sont dans `sondes/`, chacun avec son déroulé en tête.*

## Lot L1 : portée d'analyse, maîtres et banc de parité

- [x] **L1.1** Créer `packages/plugin-exporter/src/contract/porteeDAnalyse.ts`
  avec `dansUnePorteeDAnalyse`, `maitreDe` et `respirerSiBesoin` (sans effet
  jusqu'à L4). Une seule portée ouverte à la fois ; une seconde ouverture
  exécute son corps sans mémoire et compte `porteeRefusee`. `maitreDe` range une
  `Promise` par `instance.id`, rend `null` sur un échec ou une méthode absente,
  compte `appelsGetMainComponentAsync` et `maitresReutilises`. Exporter un
  interrupteur `desactiverLaPorteePourLeBanc`, réservé au banc de L1.3, et le
  dire dans son commentaire.
  *Fait. Le sandbox n'a pas de contexte asynchrone : pendant une ouverture
  refusée, la mémoire se tait pour les deux corps, et chacun calcule sans
  elle. Un id d'instance absent n'entre pas en mémoire.*
- [x] **L1.2** Remplacer l'appel direct à `getMainComponentAsync` par
  `maitreDe` dans `contractedOwner`, `indexMasterInstances`, `scoreWrapper`,
  `instanceOwnerId` et `dependencyOpacity`. Ne toucher ni à `isRuleInstance`
  ni à `src/template/`. Ouvrir la portée dans `handleExportComponent`, autour
  de tout le corps, fermée dans un `finally`.
  *Fait. Seul écart de comportement : une instance sans
  `getMainComponentAsync` faisait lever `contractedOwner` ; elle y reçoit
  désormais l'avertissement du maître introuvable. Le cas n'existe que dans un
  faux `figma`.*
- [x] **L1.3** Créer `tests/paritePerformance.test.ts` : chaque composant
  simulé de `exportComponent.test.ts` est exporté avec la portée puis sans ;
  les deux `content` sont égaux après remplacement de `exportedAt`. Extraire au
  besoin le montage des mocks dans un module de `tests/` partagé, sans changer
  ce que les tests existants vérifient. Voir le banc rouge en faisant rendre à
  `maitreDe` le maître d'une autre instance, puis restaurer.
  *Fait, sans extraire les mocks : le banc (`tests/aides/parite.ts`) se pose
  sur le chemin d'appel de `figmaFaux.handleExportComponent`, comme les lois.
  Chaque scénario d'`exportComponent.test.ts`, d'`imbriques.test.ts` et de
  `diagnosticsComposantReel.test.ts` y passe, y compris ceux qu'on ajoutera.
  `paritePerformance.test.ts` y soumet un set à dépendances répétées. Vu
  rouge : `maitreDe` qui rend le premier maître gardé fait échouer deux
  scénarios de wrapper et le test de compte.*
- [x] **L1.4** Test de compte : un set de huit variants qui embarquent chacun
  deux instances d'une même dépendance appelle `getMainComponentAsync` au plus
  une fois par id d'instance.
  *Fait, dans `paritePerformance.test.ts`. Les instances portent une opacité,
  qui fait relire le maître par `dependencyOpacity` : sans elle, chaque
  instance n'était lue qu'une fois, mémoire ou pas, et le test ne voyait pas
  la mémoire retirée. Vu rouge : trois lectures par instance sans mémoire.*
- [x] **L1.5** Ajouter `contientUneInstanceRendue(racine)` à
  `exportableNodes.ts` (conception, section 5.3) et l'employer dans
  `handleExportComponent`. Tests : instance visible, instance masquée sans
  liaison, instance sous un cadre masqué, instance masquée dont la visibilité
  est liée à une propriété, racine sans instance, runtime sans
  `findAllWithCriteria`. Chaque cas compare le résultat à celui de
  `getAllNodes(racine).some(…)`.
  *Fait. Vus rouges : remontée des ancêtres coupée, masque jugé sans ses
  liaisons, repli sur `findAll` vide.*

## Lot L2 : index par pages des maîtres (D1, D4)

- [x] **L2.1** Renommer `indexContractedNames(page)` en `nomsDeLaPage(page)` et
  suivre ses appelants, tests compris. Y poser
  `figma.skipInvisibleInstanceChildren = true` autour du relevé synchrone,
  restauré dans un `finally` par `figma.skipInvisibleInstanceChildren = avant`.
  *Fait. Les tests qui appellent `nomsDeLaPage` sans document simulé reçoivent
  un `figma` minimal, et le faux `findAllWithCriteria` de
  `composedComponents.test.ts` saute les calques masqués d'instance quand le
  drapeau est posé, comme Figma.*
- [x] **L2.2** Étendre la loi du drapeau dans `loiDuDocumentIntact.test.ts` :
  deux fichiers autorisés, `src/template/sources.ts` et
  `src/contract/composedComponents.ts` ; dans chacun, pose, restauration après
  la pose, aucun `await` entre les deux. La voir rouge en ajoutant un `await`
  dans le bloc du second fichier, puis restaurer.
  *Fait. Vue rouge : un `await` ajouté dans le bloc de `nomsDeLaPage`.*
- [x] **L2.3** Écrire `indexContractedNames(variants, options)` selon la
  conception, section 5.4 : calcul en tours, page de chaque propriétaire local
  par la remontée de ses parents, critère D1, propriétaire distant jamais
  contracté, résultat en noms compactés. Supprimer
  `indexContractedNamesInDocument`, `ecouterLesChangements` et l'abonnement à
  `documentchange`.
  *Fait. Le premier tour relève les instances rendues des variants, par
  `getAllNodes`, comme `scanComposedMatrix` et `releverLesImbriques`. Les tours
  suivants relèvent toutes les instances du maître contracté, masquées
  comprises, parce que `indexMasterInstances` les parcourt toutes, et les
  instances rendues de son variant représentatif. Un maître sans page
  (remontée qui n'atteint pas de `PAGE`) laisse son propriétaire non
  contracté ; L2.8 dira si ce cas existe dans Figma.*
- [x] **L2.4** Mémoire par page : entrée, `loadAsync`, abonnement
  `page.on('nodechange')`, entrée propre, balayage. Un seul calcul en vol ;
  un appel qui arrive pendant un calcul l'attend, puis rebalaye les pages
  salies entre-temps, en deux tours au plus. Accepter `avantChaquePage` et
  `priorite`. Ajouter `oublierLaPage(page)`, l'appeler dans `creerRegles` à la
  place de `oublierLIndexDuDocument()`, et garder ce dernier pour les tests.
  *Fait. Les calculs passent en file : chacun attend le précédent, succès ou
  échec, puis relit la mémoire, où les pages salies entre-temps se
  rebalayent. `priorite` est accepté ; il prend effet avec L4.2 et L3.2.*
- [x] **L2.5** Brancher l'index dans `handleExportComponent` à la place de
  l'appel actuel, sous la garde `contientUneInstanceRendue`. Brancher dans la trace
  `pagesReutilisees`.
  *Fait, en priorité `analyse`. Trois scénarios d'`exportComponent.test.ts` et
  un de `diagnosticsComposantReel.test.ts` posaient le set de leur dépendance
  hors de toute page : il est désormais sur la page du fichier simulé, et
  leurs contrats sont inchangés.*
- [x] **L2.6** Tests dans `composedComponents.test.ts`, qui remplacent les trois
  tests sur `documentchange` : les cas « Index » de la conception, section 7 ;
  seules les pages des maîtres sont chargées, jamais les autres ; tours
  successifs pour une dépendance de dépendance ; `loadAsync` qui lève, l'appel
  lève ; appel concurrent. Garder vert « un composant sans instance ne charge
  pas les autres pages du document ». Dans `code.test.ts` : `oublierLaPage`
  après `creerRegles`.
  *Fait : onze tests. Vus rouges, chacun sous sa mutation : critère D1
  retiré, maître distant jugé, drapeau non posé, document entier chargé,
  second tour retiré, page gardée jamais reprise, `nodechange` sans effet,
  abonnement refusé tenu pour posé, `oublierLaPage` sans effet, chargement
  en échec avalé, file bloquée par un échec, calculs concurrents, remontée
  vers la page coupée.*
- [x] **L2.7** Loi dans `loiDuDocumentIntact.test.ts` : aucun fichier de
  `src/contract/` n'appelle `loadAllPagesAsync` hors commentaire. La voir rouge,
  puis restaurer.
  *Fait. Vue rouge : `await figma.loadAllPagesAsync()` ajouté dans
  `nomsGardesDeLaPage`.*
- [ ] **L2.8** Après le constat de S6 : si le maître ne donne pas sa page sans
  chargement, charger les pages une à une, page courante en tête, jusqu'à
  trouver celle qui contient le maître, et documenter ce repli dans le code.
  Sinon, noter sous cette tâche que le repli n'est pas nécessaire, avec la
  version de Figma.
  *En attente de S6 (M0.3). Sans repli, un maître dont la remontée
  n'atteint pas de page laisse sa dépendance non contractée : le contrat du
  parent décrit alors ses calques.*
- [ ] **L2.9** Relever les messages destinés au designer qui disent où poser
  les règles ou qui parlent d'une dépendance sans règles
  (`extractRules.ts`, `imbriques.ts`, `src/ui/`). Pour chacun que D1 rend
  inexact, proposer au mainteneur deux rédactions sous cette tâche. Ne rien
  modifier avant sa validation.
  *Relevé fait. Un seul message devient inexact : le point « imbriqué sans
  règles » de `pointsDesImbriques` (`imbriques.ts`), dans le cas local. Quand
  les règles de l'imbriqué existent sur une autre page que son maître, il
  affirme qu'elles manquent et demande de les créer. L'index ne peut pas
  distinguer ce cas sans charger les autres pages, donc le texte doit couvrir
  les deux. Le cas distant reste exact, le message de `extractRules.ts` porte
  déjà sur la page active, et les textes de `src/ui/` parlent de la source
  `.componentRules`, que D1 ne touche pas.*

  *Rédaction A, titre et action :*

  > Le composant « Parent » intègre « Enfant », dont les règles d’usage ne
  > sont pas sur sa page.
  >
  > Sélectionnez le composant principal « Enfant », puis créez et complétez
  > ses règles d’usage. Si elles existent sur une autre page, déplacez leur
  > conteneur à côté de « Enfant ». Relancez ensuite l’analyse de « Parent ».

  *Rédaction B, titre inchangé hors de la page, action en deux cas :*

  > Le composant « Parent » intègre « Enfant », qui n’a pas de règles d’usage
  > sur sa page.
  >
  > Si « Enfant » n’a pas encore de règles, sélectionnez son composant
  > principal, puis créez-les et complétez-les. Si elles sont rangées sur une
  > autre page, déplacez leur conteneur sur la page de « Enfant ». Relancez
  > ensuite l’analyse de « Parent ».

  *La variante du titre qui liste les propriétés (« dont 2 propriétés ne sont
  pas documentées : ») reste exacte dans les deux rédactions ; seule l’action
  change. Rien n’est modifié avant le choix du mainteneur.*

## Lot L4 : rendre la main

- [x] **L4.1** Donner à `respirerSiBesoin` son budget de 30 ms et le compteur
  `respirations`. `handleExportComponent` reçoit `respirer` dans ses options et
  le passe à la portée. `analyser` fournit `setTimeout(0)` suivi de
  `verifierAnnulation()`.
  *Fait. Le budget est `BUDGET_DE_CALCUL_MS` dans `porteeDAnalyse.ts`.
  `creerRegles` n'annule rien et ne passe pas `respirer`.*
- [x] **L4.2** Appeler `respirerSiBesoin` entre deux tranches de 16 variants
  dans `scanComposedMatrix`, à chaque tour de la boucle par variant de
  `extractStructure`, et entre deux pages de l'index en priorité `analyse`.
  *Fait. Les tranches de `scanComposedMatrix` se relèvent l'une après
  l'autre, et l'ordre des relevés reste celui des variants. La boucle de
  `extractStructure` respire en tête de chaque tour, donc avant chaque
  variant.*
- [x] **L4.3** Tests : une annulation posée pendant la boucle de
  `extractStructure` arrête l'analyse avant le variant suivant et ne publie
  rien ; un set de 40 variants produit le même contrat et les mêmes
  avertissements, dans le même ordre, avec et sans tranches ; hors portée,
  `respirerSiBesoin` ne rend jamais la main.
  *Fait, dans `paritePerformance.test.ts`, avec une horloge qui avance de
  31 ms à chaque lecture. « Ne publie rien » se prouve dans `code.test.ts` :
  une respiration qui suit un changement de sélection arrête l'analyse, sans
  verdict ni téléchargement. Vus rouges : respiration retirée de la boucle,
  `verifierAnnulation` retiré de `respirer`, tranche perdue après une
  respiration, respiration hors portée.*

## Lot L3 : préchauffage

- [ ] **L3.0** **[mainteneur]** Lancer S2 sur le corpus, cinq fois à froid par
  fichier, et consigner le plus grand écart de battement. Si un écart dépasse
  100 ms, ou si le canevas s'arrête pendant le défilement, écrire « L3 retiré »
  sous cette tâche. L'agent coche alors L3.1 à L3.3 avec la mention « non
  réalisée ».
  *L2 existe : S2 peut se lancer (`sondes/S2-prechauffage.js`). L3.1 à L3.3
  attendent son constat.*
- [ ] **L3.1** Dans `reportSelectionState`, lancer `indexContractedNames` en
  priorité `fond` quand la cible est exportable
  et qu'un variant satisfait `contientUneInstanceRendue`. Passer
  `laisserPasserLesOperations` comme `avantChaquePage`. Une erreur du
  préchauffage est avalée : l'analyse la retrouvera et la dira.
- [ ] **L3.2** En priorité `analyse`, le calcul en vol remplace
  `avantChaquePage` par un `setTimeout(0)` tant que l'analyse attend.
- [ ] **L3.3** Tests dans `code.test.ts` : une sélection de composant à
  instances lance le calcul ; une sélection sans instance ne charge aucune
  page ; un export de tokens ne charge aucune page ; une analyse lancée pendant
  un préchauffage suspendu ne reste pas bloquée ; deux sélections rapprochées ne
  lancent qu'un calcul.

## Lot M1 : mesure après L1 à L4 [mainteneur]

- [ ] **M1.1** **[mainteneur]** Refaire M0.2 sur le même corpus. Pour chaque
  composant dont l'empreinte a changé, vérifier par le diff des deux contrats
  que l'écart vient seulement de la reconnaissance des dépendances (D1, D4).
- [ ] **M1.2** **[mainteneur]** Sur C3, vérifier que la première analyse ne
  charge que les pages des maîtres. Sur C1, vérifier que
  `appelsGetMainComponentAsync` égale le nombre d'ids d'instance distincts.
  Relever le délai entre un changement de sélection et l'arrêt de l'analyse.

## Lot L5 : accélérations conditionnelles

Chaque tâche commence par relire M1. Si son seuil n'est pas atteint, l'agent
coche la tâche avec la mention « non réalisée », les chiffres de M1 et le
seuil.

*En attente de M1.*

- [ ] **L5.1** Relevé par variant, selon la conception, section 5.7. Test : sur
  chaque sous-arbre des mocks, la tranche égale `findAll(() => true)` ; le banc
  de parité reste vert.
- [ ] **L5.2** Règles relues. Tests : reprise sans changement ; relecture après
  un `nodechange` ; relecture après un changement de sélection.
- [ ] **L5.3** Si M1 attribue plus d'un cinquième du temps au calcul pur,
  écrire un constat qui rouvre P7. Ne rien implémenter.

## Lot L8 : mesure dans le build courant, barre d'avancement

Demandé par le mainteneur après un test de L1 à L4 dans Figma : une mesure qui
ne demande ni build dédié ni console, et un retour visuel pendant l'analyse.
Les deux dispositions ont été validées sur maquette avant le code : durée en
pied de page avec détail dépliable, barre fine sous la note avec le compte des
variants.

- [x] **L8.1** Vérifier L0 à L4 : suite complète, typecheck et bundle de la
  copie de travail.
  *Fait. 2 078 tests verts sur `dc30dd0`. `dist/code.js` date d'après L4, sans
  `loadAllPagesAsync`, avec le budget de respiration. Trois coûts restent hors
  du plan, que la trace de L8 départagera : le parcours des sources lancé à
  l'ouverture du plugin charge déjà les pages une à une jusqu'à trouver
  `.componentRules` ; `candidatsDeRegles` (`extractRules.ts`) balaie toute la
  page active deux fois, calques masqués d'instance compris ; la lecture du
  dépôt est un aller-retour réseau que l'ancienne trace ne mesurait pas.*
- [x] **L8.2** Retirer `__UCM_MESURE__`, `build:code:mesure` et
  `src/build.d.ts`. `code.ts` ouvre la trace au clic, ajoute l'étape
  `depot`, la ferme au verdict, l'imprime et l'envoie à l'interface (message
  `mesure`). Une analyse sans contrat produit jette sa trace.
  *Fait. Les étapes sont nommées par `ETAPES_DE_L_ANALYSE`
  (`exportComponent.ts`) : les annonces ne font plus d'étape.*
- [x] **L8.3** Avancement : poids par étape, `avancer(fait, total)` dans la
  boucle des variants de `extractStructure`, les tranches de
  `scanComposedMatrix` et les pages de l'index (sans compte affiché). `code.ts`
  envoie le message `avancement` à chaque annonce et à chaque respiration, au
  plus une fois par point de pourcentage. L'analyse des tokens n'a pas de barre.
- [x] **L8.4** Interface : barre de 3 px et compte « 12 / 40 » dans la note en
  chargement, hors de la région annoncée aux lecteurs d'écran ; pied de page
  « Analyse en 4,2 s », détail par étape, « Copier la trace ». Trois états de
  galerie : `analyse-par-phase` mis à jour, `analyse-boucle-des-variants`,
  `mesure-de-l-analyse`.
- [x] **L8.5** Tests : trace et avancement dans `mesure.test.ts`, compte des
  variants à chaque respiration dans `paritePerformance.test.ts`, messages
  `avancement` puis `mesure` après le verdict dans `code.test.ts`.
  *Vus rouges : avancement non envoyé à l'annonce, `avancer` retiré de la
  boucle des variants, barre qui recule, étapes pesées pour les tokens. La
  mutation qui retirait la garde d'annulation est restée verte : une
  annulation lève avant que le contrat existe, et la garde a été retirée.*
- [ ] **L8.6** **[mainteneur]** Analyser trois composants du corpus, copier
  chaque trace et la coller dans `MESURES-PERFORMANCE-ANALYSE.md`. Les durées
  par étape corrigent les poids de `ETAPES_DE_L_ANALYSE` et décident L5.

## Lot L9 : mesure de la structure, affichage de l'avancement, accélération

Demandé par le mainteneur sur la trace d'un set de 140
variants dans un fichier de plus de 50 pages : 20,6 s, dont 15,3 s pour
`structure`, 2,5 s pour `echantillons` et 1,1 s pour `depot`. L'index ne
pèse plus que 0,3 s. Figma reste figé pendant l'analyse ; le mainteneur
renonce à le libérer et demande deux choses : aller le plus vite possible, et
montrer dans la note de chargement ce qui est fait et que ça progresse.

La trace ne dit pas ce que coûte `structure`. Elle compte 29 056 appels à
`getAllNodes` pour 55 071 nodes, soit deux nodes par appel, et 145
respirations, soit une par variant : les passes de `extractStructure` hors de
la boucle des vues exactes, comme `echantillons`, n'envoient aucun
avancement.

- [x] **L9.1** Découper `structure` en étapes de la trace, dans l'ordre de
  `extractStructure` : `structure.couleurs`, `structure.election`,
  `structure.icones`, `structure.reference`, `structure.vues`,
  `structure.effets`, `structure.typographie`,
  `structure.typographie-exacte`, `structure.tailles`. Chacune entre dans
  `ETAPES_DE_L_ANALYSE`. Les poids suivent la trace ci-dessus ; ceux des
  sous-étapes sont provisoires jusqu'à L9.3.
  *Fait. `extractStructure` ouvre ses étapes ; `exportComponent.ts` n'ouvre
  plus `structure`. Vu rouge : une sous-étape retirée casse la liste des
  étapes relevées dans `mesure.test.ts`.*
- [x] **L9.2** Deux compteurs, relevés par `code.ts` : le temps passé à
  rendre la main (`msEnRespiration`) et le plus long intervalle entre deux
  contacts avec l'interface, annonce ou respiration (`plusLongSilenceMs`).
  Le second est un maximum, pas une somme.
  *Fait, par `retenirLeMaximum` (`mesure.ts`). Vus rouges : le maximum
  muet, l'annonce qui ne compte plus comme contact.*
- [x] **L9.3** **[mainteneur]** Analyser le même set de 140 variants et coller
  la trace sous cette tâche.
  *Fait. Total 27,6 s, même empreinte que la trace précédente :*

  | Étape | ms |
  |---|---|
  | `regles` | 6 524 |
  | `index` | 590 |
  | `wrapper` | 816 |
  | `structure.couleurs` | 918 |
  | `structure.election` | 764 |
  | `structure.vues` | 9 606 |
  | `structure.typographie` | 1 267 |
  | `structure.typographie-exacte` | 2 431 |
  | `echantillons` | 2 472 |
  | `depot` | 1 254 |
  | les neuf autres | 537 |

  *`plusLongSilenceMs` vaut 6 524 : toute l'étape `regles`, qui prenait
  105 ms dans la trace précédente. `msEnRespiration` vaut 1 241 pour 151
  respirations, soit 8,2 ms par `setTimeout(0)`. `structure.vues` coûte
  69 ms par variant. Les compteurs de parcours sont identiques à la trace
  précédente.*
- [x] **L9.4** Rédactions de la note de chargement, étape par étape, soumises
  au mainteneur sous cette tâche, au moins deux par étape.
  *Retenu : le texte de la passe, le compte à droite pendant une boucle, et
  le temps restant estimé dès 2 s d'analyse. Le nom du variant en cours et le
  numéro d'étape sont écartés. Textes : « Lecture des variables… »
  (`wrapper`), « Lecture des couleurs… », « Lecture de la mise en page… »
  (`structure.election`), « Lecture de chaque variant… », « Lecture de la
  typographie… », « Préparation des exemples… », « Écriture du contrat… »
  (`compaction`). Les étapes d'avant `wrapper` et la lecture du dépôt
  gardent leur texte.*
- [x] **L9.5** Maquettes des rédactions retenues, dans la galerie, face à
  l'affichage actuel.
  *Fait. État `analyse-temps-restant`. Le temps restant placé après le compte
  fait passer le texte de la passe sur deux lignes à 320 px, la largeur
  minimale du plugin. Il est donc codé sous la barre, en texte secondaire :
  « Environ 12 s restantes ». En attente de la validation du mainteneur.*
- [x] **L9.6** Revue indépendante de L9.7 et L9.8 avant le code : elles
  touchent au moteur.
  *Faite pour L9.7. Retenu : une annonce rend la main aussitôt, et seul ce
  moment compte comme contact ; le rythme du temps restant se mesure depuis
  `wrapper`, parce que `regles` et `index` dépendent du document ; les
  horloges des tests suivent `BUDGET_DE_CALCUL_MS` ; la conception dit le
  budget ; le compte tu se déclare sur l'étape prévue ; « 60 s » s'écrit
  « 1 min ». Écarté : respirer dans le `Promise.all` de
  `extractVariantTokens`. Tout son calcul précède le premier `await`, et
  des tranches pourraient changer l'ordre des avertissements du résolveur,
  pour 0,9 s de note immobile. Écarté aussi : porter `annoncer` par la
  portée d'analyse, dont le fichier porte le travail non commité d'une autre
  session.*
- [x] **L9.7** Chaque passe longue appelle `avancer` et `respirerSiBesoin`,
  et annonce son texte validé.
  *Fait. `extractStructure` reçoit `annoncer` en dernier paramètre ;
  l'élection, les deux passes de typographie et les échantillons avancent et
  respirent à chaque variant ; `structure.typographie` tait son compte
  (`compte: false`) ; `wrapper` marque l'origine du rythme
  (`origineDuRythme`) ; `BUDGET_DE_CALCUL_MS` vaut 200 ms. Vus rouges :
  la boucle de l'élection sans avancement, le compte de la typographie de
  référence affiché, une annonce que le moteur n'attend plus.*
- [ ] **L9.8** Accélérer ce que L9.3 désigne. Deux pistes sont écrites
  d'avance. Si les petits parcours dominent : le relevé par variant de L5.1.
  Si les lectures de propriétés dominent : chaque variant est lu par cinq
  passes au moins (couleurs, élection, icônes, vue exacte, typographie deux
  fois), et une lecture unique par node et par analyse les remplacerait. Le
  choix revient au mainteneur, sur les chiffres.
  *Mesuré sur deux analyses après L9.7, l'une à l'ouverture du plugin,
  l'autre sans le fermer : 20,0 s et 19,3 s, même empreinte `d9493f9a`.
  `regles` prend 329 ms puis 94 ms : les 6,5 s de L9.3 ne se reproduisent
  pas. `msGetAllNodes` vaut 4,6 s, soit 24 % du total : 1,6 s sur les
  8,6 s de `structure.vues`, et 0,9 s sur chacune des 2,6 s de
  `structure.typographie-exacte` et de `echantillons`. Ces deux étapes ont
  les mêmes compteurs de parcours : `extractVariantSample` rappelle
  `textSlots` sur chaque variant, comme la typographie exacte.
  `msEnRespiration` tombe à 0,86 s, et `plusLongSilenceMs` à 0,84 s.*

## Lot L7 : documents

Chaque tâche se fait dans le commit du lot qu'elle suit.

- [x] **L7.1** Avec L1 : ajouter `mesure.ts` et `porteeDAnalyse.ts` à la carte du
  code d'[AGENTS.md](../../../../AGENTS.md). Retirer de
  [ROADMAP.md](../../../../ROADMAP.md) la fragilité « Le relevé de composition
  résout trois fois le même maître ».
- [x] **L7.2** Avec L2 : réécrire le premier point du groupe « Composition »
  d'AGENTS.md. Le critère devient : un conteneur sur la page du maître écrit
  son nom ; une dépendance de bibliothèque n'est jamais contractée ; un calque
  `component-name` masqué dans une instance ne compte pas. Mettre à jour le
  point du drapeau dans « Écriture dans le document ». Réécrire
  [SPEC.md](../../../../packages/plugin-exporter/SPEC.md), section 7, avec les
  deux conséquences de la conception, section 2 : dépendance de bibliothèque,
  règles rangées sur une autre page. Réécrire dans ROADMAP.md « Le scan des
  dépendances charge toutes les pages ». Faire suivre
  `tests/inventaireInvariants.test.ts` si ses listes l'exigent.
  *Fait. FORMAT.md, « Composition et dépendances », disait aussi que le
  moteur charge toutes les pages : la phrase dit désormais le critère D1 et
  renvoie à SPEC.md. Les listes de l'inventaire n'ont pas eu à changer.*
- [x] **L7.3** Avec L4 : mettre à jour le commentaire de l'annulation
  coopérative dans `src/code.ts`, et celui de `handleExportComponent` sur le coût
  des autres pages.
- [ ] **L7.4** En fin de plan : ajouter en tête du [plan de
  recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md) un renvoi vers la
  conception et les mesures. Lancer `npm test` à la racine.
  *En attente : L3 et L5 restent ouverts, et `MESURES-PERFORMANCE-ANALYSE.md`
  n'existe pas encore.*
