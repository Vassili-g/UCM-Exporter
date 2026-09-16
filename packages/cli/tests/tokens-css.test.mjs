/**
 * `ucm tokens css` sur des repositories temporaires : la feuille écrite, chaque
 * refus avec son cas voisin accepté, et ce que la commande laisse en place.
 * La cascade de la feuille dans les navigateurs se prouve dans `cascade/`.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { tokensCss } from "../src/tokens-css.mjs";
import { executer } from "../src/ucm.mjs";
import { DEUX_AXES, TROIS_AXES, avecOrdreDesAxes } from "./cascade/documents.mjs";

const EN_TETE = "/* Généré par ucm tokens css depuis tokens.json. Relancer la commande plutôt que modifier ce fichier. */\n";
const SORTIE = ["css", "--out", "generated/tokens.css"];

function feuille(axe, modes, $type = "number") {
  const extensions = { "com.ucm.modes": modes };
  if (axe !== undefined) extensions["com.ucm.axis"] = axe;
  return { $type, $value: Object.values(modes)[0], $extensions: extensions };
}

const nombre = (valeur) => ({ $type: "number", $value: valeur });
const alias = (reference, $type = "number") => ({ $type, $value: reference });

function documentAvec(axes, groupes, version = 2) {
  const racine = { "com.ucm.formatVersion": version };
  if (axes !== undefined) racine["com.ucm.axes"] = axes;
  return { $extensions: racine, ...groupes };
}

const THEME = { modes: ["light", "dark"], default: "light" };

/** Monte un repository jouet, lance la commande et rend ce qu'elle a écrit et dit. */
function lancer({ tokens, configuration, contrats = {}, existante } = {}, arguments_ = SORTIE) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-tokens-css-"));
  try {
    if (configuration !== undefined) writeFileSync(join(racine, "ucm.config.json"), JSON.stringify(configuration));
    if (tokens !== undefined) {
      writeFileSync(join(racine, "tokens.json"), typeof tokens === "string" ? tokens : JSON.stringify(tokens));
    }
    for (const [nom, contrat] of Object.entries(contrats)) {
      mkdirSync(join(racine, "components", nom), { recursive: true });
      writeFileSync(join(racine, "components", nom, `${nom}.contract.json`), JSON.stringify(contrat));
    }
    const chemin = join(racine, "generated", "tokens.css");
    if (existante !== undefined) {
      mkdirSync(join(racine, "generated"), { recursive: true });
      writeFileSync(chemin, existante);
    }

    const log = [];
    const erreurs = [];
    const code = tokensCss(arguments_, {
      racine,
      ecrire: (texte) => log.push(texte),
      alerter: (texte) => erreurs.push(texte),
    });
    return {
      code,
      log: log.join("\n"),
      erreur: erreurs.join("\n"),
      css: existsSync(chemin) ? readFileSync(chemin, "utf8") : null,
    };
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

const lireAttendu = (nom) => readFileSync(new URL(`./cascade/${nom}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("un fichier sans mode donne la base seule sur :root, et la commande imprime sa taille", () => {
  const { code, css, log } = lancer({ tokens: documentAvec(undefined, { espace: { petit: nombre(4) } }) });
  assert.equal(code, 0);
  assert.equal(css, `${EN_TETE}:root {\n  --espace-petit: 4;\n}\n`);
  assert.match(log, /^generated\/tokens\.css : 1 règles, 1 déclarations, \d+ octets\.$/m);
});

test("deux axes croisés rendent la feuille écrite à la main pour la preuve de cascade", () => {
  const { code, css } = lancer({ tokens: DEUX_AXES });
  assert.equal(code, 0);
  assert.equal(css, `${EN_TETE}${lireAttendu("attendu-deux-axes.css")}`);
});

test("l'ordre de com.ucm.axes décide de l'ordre des règles, et le croisement suit l'axe dont le cône l'atteint", () => {
  const { code, css } = lancer({ tokens: avecOrdreDesAxes(DEUX_AXES, ["theme", "marque"]) });
  assert.equal(code, 0);
  assert.ok(css.indexOf('[data-theme="light"] {') < css.indexOf('[data-marque="m1"] {'));
  assert.ok(css.indexOf('[data-marque="m2"] {') < css.indexOf('@scope ([data-theme="dark"])'));
});

test("trois axes liés croisent chaque couple, et un défaut qui n'est pas le premier mode décide de :root", () => {
  const { code, css } = lancer({ tokens: TROIS_AXES });
  assert.equal(code, 0);
  assert.match(css, /^:root \{\n(?:.*\n)*? {2}--densite-espace: var\(--theme-fond\);\n/m);
  assert.match(css, /@scope \(\[data-densite="compact"\]\) \{\n {2}:where\(:scope, :scope \*\):is\(\[data-theme="light"\], \[data-theme="dark"\]\)/);
  assert.match(css, /@scope \(\[data-densite="compact"\]\) \{\n {2}:where\(:scope, :scope \*\):is\(\[data-marque="m1"\], \[data-marque="m2"\]\)/);
  assert.doesNotMatch(css, /data-libre="[xy]"\]\) \{\n {2}:where/, "un axe que rien ne croise ne reçoit aucun bloc");
});

test("chaque type s'écrit selon sa table, en base comme en mode, famille suivie du repli configuré", () => {
  const tokens = documentAvec({ theme: THEME }, {
    base: {
      couleur: { $type: "color", $value: { colorSpace: "display-p3", components: [0.07, 0.31, 0.62], alpha: 0.5 } },
      taille: { $type: "dimension", $value: { value: 16, unit: "px" } },
      duree: { $type: "duration", $value: { value: 0.2, unit: "s" } },
      courbe: { $type: "cubicBezier", $value: [0.4, 0, 0.2, 1.4] },
      graisse: nombre(600),
      famille: { $type: "fontFamily", $value: "Open Sans" },
      texte: { $type: "string", $value: "Dit \"bonjour\"\\" },
      visible: { $type: "boolean", $value: false },
    },
    theme: {
      couleur: feuille("theme", {
        light: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1 },
        dark: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1 },
      }, "color"),
      taille: feuille("theme", { light: { value: 4, unit: "px" }, dark: { value: 8, unit: "px" } }, "dimension"),
      texte: feuille("theme", { light: "clair", dark: "sombre" }, "string"),
      visible: feuille("theme", { light: true, dark: false }, "boolean"),
    },
  });
  const { code, css } = lancer({ tokens, configuration: { css: { fontFamilyFallback: "sans-serif" } } });
  assert.equal(code, 0);
  for (const ligne of [
    "  --base-couleur: color(display-p3 0.07 0.31 0.62 / 0.5);",
    "  --base-taille: 16px;",
    "  --base-duree: 0.2s;",
    "  --base-courbe: cubic-bezier(0.4, 0, 0.2, 1.4);",
    "  --base-graisse: 600;",
    '  --base-famille: "Open Sans", sans-serif;',
    '  --base-texte: "Dit \\"bonjour\\"\\\\";',
    "  --base-visible: false;",
  ]) {
    assert.ok(css.includes(`${ligne}\n`), ligne);
  }
  const sombre = css.slice(css.indexOf('[data-theme="dark"] {'));
  for (const ligne of [
    "  --theme-couleur: color(srgb 0 0 0 / 1);",
    "  --theme-taille: 8px;",
    '  --theme-texte: "sombre";',
    "  --theme-visible: false;",
  ]) {
    assert.ok(sombre.startsWith(`[data-theme="dark"] {\n`) && sombre.includes(`${ligne}\n`), ligne);
  }
});

test("une feuille sans valeur se déclare initial dans chaque contexte, est nommée, et ne change pas le code", () => {
  const { code, css, erreur } = lancer({ tokens: documentAvec(undefined, { a: { vide: nombre(null), plein: nombre(1) } }) });
  assert.equal(code, 0);
  assert.match(css, /:root \{\n {2}--a-vide: initial;\n {2}--a-plein: 1;\n\}/);
  assert.match(erreur, /« a\.vide » n'a pas de valeur : elle se déclare initial/);

  // Sans déclaration, `[data-theme="dark"]` hériterait de la valeur par défaut.
  const modes = lancer({ tokens: documentAvec({ theme: THEME }, { theme: { fond: feuille("theme", { light: 1, dark: null }) } }) });
  assert.equal(modes.code, 0);
  assert.match(modes.css, /\[data-theme="dark"\] \{\n {2}--theme-fond: initial;\n\}/);
  assert.match(modes.erreur, /« theme\.fond », en mode « dark », n'a pas de valeur/);
});

test("un alias vers une feuille absente est refusé, et la feuille précédente reste en place", () => {
  const refuse = lancer({ tokens: documentAvec(undefined, { a: { b: alias("{a.absente}") } }), existante: "ancienne" });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« a\.b » cite « a\.absente », absente du fichier de tokens/);
  assert.equal(refuse.css, "ancienne");

  const voisin = lancer({ tokens: documentAvec(undefined, { a: { b: alias("{a.c}"), c: nombre(1) } }) });
  assert.equal(voisin.code, 0);
  assert.match(voisin.css, /--a-b: var\(--a-c\);/);
});

test("deux chemins qui donnent la même propriété CSS sont refusés", () => {
  const refuse = lancer({ tokens: documentAvec(undefined, { a: { "b-c": nombre(1), b: { c: nombre(2) } } }) });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« a\.b-c » et « a\.b\.c » donnent la même propriété CSS « --a-b-c »/);

  const voisin = lancer({ tokens: documentAvec(undefined, { a: { "b-c": nombre(1), b: { d: nombre(2) } } }) });
  assert.equal(voisin.code, 0);
});

test("un cycle actif est refusé, un cycle qu'aucun contexte ne réalise est accepté", () => {
  const refuse = lancer({ tokens: documentAvec(undefined, { l: { x: alias("{l.y}"), y: alias("{l.x}") } }) });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /Cycle d'alias : l\.x → l\.y → l\.x\./);

  const voisin = lancer({
    tokens: documentAvec({ theme: THEME }, {
      theme: { x: feuille("theme", { light: "{theme.y}", dark: 2 }), y: feuille("theme", { light: 1, dark: "{theme.x}" }) },
    }),
  });
  assert.equal(voisin.code, 0);
});

test("un alias qui change de type dans un mode est refusé", () => {
  const document = (cible) => documentAvec({ theme: THEME }, {
    n: { nombre: nombre(3), autre: { $type: "dimension", $value: { value: 2, unit: "px" } } },
    theme: { taille: feuille("theme", { light: { value: 4, unit: "px" }, dark: cible }, "dimension") },
  });
  const refuse = lancer({ tokens: document("{n.nombre}") });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« theme\.taille », en mode « dark », cite « n\.nombre », de type « number » et non « dimension »/);

  assert.equal(lancer({ tokens: document("{n.autre}") }).code, 0);
});

test("une valeur que son type ne décrit pas est refusée, avec la feuille et le mode", () => {
  const refuse = lancer({
    tokens: documentAvec({ theme: THEME }, {
      theme: {
        couleur: feuille("theme", {
          light: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1 },
          dark: { colorSpace: "srgb", components: [0, 0, 0] },
        }, "color"),
      },
    }),
  });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« theme\.couleur », en mode « dark », porte une valeur que le type « color » ne décrit pas/);
});

test("un export antérieur aux axes est refusé avec la phrase de réexport, et --sans-modes écrit la base", () => {
  const tokens = documentAvec(undefined, { theme: { fond: feuille(undefined, { light: 1, dark: 2 }) } });
  const refuse = lancer({ tokens });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /réexportez les tokens depuis Figma/);
  assert.match(refuse.erreur, /--sans-modes/);

  const base = lancer({ tokens }, [...SORTIE, "--sans-modes"]);
  assert.equal(base.code, 0);
  assert.equal(base.css, `${EN_TETE}:root {\n  --theme-fond: 1;\n}\n`);
  assert.match(base.log, /--sans-modes/);
});

test("un axe écarté par l'export est refusé en nommant la feuille, et --sans-modes l'accepte", () => {
  const tokens = documentAvec({}, { marque: { primaire: feuille(undefined, { m1: 1, m2: 2 }) } });
  const refuse = lancer({ tokens });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« marque\.primaire » porte des modes sans axe/);
  assert.equal(lancer({ tokens }, [...SORTIE, "--sans-modes"]).code, 0);
});

test("un fichier incohérent est refusé, même avec --sans-modes", () => {
  const tokens = documentAvec({ theme: THEME }, { marque: { primaire: feuille("marque", { m1: 1, m2: 2 }) } });
  const refuse = lancer({ tokens }, [...SORTIE, "--sans-modes"]);
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /modes incohérents/);
});

test("une version future du format est refusée", () => {
  assert.equal(lancer({ tokens: documentAvec(undefined, { a: { b: nombre(1) } }, 3) }).code, 1);
});

/** Une feuille de `color` surchargée par `marque-b` dans le mode `dark`. */
function collectionEtendue(nomDeFeuille) {
  const fond = feuille("color", { light: 1, dark: 2 });
  fond.$extensions["com.ucm.extensions"] = { "marque-b": { dark: 3 } };
  return documentAvec({ color: { ...THEME, extensions: { "marque-b": { parent: "base" } } } }, {
    color: { [nomDeFeuille]: fond },
  });
}

test("une collection étendue donne ses intermédiaires, sa règle de repli et la règle propre de l'extension", () => {
  const { code, css, log } = lancer({ tokens: collectionEtendue("fond") });
  assert.equal(code, 0);
  assert.match(css, /\[data-color="dark"\] \{\n {2}--ucm-x-base--color-fond: 2;\n {2}--ucm-x-marque-b--color-fond: 3;\n\}/);
  assert.match(css, /:is\(\[data-color-extensions="base"\], \[data-color-extensions="marque-b"\]\) \{\n {2}--color-fond: var\(--ucm-x-base--color-fond\);\n\}/);
  assert.match(css, /\[data-color-extensions="marque-b"\] \{\n {2}--color-fond: var\(--ucm-x-marque-b--color-fond\);\n\}/);
  assert.match(log, /Axe « color-extensions » : attribut data-color-extensions, défaut « base »\./);
});

test("deux extensions dont les noms donnent la même propriété, ou une extension qui donne base, sont refusées", () => {
  const avecExtensions = (noms) => {
    const document = collectionEtendue("fond");
    document.$extensions["com.ucm.axes"].color.extensions = Object.fromEntries(noms.map((nom) => [nom, { parent: "base" }]));
    document.color.fond.$extensions["com.ucm.extensions"] = Object.fromEntries(noms.map((nom, rang) => [nom, { dark: 10 + rang }]));
    return document;
  };

  const homonymes = lancer({ tokens: avecExtensions(["marque-b", "marque_b"]) });
  assert.equal(homonymes.code, 1);
  assert.match(homonymes.erreur, /Les extensions « marque-b » et « marque_b » de l'axe « color » donnent le même nom CSS « marque-b »/);

  const base = lancer({ tokens: avecExtensions(["base!"]) });
  assert.equal(base.code, 1);
  assert.match(base.erreur, /L'extension « base! » de l'axe « color » donne le nom CSS « base », réservé à la collection elle-même/);

  assert.equal(lancer({ tokens: avecExtensions(["marque-b", "marque-c"]) }).code, 0);
});

test("un axe déclaré sous le nom de l'axe d'extension d'un autre est refusé en nommant ce dernier", () => {
  const document = collectionEtendue("fond");
  document.$extensions["com.ucm.axes"]["color-extensions"] = THEME;
  document["color-extensions"] = { fond: feuille("color-extensions", { light: 1, dark: 2 }) };
  const refuse = lancer({ tokens: document });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /Deux axes portent le nom « color-extensions », dont l'axe d'extension de « color »\./);
});

test("un token dont la propriété commence par --ucm-x- est refusé", () => {
  const refuse = lancer({ tokens: documentAvec(undefined, { ucm: { x: { fond: nombre(1) } } }) });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /« ucm\.x\.fond » donne la propriété « --ucm-x-fond », dont le préfixe --ucm-x- est réservé/);

  assert.equal(lancer({ tokens: documentAvec(undefined, { ucm: { y: { fond: nombre(1) } } }) }).code, 0);
});

test("sans fichier de tokens, un contrat qui cite un token refuse la commande ; sans lui, la feuille vide est écrite", () => {
  const contrat = { name: "Widget", structure: { tokens: { fill: "{couleurs.texte}" } } };
  const refuse = lancer({ contrats: { Widget: contrat } });
  assert.equal(refuse.code, 1);
  assert.match(refuse.erreur, /tokens\.json est introuvable, et un contrat cite des tokens : components\/Widget\/Widget\.contract\.json/);

  const vide = lancer({ contrats: { Widget: { name: "Widget", samples: { text: "{couleurs.texte}" } } } });
  assert.equal(vide.code, 0);
  assert.match(vide.css, /ne déclare rien/);
});

test("un repository neuf, sans dossier de contrats ni fichier de tokens, reçoit la feuille vide", () => {
  const vierge = lancer({});
  assert.equal(vierge.code, 0, vierge.erreur);
  assert.match(vierge.css, /ne déclare rien/);
});

test("l'attribut d'un axe vient de la configuration, et une clé qui ne nomme aucun axe est refusée", () => {
  const nomme = lancer({ tokens: DEUX_AXES, configuration: { modes: { theme: "data-mode" } } });
  assert.equal(nomme.code, 0);
  assert.match(nomme.css, /\[data-mode="dark"\] \{/);
  assert.doesNotMatch(nomme.css, /data-theme/);
  assert.match(nomme.log, /Axe « theme » : attribut data-mode, défaut « light »\./);

  assert.equal(lancer({ tokens: DEUX_AXES, configuration: { modes: { inconnu: "data-x" } } }).code, 2);
  assert.equal(lancer({ tokens: DEUX_AXES, configuration: { modes: ["data-x"] } }).code, 2);

  const sansModes = documentAvec(undefined, { a: { b: nombre(1) } });
  const orpheline = lancer({ tokens: sansModes, configuration: { modes: { theme: "data-mode" } } });
  assert.equal(orpheline.code, 2, "un fichier sans modes ne rend pas une clé de modes valide");
  assert.match(orpheline.erreur, /modes\.theme : aucun axe du fichier de tokens ne porte ce nom/);
  assert.equal(lancer({ tokens: sansModes, configuration: {} }).code, 0);

  const extension = lancer({ tokens: collectionEtendue("fond"), configuration: { modes: { "color-extensions": "data-marque" } } });
  assert.equal(extension.code, 0);
  assert.match(extension.css, /\[data-marque="marque-b"\] \{/);

  const ecarte = documentAvec({}, { marque: { primaire: feuille(undefined, { m1: 1, m2: 2 }) } });
  const repli = lancer({ tokens: ecarte, configuration: { modes: { marque: "data-marque" } } }, [...SORTIE, "--sans-modes"]);
  assert.equal(repli.code, 0, "une clé qui vise un axe écarté n'empêche pas le repli");
});

test("deux axes aux mêmes modes partagent un attribut malgré des défauts différents ; des modes différents sont refusés", () => {
  const partage = documentAvec({ theme: THEME, ambiance: { modes: ["dark", "light"], default: "dark" } }, {
    theme: { fond: feuille("theme", { light: 1, dark: 2 }) },
    ambiance: { fond: feuille("ambiance", { dark: 3, light: 4 }) },
  });
  const accepte = lancer({ tokens: partage, configuration: { modes: { theme: "data-mode", ambiance: "data-mode" } } });
  assert.equal(accepte.code, 0);
  assert.match(accepte.log, /L'attribut « data-mode » porte les axes « theme » \(défaut « light »\), « ambiance » \(défaut « dark »\)/);

  const differents = documentAvec({ theme: THEME, marque: { modes: ["m1", "m2"], default: "m1" } }, {
    theme: { fond: feuille("theme", { light: 1, dark: 2 }) },
    marque: { fond: feuille("marque", { m1: 3, m2: 4 }) },
  });
  const refuse = lancer({ tokens: differents, configuration: { modes: { theme: "data-mode", marque: "data-mode" } } });
  assert.equal(refuse.code, 2);
  assert.match(refuse.erreur, /dont les modes diffèrent/);
});

test("un nom accentué perd ses accents dans l'attribut et la propriété, et les garde dans la valeur du mode", () => {
  const { code, css } = lancer({
    tokens: documentAvec({ thème: { modes: ["clair", "sombre-été"], default: "clair" } }, {
      thème: { été: feuille("thème", { clair: 1, "sombre-été": 2 }) },
    }),
  });
  assert.equal(code, 0);
  assert.match(css, /\[data-theme="sombre-été"\] \{\n {2}--theme-ete: 2;\n\}/);
});

test("un guillemet ou un antislash dans un nom de mode s'échappe dans le sélecteur, comme dans une chaîne", () => {
  const { code, css } = lancer({
    tokens: documentAvec({ theme: { modes: ["clair", 'sombre"hc\\x'], default: "clair" } }, {
      theme: { fond: feuille("theme", { clair: 1, 'sombre"hc\\x': 2 }) },
      base: { texte: { $type: "string", $value: "ligne\nsuite\fpage\rfin" } },
    }),
  });
  assert.equal(code, 0);
  assert.match(css, /\n\[data-theme="sombre\\"hc\\\\x"\] \{\n {2}--theme-fond: 2;\n\}/);
  assert.match(css, /\n\[data-theme="clair"\] \{/);
  assert.ok(css.includes('  --base-texte: "ligne\\a suite\\c page\\d fin";\n'), "le saut de page ferme sinon la chaîne");
});

test("deux exécutions sur les mêmes entrées écrivent la même feuille", () => {
  assert.equal(lancer({ tokens: TROIS_AXES }).css, lancer({ tokens: TROIS_AXES }).css);
});

test("une invocation fautive rend 2 sans rien écrire", () => {
  assert.equal(lancer({ tokens: DEUX_AXES }, ["css"]).code, 2);
  assert.equal(lancer({ tokens: DEUX_AXES }, ["css", "--out"]).code, 2);
  assert.equal(lancer({ tokens: DEUX_AXES }, ["css", "--out", "a.css", "--inconnu"]).code, 2);
  assert.equal(lancer({ tokens: DEUX_AXES }, ["html", "--out", "a.css"]).code, 2);

  const entree = lancer({ tokens: DEUX_AXES }, ["css", "--out", "tokens.json"]);
  assert.equal(entree.code, 2);
  assert.match(entree.erreur, /que la commande lit/);
});

test("--out qui désigne le fichier de tokens sous une autre casse, ou un dossier, est refusé sans rien écrire", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-tokens-css-"));
  try {
    const source = JSON.stringify(documentAvec(undefined, { a: { b: nombre(1) } }));
    writeFileSync(join(racine, "tokens.json"), source);
    mkdirSync(join(racine, "dossier"));
    const erreurs = [];
    const lancerIci = (out) => tokensCss(["css", "--out", out], { racine, ecrire: () => {}, alerter: (texte) => erreurs.push(texte) });

    // Sous Windows et macOS, TOKENS.JSON désigne tokens.json. Ailleurs c'est un
    // autre fichier, que la commande a le droit d'écrire.
    if (existsSync(join(racine, "TOKENS.JSON"))) {
      assert.equal(lancerIci("TOKENS.JSON"), 2);
      assert.match(erreurs.join("\n"), /--out désigne TOKENS\.JSON, que la commande lit/);
    }
    assert.equal(lancerIci("dossier"), 2);
    assert.match(erreurs.join("\n"), /--out désigne le dossier dossier : nommez le fichier \.css à écrire/);
    assert.equal(readFileSync(join(racine, "tokens.json"), "utf8"), source);
    assert.deepEqual(readdirSync(racine).sort(), ["dossier", "tokens.json"]);

    assert.equal(lancerIci("dossier/tokens.css"), 0);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une feuille qui ne peut pas s'écrire rend 2, garde la précédente et ne laisse aucun fichier provisoire", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-tokens-css-"));
  try {
    writeFileSync(join(racine, "tokens.json"), JSON.stringify(documentAvec(undefined, { a: { b: nombre(1) } })));
    const erreurs = [];
    const code = tokensCss(["css", "--out", "tokens.css"], {
      racine,
      ecrire: () => {},
      alerter: (texte) => erreurs.push(texte),
      ecrireFichier: (chemin) => {
        writeFileSync(chemin, "demi");
        throw Object.assign(new Error("disque plein"), { code: "ENOSPC" });
      },
    });
    assert.equal(code, 2);
    assert.match(erreurs.join("\n"), /tokens\.css n'a pas pu être écrit \(ENOSPC\) : la feuille précédente reste en place/);
    assert.deepEqual(readdirSync(racine), ["tokens.json"]);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("ucm tokens passe par l'aiguillage, et l'aide nomme la commande", () => {
  const alertes = [];
  const lignes = [];
  assert.equal(executer(["tokens"], { racine: tmpdir(), ecrire: (texte) => lignes.push(texte), alerter: (texte) => alertes.push(texte) }), 2);
  assert.match(alertes.join("\n"), /ucm tokens attend une sous-commande : css/);

  executer(["--help"], { ecrire: (texte) => lignes.push(texte) });
  assert.match(lignes.join("\n"), /ucm tokens css --out <fichier>/);
});
