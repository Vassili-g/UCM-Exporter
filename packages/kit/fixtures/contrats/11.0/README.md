# Corpus 11.0 figé, hors de la fenêtre de lecture

Ces quatre contrats sont un **instantané assumé**, et c'est la seule chose qui
les rend utiles.

## Pourquoi ils existent

La fenêtre de lecture porte la 12.0 et la 13.0
([COMPATIBILITE.md](../../../../../docs/COMPATIBILITE.md)), et le jeu N-1 est
[celui de la 12.0](../12.0/README.md). `validation-contrat.mjs` garde pourtant
le code qui lit la 11.0 et les versions antérieures.

`tests/refus-enregistres.test.mjs` mesure sur ce jeu les contrôles que ce code
exerce. Sans lui, un élagage des validateurs marquerait « jamais atteint » les
chemins propres à la 11.0. Il les supprimerait sans que l'empreinte enregistrée
change.

## Ce qu'ils ne sont pas

Ils ne testent pas le moteur. `AGENTS.md` interdit qu'un contrat commité serve à
ça, et la raison tient toujours : un instantané ne bouge qu'au réexport, si bien
qu'une régression du moteur ne s'y verrait jamais. Ces fichiers ne sont lus que
par les **lecteurs**, validateurs de version et de champs, pour lesquels
l'immobilité est précisément la propriété recherchée. Un test qui les compare à
une sortie du moteur est une faute.

Ils ne sont pas non plus une source à rafraîchir. **Un réexport les rendrait
inutiles** : ils cesseraient de documenter la 11.0.

## Provenance

Copiés depuis `UCM-Playground`, avant le réexport en 12.0 (A2), à l'état de sa
branche `main` du 4 septembre 2026.

| Contrat | Commit d'export (UCM-Playground) | Date d'export |
|---|---|---|
| `Alert.contract.json` | `e3fd6b9` | 2026-09-02 |
| `Button.contract.json` | `e508ef7` | 2026-09-02 |
| `StressTest.contract.json` | `b6f777f` | 2026-08-28 |
| `TileLink.contract.json` | `9329481` | 2026-09-02 |

Les fichiers sont pris dans l'objet Git du Playground, pas dans sa copie de
travail : le moteur écrit des LF (`src/contract/serializeJson.ts`), qu'une
extraction Windows convertirait. `.gitattributes` les y maintient, sans quoi ces
empreintes ne vaudraient plus rien.

Empreintes SHA-256, pour constater qu'ils n'ont pas été retouchés (`sha256sum
*.contract.json`) :

```text
3b05112b1eef5d5d946ad89f9025a88b141fe6722443115324b89f59d52c8be3  Alert.contract.json
74302ff9a6d438a882b55c0011ca79b42dae91c842d662b1b482866ed13d7b4c  Button.contract.json
617e5396594988eeefc16ea5be5eba78a54dad45d74d881b9d7b6f3863f611d8  StressTest.contract.json
cf909b421642731d279fee233cf3740b959e0b9f42ebadeb8cc02669e7482f9f  TileLink.contract.json
```

## Cycle de vie

La fenêtre de lecture ne porte plus la 11.0. Ce dossier disparaît avec le code de
compatibilité qu'il couvre, jamais avant : retirer ce code de
`validation-contrat.mjs`, puis ce dossier dans le même commit.
