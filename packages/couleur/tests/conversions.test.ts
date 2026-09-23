/**
 * Les conversions du moteur ([MOT-01] à [MOT-05], [MOT-26]).
 *
 * Les valeurs attendues de Display P3 viennent de culori 4.0.2, calculées une
 * fois par un script hors du dépôt : culori n'entre pas dans les dépendances.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decoder,
  ecrireHexa,
  encoder,
  lineaireVersOklab,
  lireHexa,
  oklabVersLineaire,
  oklabVersOklch,
  p3LineaireVersSrgbLineaire,
  p3VersRgb8,
  rgb8VersLineaire,
  rgb8VersOklch,
  rgb8VersP3,
  srgbLineaireVersP3Lineaire,
  type Triplet,
} from '../src/index';

const proche = (obtenu: number, attendu: number, tolerance: number, quoi: string) =>
  assert.ok(Math.abs(obtenu - attendu) <= tolerance, `${quoi} : ${obtenu} au lieu de ${attendu}`);

test('[MOT-01] lit #RRGGBB, RRGGBB et #RGB, sans casse imposée', () => {
  assert.deepEqual(lireHexa('#1E6FD9'), [0x1e, 0x6f, 0xd9]);
  assert.deepEqual(lireHexa('1e6fd9'), [0x1e, 0x6f, 0xd9]);
  assert.deepEqual(lireHexa('#fA0'), [0xff, 0xaa, 0x00]);
});

test('[MOT-01] refuse un alpha et toute autre forme', () => {
  for (const texte of ['#1E6FD9FF', '#FA0F', 'FA0', '#1E6FD', '#GGGGGG', '', 'rgb(0,0,0)']) {
    assert.equal(lireHexa(texte), null, texte);
  }
});

test('[MOT-01] écrit toujours #RRGGBB en majuscules', () => {
  assert.equal(ecrireHexa([0x0e, 0x5d, 0xc6]), '#0E5DC6');
  assert.equal(ecrireHexa([0, 0, 0]), '#000000');
});

test('[MOT-02] la fonction de transfert change de morceau à 0.04045 et à 0.0031308', () => {
  assert.equal(decoder(0.04045), 0.04045 / 12.92);
  assert.equal(encoder(0.0031308), 12.92 * 0.0031308);
  proche(decoder(0.5), ((0.5 + 0.055) / 1.055) ** 2.4, 1e-15, 'decoder(0.5)');
  for (let i = 0; i <= 255; i += 1) proche(encoder(decoder(i / 255)), i / 255, 1e-12, `canal ${i}`);
});

test('[MOT-03] Oklab et sRGB linéaire font l’aller-retour, à la tolérance du gamut', () => {
  // Les matrices d'Ottosson, écrites à dix chiffres, ne sont inverses qu'à
  // 3e-7 près : le blanc revient à 0.99999974. C'est pourquoi le plafond
  // tolère 1e-6 par composante ([MOT-06]).
  for (const hexa of ['#1E6FD9', '#F2A900', '#FFFFFF', '#000000', '#E4007C']) {
    const lineaire = rgb8VersLineaire(lireHexa(hexa)!);
    const retour = oklabVersLineaire(lineaireVersOklab(lineaire));
    lineaire.forEach((canal, rang) => proche(retour[rang], canal, 1e-6, `${hexa}, canal ${rang}`));
  }
});

test('[MOT-04] sous une chroma de 1e-4, la teinte vaut 0', () => {
  assert.equal(oklabVersOklch([0.5, 0.00005, 0.00005]).H, 0);
  assert.equal(rgb8VersOklch([0x76, 0x76, 0x76]).H, 0);
  const bleu = oklabVersOklch([0.5, 0, -0.1]);
  proche(bleu.H, 270, 1e-9, 'teinte de -b');
});

/** Display P3 encodé, selon culori 4.0.2. */
const P3_CULORI: [string, Triplet][] = [
  ['#1E6FD9', [0.21772804814994867, 0.42901047712046897, 0.8229807988436214]],
  ['#F2A900', [0.9066932281687419, 0.6748902542691986, 0.23180070650962037]],
  ['#FF0000', [0.9174875573251657, 0.20028680774084662, 0.13856059121111408]],
  ['#00FF00', [0.4584015901910305, 0.9852645833250543, 0.29829470783345846]],
  ['#767676', [0.462745098039216, 0.46274509803921565, 0.46274509803921576]],
];

test('[MOT-05] une couleur sRGB se peint en Display P3 comme culori la convertit', () => {
  for (const [hexa, attendu] of P3_CULORI) {
    const obtenu = rgb8VersP3(lireHexa(hexa)!);
    attendu.forEach((canal, rang) => proche(obtenu[rang], canal, 1e-9, `${hexa}, canal ${rang}`));
  }
});

test('[MOT-26] Display P3 revient en sRGB par l’inverse de [MOT-05]', () => {
  const lineaire: Triplet = [0.2, 0.5, 0.8];
  const retour = p3LineaireVersSrgbLineaire(srgbLineaireVersP3Lineaire(lineaire));
  lineaire.forEach((canal, rang) => proche(retour[rang], canal, 1e-12, `canal ${rang}`));
  for (const [hexa, p3] of P3_CULORI) {
    const lu = p3VersRgb8(p3);
    assert.equal(ecrireHexa(lu.couleur), hexa);
    assert.equal(lu.ramenee, false, hexa);
  }
});

test('[MOT-26] une couleur P3 hors du gamut sRGB est bornée, et le résultat le dit', () => {
  // Le vert pur de Display P3 vaut (-0.51, 1.02, -0.31) en sRGB selon culori.
  const lu = p3VersRgb8([0, 1, 0]);
  assert.equal(lu.ramenee, true);
  assert.equal(ecrireHexa(lu.couleur), '#00FF00');
});
