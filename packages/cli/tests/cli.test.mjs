/**
 * La ligne de commande, éprouvée sur de vrais dossiers.
 *
 * Ces tests écrivent dans un dossier temporaire plutôt que de simuler le
 * système de fichiers : `ucm init` a exactement une faute irréversible à sa
 * portée — écraser un fichier que quelqu'un a adapté —, et un faux système de
 * fichiers prouverait qu'on a bien écrit le simulacre, pas qu'on a épargné le
 * fichier.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { iconesDuRepository } from "../src/icons.mjs";
import { init, rendreInit } from "../src/init.mjs";
import { executer } from "../src/ucm.mjs";

/** Un repository jouet, vide, dans le dossier temporaire du système. */
function repoVierge() {
  return mkdtempSync(join(tmpdir(), "ucm-cli-"));
}

/** Écrit un contrat minimal portant les icônes données. */
function contratAvecIcones(racine, nom, icones) {
  const dossier = join(racine, "components", nom);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(
    join(dossier, `${nom}.contract.json`),
    JSON.stringify({ name: nom, icons: icones }),
    "utf8",
  );
}

test("init installe ce qui manque dans un repository vierge", () => {
  const racine = repoVierge();
  try {
    const { ecrits, conserves } = init(racine);

    assert.deepEqual(conserves, []);
    assert.deepEqual(ecrits.sort(), [
      ".gitattributes",
      ".github/workflows/ucm.yml",
      ".gitignore",
      ".vscode/settings.json",
      "ucm.config.json",
    ]);
    for (const chemin of ecrits) {
      assert.ok(readFileSync(join(racine, chemin), "utf8").length > 0, `${chemin} est vide`);
    }
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * La seule faute irréversible que cette commande puisse commettre, et elle la
 * commettrait au moment où l'utilisateur a le moins de raisons de s'en méfier :
 * un `init` relancé sur un repo déjà installé.
 */
test("init n'écrase jamais un fichier existant, et le dit", () => {
  const racine = repoVierge();
  try {
    writeFileSync(join(racine, "ucm.config.json"), '{"components":"a-moi"}', "utf8");
    const resultat = init(racine);

    assert.deepEqual(resultat.conserves, ["ucm.config.json"]);
    assert.equal(
      readFileSync(join(racine, "ucm.config.json"), "utf8"),
      '{"components":"a-moi"}',
      "le fichier de l'utilisateur doit être intact",
    );
    assert.match(rendreInit(resultat), /ucm\.config\.json existait déjà/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("init relancé sur un repository installé ne fait rien et le dit", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const second = init(racine);

    assert.deepEqual(second.ecrits, []);
    assert.match(rendreInit(second), /Rien à faire/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * D7 : le pin est exact, sans plage. Ce test regarde la configuration écrite —
 * elle ne doit porter AUCUN numéro de version, pas même celui du CLI. La
 * fenêtre de lecture appartient au paquet installé, et un chiffre écrit dans le
 * repo créerait la seconde autorité que `configuration.mjs` refuse.
 */
test("la configuration écrite ne porte aucun numéro de version", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const ecrite = JSON.parse(readFileSync(join(racine, "ucm.config.json"), "utf8"));

    assert.deepEqual(Object.keys(ecrite).sort(), ["components", "implementation", "tokens"]);
    assert.doesNotMatch(JSON.stringify(ecrite), /\d+\.\d+/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le workflow que T3.2 attendait, écrit dès que `ucm check` existe (T3.3).
 *
 * Trois propriétés le rendent utilisable dans un repository quelconque, et
 * chacune répond à une contrainte écrite ailleurs :
 *
 * - le paquet est épinglé EXACTEMENT (D7) — une plage laisserait npm choisir
 *   une version que personne n'a essayée, et la CI d'un designer basculerait
 *   sans qu'un fichier du repo ait bougé ;
 * - `npx --yes` et rien d'autre (T3.4) — pas de `npm ci`, donc pas de
 *   `package.json` exigé d'un repo qui n'est pas un projet Node ;
 * - le sha de base voyage par l'environnement, jamais par interpolation dans
 *   le shell.
 */
test("init écrit un workflow qui épingle le paquet et n'exige pas de package.json", () => {
  const racine = repoVierge();
  try {
    const resultat = init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.ok(resultat.ecrits.includes(".github/workflows/ucm.yml"));
    assert.match(workflow, new RegExp(`npx --yes @ucm-kit/cli@${resultat.version}\\b`));
    assert.doesNotMatch(workflow, /\^|~/, "aucune plage de version");
    assert.doesNotMatch(workflow, /npm ci|npm install/, "aucun package.json exigé");
    assert.match(workflow, /--report ci-report\.md/);
    assert.match(workflow, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    assert.match(workflow, /--base "\$BASE_SHA"/);
    assert.match(workflow, /fetch-depth: 0/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le filet portable de T5.4 : une pull request refusée sans un mot laisse le
 * designer sans recours. L'autre filet du repository de démonstration — « la
 * construction a échoué » — décrit SA chaîne de construction et n'a aucun sens
 * dans un repo qui ne compile pas de TypeScript.
 */
test("le workflow publie un diagnostic même quand le rapport manque", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.match(workflow, /hashFiles\('ci-report\.md'\) == ''/);
    assert.match(workflow, /La vérification n'a pas pu rendre son diagnostic/);
    assert.match(workflow, /gh pr comment .* --edit-last/);
    assert.match(workflow, /if: always\(\)/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le rapport se régénère à chaque exécution : commité, il ferait lire un
 * verdict périmé. Un `.gitignore` déjà présent n'est pas réécrit — la seule
 * faute irréversible de cette commande —, et la ligne manquante est alors dite.
 */
test("le rapport est ignoré, et un .gitignore existant reçoit la consigne au lieu d'être écrasé", () => {
  const vierge = repoVierge();
  try {
    init(vierge);
    assert.match(readFileSync(join(vierge, ".gitignore"), "utf8"), /^ci-report\.md$/m);
  } finally {
    rmSync(vierge, { recursive: true, force: true });
  }

  const habite = repoVierge();
  try {
    writeFileSync(join(habite, ".gitignore"), "node_modules/\n", "utf8");
    const resultat = init(habite);

    assert.equal(readFileSync(join(habite, ".gitignore"), "utf8"), "node_modules/\n");
    assert.match(rendreInit(resultat), /ajoutez-y `ci-report\.md`/);
  } finally {
    rmSync(habite, { recursive: true, force: true });
  }
});

test("l'association de schéma pointe le paquet installé, jamais une copie", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const reglages = JSON.parse(readFileSync(join(racine, ".vscode/settings.json"), "utf8"));

    // Une copie locale vieillirait sans que rien ne le dise, et l'éditeur
    // validerait alors contre un format que le repository ne lit plus.
    assert.match(reglages["json.schemas"][0].url, /^\.\/node_modules\/@ucm-kit\/core\//);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("icons liste les noms Figma réclamés, avec les contrats qui les citent", () => {
  const racine = repoVierge();
  try {
    contratAvecIcones(racine, "Button", {
      gauche: { figmaName: "arrow-left-long" },
      droite: { figmaName: "arrow-right-long" },
    });
    contratAvecIcones(racine, "Alert", { marque: { figmaName: "arrow-left-long" } });

    const icones = iconesDuRepository(racine, "components");

    assert.deepEqual(icones.map((icone) => icone.figmaName), [
      "arrow-left-long",
      "arrow-right-long",
    ]);
    // Le nom seul ne suffit pas à agir : pour couvrir une icône, ou pour en
    // parler à un designer, il faut savoir où elle est demandée.
    assert.deepEqual(icones[0].contrats, [
      "components/Alert/Alert.contract.json",
      "components/Button/Button.contract.json",
    ]);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un contrat illisible n'est pas le problème de `icons`", () => {
  const racine = repoVierge();
  try {
    const dossier = join(racine, "components", "Casse");
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, "Casse.contract.json"), "{ pas du json", "utf8");
    contratAvecIcones(racine, "Button", { g: { figmaName: "chess" } });

    // Le lister ici produirait deux diagnostics du même défaut, dont un dans
    // une commande qui n'a pas mandat pour le rendre.
    assert.deepEqual(
      iconesDuRepository(racine, "components").map((icone) => icone.figmaName),
      ["chess"],
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un repository sans icône le dit, au lieu de rendre une liste vide", () => {
  const racine = repoVierge();
  try {
    contratAvecIcones(racine, "Button", {});
    const sortie = [];
    assert.equal(executer(["icons"], { racine, ecrire: (t) => sortie.push(t) }), 0);
    assert.match(sortie.join("\n"), /Aucune icône/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Une configuration refusée ne doit pas se dégrader en liste vide : « aucune
 * icône » et « je n'ai rien regardé » se lisent pareil et ne veulent pas dire
 * la même chose.
 */
test("une configuration refusée arrête `icons` au lieu de le faire mentir", () => {
  const racine = repoVierge();
  try {
    writeFileSync(join(racine, "ucm.config.json"), '{"components": ""}', "utf8");
    const sortie = [];
    assert.equal(executer(["icons"], { racine, ecrire: (t) => sortie.push(t) }), 2);
    assert.match(sortie.join("\n"), /components/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une commande inconnue sort en 2, et 1 reste réservé aux contrôles", () => {
  const sortie = [];
  assert.equal(executer(["verifie"], { racine: tmpdir(), ecrire: (t) => sortie.push(t) }), 2);
  assert.match(sortie.join("\n"), /Commande inconnue : verifie/);
});

/**
 * L'aide annonce les trois commandes et les trois codes de sortie — c'est le
 * seul endroit où un workflow apprend que 1 et 2 ne veulent pas dire la même
 * chose, et les confondre ferait lire « votre export est en défaut » à
 * quelqu'un dont le seul tort est une faute de frappe.
 */
test("l'aide annonce les commandes réelles et le sens des codes de sortie", () => {
  const sortie = [];
  assert.equal(executer([], { racine: tmpdir(), ecrire: (t) => sortie.push(t) }), 0);
  const aide = sortie.join("\n");
  assert.match(aide, /ucm init/);
  assert.match(aide, /ucm check/);
  assert.match(aide, /ucm icons/);
  assert.match(aide, /--base/);
  assert.match(aide, /--report/);
  assert.match(aide, /0 tout est passé, 1 des contrôles ont échoué, 2/);
});
