# Corpus 12.0 figé, hors de la fenêtre de lecture

Ces quatre contrats sont un **instantané assumé**, et c'est la seule chose qui
les rend utiles.

## Pourquoi ils existent

La fenêtre de lecture porte la 13.0 et la 14.0
([COMPATIBILITE.md](../../../../../docs/format/COMPATIBILITE.md)), et le jeu N-1 est
[celui de la 13.0](../13.0/README.md). `validation-contrat.mjs` garde pourtant
le code qui lit la 12.0 et les versions antérieures.

`tests/refus-enregistres.test.mjs` mesure sur ce jeu les contrôles que ce code
exerce. Sans lui, un élagage des validateurs marquerait « jamais atteint » les
chemins propres à la 12.0. Il les supprimerait sans que l'empreinte enregistrée
change.

## Ce qu'ils ne sont pas

Ils ne testent pas le moteur. `AGENTS.md` interdit qu'un contrat commité serve à
ça : un instantané ne bouge qu'au réexport, si bien qu'une régression du moteur
ne s'y verrait jamais. Seuls les **lecteurs** les lisent.

Ils ne sont pas non plus une source à rafraîchir. **Un réexport les rendrait
inutiles** : ils cesseraient de documenter la 12.0.

## Provenance

Copiés depuis `UCM-Playground`, avant le réexport en 13.0, à l'état du commit
`19d4a74` de sa branche `main`.

| Contrat | Commit d'export (UCM-Playground) | Date d'export |
|---|---|---|
| `Alert.contract.json` | `8b85a0a` | 2026-09-08 |
| `Button.contract.json` | `42da844` | 2026-09-08 |
| `StressTest.contract.json` | `0bf0550` | 2026-09-08 |
| `TileLink.contract.json` | `7dbe4c0` | 2026-09-08 |

Les fichiers sont pris dans l'objet Git du Playground (`git show`), pas dans sa
copie de travail : le moteur écrit des LF (`src/contract/serializeJson.ts`),
qu'une extraction Windows convertirait. `.gitattributes` les y maintient, sans
quoi ces empreintes ne vaudraient plus rien.

Empreintes SHA-256, pour constater qu'ils n'ont pas été retouchés (`sha256sum
*.contract.json`) :

```text
c457a79c251b94b326298dcdfeaeb7e37b4624d46fda67fa8db5fe99f3e5d400  Alert.contract.json
a92c61771488e0e9a04a01b7f0aca67d89d9cdaa4e7e95fa6a4b9cf3060ad1ba  Button.contract.json
2096a0e2370aa536f556330033f1907986d853778ddc5a16bd4a6f639c56a122  StressTest.contract.json
30bb62c71eea0440d527ceb0727c82a608eaa40fd4b46a6b4a0cfb7b4e6fd75e  TileLink.contract.json
```

## Cycle de vie

La fenêtre de lecture ne porte plus la 12.0. Ce dossier disparaît avec le code de
compatibilité qu'il couvre, jamais avant : retirer ce code de
`validation-contrat.mjs`, puis ce dossier dans le même commit.
