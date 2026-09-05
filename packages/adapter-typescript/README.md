# @ucm-kit/adapter-typescript

Adaptateur optionnel pour les repositories TypeScript qui consomment des
contrats UCM. Il ajoute deux capacités sans faire dépendre `@ucm-kit/core` du
compilateur TypeScript :

- `ucm check` le découvre automatiquement lorsqu'il est installé dans le
  repository et compare les props, les BOOLEAN lues et les compositions ;
- `ucm-typescript` génère les unions d'enums dans
  `src/generated/contracts/` (ou dans le dossier donné à `--out`).

```sh
npm install --save-dev @ucm-kit/adapter-typescript@0.1.0 @ucm-kit/cli@0.1.7
npx ucm-typescript
npx --no-install ucm check
```

La parité exige un `tsconfig.json` à la racine. Les valeurs d'enum réellement
traitées par le comportement du composant restent hors de la garantie statique :
le contrat décrit les vues disponibles, pas la logique qui en choisit une.
