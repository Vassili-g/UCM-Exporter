import assert from 'node:assert/strict';
import test from 'node:test';
import { extractIconLayers } from '../src/contract/extractIconLayers';
import { mergeIconRules } from '../src/contract/exportComponent';

const layer = (
  figmaLayer: string,
  visibilityProps: Array<string | null> = [null],
  maximumOccurrences = 1,
  variants: Array<Record<string, string>> = [{}],
  totalVariants = variants.length,
  slotIndexes: number[] = [0],
  sizes: Array<string | null> = [null],
) => ({
  figmaLayer,
  visibilityProps,
  maximumOccurrences,
  slotIndexes,
  sizes,
  variants,
  totalVariants,
});

/** Résolveur littéral : `null` signifie « aucune variable liée ». */
const sansToken = { resolve: async () => null };

/** Matrice minimale, pour ne décrire dans chaque test que ce qu'il éprouve. */
const matrice = (
  variants: Array<{ values: Record<string, string>; component: ComponentNode }>,
  axes: string[],
) => ({ axes, variants });

const graphique = (
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) => ({ type: 'INSTANCE', id, name, boundVariables: {}, ...extra });

const variant = (id: string, name: string, enfants: unknown[]) => ({
  type: 'COMPONENT',
  id,
  name,
  boundVariables: {},
  findAll: () => enfants,
}) as unknown as ComponentNode;

test('mergeIconRules lie une icône modifiable à son nom Figma exact', () => {
  const props = { iconLeft: { type: 'boolean' as const, default: false } };
  const layers = [layer('arrow-left-long', ['iconLeft'])];
  const warnings: string[] = [];

  const icons = mergeIconRules(
    props,
    layers,
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    arrowLeftLong: {
      policy: 'modifiable',
      figmaName: 'arrow-left-long',
      slot: 'icon',
      visibilityProp: 'iconLeft',
      runtimeProp: 'iconLeftName',
    },
  });
  assert.deepEqual(props, {
    iconLeft: { type: 'boolean', default: false },
    iconLeftName: {
      type: 'icon',
      default: null,
      policy: 'modifiable',
      visibilityProp: 'iconLeft',
    },
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules exporte une icône stricte sans créer de prop', () => {
  const layers = [layer('fa-warning')];
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    layers,
    [{ iconName: 'fa-warning', policy: 'strict' }],
    warnings,
  );

  assert.deepEqual(icons, {
    faWarning: { policy: 'strict', figmaName: 'fa-warning', slot: 'icon' },
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules avertit au lieu de deviner un calque graphique', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('arrow-left-long')],
    [{ iconName: 'arrow-right-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {});
  assert.deepEqual(warnings, ['@icons « arrow-right-long » : aucun calque graphique de ce nom.']);
});

test('mergeIconRules avertit lorsqu une icône modifiable n est liée à aucun booléen Figma', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('arrow-left-long')],
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    arrowLeftLong: { policy: 'modifiable', figmaName: 'arrow-left-long', slot: 'icon' },
  });
  assert.deepEqual(warnings, [
    '@icons « arrow-left-long » modifiable : le calque doit lier « visible » à une prop BOOLEAN Figma pour exposer une prop runtime.',
  ]);
});

test('mergeIconRules situe une icône au rang qu’elle occupe dans son variant', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [
      layer('arrow-left-long', [null], 1, [{}], 1, [0]),
      layer('arrow-right-long', [null], 1, [{}], 1, [1]),
    ],
    [
      { iconName: 'arrow-left-long', policy: 'strict' },
      { iconName: 'arrow-right-long', policy: 'strict' },
    ],
    warnings,
  );

  // Les deux icônes coexistent : la seconde occupe le slot dédupliqué,
  // exactement comme `structure.children` le nomme.
  assert.equal(icons.arrowLeftLong.slot, 'icon');
  assert.equal(icons.arrowRightLong.slot, 'icon-2');
  assert.deepEqual(warnings, []);
});

test('mergeIconRules n’invente aucun slot quand le rang change entre variants', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('status-icon', [null], 1, [{}], 1, [0, 1])],
    [{ iconName: 'status-icon', policy: 'strict' }],
    warnings,
  );

  assert.equal(icons.statusIcon.slot, undefined);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /rang différent selon les variants \(0, 1\)/);
});

test('mergeIconRules publie la taille de l’icône et refuse une taille instable', () => {
  const stable: string[] = [];
  const icons = mergeIconRules(
    {},
    [layer('circle-check', [null], 1, [{}], 1, [0], ['{components.icons.sizes.base}'])],
    [{ iconName: 'circle-check', policy: 'strict' }],
    stable,
  );
  assert.equal(icons.circleCheck.size, '{components.icons.sizes.base}');
  assert.deepEqual(stable, []);

  const instable: string[] = [];
  const divergentes = mergeIconRules(
    {},
    [layer('circle-check', [null], 1, [{}], 1, [0], ['{a.base}', '{a.large}'])],
    [{ iconName: 'circle-check', policy: 'strict' }],
    instable,
  );
  assert.equal(divergentes.circleCheck.size, undefined);
  assert.equal(instable.length, 1);
  assert.match(instable[0], /tailles différentes selon les variants/);
});

test('extractIconLayers trouve une icône présente uniquement hors du variant de référence', async () => {
  const info = variant('info', 'Severity=Info', [graphique('info-icon', 'circle-info')]);
  const success = variant('success', 'Severity=Success', [
    graphique('success-icon', 'circle-check', {
      componentPropertyReferences: { visible: 'icon#3:1' },
    }),
  ]);

  const layers = await extractIconLayers(
    matrice(
      [
        { values: { severity: 'info' }, component: info },
        { values: { severity: 'success' }, component: success },
      ],
      ['severity'],
    ),
    ['circle-info', 'circle-check', 'triangle-exclamation'],
    sansToken,
    new Set<string>(),
    [],
  );

  // Les deux icônes s'excluent, occupent le même rang, donc le même slot :
  // c'est ce qui rend rendable celle que le variant de référence ne porte pas.
  assert.deepEqual(layers, [
    layer('circle-info', [null], 1, [{ severity: 'info' }], 2, [0]),
    layer('circle-check', ['icon'], 1, [{ severity: 'success' }], 2, [0]),
  ]);
});

test('extractIconLayers relève la taille liée sur le calque', async () => {
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const composant = variant('component', 'Mode=Default', [
    graphique('icon', 'circle-info', {
      boundVariables: { width: alias('size'), height: alias('size') },
    }),
  ]);
  const tokenNames = new Set<string>();

  const layers = await extractIconLayers(
    matrice([{ values: { mode: 'default' }, component: composant }], ['mode']),
    ['circle-info'],
    { resolve: async () => 'components.icons.sizes.base' },
    tokenNames,
    [],
  );

  assert.deepEqual(layers[0].sizes, ['{components.icons.sizes.base}']);
  // La taille d'une icône absente du variant de référence doit malgré tout
  // rejoindre `tokensUsed`, sinon le garde-fou du consommateur la refuse.
  assert.deepEqual([...tokenNames], ['{components.icons.sizes.base}']);
});

test('extractIconLayers nomme la condition même si le set n’expose aucun axe', async () => {
  const actif = variant('active', 'Active', [graphique('icon', 'status-icon')]);
  const inactif = variant('inactive', 'Inactive', []);

  const layers = await extractIconLayers(
    matrice(
      [
        { values: {}, component: actif },
        { values: {}, component: inactif },
      ],
      [],
    ),
    ['status-icon'],
    sansToken,
    new Set<string>(),
    [],
  );

  assert.deepEqual(layers, [
    layer('status-icon', [null], 1, [{ variant: 'active' }], 2, [0]),
  ]);
});

test('extractIconLayers ignore une instance qui possède son propre contrat', async () => {
  const composant = variant('component', 'Mode=Default', [graphique('icon', 'status-icon')]);

  const layers = await extractIconLayers(
    matrice([{ values: { mode: 'default' }, component: composant }], ['mode']),
    ['status-icon'],
    sansToken,
    new Set<string>(),
    [],
    new Map([['icon', { component: 'Icon', figmaLayer: 'status-icon' }]]),
  );

  assert.deepEqual(layers, []);
});

test('mergeIconRules publie les variants exacts d’une icône conditionnelle', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('circle-check', ['icon'], 1, [
      { severity: 'success', variant: 'standard' },
      { severity: 'success', variant: 'outlined' },
    ], 8)],
    [{ iconName: 'circle-check', policy: 'strict' }],
    warnings,
  );

  assert.deepEqual(icons, {
    circleCheck: {
      policy: 'strict',
      figmaName: 'circle-check',
      slot: 'icon',
      visibilityProp: 'icon',
      variants: [
        { severity: 'success', variant: 'standard' },
        { severity: 'success', variant: 'outlined' },
      ],
    },
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules refuse une visibilité incohérente entre variants', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('status-icon', ['leadingIcon', 'trailingIcon'])],
    [{ iconName: 'status-icon', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    statusIcon: { policy: 'modifiable', figmaName: 'status-icon', slot: 'icon' },
  });
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /liaison de visibilité différente/);
  assert.match(warnings[1], /doit lier « visible »/);
});
