/**
 * `ucm check` : ce que la commande ajoute au contrôle, et rien de plus.
 *
 * Ce qui est vérifié ici est la COUCHE OUTIL — arguments, périmètre, écriture
 * du rapport, code de sortie. Le contenu du rapport ne l'est pas : il appartient
 * au kit, et `packages/kit/tests/controleRepository.test.mjs` le tient. Le
 * dédoubler ici recréerait deux autorités sur les mêmes messages, ce que T5.2
 * vient de supprimer.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { check, lireArguments, releveDuDiff } from "../src/check.mjs";
import { executer } from "../src/ucm.mjs";

/** Contrat 12.0 minimal et valide, citant une seule référence de token. */
function contrat(nom) {
  return {
    name: nom,
    meta: {
      contractVersion: "12.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "f", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: {
        layout: "flex-row",
        sizing: { width: "fit-content", height: "fit-content" },
        children: [{ slot: "label", tokens: { color: "{couleurs.texte.principal}" } }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

const TOKENS = { couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } } };

/**
 * Un repository jouet aux emplacements PAR DÉFAUT : `components/` et
 * `tokens.json`, sans `ucm.config.json`. C'est le repo du critère de réussite
 * n° 1 — un dossier de contrats et rien d'autre —, donc celui qu'il faut
 * éprouver en premier.
 */
function repoJouet({ composants = { Widget: contrat("Widget") }, tokens = TOKENS } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-check-"));
  writeFileSync(join(racine, "tokens.json"), JSON.stringify(tokens, null, 2), "utf8");
  for (const [nom, document] of Object.entries(composants)) {
    const dossier = join(racine, "components", nom);
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, `${nom}.contract.json`), JSON.stringify(document, null, 2), "utf8");
  }
  return racine;
}

/** Lance `check` en recueillant les trois flux séparément. */
function lancer(racine, arguments_ = []) {
  const sortie = { log: [], warn: [], error: [] };
  const code = check(arguments_, {
    racine,
    ecrire: (texte) => sortie.log.push(texte),
    avertir: (texte) => sortie.warn.push(texte),
    alerter: (texte) => sortie.error.push(texte),
  });
  return { code, sortie, tout: [...sortie.log, ...sortie.warn, ...sortie.error].join("\n") };
}

test("un repository aux emplacements par défaut est contrôlé sans configuration", () => {
  const racine = repoJouet();
  try {
    const { code, tout } = lancer(racine);

    assert.equal(code, 0);
    assert.match(tout, /Widget\.contract\.json/);
    assert.match(tout, /✓ Contrats valides\./);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le 1 et le 2 ne se confondent jamais : un workflow qui les mélangerait ferait
 * lire « votre export est en défaut » à quelqu'un dont le seul tort est une
 * faute de frappe.
 */
test("un contrat cassé sort en 1, une invocation fautive en 2", () => {
  const casse = contrat("Widget");
  delete casse.rendering;
  const racine = repoJouet({ composants: { Widget: casse } });
  try {
    assert.equal(lancer(racine).code, 1, "des contrôles ont échoué");
    assert.equal(lancer(racine, ["--inconnu"]).code, 2, "je n'ai pas compris");
    assert.equal(lancer(racine, ["--report"]).code, 2, "un drapeau sans sa valeur");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("un drapeau suivi d'un autre drapeau est une valeur oubliée, pas une valeur", () => {
  assert.match(lireArguments(["--base", "--report", "x"]).erreur, /--base attend une valeur/);
  assert.deepEqual(lireArguments(["--base", "abc123"]).options, { base: "abc123", report: null });
  assert.deepEqual(lireArguments([]).options, { base: null, report: null });
});

/**
 * Le terminal, toujours ; le fichier, seulement sur demande. Écrire toujours
 * laisserait un rapport non versionné dans la copie de travail après chaque
 * exécution — le risque n'est pas de le commiter, mais de faire croire à un
 * rapport frais.
 */
test("le rapport ne s'écrit que sur --report, et le terminal parle quand même", () => {
  const racine = repoJouet();
  try {
    const sansFichier = lancer(racine);
    assert.equal(existsSync(join(racine, "ci-report.md")), false);
    assert.notEqual(sansFichier.tout, "");

    assert.equal(lancer(racine, ["--report", "ci-report.md"]).code, 0);
    const rapport = readFileSync(join(racine, "ci-report.md"), "utf8");
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.ok(rapport.endsWith("\n"), "un fichier markdown se termine par une ligne");
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("--report crée le dossier du chemin demandé", () => {
  const racine = repoJouet();
  try {
    assert.equal(lancer(racine, ["--report", "rapports/ucm/dernier.md"]).code, 0);
    assert.ok(existsSync(join(racine, "rapports", "ucm", "dernier.md")));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Une configuration présente et mal formée arrête la commande. Retomber sur les
 * défauts ferait chercher les contrats ailleurs et rendre un rapport vert sur
 * un repository qu'on n'a pas regardé.
 *
 * *Aucun rapport n'est écrit, et c'est voulu :* formuler ici un diagnostic de
 * designer remettrait du vocabulaire de rapport dans l'outil, ce que T5.2 vient
 * d'en sortir. Le filet du workflow couvre exactement ce cas — rapport absent,
 * message minimal publié.
 */
test("une configuration refusée sort en 2 sans écrire de rapport", () => {
  const racine = repoJouet();
  try {
    writeFileSync(join(racine, "ucm.config.json"), '{"components": 12}', "utf8");
    const { code, sortie } = lancer(racine, ["--report", "ci-report.md"]);

    assert.equal(code, 2);
    assert.match(sortie.error.join("\n"), /ucm\.config\.json : components/);
    assert.equal(existsSync(join(racine, "ci-report.md")), false);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une configuration qui déplace les contrats est suivie", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-check-"));
  try {
    mkdirSync(join(racine, "src", "ui", "Widget"), { recursive: true });
    writeFileSync(
      join(racine, "src", "ui", "Widget", "Widget.contract.json"),
      JSON.stringify(contrat("Widget")),
      "utf8",
    );
    mkdirSync(join(racine, "design"), { recursive: true });
    writeFileSync(join(racine, "design", "tokens.json"), JSON.stringify(TOKENS), "utf8");
    writeFileSync(
      join(racine, "ucm.config.json"),
      JSON.stringify({ components: "src/ui", tokens: "design/tokens.json" }),
      "utf8",
    );

    const { code, tout } = lancer(racine);
    assert.equal(code, 0);
    assert.match(tout, /Widget\.contract\.json/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * **Aucun repli silencieux quand `git` échoue.** Sans relevé, le périmètre
 * s'ouvrirait à tous les contrats et le rapport parlerait de composants que la
 * pull request ne touche pas — le défaut même que le périmètre supprime.
 */
test("un diff impossible arrête la commande au lieu d'élargir le périmètre", () => {
  const racine = repoJouet();
  try {
    const { code, sortie } = lancer(racine, ["--base", "0000000000000000000000000000000000000000"]);

    assert.equal(code, 2);
    assert.match(sortie.error.join("\n"), /Le diff depuis « 0000000/);
    assert.match(sortie.error.join("\n"), /profondeur du checkout/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le relevé sur un vrai dépôt git, pas sur un simulacre : ce qui est en cause
 * est la syntaxe exacte que `git diff` accepte, et un faux `git` prouverait
 * qu'on sait écrire un faux `git`.
 */
test("le diff relève les contrats modifiés et le sort du fichier de tokens", () => {
  const racine = repoJouet();
  const git = (...arguments_) =>
    execFileSync("git", arguments_, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "-q");
    git("config", "user.email", "essai@example.invalid");
    git("config", "user.name", "Essai");
    git("add", "-A");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD").trim();

    mkdirSync(join(racine, "components", "Autre"), { recursive: true });
    writeFileSync(
      join(racine, "components", "Autre", "Autre.contract.json"),
      JSON.stringify(contrat("Autre")),
      "utf8",
    );
    git("add", "-A");
    git("commit", "-qm", "un export");

    const releve = releveDuDiff(racine, base, "tokens.json");
    assert.match(releve.contratsModifies, /components\/Autre\/Autre\.contract\.json/);
    assert.doesNotMatch(releve.contratsModifies, /Widget/);
    assert.equal(releve.tokensModifies, false, "cette pull request ne touche pas les tokens");

    writeFileSync(join(racine, "tokens.json"), JSON.stringify({ ...TOKENS, autre: {} }), "utf8");
    git("add", "-A");
    git("commit", "-qm", "des tokens");
    assert.equal(releveDuDiff(racine, base, "tokens.json").tokensModifies, true);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

/**
 * Le périmètre limite les états informatifs aux contrats de la pull request :
 * un export de Widget ne doit pas reparler d'un Autre déjà fusionné.
 */
test("le périmètre tait les états informatifs des contrats que la PR ne touche pas", () => {
  const racine = repoJouet({
    composants: { Widget: contrat("Widget"), Autre: contrat("Autre") },
  });
  const git = (...arguments_) =>
    execFileSync("git", arguments_, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "-q");
    git("config", "user.email", "essai@example.invalid");
    git("config", "user.name", "Essai");
    git("add", "-A");
    git("commit", "-qm", "base");
    const base = git("rev-parse", "HEAD").trim();

    const reexporte = contrat("Widget");
    reexporte.meta.exportedAt = "2026-02-02T00:00:00.000Z";
    writeFileSync(
      join(racine, "components", "Widget", "Widget.contract.json"),
      JSON.stringify(reexporte, null, 2),
      "utf8",
    );
    git("add", "-A");
    git("commit", "-qm", "reexport de Widget");

    assert.equal(lancer(racine, ["--base", base, "--report", "ci-report.md"]).code, 0);
    const rapport = readFileSync(join(racine, "ci-report.md"), "utf8");

    // Les deux contrats sont contrôlés — la validation reste globale — mais
    // seul celui que la PR modifie a le droit de parler dans les états
    // informatifs. Ici : l'implémentation absente.
    assert.match(rapport, /2 contrats et 2 références de token contrôlés/);
    assert.match(rapport, /`Widget\.contract\.json`/);
    assert.doesNotMatch(rapport, /`Autre\.contract\.json`/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("`ucm check` est atteignable depuis l'aiguillage, avec son code de sortie", () => {
  const racine = repoJouet();
  try {
    const muet = () => {};
    assert.equal(
      executer(["check"], { racine, ecrire: muet, avertir: muet, alerter: muet }),
      0,
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
