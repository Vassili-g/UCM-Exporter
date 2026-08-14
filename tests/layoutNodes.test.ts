/**
 * Non-régression de l'élection du node de layout.
 *
 * Le node élu décide à la fois des slots, des chemins de la typographie et de
 * l'emplacement des icônes. Élire deux fois, depuis deux racines, faisait
 * décrire trois arbres différents au même contrat : ces tests verrouillent
 * l'élection unique.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';
import { electVariantLayoutNodes } from '../src/contract/layoutNodes';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

/** Le composant maître du wrapper : c'est lui qui l'identifie d'un variant à l'autre. */
const wrapperMain = { id: 'wrapper-main', name: 'sizeWrapper', parent: null };

/**
 * Un variant qui délègue sa mise en page à un wrapper imbriqué, tout en portant
 * lui-même AUTANT de dimensions liées que le frame interne de ce wrapper.
 * C'est l'égalité de score qui faisait diverger les deux élections.
 */
function variantAvecWrapper(nom: string) {
  const dimensions = {
    itemSpacing: alias('gap'),
    paddingLeft: alias('px'),
    paddingRight: alias('px'),
  };
  const commun = { layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG' };
  const titre = {
    type: 'TEXT', id: `${nom}-titre`, name: 'Titre', characters: 'T',
    textStyleId: 'style-titre', boundVariables: {}, ...commun,
  };
  const description = {
    type: 'TEXT', id: `${nom}-desc`, name: 'Description', characters: 'D',
    textStyleId: 'style-titre', boundVariables: {}, ...commun,
  };
  const interne = {
    type: 'FRAME', id: `${nom}-inner`, name: 'Inner', layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
    boundVariables: dimensions, ...commun,
    children: [titre, description], findAll: findAllOn([titre, description]),
  };
  const wrapper = {
    type: 'INSTANCE', id: `${nom}-wrapper`, name: 'sizeWrapper', layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
    boundVariables: {}, layoutAlign: 'INHERIT', layoutGrow: 0, ...commun,
    children: [interne], findAll: findAllOn([interne, titre, description]),
    getMainComponentAsync: async () => wrapperMain,
  };
  const composant = {
    type: 'COMPONENT', id: nom, name: nom, layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
    boundVariables: dimensions, ...commun,
    children: [wrapper], findAll: findAllOn([wrapper, interne, titre, description]),
  };
  const lie = (enfant: unknown, parent: unknown) => {
    (enfant as { parent?: unknown }).parent = parent;
  };
  lie(titre, interne);
  lie(description, interne);
  lie(interne, wrapper);
  lie(wrapper, composant);
  return { composant: composant as unknown as ComponentNode, wrapper, interne };
}

test('un seul node de layout sert les slots, la typographie et les icônes', async () => {
  (globalThis as unknown as { figma: unknown }).figma = {
    getStyleByIdAsync: async (id: string) => ({
      id, type: 'TEXT', name: 'Label/Large',
      boundVariables: { fontSize: alias('fs') },
    }),
  };
  const premier = variantAvecWrapper('Variant=A');
  const second = variantAvecWrapper('Variant=B');

  const { structure, textStyles, warnings } = await extractStructure(
    {
      axes: ['variant'],
      variants: [
        { values: { variant: 'a' }, component: premier.composant },
        { values: { variant: 'b' }, component: second.composant },
      ],
    },
    [],
    { instance: premier.wrapper as unknown as InstanceNode, componentSet: null },
    premier.composant,
    resolverFor({ gap: 'g.gap', px: 'g.px', fs: 'typo.fontsize' }),
  );

  // Les slots viennent du frame interne du wrapper, comme avant.
  assert.deepEqual(structure.children.map((child) => child.figmaLayer), ['Titre', 'Description']);
  // Et la typographie les retrouve : une seconde élection la faisait disparaître
  // entièrement, en accusant le variant de référence de diverger de lui-même.
  assert.deepEqual(Object.keys(textStyles), ['label.large']);
  assert.deepEqual(structure.variantTypography, {
    a: [
      { slotPath: ['label'], style: 'label.large' },
      { slotPath: ['label-2'], style: 'label.large' },
    ],
    b: [
      { slotPath: ['label'], style: 'label.large' },
      { slotPath: ['label-2'], style: 'label.large' },
    ],
  });
  // Une matrice homogène ne produit aucun diagnostic de divergence.
  assert.deepEqual(
    warnings.filter((warning) => /diffère du variant de référence|Parties texte différentes|Auto layout différent/.test(warning)),
    [],
  );
});

test('chaque variant élit son node de layout depuis sa propre instance de wrapper', async () => {
  const premier = variantAvecWrapper('Variant=A');
  const second = variantAvecWrapper('Variant=B');
  const warnings: string[] = [];

  const nodes = await electVariantLayoutNodes(
    [premier.composant, second.composant],
    {
      component: premier.composant,
      wrapper: { instance: premier.wrapper as unknown as InstanceNode, componentSet: null },
    },
    warnings,
  );

  assert.equal(nodes.get(premier.composant), premier.interne as unknown as SceneNode);
  assert.equal(nodes.get(second.composant), second.interne as unknown as SceneNode);
  assert.deepEqual(warnings, []);
});

test('un variant privé du wrapper est signalé au lieu d’être rattrapé en silence', async () => {
  const premier = variantAvecWrapper('Variant=A');
  const plat = {
    type: 'COMPONENT', id: 'Variant=B', name: 'Variant=B', layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [], findAll: findAllOn([]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const nodes = await electVariantLayoutNodes(
    [premier.composant, plat],
    {
      component: premier.composant,
      wrapper: { instance: premier.wrapper as unknown as InstanceNode, componentSet: null },
    },
    warnings,
  );

  assert.equal(nodes.get(plat), plat as unknown as SceneNode);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ne contient pas le composant imbriqué qui porte les dimensions/);
});
