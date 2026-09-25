/**
 * L'ancrage de la référence exacte ([MOT-17]) : son profil porteur, son rang
 * dans chaque mode, et les octets qu'il pose dans les rampes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  PROFILS,
  ajusterPartsGrises,
  ancrageDe,
  boutsDe,
  fabriquerPalette,
  lireHexa,
  partDeChroma,
  partsDe,
  profilPorteur,
  rampesDe,
  rangPorteur,
  recetteParDefaut,
  rgb8VersOklch,
  type Palette,
  type Recette,
  type Rgb8,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

/** Une palette neuve de cette référence, parts grises posées s'il le faut, dans la recette par défaut. */
function neuve(reference: string, recette: Recette = recetteParDefaut()): { recette: Recette; palette: Palette } {
  const palette = ajusterPartsGrises(recette, paletteTailwind('p-000000a1', reference));
  return { recette: { ...recette, palettes: [palette] }, palette };
}

/** Le profil et les numéros de l'ancrage, écrits pour une comparaison lisible. */
function decrire(reference: string, recette?: Recette): string {
  const { recette: r, palette } = neuve(reference, recette);
  const ancrage = ancrageDe(r, palette);
  return `${ancrage.profil} ${ancrage.crans.light}/${ancrage.crans.dark}`;
}

test('[MOT-17] une référence peu intense est portée par soft, une référence intense par vivid', () => {
  // #A0B599 a une part de 0,20 ; #1E6FD9, 0,89. Les parts communes valent 0,45 et 0,95.
  assert.equal(decrire('#A0B599'), 'soft 400/800');
  assert.equal(decrire('#1E6FD9'), 'vivid 600/600');
});

test('[MOT-17] à égalité de distance entre les deux parts communes, vivid porte la référence', () => {
  const { recette, palette } = neuve('#1E6FD9');
  // La part se compare au millième : à 0,1 de part et d'autre, les deux distances valent 100 millièmes.
  const part = Math.round(partDeChroma(lireHexa('#1E6FD9')!) * 1000) / 1000;
  const egale: Recette = { ...recette, profils: { soft: { part: part - 0.1 }, vivid: { part: part + 0.1 } } };
  assert.equal(profilPorteur(egale, palette), 'vivid');
  const plusPresDeSoft: Recette = { ...recette, profils: { soft: { part: part - 0.099 }, vivid: { part: part + 0.1 } } };
  assert.equal(profilPorteur(plusPresDeSoft, palette), 'soft');
});

test('[MOT-17] une référence presque grise est portée par soft, noir, blanc et gris compris', () => {
  for (const reference of ['#808080', '#6B7280', '#000000', '#FFFFFF']) {
    assert.equal(decrire(reference).split(' ')[0], 'soft', reference);
  }
});

test('[MOT-17] un quasi-noir de part 0,99 reste porté par soft : la règle du gris passe avant la part', () => {
  // #000102 : chroma 0,013, sous le seuil de 0,03, mais une part de 0,996 du plafond, minuscule à cette clarté.
  const { recette, palette } = neuve('#000102');
  assert.ok(partDeChroma(lireHexa('#000102')!) > 0.95);
  assert.equal(profilPorteur(recette, palette), 'soft');
});

test('[MOT-17] les parts propres d’une palette ne changent pas son profil porteur, les parts communes si', () => {
  const recette = recetteParDefaut();
  const designer = paletteTailwind('p-000000a2', '#A0B599', { parts: { soft: 0.9, vivid: 0.95, origine: 'designer' } });
  assert.equal(profilPorteur(recetteAvec(designer), designer), 'soft');
  const communes: Recette = { ...recette, profils: { soft: { part: 0.1 }, vivid: { part: 0.25 } } };
  assert.equal(decrire('#A0B599', communes).split(' ')[0], 'vivid');
});

test('[MOT-17] le noir et le blanc se posent aux extrémités de chaque courbe', () => {
  // La courbe claire descend de 50 à 950, la courbe sombre monte.
  assert.equal(decrire('#000000'), 'soft 950/50');
  assert.equal(decrire('#FFFFFF'), 'soft 50/950');
});

test('[MOT-17] une référence hors de la courbe prend l’extrémité la plus proche, sans message qui la masque', () => {
  // #0B1F4B est plus sombre que le bout sombre de la courbe claire (0,27), mais
  // tombe dans la courbe sombre, près du 200 (0,275). #FFFCF5 dépasse les deux
  // courbes par le haut : 0,975 en clair, 0,93 en sombre.
  assert.equal(decrire('#0B1F4B').split(' ')[1], '950/200');
  assert.equal(decrire('#FFFCF5').split(' ')[1], '50/950');
});

test('[MOT-17] le numéro de la nuance porteuse peut changer d’un mode à l’autre', () => {
  // #B00100, clarté 0,476 : 0,5 au 700 clair, 0,49 au 500 sombre.
  assert.equal(decrire('#B00100'), 'vivid 700/500');
});

test('[MOT-17] à égalité de clarté, le premier rang porte la référence, dans les deux sens de courbe', () => {
  // 0,5625 et 0,4375 sont à 0,0625 de 0,5, exactement.
  assert.equal(rangPorteur([0.5625, 0.4375], 0.5), 0);
  assert.equal(rangPorteur([0.4375, 0.5625], 0.5), 0);
  assert.equal(rangPorteur([0.9, 0.5625, 0.4375], 0.5), 1);
});

test('[MOT-17] #1E6FD9 est le 600 de vivid dans les deux modes ; ses voisins restent ceux du relevé', () => {
  const bleu = paletteTailwind('p-0000000a', '#1E6FD9');
  const rampes = rampesDe(recetteAvec(bleu), bleu);
  assert.equal(rampes.vivid.light[6].hexa, '#1E6FD9');
  assert.equal(rampes.vivid.dark[6].hexa, '#1E6FD9');
  assert.equal(rampes.vivid.light[7].hexa, '#0E5DC6');
  assert.equal(rampes.vivid.dark[7].hexa, '#4596FA');
  assert.notEqual(rampes.soft.light[6].hexa, '#1E6FD9');
});

/** Générateur à congruence linéaire, graine fixe : un échec se rejoue à l'identique. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(1664525, etat) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[MOT-17] sur deux mille références, le profil porteur contient les octets exacts, et rien d’autre ne change', () => {
  const tirer = generateur(20260924);
  const recette = recetteParDefaut();
  const fautes: string[] = [];
  for (let essai = 0; essai < 2000; essai += 1) {
    const octets: Rgb8 = [Math.floor(tirer() * 256), Math.floor(tirer() * 256), Math.floor(tirer() * 256)];
    const hexa = `#${octets.map((octet) => octet.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const { recette: r, palette } = neuve(hexa, recette);
    const ancrage = ancrageDe(r, palette);
    const rampes = rampesDe(r, palette);
    const communes = fabriquerPalette({
      reference: lireHexa(hexa)!,
      courbes: r.courbes,
      bouts: boutsDe(r),
      parts: partsDe(r, palette),
      derives: { soft: palette.derive.soft, vivid: palette.derive.vivid },
      gamut: r.gamut,
    });
    const L = rgb8VersOklch(octets).L;
    for (const mode of MODES) {
      const rang = ancrage.rangs[mode];
      const courbe = r.courbes[mode];
      if (courbe.some((valeur, autre) => Math.abs(valeur - L) < Math.abs(courbe[rang] - L) || (autre < rang && Math.abs(valeur - L) === Math.abs(courbe[rang] - L)))) {
        fautes.push(`${hexa} ${mode} : le rang ${rang} n’est pas le plus proche`);
      }
      if (ancrage.crans[mode] !== r.crans[rang]) fautes.push(`${hexa} ${mode} : numéro ${ancrage.crans[mode]}`);
      for (const profil of PROFILS) {
        rampes[profil][mode].forEach((cran, autre) => {
          const ancre = profil === ancrage.profil && autre === rang;
          const attendu = ancre ? hexa : communes[profil][mode][autre].hexa;
          if (cran.hexa !== attendu) fautes.push(`${hexa} ${profil} ${mode} ${r.crans[autre]} : ${cran.hexa} pour ${attendu}`);
          if (ancre && cran.couleur.some((octet, canal) => octet !== octets[canal])) fautes.push(`${hexa} : octets ${cran.couleur}`);
        });
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});
