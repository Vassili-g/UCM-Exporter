/**
 * Une commande écrite dans la documentation porte un numéro de version, et un numéro
 * écrit à la main dérive.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAQUETS = ["@ucm-kit/cli", "@ucm-kit/adapter-typescript"];

function estUnPlan(relatif) {
  const nom = basename(relatif);
  return relatif.includes("plans/") || nom.startsWith("PLAN-") || nom === "refonte-ui.md";
}

function documents(dossier = racine) {
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (entree.name === "node_modules" || entree.name === ".git") continue;
    const complet = join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...documents(complet));
    else if (entree.name.endsWith(".md")) trouves.push(complet);
  }
  return trouves;
}

function versionDe(paquet) {
  const dossier = paquet === "@ucm-kit/cli" ? "cli" : "adapter-typescript";
  return JSON.parse(readFileSync(join(racine, "packages", dossier, "package.json"), "utf8")).version;
}

test("chaque pin montré par la documentation est celui que ce dépôt porte", () => {
  const attendues = new Map(PAQUETS.map((paquet) => [paquet, versionDe(paquet)]));

  const fautes = [];
  let montres = 0;

  for (const chemin of documents()) {
    const relatif = relative(racine, chemin).split(sep).join("/");
    if (estUnPlan(relatif)) continue;
    const contenu = readFileSync(chemin, "utf8");

    for (const [paquet, attendue] of attendues) {
      const motif = new RegExp(`${paquet.replace("/", "\\/")}@([\\w.-]+)`, "g");
      for (const trouve of contenu.matchAll(motif)) {
        montres += 1;
        if (trouve[1] !== attendue) {
          fautes.push(
            `${relatif} montre ${paquet}@${trouve[1]}, et ce dépôt porte ${attendue}. `
              + `Un lecteur copierait une commande qui installe autre chose que ce paquet-ci.`,
          );
        }
      }
    }
  }

  // Zéro occurrence passerait sans rien contrôler : une section supprimée, et le
  // garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  assert.ok(montres > 0, "la documentation ne montre plus aucune commande épinglée");
  assert.deepEqual(fautes, [], fautes.join("\n"));
});
