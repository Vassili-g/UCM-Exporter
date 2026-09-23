/**
 * Aucun des deux plugins n'importe l'autre (section 14.4 de la spécification
 * d'UCM Palettes). Ce qu'ils partagent passe par `ucm-plugin-socle` ou par le
 * moteur `ucm-couleur`.
 *
 * La loi vit à la racine : un seul test lit les deux sens, sans qu'aucun des
 * deux paquets ne lise les sources de l'autre. Borne : elle lit les
 * spécificateurs de `from '…'`, `import('…')` et `require('…')`, et les
 * dépendances du `package.json`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

const PLUGINS = [
  { dossier: 'plugin-exporter', nom: 'ucm-exporter-plugin' },
  { dossier: 'plugin-palettes', nom: 'ucm-palettes-plugin' },
];

/** Les sources d'un paquet, hors `node_modules` et `dist`. */
function sources(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    if (['node_modules', 'dist'].includes(entree.name)) return [];
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return sources(chemin);
    return /\.(ts|mts|cts|mjs|cjs|js)$/.test(entree.name) ? [chemin] : [];
  });
}

/** Les chemins qu'un fichier importe ou charge, tels qu'ils sont écrits. */
function specificateurs(fichier: string): string[] {
  const texte = fs.readFileSync(fichier, 'utf8');
  return [...texte.matchAll(/(?:from\s+|import\s*\(\s*|require(?:\.resolve)?\s*\(\s*)['"]([^'"]+)['"]/g)]
    .map((trouve) => trouve[1]);
}

for (const plugin of PLUGINS) {
  for (const autre of PLUGINS.filter((candidat) => candidat !== plugin)) {
    test(`${plugin.nom} n’importe pas ${autre.nom}`, () => {
      const dossier = path.join(racine, 'packages', plugin.dossier);
      const lus = sources(dossier);
      assert.ok(lus.length > 5, `seulement ${lus.length} sources lues dans ${plugin.dossier}`);
      const fautes = lus.flatMap((fichier) => specificateurs(fichier)
        .filter((cible) => cible.startsWith(autre.nom) || cible.includes(autre.dossier))
        .map((cible) => `${path.relative(racine, fichier)} : ${cible}`));
      assert.deepEqual(fautes, []);

      const paquet = JSON.parse(fs.readFileSync(path.join(dossier, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
      const dependances = { ...paquet.dependencies, ...paquet.devDependencies };
      assert.equal(autre.nom in dependances, false, `${plugin.nom} dépend de ${autre.nom}`);
    });
  }
}
