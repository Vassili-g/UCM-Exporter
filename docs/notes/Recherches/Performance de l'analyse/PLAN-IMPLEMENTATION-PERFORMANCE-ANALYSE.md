# Plan d'implémentation : accélérer l'analyse d'un composant

## Résultat attendu

Une retouche entre deux analyses ne relance plus que le balayage de la page
retouchée. Chaque maître d'instance est résolu une fois par analyse. La
première analyse d'une session trouve l'index déjà construit, ou en cours de
construction depuis la sélection du composant. Un changement de sélection
arrête l'analyse en moins de 50 ms de calcul. Le contrat produit reste
identique octet pour octet, `meta.exportedAt` excepté.

Ce plan est destiné à l'agent qui réalisera les changements. Il applique la
[conception](./CONCEPTION-PERFORMANCE-ANALYSE.md), qui fait autorité sur tout
choix technique. Les tâches marquées **[mainteneur]** se font dans Figma
Desktop ou demandent une décision : l'agent ne les exécute pas, il prépare ce
qu'elles consomment et s'arrête à leur porte.

## Autorités

Lire dans cet ordre :

1. la [conception](./CONCEPTION-PERFORMANCE-ANALYSE.md), sections 3 à 5 ;
2. le [plan de recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md),
   sections 6 et 7, pour le protocole de mesure ;
3. [AGENTS.md](../../../../AGENTS.md), groupes « Composition » et « Écriture
   dans le document », puis « Vérification » ;
4. [CONTRIBUTING.md](../../../../CONTRIBUTING.md), sections « Code » et
   « Rédiger un document ».

Avant d'écrire un commentaire ou un document, charger la skill
[`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md).

## Règles de travail

- Chaque tâche cochée finit par un commit sur `main`, poussé aussitôt. Le
  commit passe par `git commit --only` suivi des chemins de la tâche : d'autres
  sessions travaillent dans le même arbre. Un fichier neuf s'ajoute par
  `git add <chemin>` avant ce commit. Relire `git status` après.
- `npm test`, `npm run typecheck` et `npm run build` passent dans un worktree
  isolé avant chaque commit. Figma charge `packages/plugin-exporter/dist/code.js`
  de la copie de travail : après un lot, reconstruire le plugin dans la copie
  de travail pour le mainteneur.
- Une loi nouvelle se voit rouge avant d'être crue : casser ce qu'elle protège,
  constater l'échec, restaurer par copie, jamais par `git checkout --`. Le
  message de commit le dit.
- Aucun `.contract.json` commité ne sert de preuve. La parité se prouve par le
  banc de L1.3 et, dans Figma, par l'empreinte de la trace.
- Un code dont l'antislash ou l'accent grave compte s'écrit avec les outils
  d'édition, jamais par un heredoc du shell.
- Une tâche qui ne peut pas passer au vert sans toucher à un invariant
  s'arrête. L'agent écrit le constat sous la tâche et passe au lot suivant
  quand il n'en dépend pas.

## Ordre d'exécution

| Lot | Contenu | Dépend de | Porte |
|---|---|---|---|
| L0 | Trace de mesure | | |
| M0 | Mesure de départ **[mainteneur]** | L0 | |
| L1 | Portée d'analyse, maîtres, `contientDesInstances`, banc de parité | L0 | |
| L2 | Index par page | L1 | Sonde S1 pour le signal définitif |
| L3 | Préchauffage | L2 | Décision D5 |
| L4 | Rendre la main | L1 | |
| M1 | Mesure après L1 à L4 **[mainteneur]** | L2, L4 | |
| L5 | Accélérations conditionnelles | M1 | Seuils de la conception, section 4.7 |
| L6 | Constats pour les décisions D1 à D4 | M1 | |
| L7 | Documents | chaque lot | |

L2 peut commencer avant la réponse de S1 : il se construit avec
`nodechange`, et la tâche L2.6 bascule vers le repli si S1 l'exige. L4 ne
dépend pas de L2 et peut passer avant lui.

## Lot L0 : trace de mesure

- [ ] **L0.1** Créer `packages/plugin-exporter/src/contract/mesure.ts` :
  `ouvrirLaMesure()`, `etape(nom)` qui clôt l'étape précédente, `compter(nom, n = 1)`,
  `fermerLaMesure(content)` qui calcule l'empreinte et imprime la trace. Forme
  et champs : conception, section 4.1. Toutes les fonctions sont sans effet
  quand `__UCM_MESURE__` vaut faux ou n'est pas défini.
- [ ] **L0.2** Déclarer `__UCM_MESURE__` dans un fichier `.d.ts` du plugin.
  Ajouter `--define:__UCM_MESURE__=false` à `build:code` dans
  `packages/plugin-exporter/package.json`, et un script `build:code:mesure` qui
  passe `true`. Vérifier sur le bundle produit par `build:code` que la chaîne
  `[ucm:mesure]` en est absente.
- [ ] **L0.3** Poser les étapes dans `handleExportComponent` : une à chaque
  `annoncer`, plus `index`, `composition`, `wrapper`, `structure`,
  `echantillons`, `compaction`, `serialisation`. Poser les compteurs qui ne
  demandent aucun point de passage nouveau : `appelsGetAllNodes` et
  `nodesParcourus` dans `getAllNodes`, `pagesChargees` et `pagesBalayees` dans
  `indexContractedNamesInDocument`, `tailleIndex`.
- [ ] **L0.4** Tests, dans `tests/mesure.test.ts` : sans la constante, aucune
  sortie console et un contrat inchangé ; avec la constante posée sur
  `globalThis`, une seule sortie `[ucm:mesure]` par analyse ; l'empreinte est
  la même pour deux exports du même composant à deux dates différentes, et
  change quand le composant change.
- [ ] **L0.5** Documenter dans
  [README.md du plugin](../../../../packages/plugin-exporter/README.md) comment
  produire le build de mesure et lire la trace dans la console de
  développement de Figma.

## Lot M0 : mesure de départ [mainteneur]

- [ ] **M0.1** **[mainteneur]** Préparer le corpus C1, C2, C3 selon le plan de
  recherche, section 6. C3 est un fichier jetable : aucun fichier réel n'est
  modifié. Décrire chaque fichier par ses nombres de pages, nodes, variants et
  instances imbriquées.
- [ ] **M0.2** **[mainteneur]** Avec `build:code:mesure`, relever les traces à
  froid, à chaud et après retouche, cinq fois chacune. Consigner médiane et
  maximum par étape et par compteur dans un fichier
  `MESURES-PERFORMANCE-ANALYSE.md` de ce dossier, avec la version de Figma et
  les empreintes.
- [ ] **M0.3** **[mainteneur]** Lancer les sondes S1, S2, S3 et S5 de la
  conception, section 6, et consigner chaque constat dans le même fichier.
  L'agent prépare avant M0 un script par sonde dans
  `docs/notes/Recherches/Performance de l'analyse/sondes/`, à coller dans la
  console d'un plugin de développement ; chaque script imprime son constat, et
  aucun n'écrit dans le document.

## Lot L1 : portée d'analyse, maîtres et banc de parité

- [ ] **L1.1** Créer `packages/plugin-exporter/src/contract/porteeDAnalyse.ts`
  avec `dansUnePorteeDAnalyse`, `maitreDe` et `respirerSiBesoin` (ce dernier
  sans effet jusqu'à L4). Une seule portée ouverte à la fois ; une seconde
  ouverture exécute son corps sans mémoire et compte `porteeRefusee`.
  `maitreDe` range une `Promise` par `instance.id`, rend `null` sur un échec ou
  une méthode absente, compte `appelsGetMainComponentAsync` et
  `maitresReutilises`. Exporter un interrupteur `desactiverLaPorteePourLeBanc`
  réservé au banc de L1.3, et le dire dans son commentaire.
- [ ] **L1.2** Remplacer l'appel direct à `getMainComponentAsync` par
  `maitreDe` dans `contractedOwner`, `indexMasterInstances`, `scoreWrapper`,
  `instanceOwnerId` et `dependencyOpacity`. Ne pas toucher à `isRuleInstance`
  ni à `src/template/`. Ouvrir la portée dans `handleExportComponent`, autour
  de tout le corps, fermée dans un `finally`.
- [ ] **L1.3** Créer `tests/paritePerformance.test.ts` : chaque composant
  simulé de `exportComponent.test.ts` est exporté avec la portée puis sans ;
  les deux `content` sont égaux après remplacement de `exportedAt`. Extraire
  au besoin le montage des mocks dans un module de `tests/` partagé par les
  deux fichiers, sans changer ce que les tests existants vérifient. Voir le
  banc rouge en faisant rendre à `maitreDe` le maître d'une autre instance,
  puis restaurer.
- [ ] **L1.4** Test de compte, dans le même fichier : un set de huit variants
  qui embarquent chacun deux instances d'une même dépendance appelle
  `getMainComponentAsync` au plus une fois par id d'instance.
- [ ] **L1.5** Ajouter `contientUneInstanceRendue(racine)` à
  `exportableNodes.ts` (conception, section 4.3) et l'employer à la place de
  `getAllNodes(component).some(…)` dans `handleExportComponent`. Tests dans
  `exportableNodes.test.ts` : instance visible, instance masquée sans liaison,
  instance sous un cadre masqué, instance masquée dont la visibilité est liée
  à une propriété, racine sans instance, runtime sans `findAllWithCriteria`.
  Chaque cas compare le résultat à celui de l'ancien test.
- [ ] **L1.6** Brancher dans la trace le compteur `appelsFindAllWithCriteria`.

## Lot L2 : index par page

- [ ] **L2.1** Réécrire la mémoire de `indexContractedNamesInDocument` selon la
  conception, section 4.4 : une entrée par page, chargement par
  `PageNode.loadAsync`, abonnement `page.on('nodechange')` qui salit l'entrée,
  entrée marquée propre juste avant le balayage synchrone. La page courante
  passe en premier. Le résultat est un `Set` neuf. Garder le repli sur
  `figma.currentPage` quand `root.children` ne porte aucune page.
- [ ] **L2.2** Un seul balayage en vol, partagé. Un appel qui arrive pendant un
  balayage l'attend, puis rebalaye les pages salies entre-temps, en deux tours
  au plus. Accepter l'option `avantChaquePage`, appelée avant chaque
  chargement, et l'option `priorite: 'fond' | 'analyse'` dont L3 se sert.
- [ ] **L2.3** Ajouter `oublierLaPage(page)` et l'appeler dans `creerRegles`,
  dans `src/code.ts`, à la place de `oublierLIndexDuDocument()`.
  `oublierLIndexDuDocument` reste et vide toutes les entrées.
- [ ] **L2.4** Tests dans `composedComponents.test.ts`, qui remplacent les trois
  tests actuels sur `documentchange` : premier appel, une page chargée et
  balayée par page ; second appel sans changement, aucune page chargée ; un
  `nodechange` sur une page, elle seule rebalayée ; page ajoutée, balayée ;
  page supprimée, ses noms sortent ; abonnement refusé, page rebalayée à chaque
  appel ; `loadAsync` qui lève, l'appel lève ; appel concurrent pendant un
  balayage, attente puis rebalayage des pages salies ; `oublierLaPage` après
  `creerRegles`, dans `code.test.ts`.
- [ ] **L2.5** Loi dans `loiDuDocumentIntact.test.ts` : aucun fichier de
  `src/contract/` n'appelle `loadAllPagesAsync` hors commentaire. La voir rouge
  en réintroduisant l'appel, puis restaurer.
- [ ] **L2.6** Après le constat de S1 : si `nodechange` manque un des trois cas,
  ajouter le repli de la conception, section 4.4, derrière la même interface,
  avec ses tests. Sinon, noter sous cette tâche que le repli n'est pas
  nécessaire, avec la version de Figma de S1.
- [ ] **L2.7** Brancher dans la trace `pagesReutilisees`.

## Lot L3 : préchauffage

Porte : décision D5, éclairée par S2. Sans réponse, l'agent passe à L4.

- [ ] **L3.1** Dans `reportSelectionState`, `src/code.ts`, lancer l'index en
  priorité `fond` quand la cible est exportable et qu'un de ses variants
  satisfait `contientUneInstanceRendue`. Passer `laisserPasserLesOperations`
  comme `avantChaquePage`. Une erreur du préchauffage est avalée : l'analyse
  la retrouvera et la dira.
- [ ] **L3.2** L'analyse appelle l'index en priorité `analyse`. Tant qu'un
  appel de cette priorité attend, le balayage en vol remplace
  `avantChaquePage` par un `setTimeout(0)`.
- [ ] **L3.3** Tests dans `code.test.ts` : une sélection de composant à
  instances lance le balayage ; une sélection sans instance ne charge aucune
  page ; un export de tokens ne charge aucune page ; une analyse lancée pendant
  un préchauffage suspendu par une opération ne reste pas bloquée ; deux
  sélections rapprochées ne lancent qu'un balayage.

## Lot L4 : rendre la main

- [ ] **L4.1** Donner à `respirerSiBesoin` son budget : il appelle `respirer`
  si 30 ms au moins se sont écoulées depuis la dernière respiration, et compte
  `respirations`. `handleExportComponent` reçoit `respirer` en second
  paramètre facultatif et le passe à la portée. `analyser`, dans `code.ts`,
  fournit `setTimeout(0)` suivi de `verifierAnnulation()`.
- [ ] **L4.2** Appeler `respirerSiBesoin` entre deux tranches de 16 variants
  dans `scanComposedMatrix`, à chaque tour de la boucle par variant de
  `extractStructure`, et entre deux pages du balayage de l'index quand la
  priorité est `analyse`.
- [ ] **L4.3** Tests : une annulation posée pendant la boucle de
  `extractStructure` arrête l'analyse avant le variant suivant et ne publie
  rien ; un set de 40 variants produit le même contrat et les mêmes
  avertissements, dans le même ordre, avec et sans tranches ; hors portée,
  `respirerSiBesoin` ne rend jamais la main.

## Lot M1 : mesure après L1 à L4 [mainteneur]

- [ ] **M1.1** **[mainteneur]** Refaire M0.2 sur le même corpus. Vérifier que
  chaque empreinte est celle de M0. Consigner les écarts par étape.
- [ ] **M1.2** **[mainteneur]** Vérifier les deux critères du plan de
  recherche, section 6 : sur C3, la première analyse ne croît plus avec les
  pages sans rapport une fois l'index chaud ; sur C1, le compte
  `appelsGetMainComponentAsync` égale le nombre d'ids d'instance distincts.
  Relever le délai entre un changement de sélection et l'arrêt de l'analyse.

## Lot L5 : accélérations conditionnelles

Chaque tâche commence par relire M1. Si son seuil n'est pas atteint, l'agent
coche la tâche avec la mention « non réalisée », les chiffres de M1 et le
seuil.

- [ ] **L5.1** Relevé par variant. Seuil : `getAllNodes` pèse plus du quart du
  temps restant, et S5 confirme l'ordre préfixe. Réaliser selon la conception,
  section 4.7, dans `porteeDAnalyse.ts` et `getAllNodes`. Test : sur chaque
  sous-arbre des mocks, la tranche égale `findAll(() => true)` ; le banc de
  parité reste vert.
- [ ] **L5.2** Règles relues. Seuil : `extractRules` pèse plus d'un dixième du
  temps. `reportSelectionState` garde son résultat pour l'id du composant ;
  l'analyse le reprend si la page courante n'a émis aucun `nodechange` depuis.
  Tests : reprise sans changement ; relecture après un `nodechange` ; relecture
  après un changement de sélection.
- [ ] **L5.3** Si M1 attribue plus d'un cinquième du temps au calcul pur
  (compaction, sérialisation, modèles), écrire un constat qui rouvre P7. Ne
  rien implémenter.

## Lot L6 : constats pour les décisions

- [ ] **L6.1** Écrire dans `MESURES-PERFORMANCE-ANALYSE.md` une section par
  décision D1, D2 et D4 : ce que M1 et les sondes S1 et S3 en disent, et le gain
  que chaque réponse positive laisse attendre sur C3. Aucune implémentation :
  chaque décision prise ouvre un plan à part.

## Lot L7 : documents

Chaque tâche se fait dans le commit du lot qu'elle suit.

- [ ] **L7.1** Avec L1 et L2 : ajouter `mesure.ts` et `porteeDAnalyse.ts` à la
  carte du code d'[AGENTS.md](../../../../AGENTS.md). Dans le groupe
  « Composition », dire que l'index est tenu par page et invalidé par le
  `nodechange` de chaque page, sans `loadAllPagesAsync`. Faire suivre
  `tests/inventaireInvariants.test.ts` si la liste des autorités l'exige.
- [ ] **L7.2** Avec L1 : retirer de [ROADMAP.md](../../../../ROADMAP.md) la
  fragilité « Le relevé de composition résout trois fois le même maître ».
  Avec L2 : réécrire « Le scan des dépendances charge toutes les pages » selon
  ce qui reste vrai après L3.
- [ ] **L7.3** Avec L4 : mettre à jour le commentaire de l'annulation
  coopérative dans `src/code.ts`, qui dit aujourd'hui que la demande n'est lue
  qu'entre deux étapes. Mettre à jour le commentaire de `handleExportComponent`
  sur le coût des autres pages.
- [ ] **L7.4** En fin de plan : dans le [plan de
  recherche](./PLAN-RECHERCHE-PERFORMANCE-ANALYSE.md), ajouter en tête un
  renvoi vers la conception et vers les mesures. Lancer `npm test` à la racine,
  qui contrôle les liens et le style de tous les documents.
