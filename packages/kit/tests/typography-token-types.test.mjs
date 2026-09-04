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
