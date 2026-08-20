/**
 * L'échantillon de maquette : ce que Figma MONTRE, sans que rien ne l'exige.
 *
 * Le cas de référence est celui du corpus réel : un StressTest qui embarque une
 * Alert, laquelle embarque un Button. Chacun porte des textes que ses props
 * n'atteignent pas — ce design system n'expose aucune component property TEXT —
 * et c'est précisément ce que ces tests protègent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractVariantSample,
  sampleVarianceNotice,
} from '../src/contract/extractSamples';
import { extractPropertyBindings } from '../src/contract/propertyBindings';
import { getAllNodes } from '../src/contract/exportableNodes';
import { compactVariants } from '../src/contract/compactVariants';
import type { ComposedDependency, ExtractedContractVariant } from '../src/contract/types';

function node(type: string, id: string, name: string, children: any[] = [], extra: object = {}) {
  const result: any = { type, id, name, children, boundVariables: {}, visible: true, ...extra };
  for (const child of children) child.parent = result;
  result.findAll = (predicate: (candidate: any) => boolean) => {
    const found: any[] = [];
    const visit = (items: any[]) => {
      for (const item of items) {
        if (predicate(item)) found.push(item);
        visit(item.children ?? []);
      }
    };
    visit(result.children ?? []);
    return found;
  };
  return result;
}

/** Une instance contractée, avec les propriétés que la maquette lui applique. */
function instance(
  id: string,
  name: string,
  properties: Record<string, { type: string; value: string | boolean }>,
  children: any[] = [],
  extra: object = {},
) {
  return node('INSTANCE', id, name, children, {
    componentProperties: properties,
    exposedInstances: [],
    overrides: [],
    ...extra,
  });
}

/** Le composant maître d'une dépendance, avec les définitions de son set. */
function maitre(setName: string, definitions: Record<string, any>) {
  return {
    name: `${setName}-variant`,
    parent: { type: 'COMPONENT_SET', id: `${setName}-set`, name: setName, componentPropertyDefinitions: definitions },
  } as unknown as ComponentNode;
}

const DEFINITIONS_ALERT = {
  Severity: { type: 'VARIANT', variantOptions: ['Info', 'Success'], defaultValue: 'Info' },
  Variant: { type: 'VARIANT', variantOptions: ['Standard', 'Outlined'], defaultValue: 'Standard' },
  'Title#265:13': { type: 'BOOLEAN', defaultValue: true },
  'Action#265:22': { type: 'BOOLEAN', defaultValue: true },
};

const DEFINITIONS_BUTTON = {
  Color: { type: 'VARIANT', variantOptions: ['Primary', 'Info'], defaultValue: 'Primary' },
  State: { type: 'VARIANT', variantOptions: ['Default', 'Disable'], defaultValue: 'Default' },
  'Label#234:0': { type: 'BOOLEAN', defaultValue: true },
};

test('le texte d’un slot est capturé même quand le calque a été renommé', () => {
  // Le cas exact du corpus : « Titre » est un calque renommé — son nom ne dit
  // plus rien du contenu — tandis que la description n'a jamais été nommée.
  const titre = node('TEXT', 't1', 'Titre', [], { characters: 'Bien préparer votre dossier' });
  const desc = node('TEXT', 't2', 'Description de l’élément', [], {
    characters: 'Description de l’élément',
  });
  const texte = node('FRAME', 'f1', 'Head', [titre, desc], { layoutMode: 'VERTICAL' });
  const component = node('COMPONENT', 'c1', 'StressTest', [texte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map() },
    undefined,
    new Set(),
    new Map(),
    new Map(),
  );

  assert.deepEqual(sample.text, [
    { slotPath: ['label', 'label'], figmaLayer: 'Titre', value: 'Bien préparer votre dossier' },
    {
      slotPath: ['label', 'label-2'],
      figmaLayer: 'Description de l’élément',
      value: 'Description de l’élément',
    },
  ]);
});

test('un texte porté par une TEXT property reste dans args et ne se répète pas', () => {
  const label = node('TEXT', 't1', 'Suivant', [], {
    characters: 'Suivant',
    componentPropertyReferences: { characters: 'Label#234:0' },
  });
  const component = node('COMPONENT', 'c1', 'Button', [label], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map() },
    { label: 'Suivant' },
    new Set(),
    new Map(),
    new Map(),
  );

  assert.deepEqual(sample.args, { label: 'Suivant' });
  assert.equal(sample.text, undefined);
});

test('un calque masqué ne montre rien, donc n’est pas capturé', () => {
  const cache = node('TEXT', 't1', 'Brouillon', [], { characters: 'À supprimer', visible: false });
  const visible = node('TEXT', 't2', 'Titre', [], { characters: 'Bonjour' });
  const component = node('COMPONENT', 'c1', 'Carte', [cache, visible], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map() },
    undefined,
    new Set(),
    new Map(),
    new Map(),
  );

  assert.deepEqual(sample.text?.map((entree) => entree.value), ['Bonjour']);
});

test('la visibilité réelle et le texte d’un variant entrent dans args', () => {
  const icone = node('VECTOR', 'i1', 'arrow-left-long', [], {
    visible: false,
    componentPropertyReferences: { visible: 'Icon-Left#1261:147' },
  });
  const label = node('TEXT', 'l1', 'Suivant', [], {
    characters: 'Compléter',
    componentPropertyReferences: { characters: 'Label#234:0' },
  });
  const component = node('COMPONENT', 'c1', 'Color=Primary', [icone, label], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const { applied } = extractPropertyBindings(
    { axes: ['color'], variants: [{ component, values: { color: 'primary' } }] } as any,
    new Map([['Icon-Left#1261:147', 'iconLeft'], ['Label#234:0', 'label']]),
    [],
  );

  // C'est l'information que le contrat ne portait nulle part : `optional` disait
  // qu'un slot PEUT être masqué, jamais qu'il l'EST dans cette combinaison.
  assert.deepEqual(applied.get('c1'), { iconLeft: false, label: 'Compléter' });
});

test('deux calques qui contredisent une même prop taisent la clé, sans avertir', () => {
  const premier = node('VECTOR', 'i1', 'a', [], {
    visible: true,
    componentPropertyReferences: { visible: 'Icon#1:1' },
  });
  const second = node('VECTOR', 'i2', 'b', [], {
    visible: false,
    componentPropertyReferences: { visible: 'Icon#1:1' },
  });
  const component = node('COMPONENT', 'c1', 'V', [premier, second], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const warnings: string[] = [];
  const { applied } = extractPropertyBindings(
    { axes: [], variants: [{ component, values: {} }] } as any,
    new Map([['Icon#1:1', 'icon']]),
    warnings,
  );

  assert.deepEqual(applied.get('c1'), {});
  assert.deepEqual(warnings, []);
});

test('une dépendance publie ses args aux clés publiques de son propre contrat', () => {
  const alerte = instance('a1', 'Alert', {
    Severity: { type: 'VARIANT', value: 'Info' },
    Variant: { type: 'VARIANT', value: 'Outlined' },
    'Title#265:13': { type: 'BOOLEAN', value: true },
    'Action#265:22': { type: 'BOOLEAN', value: false },
  });
  const component = node('COMPONENT', 'c1', 'StressTest', [alerte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;
  const dependance: ComposedDependency = { component: 'Alert', figmaLayer: 'Alert' };

  const sample = extractVariantSample(
    { component, paths: new Map([['a1', ['alert']]]) },
    undefined,
    new Set(),
    new Map([['a1', dependance]]),
    new Map([['a1', maitre('Alert', DEFINITIONS_ALERT)]]),
  );

  assert.deepEqual(sample.composes, [{
    figmaLayer: 'Alert',
    component: 'Alert',
    args: { severity: 'info', variant: 'outlined', title: true, action: false },
    slotPath: ['alert'],
  }]);
});

test('l’axe d’états reste sous sa clé, et Disable porte en plus la prop publique', () => {
  const bouton = instance('b1', 'Button', {
    Color: { type: 'VARIANT', value: 'Primary' },
    State: { type: 'VARIANT', value: 'Disable' },
  });
  const component = node('COMPONENT', 'c1', 'Carte', [bouton], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['b1', ['button']]]) },
    undefined,
    new Set(),
    new Map([['b1', { component: 'Button', figmaLayer: 'Button' }]]),
    new Map([['b1', maitre('Button', DEFINITIONS_BUTTON)]]),
  );

  // `state` permet de retrouver le variant de Button ; `disabled` est la prop
  // que son contrat expose réellement.
  assert.deepEqual(sample.composes?.[0].args, {
    color: 'primary', state: 'disable', disabled: true,
  });
});

test('les instances exposées comblent les props portées par un wrapper', () => {
  const wrapper = instance('w1', 'sizeWrapperButton', {
    Size: { type: 'VARIANT', value: 'Small' },
  });
  const bouton = instance('b1', 'Button', {
    Color: { type: 'VARIANT', value: 'Info' },
  }, [wrapper], { exposedInstances: [wrapper] });
  const component = node('COMPONENT', 'c1', 'Alert', [bouton], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['b1', ['action', 'button']]]) },
    undefined,
    new Set(),
    new Map([['b1', { component: 'Button', figmaLayer: 'Button' }]]),
    new Map([
      ['b1', maitre('Button', DEFINITIONS_BUTTON)],
      ['w1', maitre('SizeWrapper', {
        Size: { type: 'VARIANT', variantOptions: ['Small', 'Big'], defaultValue: 'Small' },
      })],
    ]),
  );

  assert.deepEqual(sample.composes?.[0].args, { color: 'info', size: 'small' });
});

test('un texte surchargé dans une dépendance est publié, situé par ses calques', () => {
  const titre = node('TEXT', 'a1-titre', 'Titre', [], {
    characters: 'Vous pouvez valider cet élément',
  });
  const texte = node('FRAME', 'a1-text', 'Text', [titre]);
  const alerte = instance('a1', 'Alert', {}, [texte], {
    overrides: [{ id: 'a1-titre', overriddenFields: ['characters'] }],
  });
  const component = node('COMPONENT', 'c1', 'StressTest', [alerte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['a1', ['alert']]]) },
    undefined,
    new Set(),
    new Map([['a1', { component: 'Alert', figmaLayer: 'Alert' }]]),
    new Map(),
  );

  assert.deepEqual(sample.composes?.[0].overrides, [
    { figmaPath: ['Text', 'Titre'], text: 'Vous pouvez valider cet élément' },
  ]);
});

test('une surcharge de rendu est écartée : elle décrirait ce que le contrat doit dire', () => {
  const fond = node('RECTANGLE', 'a1-fond', 'Surface', [], { characters: undefined });
  const alerte = instance('a1', 'Alert', {}, [fond], {
    overrides: [{ id: 'a1-fond', overriddenFields: ['fills', 'cornerRadius'] }],
  });
  const component = node('COMPONENT', 'c1', 'StressTest', [alerte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['a1', ['alert']]]) },
    undefined,
    new Set(),
    new Map([['a1', { component: 'Alert', figmaLayer: 'Alert' }]]),
    new Map(),
  );

  assert.equal(sample.composes?.[0].overrides, undefined);
});

test('une dépendance imbriquée revient à son parent, sans chemin de slot', () => {
  const label = node('TEXT', 'b1-label', 'Suivant', [], { characters: 'Cliquez ici' });
  const bouton = instance('b1', 'Button', {
    Color: { type: 'VARIANT', value: 'Info' },
  }, [label]);
  const action = node('FRAME', 'a1-action', 'Action', [bouton]);
  const alerte = instance('a1', 'Alert', {
    Severity: { type: 'VARIANT', value: 'Info' },
  }, [action], {
    overrides: [{ id: 'b1-label', overriddenFields: ['characters'] }],
  });
  const component = node('COMPONENT', 'c1', 'StressTest', [alerte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const composed = new Map<string, ComposedDependency>([
    ['a1', { component: 'Alert', figmaLayer: 'Alert' }],
    ['b1', { component: 'Button', figmaLayer: 'Button' }],
  ]);
  const sample = extractVariantSample(
    { component, paths: new Map([['a1', ['alert']]]) },
    undefined,
    new Set(),
    composed,
    new Map([
      ['a1', maitre('Alert', DEFINITIONS_ALERT)],
      ['b1', maitre('Button', DEFINITIONS_BUTTON)],
    ]),
  );

  assert.equal(sample.composes?.length, 1);
  const alertEchantillon = sample.composes?.[0];
  assert.deepEqual(alertEchantillon?.slotPath, ['alert']);
  // La surcharge du bouton appartient au bouton, pas à l'alerte qui le contient.
  assert.equal(alertEchantillon?.overrides, undefined);
  assert.deepEqual(alertEchantillon?.composes, [{
    figmaLayer: 'Button',
    component: 'Button',
    args: { color: 'info' },
    overrides: [{ figmaPath: ['Suivant'], text: 'Cliquez ici' }],
  }]);
});

test('une dépendance que l’arbre ne situe pas est omise plutôt que mal placée', () => {
  const orpheline = instance('o1', 'Button', { Color: { type: 'VARIANT', value: 'Info' } });
  const component = node('COMPONENT', 'c1', 'Carte', [orpheline], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    // Aucun chemin : le layer n'est pas dans l'arbre publié. L'export avertit
    // déjà par ailleurs, et `composes` ne la déclare pas non plus.
    { component, paths: new Map() },
    undefined,
    new Set(),
    new Map([['o1', { component: 'Button', figmaLayer: 'Button' }]]),
    new Map([['o1', maitre('Button', DEFINITIONS_BUTTON)]]),
  );

  assert.equal(sample.composes, undefined);
});

test('une instance composée reste visible du parcours malgré la remontée d’ancêtres', () => {
  // `nearestAncestorIn` a remplacé l'implémentation de `hasAncestorIn` : si elle
  // cessait d'être strictement ancêtre, `getAllNodes` élaguerait l'instance
  // elle-même et le composé perdrait le slot qui la rend.
  const interne = node('TEXT', 'b1-label', 'Suivant', [], { characters: 'Cliquez' });
  const bouton = instance('b1', 'Button', {}, [interne]);
  const racine = node('COMPONENT', 'c1', 'Carte', [bouton]) as ComponentNode;
  const composed = new Map<string, ComposedDependency>([
    ['b1', { component: 'Button', figmaLayer: 'Button' }],
  ]);

  const noeuds = getAllNodes(racine, [], composed);
  assert.ok(noeuds.includes(bouton as any), 'l’instance doit rester parcourue');
  assert.ok(!noeuds.includes(interne as any), 'son contenu appartient à son contrat');
});

test('deux variants au même rendu et au texte différent partagent la vue, pas l’échantillon', () => {
  const vue = { structure: { layout: 'flex-row' }, typography: [], composes: [], icons: {}, paintPlacements: { fills: {}, strokes: {} } };
  const base = (nodeId: string, texte: string): ExtractedContractVariant => ({
    nodeId,
    figmaName: nodeId,
    values: {},
    tokens: {},
    strokes: {},
    sample: { text: [{ slotPath: ['label'], figmaLayer: 'Titre', value: texte }] },
    ...vue,
  } as any);

  const { variants, variantViews, samples } = compactVariants(
    [base('v1', 'Suivant'), base('v2', 'Précédent'), base('v3', 'Suivant')],
    [],
  );

  assert.equal(Object.keys(variantViews).length, 1);
  assert.deepEqual(Object.keys(samples), ['s1', 's2']);
  assert.deepEqual(variants.map((entree) => entree.sample), ['s1', 's2', 's1']);
});

test('un échantillon vide ne crée ni entrée ni renvoi', () => {
  const vue = { structure: { layout: 'flex-row' }, typography: [], composes: [], icons: {}, paintPlacements: { fills: {}, strokes: {} } };
  const { variants, samples } = compactVariants(
    [{ nodeId: 'v1', figmaName: 'v1', values: {}, tokens: {}, strokes: {}, ...vue } as any],
    [],
  );

  assert.deepEqual(samples, {});
  assert.equal(variants[0].sample, undefined);
});

test('plusieurs contenus dans une même matrice se constatent, sans rien réclamer', () => {
  assert.equal(sampleVarianceNotice([{ figmaName: 'A', sample: 's1' }]), null);
  assert.equal(
    sampleVarianceNotice([{ figmaName: 'A', sample: 's1' }, { figmaName: 'B', sample: 's1' }]),
    null,
  );

  const notice = sampleVarianceNotice([
    { figmaName: 'Color=Primary', sample: 's1' },
    { figmaName: 'Color=Secondary', sample: 's1' },
    { figmaName: 'Color=Error', sample: 's2' },
  ]);
  assert.match(notice ?? '', /Contenu de maquette différent sur 1 variante\(s\)/);
  assert.match(notice ?? '', /« Color=Error »/);
  assert.match(notice ?? '', /réexportez\.$/);
});
