import assert from "node:assert/strict";
import test from "node:test";

import { erreursTypesTypographiques } from "../src/lecteurs/typography-token-types.mjs";

function contrat(tokens) {
  return { textStyles: { "body.large": { tokens } } };
}

const tokensValides = {
  primitives: {
    family: { $value: "Open Sans", $type: "string" },
    size: { $value: "16px", $type: "dimension" },
    weight: { $value: "SemiBold", $type: "string" },
    line: { $value: "24px", $type: "dimension" },
    tracking: { $value: "0px", $type: "dimension" },
  },
  typography: {
    body: {
      large: {
        family: { $value: "{primitives.family}", $type: "string" },
        size: { $value: "{primitives.size}", $type: "dimension" },
        weight: { $value: "{primitives.weight}", $type: "string" },
        line: { $value: "{primitives.line}", $type: "dimension" },
        tracking: { $value: "{primitives.tracking}", $type: "dimension" },
      },
    },
  },
};

test("les text styles acceptent les types DTCG attendus, à travers les alias", () => {
  assert.deepEqual(erreursTypesTypographiques(contrat({
    fontFamily: "{typography.body.large.family}",
    fontSize: "{typography.body.large.size}",
    fontWeight: "{typography.body.large.weight}",
    lineHeight: "{typography.body.large.line}",
    letterSpacing: "{typography.body.large.tracking}",
  }), tokensValides), []);
});

test("une famille passe sous les deux types que le producteur publie", () => {
  // La version 2 type une famille prouvée en `fontFamily`, et laisse en
  // `string` celle qu'aucun text style ni scope n'établit. Refuser l'un des
  // deux bloquerait la fusion sur un fichier que le designer ne peut pas
  // corriger.
  for (const type of ["fontFamily", "string"]) {
    const tokens = structuredClone(tokensValides);
    tokens.primitives.family.$type = type;
    tokens.typography.body.large.family.$type = type;

    assert.deepEqual(erreursTypesTypographiques(contrat({
      fontFamily: "{typography.body.large.family}",
    }), tokens), [], type);
  }
});

test("une famille d’un autre type reste refusée", () => {
  const tokens = structuredClone(tokensValides);
  tokens.primitives.family = { $value: 400, $type: "number" };
  tokens.typography.body.large.family = { $value: "{primitives.family}", $type: "number" };

  assert.deepEqual(erreursTypesTypographiques(contrat({
    fontFamily: "{typography.body.large.family}",
  }), tokens), [{
    chemin: "textStyles.body.large.tokens.fontFamily",
    reference: "{typography.body.large.family}",
    attendu: "fontFamily ou string",
    recu: "number",
  }]);
});

test("une hauteur de ligne numérique est refusée avant de gonfler le rendu CSS", () => {
  const tokens = structuredClone(tokensValides);
  tokens.primitives.line = { $value: 24, $type: "number" };
  tokens.typography.body.large.line = { $value: "{primitives.line}", $type: "number" };

  assert.deepEqual(erreursTypesTypographiques(contrat({
    lineHeight: "{typography.body.large.line}",
  }), tokens), [{
    chemin: "textStyles.body.large.tokens.lineHeight",
    reference: "{typography.body.large.line}",
    attendu: "dimension",
    recu: "number",
  }]);
});

test("un espacement et un retrait de paragraphe exigent une dimension", () => {
  const tokens = structuredClone(tokensValides);
  tokens.primitives.paragraphe = { $value: 12, $type: "number" };

  assert.deepEqual(erreursTypesTypographiques(contrat({
    paragraphSpacing: "{primitives.paragraphe}",
    paragraphIndent: "{primitives.size}",
  }), tokens), [{
    chemin: "textStyles.body.large.tokens.paragraphSpacing",
    reference: "{primitives.paragraphe}",
    attendu: "dimension",
    recu: "number",
  }]);
});
