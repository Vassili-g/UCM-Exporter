/** Ce qu'une saisie fait à une palette, avant tout rangement ([ENT-01], [ENT-09]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { boutsDe, lireHexa, prereglageTailwind, recetteParDefaut, rgb8VersOklch, type Palette } from 'ucm-couleur';

import { changerReference, poserPart, remplacerPalette, renommer, reprendreLesParts } from '../src/edition';

const RECETTE = recetteParDefaut();
const prereglage = (hexa: string) => prereglageTailwind(rgb8VersOklch(lireHexa(hexa)!), boutsDe(RECETTE.courbes));

const PALETTE: Palette = {
  id: 'p-0000000a',
  nom: 'Bleu',
  reference: '#1E6FD9',
  derive: {
    lien: false,
    soft: { ...prereglage('#1E6FD9'), origine: 'tailwind' },
    vivid: { clair: 6, sombre: -35, origine: 'libre' },
  },
};

test('[ENT-01] une dérive Tailwind suit la nouvelle référence, une dérive libre reste', () => {
  const suivante = changerReference(RECETTE, PALETTE, '#f2a900')!;
  assert.equal(suivante.reference, '#F2A900');
  assert.deepEqual(suivante.derive.soft, { ...prereglage('#F2A900'), origine: 'tailwind' });
  assert.deepEqual(suivante.derive.vivid, PALETTE.derive.vivid);
});

test('un hexa sans dièse se lit, un hexa incomplet se refuse', () => {
  assert.equal(changerReference(RECETTE, PALETTE, '7c3aed')?.reference, '#7C3AED');
  assert.equal(changerReference(RECETTE, PALETTE, '#7C3AE'), null);
  assert.equal(changerReference(RECETTE, PALETTE, 'bleu'), null);
});

test('[ENT-09] une référence presque grise pose des parts grises, une référence colorée les retire', () => {
  const grise = changerReference(RECETTE, PALETTE, '#6B7280')!;
  assert.equal(grise.parts?.origine, 'grise');
  assert.equal(changerReference(RECETTE, grise, '#1E6FD9')!.parts, undefined);
});

test('un nom vide retire la clé : la palette s’affiche sous son hexa', () => {
  assert.equal(renommer(PALETTE, 'Marine').nom, 'Marine');
  assert.ok(!('nom' in renommer(PALETTE, '  ')));
});

test('remplacer une palette garde les autres et leur ordre', () => {
  const autre: Palette = { ...PALETTE, id: 'p-0000000b', nom: 'Autre' };
  const recette = { ...RECETTE, palettes: [PALETTE, autre] };
  const suivante = remplacerPalette(recette, renommer(PALETTE, 'Marine'));
  assert.deepEqual(suivante.palettes.map((palette) => palette.nom), ['Marine', 'Autre']);
});

test('[ENT-09] E3 : une part propre se pose au millième, passe les parts au designer, et l’autre profil garde la sienne', () => {
  const posee = poserPart(RECETTE, PALETTE, 'soft', 0.61234);
  assert.deepEqual(posee.parts, { soft: 0.612, vivid: RECETTE.profils.vivid.part, origine: 'designer' });
  assert.deepEqual(poserPart(RECETTE, posee, 'vivid', 0.8).parts, { soft: 0.612, vivid: 0.8, origine: 'designer' });
});

test('[ENT-09] reprendre les parts de la recette retire les parts du designer, et remet les parts grises d’une référence grise', () => {
  assert.equal(reprendreLesParts(RECETTE, poserPart(RECETTE, PALETTE, 'soft', 0.6)).parts, undefined);
  const grise = changerReference(RECETTE, PALETTE, '#6B7280')!;
  assert.equal(reprendreLesParts(RECETTE, poserPart(RECETTE, grise, 'vivid', 0.5)).parts?.origine, 'grise');
});
