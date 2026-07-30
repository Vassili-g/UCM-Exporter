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
  scanComposedInstances,
} from '../src/contract/composedComponents';
import { findWrapperReference } from '../src/contract/componentTree';
import { getAllNodes } from '../src/contract/exportableNodes';

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
  assert.equal(composed.get('btn'), 'Button');
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

  const noms = getAllNodes(alert, [], new Map([['btn', 'Button']])).map((node) => node.name);

  // Le slot reste visible — le composé doit pouvoir dire QUOI rendre là —
  // mais le libellé du bouton n'appartient pas à l'Alert.
  assert.deepEqual(noms, ['Severity=Info', 'action']);
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
  const avecComposition = await findWrapperReference(alert, [], new Map([['btn', 'Button']]));
  assert.equal(avecComposition, null);
});
