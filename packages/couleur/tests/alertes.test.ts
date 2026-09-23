/** Les alertes de la section 11.3 ([VER-08], [VER-10] à [VER-12], [ENT-06], [ENT-09]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRANS_DES_EMPLOIS,
  ajusterPartsGrises,
  cranLePlusProche,
  alertesDePalette,
  alertesDeRecette,
  distanceDePalettes,
  ecrireHexa,
  lireHexa,
  rampesDe,
  rangsDesEmplois,
  recetteParDefaut,
  rgb8VersOklch,
  severiteDeLAlerte,
  type Alerte,
  type Palette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const codes = (alertes: Alerte[]) => alertes.map((a) => a.code);
const dePalette = (palette: Palette) => alertesDePalette(recetteAvec(palette), palette);

test('[VER-08] profils confondus : sonne au cran 100 clair de #1E6FD9, avec la mesure et le seuil', () => {
  const alerte = dePalette(BLEU).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), ['light 100']);
  assert.ok(alerte.crans[0].distance < alerte.seuil);
  assert.equal(alerte.seuil, 0.02);
});

test('[VER-11] profils confondus : ne regarde que les crans de la table des emplois, états compris', () => {
  const recette = recetteParDefaut();
  assert.deepEqual(rangsDesEmplois(recette).map((rang) => recette.crans[rang]), [...CRANS_DES_EMPLOIS]);
});

test('[VER-12] référence plus claire que le bouton : sonne pour #FACC15, avec le cran 700 vivid clair', () => {
  const jaune = paletteTailwind('p-00000012', '#FACC15');
  const alerte = dePalette(jaune).find((a) => a.code === 'reference-plus-claire-que-bouton');
  assert.ok(alerte && alerte.code === 'reference-plus-claire-que-bouton');
  const recette = recetteAvec(jaune);
  const cran700 = rampesDe(recette, jaune).vivid.light[recette.crans.indexOf(700)].couleur;
  assert.deepEqual([alerte.reference, alerte.bouton], ['#FACC15', ecrireHexa(cran700)]);
  assert.ok(rgb8VersOklch(lireHexa(alerte.bouton)!).L < rgb8VersOklch(lireHexa(alerte.reference)!).L);
});

test('[VER-12] référence plus claire que le bouton : se mesure sur la courbe claire, 0,5 au cran 700', () => {
  // #1E6FD9 a une clarté de 0,555 : au-dessus du 700 clair (0,5), sous le 700 sombre (0,67).
  assert.ok(codes(dePalette(BLEU)).includes('reference-plus-claire-que-bouton'));
});

test('[VER-12] référence plus claire que le bouton : se tait pour #1D4ED8, plus sombre que le cran 700', () => {
  assert.ok(!codes(dePalette(paletteTailwind('p-00000013', '#1D4ED8'))).includes('reference-plus-claire-que-bouton'));
});

test('[ENT-09] profils confondus : se tait pour une palette aux parts grises', () => {
  const recette = recetteParDefaut();
  const grise = ajusterPartsGrises(recette, paletteTailwind('p-0000000c', '#6B7280'));
  assert.equal(grise.parts?.origine, 'grise');
  assert.ok(!codes(dePalette(grise)).includes('profils-confondus'));
});

test('[VER-08] couleur presque grise : sonne pour #6B7280, se tait pour #1E6FD9', () => {
  const alerte = dePalette(paletteTailwind('p-0000000c', '#6B7280')).find((a) => a.code === 'couleur-presque-grise');
  assert.ok(alerte && alerte.code === 'couleur-presque-grise' && alerte.chroma < alerte.seuil);
  assert.ok(!codes(dePalette(BLEU)).includes('couleur-presque-grise'));
});

test('[VER-08] référence plus terne que soft : sonne pour #5B6B7A, se tait pour #1E6FD9', () => {
  const alerte = dePalette(paletteTailwind('p-0000000d', '#5B6B7A')).find((a) => a.code === 'reference-plus-terne');
  assert.ok(alerte && alerte.code === 'reference-plus-terne');
  assert.deepEqual([alerte.part, alerte.partSoft], [0.226, 0.45]);
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-terne'));
});

test('[VER-10] référence plus vive que vivid : une notice pour #F2A900, rien pour #1E6FD9', () => {
  const alerte = dePalette(paletteTailwind('p-0000000e', '#F2A900')).find((a) => a.code === 'reference-plus-vive');
  assert.ok(alerte && alerte.code === 'reference-plus-vive' && alerte.part > alerte.partVivid);
  assert.equal(severiteDeLAlerte(alerte), 'notice');
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-vive'));
});

test('[VER-08] référence hors de la rampe : sonne sous le bout sombre et au-dessus du bout clair', () => {
  for (const reference of ['#0B1F4B', '#FFFCF5']) {
    const alerte = dePalette(paletteTailwind('p-0000000f', reference)).find((a) => a.code === 'reference-hors-rampe');
    assert.ok(alerte && alerte.code === 'reference-hors-rampe', reference);
    assert.ok(alerte.clarte < alerte.boutSombre || alerte.clarte > alerte.boutClair, reference);
  }
  assert.ok(!codes(dePalette(BLEU)).includes('reference-hors-rampe'));
});

test('[VER-08] palettes proches : sonne pour deux bleus voisins, se tait pour un bleu et un ambre', () => {
  const voisin = paletteTailwind('p-00000010', '#1D6DDB');
  const ambre = paletteTailwind('p-00000011', '#F2A900');
  const alerte = alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).find((a) => a.code === 'palettes-proches');
  assert.ok(alerte && alerte.code === 'palettes-proches');
  assert.deepEqual(alerte.palettes, [BLEU.id, voisin.id]);
  assert.ok(alerte.distance < alerte.seuil);
  assert.equal(alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).filter((a) => a.code === 'palettes-proches').length, 1);
});

test('palettes proches : sans l’un des crans 500, 600 et 700, la distance ne se calcule pas', () => {
  const recette = { ...recetteAvec(BLEU), crans: [50, 100, 200, 300, 400, 550, 600, 700, 800, 900, 950] };
  assert.equal(distanceDePalettes(recette, BLEU, BLEU), null);
});

test('[ENT-06] fond hors de la courbe : se tait pour les fonds par défaut, #121212 compris', () => {
  assert.deepEqual(alertesDeRecette(recetteParDefaut()), []);
});

test('[ENT-06] fond hors de la courbe : sonne pour un fond clair trop sombre ou un fond sombre trop clair', () => {
  const recette = { ...recetteParDefaut(), fonds: { light: '#EEEEEE', dark: '#1A1A1A' } };
  const alertes = alertesDeRecette(recette);
  assert.deepEqual(alertes.map((a) => a.code === 'fond-hors-courbe' && a.mode), ['light', 'dark']);
});

test('[ENT-09] une référence presque grise reçoit des parts grises, qu’elle perd en cessant de l’être', () => {
  const recette = recetteParDefaut();
  const grise = ajusterPartsGrises(recette, paletteTailwind('p-0000000c', '#6B7280'));
  assert.deepEqual(grise.parts, { soft: 0.094, vivid: 0.094, origine: 'grise' });
  const recoloree = ajusterPartsGrises(recette, { ...grise, reference: '#1E6FD9' });
  assert.equal(recoloree.parts, undefined);
  assert.ok(!('parts' in recoloree));
});

test('[ENT-09] des parts du designer restent, grise ou non', () => {
  const recette = recetteParDefaut();
  const parts = { soft: 0.3, vivid: 0.6, origine: 'designer' } as const;
  assert.deepEqual(ajusterPartsGrises(recette, paletteTailwind('p-0000000c', '#6B7280', { parts })).parts, parts);
  assert.deepEqual(ajusterPartsGrises(recette, { ...BLEU, parts }).parts, parts);
});

test('[PLA-08] le cran le plus proche en clarté : 600 pour #1E6FD9, 300 pour #FACC15', () => {
  // #1E6FD9 a une clarté de 0,555 : 0,585 au 600, 0,5 au 700.
  assert.equal(cranLePlusProche(recetteAvec(BLEU), BLEU), 600);
  const jaune = paletteTailwind('p-00000012', '#FACC15');
  assert.equal(cranLePlusProche(recetteAvec(jaune), jaune), 300);
});
