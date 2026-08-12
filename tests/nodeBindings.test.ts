/**
 * Tests des invariants communs aux liaisons Figma.
 *
 * Ces tests partent des propriétés attendues par le contrat, pas des branches
 * actuelles de l'implémentation : une dimension composée doit être complète,
 * et un calque ne participe à l'export que s'il peut réellement être rendu.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveField,
  resolveTokenName,
} from '../src/contract/nodeBindings';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

test('un groupe conjonctif incomplet n’affirme pas une valeur symétrique', async () => {
  const node = {
    type: 'FRAME',
    name: 'Wrapper',
    layoutMode: 'HORIZONTAL',
    boundVariables: { paddingLeft: alias('padding') },
  } as unknown as SceneNode;
  const warnings: string[] = [];

  const result = await resolveField(
    node,
    [['paddingLeft', 'paddingRight']],
    'padding-x',
    resolverFor({ padding: 'layouts.spacing.16' }),
    warnings,
  );

  assert.equal(result, null);
  assert.ok(warnings.some((warning) => warning.includes('right padding')));
  assert.ok(warnings.some((warning) => warning.includes("Rien n'est exporté")));
});

test('un groupe conjonctif complet exporte son unique token', async () => {
  const node = {
    type: 'FRAME',
    name: 'Wrapper',
    layoutMode: 'HORIZONTAL',
    boundVariables: {
      paddingLeft: alias('padding'),
      paddingRight: alias('padding'),
    },
  } as unknown as SceneNode;
  const warnings: string[] = [];

  const result = await resolveField(
    node,
    [['paddingLeft', 'paddingRight']],
    'padding-x',
    resolverFor({ padding: 'layouts.spacing.16' }),
    warnings,
  );

  assert.equal(result, '{layouts.spacing.16}');
  assert.equal(result, '{layouts.spacing.16}');
  assert.deepEqual(warnings, []);
});

test('les valeurs Figma neutres par défaut ne demandent pas de variable', async () => {
  const node = {
    type: 'FRAME',
    name: 'Texte',
    layoutMode: 'VERTICAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    cornerRadius: 0,
    boundVariables: {},
  } as unknown as SceneNode;

  for (const [alternatives, label] of [
    [[['itemSpacing']], 'gap'],
    [[['paddingLeft', 'paddingRight']], 'horizontal padding'],
    [[['cornerRadius']], 'corner radius'],
  ] as const) {
    const warnings: string[] = [];
    const result = await resolveField(node, alternatives, label, resolverFor({}), warnings);

    assert.equal(result, null);
    assert.deepEqual(warnings, []);
  }
});

test('un espacement réparti par Figma n’est pas présenté comme un gap fixe', async () => {
  const node = {
    type: 'FRAME',
    name: 'Barre',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    itemSpacing: 0,
    // La liaison survit au passage en « Auto » : l'exporter ferait affirmer au
    // contrat un écart que le rendu n'a pas.
    boundVariables: { itemSpacing: alias('gap') },
  } as unknown as SceneNode;
  const warnings: string[] = [];

  const result = await resolveField(
    node,
    [['itemSpacing']],
    'gap',
    resolverFor({ gap: 'layouts.spacing.8' }),
    warnings,
  );

  assert.equal(result, null);
  // La répartition elle-même est désormais publiée par justifyContent. Ce
  // contrôle ne traite que le gap, que Figma ignore en mode « Auto ».
  assert.deepEqual(warnings, []);
});

test('sans auto layout, gap et paddings sont dits inapplicables, pas non reliés', async () => {
  const node = {
    type: 'FRAME',
    name: 'Bloc libre',
    layoutMode: 'NONE',
    itemSpacing: 8,
    paddingLeft: 12,
    paddingRight: 12,
    boundVariables: {},
  } as unknown as SceneNode;
  const warnings: string[] = [];

  for (const [alternatives, label] of [
    [[['itemSpacing']], 'gap'],
    [[['paddingLeft', 'paddingRight']], 'horizontal padding'],
  ] as const) {
    assert.equal(
      await resolveField(node, alternatives, label, resolverFor({}), warnings),
      null,
    );
  }

  // Un seul texte pour les deux appels : la déduplication de l'export n'en
  // gardera qu'un, et le geste à faire est le même.
  assert.equal(new Set(warnings).size, 1);
  assert.ok(warnings[0].includes("n'utilise pas d'auto layout"));
  assert.ok(warnings[0].includes('ne veut donc pas dire zéro'));
  assert.ok(!warnings[0].includes('aucune variable'));
});

test('un radius reste exporté sur un layer sans auto layout', async () => {
  const node = {
    type: 'FRAME',
    name: 'Carte',
    layoutMode: 'NONE',
    boundVariables: { cornerRadius: alias('radius') },
  } as unknown as SceneNode;
  const warnings: string[] = [];

  const result = await resolveField(
    node,
    [['cornerRadius']],
    'corner radius',
    resolverFor({ radius: 'layouts.radius.8' }),
    warnings,
  );

  assert.equal(result, '{layouts.radius.8}');
  assert.deepEqual(warnings, []);
});

test('un groupe complet mais asymétrique ne conserve pas arbitrairement le premier token', async () => {
  const node = {
    type: 'FRAME',
    name: 'Wrapper',
    layoutMode: 'HORIZONTAL',
    boundVariables: {
      paddingLeft: alias('left'),
      paddingRight: alias('right'),
    },
  } as unknown as SceneNode;
  const warnings: string[] = [];

  const result = await resolveTokenName(
    node,
    [['paddingLeft', 'paddingRight']],
    'padding-x',
    resolverFor({
      left: 'layouts.spacing.12',
      right: 'layouts.spacing.16',
    }),
    warnings,
  );

  assert.equal(result, null);
  assert.ok(warnings.some((warning) => warning.includes('pas reliés à la même variable')));
  assert.ok(warnings.some((warning) => warning.includes("Rien n'est exporté")));
});

test('les représentations du rayon sont alternatives mais chacune reste complète', async () => {
  const uniforme = {
    type: 'FRAME',
    name: 'Rayon uniforme',
    boundVariables: { cornerRadius: alias('radius') },
  } as unknown as SceneNode;
  const coins = {
    type: 'FRAME',
    name: 'Rayons indépendants',
    boundVariables: {
      topLeftRadius: alias('radius'),
      topRightRadius: alias('radius'),
      bottomLeftRadius: alias('radius'),
      bottomRightRadius: alias('radius'),
    },
  } as unknown as SceneNode;
  const incomplet = {
    type: 'FRAME',
    name: 'Rayons incomplets',
    boundVariables: {
      topLeftRadius: alias('radius'),
      topRightRadius: alias('radius'),
      bottomLeftRadius: alias('radius'),
    },
  } as unknown as SceneNode;
  const alternatives = [
    ['cornerRadius'],
    ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'],
  ];

  assert.equal(
    await resolveTokenName(
      uniforme,
      alternatives,
      'border-radius',
      resolverFor({ radius: 'layouts.radius.8' }),
      [],
    ),
    'layouts.radius.8',
  );
  assert.equal(
    await resolveTokenName(
      coins,
      alternatives,
      'border-radius',
      resolverFor({ radius: 'layouts.radius.8' }),
      [],
    ),
    'layouts.radius.8',
  );

  const warnings: string[] = [];
  assert.equal(
    await resolveTokenName(
      incomplet,
      alternatives,
      'border-radius',
      resolverFor({ radius: 'layouts.radius.8' }),
      warnings,
    ),
    null,
  );
  assert.ok(warnings.some((warning) => warning.includes('bottom right corner radius')));
});
