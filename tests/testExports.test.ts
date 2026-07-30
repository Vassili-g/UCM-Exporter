import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';

/**
 * Les fichiers de `tests/test-exports/` sont de VRAIES sorties du plugin,
 * produites à la main dans Figma : personne ne peut les régénérer ici, et les
 * retoucher détruirait ce qui fait leur valeur.
 *
 * Ce test ne compare donc pas leur contenu au moteur. Il vérifie la seule
 * dérive à la fois détectable hors de Figma et capable de casser un
 * consommateur : un export produit par une version antérieure du schéma.
 */
const fixturesDirectory = join(dirname(fileURLToPath(import.meta.url)), 'test-exports');
const contractFixtures = readdirSync(fixturesDirectory)
  .filter((filename) => filename.endsWith('.contract.json'))
  .sort();

test('le corpus de références contient au moins un vrai contrat Figma', () => {
  assert.ok(contractFixtures.length > 0);
});

for (const filename of contractFixtures) {
  test(`${filename} est produit par la version courante du schéma`, () => {
    const contract = JSON.parse(
      readFileSync(join(fixturesDirectory, filename), 'utf8').replace(/^\uFEFF/, ''),
    ) as { meta?: { contractVersion?: unknown } };
    assert.equal(
      contract.meta?.contractVersion,
      CONTRACT_VERSION,
      `Export de référence ${filename} produit par le schéma ${contract.meta?.contractVersion}, ` +
        `alors que le moteur écrit désormais du ${CONTRACT_VERSION}. Réexportez uniquement le ` +
        `petit corpus de tests depuis Figma et déposez-le dans tests/test-exports/.`,
    );
  });
}
