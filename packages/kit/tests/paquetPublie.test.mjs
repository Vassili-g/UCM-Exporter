/**
 * Le paquet s'importe-t-il avec Node tout court ?
 *
 * Tous les autres tests passent par `tsx`, qui tolère un import relatif sans
 * extension. Node en ESM ne le tolère pas : un `dist/` compilé avec des
 * spécificateurs nus s'importe donc parfaitement ici et casse net chez le
 * premier consommateur qui l'exécute — ce qui est arrivé, découvert en
 * installant le tarball dans le Playground, pas par la suite de tests.
 *
 * Ce test relance donc un `node` NEUF, sans `tsx`, et lui demande de traverser
 * la carte `exports` comme un consommateur installé le ferait.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Importe un sous-chemin dans un Node vierge et rend son code de sortie. */
function importerAvecNode(souschemin) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `import ${JSON.stringify(souschemin)};`],
    { cwd: racine, encoding: "utf8" },
  );
}

for (const souschemin of ["@ucm-kit/core/format", "@ucm-kit/core/lecteurs"]) {
  test(`${souschemin} s'importe avec Node, sans tsx`, () => {
    const resultat = importerAvecNode(souschemin);
    assert.equal(
      resultat.status,
      0,
      `${souschemin} ne s'importe pas avec Node :\n${resultat.stderr}`,
    );
  });
}
