/**
 * Tests des dimensions PAR taille.
 *
 * L'enjeu est la détection de l'axe de tailles : elle repose sur les VALEURS
 * de l'axe, jamais sur son nom, et c'est exactement l'heuristique que l'étape 5
 * de la ROADMAP (Alert, Checkbox, TextField) va mettre à l'épreuve.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSizeDimensions } from '../src/contract/extractSizes';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

/** Un variant de taille : son axe, ses dimensions liées, son calque texte. */
function variantDeTaille(axe: string, valeur: string, suffixe: string) {
  const texte = { type: 'TEXT', name: 'Suivant', boundVariables: { fontSize: alias(`fs-${suffixe}`) } };
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
  'fs-big': 'components.button.sizes.big.font-size',
  'gap-small': 'components.button.sizes.small.gap',
  'px-small': 'components.button.sizes.small.padding-x',
  'py-small': 'components.button.sizes.small.padding-y',
  'r-small': 'components.button.sizes.small.border-radius',
  'fs-small': 'components.button.sizes.small.font-size',
};

test('extractSizeDimensions couvre chaque valeur de l’axe de tailles', async () => {
  const componentSet = {
    componentPropertyDefinitions: {
      [AXE]: { type: 'VARIANT', variantOptions: ['Big', 'Small'], defaultValue: 'Big' },
    },
    children: [variantDeTaille(AXE, 'Big', 'big'), variantDeTaille(AXE, 'Small', 'small')],
  } as unknown as ComponentSetNode;
  const tokenNames = new Set<string>();

  const sizes = await extractSizeDimensions(componentSet, resolverFor(TOKENS), tokenNames, []);

  assert.deepEqual(Object.keys(sizes ?? {}), ['big', 'small']);
  assert.deepEqual(sizes?.big, {
    gap: '{components.button.sizes.big.gap}',
    padding: { x: '{components.button.sizes.big.padding-x}', y: '{components.button.sizes.big.padding-y}' },
    radius: '{components.button.sizes.big.border-radius}',
    fontSize: '{components.button.sizes.big.font-size}',
  });
  // Chaque token relevé alimente `tokensUsed` : 5 par taille, 2 tailles.
  assert.equal(tokenNames.size, 10);
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
  assert.equal(await extractSizeDimensions(componentSet, resolverFor({}), new Set(), []), null);
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

  const sizes = await extractSizeDimensions(componentSet, resolverFor(TOKENS), new Set(), []);

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

  const sizes = await extractSizeDimensions(componentSet, resolverFor({}), new Set(), []);

  assert.deepEqual(Object.keys(sizes ?? {}), ['xs', 'sm', 'lg']);
});
