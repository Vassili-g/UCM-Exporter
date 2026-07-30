# Unified Component Exporter — guide agent

Plugin Figma qui exporte des contrats de composant et des tokens DTCG. Il ne
modifie jamais le document Figma.

## Avant de modifier

Lire uniquement ce qui concerne la tâche :

1. [CONCEPT.md](./CONCEPT.md) pour les responsabilités du modèle ;
2. [UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md) pour le comportement touché ;
3. [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de code et de test ;
4. `src/contract/types.ts` et les tests voisins pour la forme concrète.

La maturité et les priorités vivent dans [ROADMAP.md](./ROADMAP.md). Les idées
non décidées dans [PISTES-EVOLUTION.md](./PISTES-EVOLUTION.md).

## Carte du code

```text
src/
  code.ts                    routage UI → commandes
  contract/
    exportComponent.ts       orchestration et métadonnées
    componentTree.ts         axes, matrice et wrapper de layout
    parsers.ts               propriétés Figma → API publique
    semantics.ts             vocabulaire sémantique partagé
    extract*.ts              structure, layout, tailles, tokens et règles
    composedComponents.ts    dépendances entre composants
    nodeBindings.ts          groupes complets de liaisons Figma
    types.ts                 schéma TypeScript du contrat
  tokens/exportTokens.ts     export DTCG
  variables.ts               index commun, collisions et alias
  utils.ts                   normalisation et identifiant de code
  config.ts                  configuration GitHub locale
  github.ts                  branche, fichier et pull request
  ui/                        interface du plugin
tests/
  test-exports/              petit corpus d’exports réels
```

## Invariants

- Aucune logique liée au nom d’un composant.
- Figma reste traçable après toute normalisation (`figmaName`,
  `figmaLayer`).
- Un enum renommé utilise la même clé dans `props`, `variantAxes` et les arbres
  de variantes.
- Les tokens restent des références et leurs alias ne sont jamais aplatis.
- `normalizeName()` et `indexVariables()` sont communs aux deux commandes.
- Une collision feuille/groupe ou deux chemins identiques sont tranchés avant
  de construire l’arbre ; aucun alias ne doit pointer vers une variable
  rejetée.
- Un composant unifié imbriqué est déclaré dans `composes`. Le parent ne
  réexporte pas ses internes.
- Un slot d’icône porte un rôle stable ; `icons.*.slot` et `icons.*.size`
  indiquent où et comment placer chaque icône.
- Une liaison composée n’est valide que si tout le groupe requis est lié :
  deux paddings, deux dimensions, quatre coins, etc.
- Une donnée facultative incomplète avertit. Les préconditions explicitement
  définies dans la spécification bloquent.
- Un changement de forme du JSON incrémente `contractVersion` et met à jour la
  spécification et les consommateurs.

## Vérification

```sh
npm test
npm run typecheck
npm run build
```

Un nouveau `tests/*.test.ts` est découvert automatiquement. Tout bug corrigé
reçoit un test de régression.

Le corpus `tests/test-exports/` reste petit et représentatif. Il est produit
depuis Figma, pas édité à la main, et verrouille la version actuelle du
contrat.

## Limites d’environnement

- L’agent ne peut pas exécuter l’export dans Figma. Une validation runtime
  nécessite un réexport utilisateur.
- Le réseau du plugin est limité à `https://api.github.com`.
- La configuration GitHub est facultative ; toute erreur conserve un
  téléchargement local.
- Le plugin ouvre une pull request par artefact et ne fusionne jamais
  automatiquement.

Avant de terminer une modification, relire les documents directement affectés
et retirer toute description devenue fausse ou dupliquée.
