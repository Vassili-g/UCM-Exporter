# Liste de tâches : modes de tokens et aides à l'implémentation

Liste d'exécution du [plan final](PLAN-FINAL-MODES-ET-AIDES.md), pour un agent
qui travaille seul. Le plan fait autorité sur le quoi et le pourquoi ; cette liste
fixe l'ordre et la preuve de chaque geste. Une case se coche quand sa preuve est
constatée, dans le commit qui la livre.

Les tâches marquées **[mainteneur]** exigent Figma, Safari, une session d'agent
mesurée ou une publication sur la Community. L'agent prépare ce qui précède,
écrit la demande dans le compte rendu et passe à la tâche suivante qui n'en
dépend pas. Quand L5 attend le mainteneur, l'agent continue par les tâches de L6
marquées « sans L5 », puis par L8a et L8b.

## 0. Règles de conduite

- [ ] Lire `AGENTS.md`, puis `CONTRIBUTING.md` sections « Code », « Tests » et
      « Documentation », puis le plan final en entier.
- [ ] Avant toute phrase écrite, charger `.agents/skills/rediger-sans-tics-ia` ;
      avant tout message destiné au designer, charger aussi
      `.agents/skills/rediger-diagnostics-ucm`.
- [ ] Travailler sur `main`, sans branche ni pull request. Lire `git status`
      avant chaque commit et commiter par `git commit --only <chemins>` :
      d'autres sessions écrivent dans le même arbre. Pousser après chaque commit,
      sans rebase.
- [ ] Un changement du contenu publiable d'un paquet part dans le commit qui monte
      sa version : `tests/versionSuitLeContenu.test.mjs` refuse tout autre
      découpage, `tests/` et `fixtures/` exceptés. Les tâches d'un lot qui
      touchent un même paquet partagent donc un commit. Monter `@ucm-kit/core`
      monte le pin exact de `@ucm-kit/cli` et de `@ucm-kit/adapter-typescript`
      (`monorepoCoherent.test.mjs`), donc leur version, et les commandes
      épinglées de la documentation hors notes et hors `docs/RECETTE.md`
      (`pinDocumente.test.mjs`). Un commit de tests seuls ou de documents seuls
      reste séparé.
- [ ] Un lot qui a monté une version se termine par la publication, selon
      « Publier les paquets » d'`AGENTS.md` : noyau en premier, chaque exécution
      suivie par `gh run watch`, chaque version constatée par `npm view`.
- [ ] Ne jamais lancer `git checkout -- <fichier>` sur un travail non commité ;
      restaurer par copie.
- [ ] Une loi ou un refus nouveau se voit rouge avant d'être cru : casser ce
      qu'il protège, constater l'échec, restaurer, et le dire dans le message de
      commit. Chaque refus a un cas voisin accepté.
- [ ] Aucun test ni aucune logique ne nomme un composant du corpus ; les tests
      emploient des documents synthétiques.
- [ ] Éditer par Write et Edit. Un script d'édition Python en mode texte convertit
      en CRLF ; un heredoc avale les antislashs d'une regex.
- [ ] Vérifier dans un worktree isolé : extraire en LF, lancer `npm test`,
      `npm run typecheck`, `npm run build` étape par étape, supprimer le worktree
      par Node.
- [ ] Un changement de `packages/kit/src/format/types.ts` est suivi de
      `npm run schema`.
- [ ] Ne poser un plafond ou une borne numérique qu'à la fin d'une tâche, jamais
      pour faire passer un rouge.

## L0. Preuve de cascade

- [x] Ajouter `playwright` aux `devDependencies` de la racine du monorepo, qui
      est privée : dans `packages/cli/package.json`, la dépendance exigerait une
      montée de version sans rien changer au paquet publié. Installer Chromium,
      Firefox et WebKit.
- [x] Créer `packages/cli/tests/cascade/` : une page qui charge un CSS et un arbre
      HTML, relève les valeurs calculées, et un oracle provisoire qui résout un
      document synthétique dans le contexte effectif de chaque élément. Le
      découvreur de la CLI ne lit que `tests/*.test.mjs` : le harnais se lance
      par le script racine `npm run cascade`, et un job `cascade` de `ci.yml`
      installe les trois moteurs puis le lance.
- [x] Écrire à la main le CSS attendu de la section 4.3 du plan pour un document
      à deux axes et pour un document à extensions. Les lignes de l'annexe A.5
      passent sur le premier, puis sur la sortie de l'émetteur provisoire pour un
      document à quatre axes, `display: contents` et retrait d'attribut compris.
- [x] Ajouter les sept arbres d'extension de la section 4.4 du plan : collection
      `color` en `light`/`dark`, extensions `marque-b` (parente `base`) et
      `sous-marque` (parente `marque-b`), axe `densite` dont les feuilles citent
      des feuilles de `color`.
- [x] Constater le vert dans les trois moteurs. Si `@scope` échoue, passer le
      repli `@container style()` de l'annexe A.6 du plan final au même harnais et
      écrire la forme retenue dans le plan final.
- [x] Écrire dans `packages/cli/tests/cascade/` un émetteur provisoire qui suit la
      section 4.3, extensions comprises, et qui rend les deux CSS écrits à la
      main ; `ucm tokens css` le remplace en L2 et L8a. Mesurer sa sortie sur un
      document synthétique : 500 extensions, 10 surcharges distinctes par
      extension, 2 modes. Relever règles, déclarations et octets. Écrire le
      relevé dans une section « Relevé L0 » du plan final.
- [ ] **[mainteneur]** Rejouer le harnais dans Safari réel.

## L1. Kit : le modèle de modes

Un seul commit pour le code du kit, avec la montée de `@ucm-kit/core` et des
deux pins.

- [x] `packages/kit/src/format/tokens.ts` : types `AxeDeTokens`, `com.ucm.axes`
      dans `ExtensionsDuDocument`, `com.ucm.axis` et `com.ucm.extensions` dans le
      `$extensions` d'une feuille. Le schéma publié dérive de `types.ts` seul :
      `npm run schema` ne doit rien changer, et le constater.
- [x] `packages/kit/src/format/names.ts` : `attributDeMode(axe)`. Test : accents,
      segments multiples. Citer la fonction dans l'invariant de `AGENTS.md` sur
      les projections de nom.
- [x] `packages/kit/src/format/configuration.ts` : sections facultatives `modes`
      (valeur `data-` suivie de lettres minuscules, chiffres, tirets) et `css`
      (`fontFamilyFallback`). Tests des refus dans `configuration.test.mjs`.
- [x] `packages/kit/src/lecteurs/modes-tokens.mjs` : `axesDeTokens` avec les cinq
      états de la table 3.1 du plan. Un test par état, et un cas voisin chacun.
- [x] `valeurDansLeContexte` : alias conservés, défaut, mode non défaut, chaîne
      d'extensions jusqu'à `base`. L'oracle de la cascade en a besoin pour les
      arbres d'extension de L0.
- [x] `conesDesAxes` : graphe inverse construit une fois, alias des surcharges
      compris ; losange, trois axes, défaut non premier, nom `__proto__` gardé en
      donnée.
- [x] `axesDuContrat` par `collecterReferences` et `sansEchantillon` ; dépendance
      de dépendance, dépendance absente, cycle de composition.
- [x] `contextesDeVerification` : l'ensemble `1 + A + C` de la section 4.5.
- [x] `cyclesActifs` : Tarjan, conditions par arête. Accepté : sur un seul axe,
      `x` cite `y` en `light` et `y` cite `x` en `dark`. Refusé : `x` cite `y` et
      `y` cite `x` dans le même mode, ou via une feuille sans propriétaire. Borne
      de 10 000 cycles qui rend un refus d'analyse.
- [x] `typography-token-types.mjs` : refus d'une chaîne qui traverse une feuille
      dont le type change dans un mode. Test vu rouge avec le lecteur actuel.
      Mention de classe 6 dans `docs/CHANGELOG-FORMAT.md` et le README du kit.
- [x] Exporter les fonctions par `lecteurs/index.mjs` et `index.d.mts`.
- [x] Remplacer l'oracle provisoire de L0 par `valeurDansLeContexte`.
- [ ] Monter `@ucm-kit/core`, les pins et les versions de `@ucm-kit/cli` et
      `@ucm-kit/adapter-typescript`, puis publier les trois paquets.

## L2. CLI : `ucm tokens css`, axes simples

- [ ] `packages/cli/src/tokens-css.mjs` et l'aiguillage dans `ucm.mjs`, aide de
      `ucm --help` comprise. `--out` obligatoire, jamais une entrée.
- [ ] Base sur `:root`, règle par mode, règle commune `:is()`, croisements
      `@scope`, dans l'ordre de `com.ucm.axes`.
- [ ] Littéraux de l'annexe A.3 du plan final, `string` et `boolean` compris,
      repli de famille de la configuration ; `$value: null` sans déclaration,
      nommé sur la sortie d'erreur.
- [ ] Attribut lu dans `modes`, défaut `attributDeMode` ; partage d'un attribut
      par deux axes aux ensembles de modes égaux, défauts différents imprimés ;
      refus de deux ensembles différents sur un attribut et d'une clé de `modes`
      qui ne nomme aucun axe.
- [ ] Refus, code 1, sortie conservée : les états de 3.1, collision de noms CSS,
      alias absent, cycle actif, écart de type, fichier de tokens absent quand un
      contrat cite une référence. `--sans-modes`. Sans fichier de tokens ni
      référence, feuille vide commentée et code 0. Code 2 pour l'invocation et
      pour une configuration refusée.
- [ ] Écriture par remplacement du fichier terminé ; statistiques imprimées.
- [ ] `packages/cli/tests/tokens-css.test.mjs` : les tests de l'annexe A.4 du plan
      final, chaque refus et son voisin, noms non ASCII.
- [ ] Brancher le harnais de L0 sur la sortie de la commande, pour les arbres
      sans extension.
- [ ] `packages/cli/README.md` : la commande et la mise en place.
- [ ] Monter et publier `@ucm-kit/cli`.

## L3. Plugin : écrire les axes

Le plugin est privé : ses commits ne montent aucune version.

- [ ] Extraire `prefixeDeCollection` de `joinTokenPath`
      (`packages/plugin/src/variables.ts`), sans changer un chemin.
- [ ] `packages/plugin/src/tokens/exportTokens.ts` : `com.ucm.axes` à la racine
      après la marque, toujours présent dès qu'une feuille a des modes, `{}`
      compris ; `com.ucm.axis` sur chaque feuille d'un axe retenu.
- [ ] Constats de la table 3.4 du plan, sauf les extensions : préfixe égal,
      préfixe vide, mode vide ou en collision, défaut absent, alias d'un autre
      type dans un mode. Un `Constat` par site, rédigé avec la skill des
      diagnostics.
- [ ] Étendre `packages/plugin/tests/fichierDeVariables.ts` et
      `exportTokens.test.ts` : défaut non premier, préfixes imbriqués, chaque
      constat, aucun `com.ucm.axes` sans modes.
- [ ] `conformiteDtcg.test.ts` : la racine admet `com.ucm.axes` après la marque,
      aucun groupe ne porte `$extensions`.
- [ ] `styleDictionary.test.ts` reste vert sans modification.
- [ ] Documents : `docs/FORMAT.md` partie 2, `packages/plugin/SPEC.md` partie 2,
      `docs/CHANGELOG-FORMAT.md`, `docs/COMPATIBILITE.md` classe 12 et titre des
      classes, invariants de `AGENTS.md` du groupe « Tokens et variables ».
- [ ] **[mainteneur]** Lancer l'export local dans Figma et vérifier la racine du
      `tokens.json` produit.
- [ ] **[mainteneur]** Publier le plugin sur la Community, après la publication
      du kit de L1.

## L4. Le catalogue d'aides

- [ ] `docs/FORMAT.md` section 8 : `cssProperties` n'est pas exhaustif ;
      `outline-style: solid` et `outline-offset` selon `align` ; la
      recommandation du repli remplacée par la règle de `contour-ring`.
- [ ] `packages/kit/src/lecteurs/caracteristiques.mjs` : `CARACTERISTIQUES`, table
      des champs, `SANS_AIDE`, `caracteristiquesDuContrat`. Tests sur contrats
      fabriqués, un par caractéristique, présente et absente. La caractéristique
      `focus`, relevée quand un état publie un `selector` qui contient `:focus`,
      porte l'ancrage `focus-clavier` (annexe A.7).
- [ ] `packages/cli/aides/<aide>.md` : une aide par entrée de la colonne « Aides »
      de l'annexe A.7 du plan final, sections « Sens », « Écriture par défaut »
      sauf pour un ancrage, « Preuve ». Contenu tiré des §1 à §6 de
      `.agents/skills/consommer-contrat/SKILL.md`. `contour-ring` et
      `contour-border` suivent la section 6.2 du plan final.
- [ ] `packages/cli/tests/aides.test.mjs` : les lois de l'annexe A.8 du plan
      final, plus la section « Preuve ». Voir rouge la loi du schéma en
      retirant une entrée de la table.
- [ ] Ajouter les aides à `PORTABLES` dans `tests/registrePortableDocuments.test.ts`.
- [ ] Monter `@ucm-kit/core`, les pins et les deux autres paquets, puis publier.

## L5. Mesure préalable du coût

- [ ] Écrire un script jetable dans le dossier temporaire de session, jamais dans
      le dépôt, qui assemble pour `Alert` et `Button`, contrats lus dans
      UCM-Playground, la sortie attendue de `ucm guide` : procédure provisoire,
      extraction, aides employées.
- [ ] Préparer pour le mainteneur les deux conditions, la liste fermée des
      propriétés comparées à Figma et le critère de la section 6.8, écrits avant
      la mesure.
- [ ] **[mainteneur]** Rejouer trois reconstructions par condition et par
      composant ; relever tours, contexte moyen, trafic facturé, écarts.
- [ ] Écrire le résultat et la décision dans une section « Relevé L5 » du plan
      final. Si le critère échoue, retirer l'extraction de la section 6.5 avant L6.

## L6. Guide, conventions, relais, installation

- [ ] Sans L5 : `packages/cli/procedure.md`, moins de 60 lignes, section 6.4 du
      plan final.
- [ ] Sans L5 : `packages/cli/src/conventions.mjs` : recherche du fichier le plus
      proche, retrait des commentaires sauf `ucm:copie`, drapeau
      `ecritures-par-defaut: non`, sections par `## `, titres setext ignorés,
      lignes `^Contrôle\s*:`, anomalies. Un test par règle de la section 6.3.
- [ ] Sans L5 : `packages/cli/src/aides.mjs` : `ucm aides`, `ucm aides <aide>`,
      `--personnaliser [chemin]` avec marqueur daté, refus d'écrire une section
      existante. Tests.
- [ ] `packages/cli/src/guide.mjs` : sortie dans l'ordre de la section 6.5,
      réutilisation de `vueExacteDuVariant` et `compositionsExactesDuVariant`,
      comparaison des pins, `--out`, codes de sortie.
- [ ] `packages/cli/tests/guide.test.mjs` sur un repository temporaire à deux
      contrats dont l'un compose l'autre : les cas de l'annexe A.10 du plan
      final et ceux ajoutés par la section 6.5 du plan final.
- [ ] `packages/cli/src/init.mjs` et `ucm.mjs` : drapeaux sans valeur,
      `--sans-agents`, `init` asynchrone, relais `.agents/skills` et
      `.claude/skills`, `.ucm/conventions.md`, lignes restantes imprimées,
      commentaire d'en-tête corrigé. Tests d'`init` et de `recette.test.mjs` :
      seconde exécution sans effet, fichiers existants conservés.
- [ ] `files` de `packages/cli/package.json` : `aides`, `procedure.md`. Test sur
      `npm pack --dry-run`.
- [ ] Après L5 seulement : scinder `.agents/skills/consommer-contrat/SKILL.md`,
      que la première condition de la mesure emploie telle quelle : protocole de
      recette seul, renvoi à `ucm guide`, en-tête YAML sur deux lignes.
- [ ] Documents : `AGENTS.md` (carte du code, paragraphe de la skill),
      `packages/cli/README.md`, `docs/RECETTE.md`, `ROADMAP.md`.
- [ ] Monter et publier `@ucm-kit/cli`.

## L7. Gabarit de l'adaptateur

- [ ] `packages/adapter-typescript/gabarits/exemple.contract.json`, contrat
      synthétique : props, variants, vue exacte, états, composition, icône,
      `ring`, dimensions par taille.
- [ ] `packages/adapter-typescript/gabarits/composant.tsx`, qui l'implémente selon
      les écritures par défaut, ordre du fichier écrit en tête.
- [ ] `cheminGabarits` dans l'objet exporté, chemin absolu depuis
      `import.meta.url` ; `index.d.mts` ; `files` reçoit `gabarits`.
- [ ] `@ucm-kit/cli` en `devDependencies` de l'adaptateur, sous `*` pour que le
      workspace résolve la CLI d'à côté. Tests : parité sans écart, contrôle de
      types, `ucm guide` sur l'exemple imprime chaque aide que le gabarit
      illustre.
- [ ] `init` copie les gabarits quand l'adaptateur est trouvé, sans écraser ; une
      erreur de chargement est rapportée sans arrêter l'installation. Tests.
- [ ] Monter et publier `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`.

## L8a. Kit et CLI : collections étendues

- [ ] `conesDesAxes` rend l'axe `<axe>-extensions` pour chaque feuille surchargée
      et ce qui la cite. `valeurDansLeContexte` lit déjà la chaîne de parentes
      depuis L1.
- [ ] `ucm tokens css` : axe `<axe>-extensions` après son axe parent,
      intermédiaires `--ucm-x-base--<f>` et `--ucm-x-<e>--<f>` limités aux
      surcharges, règle de repli puis règles propres, croisements au même schéma,
      refus d'un token dont la projection commence par `--ucm-x-`.
- [ ] `cyclesActifs` couvre les arêtes des surcharges et des intermédiaires.
- [ ] Harnais de L0 branché sur la sortie : trois générations, les sept arbres
      d'extension, taille au plus égale au relevé de L0 sur 500 extensions ;
      l'émetteur provisoire de L0 est retiré.
- [ ] `docs/FORMAT.md` : collections étendues publiées comme expérimentales, limite
      des cycles.
- [ ] Monter `@ucm-kit/core`, les pins et les deux autres paquets, puis publier.

## L8b. Plugin : lecture des collections étendues

- [ ] Simulation de `ExtendedVariableCollection` dans `fichierDeVariables.ts` :
      `parentVariableCollectionId`, `rootVariableCollectionId`,
      `modes[].parentModeId`, `variableOverrides`.
- [ ] Export de `extensions` et des surcharges creuses ; remontée de
      `parentModeId` ; constats « extensions homonymes », « extension nommée
      `base` », « parente distante ».
- [ ] `etatDesTokensDuFichier` et `modeCollisionWarnings` comptent une fois une
      variable héritée. Tests.
- [ ] `packages/plugin/SPEC.md` partie 2 : lecture expérimentale, ce qui reste à
      mesurer.
- [ ] **[mainteneur]** Relevé sur un fichier Enterprise réel dès qu'un
      utilisateur en fournit un.

## L9. Recette

- [ ] Recette sur un repository temporaire depuis les archives `npm pack` des
      trois paquets : `init`, `tokens css`, `guide`, `aides --personnaliser`.
- [ ] **[mainteneur]** Playground, dans l'ordre de la section 7 du plan final :
      réexport des tokens, installation, remplacement de Style Dictionary,
      `ucm init`, déplacement du tableau de `AGENTS.md`, règle 4 réécrite.
- [ ] **[mainteneur]** Épreuves de la section 7 : build, galerie en deux marques,
      harnais dans Safari, reconstructions à froid d'`Alert` et `Button`,
      personnalisation de `contour-ring`, export antérieur refusé, couleurs
      forcées dans Chrome.
- [ ] Écrire le compte rendu de recette dans `docs/RECETTE.md` si une marche
      change, sinon dans une section « Relevé L9 » du plan final.

## L10. Modes fixés dans un composant

- [ ] **[mainteneur]** Autoriser la lecture du fichier du design system par le
      serveur MCP Figma.
- [ ] Relever en lecture seule les calques publiés dont `explicitVariableModes`
      n'est pas vide, racine et calques internes séparés, et les variables
      `BOOLEAN` et `STRING` à plusieurs modes liées à `visible` ou `characters`.
- [ ] Classer chaque cas selon la section 5.1 du plan final et écrire le relevé
      dans une section « Relevé L10 ».
- [ ] **[mainteneur]** Décider d'un traitement avant tout champ de contrat.

## Clôture

- [ ] Relire `AGENTS.md`, `docs/FORMAT.md`, `packages/plugin/SPEC.md`,
      `docs/COMPATIBILITE.md`, `docs/CHANGELOG-FORMAT.md` et les README des
      paquets ; retirer toute description devenue fausse ou dupliquée.
- [ ] Les cinq cas de la section 9 du plan final vont au plan du diff sémantique.
      `PLAN-DIFF-SEMANTIQUE.md` est hors suivi et son auteur le commitera : s'il
      l'est encore, les écrire dans le compte rendu et ne pas toucher au fichier.
- [ ] `npm test`, `npm run typecheck`, `npm run build` et `npm run cascade` verts
      dans un worktree isolé.
