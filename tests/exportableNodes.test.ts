/**
 * Tests du parcours des calques qui peuvent participer au rendu.
 *
 * La visibilité locale ne suffit pas : une prop ou une variable peut rendre
 * un calque visible, tandis qu'un parent statiquement masqué exclut tout son
 * sous-arbre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllNodes } from '../src/contract/exportableNodes';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

type TestNode = {
  type: string;
  name: string;
  visible?: boolean;
  boundVariables?: Record<string, unknown>;
  componentPropertyReferences?: { visible?: string } | null;
  children?: TestNode[];
  parent?: TestNode;
  findAll?: (predicate: (node: TestNode) => boolean) => TestNode[];
};

/** Construit le même parcours préfixe que `findAll`, avec les vrais parents. */
function tree(name: string, children: TestNode[]): ComponentNode {
  const root: TestNode = { type: 'COMPONENT', name, children };
  const descendants: TestNode[] = [];
  const visit = (parent: TestNode, nodes: TestNode[]) => {
    for (const node of nodes) {
      node.parent = parent;
      descendants.push(node);
      visit(node, node.children ?? []);
    }
  };
  visit(root, children);
  root.findAll = (predicate) => descendants.filter(predicate);
  return root as unknown as ComponentNode;
}

test('un sous-arbre statiquement masqué est élagué et son token est signalé', () => {
  const descendant = {
    type: 'RECTANGLE',
    name: 'Ancien fond',
    boundVariables: { fills: [alias('legacy')] },
  };
  const groupeMasque = {
    type: 'FRAME',
    name: 'Archive',
    visible: false,
    children: [descendant],
  };
  const visible = { type: 'RECTANGLE', name: 'Fond', visible: true };
  const root = tree('Button', [groupeMasque, visible]);
  const warnings: string[] = [];

  const nodes = getAllNodes(root, warnings);

  assert.deepEqual(nodes.map((node) => node.name), ['Button', 'Fond']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Archive ».*variables liées ignorées/);
});

test('un calque masqué par une prop ou une variable de visibilité reste exportable', () => {
  const parProp = {
    type: 'VECTOR',
    name: 'Icône optionnelle',
    visible: false,
    componentPropertyReferences: { visible: 'iconLeft#1:2' },
  };
  const parVariable = {
    type: 'VECTOR',
    name: 'Icône par mode',
    visible: false,
    boundVariables: { visible: alias('show-icon') },
  };
  const root = tree('Button', [parProp, parVariable]);

  assert.deepEqual(
    getAllNodes(root).map((node) => node.name),
    ['Button', 'Icône optionnelle', 'Icône par mode'],
  );
});

test('un calque masqué sans donnée contractuelle est exclu sans bruit', () => {
  const root = tree('Button', [
    { type: 'RECTANGLE', name: 'Repère de travail', visible: false },
  ]);
  const warnings: string[] = [];

  assert.deepEqual(getAllNodes(root, warnings).map((node) => node.name), ['Button']);
  assert.deepEqual(warnings, []);
});
