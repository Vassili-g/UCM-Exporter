/**
 * Une commande écrite dans la documentation porte un numéro de version, et un numéro
 * écrit à la main dérive.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAQUETS = ["@ucm-kit/cli", "@ucm-kit/adapter-typescript"];

/**
 * Le document qui montre délibérément une autre version que celle du dépôt.
 *
 * La recette externe s'installe depuis le registre, jamais depuis le dépôt :
 * jouer une recette contre un paquet que npm ne sert pas encore ne prouve rien.
 * Ses commandes épinglent donc la version publiée, et elles ont raison contre ce
 * garde-fou.
 */
const RECETTE = "docs/RECETTE.md";

/**
 * Les notes, où un numéro est une mesure et non une commande à copier.
 *
 * `docs/README.md` dit que ces notes ne font autorité sur rien et qu'aucune
 * partie du produit n'en dépend. Un journal de preuves écrit la version que la
 * commande a réellement installée le jour de la mesure : la réécrire à chaque
 * publication effacerait le fait qu'elle enregistre.
 */
const NOTES = "docs/notes/";

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
  let exemptes = 0;
  let exemptesDesNotes = 0;

  for (const chemin of documents()) {
    const relatif = relative(racine, chemin).split(sep).join("/");
    const contenu = readFileSync(chemin, "utf8");
    if (relatif === RECETTE || relatif.startsWith(NOTES)) {
      for (const paquet of PAQUETS) {
        const motif = new RegExp(`${paquet.replace("/", "\\/")}@([\\w.-]+)`, "g");
        const trouves = [...contenu.matchAll(motif)].length;
        if (relatif === RECETTE) exemptes += trouves;
        else exemptesDesNotes += trouves;
      }
      continue;
    }

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

  // Une exemption qui ne couvre plus rien ment sur ce qu'elle protège : soit la
  // recette a perdu ses commandes, soit elle a été renommée sans que le garde-fou
  // suive.
  assert.ok(exemptes > 0, `${RECETTE} ne montre plus aucune commande épinglée`);
  assert.ok(exemptesDesNotes > 0, `aucune note de ${NOTES} ne montre plus de version mesurée`);

  assert.deepEqual(fautes, [], fautes.join("\n"));
});
