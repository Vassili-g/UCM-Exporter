/**
 * Tests de l'orchestrateur de structure : assemblage layout + tailles +
 * arbres de variantes, et les cas limites qui ne se voient pas à l'œil sur un
 * JSON — le composant sans layout, et l'unicité des dimensions.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';
import { collectTokenReferences } from '../src/variables';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

test('extractStructure survit à un composant sans node de layout', async () => {
  const { structure, warnings } = await extractStructure(
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
  assert.deepEqual(Array.from(collectTokenReferences(structure)).sort(), []);
  assert.ok(warnings.some((w) => w.includes('Aucun auto layout frame trouvé')));
});

test('extractStructure ne recopie pas la couleur du label hors de variantTokens', async () => {
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

  const { structure } = await extractStructure(
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

  // La couleur du label vit dans `variantTokens`, et nulle part ailleurs : elle
  // dépend du variant, alors qu'un slot est unique. La recopier sur le slot
  // fige la valeur du variant de référence pour tous les autres.
  const label = structure.children.find((child) => child.slot === 'label');
  assert.ok(label, 'le slot label doit exister');
  assert.equal('color' in label, false);
  assert.deepEqual(structure.variantTokens, {
    primary: {
      background: '{components.button.colors.primary.contained.default.background}',
      foreground: '{components.button.colors.primary.contained.default.foreground}',
    },
  });
  assert.deepEqual(Array.from(collectTokenReferences(structure)).sort(), [
    '{components.button.colors.primary.contained.default.background}',
    '{components.button.colors.primary.contained.default.foreground}',
    '{components.button.sizes.medium.gap}',
  ]);
});

test('extractStructure déduit le rôle d’une clé qui n’en nomme aucun, sans rien signaler', async () => {
  // Un token nommé « …/bg » ne dit pas ce qu'il peint, mais le calque qui le
  // porte le dit : un fill sur un cadre est une surface. Demander au designer
  // de le renommer « background » ne servait à rien, et l'aurait fait perdre
  // dès qu'un second calque du même variant est peint.
  const reference = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    boundVariables: { fills: [alias('bg')] },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const { warnings, discoveredRoles } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({ bg: 'components.button.colors.primary.default.bg' }),
  );

  assert.deepEqual(discoveredRoles, new Map([['bg', 'background']]));
  assert.ok(!warnings.some((w) => w.includes('« bg »')));
});

test('extractStructure conserve les warnings de la matrice de variantes', async () => {
  const { warnings } = await extractStructure(
    { axes: [], variants: [] },
    ['Le component set sélectionné ne contient aucun variant.'],
    null,
    null,
    resolverFor({}),
  );

  assert.ok(warnings.includes('Le component set sélectionné ne contient aucun variant.'));
});

test('extractStructure n’ajoute pas de bloc sizes quand aucun axe n’est un axe de tailles', async () => {
  const reference = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;
  // Le set existe et est atteignable, mais son seul axe porte des couleurs :
  // c'est bien l'absence d'axe de TAILLES qui doit décider, pas celle d'un wrapper.
  (reference as unknown as { parent: unknown }).parent = {
    type: 'COMPONENT_SET',
    name: 'Badge',
    componentPropertyDefinitions: { Color: { type: 'VARIANT', variantOptions: ['Primary'] } },
    children: [reference],
  };

  const { structure } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    { instance: reference as unknown as InstanceNode, componentSet: null },
    reference,
    resolverFor({ gap: 'layouts.spacing.8' }),
  );

  assert.equal('sizes' in structure, false);
});

test('extractStructure lit les tailles d’un composant plat, sans wrapper', async () => {
  // L'axe de tailles vit d'ordinaire sur le wrapper. Un composant plat le porte
  // sur son propre set : ses dimensions par taille ne doivent pas disparaître.
  const variantFor = (size: string) => ({
    type: 'COMPONENT',
    name: `Size=${size}`,
    variantProperties: { Size: size },
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias(`gap-${size}`) },
    children: [],
    findAll: findAllOn([]),
  }) as unknown as ComponentNode;

  const small = variantFor('Small');
  const big = variantFor('Big');
  const componentSet = {
    type: 'COMPONENT_SET',
    name: 'Chip',
    componentPropertyDefinitions: { Size: { type: 'VARIANT', variantOptions: ['Small', 'Big'] } },
    children: [small, big],
  } as unknown as ComponentSetNode;
  (small as unknown as { parent: unknown }).parent = componentSet;
  (big as unknown as { parent: unknown }).parent = componentSet;

  const { structure } = await extractStructure(
    { axes: ['size'], variants: [{ values: { size: 'small' }, component: small }] },
    [],
    null,
    small,
    resolverFor({ 'gap-Small': 'components.chip.sizes.small.gap', 'gap-Big': 'components.chip.sizes.big.gap' }),
  );

  assert.deepEqual(Object.keys(structure.sizes ?? {}), ['small', 'big']);
  assert.equal(structure.sizes?.small.gap, '{components.chip.sizes.small.gap}');
  assert.equal(structure.sizes?.big.gap, '{components.chip.sizes.big.gap}');
  // Dès que `sizes` existe, les dimensions du niveau haut disparaissent : les
  // garder recopierait la taille de référence, et une copie finit par mentir.
  assert.equal('gap' in structure, false);
  assert.equal('padding' in structure, false);
  assert.equal('radius' in structure, false);
});

test('extractStructure garde les dimensions au niveau haut sans axe de tailles', async () => {
  const reference = {
    type: 'COMPONENT',
    name: 'Severity=Info',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const { structure } = await extractStructure(
    { axes: ['severity'], variants: [{ values: { severity: 'info' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({ gap: 'components.alert.sizes.gap' }),
  );

  // Sans `sizes`, le niveau haut n'est pas une recopie : c'est le seul endroit
  // où les dimensions existent. Les retirer les perdrait purement et simplement.
  assert.equal(structure.gap, '{components.alert.sizes.gap}');
  assert.equal('sizes' in structure, false);
});

test('extractStructure avertit quand les parties texte divergent entre variants', async () => {
  const variant = (name: string, secondText: string) => {
    const titre = { type: 'TEXT', id: `${name}-title`, name: 'Titre', boundVariables: {} };
    const description = { type: 'TEXT', id: `${name}-body`, name: secondText, boundVariables: {} };
    const contenu = {
      type: 'FRAME',
      id: `${name}-content`,
      name: 'Contenu',
      layoutMode: 'VERTICAL',
      boundVariables: { itemSpacing: alias('text-gap') },
      children: [titre, description],
      findAll: findAllOn([titre, description]),
    };
    (titre as { parent?: unknown }).parent = contenu;
    (description as { parent?: unknown }).parent = contenu;
    const component = {
      type: 'COMPONENT',
      id: name,
      name,
      layoutMode: 'HORIZONTAL',
      boundVariables: { itemSpacing: alias('gap') },
      children: [contenu],
      findAll: findAllOn([contenu, titre, description]),
    } as unknown as ComponentNode;
    (contenu as { parent?: unknown }).parent = component;
    return component;
  };
  const reference = variant('Severity=Info', 'Description');
  const divergent = variant('Severity=Warning', 'Détail');

  const { warnings } = await extractStructure(
    {
      axes: ['severity'],
      variants: [
        { values: { severity: 'info' }, component: reference },
        { values: { severity: 'warning' }, component: divergent },
      ],
    },
    [],
    null,
    reference,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      'text-gap': 'components.alert.sizes.text-gap',
    }),
  );

  assert.ok(warnings.some(
    (warning) => warning.includes('Structure différente')
      && warning.includes('Severity=Warning')
      && warning.includes('Severity=Info'),
  ));
});

test('extractStructure avertit quand l’alignement Flex diverge entre variants', async () => {
  const variant = (name: string, counterAxisAlignItems: string) => ({
    type: 'COMPONENT',
    id: name,
    name,
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems,
    boundVariables: {},
    children: [],
    findAll: findAllOn([]),
  }) as unknown as ComponentNode;
  const reference = variant('Severity=Info', 'CENTER');
  const divergent = variant('Severity=Warning', 'MIN');

  const { structure, warnings } = await extractStructure(
    {
      axes: ['severity'],
      variants: [
        { values: { severity: 'info' }, component: reference },
        { values: { severity: 'warning' }, component: divergent },
      ],
    },
    [],
    null,
    reference,
    resolverFor({}),
  );

  assert.equal(structure.alignItems, 'center');
  assert.ok(warnings.some(
    (warning) => warning.includes('Auto layout différent')
      && warning.includes('Severity=Warning')
      && warning.includes('Severity=Info'),
  ));
});

test('extractStructure avertit quand le remplissage d’un slot diverge entre variants', async () => {
  const variant = (name: string, layoutGrow: number) => {
    const label = {
      type: 'TEXT',
      id: `${name}-label`,
      name: 'Message',
      layoutGrow,
      layoutAlign: 'INHERIT',
      boundVariables: {},
    };
    return {
      type: 'COMPONENT',
      id: name,
      name,
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'CENTER',
      boundVariables: {},
      children: [label],
      findAll: findAllOn([label]),
    } as unknown as ComponentNode;
  };
  const reference = variant('Severity=Info', 1);
  const divergent = variant('Severity=Warning', 0);

  const { structure, warnings } = await extractStructure(
    {
      axes: ['severity'],
      variants: [
        { values: { severity: 'info' }, component: reference },
        { values: { severity: 'warning' }, component: divergent },
      ],
    },
    [],
    null,
    reference,
    resolverFor({}),
  );

  assert.equal(structure.children[0].flexGrow, 1);
  assert.ok(warnings.some(
    (warning) => warning.includes('Auto layout différent')
      && warning.includes('Severity=Warning'),
  ));
});
