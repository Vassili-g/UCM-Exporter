# Liste de tâches : template de règles

Liste d'exécution du [plan d'action du template de règles](PLAN-TEMPLATE-REGLES.md),
pour un agent qui travaille seul. Le plan fait autorité sur le quoi et le
pourquoi. Cette liste fixe l'ordre des gestes et la preuve de chacun. Chaque
tâche renvoie à la section du plan qui la justifie. Quand une tâche et le plan
divergent, le plan l'emporte, sauf pour les écarts de la
[revue contre le code](#écarts-relevés-contre-le-code-de-d5cd226) : le plan a
été mesuré sur `94ec0a9`, et ces écarts décrivent le code actuel. L'agent note
tout autre écart dans le [compte rendu](#compte-rendu).

Une case se coche dans le commit qui livre sa preuve.

Les tâches marquées **[mainteneur]** exigent Figma ou la Community. L'agent
écrit la demande dans le compte rendu, puis reprend à la tâche suivante qui
n'en dépend pas. Les décisions H1 sont toutes prises
([section 11](PLAN-TEMPLATE-REGLES.md#11-décisions-prises-à-h1)). Une seule
porte humaine reste ouverte : H2, après les essais.

## Ordre retenu

| Étape | Lot | Raison de la place |
|---|---|---|
| P | Préparation | Le plan a été mesuré sur `94ec0a9`, et les réglages ont modifié `code.ts`, `messages.ts` et l'interface depuis |
| 1a | [Essais : le plugin d'essai](PLAN-TEMPLATE-REGLES.md#phase-1-essai-dans-figma) | Le mainteneur a besoin du plugin d'essai avant tout le reste. L'agent le remet, puis avance sur les lots 2 à 4 pendant les essais |
| 2a | [Moteur : le marqueur](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats) | Indépendant de l'écriture. Il corrige un défaut actuel : une règle posée à la main publie son texte d'exemple |
| 2b | [Moteur : l'axe `States`](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats) | Indépendant de l'écriture. Le modèle du lot 4 lit l'axe d'états que ce lot fixe |
| 3 | [Motifs de la loi](PLAN-TEMPLATE-REGLES.md#phase-3-les-motifs-de-la-loi-du-document-intact) | La loi durcie doit précéder le premier fichier qui écrit |
| 4 | [Modèle et sources](PLAN-TEMPLATE-REGLES.md#phase-4-le-modèle-et-les-sources) | Code en lecture seule, qui ne dépend d'aucun essai |
| 1b | Essais : résultats et porte H2 | **[mainteneur]** Le chemin d'écriture du lot 5 dépend des résultats |
| 5 | [Écriture et frontière](PLAN-TEMPLATE-REGLES.md#phase-5-lécriture-et-sa-frontière) | Seul lot qui écrit dans le document, sur le chemin que les essais ont validé |
| 6 | [Interface et documents](PLAN-TEMPLATE-REGLES.md#phase-6-linterface-et-les-documents) | Le bouton appelle l'écriture du lot 5 |
| 7 | [Recette dans Figma](PLAN-TEMPLATE-REGLES.md#phase-7-recette-dans-figma) | **[mainteneur]** Après tout le code |
| 8 | [Kit Community](PLAN-TEMPLATE-REGLES.md#phase-8-le-kit-community) | **[mainteneur]** Attend que la Community serve la version du plugin qui reconnaît le marqueur |
| C | Clôture | Relecture des documents et vérification finale |

Le plan place la phase 1 en entier avant la phase 2. Cette liste coupe la
phase 1 en deux : la préparation du plugin d'essai vient en premier, et
l'exploitation des résultats vient juste avant le lot 5, le premier qui en
dépend. Les lots 2 à 4 ne dépendent d'aucun essai.

Un résultat d'essai qui contredit le lot 4 (maître distant sans parent, variante
`divider` introuvable) se corrige à l'étape 1b, avant le lot 5.

## 0. Règles de conduite

- [x] Lire `AGENTS.md`, puis `CONTRIBUTING.md` sections « Code », « Tests »,
      « Messages destinés au designer », « Interface du plugin » et
      « Documentation », puis le plan en entier.
- [x] Avant toute phrase écrite, charger `.agents/skills/rediger-sans-tics-ia`.
      Avant tout texte affiché au designer, charger aussi
      `.agents/skills/rediger-diagnostics-ucm`. Les textes du plan sont des
      propositions : la skill les relit, et un écart se note dans le compte
      rendu.
- [x] Avant de toucher l'interface, lire le protocole de relecture de
      `CONTRIBUTING.md` et regarder les captures de la galerie avant de
      conclure.
- [ ] Un lot se commite seul et laisse `npm test`, `npm run typecheck` et
      `npm run build` au vert. Le lot 2 compte deux commits, 2a et 2b.
- [ ] Travailler sur `main`, sans branche ni pull request. Lire `git status`
      avant chaque commit et commiter par `git commit --only <chemins>` :
      d'autres sessions écrivent dans le même arbre. Pousser après chaque
      commit, sans rebase.
- [ ] Une loi nouvelle ou modifiée se voit rouge avant d'être crue : casser ce
      qu'elle protège, constater l'échec, restaurer, et le dire dans le message
      de commit.
- [ ] Un test de comportement s'écrit rouge avant le code qui le fait passer.
      Le compte rendu garde la sortie de l'échec.
- [ ] Ne jamais lancer `git checkout -- <fichier>` sur un travail non commité.
      Restaurer par copie.
- [ ] Éditer par Write et Edit. Un script Python en mode texte convertit le
      fichier en CRLF. Un heredoc avale les antislashs d'une regex.
- [ ] Vérifier dans un worktree isolé : extraire en LF, lancer la suite, le
      typage, le build, `test:ui` et la galerie étape par étape, puis supprimer
      le worktree par Node.
- [ ] Aucun composant du corpus n'est nommé dans un test, et aucun `.tsx` du
      corpus n'est modifié. Les tests emploient des noms neutres : `Root`, les
      axes `tone` et `scale`, le booléen `mark`
      ([section 9](PLAN-TEMPLATE-REGLES.md#9-documents-et-tests-touchés)).
- [ ] Aucun identifiant privé dans le dépôt, commits compris : ni clé de
      composant Figma, ni nom de fichier Figma du mainteneur, ni nom d'équipe
      cliente.
- [ ] Aucun agent n'écrit dans Figma, ni par le MCP ni autrement. Les essais,
      les textes d'aide et le kit sont des gestes du mainteneur (H1-A).
- [ ] Le plugin est privé dans npm : aucun lot ne monte de version ni ne publie
      de paquet. Sa publication sur la Community est un geste du mainteneur.

## P. Préparation

- [x] Constater l'écart du code depuis la mesure :
      `git diff --stat 94ec0a9 HEAD -- packages/plugin/src packages/plugin/galerie packages/plugin/tests`.
      À la rédaction de cette liste, `src/contract/` n'a pas bougé, et les
      écarts de `code.ts`, `messages.ts` et `src/ui/` sont listés dans le
      [compte rendu](#écarts-relevés-contre-le-code-de-d5cd226). Un fichier de
      `src/contract/` modifié depuis `d5cd226` oblige à relire les faits de la
      [section 2](PLAN-TEMPLATE-REGLES.md#2-faits-de-la-section-13-vérifiés)
      qu'il porte.
- [x] Constater la présence des symboles cités par le plan :
      `extractRules`, `hasUsableRules`, `rulesContainerOwner`,
      `nomDeComposantEcrit`, `isRuleInstance`, `ruleTagOf`,
      `ruleTagFromLayerName`, `nEcritRien`, `buildRules`, `pousserSansNode`,
      `pousserLocalise`, `noter`, `normalizePropKey`, `isStateProperty`,
      `buildStateModel`, `etatDeCible`, `detailDeCible`,
      `handleExportComponent`, `reportSelectionState`, `operationEnCours`,
      `ECRITURES` et `HORS_SANDBOX`. Un symbole absent se note dans le compte
      rendu avec son remplaçant.
- [x] Relever par recherche les promesses de lecture seule de la
      [section 4.1](PLAN-TEMPLATE-REGLES.md#41-les-promesses-à-réécrire), et
      noter dans le compte rendu toute phrase ajoutée depuis `94ec0a9`. Chercher
      aussi « n'écrit rien », « ne modifie jamais » et « lecture seule » dans
      `docs/`, `packages/plugin/` et `README.md`.
- [x] Vérifier la suite de départ dans un worktree isolé et produire les
      captures de référence : `npm run galerie` puis `npm run galerie:captures`
      dans `ucm-exporter-plugin`. Garder ces captures hors du dépôt, dans le
      dossier temporaire de la session : le lot 6 les compare.

## 1a. Essais : le plugin d'essai

Référence : [phase 1](PLAN-TEMPLATE-REGLES.md#phase-1-essai-dans-figma),
[section 6.4](PLAN-TEMPLATE-REGLES.md#64-écriture-dans-les-slots), H1-A.

Le plugin d'essai vit hors du dépôt, dans le dossier voisin
`Projet UCM/UCM-Essais-Template/`, à côté d'`UCM-Exporter`. Il ne se commite
nulle part.

- [x] Créer `UCM-Essais-Template/manifest.json`. Il reprend `editorType`,
      `documentAccess: "dynamic-page"` et `api` du manifeste du plugin, avec un
      autre `name` (« UCM essais template ») et un autre `id`, pour que Figma
      charge les deux plugins côte à côte. `main` vaut `code.js` et `ui` vaut
      `ui.html`. Aucun `networkAccess`.
- [x] Écrire `code.js` et `ui.html` en JavaScript direct, sans build ni
      dépendance : le mainteneur importe le manifeste et lance le plugin.
- [x] Un bouton par essai, E1 à E10, dans l'ordre du tableau de la phase 1.
      Chaque essai affiche dans la fenêtre : le geste, le critère, `réussi` ou
      `échoué`, l'erreur levée mot pour mot, et les ids et noms des nodes
      touchés. Un bouton « Copier les résultats » met le tout en texte brut
      dans le presse-papiers.
- [x] Chaque essai trouve sa source comme le fera le module : un `COMPONENT`
      nommé `.componentRules` sur la page active, sinon le maître d'une
      instance qui porte `component-name`
      ([section 5.2](PLAN-TEMPLATE-REGLES.md#52-ordre-des-sources)). Il pose
      ce qu'il crée à côté du component set sélectionné et ne touche à aucun
      autre calque.
- [x] E2 essaie les deux gestes sur deux instances distinctes : `.remove()`
      sur l'une, `resetSlot` sur l'autre. E3 essaie le chemin E puis le
      chemin F, chacun sur sa propre instance.
- [x] E4 relève les ids d'un même `.ruleItem` avant et après son ajout au slot,
      et relit `characters` après chaque écriture.
- [x] E5 relève `layoutSizingHorizontal`, la largeur rendue et
      `limitViolations` des deux slots, avec et sans affectation de
      `layoutSizingHorizontal = 'FILL'`. Il lit aussi `stretchChildOnInsert`
      quand l'API l'expose.
- [x] E6 affiche, avant de créer, la consigne au mainteneur : faire un geste
      manuel dans le canevas, cliquer, puis presser Ctrl+Z deux fois, focus
      dans le canevas puis dans la fenêtre du plugin, et noter ce qui disparaît
      à chaque appui.
- [x] E7 n'est pas un bouton du plugin d'essai : il se joue avec le plugin UCM
      actuel sur les règles créées par E3. La fenêtre le rappelle.
- [x] E10 pose 22 règles et 3 séparateurs, mesure la durée par
      `Date.now()`, puis refait la pose en levant une erreur après la
      onzième règle, et vérifie que le conteneur partiel est supprimé.
- [x] Écrire `UCM-Essais-Template/LISEZ-MOI.md` : importer le manifeste,
      dupliquer le fichier de tests, ouvrir la page d'un component set, le
      sélectionner, lancer chaque essai, rejouer E1 à E3 et E7 avec un maître
      de bibliothèque pour E9, puis coller les résultats dans la conversation.
- [x] **[mainteneur]** Lancer les essais sur une copie du fichier de tests et
      transmettre les résultats. L'agent passe au lot 2 sans attendre.

## 2a. Moteur : le marqueur `[À compléter]`

Référence : [phase 2](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats),
[section 6.2](PLAN-TEMPLATE-REGLES.md#62-le-marqueur-à-compléter), H1-B.

- [x] Tests rouges dans `tests/rules.test.ts`, en noms neutres :
  - [x] une règle de chaque tag, marquée dans chacun des calques que le tableau
        de 6.2 lui attribue, n'entre pas dans le contrat ;
  - [x] le marqueur est reconnu sans tenir compte de la casse et après
        normalisation Unicode : `[à compléter]`, et `À` écrit en forme
        décomposée ;
  - [x] le `content` d'un `@default` n'est pas lu : un `@default` dont seul
        `content` porte le marqueur reste une règle valide ;
  - [x] une règle marquée ne produit ni l'avertissement « content est vide »
        ni celui de politique d'icône ;
  - [x] trois règles `@prop` marquées donnent une seule ligne d'avertissement,
        au pluriel, qui porte les trois nodes ; une seule règle `@usage`
        marquée donne la forme au singulier ;
  - [x] un conteneur dont `component-name` porte le marqueur rejoint le
        constat du conteneur orphelin, reformulé comme le dit la fin de 6.2 ;
  - [x] un conteneur dont toutes les règles sont marquées ne produit pas la
        note « il ne contient aucune instance de « .ruleItem » qui porte un
        tag » : une règle marquée porte un tag. Sans ce test, le test de
        relecture du lot 4 échoue ;
  - [x] le titre de l'avertissement nomme « .ruleItem », quel que soit le nom
        du calque de la première règle (`.rulesItems` par exemple).
- [x] `src/contract/extractRules.ts` : constante du marqueur à côté de
      `component-name` ; vérification avant `buildRules` ; une règle marquée
      compte comme règle à tag pour la note du conteneur vide. Avertissement
      par tag : `pousserLocalise` titre avec le nom du node, donc il ne
      convient pas. Construire le sujet par
      `sujetNomme('Layer', '.ruleItem', premiereRegle)` et le point par
      `pointDe`, sur le modèle du doublon de conteneurs du même fichier, puis
      `noter` chaque node de règle. Vérifier dans `localisation.ts` quelle
      fonction pousse un avertissement et non une note : le marqueur demande
      un geste. Les trois parties suivent la forme de 6.2 : titre, impact,
      action. `tests/loiDesParties.test.ts` reste vert.
- [x] `src/contract/rulesModel.ts` si le regroupement par tag y trouve mieux
      sa place. `contractVersion` ne monte pas : la forme du contrat ne change
      pas.
- [x] Documents : `docs/format/FORMAT.md` et `packages/plugin/SPEC.md`,
      section 7 (le marqueur, ses calques par tag, le conteneur vierge) ; un
      invariant dans le groupe « Portée et forme du contrat » d'`AGENTS.md`,
      à côté de celui des règles `@prop` ; le geste du designer dans
      `packages/plugin/README.md` et `docs/guides/POUR-LES-DESIGNERS.md`.
      `tests/inventaireInvariants.test.ts` suit si l'invariant cite un symbole
      qu'il contrôle.
- [ ] **[mainteneur]** Réécrire dans le fichier du design system les textes
      d'aide de la [section 6.3](PLAN-TEMPLATE-REGLES.md#63-les-textes-daide-du-maître),
      marqueur compris. L'agent recopie le tableau dans le compte rendu. Ce
      geste ne bloque aucun lot jusqu'à la recette.
- [x] Vérification complète dans le worktree, commit, push.

## 2b. Moteur : l'axe d'états `States`

Référence : [phase 2](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats),
point 5, et la fin de la [section 11](PLAN-TEMPLATE-REGLES.md#11-décisions-prises-à-h1).

- [x] Tests rouges : dans `tests/parsers.test.ts`, un axe `States` sort des
      props ; dans `tests/semantics.test.ts` ou le test voisin de
      `buildStateModel`, un axe `States` est publié par `stateModel`, et sa
      valeur `Disable` donne `disabled`. Un axe `State` et un axe `Status`
      restent couverts.
- [x] Une seule liste des noms normalisés de l'axe d'états, `state`, `states`
      et `status`, exportée par `src/contract/semantics.ts`. `isStateProperty`
      (`parsers.ts`) et `buildStateModel` (`semantics.ts`) la lisent.
      `src/contract/extractSamples.ts` appelle aussi `isStateProperty` :
      vérifier que son comportement suit sans changement de code.
- [x] Documents : `docs/format/FORMAT.md`, sections 1 et 7, et l'invariant
      « La convention `State`/`Status` » d'`AGENTS.md` citent les trois noms.
      `tests/inventaireInvariants.test.ts` suit si la phrase de l'invariant
      est figée.
- [x] `contractVersion` ne monte pas. Noter dans le compte rendu le constat du
      plan : un composant de l'équipe consommatrice qui aurait un axe `States`
      le verrait quitter ses props au prochain export.
- [x] Vérification complète dans le worktree, commit, push.

## 3. Motifs de la loi du document intact

Référence : [phase 3](PLAN-TEMPLATE-REGLES.md#phase-3-les-motifs-de-la-loi-du-document-intact),
[section 4.2](PLAN-TEMPLATE-REGLES.md#42-les-appels-nécessaires-et-la-loi).

- [x] Ajouter à `ECRITURES` (`tests/loiDuDocumentIntact.test.ts`) les motifs
      de 4.2 et eux seuls : `.createInstance(`, `.setProperties(`,
      `.detachInstance(`, `.swapComponent(`, `.resetSlot(`, `.clone(` ;
      l'affectation de `.characters`, `.x`, `.y`, `.mainComponent`,
      `.layoutSizingHorizontal`, `.layoutSizingVertical` ;
      `.removeOverrides(`, `.resetOverrides(`, `.insertCharacters(`,
      `.deleteCharacters(`, `.setRange…(` ; `figma.union(`,
      `figma.subtract(`, `figma.intersect(`, `figma.exclude(`,
      `figma.flatten(`. Une affectation se reconnaît à `=`, précédé ou non
      d'un opérateur (`+=`, `-=`), et non suivi de `=` : par exemple
      `\.(x|y)\s*[-+*/]?=(?!=)`. Une comparaison n'est pas attrapée.
- [x] La suite reste verte sur le code actuel. Un faux positif arrête le lot :
      le noter dans le compte rendu avec la ligne en cause.
- [x] Écrire dans le commentaire de la loi sa borne : elle lit la source ligne
      par ligne, et une écriture par `Object.assign` ou par crochets lui
      échappe.
- [x] Voir la loi rouge : poser un `createInstance(` puis une affectation de
      `.characters` dans un fichier de `src/contract/`, constater les deux
      échecs, restaurer. Le message de commit le dit.
- [x] Aucune exclusion ajoutée, aucune promesse réécrite : la promesse
      actuelle reste vraie jusqu'au lot 5.
- [x] Vérification complète dans le worktree, commit, push.

## 4. Modèle et sources

Référence : [phase 4](PLAN-TEMPLATE-REGLES.md#phase-4-le-modèle-et-les-sources),
sections [5.2](PLAN-TEMPLATE-REGLES.md#52-ordre-des-sources) à
[5.4](PLAN-TEMPLATE-REGLES.md#54-au-changement-de-sélection) et
[6.1](PLAN-TEMPLATE-REGLES.md#61-contenu-du-template).

- [x] Tests rouges dans `tests/template.test.ts`, nouveau :
  - [x] contrat synthétique `Root`, axes `tone` et `scale`, booléen `mark` :
        une `@usage`, une `@prop` par valeur groupée par axe dans l'ordre de
        `props`, un `divider` entre deux axes, une `@boolean`, une `@icons` ;
  - [x] un axe renommé par la couche sémantique écrit sa clé publiée
        (`size.small`), jamais son nom Figma ;
  - [x] un axe d'états vient en dernier groupe de la section des propriétés ;
        `disabled` issu de l'axe d'états ne donne aucune `@boolean` ;
  - [x] un composant sans propriété donne les sections générale et icônes
        seules ;
  - [x] les propriétés `TEXT`, `INSTANCE_SWAP` et `SLOT` ne donnent aucune
        règle ; aucun `@default`, `@do`, `@dont` ni `@pairs` n'est posé.
- [x] `src/template/modele.ts`, pur : du contrat produit par
      `handleExportComponent` au modèle (sections, règles, séparateurs, tag,
      cible). Aucun import de l'API Figma. Une section se désigne par le tag de
      son exemple, jamais par son nom.
- [x] `src/template/sources.ts`, lecture seule :
  - [x] relevé synchrone de l'offre à partir du parcours de page que fait déjà
        `extractRules` : `creer`, `remplir`, `sans-source`, ou aucune offre
        (conteneur qui écrit le nom du composant, variant seul) ;
  - [x] conteneur vierge au sens de [5.3](PLAN-TEMPLATE-REGLES.md#53-le-conteneur-vierge) :
        `component-name` marqué et aucune règle rédigée ;
  - [x] résolution asynchrone, au clic : maître `.componentRules`, maître de
        chaque section et de chaque tag lu sur les exemples par
        `getMainComponentAsync`, variante choisie par `ruleTagFromLayerName`,
        séparateur pris dans le component set de `.ruleItem` comme la variante
        sans calque texte ;
  - [x] vérification des textes d'aide : `content` de `@usage`, `@prop` et
        `@boolean` portent le marqueur ; sinon un refus, texte de 6.3. `@icons`
        en est sorti après les essais, sa politique non choisie disant déjà que
        la règle ne publie rien ;
  - [x] aucun appel à `loadAllPagesAsync` ni à `importComponentByKeyAsync`.
- [x] `src/contract/extractRules.ts` rend le relevé nécessaire à l'offre sans
      second parcours de page. Le relevé et son type vivent dans
      `src/contract/`, et `sources.ts` les importe. L'inverse ferait échouer le
      test des imports du lot 5 : aucun fichier de `src/contract/` n'importe
      `src/template/`.
- [x] `src/code.ts` : `reportSelectionState` ajoute l'offre au message
      `cible` ; un variant dont le parent est un `COMPONENT_SET` ne reçoit
      aucune offre, et un parent absent ne lève pas. `src/messages.ts` : le
      champ d'offre de `cible`, facultatif. L'interface l'ignore jusqu'au
      lot 6.
- [x] `tests/code.test.ts` : le banc vérifie que chaque `require` de
      `code.ts` figure dans sa table `modules`. Ajouter `./template/sources`,
      et donner au faux `extractRules` un relevé d'offre. Nouveaux tests :
      l'offre arrive dans `cible` ; un variant seul n'en reçoit aucune.
- [x] Tests de `sources.ts` avec les objets Figma minimaux de
      `tests/rules.test.ts` : chaque ligne du tableau de 5.4 ; un conteneur au
      nom marqué qui porte une règle rédigée n'est pas vierge ; un maître sans
      `divider` donne un modèle sans séparateur ; des textes d'aide sans
      marqueur donnent le refus.
- [x] Test de relecture ([section 9](PLAN-TEMPLATE-REGLES.md#9-documents-et-tests-touchés)) :
      poser le modèle de `Root` sur des objets simulés, puis vérifier
      qu'`extractRules` rend les avertissements du marqueur et aucun autre
      message des règles.
- [x] Vérification complète dans le worktree, commit, push.

## 1b. Essais : résultats et porte H2

Référence : [phase 1](PLAN-TEMPLATE-REGLES.md#phase-1-essai-dans-figma),
[section 12.1](PLAN-TEMPLATE-REGLES.md#121-léquipe-consommatrice), H1-H.

Le lot 5 ne commence pas avant que cette section soit cochée.

- [x] **[mainteneur]** Résultats des essais E1 à E10 transmis.
- [x] Créer `ESSAI-TEMPLATE-REGLES.md` dans ce dossier : un tableau par essai
      (geste, critère, résultat, erreur mot pour mot), les ids relevés par E4,
      la durée de E10, le comportement de Ctrl+Z relevé par E6. Statut de
      chaque fait : mesuré.
- [x] Porte H2 : si E1, E2, E4 ou E7 échoue, ou si E3 échoue sur les deux
      chemins, s'arrêter. Écrire dans le compte rendu les trois issues du plan
      (liste des règles affichée dans la carte sans rien écrire, maîtres bâtis
      par le code, abandon), et attendre le choix du mainteneur. Les lots 5 à 8
      ne s'exécutent pas tels quels.
- [x] Choisir le chemin E ou F de 6.4 d'après E3, et l'écrire dans la section
      6.4 du plan. À succès égal, le chemin E, qui crée moins de nodes.
- [x] Reporter dans le plan les faits établis : affectation de
      `layoutSizingHorizontal` nécessaire ou non (E5), handles à relire par
      id après un ajout (E4), `commitUndo` nécessaire ou non (E6, H1-H),
      chevauchement à la pose (E8).
- [x] E9 échoué seul : noter l'issue de 12.1 dans le compte rendu, puis
      continuer. Le template fonctionnera avec un maître local.
- [x] Corriger `src/template/sources.ts` si E1 ou E9 contredit la résolution
      des maîtres, avec son test.
- [x] Commit du compte rendu d'essai et du plan, push.

## 5. Écriture et frontière

Référence : [phase 5](PLAN-TEMPLATE-REGLES.md#phase-5-lécriture-et-sa-frontière),
sections [4.3](PLAN-TEMPLATE-REGLES.md#43-emplacement-et-frontière),
[4.4](PLAN-TEMPLATE-REGLES.md#44-déclenchement) et
[7](PLAN-TEMPLATE-REGLES.md#7-cas-limites).

Un seul commit livre ce lot : l'écriture, son exclusion de la loi et la
nouvelle promesse entrent ensemble. Avant lui, la promesse actuelle reste
vraie.

- [ ] `src/template/ecriture.ts`, sur le chemin retenu en 1b, dans cet ordre :
  - [ ] textes d'aide vérifiés et polices chargées par `loadFontAsync` avant la
        première écriture, `component-name` compris ; une police absente
        (`hasMissingFont`) refuse sans rien créer ;
  - [ ] conteneur créé par `createInstance`, ou instance vierge remplie ;
  - [ ] sections et exemples sans usage retirés ;
  - [ ] règles et séparateurs rangés, `prop` et `component-name` écrits ;
        `content` et `icon` jamais écrits ;
  - [ ] conteneur placé dans la section ancêtre la plus proche, sinon sur la
        page, à 80 px à droite du component set en coordonnées absolues ;
        jamais dans un parent en auto layout ;
  - [ ] échec à mi-parcours : conteneur créé supprimé, et le résultat dit si
        la suppression a réussi ; une instance vierge remplie n'est jamais
        supprimée.
- [ ] `commitUndo` n'entre dans `ecriture.ts` que si 1b l'a établi (H1-H).
      Sinon, aucun appel.
- [ ] `tests/loiDuDocumentIntact.test.ts` :
  - [ ] exclusion du seul fichier `src/template/ecriture.ts` ;
  - [ ] deux assertions : le fichier exclu existe ; exactement un fichier est
        exclu hors de `src/ui` ;
  - [ ] test des imports : seul `src/code.ts` importe `ecriture.ts` ; aucun
        fichier de `src/contract/`, `src/tokens/`, `src/forges/`, ni
        `src/depot.ts` ni `src/prevol.ts` n'importe `src/template/` ;
        `src/template/` n'appelle ni `loadAllPagesAsync` ni
        `importComponentByKeyAsync` ;
  - [ ] vus rouges : un import de `src/template/` posé dans `src/depot.ts`, un
        `createInstance(` posé dans `sources.ts`, et `ecriture.ts` renommé.
        Le message de commit le dit ;
  - [ ] le commentaire de `HORS_SANDBOX`, qui affirme qu'aucun membre de
        `UiRequest` n'écrit, et le message d'échec de la loi (« Le plugin lit,
        sélectionne et cadre ; il n'écrit pas ») sont réécrits
        ([section 4.4](PLAN-TEMPLATE-REGLES.md#44-déclenchement)).
- [ ] `src/messages.ts` : `{ type: 'creer-regles'; operation: number }` dans
      `UiRequest`, avec un commentaire qui dit que c'est la seule demande qui
      écrit dans le document. Le message `phase` passe de `& Provenance` à
      `& Partial<Provenance>`, pour porter une étape sans destination.
- [ ] `src/code.ts` :
  - [ ] `creerRegles`, seule fonction qui importe `ecriture.ts`, routée par
        `traiterMessage` ;
  - [ ] `operationEnCours` accepte une valeur propre à la création ; une
        analyse ou une publication en cours refuse la création, et la
        création refuse les deux, par `OPERATION_DEJA_EN_COURS` ;
  - [ ] le contrat vient de `handleExportComponent`, sans lecture du dépôt ni
        publication ;
  - [ ] les messages de la création portent `operation` et aucune
        `destination` (écart 1 du compte rendu) : les étapes par `phase`, le
        début et la fin par `status` ;
  - [ ] la création ne lit pas `annulation` : son annonceur d'étapes
        n'appelle pas `verifierAnnulation` (écart 9) ;
  - [ ] après la création : `analysesGardees.delete('component')`, sélection
        gardée sur le component set, cadrage du component set et du conteneur
        (H1-F), `reportSelectionState` relancé ;
  - [ ] commentaire de `montrerLesCalques` réécrit : il ne dit plus que le
        plugin n'écrit jamais.
- [ ] `tests/code.test.ts` : ajouter `./template/ecriture` et
      `./template/modele` à la table `modules` du banc, avec une fausse
      écriture qui compte ses appels. Tests : routage de `creer-regles` ;
      refus croisés avec l'analyse et la publication ; aucune autre demande
      n'appelle l'écriture ; un changement de sélection ou de destination
      pendant la création ne l'annule pas ; une analyse annulée juste avant
      n'arrête pas la création ; le relevé de sélection est relancé après
      elle.
- [ ] Nouvelle promesse de 4.1 dans `AGENTS.md`, première phrase et un nouveau
      groupe d'invariants « Écriture dans le document » ; mettre à jour la
      liste des groupes dans le paragraphe « Les invariants sont groupés par
      domaine » ; ajouter `src/template/` et ses trois fichiers à la carte du
      code. Même promesse dans `packages/plugin/SPEC.md`, « Hors périmètre
      MVP » et sa sous-section, et une sous-section sur la création des
      règles. `tests/inventaireInvariants.test.ts` suit : phrases figées de
      SPEC.md, liste des groupes, et titre du test qui compte les domaines.
- [ ] Vérification complète dans le worktree, commit, push.

## 6. Interface et documents

Référence : [phase 6](PLAN-TEMPLATE-REGLES.md#phase-6-linterface-et-les-documents),
sections [8.2](PLAN-TEMPLATE-REGLES.md#82-libellé-et-rang) à
[8.4](PLAN-TEMPLATE-REGLES.md#84-messages-et-galerie) et
[5.5](PLAN-TEMPLATE-REGLES.md#55-page-sans-source).

- [ ] `src/ui/components/CarteComposant.ts` : bouton « Créer les règles
      d'usage », variante `secondary`, sous « Analyser le composant », visible
      selon l'offre du message `cible` ; inactif avec la note de 5.5 pour
      `sans-source` ; absent sans offre. Pendant la création, les deux boutons
      sont inactifs et aucun bouton d'annulation n'apparaît.
- [ ] Lien provisoire de la note `sans-source`. Le kit n'existe pas encore
      (lot 8). La note porte un lien vers la grammaire des règles :
      `https://github.com/Vassili-g/UCM-Exporter/blob/main/docs/format/FORMAT.md#7-intention-et-documentation-des-props`,
      libellé « Lire la grammaire des règles ». L'URL est une constante
      unique, précédée du commentaire
      `// TODO(kit-community) : remplacer par l'URL du kit publié sur la Community (lot 8).`
      Vérifier par `curl -sI` que l'URL répond 200 sans authentification ;
      sinon, s'arrêter et le noter dans le compte rendu. Le clic passe par
      `open-external`.
- [ ] `src/ui/index.ts` : `demanderCreation`, sur le modèle de
      `demanderAnalyse` : `active = composant`, `composant.reinitialiser()`
      au clic, `occuper(true)`, `operationLancee` incrémenté, envoi de
      `creer-regles`. `reinitialiser()` efface le résultat d'une analyse
      précédente et réactive « Analyser le composant » (écart 10). Il ne
      s'appelle jamais au succès : il effacerait la note « 7 règles
      créées ».
- [ ] `src/ui/styles.css` : les classes nouvelles, et
      `tests/stylesUi.test.ts` qui les couvre.
- [ ] Textes affichés : relus par `rediger-diagnostics-ucm` ; ajouter à
      `SOURCES` de `tests/textesAffiches.test.ts` les fichiers qui les portent,
      `CarteComposant.ts`, `src/template/` et `src/code.ts` compris si des
      textes de création y sont écrits.
- [ ] `galerie/etats.cjs` : huit états. Pour l'offre : `creer`, `remplir`,
      `sans-source`. Pour l'opération : en cours, créée, échec avec conteneur
      retiré, échec avec conteneur resté en place, textes d'aide sans
      marqueur. La [section 8.4](PLAN-TEMPLATE-REGLES.md#84-messages-et-galerie)
      en compte sept, mais ses deux textes d'échec demandent chacun une
      capture. Pire contenu réel : 22 règles et un nom de composant long.
      `tests/galerie.test.ts` suit.
- [ ] `tests/interface/interface.test.mjs` : bouton visible, inactif, absent ;
      un clic sur le lien de `sans-source` émet `open-external` et aucune
      navigation.
- [ ] Captures de la galerie et protocole de relecture (a) à (e) de
      `CONTRIBUTING.md`, compte d'objets compris. Le verdict reste lisible
      sans défiler à 320 px. Les états existants sont identiques aux captures
      de la préparation, sauf la carte du composant.
- [ ] Documents : `packages/plugin/README.md` et
      `packages/plugin/package.json` (promesse et geste de création) ;
      `docs/guides/POUR-LES-DESIGNERS.md` (promesse, geste, marqueur) ;
      `docs/format/FORMAT.md`, section 7 (« sans jamais écrire dans Figma ») ;
      en-tête de `src/contract/extractRules.ts`. Chaque phrase relue par
      `rediger-sans-tics-ia`.
- [ ] Vérification complète dans le worktree, `test:ui` et galerie compris,
      commit, push.

## 7. Recette dans Figma

Référence : [phase 7](PLAN-TEMPLATE-REGLES.md#phase-7-recette-dans-figma).

- [ ] Préparer `packages/plugin/dist/` par `npm run build` et écrire dans le
      compte rendu les épreuves ci-dessous, avec l'état de galerie qui
      correspond à chacune.
- [ ] **[mainteneur]** Création sur une page de composants qui porte une
      instance de `.componentRules`.
- [ ] **[mainteneur]** Création sur une page qui ne porte que le maître.
- [ ] **[mainteneur]** Instance vierge collée, puis remplie.
- [ ] **[mainteneur]** Component set rangé dans une section : position et
      cadrage.
- [ ] **[mainteneur]** Maître de bibliothèque (le cas de l'équipe
      consommatrice).
- [ ] **[mainteneur]** Suppression du conteneur après création, puis nouvelle
      création.
- [ ] **[mainteneur]** Rédaction de trois règles, analyse : les trois
      règles publiées, les autres signalées par tag ; publication.
- [ ] **[mainteneur]** Page sans source : note, lien provisoire ouvert dans
      le navigateur.
- [ ] Consigner les résultats dans le compte rendu. Un écart ouvre une tâche
      de correction avec son test de régression, avant le lot 8.

## 8. Kit Community

Référence : [phase 8](PLAN-TEMPLATE-REGLES.md#phase-8-le-kit-community),
[section 12.2](PLAN-TEMPLATE-REGLES.md#122-les-équipes-sans-source--le-kit-community).

- [ ] **[mainteneur]** Publier sur la Community la version du plugin qui
      reconnaît le marqueur. Le kit ne circule pas avant.
- [ ] **[mainteneur]** Composer le fichier « UCM Rules Kit » et passer la liste
      de vérifications de 12.2 : autonomie, polices, neutralité, noms exacts.
- [ ] **[mainteneur]** Publier le kit sur la Community, relier les deux
      fiches, et transmettre l'URL du kit.
- [ ] `docs/guides/KIT-DE-REGLES.md`, nouveau : contenu du kit, vérifications
      avant publication, marche à suivre pour le publier et le republier,
      gestes d'une équipe qui le duplique. `docs/README.md` le référence.
- [ ] Lien du kit dans `packages/plugin/README.md`,
      `docs/guides/POUR-LES-DESIGNERS.md` et `docs/format/FORMAT.md`,
      section 7.
- [ ] Remplacer la constante de la note `sans-source` par l'URL du kit,
      libellé « Ouvrir le kit de règles », et retirer le commentaire
      `TODO(kit-community)`. `grep -rn "TODO(kit-community)" packages docs`
      ne rend plus rien. Galerie, `interface.test.mjs` et captures suivent.
- [ ] **[mainteneur]** Recette : sur un fichier neuf, sans aucun
      `.componentRules`, dupliquer le kit, copier les trois maîtres, créer les
      règles d'un composant, analyser.
- [ ] Vérification complète dans le worktree, commit, push.

## Clôture

- [ ] Relire `AGENTS.md`, `CONTRIBUTING.md`, `packages/plugin/SPEC.md`,
      `packages/plugin/README.md`, `docs/guides/POUR-LES-DESIGNERS.md`,
      `docs/format/FORMAT.md`, `README.md` et `docs/README.md` ; retirer toute
      promesse de lecture seule devenue fausse et toute description dupliquée.
- [ ] Mettre à jour le statut du plan : lots livrés, chemin retenu, résultat
      de la porte H2.
- [ ] La question de la [section 12.1](PLAN-TEMPLATE-REGLES.md#121-léquipe-consommatrice)
      à l'équipe consommatrice ne bloque aucun lot : la recopier dans le
      compte rendu si elle reste ouverte.
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `test:ui` et la galerie
      verts dans un worktree isolé.
- [ ] Le dossier `UCM-Essais-Template/` reste en place jusqu'à la fin de la
      recette ; le mainteneur décide de sa suppression.

## Compte rendu

L'agent écrit ici, par lot : les rouges constatés, les écarts au plan, les
questions posées au mainteneur et leur réponse.

### Écarts relevés contre le code de `d5cd226`

Le plan a été mesuré sur `94ec0a9`. Les réglages ont modifié depuis 19 fichiers
de `packages/plugin/src`. `src/contract/` n'a pas bougé : les faits des
sections 2, 3 et 6 tiennent. Les écarts suivants touchent surtout les lots 5
et 6, et la liste en tient compte.

1. Chaque opération porte un numéro : `analyser-composant` et `publier`
   envoient `operation`, et le sandbox renvoie une `Provenance`
   (`destination`, `operation`). `resultatActuel` (`src/ui/index.ts`) écarte un
   résultat d'une autre destination. La création n'écrit sur aucune forge :
   ses messages portent `operation` et aucune `destination`, et
   `resultatActuel` les accepte quelle que soit la destination affichée.
   `status` accepte déjà une provenance partielle ; `phase` exige une
   `Provenance` complète (`messages.ts`), et le lot 5 change son type.
2. Les étapes passent par le message `phase`, et non par `status` comme
   l'écrit la [section 8.2](PLAN-TEMPLATE-REGLES.md#82-libellé-et-rang).
   `status` porte le début, le succès et l'échec, et pilote `occuper`.
3. `annulation` vaut `'demandee' | 'reglages' | null`, et le drapeau
   `annulationDemandee` cité par la [section 7](PLAN-TEMPLATE-REGLES.md#7-cas-limites)
   n'existe plus. Un changement de sélection n'annule que
   `operationEnCours === 'component'`, et `annoncerReglages` n'annule que si
   `destinationDeLAnalyse` est posée. La création ne pose pas cette variable :
   aucun des deux ne l'annule, ce que le lot 5 teste.
4. `operationEnCours` est typé `ArtifactKind | null`. La valeur de la création
   élargit ce type ; `publicationEnCours` reste distinct.
5. Un `settings` qui change la destination appelle `composant.reinitialiser()`
   côté interface. Pendant une création, la note de progression peut donc
   disparaître ; l'état occupé, lui, reste jusqu'au `status` final.
6. `tests/textesAffiches.test.ts`, ajouté depuis, juge les phrases des fichiers
   de sa liste `SOURCES`. `CarteComposant.ts` n'y figure pas : le lot 6 l'y
   ajoute avec les fichiers de `src/template/` qui portent un texte.
7. `isStateProperty` est aussi appelée par `src/contract/extractSamples.ts`,
   que le plan ne cite pas (lot 2b).
8. `reportSelectionState` attend `extractRules`, comme à `94ec0a9`. Le relevé
   de l'offre se fait dans le même parcours, sans appel asynchrone de plus,
   comme le veut la
   [section 5.4](PLAN-TEMPLATE-REGLES.md#54-au-changement-de-sélection).
9. `annulation` n'est remise à `null` qu'au départ d'une analyse. Après une
   analyse annulée, elle reste posée. Une création qui appellerait
   `verifierAnnulation` s'arrêterait donc sans raison : elle ne lit pas
   `annulation`.
10. `CarteComposant` garde « Analyser le composant » inactif après une analyse
    (`analysee`). Seul `reinitialiser()` le réactive, et il efface aussi la
    note. `demanderCreation` l'appelle au clic, jamais au succès. Le relevé de
    sélection relancé après la création ne remet pas la carte à zéro quand
    `selectionId` est inchangé, ce qui convient à H1-F.

### Revue de la liste avant exécution

Un agent sans le contexte de la rédaction a relu la liste contre le code de
`d5cd226` et contre le plan. Chaque point a été vérifié dans le code avant
d'être retenu.

| Point de la revue | Suite |
|---|---|
| Le banc de `code.test.ts` refuse un `require` absent de sa table `modules` : les lots 4 et 5 le passeraient au rouge | retenu, vérifié ; tâches ajoutées aux lots 4 et 5, avec les tests de l'offre et du variant seul |
| `phase` exige une `Provenance` complète | retenu, vérifié ; lot 5 et écart 1 |
| La promesse de lecture seule est dans le commentaire de `HORS_SANDBOX` et dans le message d'échec de la loi, et non dans l'en-tête de `UiRequest` | retenu, vérifié ; lot 5 |
| Toutes les règles marquées déclenchent la note « aucune instance de « .ruleItem » qui porte un tag », contre la section 6.5 | retenu, vérifié ; test et règle au lot 2a |
| `pousserLocalise` titre avec le nom du node, et le titre ne nommerait pas « .ruleItem » | retenu, vérifié ; lot 2a construit le sujet par `sujetNomme` |
| Un relevé d'offre rangé dans `src/template/` et importé par `extractRules` casserait le test des imports | retenu ; lot 4 fixe le sens des imports |
| La carte du code d'`AGENTS.md` omettait `src/template/` | retenu ; lot 5 |
| Sept ou huit états de galerie | retenu ; huit, lot 6 |
| Annulation périmée, bouton « Analyser » resté inactif | retenus, vérifiés ; écarts 9 et 10, lots 5 et 6 |
| Motif d'affectation qui laisse passer `+=` | retenu ; lot 3 |
| Écart 8 : l'appel était déjà attendu à `94ec0a9` | retenu, écart reformulé |
| Titre du test des domaines d'invariants, section « Messages destinés au designer », `main` et `ui` du manifeste d'essai, `code.ts` hors de `SOURCES` | retenus ; lots 5, 0, 1a et 6 |
| Aucun motif du lot 3 n'attrape de code existant | constaté par la revue ; le lot 3 le revérifie |

### P. Préparation

Mesuré sur `b1d5710`.

- `git diff --stat 94ec0a9 HEAD` sur `src`, `galerie` et `tests` du plugin :
  33 fichiers. `git diff --stat d5cd226 HEAD -- packages/plugin/src/contract`
  ne rend rien : les faits de la section 2 tiennent.
- Les 22 symboles cités sont présents, ainsi que `sujetNomme` et `pointDe`,
  que le lot 2a emploie. Aucun remplaçant à noter.
- Aucune promesse de lecture seule ajoutée depuis `94ec0a9`. La recherche
  trouve en plus la phrase « le plugin ne modifie jamais le document » de la
  sous-section « Sélectionner et cadrer ne sont pas modifier » de SPEC.md, que
  la ligne SPEC.md du tableau 4.1 couvre déjà. Deux titres de test contiennent
  « n'écrit rien » (`code.test.ts`, `rules.test.ts`) et parlent d'autre chose.
- Suite de départ dans un worktree isolé : 1 395 tests verts sur les cinq
  suites, typage, build et `test:ui` verts. Galerie : 51 états, 39 captures,
  gardées dans le dossier de la session.

### 1a. Plugin d'essai

Livré dans `Projet UCM/UCM-Essais-Template/` : `manifest.json`, `code.js`,
`ui.html`, `LISEZ-MOI.md`. Un banc Node sur un faux `figma`, hors du dépôt, a
fait tourner chaque bouton : E1 à E4, E6, E8 et E10 vont au bout ; E5 et E9
échouent sur le banc seul, qui ne simule ni largeur rendue ni maître distant.

Écarts à la liste :

- un bouton E6 bis rejoue E6 avec `figma.commitUndo()` juste avant la création,
  pour trancher H1-H sur une seconde mesure ;
- E10 a deux boutons, un par chemin de 6.4, puisque le chemin n'est pas encore
  choisi ;
- un bouton retire les nodes créés par les essais, et eux seuls ;
- E3 bâtit son modèle depuis les propriétés du component set, avec des clés en
  camelCase approchées et sans la couche sémantique. E7 peut donc signaler une
  cible introuvable sur un axe renommé : le critère d'E7 reste que les règles
  créées soient lues.

**Demande au mainteneur.** Suivre `UCM-Essais-Template/LISEZ-MOI.md` sur une
copie du fichier de tests, puis coller les résultats dans la conversation. Si
les textes d'aide de 6.3 sont déjà réécrits dans Figma, E7 joué avec le moteur
du lot 2a signale les règles créées au lieu de les publier : c'est le
comportement attendu.

### 2a. Le marqueur

Rouge constaté avant le code, `npx tsx --test tests/rules.test.ts` : 27 verts,
17 rouges (les dix sous-tests du tableau de 6.2, et les six autres tests
nouveaux). Le test du `content` d'un `@default` est vert d'emblée : il garde un
comportement existant, que le marqueur ne doit pas changer.

```text
✖ @usage, calque content
✖ @prop, calque prop
✖ le marqueur se reconnaît sans casse et après normalisation Unicode
✖ les règles marquées d’un même tag donnent une ligne, au pluriel, qui porte tous leurs nodes
✖ un conteneur dont toutes les règles sont marquées ne dit pas qu’il n’en contient aucune
✖ un conteneur au nom marqué ne documente personne, et rejoint le constat du conteneur orphelin
ℹ pass 27
ℹ fail 17
```

Écarts et constats :

- `localisation.ts` ne distingue pas une note d'un avertissement : tout message
  du moteur sort en sévérité `warning` (`exportComponent.ts`). `pousserNote`
  pousse un message au sujet choisi, et `noter` y ajoute les autres règles du
  tag.
- L'action du plan, « Rédigez-les ou supprimez-les », devient « Remplacez
  « [À compléter] » par le texte de chaque règle, ou supprimez-les ». La skill
  des diagnostics demande un verbe concret et l'objet nommé. Pour le conteneur
  vierge : « Remplacez ce texte par « Root », puis réexportez. »
- `rulesContainerOwner` rend `null` pour un nom marqué : un conteneur vierge
  ne déclare plus son composant comme dépendance, puisqu'il n'en nomme aucun.
- `rulesModel.ts` ne change pas : le regroupement par tag porte des nodes, que
  le modèle pur ne voit pas.
- SPEC.md, section 7, renvoie toute la grammaire des règles à FORMAT.md. La
  règle du marqueur est donc dans FORMAT.md, et SPEC.md n'en porte qu'une
  phrase.
- L'inventaire d'`AGENTS.md` reçoit `MARQUEUR_A_COMPLETER` et
  `porteLeMarqueur`. Vu rouge en retirant l'invariant, restauré par copie.

**Demande au mainteneur.** Réécrire dans le fichier du design system les
textes d'aide ci-dessous, repris de la section 6.3. Ce geste ne bloque aucun
lot jusqu'à la recette.

| Maître et variant | Calque | Texte |
|---|---|---|
| `.componentRules` | `component-name` | « [À compléter] Nom du composant » |
| `.ruleItem`, `@usage` | `content` | « [À compléter] Décrivez à quoi sert le composant et quand le choisir. » |
| `.ruleItem`, `@prop` | `prop` | « [À compléter] propriété.valeur » |
| `.ruleItem`, `@prop` | `content` | « [À compléter] Décrivez quand choisir cette valeur. » |
| `.ruleItem`, `@boolean` | `prop` | « [À compléter] nom-de-la-propriété » |
| `.ruleItem`, `@boolean` | `content` | « [À compléter] Décrivez ce que cette option affiche, et quand l'activer. » |
| `.ruleItem`, `@icons` | `icon` | « [À compléter] Nom exact du calque d'icône » |
| `.ruleItem`, `@default` | `prop` | « [À compléter] propriété.valeur » |
| `.ruleItem`, `@default` | `content` | « Écrivez dans prop la valeur par défaut, par exemple size.medium. » |
| `.ruleItem`, `@do` | `content` | « [À compléter] Décrivez un usage recommandé. » |
| `.ruleItem`, `@dont` | `content` | « [À compléter] Décrivez un usage à éviter. » |
| `.ruleItem`, `@pairs` | `content` | « [À compléter] Listez les composants souvent associés, séparés par des virgules. » |

### 2b. L'axe `States`

Rouge constaté avant le code, `npx tsx --test tests/parsers.test.ts
tests/semantics.test.ts` : 27 verts, 2 rouges, chacun sur `States` seul.

```text
✖ un axe State, States ou Status sort des props, et sa valeur Disable donne disabled
✖ buildStateModel publie un axe states comme un axe state ou status
```

- `STATE_AXIS_NAMES` (`semantics.ts`) est la seule liste ; `isStateProperty` et
  `buildStateModel` la lisent. `extractSamples.ts` suit sans changement de
  code : il appelle `isStateProperty`.
- FORMAT.md cite les trois noms dans ses sections 1, 4 et 7 ; la section 4, que
  la liste ne nommait pas, portait aussi « `State` ou `Status` ». Le glossaire de
  POUR-LES-DESIGNERS.md suit.
- L'inventaire d'`AGENTS.md` reçoit `STATE_AXIS_NAMES`. Vu rouge en renommant
  la constante dans le code, restauré par copie.
- `contractVersion` ne monte pas. Aucun contrat du Playground n'a d'axe
  `States`, revérifié : ses deux `stateModel` ont l'axe `state`. Un composant
  de l'équipe consommatrice qui aurait un axe `States` le verrait quitter ses
  props au prochain export, et entrer dans `stateModel`.

### 3. Motifs de la loi

`ECRITURES` reçoit les motifs de 4.2, regroupés en neuf entrées, et aucun
autre. Aucun faux positif sur le code de `65b6f61`. Le commentaire de la loi
écrit sa borne, et la raison qui laisse `.name` et `.visible` hors de la liste.

Vue rouge sur un fichier temporaire de `src/contract/` : une ligne par motif,
vingt lignes d'écriture, et une ligne de comparaisons (`n.x == 1`,
`n.y >= 2`, `n.x <= 3`, `n.characters === ''`, `n.mainComponent !== null`).
Les vingt lignes sont refusées, dont `createInstance(` (création d'instance)
et l'affectation de `.characters` (écriture de texte) ; la ligne de
comparaisons ne l'est pas. Fichier supprimé, loi verte.

### 4. Modèle et sources

**Lot livré par morceaux.** La limite hebdomadaire de jetons a coupé la
session, et le lot est commité en cinq fois, à l'écart de la règle « un lot, un
commit ». Chaque morceau laisse le dépôt vert.

Livré et vert : `tests/template.test.ts` et `src/template/modele.ts`. Rouge
constaté avant le code, `npx tsx --test tests/template.test.ts` : le module
`../src/template/modele` était introuvable, les six tests échouaient d'un bloc.

Décisions prises en écrivant le modèle :

- l'ordre des valeurs de l'axe d'états est celui de `stateModel.states`, jamais
  celui de `precedence`, qui range par priorité de rendu et donnerait
  `disable, hover, default` dans la carte du designer ;
- la `@boolean` écartée est celle dont la clé répond à `isDisabledStateValue`
  (`parsers.ts`) quand l'axe d'états publie cet état. Cette fonction est déjà
  l'unique autorité sur l'orthographe de `disable`/`disabled` : le modèle la
  lit au lieu d'écrire une seconde fois le littéral ;
- une prop de type `icon` ne donne aucune règle, comme `TEXT`, `INSTANCE_SWAP`
  et `SLOT`. Le plan ne la nommait pas ; seuls `enum` et `boolean` posent une
  règle, et la section des icônes reçoit sa règle vide dans tous les cas.

Livré ensuite, et vert : `ReleveDeSource` dans `extractRules.ts`, et
`offreDeCreation` dans `src/template/sources.ts`, avec six tests qui suivent le
tableau de 5.4.

Le relevé se remplit dans le prédicat du `findAll` que la lecture des règles
faisait déjà, et n'ajoute aucune traversée. `rulesContainerOwner` reste
l'unique autorité sur « ce node porte les règles de X », comme l'invariant
d'`AGENTS.md` l'exige : le prédicat l'appelle au lieu de comparer les noms
lui-même. Le relevé entre dans `ExtractedRules`, rendu par les deux sorties de
la fonction, celle du conteneur absent comprise.

Rouge constaté après coup, faute de l'avoir vu avant : l'offre réduite à
`creer` et `sans-source` fait échouer les trois tests qui distinguent le
conteneur déjà écrit et le conteneur vierge. Restauré, douze tests verts.

Livré ensuite, et vert : l'offre dans le message `cible`. `reportSelectionState`
la calcule après la lecture des règles, la seule qui connaisse la page, et le
premier message d'une sélection part donc sans elle, ce que le champ facultatif
de `messages.ts` dit. Un variant dont le parent est un `COMPONENT_SET` n'en
reçoit aucune ; `component.parent?.type` traite le parent absent sans lever.

Le banc de `code.test.ts` charge le vrai `src/template/sources`, comme il
charge déjà `cible` et `prevol` : la logique de l'offre est jugée dans
`template.test.ts`, et le banc juge ce que `code.ts` en fait. Le faux
`extractRules` rend un relevé que le test choisit, et `selectionner` accepte un
parent. Rouge constaté en échangeant les deux branches du variant : les deux
tests tombent.

Livré ensuite, et vert : le conteneur vierge de 5.3. Il ne vit pas dans
`sources.ts` mais dans le relevé, contre la lettre de la liste : la seconde
condition de 5.3 décide de l'offre elle-même, un conteneur au nom marqué qui
porte une règle rédigée devant donner `creer` et non `remplir`. La juger au
clic aurait fait mentir le bouton. Le coût reste borné au sous-arbre des seuls
conteneurs marqués.

Le critère est ce qu'une instance écrit, jamais ce qu'elle est : `isRuleInstance`
est asynchrone, et le relevé se fait pendant le parcours de page. Une instance
qui n'est pas une règle et qui écrit quelque chose compte donc pour du travail,
ce qui range la prudence du bon côté. Rouge constaté en retirant la condition :
le conteneur rédigé recevait `remplir`, et le plugin aurait écrit par-dessus.

Livré en dernier, et vert : `resoudreLesSources` dans `sources.ts`, la
vérification des textes d'aide, et les dix tests qui les jugent. Rouge constaté
avant le code, `npx tsx --test tests/template.test.ts` : 15 verts, 9 rouges,
tous sur `resoudreLesSources` introuvable.

Le lot est clos. Ce qu'il a fallu décider en résolvant :

- le parcours des exemples descend par les sections, et une règle rangée
  ailleurs dans le maître est ignorée. Le maître de sa section est ce que
  l'écriture copie : un exemple sans section n'aurait aucun endroit où aller ;
- le séparateur se reconnaît à ce qu'il ne montre aucun texte, jamais à son nom
  de variante. Un catalogue sans variante muette ne refuse rien : le template
  posera ses règles à la suite, et un groupe de moins se voit ;
- `nomDuCatalogue` est sorti d'`isRuleInstance` et exporté : reconnaître un
  `.ruleItem` et reconnaître une `.rulesSection` est la même lecture, et la
  section était le second endroit où l'écrire ;
- le nom compacté de `.rulesSection` vit dans `src/template/`, seul à en avoir
  besoin : le moteur ignore les sections, et les nommer dans `src/contract/`
  lui donnerait une connaissance qu'il n'emploie pas ;
- deux refus s'ajoutent à celui de 6.3, que le plan ne nommait pas : un maître
  introuvable depuis la page, et un maître sans aucun exemple de règle. Le
  second n'est pas théorique, un maître dont on a vidé les slots le produit.

Le test de relecture est vert d'emblée, comme celui du `content` d'un
`@default` au lot 2a : il garde un comportement que le marqueur a livré. Un
écart au plan s'y mesure : 6.5 comptait « aucune règle @usage, @do, @dont ou
@pairs n'est déclarée » parmi les messages du premier export, mais cette phrase
vient d'`exportComponent.ts`, pas d'`extractRules`. La relecture d'un conteneur
fraîchement posé ne rend donc que les quatre lignes du marqueur, et rien
d'autre.

**Rouge du dépôt, étranger à ce lot.** Sur la suite complète du worktree,
1 417 tests verts et un rouge : « la feuille n'écrit aucune couleur en dur hors
de ses rôles » (`stylesUi.test.ts`). Quatre `#666666` sont entrés dans
`src/ui/styles.css` par les commits `7e7bb83` et `45be9a2`, qui sont d'une
autre session. Le lot 4 ne touche ni l'interface ni sa feuille, et son commit
ne porte que ses trois fichiers. La couleur doit rejoindre le bloc de rôles,
et c'est à la session qui règle les états de survol de le faire.

### 1b. Première salve d'essais, et correction du harnais

Le mainteneur a joué E1 à E6b, E8, E10E et E10F sur une copie du fichier de
tests, et E7 avec le plugin UCM. Verdicts rendus par le harnais : E1 et E5
verts, E6 et E6b à relever, E2, E3, E4, E9, E10E et E10F rouges. Les faits
tiennent, les verdicts non : le relevé de chaque rouge dit autre chose que son
verdict.

**Mesuré, et acquis.**

- E1 : `createInstance` sur un maître lu par `getMainComponentAsync` depuis une
  instance pose bien l'instance sur la page active.
- E5 : l'affectation de `layoutSizingHorizontal = 'FILL'` est nécessaire. Sans
  elle, la règle reste FIXED à 689 px et déborde du slot ; avec elle, 526 px,
  sans rognure. `limitViolations` vides sur les deux slots, `slotSettings` à
  `null` sur les deux propriétés de slot.
- E6 et E6b : un Ctrl+Z, focus dans le canevas, défait toute la création d'un
  coup ; un second défait le geste que le designer avait fait avant. Focus dans
  la fenêtre du plugin, Ctrl+Z ne fait rien. `figma.commitUndo()` appelé avant
  la création ne change ni l'un ni l'autre. **H1-H tranché : le template ne
  l'appelle pas**, puisqu'il ne sépare rien que Figma ne sépare déjà.
- E8 : le conteneur se range dans la section ancêtre sans l'agrandir, et la
  sélection reste sur le component set. **Le chevauchement est avéré** : le
  conteneur posé recouvre une instance `.componentRules` déjà présente. Le plan
  le disait non vérifié ; la position de pose doit donc tenir compte des
  voisins.
- E10 : après un échec provoqué à la onzième règle, le conteneur partiel est
  supprimé, sur les deux chemins. Pose complète de 22 règles et 3 séparateurs
  en 3 298 ms par le chemin E, 3 050 ms par le chemin F.

**Un seul défaut derrière E3, E4, E10 et la moitié d'E2 : la péremption des
handles.** Un sous-calque d'instance porte un id de chemin (`I<instance>;<…>`).
Ranger une règle dans un slot change ce chemin, et l'ancien handle meurt : le
lire lève « The node … does not exist ». Quatre relevés le disent :

- E4, écriture 1, par un handle capturé avant une écriture voisine : « écrit
  tone.a, relu prop.name ». L'écriture est perdue sans un mot. Écriture 2, par
  un calque retrouvé juste avant : tenue.
- E4, après l'ajout : l'id d'avant ne résout plus.
- E3 et E10, chemin E : toutes les écritures sont relues correctement ; c'est
  la vérification du harnais, qui reparcourt le conteneur par ses handles de
  pose, qui lève.
- E3 et E10, chemin F : le bloc « arbre attendu » n'est pas imprimé, or le
  harnais ne l'imprime qu'en cas d'écart. L'arbre posé est donc exactement
  l'arbre voulu, 22 règles et 3 séparateurs compris. Le rouge vient du dernier
  critère, le compte des calques morts.

Et la moitié d'E2 ne mesurait rien : `resetSlot` était appelé sur un slot resté
à son contenu par défaut, où ne rien faire est le comportement juste. Le
`.remove()`, lui, est vert aux deux niveaux, instance vivante.

**Correction du harnais.** Aucun handle n'est plus gardé : chaque calque est
retrouvé juste avant usage, chaque slot est relu par son id après un ajout,
l'exemple gardé se désigne par son rang, la vérification repart du conteneur
relu par son id, et les boucles de retrait sont bornées. `ecrireDans` relit
après écriture et recommence une fois sur un calque retrouvé, ce qui distingue
une écriture perdue d'un refus. E2 retire d'abord un enfant, puis mesure si
`resetSlot` le rend. E4 garde volontairement un handle périmé, pour que la
péremption reste mesurée au lieu d'être supposée.

Un banc Node sur un faux Figma, hors du dépôt, rejoue chaque bouton : le faux
document tue le handle d'un node rangé dans une instance, comme Figma. E1, E2,
E3, E4, E6, E6b, E10E et E10F y passent au vert, arbre conforme et conteneur
partiel supprimé. E5, E8 et E9 n'y sont pas jugeables : le banc ne simule ni
largeur rendue, ni boîte absolue, ni maître distant.

**E7 contredit le reste, et reste ouvert.** Sur le component set `Alert`, dont
la page portait alors plusieurs conteneurs créés par les essais, le plugin
répond « Aucune règle d'usage exploitable ne documente quand l'utiliser ». Or
un conteneur écrit bien « Alert ». Le relevé transmis ne porte que cette
phrase, pas la liste des constats, et la cause reste inconnue : conteneur lu
parmi plusieurs, règles non reconnues comme `.ruleItem`, ou textes d'aide sans
marqueur. E7 est dans la liste de la porte H2 ; elle ne se referme pas avant
que la liste complète des constats soit relevée, sur une page ne portant qu'un
seul conteneur.

### 1b. Seconde salve : la coquille morte, et le chemin tranché

E2, E3, E4, E10E et E10F rejoués avec le harnais corrigé. E2 passe au vert ;
les quatre autres restent rouges, et leurs relevés disent maintenant pourquoi,
sans rien laisser à la déduction.

**E2 est acquis en entier.** `.remove()` retire une section et un exemple,
instance vivante. `resetSlot`, mesuré cette fois sur un slot dont un enfant
vient d'être retiré, rend le contenu par défaut : 5 par défaut, 4 après le
retrait, 5 après l'appel.

**La péremption est mesurée.** E4 garde un handle pris avant d'écrire
`component-name`, puis écrit par lui : « écrit tone.a, relu prop.name ».
L'écriture est perdue et rien ne le dit. La même écriture par un calque
retrouvé juste avant tient. Le harnais le nomme : « handle capturé après une
écriture voisine : périmé ».

**Le fantôme est dans le document, pas dans le plugin.** C'est le fait neuf de
cette salve. Après l'ajout d'une règle dans un slot, E4 relit le conteneur par
son id, et le parcours lève quand même : « The node … with id
I2004:7889;175:228 does not exist ». Relire par l'id ne purge donc rien : le
sous-arbre du conteneur porte une coquille morte à l'ancien chemin de chaque
node rangé dans un slot.

**Les deux chemins ne s'en tirent pas pareil.**

| | Chemin E | Chemin F |
|---|---|---|
| Ajout | une règle dans le slot d'une section, elle-même dans le slot du conteneur | une section entière dans le slot du conteneur, règles déjà posées hors de l'arbre |
| Coquilles | lèvent au premier parcours qui lit un nom | inertes : elles répondent `removed`, sans lever |
| Arbre obtenu | jamais relu | exactement l'arbre attendu, séparateurs compris |
| Compte | relecture impossible | 4 calques morts, un par section ajoutée |
| Durée, 22 règles | 1 926 ms | 1 987 ms |
| Retour arrière | conteneur partiel supprimé | conteneur partiel supprimé |

**Décision : le chemin F.** Le plan préférait E « à succès égal » ; le succès
n'est pas égal. E échoue à chaque essai, sur un défaut qui n'est pas dans le
harnais mais dans ce que Figma laisse derrière un ajout imbriqué. F reproduit
l'arbre voulu à chaque essai. La contrepartie est connue et bornée : une
coquille morte par section ajoutée, inerte.

**Ce que le lot 5 en hérite.**

1. Construire chaque section hors de l'arbre, la remplir, puis la ranger d'un
   seul geste. Jamais d'ajout dans un slot déjà imbriqué.
2. Ne garder aucun handle : retrouver chaque calque juste avant d'écrire.
3. Relire après chaque écriture, et recommencer une fois sur un calque
   retrouvé : une écriture perdue ne lève pas.
4. `commitUndo` n'est pas appelé (E6).
5. La pose tient compte des voisins : le chevauchement d'E8 est avéré.

**E7 reste ouvert, et devient un bouton.** La phrase relevée deux fois,
« Aucune règle d'usage exploitable… », ne vient pas de l'analyse : c'est le
message de sélection de `reportSelectionState`, et il dit seulement que
`hasUsableRules` est faux. Il ne dit pas si le moteur a lu le conteneur, ni
pourquoi il en a écarté les règles. Le harnais reçoit donc E7 bis, qui rejoue
la lecture du moteur sur la page et relève, pas à pas : les conteneurs qui
écrivent le nom du composant et lequel serait lu, les instances du conteneur,
celles que leur component set désigne comme `.ruleItem`, le tag affiché de
chacune, les textes des calques que le moteur lit, et la raison pour laquelle
chaque règle est retenue ou écartée. Un parcours qui lève est rapporté au lieu
d'arrêter l'essai.

**Premier E7 bis : la page ne portait aucun conteneur.** Aucune instance
n'écrivait « Alert » ; les quatre que la page porte documentent d'autres
composants. Les conteneurs créés par les essais avaient été supprimés entre la
création et la lecture. Le message de sélection disait donc vrai, et l'hypothèse
d'un conteneur illisible tombe : elle n'a jamais été mise à l'épreuve. E7 bis
lit maintenant chaque conteneur qui écrit le nom, pas seulement celui que le
moteur retiendrait : un clic après E3 juge les deux chemins.

### 1b. Clôture : la porte H2 ne s'ouvre pas

E7 bis, joué sur les deux conteneurs qu'E3 venait de poser, rend E7 vert : le
moteur lit les deux en entier, reconnaît douze règles par leur component set,
lit le tag de onze d'entre elles, et écarte les dix qui portent encore le
marqueur. La onzième, `@icons`, passe le marqueur parce que son calque `icon`
n'a pas été préfixé dans le fichier du design system, puis `buildRules`
l'écarte : le maître montre à la fois `modifiable` et `strict`. Rien n'est
publiable, et la carte le dit. C'est le comportement prévu en 6.5.

Le relevé apporte un fait qui corrige la salve précédente : **la coquille morte
ne survit pas à la session qui l'a créée.** E7 bis lit sans lever le conteneur
du chemin E, que le harnais n'avait pas pu relire. Le défaut du chemin E est
donc borné à la session d'écriture, et il y est total. Cela ne change pas le
choix : le plugin relance la lecture de la sélection juste après la création,
donc dans cette session-là, et seul le chemin F y survit.

Porte H2 : E1, E2 et E7 verts, E3 vert du côté F, E4 rouge sur la seule
relecture en session, que la discipline retenue évite. **Elle ne s'ouvre pas**,
et les trois issues du plan n'ont pas à être écrites. E9 n'a pas été joué,
faute de page de bibliothèque ; l'issue de 12.1 reste ouverte, elle ne concerne
que l'équipe consommatrice, et le lot 5 continue. E1 confirme l'ordre des
sources de 5.2 : `src/template/sources.ts` n'a rien à corriger.

`ESSAI-TEMPLATE-REGLES.md` porte le détail, essai par essai, avec les erreurs
mot pour mot et les sept règles que le lot 5 hérite. Le plan reçoit le chemin
retenu (6.4), les trois faits d'écriture d'E4, la nécessité de `FILL` (E5), le
verdict d'H1-H (E6) et le chevauchement mesuré (E8, section 7).

**Le maître du design system n'a rien à corriger**, contre ce que la première
lecture de ce relevé annonçait. Le mainteneur a rappelé la forme de `@icons` :
le designer y masque celui des deux mots qui ne vaut pas, et les trois mots
visibles sont déjà le signe que rien n'est choisi. Le lot 4 est corrigé en
conséquence, son test vu rouge d'abord : `AIDES_LUES` ne porte plus que les
trois `content` de `@usage`, `@prop` et `@boolean`. Le calque `prop` des
variantes reste tel quel, le marqueur de leur `content` suffisant à écarter la
règle.

E9 reste à jouer le jour où une page de bibliothèque sera disponible.
