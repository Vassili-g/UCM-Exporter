/** Ce que la configuration de la recette modifie (section 8.3, [ENT-05], [ENT-07], [ENT-09], [ENT-10], V9.4, V9.5, V9.7). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, validerRecette, type Recette } from 'ucm-couleur';

import {
  CARTES_DES_REGLAGES,
  carteDuGroupe,
  estParDefaut,
  lireNombre,
  palettesModifiees,
  poserFond,
  poserValeur,
  retablir,
  valeurDe,
  type CarteDesReglages,
} from '../src/configuration';
import { ajouter, nouvellePalette } from '../src/edition';
import { constatDeGarantie, palettesConcernees, resumeDesEcarts, resumeDesMinimums } from '../src/ui/textes';
import { TRAME_DU_TRACE, geometrieDesCourbes } from '../src/ui/traceDesCourbes';

const DEFAUT = recetteParDefaut();

test('DER-08 : un nombre se saisit à virgule ou à point, et une saisie inachevée n’en est pas un', () => {
  assert.equal(lireNombre('0,56'), 0.56);
  assert.equal(lireNombre(' 0.56 '), 0.56);
  assert.equal(lireNombre('1'), 1);
  for (const saisie of ['0,', ',5', '0,5,6', 'a', '']) assert.equal(lireNombre(saisie), null, saisie);
});

test('chaque champ pose sa valeur à sa place, et la relit', () => {
  const champs = [
    { courbe: 'light' as const, rang: 7 },
    { part: 'soft' as const },
    ...(['texte', 'nonTexte', 'profilsConfondus', 'palettesProches', 'chromaGrise'] as const).map((seuil) => ({ seuil })),
  ];
  for (const champ of champs) {
    const suivante = poserValeur(DEFAUT, champ, 0.123);
    assert.equal(valeurDe(suivante, champ), 0.123, JSON.stringify(champ));
    assert.notEqual(valeurDe(DEFAUT, champ), 0.123, 'la recette de départ reste intacte');
  }
  assert.deepEqual(poserValeur(DEFAUT, champs[0], 0.123).courbes.dark, DEFAUT.courbes.dark);
});

test('[ENT-07] une courbe touche toutes les palettes, une part épargne les parts propres, le seuil les grises', () => {
  let recette: Recette = DEFAUT;
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000a', '#1E6FD9', 2)!);
  recette = ajouter(recette, { ...nouvellePalette(recette, 'p-0000000b', '#FACC15', 2)!, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } });
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000c', '#6B7280', 2)!);
  assert.equal(recette.palettes[2].parts?.origine, 'grise');
  const groupes = ['courbes', 'parts', 'fonds', 'contraste', 'profilsConfondus', 'palettesProches', 'chromaGrise'] as const;
  assert.deepEqual(groupes.map((groupe) => palettesModifiees(recette, groupe)), [3, 1, 3, 3, 2, 3, 2]);
  const seule = ajouter(DEFAUT, nouvellePalette(DEFAUT, 'p-0000000a', '#1E6FD9', 2)!);
  assert.equal(palettesModifiees(seule, 'palettesProches'), 0, 'une palette seule n’a aucune voisine');
  assert.deepEqual([palettesConcernees(0), palettesConcernees(1), palettesConcernees(3)], ['Aucune palette concernée', '1 palette concernée', '3 palettes concernées']);
});

test('[ENT-10] une courbe hors garantie nomme le cran, le mode, le profil, la teinte et le contraste', () => {
  const constat = constatDeGarantie({ mode: 'light', cran: 700, profil: 'soft', teinte: 147, contraste: 4.189, seuil: 4.5 });
  assert.equal(constat.ou, 'Thème Light, nuance 700, profil soft');
  assert.equal(constat.quoi, 'Cette courbe donne un contraste de 4,18:1 avec la nuance 50 pour une teinte de 147°. Le minimum demandé est de 4,5:1.');
  assert.ok(constat.geste.includes('nuances 700 et 50'));
});

test('[ENT-05] un fond se saisit en hexa, s’écrit en majuscules, et une saisie qui n’est pas une couleur se refuse', () => {
  assert.deepEqual(poserFond(DEFAUT, 'dark', '#1a1a1a')?.fonds, { light: DEFAUT.fonds.light, dark: '#1A1A1A' });
  assert.equal(poserFond(DEFAUT, 'light', 'gris'), null);
});

test('[ENT-09] le seuil de chroma grise recalcule les parts grises, et laisse les parts du designer', () => {
  let recette: Recette = DEFAUT;
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000c', '#6B7280', 2)!);
  recette = ajouter(recette, { ...nouvellePalette(recette, 'p-0000000d', '#64748B', 2)!, parts: { soft: 0.2, vivid: 0.4, origine: 'designer' } });
  assert.equal(recette.palettes[0].parts?.origine, 'grise');
  const abaisse = poserValeur(recette, { seuil: 'chromaGrise' }, 0.001);
  assert.equal(abaisse.palettes[0].parts, undefined, 'la référence cesse d’être grise');
  assert.deepEqual(abaisse.palettes[1].parts, recette.palettes[1].parts);
  assert.equal(poserValeur(abaisse, { seuil: 'chromaGrise' }, 0.03).palettes[0].parts?.origine, 'grise');
});

/** Une recette où chaque carte s'écarte de ses valeurs par défaut, avec une palette aux parts du designer et une palette forcée. */
function recetteReglee(): Recette {
  let recette: Recette = DEFAUT;
  recette = ajouter(recette, { ...nouvellePalette(recette, 'p-0000000a', '#1E6FD9', 2)!, base: 'soft' });
  recette = ajouter(recette, { ...nouvellePalette(recette, 'p-0000000b', '#FACC15', 2)!, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } });
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000c', '#6B7280', 2)!);
  recette = poserFond(recette, 'light', '#FFFFFF')!;
  recette = poserValeur(recette, { part: 'soft' }, 0.3);
  recette = poserValeur(recette, { courbe: 'light', rang: 7 }, 0.48);
  recette = poserValeur(recette, { seuil: 'texte' }, 7);
  recette = { ...recette, contenuDesPlanches: { ...recette.contenuDesPlanches, grilles: false } };
  return poserValeur(recette, { seuil: 'chromaGrise' }, 0.05);
}

const CARTES = Object.keys(CARTES_DES_REGLAGES) as CarteDesReglages[];

test('V9.5 : « Rétablir » remet une carte aux valeurs par défaut, sans toucher aux autres cartes ni aux palettes', () => {
  const reglee = recetteReglee();
  for (const carte of CARTES) {
    const retablie = retablir(reglee, carte)!;
    assert.ok(!('refus' in validerRecette(retablie)), carte);
    assert.equal(estParDefaut(retablie, carte), true, carte);
    for (const autre of CARTES.filter((candidate) => candidate !== carte)) {
      assert.equal(estParDefaut(retablie, autre), estParDefaut(reglee, autre), `${carte} laisse ${autre}`);
    }
    const propres = (recette: Recette) => recette.palettes.filter((palette) => palette.parts?.origine !== 'grise');
    assert.deepEqual(propres(retablie), propres(reglee), `${carte} garde les palettes, base forcée et parts du designer comprises`);
  }
  assert.deepEqual(CARTES.map((carte) => estParDefaut(reglee, carte)), [false, false, false, false, false, false]);
  assert.deepEqual(CARTES.map((carte) => estParDefaut(DEFAUT, carte)), [true, true, true, true, true, true]);
  assert.equal(estParDefaut(poserValeur(DEFAUT, { fondsSombres: true }, 0.5), 'parts'), false, 'les fonds du thème Dark comptent dans les intensités');
  assert.equal(estParDefaut(poserValeur(DEFAUT, { courbe: 'dark', rang: 3 }, 0.34), 'courbes'), false, 'la courbe sombre compte aussi');
});

test('V9.5 : rétablir le seuil de gris recalcule les parts grises, comme sa saisie', () => {
  // #6E7A90 a une chroma de 0,037 : presque grise sous le seuil de 0,05, colorée sous celui par défaut, 0,03.
  const reglee = recetteReglee();
  const ardoise = ajouter(reglee, nouvellePalette(reglee, 'p-0000000d', '#6E7A90', 2)!);
  assert.equal(ardoise.palettes[3].parts?.origine, 'grise');
  const retablie = retablir(ardoise, 'proches')!;
  assert.equal(retablie.palettes[3].parts, undefined);
  assert.deepEqual(retablie.palettes, poserValeur(ardoise, { seuil: 'chromaGrise' }, DEFAUT.seuils.chromaGrise).palettes);
});

test('V9.5 : les courbes par défaut ne se rétablissent pas sur une autre liste de nuances', () => {
  const importee: Recette = { ...DEFAUT, crans: DEFAUT.crans.slice(0, 10), courbes: { light: DEFAUT.courbes.light.slice(0, 10), dark: DEFAUT.courbes.dark.slice(0, 10) } };
  assert.equal(retablir(importee, 'courbes'), null);
  assert.notEqual(retablir(importee, 'fonds'), null);
});

test('V9.7 : chaque groupe a une carte, celle qu’un lien ouvre', () => {
  const groupes = ['courbes', 'parts', 'fonds', 'contraste', 'profilsConfondus', 'palettesProches', 'chromaGrise'] as const;
  assert.deepEqual(groupes.map(carteDuGroupe), ['courbes', 'parts', 'fonds', 'minimums', 'proches', 'proches', 'proches']);
});

test('V9.2 : les cartes repliées résument leurs seuils, avec leur unité', () => {
  assert.equal(resumeDesMinimums(4.5, 3), 'Texte 4,5:1 · Éléments graphiques 3:1');
  assert.equal(resumeDesEcarts(0.02, 0.05, 0.03), 'Soft et Vivid 0,02 · Deux palettes 0,05 · Gris 0,03');
});

test('V9.4 : le tracé place chaque nuance dans sa colonne, la luminosité 1 en haut, et le ◆ à la nuance où la référence est insérée', () => {
  const { pas, hauteur, marge } = TRAME_DU_TRACE;
  const geometrie = geometrieDesCourbes(DEFAUT.courbes, { clarte: 0.5, rangs: { light: 7, dark: 3 } });
  assert.equal(geometrie.largeur, 11 * pas);
  assert.deepEqual(geometrie.courbes.light[0], { x: pas / 2, y: marge + (1 - 0.975) * (hauteur - 2 * marge) });
  assert.ok(geometrie.courbes.light[0].y < geometrie.courbes.light[10].y, 'la nuance 50 claire est plus haute que la 950');
  assert.ok(geometrie.courbes.dark[0].y > geometrie.courbes.dark[10].y, 'en sombre, la 950 est la plus haute');
  assert.deepEqual(geometrie.references, [
    { mode: 'light', x: 7 * pas + pas / 2, y: hauteur / 2 },
    { mode: 'dark', x: 3 * pas + pas / 2, y: hauteur / 2 },
  ]);
  assert.deepEqual(geometrieDesCourbes(DEFAUT.courbes, null).references, [], 'sans palette, aucun ◆ inventé');
});
