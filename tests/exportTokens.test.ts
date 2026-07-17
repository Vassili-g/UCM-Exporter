import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLeaf, dtcgType, formatValue, insert, isUnitless, toHex } from '../src/tokens/exportTokens';
import type { ExportContext } from '../src/tokens/exportTokens';

test('dtcgType mappe les types Figma, dimension vs number selon le groupe', () => {
  assert.equal(dtcgType('COLOR', 'primitives.terracota.600'), 'color');
  assert.equal(dtcgType('FLOAT', 'sizes.spacing.8'), 'dimension');
  assert.equal(dtcgType('FLOAT', 'layouts.fontweight.600'), 'number');
  assert.equal(dtcgType('FLOAT', 'layouts.lineheight.base'), 'number');
  assert.equal(dtcgType('BOOLEAN', 'flags.x'), 'boolean');
  assert.equal(dtcgType('STRING', 'layouts.fontfamily.base'), 'string');
});

test('isUnitless détecte les groupes sans unité', () => {
  assert.equal(isUnitless('layouts.fontweight.600'), true);
  assert.equal(isUnitless('layouts.opacity.disabled'), true);
  assert.equal(isUnitless('sizes.spacing.8'), false);
});

test('formatValue suffixe px les dimensions, laisse les nombres bruts', () => {
  assert.equal(formatValue(8, 'FLOAT', 'sizes.spacing.8'), '8px');
  assert.equal(formatValue(600, 'FLOAT', 'layouts.fontweight.600'), 600);
  assert.equal(formatValue('Open Sans', 'STRING', 'layouts.fontfamily.base'), 'Open Sans');
});

test('toHex convertit RGB(A) 0-1 en hex', () => {
  assert.equal(toHex({ r: 1, g: 0, b: 0 }), '#ff0000');
  assert.equal(toHex({ r: 0, g: 0, b: 0, a: 1 }), '#000000');
  assert.equal(toHex({ r: 1, g: 1, b: 1, a: 0.5 }), '#ffffff80');
});

test('insert niche les feuilles et refuse les collisions feuille/groupe dans les deux sens', () => {
  const tree = {};
  const warnings: string[] = [];
  const leaf = (value: string) => ({ $value: value, $type: 'color' });

  insert(tree, 'a.b.c', leaf('#111111'), warnings);
  assert.deepEqual(tree, { a: { b: { c: { $value: '#111111', $type: 'color' } } } });

  // Une feuille ne peut pas écraser un groupe existant…
  insert(tree, 'a.b', leaf('#222222'), warnings);
  // …ni un groupe traverser une feuille existante.
  insert(tree, 'a.b.c.d', leaf('#333333'), warnings);

  assert.deepEqual(tree, { a: { b: { c: { $value: '#111111', $type: 'color' } } } });
  assert.equal(warnings.length, 2);
});

test('buildLeaf type un lineheight aliasé sur spacing comme dimension (racine), pas number', () => {
  const spacing = {
    id: 's22',
    name: 'Spacing/22',
    variableCollectionId: 'sizes',
    resolvedType: 'FLOAT',
    valuesByMode: { m1: 22 },
  } as unknown as Variable;
  const lineheight = {
    id: 'lh',
    name: 'LineHeight/base',
    variableCollectionId: 'layouts',
    resolvedType: 'FLOAT',
    valuesByMode: { m2: { type: 'VARIABLE_ALIAS', id: 's22' } },
  } as unknown as Variable;
  const sizesCol = { id: 'sizes', name: 'Sizes', defaultModeId: 'm1', modes: [{ modeId: 'm1', name: 'Mode' }] } as unknown as VariableCollection;
  const layoutsCol = { id: 'layouts', name: 'Layouts', defaultModeId: 'm2', modes: [{ modeId: 'm2', name: 'Mode' }] } as unknown as VariableCollection;

  const ctx: ExportContext = {
    collectionById: new Map([['sizes', sizesCol], ['layouts', layoutsCol]]),
    variableById: new Map([['s22', spacing], ['lh', lineheight]]),
    pathById: new Map([['s22', 'sizes.spacing.22'], ['lh', 'layouts.lineheight.base']]),
  };

  assert.deepEqual(buildLeaf(lineheight, layoutsCol, ctx, []), {
    $value: '{sizes.spacing.22}',
    $type: 'dimension',
  });
});
