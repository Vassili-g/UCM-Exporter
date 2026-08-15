/**
 * Tests de la composition : un composant unifié imbriqué est une DÉPENDANCE,
 * jamais un calque à parcourir ni un wrapper de dimensions.
 *
 * Le cas reproduit est réel : une Alert qui embarque un bouton d'action. Ce
 * bouton porte gap, paddings et radius liés, ce qui suffisait à le faire élire
 * « wrapper de dimensions » — l'Alert héritait alors des slots, des tailles et
 * des props du Button.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  indexContractedNames,
  scanComposedMatrix,
  scanComposedInstances,
} from '../src/contract/composedComponents';
import { findWrapperReference } from '../src/contract/componentTree';
import { getAllNodes } from '../src/contract/exportableNodes';
import { extractLayout } from '../src/contract/extractLayout';
import type { ChildStructure, ComposedDependency } from '../src/contract/types';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

/** Toutes les liaisons de dimensions d'un coup : de quoi gagner un score de wrapper. */
const dimensionsLiees = {
  itemSpacing: alias('gap'),
  paddingLeft: alias('px'),
  paddingRight: alias('px'),
  cornerRadius: alias('radius'),
};

/** Instance dont le composant maître appartient au set nommé `setName`. */
function instance(
  id: string,
  name: string,
  setName: string | null,
  extra: Record<string, unknown> = {},
) {
  const main = {
    name: `${setName ?? name}-variant`,
    parent: setName ? { type: 'COMPONENT_SET', name: setName } : null,
  };
  return {
    type: 'INSTANCE',
    id,
    name,
    getMainComponentAsync: async () => main,
    componentProperties: {},
    children: [],
    findAll: () => [],
    ...extra,
  } as unknown as InstanceNode;
}

/** Rattache chaque descendant à son parent : `hasAncestorIn` remonte la chaîne. */
function racine(id: string, name: string, enfants: unknown[]) {
  const descendants: unknown[] = [];
  const collecter = (noeuds: unknown[], parent: unknown) => {
    for (const noeud of noeuds) {
      (noeud as { parent?: unknown }).parent = parent;
      descendants.push(noeud);
      collecter(((noeud as { children?: unknown[] }).children ?? []), noeud);
    }
  };

  const node = {
    type: 'COMPONENT',
    id,
    name,
    layoutMode: 'HORIZONTAL',
    boundVariables: {},
    children: enfants,
    findAll: (predicat: (n: never) => boolean) =>
      descendants.filter(predicat as (n: unknown) => boolean),
  } as unknown as ComponentNode;

  collecter(enfants, node);
  return node;
}

test('indexContractedNames relève les composants qui possèdent un conteneur de règles', () => {
  const page = {
    findAll: (predicat: (n: never) => boolean) =>
      [
        { type: 'SECTION', name: 'Button-Rules' },
        { type: 'FRAME', name: 'Alert-Rules' },
        // Ni un conteneur de règles, ni un type accepté : ignorés tous les deux.
        { type: 'FRAME', name: 'Notes de travail' },
        { type: 'TEXT', name: 'Chip-Rules' },
      ].filter(predicat as (n: unknown) => boolean),
  } as unknown as PageNode;

  assert.deepEqual(Array.from(indexContractedNames(page)).sort(), ['alert', 'button']);
});

test('scanComposedInstances déclare une instance contractée comme dépendance', async () => {
  const bouton = instance('btn', 'action', 'Button', {
    componentPropertyReferences: { visible: 'action#9:1' },
  });
  const alert = racine('alert', 'Severity=Info', [bouton]);

  const { composes, composed } = await scanComposedInstances(alert, new Set(['button']));

  assert.deepEqual(composes, [
    { component: 'Button', figmaLayer: 'action', visibilityProp: 'action' },
  ]);
  // Le relevé sert ensuite à élaguer : il porte l'id ET le nom du composant.
  assert.deepEqual(composed.get('btn'), {
    component: 'Button',
    figmaLayer: 'action',
    visibilityProp: 'action',
  });
});

test('scanComposedInstances ignore une instance sans contrat', async () => {
  // Un wrapper de dimensions est une instance, mais sans conteneur de règles :
  // il reste un calque interne du composant, donc parcourable.
  const wrapper = instance('wrap', 'Button-Wrapper', 'Button-Construc');
  const bouton = racine('button', 'Color=Primary', [wrapper]);

  const { composes, composed } = await scanComposedInstances(bouton, new Set(['button']));

  assert.deepEqual(composes, []);
  assert.equal(composed.size, 0);
});

test('scanComposedInstances ne déclare pas une dépendance imbriquée dans une autre', async () => {
  // Une icône contractée à l'intérieur du bouton appartient au contrat du
  // bouton : l'Alert n'en est pas responsable.
  const icone = instance('ico', 'icon', 'Icon');
  const bouton = instance('btn', 'action', 'Button', { children: [icone] });
  const alert = racine('alert', 'Severity=Info', [bouton]);

  const { composes, composed } = await scanComposedInstances(
    alert,
    new Set(['button', 'icon']),
  );

  assert.deepEqual(composes.map((entry) => entry.component), ['Button']);
  // Les deux restent élaguées : rien de ce que porte le bouton n'entre ici.
  assert.deepEqual(Array.from(composed.keys()).sort(), ['btn', 'ico']);
});

test('getAllNodes garde l’instance composée mais n’entre pas dedans', () => {
  const interne = { type: 'TEXT', id: 'txt', name: 'Suivant', children: [] };
  const bouton = instance('btn', 'action', 'Button', { children: [interne] });
  const alert = racine('alert', 'Severity=Info', [bouton]);

  const noms = getAllNodes(
    alert,
    [],
    new Map([['btn', { component: 'Button', figmaLayer: 'action' }]]),
  ).map((node) => node.name);

  // Le slot reste visible — le composé doit pouvoir dire QUOI rendre là —
  // mais le libellé du bouton n'appartient pas à l'Alert.
  assert.deepEqual(noms, ['Severity=Info', 'action']);
});

test('un slot qui enveloppe une dépendance reprend aussi sa visibilité', async () => {
  // Cas réel de l'Alert : le bouton n'est pas un enfant direct du layout, il
  // est rangé dans un calque « Action ». Le slot doit malgré tout dire quoi
  // rendre — sinon il paraît vide, et son absence de texte le fait passer
  // pour un placeholder d'icône dont on cherche la taille en vain.
  const bouton = instance('btn', 'Button', 'Button', {
    componentPropertyReferences: { visible: 'action#9:1' },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const conteneur = {
    type: 'FRAME',
    id: 'act',
    name: 'Action',
    boundVariables: {},
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'FILL',
    children: [bouton],
    findAll: () => [bouton],
  };
  const alert = racine('alert', 'Severity=Info', [conteneur]);

  const warnings: string[] = [];
  const layout = await extractLayout(
    alert,
    { resolve: async () => null },
    warnings,
    new Map([['btn', {
      component: 'Button',
      figmaLayer: 'Button',
      visibilityProp: 'action',
    }]]),
  );

  const slot = layout.children.find((child) => child.slot === 'action');
  assert.equal(slot?.figmaLayer, 'Action');
  assert.equal(slot?.visibilityProp, 'action');
  assert.equal(slot?.optional, true);
  // Le cadre est un conteneur de CE contrat : la dépendance est en dessous, et
  // la visibilité reste sur le slot, seule condition d'affichage.
  assert.equal(slot?.composes, undefined);
  assert.deepEqual(slot?.children, [
    { slot: 'button', figmaLayer: 'Button', composes: 'Button' },
  ]);
  assert.equal(warnings.some((warning) => warning.includes('action-size')), false);
});

test('scanComposedMatrix n’invente pas un slot absent du variant de référence', async () => {
  const sansAction = racine('info', 'Severity=Info', []);
  const avecAction = racine(
    'success',
    'Severity=Success',
    [instance('btn-success', 'Button', 'Button')],
  );

  const result = await scanComposedMatrix(
    [sansAction, avecAction],
    sansAction,
    new Set(['button']),
  );

  assert.deepEqual(result.composes, []);
  assert.equal(result.composed.has('btn-success'), true);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Composition différente sur 1 variant/);
  assert.match(result.warnings[0], /décrit le variant de référence/);
});

test('scanComposedMatrix garde la cardinalité du variant de référence', async () => {
  const simple = racine(
    'simple',
    'Mode=Simple',
    [instance('btn-simple', 'Action', 'Button')],
  );
  const double = racine(
    'double',
    'Mode=Double',
    [
      instance('btn-double-1', 'Action', 'Button'),
      instance('btn-double-2', 'Action', 'Button'),
    ],
  );

  const result = await scanComposedMatrix([simple, double], simple, new Set(['button']));

  assert.equal(result.composes.length, 1);
  assert.deepEqual(
    result.composes.map((dependency) => dependency.component),
    ['Button'],
  );
  assert.equal(result.warnings.length, 1);
});

test('scanComposedMatrix signale aussi un ordre de composition différent', async () => {
  const reference = racine(
    'reference',
    'Mode=Reference',
    [
      instance('button-reference', 'Action', 'Button'),
      instance('link-reference', 'Lien', 'Link'),
    ],
  );
  const inverse = racine(
    'inverse',
    'Mode=Inverse',
    [
      instance('link-inverse', 'Lien', 'Link'),
      instance('button-inverse', 'Action', 'Button'),
    ],
  );

  const result = await scanComposedMatrix(
    [reference, inverse],
    reference,
    new Set(['button', 'link']),
  );

  assert.deepEqual(
    result.composes.map((dependency) => dependency.component),
    ['Button', 'Link'],
  );
  assert.equal(result.warnings.length, 1);
});

test('findWrapperReference n’élit jamais un composant unifié imbriqué', async () => {
  const bouton = instance('btn', 'action', 'Button', { boundVariables: dimensionsLiees });
  const alert = racine('alert', 'Severity=Info', [bouton]);

  // Sans la composition, le bouton gagne l'élection : c'est exactement le
  // défaut qui faisait décrire un Button dans le contrat de l'Alert.
  const sansComposition = await findWrapperReference(alert, []);
  assert.equal(sansComposition?.instance.name, 'action');

  // Déclaré comme dépendance, il cesse d'être candidat et l'Alert lit ses
  // propres dimensions.
  const avecComposition = await findWrapperReference(
    alert,
    [],
    new Map([['btn', { component: 'Button', figmaLayer: 'action' }]]),
  );
  assert.equal(avecComposition, null);
});

/** Un cadre d'auto layout qui appartient au contrat et range des calques. */
function cadre(id: string, name: string, enfants: unknown[], extra: Record<string, unknown> = {}) {
  return {
    type: 'FRAME',
    id,
    name,
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MAX',
    counterAxisAlignItems: 'CENTER',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    boundVariables: {},
    children: enfants,
    findAll: (predicat: (n: never) => boolean = () => true) =>
      enfants.filter(predicat as (n: unknown) => boolean),
    ...extra,
  } as unknown as SceneNode;
}

/** Une dépendance prête à être posée dans `composed`. */
const dependance = (component: string, figmaLayer: string, visibilityProp?: string) =>
  (visibilityProp ? { component, figmaLayer, visibilityProp } : { component, figmaLayer });

/** Les `composes` rencontrés en parcourant l'arbre : le contrôle du consommateur. */
function composesDeLArbre(children: readonly ChildStructure[] = []): string[] {
  return children.flatMap((child) => [
    ...(child.composes ? [child.composes] : []),
    ...composesDeLArbre(child.children),
  ]);
}

test('un cadre qui range plusieurs dépendances les publie toutes, chacune à sa place', async () => {
  const primaire = instance('btn-1', 'Primaire', 'Button', {
    componentPropertyReferences: { visible: 'primary#1:0' },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const secondaire = instance('btn-2', 'Secondaire', 'Button', {
    componentPropertyReferences: { visible: 'secondary#1:0' },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const actions = cadre('acts', 'Actions', [primaire, secondaire], {
    boundVariables: { itemSpacing: alias('gap-actions') },
  });
  const carte = racine('card', 'Variant=Default', [actions]);

  const warnings: string[] = [];
  const placed = new Set<ComposedDependency>();
  const layout = await extractLayout(
    carte,
    {
      resolve: async (reference: unknown) =>
        (reference as { id?: string } | null)?.id === 'gap-actions'
          ? 'components.card.sizes.gap-actions'
          : null,
    },
    warnings,
    new Map([
      ['btn-1', dependance('Button', 'Primaire', 'primary')],
      ['btn-2', dependance('Button', 'Secondaire', 'secondary')],
    ]),
    new Set(),
    carte,
    true,
    placed,
  );

  // Le cadre appartient à CE contrat : il publie son flux, y compris l'espace
  // entre deux dépendances que le contrat porte toutes les deux.
  const slot = layout.children[0];
  assert.equal(slot.slot, 'actions');
  assert.equal(slot.layout, 'flex-row');
  assert.equal(slot.justifyContent, 'flex-end');
  assert.equal(slot.alignItems, 'center');
  assert.equal(slot.gap, '{components.card.sizes.gap-actions}');
  assert.equal(slot.composes, undefined);

  // Chaque dépendance a son emplacement ET sa propre condition d'affichage :
  // le cadre n'en a repris aucune, il les masquerait toutes ensemble.
  assert.deepEqual(slot.children, [
    {
      slot: 'primaire',
      figmaLayer: 'Primaire',
      visibilityProp: 'primary',
      optional: true,
      composes: 'Button',
    },
    {
      slot: 'secondaire',
      figmaLayer: 'Secondaire',
      visibilityProp: 'secondary',
      optional: true,
      composes: 'Button',
    },
  ]);
  assert.equal(placed.size, 2);
  // Le calque n'est plus un défaut de design : il n'y a plus rien à réclamer.
  assert.equal(
    warnings.some((warning) => warning.includes('emplacement')),
    false,
  );
});

test('l’arbre place exactement les dépendances que le scan a relevées', async () => {
  const lien = (id: string, name: string) =>
    instance(id, name, 'Link', { layoutSizingHorizontal: 'HUG', layoutSizingVertical: 'HUG' });
  const liens = cadre('wrap', 'Liens', [lien('l1', 'Lien 1'), lien('l2', 'Lien 2'), lien('l3', 'Lien 3')]);
  const carte = racine('card', 'Variant=Default', [liens]);

  const { composes, composed } = await scanComposedInstances(carte, new Set(['link']));
  const placed = new Set<ComposedDependency>();
  const layout = await extractLayout(
    carte,
    { resolve: async () => null },
    [],
    composed,
    new Set(),
    carte,
    true,
    placed,
  );

  // C'est le contrôle que le consommateur applique au contrat : `composes` et
  // les slots récursifs doivent décrire la même séquence de dépendances.
  assert.deepEqual(composesDeLArbre(layout.children), ['Link', 'Link', 'Link']);
  assert.deepEqual(composes.filter((entry) => placed.has(entry)), composes);
});

test('une dépendance posée hors du node de layout n’est pas placée, et se signale', async () => {
  const perdu = instance('btn-perdu', 'Bouton perdu', 'Button');
  const contenu = cadre('inner', 'Contenu', []);
  const carte = racine('card', 'Variant=Default', [contenu, perdu]);

  const warnings: string[] = [];
  const placed = new Set<ComposedDependency>();
  await extractLayout(
    contenu,
    { resolve: async () => null },
    warnings,
    new Map([['btn-perdu', dependance('Button', 'Bouton perdu')]]),
    new Set(),
    carte,
    true,
    placed,
  );

  // L'arbre ne peut pas la situer : `composes` la laissera donc tomber elle
  // aussi, plutôt que d'annoncer une dépendance sans emplacement.
  assert.equal(placed.size, 0);
  assert.equal(warnings.some((warning) => warning.includes('« Bouton perdu »')), true);
});
