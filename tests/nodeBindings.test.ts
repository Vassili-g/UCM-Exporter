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
    boundVariables: { paddingLeft: alias('padding') },
  } as unknown as SceneNode;
  const warnings: string[] = [];
  const tokenNames = new Set<string>();

  const result = await resolveField(
    node,
    [['paddingLeft', 'paddingRight']],
    'padding-x',
    resolverFor({ padding: 'layouts.spacing.16' }),
    tokenNames,
    warnings,
  );

  assert.equal(result, null);
  assert.deepEqual([...tokenNames], []);
  assert.ok(warnings.some((warning) => warning.includes('paddingRight')));
  assert.ok(warnings.some((warning) => warning.includes('valeur non exportée')));
});

test('un groupe conjonctif complet exporte son unique token', async () => {
  const node = {
    type: 'FRAME',
    name: 'Wrapper',
    boundVariables: {
      paddingLeft: alias('padding'),
      paddingRight: alias('padding'),
    },
  } as unknown as SceneNode;
  const warnings: string[] = [];
  const tokenNames = new Set<string>();

  const result = await resolveField(
    node,
    [['paddingLeft', 'paddingRight']],
    'padding-x',
    resolverFor({ padding: 'layouts.spacing.16' }),
    tokenNames,
    warnings,
  );

  assert.equal(result, '{layouts.spacing.16}');
  assert.deepEqual([...tokenNames], ['{layouts.spacing.16}']);
  assert.deepEqual(warnings, []);
});

test('un groupe complet mais asymétrique ne conserve pas arbitrairement le premier token', async () => {
  const node = {
    type: 'FRAME',
    name: 'Wrapper',
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
  assert.ok(warnings.some((warning) => warning.includes('asymétriques')));
  assert.ok(warnings.some((warning) => warning.includes('valeur non exportée')));
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
  assert.ok(warnings.some((warning) => warning.includes('bottomRightRadius')));
});
