# @ucm-kit/core

The UCM contract format, and the readers that judge a contract.

A **UCM contract** is a JSON file describing a UI component exactly as it exists
in Figma: its variants, its structure, its design tokens, its usage rules. It is
written by the [UCM Contract
Exporter](https://github.com/Vassili-g/UCM-Exporter) Figma plugin, and read by
the repository that implements the component. This package is what both sides
must share in order to talk about the same format.

```sh
npm install @ucm-kit/core@0.1.23
```

Most repositories never call this package directly. They run
[`@ucm-kit/cli`](https://www.npmjs.com/package/@ucm-kit/cli), which calls it for
them. Install it when you want to run the checks from your own code.

## Validate a contract

The package exists to answer one question in CI: **whether this contract can be
read, and whether it holds together.**

```js
import { readFileSync } from "node:fs";
import {
  trouverContrats,
  verdictDeVersion,
  champsInvalidesDuContrat,
} from "@ucm-kit/core/lecteurs";

for (const path of trouverContrats("./src/components")) {
  const contract = JSON.parse(readFileSync(path, "utf8"));

  const verdict = verdictDeVersion(contract.meta.contractVersion);
  if (verdict !== "ok") {
    console.error(`${path}: version ${contract.meta.contractVersion} is ${verdict}`);
    continue;
  }

  const invalid = champsInvalidesDuContrat(contract);
  if (invalid.length > 0) console.error(`${path}: ${invalid.join(", ")}`);
}
```

`trouverContrats` walks a directory for `*.contract.json`.
`champsInvalidesDuContrat` returns the paths of the fields that are missing or
malformed; an empty array means the contract holds. Neither throws.

## A repository with no contract at all

Right after `ucm init` nothing has been exported: there is no token file, and
usually no contract folder. `controlerRepository`, the whole-repository entry
point that `@ucm-kit/cli` calls, returns a green verdict there and reports the
next step. Earlier releases refused it; `@ucm-kit/core@0.1.14` is the first that
does not.

The number of contracts decides. With one contract or more, a missing tokens
file blocks the merge, because that contract cites tokens that cannot be
resolved. A tokens file that exists but does not parse blocks at any stage,
whatever the number of contracts.

## A version gap has a direction, which names who fixes it

`verdictDeVersion` returns `"ok"`, `"ancien"` (too old) or `"recent"` (too new):

- **too old.** The contract predates fields the code now depends on, and is
  silent about things it never knew. A re-export from Figma fixes it. That gesture
  belongs to the designer.
- **too new.** The contract comes from a plugin ahead of this repository. No
  re-export will help. The repository has to catch up, by upgrading this
  package.

A validator that only says "invalid" cannot tell these apart. It hands the
designer a gap the developer owns. That distinction is why this function exists
rather than a boolean.

The accepted range is exposed rather than documented, so that it cannot drift
away from what the code actually does:

```js
import { VERSION_CONTRAT_MINIMALE, VERSION_CONTRAT_MAXIMALE } from "@ucm-kit/core/lecteurs";
// The two versions this release reads, named in Status below.
```

## Why the three entry points are separate

```js
import { CONTRACT_VERSION, codeIdentifier, normalizeName } from "@ucm-kit/core/format";
import { champsInvalidesDuContrat, verdictDeVersion } from "@ucm-kit/core/lecteurs";
import { lireLeSchema, CHEMIN_DU_SCHEMA } from "@ucm-kit/core/lecteurs";
```

**`@ucm-kit/core/format`** gives the shape of a contract, its version, the two
naming rules, and the shape of a token reference. **This subpath depends on
nothing**: not Node, not Figma, not a third-party package. It travels inside a
Figma plugin bundle, where `node:fs` does not exist, and inside a browser.

**`@ucm-kit/core/lecteurs`** holds everything that *judges* a contract already
written: its shape, its composition graph, its token references, the meaning of
a version gap. These modules use `ajv` and `node:fs`, so they have no business
in a plugin bundle. Keeping them apart is what lets the producer and the
consumer share one definition instead of each copying it.

**`@ucm-kit/core/schema`** is the JSON Schema itself, as a file, for binding
`*.contract.json` to validation in an editor. From code, `lireLeSchema()`
returns it parsed and `CHEMIN_DU_SCHEMA` gives its resolved path, which avoids
depending on the JSON import syntax your Node version happens to support.

The schema describes the *shape* of a contract. Its coherence, its internal
cross-references and its tokenized value formats stay outside it, as its own
`description` says. It derives from the same types the readers enforce, so it
replaces none of them.

## What this package does not do

It does not read Figma, does not generate component code, and does not render
anything. It never rewrites a contract; every reader takes a contract and
returns a verdict. The plugin produces contracts. Implementing the component is
yours.

## Status

**0.x, the public surface is not frozen.** Pin an exact version, without `^`.

**This release reads two contract versions, `11.0` and `12.0`**, the previous
one and the current one. The window exists so that a consumer is not red between
the day the kit moves and the day its contracts are re-exported. Anything
outside it is refused, major or minor alike, with a verdict that names the fix
and its owner rather than a list of missing fields.

The window is deliberate. Its lower bound tracks the real previous version and
closes by one notch on each release. Read `VERSION_CONTRAT_MINIMALE` and
`VERSION_CONTRAT_MAXIMALE` rather than trusting this paragraph.

The exported symbols are French: `champsInvalidesDuContrat` reads as "invalid
fields of the contract", `verdictDeVersion` as "version verdict".

- [Repository and issues](https://github.com/Vassili-g/UCM-Exporter)
- [MIT licensed](https://github.com/Vassili-g/UCM-Exporter/blob/main/LICENSE)
