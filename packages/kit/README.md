# @ucm-kit/core

Le **format de contrat UCM** et ses **lecteurs**.

Un contrat UCM est un JSON qui décrit un composant d'interface tel qu'il existe
dans Figma : ses variantes, sa structure, ses tokens, ses règles d'usage. Il est
écrit par le plugin *Unified Component Exporter* et lu par le repository qui
implémente le composant. Ce paquet est ce que les deux côtés doivent partager
pour parler du même format.

## Deux sous-chemins, et la raison de la coupure

```js
import { CONTRACT_VERSION, codeIdentifier, normalizeName } from "@ucm-kit/core/format";
import { champsInvalidesDuContrat, verdictDeVersion } from "@ucm-kit/core/lecteurs";
```

`@ucm-kit/core/format` — la forme du contrat, sa version, et les deux règles de
nommage. **Ce sous-chemin ne dépend de rien** : ni de Node, ni de Figma, ni d'un
paquet tiers. C'est une contrainte d'exécution, pas une élégance : il voyage
dans le bundle d'un plugin Figma, où `node:fs` n'existe pas, comme dans un
navigateur.

`@ucm-kit/core/lecteurs` — ce qui **juge** un contrat déjà écrit : sa forme, son
graphe de composition, ses références de token, et le sens d'un écart de
version. Ces modules utilisent `ajv` et `node:fs`, et n'ont donc rien à faire
dans un bundle de plugin.

`@ucm-kit/core/schema` — le JSON Schema du contrat, pour associer un
`*.contract.json` à sa validation dans un éditeur.

## Le sens d'un écart de version

Un écart a deux sens opposés, et les confondre envoie le lecteur dans le mur :
un contrat **trop ancien** tait des informations dont le code dépend, et un
ré-export depuis Figma le corrige ; un contrat **trop récent** vient d'un plugin
en avance sur le repository, et aucun ré-export n'y changera rien — c'est le
repository qui doit rattraper. `verdictDeVersion` rend `ok`, `ancien` ou
`recent`, pour que le diagnostic nomme le bon responsable.

## État

Version 0.x : la surface publique n'est pas encore gelée. Épinglez une version
**exacte**, sans `^`.
