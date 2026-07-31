/**
 * Le slot annoncé par `icons` désigne toujours un slot réel de
 * `structure.children`.
 *
 * Ces tests montent l'extraction complète parce que l'invariant ne se vérifie ni
 * dans `extractLayout` ni dans `extractIconLayers` pris isolément : il vit dans
 * leur accord. Deux structures Figma le mettent en défaut dès que le nommage des
 * slots se dédouble — un enfant direct portant plusieurs icônes, et une icône
 * posée hors du conteneur de dimensions.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';
import { mergeIconRules } from '../src/contract/mergeIconRules';
import type { IconRule } from '../src/contract/rulesModel';
import type { ContractStructure, IconDefinition } from '../src/contract/types';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

/** Résolveur littéral : toute liaison rend le même token de dimension. */
const resolver = {
  resolve: async (candidate: VariableAlias | null | undefined) =>
    (candidate ? 'components.button.sizes.medium.gap' : null),
};

/** Node Figma minimal dont `findAll` parcourt réellement le sous-arbre. */
function node(
  type: string,
  name: string,
  children: any[] = [],
  extra: Record<string, unknown> = {},
): any {
  const self: any = { type, id: name, name, visible: true, boundVariables: {}, children, ...extra };
  self.findAll = (predicate: (candidate: any) => boolean) => {
    const found: any[] = [];
    const walk = (nodes: any[]) => {
      for (const child of nodes) {
        if (predicate(child)) found.push(child);
        walk(child.children ?? []);
      }
    };
    walk(children);
    return found;
  };
  return self;
}

/** Exporte un variant unique, puis fusionne ses règles d'icônes. */
async function contractFor(reference: any, iconNames: string[], rules: IconRule[]) {
  const { structure, iconLayers } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    null,
    reference,
    resolver,
    new Map(),
    iconNames,
  );
  const warnings: string[] = [];
  const icons = mergeIconRules({}, iconLayers, rules, warnings);
  return { structure, icons, warnings };
}

/** L'invariant commun aux trois cas : un slot publié existe dans le contrat. */
function assertSlotsExist(
  structure: ContractStructure,
  icons: Record<string, IconDefinition>,
): void {
  const slots = new Set(structure.children.map((child) => child.slot));
  for (const [key, icon] of Object.entries(icons)) {
    if (!icon.slot) continue;
    assert.ok(
      slots.has(icon.slot),
      `icons.${key}.slot « ${icon.slot} » ne correspond à aucun slot de structure.children`,
    );
  }
}

const strict = (iconName: string): IconRule => ({ iconName, policy: 'strict' });

test('le slot d’une icône est celui que porte structure.children', async () => {
  const reference = node(
    'COMPONENT',
    'Color=Primary',
    [
      node('VECTOR', 'arrow-left-long'),
      node('TEXT', 'Suivant'),
      node('VECTOR', 'arrow-right-long'),
    ],
    { layoutMode: 'HORIZONTAL', boundVariables: { itemSpacing: alias('gap') } },
  );

  const { structure, icons, warnings } = await contractFor(
    reference,
    ['arrow-left-long', 'arrow-right-long'],
    [strict('arrow-left-long'), strict('arrow-right-long')],
  );

  assert.deepEqual(structure.children.map((child) => child.slot), ['icon', 'label', 'icon-2']);
  assert.equal(icons.arrowLeftLong.slot, 'icon');
  assert.equal(icons.arrowRightLong.slot, 'icon-2');
  assertSlotsExist(structure, icons);
  assert.deepEqual(warnings, []);
});

test('une icône hors du conteneur de dimensions n’obtient aucun slot', async () => {
  // Le node de layout est la ligne interne ; le badge est posé à côté d'elle.
  // Aucun enfant direct de cette ligne ne le contient : il n'occupe donc aucun
  // slot, et ne peut pas revendiquer celui de la flèche.
  const row = node(
    'FRAME',
    'row',
    [node('VECTOR', 'arrow-left-long'), node('TEXT', 'Suivant')],
    { layoutMode: 'HORIZONTAL', boundVariables: { itemSpacing: alias('gap') } },
  );
  const reference = node('COMPONENT', 'Color=Primary', [node('VECTOR', 'badge-icon'), row], {
    layoutMode: 'HORIZONTAL',
  });

  const { structure, icons, warnings } = await contractFor(
    reference,
    ['badge-icon', 'arrow-left-long'],
    [strict('badge-icon'), strict('arrow-left-long')],
  );

  assert.deepEqual(structure.children.map((child) => child.slot), ['icon', 'label']);
  assert.equal(icons.arrowLeftLong.slot, 'icon');
  assert.equal(icons.badgeIcon.slot, undefined);
  assertSlotsExist(structure, icons);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /badge-icon/);
  assert.match(warnings[0], /placé directement dans le cadre d’auto-layout/);
});

test('deux icônes dans un même enfant direct partagent son slot', async () => {
  // Motif Figma courant : un groupe « icons » porte les deux calques. Le groupe
  // est UN enfant direct, donc UN slot, que les deux icônes remplissent.
  const groupe = node('FRAME', 'icons', [
    node('VECTOR', 'circle-info'),
    node('VECTOR', 'circle-check'),
  ]);
  const reference = node('COMPONENT', 'Color=Primary', [groupe, node('TEXT', 'Message')], {
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
  });

  const { structure, icons, warnings } = await contractFor(
    reference,
    ['circle-info', 'circle-check'],
    [strict('circle-info'), strict('circle-check')],
  );

  assert.deepEqual(structure.children.map((child) => child.slot), ['icon', 'label']);
  assert.equal(icons.circleInfo.slot, 'icon');
  assert.equal(icons.circleCheck.slot, 'icon');
  assertSlotsExist(structure, icons);
  assert.deepEqual(warnings, []);
});

test('les slots viennent du node de layout retenu, pas d’une seconde élection', async () => {
  // Le composant délègue sa mise en page à un wrapper, mais porte lui-même
  // assez de dimensions liées pour gagner une élection lancée depuis sa racine.
  // Les deux extractions doivent malgré tout décrire le MÊME node.
  const row = node(
    'FRAME',
    'row',
    [node('VECTOR', 'arrow-left-long'), node('TEXT', 'Suivant')],
    { layoutMode: 'HORIZONTAL', boundVariables: { itemSpacing: alias('gap') } },
  );
  const wrapperInstance = node('INSTANCE', 'sizeWrapper', [row]);
  const reference = node(
    'COMPONENT',
    'Color=Primary',
    [node('VECTOR', 'badge-icon'), wrapperInstance],
    {
      layoutMode: 'HORIZONTAL',
      boundVariables: {
        itemSpacing: alias('gap'),
        paddingLeft: alias('px'),
        paddingRight: alias('px'),
        paddingTop: alias('py'),
        paddingBottom: alias('py'),
        cornerRadius: alias('radius'),
      },
    },
  );

  const { structure, iconLayers } = await extractStructure(
    { axes: ['color'], variants: [{ values: { color: 'primary' }, component: reference }] },
    [],
    { instance: wrapperInstance, componentSet: null },
    reference,
    resolver,
    new Map(),
    ['badge-icon', 'arrow-left-long'],
  );
  const warnings: string[] = [];
  const icons = mergeIconRules({}, iconLayers, [strict('badge-icon'), strict('arrow-left-long')], warnings);

  // `structure.children` décrit les enfants de « row ». Une élection relancée
  // depuis la racine aurait décrit ceux du composant, et la flèche aurait hérité
  // du slot du badge.
  assert.deepEqual(structure.children.map((child) => child.slot), ['icon', 'label']);
  assert.equal(icons.arrowLeftLong.slot, 'icon');
  assert.equal(icons.badgeIcon.slot, undefined);
  assertSlotsExist(structure, icons);
});
