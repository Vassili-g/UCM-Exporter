/** Lance tous les tests du paquet sans dépendre du développement des globs. */
const { readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const racine = resolve(__dirname, "..");
const fichiers = readdirSync(resolve(racine, "tests"))
  .filter((nom) => nom.endsWith(".test.mjs"))
  .sort()
  .map((nom) => `tests/${nom}`);

if (fichiers.length === 0) {
  console.error("Aucun fichier de test trouvé dans tests/ (@ucm-kit/adapter-typescript).");
  process.exit(1);
}

const resultat = spawnSync(process.execPath, ["--test", ...fichiers], {
  cwd: racine,
  stdio: "inherit",
});
process.exit(resultat.status ?? 1);
