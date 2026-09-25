/**
 * Les effect styles : le catalogue, ses usages, et ce que le designer lit quand
 * un effet ne se publie pas.
 *
 * Les arbres sont synthétiques : `Root`, `Card` et les styles ne renvoient à
 * aucun composant réel.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLayout } from '../src/contract/extractLayout';
import { extractEffectStyles } from '../src/contract/effectStyles';
import type { EffectCarrier } from '../src/contract/effectStyles';
import { localisationsDe } from '../src/contract/localisation';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

const TOKENS = {
  encre: 'shadow.color',
  x: 'shadow.x',
  y: 'shadow.y',
  flou: 'shadow.blur',
  etendue: 'shadow.spread',
  voile: 'blur.backdrop',
};

/** Une ombre portée dont chaque champ non nul est relié à une variable. */
const ombre = (extra: Record<string, unknown> = {}) => ({
  type: 'DROP_SHADOW',
  visible: true,
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 4 },
  radius: 8,
  spread: 0,
  blendMode: 'NORMAL',
  boundVariables: { color: alias('encre'), offsetY: alias('y'), radius: alias('flou') },
  ...extra,
});

const style = (id: string, name: string, effects: unknown[]) => ({ type: 'EFFECT', id, name, effects });

/** Un chargeur qui ne connaît que les styles donnés, et rend `null` pour les autres. */
const chargeur = (...styles: Array<{ id: string } & Record<string, unknown>>) => async (id: string) =>
  (styles.find((candidat) => candidat.id === id) ?? null) as BaseStyle | null;

const FOCUS = style('S:focus', 'Shadow/Focus', [ombre()]);

/** Un calque qui porte les effets de son style, ou les siens. */
function calque(nom: string, effets: unknown[], styleId = '') {
  return {
    type: 'FRAME',
    id: `id-${nom}`,
    name: nom,
    effects: effets,
    effectStyleId: styleId,
    boundVariables: {},
  } as unknown as SceneNode;
}

/** Extrait les effets d'une seule vue, à partir de ses porteurs. */
async function extraire(
  porteurs: EffectCarrier[],
  loader: (id: string) => Promise<BaseStyle | null>,
  warnings: string[] = [],
) {
  const racine = { id: 'root', name: 'Root' } as ComponentNode;
  const resultat = await extractEffectStyles(
    new Map([[racine, porteurs]]),
    resolverFor(TOKENS),
    warnings,
    loader,
  );
  return { ...resultat, usages: resultat.usesByComponent.get(racine) ?? [] };
}

test('une racine et un enfant au même style donnent une entrée et deux usages', async () => {
  const carte = {
    ...calque('Card', [ombre()], 'S:focus'),
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [],
    findAll: findAllOn([]),
  };
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Root',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    effects: [ombre()],
    effectStyleId: 'S:focus',
    boundVariables: {},
    children: [carte],
    findAll: findAllOn([carte]),
  } as unknown as ComponentNode;
  const porteurs: EffectCarrier[] = [];
  const warnings: string[] = [];

  await extractLayout(
    racine, resolverFor(TOKENS), warnings, new Map(), new Set(), racine, true,
    new Map(), new Set(), new Map(), porteurs,
  );
  const { effectStyles, usages } = await extraire(porteurs, chargeur(FOCUS), warnings);

  assert.deepEqual(Object.keys(effectStyles), ['shadow.focus']);
  assert.deepEqual(effectStyles['shadow.focus'], {
    figmaName: 'Shadow/Focus',
    effects: [{
      type: 'drop-shadow',
      color: '{shadow.color}',
      offsetY: '{shadow.y}',
      blur: '{shadow.blur}',
    }],
  });
  assert.deepEqual(usages, [
    { slotPath: [], style: 'shadow.focus' },
    { slotPath: ['card'], style: 'shadow.focus' },
  ]);
  assert.deepEqual(warnings.filter((warning) => warning.includes('effect')), []);
});

test('un réglage du style sans variable avertit une fois et manque à l’effet', async () => {
  const sansY = style('S:focus', 'Shadow/Focus', [
    ombre({ boundVariables: { color: alias('encre'), radius: alias('flou') } }),
  ]);
  // Le calque garde une liaison que son style n'a pas : seul le style compte.
  const lieSurLeCalque = [ombre()];
  const warnings: string[] = [];

  const { effectStyles } = await extraire([
    { node: calque('Card', lieSurLeCalque, 'S:focus'), slotPath: ['card'] },
    { node: calque('Badge', lieSurLeCalque, 'S:focus'), slotPath: ['badge'] },
  ], chargeur(sansY), warnings);

  assert.deepEqual(effectStyles['shadow.focus'].effects, [
    { type: 'drop-shadow', color: '{shadow.color}', blur: '{shadow.blur}' },
  ]);
  const lignes = warnings.filter((warning) => warning.startsWith('Style d’effets'));
  assert.deepEqual([...new Set(lignes)], [
    'Style d’effets « Shadow/Focus », y : aucune variable associée. '
      + 'Le contrat ne transmettra pas le décalage vertical de cette ombre. '
      + 'Dans le style d’effets, reliez y à une variable, puis réexportez.',
  ]);
});

test('une couleur d’ombre sans variable avertit, un décalage nul ne dit rien', async () => {
  const sansCouleur = style('S:focus', 'Shadow/Focus', [
    ombre({ offset: { x: 0, y: 0 }, boundVariables: { radius: alias('flou') } }),
  ]);
  const warnings: string[] = [];

  const { effectStyles } = await extraire(
    [{ node: calque('Card', sansCouleur.effects, 'S:focus'), slotPath: ['card'] }],
    chargeur(sansCouleur),
    warnings,
  );

  assert.deepEqual(effectStyles['shadow.focus'].effects, [
    { type: 'drop-shadow', blur: '{shadow.blur}' },
  ]);
  assert.deepEqual(warnings, [
    'Style d’effets « Shadow/Focus », color : aucune variable associée. '
      + 'Le contrat ne transmettra pas la couleur de cette ombre. '
      + 'Dans le style d’effets, reliez color à une variable, puis réexportez.',
  ]);
});

test('un calque sans style d’effets avertit et ne publie aucun usage', async () => {
  const warnings: string[] = [];
  const { usages, effectStyles } = await extraire(
    [{ node: calque('Card', [ombre()]), slotPath: ['card'] }],
    chargeur(FOCUS),
    warnings,
  );

  assert.deepEqual(usages, []);
  assert.deepEqual(effectStyles, {});
  assert.deepEqual(warnings, [
    'Layer « Card », effect : aucun style d’effets appliqué. '
      + 'Le contrat ne transmettra pas l’ombre ou le flou de ce calque. '
      + 'Appliquez à ce calque un style d’effets qui correspond au rendu souhaité, puis réexportez.',
  ]);
});

test('des effets tous masqués, sans style, ne disent rien', async () => {
  const warnings: string[] = [];
  const { usages } = await extraire(
    [{ node: calque('Card', [ombre({ visible: false })]), slotPath: ['card'] }],
    chargeur(FOCUS),
    warnings,
  );
  assert.deepEqual(usages, []);
  assert.deepEqual(warnings, []);
});

test('un style d’effets introuvable, ou qui n’est pas un style d’effets, avertit', async () => {
  const INTROUVABLE = 'Layer « Card » : le style d’effets appliqué est introuvable. '
    + 'Le contrat ne transmettra pas l’ombre ou le flou de ce calque. '
    + 'Appliquez de nouveau un style d’effets accessible dans Figma, puis réexportez.';
  for (const loader of [
    chargeur(),
    chargeur({ ...FOCUS, type: 'TEXT' }),
    async () => { throw new Error('refus du runtime'); },
  ]) {
    const warnings: string[] = [];
    const { usages } = await extraire(
      [{ node: calque('Card', [ombre()], 'S:focus'), slotPath: ['card'] }],
      loader,
      warnings,
    );
    assert.deepEqual(usages, []);
    assert.deepEqual(warnings, [INTROUVABLE]);
  }
});

test('un calque dont les effets s’écartent de son style avertit et publie le style', async () => {
  const warnings: string[] = [];
  const { usages } = await extraire(
    [{ node: calque('Card', [ombre({ radius: 16 })], 'S:focus'), slotPath: ['card'] }],
    chargeur(FOCUS),
    warnings,
  );

  assert.deepEqual(usages, [{ slotPath: ['card'], style: 'shadow.focus' }]);
  assert.deepEqual(warnings, [
    'Layer « Card » : ses effets diffèrent du style « Shadow/Focus ». '
      + 'Le contrat transmettra les réglages du style, sans les modifications propres à ce calque. '
      + 'Réappliquez le style pour retrouver ses réglages, ou créez et appliquez un style '
      + 'correspondant au rendu souhaité, puis réexportez.',
  ]);
});

test('un style qui contient un bruit publie ses ombres et avertit du bruit', async () => {
  const bruite = style('S:bruite', 'Shadow/Noisy', [
    ombre(),
    { type: 'NOISE', visible: true, blendMode: 'NORMAL' },
  ]);
  const warnings: string[] = [];

  const { effectStyles } = await extraire(
    [{ node: calque('Card', bruite.effects, 'S:bruite'), slotPath: ['card'] }],
    chargeur(bruite),
    warnings,
  );

  assert.deepEqual(effectStyles['shadow.noisy'].effects, [
    { type: 'drop-shadow', color: '{shadow.color}', offsetY: '{shadow.y}', blur: '{shadow.blur}' },
  ]);
  assert.deepEqual(warnings, [
    'Style d’effets « Shadow/Noisy » : l’effet Noise n’est pas pris en charge. '
      + 'Le contrat transmettra ce style sans l’effet Noise. '
      + 'Si cet effet est nécessaire, signalez cette limite au mainteneur du plugin. '
      + 'Sinon, retirez-le du style, puis réexportez.',
  ]);
});

test('une ombre hors du mode normal, ou visible derrière le calque, n’est pas écrite', async () => {
  const fusionnee = style('S:fusion', 'Shadow/Blend', [
    ombre({ blendMode: 'COLOR_BURN' }),
    ombre({ showShadowBehindNode: true }),
  ]);
  const warnings: string[] = [];

  const { effectStyles, usages } = await extraire(
    [{ node: calque('Card', fusionnee.effects, 'S:fusion'), slotPath: ['card'] }],
    chargeur(fusionnee),
    warnings,
  );

  assert.deepEqual(effectStyles, {});
  assert.deepEqual(usages, []);
  assert.deepEqual(warnings.map((warning) => warning.split(' : ')[1]?.split('.')[0]), [
    'l’effet Drop shadow visible derrière le calque n’est pas pris en charge',
    'l’effet Drop shadow en mode de fusion « Color burn » n’est pas pris en charge',
  ]);
});

test('les flous se traduisent, le flou progressif avertit', async () => {
  const flous = style('S:flous', 'Blur/Mixed', [
    { type: 'LAYER_BLUR', blurType: 'NORMAL', visible: true, radius: 8, boundVariables: { radius: alias('flou') } },
    { type: 'BACKGROUND_BLUR', blurType: 'NORMAL', visible: true, radius: 4, boundVariables: { radius: alias('voile') } },
    { type: 'LAYER_BLUR', blurType: 'PROGRESSIVE', visible: true, radius: 8, boundVariables: {} },
  ]);
  const warnings: string[] = [];

  const { effectStyles } = await extraire(
    [{ node: calque('Card', flous.effects, 'S:flous'), slotPath: ['card'] }],
    chargeur(flous),
    warnings,
  );

  assert.deepEqual(new Set(effectStyles['blur.mixed'].effects), new Set([
    { type: 'layer-blur', blur: '{shadow.blur}' },
    { type: 'backdrop-blur', blur: '{blur.backdrop}' },
  ]));
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('l’effet Progressive blur n’est pas pris en charge'), warnings[0]);
});

test('le contrat range les ombres dans l’ordre de CSS, la plus haute en premier', async () => {
  // Supposé, à vérifier à la recette : Figma range ses effets comme ses fills,
  // le dernier de la liste peint au-dessus.
  const deux = style('S:deux', 'Shadow/Two', [
    ombre({ boundVariables: { color: alias('encre') }, offset: { x: 0, y: 0 }, radius: 0 }),
    ombre({ boundVariables: { color: alias('voile') }, offset: { x: 0, y: 0 }, radius: 0 }),
  ]);

  const { effectStyles } = await extraire(
    [{ node: calque('Card', deux.effects, 'S:deux'), slotPath: ['card'] }],
    chargeur(deux),
  );

  assert.deepEqual(effectStyles['shadow.two'].effects, [
    { type: 'drop-shadow', color: '{blur.backdrop}' },
    { type: 'drop-shadow', color: '{shadow.color}' },
  ]);
});

test('un effet posé sur une dépendance n’est ni collecté ni averti', async () => {
  const bouton = {
    ...calque('Button', [ombre()]),
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    children: [],
    findAll: findAllOn([]),
  };
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Root',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    boundVariables: {},
    children: [bouton],
    findAll: findAllOn([bouton]),
  } as unknown as ComponentNode;
  const porteurs: EffectCarrier[] = [];
  const warnings: string[] = [];

  await extractLayout(
    racine, resolverFor(TOKENS), warnings,
    new Map([['id-Button', { component: 'Button', figmaLayer: 'Button' }]]),
    new Set(), racine, true, new Map(), new Set(), new Map(), porteurs,
  );

  assert.deepEqual(porteurs, []);
  assert.deepEqual(warnings.filter((warning) => warning.includes('effect')), []);
});

test('le message d’un calque sans style garde sa cible', async () => {
  const warnings: string[] = [];
  const carte = calque('Card', [ombre()]);
  await extraire([{ node: carte, slotPath: ['card'] }], chargeur(FOCUS), warnings);
  assert.deepEqual(localisationsDe(warnings).get(warnings[0]), [carte.id]);
});
