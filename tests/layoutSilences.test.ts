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
import {
  extractLayout,
  flexLayoutSignature,
  structureSignature,
} from '../src/contract/extractLayout';
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

test('la signature structurelle identifie une icône interchangeable par son slot', () => {
  const avecIcone = (name: string) => {
    const icon = {
      type: 'VECTOR', id: name, name, visible: true, boundVariables: {},
      findAll: findAllOn([]),
    };
    const root = alerteAvec(icon);
    lie(icon, root);
    return root;
  };
  const iconNames = new Set(['circle-info', 'circle-check']);

  assert.equal(
    structureSignature(avecIcone('circle-info'), iconNames),
    structureSignature(avecIcone('circle-check'), iconNames),
  );
  assert.notEqual(
    structureSignature(avecIcone('circle-info')),
    structureSignature(avecIcone('circle-check')),
  );
});

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

test('une grille est décrite comme une grille, pas repliée en rangée', async () => {
  const grille = {
    type: 'COMPONENT',
    name: 'Galerie',
    layoutMode: 'GRID',
    gridColumnCount: 3,
    gridRowCount: 2,
    // `itemSpacing` survit au passage en grille sans plus aucun effet : Figma
    // y espace les enfants par les deux gaps propres de la grille.
    boundVariables: {
      itemSpacing: alias('gap'),
      gridColumnGap: alias('col'),
      gridRowGap: alias('row'),
    },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const warnings: string[] = [];
  const layout = await extractLayout(
    grille,
    resolverFor({ gap: 'l.gap', col: 'l.column-gap', row: 'l.row-gap' }),
    warnings,
  );

  // Les deux gaps d'une grille se relient à une variable : elle est aussi
  // contractuelle qu'une rangée, et n'a plus à être repliée en `flex-row`.
  assert.equal(layout.layout, 'grid');
  assert.equal(layout.columns, 3);
  assert.equal(layout.rows, 2);
  assert.equal(layout.columnGap, '{l.column-gap}');
  assert.equal(layout.rowGap, '{l.row-gap}');
  // L'`itemSpacing` resté lié n'exporte rien : il n'a aucun effet sous GRID.
  assert.equal(layout.gap, null);
  // Plus rien à reprocher au designer SUR SA GRILLE : elle est entièrement
  // décrite. Le padding et le rayon du composant restent réclamés comme
  // partout ailleurs — c'est la règle commune, pas une lacune de la grille.
  assert.equal(warnings.some((warning) => warning.includes('grille')), false);
  assert.equal(warnings.some((warning) => warning.includes('auto layout')), false);
});

/** Un conteneur qui passe à la ligne, avec les réglages Figma qu'on lui donne. */
const conteneurEnWrap = (reglages: Record<string, unknown>) => ({
  type: 'COMPONENT',
  name: 'Tags',
  layoutMode: 'HORIZONTAL',
  layoutWrap: 'WRAP',
  primaryAxisAlignItems: 'MIN',
  counterAxisAlignItems: 'MIN',
  itemSpacing: 12,
  children: [],
  findAll: findAllOn([]),
  ...reglages,
} as unknown as ComponentNode);

test('un auto layout qui passe à la ligne publie son wrap et son gap entre lignes', async () => {
  const racine = conteneurEnWrap({
    counterAxisSpacing: 8,
    boundVariables: { itemSpacing: alias('gap'), counterAxisSpacing: alias('row') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap', row: 'l.row' }), warnings);

  assert.equal(layout.wrap, true);
  assert.equal(layout.gap, '{l.gap}');
  assert.equal(layout.rowGap, '{l.row}');
  assert.equal(warnings.some((warning) => warning.includes('gap')), false);
});

test('un gap entre lignes synchronisé sur le gap principal ne réclame rien', async () => {
  // Figma laisse ce champ synchronisé, et son API renvoie alors la valeur
  // d'`itemSpacing` sans liaison propre : réclamer une variable avertirait tous
  // les conteneurs correctement tokenisés.
  const racine = conteneurEnWrap({
    counterAxisSpacing: 12,
    boundVariables: { itemSpacing: alias('gap') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap' }), warnings);

  assert.equal(layout.wrap, true);
  assert.equal(layout.rowGap, null);
  assert.equal(warnings.some((warning) => warning.includes('gap')), false);
});

test('un gap entre lignes dissocié mais sans variable est signalé', async () => {
  const racine = conteneurEnWrap({
    counterAxisSpacing: 24,
    boundVariables: { itemSpacing: alias('gap') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap' }), warnings);

  assert.equal(layout.rowGap, null);
  assert.ok(warnings.some((warning) => warning.includes('vertical gap')));
});

test('un wrap dont Figma répartit les lignes lui-même est signalé', async () => {
  const racine = conteneurEnWrap({
    counterAxisAlignContent: 'SPACE_BETWEEN',
    counterAxisSpacing: 24,
    boundVariables: { itemSpacing: alias('gap'), counterAxisSpacing: alias('row') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap', row: 'l.row' }), warnings);

  // La liaison survit au réglage « Auto » : l'exporter ferait affirmer au
  // contrat un espacement que le rendu n'a pas.
  assert.equal(layout.rowGap, null);
  assert.ok(warnings.some((warning) => warning.includes('« Auto »')));
});

test('sans wrap, une liaison restée sur le gap entre lignes n’exporte rien', async () => {
  const racine = conteneurEnWrap({
    layoutWrap: 'NO_WRAP',
    counterAxisSpacing: 24,
    boundVariables: { itemSpacing: alias('gap'), counterAxisSpacing: alias('row') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap', row: 'l.row' }), warnings);

  assert.equal(layout.wrap, undefined);
  assert.equal(layout.rowGap, null);
  assert.equal(warnings.some((warning) => warning.includes('gap')), false);
});

test('sous le wrap, le gap principal est nommé comme le panneau Figma', async () => {
  const racine = conteneurEnWrap({ counterAxisSpacing: 12, boundVariables: {} });

  const warnings: string[] = [];
  await extractLayout(racine, resolverFor({}), warnings);

  assert.ok(warnings.some((warning) => warning.includes('horizontal gap')));
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

/**
 * Une page dont l'unique slot « Colonne » porte les bornes qu'on lui donne.
 *
 * Le slot remplit sa largeur : c'est le cas qui rend les bornes indispensables
 * — aucune valeur de `size` ne sait dire « prends la place, sans dépasser ».
 */
const pageAvecColonne = (bornes: Record<string, unknown>) => {
  const colonne = {
    type: 'FRAME',
    id: 'colonne',
    name: 'Colonne',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    children: [],
    findAll: findAllOn([]),
    boundVariables: {},
    ...bornes,
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Page',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    boundVariables: { itemSpacing: alias('gap') },
    children: [colonne],
    findAll: findAllOn([colonne]),
  } as unknown as ComponentNode;
  lie(colonne, racine);
  return racine;
};

test('les bornes d’un slot reliées à une variable sont publiées, pas signalées', async () => {
  const racine = pageAvecColonne({
    minWidth: 320,
    maxWidth: 640,
    boundVariables: { minWidth: alias('min'), maxWidth: alias('max') },
  });

  const warnings: string[] = [];
  const layout = await extractLayout(
    racine,
    resolverFor({ gap: 'l.gap', min: 'size.column.min', max: 'size.column.max' }),
    warnings,
  );

  assert.deepEqual(layout.children[0].bounds, {
    minWidth: '{size.column.min}',
    maxWidth: '{size.column.max}',
  });
  // Le contrat porte désormais ces bornes : rien ne reste à dire au designer
  // sur ce layer. Les autres messages visent le padding et le radius du
  // composant, hors sujet ici.
  assert.equal(warnings.filter((warning) => warning.includes('« Colonne »')).length, 0);
});

test('une borne écrite à la main réclame sa variable, sans demander qu’on la retire', async () => {
  const racine = pageAvecColonne({ minWidth: 320, maxWidth: 640 });

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ gap: 'l.gap' }), warnings);

  assert.equal(layout.children[0].bounds, undefined);
  const borne = warnings.find((warning) => warning.includes('« Colonne »'));
  assert.ok(borne?.includes('min width, max width'));
  assert.ok(borne?.includes('Reliez ces bornes à une variable'));
  // La borne appartient au design : le geste demandé est de la nommer, jamais
  // de modifier la maquette pour qu'elle tienne dans le contrat.
  assert.ok(!borne?.includes('Retirez'));
});

test('les bornes du composant lui-même sont publiées à côté de son sizing', async () => {
  const racine = {
    type: 'COMPONENT',
    name: 'Divider',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    maxWidth: 640,
    boundVariables: { maxWidth: alias('max') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ max: 'size.divider.max' }), warnings);

  assert.deepEqual(layout.sizing, { width: 'stretch', height: 'fit-content' });
  assert.deepEqual(layout.bounds, { maxWidth: '{size.divider.max}' });
});

test('une borne posée sur un wrapper de layout est signalée, faute de propriétaire', async () => {
  // Le wrapper prête son flux au composant sans jamais paraître dans le
  // contrat : sa borne retient le CONTENU, et la publier sur le composant
  // dirait autre chose que la maquette.
  const texte = { type: 'TEXT', id: 'txt', name: 'Label', boundVariables: {} };
  const wrapper = {
    type: 'FRAME',
    id: 'wrapper',
    name: 'Contenu',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    maxWidth: 640,
    boundVariables: { itemSpacing: alias('gap'), maxWidth: alias('max') },
    children: [texte],
    findAll: findAllOn([texte]),
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Carte',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    boundVariables: {},
    children: [wrapper],
    findAll: findAllOn([wrapper, texte]),
  } as unknown as ComponentNode;
  lie(texte, wrapper);
  lie(wrapper, racine);

  const warnings: string[] = [];
  const layout = await extractLayout(
    wrapper as unknown as SceneNode,
    resolverFor({ gap: 'l.gap', max: 'size.carte.max' }),
    warnings,
    new Map(),
    new Set(),
    racine,
  );

  assert.equal(layout.bounds, undefined);
  const borne = warnings.find((warning) => warning.includes('s’intercale')
    || warning.includes("s'intercale"));
  assert.ok(borne?.includes('« Contenu »'));
  assert.ok(borne?.includes('max width'));
});

test('une borne qui change d’un variant à l’autre change la signature du flux', () => {
  const signature = (maxWidth: unknown, variable: string | null) =>
    flexLayoutSignature(pageAvecColonne({
      maxWidth,
      boundVariables: variable ? { maxWidth: alias(variable) } : {},
    }) as unknown as SceneNode);

  // Trois écarts que le contrat publierait sinon depuis le seul variant de
  // référence : la borne retirée, la borne non tokenisée, la borne renommée.
  assert.notEqual(signature(640, 'max'), signature(undefined, null));
  assert.notEqual(signature(640, 'max'), signature(640, null));
  assert.notEqual(signature(640, 'max'), signature(640, 'autre'));
});

test('un calque voisin d’une dépendance dans son cadre est décrit comme un slot', async () => {
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

  // Le cadre appartient à CE contrat : ce qu'il range à côté de sa dépendance
  // aussi. Le voisin reçoit donc son slot au lieu de disparaître sous un
  // avertissement, et sa typographie a désormais un chemin où vivre.
  assert.deepEqual(layout.children[0].children, [
    { slot: 'button', figmaLayer: 'Button', composes: 'Button' },
    { slot: 'label', figmaLayer: 'Mention légale' },
  ]);
  assert.equal(
    warnings.some((warning) => warning.includes('partage le layer')),
    false,
  );
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

  // `flexLayoutSignature` compare le flux DIRECT du composant ; c'est
  // `structureSignature` qui descend dans l'arbre publié, à toute profondeur.
  // Les deux tournent sur chaque variant, et l'une des deux doit voir l'écart.
  assert.notEqual(
    structureSignature(actionAlignee('CENTER'), new Set(), dependanceDe()),
    structureSignature(actionAlignee('MAX'), new Set(), dependanceDe()),
  );
});

/** Une tuile de grille : un rectangle peint, donc un calque que le contrat publie. */
const tuileDeGrille = (extra: Record<string, unknown> = {}) => ({
  type: 'RECTANGLE',
  id: 'tile',
  name: 'Tile',
  visible: true,
  layoutSizingHorizontal: 'FILL',
  // Sous une grille, Figma ne renvoie pas `FILL` sur cet axe : c'est ce que le
  // moteur lisait comme une hauteur figée, alors que la cellule la décide.
  layoutSizingVertical: 'FIXED',
  gridColumnAnchorIndex: 1,
  gridRowAnchorIndex: 2,
  boundVariables: { fills: [alias('couleur')] },
  findAll: findAllOn([]),
  ...extra,
});

/** La grille qui la range, avec les pistes que Figma expose. */
const grilleDeTuiles = (tuile: unknown, pistes: Record<string, unknown> = {}) => {
  const grille = {
    type: 'COMPONENT',
    name: 'TilesGrid',
    layoutMode: 'GRID',
    gridColumnCount: 2,
    gridRowCount: 3,
    boundVariables: { gridColumnGap: alias('col'), gridRowGap: alias('row') },
    children: [tuile],
    findAll: findAllOn([tuile]),
    ...pistes,
  } as unknown as ComponentNode;
  lie(tuile, grille);
  return grille;
};

test('un enfant de grille ne se voit pas réclamer ce que sa cellule décide', async () => {
  // Remplir sa cellule est le DÉFAUT d'un enfant de grille, en CSS comme dans
  // Figma. L'API, elle, ne sait pas l'exposer dans une piste qui hug : elle rend
  // la taille calculée là où le panneau affiche « Fill ». Le geste demandé au
  // designer n'aurait donc rien à corriger.
  const tuile = tuileDeGrille();
  const warnings: string[] = [];

  const layout = await extractLayout(
    grilleDeTuiles(tuile),
    resolverFor({ col: 'l.col', row: 'l.row', couleur: 'c.tile' }),
    warnings,
  );

  assert.equal(layout.children[0]?.size, undefined);
  assert.equal(warnings.some((warning) => warning.includes('« Tile » — height')), false);
  // Sa place, elle, est publiée : Figma indexe à partir de 0, CSS à partir de 1.
  assert.equal(layout.children[0]?.columnStart, 2);
  assert.equal(layout.children[0]?.rowStart, 3);
});

test('un enfant de grille explicitement aligné garde la règle commune', async () => {
  // Le même mot qu'en CSS : un enfant en `center` ne s'étire plus, sa dimension
  // redevient la sienne, et un nombre écrit à la main se signale.
  const tuile = tuileDeGrille({ gridChildVerticalAlign: 'CENTER' });
  const warnings: string[] = [];

  await extractLayout(
    grilleDeTuiles(tuile),
    resolverFor({ col: 'l.col', row: 'l.row', couleur: 'c.tile' }),
    warnings,
  );

  assert.ok(warnings.some((warning) => warning.includes('« Tile » — height')));
});

test('un enfant de grille publie la dimension qu’il relie à une variable', async () => {
  // La cellule n'efface pas une décision : une hauteur qui cite une variable est
  // le design system qui parle, et elle survit à la grille.
  const tuile = tuileDeGrille({ boundVariables: { fills: [alias('couleur')], height: alias('h') } });
  const warnings: string[] = [];

  const layout = await extractLayout(
    grilleDeTuiles(tuile),
    resolverFor({ col: 'l.col', row: 'l.row', couleur: 'c.tile', h: 'sizes.tile-height' }),
    warnings,
  );

  assert.deepEqual(layout.children[0]?.size, { height: '{sizes.tile-height}' });
  assert.deepEqual(warnings.filter((warning) => warning.includes('« Tile »')), []);
});

test('les pistes d’une grille sont publiées, et une piste figée se signale', async () => {
  const tuile = tuileDeGrille();
  const warnings: string[] = [];

  const layout = await extractLayout(
    grilleDeTuiles(tuile, {
      gridColumnSizes: [{ type: 'FLEX', value: 1 }, { type: 'FLEX', value: 2 }],
      gridRowSizes: [{ type: 'HUG' }, { type: 'FIXED', value: 120 }, { type: 'FLEX' }],
    }),
    resolverFor({ col: 'l.col', row: 'l.row', couleur: 'c.tile' }),
    warnings,
  );

  assert.deepEqual(layout.columnSizes, ['1fr', '2fr']);
  // La piste figée vaut `null` : un nombre brut n'est jamais contractuel, et sa
  // place dans le tableau est conservée.
  assert.deepEqual(layout.rowSizes, ['fit-content', null, '1fr']);
  assert.ok(warnings.some((warning) => (
    warning.includes('« TilesGrid »') && warning.includes('ligne 2')
  )));
});

test('une grille dont Figma n’expose pas les pistes ne publie ni n’avertit', async () => {
  const tuile = tuileDeGrille();
  const warnings: string[] = [];

  const layout = await extractLayout(
    grilleDeTuiles(tuile),
    resolverFor({ col: 'l.col', row: 'l.row', couleur: 'c.tile' }),
    warnings,
  );

  // Une propriété absente n'est pas une valeur : un runtime qui ne la fournit
  // pas ne doit rien faire dire au contrat.
  assert.equal('columnSizes' in layout, false);
  assert.equal('rowSizes' in layout, false);
  assert.equal(warnings.some((warning) => warning.includes('nombre en pixels')), false);
});
