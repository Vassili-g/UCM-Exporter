/** Les bornes et la clé de la fenêtre d'UCM Palettes ([UI-01]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLE_DE_LA_FENETRE, TAILLE_MINIMALE, TAILLE_PAR_DEFAUT, tailleValide } from '../src/fenetre';

test('la fenêtre s’ouvre à 600 × 720 et ne descend pas sous 440 × 520', () => {
  assert.deepEqual(TAILLE_PAR_DEFAUT, { largeur: 600, hauteur: 720 });
  assert.deepEqual(TAILLE_MINIMALE, { largeur: 440, hauteur: 520 });
  assert.deepEqual(tailleValide({ largeur: 100, hauteur: 100 }), TAILLE_MINIMALE);
  assert.deepEqual(tailleValide(undefined), TAILLE_PAR_DEFAUT);
});

test('la taille se range sous une clé propre au plugin', () => {
  // `tailleFenetre` est la clé d'UCM Exporter.
  assert.notEqual(CLE_DE_LA_FENETRE, 'tailleFenetre');
  assert.match(CLE_DE_LA_FENETRE, /palettes/);
});
