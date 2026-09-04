/**
 * Les deux règles de nommage du format.
 *
 * Elles étaient testées avec `variables.ts`, qui a besoin des globals Figma :
 * la coupure format/moteur les sépare, et c'est bien ce qu'elle doit faire —
 * ces deux fonctions ne connaissent ni Figma ni Node, et c'est la propriété
 * qui leur permet de voyager dans le bundle du plugin comme dans un navigateur.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { codeIdentifier, normalizeName } from '../src/format/names';

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
