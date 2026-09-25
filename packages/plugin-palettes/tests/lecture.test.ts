/** La lecture de la recette rangée, du profil du document et de la peinture d'un calque ([REC-01], [REC-03], [ENT-04]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, jsonCanonique, recetteParDefaut, rgb8VersP3 } from 'ucm-couleur';

import { couleurDeLaSelection, empreinteDuTexte, lireEtat } from '../src/lecture';
import { documentDeTest } from './document';

test('[REC-03] sans recette rangée, la recette par défaut est proposée, sans empreinte', () => {
  const etat = lireEtat(documentDeTest().root);
  assert.deepEqual(etat.classement, { etat: 'absente', recette: recetteParDefaut() });
  assert.equal(etat.empreinte, null);
});

test('[REC-01] la recette se lit sous la clé partagée ucm_palettes/recette', () => {
  const texte = jsonCanonique(recetteParDefaut());
  const etat = lireEtat(documentDeTest(texte).root);
  assert.equal(etat.classement.etat, 'courante');
  assert.equal(etat.empreinte, empreinteDuTexte(texte));
  assert.match(etat.empreinte ?? '', /^[0-9a-f]{8}$/);
});

test('[REC-03] une recette future ou illisible se classe, et son empreinte reste lue', () => {
  const future = JSON.stringify({ ...recetteParDefaut(), formatVersion: FORMAT_RECETTE + 1 });
  assert.equal(lireEtat(documentDeTest(future).root).classement.etat, 'future');
  const illisible = lireEtat(documentDeTest('{pas du json').root);
  assert.equal(illisible.classement.etat, 'illisible');
  assert.equal(illisible.empreinte, empreinteDuTexte('{pas du json'));
});

test('le profil de couleur du document accompagne l’état', () => {
  assert.equal(lireEtat(documentDeTest('', 'DISPLAY_P3').root).profil, 'DISPLAY_P3');
});

const uni = (r: number, g: number, b: number, reste: Record<string, unknown> = {}) =>
  ({ type: 'SOLID', visible: true, opacity: 1, color: { r, g, b }, ...reste });

test('[ENT-04] la sélection propose la première peinture unie, visible et opaque', () => {
  const noeuds = [
    { fills: [] },
    { fills: [uni(1, 0, 0, { visible: false }), uni(0, 1, 0, { opacity: 0.5 }), uni(30 / 255, 111 / 255, 217 / 255)] },
  ];
  assert.deepEqual(couleurDeLaSelection(noeuds, 'SRGB'), { hexa: '#1E6FD9', ramenee: false });
});

test('[ENT-04] une sélection vide, ou sans peinture unie, dit pourquoi elle ne propose rien', () => {
  assert.deepEqual(couleurDeLaSelection([], 'SRGB'), { raison: 'vide' });
  const degrade = { type: 'GRADIENT_LINEAR', visible: true, opacity: 1 };
  // `figma.mixed` n'est pas un tableau : un texte aux remplissages mêlés ne propose rien.
  assert.deepEqual(couleurDeLaSelection([{ fills: [degrade] }, { fills: Symbol('mixed') }, {}], 'SRGB'), { raison: 'sans-remplissage-uni' });
});

test('E10 : dans un document Display P3, la couleur passe en sRGB, et une couleur hors gamut est ramenée', () => {
  const dansSrgb = rgb8VersP3([30, 111, 217]);
  assert.deepEqual(couleurDeLaSelection([{ fills: [uni(...dansSrgb)] }], 'DISPLAY_P3'), { hexa: '#1E6FD9', ramenee: false });
  const lue = couleurDeLaSelection([{ fills: [uni(1, 0, 0)] }], 'DISPLAY_P3');
  assert.ok('hexa' in lue && lue.ramenee, JSON.stringify(lue));
  assert.equal('hexa' in lue && lue.hexa, '#FF0000');
});
