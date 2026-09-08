# @ucm-kit/cli

Check UCM contracts in any repository, and report the result to the person who
exported them.

A **UCM contract** is a JSON file describing a UI component exactly as it exists
in Figma: its variants, its structure, its design tokens, its usage rules. It is
written by the [Unified Component Exporter](https://github.com/Vassili-g/UCM-Exporter)
Figma plugin and committed next to the component's code. This command reads
those files and says whether they still hold together.

```sh
npx --yes @ucm-kit/cli@0.1.12 init
npx --yes @ucm-kit/cli@0.1.12 check --report ci-report.md
```

Pin an exact version, without `^`. A range would let npx pick a build nobody
tested, and the check would change its verdict without a single file moving.

## Your repository does not have to be a Node project

`ucm init` writes a workflow that requires no `package.json`. An iOS repository,
an Android one, or a plain folder of contracts can have its exports checked. The
only requirement is Node, and in CI `setup-node` provides it.

If a `package-lock.json` happens to exist, the workflow runs `npm ci` first, so
that any optional stack adapter the repository installed becomes visible to
`ucm check`.

## Commands

| Command | What it does |
|---|---|
| `ucm init` | Installs what the repository is missing, never overwriting a file that already exists |
| `ucm check` | Checks every contract and renders the report |
| `ucm icons` | Lists the icons the contracts ask this repository to draw |
| `ucm --help` | Prints the above |

`ucm check` takes two options:

| Option | Effect |
|---|---|
| `--base <sha>` | Limits informational notices to contracts changed since that commit |
| `--report <path>` | Writes the markdown report to that path, in addition to the terminal |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | The command did what it was asked |
| `1` | Checks failed |
| `2` | The invocation or the configuration is at fault |

`1` and `2` never overlap. A typo in a flag must not read like a broken export.

## What `ucm init` writes

Five files, and it explains each one as it writes it. An existing file is kept
as it is, and the command tells you what it left alone.

| File | Why |
|---|---|
| `ucm.config.json` | Where the contracts, the tokens and the implementations live |
| `.gitattributes` | Keeps contracts and tokens in LF, so a re-export from a Windows machine does not produce a whole-file diff |
| `.vscode/settings.json` | Binds `*.contract.json` to the JSON Schema of the installed package, so the editor validates as you read |
| `.gitignore` | Keeps `ci-report.md` out of the repository; it is regenerated on every run and describes only that run |
| `.github/workflows/ucm.yml` | Runs the check on every pull request and posts the report as a comment |

The workflow is yours once written. It will never be overwritten.

### `ucm.config.json`

Three paths, and nothing else. The file is optional: a repository with a single
`components/` folder works without writing a line.

```json
{
  "components": "components",
  "tokens": "tokens.json",
  "implementation": "{dir}/{id}.tsx"
}
```

`implementation` is a pattern with two tokens, `{dir}` for the contract's folder
and `{id}` for its identifier. The default shown here is a default, not an
assumption: replace it with your own.

No version number goes in this file. Which contract versions can be read belongs
to the installed package, and repeating it here would create a second authority
that drifts on the first update.

## What the report says

The report is written for the **designer** who validates the export, not for the
developer who reads CI logs. Every reason a pull request is refused appears in
it.

Six checks run on each contract. Four of them block a merge, two only warn, and
the split follows one rule: **a check blocks only if re-exporting from Figma can
fix it.**

| Check | Verdict |
|---|---|
| The contract is readable and complete | Blocks |
| This repository can read that contract version | Blocks |
| Composition: every nested component has its own contract, the lists agree, no cycles | Blocks |
| Typography tokens have the expected type | Blocks |
| Every `{token.path}` cited exists in the token file | Warns |
| The code exposes the props the contract declares | Warns |

A gap with the code needs a developer, so it warns and lets the merge through. A
token removed from the design system does too: tokens are the source of truth,
and an older contract does not hold back their evolution.

A contract may land before the code that implements it. A missing implementation
is an allowed state, not an error.

**So is a repository with no contract at all.** Right after `ucm init` nothing
has been exported: there is no token file, and usually no contract folder. From
`0.1.9` on, `ucm check` returns 0 there and reports what to do next. The number
of contracts decides: with one or more, a missing token file blocks the merge
again, because those contracts cite tokens nobody can resolve.

The report also relays two things it does not measure itself: the warnings the
export wrote into the contract, and the verdict of the repository's own tests
when an orchestrator passes it in through `UCM_ECHECS_DE_TESTS`.

## Optional stack adapters

The six checks above read contracts and tokens only, so they work whatever the
repository is written in. Comparing a contract to real code needs to read that
code, which is a stack adapter's job.

`ucm check` discovers an adapter installed **by the repository**, resolving from
the checked root rather than from the npx cache. Install
[`@ucm-kit/adapter-typescript`](https://www.npmjs.com/package/@ucm-kit/adapter-typescript)
to add static prop and composition parity for TypeScript projects. Without an
adapter, the report says the implementation was not read, and never that it is
conformant.

## Status

**0.x, the public surface is not frozen.** Pin an exact version.

- [Repository and issues](https://github.com/Vassili-g/UCM-Exporter)
- [MIT licensed](https://github.com/Vassili-g/UCM-Exporter/blob/main/LICENSE)
