/**
 * Verrouille le statut de l'écart contrat ↔ code dans le rapport : il
 * s'annonce, il n'accuse pas l'export, et il ne refuse aucune fusion.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  aUnEcartDeParite,
  resumeTerminalEcartsDeParite,
  sectionEcartsDeParite,
} from "../src/lecteurs/diagnostic-parite.mjs";

function bilan(parite = {}, fichier = "StressTest.contract.json") {
  return {
    fichier,
    relatif: `./src/components/${fichier.replace(".contract.json", "")}/${fichier}`,
    parite: {
      implementationAbsente: false,
      interfaceAbsente: null,
      fonctionAbsente: null,
      manquantes: [],
      typesIncorrects: [],
      booleensNonUtilises: [],
      compositionsIncorrectes: [],
      ...parite,
    },
  };
}

const enSurplus = bilan({
  compositionsIncorrectes: [
    { component: "Alert", attendu: 1, rendu: 2 },
    { component: "TileLink", attendu: 7, rendu: 14 },
  ],
});

test("un composant conforme ne produit aucune section", () => {
  assert.deepEqual(sectionEcartsDeParite([bilan()]), []);
});

test("un contrat encore sans implémentation ne produit aucune section", () => {
  assert.deepEqual(sectionEcartsDeParite([bilan({ implementationAbsente: true })]), []);
});

/**
 * Le cœur de la correction : ce constat s'écrivait en ❌ sous un titre qui
 * refusait la fusion. Il accusait le contrat, alors qu'il décrit son implémentation.
 */
test("l'écart s'annonce en avertissement, jamais en erreur", () => {
  const section = sectionEcartsDeParite([enSurplus]).join("\n");

  assert.match(section, /^### ⚠️ /m);
  assert.doesNotMatch(section, /❌/);
  assert.doesNotMatch(section, /bloqu/i);
});

test("l'écart nomme le composant fautif, pas le design", () => {
  const section = sectionEcartsDeParite([enSurplus]).join("\n");

  assert.match(section, /Le code est en retard sur le contrat : `StressTest\.contract\.json`/);
  assert.match(section, /Le contrat est valide/);
  assert.match(section, /\*\*Votre design n'est pas en cause\*\*/);
  assert.match(section, /Un développeur doit mettre à jour l'API ou le rendu/);
});

test("chaque cardinalité en écart est détaillée telle qu'elle a été mesurée", () => {
  const section = sectionEcartsDeParite([enSurplus]).join("\n");

  assert.match(section, /déclare 1 occurrence de `Alert`, mais le composant en rend 2/);
  assert.match(section, /déclare 7 occurrences de `TileLink`, mais le composant en rend 14/);
});

/**
 * Une interface absente rend tout le reste faux : chaque prop paraîtrait
 * manquante. Le diagnostic nomme la cause, pas ses conséquences.
 */
test("une interface absente est la seule cause citée", () => {
  const section = sectionEcartsDeParite([
    bilan({ interfaceAbsente: "StressTestProps", manquantes: ["variant", "size"] }),
  ]).join("\n");

  assert.match(section, /L'interface `StressTestProps` est absente\./);
  assert.doesNotMatch(section, /variant/);
});

test("une fonction introuvable emporte son propre geste correctif", () => {
  const section = sectionEcartsDeParite([bilan({ fonctionAbsente: "StressTest" })]).join("\n");

  assert.match(section, /La fonction `StressTest` est introuvable\./);
  assert.match(section, /nommer la fonction comme le fichier/);
});

test("chaque composant en écart a sa propre section", () => {
  const section = sectionEcartsDeParite([
    enSurplus,
    bilan({ manquantes: ["disabled"] }, "Button.contract.json"),
  ]).join("\n");

  assert.equal(section.match(/^### ⚠️ /gm).length, 2);
});

test("le rappel terminal compte les composants et dit qu'il ne bloque pas", () => {
  assert.equal(resumeTerminalEcartsDeParite([bilan()]), null);

  const resume = resumeTerminalEcartsDeParite([
    enSurplus,
    bilan({ manquantes: ["disabled"] }, "Button.contract.json"),
  ]);

  assert.match(resume, /^⚠ 2 composants en retard sur leur contrat\./);
  assert.match(
    resumeTerminalEcartsDeParite([enSurplus]),
    /^⚠ 1 composant en retard sur son contrat\./,
  );
  assert.match(resume, /n'est pas bloquée/);
  assert.match(resume, /Ne réexportez pas depuis Figma/);
});

test("aUnEcartDeParite ignore une implémentation encore absente", () => {
  assert.equal(aUnEcartDeParite(bilan({ implementationAbsente: true })), false);
  assert.equal(aUnEcartDeParite(enSurplus), true);
});
