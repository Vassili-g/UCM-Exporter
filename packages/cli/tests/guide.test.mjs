/**
 * `ucm guide` sur des repositories temporaires : un contrat `Carte` compose un
 * contrat `Badge`. Chaque cas monte ses conventions, ses tokens et ses pins.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { guide } from "../src/guide.mjs";
import { executer } from "../src/ucm.mjs";

/** Un contrat 13.0 dont les deux variants partagent une vue, et qui compose `dependances`. */
function contrat(nom, { dependances = [], version = "13.0", tokens = {}, strokes, icone = false } = {}) {
  const composes = dependances.map((dependance) => ({ component: dependance, figmaLayer: dependance }));
  const valeur = {
    name: nom,
    meta: { contractVersion: version, exportedAt: "2026-01-01T00:00:00.000Z", figma: { fileName: "f", nodeId: "1:1" }, coverage: { portable: "complete" } },
    props: { tone: { type: "enum", values: ["neutre", "alerte"], default: "neutre" } },
    viewStructures: {
      st1: {
        layout: "flex-row",
        children: [...dependances.map((dependance) => ({ slot: dependance.toLowerCase(), composes: dependance })), { slot: "label" }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: ["neutre", "alerte"].map((tone, rang) => ({
      nodeId: `1:${rang + 2}`, figmaName: `Tone=${tone}`, values: { tone }, tokens, view: "v1", ...(strokes ? { strokes } : {}),
    })),
    structure: { view: "st1", variantAxes: ["tone"] },
    rendering: { roles: {} },
  };
  if (composes.length > 0) {
    valeur.viewComposes = { co1: composes };
    valeur.variantViews.v1.composes = "co1";
    valeur.composes = composes;
  }
  if (icone) {
    valeur.icons = { chevron: { figmaName: "Chevron", slot: "label", size: "{espace}" } };
    valeur.viewIcons = { ic1: { chevron: { figmaName: "Chevron", slotPath: ["label"] } } };
    valeur.variantViews.v1.icons = "ic1";
  }
  return valeur;
}

const THEME = {
  $extensions: { "com.ucm.formatVersion": 2, "com.ucm.axes": { theme: { modes: ["light", "dark"], default: "light" } } },
  theme: { fond: { $type: "color", $value: "{x}", $extensions: { "com.ucm.axis": "theme", "com.ucm.modes": { light: 1, dark: 2 } } } },
};

/** Écrit un repository temporaire : chemin relatif vers contenu, un objet s'écrivant en JSON. */
function repository(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-guide-"));
  for (const [chemin, contenu] of Object.entries({ "ucm.config.json": "{}", ...fichiers })) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
  }
  return racine;
}

const CARTE = "components/Carte/Carte.contract.json";
const BADGE = "components/Badge/Badge.contract.json";

function lancer(fichiers, arguments_ = [CARTE]) {
  const racine = repository(fichiers);
  try {
    const log = [];
    const erreurs = [];
    const code = guide(arguments_, { racine, ecrire: (texte) => log.push(texte), alerter: (texte) => erreurs.push(texte) });
    return { code, sortie: log.join("\n"), erreur: erreurs.join("\n"), racine };
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

const DEUX_CONTRATS = { [CARTE]: contrat("Carte", { dependances: ["Badge"] }), [BADGE]: contrat("Badge") };

/** Le texte d'une section `### <aide>`, jusqu'au titre suivant. */
function sectionDAide(sortie, aide) {
  const debut = sortie.indexOf(`### ${aide}\n`);
  if (debut === -1) return null;
  const fin = sortie.slice(debut + 4).search(/\n#{2,3} /);
  return fin === -1 ? sortie.slice(debut) : sortie.slice(debut, debut + 4 + fin);
}

test("une vue que deux variants partagent s'imprime une fois, et chaque variant garde son renvoi", () => {
  const { code, sortie } = lancer(DEUX_CONTRATS);
  assert.equal(code, 0);
  assert.equal(sortie.match(/^"st1": /gm)?.length, 1);
  assert.equal(sortie.match(/^"v1": /gm)?.length, 1);
  assert.equal(sortie.match(/"view":"v1"/g)?.length, 2);
  assert.doesNotMatch(sortie, /"nodeId"|"figmaName":"Tone=/, "les identités Figma d'un variant ne sont pas imprimées");
  assert.match(sortie, /### Dépendance Badge\n\n```json\n"props": /);
});

test("une aide ne s'imprime que si sa caractéristique est présente", () => {
  const sansContour = lancer(DEUX_CONTRATS);
  assert.notEqual(sectionDAide(sansContour.sortie, "disposition"), null);
  assert.equal(sectionDAide(sansContour.sortie, "contour-ring"), null);
  assert.equal(sectionDAide(sansContour.sortie, "grille"), null);

  const avecContour = lancer({
    ...DEUX_CONTRATS,
    [CARTE]: contrat("Carte", { dependances: ["Badge"], strokes: { ring: { color: "{x}", align: "outside" } } }),
  });
  assert.notEqual(sectionDAide(avecContour.sortie, "contour-ring"), null);
});

test("la section des conventions remplace l'écriture par défaut, et son contrôle rejoint la preuve", () => {
  const { sortie } = lancer({
    ...DEUX_CONTRATS,
    ".ucm/conventions.md": "Stack : CSS Modules.\n\n## disposition\nClasse `rangee`.\n\nContrôle : `npm run lint:css`\n\n## grille\nGrille maison.\n",
  });
  const disposition = sectionDAide(sortie, "disposition");
  assert.match(disposition, /\*\*Écriture du repository\.\*\*\n\nClasse `rangee`\./);
  assert.doesNotMatch(disposition, /Écriture par défaut/);
  assert.match(disposition, /Contrôles du repository : `npm run lint:css`\./);
  assert.ok(sortie.indexOf("Stack : CSS Modules.") < sortie.indexOf("## Aides"), "le texte de tête précède les aides");
  assert.equal(sortie.match(/Stack : CSS Modules\./g)?.length, 1, "le texte de tête s'imprime une fois");
  assert.doesNotMatch(sortie, /Grille maison/, "la section d'une aide que le contrat n'emploie pas ne s'imprime pas");
});

test("ecritures-par-defaut: non retire les écritures par défaut sans poser de question", () => {
  const { sortie } = lancer({ ...DEUX_CONTRATS, ".ucm/conventions.md": "ecritures-par-defaut: non\n\nStack : Swift.\n" });
  assert.doesNotMatch(sortie, /Écriture par défaut/);
  assert.match(sectionDAide(sortie, "disposition"), /\*\*Sens\.\*\*[\s\S]*\*\*Preuve\.\*\*/);
  assert.doesNotMatch(sortie.slice(sortie.indexOf("## Non tranché")), /\*\*disposition\*\*/);
});

test("un ancrage sans section se liste sous non tranché, un ancrage répondu s'imprime avec sa réponse", () => {
  const { sortie } = lancer({ ...DEUX_CONTRATS, ".ucm/conventions.md": "## identifiants\n`data-testid` sur la racine.\n" });
  const nonTranche = sortie.slice(sortie.indexOf("## Non tranché : demander au développeur"));
  assert.match(nonTranche, /^- \*\*attributs-natifs\*\* : /m);
  assert.doesNotMatch(nonTranche, /\*\*identifiants\*\*/);
  assert.match(sectionDAide(sortie, "identifiants"), /\*\*Réponse du repository\.\*\*\n\n`data-testid` sur la racine\./);
});

test("les anomalies des conventions, commentaires retirés et blocs de code compris, s'impriment en tête", () => {
  const { sortie } = lancer({
    ...DEUX_CONTRATS,
    ".ucm/conventions.md": "Stack.\n<!-- note privée -->\n```md\n## pas-une-section\n```\n\n## inconnue\nx\n\n## disposition\na\n\n## disposition\nb\n",
  });
  const enTete = sortie.slice(0, sortie.indexOf("## Procédure"));
  assert.match(enTete, /## À relire avant de commencer/);
  assert.match(enTete, /La section « inconnue » ne nomme aucune aide\./);
  assert.match(enTete, /La section « disposition » est écrite deux fois : seule la première s'applique\./);
  assert.doesNotMatch(sortie, /pas-une-section » ne nomme|note privée/);
  assert.match(sortie, /## Conventions du repository\n\nStack\.\n+```md\n## pas-une-section\n```/);
});

test("le fichier de conventions le plus proche du contrat s'applique, sans fusion", () => {
  const { sortie } = lancer({
    ...DEUX_CONTRATS,
    ".ucm/conventions.md": "Racine du repository.\n",
    "components/Carte/.ucm/conventions.md": "Conventions de la carte.\n",
  });
  assert.match(sortie, /Conventions de la carte\./);
  assert.doesNotMatch(sortie, /Racine du repository/);
});

test("une section copiée dont l'écriture par défaut a changé est à relire", () => {
  const { sortie } = lancer({
    ...DEUX_CONTRATS,
    ".ucm/conventions.md": "## disposition\n<!-- ucm:copie disposition 0.0.1 00000000 -->\n\nAncienne écriture.\n",
  });
  assert.match(sortie.slice(0, sortie.indexOf("## Procédure")), /la section « disposition » copie l'écriture par défaut de la version 0\.0\.1, qui a changé depuis/);
});

test("des pins de @ucm-kit/cli qui diffèrent sont nommés fichier par fichier ; des pins égaux ne disent rien", () => {
  const relais = (version) => `Lancer \`npx --yes @ucm-kit/cli@${version} guide <chemin du contrat>\`.\n`;
  const desaccord = lancer({
    ...DEUX_CONTRATS,
    ".github/workflows/ucm.yml": "run: npx --yes @ucm-kit/cli@0.1.20 check\n",
    ".claude/skills/ucm-implementer/SKILL.md": relais("0.1.33"),
    "package.json": { devDependencies: { "@ucm-kit/cli": "0.1.33" } },
  });
  assert.match(desaccord.sortie, /⚠ Les pins de @ucm-kit\/cli diffèrent/);
  assert.match(desaccord.sortie, /^ {2}\.github\/workflows\/ucm\.yml : 0\.1\.20$/m);
  assert.match(desaccord.sortie, /^ {2}package\.json : 0\.1\.33$/m);

  const accord = lancer({ ...DEUX_CONTRATS, ".agents/skills/ucm-implementer/SKILL.md": relais("0.1.33"), "package.json": { devDependencies: { "@ucm-kit/cli": "0.1.33" } } });
  assert.doesNotMatch(accord.sortie, /À relire/);

  const archive = lancer({ ...DEUX_CONTRATS, ".agents/skills/ucm-implementer/SKILL.md": relais("0.1.33"), "package.json": { devDependencies: { "@ucm-kit/cli": "file:../archives/ucm-kit-cli-0.1.33.tgz" } } });
  assert.doesNotMatch(archive.sortie, /À relire/, "une archive installée ne porte pas de numéro à comparer");
});

test("le guide ne demande jamais de lancer le guide", () => {
  const { sortie } = lancer({ ...DEUX_CONTRATS, ".ucm/conventions.md": "Stack.\n" });
  assert.doesNotMatch(sortie, /ucm guide|\bguide </);
});

test("les axes qui touchent le contrat, leur attribut et les contextes à vérifier s'impriment, avec l'aide modes", () => {
  const { code, sortie } = lancer({
    ...DEUX_CONTRATS,
    [CARTE]: contrat("Carte", { dependances: ["Badge"], tokens: { background: "{theme.fond}" } }),
    "tokens.json": { ...THEME, x: { $type: "color", $value: 3 } },
  });
  assert.equal(code, 0);
  const modes = sortie.slice(sortie.indexOf("## Modes"));
  assert.match(modes, /^- `theme` : attribut `data-theme`, modes light \(défaut\), dark$/m);
  assert.match(modes, /Contextes à vérifier :\n\n- le contexte par défaut\n- `data-theme="dark"`\n/);
  assert.notEqual(sectionDAide(sortie, "modes"), null);

  const sansAxe = lancer({ ...DEUX_CONTRATS, "tokens.json": { ...THEME, x: { $type: "color", $value: 3 } } });
  assert.match(sansAxe.sortie, /Aucun axe de modes ne touche ce contrat\./);
  assert.equal(sectionDAide(sansAxe.sortie, "modes"), null);
});

test("les icônes réclamées et la taille de chaque partie ferment le guide", () => {
  const { sortie } = lancer({ ...DEUX_CONTRATS, [BADGE]: contrat("Badge", { icone: true }) }, [BADGE]);
  assert.match(sortie, /## Icônes réclamées\n\n- Chevron\n/);
  assert.match(sortie, /## Taille de ce guide\n\n\| Partie \| Octets \|\n\|---\|---\|\n\| procédure \| \d+ \|/);
});

test("une dépendance manquante ou un cycle de composition rendent 1 ; une version future rend 2", () => {
  const manquante = lancer({ [CARTE]: contrat("Carte", { dependances: ["Badge"] }) });
  assert.equal(manquante.code, 1);
  assert.match(manquante.erreur, /La dépendance « Badge » n’a aucun contrat local/);

  const cycle = lancer({ [CARTE]: contrat("Carte", { dependances: ["Badge"] }), [BADGE]: contrat("Badge", { dependances: ["Carte"] }) });
  assert.equal(cycle.code, 1);
  assert.match(cycle.erreur, /Cycle de composition détecté/);

  const future = lancer({ ...DEUX_CONTRATS, [CARTE]: contrat("Carte", { dependances: ["Badge"], version: "99.0" }) });
  assert.equal(future.code, 2);
  assert.match(future.erreur, /Un développeur doit mettre à jour @ucm-kit\/cli/);
});

test("un fichier de tokens aux modes incohérents rend 1", () => {
  const incoherent = { ...THEME, $extensions: { ...THEME.$extensions, "com.ucm.axes": {} }, x: { $type: "color", $value: 3 } };
  incoherent.theme.fond.$extensions = { "com.ucm.axis": "absent", "com.ucm.modes": { light: 1, dark: 2 } };
  const { code, erreur } = lancer({ ...DEUX_CONTRATS, "tokens.json": incoherent });
  assert.equal(code, 1);
  assert.match(erreur, /déclare des modes incohérents/);
});

test("--out écrit le guide et imprime sa taille ; une invocation fautive rend 2", () => {
  const racine = repository(DEUX_CONTRATS);
  try {
    const log = [];
    assert.equal(guide([CARTE, "--out", "guides/carte.md"], { racine, ecrire: (texte) => log.push(texte), alerter: () => {} }), 0);
    assert.match(readFileSync(join(racine, "guides", "carte.md"), "utf8"), /^# Guide d'implémentation : Carte\n/);
    assert.match(log.join("\n"), /^guides\/carte\.md : \d+ octets\.$/);

    const muet = { racine, ecrire: () => {}, alerter: () => {} };
    assert.equal(guide([], muet), 2);
    assert.equal(guide([CARTE, "--out"], muet), 2);
    assert.equal(guide([CARTE, "autre.json"], muet), 2);
    assert.equal(guide(["absent.contract.json"], muet), 2);
    assert.equal(guide([CARTE, "--out", CARTE], muet), 2);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("ucm guide passe par l'aiguillage, et l'aide de la CLI la nomme", () => {
  const racine = repository(DEUX_CONTRATS);
  try {
    const lignes = [];
    assert.equal(executer(["guide", CARTE], { racine, ecrire: (texte) => lignes.push(texte) }), 0);
    assert.match(lignes.join("\n"), /^# Guide d'implémentation : Carte/);
    executer(["--help"], { ecrire: (texte) => lignes.push(texte) });
    assert.match(lignes.join("\n"), /ucm guide <contrat> \[--out <fichier>\]/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
