# Plan d'action des réglages du plugin

> Statut : livrable de la section 11 de
> [RECHERCHE-REGLAGES.md](./RECHERCHE-REGLAGES.md), rendu sous forme de plan
> d'action, révisé après une revue indépendante
> ([section 11](#11-revue-indépendante)), puis après la porte H1. Le mainteneur
> a tranché les décisions de la [section 1](#1-décisions).
> Les mesures ci-dessous portent sur `94ec0a9` ; la revue du plan contre
> `43fc976` ne les remesure pas.
> Aucune ligne de code n'a été modifiée pour l'écrire.

Les mesures de ce plan ont été faites hors de Figma : l'interface reconstruite
depuis la source du commit lu et rejouée dans Chromium par Playwright, police
Inter, fenêtre de 320 px ; le routeur réel de `code.ts` exécuté dans les
harnais de `tests/code.test.ts`. Ce qui demande Figma est rangé dans la
[recette finale](#lot-6-recette-dans-figma).

## 1. Décisions

| # | Sujet | Décision | Section |
|---|---|---|---|
| C1 | Défauts actuels de fraîcheur et de réinitialisation | Corriger d'abord, lot 0 | [2.2](#22-écarts-relevés-hors-du-plan) |
| C2 | Emplacement du réglage des tokens | Option A : réglage global, onglet Général | [3.4](#34-où-ranger-le-réglage) |
| C3 | Identité d'un dépôt enregistré | Adresse figée après le premier enregistrement, un projet enregistré une fois | [4.1](#41-ce-quun-dépôt-enregistré-contient) |
| C4 | Forme de l'onglet des dépôts | Liste de cartes dépliables dessinée par le mainteneur | [4.6](#46-interface-de-la-liste) |
| C5 | Test de connexion | Sans réponse explicite : la recommandation s'applique, dépôt actif seul plus le dépôt qu'on vient d'enregistrer | [4.5](#45-test-de-connexion) |
| C6 | Nom dans la pastille | Dernier segment de l'adresse, suivi de « connecté », sans autre texte ; le nom figure aussi dans les états d'échec | [5](#5-la-pastille-de-len-tête) |
| C7 | Dépôt actif après la suppression de l'actif | Aucun | [4.7](#47-suppression-dun-dépôt) |
| C8 | Changement de destination entre l'analyse et la publication | Clé de destination | [4.3](#43-la-clé-de-destination) |
| C9 | Débranchement | Interrupteur « Activer l'export local » dans Général, désactivé par défaut, mémorisé à la fermeture du plugin | [6](#6-débrancher-les-dépôts) |
| C10 | Anciennes clés de stockage (D3) | Reprendre le dépôt valide et son jeton, puis effacer les anciennes clés ; remplace D3 | [4.2](#42-stockage-et-règle-du-jeton) |
| C11 | « Effacer les données du plugin » | Écarté : supprimer un dépôt efface ses données | [7.2](#72-options-de-longlet-général) |
| C12 | Le verdict nomme le dépôt de destination | Oui | [4.4](#44-changer-de-dépôt-actif) |
| C13 | Loi de la galerie face à une liste de deux forges | Catégorie `mixte` | [4.6](#46-interface-de-la-liste) |
| C14 | Enregistrer un dépôt pendant l'export local | Tester à l'enregistrement ; le résultat concerne seulement la carte testée | [4.5](#45-test-de-connexion) |
| E3 | Phrase de `SPEC.md` sur le libellé qui annonce l'ouverture du navigateur | Retirer la phrase | [2.2](#22-écarts-relevés-hors-du-plan) |
| M | Mesures dans Figma : deux fenêtres, application de bureau et navigateur | Non faites | [4.3](#43-la-clé-de-destination) |
| Q | Intention de la réinitialisation ajoutée par `34e584c` | Close : la clé de destination remplace ce mécanisme | [4.3](#43-la-clé-de-destination) |

Points de maquette, détaillés en [4.6](#46-interface-de-la-liste) :

| # | Point | Décision |
|---|---|---|
| P1 | Nom de l'onglet | « Dépôts », proposé par le mainteneur |
| P2 | Place de l'interrupteur de débranchement | Onglet Général, libellé « Activer l'export local ». Le mainteneur déplace l'interrupteur que D6 plaçait dans l'onglet des dépôts |
| P3 | Statut d'une carte active pendant le test ou en échec, et repli après enregistrement | « Connexion… » en gris, la cause en rouge ; la carte reste dépliée tant que l'enregistrement ou le test échoue |
| P4 | Libellés de la carte | « Enregistrer » ; « Supprimer » abandonne sans confirmation une carte jamais enregistrée |

## 2. Faits vérifiés

### 2.1. La section 1.3 du plan de recherche

Les 22 faits ont été relus dans le code du commit `94ec0a9`. Tous tiennent.
Cinq reçoivent une précision.

| Fait du plan de recherche | Précision |
|---|---|
| Le test de connexion part à `ui-ready` et après chaque enregistrement | Il part aussi après `supprimer-token`, et après chaque publication réussie : `publier` appelle `refreshConfiguration` (`src/code.ts`) |
| Un échec de la forge pendant la publication télécharge aussi le fichier | Le téléchargement part du `catch` de `publier` ; `textesDePublication` ne fournit que les textes. Une erreur levée après la production d'une analyse télécharge aussi le fichier, dans `analyser` |
| La pastille affiche « repository connecté » quelle que soit la forge | Deux autres textes ignorent aussi les termes de la forge : « aucun repository » et « repository mal décrit » (`etatDeConnexion`) |
| La page de configuration est un formulaire unique | Elle porte aussi, en tête, le bloc d'état `config-status` et, sous l'adresse, les lignes « Repository GitHub : … » et « Cette adresse désignait un dossier » |
| Aucun module de `src/contract/` n'importe `src/tokens/` | Le sens inverse existe : `tokens/exportTokens.ts` importe `serializeJson` et `localisation` de `src/contract/`. Il ne gêne pas la séparation |

### 2.2. Écarts relevés hors du plan

Ces faits ne contredisent aucune décision de la section 2 du plan de recherche.
Ils changent la forme des lots.

**E1. Une publication réussie efface son lien et ses points à corriger.** Le
commit `34e584c` a fait deux changements liés. Il a remplacé
`postConnection('connecte')` par `await refreshConfiguration()` dans `publier`,
et ajouté `composant.reinitialiser()` et `tokens.reinitialiser()` à la
réception de `settings` (`src/ui/index.ts`). `publier` envoie donc `demande`,
puis `settings`, puis le statut de succès. Rejoué sur l'interface
reconstruite : un lien présent avant `settings`, aucun après, compte rendu
masqué. Les états `export-tokens-reussi` et `gitlab-merge-request-creee` de la
galerie ne jouent pas `settings` et ne le montrent pas.

**E2. Après un enregistrement, la même sélection ne peut plus être analysée.**
`CarteComposant` garde un drapeau `analysee` que seul un changement de
sélection remet à faux. La réinitialisation par `settings` retire le verdict et
le bouton de publication, et laisse « Analyser le composant » grisé. Rejoué :
bouton visible et désactivé, aucun bouton de publication, jusqu'au changement
de sélection.

**E3. La spécification annonce un libellé que le code n'écrit pas.**
`SPEC.md`, partie 3 : l'ouverture dans le navigateur « le libellé du bouton
l'annonce ». Les libellés de `PUBLIER` (`src/prevol.ts`) sont « Publier le
composant » et « Publier les tokens ». Décision : la phrase de `SPEC.md` est
retirée, le libellé ne change pas.

**E4. Deux types et deux fonctions portent le nom `etatDesTokens`.**
`src/depot.ts` déclare le type `EtatDesTokens` (`fusionnes | en-attente |
absents`) et une fonction interne `etatDesTokens` ; `src/tokens/exportTokens.ts`
exporte un type et une fonction du même nom pour le résumé
`{ resume, presents }`.

**E5. La ligne du dépôt connecté n'est affichée nulle part.** `etatDuDepot`
calcule `ligne` (« GitHub · mon-org/design-system-v3 · main »), et
`tests/connexion.test.ts` la vérifie. L'interface ne l'affiche que lorsque
`repli` vaut `true`, où elle vaut la phrase de repli.

**E6. Deux tests de connexion simultanés laissent une pastille fausse.** Le
routeur traite les messages en parallèle, sans file (`figma.ui.onmessage`,
`src/code.ts`). `refreshConfiguration` n'a pas de garde anti-course, alors que
`selectionToken` en donne le modèle. Sonde sur le routeur réel : deux
enregistrements rapprochés, le premier dépôt répond lentement « connecté », le
second vite « jeton refusé ». Le stockage contient le second dépôt, la pastille
finale dit « repository connecté ». La bascule entre plusieurs dépôts
multiplie ce cas.

**E7. Un refus de publication accuse la sélection à tort.** Sonde sur le
routeur réel : une publication lancée, puis un enregistrement 5 à 30 ms plus
tard. L'enregistrement vide `analysesGardees` pendant que `publier` lit la
configuration, et le designer lit « La sélection a changé. Analysez le
composant sélectionné avant de publier. » alors que la sélection n'a pas bougé.

## 3. Désactiver la gestion des tokens

### 3.1. Définition retenue

La définition de la section 4.1 du plan de recherche tient : G1 retiré, G2
retiré, G3 conservé. Le réglage s'appelle « Gérer les tokens » dans
l'interface. Il est activé par défaut, puisque l'équipe UCM et le mainteneur
emploient les tokens.

### 3.2. Inventaire complété

Les lignes marquées « ajout » manquaient au plan de recherche.

**G1, commande d'export des tokens**

| Élément | Où | Statut |
|---|---|---|
| Carte, bouton « Analyser les tokens du fichier » | `createCarteTokens`, `src/ui/components/CarteTokens.ts` | Relevé |
| Création, insertion après `depotRepli`, boucle de `occuper`, réception de `tokens` et `format-tokens` | `src/ui/index.ts` | Relevé |
| Choix du genre publié : `carte === composant ? 'component' : 'tokens'` | `demanderPublication`, `src/ui/index.ts` | Ajout |
| Réinitialisation de la carte à la réception de `settings` | `src/ui/index.ts` | Relevé, et cause de E1 |
| Demandes `analyser-tokens`, `publier` de genre `tokens` ; messages `tokens`, `format-tokens` | `src/messages.ts` | Relevé |
| Lecture des collections à `ui-ready` | `etatDesTokensDuFichier`, `src/tokens/exportTokens.ts` | Relevé |
| Analyse, annonce du format | `handleExportTokens`, `annonceDuFormat` | Relevé |
| Chemin, ligne de format, branche `ucm-exporter/export-tokens-` | `artifactPath`, `ligneDeFormatDeTokens`, `prefixeDeBranche`, `src/depot.ts` | Complété |
| Libellés « Publier les tokens », « Télécharger les tokens » | `NOM`, `PUBLIER`, `src/prevol.ts` | Ajout, conservés |
| Styles `.carte-tokens`, `.tokens-resume`, `.tokens-format` | `src/ui/styles.css` | Relevé |
| Message `tokens` joué dans chaque état par `ouverture()` | `galerie/etats.cjs`, 43 appels | Ajout |
| Textes « regarder » qui citent la carte des tokens | `resultat-un-avertissement`, `resultat-vingt-avertissements` | Ajout |
| États `fichier-sans-tokens`, `export-tokens-reussi`, `tokens-sans-profil` | `galerie/etats.cjs` | Relevé |
| Tests du routeur écrits avec `analyser-tokens` comme commande générique | `tests/code.test.ts`, dix tests | Ajout, inchangés si le réglage vaut « activé » par défaut |
| Tests | `tests/exportTokens.test.ts`, `tests/interface/interface.test.mjs` | Relevé |
| « deux commandes » dans les documents | `README.md` racine, `docs/README.md`, `SPEC.md` « Contexte technique », `POUR-LES-DESIGNERS.md` section 3, README du plugin | Ajout |

**G2, dépendance du contrat à `tokens.json`**

| Élément | Où | Statut |
|---|---|---|
| Lecture de l'état des tokens | `etatDesTokens`, option `avecTokens` de `lireAvantEcriture`, `src/depot.ts` | Relevé |
| Seul appel qui demande `avecTokens: true` | `analyser`, `src/code.ts` | Ajout, point de branchement unique |
| Consigne dans le verdict | `ordreDesTokens`, `src/prevol.ts` | Relevé |
| État `warning` | `postVerdict`, `src/code.ts` ; fonction `verdict`, `galerie/etats.cjs` | Relevé |
| État de la galerie | `gitlab-composant-avant-les-tokens` | Relevé |
| « Contrats dans …, tokens dans … » et « composants et les tokens » | `etatDuDepot`, `src/connexion.ts` | Relevé |
| Assertion sur le chemin des tokens dans le titre | `tests/connexion.test.ts`, « un repository qui se décrit nomme ses deux chemins » | Ajout |
| Documents | `SPEC.md` « Analyses et publication » ; `POUR-LES-DESIGNERS.md` section 3 ; README du plugin | Relevé |

**G3, qualité du contrat, conservé**

| Élément | Où |
|---|---|
| Index des variables, commun aux deux commandes | `indexVariables`, `src/variables.ts`, appelé par `exportComponent.ts` et `exportTokens.ts` |
| Diagnostics de liaison | `extractVariantTokens.ts`, `extractSlotTokens.ts`, `extractVariantTypography.ts` |
| Références citées par le contrat | `tests/tokensUsed.test.ts`. Le contrat ne publie plus `tokensUsed` ; le test vérifie par `collecterReferences` que chaque référence est employée |

### 3.3. Questions sur la séparation

**Point de décision unique.** La condition « tokens non fusionnés » est écrite
trois fois : `ordreDesTokens` la teste en deux `if`, `postVerdict` et la
fonction `verdict` de la galerie la recopient pour l'état `warning`. Le
réglage n'a pourtant besoin d'aucune unification : avec `avecTokens` à faux,
`lireAvantEcriture` rend `tokens: null`, et la consigne comme l'état `warning`
tombent déjà. L'unification reste utile contre la copie de la galerie :
`verdictDePrevol` rend aussi `etat`, que `postVerdict` et la galerie étalent.
Elle forme le lot 1, sans dépendance avec les autres.

**Trajet du réglage.** Figma met en file les messages envoyés après `showUI`
jusqu'au chargement de l'iframe
([documentation](https://developers.figma.com/docs/plugins/creating-ui/)).

| Option | Premier affichage | Coût |
|---|---|---|
| M1. Carte visible par défaut, retirée à la réception du réglage | La carte apparaît puis disparaît pour l'équipe consommatrice | Aucun |
| M2. Carte masquée par défaut, affichée à la réception du réglage | La carte apparaît sous celle du composant pour l'équipe UCM, sans la déplacer | `ouverture()` de la galerie et le premier test de `interface.test.mjs` jouent le réglage |

Retenu : M2. Le sandbox lit le réglage dans `clientStorage` avant toute autre
tâche de `ui-ready`, puis l'envoie dans `settings`. La carte des tokens est en
bas de page : son apparition tardive ne déplace aucun rang 1. Le délai réel
dans Figma reste à observer au lot 6.

**Appels évités, réglage désactivé.**

| Moment | Appel retiré |
|---|---|
| Ouverture | `figma.variables.getLocalVariableCollectionsAsync()`, un appel |
| Analyse d'un composant, dépôt connecté, ni jumeau ni collision | `lireFichier(layout.tokens)` sur la base, un appel, deux sur GitHub au-delà de 1 Mo |
| Même analyse, tokens absents de la base | `demandesOuvertes()`, une page par centaine de demandes ouvertes, puis une lecture par branche `ucm-exporter/export-tokens-` |

**Couplages cachés.** Relevés dans l'inventaire : la boucle de `occuper`, le
genre de `demanderPublication`, la réinitialisation par `settings`, l'ordre
`composant, depotRepli, tokens` de `exportPage.append`, le message `tokens`
de `ouverture()` et deux textes « regarder » de la galerie. Aucun style ne
suppose deux cartes : `.page-stack` est une grille à écart constant.

**Changement pendant une opération.** Le réglage entre dans la clé de
destination ([4.3](#43-la-clé-de-destination)). Le basculer suit la règle de
`selectionchange` : une analyse en cours est annulée, une publication va à son
terme. Une analyse gardée dont la clé ne correspond plus ne se publie pas. Le
texte d'annulation nomme la cause : « Analyse annulée : les réglages du plugin
ont changé. Relancez l'analyse. ». « Export annulé. Rien n'a été écrit. » reste
réservé au bouton « Annuler après cette étape ».

**Chemin `tokens` du dépôt.** Réglage désactivé, `etatDuDepot` rend « Contrats
dans `components`. » et l'avertissement sans `ucm.config.json` parle des seuls
composants. `repositoryLayout` continue de valider le champ `tokens` : un champ
écrit et invalide refuse l'export, comme `ucm check` le refuserait. Question
ouverte : voir [section 10](#10-questions-restantes).

**Écran à une carte.** L'ordre du DOM ne change pas : l'alerte de repli reste
après la carte du composant, et la carte des tokens seule disparaît. Hauteur
libérée, mesurée : 106 px de carte et 12 px d'écart, soit 118 px rendus au
compte rendu du composant. Passages de `CONTRIBUTING.md` à réécrire, section
« La hiérarchie de l'information » :

- « une carte est une commande, et il n'y en a que deux » devient « une carte
  est une commande : deux cartes, ou une seule quand la gestion des tokens est
  désactivée » ;
- « Ce qui vaut pour les deux, l'alerte de repli local, se place entre elles »
  devient « L'alerte de repli local vaut pour toutes les commandes : elle se
  place sous la carte du composant, sans surface ».

**Réactivation.** La carte revient vide. Le sandbox lance alors
`etatDesTokensDuFichier`, sautée à l'ouverture. Une analyse de composant faite
pendant la désactivation porte une autre clé : elle ne se publie pas, et la
nouvelle analyse porte la consigne.

Le sandbox refuse aussi `analyser-tokens` et une nouvelle publication de tokens
quand le réglage est désactivé : masquer la carte ne suffit pas. Une lecture du
résumé lancée avant la désactivation ne doit plus envoyer `tokens` ni
`format-tokens` après celle-ci. Les lectures de variables nécessaires à G3
restent actives pendant l'analyse d'un composant.

### 3.4. Où ranger le réglage

Décision : **A**, réglage global dans l'onglet Général.

| Critère | A. Global, Général | B. Par dépôt | C. `ucm.config.json` | D. Global surchargé |
|---|---|---|---|---|
| Gestes par bascule, mainteneur | 0 : ses trois dépôts reçoivent des tokens | 0 | 0 | 0 |
| Gestes par bascule, équipe consommatrice | 0 avec un seul projet | 0 | 0 | 0 |
| À l'ouverture | Lu localement avant l'affichage | Lu localement | Connu après le test réseau : carte affichée puis retirée | Lu localement |
| Export local, connexion en échec | Défini | Indéfini sans dépôt actif : règle à inventer | Inconnu : carte affichée | Valeur globale |
| Cohérence entre designers | Par poste | Par poste | Partagée | Par poste |
| Coût | Une clé, un interrupteur | Un champ par dépôt, une règle de repli, des états par dépôt | Grammaire publiée de `@ucm-kit/core` modifiée pour un seul lecteur | Le plus d'états |
| Endroit où le designer le cherche | Réglage du plugin | Réglage du dépôt | Hors du plugin | Deux endroits |

Condition de réouverture : un designer publie à la fois vers un dépôt qui reçoit
des tokens et vers un dépôt qui n'en reçoit pas. B devient alors la bonne
réponse, et la clé globale en fournit la valeur initiale.

## 4. Plusieurs dépôts : l'onglet des dépôts

### 4.1. Ce qu'un dépôt enregistré contient

**Références.** Tokens Studio range ses fournisseurs dans une seule clé
`apiProviders`, secrets compris, et reconnaît un fournisseur Git à son
fournisseur, son dépôt, sa branche et son chemin de fichier
([`isSameCredentials.ts`](https://github.com/tokens-studio/figma-plugin/blob/main/packages/tokens-studio-for-figma/src/utils/isSameCredentials.ts),
[`clientstorage-data.md`](https://github.com/tokens-studio/figma-plugin/blob/main/developer-knowledgebase/clientstorage-data.md)).
Chaque entrée y porte un nom libre, que le formulaire exige.

**Identité.** Décision : **I2**. L'identité est la forge et le projet.
L'adresse est modifiable tant que le dépôt n'a pas été enregistré, puis
s'affiche en lecture seule : un jeton ne quitte jamais le projet pour lequel il
a été collé. La branche et le jeton restent modifiables. Pour changer de
projet, le designer ajoute un dépôt et supprime l'ancien.

| Option écartée | Raison |
|---|---|
| I1. Identité forge, projet et branche ; adresse modifiable | Aucun besoin de deux branches d'un même projet ; changer l'adresse d'une entrée pose la question du jeton |

**Doublon.** L'identité se compare en minuscules. GitHub et GitLab servent un
même chemin quelle que soit sa casse, fait non vérifié dans leur
documentation ; une comparaison sensible à la casse accepterait deux entrées
pour un même projet. Refus à l'enregistrement, sous le champ adresse : « Ce
repository est déjà dans la liste. », avec « projet » sur GitLab, lu dans
`termes.depot`.

**Activation à l'enregistrement.** Le premier dépôt enregistré dans une liste
vide devient actif, sauf quand l'export local est activé. Les suivants
attendent un clic sur « Se connecter ».

**Ordre et nombre.** Ordre d'ajout. Le dépôt actif ne remonte pas en tête : une
position stable sert la bascule fréquente. Aucun maximum : une entrée pèse
quelques centaines d'octets face aux 5 Mo de `clientStorage`.

**Libellé libre.** Écarté : le nom affiché est le dernier segment de l'adresse
(C6).

**Préfixe du jeton.** `forgeDuPrefixe` s'applique à la saisie de chaque entrée,
contre la forge de son adresse.

### 4.2. Stockage et règle du jeton

**Clés.**

| Clé | Contenu |
|---|---|
| `depots` | Tableau `{ repoUrl, baseBranch, jeton }`. La forge, le projet et l'identité se recalculent par `lireAdresseDuDepot`, seule lecture d'une adresse |
| `depotActif` | Identité `forge:projet` en minuscules, ou absente |
| `exportLocal` | Booléen du débranchement, absent vaut `false` |
| `gestionDesTokens` | Booléen, absent vaut `true` |

**Une clé par dépôt ou un tableau.**

| Critère | Une clé par dépôt | Un tableau `depots` |
|---|---|---|
| Écriture interrompue | Une clé d'index et une clé d'entrée peuvent se contredire | Une seule écriture remplace la liste |
| Taille | Identique | Identique |
| Lecture à chaque analyse et publication | Index puis N lectures | Une lecture |

Retenu : un tableau. La documentation de `clientStorage` ne dit rien de
l'atomicité d'un `setAsync`
([documentation](https://developers.figma.com/docs/plugins/api/figma-clientStorage/)) :
le plan suppose qu'une écriture aboutit ou n'a pas lieu, sans l'avoir vérifié.
`depotActif`, `exportLocal` et `gestionDesTokens` restent des clés séparées :
une bascule n'écrit pas la liste des jetons.

**File d'écriture.** Le routeur traite les messages en parallèle. Une
modification qui lit `depots` avant une suppression et l'écrit après elle
ferait revenir l'entrée supprimée, jeton compris. Toutes les demandes qui
écrivent le stockage passent donc par une file du sandbox, une promesse
chaînée à la précédente : lecture, calcul et écriture d'une demande se
terminent avant la lecture de la suivante. Limite restante : deux fenêtres du
plugin ne partagent pas cette file. Une suppression et une modification faites
au même instant dans deux fenêtres peuvent encore faire revenir une entrée ;
`SPEC.md` le dit.

Cette file entre dès le lot 0. Un rejet ne bloque pas les demandes suivantes.
Les lectures qui préparent une analyse, une publication ou `settings` passent
par la même file : chacune produit un instantané dont dérivent la clé, la
configuration privée et les réglages publics. Les tests réseau se font après
la sortie de la file. Cette règle empêche une lecture entre les deux écritures
d'une activation dans une même fenêtre ; elle ne garantit pas une transaction
entre fenêtres.

**Règle du jeton, réécrite pour D2.** « Un jeton ne part que vers le dépôt
qui l'a reçu. » Le jeton et l'adresse voyagent dans la même entrée, écrite en
un seul `setAsync`. Aucune étape intermédiaire ne peut associer un jeton à une
autre adresse, ce qui retire l'ordre d'écriture en quatre temps de
`saveSettings`. Conséquences :

- la cause `jeton-autre-forge`, `jetonAutreForge` et la clé `forge_du_jeton`
  disparaissent ;
- `validateSettings` reste l'unique validation, appelée par entrée avec le
  jeton de cette entrée ;
- l'invariant réécrit dans `AGENTS.md` cite encore `src/config.ts` et
  `validateSettings()`, que la liste `AUTORITES` de
  `tests/inventaireInvariants.test.ts` exige.

**Ordre des écritures.**

| Geste | Écritures | Interruption entre deux écritures |
|---|---|---|
| Enregistrer un nouveau dépôt | `depots`, puis `depotActif` si l'entrée devient active | Dépôt enregistré, pas encore actif |
| Modifier la branche ou le jeton | `depots` | Aucune étape intermédiaire |
| Supprimer | `depots` sans l'entrée, puis retrait de `depotActif` si elle était active | `depotActif` désigne une entrée absente : le chargement la traite comme « aucun dépôt actif » |
| Se connecter | `depotActif`, puis `exportLocal` à `false` ([section 6](#6-débrancher-les-dépôts)) | Dépôt actif changé, encore débranché |
| Modifier une entrée qu'une autre fenêtre a supprimée | Aucune | Refus : « Ce dépôt n'est plus dans la liste. » |

**Forme publique.** Le message `settings` porte :

```ts
type ReglagesPublics = {
  destination: string;  // clé de destination, section 4.3
  tokens: boolean;
  exportLocal: boolean;
  actif: string | null;
  depots: Array<{
    id: string;          // 'gitlab:mon-groupe/design-system'
    forge: NomDeForge;
    projet: string;
    nom: string;         // dernier segment de l'adresse, calculé par le sandbox
    baseBranch: string;
    jeton: boolean;      // présence seule
  }>;
};
```

L'interface rend la liste par `id` : un message `settings` met à jour les
cartes existantes sans refermer une carte dépliée en cours de saisie.
Le sandbox vérifie l'adresse figée à chaque modification : la lecture seule
du champ dans l'interface ne protège pas, à elle seule, l'association du jeton
au projet. Une modification porte l'identité de l'entrée existante et ne peut
pas changer son adresse.

**Anciennes clés (C10, décidé).** Reprendre le dépôt configuré et son jeton,
puis effacer `repoUrl`, `baseBranch`, `github_pat` et `forge_du_jeton`. Cette
décision remplace D3, qui excluait la migration. Le dépôt repris devient actif
et suit le test de connexion à l'ouverture, hors export local.

La reprise passe par la file avant toute lecture de configuration :

1. Si `depots` est absente, lire les quatre anciennes clés et appliquer
   `validateSettings` avec leur règle de forge : un jeton sans
   `forge_du_jeton` appartient à GitHub. Une configuration invalide n'est pas
   reprise, même si son jeton est présent.
2. Écrire `depots` avec l'entrée valide, ou `[]` sans entrée valide. La présence
   de cette clé marque la reprise effectuée, y compris pour une liste vide.
   Activer l'entrée reprise selon l'ordre d'écriture de la section 4.2.
3. Effacer les quatre anciennes clés, même si la configuration était invalide.
   Si l'écriture de `depots` échoue, conserver les anciennes clés pour réessayer.

Si `depots` existe déjà, conserver la liste et le choix du dépôt actif, puis
terminer seulement le nettoyage des anciennes clés. Une suppression partielle
ne réimporte donc pas un dépôt ni son jeton. Une interruption entre l'écriture
de la liste et l'activation peut laisser le dépôt repris sans actif : le
designer l'active avec « Se connecter ». Une donnée `depots` illisible produit
une erreur de stockage ; elle n'autorise pas à écraser la liste par une reprise.

Le mainteneur pourra retirer ce code après avoir confirmé la migration des
deux équipes. L'ancien commentaire de `STORAGE_KEYS` sur `github_pat`
disparaît dès le lot 3a.

**Tests de `tests/config.test.ts`.**

| Test actuel | Sort |
|---|---|
| Quatre tests de lecture d'adresse, le préfixe du jeton, « détaille une configuration invalide » | Conservés |
| « les réglages ne portent aucun chemin » | Adapté au type d'une entrée |
| « utilise le jeton stocké quand le champ UI reste vide et que la forge concorde » | Adapté : un champ vide conserve le jeton de l'entrée |
| « un jeton saisi dont le préfixe désigne l'autre forge est refusé à la saisie » | Conservé |
| « un jeton GitHub enregistré ne vaut rien pour une URL GitLab » ; « un champ vide ne conserve pas le jeton d'une autre forge » | Retirés : l'adresse d'une entrée est figée |
| « l'enregistrement écrit l'ancien retrait, la forge, le jeton, puis l'URL » ; « un enregistrement interrompu ne laisse aucun jeton utilisable par l'autre forge » | Remplacés : une entrée s'écrit en une écriture ; une suppression interrompue ne laisse ni jeton ni dépôt actif utilisable |
| « l'UI apprend la forge du jeton, jamais le jeton, et la suppression retire les deux » | Adapté : l'interface apprend la présence du jeton par dépôt |
| « un jeton enregistré avant GitLab appartient à GitHub » | Conservé pour la reprise ; une ancienne configuration invalide est écartée et ses clés sont effacées |

La reprise se teste avec un dépôt GitHub et un projet GitLab, une configuration
invalide, une liste nouvelle déjà présente et une panne à chaque écriture ou
suppression. Une nouvelle ouverture termine le nettoyage sans réimporter ni
écraser un dépôt, même si la liste nouvelle est vide.

**Tests de `tests/code.test.ts`.**

- Le harnais change : `connecter()` écrit les anciennes clés, et le faux
  `forgeDe` ignore la configuration reçue. Il doit enregistrer le jeton et le
  projet de chaque adaptateur créé.
- « un jeton GitHub enregistré avec une URL GitLab n'atteint le réseau… »
  devient : le jeton du dépôt A n'accompagne aucune requête vers le dépôt B, à
  l'ouverture, au pré-vol, à la publication et après une bascule.
- « une panne du stockage pendant la sauvegarde libère le formulaire » et
  « une configuration enregistrée rend les analyses précédentes impropres à
  publier » passent aux demandes d'enregistrement d'un dépôt. L'assertion
  « aucun message ne contient le jeton » reste sur chacune.
- Nouveaux : une suppression et une modification envoyées ensemble ne font pas
  revenir l'entrée ; un échec d'écriture ne bloque pas la demande suivante ;
  une lecture n'observe pas une activation à moitié écrite ; une modification
  ne peut pas changer l'adresse ; un test de connexion périmé ne poste rien.

### 4.3. La clé de destination

`CONTRIBUTING.md` pose la règle : « C'est l'identité du sujet qui décide,
jamais l'arrivée d'un message ». Le sujet d'un verdict comprend sa
destination. Le sandbox la calcule en une chaîne, par une seule fonction de
`src/config.ts` :

```text
forge:projet@baseBranch|tokens     dépôt actif, réglage des tokens
aucune|tokens                      aucun dépôt actif
local|tokens                       dépôts débranchés
```

Cette notation décrit les champs, pas leur sérialisation : employer un tuple
JSON pour éviter les ambiguïtés de séparateurs dans une branche. Seule
l'identité forge/projet passe en minuscules ; la branche garde sa casse. Le
jeton reste absent de cette clé publique. Son remplacement relance le test
de connexion sans invalider à lui seul le contenu analysé.

**Usages.**

- Chaque `AnalyseGardee` range la clé lue au moment de son pré-vol.
- `publier` relit la configuration, recalcule la clé et refuse si elle diffère
  de celle de l'analyse. L'analyse est retirée, et le texte nomme le
  changement.
- `settings` porte la clé. L'interface vide les cartes de l'écran de travail
  quand elle change, et seulement alors : une publication réussie ne vide plus
  rien (E1), une réinitialisation remet « Analyser le composant » à disposition
  (E2).
- `analyser` compare la clé relue à la dernière clé envoyée à l'interface. Un
  écart relance `refreshConfiguration` avant le verdict : la pastille nomme le
  dépôt que le verdict vise.
- « Réessayer la publication » n'est proposé qu'à clé inchangée.

La clé accompagne aussi les résultats d'opération qui modifient une carte
(`phase`, `diagnostic`, `verdict`, `status`, `log`, `demande`). L'interface
écarte les résultats d'une autre destination. La fin de l'opération libère
toutefois l'interface même si son résultat est écarté. Un téléchargement de
repli et l'ouverture d'une demande déjà créée restent exécutés ; leur retour
ne recrée pas un verdict ou un lien sous la nouvelle destination. Un
identifiant d'opération distingue également une ancienne opération d'une
nouvelle après un aller-retour entre deux destinations.

Cette clé couvre, par un seul mécanisme, la bascule dans la même fenêtre, un
changement fait dans une autre fenêtre, le débranchement et le réglage des
tokens. Elle remplace les règles de vidage au cas par cas : enregistrer ou
modifier un dépôt inactif ne change pas la clé et ne vide rien. Elle remplace
aussi la réinitialisation par `settings` qu'avait ajoutée `34e584c`, dont
l'intention n'a donc plus à être établie.

**Deux fenêtres du plugin.** L'API de `clientStorage` n'offre ni événement ni
abonnement : `getAsync`, `setAsync`, `deleteAsync` et `keysAsync`. Une fenêtre
n'apprend un changement qu'en relisant, à l'analyse et à la publication. La
clé de destination refuse la publication et rafraîchit la pastille à l'analyse.
Le mainteneur a choisi de ne pas mesurer ce cas dans Figma : la clé couvre
aussi la bascule dans la même fenêtre, qui justifie seule son coût.

Texte du refus, qui dit le fait sans supposer sa cause : « La destination a
changé depuis l'analyse : {destination}. Relancez l'analyse. », où
`{destination}` vaut « le dépôt actif est maintenant design-system », « aucun
dépôt n'est actif », « les exports sont téléchargés sur votre poste » ou « la
gestion des tokens a changé ».

**Fraîcheur du test de connexion (E6).** `refreshConfiguration` incrémente un
compteur de génération avant chaque lecture. Après chaque attente, un test dont
la génération n'est plus la dernière ne poste rien.
Une mutation de la configuration active invalide la génération avant sa
première attente ; en cas d'échec de sauvegarde, le test de la configuration
conservée est relancé.
Les tests de cartes ont en plus une génération par dépôt : enregistrer B ne
rend pas périmé un test de A, mais modifier ou supprimer A invalide son test.
Une réponse de carte ne met à jour la pastille et `depot` que si cette entrée
est encore active, avec les mêmes réglages et hors export local.

**Application de bureau et navigateur.** La documentation Figma ne dit pas
s'ils partagent `clientStorage`. Une réponse du forum Figma, relayée par le
moteur de recherche, indique que l'application et chaque navigateur ont leur
propre stockage ; la page exige une connexion et n'a pas pu être lue. Non
vérifié, et non mesuré par décision du mainteneur. Si le fait est exact, D4
vaut par application, et le designer enregistre ses dépôts une fois dans
chacune.

### 4.4. Changer de dépôt actif

Clic sur « Se connecter » : demande `activer-depot { id }`, par la file
d'écriture.

1. Écrire `depotActif`, puis `exportLocal` à `false`.
2. Annuler une analyse en cours, laisser finir une publication, comme
   `selectionchange`.
3. Relancer `refreshConfiguration` : `settings` avec la nouvelle clé, carte en
   « Connexion… », test du nouveau dépôt, message `depot`.

Une publication en cours garde la configuration qu'elle a lue à son départ et
aboutit dans l'ancien dépôt. Si elle échoue, « Réessayer la publication »
n'est pas proposé, puisque la clé a changé.

La carte du composant garde sa cible, puisque la sélection n'a pas changé, et
perd verdict, compte rendu et bouton de publication. « Analyser le composant »
redevient disponible.

**Le verdict nomme la destination (C12, décidé).** Aujourd'hui : « Prêt à
publier dans `src/components/Button/Button.contract.json` (d'après
ucm.config.json). ». Demain : « Prêt à publier dans design-system-v3 :
`src/components/Button/Button.contract.json` (d'après ucm.config.json). ». Le
verdict est déjà à l'écran : aucun objet n'est ajouté, et D5 est respectée.

**Alternative écartée : garder l'analyse après la bascule.** Le contrat et ses
points à corriger ne dépendent pas du dépôt, et le mainteneur qui publie un
composant dans ses trois dépôts refait l'analyse à chaque bascule. Garder le
contenu demanderait une demande « revérifier » et un état de carte de plus, et
publierait un contenu figé avant une modification du composant dans Figma.

### 4.5. Test de connexion

Un test lit le dépôt puis `ucm.config.json` : deux requêtes, trois sur GitHub
quand le fichier dépasse 1 Mo.

| Option | Requêtes à l'ouverture, trois dépôts | Délai avant une pastille exacte | État par dépôt dans la liste |
|---|---|---|---|
| T1. Dépôt actif seul, à l'ouverture et à la bascule | 2 | Un test | Actif seulement |
| T2. Tous à l'ouverture | 6 | Un test, si l'actif part en premier | Tous |
| T3. Actif à l'ouverture, les autres à l'affichage de l'onglet des dépôts | 2, puis 4 à l'affichage | Un test | Tous, après affichage |

Retenu, faute de réponse contraire : **T1, plus le dépôt qu'on vient
d'enregistrer**. La maquette du mainteneur s'y accorde : une carte inactive
affiche « Se connecter », sans statut. Enregistrer un dépôt teste cette entrée,
qu'elle soit active ou non, et affiche le résultat dans sa carte. Sans ce test,
le retour d'un enregistrement sur un dépôt inactif décrirait la connexion de
l'actif. Deux messages le portent, distincts de `connection` :

| Message | Contenu |
|---|---|
| `depot-enregistre` | `{ requete, carte, id, erreurs }` : identifiants de la demande et de la carte, identité enregistrée en cas de succès, erreurs par champ ou erreur générale |
| `depot-teste` | `{ id, generation, etat, statut, geste, destination }` : résultat du test et chemins effectifs de cette entrée |

Chaque carte nouvelle reçoit un identifiant temporaire distinct, conservé dans
la demande d'enregistrement et sa réponse. Le succès l'associe à l'identité
enregistrée ; `settings` et l'accusé de réception ne créent pas deux cartes.
La destination du test alimente le bloc de chemins de la carte concernée,
y compris quand elle est inactive. Une réponse à une ancienne demande ne
remplace pas une saisie plus récente.

Une erreur levée pendant un enregistrement envoie `depot-enregistre` avec une
erreur générale, comme le `catch` du routeur le fait aujourd'hui pour
`save-settings`.

**Export local (C14, décidé).** Cliquer sur « Enregistrer » teste le dépôt,
même en export local. Le résultat met à jour uniquement la carte testée : il
ne change ni le dépôt actif, ni la pastille « export local », ni la destination
des exports. La carte se replie après une sauvegarde et un test réussis ; elle
reste dépliée en cas d'échec. Aucun test automatique ne part à l'ouverture en
export local. Désactiver l'export local teste le dépôt actif.

### 4.6. Interface de la liste

**Références étudiées.**

| Référence | Élément actif | Gestes de bascule | Ajouter, modifier, supprimer | Secret | Erreur | Aucun actif |
|---|---|---|---|---|---|---|
| Tokens Studio | Badge « Active » sur la ligne | 1 : bouton « Apply » sur la ligne | Bouton « Add new sync provider » et fenêtre modale ; menu à trois points « Edit », « Delete » confirmé par modale | Non relevé | Sous la ligne active seulement | Ligne « Local document » dans la même liste, avec « Apply » ; supprimer le fournisseur actif y ramène |
| `@create-figma-plugin/ui`, décalque de l'éditeur Figma | `SelectableItem` coché, fond `bg-selected` | 1 | Non couvert | Non couvert | Non couvert | Non couvert |
| Postman | Nom dans le sélecteur en haut à droite | 2 : ouvrir le sélecteur, choisir | Barre latérale « Environments », menu d'options pour supprimer | Valeur locale distincte de la valeur partagée | Non relevé | « No environment » dans le même sélecteur (source secondaire) |
| GitKraken | Icône de profil | 2 : icône, profil | Réglages du profil | Intégrations par profil | Non relevé | Non applicable |
| Tower | Comptes dans la barre latérale | Non documenté | Ajout par service | Non relevé | Journal d'activité pour un 401 | Non applicable |

Fork n'a pas été consulté.

Sources : [`StorageItem.tsx`](https://github.com/tokens-studio/figma-plugin/blob/main/packages/tokens-studio-for-figma/src/app/components/StorageItem.tsx),
[`LocalStorageItem.tsx`](https://github.com/tokens-studio/figma-plugin/blob/main/packages/tokens-studio-for-figma/src/app/components/LocalStorageItem.tsx),
[documentation Tokens Studio](https://docs.tokens.studio/token-storage/manage-sync-provider/change),
[`selectable-item`](https://github.com/yuanqing/create-figma-plugin/tree/main/packages/ui/src/components/selectable-item),
[Postman](https://learning.postman.com/docs/sending-requests/variables/managing-environments/),
[GitKraken](https://help.gitkraken.com/gitkraken-desktop/profiles/),
[Tower](https://www.git-tower.com/help/guides/manage-hosting-services/connect-accounts/mac).

**Options comparées avant la décision**, pour trois dépôts.

| Option | Gestes de bascule | Risque de publier dans le mauvais dépôt | Objets à l'écran | Bascule fréquente | Bascule rare |
|---|---|---|---|---|---|
| L1. Liste, bouton d'activation par ligne, édition dépliée dans la ligne | 1 | Faible : bouton nommé | 13 | Bon | Correct |
| L2. Liste de boutons radio, clic sur la ligne | 1 | Élevé : toute la ligne active | 13 | Bon | Correct |
| L3. Sélecteur du dépôt actif, formulaire de l'actif dessous | 2 | Faible | 12 | Moyen | Bon |
| L4. Liste, page de détail avec activation | 2 | Faible | 10, puis la page de détail | Lent | Bon |

**Décision : liste de cartes dépliables**, variante de L1 dessinée par le
mainteneur.

Page de configuration, de haut en bas :

1. en-tête : titre « Configuration », bouton « Retour ». La pastille n'y
   figure plus : le statut de la carte active la remplace ;
2. onglets « Général » et « Dépôts » (P1) ;
3. description de l'onglet sélectionné ;
4. onglet Dépôts : bouton « Ajouter un dépôt », liste des dépôts.
   L'interrupteur de l'export local est dans Général (P2).

Liste :

- aucun dépôt : le texte « Veuillez ajouter un dépôt. » ;
- une carte par dépôt, repliée par défaut, sur `--fond-bloc`, le fond des
  cartes de commande, plus clair que celui du plugin ;
- carte repliée : le nom à gauche, dernier segment de l'adresse (C6) ; à
  droite, « Connecté » en vert pour le dépôt actif connecté, ou un bouton gris
  « Se connecter » ;
- clic sur la carte : elle se déplie et montre « URL du dépôt », en lecture
  seule après le premier enregistrement (C3), « Branche de base », le bloc de
  destination quand il est connu, le jeton, « Enregistrer » et « Supprimer » ;
- « Ajouter un dépôt » crée une carte dépliée en fin de liste ; elle se replie
  après l'enregistrement et le test réussis, y compris en export local ;
- « Se connecter » active ce dépôt : l'ancien actif repasse à « Se
  connecter ». Quand l'export local est activé, « Se connecter » le désactive
  aussi ([section 6](#6-débrancher-les-dépôts)).

Accessibilité : la carte repliée porte deux commandes voisines, un bouton de
dépli qui porte le nom et `aria-expanded`, et le bouton « Se connecter ». Un
bouton ne se place pas dans un autre, et un clic sur « Se connecter » ne déplie
pas la carte.

**P3 et P4, états que la maquette ne couvrait pas, décidés.**

| Situation | Décision |
|---|---|
| Dépôt actif pendant le test | « Connexion… » en couleur secondaire, à la place de « Connecté » |
| Dépôt actif en échec | La cause en rouge à la place de « Connecté » : « Jeton refusé », « Accès refusé », « Repository introuvable » ou « Projet introuvable », « ucm.config.json fautif », « GitHub injoignable » ; le geste s'affiche en tête de la carte dépliée |
| Arrivée par la pastille sur un dépôt actif en échec | Carte dépliée et amenée dans la vue |
| Enregistrement refusé, ou test du dépôt enregistré en échec | La carte reste dépliée avec l'erreur ; elle se replie après un enregistrement accepté et un test réussi |
| Carte nouvelle, jamais enregistrée | « Supprimer » l'abandonne sans confirmation : rien n'est stocké |
| Libellé d'enregistrement | « Enregistrer », le mot du formulaire actuel |

**Vocabulaire.** Les textes qui ne connaissent pas la forge disent « dépôt » :
onglet, bouton d'ajout, liste vide, pastille sans dépôt actif.
Les textes qui connaissent la forge lisent `src/forges/termes.ts`
(« repository » ou « projet ») : causes, gestes, doublon, « Repository GitHub :
… ».

**Export local activé.** Toutes les cartes affichent « Se connecter ». Une
ligne en couleur d'avertissement, sous la description, dit pourquoi : « Export
local activé dans Général : les exports sont téléchargés sur votre poste. ».
Sans elle, le designer qui ouvre Dépôts voit trois dépôts non connectés sans en
lire la raison.

**Compte d'objets.** Onglet Dépôts à trois dépôts repliés : titre, « Retour »,
deux onglets, description, « Ajouter un dépôt », puis deux objets par carte,
soit 12, et 13 avec la ligne de l'export local. La relecture du lot 3b le
vérifie sur les captures.

**Maquettes à 320 px.** Largeur utile mesurée : 273 px, environ 46 caractères.
Les crochets désignent un bouton, `( ━●)` un interrupteur activé.

Aucun dépôt enregistré :

```text
Configuration                         [Retour]
 Général  [Dépôts]
──────────────────────────────────────────────
Configuration des dépôts sur lesquels sont
exportés les contrats de composants et les
tokens via Pull Request.

[             Ajouter un dépôt             ]

Veuillez ajouter un dépôt.
```

Trois dépôts sur deux forges, repliés :

```text
Configuration                         [Retour]
 Général  [Dépôts]
──────────────────────────────────────────────
Configuration des dépôts sur lesquels sont
exportés les contrats de composants et les
tokens via Pull Request.

[             Ajouter un dépôt             ]

┌────────────────────────────────────────────┐
│ design-system-v3                  Connecté │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ design-system               [Se connecter] │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ recette-web                 [Se connecter] │
└────────────────────────────────────────────┘
```

Nouveau dépôt, enregistrement refusé par `validateSettings` :

```text
┌────────────────────────────────────────────┐
│ Nouveau dépôt                              │
├────────────────────────────────────────────┤
│ URL du dépôt                               │
│ [https://gitlab.example.com/mon-org/ds   ] │
│ Utilisez l'adresse d'un repository         │
│ https://github.com/propriétaire/repository │
│ ou d'un projet https://gitlab.com/groupe/  │
│ projet.                                    │
│ Branche de base                            │
│ [                                        ] │
│ La branche de base est obligatoire.        │
│ Jeton d'accès                              │
│ [                                        ] │
│ Le jeton d'accès est obligatoire.          │
│ [Enregistrer]                  [Supprimer] │
└────────────────────────────────────────────┘
```

Dépôt actif déplié :

```text
┌────────────────────────────────────────────┐
│ design-system-v3                  Connecté │
├────────────────────────────────────────────┤
│ URL du dépôt                               │
│ https://github.com/mon-org/design-system-v3│
│ Repository GitHub : mon-org/design-system-v3
│ Branche de base                            │
│ [main                                    ] │
│ Contrats dans src/components, tokens dans  │
│ src/tokens/tokens.json.                    │
│ Ce repository le déclare dans son          │
│ ucm.config.json.                           │
│ Personal Access Token                      │
│ [Token enregistré. Laissez ce champ vide…] │
│ Utilisez un fine-grained token limité à ce │
│ repo avec Contents: Read and write et Pull │
│ requests: Read and write.                  │
│ [Enregistrer]                  [Supprimer] │
└────────────────────────────────────────────┘
```

Dépôt actif en échec, arrivée par la pastille :

```text
┌────────────────────────────────────────────┐
│ design-system-v3              Jeton refusé │
├────────────────────────────────────────────┤
│ ▌ GitHub refuse ce Personal Access Token.  │
│ ▌ Collez-en un nouveau ci-dessous, puis    │
│ ▌ enregistrez.                             │
│ URL du dépôt                               │
│ …                                          │
└────────────────────────────────────────────┘
```

| Cause | Statut de la carte | Geste en tête de la carte dépliée |
|---|---|---|
| 401 | Jeton refusé | « GitLab refuse ce jeton d'accès. Collez-en un nouveau ci-dessous, puis enregistrez. » |
| 403 | Accès refusé | « Le jeton est reconnu, mais il n'a pas les droits sur ce projet. Donnez-lui le scope api et le rôle Developer sur ce projet. » |
| 404 | Projet introuvable | « GitLab ne trouve aucun projet à cette adresse avec ce jeton. Si le projet est privé, donnez au jeton l'accès à ce projet. Si l'adresse est fausse, supprimez ce dépôt, puis ajoutez la bonne adresse. » |
| `ucm.config.json` fautif | ucm.config.json fautif | « Un développeur doit corriger le fichier qui décrit ce projet. Tant qu'il est fautif, aucun export ne peut être publié. » suivi du détail du kit |

Suppression, second clic sur le même bouton :

```text
│ [Enregistrer]      [Confirmer la suppression] │
```

**Galerie (C13, décidé).** La galerie est la page qui montre chaque écran
du plugin hors de Figma. `tests/galerie.test.ts` y tient une loi : un écran
GitLab ne montre aucun mot de GitHub, et l'inverse. Elle attrape un texte qui
aurait oublié de lire les mots de sa forge, et `AGENTS.md` en fait un
invariant. L'onglet Dépôts qui liste un dépôt GitHub et un projet GitLab
montre les deux forges sur le même écran, par construction. Décision : une
catégorie `forge: 'mixte'` pour ces écrans. La loi y vérifie chaque message
contre la forge de son sujet : dépôt actif pour `connection`, dépôt de
l'opération pour `verdict`, `status`, `log` et `demande`, entrée désignée par
`id` pour `depot-teste`. Tester un dépôt GitLab inactif pendant que GitHub est
actif doit donc rester accepté. L'invariant de `AGENTS.md` change dans le même
commit.

### 4.7. Suppression d'un dépôt

Supprimer une entrée réécrit `depots` sans elle, par la file d'écriture : le
jeton et les réglages du dépôt disparaissent du stockage. L'interface n'a
jamais reçu le jeton, `analysesGardees` ne le contient pas, et un adaptateur de
forge ne le tient en mémoire que le temps d'une opération. La limite entre deux
fenêtres est décrite en [4.2](#42-stockage-et-règle-du-jeton). Le bouton
« Supprimer le token enregistré » disparaît : une entrée sans jeton ne sert à
rien, et coller un nouveau jeton remplace l'ancien.

Décision (C7) : après la suppression du dépôt actif, **aucun** dépôt n'est
actif. Pastille « aucun dépôt actif », exports téléchargés jusqu'à un clic sur
« Se connecter ». Tokens Studio revient de même à « Local document » quand le
fournisseur actif est supprimé (`handleDelete`, `StorageItem.tsx`).

## 5. La pastille de l'en-tête

La pastille reste sur l'écran de travail, et quitte la page de configuration
(4.6).

**Mesures.** Interface reconstruite, Inter 11 px, fenêtre de 320 px, largeur
utile de 273 px.

| Texte | Largeur | Lignes |
|---|---|---|
| `repository connecté` | 116 px | 1 |
| `design-system connecté` | 141 px | 1 |
| `mon-org/design-system-v3 connecté` | 208 px | 1 |
| `design-system-mobile-et-web-2026 connecté` | 255 px | 1 |
| `mon-groupe/equipe-produit/design-system connecté` | 273 px | 2 |
| `mon-groupe/equipe-produit/plateforme/design-system connecté` | 273 px | 2 |
| `mon-groupe/equipe-produit/design-system : jeton refusé` | 273 px | 2 |

Aucun texte ne déborde de la page : Chromium coupe aux traits d'union.

**Le nom (C6, décidé).** Le dernier segment de l'adresse, suivi de
« connecté » : `design-system-v3 connecté`. Rien d'autre, ni forge ni
chemin. Un chemin GitLab à sous-groupes donne son dernier segment. Limite
acceptée : deux dépôts dont l'adresse finit par le même segment portent le même
nom dans la pastille et dans la liste. Le sandbox calcule `nom`, que la
pastille et la liste lisent. `etatDeConnexion` reçoit le nom dans sa précision
et compose la pastille : `EtatConnexion.pastille` reste une chaîne. Les noms
mesurés tiennent sur une ligne jusqu'à une quarantaine de caractères, et un
nom plus long doit passer à la ligne sans déborder : aucune troncature, et
l'attribut `title` garde « Ouvrir la configuration ». Les mesures ci-dessus
ne couvrent que des noms sécables. Ajouter un nom long sans espace ni trait
d'union à la galerie et prévoir `overflow-wrap: anywhere` avec une largeur
réductible pour la pastille et les noms des cartes.

**Les états (nom dans les échecs, décidé).**

| Situation | Pastille | Couleur |
|---|---|---|
| Vérification | `design-system-v3 : connexion…` | Secondaire |
| Connecté (D5) | `design-system-v3 connecté` | Succès |
| 401, 403, 404 | `design-system-v3 : jeton refusé`, `: accès refusé`, `: repository introuvable` | Danger |
| Réseau, forge en panne | `design-system-v3 : GitHub injoignable`, `: GitHub indisponible` | Danger |
| `ucm.config.json` fautif | `design-system-v3 : ucm.config.json fautif` | Danger |
| Aucun dépôt enregistré | `aucun dépôt` | Danger |
| Aucun dépôt actif | `aucun dépôt actif` | Danger |
| Dépôts débranchés | `export local` | Avertissement ([section 6](#6-débrancher-les-dépôts)) |

« repository mal décrit » devient `ucm.config.json fautif`, qui nomme le
fichier à corriger et se dit de la même façon sur les deux forges.

**La destination du clic.** Tous les états de la pastille concernent les
dépôts : elle ouvre l'onglet Dépôts, et déplie la carte du dépôt actif quand il
est en échec.

**Tests et galerie.** 32 appels de `ouverture('connecte')` dans
`galerie/etats.cjs` lisent le texte de `etatDeConnexion` : ils suivent le
changement dès que `ouverture()` passe un nom. Tests qui lisent la pastille :
`tests/connexion.test.ts`, « chaque cause d'échec dit une chose différente »,
« le 404 GitLab dit que le projet peut être privé », « un jeton d'une autre
forge nomme la forge visée » (retiré) ; `tests/code.test.ts`, « un jeton GitHub
enregistré avec une URL GitLab » (réécrit, section 4.2).

## 6. Débrancher les dépôts

**Situations.**

| Situation | Aujourd'hui | Proposition |
|---|---|---|
| S1. Aucun dépôt enregistré | `non-configure`, `repli: true` | Cause `aucun-depot` |
| S2. Dépôts enregistrés, aucun actif | Inexistante | Cause `aucun-actif` |
| S3. Dépôt actif en échec de connexion | Cause de la pastille, `repli: false`, erreur à l'analyse | Inchangée |
| S4. Dépôts débranchés | Inexistante | Cause `debranche` |
| S5. Échec de la forge pendant une publication | Téléchargement, verdict d'échec | Inchangée |

`EtatDuDepot.repli` passe d'un booléen à `null | 'aucun-depot' | 'aucun-actif'
| 'debranche'`.

**Textes proposés.**

| Situation | Ligne sous la carte du composant | Verdict `sans-depot` | Journal de `publier` |
|---|---|---|---|
| S1 | « Aucun dépôt enregistré. L'export sera téléchargé sur votre poste. » | « Aucun dépôt enregistré. Le contrat sera téléchargé sur votre poste. » | « Aucun dépôt enregistré : téléchargement sur votre poste. » |
| S2 | « Aucun dépôt actif. L'export sera téléchargé sur votre poste. » | « Aucun dépôt actif. Le contrat sera téléchargé sur votre poste. » | « Aucun dépôt actif : téléchargement sur votre poste. » |
| S4 | « Export local : l'export sera téléchargé sur votre poste. » | « Export local. Le contrat sera téléchargé sur votre poste. » | « Export local : téléchargement sur votre poste. » |

**Persistance (C9, décidé).** L'export local est mémorisé dans `exportLocal`.
Un débranchement oublié reste visible avant tout clic : pastille, ligne sous la
carte, verdict. Le rappel sur l'écran de travail emploie la ligne de repli
existante, dans les limites de D5.

**Sévérité.** Un débranchement voulu n'est pas une panne, et un débranchement
oublié coûte une demande de fusion jamais ouverte. La pastille et la ligne
portent la même sévérité, avertissement : `.depot-repli` l'emploie déjà, et la
pastille reçoit l'état `local` en `--texte-avertissement`.

**Réseau.** Débranché, le sandbox ne lance aucune nouvelle opération vers une
forge, sauf le test demandé par l'enregistrement d'un dépôt (C14). Une
publication déjà lancée finit avec sa configuration de départ (4.4), y compris
ses requêtes restantes. Un test déjà lancé peut répondre, mais son résultat ne
rétablit pas l'état connecté. Le verdict d'une nouvelle analyse locale
n'ajoute rien sur l'immobilité ni sur la collision : cette analyse ne prépare
aucune demande de fusion.

**Rebranchement.** Désactiver l'export local rallume le dernier dépôt actif,
que `depotActif` garde pendant l'export local. « Se connecter » sur une carte
désactive aussi l'export local, puisque le designer choisit alors où publier ;
la pastille le montre en passant de `export local` au nom du dépôt. Export
local activé, aucune carte n'affiche « Connecté ».

**Interrupteur (P2, décidé).** « Activer l'export local », dans l'onglet
Général, désactivé par défaut. Il reste visible sans dépôt enregistré : les
exports sont alors téléchargés de toute façon, et l'interrupteur n'y change
rien. Le libellé décrit l'effet de l'état activé
([Nielsen Norman Group](https://www.nngroup.com/articles/toggle-switch-guidelines/))
et ne change pas avec l'état
([WAI-ARIA, switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)). Aide
permanente sous l'interrupteur : « Les exports sont téléchargés sur votre
poste, et aucune demande de fusion n'est ouverte. ». La maquette est en
[7.2](#72-options-de-longlet-général).

**Tokens.** Avec l'option A, l'export local propose la carte des tokens selon
le réglage global, sans cas particulier.

**Galerie.** `depot-non-configure` et `export-sans-depot` deviennent S1.
S2 et S4 reçoivent chacune un état au repos et un état d'export.

## 7. Les onglets et l'onglet Général

### 7.1. Les onglets

**Noms (P1, décidé).** D1 nommait les onglets « Général » et « Repos ». Le
mainteneur retient « Dépôts » pour le second, le mot que la liste, le bouton
d'ajout et le texte de liste vide emploient.

**Description.** Chaque onglet porte une phrase sous les onglets, à la place de
l'actuel sous-titre de `PAGES` :

| Onglet | Description proposée |
|---|---|
| Général | « Les réglages du plugin sur ce poste. » |
| Dépôts | « Configuration des dépôts sur lesquels sont exportés les contrats de composants et les tokens via Pull Request. » |

**Aspect.** Le panneau de droite de Figma porte deux onglets, « Design » et
« Prototype »
([centre d'aide Figma](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)).
Leurs dimensions n'y sont pas documentées. La bibliothèque
`@create-figma-plugin/ui`, qui reproduit l'éditeur, les dessine ainsi
([`tabs.module.css`](https://github.com/yuanqing/create-figma-plugin/blob/main/packages/ui/src/components/tabs/tabs.module.css)) :
rangée soulignée par `--figma-color-border`, segment de 24 px, marge 4 px sur
8 px, rayon 4 px, onglet inactif en `--figma-color-text-secondary`, onglet actif
en gras sur `--figma-color-bg-secondary`. Les trois variables existent déjà
dans `galerie/theme-figma.css` et derrière `--bordure`, `--texte-second` et
`--fond-bloc` dans `styles.css`. La hauteur vaut `--hauteur-secondaire`. Écart
avec le panneau natif : non mesuré, lot 6.

**Clavier et accessibilité.** Motif WAI-ARIA
([tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)) : `role="tablist"`,
`role="tab"` avec `aria-selected` et `aria-controls`, `role="tabpanel"` avec
`aria-labelledby` et `tabindex="0"`. Tabulation sur l'onglet actif seul,
flèches gauche et droite, Début et Fin. Activation automatique au focus : les
panneaux sont locaux et s'affichent sans délai, cas que le guide recommande.
`@create-figma-plugin/ui` emploie des boutons radio sans ces rôles, et n'est
donc pas repris tel quel.

**Entrée.** La pastille ouvre Dépôts (section 5). L'engrenage ouvre le dernier
onglet consulté pendant la session, Général au premier clic. Aucune mémoire
entre deux ouvertures du plugin. Le troisième test de `interface.test.mjs`
ouvre la configuration par l'engrenage et remplit l'adresse : il passe à
l'onglet Dépôts.

**Enregistrement.**

| Contrôle | Effet |
|---|---|
| Interrupteurs « Gérer les tokens », « Activer l'export local » | Immédiat : un interrupteur ne demande pas de bouton d'enregistrement ([Nielsen Norman Group](https://www.nngroup.com/articles/toggle-switch-guidelines/)) |
| « Se connecter » | Immédiat |
| Carte dépliée | Bouton « Enregistrer » propre à la carte, libéré par `depot-enregistre` |

Plusieurs cartes peuvent être dépliées. Chacune garde sa saisie tant qu'elle
n'est pas enregistrée, y compris repliée ou pendant un changement d'onglet :
les deux panneaux restent dans le DOM. La garde `settingsDirty` passe à la
carte : un message `settings` ne remplace pas une saisie en cours.
Après une sauvegarde réussie, le champ du jeton envoyé est vidé, même si le
test réseau échoue ; une valeur retapée depuis l'envoi est conservée. Une
erreur de stockage conserve la saisie à réessayer. Supprimer ou abandonner
une carte retire aussi son champ de jeton.

### 7.2. Options de l'onglet Général

| Candidate | Décision | Raison |
|---|---|---|
| Gérer les tokens | Retenue | D7, C2. Portée poste. Deux états de galerie : écran à une carte, verdict sans consigne |
| Activer l'export local | Retenue | D6, déplacé dans Général par P2. Portée poste. Désactivée par défaut |
| Effacer les données du plugin | Écartée (C11) | Supprimer un dépôt efface son jeton et ses réglages |
| Ouvrir la demande dans le navigateur | Écartée | Aucun besoin établi ; la phrase de `SPEC.md` qui la liait au libellé est retirée (E3) |
| Avertissement « Aucune règle d'usage exploitable » | Écartée | L'équipe consommatrice emploie `.componentRules` |
| Demande en brouillon | Écartée | Aucune équipe ne la demande ; l'API GitHub ne l'accepte pas sur un dépôt privé des offres Free et Pro ([documentation](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request)) ; GitLab ne la pose que par un préfixe de titre `Draft:` ([documentation](https://docs.gitlab.com/user/project/merge_requests/drafts/)) |
| Préfixe de branche | Écartée | `exportsEnVol` lit le préfixe ; les règles de nom de branche de GitLab sont réservées aux offres Premium et Ultimate ([documentation](https://docs.gitlab.com/user/project/repository/push_rules/)) ; sur GitHub, la disponibilité des restrictions de nom par offre est non vérifiée. Un refus 400 affiche déjà la réponse de GitLab à un mainteneur du projet. Si la question 10 révèle une règle, le réglage appartiendrait au dépôt |
| Retour à la taille par défaut | Écartée | Aucun besoin relevé ; la poignée de redimensionnement ramène la fenêtre au minimum de 320 px |
| Langue | Hors périmètre | Tranché |

Maquette, texte de l'interrupteur à relire avec `rediger-diagnostics-ucm` au
lot 2 :

```text
Configuration                         [Retour]
[Général]  Dépôts
──────────────────────────────────────────────
Les réglages du plugin sur ce poste.

Gérer les tokens                        ( ━●)
Affiche la commande d'export des tokens.
L'analyse d'un composant vérifie aussi que
les tokens sont fusionnés dans le dépôt.

Activer l'export local                  (● ━)
Les exports sont téléchargés sur votre poste,
et aucune demande de fusion n'est ouverte.
```

Écran de travail, réglage désactivé :

```text
UCM Contract Exporter                      [⚙]
● design-system connecté
┌────────────────────────────────────────────┐
│ Composant                                  │
│ Button / Primary                           │
│ Component set · 12 variants                │
│ [Analyser le composant]                    │
└────────────────────────────────────────────┘

Schéma de contrat 13.0
```

## 8. Plan d'action

Chaque lot laisse `npm test`, `npm run typecheck` et `npm run build` au vert, et
se commite seul. Une loi nouvelle se voit rouge avant d'être crue : casser ce
qu'elle protège, constater l'échec, restaurer, et le dire dans le commit. La
suite, les mutations et la galerie tournent dans un worktree isolé.

| Ordre | Lot | Dépend de |
|---|---|---|
| 1 | Lot 0, destination et fraîcheur | Rien |
| 2 | Lot 1, condition des tokens en un point | Rien |
| 3 | Lot 2, onglets et réglage des tokens | Lot 0, P1 |
| 4 | Lot 3a, stockage des dépôts | Lot 2 |
| 5 | Lot 3b, liste des dépôts | Lot 3a |
| 6 | Lot 3c, pastille nommée et verdict nommé | Lot 3b |
| 7 | Lot 4, export local | Lot 3b |
| 8 | Lot 6, recette dans Figma | Tous |

### Lot 0. Destination et fraîcheur

Il corrige E1, E2, E3, E6 et E7 dans le modèle à un dépôt.

- Clé de destination calculée pour le dépôt unique actuel
  (`forge:projet@baseBranch`), rangée dans `AnalyseGardee`, envoyée dans
  `settings` (`src/config.ts`, `src/code.ts`, `src/messages.ts`).
- `publier` : conserver `refreshConfiguration` après un succès, avec sa garde
  de génération ; un `postConnection('connecte')` inconditionnel pourrait
  annoncer une connexion réussie sur une autre destination. Refus à clé
  changée, avec le texte de la section 4.3 à la place de
  « La sélection a changé » quand la cause est la destination ; « Réessayer la
  publication » à clé inchangée seulement.
- `refreshConfiguration` : compteur de génération ; file des mutations et
  lectures cohérentes avant les appels réseau (4.2).
- `save-settings` ne vide plus `analysesGardees` : ce vidage produisait E7.
  `analyser` lit la configuration avant son premier message, pour que chaque
  résultat porte sa clé ; une clé relue différente après l'extraction annule
  l'analyse.
- Interface : les cartes se vident quand la clé change
  (`src/ui/index.ts`) ; `CarteComposant.reinitialiser` remet `analysee` à
  faux. Les retours portent leur destination et leur opération (4.3).
  L'interface numérote ses demandes, et un message sans provenance reste
  accepté.
- E3 : la phrase « le libellé du bouton l'annonce » quitte `SPEC.md`, partie 3.
- Tests, rouges sur le commit lu : une publication réussie garde son lien et
  ses points à corriger ; un changement de destination rend « Analyser le
  composant » disponible, un enregistrement à destination inchangée conserve
  le résultat (`interface.test.mjs`) ; un test de connexion périmé ne poste
  rien ; une publication croisée avec un enregistrement refuse en nommant la
  destination (`code.test.ts`). Une publication vers A terminée après une
  bascule vers B ne change ni la pastille ni le verdict de B, et libère
  l'interface. Le cas où A échoue ne propose pas de réessayer sur B.

### Lot 1. Condition des tokens en un point

Indépendant.

- `verdictDePrevol` rend `etat` ; `postVerdict` et `verdict()` de la galerie
  l'étalent (`src/prevol.ts`, `src/code.ts`, `galerie/etats.cjs`).
- E4 : le type et la fonction de `exportTokens.ts` deviennent
  `ResumeDesTokens` et `resumeDesTokens`, galerie comprise.
- Tests : `prevol.test.ts`, `exportTokens.test.ts`.
- Vérification : captures de la galerie identiques avant et après.

### Lot 2. Onglets et réglage des tokens

- Stockage : clé `gestionDesTokens`, lue en premier à `ui-ready`, et entrée
  dans la clé de destination, dont elle est le dernier membre. Une commande des
  tokens refusée dit : « La gestion des tokens est désactivée. Activez « Gérer
  les tokens » dans l'onglet Général de la configuration. ».
- Sandbox : `settings` porte `tokens` ; `etatDesTokensDuFichier` et
  `avecTokens` suivent le réglage ; demande `gerer-tokens { valeur }`, qui
  écrit par la file, annule une analyse en cours et relance la lecture des
  collections à la réactivation.
- `etatDuDepot` reçoit le réglage (`src/connexion.ts`).
- Interface : carte des tokens masquée par défaut ; page de configuration en
  deux onglets accessibles au clavier, avec leur description ; Général porte
  l'interrupteur ; Dépôts porte le formulaire actuel, déplacé sans changement ;
  pastille vers Dépôts, engrenage vers le dernier onglet (`src/ui/index.ts`,
  `ConfigurationPage.ts`, `Header.ts`, un composant d'onglets, `styles.css`).
- Galerie : `ouverture()` joue `settings` ; nouveaux états
  `ecran-sans-tokens`, `gitlab-composant-sans-consigne-tokens`,
  `configuration-onglet-general` ; les états `configuration-*` passent par
  l'onglet Dépôts ; textes « regarder » qui citent la carte des tokens.
- Tests : `code.test.ts` (réglage désactivé : aucune lecture du résumé des
  collections à l'ouverture, demandes d'analyse et de publication de tokens
  refusées, `avecTokens` faux, lectures G3 conservées, résumé tardif ignoré,
  bascule qui annule une analyse et pas une publication) ;
  `connexion.test.ts` (titre sans chemin de tokens) ; `interface.test.mjs`
  (premier test qui envoie `settings`, troisième test qui ouvre Dépôts, carte
  masquée jusqu'au réglage, flèches et `aria-selected`).
- Documents : `CONTRIBUTING.md` (section 3.3) ; `SPEC.md`, « Contexte
  technique » et « Analyses et publication » ; README du plugin, « Les deux
  commandes » ; `POUR-LES-DESIGNERS.md`, section 3 : l'ordre « tokens en
  premier » vaut quand la gestion des tokens est activée.

### Lot 3a. Stockage des dépôts

Le formulaire actuel reste l'interface : il enregistre le premier dépôt ou
modifie l'actif, avec l'adresse en lecture seule après enregistrement. Sa
commande de suppression retire l'entrée active entière. La liste arrive au
lot 3b.

- `src/config.ts` : clés `depots` et `depotActif`, reprise puis nettoyage des
  anciennes clés selon C10, validation par entrée, identité en minuscules, enregistrement,
  modification, suppression et activation dans l'ordre de la section 4.2 ;
  extension de la file du lot 0 dans `src/code.ts`.
- `src/connexion.ts` : retrait de `jeton-autre-forge`.
- `src/messages.ts` : `ReglagesPublics`, dont chaque dépôt porte aussi son
  `repoUrl`, `supprimer-depot` à la place de `supprimer-token`, adaptation du
  formulaire à l'entrée active. Le refus du doublon arrive dès ce lot, pour
  qu'une identité ne désigne qu'une entrée. Les messages
  d'enregistrement et de test par carte arrivent avec leurs états de galerie
  au lot 3b.
- `AGENTS.md` : invariant « Un jeton ne part que vers la forge qui l'a reçu »
  réécrit pour D2, qui cite encore `src/config.ts` et `validateSettings()` ;
  description de `config.ts` dans la carte du code.
- `SPEC.md`, partie 3 : stockage, règle du jeton, file d'écriture et sa limite
  entre deux fenêtres. L'énoncé en gras change : `ENONCES_SPEC` de
  `tests/inventaireInvariants.test.ts` change dans le même commit.
- Galerie : retrait de `gitlab-jeton-autre-forge` ; adaptation de
  `configuration-remplie` et du scénario de suppression aux nouveaux messages.
- Tests : `config.test.ts` et `code.test.ts`, section 4.2 ;
  `interface.test.mjs`, formulaire adapté et suppression de l'entrée active.

### Lot 3b. Liste des dépôts

- Interface : cartes dépliables rendues par `id`, statut ou « Se connecter »,
  « Ajouter un dépôt » qui crée une carte dépliée, adresse en lecture seule
  après enregistrement, suppression au second clic, repli après un
  enregistrement accepté et un test réussi, états de P3 et P4, pastille retirée
  de la page de configuration.
- Sandbox : demandes `enregistrer-depot` et `activer-depot` ;
  réponses `depot-enregistre` et `depot-teste`, corrélation des nouvelles
  cartes, générations de test par dépôt ; retrait des messages du formulaire
  unique encore employés au lot 3a.
- `src/connexion.ts` : statut court par cause pour la carte ; gestes du 401 et
  du 404 de la section 4.6, propres à la carte ; `repli` en cause.
- Galerie : catégorie `mixte` et invariant de `AGENTS.md` (C13) ;
  réécriture des autres `configuration-*` et de `gitlab-dossier-retire` ;
  nouveaux états `depots-aucun`, `depots-trois-deux-forges`,
  `depots-nouveau-erreurs`, `depots-doublon`, `depots-actif-deplie`,
  `depots-actif-jeton-refuse`, `gitlab-depots-actif-introuvable`,
  `depots-suppression-confirmation`, `depots-aucun-actif`,
  `destination-changee`.
- Tests : `interface.test.mjs` (« Se connecter » en un clic sans déplier la
  carte, suppression au second clic, carte dépliée conservée à la réception de
  `settings`, repli après sauvegarde et test réussis, retours de deux cartes
  nouvelles, champ du jeton vidé après sauvegarde) ; `code.test.ts`
  (enregistrer un dépôt inactif teste ce dépôt et ne vide aucune analyse,
  résultat ignoré après modification ou suppression de l'entrée).
- Relecture : compte des objets sur les captures (section 4.6).
- Documents : `POUR-LES-DESIGNERS.md`, « Configurer le dépôt » ; README du
  plugin, « Où l'export atterrit ».

### Lot 3c. Pastille nommée et verdict nommé

- `nom` (dernier segment de l'adresse) dans `src/config.ts` ; nom dans
  `etatDeConnexion` et dans le verdict `a-publier` (`src/prevol.ts`).
- Galerie : `ouverture()` passe un nom ; état `pastille-nom-long` avec un
  chemin GitLab à sous-groupes et un dernier segment long sans séparateur.
- Tests : `connexion.test.ts` (nom d'un chemin à sous-groupes, nom dans chaque
  cause) ; `prevol.test.ts` (verdict nommé).

### Lot 4. Export local

- Clé `exportLocal`, entrée dans la clé de destination ; interrupteur
  « Activer l'export local » dans l'onglet Général, désactivé par défaut ;
  demande `export-local { valeur }` ; `loadConfiguration` ne rend aucune
  configuration de publication quand elle vaut `true` ; aucun test automatique
  à l'ouverture, test de l'entrée enregistrée conservé selon C14 ; état de
  pastille `local` en avertissement ; textes de la section 6 ; ligne
  d'avertissement dans l'onglet Dépôts ; « Se connecter » désactive l'export
  local.
- Galerie : `general-export-local-active`, `depots-export-local`,
  `travail-export-local`, `export-local-termine`.
- Tests : aucune nouvelle opération réseau en export local, sauf test après
  enregistrement ; ce test met à jour sa carte sans changer le dépôt actif,
  la pastille ni la destination des exports ; publication déjà lancée menée à
  terme sans rétablir la connexion ; une analyse
  faite vers un dépôt ne se publie pas en export local ; désactiver l'export
  local rallume le dernier dépôt actif ; « Se connecter » le désactive.
- Documents : `SPEC.md` partie 3 ; `POUR-LES-DESIGNERS.md`.

### Lot 6. Recette dans Figma

Faite par le mainteneur, les gestes de l'agent s'arrêtant hors de Figma. Les
mesures à deux fenêtres et entre application et navigateur ne sont pas faites,
par décision du mainteneur.

1. Réglage des tokens désactivé : aucune carte ne clignote à l'ouverture.
2. Onglets à côté du panneau de droite de Figma, deux thèmes, fenêtre de
   320 × 320 px, contraste du texte de sévérité à 11 px, carte en échec amenée
   dans la vue.
3. Bascule réelle entre un dépôt GitHub et un projet GitLab, publication dans
   chacun.

## 9. Documents et tests touchés

| Fichier | Lots |
|---|---|
| `packages/plugin-exporter/SPEC.md` | 0 (E3), 2, 3a, 4 |
| `AGENTS.md` | 3a (jeton), 3b (galerie) |
| `CONTRIBUTING.md` | 2 |
| `packages/plugin-exporter/README.md` | 2, 3b |
| `docs/guides/POUR-LES-DESIGNERS.md` | 2, 3b, 4 |
| `README.md`, `docs/README.md` | 2, si « deux commandes » devient conditionnel |
| `packages/plugin-exporter/galerie/etats.cjs` | 0 à 4 |
| `packages/plugin-exporter/tests/config.test.ts` | 3a |
| `packages/plugin-exporter/tests/connexion.test.ts` | 2, 3a, 3b, 3c, 4 |
| `packages/plugin-exporter/tests/prevol.test.ts`, `exportTokens.test.ts` | 1, 3c |
| `packages/plugin-exporter/tests/code.test.ts` | 0, 2, 3a, 3b, 4 |
| `packages/plugin-exporter/tests/interface/interface.test.mjs` | 0, 2, 3a, 3b, 3c, 4 |
| `packages/plugin-exporter/tests/galerie.test.ts` | 3a, 3b (C13) |
| `packages/plugin-exporter/tests/stylesUi.test.ts` | Sans changement : chaque classe nouvelle reçoit sa règle |
| `tests/inventaireInvariants.test.ts` | 3a |

Vérification, depuis la racine :

```sh
npm test
npm run typecheck
npm run build
npm run test:ui --workspace ucm-exporter-plugin
npm run galerie --workspace ucm-exporter-plugin
npm run galerie:captures --workspace ucm-exporter-plugin
```

## 10. Questions restantes

**Équipe consommatrice**

- Dans combien de projets GitLab publie-t-elle ? Plus d'un projet ne change
  pas l'option A, tant qu'aucun ne reçoit de tokens.
- Son projet impose-t-il un nom de branche ou un message de commit ? GitLab le
  signale par un refus 400.
- Où ses composants sont-ils rangés, et le chemin
  `{components}/{Nom}/{Nom}.contract.json` place-t-il le contrat à côté du code ?
- Écrira-t-elle `ucm.config.json` à la main ? Un champ `tokens` écrit et
  invalide y refuserait l'export même réglage désactivé.

## 11. Revue indépendante

Un agent de revue a relu la première version de ce plan contre le code du
commit lu, avec deux sondes sur le routeur réel. Chaque constat a été vérifié
avant d'être retenu. La porte H1 en a ensuite modifié trois.

| # | Constat | Sort |
|---|---|---|
| 1 | Deux tests de connexion simultanés laissent une pastille fausse | Retenu, E6, rejoué ; compteur de génération au lot 0 |
| 2 | Un drapeau `reinitialiser` par geste contredit « l'identité du sujet décide » et laisse publier vers un dépôt changé dans une autre fenêtre | Retenu ; clé de destination (4.3) |
| 3 | Une modification concurrente d'une suppression fait revenir le jeton | Retenu ; file d'écriture (4.2), limite entre fenêtres documentée |
| 4 | Le retour d'enregistrement d'un dépôt inactif décrit l'actif | Retenu ; test du dépôt enregistré, `depot-enregistre` (4.5) |
| 5 | « `galerie.test.ts` sans changement » est faux face à une liste mixte | Retenu ; C13 |
| 6 | Les mesures dans Figma arrivent après le code qu'elles justifient | Retenu, puis levé à H1 : le mainteneur ne fait pas ces mesures |
| 7 | Le verdict ne nomme pas le dépôt de destination | Retenu ; C12, décidé |
| 8 | « Supprimer » se lit comme une suppression sur la forge | Retenu, puis tranché à H1 : le mainteneur garde « Supprimer » |
| 9 | Compte d'objets au-delà de la douzaine ; geste d'échec hors de vue | Retenu ; carte en échec dépliée et amenée dans la vue, compte à la relecture du lot 3b |
| 10 | « Réessayer » après bascule ; « La sélection a changé » à tort | Retenu, E7, rejoué ; clé de destination |
| 11 | Garder l'analyse après une bascule | Écarté : contenu figé avant une modification dans Figma, demande et état de plus (4.4) |
| 12 | Revenir à `postConnection` après une publication | Écarté : ce retour peut décrire l'ancien dépôt après une bascule ; garder le rafraîchissement protégé, et ne vider les cartes qu'à destination changée (lot 0) |
| 13 | Textes qui supposent une cause ou omettent le geste | Retenu ; refus de destination, annulation par les réglages |
| 14 | Deux sévérités pour le débranchement | Retenu ; avertissement pour la pastille et la ligne |
| 15 | Lot 3 trop gros | Retenu ; lots 3a, 3b, 3c |
| 16 | Règles non écrites : vidage, activation à l'ajout, entrée supprimée ailleurs, rendu par `id`, casse du doublon | Retenu ; sections 4.1, 4.2, 4.3 |
| 17 | Tests oubliés dans les harnais de `code.test.ts` et `interface.test.mjs` | Retenu ; sections 4.2, 7.1 et lot 2 |
| 18 | C11 sans besoin ; nom par homonymie trop élaboré ; lot 1 présenté comme préalable ; quatre états d'échec en galerie | Retenu ; puis H1 : C11 écartée, dernier segment seul |
| 19 | `title` de la pastille en conflit avec « Ouvrir la configuration » | Retenu ; ni troncature ni `title` |
| 20 | E3 hors de tout lot ; `etatDesTokens` aussi en double comme fonction | Retenu ; E3 au lot 0, E4 étendu |

## 12. Sources

Figma :
[`clientStorage`](https://developers.figma.com/docs/plugins/api/figma-clientStorage/),
[`showUI`](https://developers.figma.com/docs/plugins/api/properties/figma-showui/),
[interface d'un plugin](https://developers.figma.com/docs/plugins/creating-ui/),
[panneau de droite](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar),
[forum, stockage entre application et navigateur, non lu](https://forum.figma.com/archive-21/will-contents-stored-in-figma-clientstorage-be-consistent-both-on-figma-s-website-and-desktop-app-for-a-user-33600).

Forges :
[GitHub, création d'une pull request](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request),
[GitHub, rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository),
[GitLab, brouillons](https://docs.gitlab.com/user/project/merge_requests/drafts/),
[GitLab, règles de push](https://docs.gitlab.com/user/project/repository/push_rules/).

Produits et composants :
[Tokens Studio, code du plugin](https://github.com/tokens-studio/figma-plugin),
[Tokens Studio, changer de fournisseur](https://docs.tokens.studio/token-storage/manage-sync-provider/change),
[`@create-figma-plugin/ui`](https://github.com/yuanqing/create-figma-plugin/tree/main/packages/ui/src/components),
[Design Tokens](https://github.com/lukasoppermann/design-tokens),
[Postman](https://learning.postman.com/docs/sending-requests/variables/managing-environments/),
[GitKraken](https://help.gitkraken.com/gitkraken-desktop/profiles/),
[Tower](https://www.git-tower.com/help/guides/manage-hosting-services/connect-accounts/mac).

Accessibilité et interaction :
[WAI-ARIA, tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/),
[WAI-ARIA, switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/),
[Nielsen Norman Group, interrupteurs](https://www.nngroup.com/articles/toggle-switch-guidelines/).
