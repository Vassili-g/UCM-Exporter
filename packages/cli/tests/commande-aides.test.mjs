/**
 * `ucm aides` sur des repositories temporaires : la liste et l'origine de chaque
 * écriture, une aide en entier, et la copie d'une écriture par défaut.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { aides, catalogueDesAides } from "../src/aides.mjs";
import { executer } from "../src/ucm.mjs";

function lancer(racine, arguments_) {
  const log = [];
  const erreurs = [];
  const code = aides(arguments_, { racine, ecrire: (texte) => log.push(texte), alerter: (texte) => erreurs.push(texte) });
  return { code, log: log.join("\n"), erreur: erreurs.join("\n") };
}

function repository(conventions) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-aides-"));
  writeFileSync(join(racine, "ucm.config.json"), "{}");
  if (conventions !== undefined) {
    mkdirSync(join(racine, ".ucm"), { recursive: true });
    writeFileSync(join(racine, ".ucm", "conventions.md"), conventions);
  }
  return racine;
}

test("la liste nomme chaque aide, sa caractéristique et l'origine de son écriture", () => {
  const racine = repository("Stack : CSS.\n\n## contour-ring\nClasse `ring`.\n\n## focus-clavier\n`:focus-visible`.\n");
  try {
    const { code, log } = lancer(racine, []);
    assert.equal(code, 0);
    assert.match(log, new RegExp(`^${catalogueDesAides().size} aides, écritures d'après \\.ucm/conventions\\.md :$`, "m"));
    assert.match(log, /^ {2}composant +toujours +conventions, texte de tête$/m);
    assert.match(log, /^ {2}contour-ring +contour-ring +conventions$/m);
    assert.match(log, /^ {2}contour-border +contour-border +UCM$/m);
    assert.match(log, /^ {2}focus-clavier +focus +ancrage répondu$/m);
    assert.match(log, /^ {2}identifiants +toujours +ancrage sans réponse$/m);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une anomalie des conventions s'imprime avant la liste", () => {
  const racine = repository("## inconnue\nx\n");
  try {
    const { log } = lancer(racine, []);
    assert.ok(log.startsWith("⚠ .ucm/conventions.md : La section « inconnue » ne nomme aucune aide."));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une aide s'imprime avec son sens, son écriture par défaut et sa preuve ; un ancrage sans écriture", () => {
  const racine = repository();
  try {
    const ring = lancer(racine, ["contour-ring"]);
    assert.equal(ring.code, 0);
    assert.match(ring.log, /^# contour-ring\n\n## Sens\n/);
    assert.match(ring.log, /## Écriture par défaut\n\n`outline: <width> solid <color>`/);
    assert.match(ring.log, /## Preuve\n\nRelecture/);

    const ancrage = lancer(racine, ["focus-clavier"]);
    assert.doesNotMatch(ancrage.log, /Écriture par défaut/);

    assert.equal(lancer(racine, ["inconnue"]).code, 2);
    assert.equal(lancer(racine, ["contour-ring", "--autre"]).code, 2);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("--personnaliser ajoute la section marquée à la fin du fichier, puis refuse d'écrire une seconde fois", () => {
  const racine = repository("Stack : CSS.\n");
  const chemin = join(racine, ".ucm", "conventions.md");
  try {
    const premier = lancer(racine, ["contour-ring", "--personnaliser"]);
    assert.equal(premier.code, 0);
    const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
    const ecrit = readFileSync(chemin, "utf8");
    assert.match(ecrit, new RegExp(`^Stack : CSS\\.\\n\\n## contour-ring\\n<!-- ucm:copie contour-ring ${version.replaceAll(".", "\\.")} [0-9a-f]{8} -->\\n\\n\`outline: <width> solid <color>\``));

    const second = lancer(racine, ["contour-ring", "--personnaliser"]);
    assert.equal(second.code, 0);
    assert.match(second.log, /porte déjà une section « contour-ring » : rien n'est écrit/);
    assert.equal(readFileSync(chemin, "utf8"), ecrit);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("--personnaliser refuse l'aide composant, dont l'écriture est le texte de tête", () => {
  const racine = repository("Stack : CSS.\n");
  const chemin = join(racine, ".ucm", "conventions.md");
  try {
    const refuse = lancer(racine, ["composant", "--personnaliser"]);
    assert.equal(refuse.code, 2);
    assert.match(refuse.erreur, /le texte avant la première section de \.ucm\/conventions\.md est l'écriture de l'aide composant/);
    assert.equal(readFileSync(chemin, "utf8"), "Stack : CSS.\n");
    assert.doesNotMatch(lancer(racine, []).log, /⚠/);

    const dehors = lancer(racine, ["contour-ring", "--personnaliser", ".."]);
    assert.equal(dehors.code, 2);
    assert.match(dehors.erreur, /\.\. est hors du repository/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("--personnaliser vise le fichier le plus proche du chemin donné, et refuse sans fichier", () => {
  const racine = repository();
  try {
    assert.equal(lancer(racine, ["contour-ring", "--personnaliser"]).code, 2);

    mkdirSync(join(racine, "apps", "web", ".ucm"), { recursive: true });
    writeFileSync(join(racine, "apps", "web", ".ucm", "conventions.md"), "Web.\n");
    const { code, log } = lancer(racine, ["focus-clavier", "--personnaliser", "apps/web/src"]);
    assert.equal(code, 0);
    assert.match(log, /apps\/web\/\.ucm\/conventions\.md : section « focus-clavier » ajoutée/);
    assert.match(readFileSync(join(racine, "apps", "web", ".ucm", "conventions.md"), "utf8"), /## focus-clavier\n<!-- ucm:copie focus-clavier /);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("ucm aides passe par l'aiguillage, et l'aide de la CLI la nomme", () => {
  const lignes = [];
  assert.equal(executer(["aides", "rotation"], { racine: tmpdir(), ecrire: (texte) => lignes.push(texte) }), 0);
  assert.match(lignes.join("\n"), /^# rotation/);
  executer(["--help"], { ecrire: (texte) => lignes.push(texte) });
  assert.match(lignes.join("\n"), /ucm aides \[<aide> \[--personnaliser/);
});

test("l'archive de la CLI publie les aides et la procédure", () => {
  const dossier = join(dirname(fileURLToPath(import.meta.url)), "..");
  const sortie = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: dossier,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "ignore"],
  });
  // npm 11 rend un tableau, npm 12 un objet indexé par nom de paquet.
  const rendu = JSON.parse(sortie);
  const archive = Array.isArray(rendu) ? rendu[0] : rendu["@ucm-kit/cli"];
  const fichiers = archive.files.map(({ path }) => path.split("\\").join("/"));
  assert.ok(fichiers.includes("procedure.md"), "procedure.md manque à l'archive");
  assert.ok(fichiers.includes("aides/contour-ring.md"), "aides/ manque à l'archive");
});
