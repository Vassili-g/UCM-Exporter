# @ucm-kit/adapter-typescript

Optional adapter for TypeScript repositories that consume UCM contracts. It adds
two capabilities without making
[`@ucm-kit/core`](https://www.npmjs.com/package/@ucm-kit/core) depend on the
TypeScript compiler, a 23 MB dependency no other consumer should pay for.

```sh
npm install --save-dev @ucm-kit/adapter-typescript@0.1.16 @ucm-kit/cli@0.1.23
npx ucm-typescript
npx --no-install ucm check
```

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

Parity requires a `tsconfig.json` at the root. Props are read with the
TypeScript type checker; compositions are counted by their occurrences in JSX.

Every one of these **warns without blocking**. The gap is in the code, so a
developer closes it. No re-export helps.

## The convention composition counting assumes

**Counting is static: a dependency rendered by a loop is not counted.** Keep
every occurrence explicit in the source, and neutralise in place the one a given
view does not show, rather than removing it. Without that, a list built with
`.map()` reports a cardinality gap the contract did not intend.

Nothing enforces the convention. No opt-out exists for a single component. A
warning names what the count did not see, without blocking anything.

## What it does not measure

Type comparison covers `boolean` props only. An enum is judged on its declared
union, below; `string`, `icon`, `instance-swap` and `slot` props are checked for
presence and never for type.

Enum values are compared by the **declared union only**. A union smaller than
the contract is reported; a union that accepts more is not, because accepting
more contradicts nothing. On a widened type such as `string`, no value is
resolved and nothing is reported.

What the component does with a value stays outside the static guarantee. A
`switch` with a `default`, a partial mapping table, a value forwarded to a
child, a table held in another file and a business rule that substitutes one
value for another are all legitimate; telling them apart from an oversight would
require the contract to describe behaviour. A contract describes the views that
exist. The logic that picks one stays outside it.

A prop relayed through `{...rest}` without being read is reported as unused.
Following a spread would mean knowing the child's contract, and the warning
blocks nothing.

Nothing here executes a render.

None of this exists for a repository without this adapter, so the **absence of
these messages means nothing**. It is a capability of one adapter. The format
guarantees none of it.

## Generated types

```sh
npx ucm-typescript            # writes to src/generated/contracts/
npx ucm-typescript --out <dir>
```

It derives the enum unions from the contracts, so that a component's props can
be typed against the contract rather than against a hand-copied list.

## Status

**0.x, the public surface is not frozen.** Pin an exact version, without `^`.

- [Repository and issues](https://github.com/Vassili-g/UCM-Exporter)
- [MIT licensed](https://github.com/Vassili-g/UCM-Exporter/blob/main/LICENSE)
