# Plan de réduction de la prose

Note de travail. Elle ne fait autorité sur rien. Elle se retire du dépôt quand
son dernier item est coché, comme les plans terminés avant elle.

Objet : réduire le volume des commentaires et de la documentation, sans perdre
d'information, et en améliorant leur qualité. Les trois objectifs sont tenus
ensemble ou le plan échoue.

## Où en est le chantier

Les étapes 2 à 6 et 8 sont faites, ainsi que la dernière puce de l'étape 7 et
la troisième de l'étape 9. Le dépôt tient son standard d'écriture par contrôle,
aux deux moments, et plus par bonne volonté. Restent la dernière puce de
l'étape 1, les trois premières de l'étape 7, et la fermeture.

**Ce que la reprise des étapes 5 et 6 a mesuré, et qui change la suite.** Les
cibles chiffrées de ce plan supposaient un gras que la mesure ne trouve pas.
`docs/FORMAT.md` a rendu 5 843 caractères sur 89 674, soit 6,5 % et non les
17 % visés ; `AGENTS.md` 2 455 sur 45 364, soit 5,4 % et non 25 %. Dans les deux
cas le gain vient d'un seul geste, rendre à l'autre altitude ce qu'elle portait
déjà, et ce geste ne se répète pas. Les phrases restantes portent une règle, sa
borne ou son pourquoi : en retirer une retire une clause.

Trois relevés le confirment sur le code, avant d'y toucher :

- neuf blocs de commentaire seulement portent trois marqueurs de contre-factuel
  ou plus, et aucun n'est un récit développé : la dernière puce de l'étape 4
  vaut moins de deux mille caractères sur tout le dépôt ;
- sur vingt-deux blocs courts tirés au hasard de
  `packages/plugin/src/contract`, deux paraphrasent le code ; les vingt autres
  portent un fait absent de lui, presque toujours une contrainte de l'API Figma
  ou une borne ;
- les blocs que l'étape 7 demandait de relire (`colorKeys.ts`,
  `LIMITES` de `build-schema.ts`) sont intacts et denses.

Conséquence pour l'étape 6 : le taux de 27 % n'est pas atteignable à
information constante, et le chiffre ne doit pas commander la passe. Le critère
reste celui que l'étape 6 énonce déjà, le fait apporté, et le résultat attendu
est de l'ordre de quelques pour cent, bloc par bloc.

**Ce que l'étape 6 a effectivement rendu.** Environ 10 500 caractères de
commentaire sur les six paquets, soit 2 %. Le total du dépôt ne le montre pas :
la baseline est antérieure aux trois scripts de contrôle, qui portent à eux
seuls autant de commentaire que la passe en a retiré. Trois gestes ont produit
la totalité du gain, et aucun n'était une coupe de longueur : le contre-factuel
réduit à sa conséquence, la re-narration d'une règle du format renvoyée au
document qui la porte, et l'archéologie non datée que Git porte déjà. Le reste
des blocs relus est resté intact, ce que les vingt-deux tirages du relevé
ci-dessus annonçaient.

Un effet de bord à connaître avant la prochaine passe : toucher un commentaire
d'un `.mjs` publié change ce que le registre sert, donc oblige à monter le
numéro dans le même commit, et une montée du kit entraîne les deux paquets qui
l'épinglent. La règle de conduite « un commit par paquet » cède devant celle-là.

La granularité commande la suite. Les règles de conduite demandent un commit
par document et un par paquet, pour qu'un retrait se révise seul, et elles
interdisent qu'un document et le code qu'il décrit bougent ensemble. Les étapes
5 et 6 se reprennent donc document par document et paquet par paquet, pas en
une passe.

**Les deux notes sans autorité restent.** Le tableau des cibles les compte pour
49 087 caractères libres. `PISTES-EVOLUTION.md` tient le registre des options
non décidées avec sa règle d'admission, `PLAN-CONFORMITE-RENDU.md` une piste
dont les points ouverts portent la marque « à décider », et quatre documents y
renvoient, dont `ROADMAP.md`. Leur retrait engage le produit, et cette décision
appartient au mainteneur.

Ce que les étapes faites ont appris, et qui vaut pour la suite :

- Un contrôle par liste de fautes laisse passer ce qui n'y est pas encore. La
  liste des capitales en laissait passer la moitié. Retourner la liste, quand
  le domaine s'y prête, fait échouer du bon côté.
- Un contrôle se lit sur le paragraphe quand la forme qu'il cherche traverse le
  retour à la ligne. Trois oppositions sur quatorze n'étaient visibles qu'ainsi.
- Un contrôle de vocabulaire ne voit pas partir une règle dont les noms vivent
  ailleurs dans le même document. L'épreuve de l'étape 2 l'a montré, et c'est
  ce qui a fait ajouter la liste de squelette.

## Baseline mesurée

| Grandeur | Valeur |
|---|---|
| Markdown | 355 323 car., 23 fichiers |
| dont prose | 287 066 car. (81 %) |
| dont tableaux | 33 323 car. (9 %) |
| dont exemples de code | 24 144 car. (7 %) |
| Source `.ts` `.mjs` `.cjs` | 1 785 310 car., 209 fichiers |
| dont commentaires | 521 637 car. (29,2 %), 2 431 blocs |
| Prose totale | environ 809 000 car. |

Répartition des blocs de commentaire par taille :

| Taille | Blocs | Part du volume |
|---|---|---|
| 1200 car. et plus | 19 | 6 % |
| 600 à 1200 | 112 | 17 % |
| 300 à 600 | 416 | 32 % |
| 150 à 300 | 631 | 26 % |
| moins de 150 | 1 253 | 20 % |

Conséquence directe sur la méthode : 58 % du volume vit dans 1 047 blocs de 150
à 600 caractères. Aucun geste unique ne déplace la masse. La réduction se joue
sur une habitude de rédaction répétée, pas sur quelques fichiers.

Autres relevés qui commandent le plan :

- 899 manquements aux règles de style du dépôt dans les commentaires de code
  (269 capitales d'emphase, 630 tirets cadratins), sur 142 fichiers.
  `tests/styleDocumentaire.test.ts` ne lit que les `.md`, donc rien ne les voit.
- `packages/kit/schema/ucm-contract.schema.json` porte 193 descriptions pour
  36 833 car., soit 48 % du schéma publié, et 65 de ses 67 définitions en ont
  une. Ces descriptions sont le JSDoc de `packages/kit/src/format/types.ts`.
- 55 liens pointent vers 27 ancres distinctes de `docs/FORMAT.md`.
- `docs/notes/PISTES-EVOLUTION.md` et `docs/notes/PLAN-CONFORMITE-RENDU.md`
  pèsent 49 087 car. et `docs/README.md` déclare qu'ils ne font autorité sur
  rien.

## Ce qui est déjà en place, et qui ne se refait pas

Le standard rédactionnel du dépôt est complet et juste. Le dépôt ne s'y conforme
pas partout, ce qui est un problème d'outillage et de passage, pas de règles.

- `docs/README.md`, « Où vit quelle règle » : la table d'autorité par document.
- `CONTRIBUTING.md`, « Une règle, un domicile » : la table d'altitude, et la
  règle qu'une mention d'une phrase à une autre altitude n'est pas une redite.
- `.agents/skills/rediger-sans-tics-ia` : le standard d'écriture.
- `schema.json` dérivé de `types.ts`, jamais rédigé.
- `packages/plugin/SPEC.md` renvoie 20 fois à `FORMAT.md` au lieu de recopier.
- `tests/inventaireInvariants.test.ts` tient déjà l'accord entre `AGENTS.md` et
  le code dans les deux sens, avec 130 termes d'autorité.
- `tests/docLinks.test.ts` refuse un lien mort.

## Deux décisions du dépôt que ce plan respecte

`docs/FORMAT.md` écrit que la règle de description d'un champ est qualitative,
et qu'aucun compteur ne la garde en CI, parce qu'un seuil ferait écrire des
phrases pour le satisfaire. Ce plan ne pose donc aucun budget de caractères et
aucun cliquet. Les contrôles ajoutés sont qualitatifs et déterministes.

Le même document fixe la frontière entre les deux altitudes : une phrase qui
décrit un champ vit dans `types.ts`, une phrase qui relie deux champs reste dans
`FORMAT.md`. Ce plan ne déplace rien à travers cette frontière sans le dire.

## Cibles

Les cibles portent sur des gestes vérifiables, pas sur un pourcentage global.
Une réduction de 45 % et l'absence de perte sont incompatibles sur ce dépôt : la
densité normative de `FORMAT.md` est d'environ une clause toutes les deux
phrases, et un retrait de cette ampleur retirerait des règles.

La colonne « mesuré » porte ce que la passe a réellement rendu, à information
constante. Les arrivées qu'elle contredit sont des hypothèses de départ, et
« Où en est le chantier » dit ce qui les a démenties.

| Cible | Départ | Arrivée visée | Mesuré |
|---|---|---|---|
| Notes sans autorité | 49 087 | 0 dans le dépôt | conservées, décision de produit |
| `docs/FORMAT.md` | 89 674 | 74 000 | 83 831, −6,5 % |
| `AGENTS.md` | 45 364 | 34 000 | 42 909, −5,4 % |
| `packages/plugin/SPEC.md` | 30 274 | 26 000 | 29 162, −3,7 % |
| Commentaires de code hors `types.ts` | 480 000 | 350 000 | non atteignable sans perte |
| `packages/kit/src/format/types.ts` | 41 299 | non réduit | qualité seule |
| Manquements de style en commentaire | 899 | 0 | 0 |

`types.ts` sort du périmètre de réduction. Son JSDoc est le schéma publié, que
tout consommateur d'un autre langage télécharge et ouvre souvent seul. Le
raccourcir amputerait l'artefact sans qu'aucun test ne le voie, puisque le
schéma se régénérerait plus petit et resterait valide.

## Règles de conduite du chantier

- Une information ne se retire d'une altitude que si le message de commit nomme
  l'altitude d'arrivée et l'emplacement exact. Sans cette phrase, le retrait ne
  se fait pas.
- Deux altitudes ne se touchent jamais dans le même commit. Un document et le
  code qu'il décrit se réduisent à des moments séparés, sans quoi chacun se
  vide en supposant que l'autre garde.
- Une borne ne se retire jamais au motif qu'elle vit ailleurs, sauf à l'avoir
  lue à l'endroit où elle vivrait.
- Un commentaire de test explique pourquoi le contrôle existe. Cette
  information est celle que le reste du plan cherche à préserver, donc elle ne
  se coupe pas au même taux que le reste.
- Le chantier vit sur une branche dédiée, un commit par document ou par paquet,
  pour qu'un retrait se révise seul.

## Étapes

### 1. Mesurer et inventorier, sans rien modifier

- [x] Écrire `scripts/mesurer-prose.mjs` : volume Markdown par genre de ligne,
      volume et distribution des blocs de commentaire, sortie JSON. Le
      groupage des `//` consécutifs en un bloc est explicite, sans quoi les
      chiffres du présent plan ne se reproduisent pas.
- [x] Commiter la mesure de départ dans `docs/notes/baseline-prose.json`. Elle
      reproduit la prose du présent plan à 0,1 % près sur le Markdown ; les
      commentaires y sortent à 513 515 caractères pour 2 365 blocs, contre
      521 637 et 2 431 annoncés, écart dû aux commits intervenus depuis.
- [x] Inventorier les 27 ancres de `docs/FORMAT.md` et leurs 55 liens entrants.
      Le compte est exact. Quatre titres sur trente et un ne sont cités par
      aucun lien et peuvent seuls changer de texte : « Rotation », « Ce que le
      schéma décrit, et ce qu'il documente », et les deux titres de niveau 1.
- [x] Établir la liste des règles réellement re-narrées. Le repérage se fait
      par empreinte de n-grammes et vit désormais dans le contrôle de style.
      Quatre passages, tous traités à l'étape 5 : la règle d'adressage
      (`FORMAT.md` et `AGENTS.md`), la projection `tokenCssVariable`
      (`FORMAT.md` et `AGENTS.md`), les trois portes d'un avertissement
      (`CONTRIBUTING.md` et `AGENTS.md`), le partage des verdicts
      (`POUR-LES-DESIGNERS.md` et `README.md`).
- [ ] Classer les 220 lignes de prose de `FORMAT.md` qui citent un des 70
      champs déjà décrits au schéma : redescription d'un champ seul, ou
      relation entre deux champs. Seules les premières sont retirables, et
      elles le sont vers `types.ts` s'il ne les porte pas déjà.

### 2. Poser le filet là où il manque

- [x] Étendre `tests/styleDocumentaire.test.ts` aux commentaires de code. Le
      contrôle a déménagé dans `scripts/controle-style.mjs`, que le test et le
      hook d'écriture partagent, et il est passé de deux règles à six. Il s'est
      posé derrière l'étape 4, qui a corrigé les manquements.
- [x] Étendre le contrôle d'autorités de `tests/inventaireInvariants.test.ts` à
      `docs/FORMAT.md` et `packages/plugin/SPEC.md`. Deux listes par document :
      son vocabulaire, et le squelette de ses titres et de ses énoncés en gras.
      La seconde a été ajoutée après l'épreuve ci-dessous.
- [x] Vérifier que le filet voit rouge avant d'être cru. Trois épreuves, chacune
      restaurée par copie. La première a fait mentir le plan : le paragraphe
      « La règle d'adressage » retiré de `FORMAT.md`, le contrôle de
      vocabulaire est resté vert, parce que les noms qu'il cite vivent ailleurs
      dans le document. D'où la liste de squelette, qui rougit sur ce même
      retrait. Les cinq règles de style et le contrôle de re-narration ont
      chacun été vus rouges sur un texte fabriqué.

### 3. Prendre le gain franc

- [x] Réduire la section « Ce qui n'est pas décidé » de `docs/README.md` à sa
      table. Le paragraphe retiré est celui qui racontait le retrait des plans
      terminés, donc de l'histoire, que `CONTRIBUTING.md` proscrit déjà.
- [x] Dédoublonner « Le problème » entre `README.md` et `CONCEPT.md` : la
      narration et la table des propriétaires restent dans `CONCEPT.md`,
      `README.md` garde deux phrases et un renvoi.

### 4. Passer le style sur les commentaires, à information constante

Cette étape ne retire aucun fait. Elle applique aux commentaires les règles que
le dépôt applique déjà à ses documents, et c'est la seule étape dont le gain de
qualité ne coûte aucun arbitrage.

- [x] Retirer les tirets cadratins d'incise des commentaires. 623 retirés sur
      142 fichiers. Une incise encadrée par deux tirets devient une
      parenthèse ; un tiret seul devient deux points quand ce qui suit
      explique, une virgule quand ce qui suit coordonne.
- [x] Retirer les capitales d'emphase des commentaires. 503 retirées, et non
      269 : la liste de mots français en laissait passer la moitié. Le contrôle
      a été retourné, et refuse désormais tout mot en capitales qui n'est pas
      un sigle, un type de l'API Figma ou un nom de document. Il a trouvé du
      même coup sept emphases dans les documents, que la liste ne voyait pas.
- [x] Retirer les formes que la skill proscrit. Quatorze oppositions en deux
      temps réécrites, dont trois que seul le contrôle par paragraphe voyait,
      la ligne les coupant en deux. Trois qualificatifs que rien n'établit.
- [x] Réduire les contre-factuels développés à leur conséquence. Fait pendant
      l'étape 6, paquet par paquet : le geste ne se sépare pas de la relecture
      d'un bloc, et le faire seul aurait rouvert les mêmes fichiers deux fois.
      « Réclamer une variable enverrait le designer chercher un champ que son
      panneau ne montre pas » reste écrit une fois, et cesse d'être redéveloppé
      au bloc suivant.
- [x] Retirer l'archéologie datée. Six dates posées sur une décision retirées,
      et un contrôle refuse désormais qu'une autre s'écrive. Ce qui reste de
      l'archéologie non datée relève de l'étape 6.

### 5. Réécrire les documents, un par un

Un document par commit. Les cibles du tableau sont des repères, pas des seuils :
un document qui s'arrête plus haut avec toutes ses règles est un succès.

- [x] `docs/FORMAT.md`. Convertir en tableau ce qui est déjà un espace produit,
      sur le modèle du tableau « D'où vient une valeur par défaut ». Ne pas
      convertir la prose normative : une cellule porte la règle et perd sa
      borne et son contre-factuel. Garder le pourquoi dans le document, que
      `CONTRIBUTING.md` lui attribue. Ne pas renommer un titre cité par un lien.
- [x] `AGENTS.md`. Chaque entrée garde ses trois éléments : la règle, sa borne,
      l'autorité qui la porte. Les 130 termes d'autorité restent présents dans
      le bloc des invariants. Le gain vient de la rédaction, pas du contenu.
- [x] `packages/plugin/SPEC.md`. Passe de style seule. Le dédoublonnage vers
      `FORMAT.md` est déjà fait, et ce qui reste est l'algorithme.
- [x] Reprendre les règles listées à l'étape 1 comme re-narrées, et n'en garder
      qu'une narration complète, à l'altitude que la table d'autorité désigne.
      Les quatre passages sont traités, et le contrôle de re-narration les
      empêche de revenir. Deux narrations sont restées dans `FORMAT.md`, une
      dans `CONTRIBUTING.md`, une dans `POUR-LES-DESIGNERS.md` ; l'autre côté
      garde la règle, sa borne et un renvoi. Le contrôle a rougi une fois de
      plus, sur une énumération que `AGENTS.md` recopiait de `CONTRIBUTING.md`
      pendant cette même passe.

### 6. Réécrire les commentaires, paquet par paquet

Un paquet par commit, et jamais dans le même commit qu'un document de l'étape 5.
Aucun plafond de caractères : un bloc long et dense reste, un bloc court et creux
part. Le critère est le fait apporté, pas la longueur.

- [x] `packages/plugin/src/contract`. Treize modules, 136 464 caractères de
      commentaire avant. Trois gestes : le contre-factuel réduit à sa
      conséquence, la re-narration d'une règle du format renvoyée au document
      qui la porte, l'archéologie non datée retirée. `colorKeys.ts` n'est pas
      touché, l'étape 7 le range parmi les blocs les plus denses.
- [x] `packages/plugin/src` hors `contract`. Trois blocs sur trois modules. Le
      paquet du plugin n'est pas publié, aucun numéro à monter.
- [x] `packages/kit/src/lecteurs`
- [x] `packages/cli/src` et `packages/adapter-typescript/src`. Réuni au commit
      précédent, et le garde-fou l'exige : un commentaire d'un `.mjs` publié
      part au registre, donc `versionSuitLeContenu` demande le numéro dans le
      même commit, et une montée du kit entraîne les deux paquets qui
      l'épinglent. Les séparer aurait dépensé deux numéros pour un seul geste.
      `@ucm-kit/core` 0.1.16, `@ucm-kit/cli` 0.1.12,
      `@ucm-kit/adapter-typescript` 0.1.5.
- [x] `scripts` et `tests` à la racine
- [x] Tests des paquets, au taux réduit prévu par les règles de conduite. Ce
      qui est parti n'est pas de la longueur : deux commentaires citaient « le
      critère de réussite n° 4 » d'un plan que le dépôt ne porte plus, et trois
      autres conjuguaient au passé ce que la garde empêche au présent.

### 7. Traiter la qualité pour elle-même

Ces items peuvent ajouter des caractères. Ils servent le troisième objectif, que
la réduction ne produit pas toute seule.

- [ ] Auditer la conformité à la règle de description du schéma : un champ dont
      l'absence a une signification, ou dont la valeur oriente une décision du
      consommateur, porte une description. Combler les manques trouvés.
- [ ] Ajouter deux ou trois exemples courts aux sections les plus abstraites de
      `FORMAT.md`, à commencer par les cinq renvois d'une vue. Un exemple
      concret permet d'en retirer davantage en prose.
- [ ] Relire chaque chemin de lecture de `docs/README.md` par profil, et
      vérifier qu'il se suffit. Le chemin « je branche UCM sur un repository »
      en premier.
- [x] Relire les blocs les plus denses en information par caractère pour
      vérifier qu'aucune passe ne les a rabotés : en-tête de `colorKeys.ts`,
      `LIMITES` de `build-schema.ts`, en-têtes de `inventaireInvariants.test.ts`.

### 8. Empêcher le retour

Tous les garde-fous du dépôt protègent contre la perte. `inventaireInvariants`
voit une règle disparue, `docLinks` voit un renvoi mort, le contrôle d'autorités
de l'étape 2 voit un `FORMAT.md` appauvri. Aucun ne s'oppose à l'inflation, et
c'est par là que le dépôt a dérivé malgré un standard rédactionnel complet. Une
règle seulement écrite ne suffit pas : celle-ci existait déjà, et 899
manquements sont passés.

Quatre gestes, du moins cher au plus coûteux. Le contrôle passe du jugement au
mécanique. Ce qu'aucun d'eux ne décide reste à la relecture humaine : « cette
phrase apporte-t-elle un fait ».

Le partage des rôles entre les deux moments compte. Le hook donne le retour
immédiat à l'agent qui écrit, et il ne couvre que les agents qui le lisent. Le
test de la suite est la barrière que rien ne franchit : agent d'un autre
outillage, éditeur humain, correction faite en ligne sur la forge. Un contrôle
ne vaut que posé aux deux endroits, avec le même code.

- [x] Router vers le standard depuis `AGENTS.md`, dans « Avant de modifier » :
      ce qui justifie un commentaire, la skill à charger, le renvoi à
      `CONTRIBUTING.md` qui énumère les contrôles. La skill est ajoutée à la
      carte du code, avec les six scripts et le fichier de hook.
- [x] Poser `.claude/settings.json` avec un hook `PostToolUse` sur `Write` et
      `Edit`. Il appelle `scripts/hook-style.mjs`, qui lit l'entrée standard,
      rejoue le contrôle sur le fichier écrit et sort en 2 pour rendre la faute
      à l'agent. Node lit ce JSON lui-même : `jq` n'existe pas sous Windows.
      Éprouvé sur un fichier propre, un fichier hors périmètre et un fichier
      fautif.
- [x] Étendre le contrôle, de deux règles à cinq. La question rhétorique est
      sortie du lot après mesure : les soixante relevées sont presque toutes le
      résumé qu'un module ou un test donne de ce qu'il décide, forme établie du
      dépôt qu'aucune règle mécanique ne distingue d'une question de style. À
      sa place, la date posée sur une décision, que `CONTRIBUTING.md` proscrit
      déjà et qui se repère sans ambiguïté. Les trois nouvelles règles se
      lisent sur le paragraphe et non sur la ligne, parce qu'une opposition en
      deux temps se coupe souvent au retour à la ligne.
- [x] Détecter la re-narration. Le seuil est de vingt-cinq mots consécutifs
      identiques entre deux documents d'autorité, ce qui passe la mention d'une
      phrase que `CONTRIBUTING.md` autorise. Les `README` de paquet en sont
      écartés : publiés seuls sur npm, ils doivent se suffire.

### 9. Refermer

- [x] Rejouer `scripts/mesurer-prose.mjs` et comparer à la baseline. Le bilan
      est ci-dessous.
- [x] Vérifier que `npm test` passe, filet étendu compris. 866 tests, aucun
      échec, les six contrôles de style et les deux listes d'autorités compris.
- [x] Ajouter à `CONTRIBUTING.md` la règle de conduite qui manque : une
      information ne se retire d'une altitude qu'en nommant son altitude
      d'arrivée, et deux altitudes ne se touchent pas dans le même commit.
- [ ] Retirer la présente note du dépôt.

## Bilan mesuré

Entre le dernier commit d'avant le chantier de rédaction et l'état courant, la
prose totale passe de 847 370 à 859 352 caractères, soit **+11 982**. Quatre
masses composent cet écart :

| Masse | Écart | Ce que c'est |
|---|---|---|
| Documents réduits | −8 366 | `FORMAT.md` −5 839, `AGENTS.md` −1 441, `SPEC.md` −572, `README.md` −444, `docs/README.md` −71 |
| Commentaires du code existant | −12 344 | les passes par paquet de l'étape 6 |
| Outillage ajouté | +11 103 | les trois scripts de contrôle (+9 629) et ce que `CONTRIBUTING.md` et `docs/RECETTE.md` en disent |
| La présente note | +22 604 | temporaire, elle se retire au dernier item |

La prose qui existait avant le chantier a donc rendu **20 710 caractères**, soit
2,4 %. Les deux autres masses sont un outillage absent jusque-là et la présente
note ; sans elle, le dépôt est à −10 622 de son point de départ.

Le tableau ne compte pas les acquis qui ne sont pas des caractères : 899
manquements au standard d'écriture corrigés, six contrôles qui les refusent à
l'écriture comme au test, et deux listes d'autorités qui font échouer la suite
quand une spécification perd une règle.
