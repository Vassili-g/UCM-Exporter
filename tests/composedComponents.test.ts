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
  indexContractedNamesInDocument,
  indexMasterInstances,
  scanComposedMatrix,
  scanComposedInstances,
} from '../src/contract/composedComponents';
import { findWrapperReference } from '../src/contract/componentTree';
import { getAllNodes } from '../src/contract/exportableNodes';
import { extractLayout } from '../src/contract/extractLayout';
import type { PlacedDependencies } from '../src/contract/extractLayout';
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

test('indexContractedNames ne confond pas composant exportable et dépendance UCM', () => {
  const standalone = { type: 'COMPONENT', name: 'Badge', parent: { type: 'PAGE' } };
  const set = { type: 'COMPONENT_SET', name: 'Button' };
  const variant = { type: 'COMPONENT', name: 'Size=Small', parent: set };
  const page = {
    findAll: (predicate: (node: never) => boolean) => [standalone, set, variant]
      .filter(predicate as (node: unknown) => boolean),
  } as unknown as PageNode;

  assert.deepEqual(Array.from(indexContractedNames(page)).sort(), []);
});

test('l’index de production laisse un wrapper interne parcourable', async () => {
  const wrapperSet = { type: 'COMPONENT_SET', name: 'Button-Construc' };
  const wrapperVariant = { type: 'COMPONENT', name: 'Size=Medium', parent: wrapperSet };
  const wrapper = instance('wrap', 'Button-Wrapper', 'Button-Construc');
  const bouton = racine('button', 'Color=Primary', [wrapper]);
  const page = {
    findAll: (predicate: (node: never) => boolean) => [
      wrapperSet,
      wrapperVariant,
      { type: 'FRAME', name: 'Button-Rules' },
    ].filter(predicate as (node: unknown) => boolean),
  } as unknown as PageNode;

  const contracted = indexContractedNames(page);
  const { composes, composed } = await scanComposedInstances(bouton, contracted);

  assert.deepEqual(Array.from(contracted), ['button']);
  assert.deepEqual(composes, []);
  assert.equal(composed.size, 0);
});

test('indexContractedNamesInDocument charge et indexe toutes les pages', async () => {
  const page = (name: string) => ({
    type: 'PAGE',
    name,
    findAll: (predicate: (node: never) => boolean) => [
      { type: 'FRAME', name: `${name}-Rules` },
    ].filter(predicate as (node: unknown) => boolean),
  });
  const pages = [page('Button'), page('Alert')];
  const precedent = (globalThis as { figma?: unknown }).figma;
  let loaded = 0;
  (globalThis as { figma?: unknown }).figma = {
    root: { children: pages },
    currentPage: pages[0],
    loadAllPagesAsync: async () => { loaded += 1; },
  };
  try {
    const names = await indexContractedNamesInDocument();
    assert.equal(loaded, 1);
    assert.deepEqual(Array.from(names).sort(), ['alert', 'button']);
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
  }
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
  // Une composition différente est une NOTE : les arbres exacts la conservent,
  // rien ne manque, et le message ne demande aucun geste.
  assert.deepEqual(result.warnings, []);
  assert.equal(result.infos.length, 1);
  assert.match(result.infos[0], /Composition différente sur 1 variant/);
  assert.match(result.infos[0], /décrit le variant de référence/);
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
  assert.equal(result.infos.length, 1);
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
  assert.equal(result.infos.length, 1);
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
  const placed: PlacedDependencies = new Map();
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
  // Le calque n'est pas un défaut de design : il n'y a rien à réclamer.
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
  const placed: PlacedDependencies = new Map();
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
  assert.deepEqual(Array.from(placed.values()), composes);
});

test('une dépendance posée hors du node de layout n’est pas placée, et se signale', async () => {
  const perdu = instance('btn-perdu', 'Bouton perdu', 'Button');
  const contenu = cadre('inner', 'Contenu', []);
  const carte = racine('card', 'Variant=Default', [contenu, perdu]);

  const warnings: string[] = [];
  const placed: PlacedDependencies = new Map();
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

test('une instance dont le maître est illisible avertit au lieu de disparaître', async () => {
  // Sans ce nom, l'instance n'entre pas dans `composed`. Le parcours cesse de
  // l'élaguer, et le contrat publie les internes du voisin comme les siens :
  // ses layers en slots, ses couleurs dans ses tokens, pendant que la
  // dépendance manque à `composes`. Le relevé ne l'ayant jamais trouvée, même
  // l'avertissement « dépendance non située » ne peut pas partir.
  const orpheline = instance('btn', 'action', 'Button', {
    getMainComponentAsync: async () => {
      throw new Error('instance orpheline');
    },
  });
  const alert = racine('alert', 'Severity=Info', [orpheline]);

  const { composes, composed, warnings } = await scanComposedInstances(
    alert,
    new Set(['button']),
  );

  assert.deepEqual(composes, []);
  assert.equal(composed.size, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« action »/);
  assert.match(warnings[0], /introuvable/);
  assert.match(warnings[0], /réexportez/);
});

test('le même layer orphelin ne se signale qu’une fois pour toute la matrice', async () => {
  // Une instance orpheline vit dans TOUS les variants du set, et chaque scan la
  // relève avec le même texte. Le message porte le nom du layer, jamais celui
  // du variant : un constat par layer, pas un par variant.
  const orphelin = (id: string) => instance(id, 'action', 'Button', {
    getMainComponentAsync: async () => {
      throw new Error('instance orpheline');
    },
  });
  const premier = racine('a', 'Severity=Info', [orphelin('btn-a')]);
  const second = racine('b', 'Severity=Error', [orphelin('btn-b')]);

  const result = await scanComposedMatrix(
    [premier, second],
    premier,
    new Set(['button']),
  );

  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /« action »/);
});

/** Une instance nue, avec ses enfants et son maître, pour le relevé des maîtres. */
function instanceMaitre(
  id: string,
  name: string,
  componentName: string,
  setName: string | null,
  children: unknown[] = [],
) {
  const main = {
    id: `${componentName}-maitre`,
    name: componentName,
    parent: setName ? { type: 'COMPONENT_SET', name: setName } : { type: 'PAGE' },
  };
  const node = {
    type: 'INSTANCE',
    id,
    name,
    children,
    visible: true,
    boundVariables: {},
    getMainComponentAsync: async () => main,
    componentProperties: {},
    findAll: () => [],
  };
  for (const child of children) (child as { parent?: unknown }).parent = node;
  return node as unknown as InstanceNode;
}

test('indexMasterInstances situe chaque instance du maître par sa position', async () => {
  // Le nom ne peut pas être la clé : Figma renomme le calque qu'on remplace
  // d'après son nouveau composant, c'est-à-dire dans le seul cas qui compte.
  const icone = instanceMaitre('m-icon', 'chess', 'chess', null);
  const cadre = {
    type: 'FRAME', id: 'm-frame', name: 'Content', children: [icone], visible: true,
  };
  (icone as unknown as { parent?: unknown }).parent = cadre;
  const master = {
    type: 'COMPONENT', id: 'TileLink-maitre', name: 'Variant=Info', children: [cadre],
  } as unknown as ComponentNode;

  const defauts = await indexMasterInstances(master, new Set());

  assert.deepEqual(Array.from(defauts.entries()), [
    ['0.0', { masterPath: ['Content', 'chess'], component: 'chess' }],
  ]);
});

test('le relevé d’un maître s’arrête sur les dépendances qu’il embarque', async () => {
  // Ce que le bouton d'une Alert contient appartient au contrat de Button :
  // le relever ici rangerait une trouvaille sous un propriétaire qui ne la
  // porte pas.
  const icone = instanceMaitre('m-icon', 'arrow-left-long', 'arrow-left-long', null);
  const bouton = instanceMaitre('m-btn', 'Button', 'Color=Info', 'Button', [icone]);
  const master = {
    type: 'COMPONENT', id: 'Alert-maitre', name: 'Severity=Info', children: [bouton],
  } as unknown as ComponentNode;
  (bouton as unknown as { parent?: unknown }).parent = master;

  const defauts = await indexMasterInstances(master, new Set(['button']));

  assert.deepEqual(Array.from(defauts.keys()), []);
});
