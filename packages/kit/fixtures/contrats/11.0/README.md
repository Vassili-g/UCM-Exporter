# Corpus 11.0 figé — jeu N-1

Ces quatre contrats sont un **instantané assumé**, et c'est la seule chose qui
les rend utiles.

## Pourquoi ils existent

Le moteur ne fabrique que la version courante
(`src/contract/exportComponent.ts`). Une fenêtre de lecture à deux versions —
la courante et la précédente, décidée par D8 de
[PLAN-INDUSTRIALISATION.md](../../../../../PLAN-INDUSTRIALISATION.md) — n'est donc
observable qu'à partir de contrats que plus rien ne sait produire. Sans ce jeu,
l'élagage de T2.1b mesurerait sa couverture sur la seule version courante et
marquerait « jamais atteint » tout ce qui sert la précédente : il supprimerait
exactement les chemins que D8 vient de décider de garder.

## Ce qu'ils ne sont pas

Ils ne testent pas le moteur. `AGENTS.md` interdit qu'un contrat commité serve à
ça, et la raison tient toujours : un instantané ne bouge qu'au réexport, si bien
qu'une régression du moteur ne s'y verrait jamais. Ces fichiers ne sont lus que
par les **lecteurs** — validateurs de version et de champs —, pour lesquels
l'immobilité est précisément la propriété recherchée. Un test qui les compare à
une sortie du moteur est une faute.

Ils ne sont pas non plus une source à rafraîchir. **Un réexport les rendrait
inutiles** : ils cesseraient d'être N-1.

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

Empreintes SHA-256, pour constater qu'ils n'ont pas été retouchés
(`sha256sum *.contract.json`) :

```text
3b05112b1eef5d5d946ad89f9025a88b141fe6722443115324b89f59d52c8be3  Alert.contract.json
74302ff9a6d438a882b55c0011ca79b42dae91c842d662b1b482866ed13d7b4c  Button.contract.json
617e5396594988eeefc16ea5be5eba78a54dad45d74d881b9d7b6f3863f611d8  StressTest.contract.json
cf909b421642731d279fee233cf3740b959e0b9f42ebadeb8cc02669e7482f9f  TileLink.contract.json
```

## Cycle de vie

Ce dossier a rejoint `packages/kit/` avec la Phase 1 (T1.2). Il vit tant que la
fenêtre de lecture inclut la 11.0, et disparaît quand elle se referme au-dessus
— au même moment que le code de compatibilité qu'il couvre, jamais avant.
