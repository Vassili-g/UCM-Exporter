# Schéma DTCG `2025.10` figé

`format.json` est le schéma du module Format DTCG `2025.10`, tel que
designtokens.org le sert. Les tests du plugin l'utilisent pour juger ce que
`exportTokens.ts` écrit, avec une autorité extérieure au producteur.

## Provenance

| Champ | Valeur |
|---|---|
| URL | <https://www.designtokens.org/schemas/2025.10/format.json> |
| Réponse | HTTP 200, `etag: "2954cafd83973d4b025daca26fd55878-ssl"` |
| Récupération | 2026-09-11 |
| Fabrication | `schemas/scripts/bundle.ts` du dépôt `design-tokens/community-group` |
| Sources | `schemas/src/2025.10/`, dernier changement au commit `11f95e87701ed9e8664e82416d31c2213fcdd657` |

Le fichier est autonome : chaque sous-schéma (`format/token.json`,
`format/values/color.json`…) y est embarqué sous `definitions`, avec son `$id`.
Les adresses de ces sous-schémas sur designtokens.org répondent 404 ; seul le
fichier empaqueté est servi.

Empreinte SHA-256, pour constater qu'il n'a pas été retouché (`sha256sum
format.json`) :

```text
32e93b780e4e4bca778d0780cb797a560deedc470c608af16576223f7e42915f  format.json
```

`.gitattributes` le maintient dans ses octets d'origine.

## Cycle de vie

Ce fichier ne se rafraîchit pas : un schéma récupéré de nouveau changerait ce
que les tests jugent sans que le moteur ait bougé. Le remplacer suit la décision
de viser une autre version du module Format, dans le commit qui change le
moteur pour elle.
