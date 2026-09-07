/** Refuse les hypothèses de stack dans les lecteurs portables du kit. */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const lecteurs = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lecteurs");

/**
 * Les mots à bannir, et rien de plus large.
 *
 * `TypeScript` n'y est pas : un module a le droit de dire qu'il délègue à un
 * adaptateur TypeScript, puisque c'est exactement ce qu'il fait. Ce qu'on
 * refuse, c'est de promettre une stack au lecteur : un fichier `.tsx` à créer,
 * un composant React à corriger, un Playground à adapter.
 */
const MOTS_BANNIS = [/\bReact\b/, /\.tsx\b/, /\bTSX\b/, /\bPlayground\b/];

/** Une ligne de commentaire pur : elle explique, elle ne s'affiche pas. */
function estCommentaire(ligne) {
  const nue = ligne.trim();
  return nue.startsWith("*") || nue.startsWith("//") || nue.startsWith("/*");
}

/** La seule valeur qui porte légitimement une extension de fichier. */
function estLeMotifParDefaut(ligne) {
  return ligne.includes("MOTIF_IMPLEMENTATION_PAR_DEFAUT =");
}

test("aucun lecteur du kit ne promet une stack à celui qui lira son rapport", () => {
  const modules = readdirSync(lecteurs).filter((nom) => nom.endsWith(".mjs"));
  // Une liste vide passerait ce test sans rien contrôler : un dossier renommé,
  // et le filet disparaîtrait en silence. C'est la faute qu'il existe pour
  // rendre impossible.
  assert.ok(modules.length > 5, "aucun lecteur trouvé : le filet ne contrôle plus rien");

  const fautes = [];
  for (const module of modules) {
    readFileSync(join(lecteurs, module), "utf8").split("\n").forEach((ligne, index) => {
      if (estCommentaire(ligne) || estLeMotifParDefaut(ligne)) return;
      for (const mot of MOTS_BANNIS) {
        if (mot.test(ligne)) fautes.push(`${module}:${index + 1} — ${ligne.trim()}`);
      }
    });
  }

  assert.deepEqual(fautes, [], "un message du kit promet une stack à son lecteur");
});
