/** Le manifest d'UCM Palettes ([ARC-05]). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { domainesOuverts, manifestsAuxDroitsPrives } from 'ucm-plugin-socle/lois/distribution';

const racine = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.json'), 'utf8')) as Record<string, unknown>;

test('le manifest n’ouvre aucun domaine', () => {
  assert.deepEqual(domainesOuverts(racine), ['none']);
});

test('le manifest ne déclare aucun droit réservé à un plugin privé', () => {
  assert.deepEqual(manifestsAuxDroitsPrives(racine), []);
});

test('le manifest charge les pages à la demande, dans Figma seul', () => {
  assert.equal(manifest.documentAccess, 'dynamic-page');
  assert.deepEqual(manifest.editorType, ['figma']);
});
