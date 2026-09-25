# @ucm-kit/cli

Check UCM contracts in any repository, and report the result to the person who
exported them.

A **UCM contract** is a JSON file describing a UI component exactly as it exists
in Figma: its variants, its structure, its design tokens, its usage rules. It is
written by the [UCM Contract
Exporter](https://github.com/Vassili-g/UCM-Exporter) Figma plugin and committed
next to the component's code. This command reads those files and reports
whether they are valid, whether their references resolve, and whether the code
matches them.

## Quick start

Requires Node 20 or later. At the root of the repository:

```sh
npx --yes @ucm-kit/cli@0.1.49 init
```

1. Commit and push the files `init` wrote.
2. Make the check block merges: see [GitHub](#github) or [GitLab](#gitlab).
3. Give the repository URL to the designer, who enters it in the Figma plugin
   with an access token.

To run the check locally:

```sh
npx --yes @ucm-kit/cli@0.1.49 check --report ci-report.md
```

`--yes` skips the npx confirmation prompt. Pin an exact version, without `^`:
a range lets npx install a build this project has not tested.

**The repository does not have to be a Node project.** The workflow `ucm init`
writes needs no `package.json`, so an iOS or Android repository, or a plain
folder of contracts, can have its exports checked. When a `package-lock.json`
exists, the workflow runs `npm ci` first, so `ucm check` finds a stack adapter
the repository installed.

## Commands

| Command | What it does |
|---|---|
| [`ucm init`](#ucm-init) | Installs what the repository is missing, never overwriting a file that already exists |
| [`ucm check`](#ucm-check) | Checks every contract and renders the report |
| `ucm icons` | Lists the icons the contracts ask this repository to draw |
| [`ucm tokens css --out <file>`](#the-token-stylesheet) | Writes the CSS stylesheet of the tokens and their modes |
| [`ucm aides [<aide>]`](#implementation-guides) | Lists the implementation guides, or prints one |
| [`ucm guide <contract>`](#the-guide-of-a-contract) | Prints what an agent reads before implementing that contract |
| [`ucm rapport-gitlab`](#gitlab) | Posts the report as a note on a GitLab merge request |
| `ucm --help` | Prints every command and option |

Every command exits with the same codes:

| Code | Meaning |
|---|---|
| `0` | The command did what it was asked |
| `1` | Checks failed |
| `2` | The invocation or the configuration is at fault |

A faulty invocation never exits with `1`, so it cannot pass for failed checks.

## `ucm init`

| Option | Default | Effect |
|---|---|---|
| `--components <dir>` | `components` | The folder the contracts are stored under |
| `--tokens <dir>` | the repository root | The folder that holds `tokens.json` |
| `--implementation <pattern>` | `{dir}/{id}.tsx` | The file that implements a contract: `{dir}` is the contract's folder, `{id}` its identifier |
| `--forge github\|gitlab` | detected, see below | The forge whose CI is written |
| `--sans-agents` | off | Writes neither the agent relays, nor `.ucm/conventions.md`, nor the templates |

`--tokens` takes a folder, and `ucm.config.json` stores the file path
`<dir>/tokens.json`. `--implementation` must contain `{id}`; without it, every
contract would resolve to the same file. A repository that does not write React
states its own extension:

```sh
npx --yes @ucm-kit/cli@0.1.49 init --components Sources/DesignSystem --implementation '{dir}/{id}.swift'
```

The three path options act only on a first install. `ucm init` never overwrites
an existing `ucm.config.json`, and says so when options were passed. To change
a path later, edit that file.

Without `--forge`, the host of the `origin` remote decides, then the presence of
`.gitlab-ci.yml`, and GitHub otherwise. The command names the forge and the
signal it followed.

### What it writes

Five control files, then what an agent needs, unless `--sans-agents` is passed.
The command explains each file as it writes it. An existing file is kept as it
is, and the command names what it left alone.

| File | Why |
|---|---|
| `ucm.config.json` | Where the contracts, the tokens and the implementations live |
| `.gitattributes` | Keeps contracts and tokens in LF, so a re-export from a Windows machine does not produce a whole-file diff |
| `.vscode/settings.json` | Binds `*.contract.json` to the JSON Schema of the installed package, so the editor validates as you read |
| `.gitignore` | Keeps `ci-report.md` out of the repository; it is regenerated on every run |
| `.github/workflows/ucm.yml` | Runs the check on every pull request and posts the report as a comment. On GitLab, `.gitlab/ucm.gitlab-ci.yml` and `.gitlab-ci.yml` replace it |
| `.agents/skills/ucm-implementer/SKILL.md`, `.claude/skills/ucm-implementer/SKILL.md` | Two identical relays: an agent loads one before writing a component, and runs `ucm guide` at the pinned version |
| `.ucm/conventions.md` | The repository's stack and writings, with its instructions in a comment |
| `.ucm/gabarits/` | The templates of the installed stack adapter, when it publishes some |

The workflow is yours once written, and `ucm init` never rewrites it.

The command then prints the lines it does not write, each with its file:
`@ucm-kit/cli` in `devDependencies`, `ucm tokens css` at the head of the `dev`
and `build` scripts, the import of the generated stylesheet, and the optional
`modes` section when `tokens.json` declares axes. A line already present is not
printed. An installed adapter that fails to load is reported, and the rest is
installed.

### `ucm.config.json`

**This file is the only authority on where an export lands.** The Figma plugin
reads it before publishing, and `ucm check` reads it before looking for
contracts. Without the file, the defaults below apply on both sides. A file that
exists but is malformed is refused on both sides.

```json
{
  "components": "components",
  "tokens": "tokens.json",
  "implementation": "{dir}/{id}.tsx"
}
```

Each path is relative to the repository root and written with `/`. A path that
starts with `/` or a drive letter, contains `\`, or has an empty, `.` or `..`
segment is refused: the plugin would write outside the repository with the
designer's token, and the check would read outside it.

The file holds no version number. The installed package decides which contract
versions it reads.

### GitHub

The workflow runs on every pull request and on every push to `main`. If the
default branch has another name, change it in `.github/workflows/ucm.yml`.

Its `contrats` job runs the check with read-only permissions. Its `commentaire`
job runs no code from the repository: it receives the report as an artifact
and posts it, replacing its previous comment.

A red check blocks a merge only when the base branch requires the `contrats`
status check, in a branch protection rule or a ruleset. GitHub offers these on
public repositories and on paid plans. Without that setting, the report
announces a blocked merge that is not blocked.

### GitLab

`init --forge gitlab` writes `.gitlab/ucm.gitlab-ci.yml`, two jobs with no
global key, so the project's other jobs keep their rules. `ucm` runs the check
in merge request pipelines and on the default branch; `ucm-rapport` posts the
note in merge request pipelines. Both take the default `test` stage. A new
`.gitlab-ci.yml` includes the file; an existing one is left alone, and the
command prints the `include` line to add. It also prints the settings it
cannot make:

- create the CI/CD variable `UCM_GITLAB_TOKEN`, masked and not protected,
  holding an `api` token of an account with the Reporter role on this project
  only: a service account's personal token, or a project access token where
  the GitLab plan offers one. Export branches are not protected, so a
  protected variable would be empty there. Every pipeline of every branch reads
  an unprotected variable, and any user who can push a branch can print it: the
  Reporter role limits that token to reading and commenting;
- tick "Pipelines must succeed" in the merge request settings. Without it, a red
  report does not block the merge it says is blocked;
- keep `test` in `stages:` when `.gitlab-ci.yml` declares them: GitLab refuses a
  pipeline whose job names a missing stage;
- put `- if: $CI_PIPELINE_SOURCE == "merge_request_event"` first in
  `workflow:rules` when `.gitlab-ci.yml` declares rules without it: GitLab then
  creates no merge request pipeline, and `ucm` checks no export.

Both jobs set `inherit: default: false`. A project `default:` block does not
reach them: its `before_script` would run before the token is unset, and would
fail in `ucm-rapport`, which has no clone. Global variables are still inherited.
`ucm` unsets `UCM_GITLAB_TOKEN` before `npm ci`, so install scripts do not
inherit it on executors that set variables in the job script. `ucm-rapport`
runs no code from the repository: it clones nothing, receives `ci-report.md`
as an artifact, disables install scripts, and runs `npx` from an empty
directory. It writes a minimal report when the check stopped before writing
one, then posts the report:

```sh
npx --yes @ucm-kit/cli@0.1.49 rapport-gitlab --projet "$CI_PROJECT_ID" --merge-request "$CI_MERGE_REQUEST_IID" --fichier "$CI_PROJECT_DIR/ci-report.md" --api "$CI_API_V4_URL"
```

| Option | Effect |
|---|---|
| `--projet <id>` | The GitLab project, by identifier or path |
| `--merge-request <iid>` | The merge request number within that project |
| `--fichier <path>` | The report written by `ucm check --report` |
| `--api <url>` | The GitLab API; `https://gitlab.com/api/v4` by default |

The command reads the token from `UCM_GITLAB_TOKEN` and never prints it. It
replaces the note that the token's account wrote with the `<!-- ucm-rapport -->`
marker, and creates one otherwise. A report carrying `<!-- ucm-sans-objet -->`
is the exception: it replaces an existing note, and never opens one, so a merge
request that touches nothing UCM stays free of comments. Written by `ucm check`
when the merge request changes no contract, no `tokens.json`, no
`ucm.config.json` and no resolved implementation. Without the variable it says so and exits
with `0`: the report stays in the job artifacts. A refused token exits with `1`
and names the fix. The job allows failure, so a refused token leaves the
pipeline the colour of the check.

## `ucm check`

| Option | Effect |
|---|---|
| `--base <sha>` | Scopes the report to what the merge request changes, since that commit |
| `--report <path>` | Writes the markdown report to that path, in addition to the terminal |

The report stops before 65,536 characters, the size of a GitHub comment, and
says so in its last line. It opens with the `<!-- ucm-rapport -->` marker, which
counts towards that limit and lets a publisher find the comment to replace. The
verdict follows and is never cut; the terminal output keeps every detail.

With `--base`, a merge request that changes no contract, no `tokens.json`, no
`ucm.config.json` and no resolved implementation gets a one-line report marked
`<!-- ucm-sans-objet -->`. A publisher replaces an existing comment with it and
never creates one. Blocking verdicts ignore this rule and always print in full.
Without `--base`, the report covers the whole repository.

### What the report says

The report is written for the **designer** who validates the export. Every
reason a merge is refused appears in it, so the designer never opens a CI log.

Six checks run on each contract. **A check blocks when the file on disk cannot
be read as it stands**, and warns when the read succeeds and the gap points at
the code or at the token file.

| Check | Verdict |
|---|---|
| The contract is readable and complete | Blocks |
| This repository can read that contract version | Blocks |
| Composition: every nested component has its own contract, the lists agree, no cycles | Blocks |
| Typography tokens have the expected type | Blocks |
| Every `{token.path}` cited exists in the token file | Warns, but a missing or unreadable token file blocks |
| The code exposes the props the contract declares, with a stack adapter installed | Warns |

The direction of a version gap names who fixes it. A contract that is too old
is re-exported by the designer. A contract that is too new needs this package
upgraded by a developer.

Before any contract, the check reads the format version at the root of the
token file. A version newer than this package reads blocks the merge, and a
developer upgrades the UCM packages. A mark that is not a version blocks too,
and the designer runs the token export again. Both apply even in a repository
with no contract yet.

A gap with the code warns: a developer closes it, and the merge goes through. A
token removed from the design system warns too, so an older contract does not
hold back the tokens. A contract may land before the code that implements it.

A repository with no contract passes. Right after `ucm init`, `ucm check`
returns `0` and reports the next step. From the first contract on, a missing
token file blocks the merge.

The report also relays the warnings the export wrote into the contract, and the
verdict of the repository's own tests when an orchestrator passes it in through
the `UCM_ECHECS_DE_TESTS` environment variable, a JSON object with `echoue` and
`echecs`.

### Optional stack adapters

The first five checks read contracts and tokens only, whatever the repository
is written in. Comparing a contract to real code needs a stack adapter.

`ucm check` discovers an adapter installed **by the repository**, resolving from
the checked root rather than from the npx cache. Install
[`@ucm-kit/adapter-typescript`](https://www.npmjs.com/package/@ucm-kit/adapter-typescript)
for prop and composition parity in TypeScript projects. Without an adapter, the
report says the implementation was not read, and never that it is conformant.

## The token stylesheet

`ucm tokens css --out <file>` reads the token file that `ucm.config.json`
names and writes one custom property per token. Each property is named by
`tokenCssVariable`, the rule `@ucm-kit/core` publishes. An alias stays a
`var()`, so a token keeps following the token it cites.

```sh
npx --no-install ucm tokens css --out src/generated/tokens.css
```

`--no-install` runs the version pinned in `devDependencies`. Run the command
before `dev` and `build`, in place of any other generator of the same
stylesheet, and import the generated file once, from the application's CSS
entry point.

| Option | Effect |
|---|---|
| `--out <file>` | The stylesheet to write. Required |
| `--sans-modes` | Writes the default value of every token, for a token file exported before axes were declared |

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
tokens and never declares an attribute, so any ancestor can switch its mode.

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
axis of the token file exits with `2`. The previous stylesheet stays in place. A
token file exported before axes were declared is refused with that reason, and
`--sans-modes` applies until the tokens are exported again. Without a token
file, the command writes an empty stylesheet when no contract cites a token, and
refuses otherwise.

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
its default writing to edit, to the conventions file closest to `<path>`.
`composant` has no section, and the command refuses it. The marker records the
version and a fingerprint of the copied writing: when the default writing
changes, `ucm aides` and `ucm guide` name the section to read again, and a
marker without a fingerprint is named as well. An existing section is never
overwritten.

## The guide of a contract

`ucm guide <contract> [--out <file>]` prints, in one Markdown document, or
writes to `<file>`:

1. what to read again first: conventions anomalies, copied sections whose
   default writing changed, and `@ucm-kit/cli` pins that differ between the two
   relays, the workflow and `package.json`;
2. the procedure, `procedure.md`;
3. the text before the first section of the closest conventions file;
4. the target contract's version, portable coverage and export diagnostics,
   then the props and samples of each dependency; the target contract stays in
   its own file and is not copied into the guide;
5. each guide the contract's characteristics use, with the repository's section
   or the default writing, and the proof;
6. the anchors the conventions leave open, as questions for a developer;
7. the mode axes that reach the contract, their attributes, and the contexts to
   check;
8. the icons the contract asks for, then the size of each part.

The command exits with `1` when the composition graph or the token file is
inconsistent, and with `2` for an invocation, a configuration or a contract it
cannot read, a contract version outside its reading window included.

## Status

**0.x, the public surface is not frozen.** Pin an exact version.

- [Repository and issues](https://github.com/Vassili-g/UCM-Exporter)
- [MIT licensed](https://github.com/Vassili-g/UCM-Exporter/blob/main/LICENSE)
