# Contributing & Development Rules

Règles de développement pour `TokenLintel`. Objectif : un code **robuste** et
**lisible sans effort** par un agent IA comme par un développeur débutant.
Chaque règle ci-dessous découle de ce double objectif.

## Principes de base

- Simplicité et lisibilité avant tout (KISS) : le code le plus minimaliste et
  efficace possible. Pas d'astuce « maligne » qu'il faut décoder — si une
  ligne demande réflexion pour être comprise, la réécrire ou la commenter.
- Compartimenter : approche composant, petits fichiers (< ~200 lignes),
  une responsabilité par module.
- Préférer les fonctions pures et petites à une logique monolithique :
  elles se lisent, se testent et se réutilisent isolément.
- Noms explicites et complets (`extractSizeDimensions`, pas `extSzDims`) ;
  pas d'abréviations. Un nom doit suffire à deviner le rôle.
- Dépendances minimales ; respecter la configuration TypeScript du projet
  (`strict` activé — pas de `any` sauf impossibilité documentée).

## Commentaires : expliquer les décisions

Les commentaires sont en français et doivent aider un lecteur débutant :

- **Chaque fichier** commence par un en-tête (`/** … */`) qui explique son
  rôle dans le plugin et le principe qui le gouverne.
- **Chaque fonction exportée non triviale** porte une JSDoc : ce qu'elle fait, et surtout
  **pourquoi** elle le fait ainsi quand ce n'est pas évident. Ajouter un
  `@example` pour les utilitaires de transformation (cf. `normalizeName`).
- **Les subtilités s'expliquent là où elles se manifestent** : une bizarrerie
  de l'API Figma (ex. `fontWeight` lié via `fontStyle`, `componentProperties`
  qui peut lever sur une instance orpheline), une décision non triviale
  (ex. type DTCG décidé sur la racine de la chaîne d'alias) se commentent
  sur place, pas dans un document externe.
- Un commentaire dit le **pourquoi** ; le **quoi** doit déjà se lire dans le
  code. Interdit : paraphraser la ligne suivante (`// incrémente i`).
- Les messages destinés à l'utilisateur (warnings, erreurs, UI) sont en
  français, précis et actionnables : nommer le calque, la propriété, la
  variable concernée.

## Robustesse

- **Un node incomplet ne fait pas échouer un export** : tout accès à l'API
  Figma susceptible de lever (`componentProperties`, `getMainComponentAsync`,
  `getStyleByIdAsync`…) est protégé (`try/catch`, `.catch(() => null)`).
- **Les warnings n'interrompent pas l'export** : une donnée manquante ou une
  valeur non tokenisée produit un avertissement précis et l'export continue.
  On n'exporte jamais de valeur brute à la place d'un token.
- Les préconditions obligatoires décrites dans la spécification restent
  bloquantes : sélection invalide ou conteneur `<Nom>-Rules` absent/vide.
- **Ne jamais perdre d'information en silence** : une collision, un doublon
  ou un cas imprévu → warning explicite. Un calque inconnu est inclus tel
  quel, jamais supprimé.
- Se protéger des boucles (chaînes d'alias circulaires : garder un `Set` des
  ids visités) et des listes vides (fallbacks explicites).

## Généricité : aucun cas particulier codé en dur

- Le moteur d'export décrit **n'importe quel composant** : jamais de logique
  conditionnée au nom d'un composant (« si Button alors… » est interdit).
- Les règles « intelligentes » se déclenchent sur des **valeurs ou des rôles**
  (axe dont toutes les valeurs sont des tailles → `size` ; calque texte →
  `label`) et vivent dans `src/contract/semantics.ts`, seul endroit autorisé
  pour ce vocabulaire.
- Tout renommage sémantique **conserve le nom Figma d'origine**
  (`figmaName`, `figmaLayer`) : traçabilité totale, zéro perte.
- La chaîne d'alias des variables est **préservée**, jamais aplatie : on
  résout des noms de tokens, pas des valeurs finales.
- `normalizeName()` est LA règle de nommage commune : un token s'écrit
  exactement pareil dans un contrat et dans `tokens.json`.

## Tests

- Tests unitaires pour tous les utilitaires critiques : normalisation de
  noms, parsers, typage DTCG, insertion d'arbre, résolution d'alias.
- **Tout bug corrigé est verrouillé par un test** qui reproduit le cas réel
  (cf. le test « lineheight aliasé sur spacing → dimension »).
- La logique pure se teste sans Figma : simuler les nodes avec des objets
  littéraux castés (`as unknown as ComponentNode`).
- Les exports réels produits sur le fichier Figma de référence sont conservés
  dans `tests/test-exports/` : ils servent de jeux de validation quand la
  structure Figma ou le code évolue.
- Avant PR : `npm test` puis `npm run build` — les deux doivent être verts.

## Documentation & synchronisation

- [`TOKENLINTEL-SPEC.md`](./TOKENLINTEL-SPEC.md) est la **spécification de référence** ; la
  vision produit est dans [`CONCEPT.md`](./CONCEPT.md). Tout changement de
  comportement ou de schéma se répercute dans `TOKENLINTEL-SPEC.md` **dans le même
  changement** — un doc désynchronisé est un bug.
- Tout changement de forme du contrat UCS incrémente `ucsVersion`
  (`src/contract/exportComponent.ts`) et met à jour l'exemple de `TOKENLINTEL-SPEC.md`.
- Garder le `README.md` fidèle à l'état réel du projet (commandes,
  architecture, statut des parties).

## Notes opérationnelles

- Utiliser `src/` pour les modules TypeScript et `src/ui/` pour les sources
  UI ; le build génère l'unique fichier autonome `dist/ui.html` attendu par
  Figma.
- Garder chaque commande Figma isolée et testable. Les utilitaires communs
  vivent dans des modules dédiés (`utils`, `variables`, `config`, `github`,
  `base64`) plutôt que dans les handlers.

## Normes Figma

- Vérifier régulièrement la documentation officielle de l'API Plugin Figma ;
  des mises à jour récentes peuvent impacter la compilation et les types.
  Adapter la structure du plugin si de nouveaux patterns officiels
  apparaissent (bundlers recommandés, fonctions d'API variables, etc.).
- Préférer les variantes asynchrones de l'API (`getVariableByIdAsync`,
  `getMainComponentAsync`…) : les accès synchrones sont incompatibles avec
  `documentAccess: dynamic-page`.
