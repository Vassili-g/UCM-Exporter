# Chasse aux bugs, niveaux 4 et 5

Statut : en cours, depuis le commit `68a710d`, le `2026-09-16`.

## 1. Périmètre et ligne de base

Les cibles sont les fichiers de niveau 4 et 5 de la mission. Toute exécution a
lieu dans un worktree détaché de `68a710d`, extrait en LF dans le dossier
temporaire du système.

Ligne de base sur `HEAD` : `npm ci`, puis `npm test` (1 299 tests verts),
`npm run typecheck` et `npm run build`, tous verts. `npm ci` sous npm 12 bloque
les scripts d'installation, dont celui d'esbuild ; le build passe quand même.

## 2. Invariants et autorités

## 3. Constats

Relevé provisoire, avant la réfutation. Les scripts sont dans le worktree, sous
`.chasse/principal/` et `.chasse/forges/`, et seront recopiés ici.

- `css.fontFamilyFallback` qui contient `/*`, `(`, un guillemet seul ou un
  antislash final : `ucm tokens css` rend 0 et Chromium perd les déclarations
  suivantes (`repli-famille.mjs`).
- `ucm check --base` lancé depuis un sous-dossier du dépôt git : le périmètre
  ne retient aucun contrat, et le rapport perd l'avertissement d'export et
  l'implémentation en attente (`perimetre-sous-dossier.mjs`).
- Une adresse d'échantillon morte refuse la fusion, code 1, sous le titre et le
  geste d'un graphe de composition (`echantillon-bloquant.mjs`).
- `axesDeTokens` lève sur une déclaration d'extensions dont une entrée vaut
  `null` sous la clé `undefined` (`axes-leve.mjs`).
- `champsInvalidesDuContrat` lève `RangeError` au-delà d'environ 3 500 niveaux
  de `children` (`seuil.mjs`).
- Plugin : `demandesOuvertes()` ne lit que la première page de 100 demandes,
  sur les deux forges (`pagination.ts`).
- Plugin : la borne du corps GitLab compte des unités UTF-16, GitLab compte des
  octets (`corps-octets.ts`).
- Plugin et kit : références GitLab abrégées (`projet!3`) et code span déplacé
  (`neutralisation.ts`, `neutralisation-kit.mjs`).

## 4. Pistes réfutées

## 5. Couverture et angles morts
