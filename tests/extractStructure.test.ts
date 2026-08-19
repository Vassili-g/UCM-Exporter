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

test('chaque couleur et contour est situé sur son chemin exact dans la vue', async () => {
  const divider = {
    type: 'RECTANGLE',
    id: 'divider-id',
    name: 'Divider',
    strokeWeight: 0,
    strokeAlign: 'INSIDE',
    boundVariables: { strokes: [alias('border')] },
    children: [],
    findAll: findAllOn([]),
  };
  const panneau = {
    type: 'FRAME',
    id: 'panel-id',
    name: 'Panel',
    layoutMode: 'VERTICAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    boundVariables: { fills: [alias('surface')] },
    children: [divider],
    findAll: findAllOn([divider]),
  };
  const reference = {
    type: 'COMPONENT',
    id: 'variant-id',
    name: 'State=Default',
    layoutMode: 'HORIZONTAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    boundVariables: {},
    children: [panneau],
    findAll: findAllOn([panneau, divider]),
  } as unknown as ComponentNode;

  const { variants } = await extractStructure(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({ surface: 'colors.surface', border: 'colors.border' }),
  );

  assert.deepEqual(variants[0]?.paintPlacements, {
    fills: { surface: [['panel']] },
    strokes: { border: [['panel', 'divider']] },
  });
});

test('la couleur des tracés d’une icône est située sur le slot de l’icône', async () => {
  // Le contrat ne publie pas les tracés d'une icône importée — c'est la règle,
  // et aucun geste du designer ne la changera. Leur fill entre pourtant dans
  // `variants[].tokens` : le situer sur le calque publié qui les porte est la
  // seule lecture qui laisse le consommateur peindre l'icône. Deux tracés d'une
  // même icône ne donnent qu'une cible, et rien n'est demandé au designer.
  const traces = ['Vector', 'Vector 2'].map((name, index) => ({
    type: 'VECTOR',
    id: `vector-${index}`,
    name,
    boundVariables: { fills: [alias('fg')] },
    children: [],
    findAll: findAllOn([]),
  }));
  const icone = {
    type: 'INSTANCE',
    id: 'icon-id',
    name: 'arrow-right-long',
    boundVariables: {},
    children: traces,
    findAll: findAllOn(traces),
  };
  const libelle = {
    type: 'TEXT',
    id: 'label-id',
    name: 'Suivant',
    boundVariables: { fills: [alias('fg')] },
  };
  const reference = {
    type: 'COMPONENT',
    id: 'variant-id',
    name: 'Color=Primary',
    layoutMode: 'HORIZONTAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    boundVariables: {},
    children: [libelle, icone],
    findAll: findAllOn([libelle, icone, ...traces]),
  } as unknown as ComponentNode;

  const { variants, warnings } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({ fg: 'components.button.colors.primary.foreground' }),
    new Map(),
    ['arrow-right-long'],
  );

  // Le texte est publié, l'icône aussi ; ses deux tracés partagent son chemin.
  assert.deepEqual(variants[0]?.paintPlacements, {
    fills: { foreground: [['label'], ['icon']] },
    strokes: {},
  });
  assert.equal(
    warnings.some((warning) => warning.includes('arbre publié')),
    false,
    'aucun avertissement ne réclame de rendre publiable un tracé d’icône',
  );
});

test('un calque écarté de la projection garde sa place dans la vue exacte', async () => {
  // La vue exacte part de la VRAIE racine du variant, pas du node de layout élu :
  // un calque posé à côté de ce node y est publié, et sa peinture y est située.
  // C'est la projection `structure` qui l'écarte, et elle a déjà son message et
  // son geste. Un second message sur la même peinture réclamerait autre chose au
  // même designer pour le même calque.
  const errant = {
    type: 'RECTANGLE',
    id: 'stray-id',
    name: 'Repère',
    boundVariables: { fills: [alias('stray')] },
    children: [],
    findAll: findAllOn([]),
  };
  const libelle = {
    type: 'TEXT',
    id: 'label-id',
    name: 'Suivant',
    boundVariables: {},
  };
  const cadre = {
    type: 'FRAME',
    id: 'frame-id',
    name: 'Wrapper',
    layoutMode: 'HORIZONTAL',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    boundVariables: { itemSpacing: alias('gap'), fills: [alias('bg')] },
    children: [libelle],
    findAll: findAllOn([libelle]),
  };
  const reference = {
    type: 'COMPONENT',
    id: 'variant-id',
    name: 'Color=Primary',
    boundVariables: {},
    children: [cadre, errant],
    findAll: findAllOn([cadre, libelle, errant]),
  } as unknown as ComponentNode;
  // La remontée d'ancêtres est ce qui repère un calque posé à côté du node élu.
  (cadre as { parent?: unknown }).parent = reference;

  const { structure, variants, warnings, notices } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolverFor({
      gap: 'components.button.sizes.gap',
      bg: 'components.button.colors.primary.background',
      stray: 'components.button.colors.primary.stray',
    }),
  );

  // La projection l'écarte : elle ne décrit que les enfants du node élu.
  assert.deepEqual(structure.children.map((child) => child.slot), ['label']);
  // La vue exacte, elle, le situe — c'est elle que le consommateur lit.
  assert.deepEqual(variants[0]?.paintPlacements.fills.stray, [['repère']]);
  // Son déplacement est demandé une seule fois, par la note dédiée à la
  // projection ; la peinture, elle, ne réclame plus rien.
  assert.ok(notices.some((note) => note.includes('Repère')
    && note.includes('Déplacez-le dans cet auto layout frame')));
  assert.equal(
    [...warnings, ...notices].some((message) => message.includes('arbre publié')),
    false,
  );
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

test('les variantes aux mêmes coordonnées gardent leurs propres couleurs et strokes', async () => {
  const variant = (id: string, name: string, fill: string, stroke: string) => ({
    type: 'COMPONENT',
    id,
    name,
    layoutMode: 'HORIZONTAL',
    boundVariables: { fills: [alias(fill)], strokes: [alias(stroke)] },
    children: [],
    findAll: findAllOn([]),
  }) as unknown as ComponentNode;
  const first = variant('first', 'State=Focus', 'fill-first', 'stroke-first');
  const second = variant('second', 'State=focus', 'fill-second', 'stroke-second');

  const { structure, variants, warnings } = await extractStructure(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'focus' }, component: first },
        { values: { state: 'focus' }, component: second },
      ],
    },
    [],
    null,
    first,
    resolverFor({
      'fill-first': 'colors.first.background',
      'stroke-first': 'colors.first.border',
      'fill-second': 'colors.second.background',
      'stroke-second': 'colors.second.border',
    }),
  );

  assert.deepEqual(variants.map(({ tokens, strokes }) => ({ tokens, strokes })), [
    {
      tokens: { background: '{colors.first.background}' },
      strokes: { border: { color: '{colors.first.border}', width: null, align: null } },
    },
    {
      tokens: { background: '{colors.second.background}' },
      strokes: { border: { color: '{colors.second.border}', width: null, align: null } },
    },
  ]);
  assert.deepEqual(structure.variantTokens, {
    focus: { background: '{colors.first.background}' },
  });
  assert.equal(
    warnings.some((warning) => warning.includes('Les deux restent dans la liste exacte')),
    false,
  );
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

test('extractStructure note la divergence de structure entre variants, sans rien réclamer', async () => {
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

  const { infos } = await extractStructure(
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

  assert.ok(infos.some(
    (note) => note.includes('Structure différente')
      && note.includes('Severity=Warning')
      && note.includes('Severity=Info'),
  ));
});

test('extractStructure note la divergence d’auto layout entre variants, sans rien réclamer', async () => {
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

  const { structure, infos } = await extractStructure(
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
  assert.ok(infos.some(
    (note) => note.includes('Auto layout différent')
      && note.includes('Severity=Warning')
      && note.includes('Severity=Info'),
  ));
});

test('extractStructure note le remplissage divergent d’un slot entre variants', async () => {
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

  const { structure, infos } = await extractStructure(
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
  assert.ok(infos.some(
    (note) => note.includes('Auto layout différent')
      && note.includes('Severity=Warning'),
  ));
});
