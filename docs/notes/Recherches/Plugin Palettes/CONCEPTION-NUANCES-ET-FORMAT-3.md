# UCM Palettes : nombre de nuances, palette libre et format 3

Ce document conçoit les cases W6.2, W6.3 et W7.2 du
[plan V3](./PLAN-ERGONOMIE-PALETTES-V3.md#lot-w6--nombre-de-nuances). Il sert
à l’agent qui écrira le code. Les décisions du mainteneur sont celles du
plan ; ce document en tire les règles du moteur, de la recette et des vues.
Une revue indépendante l’a relu avant tout code ; ses conclusions, vérifiées
dans le code, y sont intégrées, et la dernière section donne ses réponses aux
questions posées.

## Faits relevés dans le code

| Fait | Source | Conséquence |
|---|---|---|
| Les bouts de la dérive sont la première et la dernière valeur de la courbe claire. Le bout sombre ne compte que pour une nuance plus sombre que la référence | `boutsDe` et `teinteA`, `packages/couleur/src/rampe.ts` | Avec le moteur actuel, passer de 11 à 13 change quatre nuances Vivid Light de `#1E6FD9` sur onze |
| Une dérive rangée ne se recalcule pas quand les courbes changent : le préréglage Tailwind ne tourne qu’à un changement de référence ou de préréglage | `changerReference`, `prereglageDe`, `origineDe`, `src/edition.ts` | Les bouts comptent au calcul des rampes, et à ces trois gestes |
| `ancrageDe` lit `recette.crans` et `recette.courbes` ; `rampesDe` ne lit que les courbes, par `fabriquerPalette`, dont les entrées ne portent pas la liste | `palette.ts`, `rampe.ts` | La liste d’une palette doit entrer dans l’ancrage et dans les entrées de `fabriquerPalette` |
| Les états avancent d’un rang dans la liste | `decalagesDeLEmploi`, `emploisDuCran`, `promesses.ts` | Les trois préréglages n’insèrent aucune nuance entre 100 et 300, ni entre 600 et 900 |
| La validation exige les sept nuances des emplois, et une luminosité par nuance | `validerCrans`, `validerCourbes`, `recette.ts` | 9, 11 et 13 passent déjà en format 2 |
| Une recette de version supérieure se classe « future » | `classerRecette` | Un plugin qui lit le format 2 refuse une recette de format 3 sans l’écraser |
| Les palettes proches se mesurent sur 500, 600 et 700 de Vivid, en Light, à deux endroits | `distanceDePalettes`, `alertes.ts` ; `alertesQuiLaConcernent`, `src/analyse.ts` | Un seul changement de `distanceDePalettes` couvre les deux |
| Le repère ≈ de l’aperçu vient de l’alerte « profils confondus », bornée aux nuances des emplois ; la planche le calcule sur toute nuance | `ongletPalettes.ts`, `nuancier.ts`, `planche/modele.ts` | Une palette sans emplois perdrait ≈ dans l’aperçu |
| Zéro promesse manquée s’écrit « Soft ✓ » | `resultatDuProfil`, `ui/textes.ts` | Une palette sans promesse paraîtrait tout tenir |
| 42 lectures de la liste commune, dont 8 dans le moteur, plus les lectures de `recette.courbes` pour les colonnes d’une palette. Plusieurs mêlent `rampes[…][rang]` et `recette.crans[rang]` | `propositions.ts`, `rapport.ts`, `planche/peints.ts`, `derive/graphe.ts`, `derive/editeur.ts`, `apercuCompact.ts` | Une liste libre de longueur différente étiquetterait faux sans lever d’erreur |

## 1. Les trois préréglages communs

| Préréglage | Numéros | Courbes par défaut |
|---|---|---|
| 9 | 50, 100, 200, 300, 500, 600, 700, 800, 900 | celles de 11, sans 400 ni 950 |
| 11 | 50 à 950, la liste actuelle | la recette par défaut |
| 13 | celles de 11, puis 1000 et 1050 | celles de 11, puis 0,215 et 0,165 en Light, 0,96 et 0,98 en Dark |

Le préréglage n’est pas rangé : il se reconnaît à `recette.crans`. Une liste
qui n’est aucun des trois, arrivée par import (`[ENT-08]`), reste valide ; le
réglage la dit « Liste importée » et offre de passer à un préréglage.

**Changer de préréglage** remplace `crans`. Chaque numéro gardé garde sa
luminosité, réglée ou non ; un numéro ajouté prend celle que donne la règle
de la section 2 sur les courbes courantes, si bien que la courbe reste
monotone. Le réglage dit avant le geste combien de palettes et de cadres il
touche : les palettes du modèle dont l’ancrage change (plus bas), et toutes
les palettes libres qui portent un numéro interpolé.

**« Rétablir » les courbes** remet celles du préréglage reconnu. Sur une liste
importée, il reste inactif, et son infobulle (N060) cite le nombre de nuances
de la liste au lieu de « onze ».

**Les bouts de la dérive** se lisent aux numéros 50 et 950 de la courbe
claire, par la fonction de luminosité de la section 2 : sur une liste qui les
porte, c’est leur valeur ; sans 950, préréglage 9 ou liste importée, la règle
les calcule, 0,27 sur les courbes par défaut. `boutsDe` reçoit la liste avec
les courbes.

**Ce que 11 → 13 garde.** Les teintes, les parts et le préréglage Tailwind ne
changent pas. L’ancrage change dans deux cas, et il est juste qu’il change :
une référence de luminosité inférieure à 0,2425 s’ancre en Light sur 1000, et
une référence au-dessus de 0,945 s’ancre en Dark sur 1000 ou 1050. La nuance
950 perd alors les octets de la référence. Hors de ces cas, aucune couleur
existante d’une palette du modèle ne change. Le test le vérifie sur une
référence de chaque côté des deux seuils.

**Ce que 11 → 9 change.** Une référence ancrée sur 400 ou 950 s’ancre sur une
voisine, qui peut porter un emploi : `#8FB8F0` passe de 400 à 300 en Light, et
300 porte `border-decorative` et `surface` en état `active`. Les garanties
peuvent changer. Le compte du geste les nomme.

**L’étendue d’une rampe** est une notion distincte des bouts : la première et
la dernière luminosité de la liste de la palette. Elle sert à l’alerte
« Référence hors de la rampe », qui ne sonne plus pour une référence à 0,22
ancrée sur 1000 en préréglage 13. `etendueDe` la calcule, à côté de
`boutsDe`.

**Les poignées de l’éditeur de dérive** se posent sur les colonnes des
numéros 50 et 950, pas sur la première et la dernière colonne. Un numéro
absent de la liste, préréglage 9 ou palette libre, pose la poignée au bord de
la rampe, du côté de son bout, et son infobulle donne la luminosité du bout.
Un bout que la référence dépasse n’a pas de segment (`[DER-14]`), jugé sur
les bouts et non sur les extrémités de la liste.

**Au-delà de 950**, une nuance est plus foncée en Light, et plus claire en
Dark, où elle approche le blanc. L’aide de la carte le dit.

## 2. La palette libre

### Champ

Une palette libre porte `crans`, sa liste de numéros. Sa présence fait la
palette libre ; son absence, la palette du modèle.

- 4 à 13 numéros, entiers, multiples de 50, de 50 à 1050, strictement
  croissants, quel que soit le préréglage commun. Une liste égale à la liste
  commune est admise ;
- une palette libre ne porte pas `base`. Passer en mode libre retire `base` :
  les parts d’une base forcée redeviennent les parts communes, et l’aperçu le
  montre ;
- `parts`, `derive` et `nom` gardent leur sens.

### Luminosité d’un numéro

`luminositeAuNumero(recette, mode, n)` rend la luminosité du numéro `n` dans
un thème. Elle sert aux nuances libres et aux bouts :

1. `n` est dans `recette.crans` : la valeur commune ;
2. `n` tombe entre deux numéros communs : l’interpolation linéaire sur les
   numéros, entre leurs deux valeurs ;
3. `n` dépasse le dernier numéro commun `d` : la règle proportionnelle
   `v(d) + (bord − v(d)) × (D(n) − D(d)) / (bord − D(d))`, où `bord` vaut 0 en
   Light et 1 en Dark, et `D` est la courbe par défaut du préréglage 13 ;
4. `n` précède le premier numéro commun : la même règle, avec `bord` à 1 en
   Light et 0 en Dark.

`D` s’interpole comme en 2 pour un numéro que le préréglage 13 ne porte pas,
`d` compris. Sur la recette par défaut, la règle rend exactement 0,215 et
0,165 en Light, 0,96 et 0,98 en Dark. Elle reste strictement monotone et
n’atteint jamais le bord : avec une courbe Dark réglée à 0,97 au 950, 1000 et
1050 valent 0,983 et 0,991. Aucune palette libre n’est donc refusée à cause
des courbes communes.

La courbe d’une palette libre ne se range pas : elle suit les courbes
communes. Ses bouts de dérive sont ceux de la recette. À numéro égal et à
parts égales, une nuance libre et la nuance du modèle sont la même couleur,
sauf la nuance qui porte la référence exacte.

### L’analyse porte la liste

`AnalyseDePalette` gagne `crans` et `courbes`, ceux de la palette. Aucune vue
ne lit plus `recette.crans` pour les colonnes d’une palette : aperçu,
garanties, éditeur de dérive, pastilles proposées du sélecteur de couleur,
aperçu compact, planche, couleurs relues, rapport, fiche. Les lectures
communes restent : table des courbes, garantie des courbes, alerte de fond.
Les tests des vues emploient une liste libre de longueur et de numéros
différents de la liste commune, pour qu’une étiquette fausse échoue.

### Ancrage et rampes

`ancrageDe` et `fabriquerPalette` reçoivent la liste et les courbes de la
palette. La référence garde ses octets exacts, à la nuance libre la plus
proche de sa luminosité (`[MOT-17]`). Le profil porteur suit le classement
automatique.

### Ce que devient chaque endroit

| Endroit | Palette libre |
|---|---|
| Validation `crans-emplois`, `courbes-longueur` | Ne porte que sur la liste commune. La liste libre a ses propres règles |
| États des rôles, emplois | Aucun : `emploisDuCran` et les promesses ne s’appliquent pas |
| Garanties, `verifierPromesses` | Non calculées. Tout bilan qui écrirait « ✓ » écrit « Palette libre · N nuances » : carte des garanties masquée, tête des Réglages communs, fiche de l’onglet Planches, bilan de l’éditeur de dérive, en-tête de chaque thème de la planche |
| Garantie des courbes et alerte de fond | Communes : inchangées |
| Palettes proches | `distanceDePalettes` lit la liste de chaque palette et rend `null` si l’une manque de 500, 600 ou 700. Deux palettes qui portent ces trois numéros se comparent, libres ou non |
| Profils confondus | L’alerte vise les nuances des emplois : aucune. Le repère ≈ vient de `confusionsDe(rampes)`, commune à l’aperçu et à la planche, sur toute nuance ; l’alerte en filtre les nuances d’emploi |
| Couleur presque grise, parts grises | Inchangées |
| Référence hors de la rampe | Étendue de la liste libre |
| Préréglage Tailwind | Inchangé : bouts communs |
| Éditeur de dérive | Une colonne par nuance libre ; poignées selon la section 1 |
| Aperçu | Colonnes libres, sans accolades ni `on-solid` ; la ligne ◆ Référence reste |
| Sélecteur de couleur | Nuances et fonds proposés tirés de la liste de la palette |
| Planche | Rampes, note des repères et grilles ; ni usages, ni interface d’exemple. L’en-tête d’un thème dit « Palette libre · N nuances » à la place du verdict (W6.6) |
| Empreinte du cadre | Suit la liste libre, par le modèle |
| Importation | `crans` et `originale` entrent dans les champs nommés d’un écart ; `crans` change les couleurs |
| Rapport | La liste libre, `originale`, et aucune promesse. `FORMAT_DU_RAPPORT` reste 2 : les champs s’ajoutent |
| Ajuster la référence (W7) | Le lien sous le code de la référence reste ; aucune garantie en échec ne le propose, et le panneau ne montre ni garanties avant ni après |
| Architecture multi-marques | Une palette libre n’alimente pas `theme` (W6.7) |

## 3. La référence ajustée

Une palette ajustée porte `originale`, le code de sa couleur de référence
avant le premier ajustement, en majuscules. Absente, aucun ajustement.
`originale` et `reference` diffèrent toujours.

### La proposition

Le panneau tient un nombre de pas `k`. La proposition garde la chroma et la
teinte de l’originale, à la luminosité `L(originale) + k × 0,01`, fabriquée
comme un cran : `fabriquerCran(L, H, part)`, avec
`part = min(1, C / plafond(L, H))`. Garder la part de l’originale donnerait
`#159F48` au lieu de `#0DA047`. `k` reste tel que la luminosité tombe dans
[0, 1].

À l’ouverture, `k` vaut 0 sur une palette sans `originale`, et
`round((L(reference) − L(originale)) / 0,01)` sur une palette ajustée dont la
référence égale la proposition de ce `k`. Rien ne change tant que le designer
ne fait pas de pas (W7.3, W7.5).

### Le changement de numéro, annoncé avant

Avant chaque clic, le panneau calcule l’ancrage des propositions `k − 1` et
`k + 1`. Un bouton dont le pas changerait le numéro de la référence dans un
thème porte l’annonce sous lui : « Le pas suivant place la référence au 600
en Thème Dark. » C’est le cas réel : `#16A34A` s’ancre au 600 en Light et au
700 en Dark, `#0DA047` au 600 dans les deux.

### Les gestes

- « Appliquer » pose la proposition dans `reference` par `changerReference`,
  qui recalcule la dérive Tailwind, les parts grises et la part d’une base
  forcée ; il pose `originale` quand elle n’existe pas encore. Un second
  ajustement garde l’originale du premier. Une proposition égale à
  l’originale, à `k = 0`, agit comme « Revenir à l’originale ». Les garanties
  « après » du panneau se calculent sur cette palette complète ;
- « Revenir à l’originale » pose `originale` dans `reference`, par le même
  chemin, et retire `originale` ;
- le code saisi dans le panneau est une proposition : il garde l’originale,
  et le pas suivant repart de sa luminosité ;
- le code saisi dans la carte « Configuration de la palette », ou choisi au
  sélecteur de couleur, est une nouvelle référence : il retire `originale`,
  et une notice brève dans la zone de la note le dit, en rappelant que Ctrl+Z
  la rend. Un code égal à l’originale vaut « Revenir », sans notice.

## 4. Le format 3

`FORMAT_RECETTE` passe à 3. Les deux champs sont facultatifs :
`MIGRATIONS[2]` ne change que `formatVersion`, et une recette de format 1
passe par 1 → 2 → 3. Dès le premier rangement, la recette d’un fichier passe
au format 3, même sans champ nouveau : un plugin plus ancien la dira alors
« future ». Le plugin se publie donc avant qu’un fichier partagé ne soit
rangé par lui.

La migration change les couleurs d’une recette dont la liste importée ne
commence pas à 50 ou ne finit pas à 950, puisque les bouts se lisent
désormais à ces numéros, une liste de 9 nuances importée comprise. Un test
le constate. Le plugin n’a pas de notice de migration : les cadres de ces
palettes passent « À mettre à jour » par leur empreinte, ce qui suffit à le
signaler.

| Règle nouvelle | Chemin | Refuse |
|---|---|---|
| `crans-libres-nombre` | `palettes[i].crans` | moins de 4 ou plus de 13 numéros |
| `crans-libres-numeros` | `palettes[i].crans[j]` | un entier qui n’est pas un multiple de 50 entre 50 et 1050, ou qui ne suit pas le précédent |
| `base-libre` | `palettes[i].base` | `base` sur une palette libre |
| `originale-identique` | `palettes[i].originale` | `originale` égale à `reference`, à la casse près |

Un numéro qui n’est pas un nombre entier passe d’abord par `forme`.
`originale` passe aussi par `hexa-invalide`. Les quatre règles demandent
leur texte dans `REFUS`, et leur entrée dans l’inventaire des textes.
`nommerChamp` apprend `palettes[i].crans[j]`, et `CLES_DE_PALETTE` les deux
champs.

Tests à écrire avant le code du moteur :

- migration 2 → 3 et 1 → 3 ; une recette de version `FORMAT_RECETTE + 1` lue
  « future » ; une liste importée sans 950 en dernier, dont les couleurs
  changent ;
- chaque règle nouvelle, avec son chemin nommé et son texte ;
- chaque préréglage garde les rôles à leurs numéros ; 11 → 13 ne change
  aucune couleur hors des deux cas d’ancrage, vérifiés de chaque côté des
  seuils ; 11 → 9 déplace l’ancrage d’une référence au 400 ;
- la luminosité d’un numéro aux quatre cas, sur les courbes par défaut et sur
  une courbe réglée près du bord ;
- une palette libre sans 500 ne déclenche ni l’alerte des palettes proches ni
  une promesse ; deux palettes libres qui portent 500, 600 et 700 se
  comparent ;
- la référence garde ses octets exacts dans une palette libre ;
- l’importation d’une liste libre et d’une originale nomme ses champs et la
  nature de l’écart ;
- un pas sombre sur `#16A34A` donne `#0DA047` et annonce le 600 en Dark ; un
  aller-retour rend toute la palette, dérive et parts comprises, sans
  `originale`.

## 5. Ordre d’écriture

1. Moteur : `luminositeAuNumero`, bouts aux numéros 50 et 950, `etendueDe`,
   liste et courbes de la palette dans l’ancrage et les rampes,
   `confusionsDe`, `distanceDePalettes` par liste, validation et migration du
   format 3, proposition d’ajustement. Tests de la section 4.
2. Analyse et vues : `AnalyseDePalette.crans` et `.courbes`, puis chaque
   lecture de la liste commune pour une palette. Le compte des sites se
   refait avant de commencer.
3. Interface : réglage du préréglage (W6.4), choix du modèle et puces
   (W6.5), planche et fiche (W6.6), panneau d’ajustement (W7).
4. Documents : spécification, architecture multi-marques, inventaire des
   textes.

## Réponses de la revue

| Question | Réponse retenue |
|---|---|
| Bout sombre sans 950 : le fixer à 0,27, ou le lire à 900 ? | Ni l’un ni l’autre : le calculer par `luminositeAuNumero` au numéro 950. Il vaut 0,27 sur les courbes par défaut, suit une courbe réglée, et sert aux listes importées. Le lire à 900 retomberait dans l’écart mesuré par l’instruction (`#0E5DC7` contre `#0E5DC6` au 700) |
| Moitié de l’écart restant, ou refus de la palette libre ? | Jamais de refus : la validité d’une palette libre dépendrait des courbes communes. La règle proportionnelle remplace la règle additive et sa clause de moitié |
| Retirer `originale` à une saisie manuelle : faut-il une notice ? | Oui, une notice brève, sans confirmation (section 3) |
| Palettes libres hors des palettes proches ? | Non : elles se comparent dès que les deux listes portent 500, 600 et 700 |
