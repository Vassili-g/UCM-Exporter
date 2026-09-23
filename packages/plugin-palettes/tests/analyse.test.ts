/** L'analyse d'une palette pour l'onglet Palettes ([VER-07], section 11.4, [ENT-02]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { changerReference } from '../src/edition';

const DEFAUT = recetteParDefaut();
/** Une palette neuve : dérive Tailwind, calculée par la même fonction que l'interface. */
const nouvelle = (id: string, reference: string) => changerReference(DEFAUT, {
  id,
  reference: '#000000',
  derive: {
    lien: true,
    soft: { clair: 0, sombre: 0, origine: 'tailwind' },
    vivid: { clair: 0, sombre: 0, origine: 'tailwind' },
  },
}, reference)!;
const BLEU = nouvelle('p-0000000a', '#1E6FD9');
const VOISIN = nouvelle('p-0000000b', '#1D6DDB');
const avec = (...palettes: Recette['palettes']): Recette => ({ ...DEFAUT, palettes });
const decrire = (recette: Recette, profil: 'SRGB' | 'LEGACY' = 'SRGB') =>
  analyserPalette(recette, recette.palettes[0], profil).constats.map((constat) => ('promesse' in constat
    ? `promesse ${constat.promesse.paire.numero}`
    : 'alerte' in constat ? `${constat.severite} ${constat.alerte.code}` : 'notice legacy'));

test('[VER-07] une palette sans promesse manquée n’a que ses alertes', () => {
  const analyse = analyserPalette(avec(BLEU), BLEU, 'SRGB');
  assert.equal(analyse.manquees, 0);
  assert.deepEqual(decrire(avec(BLEU)), ['alerte profils-confondus', 'alerte reference-plus-claire-que-bouton']);
});

test('section 11.4 : promesses manquées, puis alertes, puis notices', () => {
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.55;
  const recette = { ...avec(BLEU), courbes: { ...DEFAUT.courbes, light } };
  assert.deepEqual(decrire(recette, 'LEGACY'), [
    'promesse 2',
    'promesse 2',
    'alerte profils-confondus',
    'alerte reference-plus-claire-que-bouton',
    'notice legacy',
  ]);
  assert.equal(analyserPalette(recette, BLEU, 'SRGB').manquees, 2);
});

test('section 11.4 : une alerte arrivée après une notice passe devant elle', () => {
  // Le moteur rend la notice « plus vive que vivid » avant l'alerte des fonds.
  const jaune = nouvelle('p-0000000c', '#FACC15');
  const recette = { ...avec(jaune), fonds: { light: '#EEEEEE', dark: '#121212' } };
  assert.deepEqual(decrire(recette), [
    'alerte reference-plus-claire-que-bouton',
    'alerte fond-hors-courbe',
    'notice reference-plus-vive',
  ]);
});

test('une palette proche d’une autre porte l’alerte, et les fonds hors de la courbe la leur', () => {
  const recette = { ...avec(BLEU, VOISIN), fonds: { light: '#EEEEEE', dark: '#121212' } };
  const codes = decrire(recette);
  assert.ok(codes.includes('alerte palettes-proches'), codes.join(', '));
  assert.ok(codes.includes('alerte fond-hors-courbe'), codes.join(', '));
});

test('la notice LEGACY ne sonne que dans un document sans profil géré', () => {
  assert.ok(!decrire(avec(BLEU)).includes('notice legacy'));
  assert.ok(decrire(avec(BLEU), 'LEGACY').includes('notice legacy'));
});

test('[PLA-08] l’analyse porte la part de la référence, celles des profils, et le cran proche', () => {
  const analyse = analyserPalette(avec(BLEU), BLEU, 'SRGB');
  assert.deepEqual(analyse.parts, { soft: 0.45, vivid: 0.95 });
  assert.equal(analyse.cranProche, 600);
  assert.ok(analyse.part > 0.8 && analyse.part < 0.95);
});
