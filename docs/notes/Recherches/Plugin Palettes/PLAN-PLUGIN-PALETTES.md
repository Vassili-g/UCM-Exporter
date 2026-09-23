# UCM Palettes : plan de développement

Ce plan guide un agent autonome, lot par lot, jusqu'au plugin UCM Palettes
décrit par [la spécification](./RECHERCHE-PLUGIN-PALETTES.md). La
spécification porte les règles, chacune sous un identifiant entre crochets,
`[MOT-03]` par exemple ; le plan les cite sans les recopier. Il ajoute ce que la
spécification ne dit pas : l'ordre des gestes, les écarts avec le dépôt réel,
les décisions prises depuis, et le critère qui ferme chaque lot.

Le plan a été relu par un agent indépendant, qui a vérifié ses affirmations
dans le code. Ses constats sont intégrés ; ceux qui demandaient un arbitrage
sont dans [Décisions](#décisions).

## Mode d'emploi

- Les lots s'exécutent dans cet ordre : 0, 1, 2, 8, 2b, 3, 4, 5, 6, 7, 9. Le
  lot 8 garde son numéro et ses identifiants de cases (M6). Le lot 2b reprend
  le moteur du lot 2 après la décision D-O (M7). Un lot commence quand le
  précédent est commité et poussé.
- Chaque case porte un identifiant, `L4.3` par exemple. Un commit cite les
  identifiants qu'il ferme, et la case se coche dans ce même commit.
- Un lot marqué de sous-lots (`6a`, `6b`…) donne un commit par sous-lot.
- Un point mainteneur (`M1`, `M2`…) se déclare dans le
  [journal](#journal-des-points-mainteneur) en bas de ce document. L'agent
  continue avec les lots qui n'en dépendent pas ; le tableau de chaque point dit
  lesquels.
- Une formule ou un nombre de la spécification contredit par une mesure se
  corrige dans la spécification, dans le commit qui le constate, et le message
  du commit le dit.

## Règles de conduite

Elles valent pour chaque lot et ne se recopient pas dans les lots.

**Lire avant d'écrire.**

- [AGENTS.md](../../../../AGENTS.md) en entier au premier lot, puis le groupe
  d'invariants que le lot touche.
- [CONTRIBUTING.md](../../../../CONTRIBUTING.md) : « Code », « Tests »,
  « Interface du plugin », « Rédiger un document ».
- La skill `rediger-sans-tics-ia` avant toute prose, document ou commentaire.
  La skill `rediger-diagnostics-ucm` avant tout texte destiné au designer.
- La section de la spécification que le lot cite, au moment du lot.

**Vérifier.**

- Fin de chaque lot : `npm test`, `npm run typecheck`, `npm run build`, tous
  verts. À partir du lot 3, ajouter `npm run test:ui --workspace
  ucm-palettes-plugin`.
- Un rouge étranger au lot : relancer, lire `git status` et `git log`. D'autres
  sessions commitent dans le même arbre. Si le doute reste, vérifier dans un
  worktree isolé : `git write-tree`, `git commit-tree -p HEAD`, puis
  `git -c core.autocrlf=false worktree add --detach <dossier> <commit>` et
  `npm ci`. Lancer le build étape par étape, esbuild échouant dans un chemin
  long. Supprimer le worktree par `fs.rmSync` de Node, puis `git worktree
  prune`.
- Tout test neuf, toute loi neuve, se voit rouge avant d'être crue : muter la
  ligne exacte que le test garde, constater le rouge et le message, restaurer
  par copie de sauvegarde, constater le vert. Le commit le mentionne. Jamais
  `git checkout --` sur un fichier qui porte du travail non commité.
- Aucun test ne porte un seuil de temps : une mesure de durée se fait par un
  script et son chiffre entre dans le message du commit.

**Commiter.**

- Relire `git diff --cached --name-only` : l'index est partagé.
- Fichiers neufs : `git add -- <chemins neufs>`, puis
  `git commit --only -F <message> -- <tous les chemins du lot>`.
  `--only` seul refuse un fichier que Git ne connaît pas.
- Un lot qui crée un paquet lance `npm install` avec npm 12.0.2, la version de
  la CI, et commite `package-lock.json`. Sans lui, `npm ci` échoue en CI.
- Fins de ligne : `git ls-files --eol <chemins>` doit montrer `i/lf`. Le
  `package.json` racine est en CRLF dans la copie de travail et en LF dans
  l'index ; c'est l'index qui compte.
- Code qui contient un antislash ou un accent grave : outils Write et Edit,
  jamais un heredoc du shell.
- Commit sur `main`, puis `git push origin main`. Ni branche, ni pull request.

**Ne pas faire.**

- Monter la version d'un paquet publié, ou publier.
- Modifier le comportement d'UCM Exporter. Seul le lot 8 touche
  `packages/plugin-exporter`, et il ne change pas son DOM.
- Commiter un fichier qu'une autre session a créé ou modifié sans que le
  mainteneur l'ait dit.

**Documents.** Chaque lot met à jour les documents que son code rend faux ou
incomplets, dans son propre commit : la carte du code d'AGENTS.md, un invariant
devenu vrai avec le test qui le tient, CONTRIBUTING.md pour une commande. Le lot
9 ne fait que clore.

## Décisions

### Arbitrées par le mainteneur

| # | Question | Décision | Effet sur la spécification |
|---|---|---|---|
| D-A | Où ranger le moteur de couleur | Paquet privé `packages/couleur`, nom `ucm-couleur`, servi en source. Il entre dans le kit le jour où un lecteur de `tokens.json` en a besoin, avec une montée de version | D7, [ARC-01], [ARC-04], §19 |
| D-B | Quand extraire le socle commun | Maintenant et en entier : le lot 8 passe avant le lot 3, galerie comprise, et le plugin Palettes naît sur le socle. Remplace la décision d'extraire après la planche (M6) | D13, [ARC-09], §14.2, §15, §18 |
| D-L | Où régler courbes, parts et seuil de profils confondus | Une configuration ouverte par le bouton en forme d'engrenage de l'en-tête, comme dans UCM Exporter, au sous-lot 4c. Deux onglets restent, Palettes et Planche (M6) | [UI-02], §8.3, §15 |
| D-N | Noms des dossiers de paquets | UCM Exporter passe de `packages/plugin` à `packages/plugin-exporter`, entre 8a et 8b ; son nom npm `ucm-exporter-plugin` ne change pas. Le moteur garde `packages/couleur` : il n'est pas un plugin. Le plugin de développement se réimporte dans Figma depuis le nouveau chemin du manifest | Chemins de §14 |
| D-M | Une courbe éditée qui ne tient plus 600 à 3:1 ou 700 à 4,5:1 contre le cran 50 | Alerte non bloquante « courbe hors garantie », mesurée sur 360 teintes, deux profils, deux modes (M6) | [ENT-10] |
| D-C | Abscisse du graphe de dérive | Le rang du cran, onze positions régulières. La courbe devient une ligne brisée qui passe par la dérive de chaque cran | [DER-01], [DER-16] |
| D-D | Moment où la recette se range dans le fichier | Automatiquement, à la fin de chaque geste : relâcher une poignée, valider un champ, créer ou supprimer une palette. Jamais pendant un glisser | [REC-06], [DER-13] |
| D12 | Nom des deux profils | `soft` et `vivid`, comme l'architecture. Renommés au lot 2, avant qu'une recette soit rangée dans un fichier : aucune migration de lecture. Après la première recette rangée, un renommage demandera une migration | D12, et chaque mention des profils |
| D-O | Où se décide le cran d'un emploi | Nulle part : la table des emplois de l'architecture est fixe, commune à toutes les palettes et aux deux profils. Le fond plein prend le 700 dans toutes les marques. La recette perd `cablage`, sans migration : aucune recette n'est encore rangée. Une référence plus claire que le cran 700 déclenche l'alerte `[VER-12]` (M7) | D9, Q6, §7, §9.4, §11.2, §11.3, §13.2 |

Raison de D-A : `tests/versionSuitLeContenu.test.mjs` exige qu'un contenu
modifié sous `packages/kit` monte la version du kit. La CLI et l'adaptateur
épinglent `@ucm-kit/core` à `0.1.40` exact, et `monorepoCoherent.test.mjs`
exige qu'ils résolvent le kit local : la montée se propagerait à trois paquets,
que AGENTS.md demande alors de publier. Un paquet `private` est ignoré par ces
deux tests.

### Prises par défaut, révisables

Le mainteneur peut renverser chacune avant le lot indiqué. Sans réponse, le
défaut s'applique.

| # | Question | Défaut | Avant le lot |
|---|---|---|---|
| D-E | L'alerte « Profils confondus » sonne sur 320 teintes sur 360, aux crans 50 et 100 | Elle ne porte que sur les crans de la table des emplois, états `+1` et `+2` compris. Ailleurs, la carte garde sa mention « ≈ » ([PLA-15]) | 2 |
| D-F | « Référence plus vive que `vivid` » sonne pour toute couleur au plafond du gamut | Elle devient une notice | 2 |
| D-G | Une référence presque grise donne une rampe vive : `#6B7280` produit `#0E44F7` en `vivid.700` | Sous `seuils.chromaGrise`, la palette reçoit des parts propres égales à la part de la référence, marquées `origine: "grise"`. Elles disparaissent si la référence cesse d'être grise. L'alerte « Profils confondus » se tait pour cette palette | 2 |
| D-H | Un calque ajouté par le designer dans un cadre disparaît au redessin ([PLA-03]) | Le plugin compte ces calques avant de redessiner et demande confirmation, en les nommant. Chaque calque posé par le plugin porte un marqueur | 6 |
| D-I | Dessiner toutes les palettes avant d'avoir mesuré le temps ([PLA-24]) | Confirmation au-delà de six palettes, seuil revu au lot 6d après la mesure | 6 |
| D-J | Textes destinés au designer | Tous dans un seul module. L'agent écrit des textes provisoires et les soumet au point M2 | 4 |
| D-K | Format de l'identifiant d'une palette | `p-` suivi de huit chiffres hexadécimaux tirés au hasard dans l'interface. Le moteur reste sans hasard | 2 |

Mesure faite au lot 0 sur D-E : à dérive nulle, l'alerte portée sur tous les
crans sonne pour 320 teintes, aux crans 50, 100 et 950. Bornée aux crans de la
table des emplois, elle sonne encore pour 249 teintes, parce que `surface` vise
le cran 100 : ce cran confond les deux profils sur 216 teintes en clair et 39
en sombre. Le défaut s'applique tel quel, et
`[VER-11]` porte ces nombres ; le mainteneur peut le revoir avant le lot 2.

## Écarts à corriger dans la spécification

Le lot 0 les porte dans la spécification. Chacun a été mesuré ou lu dans le
code.

| # | Écart | Correction |
|---|---|---|
| E1 | L'empreinte [REC-02] couvre la recette, qui contient `planche` : dessiner écrit les identifiants, change l'empreinte et périme tous les cadres | `planche` sort de la recette. Les identifiants de page et de cadres vont sous la clé partagée `ucm_palettes/planche`, jamais exportée |
| E2 | Fraîcheur [PLA-19] [PLA-20] : une empreinte globale périme tous les cadres dès qu'une palette change | Chaque cadre porte l'empreinte de son modèle de planche, calculée sur le modèle privé de ce champ. L'en-tête [PLA-07] affiche cette empreinte-là. Un cadre se périme quand son modèle recalculé diffère : renommer une autre palette peut donc le périmer, par l'alerte « Palettes proches » |
| E3 | Angles et parts n'ont pas de précision rangée : le préréglage rend -7,52689 | Un angle se range au centième de degré, une part au millième, au moment où il est posé. L'arrondi est symétrique en signe. Le préréglage rend la valeur arrondie ; « Libre » compare des valeurs arrondies. Arrondir change un cran sur 44 pour `#1E6FD9` : le second jeu de vecteurs §6.8 se recalcule avec le moteur |
| E4 | [ENT-06] : la clarté de `#121212` vaut 0,1822, au-dessus de 0,18 ; le fond sombre par défaut déclencherait l'alerte | Comparer la clarté du fond à la valeur de la courbe, avec une tolérance de 0,005 |
| E5 | [VER-06] ne dit pas quel membre de la paire bouge ; pour les paires 5 à 7, le premier membre vise le fond | Le membre qui vise un cran bouge, le premier si les deux en visent un. Le cran proposé tient toutes les paires du rôle ; recherche par distance croissante au cran courant, à égalité vers le plus contrasté |
| E6 | [REC-05] laisse passer des recettes qui cassent le moteur | Ajouter : courbes dans `[0, 1]` ; seuils strictement positifs ; `derives` a au moins deux paires, des noms uniques, des teintes dans `[0, 360)` et des teintes claires distinctes (sinon division par zéro) ; `soft ≤ vivid` après les parts propres d'une palette |
| E7 | [VER-05] écrit « 950 » en dur, alors que `crans` change par import | « Au-delà du dernier cran de `crans` » |
| E8 | [MOT-22] : `Math.floor(x * 100) / 100` rend 4,34 pour 4,35 ; `mesurer-recette.mjs` arrondit par `toFixed` et affiche 5,77 là où la spécification tronque à 5,76, à raison | La troncature passe par la représentation décimale à dix chiffres, et le script tronque aussi. Un test vérifie que l'affichage et le verdict concordent |
| E9 | [REC-02] : le sandbox n'a pas `TextEncoder` | `FNV-1a` porte sur les octets UTF-8, produits par un encodeur écrit dans le moteur. Ni `Intl`, ni `toLocaleString` : la virgule décimale s'écrit par le moteur |
| E10 | [ENT-04] dans un document `DISPLAY_P3` : la couleur lue est en P3 | Conversion P3 vers sRGB, inverse de [MOT-05]. Hors du gamut sRGB, la couleur est ramenée et une note le dit. Seule une peinture `SOLID` visible et d'opacité 1 se propose |
| E11 | §16.2 : dans un document P3, la pipette ne rend pas l'hexa sRGB de la carte | Le critère devient : la même palette dessinée dans un document sRGB et dans un document P3 s'affiche identique côte à côte, et les composantes relues de la peinture P3 égalent la conversion |
| E12 | [PLA-06] et [REC-06] : Ctrl+Z défait à la fois le dessin et le rangement de la recette | `figma.commitUndo()` après chaque rangement et après chaque dessin. Chaque geste devient un pas d'annulation |
| E13 | Deux designers, ou un Ctrl+Z dans Figma, changent la recette pendant que l'interface garde l'ancienne | Chaque demande de rangement porte l'empreinte que l'interface a lue. Si la recette rangée diffère, le sandbox refuse et l'interface propose « Recharger ». L'interface relit l'état quand sa fenêtre reprend le focus |
| E14 | `documentAccess: "dynamic-page"` | `await page.loadAsync()` avant de lire `children` ou d'écrire dans la page ; `getNodeByIdAsync` puis contrôle de `removed` |
| E15 | Un cadre dupliqué par le designer porte peut-être la même donnée `cadre` | Le cadre range aussi `ucm_palettes/proprietaire`, son propre `id`. Un cadre dont cette valeur diffère de son `id` est une copie : signalé en notice, jamais réécrit |
| E16 | [PLA-01] : une page « Palettes » peut déjà exister sans être celle du plugin | Le plugin crée alors « Palettes (UCM) » |
| E17 | [PLA-05] ne dit pas où poser un cadre neuf quand des cadres ont été déplacés | À droite du cadre possédé le plus à droite, à 200 px, aligné sur le haut du premier cadre |
| E18 | Après « Dessiner », rien ne montre le résultat si la page courante est une autre | Le résultat propose « Voir sur la planche » : `setCurrentPageAsync` puis `scrollAndZoomIntoView` |
| E19 | Recette illisible ou future ([REC-03]) : aucun geste pour en sortir | Trois gestes : exporter la recette rangée telle quelle, importer une recette, repartir de la recette par défaut après confirmation |
| E20 | [DER-09] détourne la touche Origine, que le motif clavier d'un curseur réserve au minimum | Origine et Fin gardent leur sens ; un bouton « Tailwind » à côté de chaque champ ramène la valeur du préréglage. Chaque poignée porte `role="slider"` et une `aria-valuetext` qui donne l'angle et la teinte |
| E21 | [DER-13] : Ctrl+Z dans l'iframe | Actif seulement quand le focus est dans l'éditeur, hors d'un champ texte ; Cmd+Z sur Mac. Pile de cinquante réglages, sans rétablissement |
| E22 | Hiérarchie : à 440 × 520, l'éditeur déplié repousse les promesses manquées sous le pli, contre [VER-07] | L'éditeur est replié par défaut sur une ligne : préréglage et deux angles, avec « Régler ». Le point (e) du protocole compte une rampe pour un objet |
| E23 | Les chemins de §14.2 sont relatifs à `packages/plugin-exporter` | Les écrire depuis la racine du dépôt |

## Correspondances utiles

| Élément | Chemin dans le dépôt |
|---|---|
| Build de l'interface d'UCM Exporter | `packages/plugin-exporter/scripts/build-ui.cjs` |
| Manifest distribuable | `packages/plugin-exporter/scripts/build-manifest.cjs` |
| Découvreur de tests | `packages/plugin-exporter/scripts/run-tests.cjs` |
| Fenêtre | `packages/plugin-exporter/src/fenetre.ts` |
| Composants d'interface | `packages/plugin-exporter/src/ui/components/` |
| Galerie | `packages/plugin-exporter/galerie/` et `packages/plugin-exporter/tests/galerie.test.ts` |
| Loi du document intact | `packages/plugin-exporter/tests/loiDuDocumentIntact.test.ts` |
| Patron du constat | `packages/plugin-exporter/src/contract/localisation.ts` |
| Types de l'API Figma | `node_modules/@figma/plugin-typings/plugin-api.d.ts`, version 1.138 |

Noms des paquets neufs, tous `private: true` : `ucm-couleur`
(`packages/couleur`), `ucm-palettes-plugin` (`packages/plugin-palettes`),
`ucm-plugin-socle` (`packages/plugin-socle`, lot 8).

## Lot 0 : mise en place

Documents seuls. Le dossier de la recherche n'est pas suivi par Git, et
`scripts/controle-style.mjs` porte un diff non commité qui ajoute les sigles
`AA`, `APCA`, `OKLAB`, `OKLCH` et `WCAG`. Sans ce diff, la version commitée
refuse la spécification ; sans les fichiers de l'architecture, les liens de la
spécification sont morts en CI.

- [x] **L0.1** Relever par `git ls-files` et `git status` l'état de :
  `scripts/controle-style.mjs`,
  `docs/notes/Recherches/Archi Tokens Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md`,
  `verifier-courbes.mjs` et `mesurer-derive-teinte.mjs` du même dossier. Ce
  qui n'est pas commité ouvre le point M0.
- [x] **L0.2** Rejouer `node "docs/notes/Recherches/Plugin Palettes/mesurer-recette.mjs"`
  et `verifier-courbes.mjs`. Comparer à §6.8 et à la revue critique.
- [x] **L0.3** Porter E1 à E23 et D-A à D-K dans la spécification, section par
  section. Mettre à jour la table des lots §15 selon ce plan, et §19.
- [x] **L0.4** `mesurer-recette.mjs` tronque au lieu d'arrondir (E8), et range
  les angles au centième (E3). Ses sorties changées se reportent dans §6.8.
- [x] **L0.5** `npm test` vert, dont `docLinks` et `styleDocumentaire`.
- [x] **L0.6** Commit du dossier `Plugin Palettes` entier, ce plan compris,
  après M0.

Critère : le dossier est suivi, la CI est verte, et la spécification ne
contredit plus ce plan.

## Lot 1 : moteur de couleur

Spécification : [section 6](./RECHERCHE-PLUGIN-PALETTES.md#6-le-moteur-de-couleur).
Paquet `packages/couleur`, nom `ucm-couleur`.

- [x] **L1.1** Paquet : `package.json` privé avec
  `"exports": { ".": "./src/index.ts" }`, sans étape de build ; esbuild, tsx et
  tsc en résolution `Bundler` lisent la source. Scripts `test` et `typecheck`.
  `scripts/run-tests.cjs` copié de celui du kit. `npm install`, lock commité.
- [x] **L1.2** Deux `tsconfig`. Celui de `src/` pose `lib: ["ES2020"]` et
  `types: []` : `figma`, `document`, `window` et `performance` y deviennent des
  erreurs de compilation. Celui de `tests/` ajoute les types de Node.
  `Array.prototype.at` est hors d'ES2020 et reste interdit.
- [x] **L1.3** Loi de pureté, textuelle, sur ce que le compilateur ne voit
  pas : `Date`, `Math.random`, `Intl`, `toLocaleString`, `TextEncoder`.
- [x] **L1.4** `conversions.ts` : [MOT-01] à [MOT-05], plus la conversion P3
  vers sRGB d'E10.
- [x] **L1.5** `plafond.ts` : [MOT-06] à [MOT-08].
- [x] **L1.6** `rampe.ts` : [MOT-09] à [MOT-17], teinte pivotée de §6.4, parts
  propres d'une palette, arrondi d'E3. Expose aussi le chemin sans arrondi à 8
  bits, pour L1.10.
- [x] **L1.7** `tailwind.ts` : [MOT-18] à [MOT-20], relevé par défaut des
  dix-sept paires de `mesurer-recette.mjs`.
- [x] **L1.8** `contraste.ts` : [MOT-21] à [MOT-24], troncature d'E8, écriture
  décimale à virgule.
- [x] **L1.9** Vecteurs, premier jeu de §6.8 : calculés une fois par un script
  jetable avec culori, hors des dépendances, puis figés dans le test. Le script
  ne se commite pas ; le test dit d'où viennent les nombres.
- [x] **L1.10** Critère de l'architecture : les minima de `verifier-courbes.mjs`,
  relevés en L0.2, figés dans un test sur le chemin sans arrondi, à 0,01 près.
- [x] **L1.11** Second jeu de §6.8 recalculé par le moteur, comparé au script,
  puis figé.
- [x] **L1.12** Tests de propriété : pivot pour toute dérive et toute référence
  dans `[Ls, Lc]` ; [MOT-12] ; plafond jamais hors gamut sur 360 teintes.
- [x] **L1.13** Script `packages/couleur/scripts/mesurer-temps.mjs` pour
  [MOT-13] : médiane de cent calculs d'une palette de 44 crans. Chiffre dans le
  commit.
- [x] **L1.14** AGENTS.md : `packages/couleur` dans la carte du code ; invariant
  de pureté avec sa loi.

Critère : vecteurs et propriétés verts ; loi de pureté vue rouge ; médiane
[MOT-13] sous 5 ms sur le poste, ou constat écrit dans la spécification.

## Lot 2 : promesses, alertes, recette

Spécification : [section 7](./RECHERCHE-PLUGIN-PALETTES.md#7-la-recette),
[section 11](./RECHERCHE-PLUGIN-PALETTES.md#11-les-vérifications). Même paquet.

- [x] **L2.1** `promesses.ts` : câblage résolu par palette et par mode, les
  quatorze paires de §11.2, [VER-03] à [VER-07], E5 et E7.
- [x] **L2.2** `alertes.ts` : table de §11.3, [VER-08], [MOT-18], [ENT-06] avec
  E4, défauts D-E, D-F, D-G.
- [x] **L2.3** Sévérités de §11.4 et ordre de tri, en fonction pure.
- [x] **L2.4** `recette.ts` : forme de §7.1 sans `planche` (E1), recette par
  défaut, classement [REC-03], validation [REC-05] complétée par E6, parts
  `origine: "grise"` de D-G. La migration n'a aucun cas tant que
  `formatVersion` vaut 1 ; son test pose une version 0 fictive.
- [x] **L2.5** `empreinte.ts` : JSON canonique, encodeur UTF-8, `FNV-1a` 32
  bits ([REC-02], E9).
- [x] **L2.6** Tests : chaque paire vue tenir et échouer ; chaque alerte vue
  sonner et se taire ; chaque règle de validation vue refuser, avec son
  message ; empreinte stable à l'ordre des clés près.
- [x] **L2.7** Écrire `TEXTES-A-VALIDER.md` dans ce dossier : pour chaque
  message de §11 et chaque refus de validation, deux rédactions côte à côte,
  en trois parties (où, quoi, geste), selon `rediger-diagnostics-ucm`. Ouvre
  M2.

Critère : chaque exigence `VER` du lot et chaque règle de `[REC-05]` a un test
vu rouge.

## Lot 8 : extraction du socle

Exécuté après le lot 2 et avant le lot 3 (D-B) : le plugin Palettes naît sur
le socle. Spécification : [section 14.2](./RECHERCHE-PLUGIN-PALETTES.md#142-ce-qui-se-partage-avec-ucm-exporter).
Paquet `packages/plugin-socle`, nom `ucm-plugin-socle`. Ce lot touche UCM
Exporter : la preuve porte sur son DOM, les captures n'étant pas
reproductibles.

- [x] **L8.1** Relevé avant, dans un worktree isolé, par un script hors du
  dépôt : pour chaque état de la galerie d'UCM Exporter, rejoué par Playwright
  dans Chromium, transitions neutralisées et attente de `data-galerie="pret"`,
  relever le `innerHTML` de `#app` et le style calculé de chaque élément.
  Garder `dist/ui.html`.

### 8a : scripts, manifest, fenêtre

- [x] **L8.2** Build de l'interface, manifest, découvreur de tests et fenêtre
  dans le socle, bornes et clé en paramètres. Fichiers relais laissés là où les
  tests d'UCM Exporter les attendent (`buildUi.test.ts` fait un `require` de
  `../scripts/build-ui.cjs`).
- [x] **L8.3** Relevé après, comparaison. Commit.

### 8b : feuille de style, composants et en-tête

- [x] **L8.4** `socle.css` et règles propres à chaque plugin ; le build
  concatène plusieurs feuilles dans un ordre écrit. `Button`, `Onglets`,
  `Interrupteur`, `ResizeGrip` avec sa fonction d'envoi en paramètre. L'en-tête
  et sa bascule vers la configuration, par le bouton en forme d'engrenage (D-L) ;
  ce que l'en-tête affiche reste à chaque plugin.
- [x] **L8.5** La loi des styles lit toutes les feuilles et le socle.
- [x] **L8.6** Relevé après, comparaison. Commit.

### 8c : galerie et tests communs

- [x] **L8.7** Banc de galerie dans le socle, `ETATS`, tailles et étapes en
  paramètres ; `capturer.cjs` reste appelable depuis `packages/plugin-exporter/galerie`,
  où `galerie.test.ts` le cherche. Logique des tests de styles, de gabarit et
  de manifest en fonctions du socle ; UCM Exporter garde ses tests, qui les
  appellent.
- [x] **L8.8** Relevé après, `npm run test:ui --workspace ucm-exporter-plugin`.
  Commit.
- [x] **L8.9** AGENTS.md et CONTRIBUTING.md : carte du code, commandes de
  galerie. Ouvrir M5.

Critère : pour chaque état de la galerie d'UCM Exporter, `innerHTML` et styles
calculés identiques avant et après. `dist/ui.html` identique, ou différence
réduite à l'ordre des modules du bundle, montrée dans le commit. Un besoin que
le plugin Palettes découvre plus tard se règle dans le socle, sous la même
preuve.

## Lot 2b : table fixe des emplois

Exécuté après le lot 8 et avant le lot 3 (D-O, M7). Spécification :
[section 11.2](./RECHERCHE-PLUGIN-PALETTES.md#112-promesses-des-emplois),
[section 11.3](./RECHERCHE-PLUGIN-PALETTES.md#113-alertes),
[section 7.1](./RECHERCHE-PLUGIN-PALETTES.md#71-contenu). Même paquet
`packages/couleur`. Aucune recette n'est rangée dans un fichier :
`FORMAT_RECETTE` reste à 1, sans migration.

- [x] **L2b.1** `recette.ts` : retirer `cablage` de `Recette`, de `Palette`, de
  `recetteParDefaut` et de la liste des clés connues. Retirer `Cible`,
  `Cablage`, `validerCible`, `validerCablage` et les règles `role-absent`,
  `cible-forme`, `cible-cran-inconnu`. Une clé `cablage` devient une
  `cle-inconnue`. Ajouter la règle `crans-emplois` ([VER-05]) : `crans`
  contient 100, 200, 300, 600, 700, 800 et 900.
- [x] **L2b.2** Table des emplois : `Role` devient `Emploi`, et une constante
  exportée donne son cran à chaque emploi (§11.2), `on-solid` valant le fond.
  Le nom la range là où `promesses.ts` et `alertes.ts` la lisent, sans cycle
  d'import.
- [x] **L2b.3** `palette.ts` : retirer `cablageDe`.
- [x] **L2b.4** `promesses.ts` : les quatorze paires sur la table fixe, pour
  chaque mode et chaque profil, 56 par palette. Retirer `Proposition`, la
  recherche du cran proposé et le verdict `non-verifiable` ([VER-06]). Une
  promesse porte son profil.
- [x] **L2b.5** `alertes.ts` : `rangsCables` devient les crans de la table, états
  compris ([VER-11]) ; alerte `reference-plus-claire-que-bouton` ([VER-12]),
  mesurée sur `courbes.light` au cran 700, portant la référence et l'hexa du
  cran 700 `vivid` en clair.
- [x] **L2b.6** Tests : ceux du câblage et du cran proposé retirés ; chaque
  paire vue tenir et échouer pour chaque profil ; `crans-emplois` vue refuser ;
  `[VER-12]` vue sonner pour `#FACC15` (yellow-400 de Tailwind, clarté 0,86) et
  se taire pour `#1D4ED8` (blue-700, clarté 0,49). Les vecteurs de §6.8 restent verts.
- [x] **L2b.7** `TEXTES-A-VALIDER.md` est déjà à jour pour ce lot (M7) : ne pas
  le réécrire. AGENTS.md : carte du code de `packages/couleur` si un fichier
  change de rôle.

Critère : suite, typecheck et build verts ; aucune occurrence de `cablage`
ni de `Cible` dans `packages/couleur` ; chaque règle neuve vue rouge.

## Lot 3 : squelette du plugin

Spécification : [section 13](./RECHERCHE-PLUGIN-PALETTES.md#13-linterface),
[section 14](./RECHERCHE-PLUGIN-PALETTES.md#14-architecture-du-code).
Paquet `packages/plugin-palettes`, nom `ucm-palettes-plugin`.

- [x] **L3.1** Paquet, `tsconfig` avec les chemins de types d'UCM Exporter,
  dépendances `ucm-couleur` et `ucm-plugin-socle`, lock commité.
- [x] **L3.2** Scripts du socle : build de l'interface, manifest, découvreur
  de tests et banc de galerie, appelés avec les paramètres du plugin : taille
  de la galerie (600 × 720 et 440 × 520), étapes `survol` et `touche` en plus
  de message, clic, saisie et erreurUi. Une étape qui manque au banc s'ajoute
  au socle, sous la preuve de L8.1. Fait pour les deux tailles, par un
  paramètre `dossier` du banc ; `survol` et `touche` entrent au banc avec le
  premier état qui les joue (L4.6), une étape qu'aucun état ne joue ne pouvant
  se voir rouge.
- [x] **L3.3** Manifest [ARC-05] avec un identifiant provisoire ; test du
  manifest : aucun domaine, aucune `enablePrivatePluginApi`, `documentAccess`
  exact.
- [x] **L3.4** `messages.ts` [UI-07] [UI-08], réduit aux messages que ce lot
  produit et met en scène : état lu, erreur de lecture. Un message entre dans
  ce fichier au lot qui le joue dans la galerie ; le test de la galerie
  l'exige.
- [x] **L3.5** `lecture.ts` : recette rangée, classement [REC-03], profil du
  document. `ecriture/recette.ts` : [REC-01], [REC-04], contrôle d'empreinte
  d'E13, `commitUndo` d'E12. `code.ts` : deux portes d'écriture [ARC-14].
- [x] **L3.6** Fenêtre [UI-01] : celle du socle, avec les bornes du plugin et
  une clé propre.
- [x] **L3.7** Interface : deux onglets vides et l'en-tête du socle, dont le
  bouton en forme d'engrenage ouvre une configuration vide [UI-02] ;
  `textes.ts` pour tous les textes du designer (D-J).
- [x] **L3.8** Galerie : `etats.cjs` avec Premier lancement, Recette future,
  Recette illisible ; les autres états de §13.3 déclarés `existe: false` avec
  l'identifiant de la case qui les créera dans `attendu`. Test de la galerie :
  la logique du socle, appelée par un test au nom du plugin.
- [x] **L3.9** Loi d'écriture ([ARC-12], [ARC-13]) : liste explicite des
  motifs (`figma.create*`, `.remove(`, `setPluginData`, `setSharedPluginData`,
  `appendChild`, `insertChild`, `.fills =`, `.strokes =`, `.name =`,
  `.characters =`, `.resize(`, `.x =`, `.y =`, `.layoutMode =`, `.fontName =`,
  `.fontSize =`) hors de `src/ecriture/` ; `figma.variables`,
  `loadAllPagesAsync` et toute API de style dans tout `src/`. Le commentaire de
  la loi dit sa borne : lecture ligne à ligne. La navigation
  (`setCurrentPageAsync`, `scrollAndZoomIntoView`, `selection`) vit dans
  `src/navigation.ts`, hors de la loi.
- [x] **L3.10** Loi d'import : aucun des deux plugins n'importe l'autre. Elle
  vit à la racine, `tests/pluginsSepares.test.ts`, et lit les deux sens : le
  critère du lot laisse `packages/plugin-exporter` intact.
- [x] **L3.11** Racine : `npm run build` construit le plugin après le kit
  ([ARC-06]). `ci.yml`, job `cascade` : une ligne
  `npm run test:ui --workspace ucm-palettes-plugin`.
- [x] **L3.12** `tests/interface/interface.test.mjs` du plugin, avec un premier
  cas : la fenêtre s'ouvre sur l'onglet Palettes.
- [x] **L3.13** AGENTS.md : carte du code, invariants d'écriture du nouveau
  plugin. Nouveau domaine d'invariants ajouté à `DOMAINES` dans
  `tests/inventaireInvariants.test.ts`, dans le même commit.
- [x] **L3.14** Ouvrir M1.

Critère : suite, typecheck et build verts ; lois vues rouges ; galerie
construite ; UCM Exporter inchangé (`git diff --stat packages/plugin-exporter` vide).

## Lot 4 : onglet Palettes et aperçu

Spécification : [section 8](./RECHERCHE-PLUGIN-PALETTES.md#8-les-entrées),
[section 13.2](./RECHERCHE-PLUGIN-PALETTES.md#132-écrans). Hiérarchie :
[CONTRIBUTING.md](../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation),
avec E22.

### 4a : aperçu et verdict

- [ ] **L4.1** Barre du haut : sélecteur de palette [UI-06], verdict, bouton
  « Dessiner » inactif jusqu'au lot 6 et marqué comme tel.
- [ ] **L4.2** Référence et nom ; part de chroma et cran le plus proche.
- [ ] **L4.3** Aperçu [UI-04] : bascule `light` et `dark`, deux rampes de onze
  pastilles de 24 px ; survol et focus donnent nom, hexa, contrastes, emplois.
  Tabulation mobile sur les pastilles, flèches pour se déplacer.
- [ ] **L4.4** Promesses manquées, puis alertes, puis notices, dans l'ordre de
  L2.3, avec les textes provisoires.
- [ ] **L4.5** Ligne repliée de la dérive (E22), sans l'éditeur.
- [ ] **L4.6** Galerie : Palette en saisie, promesses manquées, alertes seules,
  couleur presque grise, notice `LEGACY`. Étapes `survol` et `touche` au banc
  du socle, jouées par ces états, sous la preuve de L8.1.
- [ ] **L4.7** `test:ui` : à 440 × 520, verdict, « Dessiner » et première
  promesse manquée visibles sans défiler.

### 4b : gestion des palettes et rangement

- [ ] **L4.8** Créer, renommer, dupliquer, réordonner, supprimer [ENT-03] ;
  identifiants de D-K.
- [ ] **L4.9** Créer depuis la sélection [ENT-04], avec E10.
- [ ] **L4.10** [ENT-01] : changer la référence recalcule le préréglage selon
  l'origine de la dérive.
- [ ] **L4.11** Rangement automatique de D-D, avec l'empreinte lue (E13).
  Indication discrète de rang 3 : « rangé » ou « rangement… ».
- [ ] **L4.12** Refus pour recette modifiée ailleurs, geste « Recharger ».
  Relecture de l'état au retour du focus.
- [ ] **L4.13** Galerie : premier lancement avec une palette créée, recette
  modifiée ailleurs, hexa invalide.
- [ ] **L4.14** Protocole de relecture, points (c), (d) et (e), sur les
  captures ; les comptes d'objets entrent dans le message du commit.

### 4c : configuration de la recette

Spécification : [section 8.3](./RECHERCHE-PLUGIN-PALETTES.md#83-la-recette-commune),
avec D-L et D-M.

- [ ] **L4.15** Configuration derrière le bouton en forme d'engrenage : les deux
  courbes, onze clartés chacune, les parts `soft` et `vivid`, le seuil
  `profilsConfondus`. Chaque champ affiche le nombre de palettes qu'il
  modifie [ENT-07]. Rangement à la validation d'un champ (D-D) ; un refus de
  [REC-05] s'affiche sous le champ, et rien n'est rangé.
- [ ] **L4.16** Moteur : garantie des courbes [ENT-10], fonction pure de
  `ucm-couleur`, vue tenir et échouer. Temps du calcul mesuré par script, son
  chiffre dans le commit.
- [ ] **L4.17** Alerte « courbe hors garantie » sous la courbe fautive ;
  l'aperçu suit chaque clarté validée.
- [ ] **L4.18** Galerie : configuration de la recette, courbe hors garantie.
  `test:ui` : ouvrir la configuration, changer une clarté, voir l'aperçu
  changer, l'alerte sonner puis se taire.
- [ ] **L4.19** Protocole de relecture, points (c), (d) et (e), sur la
  configuration.

Critère : parcours de 4a, 4b et 4c vert dans `test:ui` ; DOM de chaque état de
la galerie présent ; protocole passé.

## Lot 5 : éditeur de dérive

Spécification : [section 12](./RECHERCHE-PLUGIN-PALETTES.md#12-léditeur-de-dérive),
avec D-C, E20 et E21.

### 5a : géométrie et dessin

- [ ] **L5.1** `src/ui/derive/geometrie.ts`, pur : position d'un cran par son
  rang, position du pivot entre deux rangs selon sa clarté, angle d'une
  ordonnée et l'inverse, repères tous les 15°.
- [ ] **L5.2** Graphe SVG [DER-01] à [DER-05] : ligne brisée, pivot, poignées,
  bande de teintes et rampe alignées sur les mêmes onze positions.
- [ ] **L5.3** Loi des styles du plugin : elle reconnaît
  `setAttribute('class', …)` et `classList.add`, que les éléments SVG emploient
  à la place de `className`.
- [ ] **L5.4** Galerie : dérive liée Tailwind, déliée libre, référence hors de
  la rampe, référence presque grise.

### 5b : interactions

- [ ] **L5.5** Glisser vertical, Maj pour 5°, double-clic pour la valeur
  Tailwind ([DER-07], [DER-10]).
- [ ] **L5.6** Champs et réglettes liés au graphe, virgule et point acceptés
  ([DER-08]).
- [ ] **L5.7** Clavier et accessibilité d'E20 ; [DER-09] corrigé.
- [ ] **L5.8** Préréglage et lien `soft = vivid` ([DER-11], [DER-12]),
  confirmation quand les valeurs diffèrent.
- [ ] **L5.9** Annulation d'E21 ; rangement au relâchement (D-D).
- [ ] **L5.10** Bornes [DER-14] à [DER-16].
- [ ] **L5.11** `test:ui` : glisser au pointeur, flèches, Maj, double-clic,
  lien et déliaison, annulation ; l'aperçu change pendant le glisser.
- [ ] **L5.12** Protocole de relecture sur les quatre états de l'éditeur.
- [ ] **L5.13** Ouvrir M3.

Critère : `test:ui` vert sur chaque interaction ; M3 ouvert.

## Lot 6 : planche

Spécification : [section 9](./RECHERCHE-PLUGIN-PALETTES.md#9-sortie-1--la-planche),
[section 16](./RECHERCHE-PLUGIN-PALETTES.md#16-recette-dans-figma).

### 6a : modèle

- [ ] **L6.1** `src/planche/modele.ts` [ARC-07] : arbre pur de cadres, textes,
  couleurs, tailles et noms de calque, calculé depuis la recette rangée
  ([ARC-11]).
- [ ] **L6.2** Cadre de palette §9.2, carte de cran §9.3, table des emplois
  §9.4, grille de contraste §9.5 : [PLA-07] à [PLA-18], [PLA-21] à [PLA-23].
- [ ] **L6.3** Peinture selon le profil du document, table de §6.7.
- [ ] **L6.4** Empreinte du modèle (E2).
- [ ] **L6.5** Tests sur le modèle : chaque exigence `PLA` de 6a, noms de calque
  [PLA-14], texte lisible sur chaque fond [PLA-09] [PLA-13], compte de
  calques par palette relevé et écrit dans le commit.

### 6b : écriture et onglet Planche

- [ ] **L6.6** `src/ecriture/planche.ts` : page (E14, E16), cadres possédés
  [PLA-02], marqueur sur chaque calque posé (D-H), position gardée [PLA-03],
  placement d'E17, recréation [PLA-04].
- [ ] **L6.7** Polices chargées avant tout calque, arrêt sans cadre partiel
  [PLA-22].
- [ ] **L6.8** Dessin palette par palette, progression, `commitUndo`
  ([PLA-06], [PLA-24], E12, D-I).
- [ ] **L6.9** Tests de l'écriture avec un `figma` minimal injecté : propriété
  des cadres, échec de police sans cadre posé, position gardée, ordre des
  `commitUndo`.
- [ ] **L6.10** Onglet Planche de §13.2 ; « Dessiner » actif ; « Voir sur la
  planche » (E18).
- [ ] **L6.11** Galerie : dessin en cours, interrompu, police indisponible,
  confirmation au-delà de six palettes, onglet Planche sans palette.

### 6c : fraîcheur et cas du designer

- [ ] **L6.12** Fraîcheur [PLA-19] [PLA-20] par l'empreinte du modèle.
- [ ] **L6.13** Cadre orphelin [ENT-03], copie de cadre (E15), calques
  étrangers avec confirmation (D-H).
- [ ] **L6.14** Rapport sandbox et interface : chaque dessin renvoie les hexas
  qu'il a peints ; l'interface les compare à son aperçu et signale un écart en
  notice. Un écart attendu vaut zéro.
- [ ] **L6.15** Galerie : planche à jour, périmée, cadre orphelin, copie de
  cadre, calques étrangers, document Display P3.
- [ ] **L6.16** Ouvrir M4 avec la recette de §16 corrigée par E11.

### 6d : reprise de la recette Figma

- [ ] **L6.17** Chaque constat de M4 devient un test, une correction, ou une
  ligne de la spécification. [MOT-25] tranché.
- [ ] **L6.18** Seuil de D-I revu avec le temps mesuré de douze palettes.

Critère : modèle et écriture testés hors de Figma ; M4 rendu par le mainteneur
et repris.

## Lot 7 : reste de la configuration, import, export, rapport

Spécification : [section 8.3](./RECHERCHE-PLUGIN-PALETTES.md#83-la-recette-commune),
[section 10](./RECHERCHE-PLUGIN-PALETTES.md#10-sortie-2--la-recette-et-le-rapport).

- [ ] **L7.1** Configuration, à la suite de 4c : fonds et autres seuils ;
  nombre de palettes touchées par champ [ENT-05] [ENT-07] [ENT-08].
- [ ] **L7.2** Palette, section repliée « Avancé » (parts propres, D-G
  visible).
- [ ] **L7.3** Export de la recette [REC-07] ; import avec écart par
  identifiant et confirmation [REC-08].
- [ ] **L7.4** Gestes de sortie d'une recette illisible ou future (E19).
- [ ] **L7.5** Rapport [VER-01] [VER-02], avec les écarts de L6.14.
- [ ] **L7.6** Galerie : import invalide, écart d'import, états bloquants
  avec leurs gestes.
- [ ] **L7.7** `test:ui` : exporter, modifier le JSON, importer, voir l'écart,
  confirmer, dessiner.

Critère : scénario de L7.7 vert.

## Lot 9 : clôture

- [ ] **L9.1** README du plugin : ouvrir, les deux onglets et la configuration, les limites.
- [ ] **L9.2** AGENTS.md : l'introduction et les limites d'environnement
  parlent de deux plugins ; invariants de §14.4 tous présents avec leur test.
- [ ] **L9.3** `ROADMAP.md` et `docs/README.md` à jour.
- [ ] **L9.4** Dossier de recherche retiré, comme les dossiers livrés avant
  lui ; ce qui reste vrai de la spécification passe dans le README ou dans
  `SPEC.md` du plugin.

## Points mainteneur

| Point | Ouvert par | Ce que le mainteneur fait | Lots qui peuvent avancer sans lui |
|---|---|---|---|
| M0 | L0.1 | Commiter ses fichiers de l'architecture et le diff de `controle-style.mjs`, ou dire quoi en faire | aucun : le lot 0 le demande |
| M1 | L3.14 | Créer le plugin dans Figma, donner l'identifiant, ouvrir le plugin et dire ce qu'il voit | 4, 5 |
| M2 | L2.7 | Choisir une rédaction par message, ou en écrire une | tous ; les textes validés remplacent les provisoires au lot suivant |
| M3 | L5.13 | Régler une dérive dans Figma : fluidité (§16.3), protocole points (a) et (b) | 6a |
| M4 | L6.16 | Rejouer la recette de §16 et rendre ses constats | 7 |
| M5 | L8.9 | Ouvrir UCM Exporter dans Figma, analyser un composant, publier | tous |
| M6 | interlude du lot 2 | Trancher le placement de la configuration, la réaction à une courbe hors garantie et le moment de l'extraction du socle | aucun : l'ordre des lots en dépend |
| M7 | interlude après le lot 8 | Trancher le sort des rôles câblés et valider les textes du lot 2b | tous ; les textes validés remplacent les provisoires au lot 4 |

## Journal des points mainteneur

L'agent ajoute une entrée quand il ouvre un point : le point, la question, ce
qu'il a préparé. Le mainteneur répond sous l'entrée. L'agent reprend la
réponse dans le lot suivant et note le commit qui la traite.

### M0 : fichiers de l'architecture

Question : `scripts/controle-style.mjs` portait un diff non commité. Dans le
dossier « Archi Tokens Multi-marques », cinq fichiers n'étaient pas suivis
(`ARCHITECTURE-FINALE-MULTIMARQUES.md`, `SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md`,
`verifier-courbes.mjs`, `mesurer-derive-teinte.mjs`, `mesurer-rampes.mjs`) et
`RECHERCHE-ARCHI-MULTIMARQUES.md` portait un diff. Préparé : le contrôle de
style passé sur ces fichiers, sans faute.

Réponse du mainteneur : tout commiter. Traité par `bcc4f27`.

### M1 : identifiant du plugin

Question : créer le plugin UCM Palettes dans Figma (Plugins, Development, New
plugin), donner l'identifiant que Figma attribue, puis importer
`packages/plugin-palettes/manifest.json` et dire ce que la fenêtre montre.

Préparé : le manifest porte l'identifiant provisoire `ucm-palettes-provisoire`.
Ce qui ne se prouve pas hors de Figma : l'ouverture à 600 × 720, la lecture de
la recette sous la clé partagée, le thème de Figma servi à l'interface. Sur un
fichier neuf, l'onglet Palettes doit annoncer « Aucune recette dans ce
fichier ».

Réponse du mainteneur : accord pour créer le plugin au lot 3 ; l'identifiant
reste à donner.

### M2 : textes destinés au designer

Question : une rédaction par message, parmi les deux proposées, ou une
rédaction du mainteneur. Préparé :
[TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md), qui couvre les promesses, les
alertes, la notice, les trois bloquants et les vingt-quatre refus de
validation, et se termine par deux questions sur les messages sans geste
franc. D'ici la réponse, l'interface emploie la rédaction A.

### M6 : configuration de la recette et moment du socle

Ouvert pendant le lot 2, à la demande du mainteneur, avec deux autres
décisions : les profils s'appellent `soft` et `vivid` (D12), et le gamut de
fabrication est sRGB.

Constat préparé : la spécification prévoyait déjà l'édition des courbes, des
parts et des seuils, dans un troisième onglet Recette, au lot 7. Aucune règle
ne réagissait à une courbe qui ne tient plus la garantie de l'architecture,
600 à 3:1 et 700 à 4,5:1 contre le cran 50 ; seules les promesses manquées des
palettes existantes l'auraient montré.

Questions posées : où placer la configuration, que faire d'une courbe hors
garantie, et faut-il extraire le socle dès maintenant.

Réponses du mainteneur :

- la configuration s'ouvre par le bouton en forme d'engrenage, comme dans UCM
  Exporter, dans un sous-lot 4c qui suit l'aperçu (D-L) ; le lot 7 garde le
  reste de la configuration, l'import, l'export et le rapport ;
- une courbe hors garantie produit une alerte non bloquante (D-M, `[ENT-10]`) ;
- le socle s'extrait maintenant et en entier : le lot 8 passe avant le lot 3
  (D-B).

Traité par le commit qui porte cette entrée, avant le lot 8.

### M5 : UCM Exporter après l'extraction du socle

Question : ouvrir UCM Exporter dans Figma, analyser un composant, publier, et
dire si quelque chose a changé. Le plugin de développement se réimporte
depuis `packages/plugin-exporter/manifest.json` : le dossier a été renommé
(D-N).

Préparé : pour chaque sous-lot 8a, 8b et 8c, les 186 pages de la galerie
d'UCM Exporter ont le même innerHTML et le même style calculé qu'avant
l'extraction, sur 23 067 éléments. La suite, le typecheck, le build et
`test:ui` sont verts. Ce qui ne se prouve pas hors de Figma : le sandbox
(la fenêtre lit et range sa taille par le socle) et une publication réelle.

Réponse du mainteneur : UCM Exporter réimporté depuis le nouveau manifest ;
l'analyse d'un composant et la publication fonctionnent.

### M7 : rôles câblés et table des emplois

Ouvert par le mainteneur après le lot 8, pendant la mise à jour de
l'architecture multi-marques.

Question : un rôle câblé par marque vers un cran oblige à câbler aussi chacun
de ses états, survol, appui et focus, dans chaque marque et chaque thème.
Faut-il garder le câblage ?

Préparé : une relecture indépendante a mesuré les paires d'état sur une table
fixe, 360 teintes, deux profils, deux modes, en flottant, à 8 bits, avec la
dérive de Tailwind et sous une borne où les deux membres prennent des teintes
indépendantes. Aucune paire n'échoue ; le pire cas vaut 4,79 pour le texte 700
sur la surface 100. Chaque saut d'état dépasse 0,04 en ΔEok. Une couleur de
charte de clarté moyenne donne un cran 700 proche d'elle ; une couleur claire
donne un bouton plus foncé, une couleur quasi noire un bouton gris moyen.

Réponses du mainteneur :

- aucun câblage : la table des emplois est fixe, le fond plein prend le 700
  dans toutes les marques, survol 800, appui 900 (D-O) ;
- pas d'inversion du texte pour une marque claire : le bouton reste au 700,
  avec le texte `on-solid` ;
- la couleur de charte se place au cran dont elle est la plus proche, et le
  plugin avertit quand elle est plus claire que le 700 (`[VER-12]`) ;
- une marque quasi noire garde des boutons gris.

Préparé pour le lot 2b : la spécification, ce plan et
[TEXTES-A-VALIDER.md](./TEXTES-A-VALIDER.md), dont les textes des promesses et
de `[VER-12]` attendent le choix du mainteneur, comme ceux de M2.

Traité dans le moteur par le commit du lot 2b. Les textes restent ouverts
avec M2.
