/**
 * L'arbre de structure général : imbrication quelconque, dispositions mêlées.
 *
 * S'arrêter au premier calque qui n'est ni un texte ni une dépendance
 * réduirait un Toggle, une Progress ou trois cadres bordés emboîtés à un slot
 * opaque — alors que leurs couleurs entrent dans `variantTokens`, si bien que
 * le contrat annoncerait des peintures qu'aucun calque publié ne porte.
 *
 * Ces tests figent la règle de descente, et surtout ses BORNES :
 * on descend là où il y a une information, et nulle part ailleurs. Un moteur qui
 * recopierait l'arbre Figma entier serait tout aussi faux — il publierait les
 * trente tracés d'une icône importée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLayout } from '../src/contract/extractLayout';
import {
  MAX_STRUCTURE_DEPTH,
  publishesChildren,
} from '../src/contract/structureTree';
import { textSlots } from '../src/contract/extractVariantTypography';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

/** Tous les descendants d'un node littéral, pour un `findAll` fidèle. */
const descendants = (node: Record<string, unknown>): unknown[] => {
  const enfants = (node.children ?? []) as Record<string, unknown>[];
  return enfants.flatMap((enfant) => [enfant, ...descendants(enfant)]);
};

/** Construit un node littéral et câble `parent` et `findAll` comme Figma le fait. */
const node = (
  type: string,
  name: string,
  children: unknown[] = [],
  extra: Record<string, unknown> = {},
): Record<string, unknown> => {
  const construit: Record<string, unknown> = {
    type,
    id: `${name}-${type}`,
    name,
    boundVariables: {},
    children,
    ...extra,
  };
  construit.findAll = findAllOn(descendants(construit));
  for (const enfant of children as Record<string, unknown>[]) enfant.parent = construit;
  return construit;
};

/** Un auto layout horizontal, gap et paddings reliés à des variables. */
const rangee = (name: string, children: unknown[], extra: Record<string, unknown> = {}) =>
  node('FRAME', name, children, {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    cornerRadius: 4,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    ...extra,
  });

test('trois auto layouts emboîtés sont décrits jusqu’au bout, chacun avec ses dimensions', async () => {
  const feuille = node('RECTANGLE', 'Pastille', [], {
    boundVariables: { fills: [alias('c3')] },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const niveau3 = rangee('Niveau3', [feuille], {
    boundVariables: { itemSpacing: alias('g3'), paddingLeft: alias('p3'), paddingRight: alias('p3') },
  });
  const niveau2 = rangee('Niveau2', [niveau3], {
    layoutMode: 'VERTICAL',
    boundVariables: { cornerRadius: alias('r2') },
  });
  const niveau1 = rangee('Niveau1', [niveau2], {
    boundVariables: { itemSpacing: alias('g1') },
  });
  const racine = node('COMPONENT', 'Carte', [niveau1], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    boundVariables: {},
  }) as unknown as ComponentNode;

  const layout = await extractLayout(
    racine,
    resolverFor({
      g1: 'sizes.gap-1', g3: 'sizes.gap-3', p3: 'sizes.padding-3',
      r2: 'sizes.radius-2', c3: 'colors.pastille',
    }),
    [],
  );

  // Chaque étage existe, dans l'ordre des calques, et porte sa disposition.
  const un = layout.children[0];
  assert.equal(un.slot, 'niveau1');
  assert.equal(un.layout, 'flex-row');
  const deux = un.children?.[0];
  assert.equal(deux?.slot, 'niveau2');
  assert.equal(deux?.layout, 'flex-column');
  // Le rayon d'un conteneur imbriqué vit sur lui.
  assert.equal(deux?.radius, '{sizes.radius-2}');
  const trois = deux?.children?.[0];
  assert.equal(trois?.slot, 'niveau3');
  assert.equal(trois?.padding?.x, '{sizes.padding-3}');
  // Et la feuille peinte, que l'ancienne forme faisait disparaître alors que sa
  // couleur entrait dans `variantTokens`.
  assert.deepEqual(trois?.children?.map((enfant) => enfant.slot), ['pastille']);
});

test('un cadre bordé dans un cadre bordé dans un cadre bordé publie les trois', async () => {
  const borde = (name: string, children: unknown[], token: string) =>
    node('FRAME', name, children, {
      layoutMode: 'VERTICAL',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      boundVariables: { strokes: [alias(token)] },
    });
  const interne = borde('Interne', [], 's3');
  const milieu = borde('Milieu', [interne], 's2');
  const externe = borde('Externe', [milieu], 's1');
  const racine = node('COMPONENT', 'Cadres', [externe], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as unknown as ComponentNode;

  const layout = await extractLayout(racine, resolverFor({}), []);

  const chemin: string[] = [];
  let courant = layout.children[0];
  while (courant) {
    chemin.push(courant.slot);
    courant = courant.children?.[0] as typeof courant;
  }
  assert.deepEqual(chemin, ['externe', 'milieu', 'interne']);
});

test('un dessin sans aucune liaison reste une feuille : l’arbre ne recopie pas Figma', () => {
  // Les entrailles d'une icône importée : trente tracés qu'aucun contrat ne
  // rendra calque par calque. Descendre dedans serait aussi faux que s'arrêter
  // trop tôt.
  const trace = (name: string) => node('VECTOR', name, []);
  const dessin = node('FRAME', 'Illustration', [trace('path-1'), trace('path-2')]);

  assert.equal(publishesChildren(dessin as unknown as SceneNode, new Set(), new Map()), false);
});

test('une seule liaison suffit à ouvrir un conteneur, et rien de moins', () => {
  const nu = node('FRAME', 'Nu', [node('RECTANGLE', 'Forme', [])]);
  assert.equal(publishesChildren(nu as unknown as SceneNode, new Set(), new Map()), false);

  const peint = node('FRAME', 'Peint', [
    node('RECTANGLE', 'Forme', [], { boundVariables: { fills: [alias('c')] } }),
  ]);
  assert.equal(publishesChildren(peint as unknown as SceneNode, new Set(), new Map()), true);
});

test('une grille imbriquée publie ses pistes, ses deux gaps et la place de ses enfants', async () => {
  const tuile = (name: string, extra: Record<string, unknown> = {}) =>
    node('FRAME', name, [], {
      boundVariables: { fills: [alias('c')] },
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      ...extra,
    });
  const grille = node('FRAME', 'Galerie', [
    tuile('Tuile', { gridColumnSpan: 2, gridChildHorizontalAlign: 'CENTER' }),
    tuile('Tuile2'),
  ], {
    layoutMode: 'GRID',
    gridColumnCount: 2,
    gridRowCount: 3,
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    boundVariables: { gridColumnGap: alias('cg'), gridRowGap: alias('rg') },
  });
  const racine = node('COMPONENT', 'Page', [grille], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as unknown as ComponentNode;

  const layout = await extractLayout(
    racine,
    resolverFor({ cg: 'sizes.column-gap', rg: 'sizes.row-gap', c: 'colors.tuile' }),
    [],
  );

  const slot = layout.children[0];
  assert.equal(slot.layout, 'grid');
  assert.equal(slot.columns, 2);
  assert.equal(slot.rows, 3);
  assert.equal(slot.columnGap, '{sizes.column-gap}');
  assert.equal(slot.rowGap, '{sizes.row-gap}');
  // L'étendue d'une tuile est une donnée structurelle, pas un token.
  assert.equal(slot.children?.[0].columnSpan, 2);
  assert.equal(slot.children?.[0].justifySelf, 'center');
  // Une étendue de 1 est la valeur neutre : elle reste absente.
  assert.equal(slot.children?.[1].columnSpan, undefined);
});

test('un calque en position absolue publie ses bords d’accroche au lieu de disparaître', async () => {
  const badge = node('FRAME', 'Badge', [], {
    layoutPositioning: 'ABSOLUTE',
    constraints: { horizontal: 'MAX', vertical: 'MIN' },
    boundVariables: { fills: [alias('c')] },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const racine = node('COMPONENT', 'Avatar', [badge], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as unknown as ComponentNode;

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ c: 'colors.badge' }), warnings);

  const slot = layout.children[0];
  assert.equal(slot.position, 'absolute');
  assert.deepEqual(slot.constraints, { horizontal: 'right', vertical: 'top' });
  // Ce qui manque reste dit : l'offset n'est liable à aucune variable Figma.
  assert.ok(warnings.some((warning) =>
    warning.includes('« Badge »') && warning.includes('Absolute')));
});

test('la profondeur est bornée, et la coupure est dite quand elle emporte quelque chose', async () => {
  // Un empilement absurde : le contrat s'arrête, mais ne se tait pas.
  let courant = node('FRAME', 'Fond', [], {
    boundVariables: { fills: [alias('c')] },
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  for (let niveau = MAX_STRUCTURE_DEPTH + 2; niveau > 0; niveau -= 1) {
    courant = node('FRAME', `N${niveau}`, [courant], {
      layoutMode: 'VERTICAL',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
    });
  }
  const racine = node('COMPONENT', 'Abyss', [courant], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as unknown as ComponentNode;

  const warnings: string[] = [];
  const layout = await extractLayout(racine, resolverFor({ c: 'colors.fond' }), warnings);

  let profondeur = 0;
  let slot = layout.children[0];
  while (slot?.children?.[0]) {
    profondeur += 1;
    slot = slot.children[0];
  }
  assert.ok(profondeur < MAX_STRUCTURE_DEPTH + 2);
  assert.ok(warnings.some((warning) => warning.includes('niveaux')));
});

test('les chemins de typographie suivent exactement l’arbre publié', async () => {
  const texte = node('TEXT', 'Titre', [], { characters: 'Titre' });
  const interne = node('FRAME', 'Interne', [texte], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
  });
  const externe = node('FRAME', 'Externe', [interne], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    boundVariables: { cornerRadius: alias('r') },
  });
  const racine = node('COMPONENT', 'Bloc', [externe], {
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
  }) as unknown as ComponentNode;

  const layout = await extractLayout(racine, resolverFor({ r: 'sizes.radius' }), []);
  const chemins = textSlots(racine).map(({ slotPath }) => slotPath);

  // Le chemin de la typographie doit exister dans l'arbre publié : c'est le
  // contrôle exact que le consommateur applique, et la raison pour laquelle
  // `structureTree` est l'unique autorité des deux côtés.
  const existe = (chemin: string[]) => {
    let enfants = layout.children;
    for (const slot of chemin) {
      const trouve = enfants?.find((enfant) => enfant.slot === slot);
      if (!trouve) return false;
      enfants = trouve.children ?? [];
    }
    return true;
  };
  assert.equal(chemins.length, 1);
  assert.ok(existe(chemins[0]), `chemin absent de l'arbre : ${chemins[0].join(' > ')}`);
});

test('une feuille publie les seuls coins tokenisés et laisse les coins à zéro absents', async () => {
  const premier = node('RECTANGLE', 'Step', [], {
    topLeftRadius: 8,
    topRightRadius: 0,
    bottomRightRadius: 0,
    bottomLeftRadius: 16,
    boundVariables: {
      fills: [alias('fill-left')],
      topLeftRadius: alias('top-left'),
      bottomLeftRadius: alias('bottom-left'),
    },
  });
  const dernier = node('RECTANGLE', 'Step', [], {
    topLeftRadius: 0,
    topRightRadius: 4,
    bottomRightRadius: 999,
    bottomLeftRadius: 0,
    boundVariables: {
      fills: [alias('fill-right')],
      topRightRadius: alias('top-right'),
      bottomRightRadius: alias('bottom-right'),
    },
  });
  const racine = node('COMPONENT', 'ScaleWrap', [premier, dernier], {
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    cornerRadius: 0,
  }) as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(racine, resolverFor({
    'fill-left': 'colors.left',
    'fill-right': 'colors.right',
    'top-left': 'radius.md',
    'bottom-left': 'radius.xl',
    'top-right': 'radius.xs',
    'bottom-right': 'radius.full',
  }), warnings);

  assert.deepEqual(layout.children[0]?.radius, {
    topLeft: '{radius.md}',
    bottomLeft: '{radius.xl}',
  });
  assert.deepEqual(layout.children[1]?.radius, {
    topRight: '{radius.xs}',
    bottomRight: '{radius.full}',
  });
  assert.deepEqual(warnings.filter((warning) => warning.includes('corner radius')), []);
});
