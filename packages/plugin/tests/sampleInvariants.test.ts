/**
 * Lois génériques de l'échantillonnage.
 *
 * Ces tests n'utilisent aucun composant du corpus Figma : les noms sont neutres
 * et chaque arbre est construit de toutes pièces. Ils protègent les frontières
 * de l'algorithme, pas une reconstruction particuliere du playground.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { indexMasterInstances } from '../src/contract/composedComponents';
import type {
  DependencyPropertySurface,
  DependencyPropertySurfaces,
  MasterInstanceDefaults,
} from '../src/contract/composedComponents';
import { extractVariantSample } from '../src/contract/extractSamples';
import { buildContractPropertySurface } from '../src/contract/propertySurface';
import type { ComposedDependency, SampleInstance } from '@ucm/kit/format';

type MockNode = SceneNode & {
  children: MockNode[];
  findAll: (predicate: (node: SceneNode) => boolean) => SceneNode[];
};

function node(
  type: SceneNode['type'],
  id: string,
  name: string,
  children: MockNode[] = [],
  extra: Record<string, unknown> = {},
): MockNode {
  const result = {
    type,
    id,
    name,
    children,
    boundVariables: {},
    visible: true,
    ...extra,
  } as unknown as MockNode;
  for (const child of children) (child as unknown as { parent: BaseNode }).parent = result;
  result.findAll = (predicate: (candidate: SceneNode) => boolean) => {
    const found: SceneNode[] = [];
    const visit = (items: readonly MockNode[]) => {
      for (const item of items) {
        if (predicate(item)) found.push(item);
        visit(item.children ?? []);
      }
    };
    visit(result.children);
    return found;
  };
  return result;
}

function instance(
  id: string,
  name: string,
  properties: ComponentProperties = {},
  children: MockNode[] = [],
  extra: Record<string, unknown> = {},
): InstanceNode & MockNode {
  return node('INSTANCE', id, name, children, {
    componentProperties: properties,
    exposedInstances: [],
    overrides: [],
    ...extra,
  }) as InstanceNode & MockNode;
}

function owner(
  id: string,
  name: string,
  definitions: ComponentPropertyDefinitions = {},
): ComponentSetNode {
  return {
    type: 'COMPONENT_SET',
    id,
    name,
    componentPropertyDefinitions: definitions,
  } as unknown as ComponentSetNode;
}

function master(
  id: string,
  name: string,
  propertyOwner: ComponentSetNode,
): ComponentNode {
  return {
    type: 'COMPONENT',
    id,
    name: `${name}=Default`,
    parent: propertyOwner,
  } as unknown as ComponentNode;
}

function standaloneMaster(id: string, name: string): ComponentNode {
  return {
    type: 'COMPONENT',
    id,
    name,
    parent: { type: 'PAGE' },
  } as unknown as ComponentNode;
}

function componentRoot(children: MockNode[]): ComponentNode & MockNode {
  return node('COMPONENT', 'root', 'Root', children, {
    layoutMode: 'VERTICAL',
  }) as ComponentNode & MockNode;
}

function sampleOf(
  root: ComponentNode,
  composed: ReadonlyMap<string, ComposedDependency>,
  mains: ReadonlyMap<string, ComponentNode>,
  defaults: ReadonlyMap<string, MasterInstanceDefaults> = new Map(),
  surfaces: DependencyPropertySurfaces = new Map(),
) {
  const paths = new Map<string, string[]>();
  for (const id of composed.keys()) paths.set(id, [id]);
  return extractVariantSample(
    { component: root, paths },
    undefined,
    new Set(),
    composed,
    mains,
    defaults,
    surfaces,
  );
}

test('args est une projection fermée de la surface publique et des types portables', () => {
  const definitions = {
    Mode: { type: 'VARIANT', variantOptions: ['Quiet', 'Loud'], defaultValue: 'Quiet' },
    'Enabled#1:1': { type: 'BOOLEAN', defaultValue: true },
    'Copy#1:2': { type: 'TEXT', defaultValue: 'Default' },
    'Glyph#1:3': { type: 'INSTANCE_SWAP', defaultValue: '2:1' },
    'Content#1:4': { type: 'SLOT', defaultValue: [] },
  } as unknown as ComponentPropertyDefinitions;
  const propertyOwner = owner('branch-owner', 'Branch', definitions);
  const glyph = instance('glyph', 'GlyphB', {}, [], {
    componentPropertyReferences: { mainComponent: 'Glyph#1:3' },
  });
  const branch = instance('branch', 'Branch layer', {
    Mode: { type: 'VARIANT', value: 'Loud' },
    'Enabled#1:1': { type: 'BOOLEAN', value: false },
    'Copy#1:2': { type: 'TEXT', value: 'Applied' },
    'Glyph#1:3': { type: 'INSTANCE_SWAP', value: '9:9' },
    'Content#1:4': { type: 'SLOT', value: ['free'] },
    'Unknown#1:5': { type: 'BOOLEAN', value: true },
  } as unknown as ComponentProperties, [glyph]);
  const dependency = { component: 'Branch', figmaLayer: 'Branch layer' };

  const sample = sampleOf(
    componentRoot([branch]),
    new Map([['branch', dependency]]),
    new Map([
      ['branch', master('branch-main', 'Branch', propertyOwner)],
      ['glyph', standaloneMaster('glyph-main', 'GlyphB')],
    ]),
    new Map(),
    new Map([[propertyOwner.id, buildContractPropertySurface(definitions)]]),
  );

  assert.deepEqual(sample.composes?.[0].args, {
    mode: 'loud',
    enabled: false,
    copy: 'Applied',
    glyph: 'GlyphB',
  });
  const args = sample.composes?.[0].args as Record<string, string | boolean>;
  assert.equal(args.content, undefined);
  assert.equal(args.unknown, undefined);
});

test('le contenu rendu suit la visibilité effective sans effacer les valeurs false', () => {
  const definitions = {
    'Enabled#1:1': { type: 'BOOLEAN', defaultValue: true },
  } as ComponentPropertyDefinitions;
  const propertyOwner = owner('branch-owner', 'Branch', definitions);
  const copy = node('TEXT', 'copy', 'Copy', [], {
    characters: 'Hidden value',
  });
  const glyph = instance('glyph', 'GlyphB');
  const hidden = node('FRAME', 'hidden', 'Hidden group', [copy, glyph], {
    visible: false,
    componentPropertyReferences: { visible: 'Visible#1:2' },
  });
  const branch = instance(
    'branch',
    'Branch layer',
    { 'Enabled#1:1': { type: 'BOOLEAN', value: false } },
    [hidden],
    {
      overrides: [{ id: 'copy', overriddenFields: ['characters', 'visible'] }],
    },
  );
  const dependency = { component: 'Branch', figmaLayer: 'Branch layer' };

  const sample = sampleOf(
    componentRoot([branch]),
    new Map([['branch', dependency]]),
    new Map([
      ['branch', master('branch-main', 'Branch', propertyOwner)],
      ['glyph', standaloneMaster('glyph-main', 'GlyphB')],
    ]),
    new Map([[
      'branch-main',
      new Map([['0.1', { masterPath: ['Hidden group', 'GlyphA'], component: 'GlyphA' }]]),
    ]]),
    new Map([[propertyOwner.id, buildContractPropertySurface(definitions)]]),
  );

  assert.equal(sample.text, undefined);
  assert.deepEqual(sample.composes, [{
    figmaLayer: 'Branch layer',
    component: 'Branch',
    args: { enabled: false },
    overrides: [{ figmaPath: ['Hidden group', 'Copy'], visible: true }],
    slotPath: ['branch'],
  }]);
});

test('seul le wrapper élu complète la surface, sans collision ni premier arbitraire', () => {
  const directDefinitions = {
    'Mode#1:1': { type: 'BOOLEAN', defaultValue: true },
  } as ComponentPropertyDefinitions;
  const wrapperDefinitions = {
    'Scale#2:1': { type: 'VARIANT', variantOptions: ['S', 'L'], defaultValue: 'S' },
    'Mode#2:2': { type: 'BOOLEAN', defaultValue: false },
  } as ComponentPropertyDefinitions;
  const directOwner = owner('branch-owner', 'Branch', directDefinitions);
  const wrapperOwner = owner('wrapper-owner', 'Wrapper', wrapperDefinitions);
  const unrelatedOwner = owner('unrelated-owner', 'Internal', {
    'Noise#3:1': { type: 'BOOLEAN', defaultValue: false },
  } as ComponentPropertyDefinitions);
  const elected = instance('wrapper', 'Wrapper layer', {
    'Scale#2:1': { type: 'VARIANT', value: 'L' },
    'Mode#2:2': { type: 'BOOLEAN', value: false },
  });
  const unrelated = instance('internal', 'Internal layer', {
    'Noise#3:1': { type: 'BOOLEAN', value: true },
  });
  const branch = instance('branch', 'Branch layer', {
    'Mode#1:1': { type: 'BOOLEAN', value: true },
  }, [], { exposedInstances: [unrelated, elected] });
  const dependency = { component: 'Branch', figmaLayer: 'Branch layer' };
  const surface: DependencyPropertySurface = {
    ...buildContractPropertySurface(directDefinitions, wrapperDefinitions, []),
    wrapperOwnerId: wrapperOwner.id,
  };
  const mains = new Map([
    ['branch', master('branch-main', 'Branch', directOwner)],
    ['wrapper', master('wrapper-main', 'Wrapper', wrapperOwner)],
    ['internal', master('internal-main', 'Internal', unrelatedOwner)],
  ]);

  const unique = sampleOf(
    componentRoot([branch]),
    new Map([['branch', dependency]]),
    mains,
    new Map(),
    new Map([[directOwner.id, surface]]),
  );
  assert.deepEqual(unique.composes?.[0].args, { mode: true, scale: 'l' });

  const duplicate = instance('wrapper-2', 'Wrapper layer 2', {
    'Scale#2:1': { type: 'VARIANT', value: 'S' },
  });
  (duplicate as unknown as { parent: BaseNode }).parent = branch;
  (branch as unknown as { exposedInstances: readonly InstanceNode[] }).exposedInstances = [
    elected,
    duplicate,
  ];
  mains.set('wrapper-2', master('wrapper-main-2', 'Wrapper', wrapperOwner));

  const ambiguous = sampleOf(
    componentRoot([branch]),
    new Map([['branch', dependency]]),
    mains,
    new Map(),
    new Map([[directOwner.id, surface]]),
  );
  assert.deepEqual(ambiguous.composes?.[0].args, { mode: true });
});

test('un SLOT coupe toute comparaison positionnelle de remplacement', async () => {
  const nestedGlyph = instance('glyph', 'GlyphB', {}, [], {
    getMainComponentAsync: async () => standaloneMaster('glyph-main', 'GlyphA'),
  });
  const slot = node('SLOT', 'slot', 'Content', [nestedGlyph]);
  const dependency = instance('branch', 'Branch layer', {}, [slot]);
  const propertyOwner = owner('branch-owner', 'Branch');

  const sample = sampleOf(
    componentRoot([dependency]),
    new Map([['branch', { component: 'Branch', figmaLayer: 'Branch layer' }]]),
    new Map([
      ['branch', master('branch-main', 'Branch', propertyOwner)],
      ['glyph', standaloneMaster('glyph-b-main', 'GlyphB')],
    ]),
    new Map([[
      'branch-main',
      new Map([['0.0', { masterPath: ['Content', 'GlyphA'], component: 'GlyphA' }]]),
    ]]),
  );
  assert.equal(sample.composes?.[0].swaps, undefined);

  const masterRoot = node('COMPONENT', 'master-root', 'Branch=Default', [slot], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;
  const defaults = await indexMasterInstances(masterRoot, new Set());
  assert.equal(defaults.size, 0);
});

test('la composition conserve profondeur, ordre et occurrences homonymes', () => {
  const depth = 48;
  const dependencies = new Map<string, ComposedDependency>();
  const mains = new Map<string, ComponentNode>();
  const propertyOwner = owner('branch-owner', 'Branch');
  let current = instance(`branch-${depth - 1}`, 'Branch');
  dependencies.set(current.id, { component: 'Branch', figmaLayer: 'Branch' });
  mains.set(current.id, master(`main-${depth - 1}`, 'Branch', propertyOwner));

  const twins = [instance('leaf-a', 'Leaf'), instance('leaf-b', 'Leaf')];
  current.children.push(...twins);
  for (const twin of twins) {
    (twin as unknown as { parent: BaseNode }).parent = current;
  }
  for (const twin of twins) {
    dependencies.set(twin.id, { component: 'Leaf', figmaLayer: 'Leaf' });
    mains.set(twin.id, master(`${twin.id}-main`, 'Leaf', owner('leaf-owner', 'Leaf')));
  }

  for (let index = depth - 2; index >= 0; index -= 1) {
    current = instance(`branch-${index}`, 'Branch', {}, [current]);
    dependencies.set(current.id, { component: 'Branch', figmaLayer: 'Branch' });
    mains.set(current.id, master(`main-${index}`, 'Branch', propertyOwner));
  }

  const sample = sampleOf(componentRoot([current]), dependencies, mains);
  let cursor: SampleInstance | undefined = sample.composes?.[0];
  for (let index = 0; index < depth - 1; index += 1) {
    assert.equal(cursor?.component, 'Branch');
    cursor = cursor?.composes?.[0];
  }
  assert.equal(cursor?.component, 'Branch');
  assert.deepEqual(cursor?.composes?.map(({ component, figmaLayer }) => ({
    component,
    figmaLayer,
  })), [
    { component: 'Leaf', figmaLayer: 'Leaf' },
    { component: 'Leaf', figmaLayer: 'Leaf' },
  ]);
});

test('un cadre optionnel masqué au-dessus d’une dépendance emporte son contenu rendu', () => {
  // La frontière de visibilité est la racine du composant exporté, jamais
  // l'instance de dépendance : un cadre que CE variant masque ne montre rien de
  // ce qu'il contient, si profond que ce soit. Le cadre est masqué par une
  // liaison de visibilité — sans elle, il serait élagué bien avant l'échantillon.
  const definitions = {
    'Enabled#1:1': { type: 'BOOLEAN', defaultValue: true },
  } as ComponentPropertyDefinitions;
  const propertyOwner = owner('branch-owner', 'Branch', definitions);

  const construire = (cadreVisible: boolean) => {
    const copy = node('TEXT', 'copy', 'Copy', [], { characters: 'Texte saisi' });
    const glyph = instance('glyph', 'GlyphB');
    const branch = instance(
      'branch',
      'Branch layer',
      { 'Enabled#1:1': { type: 'BOOLEAN', value: false } },
      [copy, glyph],
      { overrides: [{ id: 'copy', overriddenFields: ['characters'] }] },
    );
    const cadre = node('FRAME', 'cadre', 'Cadre optionnel', [branch], {
      visible: cadreVisible,
      componentPropertyReferences: { visible: 'Show#9:9' },
    });
    return sampleOf(
      componentRoot([cadre]),
      new Map([['branch', { component: 'Branch', figmaLayer: 'Branch layer' }]]),
      new Map([
        ['branch', master('branch-main', 'Branch', propertyOwner)],
        ['glyph', standaloneMaster('glyph-main', 'GlyphB')],
      ]),
      new Map([[
        'branch-main',
        new Map([['1', { masterPath: ['GlyphA'], component: 'GlyphA' }]]),
      ]]),
      new Map([[propertyOwner.id, buildContractPropertySurface(definitions)]]),
    );
  };

  // Cadre affiché : les deux relevés positionnels sont publiés.
  const affiche = construire(true).composes?.[0];
  assert.deepEqual(affiche?.swaps, [{ masterPath: ['GlyphA'], component: 'GlyphB' }]);
  assert.deepEqual(affiche?.overrides, [{ figmaPath: ['Copy'], text: 'Texte saisi' }]);

  // Cadre masqué : ils disparaissent tous les deux, et RIEN d'autre ne bouge —
  // l'entrée de la dépendance et sa valeur `false` décrivent l'état masqué.
  const masque = construire(false).composes;
  assert.deepEqual(masque, [{
    figmaLayer: 'Branch layer',
    component: 'Branch',
    args: { enabled: false },
    slotPath: ['branch'],
  }]);
});

test('un SLOT ne coupe pas la résolution NOMINALE d’un remplacement natif', () => {
  // La borne du SLOT appartient aux comparaisons POSITIONNELLES, qui supposent
  // l'instance isomorphe à son maître. Joindre `componentPropertyReferences` à
  // une propriété déclarée n'en est pas une : couper ici retirerait la clé
  // d'`args` sans que `swaps` reprenne la main, et le fait n'aurait plus aucun
  // propriétaire.
  const definitions = {
    'Glyph#1:3': { type: 'INSTANCE_SWAP', defaultValue: '2:1' },
  } as unknown as ComponentPropertyDefinitions;
  const propertyOwner = owner('branch-owner', 'Branch', definitions);
  const glyph = instance('glyph', 'GlyphB', {}, [], {
    componentPropertyReferences: { mainComponent: 'Glyph#1:3' },
  });
  const slot = node('SLOT', 'slot', 'Contenu', [glyph]);
  const branch = instance('branch', 'Branch layer', {
    'Glyph#1:3': { type: 'INSTANCE_SWAP', value: '9:9' },
  } as unknown as ComponentProperties, [slot]);

  const sample = sampleOf(
    componentRoot([branch]),
    new Map([['branch', { component: 'Branch', figmaLayer: 'Branch layer' }]]),
    new Map([
      ['branch', master('branch-main', 'Branch', propertyOwner)],
      ['glyph', standaloneMaster('glyph-main', 'GlyphB')],
    ]),
    new Map(),
    new Map([[propertyOwner.id, buildContractPropertySurface(definitions)]]),
  );

  assert.deepEqual(sample.composes?.[0].args, { glyph: 'GlyphB' });
});
