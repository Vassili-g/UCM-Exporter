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
import { extractLayout, findLayoutNode } from '../src/contract/extractLayout';
import { collectTokenReferences } from '../src/variables';
import { nestedSlotVisibility } from '../src/contract/slotRelations';

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
  const warnings: string[] = [];

  const layout = await extractLayout(
    bouton,
    resolverFor({ gap: 'components.button.sizes.medium.gap' }),
    warnings,
  );

  assert.equal(layout.layout, 'flex-row');
  assert.equal(layout.gap, '{components.button.sizes.medium.gap}');
  assert.deepEqual(Array.from(collectTokenReferences(layout)), ['{components.button.sizes.medium.gap}']);
  // Invariant SPEC : une dimension non liée avertit, elle ne sort jamais en brut.
  assert.deepEqual(layout.padding, { x: null, y: null });
  assert.equal(layout.radius, null);
  assert.ok(warnings.some((w) => w.includes('horizontal padding : aucune variable')));
  assert.ok(warnings.some((w) => w.includes('corner radius : aucune variable')));
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

  const layout = await extractLayout(carte, resolverFor({ gap: 'layouts.spacing.8' }), []);

  assert.equal(layout.layout, 'flex-column');
});

test('extractLayout publie l’alignement Flex et le remplissage des slots directs', async () => {
  const icon = {
    type: 'VECTOR',
    id: 'icon',
    name: 'Info',
    layoutAlign: 'INHERIT',
    layoutGrow: 0,
    boundVariables: {},
  };
  const label = {
    type: 'TEXT',
    id: 'label',
    name: 'Message',
    layoutAlign: 'INHERIT',
    layoutGrow: 1,
    boundVariables: {},
  };
  const action = {
    type: 'VECTOR',
    id: 'action',
    name: 'Action',
    layoutAlign: 'STRETCH',
    layoutGrow: 0,
    boundVariables: {},
  };
  const alert = {
    type: 'COMPONENT',
    name: 'Alert',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: {},
    children: [icon, label, action],
    findAll: findAllOn([icon, label, action]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(alert, resolverFor({}), []);

  assert.equal(layout.layout, 'flex-row');
  assert.equal(layout.justifyContent, 'flex-start');
  assert.equal(layout.alignItems, 'center');
  assert.equal(layout.children[0].alignSelf, undefined);
  assert.equal(layout.children[1].flexGrow, 1);
  assert.equal(layout.children[2].alignSelf, 'stretch');
});

test('un dimensionnement HUG sur l’axe secondaire prime sur un layoutAlign STRETCH contradictoire', async () => {
  const action = {
    type: 'INSTANCE',
    id: 'action',
    name: 'Action',
    layoutAlign: 'STRETCH',
    layoutGrow: 0,
    // Parent horizontal : la hauteur est son axe secondaire.
    layoutSizingVertical: 'HUG',
    boundVariables: {},
  };
  const alert = {
    type: 'COMPONENT',
    name: 'Alert',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: {},
    children: [action],
    findAll: findAllOn([action]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(alert, resolverFor({}), []);

  assert.equal(layout.children[0].alignSelf, undefined);
});

test('extractLayout décrit Auto par justifyContent sans inventer de gap fixe', async () => {
  const row = {
    type: 'COMPONENT',
    name: 'Toolbar',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: { itemSpacing: alias('gap') },
    children: [],
    findAll: findAllOn([]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(
    row,
    resolverFor({ gap: 'layouts.spacing.8' }),
    warnings,
  );

  assert.equal(layout.justifyContent, 'space-between');
  assert.equal(layout.alignItems, 'center');
  assert.equal(layout.gap, null);
  assert.ok(!warnings.some((warning) => warning.includes('espacement est réglé sur « Auto »')));
});

test('un layer absolu n’est pas inventé comme item Flex', async () => {
  const badge = {
    type: 'VECTOR',
    id: 'badge',
    name: 'Badge',
    layoutPositioning: 'ABSOLUTE',
    layoutAlign: 'STRETCH',
    layoutGrow: 1,
    boundVariables: {},
  };
  const card = {
    type: 'COMPONENT',
    name: 'Card',
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: {},
    children: [badge],
    findAll: findAllOn([badge]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(card, resolverFor({}), warnings);

  assert.equal(layout.children[0].alignSelf, undefined);
  assert.equal(layout.children[0].flexGrow, undefined);
  assert.ok(warnings.some((warning) => warning.includes('position « Absolute »')));
});

test('extractLayout nomme le calque texte « label » sans recopier sa typographie', async () => {
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
    warnings,
  );

  assert.deepEqual(layout.children, [
    {
      slot: 'label',
      figmaLayer: 'Suivant',
    },
  ]);
  assert.equal(warnings.some((warning) => warning.includes('font')), false);
});

test('un slot à deux textes conserve chaque part pour que variantTypography puisse la cibler', async () => {
  // Régression : l'Alert exportée en 4.2 ne portait qu'une typographie pour un
  // slot « Text » contenant « Titre » et « Description ». Celle du titre était
  // appliquée aux deux, et `description-size` n'entrait jamais dans le contrat.
  const titre = {
    type: 'TEXT',
    id: 'title',
    name: 'Titre',
    boundVariables: { fontSize: alias('titre'), fontWeight: alias('gras') },
  };
  const description = {
    type: 'TEXT',
    id: 'description',
    name: 'Description',
    boundVariables: { fontSize: alias('desc'), fontWeight: alias('normal') },
  };
  const bloc = {
    type: 'FRAME',
    id: 'text',
    name: 'Text',
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    boundVariables: { itemSpacing: alias('interligne') },
    children: [titre, description],
    findAll: findAllOn([titre, description]),
  };
  (titre as { parent?: unknown }).parent = bloc;
  (description as { parent?: unknown }).parent = bloc;
  const alerte = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Alert',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [bloc],
    findAll: findAllOn([bloc, titre, description]),
  } as unknown as ComponentNode;
  (bloc as { parent?: unknown }).parent = alerte;
  const warnings: string[] = [];

  const layout = await extractLayout(
    alerte,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      interligne: 'components.alert.sizes.text-gap',
      titre: 'components.alert.sizes.title-size',
      desc: 'components.alert.sizes.description-size',
      gras: 'layouts.fontweight.600',
      normal: 'layouts.fontweight.400',
    }),
    warnings,
  );

  const slot = layout.children[0];
  assert.equal(slot.slot, 'label');
  assert.equal(slot.figmaLayer, 'Text');
  assert.equal(slot.layout, 'flex-column');
  assert.equal(slot.justifyContent, 'flex-start');
  assert.equal(slot.alignItems, 'center');
  assert.equal(slot.gap, '{components.alert.sizes.text-gap}');
  assert.deepEqual(slot.children, [
    {
      slot: 'label',
      figmaLayer: 'Titre',
    },
    {
      slot: 'label-2',
      figmaLayer: 'Description',
    },
  ]);
  assert.equal(collectTokenReferences(layout).has('{components.alert.sizes.description-size}'), false);
});

test('la récursion textuelle ignore un dessin voisin au lieu d’en faire une part', async () => {
  const titre = { type: 'TEXT', id: 'title', name: 'Titre', boundVariables: { fontSize: alias('title') } };
  const icone = {
    type: 'VECTOR',
    id: 'icon',
    name: 'circle-info',
    boundVariables: { width: alias('icon-size'), height: alias('icon-size') },
    componentPropertyReferences: { visible: 'showIcon#1:2' },
  };
  const description = { type: 'TEXT', id: 'body', name: 'Description', boundVariables: { fontSize: alias('body') } };
  const bloc = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('text-gap') },
    children: [titre, icone, description],
    findAll: findAllOn([titre, icone, description]),
  };
  for (const child of [titre, icone, description]) {
    (child as { parent?: unknown }).parent = bloc;
  }
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Alert',
    layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [bloc],
    findAll: findAllOn([bloc, titre, icone, description]),
  } as unknown as ComponentNode;
  (bloc as { parent?: unknown }).parent = racine;
  const warnings: string[] = [];

  const layout = await extractLayout(
    racine,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      'text-gap': 'components.alert.sizes.text-gap',
      title: 'components.alert.sizes.title-size',
      body: 'components.alert.sizes.description-size',
      'icon-size': 'components.icons.sizes.base',
    }),
    warnings,
    new Map(),
    new Set(['circle-info']),
  );

  assert.deepEqual(layout.children[0].children?.map((part) => part.figmaLayer), [
    'Titre',
    'Description',
  ]);
  assert.equal(
    warnings.some((warning) => warning.includes('circle-info') && warning.includes('width')),
    false,
  );
  assert.deepEqual(layout.children[0].visibilityTargets, [{
    visibilityProp: 'showIcon',
    figmaPath: ['circle-info'],
  }]);
});

test('une visibilité graphique imbriquée appartient à la branche textuelle la plus proche', async () => {
  const titre = { type: 'TEXT', id: 'title', name: 'Titre', boundVariables: {} };
  const icone = {
    type: 'VECTOR',
    id: 'icon',
    name: 'circle-info',
    boundVariables: {},
    componentPropertyReferences: { visible: 'showIcon#1:2' },
  };
  const groupeTitre = {
    type: 'FRAME',
    id: 'title-group',
    name: 'Groupe titre',
    layoutMode: 'HORIZONTAL',
    boundVariables: {},
    children: [titre, icone],
    findAll: findAllOn([titre, icone]),
  };
  const description = { type: 'TEXT', id: 'body', name: 'Description', boundVariables: {} };
  const bloc = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    layoutMode: 'VERTICAL',
    boundVariables: {},
    children: [groupeTitre, description],
    findAll: findAllOn([groupeTitre, titre, icone, description]),
  };
  (titre as { parent?: unknown }).parent = groupeTitre;
  (icone as { parent?: unknown }).parent = groupeTitre;
  (groupeTitre as { parent?: unknown }).parent = bloc;
  (description as { parent?: unknown }).parent = bloc;
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Alert',
    layoutMode: 'VERTICAL',
    boundVariables: {},
    children: [bloc],
    findAll: findAllOn([bloc, groupeTitre, titre, icone, description]),
  } as unknown as ComponentNode;
  (bloc as { parent?: unknown }).parent = racine;

  const layout = await extractLayout(racine, resolverFor({}), []);
  const slot = layout.children[0];
  const brancheTitre = slot.children?.[0];

  assert.equal(slot.visibilityTargets, undefined);
  assert.deepEqual(brancheTitre?.visibilityTargets, [{
    visibilityProp: 'showIcon',
    figmaPath: ['circle-info'],
  }]);
  assert.deepEqual(brancheTitre?.children?.map((part) => part.figmaLayer), ['Titre']);
});

test('la typographie descend jusqu’au vrai calque texte, pas sur son frame', async () => {
  const titre = { type: 'TEXT', id: 'title', name: 'Titre', boundVariables: { fontSize: alias('title') } };
  const enveloppe = {
    type: 'FRAME',
    id: 'title-wrapper',
    name: 'Enveloppe titre',
    layoutMode: 'NONE',
    boundVariables: {},
    children: [titre],
    findAll: findAllOn([titre]),
  };
  const description = { type: 'TEXT', id: 'body', name: 'Description', boundVariables: { fontSize: alias('body') } };
  const bloc = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('text-gap') },
    children: [enveloppe, description],
    findAll: findAllOn([enveloppe, titre, description]),
  };
  (titre as { parent?: unknown }).parent = enveloppe;
  (enveloppe as { parent?: unknown }).parent = bloc;
  (description as { parent?: unknown }).parent = bloc;
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Alert',
    layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [bloc],
    findAll: findAllOn([bloc, enveloppe, titre, description]),
  } as unknown as ComponentNode;
  (bloc as { parent?: unknown }).parent = racine;

  const layout = await extractLayout(
    racine,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      'text-gap': 'components.alert.sizes.text-gap',
      title: 'components.alert.sizes.title-size',
      body: 'components.alert.sizes.description-size',
    }),
    [],
  );

  const enveloppeContractuelle = layout.children[0].children?.[0];
  assert.equal(enveloppeContractuelle?.figmaLayer, 'Enveloppe titre');
  assert.equal(enveloppeContractuelle?.children?.[0].figmaLayer, 'Titre');
});

test('un conteneur de textes sans auto-layout n’invente pas flex-row', async () => {
  const titre = { type: 'TEXT', id: 'title', name: 'Titre', boundVariables: { fontSize: alias('title') } };
  const description = { type: 'TEXT', id: 'body', name: 'Description', boundVariables: { fontSize: alias('body') } };
  const bloc = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    layoutMode: 'NONE',
    boundVariables: { itemSpacing: alias('ignored-gap') },
    children: [titre, description],
    findAll: findAllOn([titre, description]),
  };
  (titre as { parent?: unknown }).parent = bloc;
  (description as { parent?: unknown }).parent = bloc;
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Alert',
    layoutMode: 'VERTICAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [bloc],
    findAll: findAllOn([bloc, titre, description]),
  } as unknown as ComponentNode;
  (bloc as { parent?: unknown }).parent = racine;
  const warnings: string[] = [];

  const layout = await extractLayout(
    racine,
    resolverFor({
      gap: 'components.alert.sizes.gap',
      'ignored-gap': 'components.alert.sizes.text-gap',
      title: 'components.alert.sizes.title-size',
      body: 'components.alert.sizes.description-size',
    }),
    warnings,
  );

  assert.equal(layout.children[0].layout, undefined);
  assert.equal(layout.children[0].gap, undefined);
  assert.ok(warnings.some((warning) => warning.includes('Contenu') && warning.includes('disposition')));
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

  const layout = await extractLayout(bouton, resolverFor({}), []);

  assert.deepEqual(layout.children, [
    { slot: 'label', figmaLayer: 'Suivant', visibilityProp: 'label', optional: true },
  ]);
});

test('extractLayout remonte une visibilité imbriquée quand elle contrôle tout le slot', async () => {
  const texte = {
    type: 'TEXT',
    id: 'title',
    name: 'Titre',
    boundVariables: {},
    componentPropertyReferences: { visible: 'title#12:8' },
  };
  const contenu = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    boundVariables: {},
    children: [texte],
    findAll: findAllOn([texte]),
  };
  (texte as { parent?: unknown }).parent = contenu;
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Card',
    layoutMode: 'VERTICAL',
    boundVariables: {},
    children: [contenu],
    findAll: findAllOn([contenu, texte]),
  } as unknown as ComponentNode;
  (contenu as { parent?: unknown }).parent = racine;

  const layout = await extractLayout(racine, resolverFor({}), []);

  assert.equal(layout.children[0].visibilityProp, 'title');
  assert.equal(layout.children[0].optional, true);
});

test('extractLayout cible un descendant sans masquer tout son slot', async () => {
  const titre = {
    type: 'TEXT',
    id: 'title',
    name: 'Titre',
    boundVariables: {},
    componentPropertyReferences: { visible: 'title#12:8' },
  };
  const description = {
    type: 'TEXT',
    id: 'description',
    name: 'Description',
    boundVariables: {},
  };
  const contenu = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    boundVariables: {},
    children: [titre, description],
    findAll: findAllOn([titre, description]),
  };
  (titre as { parent?: unknown }).parent = contenu;
  (description as { parent?: unknown }).parent = contenu;
  const racine = {
    type: 'COMPONENT',
    id: 'root',
    name: 'Card',
    layoutMode: 'VERTICAL',
    boundVariables: {},
    children: [contenu],
    findAll: findAllOn([contenu, titre, description]),
  } as unknown as ComponentNode;
  (contenu as { parent?: unknown }).parent = racine;
  const warnings: string[] = [];

  const layout = await extractLayout(racine, resolverFor({}), warnings);

  // L'intention d'origine tient : une visibilité portée par un descendant ne
  // rend pas tout le slot masquable.
  const slot = layout.children[0];
  assert.equal(slot.visibilityProp, undefined);
  assert.equal(slot.optional, undefined);
  // Le slot porte deux textes : chaque part la déclare à sa place exacte, et
  // `visibilityTargets` disparaît — sinon deux propriétaires pour un même fait.
  assert.equal(slot.visibilityTargets, undefined);
  assert.deepEqual(slot.children?.map((part) => ({
    slot: part.slot,
    figmaLayer: part.figmaLayer,
    visibilityProp: part.visibilityProp,
  })), [
    { slot: 'label', figmaLayer: 'Titre', visibilityProp: 'title' },
    { slot: 'label-2', figmaLayer: 'Description', visibilityProp: undefined },
  ]);
  assert.equal(warnings.some((warning) => warning.includes('visibilité imbriquée')), false);
});

test('une dépendance composée empêche de masquer tout son slot parent', () => {
  const titre = {
    type: 'TEXT',
    id: 'title',
    name: 'Titre',
    componentPropertyReferences: { visible: 'title#12:8' },
  };
  const bouton = {
    type: 'INSTANCE',
    id: 'button',
    name: 'Button',
  };
  const contenu = {
    type: 'FRAME',
    id: 'content',
    name: 'Contenu',
    children: [titre, bouton],
    findAll: findAllOn([titre, bouton]),
  } as unknown as SceneNode;
  (titre as { parent?: unknown }).parent = contenu;
  (bouton as { parent?: unknown }).parent = contenu;

  const visibility = nestedSlotVisibility(
    contenu,
    new Map([['button', { component: 'Button', figmaLayer: 'Button' }]]),
  );

  assert.equal(visibility.visibilityProp, undefined);
  assert.deepEqual(visibility.visibilityTargets, [{
    visibilityProp: 'title',
    figmaPath: ['Titre'],
  }]);
});

test('extractLayout décrit un calque graphique en slot optionnel avec sa visibilité', async () => {
  const icone = {
    type: 'VECTOR',
    name: 'arrow-right-long',
    boundVariables: { width: alias('taille'), height: alias('taille') },
    componentPropertyReferences: { visible: 'iconRight#3:1' },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [icone],
    findAll: findAllOn([icone]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(
    bouton,
    resolverFor({ gap: 'layouts.spacing.8', taille: 'components.icons.sizes.base' }),
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

test('extractLayout n’invente pas une taille carrée quand seule la largeur est liée', async () => {
  const icone = {
    type: 'VECTOR',
    name: 'arrow-right-long',
    boundVariables: { width: alias('taille') },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [icone],
    findAll: findAllOn([icone]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(
    bouton,
    resolverFor({
      gap: 'layouts.spacing.8',
      taille: 'components.icons.sizes.base',
    }),
    warnings,
  );

  assert.equal(layout.children[0].size, undefined);
  assert.ok(warnings.some((warning) => warning.includes('height')));
  assert.ok(warnings.some((warning) => warning.includes("Rien n'est exporté")));
});

test('extractLayout exclut un slot statiquement masqué mais conserve un slot piloté par une prop', async () => {
  const obsolete = {
    type: 'VECTOR',
    name: 'old-icon',
    visible: false,
    boundVariables: { width: alias('old-size'), height: alias('old-size') },
  };
  const optionnelle = {
    type: 'VECTOR',
    name: 'arrow-right-long',
    visible: false,
    boundVariables: { width: alias('size'), height: alias('size') },
    componentPropertyReferences: { visible: 'iconRight#3:1' },
  };
  const bouton = {
    type: 'COMPONENT',
    name: 'Button',
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('gap') },
    children: [obsolete, optionnelle],
    findAll: findAllOn([obsolete, optionnelle]),
  } as unknown as ComponentNode;
  const warnings: string[] = [];

  const layout = await extractLayout(
    bouton,
    resolverFor({
      gap: 'layouts.spacing.8',
      'old-size': 'components.icons.sizes.legacy',
      size: 'components.icons.sizes.base',
    }),
    warnings,
  );

  assert.deepEqual(layout.children.map((child) => child.slot), ['arrow-right-long']);
  assert.ok(warnings.some((warning) => warning.includes('old-icon')));
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

test('findLayoutNode reconnaît un radius lié séparément sur les quatre coins', () => {
  const interne = {
    type: 'FRAME',
    name: 'Wrapper à coins indépendants',
    boundVariables: {
      topLeftRadius: alias('radius'),
      topRightRadius: alias('radius'),
      bottomLeftRadius: alias('radius'),
      bottomRightRadius: alias('radius'),
    },
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Card',
    boundVariables: {},
    findAll: findAllOn([interne]),
  } as unknown as ComponentNode;

  assert.equal(findLayoutNode(racine), interne as unknown as SceneNode);
});

test('findLayoutNode ignore un porteur de dimensions statiquement masqué', () => {
  const masque = {
    type: 'FRAME',
    name: 'Ancien wrapper',
    visible: false,
    layoutMode: 'HORIZONTAL',
    boundVariables: {
      itemSpacing: alias('a'),
      paddingLeft: alias('b'),
      paddingRight: alias('b'),
    },
  };
  const visible = {
    type: 'FRAME',
    name: 'Wrapper actif',
    visible: true,
    layoutMode: 'HORIZONTAL',
    boundVariables: { itemSpacing: alias('a') },
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Button',
    boundVariables: {},
    findAll: findAllOn([masque, visible]),
  } as unknown as ComponentNode;

  assert.equal(findLayoutNode(racine), visible as unknown as SceneNode);
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

test('un slot d’icône porte le rôle « icon », pas le nom de son calque', async () => {
  // Cas réel de l'Alert : `circle-info` en severity=info, `circle-check`
  // ailleurs. Nommer le slot d'après le calque en inventerait un par variant,
  // et le contrat ne décrirait que celui du variant de référence.
  const icone = {
    type: 'VECTOR',
    id: 'ico',
    name: 'circle-info',
    boundVariables: { width: alias('taille'), height: alias('taille') },
    componentPropertyReferences: { visible: 'icon#1:2' },
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Alert',
    layoutMode: 'HORIZONTAL',
    boundVariables: {},
    children: [icone],
    findAll: findAllOn([icone]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(
    racine,
    resolverFor({ taille: 'components.icons.sizes.base' }),
    [],
    new Map(),
    new Set(['circle-info']),
  );

  assert.equal(layout.children[0].slot, 'icon');
  assert.equal(layout.children[0].figmaLayer, 'circle-info');
  assert.equal(layout.children[0].size, '{components.icons.sizes.base}');
  assert.equal(layout.children[0].visibilityProp, 'icon');
});

test('un calque graphique sans règle @icons garde le nom de son calque', async () => {
  const decor = {
    type: 'VECTOR',
    id: 'deco',
    name: 'Separateur',
    boundVariables: {},
  };
  const racine = {
    type: 'COMPONENT',
    name: 'Card',
    layoutMode: 'HORIZONTAL',
    boundVariables: {},
    children: [decor],
    findAll: findAllOn([decor]),
  } as unknown as ComponentNode;

  const layout = await extractLayout(racine, resolverFor({}), [], new Map(), new Set());

  assert.equal(layout.children[0].slot, 'separateur');
});

test('un slot masquable conserve les visibilités portées plus bas', () => {
  // Deux props distinctes : celle du slot et celle du titre. Promouvoir la
  // seconde élargirait sa portée ; la taire perdrait une prop en silence.
  const titre = {
    type: 'TEXT',
    id: 'titre',
    name: 'Titre',
    boundVariables: {},
    componentPropertyReferences: { visible: 'title#1:1' },
  };
  const contenu = {
    type: 'FRAME',
    id: 'contenu',
    name: 'Contenu',
    boundVariables: {},
    componentPropertyReferences: { visible: 'content#2:2' },
    children: [titre],
    findAll: findAllOn([titre]),
  } as unknown as SceneNode;
  (titre as { parent?: unknown }).parent = contenu;

  const sansVisibiliteDeSlot = nestedSlotVisibility(contenu, new Map());
  assert.equal(sansVisibiliteDeSlot.visibilityProp, 'title');

  const avecVisibiliteDeSlot = nestedSlotVisibility(contenu, new Map(), true);
  assert.equal(avecVisibiliteDeSlot.visibilityProp, undefined);
  assert.deepEqual(avecVisibiliteDeSlot.visibilityTargets, [
    { visibilityProp: 'title', figmaPath: ['Titre'] },
  ]);
});
