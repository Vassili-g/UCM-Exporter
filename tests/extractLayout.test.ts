/**
 * Tests du relevé de layout — dimensions et slots enfants.
 *
 * Ce module produit la plus grosse part de `structure`, et personne ne peut
 * lancer un export hors de Figma : sans ces tests, une régression ici n'est
 * visible qu'après un aller-retour humain par le fichier Figma.
 * Les nodes sont des littéraux castés, comme dans variantTokens.test.ts.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLayout, findLayoutNode, firstTextNode } from '../src/contract/extractLayout';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

/** Résolveur littéral : la seule chose dont l'extraction a besoin. */
const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

/** `findAll` fidèle : il applique réellement le prédicat, comme l'API Figma. */
const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

test('extractLayout relève les dimensions d’un composant plat (sans wrapper)', async () => {
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;
  const tokenNames = new Set<string>();
  const warnings: string[] = [];

  const layout = await extractLayout(
    bouton,
    resolverFor({ gap: 'components.button.sizes.medium.gap' }),
    tokenNames,
    warnings,
  );

  assert.equal(layout.layout, 'flex-row');
  assert.equal(layout.gap, '{components.button.sizes.medium.gap}');
  assert.deepEqual(Array.from(tokenNames), ['{components.button.sizes.medium.gap}']);
  // Invariant SPEC : une dimension non liée avertit, elle ne sort jamais en brut.
  assert.deepEqual(layout.padding, { x: null, y: null });
  assert.equal(layout.radius, null);
  assert.ok(warnings.some((w) => w.includes('padding-x sans variable liée')));
  assert.ok(warnings.some((w) => w.includes('border-radius sans variable liée')));
});

test('extractLayout traduit un auto-layout vertical en flex-column', async () => {
  const carte = {
    type: 'COMPONENT',
    name: 'Card',
    layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(carte, resolverFor({ gap: 'layouts.spacing.8' }), new Set(), []);

  assert.equal(layout.layout, 'flex-column');
});

test('extractLayout nomme le calque texte « label » et garde son nom Figma', async () => {
  const texte = {
    type: 'TEXT',
    name: 'Suivant',
    boundVariables: { fontSize: alias('fs'), fontWeight: alias('fw') },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [texte],
    findAll: findAllOn([texte]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(
    bouton,
    resolverFor({
      gap: 'components.button.sizes.medium.gap',
      fs: 'components.button.sizes.medium.font-size',
      fw: 'layouts.fontweight.600',
    }),
    new Set(),
    warnings,
  );

  assert.deepEqual(layout.children, [
    {
      slot: 'label',
      figmaLayer: 'Suivant',
      typography: {
        fontSize: '{components.button.sizes.medium.font-size}',
        fontWeight: '{layouts.fontweight.600}',
      },
    },
  ]);
  // Les champs typographiques non liés avertissent au lieu d'être devinés.
  assert.ok(warnings.some((w) => w.includes('lineHeight sans variable liée')));
});

test('extractLayout relie un label masquable à la prop qui le cache', async () => {
  // Cas réel : un bouton à icône seule. Le calque texte porte une prop BOOLEAN
  // Figma sur sa visibilité — sans cette liaison dans le contrat, la prop
  // publique existe sans que rien ne dise ce qu'elle montre ou cache.
  const texte = {
    type: 'TEXT',
    name: 'Suivant',
    boundVariables: {},
    componentPropertyReferences: { visible: 'Label#12:8' },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: {},
    children: [texte],
    findAll: findAllOn([texte]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(bouton, resolverFor({}), new Set(), []);

  assert.deepEqual(layout.children, [
    { slot: 'label', figmaLayer: 'Suivant', visibilityProp: 'label', optional: true },
  ]);
});

test('extractLayout décrit un calque graphique en slot optionnel avec sa visibilité', async () => {
  const icone = {
    type: 'VECTOR',
    name: 'arrow-right-long',
    boundVariables: { width: alias('taille') },
    componentPropertyReferences: { visible: 'iconRight#3:1' },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [icone],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(
    bouton,
    resolverFor({ gap: 'layouts.spacing.8', taille: 'components.icons.sizes.base' }),
    new Set(),
    [],
  );

  assert.deepEqual(layout.children, [
    {
      slot: 'arrow-right-long',
      figmaLayer: 'arrow-right-long',
      optional: true,
      visibilityProp: 'iconRight',
      size: '{components.icons.sizes.base}',
    },
  ]);
});

test('extractLayout suffixe les slots homonymes au lieu de les écraser', async () => {
  const premier = { type: 'TEXT', name: 'Suivant', boundVariables: { fontSize: alias('fs') } };
  const second = { type: 'TEXT', name: 'Précédent', boundVariables: { fontSize: alias('fs') } };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [premier, second],
    findAll: findAllOn([premier, second]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(
    bouton,
    resolverFor({ gap: 'layouts.spacing.8', fs: 'layouts.textscale.body' }),
    new Set(),
    [],
  );

  // Deux calques texte donneraient tous deux « label » : aucun ne disparaît.
  assert.deepEqual(layout.children.map((child) => child.slot), ['label', 'label-2']);
  assert.deepEqual(layout.children.map((child) => child.figmaLayer), ['Suivant', 'Précédent']);
});

test('findLayoutNode choisit le calque qui porte le plus de dimensions liées', () => {
  const interne = {
    type: 'FRAME',
    name: 'Wrapper interne',
    boundVariables: {
      itemSpacing: alias('a'),
      paddingLeft: alias('b'),
      cornerRadius: alias('c'),
    },
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Button',
    boundVariables: { itemSpacing: alias('a') },
    findAll: findAllOn([interne]),
  } as unknown as ComponentNode;

  assert.equal(findLayoutNode(racine), interne as unknown as SceneNode);
});

test('findLayoutNode retombe sur la racine quand aucune dimension n’est liée', () => {
  const racine = {
    type: 'COMPONENT',
    name: 'Button',
    boundVariables: {},
    findAll: findAllOn([{ type: 'VECTOR', name: 'icone', boundVariables: {} }]),
  } as unknown as ComponentNode;

  assert.equal(findLayoutNode(racine), racine as unknown as SceneNode);
});

test('firstTextNode descend dans le sous-arbre et rend null s’il n’y a pas de texte', () => {
  const texte = { type: 'TEXT', name: 'Suivant' };
  const avecTexte = { type: 'FRAME', name: 'Contenu', findAll: findAllOn([texte]) } as unknown as SceneNode;
  const sansTexte = { type: 'FRAME', name: 'Contenu', findAll: findAllOn([]) } as unknown as SceneNode;

  assert.equal(firstTextNode(avecTexte), texte as unknown as TextNode);
  assert.equal(firstTextNode(sansTexte), null);
});
