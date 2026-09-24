/** L'import d'une recette et son écart avec la recette du fichier ([REC-08], [REC-03]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FORMAT_RECETTE, jsonCanonique, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette, renommer } from '../src/edition';
import { ecartDImport, lireLImport } from '../src/importation';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9')!, nom: 'Bleu' };
const AMBRE = { ...nouvellePalette(VIDE, 'p-0000000b', '#F2A900')!, nom: 'Ambre' };
const VERT = { ...nouvellePalette(VIDE, 'p-0000000c', '#16A34A')!, nom: 'Vert' };
const ACTUELLE: Recette = [BLEU, AMBRE].reduce(ajouter, VIDE);

test('[REC-08] l’écart nomme les palettes ajoutées, retirées et modifiées, par identifiant, et les paramètres communs changés', () => {
  const importee: Recette = {
    ...ACTUELLE,
    fonds: { ...ACTUELLE.fonds, dark: '#1C1C1C' },
    seuils: { ...ACTUELLE.seuils, texte: 7 },
    palettes: [renommer(AMBRE, 'Or'), VERT],
  };
  const ecart = ecartDImport(ACTUELLE, importee);
  assert.deepEqual(ecart.ajoutees.map(({ id }) => id), [VERT.id]);
  assert.deepEqual(ecart.retirees.map(({ id }) => id), [BLEU.id]);
  assert.deepEqual(ecart.modifiees.map(({ nom }) => nom), ['Or']);
  assert.deepEqual(ecart.parametres, ['fonds', 'seuils']);
});

test('[REC-08] une palette déplacée mais identique n’est pas modifiée ; une recette identique n’a aucun écart', () => {
  const ecart = ecartDImport(ACTUELLE, { ...ACTUELLE, palettes: [AMBRE, BLEU] });
  assert.deepEqual(ecart, { ajoutees: [], retirees: [], modifiees: [], parametres: [] });
});

test('[REC-11] sans recette lisible dans le fichier, tout l’import est un ajout', () => {
  const ecart = ecartDImport(null, ACTUELLE);
  assert.deepEqual(ecart.ajoutees.map(({ id }) => id), [BLEU.id, AMBRE.id]);
  assert.deepEqual(ecart.parametres, ['crans', 'courbes', 'profils', 'fonds', 'seuils', 'derives', 'gamut']);
});

test('[REC-03] un fichier cassé, vide, invalide ou futur se refuse ; un fichier valide est prêt, avec son écart', () => {
  assert.deepEqual(lireLImport('{pas du json', ACTUELLE), { issue: 'invalide', refus: [{ regle: 'forme', chemin: '' }] });
  assert.equal(lireLImport('  ', ACTUELLE).issue, 'invalide');
  const invalide = lireLImport(jsonCanonique({ ...ACTUELLE, fonds: { ...ACTUELLE.fonds, light: '#12' } }), ACTUELLE);
  assert.ok(invalide.issue === 'invalide' && invalide.refus.some((refus) => refus.chemin === 'fonds.light'), JSON.stringify(invalide));
  assert.deepEqual(lireLImport(jsonCanonique({ ...ACTUELLE, formatVersion: FORMAT_RECETTE + 1 }), ACTUELLE), { issue: 'future', version: FORMAT_RECETTE + 1 });
  const prete = lireLImport(jsonCanonique({ ...ACTUELLE, palettes: [BLEU] }), ACTUELLE);
  assert.ok(prete.issue === 'prete');
  assert.deepEqual(prete.ecart.retirees.map(({ id }) => id), [AMBRE.id]);
});
