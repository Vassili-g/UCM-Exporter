import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';
import contract from './test-exports/Button.contract.json';

/**
 * Les fichiers de `tests/test-exports/` sont de VRAIES sorties du plugin,
 * produites à la main dans Figma : un agent ne peut pas les régénérer, et les
 * retoucher détruirait ce qui fait leur valeur.
 *
 * Ce test ne compare donc pas leur contenu au moteur — il vérifie la seule
 * dérive à la fois détectable ici et capable de casser un consommateur : une
 * référence produite par une version antérieure du schéma. Un changement de
 * texte d'avertissement, lui, ne peut être rattrapé que par un ré-export
 * (cf. AGENTS.md, « Invariants à ne jamais casser »).
 */
test('le contrat de référence est produit par la version courante du schéma', () => {
  assert.equal(contract.meta.contractVersion, CONTRACT_VERSION);
});
