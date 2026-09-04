/**
 * Non-régression du périmètre des états informatifs publiés sur une PR.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { selectionnerBilansDuRapport } from "../src/lecteurs/perimetre-rapport.mjs";

const bilans = [
  {
    fichier: "Alert.contract.json",
    relatif: ".\\src\\components\\Alert\\Alert.contract.json",
  },
  {
    fichier: "Button.contract.json",
    relatif: ".\\src\\components\\Button\\Button.contract.json",
  },
];

test("une PR Button ne reprend pas l'état en attente de Alert", () => {
  const selection = selectionnerBilansDuRapport(
    bilans,
    "src/components/Button/Button.contract.json",
  );

  assert.deepEqual(selection.map((bilan) => bilan.fichier), ["Button.contract.json"]);
});

test("une PR sans contrat modifié ne reprend aucun ancien état", () => {
  assert.deepEqual(selectionnerBilansDuRapport(bilans, ""), []);
});

test("un lancement hors pull request conserve le rapport global", () => {
  assert.equal(selectionnerBilansDuRapport(bilans, undefined), bilans);
});
