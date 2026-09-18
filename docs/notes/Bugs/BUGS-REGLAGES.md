# Chasse aux bugs : les réglages du plugin

Liste d'exécution de la chasse ouverte sur le travail livré par
[TODO-REGLAGES](../Recherches/Réglages%20du%20plugin/TODO-REGLAGES.md), commits
`bfbb1d3` à `4d98c37`.

Ce document se suffit à lui-même : un agent qui ne connaît ni la chasse ni le
chantier y trouve la ligne de base, les règles de conduite, ce qui est corrigé,
ce qui reste, et la méthode de sonde. Il quitte le dépôt quand la dernière case
de la section 5 est cochée.

Une case se coche dans le commit qui livre sa preuve.

## 0. Règles de conduite

- [x] Lire [`AGENTS.md`](../../../AGENTS.md), puis
      [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) sections « Code », « Tests »,
      « Interface du plugin » et « Documentation ».
- [x] Avant toute phrase écrite, dans un document ou dans un commentaire,
      charger `.agents/skills/rediger-sans-tics-ia`. Avant tout texte affiché au
      designer, charger aussi `.agents/skills/rediger-diagnostics-ucm`.
- [x] Un lot se commite seul et laisse les cinq commandes de la section 1 au
      vert.
- [x] Une loi nouvelle se voit rouge avant d'être crue : casser ce qu'elle
      protège, constater l'échec, restaurer par copie, et le dire dans le
      message de commit.
- [x] Ne jamais lancer `git checkout -- <fichier>` sur un travail non commité.
- [x] Éditer par Write et Edit. Un script Python en mode texte convertit le
      fichier en CRLF, et deux lois du dépôt échouent alors sur des phrases
      intactes. Un heredoc avale les antislashs d'une regex.
- [x] Travailler sur `main`, sans branche ni pull request. D'autres sessions
      écrivent dans le même arbre : lire `git status` avant chaque commit et
      commiter par `git commit --only <chemins>`. Pousser après chaque commit,
      sans rebase.
- [x] Un message de commit multiligne passe par un fichier et `git commit -F`.
      Les here-strings PowerShell ne fonctionnent pas dans l'outil Bash.
- [x] Aucun jeton, aucune adresse de projet privé ni aucun nom d'équipe cliente
      dans un test, un état de galerie ou un commit : employer
      `mon-org/design-system-v3`, `mon-groupe/design-system` et `recette-web`.
- [x] Le plugin est privé (`"private": true`) : ne monter aucune version et ne
      publier aucun paquet.

## 1. Ligne de base

Les cinq commandes de vérification, depuis la racine :

```sh
npm test
npm run typecheck
npm run build
npm run test:ui --workspace ucm-exporter-plugin
npm run galerie --workspace ucm-exporter-plugin
```

Sur `28f8b6b`, les cinq sont vertes : 788 tests pour le plugin, 13 tests
Playwright, 51 états de galerie atteignables.

Elles étaient déjà toutes vertes sur `4d98c37`, avant le premier constat. Aucun
bug de cette liste ne se voyait par une commande existante : chacun a demandé
une sonde écrite pour lui.

## 2. Ce que les lots promettent

Les promesses mises à l'épreuve, et l'endroit qui en répond :

- une opération porte sa destination et son numéro, et l'interface écarte un
  résultat qui vient d'ailleurs (`src/messages.ts`, `Provenance` ;
  `src/ui/index.ts`, `resultatActuel()`) ;
- la fin de la dernière opération libère l'interface, même quand son résultat
  est écarté (`src/ui/index.ts`, `finDeLOperation()`) ;
- toute écriture de configuration et toute lecture qui prépare une opération
  passent par une file, et un rejet ne bloque pas la demande suivante
  (`src/code.ts`, `parLaFile()`) ;
- un test dont la génération n'est plus la dernière ne poste rien
  (`src/code.ts`, `generationDeConnexion`, `generationsDesDepots`) ;
- un jeton ne part que vers le dépôt qui l'a reçu (`src/config.ts`,
  `validateSettings()`) ;
- une `depots` illisible rend une erreur de stockage et n'est jamais écrasée
  (`src/config.ts`, `lireDepots()`) ;
- tout texte du plugin qui nomme une forge emploie les mots de cette forge
  (`src/forges/termes.ts` ; `tests/motsDeForge.ts`, lu par `tests/galerie.test.ts`
  et `tests/textesAffiches.test.ts`).

## 3. Méthode de sonde

Le harnais de `packages/plugin/tests/code.test.ts` joue le routeur réel avec un
faux `figma`. Ses 107 premières lignes portent `ouvrir()`, qui rend `messages`,
`appels`, `stockage`, `envoyer()`, `connecter()` et les points d'injection
`exporte`, `publication`, `connexionDe` et `resumeDesTokens`. Copier ces lignes
dans un fichier de sonde, ajouter les cas, lancer, puis retirer le fichier :

```sh
head -107 packages/plugin/tests/code.test.ts > packages/plugin/tests/sonde.test.ts
# ajouter les cas à la suite
npx tsx --test packages/plugin/tests/sonde.test.ts
rm packages/plugin/tests/sonde.test.ts
```

`tourner()` laisse le routeur avancer jusqu'à sa prochaine attente réelle, et
`differe<T>()` rend une promesse que le test résout quand il veut : les deux
servent à saisir une fenêtre entre deux messages.

Le harnais de `packages/plugin/tests/interface/interface.test.mjs` ouvre
`dist/ui.html` dans Chromium et pilote l'interface réelle.
`npm run build:ui --workspace ucm-exporter-plugin` la reconstruit.

`packages/plugin/tests/textesAffiches.test.ts` juge les phrases des fichiers
qui portent les textes de l'interface. `scripts/controle-style.mjs` juge les
documents et les commentaires, jamais les chaînes affichées.

## 4. Constats corrigés

| Gravité | Corrigé | Ouvert |
|---|---:|---:|
| Critique | 4 | 0 |
| Haute | 1 | 0 |
| Moyenne | 4 | 0 |
| Basse | 1 | 0 |

Le compte porte sur les constats. Une zone sondée sans constat se range aussi
ici, sous « Sans constat », avec les lois qu'elle laisse derrière elle.

### [Critique] Une publication réussie annoncée en échec

- [x] Corrigé par `439691b`.
- **Où** : `src/code.ts`, `publier()`.
- **Scénario** : `publishArtifact()` rendait `created`, le lien partait,
  `openExternal()` ouvrait la demande de fusion. La ligne
  `if (destinationAnnoncee === analyse.destination) await refreshConfiguration();`
  se trouvait dans le `try`. `refreshConfiguration()` appelle
  `parLaFile(lireInstantane)`, qui lève quand `depots` est devenue illisible. Le
  `catch` de la publication traitait ce rejet comme un échec : il écrivait
  « Échec GitHub. Le fichier a été téléchargé sur votre poste. », téléchargeait
  le contrat, et proposait « Réessayer la publication ». Un second clic aurait
  ouvert une seconde demande de fusion pour le même contrat.
- **Correction** : le succès se poste dès que la forge a répondu. Le
  rafraîchissement part ensuite, sans être attendu.
- **Test** : `code.test.ts`, « une liste illisible après la demande de fusion
  garde le succès de la publication » et sa jumelle sur le stockage
  indisponible.

### [Critique] Une demande jetée sans réponse bloque l'interface

- [x] Corrigé par `439691b`.
- **Où** : `src/code.ts`, `analyser()` et `publier()`.
- **Scénario** : dans le `catch` de `publier()`, `postStatus('error', …)`
  partait avant `await parLaFile(lireInstantane)`. L'interface lisait ce statut,
  appelait `occuper(false)` et rendait les boutons, pendant que le sandbox
  gardait `operationEnCours`. Un clic sur « Analyser le composant » dans cette
  fenêtre atteignait `if (operationEnCours !== null) return;` et rendait la main
  sans message. L'interface avait incrémenté `operationLancee` et posé
  `occupee = true` : plus aucun bouton ne répondait, et seul un redémarrage du
  plugin en sortait.
- **Correction** : la dernière lecture du sandbox passe avant le statut d'échec,
  et les deux refus postent `OPERATION_DEJA_EN_COURS` avec le numéro reçu.
- **Test** : `code.test.ts`, « une demande arrivée pendant la fin d'une
  publication reçoit une réponse portant son numéro ».

### [Critique] Une publication réussie tenait l'interface occupée

- [x] Corrigé par `439691b`.
- **Où** : `src/code.ts`, `publier()`.
- **Scénario** : après la demande de fusion, `await refreshConfiguration()`
  lançait `testerConnexion()`, donc deux requêtes vers la forge.
  `postStatus('success', …)` ne partait qu'ensuite. Pendant ce temps,
  l'interface gardait `aria-busy`, les deux cartes inertes et le bouton de
  publication désactivé, sur une opération déjà terminée.
- **Correction** : la même que le premier constat.
- **Test** : `code.test.ts`, « le succès d'une publication précède le test de
  connexion qu'elle relance ».

### [Critique] Une liste de dépôts illisible sans issue

- [x] Corrigé par `439691b`.
- **Où** : `src/config.ts`, `lireDepots()` ; `src/code.ts`, routeur.
- **Scénario** : à l'ouverture, `refreshConfiguration()` levait.
  `figma.ui.onmessage` appelait `signalerEchec()` et écrivait « La demande n'a
  pas abouti. ». Le message
  « La liste des dépôts enregistrés sur ce poste est illisible. » était perdu.
  Aucun `settings` ne partait : la pastille restait vide, l'onglet Dépôts
  restait vide, et la carte des tokens restait masquée, puisque son affichage
  dépend de ce `settings`. « Ajouter un dépôt » échouait sur la même lecture, et
  relancer le plugin rejouait la même ouverture.
- **Correction** : `DepotsIllisibles` porte son propre type d'erreur. La
  pastille dit « Réglages illisibles », l'onglet Dépôts montre le constat, le
  geste et « Réinitialiser la liste », et `reinitialiser-depots` écrit une liste
  vide sans la lire.
- **Test** : `code.test.ts`, « une liste de dépôts illisible dit son constat et
  son geste, et la réinitialisation rend la liste ». État de galerie
  `depots-illisibles`.

### [Haute] « Confirmer la suppression » armé pour la session

- [x] Corrigé par `adfdd79`.
- **Où** : `src/ui/components/CarteDepot.ts`.
- **Scénario** : le premier clic posait `supprimer.dataset.confirme = 'oui'` et
  changeait le libellé. Rien ne reposait ce marqueur : ni le repli de la carte,
  ni un changement d'onglet, ni un `settings`, ni un échec de suppression. Un
  clic accidentel armait le bouton pour toute la session, et un clic ultérieur
  sur la même carte retirait le dépôt et son jeton sans confirmation.
- **Correction** : `desarmerLaSuppression()`, appelée au `blur` du bouton, au
  repli de la carte et par `liberer()`.
- **Test** : `interface.test.mjs`, « la suppression armée se désarme dès que le
  clic suivant va ailleurs ».

### [Moyenne] Deux textes affichés hors des règles du dépôt

- [x] Corrigé par `adfdd79`.
- **Où** : `src/connexion.ts`, `etatDuDepot()` ;
  `src/ui/components/ConfigurationPage.ts`, `DESCRIPTIONS`.
- **Scénario** : le résumé de destination écrivait « Attention, le
  ucm.config.json de ce repository n'est pas configuré. » et « Le fichier de
  configuration ucm.config.json permet de définir l'endroit où seront poussés
  les composants et les tokens. » : apostrophes droites, et « permet de », que
  la skill `rediger-sans-tics-ia` refuse. La description de l'onglet Dépôts
  écrivait « Permet de configurer les dépôts où les contrats et tokens sont
  déposés. », là où le plan avait arrêté « Les dépôts où les exports sont
  déposés, et le jeton qui autorise chacun. ».
- **Correction** : les trois phrases réécrites, apostrophes courbes comprises.
- **Test** : `textesAffiches.test.ts`, ses deux lois.

### [Moyenne] Aucun contrôle ne lisait les textes affichés

- [x] Corrigé par `adfdd79`, pour le plugin.
- **Où** : `scripts/controle-style.mjs`, `fautesDeLaSource()`.
- **Scénario** : `fautesDeLaSource()` ne juge que les blocs de commentaire d'une
  source. Les chaînes que le plugin affiche n'étaient lues par aucune règle, et
  c'est par là que le constat précédent est entré.
- **Correction** : `packages/plugin/tests/textesAffiches.test.ts` juge les
  phrases des six fichiers qui portent les textes de l'interface.
- **Mesure qui a écarté l'autre voie** : ajouter « permet de » à
  `INTENSIFICATEURS` de `scripts/controle-style.mjs` fait tomber 12 emplois dans
  le dépôt, tous sur des commentaires qui donnent le mécanisme dans la même
  phrase, pour un seul texte affiché fautif. Une règle qui refuse 12 emplois
  justes pour en attraper un se désarme au premier contournement. La piste est
  close.

### [Moyenne] Une carte dédoublée après une erreur de fenêtre

- [x] Corrigé par `adfdd79`.
- **Où** : `src/ui/components/ListeDesDepots.ts`, `recevoirEnregistrement()`.
- **Scénario** : `liberer()`, appelée par le gestionnaire d'erreur de la
  fenêtre, pose `requeteEnVol = null` sur chaque carte. Une réponse
  `depot-enregistre` arrivée ensuite était écartée, la carte gardait sa clé
  temporaire et son `id()` restait nul. Le dépôt, lui, était enregistré. Le
  `settings` suivant ne retrouvait la carte ni par la clé ni par l'identité, et
  en créait une seconde pour le même dépôt.
- **Correction** : la clé suit l'identité dès que le sandbox en rend une, avant
  la remise de la réponse à la carte.
- **Test** : `interface.test.mjs`, « une réponse d'enregistrement arrivée après
  une erreur de fenêtre ne dédouble pas la carte ».

### [Moyenne] Une écriture à moitié faite laissait l'interface muette

- [x] Corrigé par `adfdd79`.
- **Où** : `src/code.ts`, demandes `activer-depot` et `supprimer-depot`.
- **Scénario** : `activerDepot()` écrit `depotActif`, puis `exportLocal` ;
  `supprimerDepot()` écrit `depots`, puis retire `depotActif`. Si la seconde
  écriture échouait, `parLaFile()` rejetait, `refreshConfiguration()` n'était
  jamais appelée, et l'erreur remontait à `signalerEchec()`. Le stockage portait
  l'état nouveau, l'interface montrait l'ancien.
- **Correction** : le rafraîchissement a lieu dans un `finally`.
- **Test** : `code.test.ts`, ses deux lois sur la seconde écriture.

### [Moyenne] Un mot de GitHub servi à un utilisateur GitLab

- [x] Corrigé par `04e7880`.
- **Où** : `src/connexion.ts`, `etatDuDepot()` et `etatDeConnexion()` ;
  `src/prevol.ts`, `ordreDesTokens()` et `verdictDePrevol()` ; `src/code.ts`,
  `analyser()` ; `src/depot.ts`, `repositoryLayout()`, `ligneDeFormatDeTokens()`
  et `lignesDIdentite()`.
- **Scénario** : `repository` est `TERMES_GITHUB.depot`. Six phrases affichées le
  portaient en clair alors qu'elles servent les deux forges : « Ce repository le
  déclare dans son ucm.config.json. » dans la carte de l'onglet Dépôts et sous
  la carte du composant, « Ce repository n'a pas encore de tokens : publiez-les
  et faites fusionner leur merge request… », qui mélangeait les deux
  vocabulaires dans la même phrase, la phase « Lecture du repository… », le
  refus d'un `ucm.config.json` illisible, et les deux lignes de format que la
  demande de fusion porte. Les replis de `etatDeConnexion()` et de
  `verdictDePrevol()` valaient aussi `repository`, là où `etatDeCarte()` écrivait
  déjà « dépôt ».
- **Correction** : ces phrases écrivent « dépôt », comme la branche voisine
  « Ce dépôt ne déclare aucun ucm.config.json. ». La seconde piste, passer
  `termes` à `etatDuDepot()`, est close : la branche fautive est atteinte sans
  dépôt visé, donc sans forge à nommer.
- **Test** : `tests/motsDeForge.ts` porte les mots de chaque forge pour les deux
  lois qui cherchent celui d'une autre. `galerie.test.ts` les cherche dans les
  messages d'un état ; `textesAffiches.test.ts`, « aucune phrase affichée ne
  nomme une seule forge », les cherche dans les littéraux de huit sources.
- **Mesure qui a corrigé l'énoncé** : `repository` ajouté à `MOTS` fait tomber
  sept états GitLab, et non le seul `gitlab-connecte` que cette liste attendait.
  `projet` et `jeton d'accès` restent hors de la liste : ce sont aussi le
  français ordinaire et le repli des textes écrits avant qu'une forge soit
  connue.

### [Basse] `enAttenteDeTest` gardait une carte dont le test n'arrive jamais

- [x] Corrigé par `84f4910`.
- **Où** : `src/ui/components/ListeDesDepots.ts`, `recevoirTest()`.
- **Scénario** : une carte entrait dans `enAttenteDeTest` à chaque
  enregistrement accepté et n'en sortait que sur un `depot-teste` terminal, quel
  qu'il soit. Le sandbox annonce un test en `checking`, puis rend son résultat
  sous la même génération, ou ne rend rien si cette génération a été périmée
  entre les deux. Dans ce cas la carte restait armée, et le test suivant de son
  dépôt, posté par le rafraîchissement qui suit une activation, la repliait
  longtemps après l'enregistrement, alors que le designer venait de la déplier.
- **Sonde** : harnais Chromium. Enregistrement accepté, `checking` sans
  résultat, `settings`, puis un test complet d'une génération suivante : la
  carte se repliait. Le témoin d'à côté, une carte jamais enregistrée, restait
  dépliée sous le même test.
- **Correction** : la carte retient la génération annoncée après son
  enregistrement et ne se replie que sur le résultat qui la porte ; un résultat
  d'une autre génération la désarme sans la replier. Les cartes que `settings`
  retire sortent aussi de l'ensemble.
- **Test** : `interface.test.mjs`, « une carte dont le test a été périmé ne se
  replie pas sur le test suivant de son dépôt ».
- **Constat annexe** : la loi voisine sur le repli après enregistrement envoyait
  son `checking` en génération 1 et son résultat en génération 2, ce que le
  sandbox n'écrit jamais. Elle emploie désormais une seule génération.

### [Sans constat] Zone Z5, fraîcheur croisée des générations

- [x] Zone épuisée par `28f8b6b`.
- **Où** : `src/code.ts`, `generationDeConnexion` pour la pastille et la
  destination, `generationsDesDepots` pour chaque carte, croisées dans
  `testerConnexion()`, `testerDepot()` et les six demandes qui les périment.
- **Sondé** : enregistrer pendant le test du dépôt actif, activer pendant un
  enregistrement, supprimer un autre dépôt pendant un test, basculer l'export
  local pendant un test, réinitialiser pendant un test. Aucun croisement ne
  laisse la pastille ni une carte encore listée sur « Connexion… », et aucune
  carte n'affiche le test d'un autre dépôt.
- **Point d'attention tranché** : `testerDepot()` ne lit que
  `generationsDesDepots`. Un test lancé avant la bascule de l'export local rend
  donc son résultat après elle, sur sa seule carte, la pastille et la
  destination restant celles de l'export local. C'est correct, et lui faire lire
  `generationDeConnexion` serait une faute : la carte resterait sur
  « Connexion… » après cette bascule comme après la suppression d'un autre
  dépôt. Les deux premières lois ci-dessous rougissent sous cette correction.
- **Lois** : `code.test.ts`, « une demande qui croise le test d'une carte laisse
  la pastille et les cartes sur un état terminal », « un test de carte rendu
  après la bascule de l'export local ne touche que sa carte » et « enregistrer
  un dépôt pendant le test du dépôt actif laisse les deux cartes sur leur
  résultat ».

## 5. Ce qui reste

### C1. Zone Z6, identité des cartes de la liste

- [ ] Épuiser la zone.
- Une carte vit sous une clé temporaire jusqu'à sa réponse, puis sous son
  identité. Sonder les chemins restants qui laisseraient les deux en désaccord :
  `settings` arrivé avant `depot-enregistre`, deux cartes nouvelles dont les
  réponses se croisent, une carte supprimée pendant que son enregistrement est
  en vol.
- Point d'attention relevé sans être sondé : `corps.id` vaut `corps-<clé>`, donc
  `corps-github:mon-org/ds` pour une carte enregistrée. L'identifiant reste
  valide en HTML et `aria-controls` le retrouve, mais aucun sélecteur CSS ne
  peut le viser sans échappement. Vérifier qu'aucun code ne tente de le faire.

### C2. Zone Z7, reprise des anciennes clés

- [ ] Sonder la reprise.
- `reprendreLAncienneConfiguration()` ouvre la file du stockage et lit quatre
  clés du plugin à un seul dépôt. Les écritures en deux temps de
  `activerDepot()` et `supprimerDepot()` sont traitées ; la reprise ne l'est
  pas.
- Sonder : une panne sur l'écriture de `depots`, une panne sur chaque
  effacement, une `depots` illisible pendant la reprise, et une ancienne
  configuration sans `baseBranch`, que la reprise remplace par `main` sans le
  dire.

### C3. Points relevés sans gravité établie

- [ ] Trancher chacun : faute ou choix.
- `signalerEchec()` ne poste rien quand `operationEnCours !== null` : une panne
  hors opération reste alors muette dans l'interface, et n'apparaît que dans la
  notification Figma.
- `publier()` lance `void refreshConfiguration().catch(signalerEchec)` après le
  succès. Une panne de ce rafraîchissement écrit donc une note d'erreur
  par-dessus la note de succès de la publication.
- `cleDeDestination(null, true)` sert de repli dans `analyser()` quand la
  lecture du stockage échoue. Ce repli suppose la gestion des tokens activée,
  quel que soit le réglage réel.
- `generationsDesDepots` n'est jamais purgée : une entrée y reste après la
  suppression de son dépôt.
- `Interrupteur` pose `aria-checked="false"` à sa création. Le réglage
  « Gérer les tokens » vaut `true` par défaut : l'interrupteur montre donc
  l'état inverse jusqu'au premier `settings`.
