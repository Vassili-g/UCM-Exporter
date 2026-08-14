/**
 * Non-régression des silences du moteur de layout.
 *
 * Chaque test ci-dessous fige un cas où le contrat affirmait, oubliait ou
 * réclamait quelque chose sans le dire. Ils partagent un même invariant : une
 * donnée que le schéma ne sait pas porter doit produire un avertissement
 * adressé au designer, jamais disparaître.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLayout, flexLayoutSignature } from '../src/contract/extractLayout';
import { flexItemProperties } from '../src/contract/flexLayout';
import { findLayoutNode } from '../src/contract/layoutNodes';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

const lie = (enfant: unknown, parent: unknown) => {
  (enfant as { parent?: unknown }).parent = parent;
};

/** Une instance de Button déclarée comme dépendance du contrat courant. */
const boutonDependant = (extra: Record<string, unknown> = {}) => ({
  type: 'INSTANCE',
  id: 'btn',
  name: 'Button',
  layoutSizingHorizontal: 'HUG',
  layoutSizingVertical: 'HUG',
  boundVariables: {},
  children: [],
  findAll: findAllOn([]),
  ...extra,
});

const dependanceDe = () =>
  new Map([['btn', { component: 'Button', figmaLayer: 'Button' }]]);

const alerteAvec = (slotAction: unknown) => ({
  type: 'COMPONENT',
  name: 'Alert',
  layoutMode: 'HORIZONTAL',
  primaryAxisAlignItems: 'MIN',
  counterAxisAlignItems: 'CENTER',
  boundVariables: {},
  children: [slotAction],
  findAll: findAllOn([slotAction]),
} as unknown as ComponentNode);

test('un slot qui EST une dépendance ne réexporte pas ses visibilités internes', async () => {
  // `arrow-left-long` appartient au contrat du Button : `iconLeft` est SA prop,
  // pas celle de l'Alert qui l'embarque.
  const interne = {
    type: 'VECTOR',
    id: 'btn-icon',
    name: 'arrow-left-long',
    boundVariables: {},
    componentPropertyReferences: { visible: 'iconLeft#1:2' },
  };
  const bouton = boutonDependant({
    children: [interne],
    findAll: findAllOn([interne]),
  });
  lie(interne, bouton);

  const layout = await extractLayout(alerteAvec(bouton), resolverFor({}), [], dependanceDe());

  assert.deepEqual(layout.children, [
    { slot: 'button', figmaLayer: 'Button', composes: 'Button' },
  ]);
});

test('un calque posé hors du node de layout élu est signalé, pas oublié', async () => {
  // Motif d'un layout complexe : le frame paddé gagne l'élection, et le badge
  // posé à côté quitte le contrat — alors que ses couleurs y entrent, elles,
  // par le relevé du variant entier.
  const texte = { type: 'TEXT', id: 'txt', name: 'Suivant', boundVariables: {} };
  const contenu = {
    type: 'FRAME',
    id: 'contenu',
    name: 'Contenu',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: {
      itemSpacing: alias('gap'),
      paddingLeft: alias('px'),
      paddingRight: alias('px'),
    },
    children: [texte],
    findAll: findAllOn([texte]),
  };
  const badge = { type: 'TEXT', id: 'badge', name: 'Badge', boundVariables: {} };
  const racine = {
    type: 'COMPONENT',
    name: 'Card',
    layoutMode: 'NONE',
    boundVariables: {},
    children: [contenu, badge],
    findAll: findAllOn([contenu, badge, texte]),
  } as unknown as ComponentNode;
  lie(texte, contenu);
  lie(contenu, racine);
  lie(badge, racine);

  const warnings: string[] = [];
  await extractLayout(
    findLayoutNode(racine),
    resolverFor({ gap: 'l.gap', px: 'l.px' }),
    warnings,
    new Map(),
    new Set(),
    racine,
  );

  assert.ok(warnings.some((warning) => (
    warning.includes('« Badge »') && warning.includes("à côté de l'auto layout frame")
  )));
});

test('une grille ne devient pas une rangée horizontale en silence', async () => {
  const grille = {
    type: 'COMPONENT',
    name: 'Galerie',
    layoutMode: 'GRID',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const warnings: string[] = [];
  const layout = await extractLayout(grille, resolverFor({ gap: 'l.gap' }), warnings);

  // La forme du contrat impose ce champ : le repli reste publié, mais dit.
  assert.equal(layout.layout, 'flex-row');
  assert.ok(warnings.some((warning) => (
    warning.includes("n'utilise pas d'auto layout horizontal ou vertical")
  )));
  // Figma espace une grille par le gap de ses lignes et de ses colonnes :
  // un `itemSpacing` qui y survit n'a plus aucun effet visuel.
  assert.equal(layout.gap, null);
  assert.ok(warnings.some((warning) => warning.includes('son auto layout est une grille')));
});

test('un auto layout qui passe à la ligne est signalé', async () => {
  const racine = {
    type: 'COMPONENT',
    name: 'Tags',
    layoutMode: 'HORIZONTAL',
    layoutWrap: 'WRAP',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    counterAxisSpacing: 8,
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const warnings: string[] = [];
  await extractLayout(racine, resolverFor({ gap: 'l.gap' }), warnings);

  assert.ok(warnings.some((warning) => warning.includes('utilise le wrap')));
});

test('un layer Absolute est signalé même sous un auto layout en grille', () => {
  const flottant = {
    type: 'FRAME',
    id: 'flottant',
    name: 'Badge',
    layoutPositioning: 'ABSOLUTE',
    boundVariables: {},
  } as unknown as SceneNode;
  const grille = { type: 'FRAME', name: 'Galerie', layoutMode: 'GRID' } as unknown as SceneNode;

  const warnings: string[] = [];
  flexItemProperties(grille, flottant, warnings);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /position « Absolute »/);
});

test('les bornes min et max d’un layer sont signalées, faute de champ pour les porter', async () => {
  const colonne = {
    type: 'FRAME',
    id: 'colonne',
    name: 'Colonne',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    minWidth: 320,
    maxWidth: 640,
    boundVariables: {},
    children: [],
    findAll: findAllOn([]),
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Page',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    boundVariables: { itemSpacing: alias('gap') },
    children: [colonne],
    findAll: findAllOn([colonne]),
  } as unknown as ComponentNode;
  lie(colonne, racine);

  const warnings: string[] = [];
  await extractLayout(racine, resolverFor({ gap: 'l.gap' }), warnings);

  assert.ok(warnings.some((warning) => (
    warning.includes('« Colonne »') && warning.includes('min width, max width')
  )));
});

test('un calque voisin d’une dépendance dans son cadre est signalé', async () => {
  const bouton = boutonDependant();
  const mention = {
    type: 'TEXT',
    id: 'mention',
    name: 'Mention légale',
    boundVariables: {},
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  };
  const cadre = {
    type: 'FRAME',
    id: 'act',
    name: 'Action',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    boundVariables: {},
    children: [bouton, mention],
    findAll: findAllOn([bouton, mention]),
  };
  lie(bouton, cadre);
  lie(mention, cadre);

  const warnings: string[] = [];
  const layout = await extractLayout(
    alerteAvec(cadre),
    resolverFor({}),
    warnings,
    dependanceDe(),
  );

  // Seule la branche qui mène à la dépendance est publiée : le voisin, lui,
  // doit être nommé.
  assert.deepEqual(layout.children[0].children, [
    { slot: 'button', figmaLayer: 'Button', composes: 'Button' },
  ]);
  assert.ok(warnings.some((warning) => (
    warning.includes('« Mention légale »') && warning.includes('partage le layer « Action »')
  )));
});

test('la signature de flux distingue deux dimensions figées différentes', () => {
  const carteAvecColonne = (variable: string) => {
    const colonne = {
      type: 'FRAME',
      id: 'colonne',
      name: 'Colonne',
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      boundVariables: { width: alias(variable) },
    };
    return {
      type: 'COMPONENT',
      name: 'Card',
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      boundVariables: {},
      children: [colonne],
      findAll: findAllOn([colonne]),
    } as unknown as SceneNode;
  };

  // `structure.children[].size` ne décrit que la référence : une largeur figée
  // qui change ailleurs n'a nulle part où vivre, et doit donc avertir.
  assert.notEqual(
    flexLayoutSignature(carteAvecColonne('large')),
    flexLayoutSignature(carteAvecColonne('etroit')),
  );
  assert.equal(
    flexLayoutSignature(carteAvecColonne('large')),
    flexLayoutSignature(carteAvecColonne('large')),
  );
});

test('la signature de flux distingue deux tailles de composant tokenisées', () => {
  const tuile = (variable: string) => ({
    type: 'COMPONENT',
    name: 'TileLink',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    boundVariables: { width: alias(variable), height: alias(variable) },
    children: [],
    findAll: findAllOn([]),
  } as unknown as SceneNode);

  // `structure.sizing` ne décrit que la référence. Deux variants dont seul le
  // token de taille diffère doivent donc avertir : le contrat n'a nulle part
  // où loger la seconde taille.
  assert.notEqual(flexLayoutSignature(tuile('grande')), flexLayoutSignature(tuile('petite')));
  assert.equal(flexLayoutSignature(tuile('grande')), flexLayoutSignature(tuile('grande')));
});

test('la signature de flux descend dans les cadres imbriqués d’une dépendance', () => {
  const actionAlignee = (alignement: string) => {
    const bouton = boutonDependant();
    const interne = {
      type: 'FRAME',
      id: 'inner',
      name: 'Inner',
      layoutMode: 'VERTICAL',
      primaryAxisAlignItems: alignement,
      counterAxisAlignItems: 'CENTER',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      boundVariables: {},
      children: [bouton],
      findAll: findAllOn([bouton]),
    };
    const cadre = {
      type: 'FRAME',
      id: 'act',
      name: 'Action',
      layoutMode: 'HORIZONTAL',
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      boundVariables: {},
      children: [interne],
      findAll: findAllOn([interne, bouton]),
    };
    lie(bouton, interne);
    lie(interne, cadre);
    return alerteAvec(cadre);
  };

  assert.notEqual(
    flexLayoutSignature(actionAlignee('CENTER'), new Set(), dependanceDe()),
    flexLayoutSignature(actionAlignee('MAX'), new Set(), dependanceDe()),
  );
});
