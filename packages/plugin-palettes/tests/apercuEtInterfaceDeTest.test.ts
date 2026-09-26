/** La sélection d'une nuance dans l'aperçu ([UI-04]) et les couleurs de l'interface de test ([UI-14]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { ajouter, nouvellePalette } from '../src/edition';
import { couleursDeLInterface } from '../src/ui/interfaceDeTest';
import { memeChoix, type Choix } from '../src/ui/nuancier';

const VIDE = recetteParDefaut();
const BLEU = nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!;
const RECETTE = ajouter(VIDE, BLEU);
const ANALYSE = analyserPalette(RECETTE, BLEU);

test('[UI-04] le même clic sur la même nuance la relâche ; une autre nuance, un autre profil ou on-solid la remplacent', () => {
  const vivid600: Choix = { nature: 'nuance', profil: 'vivid', rang: 6, numero: 600 };
  assert.equal(memeChoix(vivid600, { ...vivid600 }), true);
  assert.equal(memeChoix(vivid600, { ...vivid600, profil: 'soft' }), false);
  assert.equal(memeChoix(vivid600, { ...vivid600, rang: 7, numero: 700 }), false);
  assert.equal(memeChoix(vivid600, { nature: 'fond' }), false);
  assert.equal(memeChoix({ nature: 'fond' }, { nature: 'fond' }), true);
  assert.equal(memeChoix(null, vivid600), false, 'sans choix, un clic choisit');
});

test('[UI-14] chaque élément de l’interface de test prend la nuance de son emploi et de son état, dans le profil porteur et le thème montré', () => {
  for (const mode of ['light', 'dark'] as const) {
    const couleurs = couleursDeLInterface(RECETTE, ANALYSE, mode);
    const rampe = ANALYSE.rampes[ANALYSE.ancrage.profil]![mode];
    const nuance = (numero: number) => rampe[ANALYSE.grille.crans.indexOf(numero)].hexa;
    assert.equal(couleurs.fond, RECETTE.fonds[mode], 'on-solid : le fond du thème');
    assert.deepEqual([0, 1, 2].map((etat) => couleurs.emploi('solid', etat as 0 | 1 | 2)), [nuance(700), nuance(800), nuance(900)]);
    assert.deepEqual([0, 1, 2].map((etat) => couleurs.emploi('surface', etat as 0 | 1 | 2)), [nuance(100), nuance(200), nuance(300)]);
    assert.equal(couleurs.emploi('text', 0), nuance(700));
    assert.equal(couleurs.emploi('focus', 0), nuance(600));
    assert.equal(couleurs.emploi('border-control', 1), nuance(700));
    assert.equal(couleurs.emploi('border-decorative', 0), nuance(300));
  }
});
