/**
 * Tests de l'orchestrateur de structure : assemblage layout + tailles +
 * arbres de variantes, et les deux cas limites qui ne se voient pas à l'œil
 * sur un JSON — le composant sans layout, et le rattachement de la couleur
 * du label.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

test('extractStructure survit à un composant sans node de layout', async () => {
  const { structure, tokensUsed, warnings } = await extractStructure(
    { axes: [], variants: [] },
    [],
    null,
    null,
    resolverFor({}),
  );

  // Aucun blocage : la structure est vide et le manque est signalé.
  assert.equal(structure.layout, 'flex-row');
  assert.deepEqual(structure.children, []);
  assert.deepEqual(structure.variantTokens, {});
  assert.deepEqual(tokensUsed, []);
  assert.ok(warnings.includes('Aucun node de layout trouvé ; structure de dimensions vide.'));
});

test('extractStructure rattache au label la couleur foreground du variant de référence', async () => {
  const texte = {
    type: 'TEXT',
    name: 'Suivant',
    boundVariables: {
      fontSize: alias('fs'),
      fills: [alias('fg')],
    },
  };
  const reference = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap'), fills: [alias('bg')] },
    children: [texte],
    findAll: findAllOn([texte]),
  } as unknown as ComponentNode;

  const { structure, tokensUsed } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({
      gap: 'components.button.sizes.medium.gap',
      fs: 'components.button.sizes.medium.font-size',
      fg: 'components.button.colors.primary.contained.default.foreground',
      bg: 'components.button.colors.primary.contained.default.background',
    }),
  );

  const label = structure.children.find((child) => child.slot === 'label');
  assert.equal(label?.color, '{components.button.colors.primary.contained.default.foreground}');
  assert.deepEqual(structure.variantTokens, {
    primary: {
      background: '{components.button.colors.primary.contained.default.background}',
      foreground: '{components.button.colors.primary.contained.default.foreground}',
    },
  });
  // `tokensUsed` est trié et dédupliqué : le foreground n'y figure qu'une fois,
  // bien qu'il soit cité par `variantTokens` ET par `children[label].color`.
  assert.deepEqual(tokensUsed, [
    '{components.button.colors.primary.contained.default.background}',
    '{components.button.colors.primary.contained.default.foreground}',
    '{components.button.sizes.medium.font-size}',
    '{components.button.sizes.medium.gap}',
  ]);
});

test('extractStructure remonte les warnings de rôle non rendable', async () => {
  // Un token nommé « …/bg » produit un contrat valide que personne ne peindra :
  // le contrôle des rôles doit traverser l'orchestrateur jusqu'aux warnings.
  const reference = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    boundVariables: { fills: [alias('bg')] },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const { warnings } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({ bg: 'components.button.colors.primary.default.bg' }),
  );

  assert.ok(warnings.some((w) => w.startsWith('Rôle « bg » inconnu de rendering.roles')));
});

test('extractStructure conserve les warnings de la matrice de variantes', async () => {
  const { warnings } = await extractStructure(
    { axes: [], variants: [] },
    ['Aucun variant trouvé sur le Component Set sélectionné.'],
    null,
    null,
    resolverFor({}),
  );

  assert.ok(warnings.includes('Aucun variant trouvé sur le Component Set sélectionné.'));
});

test('extractStructure n’ajoute pas de bloc sizes sans component set de wrapper', async () => {
  const reference = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const { structure } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    { instance: reference as unknown as InstanceNode, componentSet: null },
    reference,
    resolverFor({ gap: 'layouts.spacing.8' }),
  );

  assert.equal('sizes' in structure, false);
});
