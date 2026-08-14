/**
 * Tests des dimensions PAR taille.
 *
 * L'enjeu est la détection de l'axe de tailles : elle repose sur les VALEURS
 * de l'axe, jamais sur son nom, et c'est exactement l'heuristique que l'étape 5
 * de la ROADMAP (Alert, Checkbox, TextField) va mettre à l'épreuve.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructure } from '../src/contract/extractStructure';
import { collectTokenReferences } from '../src/variables';
import { extractSizeDimensions, findSizeRepresentatives } from '../src/contract/extractSizes';
import { electSizeVariantLayoutNodes } from '../src/contract/layoutNodes';

/**
 * Même élection que la production : `layoutNodes.ts` élit pour les seuls
 * représentants de tailles, et `extractSizeDimensions` reçoit son résultat.
 */
const nodesDeTailles = (componentSet: ComponentSetNode) =>
  electSizeVariantLayoutNodes(
    findSizeRepresentatives(componentSet)?.values() ?? [],
    new Map(),
    [],
  );

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

/** Un variant de taille : son axe et ses dimensions géométriques liées. */
function variantDeTaille(axe: string, valeur: string, suffixe: string) {
  const texte = { type: 'TEXT', name: 'Suivant', boundVariables: {} };
  return {
    type: 'COMPONENT',
    name: `${axe}=${valeur}`,
    variantProperties: { [axe]: valeur },
    layoutMode: 'HORIZONTAL',
    boundVariables: {
      itemSpacing: alias(`gap-${suffixe}`),
      paddingLeft: alias(`px-${suffixe}`),
      paddingRight: alias(`px-${suffixe}`),
      paddingTop: alias(`py-${suffixe}`),
      paddingBottom: alias(`py-${suffixe}`),
      cornerRadius: alias(`r-${suffixe}`),
    },
    children: [texte],
    findAll: findAllOn([texte]),
  };
}

const AXE = 'Button-Construc-Type';

const TOKENS = {
  'gap-big': 'components.button.sizes.big.gap',
  'px-big': 'components.button.sizes.big.padding-x',
  'py-big': 'components.button.sizes.big.padding-y',
  'r-big': 'components.button.sizes.big.border-radius',
  'gap-small': 'components.button.sizes.small.gap',
  'px-small': 'components.button.sizes.small.padding-x',
  'py-small': 'components.button.sizes.small.padding-y',
  'r-small': 'components.button.sizes.small.border-radius',
};

test('extractSizeDimensions couvre chaque valeur de l’axe de tailles', async () => {
  const componentSet = {
    componentPropertyDefinitions: {
      [AXE]: { type: 'VARIANT', variantOptions: ['Big', 'Small'], defaultValue: 'Big' },
    },
    children: [variantDeTaille(AXE, 'Big', 'big'), variantDeTaille(AXE, 'Small', 'small')],
  } as unknown as ComponentSetNode;

  const sizes = await extractSizeDimensions(componentSet, resolverFor(TOKENS), [], nodesDeTailles(componentSet));

  assert.deepEqual(Object.keys(sizes ?? {}), ['big', 'small']);
  assert.deepEqual(sizes?.big, {
    gap: '{components.button.sizes.big.gap}',
    padding: { x: '{components.button.sizes.big.padding-x}', y: '{components.button.sizes.big.padding-y}' },
    radius: '{components.button.sizes.big.border-radius}',
  });
  // Quatre dimensions géométriques par taille ; la typographie vit dans les text styles.
  assert.equal(collectTokenReferences(sizes).size, 8);
});

test('les textes ne changent pas la carte des dimensions par taille', async () => {
  const avecDeuxTextes = (valeur: string, suffixe: string) => {
    const variant = variantDeTaille(AXE, valeur, suffixe);
    const titre = { type: 'TEXT', name: 'Titre', boundVariables: { fontSize: alias(`title-${suffixe}`) } };
    const description = { type: 'TEXT', name: 'Description', boundVariables: { fontSize: alias(`body-${suffixe}`) } };
    variant.children = [titre, description];
    variant.findAll = findAllOn([titre, description]);
    return variant;
  };
  const big = avecDeuxTextes('Big', 'big');
  const small = avecDeuxTextes('Small', 'small');
  const componentSet = {
    componentPropertyDefinitions: {
      [AXE]: { type: 'VARIANT', variantOptions: ['Big', 'Small'], defaultValue: 'Big' },
    },
    children: [big, small],
  } as unknown as ComponentSetNode;
  const warnings: string[] = [];

  const sizes = await extractSizeDimensions(
    componentSet,
    resolverFor(TOKENS),
    warnings,
    nodesDeTailles(componentSet),
  );

  assert.equal('fontSize' in (sizes?.big ?? {}), false);
  assert.deepEqual(warnings, []);
});

test('extractSizeDimensions rend null quand aucun axe n’est un axe de tailles', async () => {
  const componentSet = {
    componentPropertyDefinitions: {
      Color: { type: 'VARIANT', variantOptions: ['Primary', 'Secondary'], defaultValue: 'Primary' },
    },
    children: [
      { type: 'COMPONENT', name: 'Color=Primary', variantProperties: { Color: 'Primary' }, boundVariables: {}, children: [], findAll: findAllOn([]) },
    ],
  } as unknown as ComponentSetNode;

  // Composant à taille unique : le contrat garde seulement les dimensions
  // de référence, sans bloc `sizes` inventé.
  assert.equal(await extractSizeDimensions(componentSet, resolverFor({}), [], nodesDeTailles(componentSet)), null);
});

test('extractSizeDimensions ne relève qu’un représentant par taille', async () => {
  // Deux variants « Big » (un par état) : les dimensions ne dépendent pas des
  // autres axes, on ne doit pas relever deux fois la même taille.
  const premierBig = variantDeTaille(AXE, 'Big', 'big');
  // Le doublon pointe volontairement vers d'AUTRES tokens : si le second
  // écrasait le premier, l'assertion sur `gap` le verrait.
  const secondBig = { ...variantDeTaille(AXE, 'Big', 'small'), name: `${AXE}=Big, State=Hover` };
  const componentSet = {
    componentPropertyDefinitions: {
      [AXE]: { type: 'VARIANT', variantOptions: ['Big', 'Small'], defaultValue: 'Big' },
    },
    children: [premierBig, secondBig, variantDeTaille(AXE, 'Small', 'small')],
  } as unknown as ComponentSetNode;

  const sizes = await extractSizeDimensions(componentSet, resolverFor(TOKENS), [], nodesDeTailles(componentSet));

  assert.deepEqual(Object.keys(sizes ?? {}), ['big', 'small']);
  // C'est bien le PREMIER variant rencontré qui fait référence.
  assert.equal(sizes?.big.gap, '{components.button.sizes.big.gap}');
});

test('extractSizeDimensions détecte l’axe par ses valeurs, quel que soit son nom', async () => {
  // Le nom de l'axe est ici franchement accidentel : seule la nature des
  // valeurs (xs/sm/lg) doit le désigner comme axe de tailles.
  const axe = 'Truc-Machin';
  const componentSet = {
    componentPropertyDefinitions: {
      [axe]: { type: 'VARIANT', variantOptions: ['xs', 'sm', 'lg'], defaultValue: 'sm' },
    },
    children: ['xs', 'sm', 'lg'].map((valeur) => variantDeTaille(axe, valeur, valeur)),
  } as unknown as ComponentSetNode;

  const sizes = await extractSizeDimensions(componentSet, resolverFor({}), [], nodesDeTailles(componentSet));

  assert.deepEqual(Object.keys(sizes ?? {}), ['xs', 'sm', 'lg']);
});

test('l’axe de tailles est lu sur le set sélectionné quand le wrapper n’en porte pas', async () => {
  // Rien n'oblige l'axe de tailles à vivre sur le wrapper : il peut rester sur
  // le set sélectionné pendant que le wrapper porte ses propres axes. Élire le
  // propriétaire sur le type du node faisait alors disparaître `sizes` en
  // silence, alors que `props.size` continuait d'annoncer ses valeurs.
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;
  const node = (type: string, name: string, enfants: any[] = [], extra: any = {}): any => {
    const self: any = { type, id: name, name, visible: true, boundVariables: {}, children: enfants, ...extra };
    self.findAll = (predicat: (candidat: any) => boolean) => {
      const trouves: any[] = [];
      const parcourir = (noeuds: any[]) => {
        for (const enfant of noeuds) {
          if (predicat(enfant)) trouves.push(enfant);
          parcourir(enfant.children ?? []);
        }
      };
      parcourir(enfants);
      return trouves;
    };
    return self;
  };

  const variante = (nom: string, gapId: string) => {
    const interne = node('FRAME', 'row', [node('TEXT', 'Label')], {
      layoutMode: 'HORIZONTAL',
      boundVariables: { itemSpacing: alias(gapId) },
    });
    const instanceWrapper = node('INSTANCE', 'wrap', [interne]);
    const composant = node('COMPONENT', nom, [instanceWrapper], { layoutMode: 'HORIZONTAL' });
    composant.variantProperties = { Size: nom.split('=')[1] };
    return { composant, instanceWrapper };
  };

  const big = variante('Size=Big', 'gBig');
  const small = variante('Size=Small', 'gSmall');
  const setSelectionne = node('COMPONENT_SET', 'Button', [big.composant, small.composant], {
    componentPropertyDefinitions: { Size: { type: 'VARIANT', variantOptions: ['Big', 'Small'] } },
  });
  big.composant.parent = setSelectionne;
  small.composant.parent = setSelectionne;
  // Le set du wrapper existe, mais son seul axe n'est pas un axe de tailles.
  const setDuWrapper = node('COMPONENT_SET', 'SizeWrapper', [], {
    componentPropertyDefinitions: { Type: { type: 'VARIANT', variantOptions: ['Filled', 'Ghost'] } },
  });

  const { structure } = await extractStructure(
    {
      axes: ['size'],
      variants: [
        { values: { size: 'big' }, component: big.composant },
        { values: { size: 'small' }, component: small.composant },
      ],
    },
    [],
    { instance: big.instanceWrapper, componentSet: setDuWrapper },
    big.composant,
    resolverFor({
      gBig: 'components.button.sizes.big.gap',
      gSmall: 'components.button.sizes.small.gap',
    }),
  );

  assert.deepEqual(Object.keys(structure.sizes ?? {}), ['big', 'small']);
  assert.equal(structure.sizes?.big.gap, '{components.button.sizes.big.gap}');
  assert.equal(structure.sizes?.small.gap, '{components.button.sizes.small.gap}');
  // `sizes` porte les dimensions : le niveau haut ne les recopie pas.
  assert.equal(structure.gap, undefined);
});

test('le node de référence n’avertit pas sur des dimensions que `sizes` va porter', async () => {
  // Le cas réel : l'axe de tailles vit sur le set du wrapper, qui porte des gaps
  // liés, tandis que le calque élu du variant de référence n'en a aucun. Comme
  // `sizes` gagne, ce gap de haut niveau est jeté — l'annoncer au designer
  // l'enverrait relier une variable sans qu'aucune ligne du contrat ne change,
  // sur un nom de calque commun à tous les variants du set.
  const noeud = (type: string, nom: string, enfants: any[] = [], extra: any = {}): any => {
    const self: any = { type, id: nom, name: nom, visible: true, boundVariables: {}, children: enfants, ...extra };
    self.findAll = (predicat: (candidat: any) => boolean) => {
      const trouves: any[] = [];
      const parcourir = (noeuds: any[]) => {
        for (const enfant of noeuds) {
          if (predicat(enfant)) trouves.push(enfant);
          parcourir(enfant.children ?? []);
        }
      };
      parcourir(enfants);
      return trouves;
    };
    return self;
  };

  // Les variants du wrapper portent l'axe de tailles ET des gaps liés.
  const variantDuWrapper = (valeur: string, gapId: string) =>
    noeud('COMPONENT', `Size=${valeur}`, [noeud('TEXT', 'Label')], {
      layoutMode: 'HORIZONTAL',
      variantProperties: { Size: valeur },
      boundVariables: { itemSpacing: alias(gapId) },
    });
  const setDuWrapper = noeud(
    'COMPONENT_SET',
    'SizeWrapper',
    [variantDuWrapper('Big', 'gBig'), variantDuWrapper('Small', 'gSmall')],
    { componentPropertyDefinitions: { Size: { type: 'VARIANT', variantOptions: ['Big', 'Small'] } } },
  );

  // Le composant sélectionné n'a, lui, aucune dimension liée.
  const instanceWrapper = noeud('INSTANCE', 'sizeWrapperButton', [noeud('TEXT', 'Label')], {
    layoutMode: 'HORIZONTAL',
  });
  const composant = noeud('COMPONENT', 'Type=Filled', [instanceWrapper], {
    layoutMode: 'HORIZONTAL',
    variantProperties: { Type: 'Filled' },
  });
  const setSelectionne = noeud('COMPONENT_SET', 'Button', [composant], {
    componentPropertyDefinitions: { Type: { type: 'VARIANT', variantOptions: ['Filled'] } },
  });
  composant.parent = setSelectionne;

  const { structure, warnings } = await extractStructure(
    { axes: ['type'], variants: [{ values: { type: 'filled' }, component: composant }] },
    [],
    { instance: instanceWrapper, componentSet: setDuWrapper },
    composant,
    resolverFor({
      gBig: 'components.button.sizes.big.gap',
      gSmall: 'components.button.sizes.small.gap',
    }),
  );

  assert.deepEqual(Object.keys(structure.sizes ?? {}), ['big', 'small']);
  assert.equal(structure.gap, undefined);
  // Les dimensions réellement publiées, elles, avertissent toujours : ce sont
  // celles des représentants de tailles, et le message nomme leur variant.
  assert.ok(warnings.some((message) => /Layer « Size=Big » — corner radius/.test(message)));
  // Le calque de référence, dont rien ne sera publié, ne dit plus rien.
  assert.deepEqual(warnings.filter((message) => message.includes('sizeWrapperButton')), []);
});
