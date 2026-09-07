# Plan d'action : ce qui doit être corrigé

Établi le 7 septembre 2026, après vérification directe du dépôt, du registre npm
et de l'API GitHub. Chaque point porte la preuve qui l'établit, et rien n'y est
repris d'une analyse sans avoir été remesuré. Les points classés par criticité :
d'abord ce qu'un lecteur extérieur rencontre, ensuite ce qui laisse un défaut
entrer, enfin ce qui coûterait cher plus tard.

## Ce que la mesure a donné

| Contrôle | Résultat |
|---|---|
| `npm test` | 851 cas, 0 échec (19 adaptateur, 41 CLI, 259 noyau, 514 plugin, 18 monorepo) |
| `npm run typecheck` | vert, quatre paquets |
| `npm audit --omit=dev` | 0 vulnérabilité |
| Tarball `@ucm-kit/core` publié comparé au dépôt | identique, aux fins de ligne près |
| Tarball `@ucm-kit/cli` publié comparé au dépôt | identique |
| `ucm init` puis `ucm check` depuis un dossier vierge | cinq fichiers écrits, sortie 0, message d'avancement correct |

Le dépôt est sain. Les défauts ci-dessous vivent tous à la frontière que le
dépôt ne peut pas observer depuis lui-même, ou dans la documentation.

---

## 1. Critique : le README de GitHub renvoie vers une version que le registre ne sert pas

- [x] **Fait le 7 septembre 2026 : l'adaptateur est publié en 0.1.3.** L'entrée
      d'éditeur de confiance a été recréée chez npm, le workflow est passé, et la
      commande des deux README s'exécute. Vérifié depuis un dossier vide : le
      paquet se résout, sa surface porte les trois fonctions attendues, et il
      tire `@ucm-kit/core@0.1.14`, l'épingle exacte.

**Constat.** [README.md](../../README.md) et
[packages/adapter-typescript/README.md](../../packages/adapter-typescript/README.md)
proposent d'installer l'adaptateur en 0.1.3. Le registre ne sert que la 0.1.0.

**Preuve.**

```text
$ npm view @ucm-kit/adapter-typescript@0.1.3 version
npm error code E404
npm error 404  '@ucm-kit/adapter-typescript@0.1.3' is not in this registry.
```

**Portée exacte, plus étroite que prévu.** La page npm du paquet n'est pas
touchée : le README parti avec la 0.1.0 épingle la 0.1.0 et le CLI en 0.1.7,
deux versions qui existent. C'est le dépôt GitHub qui porte la commande morte,
donc le premier endroit qu'une équipe extérieure ouvre.

**Cause de fond, et elle est refermée.** La publication échouait en `ENEEDAUTH`,
faute d'entrée d'éditeur de confiance valide chez npm, alors que les deux autres
paquets passaient par le même chemin OIDC. Le geste correctif appartenait au
compte npm et pas à ce dépôt. L'entrée a été recréée, et la publication est
passée sans qu'une ligne du dépôt change.

**Correction, deux voies.**

1. Recréer l'entrée d'éditeur de confiance chez npm en visant
   `Vassili-g/UCM-Exporter` et le workflow `publish.yml`, puis publier la 0.1.3.
   C'est la voie qui rend vraie la documentation actuelle.
2. Si la publication reste bloquée, reculer les deux README sur la version que
   le registre sert. Cette voie demande de toucher d'abord le point 3, car le
   garde-fou des pins refuse aujourd'hui cette écriture.

**Fini quand** la commande écrite dans les deux README s'exécute sans erreur
depuis un dossier vide.

---

## 2. Critique : la protection de branche est disponible et non activée, et la documentation dit le contraire

- [ ] Activer la protection de `main` sur UCM-Exporter, en exigeant le job `test`.
- [ ] Corriger les deux documents qui affirment que le plan GitHub l'interdit.

**Constat.** [ROADMAP.md](../../ROADMAP.md) range parmi les limites : « Les
protections de branche sont indisponibles sur le plan GitHub actuel ».
[PLAN-CONFORMITE-RENDU.md](./PLAN-CONFORMITE-RENDU.md) le répète pour les deux
repositories. C'est faux pour l'Exporter.

**Preuve.** GitHub sépare lui-même les deux cas, et les codes le disent :

```text
$ gh api repos/Vassili-g/UCM-Exporter/branches/main/protection
404  "Branch not protected"

$ gh api repos/Vassili-g/UCM-Playground/branches/main/protection
403  "Upgrade to GitHub Pro or make this repository public to enable this feature."
```

Un 404 signifie que la fonctionnalité répond et qu'aucune règle n'est posée. Un
403 signifie qu'elle est refusée. L'Exporter est public, `gh api ... /rulesets`
y répond `[]` sans erreur : la protection y est ouverte, gratuite, et
simplement jamais activée. Le Playground, lui, est privé, et la limite y est
réelle.

**Pourquoi c'est critique.** Le plan de conformité du rendu écrit que son bloc F
« ne consomme aucun jour de développement mais conditionne l'utilité de tous les
autres ». Une prémisse fausse a donc gelé le geste le moins cher du projet, et
la CI de l'Exporter reste consultative alors qu'elle pourrait bloquer aujourd'hui.
[ci.yml](../../.github/workflows/ci.yml) tourne déjà sur chaque pull request et
fournit le contrôle à exiger.

**Fini quand** une pull request en échec ne peut plus être fusionnée sur
l'Exporter, et que les deux documents ne parlent de limite de plan que pour le
Playground.

---

## 3. Critique : aucun garde-fou ne compare le dépôt au registre

- [ ] Ajouter un contrôle qui confronte la version portée à la version servie.

**Constat.** [tests/pinDocumente.test.mjs](../../tests/pinDocumente.test.mjs)
vérifie que chaque commande épinglée dans la documentation porte la version que
le dépôt porte. Il mesure donc le dépôt contre lui-même. Il exige aujourd'hui
que les README annoncent la 0.1.3, c'est-à-dire exactement le 404 du point 1 :
le garde-fou impose l'état cassé et refuserait sa correction.

La démonstration tient dans ce document même : écrire ici la commande corrigée,
avec le numéro que le registre sert, ferait rougir `npm test`. Seule
[docs/RECETTE.md](../RECETTE.md) est exemptée, parce qu'elle se joue sur ce qui
est publié.

**Ce que le dépôt sait déjà.** L'« Épreuve du registre » de
[publish.yml](../../.github/workflows/publish.yml) couvre la moitié postérieure
du problème, un paquet publié qui ne s'installe pas, et elle existe parce que
son absence a coûté le 0.1.6. La moitié antérieure reste ouverte : une
documentation qui annonce une version que personne ne sert. Le diagnostic écrit
à l'époque vaut mot pour mot : le seul endroit où le mensonge existe est le
registre, et le seul moyen de l'y voir est d'y aller.

**Correction.** Un contrôle qui, pour chaque paquet, lit `npm view <paquet>
version` et le confronte à ce que le dépôt porte et à ce que la documentation
épingle. Sa place n'est pas dans `npm test`, où le réseau deviendrait une
dépendance cachée et rendrait la suite rouge hors ligne. Sa place est dans
`publish.yml`, en amont de la publication, symétrique de l'épreuve qui existe
déjà en aval.

**Fini quand** un README qui épingle une version absente du registre fait rougir
la publication, et qu'il devient possible d'écrire un numéro publié dans un
document sans faire rougir la suite.

---

## 4. Majeur : la recette se contredit sur l'origine du plugin

- [x] **Fait le 7 septembre 2026.** La section finale disait que le guide charge
      le plugin en développement ; elle dit maintenant que la recette éprouve le
      bundle de la Community, et nomme ce qui reste hors champ : soumettre une
      version plus récente, et le code du plugin tant qu'il n'est pas celui que
      la Community sert.

**Constat.** [docs/RECETTE.md](../RECETTE.md) dit à l'étape 1 que le plugin
vient de la Figma Community et qu'« il n'y a ni build local à faire, ni
manifeste à importer ». Sa dernière section dit l'inverse : « ce guide charge
néanmoins le plugin en développement, puisque le `dist` du dépôt est ce qu'il
faut éprouver ».

**Origine.** Un reste du commit qui a fait partir la recette du plugin publié.
L'étape a été réécrite, la section finale ne l'a pas suivie.

**Pourquoi ça compte.** C'est la première décision que prend celui qui joue la
recette, et les deux réponses ne prouvent pas la même chose. Le reste du
document est juste : ses pins correspondent à ce que le registre sert, et sa
règle d'or est déjà énoncée.

**Fini quand** une seule origine du plugin est écrite dans la page.

---

## 5. Majeur : le Playground renvoie vers un guide supprimé

- [x] **Fait le 7 septembre 2026.** Le lien vise `docs/RECETTE.md`. Les deux
      seuls liens sortants du Playground vers l'Exporter ont été revérifiés à la
      main, faute de test qui les couvre.

**Constat.** Le README d'UCM-Playground pointe vers
`docs/plans/GUIDE-RECETTE-REPO-VIERGE.md` dans l'Exporter. Le dossier
`docs/plans/` a été supprimé, et l'autorité est désormais
[docs/RECETTE.md](../RECETTE.md).

**Pourquoi aucun test ne le voit.** Le contrôle des liens de l'Exporter ne
parcourt que son propre dépôt. Un lien sortant vers un fichier supprimé ici
n'est vu par personne, et il casse le parcours du lecteur au moment précis où il
cherche la recette.

**Fini quand** le lien ouvre la recette, et que le README du Playground ne cite
plus aucun chemin absent de l'Exporter.

---

## 6. Majeur : le garde-fou de recette calcule sa borne depuis Git, pas depuis le registre

- [ ] Faire porter la borne sur la dernière version publiée.

**Constat.** [scripts/recette-externe.mjs](../../scripts/recette-externe.mjs)
réclame aujourd'hui une recette externe pour les trois paquets, dont deux sont
déjà publiés à la version que le dépôt porte :

```text
$ node scripts/recette-externe.mjs kit
Depuis 4d772c1, borne de la version publiée précédente, le dépôt a changé
dans des chemins que seule la recette externe parcourt de bout en bout.
```

La borne est le parent du commit qui a posé le numéro courant. Quand ce numéro
est déjà servi, la borne ne désigne plus la publication précédente mais la
publication en cours. Le garde-fou raisonne juste sur un dépôt en avance, et
faux sur un dépôt à jour.

**Lien avec le point 3.** C'est le même angle mort, sur un autre outil : deux
garde-fous déduisent du seul Git un état qui vit sur le registre. Les corriger
ensemble évite d'écrire deux fois la même lecture.

**Fini quand** le script se tait pour un paquet dont la version portée est déjà
servie, et ne réclame la recette que pour ce qui reste à publier.

---

## 7. Mineur : le plan de conformité du rendu promet plus que son interface ne permet

- [ ] Redéfinir l'entrée du comparateur avant d'écrire la moindre ligne.

**Constat.** Le bloc B de
[PLAN-CONFORMITE-RENDU.md](./PLAN-CONFORMITE-RENDU.md) définit le comparateur
comme « une fonction qui reçoit un contrat, une combinaison et le HTML produit ».
Quatre des dix familles qu'il annonce ne se lisent pas dans du HTML : les
dimensions calculées, la disposition réelle, l'occupation de la place, et
l'absence de valeurs écrites en dur. Un texte de balisage ne porte ni styles
calculés, ni géométrie, ni le résultat de la cascade.

**Ce que le plan voit déjà.** Il reconnaît qu'un affichage sans navigateur
n'atteint ni le survol ni le focus, il range la priorité des états parmi ce qui
ne sera pas vérifié, et il pose neuf questions ouvertes. C'est une note de
recherche, pas un engagement : la corriger coûte une section, pas un chantier.

**Deux limites que le plan ne nomme pas encore.** Une valeur calculée ne dit pas
quel token l'a produite, deux tokens de même valeur devenant indiscernables. Et
l'axe des états ne se transmet pas comme une option : il se déclenche.

**Correction.** Faire porter l'entrée du comparateur sur une observation
normalisée, produite par un navigateur réel, plutôt que sur du balisage : racine,
chemins de slots, styles calculés, géométrie, état d'interaction, et les limites
de l'observation elle-même. Le comparateur reste indépendant de React ; il ne
peut pas rester indépendant d'un protocole d'observation.

**Fini quand** l'entrée décrite dans le bloc B permet les dix familles qu'il
annonce, ou que la liste est réduite à ce que l'entrée permet.

---

## 8. Mineur : la publication dépend de la version de npm du jour

- [ ] Épingler la version de npm installée par le workflow.

**Constat.** [publish.yml](../../.github/workflows/publish.yml) exécute `npm
install -g npm@latest`. La montée répond à une contrainte réelle, le trusted
publishing n'existant qu'à partir de npm 11.5.1, mais elle rend la publication
dépendante de ce que le registre sert ce jour-là. Le fichier note lui-même avoir
mesuré la 12.0.2 en CI.

C'est le seul endroit du projet qui n'épingle pas, alors que la règle est tenue
partout ailleurs, jusque dans les commandes de la documentation.

**Fini quand** le workflow installe une version connue et testée, montée
volontairement.

---

## 9. À surveiller : deux copies du noyau chez le consommateur

Aucune action immédiate. L'adaptateur servi épingle `@ucm-kit/core` en 0.1.11
tandis que le CLI servi l'épingle en 0.1.14. Un consommateur qui installe les
deux reçoit donc deux copies du noyau.

C'est sans effet aujourd'hui, et c'est vérifié : les deux versions portent la
même fenêtre de lecture, 11.0 à 12.0, et la même version de contrat courante. La
surface que le CLI exige de l'adaptateur est présente dans la version servie. La
recette peut se jouer.

Le point disparaît dès que l'adaptateur est publié à son numéro courant, ce qui
est le point 1. Il redeviendrait bloquant si la fenêtre de lecture bougeait sans
que l'adaptateur suive.

---

## Ce qui a été vérifié puis écarté

| Affirmation examinée | Ce que la mesure a montré |
|---|---|
| Le dépôt porterait trois versions prêtes et non publiées | Faux depuis le dernier commit : la recette a été alignée sur le registre, et le texte n'existe plus |
| La recette épinglerait des versions périmées | Faux : ses pins correspondent à ce que le registre sert, et son étape 6 vise bien la version publiée de l'adaptateur |
| Le contenu publié pourrait différer du dépôt | Faux : les tarballs du noyau et du CLI sont identiques au dépôt, aux fins de ligne près. La faute du 0.1.6 ne s'est pas reproduite |
| La suite compterait 532 cas | Faux : 851 cas, répartis sur cinq exécutions |
| Le Playground serait vide | Imprécis : il porte treize fichiers, mais il est bien vidé de tout UCM, et sa préparation pour la recette est correcte |
| Une garde morte dans l'élision des valeurs neutres | Vrai et sans effet : `typeof value === 'object'` exclut déjà `undefined`. Aucune conséquence sur le contrat produit |
| Des fins de ligne mêlées dans le noyau publiable | Local seulement : l'index est en LF partout, seule la copie de travail Windows diverge. Rien n'atteint le consommateur |
| L'absence de mesure de couverture | Exact, et volontairement laissé de côté : le rapport de 851 cas pour 87 fichiers de test ne souffre pas d'un défaut de volume |
