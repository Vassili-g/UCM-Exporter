/** Fabriquer un cran et une rampe ([MOT-09] à [MOT-17], [MOT-27]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  arrondir,
  boutsDe,
  fabriquerCran,
  fabriquerPalette,
  lineaireVersRgb8,
  decoder,
  lireHexa,
  partsEffectives,
  rgb8VersOklch,
  teinteA,
  type Courbes,
} from '../src/index';

const COURBES: Courbes = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const BOUTS = boutsDe(COURBES);

test('[MOT-10] l’arrondi à 8 bits est Math.round, demi vers le haut, après bornage', () => {
  // decoder(127.5 / 255) encode exactement à 127,5 : le demi monte à 128.
  assert.deepEqual(lineaireVersRgb8([decoder(127.5 / 255), 1.2, -0.3]), [128, 255, 0]);
});

test('[MOT-11] un cran rend L, C et H relus sur sa couleur à 8 bits', () => {
  const cran = fabriquerCran(0.5, 257, 0.95, 'srgb');
  const lu = rgb8VersOklch(cran.couleur);
  assert.deepEqual({ L: cran.L, C: cran.C, H: cran.H }, { L: lu.L, C: lu.C, H: lu.H });
  assert.notEqual(cran.L, 0.5);
});

test('[MOT-14] une clarté hors de [Ls, Lc] prend la dérive entière du bout le plus proche', () => {
  const reference = { L: 0.6, C: 0.1, H: 200 };
  const derive = { clair: -20, sombre: 30 };
  // Les crans 50 et 100 de la courbe sombre, 0,18 et 0,225, sont sous Ls = 0,27.
  assert.equal(teinteA(0.18, reference, derive, BOUTS), 230);
  assert.equal(teinteA(0.225, reference, derive, BOUTS), 230);
  assert.equal(teinteA(0.27, reference, derive, BOUTS), 230);
  assert.equal(teinteA(0.975, reference, derive, BOUTS), 180);
  assert.equal(teinteA(0.99, reference, derive, BOUTS), 180);
});

test('[MOT-14] une référence hors de la rampe laisse un seul segment', () => {
  const derive = { clair: -20, sombre: 30 };
  // Plus claire que Lc : le segment clair n'existe pas, u vaut 0.
  assert.equal(teinteA(0.98, { L: 0.98, C: 0.05, H: 100 }, derive, BOUTS), 100);
  // Plus sombre que Ls : v vaut 1 dès qu'on descend.
  assert.equal(teinteA(0.2, { L: 0.25, C: 0.05, H: 100 }, derive, BOUTS), 130);
});

test('[MOT-15] une dérive positive tourne vers les teintes croissantes', () => {
  const reference = { L: 0.6, C: 0.1, H: 350 };
  assert.equal(teinteA(0.975, reference, { clair: 30, sombre: 0 }, BOUTS), 20);
});

test('[MOT-16] chaque profil suit sa propre dérive', () => {
  const rampes = fabriquerPalette({
    reference: lireHexa('#1E6FD9')!,
    courbes: COURBES,
    parts: { subtle: 0.95, vivid: 0.95 },
    derives: { subtle: { clair: 0, sombre: 0 }, vivid: { clair: -40, sombre: 40 } },
    gamut: 'srgb',
  });
  assert.notEqual(rampes.subtle.light[0].hexa, rampes.vivid.light[0].hexa);
  assert.notEqual(rampes.subtle.light[10].hexa, rampes.vivid.light[10].hexa);
});

test('parts propres : une palette qui en porte remplace celles de la recette', () => {
  const recette = { subtle: 0.45, vivid: 0.95 };
  assert.deepEqual(partsEffectives(recette), recette);
  assert.deepEqual(partsEffectives(recette, { subtle: 0.2, vivid: 0.2 }), { subtle: 0.2, vivid: 0.2 });
});

test('[MOT-27] l’arrondi est symétrique en signe, et un zéro reste positif', () => {
  assert.equal(arrondir(7.526, 2), 7.53);
  assert.equal(arrondir(-7.526, 2), -7.53);
  assert.equal(arrondir(-7.52689, 2), -7.53);
  assert.equal(arrondir(0.4567, 3), 0.457);
  // 0,125 × 100 vaut exactement 12,5 : Math.round(-12.5) rendrait -12.
  assert.equal(arrondir(0.125, 2), 0.13);
  assert.equal(arrondir(-0.125, 2), -0.13);
  assert.ok(Object.is(arrondir(-0.001, 2), 0));
});
