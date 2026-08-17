import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractVariantTokens,
  getSlotTokens,
  insertVariantLeaf,
} from '../src/contract/extractVariantTokens';
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
    paints: {},
    strokes: {
      ring: {
        color: '{components.button.colors.primary.focus.ring}',
        width: '{layouts.stroke.ring}',
        align: 'outside',
      },
    },
    // « ring » nomme un rôle partagé : le designer l'a déclaré, il n'y a rien
    // à déduire du calque.
    roles: new Map(),
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

  assert.deepEqual(tokens.roles, new Map([
    ['scale-1', 'background'],
    ['title', 'foreground'],
    ['glyph', 'icon'],
  ]));
  // Les clés restent celles du design system : rien n'est renommé, rien n'est
  // perdu, les trois couleurs coexistent dans la feuille.
  assert.deepEqual(Object.keys(tokens.paints).sort(), ['glyph', 'scale-1', 'title']);
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
  assert.deepEqual(tokens.paints, { constructor: '{components.button.constructor}' });
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
  // la ferait entrer dans `variantTokens` ET évincerait, sur la même clé, la
  // couleur que ce contrat possède vraiment.
  assert.deepEqual(tokens.paints, { background: '{components.page.colors.background}' });
  assert.deepEqual(warnings, []);
});

test('deux calques du composant qui se disputent une clé nomment les deux calques', async () => {
  const racine = composeAvecDependance();
  const warnings: string[] = [];

  // Sans élagage — l'ancien comportement — les deux couleurs se disputent la
  // clé « background ». Le message doit alors nommer les DEUX layers : demander
  // « ne gardez qu'un fill » à un calque qui n'en a qu'un est insuivable.
  await getSlotTokens(racine, resolveurDeFonds, warnings);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Panneau »/);
  assert.match(warnings[0], /« Alert »/);
  assert.match(warnings[0], /dernier segment différent/);
});

test('deux fills du MÊME calque gardent le message qui leur correspond', async () => {
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

  await getSlotTokens(calque, resolveurDeFonds, warnings);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /deux fills portent la même clé/);
});
