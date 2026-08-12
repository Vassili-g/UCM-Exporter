# Contribuer à Unified Component Exporter

Le code doit rester générique, lisible et prudent face aux données Figma
incomplètes. Avant une modification, lire la spécification concernée dans
[UCM-EXPORTER-SPEC.md](./UCM-EXPORTER-SPEC.md).

## Code

- Préférer des fonctions courtes et pures aux orchestrateurs monolithiques.
- Le code doit être le plus simple possible, lisible même pour un débutant.
- Donner une seule responsabilité à chaque module.
- Utiliser des noms complets ; éviter les abréviations et les astuces
  implicites.
- Respecter TypeScript `strict` et limiter les dépendances.
- Ne jamais conditionner une règle au nom d’un composant.
- Centraliser le vocabulaire sémantique dans
  `src/contract/semantics.ts`.
- Conserver les noms Figma d’origine lorsqu’une valeur est normalisée ou
  renommée.

Les commentaires sont en français. Ils expliquent une décision, une
particularité de l’API Figma ou une limite ; ils ne paraphrasent pas le code.
Chaque fichier décrit brièvement son rôle, et chaque fonction exportée non
triviale précise son contrat.

## Avertissements

Les avertissements d’un export sont adressés au **designer**, et lui parviennent
par le corps de la pull request que le plugin ouvre. Ils sont donc écrits dans
son vocabulaire, jamais dans celui du code.

Chacun répond à trois questions, dans cet ordre :

| | Contenu |
|---|---|
| **Où** | Le nom exact de l’élément Figma — calque, variante, propriété — tel qu’il s’affiche dans le panneau des calques |
| **Quoi** | Ce qui n’a pas pu être exporté, donc ce qui manquera au développeur |
| **Comment** | Le geste à faire dans Figma |

Un message emploie **les intitulés que Figma affiche**, repris tels quels : le
designer doit pouvoir chercher dans son écran le mot que le message emploie.
La phrase reste en français ; seul le nom de l’élément Figma est repris à
l’identique. Ne traduisez jamais un libellé de panneau — `padding` ne devient
pas « marges intérieures ».

| Terme du code | Terme employé | | Terme du code | Terme employé |
|---|---|---|---|---|
| `node de layout` | auto layout frame | | `itemSpacing` | gap |
| `sous-arbre` | le layer et son contenu | | `padding*` | left / right / top / bottom padding |
| `matrice` | les variants | | `cornerRadius` | corner radius |
| `slot`, `calque` | layer | | `strokeWeight` | stroke weight |
| `componentPropertyDefinition` | component property | | `fills` | fill |
| `prop enum` | variant property | | `strokes` | stroke |
| `prop BOOLEAN` | boolean property | | `fontSize`, `lineHeight` | font size, line height |
| `Component Set` | component set | | `feuille` / `groupe` | token / groupe de tokens |

`fieldLabel()` dans `src/contract/nodeBindings.ts` tient cette table pour les
propriétés Figma citées dans un message ; les libellés passés à `resolveField()`
suivent la même règle. Aucune couche de remplacement : la traduction se fait à
la source.

## Robustesse

Une donnée facultative, illisible ou non tokenisée produit un avertissement et
reste absente de l’export. Elle n’est jamais remplacée par une valeur brute ou
une supposition.

Les préconditions définies par la spécification restent bloquantes :

- sélection invalide ;
- conteneur `<Nom>-Rules` absent ou vide ;
- combinaison de variantes manquante.

Tout accès Figma susceptible d’échouer doit être protégé. Les chaînes d’alias
doivent détecter les cycles. Une collision ou une perte d’information ne doit
jamais rester silencieuse.

## Invariants communs

- Les alias sont préservés, jamais aplatis.
- `normalizeName()` est l’unique règle de nommage des tokens.
- `indexVariables()` tranche les collisions pour les contrats et les tokens.
- Une référence de token utilise la forme `{chemin.du.token}`. `variables.ts`
  la produit (`toRef`) et la reconnaît (`isTokenReference`) : une seule autorité
  sur sa forme.
- `tokensUsed` se dérive du contrat terminé, jamais d’un relevé tenu pendant
  l’extraction.
- Un composant imbriqué contracté devient une dépendance de composition ; son
  contenu interne n’est pas réexporté par le parent.
- Un changement de forme du contrat incrémente `contractVersion`.
- Le plugin ne modifie jamais le document Figma.

## Tests

Tout bug corrigé doit être reproduit par un test. La logique pure se teste avec
des objets Figma minimaux et des dépendances injectées.

`scripts/run-tests.js` découvre automatiquement les fichiers
`tests/*.test.ts`.

`tests/test-exports/` contient un petit corpus représentatif d’exports Figma
réels. Son coût ne dépend pas du nombre de composants du catalogue. Ces
fixtures ne sont rafraîchies que par un véritable réexport Figma ; elles ne
sont pas retouchées pour faire passer un test.

Avant une pull request :

```sh
npm test
npm run build
```

## Documentation

Chaque document a une autorité limitée :

| Document | Rôle |
|---|---|
| `CONCEPT.md` | Principes et responsabilités |
| `UCM-EXPORTER-SPEC.md` | Comportement actuel du plugin |
| `ROADMAP.md` | État et prochaines validations |
| `PLAN-STRUCTURE-PROFONDE.md` | Décisions validées et préconditions avant une extension de structure ou de layout |
| `PISTES-EVOLUTION.md` | Options non engagées |
| `README.md` | Entrée dans le projet |
| `AGENTS.md` | Instructions opérationnelles |

Une modification se termine par une revue des documents concernés. Décrire
l’état actuel, supprimer les formulations périmées et préférer un lien à une
répétition. L’historique appartient à Git.

## API Figma et build

- Préférer les variantes asynchrones de l’API, compatibles avec
  `documentAccess: dynamic-page`.
- Garder les commandes Figma isolées et testables.
- Les sources de l’interface vivent dans `src/ui/`; le build produit
  `dist/ui.html`.
- Si un changement dépend d’une évolution récente de l’API Figma, vérifier sa
  documentation officielle avant de modifier les types ou l’architecture.
