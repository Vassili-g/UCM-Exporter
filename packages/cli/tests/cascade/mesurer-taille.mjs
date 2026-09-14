/**
 * La taille de la feuille émise pour une collection étendue, imprimée en JSON.
 * Usage : `node packages/cli/tests/cascade/mesurer-taille.mjs [extensions] [surcharges]`.
 */
import { documentDeTaille } from "./documents.mjs";
import { emettre, statistiques } from "./emetteur-provisoire.mjs";

const extensions = Number(process.argv[2] ?? 500);
const surchargesParExtension = Number(process.argv[3] ?? 10);

const document = documentDeTaille({ extensions, surchargesParExtension });
const debut = performance.now();
const { css } = emettre(document);
const millisecondes = Math.round(performance.now() - debut);

console.log(JSON.stringify({
  extensions,
  surchargesParExtension,
  modes: 2,
  feuilles: 2 * extensions * surchargesParExtension,
  ...statistiques(css),
  millisecondes,
}, null, 2));
