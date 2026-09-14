/**
 * Les caractéristiques d'un contrat : chacune relevée sur un contrat fabriqué
 * qui porte son champ, et absente du même contrat sans lui.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  CARACTERISTIQUES,
  axesDeTokens,
  caracteristiquesDuContrat,
  conesDesAxes,
} from "@ucm-kit/core/lecteurs";

import { contratCourant } from "./contrats-fabriques.mjs";

/** Un contrat minimal sans aucune caractéristique au-delà de `toujours` et `dimensions`. */
function base() {
  const contrat = contratCourant();
  contrat.meta.contractVersion = "13.0";
  delete contrat.viewStructures.st1.layout;
  return contrat;
}

const TOKENS = {
  $extensions: {
    "com.ucm.formatVersion": 2,
    "com.ucm.axes": { theme: { modes: ["light", "dark"], default: "light" } },
  },
  theme: {
    fond: {
      $type: "number",
      $value: 1,
      $extensions: { "com.ucm.axis": "theme", "com.ucm.modes": { light: 1, dark: 2 } },
    },
  },
  fixe: { $type: "number", $value: 3 },
};
const CONES = conesDesAxes(TOKENS, axesDeTokens(TOKENS).axes);

/** Pour chaque caractéristique, le geste qui la fait porter au contrat. */
const PORTER = {
  "reference-token": (contrat) => { contrat.variants[0].tokens = { background: "{couleurs.fond}" }; },
  "liaison-native": (contrat) => {
    contrat.propertyBindingDefinitions = { b1: { prop: "label", target: "visible", figmaPath: ["label"] } };
  },
  disposition: (contrat) => { contrat.viewStructures.st1.layout = "flex-column"; },
  grille: (contrat) => { contrat.viewStructures.st1.layout = "grid"; },
  "dimensions-par-taille": (contrat) => { contrat.structure.sizes = { small: { gap: "{espace}" } }; },
  "position-absolue": (contrat) => { contrat.viewStructures.st1.children = [{ slot: "badge", position: "absolute" }]; },
  rotation: (contrat) => { contrat.viewStructures.st1.children = [{ slot: "badge", rotation: "45deg" }]; },
  peinture: (contrat) => { contrat.variants[0].tokens = { background: "{couleurs.fond}" }; },
  "contour-border": (contrat) => {
    contrat.variants[0].strokes = { contour: { color: "{fixe}", width: "{fixe}", align: "inside" } };
    contrat.rendering.keyRoles = { strokes: { contour: "border" } };
  },
  "contour-ring": (contrat) => { contrat.variants[0].strokes = { ring: { color: "{fixe}", align: "outside" } }; },
  typographie: (contrat) => { contrat.viewTypographies = { ty1: [{ slotPath: ["label"], style: "corps" }] }; },
  troncature: (contrat) => {
    contrat.viewTypographies = { ty1: [{ slotPath: ["label"], style: "corps", lineClamp: 2 }] };
  },
  icone: (contrat) => { contrat.icons = { chevron: { figmaName: "Chevron", slot: "icon", size: "{fixe}" } }; },
  etats: (contrat) => {
    contrat.stateModel = { axis: "state", states: { default: {}, hover: { selector: ":hover" } }, precedence: ["hover"] };
  },
  focus: (contrat) => {
    contrat.stateModel = { axis: "state", states: { default: {}, focus: { selector: ":focus-visible" } }, precedence: ["focus"] };
  },
  composition: (contrat) => { contrat.composes = [{ component: "Icone", figmaLayer: "Icone" }]; },
  echantillon: (contrat) => { contrat.samples = { text: [{ slotPath: ["label"], value: "Envoyer" }] }; },
  modes: (contrat) => { contrat.variants[0].tokens = { background: "{theme.fond}" }; },
  "couverture-partielle": (contrat) => { contrat.meta.coverage.portable = "partial"; },
};

test("chaque caractéristique autre que toujours et dimensions a son contrat fabriqué", () => {
  const attendues = CARACTERISTIQUES.map(({ id }) => id).filter((id) => !["toujours", "dimensions"].includes(id));
  assert.deepEqual(Object.keys(PORTER).sort(), attendues.sort());
});

test("un contrat minimal ne porte que toujours et dimensions", () => {
  assert.deepEqual(caracteristiquesDuContrat(base(), new Map(), CONES), ["toujours", "dimensions"]);
});

for (const [id, porter] of Object.entries(PORTER)) {
  test(`la caractéristique ${id} est relevée quand son champ est porté, et seulement alors`, () => {
    const contrat = base();
    assert.equal(caracteristiquesDuContrat(contrat, new Map(), CONES).includes(id), false);
    porter(contrat);
    assert.equal(caracteristiquesDuContrat(contrat, new Map(), CONES).includes(id), true);
  });
}

test("un contour se classe par son rôle, jamais par le nom de sa clé seul", () => {
  const contrat = base();
  contrat.variants[0].strokes = { ring: { color: "{fixe}" } };
  contrat.rendering.keyRoles = { strokes: { ring: "border" } };
  const relevees = caracteristiquesDuContrat(contrat);
  assert.equal(relevees.includes("contour-border"), true);
  assert.equal(relevees.includes("contour-ring"), false);
});

test("sans cônes, la caractéristique modes n'est jamais relevée", () => {
  const contrat = base();
  PORTER.modes(contrat);
  assert.equal(caracteristiquesDuContrat(contrat).includes("modes"), false);
});

test("un contrat malformé ne lève pas et ne porte que toujours", () => {
  assert.deepEqual(caracteristiquesDuContrat(null), ["toujours"]);
  assert.deepEqual(caracteristiquesDuContrat({ variants: "x", viewStructures: [] }), ["toujours"]);
});
