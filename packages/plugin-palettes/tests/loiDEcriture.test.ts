/**
 * Seuls les fichiers de `src/ecriture/` écrivent dans le document ([ARC-12]),
 * et aucun fichier de `src/` ne touche aux variables, au chargement de toutes
 * les pages ni aux styles ([ARC-13]).
 *
 * Borne : la loi lit la source ligne à ligne et cherche une liste explicite de
 * motifs. Une affectation absente de la liste, une écriture par crochets
 * (`node['x'] = …`) ou répartie sur deux lignes lui échappe.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const SOURCE = path.join(racine, 'src');

/** Le dossier qui écrit. */
const ECRITURE = path.join(SOURCE, 'ecriture');

/**
 * L'interface s'exécute dans une iframe où le global `figma` n'existe pas :
 * ses `appendChild` et ses `.name =` construisent le panneau du plugin.
 */
const INTERFACE = path.join(SOURCE, 'ui');

/** Les appels qui écrivent dans le document, hors de `src/ecriture/`. */
const ECRITURES: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  { motif: /\.remove\s*\(/, quoi: 'suppression de node' },
  { motif: /\.setPluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.setSharedPluginData\s*\(/, quoi: 'écriture de plugin data partagée' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
  // Une affectation, précédée ou non d'un opérateur, jamais une comparaison.
  { motif: /\.(fills|strokes|name|characters|x|y|layoutMode|fontName|fontSize)\s*[-+*/]?=(?!=)/, quoi: 'propriété de node' },
  // `figma.ui.resize` dimensionne la fenêtre du plugin, pas un node.
  { motif: /(?<!figma\.ui)\.resize\s*\(/, quoi: 'dimension de node' },
];

/** Ce qu'aucun fichier de `src/` n'appelle, écriture et interface comprises. */
const INTERDITS: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.variables\b/, quoi: 'variables' },
  { motif: /loadAllPagesAsync/, quoi: 'chargement de toutes les pages' },
  { motif: /\b(get|create|import)\w*Style\w*\s*\(/, quoi: 'API de style' },
  { motif: /\.(fill|stroke|text|effect|grid)StyleId\b|set\w*StyleIdAsync/, quoi: 'API de style' },
];

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return chemin.endsWith('.ts') ? [chemin] : [];
  });
}

const dans = (dossier: string) => (fichier: string): boolean => fichier.startsWith(dossier + path.sep);

/** Les lignes de code qui portent un motif ; un commentaire peut nommer ce qu'on s'interdit. */
function fautes(liste: readonly string[], motifs: typeof ECRITURES): string[] {
  const trouvees: string[] = [];
  for (const fichier of liste) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of motifs) {
        if (motif.test(ligne)) trouvees.push(`${path.relative(racine, fichier)}:${rang + 1} ${quoi}`);
      }
    });
  }
  return trouvees;
}

test('[ARC-12] seul src/ecriture/ écrit dans le document', () => {
  // Un dossier renommé viderait l'exclusion ou le balayage sans que rien ne le dise.
  assert.ok(fs.existsSync(ECRITURE), 'src/ecriture/ n’existe plus');
  assert.ok(fs.existsSync(INTERFACE), 'src/ui/ n’existe plus');
  const balayes = fichiers(SOURCE).filter((fichier) => !dans(ECRITURE)(fichier) && !dans(INTERFACE)(fichier));
  assert.ok(balayes.some((fichier) => fichier.endsWith('code.ts')), 'code.ts n’est plus balayé');
  assert.deepEqual(fautes(balayes, ECRITURES), []);
});

test('[ARC-13] aucun fichier de src/ ne touche aux variables, à toutes les pages ni aux styles', () => {
  assert.deepEqual(fautes(fichiers(SOURCE), INTERDITS), []);
});

test('l’écriture n’est atteignable que par code.ts', () => {
  const importeurs = fichiers(SOURCE)
    // `from '…'` comme un import sans liaison, `import '…'`.
    .filter((fichier) => /(?:from|import)\s+'[^']*ecriture\//.test(fs.readFileSync(fichier, 'utf8')))
    .map((fichier) => path.relative(SOURCE, fichier));
  assert.deepEqual(importeurs, ['code.ts']);
});
