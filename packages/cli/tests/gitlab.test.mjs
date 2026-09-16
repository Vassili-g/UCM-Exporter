/** `ucm init` pour GitLab, et `ucm rapport-gitlab` contre une API simulée. */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parse } from "yaml";

import { forgeDuRepository, init, lireArgumentsInit, rendreInit } from "../src/init.mjs";
import { MARQUEUR_RAPPORT, rapportGitlab } from "../src/rapport-gitlab.mjs";
import { executer } from "../src/ucm.mjs";

function repoVierge() {
  return mkdtempSync(join(tmpdir(), "ucm-gitlab-"));
}

const sansRemote = () => null;

test("--forge accepte github et gitlab, et refuse toute autre valeur en code 2", async () => {
  assert.equal(lireArgumentsInit(["--forge", "gitlab"]).forge, "gitlab");
  assert.equal(lireArgumentsInit(["--forge", "github"]).forge, "github");
  assert.match(lireArgumentsInit(["--forge", "bitbucket"]).erreur, /--forge attend github ou gitlab : bitbucket/);
  assert.match(lireArgumentsInit(["--forge"]).erreur, /--forge attend github ou gitlab\./);

  const racine = repoVierge();
  try {
    const sorties = [];
    const code = await executer(["init", "--forge", "gitea"], {
      racine, env: {}, ecrire: (texte) => sorties.push(texte), alerter: (texte) => sorties.push(texte),
    });
    assert.equal(code, 2);
    assert.equal(existsSync(join(racine, "ucm.config.json")), false);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("la forge vient de l'option, puis du remote, puis de .gitlab-ci.yml, puis GitHub", () => {
  const racine = repoVierge();
  try {
    assert.deepEqual(
      forgeDuRepository(racine, { git: () => "git@gitlab.com:groupe/projet.git" }),
      { nom: "gitlab", signal: "l'hôte du remote origin, gitlab.com" },
    );
    assert.deepEqual(
      forgeDuRepository(racine, { git: () => "https://github.com/acme/ds.git" }),
      { nom: "github", signal: "l'hôte du remote origin, github.com" },
    );
    assert.equal(forgeDuRepository(racine, { git: () => "ssh://git@gitlab.example.com:2222/a/b.git" }).nom, "gitlab");
    assert.deepEqual(forgeDuRepository(racine, { git: sansRemote }), { nom: "github", signal: "aucun signal, GitHub par défaut" });

    writeFileSync(join(racine, ".gitlab-ci.yml"), "build:\n  script: [echo]\n");
    assert.deepEqual(forgeDuRepository(racine, { git: sansRemote }), { nom: "gitlab", signal: "la présence de .gitlab-ci.yml" });
    // Le remote l'emporte sur le fichier, et l'option sur les deux.
    assert.equal(forgeDuRepository(racine, { git: () => "https://github.com/a/b" }).nom, "github");
    assert.deepEqual(
      forgeDuRepository(racine, { forge: "github", git: () => "git@gitlab.com:a/b.git" }),
      { nom: "github", signal: "l'option --forge" },
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("pour GitLab, init écrit le job inclus et .gitlab-ci.yml, jamais de workflow GitHub", () => {
  const racine = repoVierge();
  try {
    const resultat = init(racine, { sansAgents: true, git: () => "git@gitlab.com:g/p.git" });
    assert.equal(existsSync(join(racine, ".github")), false);
    assert.ok(resultat.ecrits.includes(".gitlab/ucm.gitlab-ci.yml"));
    assert.deepEqual(parse(readFileSync(join(racine, ".gitlab-ci.yml"), "utf8")), {
      include: [{ local: ".gitlab/ucm.gitlab-ci.yml" }],
    });

    const job = parse(readFileSync(join(racine, ".gitlab/ucm.gitlab-ci.yml"), "utf8"));
    // Aucune clé globale : ni workflow, ni image, ni variables, ni stages.
    assert.deepEqual(Object.keys(job), ["ucm", "ucm-rapport"]);
    assert.equal(job.ucm.image, "node:22");
    assert.equal(job.ucm.variables.GIT_DEPTH, "0");
    assert.equal(job.ucm.stage, undefined);
    assert.deepEqual(job.ucm.rules, [
      { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
      { if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" },
    ]);
    const script = job.ucm.script.join("\n");
    assert.match(script, /if \[ -f package-lock\.json \]; then npm ci; fi/);
    assert.match(script, new RegExp(`@ucm-kit/cli@${resultat.version} check --report ci-report\\.md --base "\\$CI_MERGE_REQUEST_DIFF_BASE_SHA"`));
    assert.deepEqual(job.ucm.artifacts, { when: "always", paths: ["ci-report.md"] });

    const note = job["ucm-rapport"];
    const etapes = note.script.join("\n");
    assert.ok(etapes.indexOf("if [ ! -f ci-report.md ]") < etapes.indexOf("rapport-gitlab"), "le filet précède la note");
    assert.match(etapes, /--fichier "\$CI_PROJECT_DIR\/ci-report\.md" --api "\$CI_API_V4_URL"/);
    assert.deepEqual(note.rules, [{ if: '$CI_PIPELINE_SOURCE == "merge_request_event"', when: "always" }]);
    assert.deepEqual(note.needs, [{ job: "ucm", artifacts: true }]);

    const compteRendu = rendreInit(resultat);
    assert.match(compteRendu, /CI écrite pour GitLab, d'après l'hôte du remote origin, gitlab\.com/);
    assert.match(compteRendu, /UCM_GITLAB_TOKEN`, masquée et non protégée/);
    assert.match(compteRendu, /au rôle Reporter/);
    assert.match(compteRendu, /Pipelines must succeed/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Une variable non protégée entre dans tous les jobs du pipeline, et `npm ci`
 * exécute les scripts d'installation des dépendances. Le job qui installe ne
 * garde pas le jeton, et le job qui publie n'exécute rien du repository. Une
 * note refusée par GitLab ne rend pas rouge un contrôle vert.
 */
test("pour GitLab, le jeton de la note ne côtoie jamais le code du repository", () => {
  const racine = repoVierge();
  try {
    init(racine, { sansAgents: true, git: () => "git@gitlab.com:g/p.git" });
    const job = parse(readFileSync(join(racine, ".gitlab/ucm.gitlab-ci.yml"), "utf8"));

    assert.equal(job.ucm.script[0], "unset UCM_GITLAB_TOKEN", "le jeton sort de l'environnement avant npm ci");
    assert.equal(job.ucm.after_script, undefined, "after_script recevrait de nouveau le jeton");
    assert.doesNotMatch(job.ucm.script.slice(1).join("\n"), /UCM_GITLAB_TOKEN|rapport-gitlab/);

    const note = job["ucm-rapport"];
    assert.equal(note.allow_failure, true, "un jeton refusé bloquerait une fusion dont les contrats sont verts");
    assert.equal(note.variables.GIT_STRATEGY, "none");
    assert.equal(note.variables.NPM_CONFIG_IGNORE_SCRIPTS, "true");
    const etapes = note.script.join("\n");
    assert.doesNotMatch(etapes, /npm ci| check /);
    assert.ok(etapes.indexOf('cd "$(mktemp -d)"') !== -1, "npx part d'un dossier vide");
    assert.ok(etapes.indexOf('cd "$(mktemp -d)"') < etapes.indexOf("rapport-gitlab"), "npx part d'un dossier vide");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("pour GitHub, init n'écrit que le workflow GitHub", () => {
  const racine = repoVierge();
  try {
    const resultat = init(racine, { sansAgents: true, git: sansRemote });
    assert.ok(resultat.ecrits.includes(".github/workflows/ucm.yml"));
    assert.equal(existsSync(join(racine, ".gitlab")), false);
    assert.equal(existsSync(join(racine, ".gitlab-ci.yml")), false);
    assert.doesNotMatch(rendreInit(resultat), /UCM_GITLAB_TOKEN|Pipelines must succeed/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un .gitlab-ci.yml existant reçoit le rappel d'include, et un stages sans test est signalé", () => {
  const racine = repoVierge();
  try {
    writeFileSync(join(racine, ".gitlab-ci.yml"), "stages:\n  - build\n  - deploy\n\nbuild:\n  stage: build\n  script: [echo]\n");
    const resultat = init(racine, { sansAgents: true, git: sansRemote });
    assert.equal(readFileSync(join(racine, ".gitlab-ci.yml"), "utf8").includes("ucm"), false, "le fichier existant est intact");
    const compteRendu = rendreInit(resultat);
    assert.match(compteRendu, /\.gitlab-ci\.yml` existait déjà : ajoutez `- local: \.gitlab\/ucm\.gitlab-ci\.yml`/);
    assert.match(compteRendu, /Ajoutez `test` à `stages:`/);

    writeFileSync(join(racine, ".gitlab-ci.yml"), "stages: [build, test]\ninclude:\n  - local: .gitlab/ucm.gitlab-ci.yml\n");
    const relance = rendreInit(init(racine, { sansAgents: true, git: sansRemote }));
    assert.doesNotMatch(relance, /ajoutez `- local/);
    assert.doesNotMatch(relance, /ajoutez `test`/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * `workflow:rules` décide des pipelines de tout le projet. Une liste qui
 * n'admet pas `merge_request_event` ne crée aucun pipeline de merge request, et
 * le job ucm ne tourne sur aucun export, sans erreur dans GitLab.
 */
test("un workflow:rules existant sans merge_request_event est signalé, et lui seul", () => {
  const racine = repoVierge();
  const compteRendu = (ci) => {
    writeFileSync(join(racine, ".gitlab-ci.yml"), ci);
    return rendreInit(init(racine, { sansAgents: true, git: sansRemote }));
  };
  try {
    const signal = /ajoutez `- if: \$CI_PIPELINE_SOURCE == "merge_request_event"` en tête de `workflow:rules`/i;
    assert.match(compteRendu("workflow:\n  rules:\n    - if: $CI_COMMIT_BRANCH\n\nbuild:\n  script: [echo]\n"), signal);
    assert.match(compteRendu("# CI\nworkflow:\n  name: app\n\n  rules:\n    # branches\n    - if: $CI_COMMIT_TAG\n"), signal);
    assert.doesNotMatch(
      compteRendu("workflow:\n  rules:\n    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'\n    - if: $CI_COMMIT_BRANCH\n"),
      signal,
    );
    assert.doesNotMatch(compteRendu("workflow:\n  name: app\nbuild:\n  rules:\n    - if: $CI_COMMIT_BRANCH\n  script: [echo]\n"), signal);
    assert.doesNotMatch(compteRendu("build:\n  script: [echo]\n"), signal);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Un `default:` du projet s'applique aux jobs inclus. Son `before_script`
 * tournerait avant `unset UCM_GITLAB_TOKEN`, donc avec le jeton, et dans
 * `ucm-rapport`, qui n'a pas de clone.
 */
test("les jobs UCM n'héritent pas du default: du projet, mais gardent ses variables", () => {
  const racine = repoVierge();
  try {
    init(racine, { sansAgents: true, git: () => "git@gitlab.com:g/p.git" });
    const job = parse(readFileSync(join(racine, ".gitlab/ucm.gitlab-ci.yml"), "utf8"));
    for (const nom of ["ucm", "ucm-rapport"]) {
      assert.deepEqual(job[nom].inherit, { default: false }, nom);
    }
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Une API GitLab simulée : un compte, des notes paginées, et le relevé de
 * chaque appel.
 */
function gitlabSimule({ compte = 7, notes = [], statuts = {}, parPage = 100 } = {}) {
  const appels = [];
  const fetch = async (url, init = {}) => {
    const methode = init.method ?? "GET";
    appels.push({ url, methode, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const cle = `${methode} ${new URL(url).pathname}`;
    const statut = Object.entries(statuts).find(([motif]) => cle.includes(motif))?.[1];
    if (statut) return new Response(JSON.stringify({ message: String(statut) }), { status: statut });
    if (url.endsWith("/user")) return Response.json({ id: compte, username: "bot" });
    if (methode === "GET") {
      const page = Number(new URL(url).searchParams.get("page"));
      const tranche = notes.slice((page - 1) * parPage, page * parPage);
      const suivante = page * parPage < notes.length ? String(page + 1) : "";
      return Response.json(tranche, { headers: { "x-next-page": suivante } });
    }
    return Response.json({ id: 999 }, { status: methode === "POST" ? 201 : 200 });
  };
  return { fetch, appels };
}

function avecRapport(travail) {
  const racine = repoVierge();
  writeFileSync(join(racine, "ci-report.md"), "## ✅ Tout est conforme\n");
  return Promise.resolve(travail(racine)).finally(() => rmSync(racine, { recursive: true, force: true }));
}

const ARGUMENTS = ["--projet", "42", "--merge-request", "3", "--fichier", "ci-report.md"];
const JETON = "glpat-secret-de-test";

async function lancer(racine, api, { env = { UCM_GITLAB_TOKEN: JETON }, arguments_ = ARGUMENTS } = {}) {
  const sorties = [];
  const code = await rapportGitlab(arguments_, {
    racine, env, fetch: api.fetch, ecrire: (texte) => sorties.push(texte), alerter: (texte) => sorties.push(texte),
  });
  return { code, sortie: sorties.join("\n") };
}

test("sans note du compte, le rapport est créé avec son marqueur", () => avecRapport(async (racine) => {
  const api = gitlabSimule();
  const { code } = await lancer(racine, api);
  assert.equal(code, 0);
  const creation = api.appels.find(({ methode }) => methode === "POST");
  assert.equal(creation.url, "https://gitlab.com/api/v4/projects/42/merge_requests/3/notes");
  assert.equal(creation.body.body, `${MARQUEUR_RAPPORT}\n## ✅ Tout est conforme\n`);
  assert.equal(creation.headers["PRIVATE-TOKEN"], JETON);
}));

test("la note du compte au marqueur est remplacée, celle d'un autre compte ignorée", () => avecRapport(async (racine) => {
  const api = gitlabSimule({
    notes: [
      { id: 1, system: false, author: { id: 99 }, body: `${MARQUEUR_RAPPORT}\nrecopié par un humain` },
      { id: 2, system: true, author: { id: 7 }, body: `${MARQUEUR_RAPPORT}` },
      { id: 3, system: false, author: { id: 7 }, body: `${MARQUEUR_RAPPORT}\nancien rapport` },
    ],
  });
  const { code } = await lancer(racine, api);
  assert.equal(code, 0);
  const ecritures = api.appels.filter(({ methode }) => methode !== "GET");
  assert.deepEqual(ecritures.map(({ methode, url }) => `${methode} ${url}`), [
    "PUT https://gitlab.com/api/v4/projects/42/merge_requests/3/notes/3",
  ]);
}));

test("une note au marqueur est trouvée au-delà de cent notes", () => avecRapport(async (racine) => {
  const notes = Array.from({ length: 150 }, (_, rang) => ({ id: rang + 1, system: false, author: { id: 5 }, body: "discussion" }));
  notes.push({ id: 151, system: false, author: { id: 7 }, body: `${MARQUEUR_RAPPORT}\nancien` });
  const api = gitlabSimule({ notes });
  await lancer(racine, api);
  const pages = api.appels.filter(({ url }) => url.includes("/notes?")).map(({ url }) => new URL(url).searchParams.get("page"));
  assert.deepEqual(pages, ["1", "2"]);
  assert.ok(api.appels.some(({ methode, url }) => methode === "PUT" && url.endsWith("/notes/151")));
  assert.equal(api.appels.some(({ methode }) => methode === "POST"), false);
}));

test("sans jeton, la commande nomme la variable et sort en 0 sans appel", () => avecRapport(async (racine) => {
  const api = gitlabSimule();
  const { code, sortie } = await lancer(racine, api, { env: {} });
  assert.equal(code, 0);
  assert.match(sortie, /UCM_GITLAB_TOKEN est absente/);
  assert.equal(api.appels.length, 0);
}));

for (const [statut, geste] of [[401, /refuse le jeton de UCM_GITLAB_TOKEN \(401\)/], [403, /n'a pas le droit de .* \(403\).*scope api/]]) {
  test(`un ${statut} sort en 1 avec son geste, sans jamais afficher le jeton`, () => avecRapport(async (racine) => {
    const api = gitlabSimule({ statuts: { "POST /api/v4/projects/42/merge_requests/3/notes": statut } });
    const { code, sortie } = await lancer(racine, api);
    assert.equal(code, 1);
    assert.match(sortie, geste);
    assert.equal(sortie.includes(JETON), false);
  }));
}

test("--api est respecté, et le projet s'encode en un segment", () => avecRapport(async (racine) => {
  const api = gitlabSimule();
  await lancer(racine, api, {
    arguments_: ["--projet", "groupe/projet", "--merge-request", "3", "--fichier", "ci-report.md", "--api", "https://gitlab.example.com/api/v4/"],
  });
  assert.ok(api.appels.every(({ url }) => url.startsWith("https://gitlab.example.com/api/v4/")));
  assert.ok(api.appels.some(({ url }) => url.includes("/projects/groupe%2Fprojet/merge_requests/3/notes")));
}));

test("une invocation incomplète sort en 2, et le jeton n'apparaît dans aucune sortie", () => avecRapport(async (racine) => {
  const api = gitlabSimule();
  const { code, sortie } = await lancer(racine, api, { arguments_: ["--projet", "42"] });
  assert.equal(code, 2);
  assert.match(sortie, /--merge-request est obligatoire/);
  assert.equal(sortie.includes(JETON), false);
  const rapportIllisible = await lancer(racine, api, { arguments_: ["--projet", "42", "--merge-request", "3", "--fichier", "absent.md"] });
  assert.equal(rapportIllisible.code, 1);
}));

test("l'aiguillage mène à rapport-gitlab", () => avecRapport(async (racine) => {
  const api = gitlabSimule();
  const sorties = [];
  const code = await executer(["rapport-gitlab", ...ARGUMENTS], {
    racine, env: { UCM_GITLAB_TOKEN: JETON }, fetch: api.fetch, ecrire: (texte) => sorties.push(texte), alerter: (texte) => sorties.push(texte),
  });
  assert.equal(code, 0);
  assert.match(sorties.join("\n"), /Rapport publié en note de la merge request !3/);
}));
