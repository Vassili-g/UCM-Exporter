# Procédure d'implémentation d'un contrat UCM

Cette procédure vaut pour un composant décrit par un fichier `*.contract.json`.
Elle précède les aides que la commande imprime pour ce contrat.

## Qui décide de quoi

- Le contrat décide des données : props, variants, vues, tokens, états.
- Le sens d'une aide décide de l'obligation que ces données imposent.
- L'écriture décide de la forme du code : celle des conventions du repository
  quand elles en donnent une, l'écriture par défaut sinon.

Un sens contredit par une écriture se signale au développeur avant d'écrire la
partie concernée. L'écriture ne l'emporte jamais sur le sens.

## Ordre de travail

1. Lire le contrat cible une fois, puis le texte de tête des conventions : stack, architecture, gabarit ou
   composant de référence.
2. Construire la surface publique depuis `props`.
3. Transcrire la matrice des `variants` en table littérale.
4. Rendre la vue exacte de chaque variant : arbre, dimensions, peintures,
   contours, typographie, icônes.
5. Brancher les états, puis les dépendances, puis les échantillons.
6. Appliquer chaque aide imprimée, dans l'ordre où elle apparaît.

## Ce qui ne se décide pas seul

- Un ancrage sans réponse dans les conventions devient une question au
  développeur, posée avant d'écrire la partie qui en dépend.
- Un manque du contrat, une jointure ambiguë ou une donnée normative absente se
  rapportent au développeur avec le champ et la combinaison concernés. Rien ne
  s'invente pour les masquer.
- Ce que l'export n'a pas su décrire arrive par `meta.diagnostics` et
  `meta.coverage` : le rapporter.

## Ce qui ne se fait pas

- Ouvrir une ancienne implémentation du composant, ou un composant voisin pris
  comme modèle hors du gabarit que les conventions désignent.
- Fusionner deux vues, déduire une propriété d'un nom, produire un produit
  cartésien, combler une clé absente.
- Modifier le contrat, les tokens, un fichier généré ou un contrôle.

## Vérifier

Lancer le contrôle du contrat et le contrôle de type ou de syntaxe du projet que
les conventions nomment. Lancer aussi les contrôles que la preuve de chaque aide
ajoute. Une prop attendue par un consommateur mais absente du contrat rejoint la
surface publique et le compte rendu nomme cet ajout. Relire le composant contre
le contrat, puis rapporter au développeur ce qui reste ouvert.
