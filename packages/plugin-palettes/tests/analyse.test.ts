/** L'analyse d'une palette pour l'onglet Palettes ([VER-07], section 11.4, [ENT-02]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { alertesDePalette, ancrageDe, rampesDe, recetteParDefaut, type Recette } from 'ucm-couleur';

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
const codes = (recette: Recette) => analyserPalette(recette, recette.palettes[0]).alertes.map((alerte) => alerte.code);

test('[VER-07] une palette compte ses promesses manquées', () => {
  assert.equal(analyserPalette(avec(BLEU), BLEU).manquees, 0);
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.55;
  const recette = { ...avec(BLEU), courbes: { ...DEFAUT.courbes, light } };
  assert.equal(analyserPalette(recette, BLEU).manquees, 2);
});

test('[VER-16] l’analyse garde toutes les alertes du moteur, même celles que l’onglet montre ailleurs', () => {
  const jaune = nouvelle('p-0000000c', '#FACC15');
  const recette = { ...avec(jaune), fonds: { light: '#EEEEEE', dark: '#121212' } };
  assert.deepEqual(codes(recette), [...alertesDePalette(recette, jaune).map((alerte) => alerte.code), 'fond-hors-courbe']);
  assert.ok(codes(recette).includes('reference-plus-vive'));
});

test('une palette proche d’une autre porte l’alerte, et les fonds hors de la courbe la leur', () => {
  const recette = { ...avec(BLEU, VOISIN), fonds: { light: '#EEEEEE', dark: '#121212' } };
  assert.ok(codes(recette).includes('palettes-proches'), codes(recette).join(', '));
  assert.ok(codes(recette).includes('fond-hors-courbe'), codes(recette).join(', '));
});

test('[MOT-17] l’analyse porte la part de la référence, celles des profils, et l’ancrage du moteur', () => {
  const analyse = analyserPalette(avec(BLEU), BLEU);
  assert.deepEqual(analyse.parts, { soft: 0.45, vivid: 0.95 });
  assert.deepEqual(analyse.ancrage, ancrageDe(avec(BLEU), BLEU));
  assert.deepEqual(analyse.ancrage.crans, { light: 600, dark: 600 });
  assert.deepEqual(analyse.rampes, rampesDe(avec(BLEU), BLEU));
  assert.ok(analyse.part > 0.8 && analyse.part < 0.95);
});
