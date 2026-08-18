/** Régression de la normalisation v9 : compacte, mais sans aucune fusion. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { compactVariants } from '../src/contract/compactVariants';
import type { ExtractedContractVariant, ExtractedPropertyBinding } from '../src/contract/types';

const structure = (radius: string | null) => ({
  layout: 'flex-row' as const,
  sizing: { width: 'fit-content' as const, height: 'fit-content' as const },
  gap: null,
  rowGap: null,
  columnGap: null,
  padding: { x: null, y: null },
  radius,
  children: [],
});

function variant(nodeId: string, state: string, radius: string | null): ExtractedContractVariant {
  return {
    nodeId,
    figmaName: `State=${state}`,
    values: { state },
    structure: structure(radius),
    tokens: { background: `{button.${state}}` },
    strokes: {},
    typography: [],
    composes: [],
    icons: {},
    paintPlacements: { fills: {}, strokes: {} },
  };
}

test('compactVariants catalogue chaque vue complète distincte une seule fois', () => {
  const result = compactVariants([
    variant('default', 'default', null),
    variant('hover', 'hover', null),
    variant('focus', 'focus', '{radius.focus}'),
  ], []);

  assert.deepEqual(Object.keys(result.variantViews), ['v1', 'v2']);
  assert.deepEqual(result.variants.map(({ view }) => view), ['v1', 'v1', 'v2']);
  assert.equal(result.variantViews.v1.structure.radius, null);
  assert.equal(result.variantViews.v2.structure.radius, '{radius.focus}');
  assert.deepEqual(result.variants.map(({ tokens }) => tokens), [
    { background: '{button.default}' },
    { background: '{button.hover}' },
    { background: '{button.focus}' },
  ]);
});

test('compactVariants déduplique la définition mais garde chaque cible sur son variant exact', () => {
  const definition = {
    prop: 'label',
    figmaPropName: 'Label#1:2',
    target: 'characters' as const,
    figmaPath: ['Content', 'Label'],
  };
  const bindings: ExtractedPropertyBinding[] = [
    { ...definition, variantNodeId: 'default', nodeId: 'label-default' },
    { ...definition, variantNodeId: 'focus', nodeId: 'label-focus' },
  ];
  const result = compactVariants([
    variant('default', 'default', null),
    variant('focus', 'focus', null),
  ], bindings);

  assert.deepEqual(result.propertyBindingDefinitions, { b1: definition });
  assert.deepEqual(result.variants[0].bindings, [
    { definition: 'b1', nodeId: 'label-default' },
  ]);
  assert.deepEqual(result.variants[1].bindings, [
    { definition: 'b1', nodeId: 'label-focus' },
  ]);
});

test('deux placements de peinture différents produisent deux vues distinctes', () => {
  const first = variant('default', 'default', null);
  const second = variant('hover', 'hover', null);
  first.paintPlacements.fills.background = [['surface']];
  second.paintPlacements.fills.background = [['label']];

  const result = compactVariants([first, second], []);

  assert.notEqual(result.variants[0]?.view, result.variants[1]?.view);
});
