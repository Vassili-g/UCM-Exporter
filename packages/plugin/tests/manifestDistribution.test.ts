/** Vérifie que le manifest reste compatible avec la distribution Community. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

test('le manifest ne déclare aucun droit réservé à un plugin privé', () => {
  for (const relatif of ['manifest.json', 'dist/manifest.json']) {
    let brut: string;
    try {
      brut = readFileSync(join(racine, relatif), 'utf8');
    } catch {
      // `dist/` n'existe pas avant une construction. Le manifest source, lui,
      // est toujours là : ne pas trouver la copie n'est pas une faute, la
      // trouver fautive en est une.
      continue;
    }

    const manifest = JSON.parse(brut) as Record<string, unknown>;
    assert.equal(
      'enablePrivatePluginApi' in manifest,
      false,
      `${relatif} déclare enablePrivatePluginApi. Ce drapeau est réservé aux plugins privés `
        + `d'une organisation : Figma refuserait la soumission à la Community. `
        + `Il ouvre figma.fileKey, donc meta.figma.url — la traçabilité passe désormais par `
        + `fileName et nodeId, annoncés dans le corps de la pull request.`,
    );
  }
});
