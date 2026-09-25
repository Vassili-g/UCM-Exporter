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

test('une propriété dont le texte n’est pas validé garde une ligne par racine', async () => {
  const racines = ['Wide', 'Narrow'].map((nom) => racine(nom, { blendMode: 'MULTIPLY' }));
  const canal: string[] = [];
  declarerLesRacinesDeVariants(canal, racines);

  await extraire(racines, canal);

  const lignes = [...new Set(canal.filter((message) => message.includes('blend mode')))];
  assert.equal(lignes.length, 2);
  assert.ok(lignes[0].startsWith('Layer « Wide », blend mode :'));
});

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
