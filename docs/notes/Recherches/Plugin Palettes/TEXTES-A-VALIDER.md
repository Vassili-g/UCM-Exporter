# UCM Palettes : textes à valider

Ce document ouvre le point M2 du [plan](./PLAN-PLUGIN-PALETTES.md). Chaque
message que le plugin montre au designer y figure en deux rédactions, A et B,
chacune en trois parties : où, quoi, geste
([`[VER-09]`](./RECHERCHE-PLUGIN-PALETTES.md#114-sévérités-et-messages)).
Le mainteneur choisit une rédaction par message, ou écrit la sienne dans la
colonne « Retenue ». Les textes retenus entrent dans le module des textes de
l'interface au lot 4 ; d'ici là, l'interface emploie la rédaction A.

Les valeurs entre accolades viennent du moteur. Un contraste s'écrit tronqué à
deux décimales, une distance ΔEok et une part de chroma à deux décimales.

## Promesses

### Promesse manquée, avec un cran proposé

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, {mode} : {rôle} sur {autre membre} | {palette} · {rôle} sur {autre membre} ({mode}) | |
| Quoi | Contraste {valeur} pour {seuil} demandé. | Le contraste tombe à {valeur}, sous {seuil}. | |
| Geste | Reliez {rôle} au cran {cran proposé}. | Passez {rôle} au cran {cran proposé} dans « Rôles ». | |

### Promesse manquée, sans cran proposé

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, {mode} : {rôle} sur {autre membre} | {palette} · {rôle} sur {autre membre} ({mode}) | |
| Quoi | Contraste {valeur} pour {seuil} demandé. Aucun cran de la rampe ne le tient. | Le contraste tombe à {valeur}, sous {seuil}, et aucun cran de la rampe ne le remonte. | |
| Geste | Reliez {rôle} à une autre cible dans « Rôles », ou changez le fond de référence. | Choisissez une autre cible pour {rôle}, ou un autre fond dans la configuration. | |

### Promesse non vérifiable

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, {mode} : {rôle}+{n} sur {autre membre} | {palette} · état {survol ou appui} de {rôle} ({mode}) | |
| Quoi | {rôle} vise {le fond ou la référence} : aucun cran ne le suit. Ou : {rôle}+{n} dépasse le cran {dernier cran}. | L'état {survol ou appui} n'a pas de cran : {rôle} vise {le fond ou la référence}, ou le cran {dernier cran} est dépassé. | |
| Geste | Reliez {rôle} à un cran d'où deux crans suivent. | Reliez {rôle} à un cran plus bas dans la rampe. | |

## Alertes

### Profils confondus

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, crans {liste « mode cran »} | {palette} · soft et vivid, {liste « mode cran »} | |
| Quoi | soft et vivid ne s'écartent que de {distance} ΔEok, sous {seuil}. | soft et vivid se confondent : {distance} ΔEok, pour un écart de {seuil} attendu. | |
| Geste | Éloignez les parts de chroma des deux profils dans la configuration, ou reliez le rôle à un autre cran. | Écartez les parts de soft et vivid (configuration), ou choisissez un autre cran pour ce rôle. | |

### Palettes proches

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette} et {autre palette} | {palette} · proche de « {autre palette} » | |
| Quoi | Crans 500, 600 et 700 en vivid clair : {distance} ΔEok en moyenne, sous {seuil}. | Leurs crans 500 à 700 ne diffèrent que de {distance} ΔEok, pour {seuil} attendu. | |
| Geste | Gardez une seule des deux palettes, ou éloignez leurs couleurs de référence. | Supprimez l'une des deux, ou changez la référence de l'une. | |

### Couleur presque grise

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, couleur de référence {hexa} | {palette} · référence {hexa} | |
| Quoi | Chroma {chroma}, sous {seuil} : la dérive de teinte est désactivée, et les deux profils prennent la part de la référence. | La référence est presque grise ({chroma} pour {seuil}) : sa teinte ne se lit pas, et soft et vivid reçoivent sa part de chroma. | |
| Geste | Pour une rampe colorée, choisissez une référence plus saturée. | Si la rampe doit être colorée, saisissez une référence plus vive. | |

### Référence plus terne que soft

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, couleur de référence {hexa} | {palette} · référence {hexa} | |
| Quoi | Part de chroma {part}, sous celle de soft ({part soft}) : les deux rampes sont plus vives que la référence. | La référence ({part}) est plus terne que soft ({part soft}) : chaque cran sera plus vif qu'elle. | |
| Geste | Baissez les parts de cette palette dans « Avancé », ou choisissez une référence plus saturée. | Réglez les parts propres de la palette (« Avancé ») sous {part}, ou saisissez une référence plus vive. | |

### Référence plus vive que vivid (notice)

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, couleur de référence {hexa} | {palette} · référence {hexa} | |
| Quoi | Part de chroma {part}, au-dessus de vivid ({part vivid}) : la rampe vivid est un peu plus terne que la référence. | La référence ({part}) dépasse vivid ({part vivid}) : aucun cran n'est aussi vif qu'elle. | |
| Geste | Montez la part de vivid dans « Avancé » si la rampe doit l'égaler. | Pour qu'un cran l'égale, montez vivid dans les parts propres (« Avancé »). | |

### Référence hors de la rampe

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | {palette}, couleur de référence {hexa} | {palette} · référence {hexa} | |
| Quoi | Clarté {clarté}, hors des bouts de la rampe ({bout sombre} à {bout clair}) : un seul segment de dérive se règle. | La référence est plus {claire ou sombre} que le cran {50 ou 950} : sa teinte se lit hors de la rampe. | |
| Geste | Réglez la dérive du bout qui reste, ou choisissez une référence dans la rampe. | Choisissez une référence de clarté intermédiaire, ou réglez le seul bout disponible. | |

### Fond hors de la courbe

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | Fond de référence {mode}, {hexa} | Configuration · fond {mode} {hexa} | |
| Quoi | Clarté {clarté}, {plus sombre ou plus claire} que le cran 50 ({cran 50}) : les contrastes promis supposent ce cran. | Le fond est {plus sombre ou plus clair} que le cran 50 ({clarté} pour {cran 50}) : les promesses sont mesurées sur un autre fond que celui de l'architecture. | |
| Geste | Rapprochez le fond du cran 50, ou acceptez des promesses mesurées sur ce fond. | Saisissez un fond de clarté {cran 50}, ou gardez celui-ci en connaissance de cause. | |

### Courbe hors garantie

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | Courbe {mode}, cran {600 ou 700}, {profil} | Configuration · courbe {mode}, cran {600 ou 700} | |
| Quoi | Contre le cran 50, le contraste descend à {valeur} à la teinte {teinte}°, pour {seuil} garanti. | Ce cran ne garantit plus {seuil} contre le cran 50 : {valeur} au pire, à {teinte}° en {profil}. | |
| Geste | Éloignez la clarté du cran {600 ou 700} de celle du cran 50, ou gardez la courbe en connaissance de cause. | Rapprochez la clarté de ce cran de sa valeur par défaut ({défaut}). | |

## Bloquants

### Recette future

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | Recette du fichier, version {version} | Ce fichier · recette {version} | |
| Quoi | Ce plugin lit la version {courante} : il ne dessinera rien avec cette recette. | Une version plus récente du plugin a rangé cette recette ; celle-ci ne sait pas la lire. | |
| Geste | Mettez UCM Palettes à jour. Vous pouvez aussi exporter la recette, en importer une autre, ou repartir de la recette par défaut. | Mettez le plugin à jour, ou exportez la recette pour la garder avant de repartir de zéro. | |

### Recette illisible

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | Recette du fichier | Ce fichier · recette | |
| Quoi | {n} champs sont invalides ; le premier : {refus}. Le plugin ne dessinera rien. | La recette rangée ne se lit pas ({n} erreurs, dont {refus}). Rien ne sera dessiné. | |
| Geste | Exportez la recette pour la corriger, importez une recette valide, ou repartez de la recette par défaut. | Importez une recette corrigée, ou repartez de la recette par défaut après l'avoir exportée. | |

### Police indisponible

| Partie | A | B | Retenue |
|---|---|---|---|
| Où | Planche, police Inter | Dessin · Inter {style} | |
| Quoi | Inter {style} ne se charge pas : aucun cadre n'a été dessiné. | Le dessin s'est arrêté avant le premier cadre : Inter {style} est indisponible. | |
| Geste | Installez ou activez Inter, puis relancez le dessin. | Rendez Inter disponible dans Figma, puis cliquez sur « Réessayer ». | |

## Refus de validation

Ces refus s'affichent à l'import d'une recette et sous le bloquant « Recette
illisible ». Le chemin du champ se traduit en mots du designer : `crans[3]`
devient « 4ᵉ cran », `palettes[1]` le nom de la palette. Une ligne par refus,
où et quoi sur la même ligne ; le geste est commun, en fin de liste :
« Corrigez le fichier, puis importez-le de nouveau. »

| Règle | A | B | Retenue |
|---|---|---|---|
| `forme` | {champ} : valeur absente ou du mauvais type. | {champ} manque, ou n'a pas la bonne forme. | |
| `cle-inconnue` | {champ} : champ inconnu de cette version de la recette. | {champ} n'existe pas dans une recette de version {courante}. | |
| `crans-croissants` | Crans : le cran {valeur} ne suit pas le précédent. | La liste des crans doit croître : {valeur} ne suit pas. | |
| `courbes-longueur` | Courbe {mode} : {valeur} clartés pour {n} crans. | La courbe {mode} n'a pas une clarté par cran ({valeur} pour {n}). | |
| `courbes-bornes` | Courbe {mode}, {cran} : clarté {valeur}, hors de 0 à 1. | Une clarté va de 0 à 1 ; le cran {cran} en {mode} vaut {valeur}. | |
| `courbe-claire-decroissante` | Courbe claire, {cran} : {valeur} ne descend pas depuis le cran précédent. | En clair, chaque cran doit être plus sombre que le précédent ; {cran} vaut {valeur}. | |
| `courbe-sombre-croissante` | Courbe sombre, {cran} : {valeur} ne monte pas depuis le cran précédent. | En sombre, chaque cran doit être plus clair que le précédent ; {cran} vaut {valeur}. | |
| `parts-bornes` | Part de {profil} : {valeur}, hors de 0 à 1. | Une part de chroma va de 0 à 1 ; {profil} vaut {valeur}. | |
| `parts-ordre` | {où} : la part de soft dépasse celle de vivid. | soft doit rester sous vivid ({où}). | |
| `gamut-inconnu` | Gamut « {valeur} » : seul sRGB est pris en charge. | Le plugin ne fabrique qu'en sRGB, pas en « {valeur} ». | |
| `hexa-invalide` | {champ} : « {valeur} » n'est pas une couleur hexadécimale. | « {valeur} » ({champ}) ne se lit pas comme #RRGGBB. | |
| `seuils-positifs` | Seuil {nom} : {valeur}, il doit être positif. | Le seuil {nom} doit dépasser 0 ; il vaut {valeur}. | |
| `derives-nombre` | Relevé Tailwind : {valeur} rampe, il en faut deux au moins. | Le préréglage demande au moins deux rampes relevées ({valeur}). | |
| `derives-noms` | Relevé Tailwind : « {valeur} » apparaît deux fois. | Deux rampes relevées portent le nom « {valeur} ». | |
| `derives-teintes` | Relevé Tailwind, {rampe} : teinte {valeur}, hors de 0 à 360. | Une teinte va de 0 à 359,99 ; {rampe} a {valeur}. | |
| `derives-teintes-claires` | Relevé Tailwind : deux rampes partagent la teinte claire {valeur}. | La teinte claire {valeur} revient deux fois dans le relevé. | |
| `derive-bornes` | {palette}, dérive {profil} {bout} : {valeur}°, hors de -90° à +90°. | Une dérive va de -90° à +90° ; {palette} a {valeur}° au bout {bout}. | |
| `derive-lien` | {palette} : profils liés, mais dérives différentes. | {palette} lie soft et vivid alors que leurs dérives diffèrent. | |
| `origine-inconnue` | {champ} : origine « {valeur} » inconnue. | « {valeur} » n'est pas une origine connue ({champ}). | |
| `identifiant-forme` | Palette « {valeur} » : identifiant mal formé. | L'identifiant « {valeur} » n'a pas la forme p- suivi de huit chiffres hexadécimaux. | |
| `identifiants-uniques` | Deux palettes portent l'identifiant « {valeur} ». | L'identifiant « {valeur} » revient deux fois. | |
| `role-absent` | Câblage commun : le rôle {rôle} manque. | Le câblage commun ne dit pas où va {rôle}. | |
| `cible-forme` | {où}, rôle {rôle} : cible mal formée. | La cible de {rôle} ({où}) n'est ni un cran, ni le fond, ni la référence. | |
| `cible-cran-inconnu` | {où}, rôle {rôle} : le cran {valeur} n'existe pas. | {rôle} vise le cran {valeur}, absent de la liste des crans ({où}). | |

## Questions pour le mainteneur

- La notice « Référence plus vive que vivid » n'a de geste que si la rampe doit
  égaler la référence. `CONTRIBUTING.md` refuse un constat sans geste : faut-il
  la garder en notice, ou la retirer ?
- « Fond hors de la courbe » propose d'accepter le fond : est-ce un geste, ou
  faut-il seulement proposer de rapprocher le fond du cran 50 ?
