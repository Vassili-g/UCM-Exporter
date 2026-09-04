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
import { buildContractPropertySurface } from '../src/contract/propertySurface';
import type { ComposedDependency, ExtractedContractVariant } from '@ucm-kit/core/format';

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
    id: `${setName}-maitre`,
    name: `${setName}-variant`,
    parent: { type: 'COMPONENT_SET', id: `${setName}-set`, name: setName, componentPropertyDefinitions: definitions },
  } as unknown as ComponentNode;
}

/** Le composant maître d'une icône : un composant seul, sans component set. */
function maitreIcone(name: string) {
  return { id: `${name}-maitre`, name, parent: { type: 'PAGE' } } as unknown as ComponentNode;
}

/**
 * L'index des surfaces publiques, tel que `scanComposedMatrix` le construit.
 *
 * Les tests le DÉCLARENT au lieu de le laisser fabriquer : `extractVariantSample`
 * n'a plus de repli, et c'est voulu. La surface d'une dépendance vient de
 * l'élection faite pour SON export ; une reconstruction locale répondrait sans
 * wrapper, faute de pouvoir l'élire sans aller-retour, et donnerait donc une
 * seconde réponse à une question qui n'en admet qu'une.
 */
function surfaces(...owners: Array<[string, Record<string, any>]>) {
  return new Map(
    owners.map(([setName, definitions]) => [
      `${setName}-set`,
      buildContractPropertySurface(definitions as ComponentPropertyDefinitions),
    ] as const),
  );
}

/** Ce qu'un maître place à une position, tel que le relève `indexMasterInstances`. */
function defauts(entrees: Array<[string, string[], string]>) {
  return new Map(
    entrees.map(([position, masterPath, component]) => [position, { masterPath, component }]),
  );
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
    // Ce calque-là n'a jamais été renommé : `figmaLayer` répéterait `value`,
    // et son absence dit exactement la même chose.
    { slotPath: ['label', 'label-2'], value: 'Description de l’élément' },
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
    new Map(),
    surfaces(['Alert', DEFINITIONS_ALERT]),
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
    new Map(),
    surfaces(['Button', DEFINITIONS_BUTTON]),
  );

  // `state` permet de retrouver le variant de Button ; `disabled` est la prop
  // que son contrat expose réellement.
  assert.deepEqual(sample.composes?.[0].args, {
    color: 'primary', state: 'disable', disabled: true,
  });
});

test('les instances exposées comblent les props portées par un wrapper', () => {
  const wrapperDefinitions = {
    Size: { type: 'VARIANT', variantOptions: ['Small', 'Big'], defaultValue: 'Small' },
  };
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
      ['w1', maitre('SizeWrapper', wrapperDefinitions)],
    ]),
    new Map(),
    new Map([[
      'Button-set',
      {
        ...buildContractPropertySurface(
          DEFINITIONS_BUTTON as ComponentPropertyDefinitions,
          wrapperDefinitions as ComponentPropertyDefinitions,
        ),
        wrapperOwnerId: 'SizeWrapper-set',
      },
    ]]),
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
    new Map(),
    surfaces(['Alert', DEFINITIONS_ALERT], ['Button', DEFINITIONS_BUTTON]),
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
  assert.match(notice ?? '', /Contenu de maquette différent sur 1 variante,/);
  assert.match(notice ?? '', /« Color=Error »/);
  assert.match(notice ?? '', /« samples »\.$/);

  // « sans rien réclamer » au pied de la lettre : l'échantillon n'a pas le droit
  // de demander un geste, et un axe de variantes existe précisément pour montrer
  // des contenus différents — la phrase impérative tombait donc sur le cas
  // normal, à chaque export.
  assert.doesNotMatch(notice ?? '', /réexportez|alignez|Corrigez|dans Figma/);
});

test('une icône remplacée dans une dépendance est relevée, au chemin du maître', () => {
  // Le cas exact du corpus : sept TileLink montrant sept icônes différentes.
  // Figma renomme le calque d'après le composant qu'on y place — le chemin lu
  // dans l'instance dirait donc « star », et ne joindrait plus rien avec le
  // contrat de TileLink, qui ne connaît que « chess ».
  const icone = node('INSTANCE', 'i1', 'star', [], {
    componentProperties: {}, exposedInstances: [], overrides: [],
  });
  const tuile = instance('t1', 'TileLink', {}, [icone]);
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    new Map<string, ComponentNode>([
      ['t1', maitre('TileLink', {})],
      ['i1', maitreIcone('star')],
    ]),
    new Map([['TileLink-maitre', defauts([['0', ['chess'], 'chess']])]]),
    surfaces(['TileLink', DEFINITIONS_TILELINK_SWAP]),
  );

  assert.deepEqual(sample.composes?.[0].swaps, [{ masterPath: ['chess'], component: 'star' }]);
});

test('choisir une autre variante d’un même set n’est pas un remplacement', () => {
  // Le contrat de la dépendance décrit déjà ce choix : le publier ici en ferait
  // un second propriétaire, et le premier remplacement venu deviendrait illisible.
  const interne = node('INSTANCE', 'w1', 'sizeWrapperButton', [], {
    componentProperties: {}, exposedInstances: [], overrides: [],
  });
  const bouton = instance('b1', 'Button', {}, [interne]);
  const component = node('COMPONENT', 'c1', 'Carte', [bouton], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['b1', ['button']]]) },
    undefined,
    new Set(),
    new Map([['b1', { component: 'Button', figmaLayer: 'Button' }]]),
    new Map<string, ComponentNode>([
      ['b1', maitre('Button', DEFINITIONS_BUTTON)],
      // Une AUTRE variante du même set : le propriétaire ne bouge pas.
      ['w1', maitre('sizeWrapperButton', {})],
    ]),
    new Map([[
      'Button-maitre',
      defauts([['0', ['sizeWrapperButton'], 'sizeWrapperButton']]),
    ]]),
  );

  assert.equal(sample.composes?.[0].swaps, undefined);
});

test('le relevé des remplacements s’arrête sur une dépendance de la dépendance', () => {
  // L'icône du bouton d'une alerte appartient au bouton. La ranger sous
  // l'alerte publierait un chemin de maître que le contrat d'Alert ne contient
  // pas, et que celui de Button ne reconnaîtrait pas.
  const icone = node('INSTANCE', 'i1', 'check', [], {
    componentProperties: {}, exposedInstances: [], overrides: [],
  });
  const bouton = instance('b1', 'Button', {}, [icone]);
  const alerte = instance('a1', 'Alert', {}, [bouton]);
  const component = node('COMPONENT', 'c1', 'StressTest', [alerte], {
    layoutMode: 'VERTICAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['a1', ['alert']]]) },
    undefined,
    new Set(),
    new Map([
      ['a1', { component: 'Alert', figmaLayer: 'Alert' }],
      ['b1', { component: 'Button', figmaLayer: 'Button' }],
    ]),
    new Map<string, ComponentNode>([
      ['a1', maitre('Alert', DEFINITIONS_ALERT)],
      ['b1', maitre('Button', DEFINITIONS_BUTTON)],
      ['i1', maitreIcone('check')],
    ]),
    new Map([
      // Le maître d'Alert s'arrête lui aussi sur le Button : la position « 0 »
      // n'y figure pas.
      ['Alert-maitre', defauts([])],
      ['Button-maitre', defauts([['0', ['arrow-left-long'], 'arrow-left-long']])],
    ]),
  );

  const echantillonAlerte = sample.composes?.[0];
  assert.equal(echantillonAlerte?.swaps, undefined);
  assert.deepEqual(echantillonAlerte?.composes?.[0].swaps, [
    { masterPath: ['arrow-left-long'], component: 'check' },
  ]);
});

/** Les définitions d'une dépendance qui expose NATIVEMENT le remplacement de son icône. */
const DEFINITIONS_TILELINK_SWAP = {
  Variant: { type: 'VARIANT', variantOptions: ['Info', 'Success'], defaultValue: 'Info' },
  'ChessIcon#7:1': { type: 'INSTANCE_SWAP', defaultValue: '1:1' },
};

/** Une tuile dont l'icône tient son composant de la prop `ChessIcon#7:1`. */
function tuileALiaisonNative(nomDuCalque: string) {
  const icone = node('INSTANCE', 'i1', nomDuCalque, [], {
    componentProperties: {},
    exposedInstances: [],
    overrides: [],
    componentPropertyReferences: { mainComponent: 'ChessIcon#7:1' },
  });
  const tuile = instance(
    't1',
    'TileLink',
    { 'ChessIcon#7:1': { type: 'INSTANCE_SWAP', value: '9:9' } },
    [icone],
  );
  return { icone, tuile };
}

test('une INSTANCE_SWAP de dépendance publie le NOM du composant, jamais son identifiant', () => {
  // `componentProperties` rend « 9:9 », l'identifiant du node placé. Publié tel
  // quel, `args.chessIcon` valait un identifiant Figma sous une clé publique —
  // exactement ce que la règle 1 interdit, et illisible pour le consommateur.
  // `propertyBindings.appliedValue` résolvait déjà le nom pour le composant
  // exporté ; la dépendance n'en héritait pas.
  const { tuile } = tuileALiaisonNative('star');
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    new Map<string, ComponentNode>([
      ['t1', maitre('TileLink', DEFINITIONS_TILELINK_SWAP)],
      ['i1', maitreIcone('star')],
    ]),
    new Map([['TileLink-maitre', defauts([['0', ['chess'], 'chess']])]]),
    surfaces(['TileLink', DEFINITIONS_TILELINK_SWAP]),
  );

  assert.equal(sample.composes?.[0].args?.chessIcon, 'star');
});

test('un remplacement que sa prop publie n’est pas republié dans swaps', () => {
  // `mergeIconRules` pose `runtimeProp` sur la prop NATIVE plutôt que d'inventer
  // une prop de synthèse, « pour ne pas obliger le consommateur à choisir entre
  // deux sources de vérité ». Un `swaps` en plus rouvrirait ce choix.
  const { tuile } = tuileALiaisonNative('star');
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    new Map<string, ComponentNode>([
      ['t1', maitre('TileLink', DEFINITIONS_TILELINK_SWAP)],
      ['i1', maitreIcone('star')],
    ]),
    new Map([['TileLink-maitre', defauts([['0', ['chess'], 'chess']])]]),
    surfaces(['TileLink', DEFINITIONS_TILELINK_SWAP]),
  );

  assert.equal(sample.composes?.[0].swaps, undefined);
});

test('un remplacement natif qu’on ne sait pas nommer est omis, et swaps reste seul', () => {
  // Règle 2 : l'échantillon n'invente rien et ne dégrade rien. Sans maître
  // lisible pour l'icône, `args` se tait — mais le geste du designer ne doit pas
  // disparaître avec lui, et la comparaison au maître le rapporte encore.
  const { tuile } = tuileALiaisonNative('star');
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    // Le maître de « i1 » manque : c'est le seul cas où le nom est hors de portée.
    new Map<string, ComponentNode>([['t1', maitre('TileLink', DEFINITIONS_TILELINK_SWAP)]]),
    new Map([['TileLink-maitre', defauts([['0', ['chess'], 'chess']])]]),
    surfaces(['TileLink', DEFINITIONS_TILELINK_SWAP]),
  );

  assert.equal(sample.composes?.[0].args?.chessIcon, undefined);
  assert.equal(sample.composes?.[0].swaps, undefined);
});

test('la liaison d’une dépendance de la dépendance ne répond pas pour son parent', () => {
  // Deux composants peuvent nommer leur INSTANCE_SWAP pareil : les noms
  // techniques Figma ne sont uniques que par composant. Le relevé s'arrête donc
  // sur une dépendance contractée, comme tous les autres parcours du module.
  const iconeDuBouton = node('INSTANCE', 'i2', 'check', [], {
    componentProperties: {},
    exposedInstances: [],
    overrides: [],
    componentPropertyReferences: { mainComponent: 'ChessIcon#7:1' },
  });
  const bouton = instance('b1', 'Button', {}, [iconeDuBouton]);
  const tuile = instance(
    't1',
    'TileLink',
    { 'ChessIcon#7:1': { type: 'INSTANCE_SWAP', value: '9:9' } },
    [bouton],
  );
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([
      ['t1', { component: 'TileLink', figmaLayer: 'TileLink' }],
      ['b1', { component: 'Button', figmaLayer: 'Button' }],
    ]),
    new Map<string, ComponentNode>([
      ['t1', maitre('TileLink', DEFINITIONS_TILELINK_SWAP)],
      ['b1', maitre('Button', DEFINITIONS_BUTTON)],
      ['i2', maitreIcone('check')],
    ]),
    new Map([['TileLink-maitre', defauts([])]]),
  );

  // « check » appartient au Button : le reprendre ici publierait sous TileLink
  // une valeur que son contrat ne reconnaîtrait pas.
  assert.equal(sample.composes?.[0].args?.chessIcon, undefined);
});

test('un calque masqué d’une dépendance ne montre rien, donc ne remplace rien', () => {
  const icone = node('INSTANCE', 'i1', 'star', [], {
    componentProperties: {}, exposedInstances: [], overrides: [], visible: false,
  });
  const tuile = instance('t1', 'TileLink', {}, [icone]);
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    new Map<string, ComponentNode>([
      ['t1', maitre('TileLink', {})],
      ['i1', maitreIcone('star')],
    ]),
    new Map([['TileLink-maitre', defauts([['0', ['chess'], 'chess']])]]),
    surfaces(['TileLink', DEFINITIONS_TILELINK_SWAP]),
  );

  assert.equal(sample.composes?.[0].swaps, undefined);
});

test('sans relevé du maître, aucun remplacement n’est inventé', () => {
  const icone = node('INSTANCE', 'i1', 'star', [], {
    componentProperties: {}, exposedInstances: [], overrides: [],
  });
  const tuile = instance('t1', 'TileLink', {}, [icone]);
  const component = node('COMPONENT', 'c1', 'StressTest', [tuile], {
    layoutMode: 'HORIZONTAL',
  }) as ComponentNode;

  const sample = extractVariantSample(
    { component, paths: new Map([['t1', ['tilelink']]]) },
    undefined,
    new Set(),
    new Map([['t1', { component: 'TileLink', figmaLayer: 'TileLink' }]]),
    new Map<string, ComponentNode>([['t1', maitre('TileLink', {})]]),
  );

  assert.equal(sample.composes?.[0].swaps, undefined);
});
