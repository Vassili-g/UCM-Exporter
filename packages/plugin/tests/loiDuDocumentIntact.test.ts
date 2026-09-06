/** Refuse dans le moteur toute écriture ou création de nœud Figma. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(racine, 'src');

/**
 * Les appels qui écrivent dans le document, et eux seuls.
 *
 * La liste est nommément courte : elle vise les portes d'écriture de l'API, pas
 * tout ce qui ressemble à une mutation. `figma.currentPage.selection = …` n'y
 * est pas, et son absence est la décision de U4.5, pas un oubli.
 */
const ECRITURES: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  { motif: /figma\.combineAsVariants\s*\(/, quoi: 'création de component set' },
  { motif: /figma\.group\s*\(|figma\.ungroup\s*\(/, quoi: 'regroupement de nodes' },
  { motif: /figma\.commitUndo\s*\(|figma\.triggerUndo\s*\(/, quoi: "entrée d'annulation" },
  { motif: /figma\.variables\.create[A-Z]\w*\s*\(/, quoi: 'écriture de variable' },
  { motif: /figma\.saveVersionHistoryAsync\s*\(/, quoi: "écriture d'historique" },
  { motif: /\.setPluginData\s*\(|\.setSharedPluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.remove\s*\(\s*\)/, quoi: 'suppression de node' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
];

function fichiersSource(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSource(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('le moteur n’écrit jamais dans le document Figma', () => {
  const fichiers = fichiersSource(SOURCE);
  // Une liste vide passerait ce test sans rien contrôler : un dossier renommé
  // désarmerait le filet en silence.
  assert.ok(fichiers.length > 20, `seulement ${fichiers.length} fichiers balayés`);

  const fautifs: string[] = [];
  for (const fichier of fichiers) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      // Un commentaire a le droit de NOMMER ce qu'on s'interdit : c'est même
      // souvent là qu'on explique pourquoi.
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of ECRITURES) {
        if (!motif.test(ligne)) continue;
        fautifs.push(`${path.relative(racine, fichier)}:${rang + 1} — ${quoi}`);
      }
    });
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} appel(s) écriraient dans le document Figma. Le plugin lit, `
      + `sélectionne et cadre ; il n'écrit pas. Si cette règle doit changer, elle se `
      + `change ici et dans packages/plugin/SPEC.md, jamais par un appel ajouté :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
});
