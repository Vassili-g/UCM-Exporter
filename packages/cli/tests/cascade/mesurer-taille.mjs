/**
 * La taille de la feuille qu'écrit `ucm tokens css` pour une collection
 * étendue, imprimée en JSON.
 * Usage : `node packages/cli/tests/cascade/mesurer-taille.mjs [extensions] [surcharges]`.
 */
import { axesDeTokens, contextesDesAxes } from "@ucm-kit/core/lecteurs";

import { attributsDesAxes, feuilleDesTokens, statistiquesDeFeuille } from "../../src/tokens-css.mjs";
import { documentDeTaille } from "./documents.mjs";

const extensions = Number(process.argv[2] ?? 500);
const surchargesParExtension = Number(process.argv[3] ?? 10);

const document = documentDeTaille({ extensions, surchargesParExtension });
const debut = performance.now();
const { axes } = axesDeTokens(document);
const { attributs } = attributsDesAxes(contextesDesAxes(document, axes));
const { css, refus } = feuilleDesTokens(document, { axes, attributs });
const millisecondes = Math.round(performance.now() - debut);

console.log(JSON.stringify({
  extensions,
  surchargesParExtension,
  modes: 2,
  feuilles: 2 * extensions * surchargesParExtension,
  refus: refus.length,
  ...statistiquesDeFeuille(css),
  millisecondes,
}, null, 2));
