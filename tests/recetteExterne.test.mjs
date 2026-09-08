/**
 * Le relevé de publication : ce que la recette externe seule couvre.
 *
 * Le relevé nomme des chemins sans refuser la publication, donc sa valeur tient
 * à sa précision. Ces tests tiennent ses deux frontières : les fichiers qui
 * déclenchent, et les lignes qui comptent dans leur diff.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { DECLENCHEURS, declencheursTouches, ligneEstDuCode } from "../scripts/recette-externe.mjs";

test("les quatre déclencheurs sont ceux que la recette nomme", () => {
  assert.deepEqual(
    DECLENCHEURS.map(({ nom }) => nom),
    [
      "le format publié ou sa fenêtre de lecture",
      "`ucm init` ou le workflow qu'il génère",
      "le routage GitHub du plugin",
      "la découverte d'un adaptateur",
    ],
  );
});

test("un changement sans déclencheur ne réclame aucune recette", () => {
  assert.deepEqual(
    declencheursTouches([
      "README.md",
      "packages/kit/src/lecteurs/diagnostic-markdown.mjs",
      "packages/plugin/src/contract/exportComponent.ts",
      "packages/cli/tests/cli.test.mjs",
    ]),
    [],
  );
});

test("chaque déclencheur se reconnaît à son fichier, et nomme ce fichier", () => {
  const touches = declencheursTouches([
    "packages/kit/src/format/version.ts",
    "packages/cli/src/init.mjs",
    "packages/plugin/src/github.ts",
    "packages/cli/src/adaptateur.mjs",
  ]);

  assert.equal(touches.length, 4, "les quatre déclencheurs répondent");
  for (const { nom, fichiers } of touches) {
    assert.equal(fichiers.length, 1, `${nom} doit citer le fichier qui l'a déclenché`);
  }
});

test("un schéma régénéré déclenche par son dossier, sans que personne l'ait listé", () => {
  const touches = declencheursTouches(["packages/kit/schema/ucm-contract.schema.json"]);

  assert.deepEqual(
    touches.map(({ nom }) => nom),
    ["le format publié ou sa fenêtre de lecture"],
  );
});

test("une ligne de commentaire ne compte pas comme un changement de code", () => {
  for (const ligne of [
    "  // Le tag est la valeur de la variante.",
    " * Un axe en `Hug` n'apparaît pas ici.",
    "/** Vrai si le node dispose ses enfants. */",
    "  */",
    "",
    "   ",
  ]) {
    assert.equal(ligneEstDuCode(ligne, "packages/kit/src/format/types.ts"), false, ligne);
  }
});

test("une ligne de code compte, y compris quand elle porte un commentaire de fin", () => {
  for (const ligne of [
    "export const CONTRACT_VERSION = '12.0';",
    "  return fichiers.filter((f) => f.length > 0); // et rien d'autre",
    "}",
  ]) {
    assert.equal(ligneEstDuCode(ligne, "packages/kit/src/format/version.ts"), true, ligne);
  }
});

test("dans le schéma, une description est de la prose et le reste est du code", () => {
  const schema = "packages/kit/schema/ucm-contract.schema.json";

  assert.equal(ligneEstDuCode('"description": "Le rôle de rendu.",', schema), false);
  assert.equal(ligneEstDuCode('"contractVersion": { "const": "12.0" },', schema), true);
  assert.equal(ligneEstDuCode('"required": ["name", "meta"],', schema), true);
});

test("un fichier voisin d'un déclencheur n'en est pas un", () => {
  assert.deepEqual(
    declencheursTouches([
      // Voisins immédiats, dans les mêmes dossiers que les quatre déclencheurs.
      "packages/kit/src/format/names.ts",
      "packages/cli/src/icons.mjs",
      "packages/plugin/src/fenetre.ts",
      // Et le piège du préfixe : un nom qui commence comme un déclencheur.
      "packages/cli/src/init.mjs.bak",
    ]),
    [],
    "seul un vrai déclencheur exige la recette ; le reste publierait sans elle",
  );
});
