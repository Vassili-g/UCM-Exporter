# La recette externe : vérifier UCM depuis un dépôt vide

Cette recette fait tourner la boucle complète du produit, du plugin Figma
jusqu'au rapport publié sur une pull request, dans un dépôt qui ne contient rien
d'UCM. Elle se suit dans l'ordre, du début à la fin. Comptez une heure et demie.

C'est un guide, et rien ne l'exige. Elle couvre les trois chemins qu'aucun test
du dépôt ne parcourt, Figma, GitHub et une vraie pull request ; le reste est
déjà tenu par `npm test`, par l'épreuve du registre et par le contrôle des pins
servis. La jouer, et quand, est une décision du mainteneur.

Les deux dépôts concernés :

- **UCM-Exporter**, le produit. C'est ici que vivent le plugin et le code des
  paquets npm.
- **UCM-Playground**, le consommateur de recette. Il a été vidé : plus aucun
  contrat, plus de `tokens.json`, plus aucun des cinq fichiers qu'écrit
  `ucm init`.

Une convention pour toute la page : `A:\...\Projet UCM\` désigne le dossier qui
contient les deux dépôts.

---

## Avant de commencer

Il vous faut :

1. **Node 22 ou plus**, vérifiable par `node -v` ;
2. **l'application de bureau Figma**, avec le fichier du design system ouvert ;
3. **le plugin UCM Contract Exporter**, installé depuis la Figma Community ;
4. **un Personal Access Token GitHub** ayant le droit d'écrire sur
   `Vassili-g/UCM-Playground`.

**La recette se joue sur ce qui est publié, jamais sur la copie de travail.** Le
plugin vient de la Community, le CLI vient du registre npm, et les deux peuvent
être en retard sur ce dépôt. C'est voulu : ce qu'un utilisateur reçoit est la
seule chose que cette recette puisse prouver, et une version que personne ne sert
encore ne prouve rien. Les commandes ci-dessous épinglent donc la version
publiée, et l'étape 8 publie ce que le dépôt porte de plus récent, une fois que
tout est vert.

Vérifiez ce que le registre sert avant de commencer, plutôt que de croire les
numéros écrits ici :

```sh
npm view @ucm-kit/core version
npm view @ucm-kit/cli version
npm view @ucm-kit/adapter-typescript version
```

---

## Étape 1 : ouvrir le plugin dans Figma

1. Dans l'application de bureau Figma, ouvrez le fichier du design system.
2. Menu **Plugins**, puis **UCM Contract Exporter**. Lancez-le.

Le plugin est publié sur la Figma Community : il n'y a ni build local à faire, ni
manifeste à importer. Si vous ne le voyez pas dans la liste, installez-le une
fois depuis la Community, il y restera.

**Le pied de page de la fenêtre porte la version de schéma que ce bundle
produit.** Notez-la : c'est la seule chose qui distingue le plugin servi par la
Community du code de ce dépôt, et un export « sans changement » ne se comprend
pas sans elle.

---

## Étape 2 : regarder l'interface, avant de s'en servir

Deux observations, qu'aucun test de ce dépôt ne couvre : elles ne se constatent
qu'à l'œil, dans un vrai fichier Figma. Elles se refont à chaque passage de
cette page.

**Observation A.** Sélectionnez un calque depuis le plugin, par le bouton
« Afficher dans Figma » d'un point à corriger. Regardez ensuite si Figma marque
le fichier comme modifié, c'est-à-dire s'il propose d'enregistrer une nouvelle
version. Attendu : non.

**Observation B.** Faites un export, puis regardez les points à corriger du
compte rendu, en thème clair puis en thème sombre. Vérifiez qu'ils restent
lisibles et que rien ne déborde de la fenêtre. Regardez aussi les deux cartes
de commande et l'écran sans sélection.

---

## Étape 3 : installer UCM dans le dépôt vide

Dans un second terminal, à la racine d'`UCM-Playground` :

```sh
npx --yes @ucm-kit/cli@0.1.17 init
```

Le Playground range ses contrats sous `components/` et ses tokens dans
`tokens.json`, ce que la commande écrit par défaut. Un repository qui range
autrement le dit ici, en une fois :

```sh
npx --yes @ucm-kit/cli@0.1.17 init --components src/components --tokens src/tokens
```

| Option | Ce qu'elle reçoit |
|---|---|
| `--components <dossier>` | Le dossier sous lequel les contrats sont rangés |
| `--tokens <dossier>` | Le dossier qui reçoit `tokens.json` |
| `--implementation <motif>` | Où vit l'implémentation d'un contrat |

Les deux premières attendent un dossier relatif au repository, sans `..`, et
toute autre valeur sort en 2. `--tokens src/tokens` écrit donc `src/tokens/tokens.json` dans
`ucm.config.json` : le champ y reste un chemin de fichier, que les lecteurs
traitent comme tel. Pour donner un autre nom à ce fichier, un développeur
modifie la configuration à la main.

`--implementation` reçoit un motif, où `{dir}` vaut le dossier du contrat et
`{id}` son identifiant. Le défaut, `{dir}/{id}.tsx`, vise React parce que c'est
le premier consommateur ; un repository Swift écrit `{dir}/{id}.swift` et cesse
de porter une extension fausse. Le motif doit contenir `{id}` : sans lui, tous
les contrats désigneraient le même fichier, et le rapport dirait « en attente
d'implémentation » pour tous sauf un.

Ces valeurs partent dans `ucm.config.json`, qui décide seul de l'endroit : le
plugin le lit avant de publier, `ucm check` le lit avant de chercher les
contrats. Aucun chemin ne se saisit ailleurs.

Les options n'agissent qu'à la première installation : `ucm init` n'écrase
jamais un `ucm.config.json` existant, et le dit quand on lui passe des chemins
malgré tout.

Attendu, à peu de choses près :

```text
✓ ucm.config.json
✓ .gitattributes
✓ .vscode/settings.json
✓ .github/workflows/ucm.yml
· .gitignore existait déjà, laissé tel quel

Installé avec @ucm-kit/cli 0.1.17.
Placez vos contrats sous `components/`, vos tokens dans `tokens.json`,
puis lancez `ucm check`.

· `.gitignore` existait déjà : ajoutez-y `ci-report.md`. `ucm check --report` le
  réécrit à chaque exécution ; commité, il montrerait le verdict d'un contrôle
  passé, pas celui du code en cours.
```

**Ce qu'il faut vérifier ici :** quatre fichiers écrits, un conservé, et la
commande dit elle-même ce qu'elle n'a pas pu faire. C'est le premier critère du
test : moins de quinze minutes, zéro ligne à écrire à la main.

Faites ce qu'elle demande, en ajoutant `ci-report.md` au `.gitignore`. Ouvrez le
fichier et ajoutez ces quatre lignes à la fin :

```text
# Le rapport de `ucm check --report`, réécrit à chaque exécution.
# Commité, il montrerait le verdict d'un contrôle passé, pas celui du
# code en cours.
ci-report.md
```

Puis regardez ce que le contrôle dit d'un dépôt encore vide :

```sh
npx --yes @ucm-kit/cli@0.1.17 check
```

Attendu :

```text
✓ Aucun contrat dans components : ce repository n'a pas encore reçu d'export. Rien à contrôler.
```

Le code de sortie est 0. **L'absence d'export est un état d'avancement**, au même
titre que l'absence d'implémentation : un dépôt qui vient d'être installé n'a
rien à contrôler, et sa CI est verte dès le premier push.

Le discriminant est le nombre de contrats. Dès qu'un contrat existe, un
`tokens.json` absent bloque la fusion, puisque ce contrat cite des tokens que
plus personne ne peut résoudre. Un `tokens.json` illisible bloque à tout stade.

**Si vous lisez ici `✗ tokens.json introuvable` et un code de sortie 1**, le
registre vous a servi une version antérieure à `@ucm-kit/core@0.1.14`. Vérifiez
le numéro installé avant de conclure à une régression : ce refus était le
comportement jusqu'à cette version, et il rendait rouge la CI qu'`ucm init`
venait d'écrire.

Enfin, commitez et poussez :

```sh
git add -A
git commit -m "chore: installer UCM par ucm init"
git push
```

---

## Étape 4 : exporter les tokens depuis Figma

Dans le plugin, ouvrez d'abord la page de configuration et renseignez :

| Champ | Valeur |
|---|---|
| URL du repository | `https://github.com/Vassili-g/UCM-Playground` |
| Branche de base | `main` |
| Personal Access Token | le vôtre |

Aucun chemin ne se saisit ici. Le plugin lit le `ucm.config.json` du Playground
et affiche, sous la branche de base, où l'export ira atterrir. Vérifiez que
cette phrase nomme bien `components` et `tokens.json` : c'est le même fichier
que `ucm check` lit pour savoir où chercher.

Revenez à l'écran principal, lancez **Analyser les tokens**, puis publiez.

Attendu :

1. le plugin annonce « Prêt à publier dans `tokens.json` » et dit d'où vient ce
   chemin ;
2. après publication, il affiche un lien vers une pull request ;
3. sur GitHub, la pull request contient un seul fichier, `tokens.json` ;
4. la CI tourne et publie un commentaire sur la pull request.

**Lisez ce commentaire.** C'est le troisième critère du test : un rapport
lisible par un designer, sans ouvrir un seul journal de CI.

Attendu : le rapport est vert, et il porte le même état de démarrage qu'à
l'étape 3. Un dépôt qui a reçu ses tokens mais pas encore son premier composant
n'a toujours aucun contrat à contrôler. Jugez le troisième critère sur la forme
du rapport, pas sur sa couleur : titre, cause, geste attendu, état de la fusion.

Fusionnez la pull request.

---

## Étape 5 : exporter un composant

De retour dans Figma, sélectionnez un component set, par exemple `Button`, puis
lancez **Analyser le composant** et publiez.

Attendu :

1. le compte rendu liste ce qui a été lu et ce qui manque ;
2. une pull request s'ouvre, contenant
   `components/Button/Button.contract.json` ;
3. la CI publie son rapport en commentaire.

**Ce que le rapport doit dire, et qui compte :** l'implémentation est absente,
et cette absence est un état d'avancement, pas une erreur. La pull request doit
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

## Étape 6 : reconstruire la sonde

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
npm install --save-dev @ucm-kit/adapter-typescript@0.1.10
```

Prenez la version que le registre sert, `npm view @ucm-kit/adapter-typescript
version`, et non celle du dépôt : quand les deux diffèrent, c'est l'étape 8 qui
publie la seconde. Poussez, et regardez le rapport changer.

---

## Étape 7 : vérifier les sept critères

Le test est réussi si les sept lignes suivantes sont vraies. Reprenez-les une
par une, en relisant ce que vous avez observé.

| Critère | Où vous l'avez vu |
|---|---|
| 1. Une commande d'initialisation, moins de quinze minutes, zéro ligne à la main | Étape 3 |
| 2. Un export depuis Figma ouvre une pull request | Étapes 4 et 5 |
| 3. La CI publie un rapport lisible par un designer | Étape 4 |
| 4. Un contrat d'une version non lue est refusé, avec un message qui dit qui corrige | à provoquer, voir ci-dessous |
| 5. Une référence de token disparue avertit sans bloquer | à provoquer, voir ci-dessous |
| 6. L'absence d'implémentation est un état d'avancement, pas une erreur | Étape 5 |
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

## Étape 8 : publier les paquets

Cette étape ne se fait que si les sept précédentes sont vertes, et seulement
pour les paquets dont le dépôt porte un numéro que le registre ne sert pas
encore. Comparez avant de lancer quoi que ce soit :

```sh
npm view @ucm-kit/core version
npm view @ucm-kit/cli version
npm view @ucm-kit/adapter-typescript version
```

La publication passe par un workflow GitHub, jamais par un jeton posé sur votre
poste. Pour chaque paquet à publier :

```sh
gh workflow run publish.yml -f paquet=@ucm-kit/core
gh run watch "$(gh run list --workflow=publish.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

Ou par l'interface : onglet **Actions** d'`UCM-Exporter`, workflow **publish**,
**Run workflow**, puis le paquet.

Le workflow rejoue les tests, nomme au journal ce que la recette seule couvre,
publie, puis réinstalle le paquet depuis un dossier vide pour vérifier que le
registre le sert vraiment.

**Les deux premières publications finissent rouges quand les trois paquets
montent ensemble.** La dernière étape exige que chaque version citée par la
documentation soit servie par le registre ; elle ne peut donc passer qu'une fois
le dernier paquet publié. Lisez l'étape qui a échoué avant de conclure : si
c'est « Publier », rien n'est parti ; si c'est « Les pins de la documentation
sont servis », le paquet est publié.

**L'ordre compte : le noyau d'abord.** `@ucm-kit/cli` et
`@ucm-kit/adapter-typescript` épinglent exactement une version de
`@ucm-kit/core`. Publiés avant lui, ils installeraient une dépendance absente du
registre.

Une version publiée ne se reprend pas. Relancer le workflow sans monter un
numéro rend une erreur 409, et c'est le comportement voulu.

**Si la publication échoue en `ENEEDAUTH`**, la cause n'est pas dans ce dépôt :
c'est l'entrée d'éditeur de confiance du paquet, chez npm, qui manque ou qui est
périmée. npm ne la valide pas au moment où on l'écrit, donc aucun message ne peut
la désigner. La supprimer et la recréer sur la page du paquet, en visant
`Vassili-g/UCM-Exporter` et le workflow `publish.yml`, a déjà suffi une fois.

---

## Étape 9 : vérifier ce que le registre sert vraiment

Le workflow le fait déjà après chaque publication, et le refaire à la main coûte
une minute. Dans un dossier temporaire, hors de tout dépôt :

```sh
npx --yes @ucm-kit/cli@0.1.17 init
npx --yes @ucm-kit/cli@0.1.17 check
```

Attendu : `init` écrit ses cinq fichiers, et `check` sort en 0 en disant que ce
repository n'a pas encore reçu d'export.

Puis, dans `UCM-Playground`, alignez ce que le consommateur installe sur ce qui
vient d'être publié :

1. dans `.github/workflows/ucm.yml`, le pin de `@ucm-kit/cli` ;
2. dans `package.json`, celui de `@ucm-kit/adapter-typescript`, puis relancez
   `npm install` ;
3. ouvrez une dernière pull request et vérifiez que le rapport est toujours
   vert.

C'est ce dernier passage qui prouve que ce qui a été publié fonctionne chez un
consommateur, et pas seulement dans le monorepo qui l'a produit.

---

## Ce que ce guide ne prouve pas

- Le **rendu visuel** d'un composant n'est comparé que par votre œil. Aucun
  contrôle automatique ne le mesure.
- La **soumission à la Figma Community** n'est pas couverte par cette page. Le
  plugin y est publié, et c'est ce bundle que la recette éprouve ; ce qui reste
  hors champ est le geste de soumettre une version plus récente, qui passe par
  une revue de Figma.
- **Le code du plugin qui vit dans ce dépôt** n'est pas éprouvé ici, sauf s'il
  est déjà celui que la Community sert. La version de schéma lue à l'étape 1
  est ce qui permet de le savoir.
- Les paquets sont en `0.x`. La surface publique n'est pas gelée, et c'est
  pourquoi chaque version s'épingle à l'exact, sans `^`.
