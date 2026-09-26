/** Les bornes et la clé de la fenêtre d'UCM Palettes ([UI-01]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLE_DE_LA_FENETRE, TAILLE_MINIMALE, TAILLE_PAR_DEFAUT, tailleALOuverture, tailleValide } from '../src/fenetre';

test('la fenêtre s’ouvre à 750 × 720 et ne descend pas sous 500 × 520', () => {
  assert.deepEqual(TAILLE_PAR_DEFAUT, { largeur: 750, hauteur: 720 });
  assert.deepEqual(TAILLE_MINIMALE, { largeur: 500, hauteur: 520 });
  assert.deepEqual(tailleValide({ largeur: 100, hauteur: 100 }), TAILLE_MINIMALE);
  assert.deepEqual(tailleValide(undefined), TAILLE_PAR_DEFAUT);
  // Une taille rangée plus étroite, d'avant la borne de 500 px, s'ouvre à 500 px.
  assert.deepEqual(tailleValide({ largeur: 440, hauteur: 600 }), { largeur: 500, hauteur: 600 });
});

test('une taille rangée à un ancien défaut, 600 × 720 ou 650 × 720, s’ouvre à 750 × 720 ; toute autre taille rangée se garde', () => {
  assert.deepEqual(tailleALOuverture({ largeur: 600, hauteur: 720 }), { largeur: 750, hauteur: 720 });
  assert.deepEqual(tailleALOuverture({ largeur: 650, hauteur: 720 }), { largeur: 750, hauteur: 720 });
  assert.deepEqual(tailleALOuverture({ largeur: 600, hauteur: 721 }), { largeur: 600, hauteur: 721 });
  assert.deepEqual(tailleALOuverture({ largeur: 700, hauteur: 720 }), { largeur: 700, hauteur: 720 });
});

test('la taille se range sous une clé propre au plugin', () => {
  // `tailleFenetre` est la clé d'UCM Exporter.
  assert.notEqual(CLE_DE_LA_FENETRE, 'tailleFenetre');
  assert.match(CLE_DE_LA_FENETRE, /palettes/);
});
