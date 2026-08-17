import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveColorKeys, tokenKey } from '../src/contract/colorKeys';

test('tokenKey lit le dernier segment', () => {
  assert.equal(tokenKey('components.button.colors.primary.default.background'), 'background');
  assert.equal(tokenKey('background'), 'background');
});

test('une clé que personne ne conteste reste le dernier segment', () => {
  const keys = resolveColorKeys([
    ['components.button.colors.primary.default.background', 'components.button.colors.primary.default.foreground'],
  ]);

  assert.deepEqual(Array.from(keys.values()), ['background', 'foreground']);
});

/**
 * Le cas StressTest : deux surfaces du MÊME variant, deux variables que le
 * design system nomme déjà distinctement. L'export tronquait au dernier
 * segment et perdait une couleur pour de bon.
 */
test('deux couleurs qui cohabitent s’allongent du seul segment qui les sépare', () => {
  const keys = resolveColorKeys([
    [
      'components.stresstest.info.userinput.colors.background',
      'components.stresstest.info.divider.colors.background',
    ],
  ]);

  // « colors » est commun aux deux : il n'apporte rien et n'entre pas dans la clé.
  assert.equal(keys.get('components.stresstest.info.userinput.colors.background'), 'userinput.background');
  assert.equal(keys.get('components.stresstest.info.divider.colors.background'), 'divider.background');
});

test('des tokens qui ne cohabitent jamais gardent la même clé dans toutes les feuilles', () => {
  // Le cas ordinaire d'une matrice : une couleur par état, jamais deux dans la
  // même feuille. Rien ne doit s'allonger.
  const keys = resolveColorKeys([
    ['components.button.colors.primary.contained.default.background'],
    ['components.button.colors.primary.contained.hover.background'],
    ['components.button.colors.primary.contained.press.background'],
  ]);

  assert.deepEqual(Array.from(new Set(keys.values())), ['background']);
});

/**
 * Le contre-exemple qui condamne un critère « allonger jusqu'à ce que tous les
 * tokens soient uniques » : les trente couleurs d'état ne cohabitent jamais, et
 * seule la surface partagée les côtoie. Publier `default.background`,
 * `hover.background`… ferait entrer la coordonnée du variant dans la clé et
 * rendrait la feuille inindexable.
 */
test('une seule collision n’allonge pas la clé avec la coordonnée du variant', () => {
  const etats = ['default', 'hover', 'press'];
  const couleurs = ['primary', 'secondary'];
  const partage = 'components.button.colors.shared.background';
  const feuilles = couleurs.flatMap((couleur) =>
    etats.map((etat) => [`components.button.colors.${couleur}.contained.${etat}.background`, partage]),
  );

  const keys = resolveColorKeys(feuilles);

  // Les six tokens d'état gardent UNE seule clé, la même partout ; seule la
  // surface partagée s'en détache.
  const parEtat = new Set(
    couleurs.flatMap((couleur) =>
      etats.map((etat) => keys.get(`components.button.colors.${couleur}.contained.${etat}.background`)),
    ),
  );
  assert.equal(parEtat.size, 1);
  assert.notEqual(Array.from(parEtat)[0], keys.get(partage));
  assert.equal(new Set(keys.values()).size, 2);
});

test('le segment qui encode l’état est écarté, celui qui encode la surface retenu', () => {
  const keys = resolveColorKeys([
    [
      'components.card.info.userinput.default.colors.background',
      'components.card.info.divider.default.colors.background',
    ],
    [
      'components.card.info.userinput.hover.colors.background',
      'components.card.info.divider.hover.colors.background',
    ],
  ]);

  // Une couleur garde la même clé d'un état à l'autre : c'est la surface qui
  // sépare, pas l'état.
  assert.equal(keys.get('components.card.info.userinput.default.colors.background'), 'userinput.background');
  assert.equal(keys.get('components.card.info.userinput.hover.colors.background'), 'userinput.background');
  assert.equal(keys.get('components.card.info.divider.default.colors.background'), 'divider.background');
  assert.equal(keys.get('components.card.info.divider.hover.colors.background'), 'divider.background');
});

test('un chemin plus court que la profondeur retenue garde une clé sans point', () => {
  const keys = resolveColorKeys([['page.background', 'components.card.page.background']]);

  // Les deux clés restent distinctes, c'est tout ce qui est exigé.
  assert.equal(new Set(keys.values()).size, 2);
  assert.equal(keys.get('page.background'), 'background');
  assert.equal(keys.get('components.card.page.background'), 'card.background');
});

test('un token sans point reste sa propre clé', () => {
  const keys = resolveColorKeys([['background']]);

  assert.equal(keys.get('background'), 'background');
});

/**
 * Les clés viennent de Figma. Un regroupement par objet littéral ferait passer
 * « constructor » pour une base déjà occupée, et le token en sortirait avec la
 * clé d'un autre.
 */
test('une base homonyme d’Object.prototype est une base comme une autre', () => {
  const keys = resolveColorKeys([
    ['components.a.constructor', 'components.b.constructor', 'components.c.__proto__'],
  ]);

  assert.equal(keys.get('components.a.constructor'), 'a.constructor');
  assert.equal(keys.get('components.b.constructor'), 'b.constructor');
  assert.equal(keys.get('components.c.__proto__'), '__proto__');
});

test('les peintures et les contours ne se disputent rien', () => {
  // Deux feuilles séparées : un fill « border » et un stroke « border » vivent
  // dans deux arbres différents et gardent tous deux la clé simple.
  const keys = resolveColorKeys([
    ['components.card.colors.border'],
    ['components.card.strokes.border'],
  ]);

  assert.deepEqual(Array.from(new Set(keys.values())), ['border']);
});

test('deux exports du même design produisent les mêmes clés', () => {
  const feuilles = [
    ['components.a.x.colors.background', 'components.a.y.colors.background', 'components.a.z.colors.background'],
  ];

  assert.deepEqual(
    Array.from(resolveColorKeys(feuilles)),
    Array.from(resolveColorKeys(feuilles)),
  );
});
