/** La géométrie du graphe de dérive ([DER-01], [DER-07], [DER-14], [ARC-08]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { boutsDe, lireHexa, recetteParDefaut, rgb8VersOklch } from 'ucm-couleur';

import {
  REPERES,
  abscisse,
  angleDe,
  angleDuGlisser,
  deriveDuCran,
  ligneBrisee,
  ordonnee,
  rangDuPivot,
  type Cadre,
} from '../src/ui/derive/geometrie';

const CADRE: Cadre = { largeur: 340, hauteur: 200, gauche: 42, droite: 0, haut: 10, bas: 10 };
const COURBE = recetteParDefaut().courbes.light;
const BOUTS = boutsDe(recetteParDefaut().courbes);
const BLEU = rgb8VersOklch(lireHexa('#1E6FD9')!);
const DERIVE = { clair: -7.53, sombre: 5.11 };

test('[DER-01] onze colonnes régulières, du bout clair à gauche au bout sombre à droite', () => {
  // (340 - 42) / 11 : une colonne de 27,09 px, au-dessus des 24 px de [DER-16].
  assert.ok((340 - 42) / 11 >= 24);
  assert.equal(abscisse(0, CADRE, 11), 42 + 298 / 22);
  const pas = abscisse(1, CADRE, 11) - abscisse(0, CADRE, 11);
  for (let rang = 1; rang < 11; rang += 1) {
    assert.ok(Math.abs(abscisse(rang, CADRE, 11) - abscisse(rang - 1, CADRE, 11) - pas) < 1e-9);
  }
});

test('[DER-01] +90° en haut, 0° au milieu, -90° en bas, et des repères tous les 15°', () => {
  assert.equal(ordonnee(90, CADRE), 10);
  assert.equal(ordonnee(0, CADRE), 100);
  assert.equal(ordonnee(-90, CADRE), 190);
  assert.deepEqual(REPERES, [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90]);
});

test('une ordonnée rend son angle, borné à ±90°', () => {
  for (const angle of [-90, -37.5, 0, 12.25, 90]) assert.ok(Math.abs(angleDe(ordonnee(angle, CADRE), CADRE) - angle) < 1e-9);
  assert.equal(angleDe(-50, CADRE), 90);
  assert.equal(angleDe(400, CADRE), -90);
});

test('[DER-07] un glisser rend un angle au degré près, aux 5° avec Maj', () => {
  const y = ordonnee(12.4, CADRE);
  assert.equal(angleDuGlisser(y, CADRE, 1), 12);
  assert.equal(angleDuGlisser(y, CADRE, 5), 10);
  assert.ok(Object.is(angleDuGlisser(ordonnee(-0.2, CADRE), CADRE, 1), 0), 'zéro sans signe');
});

test('[DER-01] le pivot se place entre les deux crans qui encadrent sa clarté', () => {
  // #1E6FD9 a une clarté de 0,555, entre 0,585 au 600 (rang 6) et 0,5 au 700 (rang 7).
  const rang = rangDuPivot(BLEU.L, COURBE)!;
  assert.ok(rang > 6 && rang < 7, String(rang));
  assert.ok(Math.abs(rang - (6 + (0.585 - BLEU.L) / 0.085)) < 1e-9);
});

test('[DER-14] une référence hors de la courbe claire n’a pas de pivot sur le graphe', () => {
  assert.equal(rangDuPivot(0.99, COURBE), null);
  assert.equal(rangDuPivot(0.2, COURBE), null);
});

test('[DER-01] la ligne brisée passe par la dérive de chaque cran et par le pivot à 0°', () => {
  const ligne = ligneBrisee(COURBE, BLEU, DERIVE, BOUTS);
  assert.equal(ligne.length, 12);
  assert.deepEqual(ligne.map((sommet) => sommet.rang), [...ligne.map((sommet) => sommet.rang)].sort((a, b) => a - b));
  // Aux bouts, la dérive entière du bout ; au pivot, aucune.
  assert.ok(Math.abs(ligne[0].angle - DERIVE.clair) < 1e-9);
  assert.ok(Math.abs(ligne[11].angle - DERIVE.sombre) < 1e-9);
  assert.equal(ligne.find((sommet) => !Number.isInteger(sommet.rang))?.angle, 0);
  assert.ok(Math.abs(deriveDuCran(COURBE[3], BLEU, DERIVE, BOUTS)) < Math.abs(DERIVE.clair));
});
