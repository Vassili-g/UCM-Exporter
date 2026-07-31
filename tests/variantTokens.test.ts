import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVariantTokens, getSlotTokens } from '../src/contract/extractVariantTokens';
import { collectTokenReferences } from '../src/variables';

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
        color: '{components.button.colors.primary.focus.ring}',
        width: '{layouts.stroke.ring}',
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
    `Layer « Button ring » — stroke weight : aucune variable Figma n'est reliée. La valeur fixe n'est pas exportée. Reliez-la à une variable, puis réexportez.`,
  ]);
});

test('getSlotTokens refuse une largeur de stroke partiellement liée', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'Button ring',
    boundVariables: {
      strokes: [colorAlias],
      strokeTopWeight: widthAlias,
    },
    strokeAlign: 'OUTSIDE',
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (candidate: VariableAlias | null | undefined) => {
      if (candidate?.id === 'color') return 'components.button.colors.primary.focus.ring';
      if (candidate?.id === 'width') return 'layouts.stroke.ring';
      return null;
    },
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(node, resolver, warnings);

  assert.equal(tokens.strokes.ring?.width, null);
  assert.ok(warnings.some((warning) => warning.includes('right stroke weight')));
  assert.ok(warnings.some((warning) => warning.includes("Rien n'est exporté")));
});

test('getSlotTokens ignore un ancien fond statiquement masqué au profit du fond visible', async () => {
  const cache = {
    type: 'RECTANGLE',
    name: 'Ancien fond',
    visible: false,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'legacy' } as VariableAlias] },
  };
  const visible = {
    type: 'FRAME',
    name: 'Fond',
    visible: true,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'current' } as VariableAlias] },
  };
  const component = {
    type: 'COMPONENT',
    name: 'Button',
    boundVariables: {},
    findAll: (predicate: (node: never) => boolean) =>
      [cache, visible].filter(predicate as (node: unknown) => boolean),
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (candidate: VariableAlias | null | undefined) => {
      if (candidate?.id === 'legacy') return 'components.legacy.default.background';
      if (candidate?.id === 'current') return 'components.button.default.background';
      return null;
    },
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(component, resolver, warnings);

  assert.deepEqual(tokens.paints, {
    background: '{components.button.default.background}',
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Ancien fond/);
  assert.doesNotMatch(warnings[0], /Calque « Fond »/);
});

test('extractVariantTokens ne place pas le token d’un calque masqué dans tokensUsed', async () => {
  const hidden = {
    type: 'RECTANGLE',
    name: 'Halo obsolète',
    visible: false,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'hidden' } as VariableAlias] },
  };
  const component = {
    type: 'COMPONENT',
    name: 'State=Default',
    boundVariables: {},
    findAll: (predicate: (node: never) => boolean) =>
      [hidden].filter(predicate as (node: unknown) => boolean),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  await extractVariantTokens(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component }] },
    {
      resolve: async (candidate: VariableAlias | null | undefined) =>
        candidate?.id === 'hidden' ? 'components.button.default.ring' : null,
    },
    warnings,
  );

  assert.ok(warnings.some((warning) => warning.includes('Halo obsolète')));
});

test('extractVariantTokens signale deux variants aux mêmes valeurs d’axes (premier conservé)', async () => {
  const makeNode = (name: string, tokenId: string) => ({
    type: 'RECTANGLE',
    name,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: tokenId } as VariableAlias] },
    findAll: () => [],
  }) as unknown as ComponentNode;
  // Le premier variant de la matrice est aussi le plus LENT à résoudre : sans
  // insertion ordonnée, c'est le second qui gagnerait le conflit.
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (!alias) return null;
      if (alias.id === 'a') for (let tick = 0; tick < 3; tick += 1) await Promise.resolve();
      return `components.button.colors.${alias.id}.background`;
    },
  };
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'focus' }, component: makeNode('State=Focus', 'a') },
        { values: { state: 'focus' }, component: makeNode('State=Focus (doublon)', 'b') },
      ],
    },
    resolver,
    warnings,
  );

  // Le premier variant est conservé, le conflit est signalé — jamais en silence.
  assert.deepEqual(trees.variantTokens, {
    focus: { background: '{components.button.colors.a.background}' },
  });
  assert.ok(warnings.some((warning) => warning.includes('Variants « focus »')));
});

test('extractVariantTokens suit l’ordre de la matrice, pas l’ordre de résolution', async () => {
  const makeNode = (name: string, tokenId: string) => ({
    type: 'RECTANGLE',
    name,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: tokenId } as VariableAlias] },
    findAll: () => [],
  }) as unknown as ComponentNode;
  // Latences décroissantes : le premier variant de la matrice se règle en
  // dernier. Sans insertion ordonnée, deux exports d'un design inchangé
  // produiraient des JSON différents — donc une pull request pour rien.
  const ticksById: Record<string, number> = { a: 3, b: 1, c: 0 };
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (!alias) return null;
      for (let tick = 0; tick < ticksById[alias.id]; tick += 1) await Promise.resolve();
      return null; // Aucun token lié : chaque variant produit un avertissement.
    },
  };
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'default' }, component: makeNode('State=Default', 'a') },
        { values: { state: 'hover' }, component: makeNode('State=Hover', 'b') },
        { values: { state: 'focus' }, component: makeNode('State=Focus', 'c') },
      ],
    },
    resolver,
    warnings,
  );

  assert.deepEqual(Object.keys(trees.variantTokens), ['default', 'hover', 'focus']);
  assert.deepEqual(Object.keys(trees.variantStrokes), ['default', 'hover', 'focus']);
  // Les avertissements aussi entrent dans le contrat : leur ordre suit la matrice.
  assert.deepEqual(warnings, [
    'Variant « State=Default » : aucun fill ni stroke n’est relié à une variable. Aucune couleur n’est exportée pour lui.',
    'Variant « State=Hover » : aucun fill ni stroke n’est relié à une variable. Aucune couleur n’est exportée pour lui.',
    'Variant « State=Focus » : aucun fill ni stroke n’est relié à une variable. Aucune couleur n’est exportée pour lui.',
  ]);
});

test('extractVariantTokens normalise la clé de repli quand le set n’expose aucun axe', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'Icon Only',
    boundVariables: { fills: [colorAlias] },
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) =>
      alias?.id === 'color' ? 'components.button.colors.primary.default.background' : null,
  };

  const trees = await extractVariantTokens(
    { axes: [], variants: [{ values: {}, component: node }] },
    resolver,
    [],
  );

  // La clé « icon-only » suit la même normalisation que les valeurs d'axes.
  assert.deepEqual(Object.keys(trees.variantTokens), ['icon-only']);
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
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    { axes: ['state'], variants: [{ values: { state: 'focus' }, component: node }] },
    resolver,
    warnings,
  );

  assert.deepEqual(trees, {
    variantTokens: { focus: {} },
    variantStrokes: {
      focus: {
        ring: {
          color: '{components.button.colors.primary.focus.ring}',
          width: '{layouts.stroke.ring}',
          align: 'outside',
        },
      },
    },
  });
  assert.deepEqual(Array.from(collectTokenReferences(trees)).sort(), [
    '{components.button.colors.primary.focus.ring}',
    '{layouts.stroke.ring}',
  ]);
  assert.deepEqual(warnings, []);
});
