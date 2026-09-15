# Plan de test et de débogage global

Ce plan s'adresse à l'agent qui cherche, reproduit et corrige les défauts que la
suite de tests ne voit pas. Il couvre les quatre paquets, le plugin face à Figma,
la publication GitHub, le workflow du repository consommateur et la
documentation exécutable.

## 0. Mission et règles

La mission est de trouver les défauts critiques avant un utilisateur. Un défaut
critique empêche une commande d'aboutir, rend un verdict faux, perd une donnée
sans le dire, ou attribue une cause que le contrôle n'a pas établie.

Lire d'abord `AGENTS.md`, puis `CONTRIBUTING.md` sections « Code », « Tests » et
« Messages destinés au designer ». Charger `.agents/skills/rediger-sans-tics-ia`
avant toute phrase, et `.agents/skills/rediger-diagnostics-ucm` avant tout
message destiné au designer.

Règles, sans exception :

1. **Vérifier dans un worktree isolé.** D'autres sessions écrivent dans la copie
   partagée. Créer le worktree par
   `git -c core.autocrlf=false worktree add --detach <dossier> origin/main`, puis
   `npm ci`. Le supprimer par `fs.rmSync` de Node, puis `git worktree prune`.
2. **Reproduire avant de corriger.** Chaque défaut reçoit une commande ou un test
   qui échoue sur le code actuel, et la sortie de cet échec est notée.
3. **Voir rouge.** Après la correction, casser la correction, constater l'échec
   du test, restaurer par copie. Le message de commit le dit. Ne jamais lancer
   `git checkout --` sur un travail non commité.
4. **Ne toucher à aucun composant `.tsx` du Playground, ne nommer aucun composant
   dans un test.** Les tests emploient des documents synthétiques.
5. **Commiter par chemins**, `git commit --only -F <message> -- <chemins>`,
   après avoir lu `git status` et `git diff --cached --name-only`. Un fichier
   qui porte aussi le travail d'une autre session attend que celle-ci ait
   commité sa part.
6. **Monter la version dans le commit qui change le contenu publiable** d'un
   paquet, pins et commandes documentées compris. Publier selon « Publier les
   paquets » d'`AGENTS.md`, et constater chaque version par `npm view`.
7. **Demander le mainteneur avant toute action tournée vers l'extérieur** :
   créer un repository GitHub, ouvrir une pull request réelle, écrire dans un
   fichier Figma, installer un outil global. Ces actions sont marquées
   « porte mainteneur » ci-dessous.
8. **Tenir le journal** de la section 5 à chaque défaut.

## 1. Ce que la suite couvre, et ce qu'elle ne voit pas

Mesure du commit `c687d00`, par
`node --experimental-test-coverage --test-coverage-include="src/**" --import tsx --test tests/*.test.*`
lancé dans chaque paquet.

| Paquet | Tests | Lignes | Branches | Fonctions |
|---|---|---|---|---|
| `@ucm-kit/core` | 358 | 98,45 % | 93,51 % | 98,11 % |
| `@ucm-kit/cli` | 136 | 97,31 % | 89,99 % | 97,52 % |
| `@ucm-kit/adapter-typescript` | 20 | 91,27 % | 81,48 % | 86,96 % |
| plugin | 661 | 97,23 % | 91,78 % | 95,55 % |

Fichiers qu'aucun test ne charge, donc absents de la mesure :

| Fichier | Lignes | Rôle |
|---|---|---|
| `packages/plugin/src/code.ts` | 479 | aiguillage de tous les messages entre l'interface et Figma |
| `packages/plugin/src/messages.ts` | 144 | les deux sens de la frontière sandbox et interface |
| `packages/plugin/src/ui/**` | environ 1 200 | l'interface, construite par la galerie sans être exécutée par un test |
| `packages/adapter-typescript/src/cli.mjs` | 25 | le binaire `ucm-typescript` |
| `packages/kit/src/format/configuration.ts` | 163 | la grammaire de `ucm.config.json`, lue à travers le build |

Modules les moins couverts parmi ceux que les tests chargent :

| Module | Lignes | Branches | Lignes non couvertes |
|---|---|---|---|
| `cli/src/adaptateur.mjs` | 68,57 % | 28,57 % | chargement réel d'un adaptateur, adaptateur invalide |
| `plugin/src/config.ts` | 74,67 % | 89,29 % | `parseGithubRepository`, `validateSettings`, `supprimerPat` |
| `plugin/src/contract/mergeIconRules.ts` | 80,66 % | 86,15 % | règle `@icons` sans calque, calques homonymes, propriétés différentes selon les variants |
| `kit/src/lecteurs/schema-contrat.mjs` | 85,71 % | 100 % | échecs de chargement du schéma |
| `plugin/src/contract/exportComponent.ts` | 88,93 % | 85,57 % | jeu de composants vide, icône introuvable dans un variant |
| `adapter-typescript/src/parite.mjs` | 88,78 % | 86,39 % | accès `props["x"]`, spread de props, `tsconfig.json` illisible ou invalide |
| `kit/src/lecteurs/variant-views.mjs` | 89,52 % | 89,58 % | contrats antérieurs à 11.0, nom Figma rebâti |
| `cli/src/ucm.mjs` | 90,71 % | 87,88 % | `UCM_ECHECS_DE_TESTS` illisible, échec de `check` |
| `cli/src/icons.mjs` | 93,75 % | 66,67 % | rendu d'une liste non vide |
| `kit/src/lecteurs/controle-repository.mjs` | 95,82 % | 84,24 % | lignes du terminal pour un contrat illisible, une version hors fenêtre et chaque écart de parité |

**Une ligne couverte ne prouve pas un état éprouvé.** Le défaut du repository
neuf, corrigé par `1f0484e`, se trouvait dans `trouverContrats`, couvert à
100 % des lignes : aucun test ne lançait `ucm tokens css` sans dossier de
contrats. Le plan est donc organisé par états et par scénarios, et la
couverture ne sert qu'à pointer les branches jamais exécutées.

## 2. Défauts confirmés, à corriger en premier

### D1. `ucm check` attribue toute panne du contrôle à l'adaptateur

Reproduction, dans un dossier sans aucun adaptateur :

```sh
mkdir sonde && cd sonde
echo '{"components":"fichier"}' > ucm.config.json
echo "pas un dossier" > fichier
node <chemin du dépôt>/packages/cli/src/ucm.mjs check
```

Sortie constatée, code 2 :
« L'adaptateur @ucm-kit/adapter-typescript est installé mais n'a pas pu être
chargé : ENOTDIR… Un développeur doit corriger son installation ou son
tsconfig.json. »

Cause : dans `packages/cli/src/ucm.mjs`, le `.catch` enveloppe à la fois
`chargerAdaptateur` et `check`. Toute exception du contrôle reçoit le message de
l'adaptateur.

Attendu : l'erreur de chargement de l'adaptateur garde son message ; une autre
panne nomme ce qu'elle est, par exemple le chemin `components` qui n'est pas un
dossier, sans citer l'adaptateur. Test : un repository sans adaptateur dont
`components` est un fichier, et le cas voisin d'un adaptateur réellement
invalide.

### D2. Un nom accentué saisi sur macOS donne une autre variable CSS

Reproduction :

```sh
node --input-type=module -e '
import { tokenCssVariable, normalizeName } from "@ucm-kit/core/format";
console.log(tokenCssVariable(normalizeName("Café/Fond")));
console.log(tokenCssVariable(normalizeName("Café/Fond")));'
```

Sortie constatée : `--café-fond` puis `--cafe-fond`. `normalizeName` rend deux
chaînes qui s'affichent à l'identique.

Risque : un nom saisi sous macOS, où le système de fichiers et certains champs
décomposent les accents, et le même nom saisi sous Windows donnent deux
propriétés CSS. Un composant qui écrit la référence à la main pointe alors une
variable absente, sans erreur.

À décider avec le mainteneur avant de corriger, puisque la règle de nommage est
un invariant du format : normaliser en forme composée (`NFC`) dans `normalizeName` et
`tokenCssVariable`, ou garder la marque combinante dans la classe de
`tokenCssVariable`. Mesurer d'abord si un export réel contient des noms
décomposés. Toute correction qui change un nom publié relève de
`docs/COMPATIBILITE.md`.

## 3. Méthode commune à chaque zone

1. Écrire la liste des scénarios de la zone avant de lancer quoi que ce soit.
2. Lancer chaque scénario dans un dossier temporaire, avec la commande ou la
   fonction réelle, et noter code de sortie et sortie.
3. Classer : conforme, défaut critique, défaut mineur, comportement à décider.
4. Pour chaque défaut : test rouge, correction, test vert, mutation, entrée au
   journal.
5. Un comportement à décider ne se corrige pas : il se rapporte au mainteneur
   avec la reproduction.

## 4. Zones à éprouver

Les zones sont rangées par priorité. La priorité 1 couvre ce qu'un utilisateur
atteint dès sa première heure.

### Zone 1. États d'environnement de la CLI, priorité 1

Pourquoi : les commandes tournent chez des consommateurs dont l'état varie, et
la suite teste surtout des repositories déjà installés.

Scénarios, pour chaque commande `init`, `check`, `icons`, `tokens css`, `aides`,
`aides <aide> --personnaliser`, `guide` :

- dossier vide, sans `package.json` ni Git ;
- `package.json` sans dépendance, puis avec `@ucm-kit/cli` épinglé, en plage,
  par `file:`, `link:` et `workspace:` ;
- `ucm.config.json` absent, vide, `{}`, JSON invalide, BOM UTF-8, fins de ligne
  CRLF, clé inconnue, chemin absolu, chemin qui remonte hors du repository ;
- dossier `components` absent, vide, fichier à la place du dossier, lien
  symbolique, lien qui boucle, droits de lecture refusés ;
- `tokens.json` absent, vide, `null`, tableau, BOM, CRLF, 5 Mo, version future,
  marque invalide, export antérieur aux axes ;
- commande lancée depuis un sous-dossier du repository, et depuis un dossier
  au-dessus de lui ;
- chemin de repository qui contient des espaces, des accents, des guillemets et
  plus de 260 caractères sous Windows ;
- `.ucm/conventions.md` en CRLF, en UTF-16, vide, uniquement des commentaires,
  avec une section non fermée ;
- `--out` qui désigne un dossier, un fichier en lecture seule, un fichier ouvert
  par un autre processus, un chemin hors du repository ;
- deux `ucm tokens css` lancés en même temps sur la même sortie ;
- Node 20, version minimale des `engines`, puisque la CI ne lance que Node 22.

Comment : un script qui fabrique chaque état dans le dossier temporaire de
session et lance la CLI par `node packages/cli/src/ucm.mjs`, puis la même série
par `npx --yes @ucm-kit/cli@<version publiée>` pour éprouver l'archive. Pour
Node 20, installer une version portable dans le dossier de session et lancer
`npm test` des paquets `cli` et `kit` avec elle.

Critère : aucune trace Node brute ; chaque refus nomme sa cause et le geste ;
chaque code de sortie respecte 0, 1 et 2 tels que `packages/cli/README.md` les
définit.

### Zone 2. Aiguillage et interface du plugin, priorité 1

Pourquoi : `code.ts`, `messages.ts` et `ui/**` ne sont chargés par aucun test.
Le designer n'emploie le produit qu'à travers eux.

Scénarios :

- `analyser-composant` lancé deux fois avant la fin de la première analyse ;
- `annuler` pendant une analyse, puis nouvelle analyse : le drapeau
  `annulationDemandee` doit revenir à son état initial ;
- `publier` sans analyse préalable, après une analyse annulée, après un
  changement de sélection ;
- sélection qui change pendant une analyse, les deux messages de sélection que
  le sandbox envoie compris ;
- `save-settings` quand `figma.clientStorage` lève, et quand le jeton est vide ;
- `supprimer-token` puis `publier` ;
- `resize` avec des valeurs négatives, nulles, `NaN`, énormes ;
- `montrer-les-calques` avec des identifiants supprimés, sur une autre page, ou
  mêlant plusieurs pages ;
- message de type inconnu, et message sans `type` ;
- exception levée dans `handleExportComponent` ou `handleExportTokens` : l'UI
  doit sortir de l'état « analyse en cours ».

Comment : un harnais de test qui installe un `figma` global simulé, avec
`ui.postMessage`, `clientStorage`, `currentPage` et `viewport`, importe
`code.ts` par `tsx` et rejoue les séquences de messages. Relever chaque message
renvoyé à l'UI. Pour l'interface, rejouer les séquences de
`packages/plugin/galerie/etats.cjs` dans Chromium par Playwright et vérifier
qu'aucun état ne laisse un bouton actif sur une action impossible.

Critère : aucune promesse rejetée sans message ; aucune analyse concurrente ;
chaque état terminal visible dans l'UI.

### Zone 3. Le plugin face au vrai Figma, priorité 1

Pourquoi : les tests du moteur tournent sur des objets Figma simulés
(`fichierDeVariables.ts` et les fabriques de nodes). Un écart entre la
simulation et l'API réelle ne se voit qu'à l'export.

Scénarios à relever dans l'API réelle, en lecture seule :

- forme de `valuesByMode`, `boundVariables`, `componentPropertyReferences` et
  `explicitVariableModes` sur les fichiers « UCM Tests - Tokens »
  (`MvzKyls3GalPtsSErfhvbJ`) et « UCM Tests - Composants »
  (`adkqrNcmyIs16hBus808R7`) ;
- variables de bibliothèque non importées, `getVariableByIdAsync` qui rend
  `null`, `getMainComponentAsync` sur une instance distante ou détachée ;
- valeurs `figma.mixed` dans un texte, un rayon ou un padding ;
- jeu de composants à plus de 500 variants : temps et mémoire de l'export ;
- noms de calques et de variables avec accents décomposés, émojis, espaces
  insécables, caractères de largeur nulle.

Comment, sans porte mainteneur :

1. lire par le serveur MCP Figma, en lecture seule, toutes les variables et
   leurs valeurs par mode du fichier Tokens ;
2. les comparer au `tokens.json` du Playground, exporté de ce fichier : même
   ensemble de chemins, mêmes couleurs aux composantes près, mêmes alias, mêmes
   modes ;
3. lire la structure d'`Alert` et de `Button` dans le fichier Composants et la
   comparer à leurs contrats : axes, variants présents, liaisons de couleur,
   tailles liées.

Porte mainteneur : lancer l'export depuis le plugin sur un fichier fabriqué pour
ces cas limites.

Critère : chaque écart entre Figma et l'export est soit une règle écrite dans
`packages/plugin/SPEC.md`, soit un défaut.

### Zone 4. Publication GitHub, priorité 1

Pourquoi : `github.ts` est bien couvert sur des réponses simulées, mais aucun
test ne parle à GitHub, et `config.ts` laisse `parseGithubRepository` et
`validateSettings` sans test.

Scénarios :

- **repository GitHub vierge, sans aucun commit** : lecture de la branche de
  base, création de branche, dépôt du premier fichier ;
- branche par défaut autre que `main`, branche de base inexistante, branche
  protégée ;
- jeton classique, jeton à portée fine sans droit `contents` ou sans droit
  `pull_requests`, organisation qui exige l'authentification unique, jeton
  révoqué entre l'analyse et la publication ;
- réponses 403 de limite secondaire, 409, 422 « branche existante », 5xx, coupure
  réseau au milieu de la publication, ce qui laisse une branche sans pull
  request ;
- fichier existant de plus d'1 Mo, lu par l'API des blobs ;
- corps de pull request de plus de 65 536 caractères, pour un composant qui
  produit plusieurs centaines d'avertissements ;
- réexport pendant qu'une pull request est ouverte, puis pendant que deux le
  sont ;
- URL saisie : `https://github.com/o/r`, avec `.git`, avec barre finale, avec
  `www.`, en `http://`, au format `git@github.com:o/r.git`, GitHub Enterprise
  `https://github.entreprise.fr/o/r`, lien Markdown, espaces autour.

Comment : tests sur `fetch` simulé pour chaque statut. Porte mainteneur : un
repository privé jetable créé par `gh repo create`, supprimé à la fin, pour le
repository vierge et le corps trop long.

Critère : aucune branche orpheline sans message ; chaque refus de GitHub arrive
au designer avec son geste ; une URL refusée dit quelle forme est acceptée.

### Zone 5. Workflow du repository consommateur, priorité 2

Pourquoi : `.github/workflows/ucm.yml` est écrit par `init` et jamais exécuté par
la suite. Le rapport qu'il publie est le seul message que lit le designer.

Scénarios :

- pull request venue d'un fork, où `GITHUB_TOKEN` ne peut pas commenter ;
- rapport de plus de 65 536 caractères, que `gh pr comment` refuse ;
- premier commentaire, puis mise à jour par `--edit-last` quand le dernier
  commentaire vient d'un autre auteur ;
- repository sans `package-lock.json`, avec un lockfile sans adaptateur, avec un
  lockfile et un adaptateur installé ;
- registre npm indisponible : le filet « le rapport manque » doit publier son
  message ;
- `BASE_SHA` absent d'un clone superficiel, push direct sur `main`.

Comment : lint du workflow par `actionlint` téléchargé dans le dossier de
session ; puis porte mainteneur, repository jetable avec pull requests réelles.

Critère : chaque pull request refusée porte un commentaire lisible par le
designer.

### Zone 6. Adaptateur TypeScript, priorité 2

Pourquoi : 20 tests, 81 % des branches, un binaire sans test, et une lecture de
code réel dont les formes varient d'un repository à l'autre.

Scénarios :

- `tsconfig.json` absent, invalide, avec `extends`, `paths`, références de
  projet, `jsx: react-jsx` et `preserve` ;
- composant en `export default`, `forwardRef`, `memo`, fonction fléchée, classe,
  réexport par un fichier `index.ts` ;
- props par `interface`, `type` intersection, générique, `Omit`, props héritées
  d'un élément HTML ;
- accès `props["x"]`, décomposition avec valeur par défaut, spread `{...props}` ;
- fichier `.jsx` et `.js` sans types ;
- monorepo où l'adaptateur est installé à la racine et les contrats dans un
  paquet ;
- `ucm-typescript` sans `ucm.config.json`, avec `--out` hors du repository, avec
  un argument inconnu ;
- chargement de l'adaptateur par `ucm check` quand `typescript` manque.

Comment : fixtures `.tsx` synthétiques dans `packages/adapter-typescript/tests/`,
et repositories temporaires pour le binaire et le chargement par la CLI.

Critère : un écart de parité n'est jamais inventé ni tu ; une panne de lecture
ne se présente jamais comme un écart du composant.

### Zone 7. Lecteurs du kit face aux entrées hostiles, priorité 2

Pourquoi : le kit est bien couvert, mais plusieurs rendus de refus n'ont jamais
été exécutés, et un lecteur qui lève dans `ucm check` bloque toute la CI du
consommateur.

Scénarios :

- lignes du terminal de `controle-repository.mjs` pour un contrat illisible, une
  version hors fenêtre dans les deux sens, chaque type d'écart de parité et un
  type typographique en écart dans un mode d'extension ;
- chargement du schéma qui échoue (`schema-contrat.mjs`) ;
- contrats antérieurs à 11.0 dans `variant-views.mjs` ;
- échantillon qui pose un booléen sur une prop texte, et l'inverse
  (`validation-echantillons.mjs`) ;
- contrat de 20 Mo, catalogue de 50 000 vues, 1 000 contrats dans un repository ;
- groupe de tokens imbriqué sur 8 000 niveaux, qui épuise la pile
  d'`indexerTokensDtcg` ;
- clés `__proto__`, `constructor`, `toString` à chaque niveau d'un contrat et
  de `tokens.json`.

Comment : tests ciblés sur les branches listées, puis tirages aléatoires sur le
modèle de `packages/kit/tests/modes-tokens-aleatoire.test.mjs`, graine fixe,
avec la promesse « ne lève jamais » pour chaque lecteur qui la déclare.

Critère : aucun lecteur ne lève sur une entrée JSON ; chaque rendu de refus a
son test.

### Zone 8. Feuille des tokens et modes dans une vraie application, priorité 2

Pourquoi : la cascade est prouvée sur des documents synthétiques et sur la
galerie du Playground, qui n'a qu'un axe.

Scénarios :

- deux axes réels, une marque et un thème, avec des attributs imbriqués dans une
  vraie page Vite ;
- navigateur sans `@scope` : ce qui reste juste et ce qui retombe sur le défaut ;
- 5 000 tokens et 500 extensions : temps de `ucm tokens css` dans `npm run dev` ;
- `--sans-modes` sur un export antérieur ;
- `css.fontFamilyFallback` qui contient une virgule, des guillemets ou un
  point-virgule ;
- couleur `display-p3` hors du gamut sRGB dans Chromium, Firefox et WebKit ;
- noms décomposés du défaut D2.

Comment : le harnais `packages/cli/tests/cascade/` et
`../mesure-l5/comparer.mjs` pour les comparaisons de rendu.

Critère : la documentation dit quels navigateurs rendent les croisements, et
chaque cas sans `@scope` a une valeur prévisible.

### Zone 9. Noms, Unicode et systèmes de fichiers, priorité 2

Scénarios :

- deux contrats `Button` et `button` sur un système insensible à la casse ;
- noms de composants avec accents, émojis, écriture de droite à gauche ;
- `codeIdentifier` qui rend le même identifiant pour deux noms, et le message
  de `validerGrapheDesContrats` ;
- nom de token dont la projection CSS commence par un chiffre ou un tiret ;
- mode ou extension dont le nom ne contient que des symboles.

Critère : deux noms distincts ne donnent jamais la même sortie en silence.

### Zone 10. Versions et compatibilité, priorité 2

Scénarios :

- CLI plus ancienne qui lit un contrat plus récent, et l'inverse, sur toute la
  fenêtre de `version-contrat.mjs` ;
- `tokens.json` de chaque version du format, lu par chaque CLI publiée encore
  documentée ;
- relais, workflow et `package.json` épinglés à trois versions différentes :
  `ucm guide` doit le dire ;
- cache `npx` qui sert une version plus ancienne que le pin ;
- archive publiée : `npm pack --dry-run` de chaque paquet contient ce que son
  `files` promet, et l'archive installée seule passe `ucm --help`, `init` et
  `check`.

Critère : un écart de version se signale toujours dans le sens qui dit qui doit
agir.

### Zone 11. Documentation exécutable, priorité 2

Pourquoi : `pinDocumente.test.mjs` vérifie les numéros, pas que les commandes
fonctionnent.

Comment : extraire chaque bloc `sh` des README et de `docs/RECETTE.md`, le
lancer dans un repository vierge avec les versions publiées, et relever les
commandes qui échouent ou produisent autre chose que ce que le texte annonce.

Critère : chaque commande copiable aboutit, ou le texte dit ce qui la précède.

### Zone 12. Performance et limites, priorité 3

Scénarios :

- export d'un jeu de composants à 1 000 variants : la dette de
  `getMainComponentAsync` que `ROADMAP.md` décrit ;
- `cyclesActifs` sur une composante de 4 000 feuilles aux cycles inactifs, dont
  le coût mesuré est de 6 s ;
- `ucm check` sur 500 contrats ; `ucm guide` sur un contrat de 55 Ko, dont la
  sortie dépasse 70 Ko ;
- mémoire du plugin sur un fichier de 5 000 variables.

Critère : chaque limite mesurée est écrite avec sa borne, ou corrigée.

### Zone 13. Sécurité, priorité 3

Scénarios :

- le jeton GitHub n'apparaît dans aucun message, journal, corps de pull request
  ni erreur remontée à l'UI ;
- un nom Figma qui contient du HTML, des accents graves, `@nom`, `#123` ou un
  lien Markdown, dans le corps de pull request et dans le rapport de CI ;
- `--out` des commandes et de `ucm-typescript` hors du repository ;
- `BASE_SHA` et noms de branches avec caractères du shell dans le workflow ;
- clés de prototype dans les JSON lus.

Critère : aucune donnée de l'utilisateur ne s'exécute ni ne s'interprète hors de
son contexte.

## 5. Journal et livrables

Le journal vit dans `docs/notes/JOURNAL-TEST-DEBUG.md`. Une entrée par défaut :

```markdown
### <zone> : <titre court>

- Reproduction : commande, code de sortie, sortie utile
- Classement : critique, mineur ou à décider
- Test : fichier et nom du test, vu rouge avant la correction
- Correction : commit, versions publiées
- Mutation : ce qui a été cassé, le test qui a échoué
```

Le compte rendu final donne, dans cet ordre : les défauts critiques corrigés,
les défauts à décider avec leur reproduction, les portes mainteneur restantes,
puis les zones éprouvées sans défaut.

## 6. Ordre d'exécution

1. D1, puis D2 jusqu'à la décision du mainteneur.
2. Zones 1, 2, 3 et 4.
3. Zones 5 à 11.
4. Zones 12 et 13.

Après chaque zone : `npm test`, `npm run typecheck`, `npm run build` et
`npm run cascade` dans le worktree isolé, puis publication si une version a
monté.

## 7. Commandes utiles

Couverture d'un paquet :

```sh
cd packages/<paquet>
node --experimental-test-coverage --test-coverage-include="src/**" --import tsx --test tests/*.test.ts tests/*.test.mjs
```

Mutation vue rouge : copier le fichier source, appliquer la casse, lancer le
test, restaurer depuis la copie. Le script `muter.mjs` d'une session précédente
en donne le modèle : une liste de mutations `{ fichier, avant, apres, commande }`
appliquée puis restaurée une à une.

Repository vierge avec la version publiée :

```sh
mkdir vierge && cd vierge
npx --yes @ucm-kit/cli@<version> init
npx --yes @ucm-kit/cli@<version> check
npx --yes @ucm-kit/cli@<version> tokens css --out src/generated/tokens.css
```
