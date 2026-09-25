# Corpus 13.0 figé, le jeu N-1

Ces quatre contrats sont un **instantané assumé**, et c'est la seule chose qui
les rend utiles.

## Pourquoi ils existent

La fenêtre de lecture porte deux versions, la courante et la précédente
([COMPATIBILITE.md](../../../../../docs/format/COMPATIBILITE.md)). Le moteur ne
fabrique que la courante (`src/contract/exportComponent.ts`) : la précédente
n'est donc observable qu'à partir de contrats que plus rien ne sait produire.
`tests/fenetre-de-lecture.test.mjs` les passe par tous les lecteurs, et
`tests/refus-enregistres.test.mjs` mesure sur eux les contrôles qu'un élagage
des validateurs ne doit pas emporter.

## Ce qu'ils ne sont pas

Ils ne testent pas le moteur. `AGENTS.md` interdit qu'un contrat commité serve à
ça : un instantané ne bouge qu'au réexport, si bien qu'une régression du moteur
ne s'y verrait jamais. Seuls les **lecteurs** les lisent.

Ils ne sont pas non plus une source à rafraîchir. **Un réexport les rendrait
inutiles** : ils cesseraient d'être N-1.

## Provenance

Copiés depuis `UCM-Playground`, avant le réexport en 14.0, à l'état du commit
`2f2f9b8` de sa branche `main`.

| Contrat | Commit d'export (UCM-Playground) | Date d'export |
|---|---|---|
| `Alert.contract.json` | `8e09cae` | 2026-09-11 |
| `Button.contract.json` | `0c526c2` | 2026-09-11 |
| `StressTest.contract.json` | `311809b` | 2026-09-11 |
| `TileLink.contract.json` | `c9e03ed` | 2026-09-11 |

Les fichiers sont pris dans l'objet Git du Playground (`git show`), pas dans sa
copie de travail : le moteur écrit des LF (`src/contract/serializeJson.ts`),
qu'une extraction Windows convertirait. `.gitattributes` les y maintient, sans
quoi ces empreintes ne vaudraient plus rien.

Empreintes SHA-256, pour constater qu'ils n'ont pas été retouchés (`sha256sum
*.contract.json`) :

```text
b427c872766d79034d5d8d47185fa630f9c1b1f0b356076e0cb3bde2b62e9aba  Alert.contract.json
c60ee1e0e1ad23ef896f29c637eb900fc23ac5903ec45377a6d5342655a8beba  Button.contract.json
eedecbe121ad8d07f5b7b24220602c4646d49f3723aad144218af17dd11f3888  StressTest.contract.json
87c1c1f8ca81cb51c565d43d03cf3bce772a88debd05b614de097808c42ebd74  TileLink.contract.json
```

## Cycle de vie

Ce dossier vit tant que la fenêtre de lecture inclut la 13.0. Il disparaît quand
elle se referme au-dessus, au même moment que le code de compatibilité qu'il
couvre, jamais avant.
