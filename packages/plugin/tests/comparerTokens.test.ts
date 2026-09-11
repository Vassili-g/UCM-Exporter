/**
 * Le comparateur de tokens, sur des documents fabriqués.
 *
 * Il sert à distinguer le changement attendu d'une régression : chaque test
 * ci-dessous introduit un seul écart, et le comparateur doit le nommer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TOLERANCE_DE_CANAL, ecartsDeTokens } from './comparerTokens';

/** Un fichier d'origine : hexadécimal, pixels en chaîne, graisse en `string`. */
function origine() {
  return {
    primitives: {
      rouge: { $value: '#ff000080', $type: 'color' },
      espace: { $value: '0.5px', $type: 'dimension' },
      gras: { $value: 'Bold', $type: 'string' },
      famille: { $value: 'Open Sans', $type: 'string' },
    },
    marque: {
      fond: {
        $value: '{primitives.rouge}',
        $type: 'color',
        $extensions: { 'com.ucm.modes': { a: '{primitives.rouge}', b: '#0000ff' } },
      },
      titre: { $value: '{primitives.gras}', $type: 'string' },
    },
  };
}

/** Le même fichier dans la version 1 du format de tokens. */
function version1() {
  return {
    $extensions: { 'com.ucm.formatVersion': 1 },
    primitives: {
      rouge: { $value: { colorSpace: 'srgb', components: [1, 0, 0], alpha: 0.5 }, $type: 'color' },
      espace: { $value: { value: 0.5, unit: 'px' }, $type: 'dimension' },
      gras: { $value: 700, $type: 'number' },
      famille: { $value: 'Open Sans', $type: 'string' },
    },
    marque: {
      fond: {
        $value: '{primitives.rouge}',
        $type: 'color',
        $extensions: {
          'com.ucm.modes': {
            a: '{primitives.rouge}',
            b: { colorSpace: 'srgb', components: [0, 0, 1], alpha: 1 },
          },
        },
      },
      titre: { $value: '{primitives.gras}', $type: 'number' },
    },
  };
}

/** Passe par le JSON, comme le fichier écrit : le comparateur ne lit jamais d'objet en mémoire. */
const relu = (valeur: unknown) => JSON.parse(JSON.stringify(valeur));

test('le passage admis de la forme d’origine à la version 1 ne rend aucun écart', () => {
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(version1())), []);
});

test('un fichier comparé à lui-même ne rend aucun écart', () => {
  assert.deepEqual(ecartsDeTokens(relu(version1()), relu(version1())), []);
});

test('une clé renommée rend un token perdu et un token ajouté', () => {
  const apres = version1();
  const { famille, ...reste } = apres.primitives;
  apres.primitives = { ...reste, typeface: famille } as unknown as typeof apres.primitives;

  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(apres)), [
    'primitives.famille : token perdu',
    'primitives.typeface : token ajouté',
  ]);
});

test('un alias aplati en sa valeur est un écart', () => {
  const apres = version1();
  apres.marque.fond.$value = { colorSpace: 'srgb', components: [1, 0, 0], alpha: 0.5 } as never;

  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(apres)), [
    'marque.fond : référence "{primitives.rouge}" devenue '
      + '{"colorSpace":"srgb","components":[1,0,0],"alpha":0.5}',
  ]);
});

test('un mode perdu est un écart', () => {
  const apres = version1();
  delete (apres.marque.fond.$extensions['com.ucm.modes'] as Record<string, unknown>).b;

  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(apres)), ['marque.fond (mode b) : mode perdu']);
});

test('une composante écartée de plus d’un demi-pas d’octet est un écart', () => {
  const dans = version1();
  dans.primitives.rouge.$value.components[1] = TOLERANCE_DE_CANAL * 0.99;
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(dans)), []);

  const hors = version1();
  hors.primitives.rouge.$value.components[1] = 2 / 255;
  const [ecart, ...reste] = ecartsDeTokens(relu(origine()), relu(hors));
  assert.match(ecart, /^primitives\.rouge : canal écarté de 0\.0078/);
  assert.deepEqual(reste, []);
});

test('deux couleurs déjà structurées se comparent sans tolérance', () => {
  const apres = version1();
  apres.primitives.rouge.$value.components[0] = 1 - 1e-9;

  assert.deepEqual(ecartsDeTokens(relu(version1()), relu(apres)), [
    'primitives.rouge : couleur modifiée',
  ]);
});

test('un espace, un alpha ou une unité inattendus sont des écarts', () => {
  const p3 = version1();
  p3.primitives.rouge.$value.colorSpace = 'display-p3';
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(p3)), [
    'primitives.rouge : espace display-p3, attendu srgb',
  ]);
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(p3), { espace: 'display-p3' }), [
    'marque.fond (mode b) : espace srgb, attendu display-p3',
  ]);

  const sansAlpha = version1();
  delete (sansAlpha.primitives.rouge.$value as { alpha?: number }).alpha;
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(sansAlpha)), [
    'primitives.rouge : la couleur porte les clés colorSpace,components',
  ]);

  const rem = version1();
  rem.primitives.espace.$value.unit = 'rem';
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(rem)), [
    'primitives.espace : unité rem, attendue px',
  ]);
});

test('une graisse n’est admise en nombre que pour son poids, et une famille jamais', () => {
  const faux = version1();
  faux.primitives.gras.$value = 600;
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(faux)), [
    'primitives.gras : "Bold" n’est pas la graisse 600',
  ]);

  const famille = version1();
  famille.primitives.famille = { $value: 400, $type: 'number' } as never;
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(famille)), [
    'primitives.famille : "Open Sans" n’est pas la graisse 400',
  ]);
});

test('une référence ne change de type qu’avec sa cible', () => {
  const apres = version1();
  apres.primitives.gras = { $value: 'Bold', $type: 'string' } as never;

  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(apres)), [
    'marque.titre : type string devenu number',
  ]);
});

test('une marque absente, future ou posée sous un groupe est un écart', () => {
  const sansMarque = version1() as Record<string, unknown>;
  delete sansMarque.$extensions;
  assert.deepEqual(ecartsDeTokens(relu(version1()), relu(sansMarque)), [
    'groupe « racine » : métadonnées {"$extensions":{"com.ucm.formatVersion":1}} devenues null',
  ]);

  const future = { ...version1(), $extensions: { 'com.ucm.formatVersion': 2 } };
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(future)), [
    'groupe « racine » : métadonnées null devenues {"$extensions":{"com.ucm.formatVersion":2}}',
  ]);

  const imbriquee = version1();
  (imbriquee.marque as Record<string, unknown>).$extensions = { 'com.ucm.formatVersion': 1 };
  assert.deepEqual(ecartsDeTokens(relu(origine()), relu(imbriquee)), [
    'groupe « marque » : métadonnées null devenues {"$extensions":{"com.ucm.formatVersion":1}}',
  ]);
});
