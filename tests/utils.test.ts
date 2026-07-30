import assert from 'node:assert/strict';
import test from 'node:test';
import normalizeName, { codeIdentifier } from '../src/utils';
import { firstVariableAlias, joinTokenPath, variableAliases } from '../src/variables';

test('normalizeName suit la convention commune des tokens', () => {
  assert.equal(normalizeName('Brand Tokens/Primary/default'), 'brand-tokens.primary.default');
  assert.equal(normalizeName(' Primitives / Grey   Titanium / 600 '), 'primitives.grey-titanium.600');
  assert.equal(normalizeName('///'), '');
});

test('codeIdentifier produit un nom TypeScript stable sans perdre le nom Figma du contrat', () => {
  assert.equal(codeIdentifier('Icon / Button'), 'IconButton');
  assert.equal(codeIdentifier('bouton-primaire'), 'BoutonPrimaire');
  assert.equal(codeIdentifier('État vide'), 'EtatVide');
  assert.equal(codeIdentifier('2e bouton'), 'Component2eBouton');
  assert.equal(codeIdentifier('///'), 'Component');
});

test('joinTokenPath ajoute la collection une seule fois', () => {
  assert.equal(joinTokenPath('Components', 'button/primary'), 'components.button.primary');
  assert.equal(
    joinTokenPath('Brand Tokens', 'Brand Tokens/Primary/default'),
    'brand-tokens.primary.default',
  );
});

test('variableAliases accepte les bindings scalaires et multiples', () => {
  const alias = { type: 'VARIABLE_ALIAS', id: 'VariableID:1' } as VariableAlias;
  assert.deepEqual(variableAliases(alias), [alias]);
  assert.deepEqual(variableAliases([alias]), [alias]);
  assert.equal(firstVariableAlias(undefined), null);
  assert.equal(firstVariableAlias([alias]), alias);
});
