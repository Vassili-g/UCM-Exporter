/** La lecture de la recette rangée et du profil du document ([REC-01], [REC-03]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, jsonCanonique, recetteParDefaut } from 'ucm-couleur';

import { empreinteDuTexte, lireEtat } from '../src/lecture';
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
