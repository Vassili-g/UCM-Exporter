import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPropertyBindings } from '../src/contract/propertyBindings';

function node(type: string, name: string, children: any[] = [], extra: any = {}): any {
  const self: any = { type, id: `${name}-id`, name, children, ...extra };
  self.findAll = (predicate: (candidate: any) => boolean) => {
    const found: any[] = [];
    const visit = (entries: any[]) => {
      for (const child of entries) {
        if (predicate(child)) found.push(child);
        visit(child.children ?? []);
      }
    };
    visit(children);
    return found;
  };
  for (const child of children) child.parent = self;
  return self;
}

test('les liaisons natives visible, characters et mainComponent gardent leur cible exacte', () => {
  const icon = node('INSTANCE', 'Icon', [], {
    componentPropertyReferences: {
      visible: 'Show icon#1:1',
      mainComponent: 'Icon choice#1:2',
    },
  });
  const label = node('TEXT', 'Label', [], {
    componentPropertyReferences: { characters: 'Label#1:3' },
  });
  const root = node('COMPONENT', 'State=Default', [node('FRAME', 'Content', [icon, label])]);
  const warnings: string[] = [];

  const bindings = extractPropertyBindings(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component: root }] },
    new Map([
      ['Show icon#1:1', 'showIcon'],
      ['Icon choice#1:2', 'iconChoice'],
      ['Label#1:3', 'label'],
    ]),
    warnings,
  );

  assert.deepEqual(bindings, [
    {
      prop: 'showIcon', figmaPropName: 'Show icon#1:1', target: 'visible',
      nodeId: 'Icon-id', variantNodeId: 'State=Default-id', figmaPath: ['Content', 'Icon'],
    },
    {
      prop: 'iconChoice', figmaPropName: 'Icon choice#1:2', target: 'mainComponent',
      nodeId: 'Icon-id', variantNodeId: 'State=Default-id', figmaPath: ['Content', 'Icon'],
    },
    {
      prop: 'label', figmaPropName: 'Label#1:3', target: 'characters',
      nodeId: 'Label-id', variantNodeId: 'State=Default-id', figmaPath: ['Content', 'Label'],
    },
  ]);
  assert.deepEqual(warnings, []);
});

test('une liaison orpheline avertit explicitement de son absence du contrat', () => {
  const root = node('COMPONENT', 'Simple', [], {
    componentPropertyReferences: { visible: 'Missing#8:2' },
  });
  const warnings: string[] = [];

  const bindings = extractPropertyBindings(
    { axes: [], variants: [{ values: {}, component: root }] },
    new Map(),
    warnings,
  );

  assert.deepEqual(bindings, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /n'est pas publiée dans le contrat/);
});

test('une liaison portée par la racine du variant n’est publiée qu’une fois', () => {
  const root = node('COMPONENT', 'Simple', [], {
    componentPropertyReferences: { visible: 'Visible#8:3' },
  });
  const warnings: string[] = [];

  const bindings = extractPropertyBindings(
    { axes: [], variants: [{ values: {}, component: root }] },
    new Map([['Visible#8:3', 'visible']]),
    warnings,
  );

  assert.deepEqual(bindings, [{
    prop: 'visible',
    figmaPropName: 'Visible#8:3',
    target: 'visible',
    nodeId: 'Simple-id',
    variantNodeId: 'Simple-id',
    figmaPath: [],
  }]);
  assert.deepEqual(warnings, []);
});

test('les bindings internes d’une dépendance composée restent dans son propre contrat', () => {
  const internal = node('TEXT', 'Interne', [], {
    componentPropertyReferences: { characters: 'Nested label#9:9' },
  });
  const dependency = node('INSTANCE', 'Action', [internal]);
  const root = node('COMPONENT', 'Parent', [dependency]);
  const warnings: string[] = [];

  const bindings = extractPropertyBindings(
    { axes: [], variants: [{ values: {}, component: root }] },
    new Map(),
    warnings,
    new Map([['Action-id', { component: 'Button', figmaLayer: 'Action' }]]),
  );

  assert.deepEqual(bindings, []);
  assert.deepEqual(warnings, []);
});
