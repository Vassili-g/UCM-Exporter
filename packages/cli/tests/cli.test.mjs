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

import { iconesDuRepository } from "../src/icons.mjs";
import { chargerAdaptateur } from "../src/adaptateur.mjs";
import { init, lireArgumentsInit, rendreInit } from "../src/init.mjs";
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
    assert.match(workflow, /gh pr comment .* --edit-last/);
    assert.match(workflow, /if: always\(\)/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Les deux dernières étapes du workflow ne forment un filet que si elles se
 * relaient : l'une écrit le rapport quand il manque, l'autre le publie. Rien
 * ici ne vérifiait leur ACCORD — leurs conditions, leur fichier commun et
 * l'évènement sur lequel elles portent.
 *
 * Trois façons de perdre le message du designer sans qu'une seule ligne
 * paraisse fausse : les deux conditions s'excluent mal et le filet écrase un
 * vrai rapport ; l'écriture et la publication ne visent pas le même fichier ;
 * l'évènement n'est pas borné, et un `push` sur `main` fait échouer une étape
 * qui n'avait aucun commentaire à écrire.
 */
/**
 * Le corps d'une étape nommée du workflow, sans son indentation.
 *
 * Il court du `- name:` demandé jusqu'à l'étape suivante. Rien ici ne cherche à
 * lire du YAML : on compare des lignes écrites par un générateur, pas un
 * fichier qu'un tiers aurait pu reformater.
 */
function etape(workflow, nom) {
  const lignes = workflow.split(/\r?\n/);
  const debut = lignes.findIndex((l) => l.trim() === "- name: " + nom);
  assert.notEqual(debut, -1, "le workflow généré n'écrit plus l'étape « " + nom + " »");

  const corps = [];
  for (const ligne of lignes.slice(debut + 1)) {
    if (/^\s*- (name|uses):/.test(ligne)) break;
    corps.push(ligne.trim());
  }
  return corps.join("\n");
}

/**
 * Les deux dernières étapes du workflow ne forment un filet que si elles se
 * relaient : l'une écrit le rapport quand il manque, l'autre publie celui qui
 * est là. Rien ici ne vérifiait leur accord : leurs conditions, leur fichier
 * commun et l'évènement sur lequel elles portent.
 *
 * Trois façons de perdre le message du designer sans qu'une ligne paraisse
 * fausse : les deux conditions cessent de s'exclure, et le filet écrase un vrai
 * rapport ; l'écriture et la publication ne visent plus le même fichier ;
 * l'évènement n'est plus borné, et un `push` sur `main` fait échouer une étape
 * qui n'avait aucun fil où écrire.
 */
test("les deux filets de fin se relaient sur le même rapport, et seulement sur une pull request", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");
    const ecriture = etape(workflow, "Garantir un diagnostic même sans rapport");
    const publication = etape(workflow, "Publier le diagnostic sur la pull request");

    for (const [quoi, corps] of [["l'écriture", ecriture], ["la publication", publication]]) {
      assert.match(
        corps,
        /if: always\(\) && github\.event_name == 'pull_request'/,
        "hors pull request, " + quoi + " n'a aucun fil où écrire",
      );
    }

    assert.match(ecriture, /hashFiles\('ci-report\.md'\) == ''/);
    assert.match(
      publication,
      /hashFiles\('ci-report\.md'\) != ''/,
      "les deux conditions s'excluent, sinon le filet écraserait un vrai rapport",
    );
    assert.match(ecriture, /cat > ci-report\.md <<EOF/, "le filet écrit le fichier publié");
    assert.match(publication, /--body-file ci-report\.md/, "la publication lit le fichier écrit");
    assert.match(ecriture, /\$RUN_URL/, "le message minimal nomme l'endroit où regarder");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le message ne part que si le workflow a le droit de l'écrire et un fil où
 * l'écrire. Le jeton et le numéro passent par l'environnement : interpolés dans
 * le shell, ils feraient exécuter au runner ce qu'un titre de pull request
 * contient. Et `--edit-last` échoue quand aucun commentaire n'existe encore :
 * sans son repli, le tout premier diagnostic d'une pull request serait perdu,
 * précisément celui que le designer attend.
 */
test("le diagnostic est publié avec le droit de l'être, et crée le fil qu'il ne trouve pas", () => {
  const racine = repoVierge();
  try {
    init(racine);
    const workflow = readFileSync(join(racine, ".github/workflows/ucm.yml"), "utf8");

    assert.match(workflow, /^\s*pull-requests: write$/m);
    assert.match(workflow, /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
    assert.match(workflow, /NUMERO: \$\{\{ github\.event\.number \}\}/);
    assert.doesNotMatch(
      workflow,
      /gh pr comment "\$\{\{/,
      "le numéro voyage par l'environnement, jamais par interpolation dans le shell",
    );
    assert.match(
      workflow,
      /--edit-last[\s\\]*\|\|\s*gh pr comment "\$NUMERO" --body-file ci-report\.md/,
      "sans repli, le premier commentaire d'une pull request n'est jamais créé",
    );
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
test("init écrit les chemins demandés dans la configuration", () => {
  const racine = repoVierge();
  try {
    executer(["init", "--components", "src/components", "--tokens", "src/tokens"], {
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

test("un chemin donné en séparateurs Windows est rangé en séparateurs de repository", () => {
  assert.deepEqual(
    lireArgumentsInit(["--components", "src\\components\\"]).chemins,
    { components: "src/components" },
  );
});
