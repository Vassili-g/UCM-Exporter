# Plan d'implémentation : publier sur GitLab

Ce plan s'adresse à l'agent qui ajoute GitLab au produit, seul, lot par lot. Il
couvre le plugin, le kit, la CLI, la documentation et la recette réelle. Une case
se coche quand sa preuve est constatée, dans le commit qui la livre.

Le besoin vient d'une équipe qui travaille sur gitlab.com. Le designer a saisi
`https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines?ref_type=heads`,
que le plugin refuse aujourd'hui. L'équipe accepte le plugin distribué par la
Community et veut la chaîne entière : export depuis Figma, merge request,
contrôle en CI et rapport sur la merge request.

Les tâches marquées **[mainteneur]** exigent Figma, un compte gitlab.com, une
publication Community ou un échange avec l'équipe. L'agent prépare ce qui
précède, écrit la demande dans son compte rendu et passe à la tâche suivante
qui n'en dépend pas.

## 1. Ce qui est mesuré

Ces faits ont été constatés avant d'écrire le plan. Une tâche qui les contredit
corrige le plan et le dit dans son commit.

| Fait | Source |
|---|---|
| L'API de gitlab.com accepte une requête d'origine `null` | Preflight `OPTIONS` avec `Origin: null` et `private-token,content-type` : `access-control-allow-origin: *`, méthodes `GET POST PUT DELETE` |
| `mon-groupe/design-system` est un projet privé | `GET /api/v4/projects/mon-groupe%2Fdesign-system` sans jeton rend 404 |
| L'écran de création d'un jeton personnel gitlab.com propose des scopes classiques (`api`, `read_api`, `read_repository`, `write_repository`, `read_registry`, `write_registry`, `create_runner`, `manage_runner`, `k8s_proxy`, `self_rotate`, `ai_features`), pas des permissions par ressource | Constaté à la création d'un jeton sur gitlab.com |
| Seul le scope `api` couvre l'API REST en écriture ; `write_repository` ne s'authentifie pas sur l'API | Documentation GitLab, « Access token scopes » : « `write_repository` … Uses Git-over-HTTP. Does not support API authentication. » |
| Les jetons d'accès projet exigent Premium sur gitlab.com | Documentation GitLab, « Project access tokens » |
| Les comptes de service existent sur l'offre gratuite | Documentation GitLab, « Service accounts » |
| `CI_JOB_TOKEN` lit les notes d'une merge request sans pouvoir en écrire | Documentation GitLab, « CI/CD job token » |
| L'API de commits refuse au-delà de 300 Mo et freine au-delà de 20 Mo | Documentation GitLab, « Commits API » |
| L'API de fichiers exige le chemin encodé en un seul segment et rend `commit_id` et `last_commit_id` | Documentation GitLab, « Repository files API » |
| `workflow:rules` s'applique au pipeline entier, et `after_script` tourne dans un nouveau shell dont l'échec ne change pas le statut du job | Documentation GitLab, « CI/CD YAML syntax » |
| Les notes d'une merge request se lisent par pages et comprennent les notes système | Documentation GitLab, « Notes API » |
| Un pipeline rouge ne bloque la fusion que si « Pipelines must succeed » est coché | Documentation GitLab, « Auto-merge » |
| Le rapport de CI écrit « La fusion reste bloquée » | `controle-repository.mjs:253`, `:265`, `:278` |
| Trois phrases du rapport de CI nomment la « pull request » | `controle-repository.mjs:617`, `diagnostic-tests.mjs:85`, `diagnostic-tokens.mjs:28` |
| Le rendu Markdown du kit ne neutralise aucun lien automatique, sur aucune forge | `diagnostic-markdown.mjs:10` ne remplace que le tiret long |
| La CLI lit déjà une variable d'environnement | `ucm.mjs`, `echecsDeTestsDepuis` lit `UCM_ECHECS_DE_TESTS` |
| `ucm init` n'écrit qu'un workflow GitHub | `init.mjs`, `workflow()` et le chemin `.github/workflows/ucm.yml` |
| Le chargement de la configuration passe par un seul point | `loadGithubConfig()`, appelé à l'ouverture, au pré-vol et à la publication |
| `saveSettings` écrit ses clés dans un `Promise.all` sans ordre | `config.ts:142` |

Mesures de L0, faites le 16/09/2026 sur `_vass/ucm-playground` avec un jeton
d'accès projet de rôle Owner et de scope `api` :

| Fait | Source |
|---|---|
| Un jeton d'accès projet se crée sur ce compte, que la documentation réserve à Premium sauf « pendant un essai, un seul » | `GET /personal_access_tokens/self` rend `["api"]` et un compte bot `project_<id>_bot_…` ; documentation GitLab, « Project access tokens » |
| Un jeton GitLab, personnel ou projet, commence par `glpat-` | Lecture du préfixe du jeton de recette, sans l'afficher |
| Chaque appel du plugin et de la CLI rend 2xx : projet, fichier, branche, commit sur nouvelle branche, liste et création de merge request, suppression de branche, `/user`, création, modification et liste de notes | Script de mesure, statuts 200, 201 et 204 |
| Un fichier absent rend 404 `File Not Found` ; un jeton invalide rend 401 ; une écriture sur un projet sans droit rend 403 | Idem |
| Commits : `create` sur un fichier existant rend 400 `A file with this name already exists` ; une branche cible existante rend 400 `A branch called '…' already exists` ; un `start_sha` inconnu rend 400 `Cannot find start_sha` ; un nom de branche invalide rend 400. Aucun de ces refus ne crée la branche | Idem, branches relues en 404 |
| `last_commit_id` n'est pas vérifié quand `start_sha` est donné : un identifiant inconnu et un identifiant réel mais périmé rendent 201 | Idem |
| Une seconde merge request sur la même branche source rend 409 ; une branche source absente rend 400 | Idem |
| Une ligne `/label` ou `/close` s'exécute dans une note **et** dans la description d'une merge request créée par l'API, puis disparaît du texte enregistré | Label posé, merge request fermée, corps relu sans la ligne |
| `@nom`, `#1`, `!1`, `~label`, `%jalon`, `projet#1`, `projet!1`, un SHA de commit existant et `:emoji:` deviennent des liens ou des images ; `$1` et `&1` restent du texte sans snippet ni epic ; toute forme en `code` reste inerte | `POST /markdown` avec `project`, sur des cibles créées pour la mesure |
| Les notes paginent par `x-next-page` | En-têtes d'une liste à `per_page=2` |
| Une merge request ouverte par l'API depuis une branche non protégée déclenche le pipeline `merge_request_event` sur les runners partagés ; une variable masquée non protégée y est lisible ; `CI_MERGE_REQUEST_IID`, `CI_MERGE_REQUEST_DIFF_BASE_SHA` et `CI_API_V4_URL` sont définis | Pipeline 2853752446, job réussi en 30 s |
| `npx --yes` sur la CLI publiée, version 0.1.37, s'exécute en 2 s dans `after_script` | Journal du même job |
| La branche par défaut d'un projet neuf est protégée | `GET /repository/branches/main` |

Reste à mesurer, par le mainteneur : les deux appels depuis le sandbox d'un
plugin de développement.

## 2. Décisions

**D1. La forge se déduit de l'hôte de l'URL.** `github.com` désigne GitHub,
`gitlab.com` désigne GitLab. Toute autre adresse est refusée avec un message qui
nomme les deux hôtes acceptés. Une instance GitLab auto-hébergée reste hors
périmètre du plugin : son domaine devrait figurer dans le manifest au moment du
build. Le formulaire ne reçoit aucun sélecteur de forge.

**D2. L'adresse d'une page du projet est acceptée, et ce qui en est retiré se
voit.** Pour GitLab, tout ce qui suit `/-/` est retiré, puis la requête et le
fragment ; le reste est le chemin du projet, sous-groupes compris. Pour GitHub,
les deux premiers segments du chemin forment le repository. La branche et le
dossier de l'adresse sont ignorés, parce qu'un nom de branche peut contenir `/`.
Sous le champ, le formulaire affiche le projet retenu, « Projet GitLab :
mon-groupe/design-system ». Quand un chemin a été retiré, une seconde ligne dit que
l'adresse désignait un dossier et que `ucm.config.json` du projet décide où vont
les exports. L'interface importe la fonction de lecture de `config.ts` et ne
recopie aucune expression régulière.

**D3. Un module commun et un port réduit.** La logique qui ne dépend d'aucune
forge quitte `src/github.ts` pour `src/depot.ts` : lecture de `ucm.config.json`,
chemin de l'artefact, immobilité, collision, exports en vol, corps de la demande,
diagnostic de connexion. Deux adaptateurs implémentent le port `Forge`,
`src/forges/github.ts` et `src/forges/gitlab.ts` :

- `testerDepot()` : lecture du projet ; un échec lève une `ErreurDeForge` qui
  porte le statut, et `depot.ts` en tire la cause ;
- `lireFichier(chemin, ref)` : contenu décodé et version, ou `null` ;
- `demandesOuvertes()` : branche source et URL de chaque demande ouverte vers
  la branche de base, que l'adaptateur porte dans `baseBranch` ;
- `publier({ branche, base, chemin, contenu, version, message, titre, corps })` :
  écrit, ouvre la demande et rend son URL ; l'adaptateur retire sa branche quand
  l'écriture ou l'ouverture échoue ;
- `termes` et `sansLienAutomatique(texte)`.

La séquence d'écriture appartient à chaque adaptateur. GitHub garde ref,
branche, PUT contents, pull request. GitLab fait un commit atomique puis ouvre la
merge request.

**D4. Un vocabulaire par forge, lu à un seul endroit.** `termes` porte le nom de
la forge, le nom de la demande (« pull request », « merge request »), son
abréviation, l'aide du jeton, les droits à nommer dans un 403 et la limite de
taille. Tout texte du plugin qui nomme une forge ou une demande lit `termes`.
L'inventaire se fait par
`grep -rniE "github|gitlab|pull request|merge request|\bPR\b" packages/plugin/src packages/plugin/galerie`,
et chaque occurrence est traitée ou justifiée dans le commit. Aucun message ne
teste la forge.

**D5. Un jeton ne part que vers la forge qui l'a reçu.** Le stockage garde la clé
`github_pat`, pour qu'une mise à jour du plugin ne retire pas le jeton des
utilisateurs actuels, et gagne `forge_du_jeton`. Un jeton sans cette clé
appartient à GitHub. Le contrôle vit dans `validateSettings`, que
`loadGithubConfig` appelle à l'ouverture, au pré-vol et à la publication : une
forge du jeton différente de celle de l'URL rend une configuration invalide, une
cause `jeton-autre-forge` et aucun appel réseau. L'enregistrement écrit dans cet
ordre : retrait de l'ancien jeton si la forge change, `forge_du_jeton`, jeton,
puis `repoUrl`. `supprimerPat` retire aussi `forge_du_jeton`. `PublicSettings`
remplace `hasPat` par `forgeDuJeton`, pour que le texte « Token enregistré.
Laissez ce champ vide pour le conserver. » ne s'affiche que pour la forge de
l'URL saisie. Un jeton dont le préfixe désigne l'autre forge est refusé à la
saisie : `ghp_` et `github_pat_` pour GitHub, `glpat-` pour GitLab.
Côté GitLab, l'aide du jeton demande le seul scope `api` : c'est le seul qui
couvre l'API REST en écriture, les scopes `read_repository`/`write_repository`
ne s'appliquant qu'au clone/push Git et à une partie de la lecture de
fichiers, jamais aux merge requests ni aux notes. Elle propose un jeton d'accès
projet de rôle Developer quand l'offre du projet le permet, limité à ce
projet, et sinon un jeton personnel.

**D6. Le commit GitLab est atomique.** `POST /projects/:id/repository/commits`
crée la branche et le fichier en un appel. Quand le fichier existe sur la base,
`start_sha` vaut le `commit_id` de sa lecture, l'action est `update` et porte
`last_commit_id`. Quand il n'existe pas, `start_sha` vient de
`GET /repository/branches/:base` et l'action est `create`. `force` n'est jamais
posé. La merge request s'ouvre avec `remove_source_branch: true`.
GitLab refuse en 400 un commit vers une branche qui existe déjà : l'adaptateur
ne vérifie donc pas son absence avant d'écrire. GitLab ne vérifie pas
`last_commit_id` quand `start_sha` est donné. Le commit part de la version lue,
si bien qu'un changement de la base entre-temps apparaît en conflit dans la
merge request, comme sur GitHub.

**D7. Chaque forge neutralise ses propres formes actives.** GitHub garde `@nom`
et `#123`. GitLab ajoute `!123`, `~label`, `%jalon`, `$123`, `&123`, la référence
croisée `groupe/projet#123` ou `groupe/projet!123`, et une ligne qui commence
par `/`. GitLab exécute cette ligne comme action rapide dans une note et dans
la description d'une merge request créée par l'API : le corps de la demande
et le rapport de CI la neutralisent tous deux. La forme reconnue part en
`code`. Un SHA de commit et `:emoji:` restent tels quels : leur lien ne
notifie personne et ne modifie rien.

**D8. Le rapport de CI ne nomme plus la forge.** Les trois phrases du kit
remplacent « cette pull request » par « cet export » ou « cette modification »,
selon la phrase. Le kit ne reçoit aucun paramètre de forge. « La fusion reste
bloquée » reste exact à une condition : `ucm init --forge gitlab` et
`POUR-LES-DESIGNERS.md` demandent de cocher « Pipelines must succeed ».

**D9. `ucm init` choisit la forge sur un signal nommé.** Ordre : `--forge`, puis
l'hôte de `git remote get-url origin`, puis la présence de `.gitlab-ci.yml`,
puis GitHub. Le compte rendu nomme la forge et le signal. Pour GitLab, `init`
n'écrit pas `.github/workflows/ucm.yml` ; il écrit `.gitlab/ucm.gitlab-ci.yml`
et, si `.gitlab-ci.yml` est absent, un `.gitlab-ci.yml` qui l'inclut. Si
`.gitlab-ci.yml` existe, la ligne `include` devient un rappel à marqueur.

**D10. Le fichier inclus ne déclare qu'un job.** Aucune clé globale : ni
`workflow`, ni `image`, ni `variables`, ni `stages`. Le job `ucm` porte
`image: node:22`, `variables: { GIT_DEPTH: "0" }` et ses propres règles :
pipeline de merge request, ou branche par défaut. Il prend le stage par défaut,
`test` ; le rappel d'`init` dit qu'un `stages:` sans `test` refusera le pipeline.
Le job UCM tourne donc une fois par export, et les autres jobs du projet gardent
leurs règles.

**D11. Le rapport atteint la merge request par une commande de la CLI.** L'image
`node:22` n'a ni `glab` ni `jq`, et un script recopié dans le YAML ne se teste
pas. La CLI gagne
`ucm rapport-gitlab --projet <id> --merge-request <iid> --fichier <chemin> [--api <url>]`,
avec `https://gitlab.com/api/v4` par défaut et `$CI_API_V4_URL` dans le fichier
écrit par `init`. La commande lit le compte du jeton par `GET /user`, parcourt
toutes les pages de notes, remplace la note de ce compte qui porte le marqueur
`<!-- ucm-rapport -->` et en crée une sinon. Le jeton se lit dans
`UCM_GITLAB_TOKEN`. Un secret n'est pas une entrée du diagnostic : `SPEC.md`
distingue les deux, et `UCM_GITLAB_TOKEN` y entre comme interface publique, hors
du tableau des variables non figées. Sans jeton, la commande écrit une ligne qui
nomme la variable manquante et sort en 0.

**D12. Le filet et la note vivent dans `after_script`.** Un échec de `npm ci`
saute le reste de `script`. `after_script` écrit donc le rapport minimal quand
`ci-report.md` manque, puis appelle `ucm rapport-gitlab` quand
`$CI_MERGE_REQUEST_IID` est défini. Son code de sortie ne change pas le statut du
job : les codes d'erreur de la commande servent à la main, et le journal du job
porte le geste. Les artefacts gardent `ci-report.md` avec `when: always`.

**D13. Le jeton de la CI appartient à un compte de service.** Les jetons d'accès
projet exigent Premium et `CI_JOB_TOKEN` n'écrit pas de note. La variable
`UCM_GITLAB_TOKEN` est masquée et non protégée, parce que les branches
`ucm-exporter/export-*` ne sont pas protégées. Le jeton est un jeton personnel
classique, scope `api` seul (voir D5), rattaché au compte de service. Si un
compte de service ne peut pas créer de jeton personnel, le plan retient le
jeton personnel d'un membre de l'équipe. Quand l'offre du projet permet un
jeton d'accès projet, il remplace les deux : L0 l'a employé sur le projet de
recette, dans le pipeline comme dans l'API.

**D14. La recette réelle se joue sur un miroir du Playground.** Le mainteneur
crée `UCM-Playground` sur gitlab.com. Le projet de l'équipe sert à la validation
finale avec l'équipe, jamais aux essais.

## 3. Liste de tâches

### 0. Règles de conduite

- [ ] Lire `AGENTS.md`, puis `CONTRIBUTING.md` sections « Code », « Tests »,
      « Messages destinés au designer » et « Interface du plugin », puis la
      partie de `packages/plugin/SPEC.md` sur la configuration et le dépôt.
- [ ] Charger `.agents/skills/rediger-sans-tics-ia` avant toute phrase, et
      `.agents/skills/rediger-diagnostics-ucm` avant tout message destiné au
      designer, merge request et rapport de CI compris.
- [ ] Travailler sur `main`, sans branche. Lire `git status` et
      `git diff --cached --name-only` avant chaque commit ; commiter par
      `git commit --only -F <message> -- <chemins>` ; pousser si
      `git rev-list --left-right --count origin/main...main` ne montre aucun
      retard.
- [ ] Une session modifie en ce moment `src/code.ts`, `src/messages.ts`,
      `src/ui/index.ts`, `CarteComposant.ts`, `SPEC.md`, `check.mjs`, `ucm.mjs`
      et monte `@ucm-kit/core` 0.1.34 et `@ucm-kit/cli` 0.1.38. L1 attend le
      commit de ces fichiers. L5 attend en plus la publication de ces versions.
- [ ] Vérifier dans un worktree isolé, extrait en LF : `npm test`,
      `npm run typecheck`, puis `npm run build` étape par étape. Chaque commit
      laisse la suite verte.
- [ ] Une loi ou un refus nouveau se voit rouge : casser ce qu'il protège,
      constater l'échec, restaurer par copie, le dire dans le commit.
- [ ] Éditer par Write et Edit. Ne jamais lancer `git checkout --` sur un
      travail non commité.
- [ ] Un changement publiable d'un paquet part dans le commit qui monte sa
      version, pins documentés compris, puis se publie selon « Publier les
      paquets » d'`AGENTS.md`.

### L0. Mesures sur gitlab.com

Aucun code produit. Le résultat de chaque mesure entre dans la section 1 de ce
plan, et la décision qu'il touche est corrigée dans le même commit.

- [x] Relever les scopes disponibles à la création d'un jeton personnel sur
      gitlab.com et celui qui couvre l'API REST en écriture. Mesuré :
      l'écran propose des scopes classiques, pas des permissions par
      ressource ; `api` seul suffit à tout ce que le plugin et la CI appellent
      (lecture du projet, fichiers, commits, merge requests, notes, `/user`,
      suppression de branche). Voir « Ce qui est mesuré ».
- [x] **[mainteneur]** Créer le projet `UCM-Playground` sur gitlab.com, un
      compte de service, et un jeton personnel scope `api` limité par ce
      compte. Fait : `_vass/ucm-playground`, privé, avec un jeton d'accès
      projet scope `api` au lieu du compte de service. Le projet ne contient
      qu'un `README.md`.
- [x] Vérifier avec ce jeton que chaque appel nécessaire au plugin et à la CLI
      rend 2xx : lire le projet, lire un fichier, lire une branche, créer un
      commit sur une nouvelle branche, lister et créer une merge request,
      supprimer une branche, lire `/user`, lire, créer et modifier une note.
- [x] Relever le préfixe d'un jeton personnel GitLab, pour le refus par préfixe
      de D5.
- [ ] Depuis un plugin de développement (`devAllowedDomains`), appeler
      `GET /projects/:id` et `POST /repository/commits`. Preuve : les deux
      réponses arrivent dans le sandbox Figma.
- [x] Relever le statut et le message de l'API de commits pour : `create` sur un
      fichier existant, `update` avec un `last_commit_id` périmé, une branche
      cible qui existe déjà avec `start_sha` et sans `force`, un `start_sha`
      inconnu. Si la branche existante reçoit le commit au lieu d'un refus,
      l'adaptateur vérifie l'absence de la branche avant d'écrire, et D6 le dit.
- [x] Ouvrir à la main une merge request dont la description contient `@icons`,
      `#12`, `!3`, `~primaire`, `%v1`, `$4`, `&5`, `groupe/projet#6` et un
      hexadécimal de huit caractères. Poster une note dont une ligne commence
      par `/label`. Relever les formes actives, puis vérifier qu'une forme en
      `code` reste inerte. Mesuré par l'API plutôt qu'à la main.
- [x] Vérifier qu'une merge request ouverte par l'API déclenche le pipeline de
      merge request sur une branche non protégée, qu'une variable masquée non
      protégée y est lisible, et relever la durée de
      `npx --yes @ucm-kit/cli@<version>` dans `after_script`.

### L1. Séparer la logique d'export du transport GitHub

Aucun changement de comportement.

- [x] Créer `src/forges/forge.ts` : le type `Forge`, le type `TermesDeForge` et
      la classe `ErreurDeForge` (statut et message, jamais d'en-tête).
      `ErreurDeDescription` en hérite.
- [x] Déplacer dans `src/depot.ts` : `repositoryLayout`, `artifactPath`,
      `withoutExportTimestamp`, `sameContent`, `exportBranchName`,
      `prefixeDeBranche`, `refusDeCollision`, `lireArtefact`,
      `ligneDeFormatDeTokens`, `lignesDIdentite`, le corps de la demande,
      `exportsEnVol`, `lireAvantEcriture`, `publishArtifact`,
      `diagnostiquerConnexion`, et les types `ArtifactKind`,
      `RepositoryArtifact`, `PublishResult`, `LayoutSource`, `RepositoryLayout`,
      `LectureDuDepot`, `DiagnosticConnexion`. Chaque fonction qui appelait
      l'API reçoit une `Forge`.
- [x] Créer `src/forges/github.ts` : `githubRequest`, `encodePath`, lecture de
      fichier avec le repli sur le blob, liste des pull requests, `publier` avec
      la séquence actuelle et son ménage, suppression de branche.
- [x] Renommer `pullRequestBody` en `corpsDeLaDemande`, qui reçoit `termes`.
      Pour GitHub, le texte produit reste octet pour octet celui d'aujourd'hui.
- [x] Adapter `code.ts` : `forgeDe(config)` construit l'adaptateur, les appels
      passent par `depot.ts`.
- [x] Adapter `tests/github.test.ts` et `tests/code.test.ts`, qui remplace le
      module `./github`. Preuve : `git diff` des deux fichiers ne touche aucune
      assertion ni aucune valeur attendue, seulement les imports, la
      construction de la configuration et les points d'appel.
- [x] Dans le même commit : `AGENTS.md` (carte du code, invariants qui citent
      `exportsEnVol()` et `sansLienAutomatique()`) et la liste `AUTORITES` de
      `tests/inventaireInvariants.test.ts`, où `src/github.ts` devient
      `src/depot.ts` et `src/forges/github.ts`. Preuve : le test passe.

### L2. Le client GitLab

- [x] Créer `src/forges/gitlab.ts`. Base `https://gitlab.com/api/v4`, en-tête
      `PRIVATE-TOKEN`. Le projet, le chemin d'un fichier et le nom d'une branche
      s'encodent chacun par `encodeURIComponent` sur la valeur entière ;
      `encodePath` n'est jamais employé ici.
- [x] `testerDepot` : `GET /projects/:id`. 401, 403 et 404 donnent les causes
      existantes ; une erreur réseau donne `reseau`.
- [x] `lireFichier` : `GET /projects/:id/repository/files/:path?ref=`, contenu
      décodé par `decodeBase64`, version égale à `{ commitId, lastCommitId }`.
      Un 404 rend `null`.
- [x] `demandesOuvertes` : `GET /projects/:id/merge_requests?state=opened&target_branch=<base>&per_page=100`,
      qui rend `source_branch` et `web_url`. Une merge request dont
      `source_project_id` diffère du projet est écartée.
- [x] `publier` : commit atomique selon D6, puis `POST /merge_requests` avec
      `remove_source_branch: true`. Un échec de la merge request appelle
      `DELETE /repository/branches/:branche`, dont l'échec est ignoré.
- [x] `sansLienAutomatique` selon D7 et la mesure de L0.
- [x] `termes` : limite de taille de 20 Mo, au-delà de laquelle le
      téléchargement local est proposé avec la phrase qui nomme cette limite.
- [x] `tests/gitlab.test.ts` rejoue chaque scénario de `github.test.ts` qui
      touche au transport : fichier inchangé, `exportedAt` ignoré, merge request
      identique en vol, collision sur la base, collision en vol, contrat sans
      identité, tokens hors collision, réexport corrigé accepté, échec de la
      merge request qui supprime la branche, nouveau fichier en `create`,
      fichier existant en `update` avec `last_commit_id` et `start_sha`.
- [x] Tests d'encodage : `groupe/sous-groupe/projet`,
      `components/Button/Button.contract.json` et
      `ucm-exporter/export-component-…` forment chacun un seul segment d'URL.
- [x] Test : aucun appel GitLab ne porte `Authorization`, aucun appel GitHub ne
      porte `PRIVATE-TOKEN`.
- [x] Dans le même commit : `manifest.json` déclare
      `["https://api.github.com", "https://gitlab.com"]`, et
      `tests/manifestDistribution.test.ts` exige exactement ces deux domaines.
      Le voir rouge avec un troisième domaine.

### L3. Configuration, jeton, connexion et interface

Un seul lot, parce que le renommage des clés de configuration et du message
`pull-request` casse l'interface et la galerie dans le même commit.

- [x] `config.ts` : `lireAdresseDuDepot(url)` remplace `parseGithubRepository`
      et rend `{ forge, projet, cheminRetire }` ou `null`, selon D1 et D2.
- [x] Réécrire `tests/config.test.ts`, qui exige aujourd'hui le refus de
      gitlab.com. Cas : l'adresse du designer de l'équipe rend
      `{ forge: 'gitlab', projet: 'mon-groupe/design-system', cheminRetire: true }` ;
      sous-groupes ; suffixe `.git` ; lien Markdown ; GitHub
      `/tree/main/docs` ; hôte inconnu refusé ; `gitlab.com/groupe` refusé.
- [x] `GithubConfig` devient `ConfigurationDuDepot` (`forge`, `projet`,
      `baseBranch`, `jeton`) ; `SettingsInput.githubPat` devient `jeton`.
- [x] D5 entier : contrôle dans `validateSettings`, ordre d'écriture,
      `supprimerPat`, `forgeDuJeton`, refus par préfixe.
- [x] Tests de D5, chacun vu rouge : un jeton GitHub enregistré avec une URL
      GitLab ne produit aucun appel réseau à l'ouverture, au pré-vol ni à la
      publication ; un enregistrement interrompu après l'écriture de l'URL ne
      laisse pas un jeton de l'autre forge utilisable ; le texte indicatif du
      jeton enregistré ne s'affiche pas pour l'autre forge.
- [x] `connexion.ts` : `etatDeConnexion` et `gesteApresEchecDePublication`
      reçoivent `termes`. Cause `jeton-autre-forge`. Les statuts GitLab relevés
      en L0 prennent leur geste. Le 404 GitLab dit que le projet peut être privé
      et que le jeton doit y avoir accès. `DepotVise` porte `forge` et `projet`,
      et la ligne du dépôt devient « GitLab · mon-groupe/design-system · main ».
- [x] Inventaire de D4 dans `depot.ts`, `base64.ts`, `code.ts`, `connexion.ts`,
      `config.ts`, `ui/` et `galerie/` : « pull request d'export ouverte », « La
      PR a été créée sans URL exploitable », « limite GitHub de 100 Mo »,
      « Impossible de joindre api.github.com », « Contenu Base64 GitHub
      invalide », « Publication sur GitHub… », « Échec GitHub », « Pull request
      créée », « aucune PR créée » et les autres occurrences du `grep`.
- [x] Le message `pull-request` devient `demande`, son lien est libellé par
      `termes`.
- [x] `ConfigurationPage.ts` : validation par `lireAdresseDuDepot` importée ; les
      deux lignes de D2 sous le champ ; aide et libellé du jeton selon la forge
      de l'URL saisie, les deux forges nommées quand l'URL ne se lit pas ;
      sous-titre de la page sans nom de forge dans `ui/index.ts`.
- [x] `galerie/etats.cjs` : les états `pull-request` passent au message
      `demande` ; les textes recopiés (« Publication sur GitHub… », « Échec
      GitHub », l'erreur d'URL) sont lus au sandbox ; ajout des états GitLab
      connecté, jeton refusé, accès refusé, projet introuvable, jeton d'une
      autre forge, dossier retiré de l'adresse, prêt à publier, merge request
      créée, échec de publication. Preuve : `tests/galerie.test.ts` passe.
- [x] Une loi refuse qu'un état GitLab contienne « GitHub » ou « pull request »,
      et l'inverse. La voir rouge.
- [x] Protocole de relecture de `CONTRIBUTING.md#interface-du-plugin` sur chaque
      écran touché, captures en thème clair et sombre à la largeur minimale.
      Fait sur les planches de la galerie ; les points (a) et (b), qui se
      jugent dans Figma, reviennent au mainteneur en L6.

### L4. Le kit et la CLI

Un seul numéro par paquet pour L4 : le kit et la CLI montent ensemble, après la
publication de la série en cours.

- [x] Kit : réécrire les trois phrases de D8 selon la skill des diagnostics.
- [x] Kit : créer la neutralisation des formes actives dans
      `diagnostic-markdown.mjs`, pour `@nom`, `#123` et les formes GitLab de D7.
      Elle change la sortie GitHub : un rapport qui cite `@icons` ne notifie
      plus de compte. Le commit le dit, et un test couvre chaque forme.
- [x] CLI : `lireArgumentsInit` accepte `--forge github|gitlab` ; une autre
      valeur rend une erreur d'invocation, code 2.
- [x] CLI : détection selon D9, `git` injectable. Tests : remote gitlab.com,
      remote github.com, pas de remote avec `.gitlab-ci.yml`, rien du tout.
- [x] CLI : `fichiers()` n'écrit `.github/workflows/ucm.yml` que pour GitHub.
- [x] CLI : `workflowGitlab(version)` écrit `.gitlab/ucm.gitlab-ci.yml` selon D10
      et D12 : job `ucm`, `npm ci` si `package-lock.json` existe,
      `ucm check --report ci-report.md` avec
      `--base "$CI_MERGE_REQUEST_DIFF_BASE_SHA"` dans un pipeline de merge
      request, `after_script` avec le filet puis la note, artefacts
      `when: always`.
- [x] CLI : `.gitlab-ci.yml` écrit s'il est absent, rappel à marqueur sinon. Le
      compte rendu d'`init` pour GitLab ajoute deux lignes : créer
      `UCM_GITLAB_TOKEN` masquée et non protégée, cocher « Pipelines must
      succeed ». Il dit aussi qu'un `stages:` sans `test` refuse le pipeline.
- [x] CLI : `guide.mjs`, `FICHIERS_EPINGLES` inclut `.gitlab/ucm.gitlab-ci.yml`.
- [x] CLI : `src/rapport-gitlab.mjs` et son aiguillage dans `ucm.mjs` selon D11,
      `fetch` injectable. Tests : note créée ; note du compte au marqueur
      remplacée ; note d'un autre compte portant le marqueur ignorée ; note au
      marqueur trouvée au-delà de 100 notes ; jeton absent en code 0 avec la
      ligne qui nomme la variable ; 401 et 403 en code 1 avec le geste ;
      `--api` respecté ; le jeton absent de toute sortie.
- [x] `tests/recette.test.mjs` : repository temporaire avec remote GitLab et
      `.gitlab-ci.yml` existant, qui reçoit le fichier inclus et le rappel ;
      repository vide avec `--forge gitlab`, qui reçoit les deux fichiers et
      aucun workflow GitHub ; le YAML écrit se lit par un analyseur YAML et ne
      contient aucune clé globale.
- [x] Monter `@ucm-kit/core`, `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`,
      pins documentés compris, puis publier selon `AGENTS.md`.

### L5. Documentation

- [ ] `packages/plugin/SPEC.md`, partie 3 : titre « Configuration et dépôt sur
      une forge », séquence GitHub et séquence GitLab, D5, neutralisation par
      forge, domaines du manifest. Dans le même commit, les trois liens
      d'`AGENTS.md` vers l'ancienne ancre et les énoncés de `ENONCES_SPEC`
      dans `tests/inventaireInvariants.test.ts` qui citent « pull request » et
      « page GitHub ». Preuve : `docLinks` et l'inventaire passent.
- [ ] `SPEC.md`, section sur les variables d'environnement : distinguer un secret
      d'une entrée du diagnostic ; `UCM_GITLAB_TOKEN` comme interface publique ;
      corriger la phrase qui dit que la CLI ne lit aucune variable, puisque
      `ucm.mjs` lit `UCM_ECHECS_DE_TESTS` avant `check`.
- [ ] `README.md`, `packages/plugin/README.md` et `packages/cli/README.md` : les
      deux forges, `--forge`, `ucm rapport-gitlab`, sans recopier la
      spécification.
- [ ] `docs/POUR-LES-DESIGNERS.md` : le lien de la merge request, le jeton GitLab
      et ses permissions, « Pipelines must succeed ».
- [ ] `docs/RECETTE.md` : le parcours GitLab sur le miroir de D14.
- [ ] `AGENTS.md` : invariants de la publication écrits pour une forge, limites
      d'environnement avec les deux domaines.
- [ ] Relire chaque document touché et retirer toute phrase devenue fausse.
      Preuve : `npm test` passe, liens et style compris.

### L6. Recette réelle

- [ ] **[mainteneur]** Sur le miroir GitLab : `ucm init`, variable
      `UCM_GITLAB_TOKEN`, « Pipelines must succeed », commit sur la branche par
      défaut.
- [ ] **[mainteneur]** Plugin de développement : saisir l'adresse d'une page du
      miroir, constater le projet retenu, la ligne du dossier retiré et la
      connexion.
- [ ] **[mainteneur]** Exporter un composant avec au moins un avertissement.
      Constater la merge request, son corps, l'onglet ouvert, un seul job UCM,
      la note du rapport.
- [ ] **[mainteneur]** Réexporter sans changement : aucune seconde merge request,
      lien vers la première. Réexporter après correction : nouvelle merge
      request acceptée. Pousser un nouveau commit sur la branche d'export : la
      note est remplacée.
- [ ] **[mainteneur]** Exporter les tokens : merge request sur le chemin de
      `ucm.config.json`.
- [ ] **[mainteneur]** Basculer l'URL de GitHub vers GitLab sans saisir de
      jeton : aucun appel vers gitlab.com, et le plugin demande un jeton GitLab.
- [ ] **[mainteneur]** Rejouer l'export GitHub sur `UCM-Playground` : aucun écart
      avec la recette précédente, hors rapport neutralisé.

### L7. Publication et accompagnement de l'équipe

- [ ] **[mainteneur]** Publier la mise à jour du plugin sur la Community.
- [ ] **[mainteneur]** Avec l'équipe consommatrice : confirmer où vit le design system
      dans le projet. Si c'est `guidelines/`, `ucm.config.json` à la racine
      déclare `guidelines/…` pour les composants et les tokens.
- [ ] **[mainteneur]** Avec l'équipe consommatrice : `ucm init --forge gitlab`, le jeton du
      designer, le jeton de la CI, « Pipelines must succeed », un premier export
      relu ensemble.

## 4. Risques

| Risque | Conséquence | Tâche qui le lève |
|---|---|---|
| Un jeton personnel scope `api` n'est pas limité à un projet : il ouvre tous les projets du compte | Un jeton d'accès projet le limiterait, mais exige Premium sur gitlab.com ; l'aide du jeton le dit | L0, D13 |
| L'API de commits écrit dans une branche existante au lieu de refuser | Levé en L0 : GitLab rend 400 et ne crée rien | L0 |
| L'essai Premium du compte de recette expire | Le jeton d'accès projet de recette cesse peut-être de fonctionner ; un jeton personnel scope `api` le remplace | L6 |
| La revue Community retarde l'ajout de `gitlab.com` | L'équipe attend la publication ; le plugin de développement sert en attendant | L7 |
| Les runners partagés de gitlab.com exigent une vérification du compte | Le pipeline ne démarre pas, et aucune note n'est publiée | L0, L6 |
| `npx` dans `after_script` dépasse la limite de cinq minutes | La note manque ; le rapport reste dans les artefacts | L0 |
| Une variable non protégée est lisible par tout pipeline de merge request du projet | Un développeur du projet peut lire le jeton de la CI ; le compte de service limite ce qu'il ouvre | L5, L7 |
| « Pipelines must succeed » reste décoché | Le rapport annonce une fusion bloquée qui ne l'est pas | L4, L7 |
| Plus de 100 merge requests ouvertes vers la base | Un export identique en vol peut passer inaperçu, comme sur GitHub aujourd'hui | Hors plan |

## 5. Estimation et ordre

| Lot | Charge | Dépend de |
|---|---|---|
| L0 | ½ jour agent, ½ jour mainteneur | - |
| L1 | 1,5 jour | commit de la session en cours |
| L2 | 1,5 jour | L0, L1 |
| L3 | 2,5 jours | L0, L1 |
| L4 | 2,5 jours | L0, publication de la série en cours |
| L5 | 1 jour | L2, L3, L4 |
| L6 | ½ jour mainteneur | L5 |
| L7 | selon la revue Figma | L6 |

L0 est sur le chemin de tous les lots de code : il passe en premier. L1 se mène
pendant L0. L2 et L3 se mènent en parallèle une fois L1 commité ; L4 ne dépend
d'aucun lot du plugin. Le total agent se situe entre dix et onze jours.

## 6. Critères de fin

- Le designer de l'équipe colle l'adresse qu'il a saisie, enregistre un jeton
  GitLab et ouvre une merge request depuis le plugin publié sur la Community.
- La merge request déclenche un seul job UCM, qui publie le rapport en note et
  le remplace au push suivant, et qui bloque la fusion quand il est rouge.
- Aucun jeton ne part vers la forge qui ne l'a pas reçu, à l'ouverture, au
  pré-vol ni à la publication.
- La recette GitHub rejouée ne montre aucun écart hors rapport neutralisé.
- `npm test`, `npm run typecheck` et `npm run build` passent dans un worktree
  isolé, et les paquets montés sont servis par le registre.
