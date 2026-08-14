import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLeaf,
  dtcgType,
  formatValue,
  insert,
  isUnitless,
  modeCollisionWarnings,
  toHex,
} from '../src/tokens/exportTokens';
import type { ExportContext } from '../src/tokens/exportTokens';
import { collisionWarnings, indexVariables } from '../src/variables';

test('dtcgType mappe les types Figma, dimension vs number selon le groupe', () => {
  assert.equal(dtcgType('COLOR', 'primitives.terracota.600'), 'color');
  assert.equal(dtcgType('FLOAT', 'sizes.spacing.8'), 'dimension');
  assert.equal(dtcgType('FLOAT', 'layouts.fontweight.600'), 'number');
  assert.equal(dtcgType('FLOAT', 'layouts.font-weight.600'), 'number');
  assert.equal(dtcgType('FLOAT', 'layouts.lineheight.base'), 'dimension');
  assert.equal(dtcgType('FLOAT', 'layouts.line-height.base'), 'dimension');
  assert.equal(dtcgType('FLOAT', 'fondations.taille-de-ligne', ['LINE_HEIGHT']), 'dimension');
  assert.equal(dtcgType('FLOAT', 'fondations.graisse', ['FONT_WEIGHT']), 'number');
  assert.equal(dtcgType('BOOLEAN', 'flags.x'), 'boolean');
  assert.equal(dtcgType('STRING', 'layouts.fontfamily.base'), 'string');
});

test('isUnitless détecte les groupes sans unité', () => {
  assert.equal(isUnitless('layouts.fontweight.600'), true);
  assert.equal(isUnitless('layouts.font-weight.600'), true);
  assert.equal(isUnitless('layouts.line-height.base'), false);
  assert.equal(isUnitless('fondations.taille-de-ligne', ['LINE_HEIGHT']), false);
  assert.equal(isUnitless('layouts.opacity.disabled'), true);
  assert.equal(isUnitless('layouts.z-index.modal'), true);
  assert.equal(isUnitless('layouts.aspect-ratio.square'), true);
  assert.equal(isUnitless('layouts.font-weighted.600'), false);
  assert.equal(isUnitless('sizes.spacing.8'), false);
});

test('formatValue suffixe px les dimensions, laisse les nombres bruts', () => {
  assert.equal(formatValue(8, 'FLOAT', 'sizes.spacing.8'), '8px');
  assert.equal(formatValue(600, 'FLOAT', 'layouts.fontweight.600'), 600);
  assert.equal(formatValue(600, 'FLOAT', 'layouts.font-weight.600'), 600);
  assert.equal(formatValue(24, 'FLOAT', 'layouts.lineheight.base'), '24px');
  assert.equal(formatValue(24, 'FLOAT', 'fondations.taille-de-ligne', ['LINE_HEIGHT']), '24px');
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

test('insert conserve la première feuille quand deux tokens partagent un chemin', () => {
  const tree = {};
  const warnings: string[] = [];

  insert(tree, 'brand.foo-bar', { $value: '#111111', $type: 'color' }, warnings);
  insert(tree, 'brand.foo-bar', { $value: '#222222', $type: 'color' }, warnings);

  // Écraser ici perdrait une variable Figma sans que rien ne le dise.
  assert.deepEqual(tree, { brand: { 'foo-bar': { $value: '#111111', $type: 'color' } } });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Seul le premier est exporté/);
});

test('indexVariables nomme les deux variables en collision et écarte la seconde', () => {
  const collection = { id: 'brand', name: 'Brand' } as unknown as VariableCollection;
  const variable = (id: string, name: string) =>
    ({ id, name, variableCollectionId: 'brand' }) as unknown as Variable;
  // « Foo Bar » et « foo-bar » sont deux variables distinctes dans Figma, mais
  // un seul et même token une fois normalisées.
  const first = variable('v1', 'Foo Bar');
  const second = variable('v2', 'foo-bar');

  const index = indexVariables([first, second], new Map([['brand', collection]]));

  assert.deepEqual([...index.variableByPath.keys()], ['brand.foo-bar']);
  assert.equal(index.variableByPath.get('brand.foo-bar'), first);
  // La seconde reste hors de l'index des chemins : les DEUX commandes savent
  // ainsi qu'aucune référence ne doit la désigner.
  assert.equal(index.pathById.get('v2'), undefined);
  assert.deepEqual(index.ambiguous.get('v2'), {
    name: 'foo-bar',
    owner: 'Foo Bar',
    path: 'brand.foo-bar',
    ownerPath: 'brand.foo-bar',
    kind: 'same-path',
  });
  assert.deepEqual(collisionWarnings(index), [
    'Variables « Foo Bar » et « foo-bar » : leurs noms donnent le même token ' +
      '« brand.foo-bar ». Seule la première est exportée ; renommez la seconde.',
  ]);
});

test('modeCollisionWarnings signale une fois par collection, pas une fois par variable', () => {
  const collection = (name: string, modes: string[]) =>
    ({
      id: name,
      name,
      modes: modes.map((mode, index) => ({ modeId: `m${index}`, name: mode })),
    }) as unknown as VariableCollection;

  // « Marque 2 » et « marque-2 » se normalisent tous deux en « marque-2 » :
  // sans avertissement, une marque entière disparaîtrait de $extensions.
  const warnings = modeCollisionWarnings([
    collection('Brand Tokens', ['Intencial', 'Marque 2', 'marque-2']),
    collection('Sizes', ['Mode 1']),
  ]);

  assert.deepEqual(warnings, [
    'Collection « Brand Tokens » : deux de ses modes donnent le même nom ' +
      "« marque-2 ». Seul le premier est exporté ; renommez l'un des deux.",
  ]);
});

test('buildLeaf garde le premier mode quand deux noms se normalisent pareil', () => {
  const collection = {
    id: 'brand',
    name: 'Brand Tokens',
    defaultModeId: 'm1',
    modes: [
      { modeId: 'm1', name: 'Marque 2' },
      { modeId: 'm2', name: 'marque-2' },
    ],
  } as unknown as VariableCollection;
  const variable = {
    id: 'v1',
    name: 'Primary/default',
    variableCollectionId: 'brand',
    resolvedType: 'COLOR',
    valuesByMode: { m1: { r: 1, g: 0, b: 0 }, m2: { r: 0, g: 0, b: 1 } },
  } as unknown as Variable;

  const leaf = buildLeaf(variable, collection, {
    collectionById: new Map([['brand', collection]]),
    variableById: new Map([['v1', variable]]),
    pathById: new Map([['v1', 'brand-tokens.primary.default']]),
  }, []);

  // Premier conservé, comme partout ailleurs ; le doublon est signalé une
  // seule fois par modeCollisionWarnings, pas à chaque variable.
  assert.deepEqual(leaf.$extensions, { 'com.ucm.modes': { 'marque-2': '#ff0000' } });
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

test('un groupe de tokens hérité d’Object.prototype reste une clé comme une autre', () => {
  const feuille = { $value: '#fff', $type: 'color' };
  const arbre = {};
  const warnings: string[] = [];

  insert(arbre, 'constructor.primary', feuille, warnings);
  insert(arbre, '__proto__.primary', feuille, warnings);

  // Sans lecture en propriété propre, « constructor » passait pour un
  // emplacement occupé et « __proto__ » écrivait dans le prototype : les deux
  // tokens quittaient le fichier, dont un sans le moindre message.
  assert.deepEqual(Object.keys(arbre), ['constructor', '__proto__']);
  assert.equal(({} as Record<string, unknown>).primary, undefined);
  assert.deepEqual(warnings, []);
});

test('un mode homonyme d’Object.prototype reste une marque exportée', () => {
  const collection = {
    id: 'c1', name: 'Brand', defaultModeId: 'm1',
    modes: [
      { modeId: 'm1', name: 'constructor' },
      { modeId: 'm2', name: '__proto__' },
      { modeId: 'm3', name: 'marque-3' },
    ],
  } as unknown as VariableCollection;
  const variable = {
    id: 'v1', name: 'color/primary', variableCollectionId: 'c1',
    resolvedType: 'COLOR', scopes: [],
    valuesByMode: {
      m1: { r: 1, g: 0, b: 0, a: 1 },
      m2: { r: 0, g: 1, b: 0, a: 1 },
      m3: { r: 0, g: 0, b: 1, a: 1 },
    },
  } as unknown as Variable;
  const warnings: string[] = [];

  const leaf = buildLeaf(variable, collection, {
    collectionById: new Map([['c1', collection]]),
    variableById: new Map([['v1', variable]]),
    pathById: new Map([['v1', 'brand.color.primary']]),
  }, warnings);

  // L'index littéral tenait « constructor » pour un mode déjà écrit et laissait
  // « __proto__ » fixer son prototype : deux marques quittaient tokens.json
  // sans qu'aucun avertissement ne le dise.
  //
  // L'attendu se compare par ses clés et son JSON : écrit en littéral,
  // `{ __proto__: … }` fixerait lui aussi un prototype au lieu d'une clé, et le
  // test échouerait sur sa propre construction.
  const modes = (leaf.$extensions as Record<string, unknown>)['com.ucm.modes'];
  assert.deepEqual(Object.keys(modes as object), ['constructor', '__proto__', 'marque-3']);
  assert.equal(
    JSON.stringify(modes),
    '{"constructor":"#ff0000","__proto__":"#00ff00","marque-3":"#0000ff"}',
  );
  assert.deepEqual(warnings, []);
});
