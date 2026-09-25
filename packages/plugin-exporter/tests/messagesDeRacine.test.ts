/**
 * Un message qui vise la racine de chaque variant du set exporté s'écrit une
 * fois, avec toutes ces racines pour cibles.
 *
 * Les arbres sont synthétiques : `Root`, `Wide` et `Narrow` ne renvoient à aucun
 * composant réel.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLayout } from '../src/contract/extractLayout';
import { extractVariantTokens } from '../src/contract/extractVariantTokens';
import { extractEffectStyles } from '../src/contract/effectStyles';
import type { EffectCarrier } from '../src/contract/effectStyles';
import {
  declarerLesRacinesDeVariants,
  estUneRacineDeVariant,
  localisationsDe,
  partiesDe,
} from '../src/contract/localisation';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

const resolverFor = (tokens: Record<string, string>) => ({
  resolve: async (candidate: VariableAlias | null | undefined) =>
    candidate ? tokens[candidate.id] ?? null : null,
});

const findAllOn = (enfants: unknown[]) => (predicat: (node: never) => boolean) =>
  enfants.filter(predicat as (node: unknown) => boolean);

/** Une racine de variant : auto layout vertical en hug, dimensions neutres. */
function racine(nom: string, extra: Record<string, unknown> = {}): ComponentNode {
  return {
    type: 'COMPONENT',
    id: `racine-${nom}`,
    name: nom,
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutSizingHorizontal: 'HUG',
    layoutSizingVertical: 'HUG',
    itemSpacing: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    cornerRadius: 0,
    boundVariables: {},
    children: [],
    findAll: findAllOn([]),
    ...extra,
  } as unknown as ComponentNode;
}

const ombre = { type: 'DROP_SHADOW', visible: true, boundVariables: {} };

/** Extrait chaque racine dans le même canal, comme le fait la vue exacte de chaque variant. */
async function extraire(racines: ComponentNode[], canal: string[]): Promise<void> {
  for (const noeud of racines) await extractLayout(noeud, resolverFor({}), canal);
}

const BORNE = {
  titre: 'Propriété sans token associé.',
  impact: 'Des variants déclarent un **min width** sans token. '
    + 'Le contrat ne publiera que les paramètres reliés à un token.',
  action: 'Reliez ces paramètres à une variable dans chaque variant concerné, puis réexportez.',
};

const phrase = (partie: { titre: string; impact: string; action: string }) =>
  `${partie.titre} ${partie.impact} ${partie.action}`;

test('une racine déclarée se reconnaît par son id, dans le canal qui l’a déclarée seulement', () => {
  const canal: string[] = [];
  const autre: string[] = [];
  const large = racine('Wide');
  const etroite = racine('Narrow');
  declarerLesRacinesDeVariants(canal, [large]);

  assert.equal(estUneRacineDeVariant(canal, large), true);
  assert.equal(estUneRacineDeVariant(canal, etroite), false);
  assert.equal(estUneRacineDeVariant(autre, large), false);
});

test('trois racines à min width brut donnent une ligne à trois cibles', async () => {
  const racines = ['Wide', 'Narrow', 'Tall'].map((nom) => racine(nom, { minWidth: 32 }));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  const lignes = canal.filter((message) => message.includes('min width'));
  assert.deepEqual([...new Set(lignes)], [phrase(BORNE)]);
  assert.deepEqual(partiesDe(canal).get(phrase(BORNE)), BORNE);
  assert.deepEqual(
    localisationsDe(canal).get(phrase(BORNE)),
    racines.map((noeud) => noeud.id),
  );
});

test('deux racines sur trois à min width brut donnent une ligne à deux cibles', async () => {
  const racines = [
    racine('Wide', { minWidth: 32 }),
    racine('Narrow'),
    racine('Tall', { minWidth: 32 }),
  ];
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  assert.deepEqual(localisationsDe(canal).get(phrase(BORNE)), [racines[0].id, racines[2].id]);
});

test('deux bornes sans variable s’écrivent dans une seule phrase, en gras', async () => {
  const racines = [racine('Wide', { minWidth: 32, maxWidth: 640 })];
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  const borne = canal.find((message) => message.includes('sans token'));
  assert.ok(borne?.includes('déclarent **min width** et **max width** sans token.'), borne);
});

test('sans déclaration, chaque racine garde son message et son nom', async () => {
  const racines = ['Wide', 'Narrow'].map((nom) => racine(nom, { minWidth: 32 }));
  const canal: string[] = [];

  await extraire(racines, canal);

  const lignes = [...new Set(canal.filter((message) => message.includes('min width')))];
  assert.equal(lignes.length, 2);
  assert.ok(lignes[0].startsWith('Layer « Wide » : il fixe min width sans variable Figma.'));
  assert.ok(lignes[1].startsWith('Layer « Narrow » : il fixe min width sans variable Figma.'));
});

test('un calque qui n’est pas une racine déclarée garde son message et son nom', async () => {
  const declaree = racine('Wide', { minWidth: 32 });
  const etrangere = racine('Narrow', { minWidth: 32 });
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, [declaree]);

  await extraire([declaree, etrangere], canal);

  const lignes = [...new Set(canal.filter((message) => message.includes('min width')))];
  assert.equal(lignes.length, 2);
  assert.ok(lignes.includes(phrase(BORNE)));
  assert.ok(lignes.some((ligne) => ligne.startsWith('Layer « Narrow » : il fixe min width')));
});

test('une ombre sans effect style sur les racines donne une ligne, sans nom de calque', async () => {
  const racines = ['Wide', 'Narrow'].map((nom) => racine(nom, { effects: [ombre] }));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  const porteurs = new Map<ComponentNode, EffectCarrier[]>();
  for (const noeud of racines) {
    const deLaVue: EffectCarrier[] = [];
    await extractLayout(
      noeud, resolverFor({}), canal, new Map(), new Set(), noeud, true,
      new Map(), new Set(), new Map(), deLaVue,
    );
    porteurs.set(noeud, deLaVue);
  }
  await extractEffectStyles(porteurs, resolverFor({}), canal, async () => null);

  const attendu = {
    titre: 'effect : aucun effect style appliqué.',
    impact: 'Le contrat ne transmettra pas les ombres ou les flous des variants concernés.',
    action: 'Appliquez un effect style à chaque variant concerné, puis réexportez.',
  };
  assert.deepEqual(partiesDe(canal).get(phrase(attendu)), attendu);
  assert.deepEqual(
    localisationsDe(canal).get(phrase(attendu)),
    racines.map((noeud) => noeud.id),
  );
  assert.equal(canal.filter((message) => message.startsWith('Layer «')).length, 0);
});

/** Chaque propriété sans champ, le réglage qui la porte, et son texte retenu pour les racines. */
const PROPRIETES_SANS_CHAMP: Array<[string, Record<string, unknown>, {
  titre: string; impact: string; action: string;
}]> = [
  ['fill', { fills: [{ type: 'GRADIENT_LINEAR', visible: true }] }, {
    titre: 'fill : dégradé ou image non pris en charge.',
    impact: 'Le contrat ne transmettra pas les fills en dégradé ou en image.',
    action: 'Si ce rendu est nécessaire, signalez cette limite au mainteneur du plugin. '
      + 'Sinon, remplacez les fills concernés par des couleurs unies reliées à des variables, '
      + 'puis réexportez.',
  }],
  ['stroke', { strokes: [{ type: 'IMAGE', visible: true }] }, {
    titre: 'stroke : dégradé ou image non pris en charge.',
    impact: 'Le contrat ne transmettra pas les strokes en dégradé ou en image.',
    action: 'Si ce rendu est nécessaire, signalez cette limite au mainteneur du plugin. '
      + 'Sinon, remplacez les strokes concernés par des couleurs unies reliées à des variables, '
      + 'puis réexportez.',
  }],
  ['blend mode', { blendMode: 'MULTIPLY' }, {
    titre: 'blend mode : ce mode de fusion n’est pas pris en charge.',
    impact: 'Le contrat ne transmettra pas le mode de fusion des variants concernés.',
    action: 'Si ce mode de fusion est nécessaire, signalez cette limite au mainteneur du '
      + 'plugin. Sinon, choisissez « Normal » dans chaque variant concerné, puis réexportez.',
  }],
  ['mask', { isMask: true }, {
    titre: 'mask : le masquage n’est pas pris en charge.',
    impact: 'Le contrat ne transmettra pas le découpage produit par ces masks.',
    action: 'Si ce découpage est nécessaire, signalez cette limite au mainteneur du plugin. '
      + 'Sinon, désactivez les masks concernés, puis réexportez.',
  }],
  ['dash', { dashPattern: [4, 2] }, {
    titre: 'stroke : le pointillé n’est pas pris en charge.',
    impact: 'Le contrat ne transmettra pas le motif de pointillé de ces strokes.',
    action: 'Si le pointillé est nécessaire, signalez cette limite au mainteneur du plugin. '
      + 'Sinon, choisissez un trait plein dans chaque variant concerné, puis réexportez.',
  }],
];

for (const [nom, reglage, attendu] of PROPRIETES_SANS_CHAMP) {
  test(`trois racines au ${nom} sans champ donnent une ligne à trois cibles`, async () => {
    const racines = ['Wide', 'Narrow', 'Tall'].map((noeud) => racine(noeud, reglage));
    const canal: string[] = [];
    declarerLesRacinesDeVariants(canal, racines);

    await extraire(racines, canal);

    assert.deepEqual(partiesDe(canal).get(phrase(attendu)), attendu);
    assert.deepEqual(
      localisationsDe(canal).get(phrase(attendu)),
      racines.map((noeud) => noeud.id),
    );
    assert.equal(canal.filter((message) => message.startsWith('Layer «')).length, 0);
  });

  test(`un calque qui n’est pas une racine garde son message au ${nom}`, async () => {
    const seule = racine('Wide', reglage);
    const canal: string[] = [];

    await extraire([seule], canal);

    assert.equal(partiesDe(canal).has(phrase(attendu)), false);
    assert.ok(canal.some((message) => message.startsWith('Layer « Wide »,')), canal.join('\n'));
  });
}

const OPACITE = {
  titre: 'opacity : aucune variable associée.',
  impact: "Le contrat ne transmettra pas l'opacité des variants concernés.",
  action: 'Reliez opacity à une variable dans chaque variant concerné, puis réexportez.',
};

test('trois racines atténuées sans variable donnent une ligne à trois cibles', async () => {
  const racines = ['Wide', 'Narrow', 'Tall'].map((nom) => racine(nom, { opacity: 0.5 }));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  const lignes = [...new Set(canal.filter((message) => message.includes('opacity')))];
  assert.deepEqual(lignes, [phrase(OPACITE)]);
  assert.deepEqual(partiesDe(canal).get(phrase(OPACITE)), OPACITE);
  assert.deepEqual(
    localisationsDe(canal).get(phrase(OPACITE)),
    racines.map((noeud) => noeud.id),
  );
});

test('un gap sans variable sur les racines donne une ligne, sans nom de calque', async () => {
  const racines = ['Wide', 'Narrow'].map((nom) => racine(nom, { itemSpacing: 8 }));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  const attendu = {
    titre: "gap : aucun token n'est relié à cette propriété.",
    impact: "Le contrat n'exportera pas cette propriété.",
    action: 'Reliez-la à un token, puis réexportez.',
  };
  assert.deepEqual(partiesDe(canal).get(phrase(attendu)), attendu);
  assert.deepEqual(
    localisationsDe(canal).get(phrase(attendu)),
    racines.map((noeud) => noeud.id),
  );
});

/** Une racine au contour relié à une couleur, d'épaisseur 1 sans variable. */
function racineAuContour(nom: string): ComponentNode {
  const contour = { type: 'SOLID', boundVariables: { color: alias('encre') } };
  return racine(nom, {
    strokes: [contour],
    strokeWeight: 1,
    strokeAlign: 'INSIDE',
    boundVariables: { strokes: [alias('encre')] },
  });
}

/** Relève les couleurs de chaque racine comme le fait l'export d'un set. */
async function releverLesCouleurs(racines: ComponentNode[], canal: string[]): Promise<void> {
  await extractVariantTokens(
    {
      axes: ['state'],
      variants: racines.map((component) => ({ values: { state: component.name }, component })),
    },
    resolverFor({ encre: 'color.border' }),
    canal,
  );
}

const EPAISSEUR = {
  titre: "stroke weight : aucun token n'est relié à cette propriété.",
  impact: "Le contrat n'exportera pas cette propriété.",
  action: 'Reliez-la à un token, puis réexportez.',
};

test('trois racines au stroke weight sans variable donnent une ligne à trois cibles', async () => {
  const racines = ['Wide', 'Narrow', 'Tall'].map(racineAuContour);
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await releverLesCouleurs(racines, canal);

  const lignes = [...new Set(canal.filter((message) => message.includes('stroke weight')))];
  assert.deepEqual(lignes, [phrase(EPAISSEUR)]);
  assert.deepEqual(
    localisationsDe(canal).get(phrase(EPAISSEUR)),
    racines.map((noeud) => noeud.id),
  );
});

test('un composant seul garde le nom de son calque sur le stroke weight', async () => {
  const seul = racineAuContour('Wide');
  const canal: string[] = [];

  await releverLesCouleurs([seul], canal);

  const lignes = canal.filter((message) => message.includes('stroke weight'));
  assert.equal(lignes.length, 1);
  assert.ok(lignes[0].startsWith('Layer « Wide », stroke weight :'), lignes[0]);
});

test('un gap relié à une variable ne produit rien sur les racines', async () => {
  const lie = racine('Wide', { itemSpacing: 8, boundVariables: { itemSpacing: alias('gap') } });
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, [lie]);

  await extractLayout(lie, resolverFor({ gap: 'space.gap' }), canal);

  assert.equal(canal.filter((message) => message.includes('gap')).length, 0);
});

/** Une racine sans auto layout, figée sur ses deux axes ; `lies` dit lesquels ont leur variable. */
const racineLibre = (nom: string, lies: Array<'width' | 'height'> = ['width', 'height']) => racine(nom, {
  layoutMode: 'NONE',
  layoutSizingHorizontal: 'FIXED',
  layoutSizingVertical: 'FIXED',
  width: 80,
  height: 32,
  boundVariables: Object.fromEntries(lies.map((axe) => [axe, alias(axe)])),
});

const LIBRE = { width: 'size.w', height: 'size.h' };

test('trois racines sans auto layout donnent une ligne à trois cibles, disposition et espacement', async () => {
  const racines = ['Wide', 'Narrow', 'Tall'].map((nom) => racineLibre(nom));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  for (const noeud of racines) await extractLayout(noeud, resolverFor(LIBRE), canal);

  const disposition = {
    titre: 'Variants sans auto layout.',
    impact: 'Leurs layers ne se déplaceront pas automatiquement lorsque le contenu '
      + 'd’un layer voisin grandit.',
    action: 'Si la disposition doit s’adapter au contenu, configurez un auto layout dans '
      + 'chaque variant concerné, puis réexportez.',
  };
  const espacement = {
    titre: 'gap et padding : aucun auto layout configuré.',
    impact: 'Le contrat ne transmettra aucune valeur de gap ou de padding pour ces variants.',
    action: 'Pour transmettre ces espacements, configurez un auto layout et reliez les '
      + 'valeurs de gap et de padding à des variables, puis réexportez.',
  };
  for (const attendu of [disposition, espacement]) {
    assert.deepEqual(partiesDe(canal).get(phrase(attendu)), attendu);
    assert.deepEqual(
      localisationsDe(canal).get(phrase(attendu)),
      racines.map((noeud) => noeud.id),
    );
  }
  assert.equal(canal.filter((message) => message.startsWith('Layer «')).length, 0);
});

test('trois racines sans auto layout à la hauteur sans variable donnent une ligne', async () => {
  const racines = ['Wide', 'Narrow', 'Tall'].map((nom) => racineLibre(nom, ['width']));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  for (const noeud of racines) await extractLayout(noeud, resolverFor(LIBRE), canal);

  const hauteur = {
    titre: 'height : aucune variable associée sur des variants sans auto layout.',
    impact: 'Le contrat ne transmettra pas la hauteur des variants concernés.',
    action: 'Reliez height à une variable dans chaque variant concerné, ou configurez leur '
      + 'taille avec un auto layout, puis réexportez.',
  };
  assert.deepEqual(partiesDe(canal).get(phrase(hauteur)), hauteur);
  assert.deepEqual(localisationsDe(canal).get(phrase(hauteur)), racines.map((noeud) => noeud.id));
});
