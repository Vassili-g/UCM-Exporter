/** La garantie des courbes ([ENT-10]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { garantieDesCourbes, recetteParDefaut, type Recette } from '../src/index';

const DEFAUT = recetteParDefaut();
function avecClarte(mode: 'light' | 'dark', rang: number, clarte: number): Recette {
  const courbe = [...DEFAUT.courbes[mode]];
  courbe[rang] = clarte;
  return { ...DEFAUT, courbes: { ...DEFAUT.courbes, [mode]: courbe } };
}
const decrire = (recette: Recette) => garantieDesCourbes(recette).map(({ mode, cran, profil }) => `${mode} ${cran} ${profil}`);

test('[ENT-10] les courbes par défaut tiennent la garantie', () => {
  assert.deepEqual(garantieDesCourbes(DEFAUT), []);
});

test('[ENT-10] un cran 700 clair remonté à 0,56 ne tient plus 4,5 contre le cran 50', () => {
  const manques = garantieDesCourbes(avecClarte('light', 7, 0.56));
  assert.deepEqual(manques.map(({ mode, cran, profil }) => `${mode} ${cran} ${profil}`), ['light 700 soft', 'light 700 vivid']);
  for (const manque of manques) {
    assert.equal(manque.seuil, 4.5);
    assert.ok(manque.contraste < 4.5);
    assert.ok(Number.isInteger(manque.teinte) && manque.teinte >= 0 && manque.teinte < 360);
  }
});

test('[ENT-10] un cran 600 sombre descendu vers le fond ne tient plus 3', () => {
  assert.deepEqual(decrire(avecClarte('dark', 6, 0.5)), ['dark 600 soft', 'dark 600 vivid']);
  assert.equal(garantieDesCourbes(avecClarte('dark', 6, 0.5))[0].seuil, 3);
});

test('[ENT-10] la teinte du pire cas est celle du plus petit contraste sur le cercle', () => {
  const [manque] = garantieDesCourbes(avecClarte('light', 7, 0.56));
  // Le jaune et le vert clairs contrastent le moins avec un gris clair à clarté égale.
  assert.ok(manque.teinte > 60 && manque.teinte < 160, String(manque.teinte));
});
