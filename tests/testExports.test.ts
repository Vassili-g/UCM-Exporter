import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';
import contract from './test-exports/Button.contract.json';

/**
 * Les fichiers de `tests/test-exports/` sont de VRAIES sorties du plugin,
 * produites à la main dans Figma : personne ne peut les régénérer ici, et les
 * retoucher détruirait ce qui fait leur valeur.
 *
 * Ce test ne compare donc pas leur contenu au moteur. Il vérifie la seule
 * dérive à la fois détectable hors de Figma et capable de casser un
 * consommateur : un export produit par une version antérieure du schéma.
 */
test('le contrat de référence est produit par la version courante du schéma', () => {
  assert.equal(
    contract.meta.contractVersion,
    CONTRACT_VERSION,
    `Export de référence produit par le schéma ${contract.meta.contractVersion}, ` +
      `alors que le moteur écrit désormais du ${CONTRACT_VERSION}. Réexportez le ` +
      `composant depuis Figma et déposez le fichier dans tests/test-exports/.`,
  );
});
