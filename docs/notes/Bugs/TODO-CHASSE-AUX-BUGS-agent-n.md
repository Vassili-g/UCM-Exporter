# Suivi de CHASSE-AUX-BUGS-agent-n

Source : [CHASSE-AUX-BUGS-agent-n.md](./CHASSE-AUX-BUGS-agent-n.md).

Les cases suivent l'ordre de criticité du constat, puis son ordre dans la source.

## Haute

- [x] [HAUTE] Padding tokenisé sur un seul axe refusé par `ucm check`.
- [x] [HAUTE] Contour à épaisseur non liée refusé par `ucm check`.
- [x] [HAUTE] Téléchargement des tokens publié après une configuration enregistrée.
- [x] [HAUTE] Export identique dupliqué au-delà de 100 demandes ouvertes.

## Moyenne

- [x] [MOYENNE] `css.fontFamilyFallback` tronque la feuille CSS sous code 0.
- [x] [MOYENNE] Rapport rouge annoncé comme fusionnable pour un type typographique incompatible.
- [x] [MOYENNE] `ucm check --base` perd des notices sous un chemin accentué.
- [x] [MOYENNE] Adresse d'échantillon morte présentée comme une incohérence de composition.
- [x] [MOYENNE] `ucm init` omet le stage `test` devant un stage au nom voisin.
- [x] [MOYENNE] `ucm init` ne détecte pas l'exclusion de `merge_request_event`.
- [x] [MOYENNE] La CI GitHub remplace un commentaire dans un workflow non généré.
- [x] [MOYENNE] Rapport GitLab périmé publié sur une autre merge request.
- [x] [MOYENNE] Échec étranger qui libère l'interface pendant une analyse.

## Basse

- [x] [BASSE] Clés inconnues de `structure` admises et projetées.
- [x] [BASSE] `figmaName` de variante lu autrement que par `nomFigmaDuVariant`.
- [x] [BASSE] Échec de publication sans statut assimilé à une erreur de connexion.
- [x] [BASSE] Défauts de configuration appliqués silencieusement depuis un sous-dossier.
- [x] [BASSE] Contrat profond qui épuise la pile du validateur.
- [x] [BASSE] `axesDeTokens` lève sur une extension `null`.
- [x] [BASSE] Chemin de token sans caractère alphanumérique qui produit `--`.
- [x] [BASSE] Chemin de token contenant `*/` qui ferme le commentaire CSS.
- [x] [BASSE] `rapport-gitlab` suit une redirection avec le jeton.
- [x] [BASSE] `rapport-gitlab` divulgue un jeton contenant un saut de ligne.
- [x] [BASSE] `rapport-gitlab` rend le code 2 pour un corps 200 non JSON.
- [x] [BASSE] Rapport GitLab qui laisse une action rapide active.
- [x] [BASSE] État de connexion périmé après suppression du jeton.
- [x] [BASSE] Corps GitLab borné en unités UTF-16 au lieu d'octets UTF-8.
- [x] [BASSE] Neutralisation Markdown cassée par les accents graves du texte.
- [x] [BASSE] Références GitLab abrégées ou croisées encore actives.
