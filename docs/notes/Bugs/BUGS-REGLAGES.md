# Bugs trouvés : les réglages du plugin

Chasse ouverte sur le travail livré par
[TODO-REGLAGES](../Recherches/Réglages%20du%20plugin/TODO-REGLAGES.md), des
commits `bfbb1d3` à `4d98c37`. Commit de départ de la chasse : `4d98c37`.

Ce relevé est la commande de l'agent qui corrige. Il porte la ligne de base, la
carte des zones à sonder, les constats confirmés et leur reproduction. Il quitte
le dépôt quand la dernière ligne du tableau tombe à zéro.

## 1. Ligne de base

Sur `4d98c37`, tout est vert :

| Commande | Résultat |
|---|---|
| `npm test` | 23 lois à la racine, suite du plugin et des paquets au vert |
| `npm run typecheck` | sans erreur |
| `npm run test:ui --workspace ucm-exporter-plugin` | 10 tests Playwright au vert |
| galerie | les 18 états ajoutés par les lots 2 à 4 existent dans `galerie/etats.cjs` |

Les constats de la section 4 vivent donc tous sous une suite verte. Aucun ne se
voit par une commande de vérification existante.

## 2. Ce que les lots promettent

Les promesses que la chasse met à l'épreuve, et l'endroit qui en répond :

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
- une publication réussie garde son lien et ses points à corriger
  (`tests/interface/interface.test.mjs`) ;
- une `depots` illisible rend une erreur de stockage et n'est jamais écrasée
  (`src/config.ts`, `lireDepots()`) ;
- chaque texte affiché passe les règles de `scripts/controle-style.mjs`.

## 3. Zones et méthode

Sept zones. Les quatre premières portent les constats de la section 4 ; les
trois dernières restent à épuiser.

### Z1. Frontière entre l'occupation de l'interface et l'opération du sandbox

L'interface se déclare occupée à l'envoi et se libère sur un message terminal.
Le sandbox refuse une seconde opération par `operationEnCours`. Les deux états
ne se parlent pas. Sonder chaque fenêtre où l'un est libre et l'autre occupé, et
chaque chemin du sandbox qui rend la main sans message.

Sonde : compter les messages rendus à un numéro d'opération donné.

### Z2. Ce qu'une panne de stockage produit au milieu d'une opération

`lireInstantane()` lève quand `depots` est illisible. Suivre chacun de ses
appelants et regarder ce que le designer lit. Écrire la panne au moment précis
où elle est plausible : entre la création de la demande de fusion et le
rafraîchissement qui la suit, à l'ouverture, entre l'analyse et la publication.

Sonde : `stockage.set('depots', 'corrompu')` posé depuis un doublon d'appel.

### Z3. Gestes destructeurs de la liste des dépôts

La suppression retire une entrée et son jeton, sans retour possible. Sonder
l'armement du second clic, sa durée de vie, et ce qui le désarme.

Sonde : Playwright sur `dist/ui.html`, comme `tests/interface/interface.test.mjs`.

### Z4. Textes affichés

Les textes ajoutés par les lots 2 à 4 passent par `etatDeConnexion`,
`etatDeCarte`, `etatDuDepot`, `TEXTES_DE_REPLI`, `refusDeDestinationChangee` et
les descriptions de `ConfigurationPage`. Les comparer aux textes arrêtés par
[PLAN-REGLAGES](../Recherches/Réglages%20du%20plugin/PLAN-REGLAGES.md) et aux
règles de `scripts/controle-style.mjs`.

Sonde : `node scripts/controle-style.mjs` et lecture ligne à ligne.

### Z5. Fraîcheur croisée des générations

`generationDeConnexion` et `generationsDesDepots` se croisent dans
`testerConnexion()`, `testerDepot()` et les cinq demandes qui les périment.
Sonder les paires : enregistrer pendant un test, activer pendant un
enregistrement, supprimer pendant le test d'un autre, basculer l'export local
pendant le test d'une carte. Vérifier qu'aucune pastille ne reste sur
« Connexion… » et qu'aucune carte n'affiche le test d'un autre dépôt.

### Z6. Identité des cartes de la liste

Une carte vit sous une clé temporaire jusqu'à sa réponse, puis sous son
identité. `ListeDesDepots` retrouve une carte par sa clé, puis par son `id()`.
Sonder les chemins qui laissent une carte enregistrée sous sa clé temporaire :
réponse écartée par `recevoirEnregistrement()`, `liberer()` appelé par l'erreur
de fenêtre, `settings` arrivé avant `depot-enregistre`.

### Z7. Reprise des anciennes clés et écritures en deux temps

`reprendreLAncienneConfiguration()`, `enregistrerDepot()`, `supprimerDepot()` et
`activerDepot()` écrivent en deux temps. Sonder la panne sur la seconde écriture
de chacune : ce que le stockage garde, et ce que l'interface affiche ensuite.

### Comment sonder

Le harnais de `packages/plugin/tests/code.test.ts` joue le routeur réel avec un
faux `figma`. Copier ses 107 premières lignes dans un fichier de sonde, ajouter
les cas, lancer, puis retirer le fichier :

```sh
head -107 packages/plugin/tests/code.test.ts > packages/plugin/tests/sonde.test.ts
# ajouter les cas à la suite
npx tsx --test packages/plugin/tests/sonde.test.ts
rm packages/plugin/tests/sonde.test.ts
```

Le harnais de `packages/plugin/tests/interface/interface.test.mjs` ouvre
`dist/ui.html` dans Chromium. `npm run build:ui --workspace ucm-exporter-plugin`
le reconstruit.

## 4. Constats

| Gravité | Confirmé | Plausible |
|---|---:|---:|
| Critique | 4 | 0 |
| Haute | 1 | 0 |
| Moyenne | 1 | 2 |
| Basse | 0 | 0 |

### [Critique] Une publication réussie est annoncée en échec quand le stockage devient illisible

- **Où** : `packages/plugin/src/code.ts:659`, dans `publier()`
- **Promesse violée** : le verdict dit ce que le designer a entre les mains
  (`src/code.ts`, commentaire du `catch` de `publier()`). La demande de fusion
  existe et le navigateur l'a ouverte.
- **Verdict** : confirmé
- **Scénario** : `publishArtifact()` rend `created`, le lien part vers
  l'interface, `openExternal()` ouvre la demande. La ligne
  `if (destinationAnnoncee === analyse.destination) await refreshConfiguration();`
  se trouve dans le `try`. `refreshConfiguration()` appelle
  `parLaFile(lireInstantane)`, qui lève quand `depots` est devenue illisible.
  Le `catch` de la publication traite ce rejet comme un échec de publication :
  il écrit « Échec GitHub. Le fichier a été téléchargé sur votre poste. »,
  télécharge le contrat, et propose « Réessayer la publication ». Un second clic
  ouvre une seconde demande de fusion pour le même contrat.
- **Reproduction** : sonde sur le harnais de `code.test.ts`.

  ```ts
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  h.publication.traiter = async () => {
    h.stockage.set('depots', 'corrompu');
    return { status: 'created', path: 'x.contract.json', pullRequestUrl: 'https://github.com/o/r/pull/1' };
  };
  await h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  ```

  Sortie observée : `publications=1`, un téléchargement, le statut
  `error:Échec GitHub. Le fichier a été téléchargé sur votre poste.` et le
  verdict `Échec de la publication. […] | action=Réessayer la publication`.
- **Garde-fou** : `tests/code.test.ts`, « une panne de lecture du stockage
  pendant la publication conserve le téléchargement », pose la panne avant la
  publication, jamais après.
- **Piste de correction** : sortir le rafraîchissement du `try` de la
  publication, ou l'appeler avec son propre `catch`. Le succès est acquis dès
  que `publishArtifact()` a rendu.

### [Critique] Une demande envoyée pendant la fin d'une opération est jetée sans réponse

- **Où** : `packages/plugin/src/code.ts:437` et `packages/plugin/src/code.ts:597`
- **Promesse violée** : « la fin d'une opération libère l'interface même quand
  son résultat est écarté » ([TODO-REGLAGES](../Recherches/Réglages%20du%20plugin/TODO-REGLAGES.md),
  lot 0). L'interface se déclare occupée à l'envoi, et le sandbox ne lui répond
  jamais.
- **Verdict** : confirmé
- **Scénario** : dans le `catch` de `publier()`, `postStatus('error', …)` part
  avant `await parLaFile(lireInstantane)`. L'interface lit ce statut, appelle
  `occuper(false)` et rend les boutons. Le sandbox, lui, garde
  `operationEnCours` jusqu'à la fin de sa lecture. Un clic sur « Analyser le
  composant » dans cette fenêtre atteint `analyser()`, qui rencontre
  `if (operationEnCours !== null) return;` et rend la main sans message.
  L'interface a incrémenté `operationLancee` et posé `occupee = true` : plus
  aucun bouton ne répond, et seul un redémarrage du plugin en sort.
- **Reproduction** : sonde sur le harnais de `code.test.ts`.

  ```ts
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const lente = differe<void>();
  let apresEchec = false;
  const getAsync = h.runtime.clientStorage.getAsync;
  h.runtime.clientStorage.getAsync = async (cle: string) => {
    if (apresEchec && cle === 'depots') await lente.promesse;
    return getAsync(cle);
  };
  h.publication.traiter = async () => { apresEchec = true; throw new Error('boum'); };
  const publication = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await tourner();
  const avant = h.messages.length;
  const analyse = h.envoyer({ type: 'analyser-composant', operation: 3 });
  await tourner();
  // h.messages.slice(avant) ne contient aucun message d'opération 3.
  ```

  Sortie observée : le dernier statut porte l'opération 2 et l'état `error` ;
  l'opération 3 reçoit zéro message.
- **Garde-fou** : `tests/code.test.ts`, « deux demandes simultanées ne lancent
  qu'une analyse », compte les analyses. Aucun test ne compte les réponses.
- **Piste de correction** : deux gestes, l'un suffit mais les deux tiennent
  ensemble. Répondre au refus : `analyser()` et `publier()` postent un statut
  d'erreur portant le numéro reçu avant de rendre la main. Et ne libérer
  l'interface qu'après la dernière écriture du sandbox : dans le `catch` de
  `publier()`, lire la destination avant de poster le statut d'échec.

### [Critique] Une publication réussie tient l'interface occupée pendant tout le test de connexion

- **Où** : `packages/plugin/src/code.ts:659`, dans `publier()`
- **Promesse violée** : le statut de succès conclut l'opération. Ici il attend
  un aller-retour réseau qui ne la concerne pas.
- **Verdict** : confirmé
- **Scénario** : après la demande de fusion, `await refreshConfiguration()`
  lance `testerConnexion()`, donc `diagnostiquerConnexion()`, donc deux
  requêtes vers la forge. `postStatus('success', …)` ne part qu'ensuite.
  Pendant ce temps, l'interface garde `aria-busy`, les deux cartes inertes et
  le bouton de publication désactivé. Une forge lente ou injoignable étire
  cette attente jusqu'au délai du réseau, sur une opération déjà terminée.
- **Reproduction** : sonde sur le harnais de `code.test.ts`.

  ```ts
  const h = ouvrir();
  h.connecter();
  await h.envoyer({ type: 'ui-ready' });
  await h.envoyer({ type: 'analyser-composant', operation: 1 });
  const lent = differe<Diagnostic>();
  h.connexionDe.traiter = async () => lent.promesse;
  const enVol = h.envoyer({ type: 'publier', genre: 'component', operation: 2 });
  await tourner();
  await tourner();
  // h.appels.publications vaut 1, le message `demande` est parti,
  // aucun statut `success` n'est encore posté.
  ```

  Sortie observée : `demande=true succes=false publications=1`.
- **Garde-fou** : aucun test ne regarde l'ordre du succès et du test de
  connexion.
- **Piste de correction** : poster le succès avant le rafraîchissement, et
  lancer celui-ci sans l'attendre. Le même geste referme le constat précédent.

### [Critique] Une liste de dépôts illisible laisse l'interface sans réglages et sans issue

- **Où** : `packages/plugin/src/config.ts:228` et `packages/plugin/src/code.ts:750`
- **Promesse violée** : « une `depots` illisible rend une erreur de stockage »
  ([TODO-REGLAGES](../Recherches/Réglages%20du%20plugin/TODO-REGLAGES.md),
  lot 3a). Le message existe et n'atteint jamais le designer.
- **Verdict** : confirmé
- **Scénario** : à l'ouverture, `refreshConfiguration()` lève. `traiterMessage`
  remonte l'erreur à `figma.ui.onmessage`, qui appelle `signalerEchec()` et
  écrit « La demande n'a pas abouti. Réessayez ; si l'erreur persiste, relancez
  le plugin. ». Le message
  « La liste des dépôts enregistrés sur ce poste est illisible. » est perdu.
  Aucun `settings` ne part : la pastille reste vide, l'onglet Dépôts reste
  vide, et la carte des tokens reste masquée, puisque son affichage dépend du
  `settings` qui n'arrive pas. « Ajouter un dépôt » échoue à son tour, sur la
  même lecture. Relancer le plugin rejoue la même ouverture.
- **Reproduction** : sonde sur le harnais de `code.test.ts`.

  ```ts
  const h = ouvrir();
  h.stockage.set('depots', 'corrompu');
  await h.envoyer({ type: 'ui-ready' });
  ```

  Sortie observée : messages
  `['schema-version', 'cible', 'tokens', 'status']`, et pour seul statut
  `error:La demande n'a pas abouti. Réessayez ; si l'erreur persiste, relancez
  le plugin.`.
- **Garde-fou** : `tests/config.test.ts` vérifie que `lireDepots()` lève et que
  la reprise n'écrase pas. Aucun test ne suit ce que le designer voit.
- **Piste de correction** : faire remonter le message de `lireDepots()` jusqu'à
  la pastille et à l'onglet Dépôts, et offrir une sortie. Une liste illisible
  reste une configuration de ce poste : le designer doit pouvoir la remplacer,
  ou au minimum lire pourquoi le plugin ne répond plus. Le texte se relit avec
  `rediger-diagnostics-ucm`.

### [Haute] « Confirmer la suppression » ne se désarme jamais

- **Où** : `packages/plugin/src/ui/components/CarteDepot.ts:255`
- **Promesse violée** : « Suppression au second clic »
  ([PLAN-REGLAGES](../Recherches/Réglages%20du%20plugin/PLAN-REGLAGES.md),
  4.7). Le second clic doit suivre le premier, pas survivre à la session.
- **Verdict** : confirmé
- **Scénario** : le premier clic pose `supprimer.dataset.confirme = 'oui'` et
  change le libellé. Rien ne repose ce marqueur : ni le repli de la carte, ni
  un changement d'onglet, ni un `settings`, ni une erreur de suppression, ni
  un retour à l'écran de travail. Un clic accidentel arme donc le bouton pour
  toute la durée de la session ; un clic ultérieur sur la même carte, dépliée
  pour une autre raison, retire le dépôt et son jeton sans confirmation.
- **Reproduction** : lecture du code. `grep -n confirme
  packages/plugin/src/ui/components/CarteDepot.ts` rend deux lignes, toutes
  deux dans le gestionnaire du clic.
- **Garde-fou** : `tests/interface/interface.test.mjs`, « la suppression attend
  un second clic », enchaîne les deux clics sans rien faire entre eux.
- **Piste de correction** : désarmer dans `deplier(false)`, dans `poser()` et
  après un échec de suppression. Ajouter au test Playwright un geste entre les
  deux clics : replier la carte, la déplier, puis cliquer une fois.

### [Moyenne] Deux textes affichés sortent des règles du dépôt

- **Où** : `packages/plugin/src/connexion.ts:334` et
  `packages/plugin/src/ui/components/ConfigurationPage.ts:19`
- **Promesse violée** : `scripts/controle-style.mjs` et la skill
  `rediger-sans-tics-ia` refusent « permet de » ; tous les autres textes du
  plugin emploient l'apostrophe courbe.
- **Verdict** : confirmé
- **Scénario** : le résumé de destination écrit « Attention, le
  ucm.config.json de ce repository n'est pas configuré. » et « Le fichier de
  configuration ucm.config.json permet de définir l'endroit où seront poussés
  les composants et les tokens. » : apostrophes droites, et « permet de ». La
  description de l'onglet Dépôts écrit « Permet de configurer les dépôts où les
  contrats et tokens sont déposés. », là où le plan avait arrêté « Les dépôts
  où les exports sont déposés, et le jeton qui autorise chacun. ». Ces textes
  échappent au contrôle parce qu'il ne juge que les fichiers suivis pour les
  tics de rédaction, et que « permet de » n'est pas dans sa liste.
- **Reproduction** : `grep -rn "permet de\|Permet de" packages/plugin/src/`.
- **Garde-fou** : `tests/stylesUi.test.ts` vérifie les classes, pas les
  phrases.
- **Piste de correction** : réécrire les trois phrases avec
  `rediger-diagnostics-ucm`, apostrophes courbes comprises. Ajouter « permet
  de » aux tics de `scripts/controle-style.mjs`, dans le même commit, avec son
  rouge constaté.

### [Moyenne, plausible] Une carte peut se dédoubler après une erreur de fenêtre

- **Où** : `packages/plugin/src/ui/components/ListeDesDepots.ts:139`
- **Verdict** : plausible, non reproduit
- **Scénario** : `liberer()`, appelé par le gestionnaire d'erreur de la
  fenêtre, pose `requeteEnVol = null` sur chaque carte. Une réponse
  `depot-enregistre` arrivée ensuite est écartée par
  `recevoirEnregistrement()`, qui rend `false` : la carte garde sa clé
  temporaire et son `id()` reste nul. Le dépôt, lui, est enregistré. Le
  `settings` suivant ne retrouve la carte ni par la clé ni par l'identité, et
  en crée une seconde pour le même dépôt, à côté de la première.
- **Piste de correction** : migrer la clé dès que la réponse porte un `id`,
  indépendamment de `requeteEnVol`.

### [Moyenne, plausible] Une activation à moitié écrite laisse l'interface muette

- **Où** : `packages/plugin/src/code.ts:824`
- **Verdict** : plausible, non reproduit
- **Scénario** : `activerDepot()` écrit `depotActif`, puis `exportLocal`. Si la
  seconde écriture échoue, `parLaFile()` rejette, `refreshConfiguration()`
  n'est jamais appelée, et `traiterMessage` remonte l'erreur à
  `signalerEchec()`. Le stockage porte le dépôt nouveau, l'interface montre
  l'ancien, et rien ne dit lequel recevra l'export suivant.
- **Piste de correction** : rafraîchir la configuration dans tous les cas, y
  compris après un rejet de la file, pour les quatre demandes qui écrivent en
  deux temps.

## 5. Ce qui reste à sonder

Les zones Z5, Z6 et Z7 ne sont pas épuisées. L'agent qui corrige les reprend
après les constats confirmés, avec la même méthode : une sonde, une sortie
observée, un test qui la retient.
