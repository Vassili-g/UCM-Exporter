import assert from 'node:assert/strict';
import test from 'node:test';
import { findWrapperReference, getVariantValues } from '../src/contract/componentTree';

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

test('findWrapperReference ne choisit jamais une instance statiquement masquée', async () => {
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const candidate = (
    name: string,
    visible: boolean,
    boundVariables: Record<string, VariableAlias>,
  ) => ({
    type: 'INSTANCE',
    name,
    visible,
    boundVariables,
    componentProperties: {},
    findAll: () => [],
    getMainComponentAsync: async () => null,
  });
  const hidden = candidate('Ancien wrapper', false, {
    itemSpacing: alias('gap-old'),
    paddingLeft: alias('left-old'),
    paddingRight: alias('right-old'),
  });
  const visible = candidate('Wrapper actif', true, {
    itemSpacing: alias('gap'),
  });
  const root = {
    type: 'COMPONENT',
    name: 'Button',
    findAll: (predicate: (node: never) => boolean) =>
      [hidden, visible].filter(predicate as (node: unknown) => boolean),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const wrapper = await findWrapperReference(root, warnings);

  assert.equal(wrapper?.instance, visible as unknown as InstanceNode);
  assert.ok(warnings.some((warning) => warning.includes('Ancien wrapper')));
});
