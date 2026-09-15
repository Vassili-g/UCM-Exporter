# @ucm-kit/cli

Check UCM contracts in any repository, and report the result to the person who
exported them.

A **UCM contract** is a JSON file describing a UI component exactly as it exists
in Figma: its variants, its structure, its design tokens, its usage rules. It is
written by the [UCM Contract
Exporter](https://github.com/Vassili-g/UCM-Exporter) Figma plugin and committed
next to the component's code. This command reads those files and says whether
they still hold together.

```sh
npx --yes @ucm-kit/cli@0.1.35 init
npx --yes @ucm-kit/cli@0.1.35 check --report ci-report.md
```

Pin an exact version, without `^`. A range would let npx install a build this
project has not tested. Two runs would then return different verdicts for the
same contract.

## Your repository does not have to be a Node project

`ucm init` writes a workflow that requires no `package.json`. An iOS repository,
an Android one, or a plain folder of contracts can have its exports checked. The
only requirement is Node, and in CI `setup-node` provides it.

If a `package-lock.json` happens to exist, the workflow runs `npm ci` first, so
that any optional stack adapter the repository installed becomes visible to `ucm
check`.

## Commands

| Command | What it does |
|---|---|
| `ucm init` | Installs what the repository is missing, never overwriting a file that already exists |
| `ucm check` | Checks every contract and renders the report |
| `ucm icons` | Lists the icons the contracts ask this repository to draw |
| `ucm tokens css --out <file>` | Writes the CSS stylesheet of the tokens and their modes |
| `ucm aides [<aide>]` | Lists the implementation guides, or prints one |
| `ucm guide <contract>` | Prints what an agent reads before implementing that contract |
| `ucm --help` | Prints the above |

`ucm init` takes four options:

| Option | Effect |
|---|---|
| `--components <dir>` | The folder the contracts are stored under |
| `--tokens <dir>` | The folder that holds `tokens.json` |
| `--implementation <pattern>` | Where a contract's implementation lives |
| `--sans-agents` | Writes neither the agent relays, nor `.ucm/conventions.md`, nor the templates |

The first two take a folder, because a folder is what a repository arranges.
`--tokens` appends the file name before writing it, so the `tokens` field of
`ucm.config.json` stays a file path: the readers treat it as one, and turning it
into a folder would silently point every configuration already written at
`tokens.json/tokens.json`.

`--implementation` takes a pattern, not a folder. It must contain `{id}`;
without it every contract would resolve to the same file. A repository that does
not write React states its own extension here, rather than carrying a `.tsx`
that was wrong the day it was installed:

```sh
npx --yes @ucm-kit/cli@0.1.35 init --components Sources/DesignSystem --implementation '{dir}/{id}.swift'
```

All three act only on a first install: `ucm init` never overwrites an existing
configuration, and says so when options were passed to a repository that already
has one.

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

## The token stylesheet

`ucm tokens css --out <file>` reads the token file that `ucm.config.json`
names and writes one custom property per token. Each property is named by
`tokenCssVariable`, the rule `@ucm-kit/core` publishes. An alias stays a
`var()`, so a token keeps following the token it cites.

```sh
npx --no-install ucm tokens css --out src/generated/tokens.css
```

Run it before `dev` and `build`, in place of any other generator of the same
stylesheet, and import the generated file once, from the application's CSS
entry point.

**Modes are attributes.** Each axis of `tokens.json`, one per Figma collection
with several modes, is selected by an HTML attribute on any element: its
subtree takes that mode, and removing the attribute gives back the mode
inherited from above. The attribute is `data-` followed by the axis name, as
the command prints it. A repository names another one in `ucm.config.json`:

```json
{
  "modes": { "color-brand-tokens": "data-brand" },
  "css": { "fontFamilyFallback": "sans-serif" }
}
```

Two axes with the same set of modes may share an attribute. A component reads
tokens and never declares one, which lets any ancestor switch its mode.

A collection that Figma extended collections override, an experimental reading,
adds the axis `<axis>-extensions`: its attribute takes `base` for the collection
itself, or the name of an extension.

A token without a value in a context, because the export found no target for its
alias, is declared `initial` there. A `var()` reading it takes its fallback, and
never the value of an enclosing context. The command names the token.

The command writes nothing and exits with `1` when the file cannot give a
correct stylesheet: an alias to a missing token, two token paths that give the
same property, two extension names that give the same CSS name, an alias cycle
that a context can reach, an alias whose type changes in a mode or an extension,
or modes the export did not attach to an axis. A key of `modes` that names no
axis of the token file exits with `2`. The previous
stylesheet stays in place. A token file exported before axes were declared is
refused with that reason; `--sans-modes` writes the default value of every token
until the tokens are exported again. Without a token file, the command writes an
empty stylesheet when no contract cites a token, and refuses otherwise.

## Implementation guides

Each characteristic a contract can carry, a grid, a `ring`, a composed
dependency, has a guide in `aides/`. A guide has three parts: its meaning, which
UCM owns and a repository never changes; a default way of writing it, in CSS;
and the proof that checks it. Guides without a default writing are anchors: the
repository answers them.

`ucm aides` lists the guides and where each writing comes from. `ucm aides
<aide>` prints one. A repository replaces a default writing, or answers an
anchor, in `.ucm/conventions.md`:

```md
Stack: CSS Modules, one folder per component.

## contour-ring
<!-- ucm:copie contour-ring <version> <fingerprint> -->

Class `ring` of `src/styles/outlines.module.css`.

Contrôle : `npm run lint:css`
```

The text before the first section describes the stack, and is the writing of
the `composant` guide. A `## <aide>` section replaces that guide's default
writing. `ucm aides` reports an unknown title, a duplicate section, a
`## composant` section and a token reference in a section. The file closest to
a path applies, searching up to the folder that holds `ucm.config.json`, never
above the repository.

A `Contrôle :` line adds its commands, between backticks, to the proof of the
guide. `ecritures-par-defaut: non` on the first line prints meanings only, for a
repository that writes no CSS.

`ucm aides <aide> --personnaliser [<path>]` appends that guide's section, with
its default writing to edit, to the closest conventions file. `composant` has no
section, and the command refuses it. The marker records the version and a
fingerprint of the copied writing: when the default writing changes, `ucm aides`
and `ucm guide` name the section to read again, and a marker without a
fingerprint is named as well. An existing section is never overwritten.

## The guide of a contract

`ucm guide <contract> [--out <file>]` prints, in one Markdown document:

1. what to read again first: conventions anomalies, copied sections whose
   default writing changed, and `@ucm-kit/cli` pins that differ between the two
   relays, the workflow and `package.json`;
2. the procedure, `procedure.md`;
3. the text before the first section of the closest conventions file;
4. the contract: its meta, props, structure, states, intent, rendering, variants
   with their view reference, each view and catalog entry once, the icons, text
   styles and binding definitions in use, and the props and samples of each
   dependency;
5. each guide the contract's characteristics use, with the repository's section
   or the default writing, and the proof;
6. the anchors the conventions leave open, as questions for a developer;
7. the mode axes that reach the contract, their attributes, and the contexts to
   check;
8. the icons the contract asks for, then the size of each part.

The command exits with `1` when the composition graph or the token file is
inconsistent, and with `2` for an invocation, a configuration or a contract it
cannot read, a contract version outside its reading window included.

## What `ucm init` writes

Five control files, then what an agent needs, unless `--sans-agents` is passed.
The command explains each one as it writes it. An existing file is kept as it
is, and the command names what it left alone.

| File | Why |
|---|---|
| `ucm.config.json` | Where the contracts, the tokens and the implementations live |
| `.gitattributes` | Keeps contracts and tokens in LF, so a re-export from a Windows machine does not produce a whole-file diff |
| `.vscode/settings.json` | Binds `*.contract.json` to the JSON Schema of the installed package, so the editor validates as you read |
| `.gitignore` | Keeps `ci-report.md` out of the repository; it is regenerated on every run and describes only that run |
| `.github/workflows/ucm.yml` | Runs the check on every pull request and posts the report as a comment |
| `.agents/skills/ucm-implementer/SKILL.md`, `.claude/skills/ucm-implementer/SKILL.md` | Two identical relays: an agent loads one before writing a component, and runs `ucm guide` at the pinned version |
| `.ucm/conventions.md` | The repository's stack and writings, with its instructions in a comment |
| `.ucm/gabarits/` | The templates of the installed stack adapter, when it publishes some |

The workflow is yours once written. It will never be overwritten.

An installed adapter that fails to load is reported, and the rest is
installed. The command then prints the lines it does not write, each with its
file: `@ucm-kit/cli` in `devDependencies`, `ucm tokens css` at the head of the
`dev` and `build` scripts, the import of the generated stylesheet, and the
optional `modes` section when `tokens.json` declares axes. A line already present
is not printed.

### `ucm.config.json`

Three paths. **This file is the only authority on where an export lands.** The
Figma plugin reads it before publishing, and `ucm check` reads it before looking
for contracts. A repository that arranges things differently says so here, once,
and both sides follow.

Its absence is the nominal case: the defaults below apply. A repository with a
single `components/` folder works without writing a line. A file that exists but
is malformed is refused on both sides.

```json
{
  "components": "components",
  "tokens": "tokens.json",
  "implementation": "{dir}/{id}.tsx"
}
```

`implementation` is a pattern with two tokens, `{dir}` for the contract's folder
and `{id}` for its identifier. Replace it with the pattern your repository uses.

No version number goes in this file. Which contract versions can be read belongs
to the installed package, and repeating it here would create a second authority
that drifts on the first update.

## What the report says

The report is written for the **designer** who validates the export. It requires
no CI log. Every reason a pull request is refused appears in it.

Six checks run on each contract. Four block a merge, two only warn: **a check
blocks when the file on disk cannot be read as it stands**, and warns when the
read succeeds and the gap points at the code or at the token file.

The direction of the gap names who fixes it. The CI never reads who opened the
pull request. A contract that is too old is re-exported; a contract that is too
new needs this package upgraded, which no re-export replaces.
[`@ucm-kit/core`](https://www.npmjs.com/package/@ucm-kit/core) names both
directions.

| Check | Verdict |
|---|---|
| The contract is readable and complete | Blocks |
| This repository can read that contract version | Blocks |
| Composition: every nested component has its own contract, the lists agree, no cycles | Blocks |
| Typography tokens have the expected type | Blocks |
| Every `{token.path}` cited exists in the token file | Warns, but a missing or unreadable token file blocks |
| The code exposes the props the contract declares, with a stack adapter installed | Warns |

Before any contract, the check reads the format version at the root of the
token file. A version newer than this package reads, or a mark that is not a
version, blocks the merge, even in a repository with no contract yet. A
developer upgrades the UCM packages for the first case, and the designer runs
the token export again for the second.
[`@ucm-kit/core`](https://www.npmjs.com/package/@ucm-kit/core) lists the four
states.

A gap with the code needs a developer, so it warns and lets the merge through. A
token removed from the design system does too: tokens are the source of truth,
so an older contract does not hold back their evolution. A token file that is
absent or unreadable is another matter: no reference can be resolved at all, so
the check gives up rather than reporting every path as missing.

A contract may land before the code that implements it. A missing implementation
is an allowed stage of the work.

**So is a repository with no contract at all.** Right after `ucm init` nothing
has been exported: there is no token file, and usually no contract folder. From
`0.1.10` on, `ucm check` returns 0 there and reports what to do next. The number
of contracts decides: with one or more, a missing token file blocks the merge
again, because those contracts cite tokens that cannot be resolved.

The report also relays two things it does not measure itself: the warnings the
export wrote into the contract, and the verdict of the repository's own tests
when an orchestrator passes it in through `UCM_ECHECS_DE_TESTS`.

## Optional stack adapters

The first five checks above read contracts and tokens only, so they work
whatever the repository is written in. Comparing a contract to real code needs
to read that code, which is a stack adapter's job.

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
