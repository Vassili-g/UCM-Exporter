/** Vérifie que le manifest reste compatible avec la distribution Community. */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { domainesOuverts, manifestsAuxDroitsPrives } from 'ucm-plugin-socle/lois/distribution';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

test('le manifest ne déclare aucun droit réservé à un plugin privé', () => {
  assert.deepEqual(
    manifestsAuxDroitsPrives(racine),
    [],
    'Ces manifests déclarent enablePrivatePluginApi. Ce drapeau est réservé aux plugins privés '
      + `d'une organisation : Figma refuserait la soumission à la Community. `
      + `Il ouvre figma.fileKey, donc meta.figma.url — la traçabilité passe désormais par `
      + `fileName et nodeId, annoncés dans le corps de la pull request.`,
  );
});

test('le plugin ne joint que les API des deux forges', () => {
  // Un jeton part vers chaque domaine déclaré : un domaine de plus élargit ce
  // que le plugin peut atteindre avec lui, et la revue Community le relit.
  assert.deepEqual(domainesOuverts(racine), ['https://api.github.com', 'https://gitlab.com']);
});
