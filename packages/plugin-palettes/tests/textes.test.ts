/** Les textes provisoires des bloquants de lecture et des refus de validation. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, classerRecette, recetteParDefaut } from 'ucm-couleur';

import { nommerChamp, recetteFuture, recetteIllisible, texteDuRefus } from '../src/ui/textes';

test('un chemin de champ s’écrit en mots du designer', () => {
  assert.equal(nommerChamp('crans[3]'), '4ᵉ cran');
  assert.equal(nommerChamp('crans[0]'), '1ᵉʳ cran');
  assert.equal(nommerChamp('courbes.light[5]'), 'Courbe claire, 6ᵉ cran');
  assert.equal(nommerChamp('fonds.dark'), 'Fond sombre');
  assert.equal(nommerChamp('palettes[1].derive.soft.clair'), 'Palette 2, dérive, soft, bout clair');
  assert.equal(nommerChamp(''), 'La recette');
});

test('un refus porte le champ et la valeur, virgule décimale', () => {
  assert.equal(
    texteDuRefus({ regle: 'courbe-claire-decroissante', chemin: 'courbes.light[5]', valeur: 0.8 }),
    'Courbe claire, 6ᵉ cran : 0,8 ne descend pas depuis le cran précédent.',
  );
});

test('une recette illisible compte ses champs invalides et nomme le premier', () => {
  const recette = recetteParDefaut();
  const light = [...recette.courbes.light];
  light[5] = 0.8;
  const cassee = { ...recette, courbes: { ...recette.courbes, light }, fonds: { ...recette.fonds, dark: '#12121' } };
  const classement = classerRecette(JSON.stringify(cassee));
  assert.ok(classement.etat === 'illisible');
  const constat = recetteIllisible(classement.refus);
  assert.equal(constat.ou, 'Recette du fichier');
  assert.match(constat.quoi, /^2 champs sont invalides ; le premier : Courbe claire, 6ᵉ cran/);
  assert.ok(constat.geste.length > 0);
});

test('une recette future nomme sa version et celle que le plugin lit', () => {
  const constat = recetteFuture(FORMAT_RECETTE + 1);
  assert.equal(constat.ou, `Recette du fichier, version ${FORMAT_RECETTE + 1}`);
  assert.ok(constat.quoi.includes(`version ${FORMAT_RECETTE}`));
});
