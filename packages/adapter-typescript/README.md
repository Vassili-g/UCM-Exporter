# @ucm-kit/adapter-typescript

Optional adapter for TypeScript repositories that consume UCM contracts. It adds
static parity between contracts and code, and types generated from the
contracts. It lives outside
[`@ucm-kit/core`](https://www.npmjs.com/package/@ucm-kit/core) because it
depends on the TypeScript compiler, a 23 MB dependency.

```sh
npm install --save-dev @ucm-kit/adapter-typescript@0.1.35 @ucm-kit/cli@0.1.42
npx ucm-typescript          # generates the types from the contracts
npx --no-install ucm check  # checks the contracts, parity included
```

Requires Node 20 or later, a `tsconfig.json` at the repository root, and a
`ucm.config.json` or the default paths. If `ucm init` already ran, run it again
after installing the adapter to receive its templates in `.ucm/gabarits/`.

## Static parity

`ucm check` discovers this package when it is installed in the repository, and
compares each contract to the component that implements it. Six gaps are
reported:

| Gap | What it means |
|---|---|
| Missing prop | The contract declares a prop the component's public API does not expose |
| Incompatible type | A `boolean` prop of the contract is typed as something else |
| Value the code does not offer | The contract publishes an enum value the declared union leaves out |
| Unused boolean | A `boolean` prop is declared but never read by the component |
| Unused enum | An enum prop is declared but never read by the component |
| Wrong composition cardinality | A declared dependency is rendered a different number of times than the contract says |

Props are read with the TypeScript type checker; compositions are counted by
their occurrences in JSX. The props of `Button.tsx` come from an interface or a
type alias named `ButtonProps`. The component is the function named `Button`,
or the file's default export. A prop counts as read whether it is destructured
in the signature or from `props` in the body.

Every gap **warns without blocking**. The gap is in the code, so a developer
closes it.

## The convention composition counting assumes

**Counting is static: a dependency rendered by a loop is not counted.** Keep
every occurrence explicit in the source, and neutralise in place the one a given
view does not show, rather than removing it. Otherwise a list built with
`.map()` reports a cardinality gap the contract did not intend. No opt-out
exists for a single component.

## What it does not measure

Type comparison covers `boolean` props only. `string`, `icon`, `instance-swap`
and `slot` props are checked for presence and never for type.

Enum values are compared with the **declared union only**. A union smaller than
the contract is reported; a union that accepts more is not. On a widened type
such as `string`, nothing is reported.

What the component does with a value is not checked: a `switch` with a
`default`, a partial mapping table, or a value forwarded to a child all pass. A
contract describes the views that exist, not the logic that picks one.

A prop relayed through `{...rest}` without being read is reported as unused.

Nothing here executes a render. A repository without this adapter receives none
of these messages, so their **absence proves nothing** there.

## Generated types

```sh
npx ucm-typescript             # writes to src/generated/contracts/
npx ucm-typescript --out <dir>
```

The command reads the contracts under the `components` folder of
`ucm.config.json`, and writes one `<Component>.ts` per contract that has enum
props. Each file exports one union per enum prop, such as `ButtonVariant`, and
`ButtonVariantProps`, the combinations of variant axes that exist in Figma. Type
a component's props against these unions rather than against a hand-copied
list, and run the command again after each export. An unreadable contract is
skipped and named; `ucm check` reports why.

## Status

**0.x, the public surface is not frozen.** Pin an exact version, without `^`.

- [Repository and issues](https://github.com/Vassili-g/UCM-Exporter)
- [MIT licensed](https://github.com/Vassili-g/UCM-Exporter/blob/main/LICENSE)
