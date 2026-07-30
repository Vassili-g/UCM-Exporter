import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findMissingVariantCombinations,
  findWrapperReference,
  getVariantValues,
  groupComponentsByVariant,
} from '../src/contract/componentTree';
import { extractContractPropertyModel } from '../src/contract/parsers';
import { missingVariantsMessage } from '../src/contract/exportComponent';

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

test('groupComponentsByVariant utilise la même clé sémantique que props', () => {
  const definitions = {
    'Construction Type': {
      type: 'VARIANT',
      defaultValue: 'Small',
      variantOptions: ['Small', 'Medium', 'Large'],
    },
  } as unknown as ComponentPropertyDefinitions;
  const componentSet = {
    componentPropertyDefinitions: definitions,
    children: [
      { type: 'COMPONENT', name: 'Construction Type=Small' },
      { type: 'COMPONENT', name: 'Construction Type=Medium' },
      { type: 'COMPONENT', name: 'Construction Type=Large' },
    ],
  } as unknown as ComponentSetNode;
  const model = extractContractPropertyModel(definitions);

  const { matrix } = groupComponentsByVariant(
    componentSet,
    model.publicVariantKeyByRawKey,
  );

  assert.deepEqual(Object.keys(model.props), ['size']);
  assert.deepEqual(matrix.axes, ['size']);
  assert.deepEqual(matrix.variants.map((variant) => variant.values), [
    { size: 'small' },
    { size: 'medium' },
    { size: 'large' },
  ]);
});

test('une combinaison de variantes absente produit un diagnostic Figma directement actionnable', () => {
  const componentSet = {
    name: 'Button',
    componentPropertyDefinitions: {
      Color: {
        type: 'VARIANT',
        defaultValue: 'Blue',
        variantOptions: ['Blue', 'Red'],
      },
      Size: {
        type: 'VARIANT',
        defaultValue: 'Small',
        variantOptions: ['Small', 'Large'],
      },
    },
    children: [
      { type: 'COMPONENT', name: 'Color=Blue, Size=Small' },
      { type: 'COMPONENT', name: 'Color=Blue, Size=Large' },
      { type: 'COMPONENT', name: 'Color=Red, Size=Small' },
    ],
  } as unknown as ComponentSetNode;

  const summary = findMissingVariantCombinations(componentSet);
  assert.deepEqual(summary, {
    axes: [
      { name: 'Color', values: ['Blue', 'Red'] },
      { name: 'Size', values: ['Small', 'Large'] },
    ],
    expected: 4,
    found: 3,
    missing: 1,
    presentExamples: [
      'Color=Blue, Size=Small',
      'Color=Blue, Size=Large',
      'Color=Red, Size=Small',
    ],
    examples: ['Color=Red, Size=Large'],
  });

  const message = missingVariantsMessage('Button', summary!);
  assert.match(message, /il manque 1 variant/);
  assert.match(message, /Figma contient actuellement 3 variants distincts/);
  assert.match(message, /Color=Blue, Size=Small/);
  assert.match(message, /Color=Red, Size=Large/);
  assert.match(message, /le code peut choisir séparément ces propriétés/);
  assert.match(message, /4 combinaisons possibles, 3 définies/);
  assert.match(message, /dupliquez un variant existant/);
  assert.match(message, /volontairement interdite/);
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

test('findWrapperReference reconnaît un wrapper dont le radius est lié coin par coin', async () => {
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const wrapper = {
    type: 'INSTANCE',
    name: 'Wrapper',
    visible: true,
    boundVariables: {
      topLeftRadius: alias('radius'),
      topRightRadius: alias('radius'),
      bottomLeftRadius: alias('radius'),
      bottomRightRadius: alias('radius'),
    },
    componentProperties: {},
    findAll: () => [],
    getMainComponentAsync: async () => null,
  };
  const root = {
    type: 'COMPONENT',
    name: 'Card',
    findAll: (predicate: (node: never) => boolean) =>
      [wrapper].filter(predicate as (node: unknown) => boolean),
  } as unknown as ComponentNode;

  assert.equal(
    (await findWrapperReference(root))?.instance,
    wrapper as unknown as InstanceNode,
  );
});
