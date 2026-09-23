/** Ce que la configuration de la recette modifie (section 8.3, [ENT-07], [ENT-10]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Recette } from 'ucm-couleur';

import { lireNombre, palettesModifiees, poserValeur, valeurDe } from '../src/configuration';
import { ajouter, nouvellePalette } from '../src/edition';
import { constatDeGarantie, palettesTouchees } from '../src/ui/textes';

const DEFAUT = recetteParDefaut();

test('DER-08 : un nombre se saisit à virgule ou à point, et une saisie inachevée n’en est pas un', () => {
  assert.equal(lireNombre('0,56'), 0.56);
  assert.equal(lireNombre(' 0.56 '), 0.56);
  assert.equal(lireNombre('1'), 1);
  for (const saisie of ['0,', ',5', '0,5,6', 'a', '']) assert.equal(lireNombre(saisie), null, saisie);
});

test('chaque champ pose sa valeur à sa place, et la relit', () => {
  const champs = [{ courbe: 'light' as const, rang: 7 }, { part: 'soft' as const }, { seuil: 'profilsConfondus' as const }];
  for (const champ of champs) {
    const suivante = poserValeur(DEFAUT, champ, 0.123);
    assert.equal(valeurDe(suivante, champ), 0.123, JSON.stringify(champ));
    assert.notEqual(valeurDe(DEFAUT, champ), 0.123, 'la recette de départ reste intacte');
  }
  assert.deepEqual(poserValeur(DEFAUT, champs[0], 0.123).courbes.dark, DEFAUT.courbes.dark);
});

test('[ENT-07] une courbe touche toutes les palettes, une part épargne les parts propres, le seuil les grises', () => {
  let recette: Recette = DEFAUT;
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000a', '#1E6FD9')!);
  recette = ajouter(recette, { ...nouvellePalette(recette, 'p-0000000b', '#FACC15')!, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } });
  recette = ajouter(recette, nouvellePalette(recette, 'p-0000000c', '#6B7280')!);
  assert.equal(recette.palettes[2].parts?.origine, 'grise');
  assert.deepEqual(
    [palettesModifiees(recette, 'courbes'), palettesModifiees(recette, 'parts'), palettesModifiees(recette, 'profilsConfondus')],
    [3, 1, 2],
  );
  assert.deepEqual([palettesTouchees(0), palettesTouchees(1), palettesTouchees(3)], ['aucune palette touchée', '1 palette touchée', '3 palettes touchées']);
});

test('[ENT-10] une courbe hors garantie nomme le cran, le mode, le profil, la teinte et le contraste', () => {
  const constat = constatDeGarantie({ mode: 'light', cran: 700, profil: 'soft', teinte: 147, contraste: 4.189, seuil: 4.5 });
  assert.equal(constat.ou, 'Courbe claire, cran 700, soft');
  assert.equal(constat.quoi, 'Contre le cran 50, le contraste descend à 4,18 à la teinte 147°, pour 4,5 garanti.');
  assert.ok(constat.geste.includes('cran 700'));
});
