import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractVariantTokens,
  getSlotTokens,
  insertVariantLeaf,
} from '../src/contract/extractVariantTokens';
import { renderingSemanticsFor } from '../src/contract/semantics';
import { collectTokenReferences } from '../src/variables';

const colorAlias = { type: 'VARIABLE_ALIAS', id: 'color' } as VariableAlias;
const widthAlias = { type: 'VARIABLE_ALIAS', id: 'width' } as VariableAlias;
const iconAlias = { type: 'VARIABLE_ALIAS', id: 'icon' } as VariableAlias;
const surfaceAlias = { type: 'VARIABLE_ALIAS', id: 'surface' } as VariableAlias;

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
    paints: [],
    strokes: [{
      token: 'components.button.colors.primary.focus.ring',
      // « ring » nomme un rôle partagé : le designer l'a déclaré, il n'y a rien
      // à déduire du calque.
      role: 'ring',
      width: '{layouts.stroke.ring}',
      align: 'outside',
    }],
  });
  assert.deepEqual(warnings, []);
});

test('getSlotTokens déduit le rôle d’une clé qui n’en nomme aucun, depuis le calque', async () => {
  // Trois calques de natures différentes portent des tokens dont le dernier
  // segment ne dit rien de ce qu'ils peignent. C'est Figma qui le dit.
  const label = { type: 'TEXT', name: 'Titre', boundVariables: { fills: [colorAlias] }, findAll: () => [] };
  const glyphe = { type: 'VECTOR', name: 'circle-info', boundVariables: { fills: [iconAlias] }, findAll: () => [] };
  const cadre = {
    type: 'COMPONENT',
    name: 'Color=Primary',
    boundVariables: { fills: [surfaceAlias] },
    children: [label, glyphe],
    findAll: () => [label, glyphe],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'color') return 'components.card.colors.title';
      if (alias?.id === 'icon') return 'components.card.colors.glyph';
      if (alias?.id === 'surface') return 'components.card.colors.scale-1';
      return null;
    },
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(cadre, resolver, warnings, new Map(), new Set(['circle-info']));

  assert.deepEqual(
    tokens.paints.map((color) => [color.token, color.role]).sort(),
    [
      ['components.card.colors.glyph', 'icon'],
      ['components.card.colors.scale-1', 'background'],
      ['components.card.colors.title', 'foreground'],
    ],
  );
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

  assert.equal(tokens.strokes[0]?.width, null);
  assert.deepEqual(warnings, [
    `Layer « Button ring », stroke weight : aucune variable Figma n'est reliée. La valeur fixe n'est pas exportée. Reliez-la à une variable, puis réexportez.`,
  ]);
});

test('getSlotTokens publie une largeur de stroke partiellement liée', async () => {
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

  assert.deepEqual(tokens.strokes[0]?.width, { top: '{layouts.stroke.ring}' });
  assert.ok(warnings.some((warning) => warning.includes('right stroke weight')));
  assert.ok(warnings.some((warning) => warning.includes('les côtés tokenisés sont exportés')));
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

  assert.deepEqual(tokens.paints, [
    { token: 'components.button.default.background', role: 'background' },
  ]);
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

test('deux variants aux mêmes axes gardent leurs feuilles sans diagnostic d’index v9', async () => {
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
  const first = makeNode('State=Focus', 'a');
  const second = makeNode('State=Focus (doublon)', 'b');

  const trees = await extractVariantTokens(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'focus' }, component: first },
        { values: { state: 'focus' }, component: second },
      ],
    },
    resolver,
    warnings,
  );

  // L'index interne conserve le premier, mais il n'est plus sérialisé en v9 :
  // les deux feuilles exactes restent disponibles et aucune perte n'est à
  // corriger dans Figma.
  assert.deepEqual(trees.variantTokens, {
    focus: { background: '{components.button.colors.a.background}' },
  });
  assert.deepEqual(trees.tokensByComponent.get(first), {
    background: '{components.button.colors.a.background}',
  });
  assert.deepEqual(trees.tokensByComponent.get(second), {
    background: '{components.button.colors.b.background}',
  });
  assert.deepEqual(warnings, []);
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
    tokensByComponent: new Map([[node, {}]]),
    strokesByComponent: new Map([[node, {
      ring: {
        color: '{components.button.colors.primary.focus.ring}',
        width: '{layouts.stroke.ring}',
        align: 'outside',
      },
    }]]),
    paintNodeIdsByComponent: new Map([[node, {
      fills: {},
      strokes: { ring: [] },
    }]]),
    discoveredRoles: new Map(),
  });
  assert.deepEqual(Array.from(collectTokenReferences(trees)).sort(), [
    '{components.button.colors.primary.focus.ring}',
    '{layouts.stroke.ring}',
  ]);
  assert.deepEqual(warnings, []);
});

test('une valeur d’axe héritée d’Object.prototype reste une clé comme une autre', () => {
  const warnings: string[] = [];
  const arbre: Record<string, unknown> = {};

  insertVariantLeaf(arbre, ['variant'], { variant: 'constructor' }, { background: '{a.b}' }, warnings);
  insertVariantLeaf(arbre, ['tone', 'state'], { tone: '__proto__', state: 'default' }, { background: '{c.d}' }, warnings);

  // Lus et écrits en propriétés PROPRES : sans cela « constructor » passait pour
  // un doublon et « __proto__ » écrivait dans le prototype — l'arbre sortait
  // amputé, sans un mot. La comparaison passe par le JSON produit : un objet
  // littéral `{ __proto__: … }` fixerait lui aussi un prototype au lieu d'une clé.
  assert.deepEqual(Object.keys(arbre), ['constructor', '__proto__']);
  assert.equal(
    JSON.stringify(arbre),
    '{"constructor":{"background":"{a.b}"},"__proto__":{"default":{"background":"{c.d}"}}}',
  );
  assert.deepEqual(warnings, []);
});

test('un rôle homonyme d’Object.prototype n’invente pas une collision de fills', async () => {
  const node = {
    type: 'RECTANGLE',
    name: 'Fond',
    boundVariables: { fills: [colorAlias] },
    findAll: () => [],
  } as unknown as ComponentNode;
  const resolver = { resolve: async () => 'components.button.constructor' };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(node, resolver, warnings);

  // Un seul fill suffisait : l'accumulateur littéral rendait `Object` pour ce
  // rôle, le prenait pour une peinture déjà posée, écartait le token et
  // accusait le designer d'avoir mis deux fills sur un rôle qui n'en a qu'un.
  assert.deepEqual(tokens.paints, [
    { token: 'components.button.constructor', role: 'background' },
  ]);
  assert.deepEqual(warnings, []);
});

/**
 * Un composé et sa dépendance, chacun peignant une surface dont la variable
 * finit par le même segment.
 *
 * C'est le cas ordinaire d'un design system : le fond d'une Alert s'appelle
 * `…background`, celui du cadre qui la range aussi. Rien n'oblige le designer
 * à les distinguer, puisqu'ils vivent dans deux contrats différents.
 */
const composeAvecDependance = () => {
  const instance = {
    type: 'INSTANCE',
    id: 'alert',
    name: 'Alert',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'alert-bg' }] },
    children: [],
    findAll: () => [],
  };
  const cadre = {
    type: 'FRAME',
    id: 'panneau',
    name: 'Panneau',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'panneau-bg' }] },
    children: [],
    findAll: () => [],
  };
  const racine = {
    type: 'COMPONENT',
    id: 'variant',
    name: 'Variant=Default',
    boundVariables: {},
    children: [instance, cadre],
    findAll: () => [instance, cadre],
  } as unknown as ComponentNode;
  (instance as { parent?: unknown }).parent = racine;
  (cadre as { parent?: unknown }).parent = racine;
  return racine;
};

const resolveurDeFonds = {
  resolve: async (alias: VariableAlias | null | undefined) => {
    if (alias?.id === 'alert-bg') return 'components.alert.colors.info.background';
    if (alias?.id === 'panneau-bg') return 'components.page.colors.background';
    return null;
  },
};

test('la couleur portée par une dépendance n’entre pas dans le contrat du composé', async () => {
  const racine = composeAvecDependance();
  const warnings: string[] = [];

  const tokens = await getSlotTokens(
    racine,
    resolveurDeFonds,
    warnings,
    new Map([['alert', { component: 'Alert', figmaLayer: 'Alert' }]]),
  );

  // `getAllNodes` conserve l'instance pour que la structure la décrive comme un
  // slot ; sa couleur, elle, appartient au contrat de l'Alert. La relever ici
  // la ferait entrer dans `variantTokens` et dans `tokensUsed` du parent : le
  // contrat annoncerait une couleur qu'aucun de ses calques ne peint.
  assert.deepEqual(tokens.paints, [
    { token: 'components.page.colors.background', role: 'background', nodeIds: ['panneau'] },
  ]);
  assert.deepEqual(warnings, []);
});

test('deux calques dont les variables finissent pareil gardent chacun leur couleur', async () => {
  const racine = composeAvecDependance();
  const warnings: string[] = [];

  // Sans élagage — deux calques de ce contrat-ci — les deux couleurs portent le
  // même dernier segment. Elles sont RELEVÉES toutes les deux : c'est
  // `resolveColorKeys` qui leur donnera deux clés, pas le designer qui doit
  // renommer une variable.
  const tokens = await getSlotTokens(racine, resolveurDeFonds, warnings);

  assert.deepEqual(tokens.paints.map((color) => color.token), [
    'components.alert.colors.info.background',
    'components.page.colors.background',
  ]);
  assert.deepEqual(warnings, []);
});

test('deux fills du MÊME calque sont publiés, mais leur empilement est signalé', async () => {
  const calque = {
    type: 'FRAME',
    name: 'Panneau',
    boundVariables: {
      fills: [
        { type: 'VARIABLE_ALIAS', id: 'alert-bg' },
        { type: 'VARIABLE_ALIAS', id: 'panneau-bg' },
      ],
    },
    findAll: () => [],
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const tokens = await getSlotTokens(calque, resolveurDeFonds, warnings);

  // Les deux couleurs sortent — rien n'est perdu — mais un seul calque ne peut
  // porter qu'un fond : le contrat ne sait pas dire lequel est au-dessus.
  assert.equal(tokens.paints.length, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Panneau »/);
  assert.match(warnings[0], /laquelle est au-dessus/);
});

test('deux fills empilés avertissent même quand leurs noms finissent différemment', async () => {
  const calque = {
    type: 'FRAME',
    name: 'Dégradé',
    boundVariables: {
      fills: [
        { type: 'VARIABLE_ALIAS', id: 'fond' },
        { type: 'VARIABLE_ALIAS', id: 'accent' },
      ],
    },
    findAll: () => [],
  } as unknown as ComponentNode;
  const warnings: string[] = [];
  const resolver = {
    resolve: async (value: VariableAlias | null | undefined) =>
      value?.id === 'fond' ? 'colors.background' : 'colors.accent',
  };

  const tokens = await getSlotTokens(calque, resolver, warnings);

  assert.deepEqual(tokens.paints.map((color) => color.token), [
    'colors.background',
    'colors.accent',
  ]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ne peut pas exprimer laquelle est au-dessus/);
});

test('un même token utilisé pour deux rôles ne perd pas le conflit en silence', async () => {
  const texte = {
    type: 'TEXT',
    id: 'texte',
    name: 'Texte',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'shared' }] },
  };
  const racine = {
    type: 'COMPONENT',
    id: 'racine',
    name: 'Carte',
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'shared' }] },
    findAll: () => [texte],
  } as unknown as ComponentNode;
  const warnings: string[] = [];
  const resolver = { resolve: async () => 'colors.shared' };

  const tokens = await getSlotTokens(racine, resolver, warnings);

  assert.deepEqual(tokens.paints, [{
    token: 'colors.shared',
    role: 'background',
    nodeIds: ['racine', 'texte'],
  }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« background »/);
  assert.match(warnings[0], /« foreground »/);
});

/**
 * Le cas qui a motivé la 5.5, en vrai : un variant peint plusieurs surfaces,
 * dont deux fonds et deux bordures que le design system nomme par leur section.
 * Le contrat gardait la première de chaque paire et jetait l'autre.
 */
test('un variant à plusieurs surfaces publie TOUTES ses couleurs', async () => {
  const layer = (name: string, id: string, field: 'fills' | 'strokes') => ({
    type: 'FRAME',
    name,
    boundVariables: { [field]: [{ type: 'VARIABLE_ALIAS', id } as VariableAlias] },
    strokeAlign: 'INSIDE',
  });
  const userInput = layer('UserInput', 'userinput-bg', 'fills');
  const divider = layer('Divider', 'divider-bg', 'fills');
  const bordure = layer('UserInput', 'userinput-border', 'strokes');
  const racine = {
    type: 'COMPONENT',
    name: 'Variant=Default',
    boundVariables: { strokes: [{ type: 'VARIABLE_ALIAS', id: 'base-border' } as VariableAlias] },
    strokeAlign: 'INSIDE',
    findAll: () => [userInput, divider, bordure],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'userinput-bg') return 'components.stresstest.info.userinput.colors.background';
      if (alias?.id === 'divider-bg') return 'components.stresstest.info.divider.colors.background';
      if (alias?.id === 'base-border') return 'components.stresstest.info.base.colors.border';
      if (alias?.id === 'userinput-border') return 'components.stresstest.info.userinput.colors.border';
      return null;
    },
  };
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    { axes: ['variant'], variants: [{ values: { variant: 'default' }, component: racine }] },
    resolver,
    warnings,
  );

  assert.deepEqual(trees.variantTokens, {
    default: {
      'userinput.background': '{components.stresstest.info.userinput.colors.background}',
      'divider.background': '{components.stresstest.info.divider.colors.background}',
    },
  });
  assert.deepEqual(Object.keys(trees.variantStrokes.default as object).sort(), [
    'base.border',
    'userinput.border',
  ]);
  // Plus rien à demander au designer : son nommage suffisait.
  assert.deepEqual(warnings.filter((warning) => warning.includes('dernier segment')), []);
});

test('une clé allongée reçoit dans rendering.roles le rendu que son token déclare', async () => {
  const anneau = {
    type: 'FRAME',
    name: 'Halo',
    boundVariables: { strokes: [{ type: 'VARIABLE_ALIAS', id: 'halo' } as VariableAlias] },
    strokeAlign: 'OUTSIDE',
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Variant=Default',
    boundVariables: { strokes: [{ type: 'VARIABLE_ALIAS', id: 'base' } as VariableAlias] },
    strokeAlign: 'OUTSIDE',
    findAll: () => [anneau],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'halo') return 'components.card.halo.colors.ring';
      if (alias?.id === 'base') return 'components.card.base.colors.ring';
      return null;
    },
  };

  const trees = await extractVariantTokens(
    { axes: ['variant'], variants: [{ values: { variant: 'default' }, component: racine }] },
    resolver,
    [],
  );
  const rendering = renderingSemanticsFor(trees.discoveredRoles);

  // « ring » est une DÉCLARATION du designer : allongée, la clé conserve son
  // contour extérieur et son repli en box-shadow.
  assert.deepEqual(rendering.roles['halo.ring'], {
    kind: 'stroke',
    cssProperties: ['outline-color', 'outline-width'],
    fallback: 'box-shadow',
  });
  assert.deepEqual(rendering.roles['base.ring'], rendering.roles['halo.ring']);
});

test('un composant dont les clés nomment toutes un rôle partagé ne déduit aucun rendu', async () => {
  const racine = {
    type: 'COMPONENT',
    name: 'Variant=Default',
    boundVariables: { fills: [colorAlias] },
    findAll: () => [],
  } as unknown as ComponentNode;

  const trees = await extractVariantTokens(
    { axes: ['variant'], variants: [{ values: { variant: 'default' }, component: racine }] },
    { resolve: async () => 'components.button.colors.primary.default.background' },
    [],
  );

  // La porte reste fermée sur les cinq rôles partagés : `rendering.roles` d'un
  // composant déjà correct ne gagne aucune entrée.
  assert.deepEqual(trees.discoveredRoles, new Map());
  assert.deepEqual(
    Object.keys(renderingSemanticsFor(trees.discoveredRoles).roles),
    ['background', 'foreground', 'icon', 'border', 'ring'],
  );
});

test('un doublon d’axes garde une clé stable dans les vues exactes et l’index historique', async () => {
  const makeNode = (name: string, id: string) => ({
    type: 'RECTANGLE',
    name,
    boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id } as VariableAlias] },
    findAll: () => [],
  }) as unknown as ComponentNode;
  const resolver = {
    resolve: async (alias: VariableAlias | null | undefined) => {
      if (alias?.id === 'garde') return 'components.card.base.colors.background';
      if (alias?.id === 'ecarte') return 'components.card.autre.colors.background';
      return null;
    },
  };
  const warnings: string[] = [];

  const trees = await extractVariantTokens(
    {
      axes: ['state'],
      variants: [
        { values: { state: 'focus' }, component: makeNode('State=Focus', 'garde') },
        { values: { state: 'focus' }, component: makeNode('State=Focus (doublon)', 'ecarte') },
      ],
    },
    resolver,
    warnings,
  );

  // Les couleurs ne cohabitent dans aucune feuille exacte : elles partagent
  // donc la clé simple. L'index interne garde la première occurrence, mais la
  // v9 ne le sérialise plus.
  assert.deepEqual(trees.variantTokens, {
    focus: { background: '{components.card.base.colors.background}' },
  });
  assert.deepEqual(warnings, []);
});

/**
 * Contrat 7.0 : une largeur de contour se détaille par bord.
 *
 * Elle ne peut donc plus se comparer par identité — deux calques réglés
 * exactement pareil produisaient deux objets distincts, et l'avertissement de
 * géométrie contradictoire se serait déclenché sur un design correct, sans
 * qu'aucun geste du designer ne le fasse disparaître.
 */
test('getSlotTokens publie une largeur de stroke détaillée par bord', async () => {
  const bord = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const cadre = (name: string) => ({
    type: 'RECTANGLE',
    name,
    boundVariables: {
      strokes: [colorAlias],
      strokeTopWeight: bord('haut'),
      strokeRightWeight: bord('cote'),
      strokeBottomWeight: bord('bas'),
      strokeLeftWeight: bord('cote'),
    },
    strokeAlign: 'INSIDE',
    findAll: () => [],
  });
  const gauche = cadre('Encadré');
  const droite = cadre('Encadré jumeau');
  const racine = {
    type: 'COMPONENT',
    name: 'Card',
    boundVariables: {},
    children: [gauche, droite],
    findAll: (predicat: (node: never) => boolean) =>
      [gauche, droite].filter(predicat as (node: unknown) => boolean),
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async (candidate: VariableAlias | null | undefined) => ({
      color: 'components.card.colors.border',
      haut: 'layouts.stroke.thick',
      cote: 'layouts.stroke.thin',
      bas: 'layouts.stroke.thick',
    } as Record<string, string>)[candidate?.id ?? ''] ?? null,
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(racine, resolver, warnings);

  assert.deepEqual(tokens.strokes[0]?.width, {
    top: '{layouts.stroke.thick}',
    right: '{layouts.stroke.thin}',
    bottom: '{layouts.stroke.thick}',
    left: '{layouts.stroke.thin}',
  });
  // Deux calques réglés à l'identique ne se contredisent pas.
  assert.deepEqual(warnings, []);
});

/**
 * Régression : une couleur écrite à la main disparaissait en silence.
 *
 * Le cas réel est un variant sur quatre-vingt-dix — l'icône de droite d'un
 * bouton dont le fill avait perdu sa variable. La vue exacte cessait de citer ce
 * calque dans `paintPlacements`, le rendu le laissait sans encre, et
 * `meta.warnings` restait vide : rien ne ramenait le designer sur le calque
 * fautif.
 */
test('un fill posé à la main sur un calque publié est signalé', async () => {
  const glyphe = {
    type: 'VECTOR',
    name: 'Vector',
    fills: [{ type: 'SOLID', color: { r: 0.99, g: 0.99, b: 0.99 } }],
    boundVariables: {},
    findAll: () => [],
  };
  const icone = {
    type: 'INSTANCE',
    name: 'arrow-right-long',
    children: [glyphe],
    findAll: () => [glyphe],
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Color=Primary, Variant=Contained, State=Hover',
    boundVariables: { fills: [colorAlias] },
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.2, b: 0.2 } }],
    children: [icone],
    findAll: () => [icone, glyphe],
  } as unknown as ComponentNode;
  const resolver = {
    resolve: async () => 'components.button.colors.primary.contained.hover.background',
  };
  const warnings: string[] = [];

  const tokens = await getSlotTokens(racine, resolver, warnings);

  assert.equal(tokens.paints.length, 1, 'seule la couleur liée entre dans la feuille');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Vector/);
  assert.match(warnings[0], /aucune variable Figma/);
  assert.match(warnings[0], /réexportez/);
});

test('une peinture sans effet visible ne réclame aucune variable', async () => {
  // Chaque calque porte exactement une réserve : masqué, transparent, contour
  // d'épaisseur nulle, ou peinture qu'aucune variable de couleur ne sait tenir.
  const masque = {
    type: 'RECTANGLE',
    name: 'Masqué',
    fills: [{ type: 'SOLID', visible: false, color: { r: 0, g: 0, b: 0 } }],
    findAll: () => [],
  };
  const transparent = {
    type: 'RECTANGLE',
    name: 'Transparent',
    fills: [{ type: 'SOLID', opacity: 0, color: { r: 0, g: 0, b: 0 } }],
    findAll: () => [],
  };
  const sansEpaisseur = {
    type: 'RECTANGLE',
    name: 'Sans épaisseur',
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    strokeWeight: 0,
    findAll: () => [],
  };
  const degrade = {
    type: 'RECTANGLE',
    name: 'Dégradé',
    fills: [{ type: 'GRADIENT_LINEAR' }],
    findAll: () => [],
  };
  const enfants = [masque, transparent, sansEpaisseur, degrade];
  const racine = {
    type: 'COMPONENT',
    name: 'Variant=Default',
    children: enfants,
    findAll: () => enfants,
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  await getSlotTokens(racine, { resolve: async () => null }, warnings);

  assert.deepEqual(warnings, []);
});

test('un fill entièrement lié ne produit aucun avertissement', async () => {
  const racine = {
    type: 'COMPONENT',
    name: 'Variant=Default',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    boundVariables: { fills: [colorAlias] },
    findAll: () => [],
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const tokens = await getSlotTokens(racine, {
    resolve: async () => 'components.card.colors.background',
  }, warnings);

  assert.equal(tokens.paints.length, 1);
  assert.deepEqual(warnings, []);
});
