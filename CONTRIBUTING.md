# Contributing & Development Rules

Règles de développement pour `TokenLintel` :

- Simplicité et lisibilité du code avant tout.
- Écrire le code le plus minimaliste et efficace possible (KISS).
- Compartimenter : approche composant, petits fichiers, pas de fichiers gigantesques.
- Tests unitaires pour utilitaires critiques (`normalizeName`, résolution d'alias, etc.).
- Préférer fonctions pures et petites surcharges plutôt qu'une logique monolithique.
- Documenter public API des modules et ajouter exemples d'usage.
- Respecter la configuration TypeScript du projet et garder les dépendances minimales.

Notes opérationnelles :
- Utilise `src/` pour les modules TypeScript, `src/ui.html` pour l'UI.
- Garder chaque commande Figma (Export component / Export tokens) isolée et testable.
- Avant PR, exécuter `npm run test:normalize` et autres tests ajoutés.

Normes Figma
- Vérifier régulièrement la documentation officielle de l'API Plugin Figma; des mises à jour récentes peuvent impacter la compilation et les types. Adapter la structure du plugin si de nouveaux patterns officiels apparaissent (par ex. bundlers recommandés, fonctions d'API variables, etc.).
