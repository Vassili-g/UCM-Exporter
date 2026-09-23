/**
 * Lance les fichiers de test du dossier `tests/` d'un paquet.
 *
 * Pourquoi ce script plutôt qu'une liste dans package.json : une liste écrite
 * à la main laisse un nouveau fichier de test hors du lot, silencieusement et
 * jusqu'en CI. Et pourquoi pas un glob passé à `tsx --test` : `node --test` ne
 * développe les motifs qu'à partir de Node 22, or la CI et les postes de
 * développement ne sont pas forcément sur la même version. Lire le dossier
 * fonctionne partout.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Lance `racine/tests/*` dont le nom finit par l'une des `extensions`, et sort
 * du processus avec le code de `tsx --test`. Un dossier sans test sort en
 * échec : un test qu'on n'exécute pas ne peut pas rougir.
 */
function lancerLesTests({ racine, extensions, nom }) {
  const testsDir = path.join(racine, 'tests');
  const files = fs
    .readdirSync(testsDir)
    .filter((name) => extensions.some((extension) => name.endsWith(extension)))
    .sort()
    .map((name) => path.join('tests', name));

  if (files.length === 0) {
    console.error(`Aucun fichier de test trouvé dans tests/ (${nom}).`);
    process.exit(1);
  }

  const result = spawnSync('npx', ['tsx', '--test', ...files], {
    cwd: racine,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  process.exit(result.status ?? 1);
}

module.exports = { lancerLesTests };

if (require.main === module) {
  lancerLesTests({ racine: path.resolve(__dirname, '..'), extensions: ['.test.ts'], nom: 'le socle' });
}
