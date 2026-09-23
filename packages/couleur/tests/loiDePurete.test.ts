/**
 * Le moteur ne lit ni l'heure, ni le hasard, ni la langue du poste.
 *
 * La compilation de `src/` refuse déjà `figma`, `document`, `window` et
 * `performance` : son `tsconfig.json` ne charge aucun type d'environnement.
 * Cette loi porte sur ce que le compilateur accepte parce que ES2020 le
 * déclare : `Date`, `Math.random`, `Intl` et `toLocaleString`. `TextEncoder`
 * s'y ajoute, absent du sandbox Figma. Borne : la lecture est textuelle, ligne
 * à ligne, commentaires retirés ; un accès par une chaîne calculée lui échappe.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const INTERDITS = ['Date', 'Math.random', 'Intl', 'toLocaleString', 'TextEncoder'];

/** Le code d'un fichier, commentaires retirés, ligne par ligne. */
function lignesDeCode(contenu: string): string[] {
  const sansBlocs = contenu.replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, ' '));
  return sansBlocs.split('\n').map((ligne) => ligne.replace(/\/\/.*$/, ''));
}

test('loi de pureté : aucun fichier du moteur ne lit l’heure, le hasard ou la langue', () => {
  const fichiers = fs.readdirSync(source).filter((nom) => nom.endsWith('.ts'));
  assert.ok(fichiers.length >= 5, `seuls ${fichiers.length} fichiers trouvés sous src/`);

  const fautes: string[] = [];
  for (const nom of fichiers) {
    lignesDeCode(fs.readFileSync(path.join(source, nom), 'utf8')).forEach((ligne, rang) => {
      for (const interdit of INTERDITS) {
        const motif = new RegExp(`(?<![A-Za-z0-9_$])${interdit.replace('.', '\\.')}(?![A-Za-z0-9_$])`);
        if (motif.test(ligne)) fautes.push(`src/${nom}:${rang + 1} emploie ${interdit}`);
      }
    });
  }
  assert.deepEqual(fautes, []);
});
