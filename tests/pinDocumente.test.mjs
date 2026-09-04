/**
 * Une commande écrite dans la documentation porte un numéro de version, et un
 * numéro écrit à la main dérive.
 *
 * **Pourquoi ce garde-fou existe.** Le README montre la commande qu'un
 * repository consommateur lance vraiment — `npx --yes @ucm-kit/cli@<version>` —
 * avec un pin EXACT, parce que D7 l'exige et parce qu'une plage laisserait npx
 * choisir une version que personne n'a essayée. Un exemple copiable est donc
 * indispensable ; mais il devient une SECONDE autorité sur la version du CLI, à
 * côté de `packages/cli/package.json`, et leur désaccord serait muet : le
 * lecteur copierait une commande qui installe une version d'avant, verrait un
 * rapport plausible, et n'aurait aucune raison de douter.
 *
 * C'est la maladie que ce dépôt poursuit partout — le pin du plugin en T4.1,
 * le `dist/` du kit en T4.3, le registre en T3.4. Ici elle coûte une ligne à
 * vérifier, alors on la vérifie.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

test("la version du CLI montrée dans le README est celle que ce dépôt porte", () => {
  const version = JSON.parse(
    readFileSync(join(racine, "packages", "cli", "package.json"), "utf8"),
  ).version;
  const readme = readFileSync(join(racine, "README.md"), "utf8");

  const pins = [...readme.matchAll(/@ucm-kit\/cli@([\w.-]+)/g)].map((trouve) => trouve[1]);
  // Zéro occurrence passerait sans rien contrôler : une section supprimée, et
  // le garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(pins.length > 0, "le README ne montre plus la commande du CLI");

  for (const pin of pins) {
    assert.equal(
      pin,
      version,
      `le README montre @ucm-kit/cli@${pin}, et ce dépôt porte ${version}. `
        + `Un lecteur copierait une commande qui installe autre chose que ce paquet-ci.`,
    );
  }
});
