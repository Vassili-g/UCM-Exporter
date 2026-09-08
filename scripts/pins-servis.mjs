/**
 * Ce qu'un lecteur obtiendrait en copiant une commande de la documentation.
 *
 * `tests/pinDocumente.test.mjs` vérifie qu'un pin montré par la documentation
 * est celui que ce dépôt porte. C'est une comparaison du dépôt avec lui-même :
 * elle attrape une dérive entre deux fichiers d'ici, jamais un numéro que
 * personne ne sert. Les deux contrôles sont complémentaires et aucun ne
 * remplace l'autre.
 *
 * L'angle mort a coûté une commande morte en ligne : les README ont annoncé
 * l'adaptateur en 0.1.3 pendant que le registre servait la 0.1.0, parce que sa
 * publication échouait. Le garde-fou des pins exigeait cette écriture, et
 * l'aurait refusée corrigée : il imposait l'état cassé.
 *
 * L'« Épreuve du registre » de `publish.yml` est l'autre moitié du problème :
 * elle attrape un paquet publié qui ne s'installe pas, celle-ci une
 * documentation qui promet une version que personne ne sert. Même diagnostic
 * dans les deux cas : le seul endroit où le mensonge existe est le registre, et
 * le seul moyen de l'y voir est d'y aller.
 *
 * Ce contrôle n'entre pas dans `npm test`. Le réseau y deviendrait une
 * dépendance cachée, et la suite passerait au rouge hors ligne sans qu'une
 * ligne du dépôt ait bougé. Sa place est dans `publish.yml`, après l'épreuve
 * du registre : à ce moment la version qui vient de partir est servie, donc les
 * documents qui l'épinglent sont devenus vrais.
 *
 * `node scripts/pins-servis.mjs`, ou `npm run pins`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Un pin est un paquet de ce dépôt suivi d'un numéro exact. */
const PIN = /@ucm-kit\/[a-z-]+@[\w.-]+/g;

/**
 * Documents du dépôt, hors dépendances et hors fixtures.
 *
 * `tests/fixtures/` porte des documents figés, cités par un test et par lui
 * seul : les juger ici ferait rougir une publication sur un numéro que
 * personne n'installe.
 */
function documents(dossier = racine) {
  const trouves = [];
  const dansTests = dossier.endsWith(`${sep}tests`);
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const nom = entree.name;
    if (nom === "node_modules" || nom === ".git" || nom === "dist") continue;
    if (nom === "fixtures" && dansTests) continue;
    const complet = join(dossier, nom);
    if (entree.isDirectory()) trouves.push(...documents(complet));
    else if (nom.endsWith(".md")) trouves.push(complet);
  }
  return trouves;
}

/** Chaque pin écrit dans la documentation, avec l'endroit qui l'écrit. */
export function pinsDocumentes() {
  const releves = new Map();
  for (const chemin of documents()) {
    const relatif = relative(racine, chemin).split(sep).join("/");
    readFileSync(chemin, "utf8").split(/\r?\n/).forEach((ligne, index) => {
      for (const pin of ligne.match(PIN) ?? []) {
        if (!releves.has(pin)) releves.set(pin, []);
        releves.get(pin).push(`${relatif}:${index + 1}`);
      }
    });
  }
  return releves;
}

/**
 * Vrai si le registre sert cette version exacte.
 *
 * Un échec de réseau ne vaut pas un refus : il rendrait la publication rouge
 * pour une cause étrangère au dépôt. Il se distingue d'un 404 par le code de
 * npm, et l'appelant le signale sans bloquer.
 */
function servi(pin) {
  try {
    execFileSync("npm", ["view", pin, "version"], {
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "oui";
  } catch (erreur) {
    const sortie = `${erreur?.stderr ?? ""}${erreur?.stdout ?? ""}`;
    return /E404|is not in this registry|No match found/.test(sortie) ? "non" : "indécis";
  }
}

function principal() {
  const releves = pinsDocumentes();

  // Zéro occurrence passerait sans rien contrôler : une section supprimée, et
  // le garde-fou disparaîtrait en silence. C'est la faute qu'il empêche.
  if (releves.size === 0) {
    console.error("La documentation ne montre plus aucune commande épinglée.");
    return 1;
  }

  const morts = [];
  const indecis = [];
  for (const [pin, endroits] of [...releves].sort()) {
    const verdict = servi(pin);
    console.log(`  ${verdict === "oui" ? "✓" : verdict === "non" ? "✗" : "?"} ${pin}`);
    if (verdict === "non") morts.push([pin, endroits]);
    if (verdict === "indécis") indecis.push(pin);
  }

  if (indecis.length > 0) {
    console.log(`\nLe registre n'a pas répondu pour ${indecis.join(", ")}. Non conclu, non bloqué.`);
  }

  if (morts.length === 0) {
    console.log(`\nLes ${releves.size} versions épinglées par la documentation sont servies.`);
    return 0;
  }

  console.error("\nLa documentation épingle des versions que le registre ne sert pas :");
  for (const [pin, endroits] of morts) {
    console.error(`  ${pin}`);
    for (const endroit of endroits) console.error(`      ${endroit}`);
  }
  console.error(
    "\nUn lecteur qui copie ces commandes reçoit une 404. Publier la version"
      + "\nmanquante, ou reculer ces documents sur ce que le registre sert.",
  );
  return 1;
}

if (process.argv[1]?.endsWith("pins-servis.mjs")) {
  process.exit(principal());
}
