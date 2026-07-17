import assert from 'node:assert/strict';
import test from 'node:test';
import { getVariantValues } from '../src/contract/componentTree';

function fakeComponent(name: string, variantProperties?: Record<string, string>): ComponentNode {
  return { name, variantProperties } as unknown as ComponentNode;
}

test('getVariantValues parse le nom du variant (clé=valeur, virgules)', () => {
  assert.deepEqual(getVariantValues(fakeComponent('Color=Primary, Variant=Contained, State=Default')), {
    color: 'primary',
    variant: 'contained',
    state: 'default',
  });
});

test('getVariantValues privilégie variantProperties sur le nom parsé', () => {
  const component = fakeComponent('Color=Primary', { Color: 'Secondary', State: 'Hover' });
  assert.deepEqual(getVariantValues(component), { color: 'secondary', state: 'hover' });
});

test('getVariantValues normalise clés et valeurs (espaces, casse)', () => {
  assert.deepEqual(getVariantValues(fakeComponent('Icon Left=True')), { iconLeft: 'true' });
});
