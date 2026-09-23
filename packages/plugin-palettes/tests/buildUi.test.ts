/** Le gabarit de l'interface porte les repères que le build du socle remplace. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { reperesManquants } from 'ucm-plugin-socle/lois/distribution';

test('le gabarit réel porte les deux repères que le build remplace', () => {
  const gabarit = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'ui', 'index.html'), 'utf8');
  assert.deepEqual(reperesManquants(gabarit), [], 'sans ces repères, le plugin s’ouvrirait vide dans Figma');
});
