import test from "node:test";
import assert from "node:assert/strict";
import { libelleNombre, rendreDiagnostic } from "../src/lecteurs/diagnostic-markdown.mjs";

test("libelleNombre choisit le singulier et le pluriel", () => {
  assert.equal(libelleNombre(1, "composant"), "1 composant");
  assert.equal(libelleNombre(2, "composant"), "2 composants");
  assert.equal(libelleNombre(2, "contrat", "contrats"), "2 contrats");
});

test("un diagnostic présente le constat avant l'action et le statut", () => {
  const lignes = rendreDiagnostic({
    severity: "error",
    title: "Le code n'est plus conforme aux contrats",
    count: 2,
    itemSingular: "composant",
    summary: "Les tests de conformité échouent pour :",
    items: ["Alert", "Button"],
    detailsTitle: "Écarts détectés",
    details: ["Alert : le texte utilise un autre style."],
    action: "Un développeur doit mettre à jour les composants.",
    status: "La fusion reste bloquée.",
  });
  const rapport = lignes.join("\n");

  assert.ok(rapport.indexOf("Les tests de conformité") < rapport.indexOf("Alert"));
  assert.ok(rapport.indexOf("Écarts détectés") < rapport.indexOf("Action"));
  assert.ok(rapport.indexOf("Action") < rapport.indexOf("La fusion reste bloquée"));
  assert.doesNotMatch(rapport, /\w+\(s\)/);
  assert.doesNotMatch(rapport, /—/);
});
