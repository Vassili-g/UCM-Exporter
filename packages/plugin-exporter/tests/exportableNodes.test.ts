/**
 * Tests du parcours des calques qui peuvent participer au rendu.
 *
 * La visibilité locale ne suffit pas : une prop ou une variable peut rendre
 * un calque visible, tandis qu'un parent statiquement masqué exclut tout son
 * sous-arbre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contientUneInstanceRendue, getAllNodes } from '../src/contract/exportableNodes';
import { localisationsDe } from '../src/contract/localisation';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

test('un parcours profond lit les parents un nombre linéaire de fois', () => {
  let lectures = 0;
  const descendants: SceneNode[] = [];
  const root = { id: 'root', type: 'COMPONENT', visible: true,
    findAll: () => descendants } as unknown as ComponentNode;
  let parent: SceneNode = root;
  for (let index = 0; index < 2000; index += 1) {
    const ancetre = parent;
    parent = { id: String(index), type: 'FRAME', visible: index !== 1999,
      get parent() { lectures += 1; return ancetre; } } as unknown as SceneNode;
    descendants.push(parent);
  }
  assert.deepEqual(getAllNodes(root), [root, ...descendants.slice(0, -1)]);
  assert.ok(lectures <= descendants.length * 3, `${lectures} lectures de parent`);
});

test('le masque extérieur garde le diagnostic et une dépendance masque ses internes', () => {
  const root = tree('Root', [{ type: 'FRAME', name: 'Masque', visible: false, children: [
    { type: 'FRAME', name: 'Masque intérieur', visible: false,
      boundVariables: { fills: [alias('fond')] } },
    { type: 'INSTANCE', id: 'dependency', name: 'Dépendance', children: [
      { type: 'RECTANGLE', name: 'Interne', boundVariables: { fills: [alias('interne')] } },
    ] },
  ] }]);
  const warnings: string[] = [];
  assert.deepEqual(getAllNodes(root, warnings, new Map([
    ['dependency', { component: 'Other', figmaLayer: 'Dépendance' }],
  ])), [root]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Masque »/);
});

type TestNode = {
  type: string;
  id?: string;
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
  assert.match(warnings[0], /« Archive ».*l'exclut avec tout son contenu/);
});

/**
 * Deux variants qui masquent chacun un calque au même nom produisent la même
 * phrase. Le message ne part qu'une fois, et il mène aux deux calques.
 */
test('un calque masqué répété dans deux variants se signale une fois et mène aux deux', () => {
  const masque = (id: string): TestNode => ({
    type: 'FRAME',
    id,
    name: 'Archive',
    visible: false,
    children: [{ type: 'RECTANGLE', name: 'Ancien fond', boundVariables: { fills: [alias('legacy')] } }],
  });
  const warnings: string[] = [];

  getAllNodes(tree('State=Default', [masque('1:1')]), warnings);
  getAllNodes(tree('State=Hover', [masque('2:2')]), warnings);

  assert.equal(warnings.length, 1);
  assert.deepEqual(localisationsDe(warnings).get(warnings[0]), ['1:1', '2:2']);
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

/**
 * Le test rapide et le parcours complet disent la même chose : c'est la seule
 * garantie que la garde de l'index ne change aucun contrat.
 */
function jugeCommeGetAllNodes(racine: ComponentNode, attendu: boolean): void {
  const parParcours = getAllNodes(racine).some((node) => node.type === 'INSTANCE');
  assert.equal(parParcours, attendu, 'le scénario ne dit pas ce que son nom annonce');
  assert.equal(contientUneInstanceRendue(racine), attendu);
}

/** Le même arbre, servi par `findAllWithCriteria` comme dans Figma. */
function avecCriteres(racine: ComponentNode): ComponentNode {
  const noeud = racine as unknown as TestNode & { findAllWithCriteria?: unknown };
  noeud.findAllWithCriteria = ({ types }: { types: string[] }) =>
    noeud.findAll!((node) => types.includes(node.type));
  return racine;
}

test('une instance visible est rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ])), true);
});

test('une instance masquée sans liaison n’est pas rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'INSTANCE', name: 'Leaf', visible: false },
  ])), false);
});

test('une instance sous un cadre masqué n’est pas rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', visible: false, children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ])), false);
});

test('une instance masquée dont une propriété pilote la visibilité est rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'INSTANCE', name: 'Leaf', visible: false,
      componentPropertyReferences: { visible: 'Afficher#1:2' } },
  ])), true);
});

test('une racine sans instance n’en contient aucune', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', children: [{ type: 'TEXT', name: 'Glyph' }] },
  ])), false);
});

test('sans findAllWithCriteria, le repli sur findAll juge de même', () => {
  jugeCommeGetAllNodes(tree('Root', [
    { type: 'INSTANCE', name: 'Masquée', visible: false },
    { type: 'FRAME', name: 'Branch', children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ]), true);
});
