import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXTENSION_VERSION_TOKENS,
  TOKENS_FORMAT_VERSION,
  etatDuFormatDeTokens,
  toRef,
} from '@ucm-kit/core/format';
import { indexerTokensDtcg, referencesAbsentes } from '@ucm-kit/core/lecteurs';
import {
  annonceDuFormat,
  buildLeaf,
  couleurDtcg,
  dtcgType,
  formatValue,
  handleExportTokens,
  insert,
  isUnitless,
  modeCollisionWarnings,
  etatDesTokens,
} from '../src/tokens/exportTokens';
import type { ExportContext } from '../src/tokens/exportTokens';
import { collisionWarnings, indexVariables, VariableNameResolver } from '../src/variables';
import { phraseDe } from '../src/contract/localisation';
import { serializeJson } from '../src/contract/serializeJson';
import { exporterLeFichier, fichierDeVariables } from './fichierDeVariables';
import type { ProfilColorimetrique } from './fichierDeVariables';

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

test('formatValue écrit une dimension en objet pixel, laisse les nombres bruts', () => {
  const px = (value: number) => ({ value, unit: 'px' });
  assert.deepEqual(formatValue(8, 'FLOAT', 'sizes.spacing.8', [], 'srgb'), px(8));
  assert.equal(formatValue(600, 'FLOAT', 'layouts.fontweight.600', [], 'srgb'), 600);
  assert.equal(formatValue(600, 'FLOAT', 'layouts.font-weight.600', [], 'srgb'), 600);
  assert.deepEqual(formatValue(24, 'FLOAT', 'layouts.lineheight.base', [], 'srgb'), px(24));
  assert.deepEqual(formatValue(24, 'FLOAT', 'fondations.taille-de-ligne', ['LINE_HEIGHT'], 'srgb'), px(24));
  assert.equal(formatValue('Open Sans', 'STRING', 'layouts.fontfamily.base', [], 'srgb'), 'Open Sans');
  assert.deepEqual(formatValue({ r: 1, g: 1, b: 1, a: 0.5 }, 'COLOR', 'c', [], 'display-p3'), {
    colorSpace: 'display-p3', components: [1, 1, 1], alpha: 0.5,
  });
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

  const first = variable('v1', 'Foo Bar');
  const second = variable('v2', 'foo-bar');

  const index = indexVariables([first, second], new Map([['brand', collection]]));

  assert.deepEqual([...index.variableByPath.keys()], ['brand.foo-bar']);
  assert.equal(index.variableByPath.get('brand.foo-bar'), first);

  assert.equal(index.pathById.get('v2'), undefined);
  assert.deepEqual(index.ambiguous.get('v2'), {
    name: 'foo-bar',
    owner: 'Foo Bar',
    path: 'brand.foo-bar',
    ownerPath: 'brand.foo-bar',
    kind: 'same-path',
  });
  assert.deepEqual(collisionWarnings(index).map(phraseDe), [
    'Variables « Foo Bar » et « foo-bar » : leurs noms donnent le même token ' +
      "« brand.foo-bar ». Le développeur n'aura pas « foo-bar ». Renommez l'une des deux, " +
      'puis réexportez.',
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
  ]).map(phraseDe);

  assert.deepEqual(warnings, [
    'Collection « Brand Tokens » : deux de ses modes donnent le même nom ' +
      '« marque-2 » dans le fichier de tokens. Les valeurs du second manqueront au ' +
      "développeur. Renommez l'un des deux, puis réexportez.",
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
    espace: 'srgb',
    graisses: new Set(),
    familles: new Set(),
    easingsEcartees: new Map(),
  }, []);

  // Premier conservé, comme partout ailleurs ; le doublon est signalé une
  // seule fois par modeCollisionWarnings, pas à chaque variable.
  assert.deepEqual(leaf.$extensions, {
    'com.ucm.modes': { 'marque-2': { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 } },
  });
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
    espace: 'srgb',
    graisses: new Set(),
    familles: new Set(),
    easingsEcartees: new Map(),
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
    espace: 'srgb',
    graisses: new Set(),
    familles: new Set(),
    easingsEcartees: new Map(),
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
  const srgb = (r: number, g: number, b: number) =>
    `{"colorSpace":"srgb","components":[${r},${g},${b}],"alpha":1}`;
  assert.equal(
    JSON.stringify(modes),
    `{"constructor":${srgb(1, 0, 0)},"__proto__":${srgb(0, 1, 0)},"marque-3":${srgb(0, 0, 1)}}`,
  );
  assert.deepEqual(warnings, []);
});

/**
 * L'export des tokens est de portée fichier : il ignore la sélection et
 * lit toutes les variables locales. Rien à l'écran n'en disait la taille, si
 * bien que la commande partait sans que personne sache sur quoi.
 */
test('le résumé des tokens compte ce qui part, au singulier comme au pluriel', () => {
  assert.deepEqual(etatDesTokens({ collections: 3, variables: 128, modes: 2 }), {
    resume: '3 collections · 128 variables · 2 modes',
    presents: true,
  });
  assert.deepEqual(etatDesTokens({ collections: 1, variables: 1, modes: 1 }), {
    resume: '1 collection · 1 variable',
    presents: true,
  });
});

test('un fichier sans variable locale le dit, au lieu de compter zéro', () => {
  assert.deepEqual(etatDesTokens({ collections: 0, variables: 0, modes: 0 }), {
    resume: 'Ce fichier ne contient aucune variable locale.',
    presents: false,
  });
});

/**
 * L'interface n'offre la commande que si elle a quelque chose à emporter.
 * Ce sont donc les variables qui décident, et non les collections : trois
 * collections vides annonceraient du contenu que `handleExportTokens` refuse
 * ensuite d'exporter, et le designer découvrirait une erreur rouge après le
 * clic pour un fichier parfaitement normal.
 */
test('des collections vides ne comptent pas comme des tokens présents', () => {
  assert.deepEqual(etatDesTokens({ collections: 3, variables: 0, modes: 2 }), {
    resume: 'Ce fichier ne contient aucune variable locale.',
    presents: false,
  });
});

/**
 * Les deux artefacts se recoupent par la référence. Une collection « $Brand »
 * faisait sortir son token de l'index du kit, et « {Brand} » écrivait une
 * référence que le kit ne reconnaît pas : dans les deux cas, le contrôle du
 * repository ne trouvait pas le token que le contrat citait.
 */
test('un token de collection « $Brand » ou « {Brand} » se trouve par la référence qu’un contrat écrit', async () => {
  const collections = ['$Brand', '{Brand}'].map((name, rang) => ({
    id: `c${rang}`, name, defaultModeId: 'm', modes: [{ modeId: 'm', name: 'Mode 1' }],
  })) as unknown as VariableCollection[];
  const variables = ['color/primary', 'color/secondary'].map((name, rang) => ({
    id: `v${rang}`, name, variableCollectionId: `c${rang}`,
    resolvedType: 'COLOR', scopes: [], valuesByMode: { m: { r: 1, g: 0, b: 0, a: 1 } },
  })) as unknown as Variable[];

  const precedent = (globalThis as { figma?: unknown }).figma;
  (globalThis as { figma?: unknown }).figma = {
    root: { documentColorProfile: 'SRGB', name: 'Collections' },
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
      getVariableByIdAsync: async (id: string) => variables.find((entry) => entry.id === id) ?? null,
      getVariableCollectionByIdAsync: async (id: string) =>
        collections.find((entry) => entry.id === id) ?? null,
    },
    getLocalTextStylesAsync: async () => [],
  };

  try {
    const exporte = await handleExportTokens();
    const index = indexVariables(variables, new Map(collections.map((entry) => [entry.id, entry])));
    const references: string[] = [];
    // Avec l'index, le chemin d'une variable locale ; sans, celui d'une variable
    // de bibliothèque. L'export composant écrit l'un ou l'autre.
    for (const resolver of [new VariableNameResolver({ index }), new VariableNameResolver()]) {
      for (const entry of variables) references.push(toRef((await resolver.resolveById(entry.id)) ?? ''));
    }

    assert.deepEqual(referencesAbsentes(references, indexerTokensDtcg(JSON.parse(exporte.content))), []);
    assert.deepEqual([...new Set(references)], ['{brand.color.primary}', '{brand.color.secondary}']);
    assert.deepEqual(exporte.warnings, []);
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
  }
});

/**
 * Deux exports du même fichier Figma doivent donner les mêmes octets : une pull
 * request d'export compare le contenu, et un écart d'ordre ou d'arrondi en
 * ouvrirait une pour un fichier inchangé.
 */
test('deux exports du même fichier sont identiques à l’octet, et le fichier écrit se relit', async () => {
  const premier = await exporterLeFichier();
  const second = await exporterLeFichier();

  assert.equal(second.content, premier.content);
  assert.equal(serializeJson(JSON.parse(premier.content)), premier.content);
});

/** Les chemins, les types et les références d'un export, sans ses valeurs littérales. */
function squelette(contenu: string) {
  type Feuille = { $value: unknown; $type: string; $extensions?: Record<string, Record<string, unknown>> };
  const index = indexerTokensDtcg(JSON.parse(contenu)) as Map<string, Feuille>;
  return [...index].map(([chemin, feuille]) => {
    const modes = feuille.$extensions?.['com.ucm.modes'] ?? {};
    const references = [feuille.$value, ...Object.values(modes)]
      .map((valeur) => (typeof valeur === 'string' && valeur.startsWith('{') ? valeur : '·'));
    return `${chemin} ${feuille.$type} ${Object.keys(modes).join('|')} ${references.join(' ')}`;
  });
}

test('le profil colorimétrique ne change ni un chemin, ni un type, ni une référence', async () => {
  const reference = squelette((await exporterLeFichier({ profil: 'SRGB' })).content);
  for (const profil of ['DISPLAY_P3', 'LEGACY'] as ProfilColorimetrique[]) {
    assert.deepEqual(squelette((await exporterLeFichier({ profil })).content), reference, profil);
  }
});

test('les clés héritées d’Object.prototype restent des tokens et des modes', async () => {
  const tokens = JSON.parse((await exporterLeFichier()).content);

  assert.deepEqual(Object.keys(tokens.keys), ['__proto__', 'constructor', 'prototype', 'value', 'type']);
  for (const groupe of Object.keys(tokens.keys)) {
    const modes = tokens.keys[groupe].primary.$extensions['com.ucm.modes'];
    assert.deepEqual(Object.keys(modes), ['constructor', '__proto__', 'prototype'], groupe);
  }
});

/** Le document que la commande écrit, relu depuis son JSON. */
async function documentExporte(options: Parameters<typeof exporterLeFichier>[0] = {}) {
  const exporte = await exporterLeFichier(options);
  return { exporte, tokens: JSON.parse(exporte.content) };
}

test('la racine porte la version 2 du format de tokens, écrite une fois et avant les groupes', async () => {
  const { exporte, tokens } = await documentExporte();

  assert.ok(exporte.content.startsWith('{\n  "$extensions":{\n    "com.ucm.formatVersion":2\n  },\n'));
  assert.deepEqual(tokens.$extensions, { [EXTENSION_VERSION_TOKENS]: TOKENS_FORMAT_VERSION });
  assert.deepEqual(etatDuFormatDeTokens(tokens), { etat: 'courante', version: 2 });
  assert.equal(exporte.content.split('"$extensions":{\n').length - 1, 1, 'une seule marque, à la racine');
  // La marque n'est ni un token ni un groupe de plus. Six variables `EASING`
  // du fichier simulé n'ont aucune courbe, et l'export les écarte.
  assert.equal(indexerTokensDtcg(tokens).size, 52);
});

test('la marque précède aussi une collection dont le nom est un nombre', async () => {
  const fichier = fichierDeVariables();
  (fichier.collections[0] as { name: string }).name = '2026';
  const { exporte, tokens } = await documentExporte({ fichier });

  // `JSON.parse` range une clé entière en tête de l'objet ; le fichier écrit,
  // lui, commence toujours par la marque.
  assert.deepEqual(Object.keys(tokens).slice(0, 2), ['2026', '$extensions']);
  assert.ok(exporte.content.startsWith('{\n  "$extensions":'));
});

test('une couleur sRGB porte son espace, ses trois composantes et son alpha, sans arrondi', async () => {
  const { tokens } = await documentExporte({ profil: 'SRGB' });
  const couleur = (nom: string) => tokens.primitives.color[nom].$value;

  assert.deepEqual(couleur('red'), { colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 });
  assert.deepEqual(couleur('transparent'), { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0 });
  assert.deepEqual(couleur('half'), { colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.5 });
  assert.deepEqual(couleur('precise'), {
    colorSpace: 'srgb', components: [0.123456789, 0.987654321, 0.3333333333333333], alpha: 1,
  });
});

test('une couleur sans alpha reçoit alpha 1', () => {
  assert.deepEqual(couleurDtcg({ r: 1, g: 0.5, b: 0 }, 'srgb'), {
    colorSpace: 'srgb', components: [1, 0.5, 0], alpha: 1,
  });
});

test('un document Display P3 publie ses composantes en display-p3, sans conversion', async () => {
  const { tokens, exporte } = await documentExporte({ profil: 'DISPLAY_P3' });

  assert.deepEqual(tokens.primitives.color.green.$value, {
    colorSpace: 'display-p3', components: [0, 1, 0], alpha: 1,
  });
  assert.deepEqual(tokens['brand-tokens'].primary.default.$extensions['com.ucm.modes']['marque-2'], {
    colorSpace: 'display-p3', components: [0, 0, 1], alpha: 1,
  });
  assert.equal(exporte.content.includes('"srgb"'), false, 'aucune couleur ne reste en srgb');
});

test('un document sans profil est publié en sRGB, sous un seul avertissement', async () => {
  const { tokens, exporte } = await documentExporte({ profil: 'LEGACY' });
  const reference = await exporterLeFichier({ profil: 'SRGB' });

  assert.equal(exporte.content, reference.content);
  const profil = exporte.warnings.filter((message) => message.includes('profil de couleur'));
  assert.deepEqual(profil, [
    'Fichier « Fichier de variables » : aucun profil de couleur n’est choisi. Le développeur '
      + 'recevra ces couleurs en sRGB, que Figma les affiche en sRGB ou en Display P3. Choisissez '
      + 'sRGB ou Display P3 dans le menu File color profile, puis réexportez.',
  ]);
  assert.equal(exporte.warningCount, reference.warningCount + 1);
  assert.ok(exporte.parties.get(profil[0]), 'les trois parties atteignent l’interface');
  assert.equal(tokens.primitives.color.red.$value.colorSpace, 'srgb');
});

test('une dimension s’écrit { value, unit: "px" }, zéro, fraction et négatif compris', async () => {
  const { tokens } = await documentExporte();
  const dimensions = tokens.primitives.dimensions;

  assert.deepEqual(dimensions.none.$value, { value: 0, unit: 'px' });
  assert.deepEqual(dimensions['4'].$value, { value: 4, unit: 'px' });
  assert.deepEqual(dimensions['0,5'].$value, { value: 0.5, unit: 'px' });
  assert.deepEqual(dimensions.negative.$value, { value: -2, unit: 'px' });
  // Un nombre sans unité reste un nombre.
  assert.equal(tokens.primitives.opacity.disabled.$value, 0.4);
  assert.equal(tokens.primitives.graisse.$value, 600);
});

test('un alias reste une référence, dans chaque mode, et chaque mode a la forme de $value', async () => {
  const { tokens } = await documentExporte();
  const marque = tokens['brand-tokens'];

  assert.equal(marque.primary.default.$value, '{primitives.color.red}');
  assert.deepEqual(marque.primary.chain.$extensions['com.ucm.modes'], {
    intencial: '{brand-tokens.primary.default}', 'marque-2': '{brand-tokens.primary.default}',
  });
  assert.deepEqual(marque.radius.base.$extensions['com.ucm.modes'], {
    intencial: '{primitives.dimensions.4}', 'marque-2': { value: 8, unit: 'px' },
  });
  assert.equal(tokens.semantic.spacing.chain.$value, '{brand-tokens.radius.base}');
  assert.deepEqual(tokens.keys.value.primary.$extensions['com.ucm.modes'].__proto__, { value: 2, unit: 'px' });
});

test('le résultat annonce le module et la version lus dans le fichier produit', async () => {
  const { exporte } = await documentExporte();
  assert.equal(annonceDuFormat(exporte.content), 'DTCG 2025.10, version 2 du format de tokens');
  assert.equal(annonceDuFormat('{}'), null);
  assert.equal(annonceDuFormat('pas du JSON'), null);
});

/** Le `$type` et les valeurs de chaque mode d'une feuille, `$value` en tête. */
function typeEtValeurs(feuille: { $type: string; $value: unknown; $extensions?: Record<string, Record<string, unknown>> }) {
  const modes = feuille.$extensions?.['com.ucm.modes'];
  return [feuille.$type, feuille.$value, ...(modes ? Object.values(modes) : [])];
}

test('une graisse dont chaque mode porte un nom connu devient un nombre, mode par mode', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.primitives.fontweight.regular), ['number', 400]);
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontweight.bold), ['number', 700]);
  assert.deepEqual(typeEtValeurs(tokens.primitives['font-weight'].semibold), ['number', 600]);
  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].fontweight.heading), ['number', 700, 700, 600]);
});

test('une graisse reste une chaîne, inchangée, dès qu’un mode n’est pas un nom connu', async () => {
  const { tokens } = await documentExporte();
  const marque = tokens['brand-tokens'].fontweight;

  // « 700 » n'est pas un nom de graisse : la table ne s'élargit pas pour l'export.
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontweight.numeric), ['string', '700']);
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontweight.free), ['string', 'Condensed']);
  assert.deepEqual(typeEtValeurs(marque.mixed), ['string', 'Bold', 'Bold', 'Condensed']);
  assert.deepEqual(typeEtValeurs(marque.incomplete), ['string', 'Bold', 'Bold', null]);
  // Une famille n'est jamais une graisse, même aliasée : elle reçoit son
  // propre type, décidé par `famillesDeTokens`.
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontfamily.base), ['fontFamily', 'Open Sans']);
  assert.equal(tokens['brand-tokens'].typography.family.$type, 'fontFamily');
});

test('une famille prouvée par un text style type toute sa composante d’alias', async () => {
  const { tokens } = await documentExporte();

  // Un seul text style relie `fontfamily/base` ; `typography/family` l'alias
  // et reçoit le même type, sans que son nom entre dans la décision.
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontfamily.base), ['fontFamily', 'Open Sans']);
  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].typography.family), [
    'fontFamily',
    '{primitives.fontfamily.base}',
    '{primitives.fontfamily.base}',
    '{primitives.fontfamily.base}',
  ]);
});

test('un scope limité à Font family prouve une famille, mode par mode', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.primitives.fontfamily.mono), ['fontFamily', 'Roboto Mono']);
  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].typography['family-multi']), [
    'fontFamily', 'Open Sans', 'Open Sans', 'Roboto Mono',
  ]);
});

test('une preuve accompagnée d’un conflit laisse la famille en chaîne, et le dit', async () => {
  const { exporte, tokens } = await documentExporte();

  // Le même text style relie la variable par `fontFamily` et par `fontStyle` :
  // la preuve existe, l'usage exclusif non.
  assert.deepEqual(typeEtValeurs(tokens.primitives.fontfamily.conflit), ['string', 'Open Sans']);
  assert.ok(exporte.warnings.some((message) =>
    message.includes('« fontfamily/conflit »') && message.includes('deux usages')));
});

test('un nom de famille sans preuve reste une chaîne, et le nom ne décide jamais', async () => {
  const { exporte, tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.primitives.fontfamily.unbound), ['string', 'Inter']);
  assert.ok(exporte.warnings.some((message) =>
    message.includes('« fontfamily/unbound »') && message.includes('Font family')));
});

test('une TIMING devient une durée en secondes, sans arrondi ni conversion', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.primitives.timing.fast), [
    'duration', { value: 0.20000000298023224, unit: 's' },
  ]);
  assert.deepEqual(typeEtValeurs(tokens.primitives.timing.none), [
    'duration', { value: 0, unit: 's' },
  ]);
  // Un alias reste une référence, et porte le type de sa racine.
  assert.deepEqual(typeEtValeurs(tokens.semantic.motion.duration), [
    'duration', '{primitives.timing.fast}',
  ]);
});

test('une EASING exprimable devient une courbe, ordonnées libres comprises', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.primitives.easing.linear), ['cubicBezier', [0, 0, 1, 1]]);
  assert.deepEqual(typeEtValeurs(tokens.primitives.easing.overshoot), [
    'cubicBezier', [0.34, 1.56, 0.64, 1],
  ]);
  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].easing.brand), [
    'cubicBezier', [0, 0, 1, 1], [0, 0, 1, 1], [0.4, 0, 0.2, 1],
  ]);
  assert.deepEqual(typeEtValeurs(tokens.semantic.motion.easing), [
    'cubicBezier', '{primitives.easing.overshoot}',
  ]);
});

test('une EASING sans courbe quitte le fichier, et chaque cause nomme son geste', async () => {
  const { exporte, tokens } = await documentExporte();
  const ecartees = ['ease-out', 'spring', 'hold', 'incomplete', 'out-of-range'];

  for (const nom of ecartees) {
    assert.equal(tokens.primitives.easing[nom], undefined, nom);
  }
  // Un seul mode sans courbe écarte la variable entière.
  assert.equal(tokens['brand-tokens'].easing.mixed, undefined);
  // Aucune clé de l'API Figma n'entre dans l'artefact.
  for (const cle of ['easingFunctionSpring', 'easingFunctionCubicBezier', 'CUSTOM_SPRING']) {
    assert.ok(!exporte.content.includes(cle), cle);
  }
  assert.ok(exporte.warnings.some((message) =>
    message.includes('« easing/spring »') && message.includes('Choisissez Linear ou Custom bezier')));
  assert.ok(exporte.warnings.some((message) =>
    message.includes('« easing/out-of-range »') && message.includes('abscisse')));
});

test('un alias vers une easing écartée nomme la variable à corriger, pas une absence', async () => {
  const { exporte, tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens.semantic.motion['broken-easing']), ['cubicBezier', null]);
  assert.ok(exporte.warnings.some((message) =>
    message.includes('« motion/broken-easing »')
    && message.includes('« easing/spring », que le fichier de tokens ne publie pas')));
});

test('une graisse faite de littéraux et d’alias numériques devient un nombre, et l’alias reste une référence', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].fontweight.body), [
    'number', '{primitives.fontweight.regular}', '{primitives.fontweight.regular}', 500,
  ]);
});

test('une chaîne d’alias suit ses cibles, même sous un nom qui ne dit pas « graisse »', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].typography['heading-weight']), [
    'number', '{primitives.fontweight.bold}', '{primitives.fontweight.bold}', '{primitives.font-weight.semibold}',
  ]);
  assert.deepEqual(typeEtValeurs(tokens.semantic.text.weight), [
    'number', '{brand-tokens.typography.heading-weight}',
  ]);
});

test('un alias vers une chaîne, une cible absente ou une boucle laissent la graisse en chaîne', async () => {
  const { tokens } = await documentExporte();

  assert.deepEqual(typeEtValeurs(tokens['brand-tokens'].fontweight.numeric), [
    'string', '{primitives.fontweight.numeric}', '{primitives.fontweight.numeric}', '{primitives.fontweight.numeric}',
  ]);
  assert.deepEqual(typeEtValeurs(tokens.semantic.fontweight.broken), ['string', null]);
  assert.deepEqual(typeEtValeurs(tokens.semantic.fontweight['loop-a']), ['string', '{semantic.fontweight.loop-b}']);
  assert.deepEqual(typeEtValeurs(tokens.semantic.fontweight['loop-b']), ['string', '{semantic.fontweight.loop-a}']);
});

test('un seul mode devenu libre ramène la graisse et toute sa chaîne d’alias en chaîne', async () => {
  const fichier = fichierDeVariables();
  const bold = fichier.variables.find((variable) => variable.id === 'bold')!;
  (bold.valuesByMode as Record<string, VariableValue>)['primitives:0'] = 'Bolder';
  const { tokens } = await documentExporte({ fichier });

  assert.deepEqual(typeEtValeurs(tokens.primitives.fontweight.bold), ['string', 'Bolder']);
  assert.equal(tokens['brand-tokens'].typography['heading-weight'].$type, 'string');
  assert.equal(tokens.semantic.text.weight.$type, 'string');
  // Une graisse qui ne cite pas `bold` garde sa décision.
  assert.equal(tokens['brand-tokens'].fontweight.body.$type, 'number');
});

test('le type d’une graisse ne dépend ni de l’ordre des variables, ni des collections, ni des modes', async () => {
  const reference = (await documentExporte()).tokens;

  const inverse = fichierDeVariables();
  inverse.variables.reverse();
  inverse.collections.reverse();
  for (const collection of inverse.collections) (collection.modes as unknown[]).reverse();
  const { tokens } = await documentExporte({ fichier: inverse });

  // Les modes inversés gardent leur mode par défaut : seules les clés changent d'ordre.
  assert.deepEqual(tokens, reference);
});
