import assert from "node:assert/strict";
import test from "node:test";
import {
  resumeTerminalTokensManquants,
  sectionTokensManquants,
} from "../src/lecteurs/diagnostic-tokens.mjs";

const sourceTokens = "src/tokens/tokens.json";

const CONTRAT_AVEC_REFERENCE_ABSENTE = [{
  fichier: "StressTest.contract.json",
  manquants: ["{components.stresstest.info.scalewrap.colors.scale-1}"],
}];

test("une référence de contrat absente des tokens est un avertissement non bloquant", () => {
  const markdown = sectionTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, {
    tokensModifies: true,
    sourceTokens,
  }).join("\n");
  const terminal = resumeTerminalTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, sourceTokens);

  assert.match(markdown, /tokens\.json` est la source de vérité/);
  assert.match(markdown, /ne bloque pas la fusion/);
  assert.match(markdown, /StressTest\.contract\.json/);
  assert.match(markdown, /components\.stresstest\.info\.scalewrap\.colors\.scale-1/);
  assert.match(markdown, /réexportez les composants concernés/i);
  assert.doesNotMatch(markdown, /adaptez leurs implémentations/);
  assert.match(terminal, /ne bloque pas la fusion/);
});

test("hors PR de tokens, le designer vérifie d'abord que la source est à jour", () => {
  const markdown = sectionTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, {
    tokensModifies: false,
    sourceTokens,
  }).join("\n");

  assert.match(markdown, /Vérifiez que l'export de tokens est à jour/);
  assert.match(markdown, /réexportez les composants concernés/);
});

test("aucune référence absente ne produit de section", () => {
  assert.deepEqual(sectionTokensManquants([], { tokensModifies: true, sourceTokens }), []);
  assert.equal(resumeTerminalTokensManquants([], sourceTokens), null);
});
