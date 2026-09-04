/**
 * Lance TOUS les fichiers de test du dossier `tests/`.
 *
 * Deux extensions cohabitent, et c'est la coupure du paquet qui l'impose : le
 * FORMAT est du TypeScript compilé vers `dist/`, ses tests sont en `.test.ts` ;
 * les LECTEURS se publient en JavaScript tel quel, leurs tests sont en
 * `.test.mjs`. `tsx` exécute les deux.
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

const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

const files = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.ts') || name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join('tests', name));

if (files.length === 0) {
  console.error('Aucun fichier de test trouvé dans tests/ (@ucm-kit/cli).');
  process.exit(1);
}

const result = spawnSync('npx', ['tsx', '--test', ...files], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
