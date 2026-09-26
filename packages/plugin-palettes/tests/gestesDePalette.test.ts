/** Créer, dupliquer, réordonner et supprimer une palette ([ENT-03], D-K). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { MOTIF_IDENTIFIANT, recetteParDefaut, validerRecette, type Recette } from 'ucm-couleur';

import { ajouter, deplacer, dupliquer, nouvelIdentifiant, nouvellePalette, supprimer } from '../src/edition';

const VIDE = recetteParDefaut();

function avecTrois(): Recette {
  let recette = VIDE;
  for (const [id, hexa] of [['p-0000000a', '#1E6FD9'], ['p-0000000b', '#F2A900'], ['p-0000000c', '#16A34A']]) {
    recette = ajouter(recette, nouvellePalette(recette, id, hexa, 2)!);
  }
  return recette;
}
const ids = (recette: Recette) => recette.palettes.map((palette) => palette.id);

test('D-K : un identifiant neuf a la forme p- et huit chiffres hexadécimaux, et n’en répète aucun', () => {
  const tirages = [0x0000000a, 0x0000000a, 0x0000000b, 0xdeadbeef];
  const tirer = () => tirages.shift()!;
  const recette = avecTrois();
  const id = nouvelIdentifiant(recette, tirer);
  assert.equal(id, 'p-deadbeef');
  assert.match(id, MOTIF_IDENTIFIANT);
});

test('[ENT-03] une palette créée est valide, au préréglage Tailwind, profils liés', () => {
  const palette = nouvellePalette(VIDE, 'p-0000000a', '1e6fd9', 2)!;
  assert.equal(palette.reference, '#1E6FD9');
  assert.equal(palette.derive.lien, true);
  assert.equal(palette.derive.soft.origine, 'tailwind');
  assert.ok('recette' in validerRecette(ajouter(VIDE, palette)));
  assert.equal(nouvellePalette(VIDE, 'p-0000000a', '#12', 2), null);
});

test('[ENT-03] une copie se place juste après sa palette, sous un autre identifiant et un autre nom', () => {
  const recette = dupliquer(avecTrois(), 'p-0000000a', 'p-0000000d', 'Bleu (copie)');
  assert.deepEqual(ids(recette), ['p-0000000a', 'p-0000000d', 'p-0000000b', 'p-0000000c']);
  assert.equal(recette.palettes[1].nom, 'Bleu (copie)');
  assert.equal(recette.palettes[1].reference, '#1E6FD9');
  assert.ok('recette' in validerRecette(recette));
});

test('[ENT-03] monter et descendre échangent avec la voisine, et ne font rien aux bouts', () => {
  const recette = avecTrois();
  assert.deepEqual(ids(deplacer(recette, 'p-0000000b', -1)), ['p-0000000b', 'p-0000000a', 'p-0000000c']);
  assert.deepEqual(ids(deplacer(recette, 'p-0000000b', 1)), ['p-0000000a', 'p-0000000c', 'p-0000000b']);
  assert.equal(deplacer(recette, 'p-0000000a', -1), recette);
  assert.equal(deplacer(recette, 'p-0000000c', 1), recette);
});

test('[ENT-03] supprimer retire la palette et garde l’ordre des autres', () => {
  assert.deepEqual(ids(supprimer(avecTrois(), 'p-0000000b')), ['p-0000000a', 'p-0000000c']);
});
