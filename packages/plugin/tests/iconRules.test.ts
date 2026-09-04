import assert from 'node:assert/strict';
import test from 'node:test';
import { extractIconLayers } from '../src/contract/extractIconLayers';
import { findLayoutNode } from '../src/contract/layoutNodes';
import { collectTokenReferences } from '../src/variables';
import { mergeIconRules } from '../src/contract/exportComponent';
import type { ContractProp } from '@ucm/kit/format';

const layer = (
  figmaLayer: string,
  visibilityProps: Array<string | null> = [null],
  maximumOccurrences = 1,
  variants: Array<Record<string, string>> = [{}],
  totalVariants = variants.length,
  slots: Array<string | null> = ['icon'],
  sizes: Array<string | null> = [null],
  swapProps: Array<string | null> = [null],
  variantNodeIds: string[] = [],
) => ({
  figmaLayer,
  visibilityProps,
  swapProps,
  maximumOccurrences,
  slots,
  sizes,
  variants,
  totalVariants,
  variantNodeIds,
});

/** Résolveur littéral : `null` signifie « aucune variable liée ». */
const sansToken = { resolve: async () => null };

/** Matrice minimale, pour ne décrire dans chaque test que ce qu'il éprouve. */
const matrice = (
  variants: Array<{ values: Record<string, string>; component: ComponentNode }>,
  axes: string[],
) => ({ axes, variants });

/**
 * L'élection du node de layout appartient à `layoutNodes.ts` : l'inventaire des
 * icônes la reçoit, il ne la refait pas. Les tests fournissent donc le même
 * relevé que la production.
 */
const nodesDeLayout = (matrix: ReturnType<typeof matrice>) =>
  new Map(matrix.variants.map(({ component }) => [component, findLayoutNode(component)]));

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
  // Un COMPONENT Figma porte toujours `children` : le slot de ses icônes se lit
  // sur ses enfants directs, pas seulement sur `findAll`.
  children: enfants,
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
  assert.deepEqual(warnings, [
    'Règle @icons « arrow-right-long » : aucun layer de ce nom dans le composant. Vérifiez l’orthographe dans le layer « icon » de la règle.',
  ]);
});

/**
 * « Modifiable » et « masquable » sont deux libertés distinctes. Une icône
 * toujours affichée est remplaçable comme une autre : elle reçoit sa prop
 * runtime, nommée d'après son calque puisqu'aucun booléen ne la nomme, et
 * l'export n'a rien à reprocher au designer.
 */
test('mergeIconRules donne sa prop runtime à une icône modifiable sans booléen Figma', () => {
  const warnings: string[] = [];
  const props: Record<string, ContractProp> = {};

  const icons = mergeIconRules(
    props,
    [layer('arrow-left-long')],
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.deepEqual(icons, {
    arrowLeftLong: {
      policy: 'modifiable',
      figmaName: 'arrow-left-long',
      slot: 'icon',
      runtimeProp: 'arrowLeftLongName',
    },
  });
  assert.deepEqual(props, {
    arrowLeftLongName: { type: 'icon', policy: 'modifiable' },
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules réutilise INSTANCE_SWAP au lieu de créer une seconde prop', () => {
  const warnings: string[] = [];
  const props: Record<string, ContractProp> = {
    iconChoice: {
      type: 'instance-swap',
      default: '12:34',
      preferredValues: [],
    },
  };

  const icons = mergeIconRules(
    props,
    [layer('arrow-left-long', [null], 1, [{}], 1, ['icon'], [null], ['iconChoice'])],
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.equal(icons.arrowLeftLong.runtimeProp, 'iconChoice');
  assert.deepEqual(Object.keys(props), ['iconChoice']);
  assert.deepEqual(warnings, []);
});

/**
 * Le nom du booléen prime quand il existe : « iconLeft » et « iconLeftName »
 * se lisent en paire, et le contrat ne change pas de convention selon que
 * l'icône est masquable ou non.
 */
test('mergeIconRules nomme la prop runtime d’après le booléen quand il existe', () => {
  const warnings: string[] = [];
  const props: Record<string, ContractProp> = {
    iconLeft: { type: 'boolean', default: true },
  };

  const icons = mergeIconRules(
    props,
    [layer('arrow-left-long', ['iconLeft'])],
    [{ iconName: 'arrow-left-long', policy: 'modifiable' }],
    warnings,
  );

  assert.equal(icons.arrowLeftLong.runtimeProp, 'iconLeftName');
  assert.deepEqual(props.iconLeftName, {
    type: 'icon',
    policy: 'modifiable',
    visibilityProp: 'iconLeft',
  });
  assert.deepEqual(warnings, []);
});

test('mergeIconRules situe une icône au slot qu’elle occupe dans son variant', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [
      layer('arrow-left-long', [null], 1, [{}], 1, ['icon']),
      layer('arrow-right-long', [null], 1, [{}], 1, ['icon-2']),
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

test('mergeIconRules n’invente aucun slot quand le slot change entre variants', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('status-icon', [null], 1, [{}], 1, ['icon', 'icon-2'])],
    [{ iconName: 'status-icon', policy: 'strict' }],
    warnings,
  );

  assert.equal(icons.statusIcon.slot, undefined);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /pas la même place selon les variants \(icon, icon-2\)/);
});

test('mergeIconRules publie la taille de l’icône et refuse une taille instable', () => {
  const stable: string[] = [];
  const icons = mergeIconRules(
    {},
    [layer('circle-check', [null], 1, [{}], 1, ['icon'], ['{components.icons.sizes.base}'])],
    [{ iconName: 'circle-check', policy: 'strict' }],
    stable,
  );
  assert.equal(icons.circleCheck.size, '{components.icons.sizes.base}');
  assert.deepEqual(stable, []);

  const instable: string[] = [];
  const divergentes = mergeIconRules(
    {},
    [layer('circle-check', [null], 1, [{}], 1, ['icon'], ['{a.base}', '{a.large}'])],
    [{ iconName: 'circle-check', policy: 'strict' }],
    instable,
  );
  assert.equal(divergentes.circleCheck.size, undefined);
  assert.equal(instable.length, 1);
  assert.match(instable[0], /sa taille change selon les variants/);
});

test('extractIconLayers trouve une icône présente uniquement hors du variant de référence', async () => {
  const info = variant('info', 'Severity=Info', [graphique('info-icon', 'circle-info')]);
  const success = variant('success', 'Severity=Success', [
    graphique('success-icon', 'circle-check', {
      componentPropertyReferences: { visible: 'icon#3:1' },
    }),
  ]);

  const matrix = matrice(
    [
      { values: { severity: 'info' }, component: info },
      { values: { severity: 'success' }, component: success },
    ],
    ['severity'],
  );
  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['circle-info', 'circle-check', 'triangle-exclamation'],
    sansToken,
    [],
  );

  // Les deux icônes s'excluent et occupent le même slot : c'est ce qui rend
  // rendable celle que le variant de référence ne porte pas.
  assert.deepEqual(layers, [
    layer('circle-info', [null], 1, [{ severity: 'info' }], 2, ['icon'], [null], [null], ['info']),
    layer('circle-check', ['icon'], 1, [{ severity: 'success' }], 2, ['icon'], [null], [null], ['success']),
  ]);
});

test('extractIconLayers relève la liaison native de remplacement d’une icône', async () => {
  const composant = variant('component', 'Mode=Default', [
    graphique('icon', 'circle-info', {
      componentPropertyReferences: { mainComponent: 'Icon choice#3:2' },
    }),
  ]);
  const matrix = matrice([{ values: { mode: 'default' }, component: composant }], ['mode']);

  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['circle-info'],
    sansToken,
    [],
  );

  assert.deepEqual(layers[0].swapProps, ['iconChoice']);
});

test('extractIconLayers relève la taille liée sur le calque', async () => {
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const composant = variant('component', 'Mode=Default', [
    graphique('icon', 'circle-info', {
      boundVariables: { width: alias('size'), height: alias('size') },
    }),
  ]);

  const matrix = matrice([{ values: { mode: 'default' }, component: composant }], ['mode']);
  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['circle-info'],
    { resolve: async () => 'components.icons.sizes.base' },
    [],
  );

  assert.deepEqual(layers[0].sizes, ['{components.icons.sizes.base}']);
  // La taille d'une icône absente du variant de référence est relevée ici : le
  // contrat la publiera dans `icons`, d'où `tokensUsed` la dérivera.
  assert.deepEqual(Array.from(collectTokenReferences(layers)), ['{components.icons.sizes.base}']);
});

test('une icône en hug ne réclame aucune variable de taille', async () => {
  // Le menu de dimensionnement fait autorité ici comme pour les slots : une
  // icône qui hug n'a pas de dimension figée à citer, et la lui réclamer
  // produisait un avertissement que `resolveSlotSize` ne produit pas.
  const composant = variant('component', 'Mode=Default', [
    graphique('icon', 'circle-info', {
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
    }),
  ]);

  const matrix = matrice([{ values: { mode: 'default' }, component: composant }], ['mode']);
  const warnings: string[] = [];
  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['circle-info'],
    sansToken,
    warnings,
  );

  assert.deepEqual(layers[0].sizes, [null]);
  assert.deepEqual(warnings, []);
});

test('extractIconLayers nomme la condition même si le set n’expose aucun axe', async () => {
  const actif = variant('active', 'Active', [graphique('icon', 'status-icon')]);
  const inactif = variant('inactive', 'Inactive', []);

  const matrix = matrice(
    [
      { values: {}, component: actif },
      { values: {}, component: inactif },
    ],
    [],
  );
  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['status-icon'],
    sansToken,
    [],
  );

  assert.deepEqual(layers, [
    layer('status-icon', [null], 1, [{ variant: 'active' }], 2, ['icon'], [null], [null], ['active']),
  ]);
});

test('extractIconLayers distingue deux variants aux mêmes coordonnées', async () => {
  const absent = variant('absent', 'State=Focus', []);
  const present = variant('present', 'State=focus', [graphique('icon', 'status-icon')]);
  const matrix = matrice([
    { values: { state: 'focus' }, component: absent },
    { values: { state: 'focus' }, component: present },
  ], ['state']);

  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['status-icon'],
    sansToken,
    [],
  );

  assert.deepEqual(layers[0].variants, [{ state: 'focus' }]);
  assert.deepEqual(layers[0].variantNodeIds, ['present']);
});

test('extractIconLayers ignore une instance qui possède son propre contrat', async () => {
  const composant = variant('component', 'Mode=Default', [graphique('icon', 'status-icon')]);

  const matrix = matrice([{ values: { mode: 'default' }, component: composant }], ['mode']);
  const layers = await extractIconLayers(
    matrix,
    nodesDeLayout(matrix),
    ['status-icon'],
    sansToken,
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

  // La visibilité diverge : le contrat n'en publie aucune et le dit. L'icône
  // reste remplaçable pour autant — c'est une liberté indépendante — et sa
  // prop runtime prend le nom du calque, faute d'un booléen pour la nommer.
  assert.deepEqual(icons, {
    statusIcon: {
      policy: 'modifiable',
      figmaName: 'status-icon',
      slot: 'icon',
      runtimeProp: 'statusIconName',
    },
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /sa visibilité dépend d’une component property/);
});

test('mergeIconRules refuse une taille absente d’une partie de la matrice', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('circle-check', [null], 1, [{}], 1, ['icon'], ['{a.base}', null])],
    [{ iconName: 'circle-check', policy: 'strict' }],
    warnings,
  );

  // La liaison a sauté sur un variant. La taille n'est pas « celle qu'on a
  // trouvée » : elle est non uniforme, exactement comme deux tokens concurrents,
  // et une icône sans taille n'est pas rendable.
  assert.equal(icons.circleCheck.size, undefined);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /sa taille change selon les variants/);
  assert.match(warnings[0], /aucune/);
});

test('une icône homonyme d’Object.prototype n’est pas prise pour un doublon', () => {
  const warnings: string[] = [];

  const icons = mergeIconRules(
    {},
    [layer('constructor')],
    [{ iconName: 'constructor', policy: 'strict' }],
    warnings,
  );

  // L'index littéral rendait `Object` pour cette clé : la règle était écartée
  // au nom d'une « autre règle » que le composant ne portait pas.
  assert.deepEqual(Object.keys(icons), ['constructor']);
  assert.deepEqual(warnings, []);
});
