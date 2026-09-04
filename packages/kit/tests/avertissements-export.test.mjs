import assert from "node:assert/strict";
import test from "node:test";
import {
  avertissementsCorrigeables,
  resumeTerminalAvertissements,
  sectionAvertissementsExport,
} from "../src/lecteurs/avertissements-export.mjs";

const LIEN_FIGMA =
  "Lien vers Figma absent du contrat : l’API ne le fournit qu’aux plugins privés d’organisation.";
const GAP_NON_LIE =
  "Layer « Severity=Info, Variant=Standard », gap : aucune variable Figma n'est reliée.";

const contrat = (warnings) => ({ meta: { warnings } });
const contratV8 = (diagnostics) => ({ meta: { warnings: [], diagnostics } });

test("le lien Figma absent ne compte pas comme un point à corriger", () => {
  // Il tombe à chaque export et personne ne peut le lever : le compter ferait
  // afficher un avertissement sur toutes les pull requests, indéfiniment.
  assert.deepEqual(avertissementsCorrigeables(contrat([LIEN_FIGMA])), []);
});

test("une liaison Figma manquante reste un point à corriger", () => {
  assert.deepEqual(avertissementsCorrigeables(contrat([LIEN_FIGMA, GAP_NON_LIE])), [GAP_NON_LIE]);
});

test("une notice v10 explique une piste FIXED sans devenir un point à corriger", () => {
  const pisteFixe = "La ligne 1 est publiée en pixels, exception propre aux grilles.";
  assert.deepEqual(avertissementsCorrigeables(contratV8([{
    code: "UCM_EXPORT_NOTICE",
    severity: "warning",
    message: pisteFixe,
  }])), []);
});

test("un diagnostic structuré de perte portable reste corrigeable", () => {
  assert.deepEqual(avertissementsCorrigeables(contratV8([{
    code: "UCM_PORTABLE_PROJECTION_WARNING",
    severity: "warning",
    message: GAP_NON_LIE,
  }])), [GAP_NON_LIE]);
});

test("un contrat sans champ warnings ne fait pas tomber la lecture", () => {
  assert.deepEqual(avertissementsCorrigeables({}), []);
  assert.deepEqual(avertissementsCorrigeables(contrat("pas un tableau")), []);
  assert.deepEqual(avertissementsCorrigeables(null), []);
});

test("sans rien à signaler, le rapport reste exactement ce qu’il était", () => {
  assert.deepEqual(sectionAvertissementsExport([{ fichier: "Button.contract.json", avertissements: [] }]), []);
  assert.equal(resumeTerminalAvertissements([{ fichier: "Button.contract.json", avertissements: [] }]), null);
});

test("un point non décrit apparaît sous un verdict vert, sans se donner pour un blocage", () => {
  // Le cas qui a motivé ce module : le contrat est cohérent, donc rien ne
  // bloquait, et le gap resté en valeur brute passait sous un ✅ silencieux.
  const markdown = sectionAvertissementsExport([
    { fichier: "Button.contract.json", avertissements: [GAP_NON_LIE] },
  ]).join("\n");

  assert.match(markdown, /L'export n'a pas pu décrire certaines informations \(1 point\)/);
  assert.match(markdown, /Button\.contract\.json/);
  assert.match(markdown, /aucune variable Figma n'est reliée/);
  assert.match(markdown, /absentes des contrats/);
  assert.match(markdown, /ne bloquent pas la fusion/);
  assert.match(markdown, /#### Action/);
});

test("sur un rapport rouge, un avertissement n'est pas confondu avec le blocage", () => {
  const markdown = sectionAvertissementsExport(
    [{ fichier: "Button.contract.json", avertissements: [GAP_NON_LIE] }],
    { bloquant: true },
  ).join("\n");

  assert.match(markdown, /ne bloquent pas la fusion à eux seuls/);
  assert.match(markdown, /même composant et la même propriété que l'erreur bloquante/);
  assert.match(markdown, /Corrigez chaque point dans Figma/);
});

test("le total additionne les points de tous les contrats de la pull request", () => {
  const markdown = sectionAvertissementsExport([
    { fichier: "Alert.contract.json", avertissements: [GAP_NON_LIE] },
    { fichier: "Button.contract.json", avertissements: [GAP_NON_LIE, "Autre point"] },
  ]).join("\n");

  assert.match(markdown, /L'export n'a pas pu décrire certaines informations \(3 points\)/);
  assert.match(resumeTerminalAvertissements([
    { fichier: "Alert.contract.json", avertissements: [GAP_NON_LIE] },
    { fichier: "Button.contract.json", avertissements: [GAP_NON_LIE, "Autre point"] },
  ]), /3 points signalés/);
});
