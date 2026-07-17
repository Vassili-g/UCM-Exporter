import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVariantTokens, getSlotTokens } from '../src/contract/extractVariantTokens';

const colorAlias = { type: 'VARIABLE_ALIAS', id: 'color' } as VariableAlias;
const widthAlias = { type: 'VARIABLE_ALIAS', id: 'width' } as VariableAlias;

test('getSlotTokens sépare les peintures de la géométrie des strokes', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'Button ring',
    boundVariables: { strokes: [colorAlias], strokeWeight: widthAlias },
    strokeAlign: 'OUTSIDE',
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'color') return 'components.button.colors.primary.focus.ring';
      if (alias?.id === 'width') return 'layouts.stroke.ring';
      return null;
    },
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(node, resolver, warnings);

  assert.deepEqual(tokens, {
    paints: {},
    strokes: {
      ring: {
        color: 'components.button.colors.primary.focus.ring',
        width: 'layouts.stroke.ring',
        align: 'outside',
      },
    },
  });
  assert.deepEqual(warnings, []);
});

test('getSlotTokens avertit quand la largeur du stroke est une valeur brute', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'Button ring',
    boundVariables: { strokes: [colorAlias] },
    strokeAlign: 'OUTSIDE',
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) =>
      alias?.id === 'color' ? 'components.button.colors.primary.focus.ring' : null,
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(node, resolver, warnings);

  assert.equal(tokens.strokes.ring?.width, null);
  assert.deepEqual(warnings, [
    'Calque « Button ring » : largeur du stroke sans variable liée (valeur brute ignorée).',
  ]);
});

test('extractVariantTokens ajoute la largeur du stroke à tokensUsed', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'State=Focus',
    boundVariables: { strokes: [colorAlias], strokeWeight: widthAlias },
    strokeAlign: 'OUTSIDE',
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'color') return 'components.button.colors.primary.focus.ring';
      if (alias?.id === 'width') return 'layouts.stroke.ring';
      return null;
    },
  };
  const tokenNames = new Set<string>();
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    { axes: ['state'], variants: [{ values: { state: 'focus' }, component: node }] },
    resolver,
    tokenNames,
    warnings,
  );

  assert.deepEqual(trees, {
    variantTokens: { focus: {} },
    variantStrokes: {
      focus: {
        ring: {
          color: 'components.button.colors.primary.focus.ring',
          width: 'layouts.stroke.ring',
          align: 'outside',
        },
      },
    },
  });
  assert.deepEqual(Array.from(tokenNames).sort(), [
    'components.button.colors.primary.focus.ring',
    'layouts.stroke.ring',
  ]);
  assert.deepEqual(warnings, []);
});
