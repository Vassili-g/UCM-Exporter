# Plan de recherche sur les réglages du plugin

> Statut : à instruire par un agent. Ce plan prépare une page de configuration
> en deux onglets, « Général » et « Repos », la désactivation de la gestion des
> tokens, plusieurs dépôts enregistrés et un export local choisi. Il fixe les
> décisions déjà prises, l'inventaire du code concerné et les questions
> ouvertes. Il ne contient aucune implémentation.

## Instruction donnée à l'agent

Instruire les sections 4 à 8, puis écrire le rapport décrit en
[section 11](#11-livrable-attendu). Rendre la main au mainteneur à la fin du
rapport : c'est la porte humaine H1.

Règles de travail :

- **Ne modifier aucun code ni aucun document d'autorité.** Le seul fichier écrit
  est `RAPPORT-REGLAGES.md`, dans le dossier de ce plan.
- **Ne pas rouvrir les décisions de la [section 2](#2-décisions-prises).** Un
  fait du code qui contredit une décision se signale au mainteneur, sans
  modifier la décision.
- **Vérifier dans le code chaque fait cité ici avant de s'en servir.** Ce plan
  décrit l'état du code au moment de son écriture, et d'autres sessions
  commitent sur `main` pendant le travail. Relever le commit lu dans le rapport.
- **Recommander, sans trancher.** Chaque sujet ouvert reçoit une comparaison
  d'options, une recommandation et ses impacts. Le mainteneur décide à H1.
- **Aucun identifiant privé.** Le rapport ne nomme ni l'équipe consommatrice, ni
  un dépôt réel, ni un compte. Les exemples neutres de la galerie servent :
  `mon-org/design-system-v3` sur GitHub, `mon-groupe/design-system` sur GitLab.
- **Sources extérieures.** Consulter la source primaire (documentation Figma,
  documentation d'API des forges, produit étudié) et citer son adresse. Une
  affirmation sans source se marque « non vérifié ».

Lire avant de commencer :

1. [AGENTS.md](../../../../AGENTS.md), pour la carte du code et les invariants
   du plugin ;
2. [CONTRIBUTING.md, Interface du plugin](../../../../CONTRIBUTING.md#interface-du-plugin),
   qui fait autorité sur la hiérarchie de l'information et le protocole de
   relecture ;
3. la [partie 3 de SPEC.md](../../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge),
   pour la configuration et la publication ;
4. la skill [`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md)
   avant d'écrire le rapport, et la skill
   [`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md)
   avant de proposer un texte affiché dans le plugin.

## 1. Contexte

### 1.1. Utilisateurs

| Utilisateur | Usage | Faits établis |
|---|---|---|
| Équipe du design system UCM | Toutes les commandes : contrats, tokens, contrôle de CI sur chaque demande de fusion | Publie avec `ucm.config.json` et `@ucm-kit/cli` |
| Équipe consommatrice | La publication des contrats seule | Projet sur `gitlab.com`. Un seul designer publie. Ses composants portent un composant de règles `.componentRules`. Ses tokens viennent d'une autre chaîne d'outils. Les noms de tokens cités par ses contrats existent dans ses tokens. Elle n'installe aucun paquet `@ucm-kit/*` et n'utilise pas la CI UCM. Elle écrit ses propres contrôles |
| Mainteneur | Publie vers trois dépôts : deux sur GitHub, un sur GitLab | Seul utilisateur actuel du plugin. Ses trois dépôts reçoivent des tokens |

### 1.2. Demande

- Une page de configuration en deux onglets, « Général » et « Repos ».
- Dans « Général », des options du plugin, dont une option qui désactive la
  gestion des tokens. D'autres options sont à rechercher.
- Dans « Repos », plusieurs dépôts enregistrés. Le dépôt actif reçoit les
  exports, et le designer passe facilement d'un dépôt à l'autre.
- Dans « Repos », un interrupteur qui débranche tous les dépôts pour exporter en
  local.
- Dans l'en-tête, la pastille nomme le dépôt connecté.

### 1.3. État actuel du code

| Fait | Où le vérifier |
|---|---|
| `figma.clientStorage` garde un seul dépôt, sous quatre clés : `repoUrl`, `baseBranch`, `github_pat`, `forge_du_jeton` | `STORAGE_KEYS`, `src/config.ts` |
| Un seul jeton est enregistré pour les deux forges. Enregistrer un jeton d'une autre forge efface le précédent | `saveSettings`, `src/config.ts` |
| La forge se déduit de l'hôte de l'adresse. Seuls `github.com` et `gitlab.com` sont lus | `lireAdresseDuDepot`, table `HOTES`, `src/config.ts` |
| Le manifeste n'autorise que `https://api.github.com` et `https://gitlab.com`, et ne déclare aucun droit de plugin privé | `manifest.json`, `tests/manifestDistribution.test.ts` |
| L'UI ne reçoit jamais le jeton, seulement `forgeDuJeton` | `PublicSettings`, `src/config.ts` ; `src/messages.ts` |
| La configuration se relit dans `clientStorage` à chaque analyse et à chaque publication | `loadConfiguration`, appelée dans `analyser` et `publier`, `src/code.ts` |
| Le test de connexion part à `ui-ready` et après chaque enregistrement. Il lit aussi `ucm.config.json` | `refreshConfiguration`, `src/code.ts` ; `repositoryLayout`, `src/depot.ts` |
| Enregistrer ou supprimer le jeton vide les analyses gardées | `analysesGardees.clear()`, `src/code.ts` |
| Sans configuration valide, le pré-vol rend `sans-depot` et l'export se télécharge | `analyser`, `src/code.ts` ; `verdictDePrevol`, `src/prevol.ts` |
| Un échec de la forge pendant la publication télécharge aussi le fichier | `textesDePublication`, `src/connexion.ts` |
| La ligne « Aucun repository connecté » s'affiche entre les deux cartes quand `repli` vaut `true` | `etatDuDepot`, `src/connexion.ts` ; `depotRepli`, `src/ui/index.ts` |
| La pastille affiche « repository connecté » quelle que soit la forge, y compris sur GitLab où `termes.depot` vaut « projet » | `etatDeConnexion`, cause `connecte`, `src/connexion.ts` |
| La pastille est un bouton qui ouvre la configuration. Sa largeur suit son texte, sans troncature | `createHeader`, `src/ui/components/Header.ts` ; `.connection-status`, `src/ui/styles.css` |
| La page de configuration est un formulaire unique : adresse, branche de base, bloc de destination, jeton, suppression du jeton, bouton « Enregistrer » | `createConfigurationPage`, `src/ui/components/ConfigurationPage.ts` |
| La page de configuration reste accessible pendant une analyse. `occuper` ne rend inertes que les cartes | `occuper`, `src/ui/index.ts` |
| La taille minimale de la fenêtre est 320 × 320 px | `TAILLE_MINIMALE`, `src/fenetre.ts` |
| Aucun module de `src/contract/` n'importe `src/tokens/` | recherche des imports dans `src/contract/` |
| Le plugin lit `ucm.config.json` par l'API de la forge. Le dépôt n'a besoin d'aucun paquet npm pour que le plugin applique ses chemins, et un fichier écrit à la main vaut un fichier écrit par `ucm init` | `repositoryLayout`, `src/depot.ts` ; `configurationDepuisJson`, `packages/kit/src/format/configuration.ts` |
| Chaque champ de `ucm.config.json` est facultatif. Un champ absent prend sa valeur par défaut. Un champ écrit et invalide refuse l'export | `champsInvalidesDeLaConfiguration`, `CONFIGURATION_PAR_DEFAUT`, `packages/kit/src/format/configuration.ts` |
| Sans `ucm.config.json`, les contrats vont sous `components/`, à la racine du dépôt. La configuration affiche alors un avertissement avant l'export | `repositoryLayout`, `src/depot.ts` ; `etatDuDepot`, `src/connexion.ts` |
| Un contrat est écrit à `{components}/{Nom}/{Nom}.contract.json`, où `{Nom}` est l'identifiant de code du composant, en PascalCase | `artifactPath`, `src/depot.ts` |
| La configuration du plugin ne porte aucun chemin d'export. Le commentaire de `RepositorySettings` en donne la raison : un chemin rangé sur le poste enverrait l'export hors de la vue de `ucm check` | `RepositorySettings`, `src/config.ts` |

Sauf mention contraire, les chemins de ce tableau partent de `packages/plugin/`.

## 2. Décisions prises

| Décision | Conséquence pour la recherche |
|---|---|
| D1. La page de configuration porte deux onglets, « Général » et « Repos » | Instruire leur forme, pas leur existence ni leur nom |
| D2. Chaque dépôt enregistré porte sa propre adresse, sa branche de base et son jeton. Aucun jeton n'est partagé entre deux dépôts | Pas de modèle de jeton par forge ni par compte à étudier |
| D3. Aucune migration des réglages actuels | Les quatre clés actuelles peuvent être ignorées ou effacées. Pas de compatibilité avec une version antérieure du bundle |
| D4. Un seul dépôt actif, valable pour tout le plugin sur le poste. Il ne dépend pas du fichier Figma ouvert | Aucune association entre fichier Figma et dépôt |
| D5. Quand la connexion réussit, la pastille affiche « <nom du repository> connecté ». L'écran de travail ne reçoit aucun autre objet | Aucun sélecteur de dépôt sur l'écran de travail. La bascule se fait dans l'onglet Repos |
| D6. Un interrupteur de l'onglet Repos débranche tous les dépôts. Les exports sont alors téléchargés sur le poste | Instruire ses états et ses textes, pas son existence ni son onglet |
| D7. Désactiver la gestion des tokens retire la commande d'export des tokens et la dépendance du contrat à `tokens.json`. Les contrôles de qualité du contrat restent actifs | Voir la définition en [section 4.1](#41-définition-retenue) |
| D8. Seuls `github.com` et `gitlab.com` sont visés | Les instances auto-hébergées restent hors périmètre |

Un seul sujet de fond reste ouvert : l'endroit où vit le réglage des tokens
([section 4.4](#44-où-ranger-le-réglage)).

## 3. Contraintes

- **Hiérarchie de l'information.** Trois rangs, deux moyens au plus par
  élément, couleur réservée à la sévérité. « Une carte est une commande, et il
  n'y en a que deux. » L'alerte de repli local se place entre les deux cartes
  ([CONTRIBUTING.md](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation)).
- **Protocole de relecture.** Comparaison avec un panneau natif de Figma, deux
  thèmes, fenêtre de 320 px, pire contenu réel, compte des objets à l'écran
  ([CONTRIBUTING.md](../../../../CONTRIBUTING.md#le-protocole-de-relecture)).
- **Galerie.** Chaque type de message de `messages.ts` a au moins un état dans
  `galerie/etats.cjs`. `tests/galerie.test.ts` échoue sinon.
- **Document intact.** Le plugin n'écrit rien dans le document Figma.
  `tests/loiDuDocumentIntact.test.ts` refuse ces appels.
- **Jeton.** Le jeton ne passe jamais à l'UI, n'est jamais écrit dans le
  document ni journalisé. Un jeton ne part que vers la forge qui l'a reçu.
  L'ordre d'écriture de l'enregistrement protège cette règle contre une
  sauvegarde interrompue ([AGENTS.md](../../../../AGENTS.md), [SPEC.md](../../../../packages/plugin/SPEC.md#partie-3--configuration-et-dépôt-sur-une-forge)).
- **Mots des forges.** Tout texte qui nomme une forge, sa demande ou son jeton
  lit `src/forges/termes.ts`. Aucun message ne teste la forge.
- **Sandbox.** Aucune boîte de dialogue : une confirmation passe par un second
  clic sur le même bouton, comme « Supprimer le token enregistré ».
- **Interface construite à la main.** `src/ui/components/` crée le DOM sans
  bibliothèque d'interface. `tests/stylesUi.test.ts` exige une règle CSS pour
  chaque classe posée, et refuse une couleur écrite en dur hors des rôles.
- **Stockage.** La [documentation de `clientStorage`](https://developers.figma.com/docs/plugins/api/figma-clientStorage/)
  accorde 5 Mo par plugin. Elle précise que le stockage est privé « for
  stability, not security » : un utilisateur de la machine peut lire ce qui y
  est rangé.

## 4. Désactiver la gestion des tokens

### 4.1. Définition retenue

Le critère : désactiver ce qui suppose qu'UCM livre `tokens.json`, et garder ce
qui vérifie que le contrat cite correctement les variables Figma.

| Groupe | Contenu | Réglage désactivé |
|---|---|---|
| G1. Commande d'export des tokens | La carte « Tokens du fichier », son analyse, sa publication, la lecture des collections à l'ouverture | Retiré |
| G2. Dépendance du contrat à `tokens.json` | La consigne « publiez les tokens d'abord », la lecture de l'état des tokens dans le dépôt, le résumé « tokens dans … » | Retiré |
| G3. Qualité du contrat | Les diagnostics qui demandent de relier une valeur à une variable, les collisions de noms de variables, l'inventaire des tokens cités | Conservé |

G3 reste parce qu'un contrat cite ses tokens par le chemin de la variable Figma,
que UCM exporte les tokens ou non
([FORMAT.md](../../../format/FORMAT.md#nommer-et-citer-un-token)). Une couleur
non liée à une variable manque au contrat de l'équipe consommatrice comme à
celui de l'équipe UCM.

### 4.2. Inventaire à vérifier et compléter

L'inventaire ci-dessous est un point de départ. Le compléter par une recherche
des termes `tokens`, `Tokens`, `avecTokens`, `EtatDesTokens`, `carte-tokens`,
`tokens-resume`, `tokens-format` et `layout.tokens` dans `packages/plugin/src/`,
`packages/plugin/galerie/` et `packages/plugin/tests/`.

**G1, commande d'export des tokens**

| Élément | Où |
|---|---|
| Carte « Tokens du fichier », bouton « Analyser les tokens du fichier » | `createCarteTokens`, `src/ui/components/CarteTokens.ts` |
| Création de la carte, insertion après `depotRepli`, boucle de `occuper`, réinitialisation à la réception de `settings`, réception de `tokens` et `format-tokens` | `src/ui/index.ts` |
| Demandes `analyser-tokens` et `publier` de genre `tokens` | `UiRequest`, `src/messages.ts` |
| Messages `tokens` et `format-tokens` | `PluginMessage`, `src/messages.ts` |
| Lecture des collections à `ui-ready` | `etatDesTokensDuFichier`, `src/tokens/exportTokens.ts`, appelée dans `traiterMessage`, `src/code.ts` |
| Analyse et annonce du format | `handleExportTokens`, `annonceDuFormat`, `src/code.ts` |
| Chemin et ligne de format d'un export de tokens | `artifactPath`, `ligneDeFormatDeTokens`, `src/depot.ts` |
| Styles | `.carte-tokens`, `.tokens-resume`, `.tokens-format`, `src/ui/styles.css` |
| États de la galerie | `fichier-sans-tokens`, `export-tokens-reussi`, `tokens-sans-profil`, et le paramètre `tokens` de `ouverture` |
| Tests | `tests/exportTokens.test.ts`, `tests/etatDesTokens.test.ts`, `tests/interface/interface.test.mjs` |

**G2, dépendance du contrat à `tokens.json`**

| Élément | Où |
|---|---|
| Lecture de l'état des tokens du dépôt : fichier sur la base, export en vol | `etatDesTokens`, option `avecTokens` de `lireAvantEcriture`, `src/depot.ts` |
| Consigne de fusion des tokens dans le verdict | `ordreDesTokens`, `src/prevol.ts` |
| État `warning` du verdict quand les tokens ne sont pas fusionnés | `postVerdict`, `src/code.ts` |
| Copie de la même condition dans la galerie | fonction `verdict`, `galerie/etats.cjs` |
| État de la galerie | `gitlab-composant-avant-les-tokens` |
| Résumé « Contrats dans …, tokens dans … » et avertissement « composants et les tokens » | `etatDuDepot`, `src/connexion.ts` |
| Documents | SPEC.md, section « Analyses et publication » ; POUR-LES-DESIGNERS.md, section 3 (« exportez les tokens en premier ») ; README du plugin, « Les deux commandes » |
| Tests | `tests/prevol.test.ts`, `tests/connexion.test.ts`, `tests/code.test.ts` |

**G3, qualité du contrat, conservé**

| Élément | Où |
|---|---|
| Index des variables, alias et collisions de noms | `indexVariables`, `src/variables.ts` |
| Diagnostics de liaison à une variable | `src/contract/extractVariantTokens.ts`, `src/contract/extractSlotTokens.ts`, `src/contract/extractVariantTypography.ts` |
| Inventaire des tokens cités par le contrat | `tests/tokensUsed.test.ts` |

### 4.3. Questions à instruire sur la séparation

- **Point de décision unique.** La condition « tokens pas encore fusionnés » est
  écrite trois fois : `ordreDesTokens`, `postVerdict` et la fonction `verdict`
  de la galerie. Étudier une source unique de cette condition avant d'y ajouter
  le réglage, et mesurer ce que l'unification change aux tests existants.
- **Trajet du réglage.** Le réglage se lit dans le sandbox, l'UI masque la
  carte. Instruire le message qui le transporte, et le moment où l'UI le reçoit
  par rapport au premier affichage : une carte affichée puis retirée à
  l'ouverture est un défaut visible.
- **Appels évités.** Relever les appels à la forge et à l'API Figma que le
  réglage supprime : `etatDesTokens` fait une lecture de fichier puis une
  recherche d'exports en vol, `etatDesTokensDuFichier` lit les collections
  locales.
- **Couplages cachés.** Chercher tout texte, style, test ou état de galerie qui
  suppose deux cartes ou la présence de la carte des tokens. Exemple connu :
  `for (const carte of [composant, tokens])` dans `occuper`.
- **Changement pendant une opération.** Le réglage change pendant une analyse de
  tokens, pendant une publication de tokens, ou alors qu'une analyse de tokens
  est gardée dans `analysesGardees`.
- **Chemin `tokens` du dépôt.** `repositoryLayout` lit toujours le champ
  `tokens` de `ucm.config.json`. Instruire son affichage dans le bloc de
  destination quand le réglage est désactivé.
- **Écran à une carte.** La règle des deux cartes et la place de l'alerte de
  repli, « entre elles », supposent deux cartes. Instruire la hiérarchie, la
  position de l'alerte et la hauteur libérée. Relever les passages de
  CONTRIBUTING.md à réécrire.
- **Réactivation.** L'état de la carte au retour, et le verdict d'un composant
  analysé pendant la désactivation, qui ne porte pas la consigne sur les tokens.

### 4.4. Où ranger le réglage

**Le problème.** Le réglage doit masquer la carte des tokens et retirer G2 pour
l'équipe consommatrice, sans gêner l'équipe UCM ni le mainteneur qui bascule
entre trois dépôts.

**Options à comparer.**

| Option | Stockage | Arguments déjà relevés |
|---|---|---|
| A. Réglage global, onglet « Général » | `clientStorage`, une clé | Le plus simple. Identique à B pour une équipe qui n'a qu'un dépôt. Oblige à basculer le réglage à chaque changement de dépôt si les dépôts du designer diffèrent |
| B. Réglage par dépôt, onglet « Repos » | `clientStorage`, dans chaque dépôt enregistré | Suit la bascule de dépôt sans geste. Sa valeur en export local, sans dépôt actif, reste à définir |
| C. Clé de `ucm.config.json` | Le dépôt | Partagée par tous les designers du dépôt. Le plugin lit ce fichier au test de connexion, donc après l'ouverture : la carte s'afficherait avant d'être retirée, et resterait affichée en export local ou quand la connexion échoue. Modifie la grammaire publiée par `@ucm-kit/core` ([configuration.ts](../../../../packages/kit/src/format/configuration.ts), [COMPATIBILITE.md](../../../format/COMPATIBILITE.md)) pour un seul lecteur, le plugin |
| D. Combinaison, par exemple une valeur globale surchargée par dépôt | `clientStorage` | À décrire par l'agent si une combinaison réduit les défauts de A et B |

**Critères.**

- gestes par changement de dépôt, pour le mainteneur et pour l'équipe
  consommatrice ;
- comportement à l'ouverture, avant la fin du test de connexion ;
- comportement en export local et quand la connexion échoue ;
- cohérence entre plusieurs designers d'une même équipe ;
- coût sur le format publié, les tests, les états de galerie et les documents ;
- lisibilité pour un designer : l'endroit où il cherche ce réglage.

**Faits établis.**

- Les trois dépôts du mainteneur reçoivent des tokens. Le mainteneur ne
  désactive donc pas le réglage en passant d'un de ses dépôts à un autre.
- Un seul designer publie dans l'équipe consommatrice.

Ces deux faits renseignent les critères « gestes par changement de dépôt » et «
cohérence entre plusieurs designers ». Les peser avec les autres critères.

## 5. Plusieurs dépôts : l'onglet Repos

### 5.1. Ce qu'un dépôt enregistré contient

D2 fixe trois champs : adresse, branche de base, jeton. À instruire :

- l'identité d'un dépôt enregistré : un même dépôt avec deux branches de base
  donne-t-il deux dépôts enregistrés ?
- le refus d'un doublon, l'ordre de la liste et un nombre maximal ;
- l'utilité d'un libellé libre. Il n'est pas demandé : ne le proposer que si la
  recherche montre un cas où le nom du dépôt ne suffit pas ;
- le contrôle du préfixe à la saisie (`forgeDuPrefixe`), qui s'applique
  toujours par dépôt.

### 5.2. Stockage et règle du jeton

- Comparer une clé par dépôt et un seul objet pour toute la liste, dans
  `clientStorage`. Critères : écriture interrompue, taille, lecture à chaque
  analyse et publication.
- Réécrire la règle « un jeton ne part que vers la forge qui l'a reçu » pour
  D2. Décrire l'ordre d'écriture qui la protège contre une sauvegarde
  interrompue, comme `saveSettings` le fait aujourd'hui.
- Décrire la forme publique de la liste envoyée à l'UI. Elle ne porte aucun
  jeton, seulement sa présence par dépôt, comme `PublicSettings` avec
  `forgeDuJeton`.
- D3 : choisir entre ignorer et effacer les quatre clés actuelles, et le moment
  de l'effacement.
- Relever les tests de `tests/config.test.ts` à réécrire.

### 5.3. Le dépôt actif sur un poste

- **Deux fenêtres du plugin.** Mesurer le cas de deux fichiers Figma ouverts,
  chacun avec le plugin lancé. `loadConfiguration` relit `clientStorage` à
  chaque analyse et publication. Si la fenêtre A change le dépôt actif, la
  fenêtre B publie vers le nouveau dépôt alors que sa pastille nomme encore
  l'ancien. Vérifier ce comportement dans Figma, puis comparer les parades
  possibles.
- Vérifier si l'application de bureau et le navigateur partagent
  `clientStorage`. La documentation Figma ne le dit pas.

### 5.4. Changer de dépôt actif

- Vider les analyses gardées, comme l'enregistrement le fait.
- Instruire la bascule pendant une analyse ou une publication : la page de
  configuration reste accessible, et `operationEnCours` et `publicationEnCours`
  décrivent l'opération en cours.
- Appliquer la règle « un résultat ne survit pas à son sujet » quand le dépôt
  change et que la sélection reste la même.
- Relancer le test de connexion et le message `depot` pour le nouveau dépôt
  actif.

### 5.5. Test de connexion

Comparer un test du seul dépôt actif et un test de tous les dépôts enregistrés,
à l'ouverture et à la bascule. Critères : nombre d'appels réseau, délai avant
que la pastille soit exacte, utilité d'un état par dépôt dans la liste.

### 5.6. Interface de la liste

Travail de recherche principal de l'onglet Repos. Pour chaque référence,
relever :

- l'affichage de l'élément actif ;
- le nombre de gestes pour changer d'élément actif ;
- l'ajout, la modification et la suppression d'un élément ;
- l'affichage d'un secret enregistré ;
- l'affichage de l'erreur d'un élément ;
- l'affichage de l'état sans élément actif, à rapprocher de D6.

| Famille | Références à étudier | Ce qu'elle éclaire |
|---|---|---|
| Plugins Figma synchronisés avec une forge | Tokens Studio, ses fournisseurs de synchronisation et leurs identifiants | Une liste d'identifiants dans la même sandbox et une largeur voisine |
| Composants d'interface au style de Figma | Les onglets, interrupteurs et listes de `@create-figma-plugin/ui` ; le panneau de propriétés de Figma | La conformité visuelle au panneau natif |
| Environnements nommés | Les environnements de Postman et leur choix « No environment » | Un élément actif parmi plusieurs, et l'absence voulue d'élément actif |
| Comptes des clients Git | Fork, Tower, GitKraken | Plusieurs identités sur plusieurs forges |
| Listes dans un panneau étroit | Liste et détail, édition en ligne, accordéon | La lecture à 320 px |

Critères de comparaison : gestes vers la bascule, risque de publier dans le
mauvais dépôt, compte des objets, lecture à 320 px, écart avec un panneau natif
de Figma.

États à maquetter pour chaque option retenue, en texte à 320 px de large :

- aucun dépôt enregistré ;
- un dépôt, puis trois dépôts sur deux forges ;
- ajout d'un dépôt, avec les erreurs de saisie par champ de `validateSettings` ;
- modification du dépôt actif ;
- dépôt actif en panne : jeton refusé, accès refusé, dépôt introuvable,
  `ucm.config.json` fautif ;
- dépôt inactif en panne, si la section 5.5 retient un test de tous les dépôts ;
- suppression confirmée par second clic ;
- dépôts débranchés (D6).

### 5.7. Suppression

- Supprimer un dépôt doit effacer son jeton. Vérifier qu'aucun autre chemin
  ne le garde.
- Instruire le dépôt actif qui suit la suppression du dépôt actif : aucun,
  le premier de la liste, ou export local.

## 6. La pastille de l'en-tête

D5 fixe le texte de l'état connecté : « <nom du repository> connecté ». À
instruire :

- **Le nom.** `lireAdresseDuDepot` rend `propriétaire/repository` sur GitHub et
  le chemin complet du projet sur GitLab, sous-groupes compris. Comparer le
  dernier segment et le chemin complet. Relever le cas de deux dépôts
  enregistrés qui partagent le dernier segment.
- **La longueur.** `.connection-status` suit la largeur de son texte, sans
  troncature. Mesurer un chemin GitLab à trois niveaux dans une fenêtre de
  320 px, puis comparer retour à la ligne, troncature et attribut `title`.
- **Les autres états.** `etatDeConnexion` produit aussi « connexion… », « jeton
  refusé », « accès refusé », « … introuvable », « … injoignable ». D5 ne
  modifie que l'état connecté. Instruire l'intérêt de nommer le dépôt dans ces
  états, et le proposer sans le décider.
- **La destination du clic.** La pastille ouvre la configuration. Instruire
  l'onglet qu'elle ouvre.
- **Les tests et la galerie.** Relever les états de `galerie/etats.cjs` qui
  passent par `ouverture('connecte')` et les tests qui lisent le texte de la
  pastille.

## 7. Débrancher les dépôts

D6 fixe l'interrupteur et son onglet. À instruire :

- **Les situations à distinguer.** Aucun dépôt enregistré ; dépôt actif mal
  configuré ; dépôts débranchés par le designer ; échec de la forge pendant une
  publication. Le booléen `repli` de `etatDuDepot` et la cause `non-configure`
  couvrent aujourd'hui les deux premières.
- **Les textes.** Pastille, ligne entre les cartes (« Aucun repository
  connecté. L'export sera téléchargé sur votre poste. »), verdict `sans-depot`
  de `verdictDePrevol`, ligne de compte rendu de `publier` dans `code.ts`.
- **La persistance.** L'interrupteur survit-il à la fermeture du plugin ? Un
  débranchement oublié télécharge chaque export sans ouvrir de demande de
  fusion. Instruire le rappel visible sur l'écran de travail, dans les limites
  de D5.
- **Le réseau.** Instruire le test de connexion à l'ouverture quand les dépôts
  sont débranchés. Le pré-vol ne peut plus dire qu'un contenu est identique au
  dépôt ni signaler une collision : instruire ce que le verdict en dit.
- **Le rebranchement.** Le dernier dépôt actif redevient-il actif ?
- **Les tokens.** Avec le réglage des tokens désactivé, l'export local ne
  propose que le contrat. Avec l'option B de la section 4.4, instruire la
  valeur du réglage sans dépôt actif.
- **La galerie.** `depot-non-configure` et `export-sans-depot` décrivent le
  repli actuel.

## 8. Les onglets et l'onglet Général

### 8.1. Les onglets

- **Aspect.** Relever les onglets du panneau de propriétés de Figma : hauteur,
  typographie, marque de l'onglet actif. Les comparer au décalque des variables
  `--figma-color-*` de `galerie/theme-figma.css`.
- **Clavier et accessibilité.** Rôles `tablist`, `tab`, `tabpanel`, flèches
  pour changer d'onglet, focus.
- **Entrée.** L'engrenage et la pastille ouvrent la configuration. Instruire
  l'onglet ouvert par chacun, et la mémoire du dernier onglet.
- **Enregistrement.** Aujourd'hui, un bouton « Enregistrer » valide le
  formulaire et `settingsDirty` protège une saisie en cours. Instruire l'effet
  immédiat d'un interrupteur ou son passage par « Enregistrer », le sort d'une
  saisie non enregistrée au changement d'onglet, et le nombre de boutons
  d'enregistrement.
- **En-tête.** Le titre « Configuration » et le sous-titre « Le dépôt où les
  exports sont déposés, et le jeton qui les y autorise. » viennent de `PAGES`,
  `src/ui/index.ts`. Le sous-titre décrit un seul dépôt.

### 8.2. Options candidates de l'onglet Général

Sources à croiser :

1. les comportements fixés dans le code, ci-dessous ;
2. les réglages des plugins Figma qui publient vers une forge ou une plateforme
   de tokens ;
3. les besoins des deux équipes ([section 10](#10-questions-ouvertes)).

| Comportement actuel | Où | Question |
|---|---|---|
| La demande de fusion s'ouvre dans le navigateur après la publication | `figma.openExternal`, SPEC.md partie 3 | Un designer qui publie plusieurs composants d'affilée veut-il un onglet de navigateur par demande ? |
| L'avertissement « Aucune règle d'usage exploitable » s'affiche à chaque sélection d'un composant sans `.componentRules` | `reportSelectionState`, `src/code.ts` | L'équipe consommatrice utilise `.componentRules`. Instruire s'il reste un besoin établi pour cette option |
| La demande de fusion s'ouvre hors brouillon | `src/forges/github.ts`, `src/forges/gitlab.ts` | Les API des deux forges acceptent-elles un brouillon, et une équipe le demande-t-elle ? |
| Les branches portent le préfixe `ucm-exporter/export-` | `prefixeDeBranche`, `src/depot.ts` | La détection des exports en vol lit ce préfixe. Une règle de nom de branche d'un dépôt peut-elle exiger de le changer ? |
| La taille de la fenêtre est rangée automatiquement | `src/fenetre.ts` | Un geste de retour à la taille par défaut manque-t-il ? |
| Aucun geste n'efface toutes les données du plugin sur le poste | `supprimerPat`, `src/config.ts` | Avec plusieurs jetons, ce geste devient-il nécessaire ? |
| L'interface est en français | commentaire des libellés, `ConfigurationPage.ts` | Tranché. Hors périmètre |

Pour chaque option retenue : le besoin qui la justifie, sa portée (poste ou
dépôt), les états de galerie et les tests qu'elle ajoute. Chaque interrupteur
double les états à relire pour les écrans qu'il touche. Pour chaque option
écartée : la raison, en une phrase.

## 9. Documents et tests touchés par l'implémentation

Le rapport liste, pour chaque recommandation, les fichiers à modifier parmi
ceux-ci, et ceux que l'agent découvre en plus.

| Fichier | Ce qui change |
|---|---|
| `packages/plugin/SPEC.md` | Partie 3 : stockage, jeton, dépôt actif, débranchement. Section « Analyses et publication » : lecture de l'état des tokens |
| `AGENTS.md` | Invariant du jeton, description de `config.ts` dans la carte du code |
| `CONTRIBUTING.md` | Règle des deux cartes et place de l'alerte de repli, si la carte des tokens disparaît |
| `packages/plugin/README.md` | « Les deux commandes », configuration de la forge |
| `docs/guides/POUR-LES-DESIGNERS.md` | Section 3, configuration du dépôt et ordre d'export des tokens |
| `packages/plugin/galerie/etats.cjs` | États de configuration, de pastille, de repli et de tokens |
| `packages/plugin/tests/` | `config.test.ts`, `connexion.test.ts`, `prevol.test.ts`, `etatDesTokens.test.ts`, `code.test.ts`, `galerie.test.ts`, `stylesUi.test.ts`, `buildUi.test.ts`, `interface/interface.test.mjs` |

Commandes de vérification, depuis la racine :

```sh
npm test
npm run galerie --workspace ucm-exporter-plugin
npm run galerie:captures --workspace ucm-exporter-plugin
```

## 10. Questions ouvertes

**Mainteneur**

- À quelle fréquence le mainteneur change-t-il de dépôt, et pour quel motif ?

**Équipe consommatrice**

- Dans combien de projets GitLab publie-t-elle ?
- Son projet impose-t-il des règles de nom de branche ou de message de commit ?
  GitLab les signale par un refus 400.
- Comment ses composants sont-ils rangés dans son dépôt ? Le chemin
  `{components}/{Nom}/{Nom}.contract.json` place-t-il le contrat à côté du code
  du composant ?
- L'équipe écrira-t-elle `ucm.config.json` à la main, et avec quelle valeur de
  `components` ?

## 11. Livrable attendu

`RAPPORT-REGLAGES.md`, dans le dossier de ce plan, avec :

1. le commit lu et la liste des faits de la section 1.3 vérifiés ou corrigés ;
2. pour chaque sujet des sections 4 à 8 : faits vérifiés avec leur fichier,
   options comparées dans un tableau, recommandation, impacts sur le code, les
   tests, la galerie et les documents, questions restantes ;
3. l'inventaire complété des groupes G1, G2 et G3 ;
4. les maquettes en texte de l'onglet Repos, de l'onglet Général et de la
   pastille, à 320 px de large ;
5. un ordre de mise en œuvre qui respecte les dépendances de la
   [section 12](#12-dépendances-entre-les-sujets).

Après H1, le mainteneur décide. Le plan d'implémentation qui suit passe par une
revue indépendante avant d'être exécuté.

## 12. Dépendances entre les sujets

| Sujet amont | Sujet qu'il conditionne |
|---|---|
| Point de décision unique de la condition sur les tokens (4.3) | Branchement du réglage des tokens |
| Emplacement du réglage des tokens (4.4) | Contenu de l'onglet Général (8.2) et du dépôt enregistré (5.1) |
| Stockage de la liste (5.2) | Bascule (5.4), deux fenêtres du plugin (5.3), suppression (5.7) |
| Test de connexion (5.5) | États de la liste à maquetter (5.6) |
| Nom affiché dans la pastille (6) | Libellé des dépôts dans la liste (5.6) |
| Situations de repli (7) | Textes de la pastille et de la ligne entre les cartes |
| Contenu mesuré des deux onglets (5, 8.2) | Forme des onglets et modèle d'enregistrement (8.1) |
