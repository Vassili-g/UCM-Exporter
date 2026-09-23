# Liste de tâches : réglages du plugin

Liste d'exécution du [plan d'action des réglages](PLAN-REGLAGES.md), pour un
agent qui travaille seul. Le plan fait autorité sur le quoi et le pourquoi.
Cette liste fixe l'ordre des gestes et la preuve de chacun. Chaque tâche renvoie
à la section du plan qui la justifie. Quand une tâche et le plan divergent, le
plan l'emporte : l'agent le note dans le [compte rendu](#compte-rendu).

Une case se coche dans le commit qui livre sa preuve.

Les tâches marquées **[mainteneur]** exigent Figma. L'agent écrit la demande
dans le compte rendu. Il reprend à la tâche suivante qui n'en dépend pas.
Toutes les décisions de la [section 1](PLAN-REGLAGES.md#1-décisions) sont
tranchées : aucun lot n'attend de réponse du mainteneur.

## Ordre retenu

| Étape | Lot | Raison de la place |
|---|---|---|
| P | Préparation | Le plan a été mesuré sur `94ec0a9` : ses faits se revérifient avant le premier geste |
| 1 | [Lot 1](PLAN-REGLAGES.md#lot-1-condition-des-tokens-en-un-point) | Refactorisation sans effet visible. Sa preuve compare les captures de la galerie avant et après : elle se fait sur une interface que le lot 0 n'a pas encore changée. Elle allège aussi `src/prevol.ts` et `src/code.ts`, que le lot 0 modifie ensuite |
| 2 | [Lot 0](PLAN-REGLAGES.md#lot-0-destination-et-fraîcheur) | La clé de destination, la file d'écriture et le compteur de génération servent de socle aux lots 2 à 4 |
| 3 | [Lot 2](PLAN-REGLAGES.md#lot-2-onglets-et-réglage-des-tokens) | Il pose les onglets, où les lots 3b et 4 rangent leur interface, et la première entrée ajoutée à la clé |
| 4 | [Lot 3a](PLAN-REGLAGES.md#lot-3a-stockage-des-dépôts) | Le stockage des dépôts et la reprise de l'ancienne configuration précèdent toute interface de liste |
| 5 | [Lot 3b](PLAN-REGLAGES.md#lot-3b-liste-des-dépôts) | La liste lit le stockage du lot 3a |
| 6 | [Lot 3c](PLAN-REGLAGES.md#lot-3c-pastille-nommée-et-verdict-nommé) | Il change la signature de `etatDeConnexion` avant que le lot 4 y ajoute l'état `local` |
| 7 | [Lot 4](PLAN-REGLAGES.md#lot-4-export-local) | Il s'appuie sur l'onglet Général, la liste et la pastille nommée |
| 8 | [Lot 6](PLAN-REGLAGES.md#lot-6-recette-dans-figma) | **[mainteneur]** Recette dans Figma, après tous les lots |
| 9 | Clôture | Relecture des documents et vérification finale |

Le [tableau de la section 8](PLAN-REGLAGES.md#8-plan-daction) place le lot 0
avant le lot 1 et les déclare indépendants. Cette liste inverse les deux pour
la raison donnée ci-dessus.

## 0. Règles de conduite

- [x] Lire `AGENTS.md`, puis `CONTRIBUTING.md` sections « Code », « Tests »,
      « Interface du plugin » et « Documentation », puis le plan en entier.
- [x] Avant toute phrase écrite, charger `.agents/skills/rediger-sans-tics-ia`.
      Avant tout texte affiché au designer, charger aussi
      `.agents/skills/rediger-diagnostics-ucm`. Les textes du plan sont des
      propositions : la skill les relit, et un écart se note dans le compte
      rendu.
- [x] Avant de toucher l'interface, lire le protocole de relecture de
      `CONTRIBUTING.md` et regarder les captures de la galerie avant de
      conclure.
- [x] Un lot se commite seul et laisse `npm test`, `npm run typecheck` et
      `npm run build` au vert ([section 8](PLAN-REGLAGES.md#8-plan-daction)).
      Le lot 3 compte trois commits : 3a, 3b et 3c.
- [x] Travailler sur `main`, sans branche ni pull request. Lire `git status`
      avant chaque commit et commiter par `git commit --only <chemins>` :
      d'autres sessions écrivent dans le même arbre. Pousser après chaque
      commit, sans rebase.
- [x] Une loi nouvelle se voit rouge avant d'être crue : casser ce qu'elle
      protège, constater l'échec, restaurer, et le dire dans le message de
      commit ([section 8](PLAN-REGLAGES.md#8-plan-daction)).
- [x] Ne jamais lancer `git checkout -- <fichier>` sur un travail non commité.
      Restaurer par copie.
- [x] Éditer par Write et Edit. Un script Python en mode texte convertit le
      fichier en CRLF. Un heredoc avale les antislashs d'une regex.
- [x] Vérifier dans un worktree isolé : extraire en LF, lancer la suite, le
      typage, le build, `test:ui` et la galerie étape par étape, puis supprimer
      le worktree par Node. Les commandes sont dans la
      [section 9](PLAN-REGLAGES.md#9-documents-et-tests-touchés).
- [x] Aucun jeton, aucune adresse de projet privé ni aucun nom d'équipe cliente
      dans un test, un état de galerie ou un commit : employer
      `mon-org/design-system-v3`, `mon-groupe/design-system` et
      `recette-web`, les exemples du plan.
- [x] Le plugin est privé (`"private": true`) : aucun lot ne monte de version
      ni ne publie de paquet.

## P. Préparation

- [x] Lire la [section 1](PLAN-REGLAGES.md#1-décisions) et constater que
      chaque décision est tranchée. Une ligne revenue « En attente » arrête le
      lot qui en dépend : écrire la question dans le compte rendu.
- [x] Constater que le code du plugin n'a pas bougé depuis la mesure :
      `git diff --stat 94ec0a9 HEAD -- packages/plugin-exporter/src packages/plugin-exporter/galerie packages/plugin-exporter/tests`.
      Vide à la rédaction de cette liste. Un diff non vide oblige à relire les
      faits de la [section 2](PLAN-REGLAGES.md#2-faits-vérifiés) que ces
      fichiers portent.
- [x] Constater la présence des symboles cités par le plan :
      `refreshConfiguration`, `selectionToken`, `analysesGardees`,
      `postConnection`, `saveSettings`, `validateSettings`, `verdictDePrevol`,
      `postVerdict`, `ordreDesTokens`, `etatDeConnexion`, `etatDuDepot`,
      `lireAvantEcriture`, `etatDesTokensDuFichier`, `settingsDirty`,
      `STORAGE_KEYS`, `jetonAutreForge`, `demanderPublication`, et
      `ENONCES_SPEC` dans `tests/inventaireInvariants.test.ts`. Un symbole
      absent se note dans le compte rendu avec son remplaçant.
- [x] Vérifier la suite de départ dans un worktree isolé et produire les
      captures de référence : `npm run galerie` puis `npm run galerie:captures`
      dans `ucm-exporter-plugin`. Garder ces captures hors du dépôt, dans le
      dossier temporaire de la session : le lot 1 les compare.

## L1. Condition des tokens en un point

Référence : [lot 1](PLAN-REGLAGES.md#lot-1-condition-des-tokens-en-un-point),
[section 3.3, point de décision unique](PLAN-REGLAGES.md#33-questions-sur-la-séparation),
[E4](PLAN-REGLAGES.md#22-écarts-relevés-hors-du-plan).

- [x] `src/prevol.ts` : `verdictDePrevol` rend aussi `etat`. La condition
      « tokens non fusionnés » s'y écrit une fois.
- [x] `src/code.ts` : `postVerdict` étale `etat` et ne recopie plus la
      condition.
- [x] `galerie/etats.cjs` : la fonction `verdict` étale `etat` de la même façon.
- [x] E4 : dans `src/tokens/exportTokens.ts`, renommer le type et la fonction
      `etatDesTokens` en `ResumeDesTokens` et `resumeDesTokens`, et leurs
      appels, dont `galerie/etats.cjs`. Le type `EtatDesTokens` de
      `src/depot.ts` ne change pas.
- [x] Tests : `tests/prevol.test.ts` vérifie `etat` pour chaque cas de
      `ordreDesTokens` ; `tests/exportTokens.test.ts` suit le renommage.
- [x] Preuve : captures par état de la galerie (`galerie:captures -- --etats`)
      identiques à celles de la préparation. Un écart d'un seul état arrête le
      lot. Les planches ne servent pas de preuve : deux captures du même code
      diffèrent.
- [x] Vérification complète dans le worktree, commit, push.

## L0. Destination et fraîcheur

Référence : [lot 0](PLAN-REGLAGES.md#lot-0-destination-et-fraîcheur). Le lot
corrige [E1, E2, E3, E6 et E7](PLAN-REGLAGES.md#22-écarts-relevés-hors-du-plan)
dans le modèle à un dépôt. Il ne crée ni liste ni onglet.

### Tests rouges d'abord

Le plan exige que ces tests échouent sur le code de départ. Les écrire tous,
constater chaque échec, puis corriger.

- [x] `tests/interface/interface.test.mjs`, E1 : une publication réussie garde
      son lien et ses points à corriger après `settings`.
- [x] `tests/interface/interface.test.mjs`, E2 : un changement de destination
      rend « Analyser le composant » disponible sur la même sélection ; un
      enregistrement à destination inchangée conserve le résultat.
- [x] `tests/code.test.ts`, E6 : deux enregistrements rapprochés, le premier
      lent et connecté, le second rapide et refusé. La pastille finale décrit
      le second. Un test de connexion périmé ne poste rien.
- [x] `tests/code.test.ts`, E7 : une publication croisée avec un
      enregistrement refuse en nommant la destination, sans « La sélection a
      changé ».
- [x] `tests/code.test.ts` : une publication vers A terminée après une bascule
      vers B ne change ni la pastille ni le verdict de B, et libère
      l'interface. Si elle échoue, « Réessayer la publication » n'est pas
      proposé.
- [x] Noter dans le compte rendu la sortie rouge de chaque test.

### Sandbox

- [x] `src/config.ts` : une fonction unique calcule la clé de destination.
      Forme : tuple sérialisé en JSON, jamais une chaîne à séparateurs. Forge
      et projet en minuscules, branche avec sa casse, aucun jeton
      ([4.3](PLAN-REGLAGES.md#43-la-clé-de-destination)). Pour le dépôt unique :
      forge, projet, branche, ou `aucune` quand la configuration est absente
      ou invalide, puisque l'export est alors téléchargé. Tests unitaires dans
      `tests/config.test.ts` : casse, branche contenant `|` ou `@`, absence de
      configuration.
- [x] `src/code.ts` : file du sandbox, une promesse chaînée à la précédente.
      Toute écriture du stockage y passe. Les lectures qui préparent une
      analyse, une publication ou `settings` y passent aussi et rendent un
      instantané, dont dérivent la clé, la configuration privée et les réglages
      publics. Un rejet ne bloque pas la demande suivante. Les appels réseau
      partent après la sortie de la file
      ([4.2, file d'écriture](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton)).
      La taille de la fenêtre n'y passe pas.
- [x] `save-settings` ne vide plus `analysesGardees` : ce vidage produisait E7.
      La clé décide. Le test « une configuration enregistrée rend les analyses
      précédentes impropres à publier » attend le refus de destination.
- [x] `src/code.ts` : `refreshConfiguration` incrémente un compteur de
      génération avant la lecture. Après chaque attente, un test dont la
      génération n'est plus la dernière ne poste rien. Une mutation de la
      configuration active invalide la génération avant sa première attente.
      Un échec de sauvegarde relance le test de la configuration conservée
      ([4.3, fraîcheur](PLAN-REGLAGES.md#43-la-clé-de-destination)).
- [x] `AnalyseGardee` range la clé lue au pré-vol.
- [x] `publier` recalcule la clé. Clé différente : l'analyse est retirée et le
      refus dit « La destination a changé depuis l'analyse : {destination}.
      Relancez l'analyse. ». Relire ce texte avec `rediger-diagnostics-ucm`.
      « La sélection a changé » reste réservé au changement de sélection.
- [x] `publier` garde `refreshConfiguration` après un succès, protégé par la
      génération. Aucun retour à `postConnection('connecte')`
      ([section 11, constat 12](PLAN-REGLAGES.md#11-revue-indépendante)).
- [x] « Réessayer la publication » n'est proposé qu'à clé inchangée.
- [x] `analyser` lit l'instantané avant son premier message, pour que `phase`
      et `diagnostic` portent déjà la clé. Il compare la clé relue à la
      dernière clé envoyée à l'interface ; un écart envoie `settings` et relance
      le test avant le verdict. Relue après l'extraction, une clé différente
      annule l'analyse avec « Analyse annulée : les réglages du plugin ont
      changé. Relancez l'analyse. », écrit sous la clé nouvelle.

### Messages et interface

- [x] `src/messages.ts` : `settings` porte la clé de destination. `phase`,
      `diagnostic`, `verdict`, `status`, `log` et `demande` portent la clé et
      un identifiant d'opération ([4.3, usages](PLAN-REGLAGES.md#43-la-clé-de-destination)).
      L'interface numérote ses demandes `analyser-*` et `publier`, et le
      sandbox renvoie ce numéro. `status` et `download` sans provenance restent
      acceptés : `signalerEchec` en envoie hors de toute opération.
- [x] `src/ui/index.ts` : retirer `composant.reinitialiser()` et
      `tokens.reinitialiser()` de la réception de `settings`. Vider les cartes
      de l'écran de travail quand la clé reçue diffère de la précédente, et
      seulement alors. Le premier `settings` ne vide rien.
- [x] `src/ui/index.ts` : écarter un résultat d'une autre destination ou d'une
      opération ancienne. La fin d'une opération libère l'interface même quand
      son résultat est écarté. Un téléchargement de repli et l'ouverture d'une
      demande déjà créée restent exécutés, sans recréer de verdict ni de lien.
- [x] `src/ui/components/CarteComposant.ts` : `reinitialiser` remet `analysee`
      à faux.
- [x] `galerie/etats.cjs` : les messages rejoués portent clé et opération
      ([section 9](PLAN-REGLAGES.md#9-documents-et-tests-touchés)). Ces deux
      états jouent `settings` avant l'analyse et entre `demande` et le statut,
      comme `publier` : sans cela, leurs captures ne montrent pas E1. Regarder
      les captures de `export-tokens-reussi` et `gitlab-merge-request-creee`.

### Document

- [x] E3 : retirer de `packages/plugin-exporter/SPEC.md`, partie 3, la phrase selon
      laquelle le libellé du bouton annonce l'ouverture du navigateur. Les
      libellés de `PUBLIER` ne changent pas.

### Fin du lot

- [x] Les tests rouges passent au vert. Casser la garde de génération, puis la
      comparaison de clé dans `publier` : constater le rouge, restaurer.
- [x] Vérification complète dans le worktree, galerie comprise. Commit qui cite
      E1, E2, E3, E6, E7 et les rouges constatés. Push.

## L2. Onglets et réglage des tokens

Référence : [lot 2](PLAN-REGLAGES.md#lot-2-onglets-et-réglage-des-tokens),
[section 3](PLAN-REGLAGES.md#3-désactiver-la-gestion-des-tokens),
[section 7](PLAN-REGLAGES.md#7-les-onglets-et-longlet-général). Décisions
appliquées : C2 (réglage global dans Général), P1 (onglet « Dépôts »).

### Sandbox

- [x] `src/config.ts` : clé `gestionDesTokens`, booléen, absente vaut `true`
      ([4.2, clés](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton)). Elle entre
      dans la clé de destination.
- [x] `src/code.ts`, `ui-ready` : lire le réglage par la file avant toute autre
      tâche, puis l'envoyer dans `settings` (champ `tokens`). Réglage
      désactivé : `etatDesTokensDuFichier` n'est pas appelée
      ([3.3, trajet du réglage](PLAN-REGLAGES.md#33-questions-sur-la-séparation)).
- [x] `analyser` passe `avecTokens` selon le réglage. Les lectures de variables
      de G3 restent actives
      ([3.2, G3](PLAN-REGLAGES.md#32-inventaire-complété)).
- [x] Refuser `analyser-tokens` et la publication de genre `tokens` quand le
      réglage est désactivé. Un résumé lancé avant la désactivation n'envoie
      plus `tokens` ni `format-tokens` après elle.
- [x] Demande `gerer-tokens { valeur }` dans `src/messages.ts`. Elle écrit par
      la file, annule une analyse en cours avec « Analyse annulée : les
      réglages du plugin ont changé. Relancez l'analyse. », laisse finir une
      publication, et relance `refreshConfiguration`. « Export annulé. Rien n'a
      été écrit. » reste au bouton « Annuler après cette étape »
      ([3.3, changement pendant une opération](PLAN-REGLAGES.md#33-questions-sur-la-séparation)).
- [x] Réactivation : la carte revient vide et le sandbox lance
      `etatDesTokensDuFichier`
      ([3.3, réactivation](PLAN-REGLAGES.md#33-questions-sur-la-séparation)).
- [x] `src/connexion.ts` : `etatDuDepot` reçoit le réglage. Désactivé, il rend
      « Contrats dans `components`. », et l'avertissement sans
      `ucm.config.json` ne parle que des composants. `repositoryLayout` valide
      toujours le champ `tokens`
      ([3.3, chemin `tokens`](PLAN-REGLAGES.md#33-questions-sur-la-séparation)).

### Interface

- [x] Carte des tokens masquée par défaut, affichée à la réception de
      `settings` quand `tokens` vaut `true` (option M2). L'ordre du DOM ne
      change pas : l'alerte de repli reste après la carte du composant.
- [x] Composant d'onglets dans `src/ui/components/` : `role="tablist"`,
      `role="tab"` avec `aria-selected` et `aria-controls`, `role="tabpanel"`
      avec `aria-labelledby` et `tabindex="0"`. Tabulation sur l'onglet actif
      seul ; flèches gauche et droite, Début et Fin ; activation au focus
      ([7.1, clavier](PLAN-REGLAGES.md#71-les-onglets)).
- [x] Aspect des onglets d'après `@create-figma-plugin/ui` : rangée soulignée
      par `--bordure`, segment de 24 px, marge 4 px sur 8 px, rayon 4 px,
      inactif en `--texte-second`, actif en gras sur `--fond-bloc`, hauteur
      `--hauteur-secondaire` ([7.1, aspect](PLAN-REGLAGES.md#71-les-onglets)).
      Chaque classe nouvelle reçoit sa règle dans `styles.css`
      (`tests/stylesUi.test.ts`).
- [x] `ConfigurationPage.ts` : onglets « Général » et « Dépôts ». Une
      description sous les onglets remplace le sous-titre de `PAGES` :
      « Les réglages du plugin sur ce poste. » et « Les dépôts où les exports
      sont déposés, et le jeton qui autorise chacun. ». Les deux panneaux
      restent dans le DOM.
- [x] Onglet Général : interrupteur « Gérer les tokens », motif WAI-ARIA
      switch, libellé fixe, effet immédiat sans bouton d'enregistrement, aide
      de la maquette de [7.2](PLAN-REGLAGES.md#72-options-de-longlet-général)
      relue avec `rediger-diagnostics-ucm`.
- [x] Onglet Dépôts : le formulaire actuel, déplacé sans changement.
- [x] `Header.ts` et `src/ui/index.ts` : la pastille ouvre Dépôts ;
      l'engrenage ouvre le dernier onglet consulté pendant la session, Général
      au premier clic ([7.1, entrée](PLAN-REGLAGES.md#71-les-onglets)).

### Galerie

- [x] `ouverture()` joue `settings`, réglage activé par défaut.
- [x] Nouveaux états : `ecran-sans-tokens`,
      `gitlab-composant-sans-consigne-tokens`, `configuration-onglet-general`.
- [x] Les états `configuration-*` passent par l'onglet Dépôts.
- [x] Textes « regarder » de `resultat-un-avertissement` et
      `resultat-vingt-avertissements` qui citent la carte des tokens
      ([3.2, G1](PLAN-REGLAGES.md#32-inventaire-complété)).
- [x] Captures relues selon le protocole. Écran à une carte : la hauteur
      libérée revient au compte rendu du composant
      ([3.3, écran à une carte](PLAN-REGLAGES.md#33-questions-sur-la-séparation)).

### Tests

- [x] `tests/code.test.ts`, réglage désactivé : aucune lecture des collections
      à l'ouverture ; analyse et publication de tokens refusées ; `avecTokens`
      faux ; lectures G3 conservées ; résumé tardif ignoré ; bascule qui annule
      une analyse et laisse finir une publication. Les dix tests qui emploient
      `analyser-tokens` restent inchangés, puisque le défaut vaut « activé ».
- [x] `tests/connexion.test.ts` : titre sans chemin de tokens quand le réglage
      est désactivé.
- [x] `tests/interface/interface.test.mjs` : le premier test envoie `settings` ;
      le troisième ouvre l'onglet Dépôts ; carte des tokens masquée jusqu'au
      réglage ; flèches et `aria-selected`.
- [x] Rouge constaté : forcer `avecTokens` à `true`, puis ne plus refuser
      `analyser-tokens` ; restaurer.

### Documents

- [x] `CONTRIBUTING.md`, « La hiérarchie de l'information » : les deux phrases
      réécrites de [3.3, écran à une carte](PLAN-REGLAGES.md#33-questions-sur-la-séparation).
- [x] `packages/plugin-exporter/SPEC.md` : « Contexte technique » et « Analyses et
      publication ».
- [x] `packages/plugin-exporter/README.md`, « Les deux commandes ».
- [x] `docs/guides/POUR-LES-DESIGNERS.md`, section 3 : l'ordre « tokens en
      premier » vaut quand la gestion des tokens est activée.
- [x] `README.md` et `docs/README.md` : rendre « deux commandes » conditionnel
      ([section 9](PLAN-REGLAGES.md#9-documents-et-tests-touchés)).

### Fin du lot

- [x] Vérification complète dans le worktree, `test:ui` et galerie compris.
      Commit, push.

## L3a. Stockage des dépôts

Référence : [lot 3a](PLAN-REGLAGES.md#lot-3a-stockage-des-dépôts),
[4.1](PLAN-REGLAGES.md#41-ce-quun-dépôt-enregistré-contient),
[4.2](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton),
[4.7](PLAN-REGLAGES.md#47-suppression-dun-dépôt). Décisions appliquées : C3
(adresse figée, un projet enregistré une fois), C7 (aucun actif après
suppression de l'actif), C10 (reprise du dépôt configuré, puis effacement des
anciennes clés).

Le formulaire actuel reste l'interface de ce lot. La liste arrive au lot 3b.

### Stockage

- [x] `src/config.ts` : clés `depots`, tableau `{ repoUrl, baseBranch, jeton }`,
      et `depotActif`, identité `forge:projet` en minuscules. Forge, projet et
      identité se recalculent par `lireAdresseDuDepot`.
- [x] `validateSettings` reste l'unique validation, appelée par entrée avec le
      jeton de cette entrée. `forgeDuPrefixe` s'applique à la saisie contre la
      forge de l'adresse de l'entrée.
- [x] Écritures dans l'ordre du tableau « Ordre des écritures » de
      [4.2](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton) : enregistrer
      (`depots`, puis `depotActif` si l'entrée devient active), modifier
      (`depots`), supprimer (`depots`, puis retrait de `depotActif`),
      activer (`depotActif`). Un `depotActif` qui désigne une entrée absente se
      lit comme « aucun dépôt actif ».
- [x] Le premier dépôt enregistré dans une liste vide devient actif
      ([4.1, activation](PLAN-REGLAGES.md#41-ce-quun-dépôt-enregistré-contient)).
      L'exception de l'export local arrive au lot 4.
- [x] Une modification porte l'identité de l'entrée existante. Le sandbox
      refuse un changement d'adresse, même si l'interface a laissé passer le
      champ. Une entrée supprimée entre-temps : « Ce dépôt n'est plus dans la
      liste. ».
- [x] Reprise des anciennes clés `repoUrl`, `baseBranch`, `github_pat` et
      `forge_du_jeton` (C10), par la file, avant toute lecture de
      configuration
      ([4.2, anciennes clés](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton)) :
      1. `depots` absente : lire les quatre clés et appliquer
         `validateSettings`. Un jeton sans `forge_du_jeton` appartient à
         GitHub. Une configuration invalide n'est pas reprise.
      2. Écrire `depots` avec l'entrée valide, ou `[]`. La présence de la clé
         marque la reprise faite. Activer l'entrée reprise dans l'ordre
         d'écriture de 4.2.
      3. Effacer les quatre clés, même quand la configuration était invalide.
         Un échec d'écriture de `depots` conserve les anciennes clés pour la
         prochaine ouverture.
- [x] `depots` présente : garder la liste et le dépôt actif, et terminer
      seulement l'effacement des anciennes clés. Une `depots` illisible rend
      une erreur de stockage et n'est jamais écrasée par une reprise.
- [x] Retirer le commentaire de `STORAGE_KEYS` sur `github_pat`.
- [x] Retirer l'ordre d'écriture en quatre temps de `saveSettings`,
      `jetonAutreForge` et la clé `forge_du_jeton`.
- [x] `src/code.ts` : les nouvelles écritures passent par la file du lot 0.

### Messages, connexion, formulaire

- [x] `src/connexion.ts` : retrait de la cause `jeton-autre-forge`.
- [x] `src/messages.ts` : type `ReglagesPublics` de
      [4.2, forme publique](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton) ;
      `supprimer-depot` remplace `supprimer-token`.
- [x] `src/config.ts` : calculer `nom`, dernier segment de l'adresse, puisque
      `ReglagesPublics` le porte. Le plan range ce calcul au lot 3c ; cette
      liste l'avance ici pour que la liste du lot 3b ait un nom à afficher.
      Un chemin GitLab à sous-groupes donne son dernier segment.
- [x] `ConfigurationPage.ts` : le formulaire enregistre le premier dépôt ou
      modifie l'actif ; adresse en lecture seule après enregistrement ;
      suppression de l'entrée active entière. Le bouton « Supprimer le token
      enregistré » disparaît.

### Galerie

- [x] Retirer `gitlab-jeton-autre-forge`. Adapter `configuration-remplie` et le
      scénario de suppression aux nouveaux messages.

### Tests

- [x] `tests/config.test.ts` : appliquer le tableau « Tests de
      `tests/config.test.ts` » de
      [4.2](PLAN-REGLAGES.md#42-stockage-et-règle-du-jeton), ligne par ligne.
      Le test « un jeton enregistré avant GitLab appartient à GitHub » reste,
      pour la reprise.
- [x] `tests/config.test.ts`, reprise : un dépôt GitHub, un projet GitLab, une
      configuration invalide écartée et ses clés effacées, une liste `depots`
      déjà présente, une panne à chaque écriture et à chaque effacement. Une
      nouvelle ouverture termine le nettoyage sans réimporter ni écraser un
      dépôt, liste vide comprise.
- [x] `tests/code.test.ts` : harnais qui écrit `depots` et un faux `forgeDe` qui
      enregistre le jeton et le projet de chaque adaptateur créé. Le jeton de A
      n'accompagne aucune requête vers B, à l'ouverture, au pré-vol, à la
      publication et après une bascule. Les deux tests de sauvegarde passent
      aux demandes d'enregistrement ; « aucun message ne contient le jeton »
      reste sur chacune.
- [x] `tests/code.test.ts`, nouveaux : suppression et modification envoyées
      ensemble sans retour de l'entrée ; échec d'écriture qui ne bloque pas la
      demande suivante ; lecture qui n'observe pas une activation à moitié
      écrite ; modification qui ne change pas l'adresse ; identité comparée en
      minuscules.
- [x] `tests/interface/interface.test.mjs` : formulaire adapté et suppression
      de l'entrée active.
- [x] Rouge constaté : retirer la file autour d'une suppression, la
      vérification d'adresse figée, puis le marqueur de reprise faite ;
      restaurer.

### Documents

- [x] `AGENTS.md` : réécrire l'invariant « Un jeton ne part que vers la forge
      qui l'a reçu » en « Un jeton ne part que vers le dépôt qui l'a reçu ». Il
      cite encore `src/config.ts` et `validateSettings()`, que `AUTORITES` de
      `tests/inventaireInvariants.test.ts` exige. Mettre à jour la ligne de
      `config.ts` dans la carte du code.
- [x] `packages/plugin-exporter/SPEC.md`, partie 3 : stockage, règle du jeton, file
      d'écriture et sa limite entre deux fenêtres. L'énoncé en gras change :
      `ENONCES_SPEC` de `tests/inventaireInvariants.test.ts` change dans le
      même commit.

### Fin du lot

- [x] Vérification complète dans le worktree. Commit, push.

## L3b. Liste des dépôts

Référence : [lot 3b](PLAN-REGLAGES.md#lot-3b-liste-des-dépôts),
[4.5](PLAN-REGLAGES.md#45-test-de-connexion),
[4.6](PLAN-REGLAGES.md#46-interface-de-la-liste),
[7.1, enregistrement](PLAN-REGLAGES.md#71-les-onglets). Décisions appliquées :
C4 (cartes dépliables), C5 (test de l'actif et du dépôt enregistré), C13
(catégorie `mixte`), P3, P4.

### Sandbox

- [x] Demandes `enregistrer-depot` et `activer-depot { id }`, par la file.
      `activer-depot` écrit `depotActif`, annule une analyse en cours, laisse
      finir une publication, relance `refreshConfiguration`
      ([4.4](PLAN-REGLAGES.md#44-changer-de-dépôt-actif)).
- [x] Refus du doublon, identité en minuscules, sous le champ adresse : « Ce
      repository est déjà dans la liste. », mot lu dans `termes.depot`
      ([4.1, doublon](PLAN-REGLAGES.md#41-ce-quun-dépôt-enregistré-contient)).
- [x] Réponses `depot-enregistre { requete, carte, id, erreurs }` et
      `depot-teste { id, generation, etat, statut, geste, destination }`. Une
      erreur levée pendant l'enregistrement rend une erreur générale.
- [x] Enregistrer un dépôt teste cette entrée, active ou non. Aucun autre
      dépôt inactif n'est testé (T1).
- [x] Génération de test par dépôt : enregistrer B ne périme pas un test de A ;
      modifier ou supprimer A le périme. Une réponse de carte ne met à jour la
      pastille et `depot` que si l'entrée est encore active avec les mêmes
      réglages ([4.3, fraîcheur](PLAN-REGLAGES.md#43-la-clé-de-destination)).
- [x] Retirer les messages du formulaire unique encore employés au lot 3a.
- [x] `src/connexion.ts` : statut court par cause pour la carte ; gestes du
      401, du 403, du 404 et de `ucm.config.json` fautif du tableau de
      [4.6](PLAN-REGLAGES.md#46-interface-de-la-liste), relus avec
      `rediger-diagnostics-ucm`.
- [x] `src/connexion.ts` : `EtatDuDepot.repli` devient une cause,
      `null | 'aucun-depot' | 'aucun-actif' | 'debranche'`. Textes S1 et S2 de
      [section 6](PLAN-REGLAGES.md#6-débrancher-les-dépôts) pour la ligne sous
      la carte, le verdict `sans-depot` et le journal. Répartition propre à
      cette liste : le lot 3b introduit les causes et leurs textes, le lot 4
      ajoute S4.

### Interface

- [x] Liste rendue par `id`. Un message `settings` met à jour les cartes sans
      refermer une carte dépliée en cours de saisie.
- [x] Liste vide : « Veuillez ajouter un dépôt. ». Bouton « Ajouter un dépôt »
      qui crée une carte dépliée en fin de liste, avec un identifiant
      temporaire conservé dans la demande et sa réponse.
- [x] Carte repliée sur `--fond-bloc` : bouton de dépli qui porte le nom et
      `aria-expanded`, et bouton voisin « Se connecter ». Aucun bouton dans un
      autre ; un clic sur « Se connecter » ne déplie pas la carte.
- [x] Nom de carte : `overflow-wrap: anywhere` et largeur réductible
      ([section 5, le nom](PLAN-REGLAGES.md#5-la-pastille-de-len-tête)).
      La carte lit `nom` dans `ReglagesPublics`, calculé depuis le lot 3a.
- [x] Statut : « Connecté » en vert pour l'actif connecté ; « Connexion… » en
      couleur secondaire pendant le test ; la cause en rouge en échec, geste en
      tête de la carte dépliée (P3).
- [x] Carte dépliée : « URL du dépôt » en lecture seule après enregistrement,
      « Repository GitHub : … », « Branche de base », bloc de destination issu
      de `depot-teste`, jeton, « Enregistrer », « Supprimer ».
- [x] Repli après un enregistrement accepté et un test réussi ; la carte reste
      dépliée tant que l'enregistrement ou le test échoue.
- [x] Suppression au second clic, « Confirmer la suppression ». Une carte jamais
      enregistrée s'abandonne sans confirmation (P4).
- [x] La garde `settingsDirty` passe à la carte. Après une sauvegarde réussie,
      le champ du jeton envoyé est vidé, même si le test échoue ; une valeur
      retapée depuis l'envoi reste. Une erreur de stockage conserve la saisie
      ([7.1, enregistrement](PLAN-REGLAGES.md#71-les-onglets)).
- [x] Pastille retirée de la page de configuration. Arrivée par la pastille sur
      un actif en échec : carte dépliée et amenée dans la vue.
- [x] Vocabulaire : « dépôt » pour les textes qui ignorent la forge,
      `src/forges/termes.ts` pour les autres
      ([4.6, vocabulaire](PLAN-REGLAGES.md#46-interface-de-la-liste)).

### Galerie

- [x] `tests/galerie.test.ts` : catégorie `forge: 'mixte'`. La loi y vérifie
      chaque message contre la forge de son sujet : dépôt actif pour
      `connection`, dépôt de l'opération pour `verdict`, `status`, `log`,
      `demande`, entrée désignée par `id` pour `depot-teste`. Un test d'un dépôt
      GitLab inactif pendant que GitHub est actif reste accepté
      ([4.6, galerie](PLAN-REGLAGES.md#46-interface-de-la-liste)).
- [x] Rouge constaté : un état `mixte` où `connection` emploie un mot de l'autre
      forge ; restaurer.
- [x] `AGENTS.md` : l'invariant « Tout texte du plugin qui nomme une forge »
      décrit la catégorie `mixte`, dans le même commit.
- [x] Réécrire les autres `configuration-*` et `gitlab-dossier-retire`.
      `depot-non-configure` et `export-sans-depot` deviennent S1.
- [x] Nouveaux états : `depots-aucun`, `depots-trois-deux-forges`,
      `depots-nouveau-erreurs`, `depots-doublon`, `depots-actif-deplie`,
      `depots-actif-jeton-refuse`, `gitlab-depots-actif-introuvable`,
      `depots-suppression-confirmation`, `depots-aucun-actif`,
      `destination-changee`.
- [x] Relecture : les captures suivent les maquettes de
      [4.6](PLAN-REGLAGES.md#46-interface-de-la-liste). Onglet Dépôts à trois
      dépôts repliés : 12 objets. Noter le compte dans le compte rendu.

### Tests

- [x] `tests/interface/interface.test.mjs` : « Se connecter » en un clic sans
      déplier ; suppression au second clic ; carte dépliée conservée à la
      réception de `settings` ; repli après sauvegarde et test réussis ; retours
      de deux cartes nouvelles sans doublon de carte ; champ du jeton vidé
      après sauvegarde.
- [x] `tests/code.test.ts` : enregistrer un dépôt inactif teste ce dépôt et ne
      vide aucune analyse ; résultat ignoré après modification ou suppression
      de l'entrée ; doublon refusé quelle que soit la casse.

### Documents

- [x] `docs/guides/POUR-LES-DESIGNERS.md`, « Configurer le dépôt ».
- [x] `packages/plugin-exporter/README.md`, « Où l'export atterrit ».

### Fin du lot

- [x] Vérification complète dans le worktree, `test:ui` et galerie compris.
      Commit, push.

## L3c. Pastille nommée et verdict nommé

Référence : [lot 3c](PLAN-REGLAGES.md#lot-3c-pastille-nommée-et-verdict-nommé),
[section 5](PLAN-REGLAGES.md#5-la-pastille-de-len-tête),
[4.4, verdict](PLAN-REGLAGES.md#44-changer-de-dépôt-actif). Décisions
appliquées : C6 (dernier segment suivi de « connecté », nom dans les échecs),
C12 (le verdict nomme le dépôt).

- [x] `src/connexion.ts` : `etatDeConnexion` reçoit le nom dans sa précision.
      `EtatConnexion.pastille` reste une chaîne. Textes du tableau « Les états »
      de la [section 5](PLAN-REGLAGES.md#5-la-pastille-de-len-tête), dont
      `ucm.config.json fautif` à la place de « repository mal décrit »,
      `aucun dépôt` et `aucun dépôt actif`.
- [x] Pastille : `overflow-wrap: anywhere`, largeur réductible, aucune
      troncature ; l'attribut `title` garde « Ouvrir la configuration ».
- [x] `src/prevol.ts` : verdict `a-publier` « Prêt à publier dans
      {nom} : `{chemin}` (d'après ucm.config.json). ».
- [x] Galerie : `ouverture()` passe un nom, ce qui met à jour les 32 appels de
      `ouverture('connecte')`. Nouvel état `pastille-nom-long` : chemin GitLab
      à sous-groupes et dernier segment long sans séparateur.
- [x] Tests : `tests/connexion.test.ts` (nom d'un chemin à sous-groupes, nom
      dans chaque cause) ; `tests/prevol.test.ts` (verdict nommé).
- [x] Vérification complète dans le worktree, galerie comprise. Regarder
      `pastille-nom-long` à 320 px : aucun débordement. Commit, push.

## L4. Export local

Référence : [lot 4](PLAN-REGLAGES.md#lot-4-export-local),
[section 6](PLAN-REGLAGES.md#6-débrancher-les-dépôts),
[7.2](PLAN-REGLAGES.md#72-options-de-longlet-général). Décisions appliquées :
C9 (interrupteur dans Général, désactivé par défaut, mémorisé), C14 (test à
l'enregistrement même en export local), P2.

### Sandbox

- [x] `src/config.ts` : clé `exportLocal`, absente vaut `false`. Elle entre
      dans la clé de destination (`local`).
- [x] Demande `export-local { valeur }`, par la file. `loadConfiguration` ne
      rend aucune configuration de publication quand elle vaut `true`. Aucun
      test automatique ne part à l'ouverture.
- [x] Activer un dépôt (« Se connecter ») écrit `depotActif`, puis
      `exportLocal` à `false`. Désactiver l'export local rallume le dernier
      dépôt actif, que `depotActif` garde, et teste ce dépôt
      ([6, rebranchement](PLAN-REGLAGES.md#6-débrancher-les-dépôts),
      [4.5, export local](PLAN-REGLAGES.md#45-test-de-connexion)).
- [x] Le premier dépôt enregistré dans une liste vide ne devient pas actif en
      export local ([4.1](PLAN-REGLAGES.md#41-ce-quun-dépôt-enregistré-contient)).
- [x] C14 : « Enregistrer » teste le dépôt, même en export local. Le résultat
      met à jour la seule carte testée. Il ne change ni le dépôt actif, ni la
      pastille `export local`, ni la destination des exports. La carte se
      replie après une sauvegarde et un test réussis, et reste dépliée en cas
      d'échec ([4.5, export local](PLAN-REGLAGES.md#45-test-de-connexion)).
- [x] Une publication déjà lancée finit avec sa configuration de départ. Un
      test déjà lancé ne rétablit pas l'état connecté. Le verdict d'une analyse
      locale ne dit rien de l'immobilité ni de la collision
      ([6, réseau](PLAN-REGLAGES.md#6-débrancher-les-dépôts)).
- [x] `src/connexion.ts` : cause `debranche` et textes S4 de la
      [section 6](PLAN-REGLAGES.md#6-débrancher-les-dépôts), relus avec
      `rediger-diagnostics-ucm`. État de pastille `local`, texte
      `export local`, en `--texte-avertissement`.

### Interface

- [x] Onglet Général : interrupteur « Activer l'export local », sous « Gérer
      les tokens », désactivé par défaut, visible sans dépôt, aide « Les exports
      sont téléchargés sur votre poste, et aucune demande de fusion n'est
      ouverte. ».
- [x] Onglet Dépôts en export local : toutes les cartes affichent « Se
      connecter », et une ligne en couleur d'avertissement sous la description
      dit « Export local activé dans Général : les exports sont téléchargés sur
      votre poste. » ([4.6, export local](PLAN-REGLAGES.md#46-interface-de-la-liste)).
- [x] Ligne de repli sous la carte du composant en sévérité avertissement,
      comme la pastille.

### Galerie et tests

- [x] États : `general-export-local-active`, `depots-export-local`,
      `travail-export-local`, `export-local-termine`.
- [x] `tests/code.test.ts` : aucune nouvelle opération réseau en export local,
      sauf le test après enregistrement ; ce test met à jour sa carte sans
      changer le dépôt actif, la pastille ni la destination des exports ;
      aucun test à l'ouverture en export local ; publication déjà lancée menée
      à terme sans rétablir la connexion ; une analyse faite vers un dépôt ne
      se publie pas en export local ; désactiver l'export local rallume et
      teste le dernier actif ; « Se connecter » désactive l'export local.
- [x] `tests/connexion.test.ts` et `tests/interface/interface.test.mjs` :
      pastille `local`, ligne d'avertissement de l'onglet Dépôts.
- [x] Rouge constaté : laisser `loadConfiguration` rendre la configuration en
      export local ; restaurer.

### Documents

- [x] `packages/plugin-exporter/SPEC.md`, partie 3 ; `docs/guides/POUR-LES-DESIGNERS.md`.

### Fin du lot

- [x] Vérification complète dans le worktree, `test:ui` et galerie compris.
      Commit, push.

## L6. Recette dans Figma

Référence : [lot 6](PLAN-REGLAGES.md#lot-6-recette-dans-figma). Les mesures à
deux fenêtres et entre application et navigateur ne se font pas, par décision
du mainteneur ([4.3](PLAN-REGLAGES.md#43-la-clé-de-destination)).

- [x] Préparer `packages/plugin-exporter/dist/` par `npm run build` et écrire dans le
      compte rendu les trois épreuves ci-dessous, avec les états de galerie qui
      leur correspondent.
- [X] **[mainteneur]** Réglage des tokens désactivé : aucune carte ne clignote
      à l'ouverture.
- [X] **[mainteneur]** Onglets à côté du panneau de droite de Figma, deux
      thèmes, fenêtre de 320 × 320 px, contraste du texte de sévérité à 11 px,
      carte en échec amenée dans la vue.
- [X] **[mainteneur]** Bascule réelle entre un dépôt GitHub et un projet
      GitLab, publication dans chacun.

## Clôture

- [x] Relire `AGENTS.md`, `CONTRIBUTING.md`, `packages/plugin-exporter/SPEC.md`,
      `packages/plugin-exporter/README.md`, `docs/guides/POUR-LES-DESIGNERS.md`,
      `README.md` et `docs/README.md` ; retirer toute description devenue
      fausse ou dupliquée, dont « repository connecté », « Supprimer le token
      enregistré » et `forge_du_jeton`.
- [x] Les questions à l'équipe consommatrice de la
      [section 10](PLAN-REGLAGES.md#10-questions-restantes) ne bloquent aucun
      lot : les recopier dans le compte rendu si elles restent ouvertes.
- [x] `npm test`, `npm run typecheck`, `npm run build`, `test:ui` et la galerie
      verts dans un worktree isolé.

## Compte rendu

L'agent écrit ici, par lot : les rouges constatés, les écarts au plan, les
questions posées au mainteneur et leur réponse.

### Revue de la liste avant exécution

Écarts relevés contre le code de `43fc976`, corrigés dans la liste ou dans le
plan :

- `tests/etatDesTokens.test.ts` n'existe pas : le résumé des tokens se teste
  dans `tests/exportTokens.test.ts`. Le plan le citait en 3.2, 8 et 9.
- `galerie/etats.cjs` importe `etatDesTokens` : le renommage E4 l'inclut.
- E7 vient du `analysesGardees.clear()` de `save-settings`, que le lot 0
  retire.
- `analyser` envoyait `phase` et `diagnostic` avant de lire la configuration :
  un écart de clé découvert au pré-vol aurait vidé les points à corriger de
  l'analyse en cours. L'instantané se lit désormais avant le premier message.
- Le plan ne disait ni qui crée l'identifiant d'opération, ni le sort d'un
  message sans provenance, ni celui du premier `settings`.
- La file du stockage ne prend pas la taille de la fenêtre.
- Les états `export-tokens-reussi` et `gitlab-merge-request-creee` ne jouaient
  pas `settings` : leurs captures ne pouvaient pas montrer E1.
- Lot 3a, à surveiller : avec `depots=[X]` sans dépôt actif après une reprise
  interrompue, le formulaire unique ne peut ni activer X ni le ressaisir. Le
  lot 3b le résout.
- `AGENTS.md` porte des modifications non commitées d'une autre session :
  aux lots 3a et 3b, attendre leur commit avant un `commit --only AGENTS.md`.

### P

Code du plugin identique entre `94ec0a9` et `43fc976`, symboles présents.
Suite, typage, build, `test:ui` et galerie verts dans un worktree. Référence :
88 captures par état (clair, sombre) et 33 planches, dans le dossier temporaire
de la session.

### L1 (`bfbb1d3`)

Rouge : `etat` calculé sans la consigne des tokens fait échouer « le verdict
passe en warning quand il porte une consigne sur les tokens ou un point à
corriger ». Les 88 captures par état sont identiques octet pour octet à la
référence. Cinq planches différaient ; deux captures successives du même code
en font différer neuf : les planches ne sont pas déterministes.

### L0

Rouges sur le code de départ :

- « deux enregistrements rapprochés » : le test lent poste encore
  `connection` et `depot` après le second enregistrement ;
- « une publication croisée avec un enregistrement » : « La sélection a
  changé. Analysez le composant sélectionné avant de publier. » ;
- « une publication vers A réussie après une bascule vers B » : le verdict ne
  porte pas de destination. Sans cette assertion, `settings` et deux
  `connection` partent après la bascule ;
- « une publication vers A échouée après une bascule vers B » : même premier
  rouge, puis « Réessayer la publication » proposé ;
- `interface.test.mjs` : le lien disparaît au rechargement des réglages (E1),
  et la destination changée laisse « Analyser le composant » désactivé (E2).

Mutations : sans garde de génération après le test réseau, le test des
enregistrements rapprochés rougit ; sans comparaison de clé dans `publier`, le
test croisé et le test de la configuration enregistrée rougissent.

Écarts au plan : le test « deux demandes simultanées ne lancent qu'une
analyse » attend un tour de boucle avant de compter, puisque l'analyse lit le
stockage avant l'extraction. Après un succès, `publier` ne relance le test que
si la destination annoncée est encore la sienne : sinon le test de B aurait
affiché « connexion… » une seconde fois. Un enregistrement refusé relance le
test sans renvoyer `settings`, pour que le formulaire garde la saisie.

### L2

Rouges constatés par mutation : `avecTokens` forcé à `true` fait échouer
« l'analyse d'un composant ne lit pas l'état des tokens » ; le refus
d'`analyser-tokens` retiré fait échouer « analyse et publication des tokens
refusées » ; la génération du résumé retirée fait échouer « un résumé lancé
avant la désactivation ne s'affiche pas après elle ».

Écarts au plan :

- la clé de destination porte le réglage comme dernier membre du tuple.
  `memeDepot` compare deux clés sans lui : le refus de publication dit alors
  « la gestion des tokens a changé » ;
- le refus d'une commande des tokens, que le plan ne rédigeait pas : « La
  gestion des tokens est désactivée. Activez « Gérer les tokens » dans
  l'onglet Général de la configuration. » ;
- à la première réception de `settings`, la carte des tokens garde le résumé
  s'il est arrivé avant : seule une réactivation la remet en lecture ;
- la galerie joue `settings` dans `ouverture()` et dans `connexion-en-cours` ;
  les deux états du lot 0 qui le jouaient avant l'analyse ne le rejouent plus ;
- `README.md` et `docs/README.md` sont indexés par une autre session : leur
  « deux commandes » attend son commit. `SPEC.md` décrit aussi la clé de
  destination, et `CONTRIBUTING.md` la range dans l'identité du sujet.

Relecture : `configuration-onglet-general` suit la maquette de 7.2 dans les
deux thèmes ; `ecran-sans-tokens` ne montre que la carte du composant ;
`gitlab-composant-sans-consigne-tokens` montre un verdict sans consigne.

### L3a

Rouges constatés par mutation : la suppression sortie de la file fait échouer
« une suppression et une modification envoyées ensemble ne font pas revenir
l'entrée » ; la vérification de l'adresse figée retirée fait échouer deux
tests de modification ; le marqueur de reprise retiré fait échouer la reprise
d'une configuration invalide. Le premier test ne rougissait pas dans sa
première forme : il retient désormais l'écriture de la modification jusqu'à ce
que la suppression ait pu passer.

Écarts au plan :

- `DepotPublic` porte aussi `repoUrl` : le formulaire affiche l'adresse
  enregistrée, qu'une page GitLab copiée peut porter ;
- le refus du doublon (« Ce repository est déjà dans la liste. ») arrive dès
  ce lot : l'identité doit rester unique pour que `depotActif` désigne une
  seule entrée ;
- le refus d'un changement d'adresse dit : « L'adresse d'un dépôt enregistré
  ne change pas. Pour un autre projet, ajoutez un dépôt. » ;
- `save-settings` reste le message du formulaire, avec l'identité de l'entrée
  modifiée ou `null` ; le lot 3b le remplace par `enregistrer-depot` ;
- la reprise ouvre la file du sandbox au chargement du routeur, avant toute
  lecture, même sans `ui-ready` ;
- le harnais de `code.test.ts` lit son faux stockage après l'appel, comme
  `clientStorage` : sans cela, la reprise lancée au chargement écrasait la
  liste écrite par le test ;
- la galerie gagne `configuration-suppression-confirmation`, le second clic
  de « Supprimer » ; `configuration-erreurs-champs` ne peut plus préremplir
  une adresse par `settings` ;
- une adresse en lecture seule prend le fond des blocs et la couleur
  secondaire ;
- `AGENTS.md` porte encore une modification indexée par une autre session :
  le commit ne prend que l'invariant et la carte du code, par un index
  temporaire.

### L3b

Rouge constaté : un état `mixte` où `connection` nomme GitLab pendant que le
dépôt actif est GitHub fait échouer la loi de la galerie
(« depots-trois-deux-forges : connection affiche « GitLab » »). La loi a aussi
attrapé deux états mal classés à sa première exécution.

Le test « enregistrer un dépôt inactif teste ce dépôt pour sa carte » a
révélé un défaut : l'enregistrement d'un dépôt inactif relançait aussi le test
du dépôt actif, et la pastille repassait par « connexion… ». Seule la liste
est désormais annoncée dans ce cas.

Relecture : l'onglet Dépôts à trois dépôts repliés compte 12 objets (titre,
« Retour », deux onglets, description, « Ajouter un dépôt », puis nom et état
de chaque carte). Les captures suivent les maquettes de 4.6 : dépôt actif
connecté, carte en échec dépliée à l'arrivée par la pastille, doublon refusé
sous le champ adresse, carte nouvelle refusée.

Écarts au plan :

- la loi `mixte` lit le dépôt actif dans chaque `settings` et juge un résultat
  d'opération sur sa propre clé de destination ; `forgeActive` ne sert qu'à
  la provenance par défaut des résultats rejoués ;
- la galerie gagne une étape `saisie`, pour rejouer une adresse tapée dans une
  carte nouvelle ;
- le statut court et le geste d'une carte viennent de `etatDeCarte`. Les
  gestes du 401 et du 404 de 4.6 ne valent que dans la carte : la pastille et
  l'échec d'une publication gardent les leurs. Le geste d'un `ucm.config.json`
  fautif nomme désormais le dépôt dans les mots de sa forge ;
- une carte nouvelle naît avec la branche `main`, comme l'ancien formulaire ;
- `depots-aucun-actif` est un état `aucune` : sans dépôt actif, la pastille
  nomme les deux demandes ;
- les états `configuration-vierge`, `configuration-remplie`,
  `configuration-erreurs-champs`, `configuration-connexion-reussie`,
  `configuration-chemins-du-depot`, `configuration-chemins-par-defaut`,
  `configuration-cause-affichee`, `configuration-suppression-confirmation`,
  `gitlab-jeton-refuse`, `gitlab-acces-refuse`, `gitlab-projet-introuvable` et
  `gitlab-dossier-retire` laissent la place aux états `depots-*`, qui
  couvrent les mêmes situations dans la liste.

### L3c

Rouge constaté : la pastille qui oublie le nom fait échouer « la pastille
nomme le dépôt actif dans chaque cause ».

Mesure de `pastille-nom-long` à 320 px, par Playwright : la pastille tient sur
deux lignes, son bord droit à 289 px, et la page défile sur 305 px pour
320 px visibles, sans défilement horizontal.

Écarts au plan :

- la pastille sans dépôt visé suit la cause du repli : « aucun dépôt » ou
  « aucun dépôt actif », et son geste dit où agir (« Ajoutez un dépôt et son
  jeton dans la configuration. », « Cliquez « Se connecter » sur un dépôt de
  la configuration. ») ;
- l'état `connexion-en-cours` de la galerie nomme aussi le dépôt ;
- la galerie ne compte plus 32 appels de `ouverture('connecte')` à mettre à
  jour : `ouverture()` calcule le nom une fois pour tous.

### L4

Rouge constaté : `lireInstantane` qui garde la validation du dépôt actif en
export local fait échouer « export local : aucune opération réseau à
l'ouverture, à l'analyse ni à la publication, et le contrat est téléchargé »,
« export local : enregistrer un dépôt le teste pour sa seule carte, sans
toucher au dépôt actif, à la pastille ni à la destination » et « activer
l'export local laisse finir une publication lancée, sans rétablir la
connexion ». La suite s'arrête ensuite sur « un test de connexion lancé avant
l'export local ne rétablit pas l'état connecté », dont l'attente ne se résout
plus.

Relecture des quatre nouveaux états, dans les deux thèmes : la pastille
« export local » et la ligne sous la carte du composant portent la même couleur
d'avertissement. L'onglet Dépôts en export local compte 13 objets, un de plus
que la douzaine du protocole ; sans la ligne ambre, trois cartes « Se
connecter » ne diraient pas pourquoi aucune n'est connectée.

Écarts au plan :

- `settings` garde l'identité du dépôt actif en export local, pour le
  rebranchement, et la liste l'ignore : elle n'affiche « Connecté » sur aucune
  carte ;
- le repli `debranche` passe avant `aucun-depot` et `aucun-actif` : en export
  local, la ligne et le verdict disent l'export local, même sans dépôt
  enregistré ;
- la galerie atteint ces états par un lot de trois messages (`settings`,
  `connection`, `depot`) et aucun test, ce que `refreshConfiguration` envoie en
  export local.

La phrase « deux commandes » du lot 2 attendait le commit d'une autre session
sur `README.md` et `docs/README.md`. Les deux documents portent encore la
montée de version de cette session : le commit de ce point ne prend que ses
propres lignes, par un index temporaire.

### L6

`packages/plugin-exporter/dist/` est prêt : `npm run build` y a écrit `code.js`,
`ui.html` et `manifest.json`. Le mainteneur charge ce dossier par « Import
plugin from manifest » et passe les trois épreuves ci-dessous. Chacune a ses
états de galerie, déjà relus hors de Figma ; la colonne de droite dit ce que
seule l'application ajoute.

| Épreuve | États de galerie | Ce que Figma seul montre |
|---|---|---|
| Réglage des tokens désactivé : aucune carte ne clignote à l'ouverture | `ecran-sans-tokens`, `fichier-sans-tokens` | L'ordre réel des messages au démarrage, que la galerie rejoue sans attente |
| Onglets à côté du panneau de droite, deux thèmes, fenêtre de 320 × 320 px, contraste du texte de sévérité à 11 px, carte en échec amenée dans la vue | `configuration-onglet-general`, `general-export-local-active`, `depots-trois-deux-forges`, `depots-actif-jeton-refuse`, `depots-export-local`, `pastille-nom-long` | La densité du panneau natif et le contraste sur les vraies `--figma-color-*`, que le décalque de la galerie ne prouve pas |
| Bascule réelle entre un dépôt GitHub et un projet GitLab, publication dans chacun | `depots-trois-deux-forges`, `destination-changee`, `gitlab-merge-request-creee`, `echec-github-repli-local` | Les deux API et les deux demandes de fusion, hors de la frontière de recette |

### Clôture

Relecture des sept documents. « repository connecté » et « Supprimer le token
enregistré » ont disparu avec les lots 3c et 3a. `forge_du_jeton` reste dans
`packages/plugin-exporter/SPEC.md`, partie 3 : la reprise des anciennes clés lit encore
cette clé, et la phrase décrit ce que le code fait. Deux descriptions y étaient
devenues fausses, et sont corrigées : « le formulaire » pour la carte d'un
dépôt, et l'écriture de `depotActif` à l'enregistrement d'un premier dépôt,
donnée sans sa condition d'export local.

Les quatre questions à l'équipe consommatrice de la
[section 10](PLAN-REGLAGES.md#10-questions-restantes) restent ouvertes, et
aucun lot ne les attendait :

- dans combien de projets GitLab publie-t-elle ?
- son projet impose-t-il un nom de branche ou un message de commit ?
- où ses composants sont-ils rangés, et le chemin
  `{components}/{Nom}/{Nom}.contract.json` place-t-il le contrat à côté du
  code ?
- écrira-t-elle `ucm.config.json` à la main ?

Vérification finale, dans le worktree : `npm test` (23, 168, 371, 774 et 23
tests), `npm run typecheck`, `npm run build` étape par étape, `test:ui`
(10 tests) et la galerie (50 états atteignables, aucune situation sans écran).
`node scripts/controle-style.mjs` passe sur le dépôt entier.

Reste le lot 6, qui demande Figma.
