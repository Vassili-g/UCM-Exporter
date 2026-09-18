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
- [ ] **[mainteneur]** Lancer les essais sur une copie du fichier de tests et
      transmettre les résultats. L'agent passe au lot 2 sans attendre.

## 2a. Moteur : le marqueur `[À compléter]`

Référence : [phase 2](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats),
[section 6.2](PLAN-TEMPLATE-REGLES.md#62-le-marqueur-à-compléter), H1-B.

- [ ] Tests rouges dans `tests/rules.test.ts`, en noms neutres :
  - [ ] une règle de chaque tag, marquée dans chacun des calques que le tableau
        de 6.2 lui attribue, n'entre pas dans le contrat ;
  - [ ] le marqueur est reconnu sans tenir compte de la casse et après
        normalisation Unicode : `[à compléter]`, et `À` écrit en forme
        décomposée ;
  - [ ] le `content` d'un `@default` n'est pas lu : un `@default` dont seul
        `content` porte le marqueur reste une règle valide ;
  - [ ] une règle marquée ne produit ni l'avertissement « content est vide »
        ni celui de politique d'icône ;
  - [ ] trois règles `@prop` marquées donnent une seule ligne d'avertissement,
        au pluriel, qui porte les trois nodes ; une seule règle `@usage`
        marquée donne la forme au singulier ;
  - [ ] un conteneur dont `component-name` porte le marqueur rejoint le
        constat du conteneur orphelin, reformulé comme le dit la fin de 6.2 ;
  - [ ] un conteneur dont toutes les règles sont marquées ne produit pas la
        note « il ne contient aucune instance de « .ruleItem » qui porte un
        tag » : une règle marquée porte un tag. Sans ce test, le test de
        relecture du lot 4 échoue ;
  - [ ] le titre de l'avertissement nomme « .ruleItem », quel que soit le nom
        du calque de la première règle (`.rulesItems` par exemple).
- [ ] `src/contract/extractRules.ts` : constante du marqueur à côté de
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
- [ ] `src/contract/rulesModel.ts` si le regroupement par tag y trouve mieux
      sa place. `contractVersion` ne monte pas : la forme du contrat ne change
      pas.
- [ ] Documents : `docs/format/FORMAT.md` et `packages/plugin/SPEC.md`,
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
- [ ] Vérification complète dans le worktree, commit, push.

## 2b. Moteur : l'axe d'états `States`

Référence : [phase 2](PLAN-TEMPLATE-REGLES.md#phase-2-le-moteur--marqueur-et-axe-détats),
point 5, et la fin de la [section 11](PLAN-TEMPLATE-REGLES.md#11-décisions-prises-à-h1).

- [ ] Tests rouges : dans `tests/parsers.test.ts`, un axe `States` sort des
      props ; dans `tests/semantics.test.ts` ou le test voisin de
      `buildStateModel`, un axe `States` est publié par `stateModel`, et sa
      valeur `Disable` donne `disabled`. Un axe `State` et un axe `Status`
      restent couverts.
- [ ] Une seule liste des noms normalisés de l'axe d'états, `state`, `states`
      et `status`, exportée par `src/contract/semantics.ts`. `isStateProperty`
      (`parsers.ts`) et `buildStateModel` (`semantics.ts`) la lisent.
      `src/contract/extractSamples.ts` appelle aussi `isStateProperty` :
      vérifier que son comportement suit sans changement de code.
- [ ] Documents : `docs/format/FORMAT.md`, sections 1 et 7, et l'invariant
      « La convention `State`/`Status` » d'`AGENTS.md` citent les trois noms.
      `tests/inventaireInvariants.test.ts` suit si la phrase de l'invariant
      est figée.
- [ ] `contractVersion` ne monte pas. Noter dans le compte rendu le constat du
      plan : un composant de l'équipe consommatrice qui aurait un axe `States`
      le verrait quitter ses props au prochain export.
- [ ] Vérification complète dans le worktree, commit, push.

## 3. Motifs de la loi du document intact

Référence : [phase 3](PLAN-TEMPLATE-REGLES.md#phase-3-les-motifs-de-la-loi-du-document-intact),
[section 4.2](PLAN-TEMPLATE-REGLES.md#42-les-appels-nécessaires-et-la-loi).

- [ ] Ajouter à `ECRITURES` (`tests/loiDuDocumentIntact.test.ts`) les motifs
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
- [ ] La suite reste verte sur le code actuel. Un faux positif arrête le lot :
      le noter dans le compte rendu avec la ligne en cause.
- [ ] Écrire dans le commentaire de la loi sa borne : elle lit la source ligne
      par ligne, et une écriture par `Object.assign` ou par crochets lui
      échappe.
- [ ] Voir la loi rouge : poser un `createInstance(` puis une affectation de
      `.characters` dans un fichier de `src/contract/`, constater les deux
      échecs, restaurer. Le message de commit le dit.
- [ ] Aucune exclusion ajoutée, aucune promesse réécrite : la promesse
      actuelle reste vraie jusqu'au lot 5.
- [ ] Vérification complète dans le worktree, commit, push.

## 4. Modèle et sources

Référence : [phase 4](PLAN-TEMPLATE-REGLES.md#phase-4-le-modèle-et-les-sources),
sections [5.2](PLAN-TEMPLATE-REGLES.md#52-ordre-des-sources) à
[5.4](PLAN-TEMPLATE-REGLES.md#54-au-changement-de-sélection) et
[6.1](PLAN-TEMPLATE-REGLES.md#61-contenu-du-template).

- [ ] Tests rouges dans `tests/template.test.ts`, nouveau :
  - [ ] contrat synthétique `Root`, axes `tone` et `scale`, booléen `mark` :
        une `@usage`, une `@prop` par valeur groupée par axe dans l'ordre de
        `props`, un `divider` entre deux axes, une `@boolean`, une `@icons` ;
  - [ ] un axe renommé par la couche sémantique écrit sa clé publiée
        (`size.small`), jamais son nom Figma ;
  - [ ] un axe d'états vient en dernier groupe de la section des propriétés ;
        `disabled` issu de l'axe d'états ne donne aucune `@boolean` ;
  - [ ] un composant sans propriété donne les sections générale et icônes
        seules ;
  - [ ] les propriétés `TEXT`, `INSTANCE_SWAP` et `SLOT` ne donnent aucune
        règle ; aucun `@default`, `@do`, `@dont` ni `@pairs` n'est posé.
- [ ] `src/template/modele.ts`, pur : du contrat produit par
      `handleExportComponent` au modèle (sections, règles, séparateurs, tag,
      cible). Aucun import de l'API Figma. Une section se désigne par le tag de
      son exemple, jamais par son nom.
- [ ] `src/template/sources.ts`, lecture seule :
  - [ ] relevé synchrone de l'offre à partir du parcours de page que fait déjà
        `extractRules` : `creer`, `remplir`, `sans-source`, ou aucune offre
        (conteneur qui écrit le nom du composant, variant seul) ;
  - [ ] conteneur vierge au sens de [5.3](PLAN-TEMPLATE-REGLES.md#53-le-conteneur-vierge) :
        `component-name` marqué et aucune règle rédigée ;
  - [ ] résolution asynchrone, au clic : maître `.componentRules`, maître de
        chaque section et de chaque tag lu sur les exemples par
        `getMainComponentAsync`, variante choisie par `ruleTagFromLayerName`,
        séparateur pris dans le component set de `.ruleItem` comme la variante
        sans calque texte ;
  - [ ] vérification des textes d'aide : `content` de `@usage`, `@prop` et
        `@boolean`, `icon` de `@icons` portent le marqueur ; sinon un refus,
        texte de 6.3 ;
  - [ ] aucun appel à `loadAllPagesAsync` ni à `importComponentByKeyAsync`.
- [ ] `src/contract/extractRules.ts` rend le relevé nécessaire à l'offre sans
      second parcours de page. Le relevé et son type vivent dans
      `src/contract/`, et `sources.ts` les importe. L'inverse ferait échouer le
      test des imports du lot 5 : aucun fichier de `src/contract/` n'importe
      `src/template/`.
- [ ] `src/code.ts` : `reportSelectionState` ajoute l'offre au message
      `cible` ; un variant dont le parent est un `COMPONENT_SET` ne reçoit
      aucune offre, et un parent absent ne lève pas. `src/messages.ts` : le
      champ d'offre de `cible`, facultatif. L'interface l'ignore jusqu'au
      lot 6.
- [ ] `tests/code.test.ts` : le banc vérifie que chaque `require` de
      `code.ts` figure dans sa table `modules`. Ajouter `./template/sources`,
      et donner au faux `extractRules` un relevé d'offre. Nouveaux tests :
      l'offre arrive dans `cible` ; un variant seul n'en reçoit aucune.
- [ ] Tests de `sources.ts` avec les objets Figma minimaux de
      `tests/rules.test.ts` : chaque ligne du tableau de 5.4 ; un conteneur au
      nom marqué qui porte une règle rédigée n'est pas vierge ; un maître sans
      `divider` donne un modèle sans séparateur ; des textes d'aide sans
      marqueur donnent le refus.
- [ ] Test de relecture ([section 9](PLAN-TEMPLATE-REGLES.md#9-documents-et-tests-touchés)) :
      poser le modèle de `Root` sur des objets simulés, puis vérifier
      qu'`extractRules` rend les avertissements du marqueur et aucun autre
      message des règles.
- [ ] Vérification complète dans le worktree, commit, push.

## 1b. Essais : résultats et porte H2

Référence : [phase 1](PLAN-TEMPLATE-REGLES.md#phase-1-essai-dans-figma),
[section 12.1](PLAN-TEMPLATE-REGLES.md#121-léquipe-consommatrice), H1-H.

Le lot 5 ne commence pas avant que cette section soit cochée.

- [ ] **[mainteneur]** Résultats des essais E1 à E10 transmis.
- [ ] Créer `ESSAI-TEMPLATE-REGLES.md` dans ce dossier : un tableau par essai
      (geste, critère, résultat, erreur mot pour mot), les ids relevés par E4,
      la durée de E10, le comportement de Ctrl+Z relevé par E6. Statut de
      chaque fait : mesuré.
- [ ] Porte H2 : si E1, E2, E4 ou E7 échoue, ou si E3 échoue sur les deux
      chemins, s'arrêter. Écrire dans le compte rendu les trois issues du plan
      (liste des règles affichée dans la carte sans rien écrire, maîtres bâtis
      par le code, abandon), et attendre le choix du mainteneur. Les lots 5 à 8
      ne s'exécutent pas tels quels.
- [ ] Choisir le chemin E ou F de 6.4 d'après E3, et l'écrire dans la section
      6.4 du plan. À succès égal, le chemin E, qui crée moins de nodes.
- [ ] Reporter dans le plan les faits établis : affectation de
      `layoutSizingHorizontal` nécessaire ou non (E5), handles à relire par
      id après un ajout (E4), `commitUndo` nécessaire ou non (E6, H1-H),
      chevauchement à la pose (E8).
- [ ] E9 échoué seul : noter l'issue de 12.1 dans le compte rendu, puis
      continuer. Le template fonctionnera avec un maître local.
- [ ] Corriger `src/template/sources.ts` si E1 ou E9 contredit la résolution
      des maîtres, avec son test.
- [ ] Commit du compte rendu d'essai et du plan, push.

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
