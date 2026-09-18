/**
 * La ligne de commande, éprouvée sur de vrais dossiers.
 *
 * Ces tests écrivent dans un dossier temporaire plutôt que de simuler le
 * système de fichiers : `ucm init` a exactement une faute irréversible à sa
 * portée (écraser un fichier que quelqu'un a adapté), et un faux système de
 * fichiers prouverait qu'on a bien écrit le simulacre, pas qu'on a épargné le
 * fichier.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parse as parseYaml } from "yaml";

import { iconesDuRepository } from "../src/icons.mjs";
import { chargerAdaptateur } from "../src/adaptateur.mjs";
import { catalogueDesAides } from "../src/aides.mjs";
import { lireConventions } from "../src/conventions.mjs";
import { init, lireArgumentsInit, rendreInit } from "../src/init.mjs";
import { executer } from "../src/ucm.mjs";

/** Un repository jouet, vide, dans le dossier temporaire du système. */
function repoVierge() {
  return mkdtempSync(join(tmpdir(), "ucm-cli-"));
}

for (const commande of [["check"], ["icons"], ["tokens", "css", "--out", "tokens.css"]]) {
  test(`${commande.join(" ")} rapporte un dossier de contrats illisible sans accuser l'adaptateur`, async () => {
    const racine = repoVierge();
    try {
      writeFileSync(join(racine, "ucm.config.json"), JSON.stringify({ components: "fichier" }));
      writeFileSync(join(racine, "fichier"), "pas un dossier");
      const lignes = [];
      const code = await executer(commande, {
        racine, env: {}, ecrire: (texte) => lignes.push(texte), alerter: (texte) => lignes.push(texte),
      });
      assert.equal(code, 2);
      assert.match(lignes.join("\n"), /fichier/);
      assert.doesNotMatch(lignes.join("\n"), /adaptateur|tsconfig/);
    } finally {
      rmSync(racine, { recursive: true, force: true });
    }
  });
}

test("check distingue un adaptateur installé invalide d'une panne du contrôle", async () => {
  const racine = repoVierge();
  try {
    const dossier = join(racine, "node_modules", "@ucm-kit", "adapter-typescript");
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, "package.json"), JSON.stringify({ main: "index.cjs" }));
    writeFileSync(join(dossier, "index.cjs"), "module.exports = {};");
    const lignes = [];
    assert.equal(await executer(["check"], {
      racine, env: {}, alerter: (texte) => lignes.push(texte),
    }), 2);
    assert.match(lignes.join("\n"), /adaptateur.*installé.*chargé/);
    assert.match(lignes.join("\n"), /ne publie pas un adaptateur UCM valide/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("init rapporte aussi une panne asynchrone d'écriture sans rejeter sa promesse", async () => {
  const racine = repoVierge();
  try {
    writeFileSync(join(racine, ".github"), "pas un dossier");
    const lignes = [];
    assert.equal(await executer(["init"], {
      racine, alerter: (texte) => lignes.push(texte), ecrire: () => {},
    }), 2);
    assert.match(lignes.join("\n"), /\.github/);
    assert.doesNotMatch(lignes.join("\n"), /adaptateur/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

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
      ".agents/skills/ucm-implementer/SKILL.md",
      ".claude/skills/ucm-implementer/SKILL.md",
      ".gitattributes",
      ".github/workflows/ucm.yml",
      ".gitignore",
      ".ucm/conventions.md",
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
 * Le pin est exact, sans plage. Ce test regarde la configuration écrite,
 * elle ne doit porter aucun numéro de version, pas même celui du CLI. La
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
 * Le workflow, écrit dès que `ucm check` existe.
 *
 * Trois propriétés le rendent utilisable dans un repository quelconque, et
 * chacune répond à une contrainte écrite ailleurs :
 *
 * - le paquet est épinglé exactement, une plage laisserait npm choisir
 *   une version que personne n'a essayée, et la CI d'un designer basculerait
 *   sans qu'un fichier du repo ait bougé ;
 * - `npx --yes` reste suffisant sans lockfile ; un repo Node installe
 *   sa stack pour rendre son adaptateur visible ;
 * - le sha de base voyage par l'environnement, jamais par interpolation dans
 *   le shell.
 */
test("init écrit un workflow portable qui installe seulement une stack déclarée", () => {
  const racine = repoVierge();
  try {
    const resultat = init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.ok(resultat.ecrits.includes(".github/workflows/ucm.yml"));
    assert.match(workflow, new RegExp(`npx --yes @ucm-kit/cli@${resultat.version}\\b`));
    assert.doesNotMatch(workflow, /\^|~/, "aucune plage de version");
    assert.match(workflow, /if: hashFiles\('package-lock\.json'\) != ''/);
    assert.match(workflow, /run: npm ci/);
    assert.match(workflow, /--report ci-report\.md/);
    assert.match(workflow, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    assert.match(workflow, /--base "\$BASE_SHA"/);
    assert.match(workflow, /fetch-depth: 0/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le filet portable : une pull request refusée sans un mot laisse le
 * designer sans recours. L'autre filet du repository de démonstration (« la
 * construction a échoué ») décrit sa chaîne de construction et n'a aucun sens
 * dans un repo qui ne compile pas de TypeScript.
 */
test("le workflow publie un diagnostic même quand le rapport manque", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.match(workflow, /hashFiles\('ci-report\.md'\) == ''/);
    assert.match(workflow, /La vérification n'a pas pu rendre son diagnostic/);
    assert.match(workflow, /issues\/\$NUMERO\/comments" --paginate/);
    assert.match(workflow, /if: always\(\)/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le filet, la transmission et la publication ne protègent le designer que
 * s'ils se relaient : le filet écrit le rapport quand il manque, la
 * transmission l'emporte quel que soit le verdict, la publication lit ce
 * qu'elle a reçu.
 *
 * Trois façons de perdre le message sans qu'une ligne paraisse fausse : le
 * filet cesse d'être conditionné par l'absence et écrase un vrai rapport ; la
 * transmission ou la réception visent un autre nom ; l'évènement n'est plus
 * borné, et un `push` sur `main` échoue sur un fil qui n'existe pas.
 */
test("le filet, la transmission et la publication se relaient sur le même rapport, et seulement sur une pull request", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");
    const { jobs } = parseYaml(workflow);
    const ecriture = jobs.contrats.steps.find((pas) => pas.name === "Garantir un diagnostic même sans rapport");
    const transmission = jobs.contrats.steps.find((pas) => pas.name === "Transmettre le rapport");
    const reception = jobs.commentaire.steps.find((pas) => pas.uses?.startsWith("actions/download-artifact@"));
    const publication = jobs.commentaire.steps.find((pas) => pas.name === "Publier le diagnostic sur la pull request");

    assert.match(ecriture.if, /^always\(\) && github\.event_name == 'pull_request' && hashFiles\('ci-report\.md'\) == ''$/);
    assert.equal(transmission.if, "always() && github.event_name == 'pull_request'", "le rapport part même quand le contrôle échoue");
    assert.equal(jobs.commentaire.if, "${{ !cancelled() && github.event_name == 'pull_request' }}");
    assert.equal(jobs.commentaire.needs, "contrats");

    assert.match(ecriture.run, /cat > ci-report\.md <<EOF/, "le filet écrit le fichier transmis");
    assert.match(ecriture.run, /\$RUN_URL/, "le message minimal nomme l'endroit où regarder");
    // Le filet ne passe pas par `ucm check`, donc aucun marqueur n'a été écrit
    // pour lui. Sans celui-ci, le commentaire qu'il crée reste introuvable, et
    // l'exécution suivante en empile un second au lieu de le remplacer.
    assert.match(ecriture.run, /<!-- ucm-rapport -->/, "le filet marque le rapport qu'il écrit");
    assert.equal(transmission.with.path, "ci-report.md");
    assert.equal(reception.with.name, transmission.with.name, "la publication reçoit l'artefact transmis");
    assert.match(publication.run, /--body-file ci-report\.md/, "la publication lit le fichier transmis");
    assert.match(publication.run, /-f body="\$\(cat ci-report\.md\)"/, "le remplacement lit le même fichier");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * `npm ci` exécute les scripts d'installation des dépendances : un paquet
 * compromis lirait le jeton du job qui l'installe. Ce job ne porte donc aucun
 * droit d'écriture, et le seul job qui écrit sur la pull request n'exécute rien
 * du repository.
 */
test("le job qui exécute le code du repository n'écrit nulle part", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const { permissions, jobs } = parseYaml(readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8"));

    assert.deepEqual(permissions, { contents: "read" });
    assert.equal(jobs.contrats.permissions, undefined, "contrats hérite de la lecture seule");
    assert.deepEqual(jobs.commentaire.permissions, { "pull-requests": "write" });

    const commandes = jobs.commentaire.steps.map((pas) => `${pas.uses ?? ""} ${pas.run ?? ""}`).join("\n");
    assert.doesNotMatch(commandes, /actions\/checkout|actions\/setup-node|npm |npx /);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le jeton et le numéro passent par l'environnement : interpolés dans le shell,
 * ils feraient exécuter au runner ce qu'un titre de pull request contient. Sans
 * checkout, `gh` ne connaît le repository que par `-R`. Et la recherche du
 * commentaire précédent échoue quand aucun n'existe encore : sans son repli, le
 * tout premier diagnostic d'une pull request serait perdu, précisément celui
 * que le designer attend.
 *
 * Ce repli a une seule exception, et elle se lit dans le fichier : un rapport
 * qui porte le marqueur du sans-objet ne crée rien. Une demande de fusion
 * étrangère à UCM reste vierge ; une demande qui portait un refus depuis
 * corrigé voit son verdict remplacé, jamais laissé périmé.
 */
test("le diagnostic est publié avec le droit de l'être, et crée le fil qu'il ne trouve pas", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.match(workflow, /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
    assert.match(workflow, /NUMERO: \$\{\{ github\.event\.number \}\}/);
    assert.doesNotMatch(
      workflow,
      /gh pr comment "\$\{\{/,
      "le numéro voyage par l'environnement, jamais par interpolation dans le shell",
    );
    assert.match(
      workflow,
      /if \[ -n "\$NOTE" \]; then[\s\S]*elif[\s\S]*gh pr comment "\$NUMERO" -R "\$GITHUB_REPOSITORY" --body-file ci-report\.md/,
      "sans repli, le premier commentaire d'une pull request n'est jamais créé",
    );
    assert.match(
      workflow,
      /elif ! head -n 2 ci-report\.md \| grep -qF "<!-- ucm-sans-objet -->"; then/,
      "un rapport qui ne demande aucun geste ne crée pas de commentaire",
    );
    assert.doesNotMatch(
      workflow,
      /printf "<!-- ucm-rapport -->/,
      "le marqueur est écrit par `ucm check`, qui seul peut le compter dans la borne du commentaire",
    );
    // `GITHUB_TOKEN` est un jeton d'intégration : `GET /user` lui répond 403,
    // et `gh` écrit quand même le corps de l'erreur sur la sortie standard. Un
    // repli placé dans la substitution capturait les deux textes : le jq ne se
    // compilait plus, aucun commentaire n'était retrouvé, et un verdict périmé
    // restait affiché sous une étape verte.
    assert.match(
      workflow,
      /if ! COMPTE="\$\(gh api user --jq \.login 2>\/dev\/null\)"; then\s+COMPTE='github-actions\[bot\]'/,
      "le compte d'un jeton d'intégration se replie sur github-actions[bot], hors de la substitution",
    );
    // Sans `pipefail`, `| tail -n 1` rend le code de `tail` : une recherche du
    // commentaire en échec passait pour « aucun commentaire », en silence.
    assert.match(workflow, /run: \|\n\s+set -o pipefail\n/, "une recherche en échec arrête l'étape");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le rapport se régénère à chaque exécution : commité, il ferait lire un
 * verdict périmé. Un `.gitignore` déjà présent n'est pas réécrit (ce serait la
 * seule faute irréversible de cette commande), et la ligne manquante est alors
 * dite.
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

/**
 * Trois des cinq fichiers se partagent avec ce qu'un repository met déjà dedans,
 * et ce sont ceux qu'un repository réel porte déjà. Les conserver sans un mot
 * laisserait survenir en silence la panne que chacun existe pour empêcher : un
 * diff illisible à chaque export depuis Windows, un éditeur qui ne valide plus
 * aucun contrat, un rapport périmé commité. La mention « laissé tel quel » se
 * lit comme « rien à faire », ce qui est exactement l'inverse.
 */
test("chaque fichier partagé conservé reçoit la ligne à ajouter à la main", () => {
  const habite = repoVierge();
  try {
    mkdirSync(join(habite, ".vscode"), { recursive: true });
    const avant = {
      ".gitattributes": "* text=auto\n",
      ".gitignore": "node_modules/\n",
      ".vscode/settings.json": '{ "editor.formatOnSave": true }\n',
    };
    for (const [chemin, contenu] of Object.entries(avant)) {
      writeFileSync(join(habite, chemin), contenu, "utf8");
    }

    const resultat = init(habite);
    const compte_rendu = rendreInit(resultat);

    for (const [chemin, contenu] of Object.entries(avant)) {
      assert.equal(readFileSync(join(habite, chemin), "utf8"), contenu, chemin);
      assert.ok(resultat.conserves.includes(chemin), chemin);
    }

    // Le geste, pas seulement le constat : chaque rappel nomme ce qu'il faut
    // écrire dans le fichier qu'`init` n'a pas touché.
    assert.match(compte_rendu, /`\.gitattributes` existait déjà : ajoutez-y `\*\.contract\.json text eol=lf`/);
    assert.match(compte_rendu, /`\.vscode\/settings\.json` existait déjà : ajoutez-y l'association/);
    assert.match(compte_rendu, /`\.gitignore` existait déjà : ajoutez-y `ci-report\.md`/);
  } finally {
    rmSync(habite, { recursive: true, force: true });
  }
});

/**
 * Les deux fichiers restants n'ont rien à rappeler : un repository qui porte
 * déjà sa configuration ou son workflow a déjà répondu à la question qu'ils
 * posent. Un rappel inventé pour eux ferait du compte rendu une liste qu'on
 * apprend à sauter, et les trois vrais rappels partiraient avec.
 */
test("un repository déjà installé ne reçoit aucun rappel", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const compte_rendu = rendreInit(init(racine));

    assert.match(compte_rendu, /Rien à faire/);
    assert.doesNotMatch(compte_rendu, /ajoutez-y/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
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

test("`icons` refuse un argument en 2 au lieu de l'ignorer", () => {
  const alertes = [];
  const sortie = [];
  const code = executer(["icons", "--option-inconnue"], {
    racine: tmpdir(),
    ecrire: (t) => sortie.push(t),
    alerter: (t) => alertes.push(t),
  });
  assert.equal(code, 2);
  assert.match(alertes.join("\n"), /Argument inconnu : --option-inconnue/);
  assert.deepEqual(sortie, []);
});

test("une commande inconnue sort en 2, et 1 reste réservé aux contrôles", () => {
  const sortie = [];
  assert.equal(executer(["verifie"], { racine: tmpdir(), ecrire: (t) => sortie.push(t) }), 2);
  assert.match(sortie.join("\n"), /Commande inconnue : verifie/);
});

/**
 * L'aide annonce les trois commandes et les trois codes de sortie : c'est le
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

test("un repository sans paquet TypeScript garde le noyau portable", async () => {
  const racine = repoVierge();
  try {
    assert.equal(await chargerAdaptateur(racine), null);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Un repository qui range ses contrats ailleurs le dit à l'installation.
 *
 * Sans ces deux options, il fallait installer puis corriger le fichier à la
 * main, et l'oubli ne se voyait qu'au premier export déposé là où `ucm check`
 * ne regarde pas.
 */
test("init écrit les chemins demandés dans la configuration", async () => {
  const racine = repoVierge();
  try {
    await executer(["init", "--components", "src/components", "--tokens", "src/tokens"], {
      racine,
      ecrire: () => {},
    });
    const configuration = JSON.parse(readFileSync(join(racine, "ucm.config.json"), "utf8"));

    assert.equal(configuration.components, "src/components");
    assert.equal(configuration.tokens, "src/tokens/tokens.json");
    // Ce que les options ne touchent pas garde son défaut.
    assert.equal(configuration.implementation, "{dir}/{id}.tsx");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Les deux options attendent un dossier, parce que c'est ce qu'un repository
 * range. Le champ `tokens` reste un chemin de fichier : le kit le lit ainsi, et
 * changer sa nature ferait pointer toute configuration déjà écrite vers
 * `tokens.json/tokens.json`, sans un mot.
 */
test("`--tokens` reçoit un dossier et écrit un chemin de fichier", () => {
  assert.deepEqual(lireArgumentsInit(["--tokens", "design"]).chemins, {
    tokens: "design/tokens.json",
  });
  // À la racine, le dossier est vide et le défaut reste le fichier nu.
  assert.equal(lireArgumentsInit([]).chemins.tokens, undefined);
});

test("sans option, la configuration écrite reste celle des défauts", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const configuration = JSON.parse(readFileSync(join(racine, "ucm.config.json"), "utf8"));

    assert.equal(configuration.components, "components");
    assert.equal(configuration.tokens, "tokens.json");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le compte rendu annonce l'endroit réellement écrit. Une convention recopiée
 * dans la phrase dériverait de la configuration dès le premier drapeau, et
 * c'est cette phrase que lit celui qui vient d'installer.
 */
test("le compte rendu nomme les chemins écrits, pas une convention", () => {
  const racine = repoVierge();
  try {
    const compte_rendu = rendreInit(init(racine, {
      chemins: { components: "packages/ui/src", tokens: "design/tokens.json" },
    }));

    assert.match(compte_rendu, /`packages\/ui\/src\/`/);
    assert.match(compte_rendu, /`design\/tokens\.json`/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * `init` n'écrase jamais un fichier existant, et des chemins demandés ne sont
 * pas une raison de faire exception. Le taire ferait croire l'endroit changé
 * alors que le fichier décide toujours seul.
 */
test("des chemins demandés à un repository déjà configuré ne changent rien, et le compte rendu le dit", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const avant = readFileSync(join(racine, "ucm.config.json"), "utf8");

    const compte_rendu = rendreInit(init(racine, { chemins: { components: "ailleurs" } }));

    assert.equal(readFileSync(join(racine, "ucm.config.json"), "utf8"), avant);
    assert.match(compte_rendu, /les chemins passés en option n'ont pas été/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Un repository qui n'écrit pas de React nomme ses fichiers d'implémentation.
 *
 * Le défaut vaut `{dir}/{id}.tsx`, et `ucm init` l'écrivait dans tout dépôt.
 * Sur un dépôt Swift, le contrôle cherchait alors un `.tsx` qui n'existera
 * jamais, et rapportait « en attente d'implémentation » pour chaque contrat,
 * dans le commentaire de pull request que lit le designer.
 */
test("init écrit le motif d'implémentation demandé", async () => {
  const racine = repoVierge();
  try {
    await executer(["init", "--components", "Sources/DS", "--implementation", "{dir}/{id}.swift"], {
      racine,
      ecrire: () => {},
    });
    const configuration = JSON.parse(readFileSync(join(racine, "ucm.config.json"), "utf8"));

    assert.equal(configuration.implementation, "{dir}/{id}.swift");
    assert.equal(configuration.components, "Sources/DS");
    // `--implementation` reçoit un motif, jamais un dossier : rien ne lui est ajouté.
    assert.equal(configuration.tokens, "tokens.json");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Un motif sans `{id}` désignerait le même fichier pour tous les contrats, et
 * le rapport dirait « implémentation absente » pour tous sauf un.
 */
test("un motif d'implémentation sans `{id}` est refusé", () => {
  assert.match(lireArgumentsInit(["--implementation", "Button.swift"]).erreur, /contenant \{id\}/);
  assert.match(
    lireArgumentsInit(["--implementation", "../{id}.swift"]).erreur,
    /motif relatif/,
  );
});

/**
 * Un argument mal formé sort en 2, comme pour `check` : 1 reste réservé aux
 * contrôles rouges, et confondre les deux ferait lire « vos contrats sont en
 * défaut » à qui a fait une faute de frappe.
 */
test("init refuse un argument inconnu, une valeur manquante et un chemin qui remonte", () => {
  assert.match(lireArgumentsInit(["--composants", "src"]).erreur, /Argument inconnu/);
  assert.match(lireArgumentsInit(["--components"]).erreur, /attend une valeur/);
  assert.match(lireArgumentsInit(["--components", "--tokens"]).erreur, /attend une valeur/);
  assert.match(lireArgumentsInit(["--components", "../ailleurs"]).erreur, /dossier relatif/);
  assert.match(lireArgumentsInit(["--tokens", "  "]).erreur, /dossier relatif/);

  const racine = repoVierge();
  const alertes = [];
  try {
    assert.equal(
      executer(["init", "--composants", "src"], {
        racine,
        ecrire: () => {},
        alerter: (t) => alertes.push(t),
      }),
      2,
    );
    assert.match(alertes.join("\n"), /ucm init \[--components/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("ucm icons sur un repository neuf, sans dossier de contrats, ne réclame aucune icône", () => {
  const racine = repoVierge();
  try {
    const lignes = [];
    assert.equal(executer(["icons"], { racine, ecrire: (texte) => lignes.push(texte) }), 0);
    assert.match(lignes.join("\n"), /Aucune icône n'est réclamée/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("--sans-agents n'écrit que les cinq fichiers de contrôle", () => {
  assert.equal(lireArgumentsInit(["--sans-agents", "--components", "src"]).sansAgents, true);
  assert.deepEqual(lireArgumentsInit(["--sans-agents", "--components", "src"]).chemins, { components: "src" });
  const racine = repoVierge();
  try {
    const { ecrits } = init(racine, { sansAgents: true });
    assert.deepEqual(ecrits.sort(), [".gitattributes", ".github/workflows/ucm.yml", ".gitignore", ".vscode/settings.json", "ucm.config.json"]);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("les deux relais sont identiques, épinglent la CLI et renvoient au guide ; les conventions se lisent vides", () => {
  const racine = repoVierge();
  try {
    const { version } = init(racine);
    const agents = readFileSync(join(racine, ".agents/skills/ucm-implementer/SKILL.md"), "utf8");
    assert.equal(readFileSync(join(racine, ".claude/skills/ucm-implementer/SKILL.md"), "utf8"), agents);
    assert.match(agents, /^---\nname: ucm-implementer\ndescription: [^\n]+\n---\n/);
    assert.ok(agents.includes(`npx --yes @ucm-kit/cli@${version} guide <chemin du contrat>`));

    const conventions = lireConventions(readFileSync(join(racine, ".ucm/conventions.md"), "utf8"), catalogueDesAides());
    assert.deepEqual(conventions.anomalies, []);
    assert.equal(conventions.tete, "");
    assert.equal(conventions.sections.size, 0, "l'exemple reste en commentaire");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("les gabarits d'un adaptateur se copient sans écraser, et une erreur de chargement n'arrête pas l'installation", () => {
  const racine = repoVierge();
  const gabarits = repoVierge();
  try {
    writeFileSync(join(gabarits, "composant.tsx"), "export const Gabarit = 1;\n");
    const premier = init(racine, { adaptateur: { cheminGabarits: gabarits } });
    assert.ok(premier.ecrits.includes(".ucm/gabarits/composant.tsx"));
    assert.equal(readFileSync(join(racine, ".ucm/gabarits/composant.tsx"), "utf8"), "export const Gabarit = 1;\n");

    writeFileSync(join(racine, ".ucm/gabarits/composant.tsx"), "adapté\n");
    const second = init(racine, { adaptateur: { cheminGabarits: gabarits } });
    assert.ok(second.conserves.includes(".ucm/gabarits/composant.tsx"));
    assert.equal(readFileSync(join(racine, ".ucm/gabarits/composant.tsx"), "utf8"), "adapté\n");

    const autre = repoVierge();
    try {
      const resultat = init(autre, { erreurAdaptateur: new Error("tsconfig.json illisible") });
      assert.ok(resultat.ecrits.includes("ucm.config.json"));
      assert.match(rendreInit(resultat), /@ucm-kit\/adapter-typescript est installé mais n'a pas servi : tsconfig\.json illisible\. Les gabarits n'ont pas été copiés/);
    } finally {
      rmSync(autre, { recursive: true, force: true });
    }
  } finally {
    rmSync(racine, { recursive: true, force: true });
    rmSync(gabarits, { recursive: true, force: true });
  }
});

test("les lignes à ajouter à la main nomment leur fichier, et se taisent quand elles sont déjà là", () => {
  const racine = repoVierge();
  try {
    writeFileSync(join(racine, "package.json"), JSON.stringify({ scripts: { build: "vite build" } }));
    writeFileSync(join(racine, "tokens.json"), JSON.stringify({ $extensions: { "com.ucm.axes": { theme: { modes: ["a", "b"], default: "a" } } } }));
    const premier = rendreInit(init(racine));
    assert.match(premier, /Reste à ajouter à la main :\n\n- package\.json\n  Ajoutez `"@ucm-kit\/cli": "[^"]+"` aux devDependencies\.\n\n/);
    assert.match(premier, /- package\.json\n  Lancez `ucm tokens css --out src\/generated\/tokens\.css` en tête des scripts dev et build/);
    assert.match(premier, /- l'entrée CSS de l'application\n  Importez la feuille générée/);
    assert.match(premier, /- ucm\.config\.json\n  La section modes, facultative/);
    assert.doesNotMatch(premier, /gabarit|template/i);

    const { version } = init(racine);
    writeFileSync(join(racine, "package.json"), JSON.stringify({
      scripts: { build: "ucm tokens css --out src/generated/tokens.css && vite build" },
      devDependencies: { "@ucm-kit/cli": version },
    }));
    writeFileSync(join(racine, "ucm.config.json"), JSON.stringify({ modes: { theme: "data-theme" } }));
    const second = rendreInit(init(racine));
    assert.doesNotMatch(second, /Reste à ajouter/);
    assert.match(second, /Rien à faire/);

    writeFileSync(join(racine, "package.json"), JSON.stringify({
      scripts: { build: "ucm tokens css --out src/generated/tokens.css && vite build" },
      devDependencies: { "@ucm-kit/cli": "file:../archives/ucm-kit-cli.tgz" },
    }));
    assert.doesNotMatch(rendreInit(init(racine)), /devDependencies/, "une archive installée ne porte pas de numéro à comparer");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("init passe par l'aiguillage : l'adaptateur absent ne l'arrête pas", async () => {
  const racine = repoVierge();
  try {
    const lignes = [];
    assert.equal(await executer(["init", "--sans-agents"], { racine, ecrire: (texte) => lignes.push(texte) }), 0);
    assert.match(lignes.join("\n"), /Installé avec @ucm-kit\/cli/);
    assert.doesNotMatch(lignes.join("\n"), /\.agents|Relancez/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un chemin donné en séparateurs Windows est rangé en séparateurs de repository", () => {
  assert.deepEqual(
    lireArgumentsInit(["--components", "src\\components\\"]).chemins,
    { components: "src/components" },
  );
});
