import assert from "node:assert/strict";
import test from "node:test";

import {
  indexerTokensDtcg,
  cheminDeReference,
  referencesAbsentes,
} from "../src/lecteurs/tokens-dtcg.mjs";

const tokens = {
  primitives: {
    couleurs: {
      terracota: { $value: "#b4552d", $type: "color" },
    },
    dimensions: {
      2: { $value: "4px", $type: "dimension" },
    },
  },
  layouts: {
    sizing: {
      // Figma nomme réellement ces tokens ainsi : une virgule décimale.
      "0,5": { $value: "{primitives.dimensions.2}", $type: "dimension" },
    },
  },
};

test("un chemin de token se retrouve tel qu'il est écrit, sans traduction", () => {
  const index = indexerTokensDtcg(tokens);
  assert.equal(index.get("primitives.couleurs.terracota").$value, "#b4552d");
  assert.equal(index.get("layouts.sizing.0,5").$type, "dimension");
});

test("un groupe n'est pas un token, même quand il porte un $type", () => {
  const index = indexerTokensDtcg({
    typographie: { $type: "dimension", corps: { $value: "16px" } },
  });
  assert.deepEqual([...index.keys()], ["typographie.corps"]);
});

test("une feuille sans $type hérite de celui de son groupe, comme DTCG le prévoit", () => {
  const index = indexerTokensDtcg({
    espacements: { $type: "dimension", petit: { $value: "4px" } },
  });
  assert.equal(index.get("espacements.petit").$type, "dimension");
});

test("le $type le plus proche l'emporte sur celui d'un groupe plus haut", () => {
  const index = indexerTokensDtcg({
    marque: {
      $type: "color",
      trait: { $type: "dimension", epaisseur: { $value: "1px" } },
      fond: { $value: "#fff" },
    },
  });
  assert.equal(index.get("marque.trait.epaisseur").$type, "dimension");
  assert.equal(index.get("marque.fond").$type, "color");
});

test("le $type propre d'une feuille n'est pas écrasé par l'héritage", () => {
  const index = indexerTokensDtcg({
    groupe: { $type: "color", feuille: { $value: "2px", $type: "dimension" } },
  });
  assert.equal(index.get("groupe.feuille").$type, "dimension");
});

test("les métadonnées de groupe ne fabriquent pas de chemins de token", () => {
  const index = indexerTokensDtcg({
    groupe: {
      $type: "color",
      $description: "les couleurs de marque",
      // Une extension de fournisseur porte des données quelconques, `$value`
      // compris : la descendre inventerait un token que personne n'a déclaré.
      $extensions: { "com.figma": { valeurDOrigine: { $value: "#eee" } } },
      fond: { $value: "#fff" },
    },
  });
  assert.deepEqual([...index.keys()], ["groupe.fond"]);
});

test("un arbre qui n'est pas un objet n'indexe rien plutôt que de lever", () => {
  for (const valeur of [null, undefined, "tokens", 12, ["a"]]) {
    assert.equal(indexerTokensDtcg(valeur).size, 0);
  }
});

test("une référence rend son chemin, une chaîne quelconque n'en rend aucun", () => {
  assert.equal(cheminDeReference("{a.b.c}"), "a.b.c");
  assert.equal(cheminDeReference("{marque}"), "marque");
  assert.equal(cheminDeReference("#b4552d"), null);
  assert.equal(cheminDeReference("{a b}"), null);
  assert.equal(cheminDeReference("{a}{b}"), null);
  assert.equal(cheminDeReference(undefined), null);
});

test("une référence présente dans les tokens n'est pas déclarée absente", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["{primitives.couleurs.terracota}"], index),
    [],
  );
});

test("un token nommé avec une virgule est reconnu, là où la projection CSS le perdait", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(referencesAbsentes(["{layouts.sizing.0,5}"], index), []);
});

test("les absentes sont rendues triées, pas dans l'ordre du relevé", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(new Set(["{z.absent}", "{a.absent}"]), index),
    ["{a.absent}", "{z.absent}"],
  );
});

test("une entrée qui n'a pas la forme d'une référence est absente elle aussi", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["primitives.couleurs.terracota"], index),
    ["primitives.couleurs.terracota"],
  );
});

test("un groupe existant n'est pas un token qu'une référence puisse citer", () => {
  const index = indexerTokensDtcg(tokens);
  assert.deepEqual(
    referencesAbsentes(["{primitives.couleurs}"], index),
    ["{primitives.couleurs}"],
  );
});
