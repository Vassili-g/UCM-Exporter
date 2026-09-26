/**
 * Une palette à une intensité ([ENT-14]) : une seule rampe, sans profil, à la
 * part de sa référence ; et la recette de format 3, relue avec deux
 * intensités par palette.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  PROFILS,
  alertesDePalette,
  ancrageDe,
  classerRecette,
  compterManquees,
  confusionsDe,
  distanceDePalettes,
  distanceOk,
  intensitesDe,
  jsonCanonique,
  partDeChroma,
  partsDe,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
  arrondir,
  lireHexa,
  CRANS_PALETTES_PROCHES,
  type Intensite,
  type Palette,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const unique = (id: string, reference: string): Palette => ({ ...paletteTailwind(id, reference), intensites: 1 });

test('[ENT-14] une palette à une intensité n’a qu’une rampe, sans profil, qui contient la référence exacte', () => {
  const bleu = unique('p-000000c1', '#1E6FD9');
  const recette = recetteAvec(bleu);
  assert.deepEqual(intensitesDe(bleu), ['unique']);
  const rampes = rampesDe(recette, bleu);
  assert.deepEqual(Object.keys(rampes), ['unique']);
  const ancrage = ancrageDe(recette, bleu);
  assert.equal(ancrage.profil, 'unique');
  for (const mode of MODES) assert.equal(rampes.unique![mode][ancrage.rangs[mode]].hexa, '#1E6FD9', mode);
  assert.deepEqual(partsDe(recette, bleu), { unique: arrondir(partDeChroma(lireHexa('#1E6FD9')!, 'srgb'), 3) });
});

/** Un générateur pseudo-aléatoire à graine, pour des tirages reproductibles. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[ENT-14] sur cinq cents références, la rampe unique est celle du profil porteur forcé, en Soft comme en Vivid', () => {
  const tirer = generateur(20260926);
  const fautes: string[] = [];
  for (let essai = 0; essai < 500; essai += 1) {
    const hexa = `#${[0, 1, 2].map(() => Math.floor(tirer() * 256).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const seule = unique('p-000000c2', hexa);
    const attendue = rampesDe(recetteAvec(seule), seule).unique!;
    for (const profil of PROFILS) {
      const forcee = { ...paletteTailwind('p-000000c2', hexa), base: profil };
      const rampe = rampesDe(recetteAvec(forcee), forcee)[profil]!;
      for (const mode of MODES) {
        if (jsonCanonique(rampe[mode]) !== jsonCanonique(attendue[mode])) fautes.push(`${hexa} ${profil} ${mode}`);
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});

test('[ENT-14] une palette à une intensité juge trente-deux promesses, sans seconde série, et son verdict ne compte qu’elles', () => {
  const bleu = unique('p-000000c3', '#1E6FD9');
  const promesses = verifierPromesses(recetteAvec(bleu), bleu);
  assert.equal(promesses.length, 32);
  assert.deepEqual([...new Set(promesses.map((promesse) => promesse.profil))], ['unique']);
  // La courbe claire place le 700 à 0,55 : `text` sur `surface` manque en clair, et seules les promesses de la rampe unique comptent.
  const recette = recetteAvec(bleu);
  const light = [...recette.courbes.light];
  light[7] = 0.55;
  const plusClair: Recette = { ...recette, courbes: { ...recette.courbes, light } };
  const deux = paletteTailwind('p-000000c3', '#1E6FD9');
  const manqueesUne = compterManquees(verifierPromesses(plusClair, bleu));
  const manqueesDeux = verifierPromesses(plusClair, deux);
  assert.ok(manqueesUne > 0);
  assert.equal(manqueesUne, manqueesDeux.filter((promesse) => promesse.profil === 'vivid' && promesse.verdict === 'manquee').length, 'la rampe unique de #1E6FD9 est sa rampe Vivid');
  assert.ok(compterManquees(manqueesDeux) > manqueesUne);
});

test('[ENT-14] [VER-11] une palette à une intensité n’a ni profils confondus, ni référence plus terne ou plus vive', () => {
  // #6B7280 confond ses deux profils, et #A0B599 est plus terne que Vivid : à une intensité, rien ne sonne.
  for (const reference of ['#6B7280', '#A0B599', '#FACC15']) {
    const seule = unique('p-000000c4', reference);
    const recette = recetteAvec(seule);
    assert.deepEqual(confusionsDe(recette, seule), [], reference);
    const codes = alertesDePalette(recette, seule).map((alerte) => alerte.code);
    for (const code of ['profils-confondus', 'reference-plus-terne', 'reference-plus-vive']) assert.ok(!codes.includes(code as never), `${reference} : ${codes}`);
  }
  const deux = paletteTailwind('p-000000c4', '#A0B599');
  assert.ok(alertesDePalette(recetteAvec(deux), deux).some((alerte) => alerte.code === 'reference-plus-vive' || alerte.code === 'reference-plus-terne'), 'la même référence à deux intensités sonne');
});

test('[ENT-14] une palette à une intensité refuse une autre valeur, la palette de base, des parts, une liste libre et une dérive déliée', () => {
  const recette = recetteAvec(unique('p-000000c5', '#1E6FD9'));
  assert.ok('recette' in validerRecette(copie(recette)));
  const refus = (modifier: (palette: any) => void) => {
    const essai = copie(recette);
    modifier(essai.palettes[0]);
    const lue = validerRecette(essai);
    return 'refus' in lue ? lue.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
  };
  assert.deepEqual(refus((palette) => { palette.intensites = 2; }), ['intensites-valeur palettes[0].intensites']);
  assert.deepEqual(refus((palette) => { palette.base = 'vivid'; }), ['intensites-incompatible palettes[0].base']);
  assert.deepEqual(refus((palette) => { palette.parts = { soft: 0.3, vivid: 0.8, origine: 'designer' }; }), ['intensites-incompatible palettes[0].parts']);
  assert.deepEqual(refus((palette) => { palette.crans = [100, 300, 500, 700]; }), ['intensites-incompatible palettes[0].crans']);
  assert.deepEqual(refus((palette) => { palette.derive.lien = false; }), ['intensites-incompatible palettes[0].derive.lien']);
});

test('[REC-03] une recette de format 3 se relit avec deux intensités par palette, ses palettes et ses couleurs Light intactes', () => {
  const bleu = paletteTailwind('p-000000c6', '#1E6FD9');
  const jaune = paletteTailwind('p-000000c7', '#FACC15', { base: 'soft' });
  const actuelle = recetteAvec(bleu, jaune);
  const { intensiteDesFondsSombres: _facteur, contenuDesPlanches: _contenu, ...sansFormat4 } = actuelle;
  const classement = classerRecette(jsonCanonique({ ...sansFormat4, formatVersion: 3 }));
  assert.ok(classement.etat === 'migree' && classement.depuis === 3, JSON.stringify(classement).slice(0, 200));
  assert.deepEqual(classement.recette.palettes, [bleu, jaune]);
  assert.equal(classement.recette.intensiteDesFondsSombres, 0.3);
  assert.deepEqual(classement.recette.contenuDesPlanches, { note: true, usages: true, grilles: true, light: true, dark: true });
  for (const palette of [bleu, jaune]) {
    assert.deepEqual(intensitesDe(palette), ['soft', 'vivid']);
    const lues = rampesDe(classement.recette, palette);
    for (const profil of PROFILS) assert.deepEqual(lues[profil]!.light, rampesDe(actuelle, palette)[profil]!.light);
  }
});

/** La distance de deux palettes sur une rampe donnée de chacune, crans 500, 600 et 700 en clair. */
function distanceSur(recette: Recette, a: Palette, cote: Intensite, b: Palette, autre: Intensite): number {
  const rangs = CRANS_PALETTES_PROCHES.map((cran) => recette.crans.indexOf(cran));
  const [rampeA, rampeB] = [rampesDe(recette, a)[cote]!, rampesDe(recette, b)[autre]!];
  return rangs.reduce((total, rang) => total + distanceOk(rampeA.light[rang].couleur, rampeB.light[rang].couleur), 0) / rangs.length;
}

test('[VER-17] « Palettes proches » : Vivid contre Vivid à deux intensités, la rampe unique contre le profil le plus proche', () => {
  const sauge = unique('p-000000c8', '#A0B599');
  const deux = paletteTailwind('p-000000c9', '#9DB396');
  const autre = unique('p-000000ca', '#9DB396');
  const recette = recetteAvec(sauge, deux, autre);
  const versSoft = distanceSur(recette, sauge, 'unique', deux, 'soft');
  const versVivid = distanceSur(recette, sauge, 'unique', deux, 'vivid');
  assert.ok(versSoft < versVivid, 'une référence terne ressemble à Soft');
  assert.equal(distanceDePalettes(recette, sauge, deux), Math.min(versSoft, versVivid));
  assert.equal(distanceDePalettes(recette, deux, sauge), Math.min(versSoft, versVivid), 'la mesure est symétrique');
  assert.equal(distanceDePalettes(recette, sauge, autre), distanceSur(recette, sauge, 'unique', autre, 'unique'));
  const bleu = paletteTailwind('p-000000cb', '#1E6FD9');
  assert.equal(distanceDePalettes(recette, bleu, deux), distanceSur(recette, bleu, 'vivid', deux, 'vivid'), 'deux intensités : Vivid contre Vivid, comme au format 3');
  assert.equal(recetteParDefaut().formatVersion, 4);
});
