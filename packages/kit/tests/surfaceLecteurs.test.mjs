/**
 * La porte publique des lecteurs laisse-t-elle tout passer ?
 *
 * `src/lecteurs/index.mjs` est écrit à la main, et un export ajouté à un module
 * y serait oublié sans que rien ne rougisse : le module continue de marcher
 * pour ses voisins du paquet, et seul le consommateur découvre l'absence — à
 * l'exécution, chez lui. Ce test compare les deux listes mécaniquement.
 *
 * Il passe par `@ucm-kit/core/lecteurs`, pas par un chemin relatif : ce qui est
 * vérifié est la carte `exports` telle qu'un consommateur la traverse, pas
 * seulement le contenu du fichier.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as porte from "@ucm-kit/core/lecteurs";

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lecteurs");

/** Les noms qu'un module publie, lus dans sa source. */
function exportsDuModule(fichier) {
  const source = readFileSync(join(dossier, fichier), "utf8");
  const noms = [];
  for (const ligne of source.split("\n")) {
    const declaration = /^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/.exec(ligne);
    if (declaration) noms.push(declaration[1]);
  }
  return noms;
}

test("tout ce qu'un lecteur publie est atteignable par le sous-chemin public", () => {
  const modules = readdirSync(dossier).filter((nom) => nom.endsWith(".mjs") && nom !== "index.mjs");
  assert.ok(modules.length > 0, "aucun module de lecteur trouvé");

  const manquants = [];
  for (const fichier of modules) {
    for (const nom of exportsDuModule(fichier)) {
      if (!(nom in porte)) manquants.push(`${fichier} → ${nom}`);
    }
  }
  assert.deepEqual(manquants, [], "des exports restent enfermés dans leur module");
});

test("la porte ne publie rien qu'aucun module ne définisse", () => {
  // Le sens inverse : un `export` du barillet qui ne correspond plus à rien
  // casserait à l'import, mais un alias oublié passerait inaperçu.
  const definis = new Set(
    readdirSync(dossier)
      .filter((nom) => nom.endsWith(".mjs") && nom !== "index.mjs")
      .flatMap((fichier) => exportsDuModule(fichier)),
  );
  const orphelins = Object.keys(porte).filter((nom) => !definis.has(nom));
  assert.deepEqual(orphelins, []);
});
