/**
 * Les bornes de la fenêtre du plugin (U1.10).
 *
 * `figma.ui.resize` accepte tout au-dessus de 70 × 0 : la plateforme ne protège
 * donc pas d'une fenêtre où plus aucun libellé ne tient. La seule protection
 * est `tailleValide`, et elle est la SEULE — la poignée de l'UI envoie ce que
 * le pointeur dit, sans rien borner. Ce test tient cette responsabilité,
 * puisqu'elle n'est écrite qu'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { TAILLE_MINIMALE, TAILLE_PAR_DEFAUT, tailleValide } from '../src/fenetre';

test('une taille confortable passe telle quelle', () => {
  assert.deepEqual(tailleValide({ largeur: 520, hauteur: 640 }), { largeur: 520, hauteur: 640 });
});

test('une fenêtre plus petite que le minimum lisible est remontée au minimum', () => {
  assert.deepEqual(tailleValide({ largeur: 70, hauteur: 0 }), TAILLE_MINIMALE);
});

test('chaque dimension est bornée pour elle-même', () => {
  assert.deepEqual(tailleValide({ largeur: 900, hauteur: 100 }), {
    largeur: 900,
    hauteur: TAILLE_MINIMALE.hauteur,
  });
});

test('une taille fractionnaire est arrondie : un pointeur ne rend pas des entiers', () => {
  assert.deepEqual(tailleValide({ largeur: 480.4, hauteur: 500.6 }), {
    largeur: 480,
    hauteur: 501,
  });
});

test('ce qui n’est pas un nombre retombe sur la taille par défaut', () => {
  assert.deepEqual(tailleValide(undefined), TAILLE_PAR_DEFAUT);
  assert.deepEqual(tailleValide(null), TAILLE_PAR_DEFAUT);
  assert.deepEqual(tailleValide({}), TAILLE_PAR_DEFAUT);
  assert.deepEqual(
    tailleValide({ largeur: Number.NaN, hauteur: Number.POSITIVE_INFINITY }),
    TAILLE_PAR_DEFAUT,
  );
  assert.deepEqual(tailleValide({ largeur: '600' } as unknown as { largeur: number }), {
    largeur: TAILLE_PAR_DEFAUT.largeur,
    hauteur: TAILLE_PAR_DEFAUT.hauteur,
  });
});

test('le minimum du plugin est au-dessus de celui que la plateforme impose', () => {
  // 70 × 0 est la borne de `figma.ui.resize` ; elle ne dit rien de lisible.
  assert.ok(TAILLE_MINIMALE.largeur > 70);
  assert.ok(TAILLE_MINIMALE.hauteur > 0);
  assert.ok(TAILLE_PAR_DEFAUT.largeur >= TAILLE_MINIMALE.largeur);
  assert.ok(TAILLE_PAR_DEFAUT.hauteur >= TAILLE_MINIMALE.hauteur);
});
