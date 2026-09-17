# Bugs trouvés — zone 1 : lecteurs du kit

Zone 1 en cours. Commit de départ : `34e584c`. Relevé du 17 septembre 2026.

## 1. Ligne de base

`npm run build --workspace @ucm-kit/core` passe. La suite `node --test packages/kit/tests/*.test.mjs` compte 309 succès et un échec : le relevé des refus enregistrés, décrit en section 3.

Les commits `fix(kit,` ou `fix(cli,kit)` des 80 derniers commits sont les suivants :

- `298eca0 fix(kit,cli): la CI n'expose plus le jeton au code du repository, et un chemin de configuration reste dans le repository`
- `58c4dde fix(cli,kit): le guide protège ses entrées et vérifie ses graphes, et les lecteurs de modes ne laissent plus passer trois fautes`

## 2. Invariants et autorités

- Les champs nécessaires à la lecture sont vérifiés sans ambiguïté. `validation-contrat.mjs:1700`, `champsInvalidesDuContrat()` ; `packages/kit/tests/validation-contrats.test.mjs`.
- Les dépendances locales existent, leurs slots concordent et leur graphe reste acyclique. `validation-graphe-contrats.mjs:167`, `validerCycles()` ; `packages/kit/tests/validation-contrats.test.mjs` couvre les cycles courts, mais pas la profondeur.
- La fenêtre de contrats est explicite et le sens de l'écart décide du geste. `version-contrat.mjs:24`, `verdictDeVersion()` ; `packages/kit/tests/version-contrat.test.mjs`.
- La marque des tokens est classée avant toute feuille ; la version future et la marque invalide refusent le contrôle. `controle-repository.mjs:677`, `etatDuFormatDeTokens()` ; `packages/kit/tests/controleRepository.test.mjs`.
- Les axes de modes restent cohérents, sinon l'axe est écarté ou le document est incohérent. `modes-tokens.mjs:144`, `axesDeTokens()` ; `packages/kit/tests/modes-tokens.test.mjs` et `modes-tokens-aleatoire.test.mjs`.
- Le bilan bloque seulement les défauts du contrat ou les contrôles du repository et ne désigne pas le mauvais responsable. `verdict-bilan.mjs:75`, `bilanEstBloquant()` ; `packages/kit/tests/verdict-bilan.test.mjs`.
- Les échantillons restent non normatifs mais leurs adresses restent joignables. `validation-echantillons.mjs:286`, `validerAdressesDEchantillons()` ; `packages/kit/tests/validation-contrats.test.mjs`. Aucun test ne tient la profondeur de ce parcours.
- La configuration illisible devient un diagnostic, sans exception. `configuration.mjs:17`, `lireConfiguration()` ; `packages/kit/tests/configuration.test.mjs`.

## 3. Constats

| Gravité | CONFIRMÉ | PLAUSIBLE |
|---|---:|---:|
| Critique | 5 | 0 |
| Haute | 0 | 0 |
| Moyenne | 0 | 0 |
| Basse | 0 | 0 |

### [Critique] Un graphe de composition linéaire de 10 000 contrats fait tomber le contrôle

- **Où** : `packages/kit/src/lecteurs/validation-graphe-contrats.mjs:167`
- **Invariant ou promesse violé** : le lecteur vérifie que le graphe de composition reste acyclique ([AGENTS.md](../../../AGENTS.md#composition)). Une entrée hostile ne doit pas faire remonter une panne au lieu d’un verdict.
- **Verdict** : CONFIRMÉ
- **Scénario** : 10 000 contrats locaux forment une chaîne sans cycle. `validerCycles()` appelle récursivement `visiter()` une fois par contrat. Node lève `RangeError: Maximum call stack size exceeded` avant que le lecteur rende son `Map` de diagnostics.
- **Reproduction** :

  ```sh
  node --input-type=module -e "import { validerGrapheDesContrats } from './packages/kit/src/lecteurs/validation-graphe-contrats.mjs'; const taille = 10000; const documents = Array.from({ length: taille }, (_, index) => ({ chemin: String(index), contrat: { name: 'C' + index, composes: index + 1 < taille ? [{ component: 'C' + (index + 1), figmaLayer: 'layer' }] : [] } })); try { validerGrapheDesContrats(documents); console.log('PAS_DE_PLANTAGE'); } catch (erreur) { console.log(erreur.name + ': ' + erreur.message); }"
  ```

  Sortie observée : `RangeError: Maximum call stack size exceeded`.
- **Garde-fou** : `packages/kit/tests/validation-contrats.test.mjs` couvre les cycles courts. Il ne couvre pas la profondeur du parcours de `validerCycles()`.
- **Famille** : `fix(kit): la recherche de cycles ne déborde plus la pile, et ucm tokens css n'écrase plus sa source`.
- **Piste de correction** : remplacer le DFS récursif par une pile explicite. Ajouter une chaîne de 10 000 contrats acyclique au test du graphe.

### [Critique] Un fichier à la place du dossier de contrats fait tomber `ucm check`

- **Où** : `packages/kit/src/lecteurs/controle-repository.mjs:624`, `packages/kit/src/lecteurs/trouver-contrats.mjs:11`
- **Invariant ou promesse violé** : `components` désigne « le dossier sous lequel les contrats sont cherchés, récursivement » (`packages/kit/src/format/configuration.ts:25`). Le contrôle complet doit rendre un verdict et son rapport, pas une exception Node.
- **Verdict** : CONFIRMÉ
- **Scénario** : `estCheminDuRepository()` accepte `components`, car il vérifie seulement une forme de chemin relative. Si ce chemin vise un fichier, `readdirSync()` lève `ENOTDIR`. `controlerRepository()` ne traite que `ENOENT`, puis relance toute autre erreur à la ligne 629. La commande `ucm check` n'obtient ni `bloquant`, ni rapport, ni diagnostic.
- **Reproduction** :

  ```sh
  node --input-type=module -e "import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'; import { join } from 'node:path'; import { tmpdir } from 'node:os'; import { controlerRepository } from '@ucm-kit/core/lecteurs'; const racine = mkdtempSync(join(tmpdir(), 'ucm-reader-file-')); try { writeFileSync(join(racine, 'components'), 'ceci est un fichier'); writeFileSync(join(racine, 'tokens.json'), '{}'); const resultat = controlerRepository(racine, { configuration: { components: 'components', tokens: 'tokens.json', implementation: '{dir}/{id}.tsx' } }); console.log('VERDICT=' + resultat.bloquant); } catch (erreur) { console.log(erreur.name + ': ' + erreur.code + ': ' + erreur.message); } finally { rmSync(racine, { recursive: true, force: true }); }"
  ```

  Sortie observée : `Error: ENOTDIR: ENOTDIR: not a directory, scandir '…/components'`.
- **Garde-fou** : `packages/kit/tests/configuration.test.mjs` accepte ce chemin comme chemin relatif. `packages/kit/tests/controleRepository.test.mjs` couvre le dossier absent, pas un fichier à sa place.
- **Famille** : `fix(kit,cli): la CI n'expose plus le jeton au code du repository, et un chemin de configuration reste dans le repository`.
- **Piste de correction** : convertir `ENOTDIR` en verdict bloquant qui nomme `components`, ou vérifier que ce chemin est un dossier avant `trouverContrats()`.

### [Critique] Un champ inconnu très profond fait tomber le relevé de tokens

- **Où** : `packages/kit/src/lecteurs/controle-repository.mjs:160`, `packages/kit/src/lecteurs/references-token.mjs:38`
- **Invariant ou promesse violé** : `controle-repository.mjs` porte le contrôle complet et le rapport du designer (`AGENTS.md:135`). Une entrée JSON ne doit pas interrompre ce contrôle avant son verdict.
- **Verdict** : CONFIRMÉ
- **Scénario** : `champsInvalidesDuContrat()` accepte un contrat 12.0 valide auquel s'ajoute un champ inconnu. `collecterReferences()` parcourt ensuite toutes les valeurs du contrat par récursion. Un objet supplémentaire de 10 000 niveaux déclenche `RangeError` à la ligne 44, après la validation et avant la construction du bilan.
- **Reproduction** :

  ```sh
  node --input-type=module -e "import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'; import { join } from 'node:path'; import { tmpdir } from 'node:os'; import { controlerRepository } from '@ucm-kit/core/lecteurs'; const racine = mkdtempSync(join(tmpdir(), 'ucm-reader-deep-')); try { const dossier = join(racine, 'components', 'Button'); mkdirSync(dossier, { recursive: true }); const original = readFileSync('packages/kit/fixtures/contrats/12.0/Button.contract.json', 'utf8').trimEnd(); const profondeur = 10000; const ouverture = '{' + JSON.stringify('suivante') + ':'; const contrat = original.slice(0, -1) + ',' + JSON.stringify('extensionInconnue') + ':' + ouverture.repeat(profondeur) + '0' + '}'.repeat(profondeur) + '}'; writeFileSync(join(dossier, 'Button.contract.json'), contrat); writeFileSync(join(racine, 'tokens.json'), '{}'); const resultat = controlerRepository(racine, { configuration: { components: 'components', tokens: 'tokens.json', implementation: '{dir}/{id}.tsx' } }); console.log('VERDICT=' + resultat.bloquant); } catch (erreur) { console.log(erreur.name + ': ' + erreur.message); } finally { rmSync(racine, { recursive: true, force: true }); }"
  ```

  Sortie observée : `RangeError: Maximum call stack size exceeded`.
- **Garde-fou** : `packages/kit/tests/references-token.test.mjs` relève des objets peu profonds. `packages/kit/tests/validation-contrats.test.mjs` ne refuse pas les champs supplémentaires du contrat 12.0.
- **Famille** : aucun commit `fix(kit,` voisin ne remplace le parcours récursif des références.
- **Piste de correction** : remplacer le parcours récursif de `collecterReferences()` par une pile explicite, ou faire refuser les champs inconnus avant ce relevé.

### [Critique] Un échantillon profondément imbriqué fait tomber la validation du graphe

- **Où** : `packages/kit/src/lecteurs/validation-echantillons.mjs:292`
- **Invariant ou promesse violé** : retirer `samples` laisse un contrat normatif et une donnée non normative ne dégrade jamais sa validation ([AGENTS.md](../../../AGENTS.md#échantillon-de-maquette)).
- **Verdict** : CONFIRMÉ
- **Scénario** : un contrat contient un seul échantillon dont les instances composées sont imbriquées 10 000 fois. `visiter()` suit chaque `instance.composes` par appel récursif. `controlerRepository()` appelle ensuite `validerGrapheDesContrats()` sans garde autour de ce parcours. Le contrôle s’arrête sur une exception au lieu de rendre un refus exploitable.
- **Reproduction** :

  ```sh
  node --input-type=module -e "import { validerGrapheDesContrats } from './packages/kit/src/lecteurs/validation-graphe-contrats.mjs'; let instance = { component: 'C', figmaLayer: 'layer' }; for (let index = 0; index < 10000; index += 1) instance = { component: 'C', figmaLayer: 'layer', composes: [instance] }; const documents = [{ chemin: 'C.contract.json', contrat: { name: 'C', samples: { e: { composes: [instance] } } } }]; try { validerGrapheDesContrats(documents); console.log('PAS_DE_PLANTAGE'); } catch (erreur) { console.log(erreur.name + ': ' + erreur.message); }"
  ```

  Sortie observée : `RangeError: Maximum call stack size exceeded`.
- **Garde-fou** : `packages/kit/tests/validation-contrats.test.mjs` vérifie des adresses d’échantillons, pas la profondeur de `visiter()`.
- **Famille** : aucun commit `fix(kit,` voisin ne traite les échantillons.
- **Piste de correction** : parcourir les instances par une pile explicite ou borner explicitement la profondeur. Ajouter un échantillon de 10 000 niveaux qui rend un verdict sans exception.

### [Critique] Le relevé des refus enregistrés ne correspond plus au validateur

- **Où** : `packages/kit/src/lecteurs/validation-contrat.mjs:1700`, relevé par `packages/kit/tests/refus-enregistres.test.mjs:169`
- **Invariant ou promesse violé** : le corpus 11.0 reste mesuré par le code qui le lit ([AGENTS.md](../../../AGENTS.md#vérification)).
- **Verdict** : CONFIRMÉ
- **Scénario** : le contrat figé `11.0/Alert.contract.json` passe par `champsInvalidesDuContrat()` pendant le relevé. Le validateur compte 899 mutations refusées et 663 muettes. `refus-enregistres.json` attend 913 refusées et 649 muettes. La ligne de base échoue alors que ce garde-fou doit rester vert sur `HEAD`.
- **Reproduction** :

  ```sh
  npm run build --workspace @ucm-kit/core
  node --test packages/kit/tests/refus-enregistres.test.mjs
  ```

  Sortie observée : `11.0/Alert.contract.json : le partage refusé / muet a changé`, avec `{ refusees: 899, muettes: 663 }` obtenu au lieu de `{ refusees: 913, muettes: 649 }`.
- **Garde-fou** : `packages/kit/tests/refus-enregistres.test.mjs` le voit et bloque toute suite du kit. La référence enregistrée ne décrit plus le comportement présent.
- **Famille** : `fix(kit): la recherche de cycles ne déborde plus la pile, et ucm tokens css n'écrase plus sa source`.
- **Piste de correction** : identifier les quatorze mutations déplacées entre refus et silence. Mettre à jour la référence seulement si le comportement actuel respecte le contrat ; sinon restaurer les validations manquantes.

## 4. Pistes réfutées

### `champsInvalidesDuContrat()` récursif sur 10 000 slots

Un arbre mal formé de 10 000 niveaux fait lever `RangeError` dans `validerStructure()`. `controle-repository.mjs:140` attrape cette erreur et rend le contrat bloquant avec le champ `structure`. Le chemin qui alimente `ucm check` ne plante pas et ne donne pas de verdict vert. Piste réfutée.

## 5. Pistes pour les zones suivantes

La validation de profondeur des arbres publiés reste une piste pour le producteur, hors de cette zone. Le lecteur doit toutefois convertir son propre parcours récursif en verdict avant de déléguer ce cas.

## 6. Couverture et angles morts

La ligne de base et les trois premiers constats sont établis. La couverture systématique des cinq axes sur les huit lecteurs est en cours. Les exécutions ont eu lieu dans un worktree temporaire.
