/** Régler une dérive : un bout, un préréglage, le lien des profils ([DER-07], [DER-11], [DER-12], [MOT-27]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette } from 'ucm-couleur';

import { appliquerPrereglage, lierLesProfils, nouvellePalette, origineDe, prereglageDe, reglerBout } from '../src/edition';

const RECETTE = recetteParDefaut();
const BLEU = nouvellePalette(RECETTE, 'p-0000000a', '#1E6FD9', 2)!;
const TAILWIND = prereglageDe(RECETTE, BLEU);
const DELIEE: Palette = lierLesProfils(BLEU, false);

test('[DER-07] régler un bout de profils liés change les deux profils, et l’origine devient libre', () => {
  const suivante = reglerBout(RECETTE, BLEU, 'vivid', 'clair', 12);
  assert.deepEqual(suivante.derive.soft, { clair: 12, sombre: TAILWIND.sombre, origine: 'libre' });
  assert.deepEqual(suivante.derive.vivid, suivante.derive.soft);
  assert.equal(suivante.derive.lien, true);
});

test('[DER-12] régler un profil délié ne touche pas l’autre', () => {
  const suivante = reglerBout(RECETTE, DELIEE, 'soft', 'sombre', -20);
  assert.equal(suivante.derive.soft.sombre, -20);
  assert.deepEqual(suivante.derive.vivid, BLEU.derive.vivid);
});

test('[MOT-27] un angle se range au centième, borné à ±90°, sans zéro négatif', () => {
  assert.equal(reglerBout(RECETTE, BLEU, 'vivid', 'clair', 12.3456).derive.vivid.clair, 12.35);
  assert.equal(reglerBout(RECETTE, BLEU, 'vivid', 'clair', 140).derive.vivid.clair, 90);
  assert.equal(reglerBout(RECETTE, BLEU, 'vivid', 'clair', -140).derive.vivid.clair, -90);
  assert.ok(Object.is(reglerBout(RECETTE, BLEU, 'vivid', 'clair', -0.001).derive.vivid.clair, 0));
});

test('[DER-11] revenir aux valeurs du préréglage rend l’origine tailwind, à zéro constante', () => {
  const libre = reglerBout(RECETTE, BLEU, 'vivid', 'clair', 12);
  assert.equal(reglerBout(RECETTE, libre, 'vivid', 'clair', TAILWIND.clair).derive.vivid.origine, 'tailwind');
  assert.equal(origineDe(RECETTE, BLEU, { clair: 0, sombre: 0 }), 'constante');
  assert.equal(origineDe(RECETTE, BLEU, { clair: 1, sombre: 0 }), 'libre');
});

test('[DER-11] un préréglage remplace les deux angles du profil affiché, ou des deux profils liés', () => {
  const constante = appliquerPrereglage(RECETTE, BLEU, 'vivid', 'constante');
  assert.deepEqual(constante.derive.soft, { clair: 0, sombre: 0, origine: 'constante' });
  assert.deepEqual(constante.derive.vivid, constante.derive.soft);
  const seulSoft = appliquerPrereglage(RECETTE, reglerBout(RECETTE, DELIEE, 'soft', 'clair', 30), 'soft', 'tailwind');
  assert.deepEqual(seulSoft.derive.soft, { ...TAILWIND, origine: 'tailwind' });
});

test('[DER-12] délier garde les deux dérives, lier aligne soft sur vivid', () => {
  assert.deepEqual(DELIEE.derive.soft, BLEU.derive.soft);
  const ecartees = reglerBout(RECETTE, DELIEE, 'vivid', 'clair', 30);
  const reliee = lierLesProfils(ecartees, true);
  assert.equal(reliee.derive.lien, true);
  assert.deepEqual(reliee.derive.soft, ecartees.derive.vivid);
});
