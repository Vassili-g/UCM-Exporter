/** Le rangement de la recette ([REC-01], [REC-04], [REC-06], [REC-10]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCanonique, recetteParDefaut } from 'ucm-couleur';

import { rangerRecette } from '../src/ecriture/recette';
import { empreinteDuTexte } from '../src/lecture';
import { documentDeTest } from './document';

const RECETTE = recetteParDefaut();
const AUTRE = { ...RECETTE, seuils: { ...RECETTE.seuils, texte: 7 } };

test('[REC-01] une recette valide se range en JSON canonique, puis commitUndo', () => {
  const document = documentDeTest();
  const texte = jsonCanonique(RECETTE);
  assert.deepEqual(rangerRecette(document, RECETTE, null), { issue: 'rangee', empreinte: empreinteDuTexte(texte) });
  assert.equal(document.donnees.get('ucm_palettes/recette'), texte);
  assert.deepEqual(document.annulations, ['ecrire ucm_palettes/recette', 'commitUndo']);
});

test('[REC-10] une recette rangée ailleurs depuis la lecture refuse le rangement', () => {
  const ailleurs = jsonCanonique(AUTRE);
  const document = documentDeTest(ailleurs);
  assert.deepEqual(rangerRecette(document, RECETTE, empreinteDuTexte(jsonCanonique(RECETTE))), { issue: 'modifiee-ailleurs' });
  assert.deepEqual(rangerRecette(document, RECETTE, null), { issue: 'modifiee-ailleurs' });
  assert.equal(document.donnees.get('ucm_palettes/recette'), ailleurs);
  assert.deepEqual(document.annulations, []);
});

test('[REC-10] l’empreinte lue de la recette rangée autorise le rangement', () => {
  const avant = jsonCanonique(RECETTE);
  const document = documentDeTest(avant);
  assert.equal(rangerRecette(document, AUTRE, empreinteDuTexte(avant)).issue, 'rangee');
  assert.equal(document.donnees.get('ucm_palettes/recette'), jsonCanonique(AUTRE));
});

test('[REC-04] une recette invalide n’écrit rien', () => {
  const document = documentDeTest();
  const issue = rangerRecette(document, { ...RECETTE, crans: [50] }, null);
  assert.ok(issue.issue === 'invalide' && issue.refus.length > 0);
  assert.equal(document.donnees.size, 0);
  assert.deepEqual(document.annulations, []);
});
