/**
 * `.ucm/conventions.md` : chaque règle de lecture de la section 6.3 du plan
 * des aides, avec le cas voisin qu'elle laisse passer.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  conventionsLesPlusProches,
  empreinteDEcriture,
  lireConventions,
  marqueurDeCopie,
  sectionsARelire,
} from "../src/conventions.mjs";

const AIDES = new Map([
  ["composant", { ancrage: false, ecriture: "Un fichier par composant." }],
  ["contour-ring", { ancrage: false, ecriture: "`outline: <width> solid <color>`" }],
  ["focus-clavier", { ancrage: true, ecriture: "" }],
]);

test("le fichier le plus proche s'applique, et la recherche s'arrête au dossier de ucm.config.json", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-conventions-"));
  try {
    mkdirSync(join(racine, ".ucm"), { recursive: true });
    writeFileSync(join(racine, "ucm.config.json"), "{}");
    writeFileSync(join(racine, ".ucm", "conventions.md"), "racine");
    mkdirSync(join(racine, "apps", "mobile", ".ucm"), { recursive: true });
    writeFileSync(join(racine, "apps", "mobile", ".ucm", "conventions.md"), "mobile");
    mkdirSync(join(racine, "apps", "web", "src"), { recursive: true });

    assert.equal(conventionsLesPlusProches(join(racine, "apps", "mobile", "src"), racine), join(racine, "apps", "mobile", ".ucm", "conventions.md"));
    assert.equal(conventionsLesPlusProches(join(racine, "apps", "web", "src"), racine), join(racine, ".ucm", "conventions.md"));

    mkdirSync(join(racine, "apps", "web", "sous-repo"), { recursive: true });
    writeFileSync(join(racine, "apps", "web", "sous-repo", "ucm.config.json"), "{}");
    assert.equal(conventionsLesPlusProches(join(racine, "apps", "web", "sous-repo"), racine), null);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("les commentaires HTML sont retirés, sauf le marqueur ucm:copie", () => {
  const { tete, sections } = lireConventions([
    "<!-- ucm : marche à suivre, retirée à la lecture -->",
    "Stack : CSS Modules. <!-- note -->",
    "## contour-ring",
    marqueurDeCopie("contour-ring", "0.1.29", AIDES.get("contour-ring").ecriture),
    "Classe `ring`.",
  ].join("\n"), AIDES);
  assert.equal(tete, "Stack : CSS Modules.");
  assert.equal(sections.get("contour-ring").texte, "Classe `ring`.");
  assert.deepEqual(sections.get("contour-ring").copie, {
    aide: "contour-ring",
    version: "0.1.29",
    empreinte: empreinteDEcriture(AIDES.get("contour-ring").ecriture),
  });
});

test("ecritures-par-defaut ne se lit que sur la première ligne non vide, après les commentaires", () => {
  assert.equal(lireConventions("<!-- x -->\n\necritures-par-defaut: non\nStack.", AIDES).ecrituresParDefaut, false);
  assert.equal(lireConventions("ecritures-par-defaut: oui\nStack.", AIDES).ecrituresParDefaut, true);
  const ailleurs = lireConventions("Stack.\necritures-par-defaut: non", AIDES);
  assert.equal(ailleurs.ecrituresParDefaut, true);
  assert.match(ailleurs.tete, /ecritures-par-defaut: non/);
  assert.deepEqual(lireConventions("ecritures-par-defaut: parfois", AIDES).anomalies, [
    "ecritures-par-defaut vaut « parfois » : seules les valeurs oui et non existent.",
  ]);
});

test("une section s'ouvre à ## hors d'un bloc de code, jamais à un titre setext", () => {
  const { tete, sections } = lireConventions([
    "Stack",
    "=====",
    "```md",
    "## contour-ring",
    "```",
    "## focus-clavier",
    "`:focus-visible`",
  ].join("\n"), AIDES);
  assert.match(tete, /## contour-ring/);
  assert.deepEqual([...sections.keys()], ["focus-clavier"]);
});

test("une ligne Contrôle ajoute ses commandes à la preuve, espace insécable compris, et quitte le texte", () => {
  const { controles, sections } = lireConventions([
    "Contrôle : `npm run typecheck`",
    "## contour-ring",
    "Classe `ring`.",
    "Contrôle : `npm run lint:css` et `npm run stylelint`",
  ].join("\n"), AIDES);
  assert.deepEqual(controles, ["npm run typecheck"]);
  assert.deepEqual(sections.get("contour-ring").controles, ["npm run lint:css", "npm run stylelint"]);
  assert.equal(sections.get("contour-ring").texte, "Classe `ring`.");
});

test("un titre inconnu, une section en double, une section composant et une référence de token sont signalés", () => {
  const { sections, anomalies } = lireConventions([
    "## inconnue",
    "x",
    "## contour-ring",
    "Première.",
    "## contour-ring",
    "Seconde.",
    "## composant",
    "y",
    "## focus-clavier",
    "Couleur `{couleurs.focus}`.",
  ].join("\n"), AIDES);
  assert.equal(sections.get("contour-ring").texte, "Première.");
  assert.deepEqual(anomalies, [
    "La section « inconnue » ne nomme aucune aide.",
    "La section « contour-ring » est écrite deux fois : seule la première s'applique.",
    "La section « composant » ne s'applique pas : le texte avant la première section est l'écriture de cette aide.",
    "La section « focus-clavier » cite une référence de token : une écriture ne dépend d'aucune valeur de contrat.",
  ]);
});

test("une section copiée se relit quand l'écriture par défaut a changé depuis la copie, et seulement alors", () => {
  const texte = (ecriture) => `## contour-ring\n${marqueurDeCopie("contour-ring", "0.1.29", ecriture)}\nClasse.`;
  const aJour = lireConventions(texte(AIDES.get("contour-ring").ecriture), AIDES);
  assert.deepEqual(sectionsARelire(aJour, AIDES), []);

  const perimee = lireConventions(texte("`box-shadow: 0 0 0 <width> <color>`"), AIDES);
  assert.deepEqual(sectionsARelire(perimee, AIDES), [{ nom: "contour-ring", version: "0.1.29", sansEmpreinte: false }]);

  const sansEmpreinte = lireConventions("## contour-ring\n<!-- ucm:copie contour-ring 0.1.29 -->\nClasse.", AIDES);
  assert.deepEqual(sectionsARelire(sansEmpreinte, AIDES), [{ nom: "contour-ring", version: "0.1.29", sansEmpreinte: true }]);
});

test("la recherche des conventions ne sort jamais du repository", () => {
  const parent = mkdtempSync(join(tmpdir(), "ucm-conventions-"));
  try {
    const racine = join(parent, "repository");
    mkdirSync(join(parent, ".ucm"), { recursive: true });
    writeFileSync(join(parent, ".ucm", "conventions.md"), "au-dessus");
    mkdirSync(racine, { recursive: true });
    assert.equal(conventionsLesPlusProches(parent, racine), null);
    assert.equal(conventionsLesPlusProches(racine, racine), null, "aucun fichier dans le repository");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
