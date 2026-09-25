# UCM Palettes : instruction du nombre de nuances

Ce document instruit le lot V7 du [plan d’ergonomie V2](./PLAN-ERGONOMIE-PALETTES-V2.md#lot-v7--nombre-de-nuances).
Il sert au mainteneur à décider avant tout code : quel geste, quels numéros,
quelle limite, et quel écart avec l’[architecture multi-marques](../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md).
Les rampes sont celles que le moteur calcule avec la recette par défaut.

## Résumé

Le moteur accepte déjà une autre liste de nuances, par import : la recette
porte ses numéros et une luminosité par nuance. Deux points supposent la
liste actuelle : la première nuance sert de fond de page, et l’alerte des
palettes proches lit la nuance 500. Une règle décide de tout le reste : **un état avance d’un
rang dans la liste**. Ajouter 150 ou 750 change donc le survol de `surface` ou
de `text`, que l’architecture fixe à 200 et 800. Seules des nuances ajoutées
entre 300 et 600, ou après 900, gardent les rôles à leurs numéros.

Recommandation : trois préréglages dans les Réglages communs, 9, 11 et 13
nuances, plutôt qu’une liste libre. Le nombre vaut pour toutes les palettes du
fichier, comme la luminosité. Il faut aussi décider si l’architecture
multi-marques accepte un autre nombre que onze (voir « Écart avec
l’architecture »).

## V7.1 Ce qui suppose onze nuances ou un numéro précis

| Endroit | Ce qu’il suppose | Effet d’une autre liste |
|---|---|---|
| Validation de la recette, [`recette.ts`](../../../../packages/couleur/src/recette.ts), règles `crans-emplois` et `courbes-longueur` | Les sept nuances de la table des emplois, `CRANS_DES_EMPLOIS` : 100, 200, 300, 600, 700, 800, 900. Une luminosité par nuance | Une liste sans l’une d’elles est refusée. Rien d’autre n’est imposé |
| États des rôles, `decalagesDeLEmploi` et `emploisDuCran` | Un état avance d’un rang : le survol de `text` 700 est la nuance suivante | Une nuance insérée entre 100 et 300, ou entre 600 et 900, décale les états (tableau plus bas) |
| Garantie des courbes et alerte de fond, [`garantie.ts`](../../../../packages/couleur/src/garantie.ts) et [`alertes.ts`](../../../../packages/couleur/src/alertes.ts) (`[ENT-06]`, `[ENT-10]`) | La première nuance de la liste sert de fond de page | Une nuance ajoutée avant 50 devient le fond de référence : le sens de 50 change |
| Alerte « Palettes proches », `CRANS_PALETTES_PROCHES` | 500, 600 et 700 | Sans 500, la distance vaut `null` : l’alerte se tait, sans message |
| Préréglage Tailwind, [`tailwind.ts`](../../../../packages/couleur/src/tailwind.ts) | La teinte du bout clair et du bout sombre | Suit les bouts de la courbe : aucun effet |
| Éditeur de dérive, [`geometrie.ts`](../../../../packages/plugin-palettes/src/ui/derive/geometrie.ts) | Une colonne par nuance | Le calcul suit la liste ; son commentaire, qui disait « onze positions », est corrigé |
| Aperçu, réglette des garanties, tracé des courbes | `--colonnes` et `crans.length` | Suivent la liste |
| Fiche de l’onglet Planche, [`styles.css`](../../../../packages/plugin-palettes/src/ui/styles.css), `.fiche-rangee` | `repeat(11, …)` était écrit en dur | Corrigé avec cette instruction : la fiche suit `--colonnes`, comme l’aperçu |
| Planche, grille des contrastes, empreinte des cadres | Parcourent `recette.crans` | Suivent la liste ; tous les cadres passent « À mettre à jour » |
| « Rétablir » des courbes (V9.5) | Les courbes par défaut ont onze valeurs | Inactif sur une autre liste ; il faudrait des courbes par défaut par préréglage |
| Textes | « onze nuances » dans l’infobulle de « Rétablir » (N060) | À réécrire avec le nombre |

## V7.2 Rampes calculées

Luminosité d’une nuance ajoutée : interpolée linéairement sur les numéros de la
courbe par défaut. `#1E6FD9`, profil Vivid, thème Light. Aucune variante ne
fait échouer la garantie des courbes.

| Variante | Rampe Vivid, thème Light | Survol de `text` sur `surface` | Garanties manquées, `#1E6FD9` / `#16A34A` |
|---|---|---|---|
| 9 : sans 400 ni 950 | 50 `#F1F8FF` · 100 `#E3F0FE` · 200 `#CAE3FD` · 300 `#A9D0FD` · 500 `#4496FA` · 600 `#1E6FD9` · 700 `#0E5DC7` · 800 `#0845A4` · 900 `#032F82` | 800 / 200 | 0 / 2 |
| 11 : par défaut | 50 `#F1F8FF` · 100 `#E3F0FE` · 200 `#CAE2FD` · 300 `#A9D0FD` · 400 `#7AB5FB` · 500 `#4596FA` · 600 `#1E6FD9` · 700 `#0E5DC6` · 800 `#0846A3` · 900 `#043080` · 950 `#021E61` | 800 / 200 | 0 / 2 |
| 13 : avec 450 et 550 | … 400 `#7AB5FB` · 450 `#60A5FB` · 500 `#4596FA` · 550 `#2686F9` · 600 `#1E6FD9` … | 800 / 200 | 0 / 0 |
| 13 : avec 150 et 750, à écarter | … 100 `#E3F0FE` · 150 `#D7E9FE` · 200 … 700 `#0E5DC6` · 750 `#0B51B5` · 800 … | **750 / 150** | 0 / 2 |

Deux effets à connaître :

- **La référence peut changer de numéro.** Avec 450 et 550, le vert `#16A34A`
  quitte la nuance 600 pour la 550, plus proche de sa luminosité. Ses deux
  garanties manquées disparaissent, parce que la nuance 600 redevient une
  nuance calculée. Un composant qui citait la couleur exacte au 600 ne la
  retrouve plus.
- **Une nuance supprimée en dehors des emplois ne change aucun rôle.** Sans
  400 ni 950, les rôles, les états et les garanties restent identiques.

Insertions qui gardent les rôles à leurs numéros : entre 300 et 600 (400, 450,
500, 550), et après 900 (950, 975). Avant 50, l’insertion change le fond de
référence. Entre 100 et 300, ou entre 600 et 900, elle décale les états.

### Largeur à 500 px

Calculée depuis les feuilles de style : panneau de 500 px, marges de la page,
de la carte et de la surface, colonnes du profil et de `on-solid`, trois
pixels entre deux colonnes.

| Nuances | Largeur d’une colonne |
|---|---|
| 9 | 37 px |
| 11 | 30 px |
| 13 | 25 px |
| 15 | 21 px |
| 17 | 18 px |

Le numéro « 950 », en 10 px, occupe environ 18 px. Treize nuances restent
lisibles ; quinze sont une limite, sans marge pour les accolades. À vérifier
dans Figma avant de fixer la borne.

### Gestes possibles

| Geste | Pour | Contre |
|---|---|---|
| Trois préréglages : 9, 11, 13 | Aucune liste qui casse un état ; courbes par défaut fournies pour chacun ; « Rétablir » reste utile | Pas de numérotation libre |
| Liste de numéros libre, validée | Toute numérotation d’un design system existant | Le designer peut insérer 150 ou 750 ; il faut une validation de plus et une luminosité à régler pour chaque ajout |
| Ajouter ou retirer une nuance à la fois, dans la table des courbes | Proche de la table actuelle | Même risque que la liste libre ; geste plus long |

## V7.3 Écart avec l’architecture multi-marques

L’architecture fixe onze nuances, de 50 à 950, pour toutes les rampes
(section 1). `theme` y compte 143 variables : 11 pour le neutre, 88 pour les
utilitaires, 44 pour les rampes de marque ; `brand` compte 89 couleurs par
marque.

| Nuances | `theme` | `brand` par marque |
|---|---|---|
| 9 | 117 | 73 |
| 11 | 143 | 89 |
| 13 | 169 | 105 |

- **Rampes de marques différentes.** Une collection Figma porte les mêmes
  variables dans chaque mode : deux marques ne peuvent pas avoir des nombres de
  nuances différents dans un même fichier. Le nombre doit donc rester un
  réglage commun, jamais un réglage de palette.
- **Le principe « un numéro vaut un contraste ».** Il tient tant que les
  numéros gardent leur luminosité. Les préréglages 9 et 13 ci-dessus gardent
  celle de chaque numéro existant ; une liste libre ne le garantit pas.
- **Ce que l’architecture devrait dire.** Soit elle garde onze nuances, et le
  plugin ne propose le réglage que hors de ce design system. Soit elle admet
  les préréglages, et sa section 1 nomme les numéros autorisés.

## Décisions demandées au mainteneur

1. Le geste : trois préréglages (recommandé), liste libre, ou ajout un à un.
2. Les numéros : 9 sans 400 ni 950, 13 avec 450 et 550, ou d’autres.
3. La borne à 500 px : 13 (recommandé) ou 15.
4. L’architecture multi-marques : reste à onze, ou admet les préréglages.

Après décision, V7.4 écrit les cases d’implémentation, puis passe la
conception en revue indépendante : le lot touche le moteur, la recette et la
planche.
