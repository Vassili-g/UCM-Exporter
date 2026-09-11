# `tokens.json` d'origine figé

Ce fichier est un **instantané assumé** de la forme d'origine de `tokens.json`,
celle qui ne porte pas de marque de version du format de tokens.

## Pourquoi il existe

Le kit lit un fichier sans marque comme la forme d'origine
([COMPATIBILITE.md](../../../../../docs/COMPATIBILITE.md#la-version-du-format-de-tokens)).
Le moteur, lui, ne produit que la version courante : la forme d'origine n'est
donc observable qu'à partir d'un fichier que plus rien ne fabrique. Les tests
du kit le lisent pour l'état `origine`.

## Ce qu'il n'est pas

Il ne teste pas le moteur. Aucun test permanent ne le compare à une sortie du
moteur : un instantané ne bouge qu'au réexport, si bien qu'une régression ne
s'y verrait jamais. Il n'est pas non plus une source à rafraîchir : un
réexport le rendrait inutile, puisqu'il cesserait d'être la forme d'origine.

## Provenance

Produit par `handleExportTokens` (`packages/plugin/src/tokens/exportTokens.ts`)
à l'état du commit `c574c00` de `UCM-Exporter`, sur le fichier de variables de
`packages/plugin/tests/fichierDeVariables.ts`, sous le profil `SRGB`. Le
contenu est celui que la commande rend, sans ligne finale ajoutée.

Il couvre des couleurs opaques, transparentes et de précision élevée, des
dimensions nulles, fractionnaires et négatives, une famille, des graisses
reconnues, numériques et libres, deux collections à plusieurs modes, des alias
directs et en chaîne, deux cibles absentes, une boucle et des clés héritées
d'`Object.prototype`.

Empreinte SHA-256, pour constater qu'il n'a pas été retouché (`sha256sum
tokens.json`) :

```text
433f7e1060e3aa4e8e6a45410d8c040ae27cf3b11241e8210ac6bc46d12e5ff8  tokens.json
```

`.gitattributes` le maintient en LF, sans quoi cette empreinte ne vaudrait
plus rien.

## Cycle de vie

Ce dossier vit tant que le kit lit la forme d'origine. Il disparaît avec le
code qui la lit, jamais avant.
