/**
 * Régénère l'instantané des refus lu par `tests/refus-enregistres.test.mjs`.
 *
 * Il IMPORTE le harnais du test au lieu d'en recopier le corps. C'est la seule
 * forme acceptable : un générateur qui recalculerait les verdicts à sa façon
 * finirait par mesurer autre chose que ce que le test compare, et l'instantané
 * cesserait de prouver quoi que ce soit sans qu'aucun rouge n'apparaisse.
 *
 * À lancer UNIQUEMENT quand un changement de verdict est voulu et compris. La
 * régénération est le geste qui efface la preuve : elle se justifie dans le
 * message de commit, jamais après coup.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { corpusDeMesure, releverLesRefus } from "../tests/refus-enregistres.test.mjs";

const ici = dirname(fileURLToPath(import.meta.url));
const releve = Object.fromEntries(
  corpusDeMesure().map(([nom, contrat]) => [nom, releverLesRefus(contrat)]),
);
const chemin = join(ici, "..", "tests", "refus-enregistres.json");
writeFileSync(chemin, `${JSON.stringify(releve, null, 2)}\n`, "utf8");

for (const [nom, mesure] of Object.entries(releve)) {
  console.log(
    `${nom} : ${mesure.mutations} mutations, ${mesure.refusees} refusées, `
      + `${mesure.controlesDeclenches.length} contrôles exercés`,
  );
}
