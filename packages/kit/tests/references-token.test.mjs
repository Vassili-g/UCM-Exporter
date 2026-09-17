/** Tests de la forme d'une référence, et du relevé des références d'un contrat. */
import assert from "node:assert/strict";
import test from "node:test";

import { collecterReferences, sansEchantillon } from "../src/lecteurs/references-token.mjs";

test("un texte de maquette en forme de référence n'est pas une référence", () => {
  // Le cas qui a motivé l'exclusion : un DS d'assurance écrit « {montant.total} »
  // dans une maquette. Sans elle, le rapport enverrait le designer relier une
  // variable que personne n'a jamais voulu créer.
  const contrat = {
    tokensUsed: ["{colors.surface}"],
    structure: { children: [] },
    variants: [{ tokens: { surface: "{colors.surface}" }, sample: "s1" }],
    samples: {
      s1: {
        text: [
          // `REFERENCE` est ancrée : seul un texte qui est une référence compte.
          { slotPath: ["a"], figmaLayer: "Gabarit", value: "{montant.total}" },
          { slotPath: ["b"], figmaLayer: "Phrase", value: "Total : {montant.total}" },
        ],
        composes: [{ figmaLayer: "B", component: "Button", args: { label: "{piege.absolu}" } }],
      },
    },
  };

  assert.deepEqual(
    [...collecterReferences(sansEchantillon(contrat))].sort(),
    ["{colors.surface}"],
  );
  // Sans l'exclusion, les deux pièges remonteraient.
  assert.equal(collecterReferences(contrat).size, 3);
});

test("le relevé garde l'ordre de lecture et atteint 10 000 niveaux sans épuiser la pile", () => {
  let profonde = "{b.profonde}";
  for (let niveau = 0; niveau < 10_000; niveau += 1) profonde = { suivante: [profonde] };
  const valeur = { a: "{a.premiere}", b: profonde, c: ["{c.derniere}", "{a.premiere}"] };

  assert.deepEqual([...collecterReferences(valeur)], ["{a.premiere}", "{b.profonde}", "{c.derniere}"]);
});

test("sansEchantillon laisse tout le reste intact et ne mute pas son entrée", () => {
  const contrat = { name: "X", samples: { s1: {} }, props: {} };
  const corps = sansEchantillon(contrat);
  assert.deepEqual(corps, { name: "X", props: {} });
  assert.ok(contrat.samples, "l'original garde son catalogue");
  assert.equal(sansEchantillon(null), null);
});
