/**
 * Les fonds du thème Dark ([MOT-28]) : les nuances sous le numéro 400 de la
 * courbe Dark perdent de la part, le thème Light et les accents ne changent
 * pas, et « Profils confondus » se tait sur les nuances atténuées.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROFILS,
  grilleAuPrereglage,
  alertesDePalette,
  ancrageDe,
  boutsDe,
  confusionsDe,
  facteurSombre,
  fabriquerCran,
  fondsSombresDe,
  garantieDesCourbes,
  intensitesDe,
  partsDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  lireHexa,
  teinteA,
  type Palette,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

/** La même recette, fonds du thème Dark au facteur 1 : la part de chaque profil partout. */
const sansAttenuation = (recette: Recette): Recette => ({ ...recette, intensiteDesFondsSombres: 1 });

const PALETTES: Palette[] = [
  paletteTailwind('p-000000d1', '#1E6FD9'),
  paletteTailwind('p-000000d2', '#DC2626'),
  paletteTailwind('p-000000d3', '#16A34A', { base: 'soft' }),
  { ...paletteTailwind('p-000000d4', '#A0B599'), intensites: 1 },
];

test('[MOT-28] le facteur vaut 0,30 au numéro 50 de la courbe Dark, remonte linéairement, et vaut 1 dès le 400', () => {
  const fonds = fondsSombresDe(recetteParDefaut());
  assert.deepEqual(fonds, { depart: 0.3, clarteBasse: 0.18, clarteHaute: 0.4 });
  assert.equal(facteurSombre(0.18, fonds), 0.3);
  assert.equal(facteurSombre(0.1, fonds), 0.3);
  assert.ok(Math.abs(facteurSombre(0.29, fonds) - 0.65) < 1e-12);
  assert.equal(facteurSombre(0.4, fonds), 1);
  assert.equal(facteurSombre(0.93, fonds), 1);
});

test('[MOT-28] W6.4 : passer à neuf nuances, qui retire le 400, ne déplace pas la borne des fonds : aucune nuance gardée ne change de couleur', () => {
  const onze = recetteAvec(...PALETTES);
  const neuf: Recette = { ...onze, ...grilleAuPrereglage(onze, 9) };
  assert.deepEqual(fondsSombresDe(neuf), fondsSombresDe(onze));
  for (const palette of PALETTES) {
    for (const intensite of intensitesDe(palette)) {
      const [avant, apres] = [rampesDe(onze, palette)[intensite]!.dark, rampesDe(neuf, palette)[intensite]!.dark];
      neuf.crans.forEach((cran, rang) => assert.equal(apres[rang].hexa, avant[onze.crans.indexOf(cran)].hexa, `${palette.reference} ${intensite} ${cran}`));
    }
  }
});

test('[MOT-28] le thème Light est identique à l’octet, et en Dark les nuances 400 à 950 aussi', () => {
  const recette = recetteAvec(...PALETTES);
  const avant = sansAttenuation(recette);
  for (const palette of PALETTES) {
    for (const intensite of intensitesDe(palette)) {
      const [apres, sans] = [rampesDe(recette, palette)[intensite]!, rampesDe(avant, palette)[intensite]!];
      assert.deepEqual(apres.light, sans.light, `${palette.reference} ${intensite} light`);
      recette.crans.forEach((cran, rang) => {
        if (cran >= 400) assert.deepEqual(apres.dark[rang], sans.dark[rang], `${palette.reference} ${intensite} dark ${cran}`);
      });
    }
  }
});

test('[MOT-28] en Dark, les nuances 50 à 300 prennent la part de leur intensité multipliée par le facteur, la référence exacte gardée', () => {
  const recette = recetteAvec(...PALETTES);
  const fonds = fondsSombresDe(recette);
  let atteintes = 0;
  for (const palette of PALETTES) {
    const reference = rgb8VersOklch(lireHexa(palette.reference)!);
    const ancrage = ancrageDe(recette, palette);
    const parts = partsDe(recette, palette);
    for (const intensite of intensitesDe(palette)) {
      const rampe = rampesDe(recette, palette)[intensite]!.dark;
      recette.crans.forEach((cran, rang) => {
        if (cran > 300) return;
        const L = recette.courbes.dark[rang];
        const attendu = fabriquerCran(L, teinteA(L, reference, palette.derive[intensite === 'soft' ? 'soft' : 'vivid'], boutsDe(recette)), parts[intensite]! * facteurSombre(L, fonds), recette.gamut).hexa;
        const ancre = intensite === ancrage.profil && rang === ancrage.rangs.dark;
        assert.equal(rampe[rang].hexa, ancre ? palette.reference : attendu, `${palette.reference} ${intensite} ${cran}`);
        atteintes += 1;
      });
    }
  }
  assert.equal(atteintes, 4 * 7, 'quatre nuances par rampe, trois palettes à deux rampes et une à une');
});

test('[MOT-28] une nuance de fond du thème Dark est moins saturée qu’avant, et la garantie des courbes tient', () => {
  const recette = recetteAvec(...PALETTES);
  const avant = sansAttenuation(recette);
  for (const palette of PALETTES.slice(0, 2)) {
    for (const profil of PROFILS) {
      const [apres, sans] = [rampesDe(recette, palette)[profil]!.dark[1], rampesDe(avant, palette)[profil]!.dark[1]];
      assert.ok(apres.C < sans.C, `${palette.reference} ${profil} : ${apres.C} contre ${sans.C}`);
    }
  }
  assert.deepEqual(garantieDesCourbes(recette), []);
});

test('[MOT-28] [VER-11] « Profils confondus » se tait sur les nuances atténuées du thème Dark, que le repère ≈ garde', () => {
  // Une référence dont Soft et Vivid se confondent à une nuance d'emploi atténuée du thème Dark, le 100 de surface par exemple.
  let trouvee: { palette: Palette; recette: Recette; cran: number } | null = null;
  for (let teinte = 0; teinte < 360 && !trouvee; teinte += 5) {
    const hexa = `#${[0, 120, 240].map((decalage) => Math.round(128 + 60 * Math.cos(((teinte + decalage) * Math.PI) / 180)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const palette = paletteTailwind('p-000000d5', hexa);
    const recette = recetteAvec(palette);
    const sombre = confusionsDe(recette, palette).find(({ mode, cran }) => mode === 'dark' && [100, 200, 300].includes(cran));
    if (sombre) trouvee = { palette, recette, cran: sombre.cran };
  }
  assert.ok(trouvee, 'aucune référence ne confond ses profils sur un fond du thème Dark');
  const { palette, recette, cran } = trouvee!;
  const alerte = alertesDePalette(recette, palette).find((candidate) => candidate.code === 'profils-confondus');
  const crans = alerte && alerte.code === 'profils-confondus' ? alerte.crans : [];
  assert.ok(!crans.some((confusion) => confusion.mode === 'dark' && confusion.cran === cran), `${palette.reference} : ${JSON.stringify(crans)}`);
});
