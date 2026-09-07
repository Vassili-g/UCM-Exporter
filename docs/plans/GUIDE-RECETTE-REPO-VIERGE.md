# Guide : vérifier UCM depuis un dépôt vide

Ce guide fait tourner la boucle complète du produit, du plugin Figma jusqu'au
rapport publié sur une pull request, dans un dépôt qui ne contient plus rien
d'UCM. Il se suit dans l'ordre, du début à la fin. Comptez une heure et demie.

Les deux dépôts concernés :

- **UCM-Exporter**, le produit. C'est ici que vivent le plugin et le code des
  paquets npm.
- **UCM-Playground**, le consommateur de recette. Il a été vidé : plus aucun
  contrat, plus de `tokens.json`, plus aucun des cinq fichiers qu'écrit
  `ucm init`.

Une convention pour tout le guide : `A:\...\Projet UCM\` désigne le dossier qui
contient les deux dépôts.

-
## Étape 2 : charger le plugin dans Figma

1. Dans l'application de bureau Figma, ouvrez le fichier du design system.
2. Menu **Plugins**, puis **Development**, puis **Import plugin from
   manifest…**.
3. Choisissez le fichier
   `A:\...\Projet UCM\UCM-Exporter\packages\plugin\dist\manifest.json`.
4. Le plugin apparaît sous **Plugins**, **Development**, sous le nom
   **Unified Component Exporter**. Lancez-le.

Si vous l'aviez déjà importé, il suffit de le relancer : Figma relit le `dist`
à chaque ouverture, vous n'avez rien à réimporter.

---

## Étape 3 : regarder l'interface, avant de s'en servir

Les deux observations que cette étape réclamait ont été faites le 6 septembre
2026, et elles ont fermé le plan de refonte de l'interface. Elles restent écrites
ici parce que ce guide se rejoue et qu'aucun test ne les couvre : elles ne se
constatent qu'à l'œil, dans un vrai fichier Figma.

**Observation A.** Sélectionnez un calque depuis le plugin, par le bouton
« Afficher dans Figma » d'un point à corriger. Regardez ensuite si Figma marque
le fichier comme modifié, c'est-à-dire s'il propose d'enregistrer une nouvelle
version. Attendu, et constaté le 6 septembre 2026 : non.

**Observation B.** Faites un export, puis regardez les points à corriger du
compte rendu, en thème clair puis en thème sombre. Vérifiez qu'ils restent
lisibles et que rien ne déborde de la fenêtre. Regardez aussi les deux cartes
de commande et l'écran sans sélection.

**Une chose a changé depuis ces observations.** L'interface est passée en
TypeScript (U6.1). Le même esbuild produit le bundle à partir des mêmes sources,
dont il retire les types, donc l'écran doit être identique. Vérifiez-le une
fois : aucun contrôle de ce dépôt ne compare le rendu du plugin dans Figma.

---

## Étape 4 : installer UCM dans le dépôt vide

Dans un second terminal, à la racine d'`UCM-Playground` :

```sh
npx --yes @ucm-kit/cli@0.1.7 init
```

Attendu, à peu de choses près :

```text
✓ ucm.config.json
✓ .gitattributes
✓ .vscode/settings.json
✓ .github/workflows/ucm.yml
· .gitignore existait déjà, laissé tel quel

Installé avec @ucm-kit/cli 0.1.7.
Placez vos contrats sous `components/`, vos tokens dans `tokens.json`,
puis lancez `ucm check`.

· `.gitignore` existait déjà : ajoutez-y `ci-report.md`, le rapport que
  `ucm check --report` régénère à chaque exécution.
```

**Ce qu'il faut vérifier ici :** quatre fichiers écrits, un conservé, et la
commande dit elle-même ce qu'elle n'a pas pu faire. C'est le premier critère du
test : moins de quinze minutes, zéro ligne à écrire à la main.

Faites ce qu'elle demande, en ajoutant `ci-report.md` au `.gitignore`. Ouvrez le
fichier et ajoutez ces deux lignes à la fin :

```text
# Le rapport de `ucm check --report`, régénéré à chaque exécution.
ci-report.md
```

Puis regardez ce que le contrôle dit d'un dépôt encore vide :

```sh
npx --yes @ucm-kit/cli@0.1.7 check
```

Attendu **en 0.1.7**, mesuré le 6 septembre 2026 :

```text
✗ <chemin du dépôt>/tokens.json introuvable. Régénérez les tokens du repository.
```

Le code de sortie est 1. **Un dépôt fraîchement installé est donc rouge tant
qu'aucun export n'a eu lieu**, et la CI le sera aussi au premier push. Votre
installation n'est pas en cause : la version publiée à l'étape 9 corrige ce
défaut.

**Ce que la version du dépôt rend, et que vous vérifierez à l'étape 10.**
L'absence d'export est un état d'avancement, au même titre que l'absence
d'implémentation. À partir de `@ucm-kit/core@0.1.13`, un dépôt sans aucun
contrat sort en 0 et rend un rapport vert qui nomme le geste suivant :

```text
✓ Aucun contrat dans components : ce repository n'a pas encore reçu d'export. Rien à contrôler.
```

Le discriminant est le nombre de contrats. Dès qu'un contrat existe, un
`tokens.json` absent bloque de nouveau la fusion, puisque ce contrat cite des
tokens que plus personne ne peut résoudre.

Enfin, commitez et poussez :

```sh
git add -A
git commit -m "chore: installer UCM par ucm init"
git push
```

---

## Étape 5 : exporter les tokens depuis Figma

Dans le plugin, ouvrez d'abord la page de configuration et renseignez :

| Champ | Valeur |
|---|---|
| URL du repository | `https://github.com/Vassili-g/UCM-Playground` |
| Branche de base | `main` |
| Chemin des composants | `components` |
| Chemin des tokens | `tokens.json` |
| Personal Access Token | le vôtre |

Les deux chemins doivent correspondre à ce que `ucm.config.json` déclare dans le
Playground. Si l'un diffère, l'export déposera le fichier là où le contrôle ne
le cherchera pas.

Revenez à l'écran principal, lancez **Analyser les tokens**, puis publiez.

Attendu :

1. le plugin annonce « Prêt à publier dans `tokens.json` » et dit d'où vient ce
   chemin ;
2. après publication, il affiche un lien vers une pull request ;
3. sur GitHub, la pull request contient un seul fichier, `tokens.json` ;
4. la CI tourne et publie un commentaire sur la pull request.

**Lisez ce commentaire.** C'est le troisième critère du test : un rapport
lisible par un designer, sans ouvrir un seul journal de CI.

**Ce commentaire sera rouge, pour le même défaut qu'à l'étape 4, un cran plus
loin.** En 0.1.7, un dépôt qui a reçu ses tokens mais pas encore son premier
composant n'a pas de dossier `components`, et le contrôle refuse la fusion en
disant `components est introuvable`. Jugez le troisième critère sur la forme du
rapport plutôt que sur sa couleur : titre, cause, geste attendu, état de la
fusion. À partir de `@ucm-kit/core@0.1.13`, ce cas rend le rapport vert de
démarrage montré à l'étape 4, que l'étape 10 vérifie.

Fusionnez la pull request.

---

## Étape 6 : exporter un composant

De retour dans Figma, sélectionnez un component set, par exemple `Button`, puis
lancez **Analyser le composant** et publiez.

Attendu :

1. le compte rendu liste ce qui a été lu et ce qui manque ;
2. une pull request s'ouvre, contenant
   `components/Button/Button.contract.json` ;
3. la CI publie son rapport en commentaire.

**Ce que le rapport doit dire, et qui compte :** l'implémentation est absente,
et ce n'est pas une erreur, c'est un état d'avancement. La pull request doit
pouvoir être fusionnée. C'est le sixième critère du test.

**Un point à surveiller de près, propre à cette version.** Le défaut d'un axe de
variantes ne se déduit plus de la position du variant dans le component set. Il
se déclare, par une règle écrite dans la description du component set :

```text
@default    color.secondary
```

Sans cette règle, le contrat ne publie aucun défaut pour `color`, et c'est
voulu : la position du premier variant est un effet de la mise en page, pas une
décision de design. Comparez le contrat obtenu à l'ancien, qui portait
`"default": "primary"`. Si vous voulez retrouver un défaut, écrivez la règle
dans Figma et réexportez. Les booléens, eux, gardent le défaut que Figma leur
donne : celui-là est une vraie décision de designer.

Fusionnez la pull request.

---

## Étape 7 : reconstruire la sonde

Le contrat est arrivé, le code n'existe pas encore. Reconstruisez le composant à
partir du seul contrat, sans regarder une implémentation antérieure. Le
protocole est dans la skill `consommer-contrat` d'`UCM-Exporter`.

Une fois `components/Button/Button.tsx` et son `index.ts` écrits, remettez dans
`src/index.css` la ligne que la préparation avait commentée :

```css
@import "./generated/tokens.css";
```

Puis :

```sh
npm run build
npm run dev
```

Ajoutez la sonde à `src/App.tsx` pour la voir à l'écran, et comparez son rendu à
la maquette Figma, variante par variante.

Ouvrez enfin une pull request avec la sonde. Le rapport de CI doit maintenant
parler de la parité entre le contrat et le code. Tant que
`@ucm-kit/adapter-typescript` n'est pas installé dans le Playground, il dira que
l'implémentation n'a pas été lue, jamais qu'elle est conforme.

Pour lui donner à lire :

```sh
npm install --save-dev @ucm-kit/adapter-typescript@0.1.0
```

Attention à la version : `0.1.2`, que porte le dépôt, n'est pas encore publiée.
Poussez, et regardez le rapport changer.

---

## Étape 8 : vérifier les sept critères

Le test est réussi si les sept lignes suivantes sont vraies. Reprenez-les une
par une, en relisant ce que vous avez observé.

| Critère | Où vous l'avez vu |
|---|---|
| 1. Une commande d'initialisation, moins de quinze minutes, zéro ligne à la main | Étape 4 |
| 2. Un export depuis Figma ouvre une pull request | Étapes 5 et 6 |
| 3. La CI publie un rapport lisible par un designer | Étape 5 |
| 4. Un contrat d'une version non lue est refusé, avec un message qui dit qui corrige | à provoquer, voir ci-dessous |
| 5. Une référence de token disparue avertit sans bloquer | à provoquer, voir ci-dessous |
| 6. L'absence d'implémentation est un état d'avancement, pas une erreur | Étape 6 |
| 7. Un contrat réellement cassé bloque | à provoquer, voir ci-dessous |

Les critères 4, 5 et 7 demandent de casser volontairement quelque chose. Faites
les trois dans une seule pull request de rebut, que vous fermerez sans
fusionner :

```sh
git checkout -b recette/echecs-attendus
```

**Critère 4.** Dans le contrat, remplacez `"contractVersion": "12.0"` par
`"contractVersion": "99.0"`. Attendu : la fusion est bloquée, et le message dit
qu'un développeur doit mettre à jour l'outillage du repository, pas qu'un
designer doit réexporter.

**Critère 5.** Dans `tokens.json`, supprimez un token que le contrat cite.
Attendu : un avertissement, la fusion reste possible.

**Critère 7.** Dans le contrat, supprimez le bloc `props` en entier. Attendu :
la fusion est bloquée, et le message dit ce qui manque et ce qu'il faut
réexporter.

Ces trois modifications se font à la main dans une branche de rebut, et elles
sont la seule exception à la règle « un contrat ne se retouche jamais ». Fermez
la branche sans la fusionner :

```sh
git checkout main
git branch -D recette/echecs-attendus
```

---

## Étape 9 : publier les paquets

Cette étape ne se fait que si les huit précédentes sont vertes.

Le dépôt porte trois versions prêtes et non publiées : `@ucm-kit/core@0.1.13`,
`@ucm-kit/cli@0.1.9` et `@ucm-kit/adapter-typescript@0.1.2`. La publication
passe par un workflow GitHub, jamais par un jeton posé sur votre poste.

Pour chacun des trois, **dans cet ordre** :

1. ouvrez l'onglet **Actions** d'`UCM-Exporter`, workflow **publish** ;
2. cliquez **Run workflow** ;
3. choisissez le paquet : d'abord `@ucm-kit/core`, puis `@ucm-kit/cli`, puis
   `@ucm-kit/adapter-typescript` ;
4. au second champ, choisissez **recette N6 rejouée et consignée**. C'est
   exactement ce que vous venez de faire aux étapes 5 à 7 ;
5. lancez, et attendez la fin. Le workflow rejoue les tests, publie, puis
   réinstalle le paquet depuis un dossier vide pour vérifier que le registre le
   sert vraiment.

L'ordre compte : `@ucm-kit/cli` épingle exactement `@ucm-kit/core@0.1.13`. Si le
noyau n'est pas publié en premier, `npx @ucm-kit/cli` installerait une
dépendance absente du registre. `@ucm-kit/adapter-typescript` épingle le même
noyau, pour la même raison.

Une version publiée ne se reprend pas. Relancer le workflow sans monter un
numéro rend une erreur 409, et c'est le comportement voulu.

---

## Étape 10 : repointer le Playground sur la version publiée

Une fois les trois paquets en ligne, dans `UCM-Playground` :

1. dans `.github/workflows/ucm.yml`, remplacez les deux `@ucm-kit/cli@0.1.7`
   par `@ucm-kit/cli@0.1.9` ;
2. dans `package.json`, passez `@ucm-kit/adapter-typescript` de `0.1.0` à
   `0.1.2`, puis relancez `npm install` ;
3. ouvrez une dernière pull request et vérifiez que le rapport est toujours
   vert.

C'est ce dernier passage qui prouve que ce qui a été publié fonctionne chez un
consommateur, et pas seulement dans le monorepo qui l'a produit.

**Une dernière vérification, qui ferme les deux refus des étapes 4 et 5.**
Dans un dossier temporaire, hors de tout dépôt :

```sh
npx --yes @ucm-kit/cli@0.1.9 init
npx --yes @ucm-kit/cli@0.1.9 check
```

Attendu : la seconde commande sort en 0 et dit que ce repository n'a pas encore
reçu d'export. Si elle rend encore `✗ tokens.json introuvable`, c'est que le
registre sert une version antérieure : vérifiez le numéro installé avant de
conclure à une régression.

---

## Ce que ce guide ne prouve pas

- Le **rendu visuel** d'un composant n'est comparé que par votre œil. Aucun
  contrôle automatique ne le mesure.
- La **soumission à la Figma Community** n'est pas couverte par ce guide. Elle a
  eu lieu et le plugin y est publié ; ce guide charge néanmoins le plugin en
  développement, puisque le `dist` du dépôt est ce qu'il faut éprouver.
- Les paquets sont en `0.x`. La surface publique n'est pas gelée, et c'est
  pourquoi chaque version s'épingle à l'exact, sans `^`.
