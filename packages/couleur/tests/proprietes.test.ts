/**
 * Les propriétés du moteur, éprouvées sur un balayage plutôt que sur un cas.
 *
 * Le balayage est déterministe : un générateur à congruence linéaire, graine
 * fixe, choisit les dérives et les références. Un échec se rejoue donc à
 * l'identique.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boutsDe,
  dansLeGamut,
  fabriquerPalette,
  oklchVersLineaire,
  plafond,
  teinteA,
  type Courbes,
  type Rgb8,
} from '../src/index';

const COURBES: Courbes = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const BOUTS = boutsDe({ crans: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950], courbes: COURBES });

/** Générateur à congruence linéaire (constantes de Numerical Recipes), valeurs dans `[0, 1)`. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(1664525, etat) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[MOT-17] à la clarté de la référence, la teinte vaut la sienne, quelle que soit la dérive', () => {
  const tirer = generateur(20260923);
  const ecarts: string[] = [];
  for (let essai = 0; essai < 20000; essai += 1) {
    const reference = {
      L: BOUTS.sombre + tirer() * (BOUTS.clair - BOUTS.sombre),
      C: 0.1,
      H: tirer() * 360,
    };
    const derive = { clair: -90 + tirer() * 180, sombre: -90 + tirer() * 180 };
    const teinte = teinteA(reference.L, reference, derive, BOUTS);
    if (Math.abs(teinte - reference.H) > 1e-9) ecarts.push(`${JSON.stringify({ reference, derive })} : ${teinte}`);
  }
  assert.deepEqual(ecarts.slice(0, 5), []);
});

test('[MOT-12] un cran clair et un cran sombre de même clarté rendent le même hexa', () => {
  const tirer = generateur(7);
  // Clair 500 et sombre 700 partagent 0,670 ; clair 400 et sombre 800, 0,760.
  const paires: [number, number][] = [[5, 7], [4, 8]];
  for (let essai = 0; essai < 300; essai += 1) {
    const reference: Rgb8 = [Math.floor(tirer() * 256), Math.floor(tirer() * 256), Math.floor(tirer() * 256)];
    const derive = { clair: -90 + tirer() * 180, sombre: -90 + tirer() * 180 };
    const rampes = fabriquerPalette({
      reference,
      courbes: COURBES,
      bouts: BOUTS,
      parts: { soft: 0.45, vivid: 0.95 },
      derives: { soft: derive, vivid: derive },
      gamut: 'srgb',
    });
    for (const profil of ['soft', 'vivid'] as const) {
      for (const [clair, sombre] of paires) {
        assert.equal(
          rampes[profil].light[clair].hexa,
          rampes[profil].dark[sombre].hexa,
          `${reference}, ${profil}, crans ${clair} et ${sombre}`,
        );
      }
    }
  }
});

test('[MOT-06] le plafond n’est jamais hors du gamut, et 1e-3 de chroma de plus en sort, sur 360 teintes', () => {
  const clartes = [...new Set([0.5, ...COURBES.light, ...COURBES.dark])];
  const fautes: string[] = [];
  for (const L of clartes) {
    for (let H = 0; H < 360; H += 1) {
      const C = plafond(L, H);
      if (!dansLeGamut(oklchVersLineaire({ L, C, H }))) fautes.push(`L ${L}, H ${H} : ${C} hors du gamut`);
      if (dansLeGamut(oklchVersLineaire({ L, C: C + 1e-3, H }))) fautes.push(`L ${L}, H ${H} : ${C} + 1e-3 dans le gamut`);
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});
