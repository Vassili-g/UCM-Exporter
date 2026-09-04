import assert from 'node:assert/strict';
import test from 'node:test';
import { mergePropDescriptions } from '../src/contract/mergePropDescriptions';
import type { ContractProp, StateModel } from '@ucm-kit/core/format';

/** Modèle d'interaction minimal, tel que `buildStateModel` le produit. */
const modeleEtats = (axis = 'state'): StateModel => ({
  axis,
  states: { default: {}, hover: { selector: ':hover' } },
  precedence: ['hover', 'default'],
});

test('mergePropDescriptions documente les valeurs d’une prop enum', () => {
  const props: Record<string, ContractProp> = {
    variant: { type: 'enum', values: ['contained', 'text'], default: 'contained' },
  };
  const warnings: string[] = [];

  mergePropDescriptions(props, null, { variant: { contained: 'Action principale.' } }, warnings);

  assert.deepEqual(props.variant, {
    type: 'enum',
    values: ['contained', 'text'],
    default: 'contained',
    descriptions: { contained: 'Action principale.' },
  });
  assert.deepEqual(warnings, []);
});

/**
 * Le cœur du correctif : l'axe d'états est exclu des props, mais le contrat le
 * PUBLIE dans `stateModel` et les arbres de variantes en sont indexés. Le
 * refuser à la documentation reviendrait à traiter en faute de frappe un axe
 * que l'export décrit lui-même.
 */
test('mergePropDescriptions documente l’axe d’états, que stateModel publie à la place des props', () => {
  const stateModel = modeleEtats();
  const warnings: string[] = [];

  mergePropDescriptions({}, stateModel, { state: { hover: 'Survol du pointeur.' } }, warnings);

  assert.deepEqual(stateModel.states.hover, {
    selector: ':hover',
    description: 'Survol du pointeur.',
  });
  assert.deepEqual(warnings, []);
});

/** Un axe nommé `Status` porte les mêmes états, donc la même documentation. */
test('mergePropDescriptions suit le nom réel de l’axe d’états', () => {
  const stateModel = modeleEtats('status');
  const warnings: string[] = [];

  mergePropDescriptions({}, stateModel, { status: { default: 'État au repos.' } }, warnings);

  assert.equal(stateModel.states.default.description, 'État au repos.');
  assert.deepEqual(warnings, []);
});

test('mergePropDescriptions avertit sur un état que le composant n’a pas', () => {
  const stateModel = modeleEtats();
  const warnings: string[] = [];

  mergePropDescriptions({}, stateModel, { state: { hovers: 'Faute de frappe.' } }, warnings);

  assert.deepEqual(warnings, [
    'Règle @prop « state.hovers » : la variant property « state » n’a pas de valeur « hovers ». Vérifiez l’orthographe dans le layer « prop ».',
  ]);
});

/**
 * Sans axe d'états dans le composant, le message d'origine redevient exact :
 * il n'y a réellement aucune variant property de ce nom.
 */
test('mergePropDescriptions avertit sur une prop absente', () => {
  const warnings: string[] = [];

  mergePropDescriptions({}, null, { state: { hover: 'Survol.' } }, warnings);

  assert.deepEqual(warnings, [
    'Règle @prop « state » : le composant n’a aucune variant property portant ce nom. Vérifiez l’orthographe dans le layer « prop ».',
  ]);
});

/** Une prop héritée d'`Object` n'est pas une prop du composant. */
test('mergePropDescriptions ne prend pas une prop héritée pour une prop du composant', () => {
  const warnings: string[] = [];

  mergePropDescriptions({}, null, { constructor: { primary: 'Rien à documenter.' } }, warnings);

  assert.deepEqual(warnings, [
    'Règle @prop « constructor » : le composant n’a aucune variant property portant ce nom. Vérifiez l’orthographe dans le layer « prop ».',
  ]);
});
