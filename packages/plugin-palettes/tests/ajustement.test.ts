/** Ajuster la référence (W7, section 3 de la conception du format 3) : la proposition, l'annonce, et ce qu'« Appliquer » range. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, validerRecette, type Palette } from 'ucm-couleur';

import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
  nuancesVisees,
  pasALOuverture,
  pasLePlusProche,
  propositionAuPas,
} from '../src/ajustementDeLaReference';
import { ajouter, appliquerLAjustement, changerReference, nouvellePalette, revenirALOriginale } from '../src/edition';

const RECETTE = recetteParDefaut();
const VERT: Palette = { ...nouvellePalette(RECETTE, 'p-0000000b', '#16A34A', 2)!, nom: 'Vert' };

test('W7.2 : sans pas, la proposition est l’originale elle-même ; un pas sombre sur #16A34A donne #0DA047', () => {
  assert.equal(pasALOuverture(RECETTE, VERT), 0);
  assert.equal(propositionAuPas(RECETTE, VERT, 0), '#16A34A');
  assert.equal(propositionAuPas(RECETTE, VERT, -1), '#0DA047');
  assert.equal(propositionAuPas(RECETTE, VERT, -200), null, 'hors de [0, 1], aucun pas');
});

test('W7.3 : Appliquer pose la proposition et garde l’originale ; elle vise le 600 dans les deux thèmes', () => {
  const ajustee = appliquerLAjustement(RECETTE, VERT, '#0DA047')!;
  assert.equal(ajustee.reference, '#0DA047');
  assert.equal(ajustee.originale, '#16A34A');
  assert.deepEqual(nuancesVisees(RECETTE, ajustee), { light: 600, dark: 600 });
  assert.deepEqual(nuancesVisees(RECETTE, VERT), { light: 600, dark: 700 });
  assert.ok('recette' in validerRecette(ajouter(RECETTE, ajustee)), 'la recette ajustée se range');
  // Rouvrir le panneau repart du pas qui mène à la référence.
  assert.equal(pasALOuverture(RECETTE, ajustee), -1);
  // Un second ajustement garde l'originale du premier.
  const encore = appliquerLAjustement(RECETTE, ajustee, propositionAuPas(RECETTE, ajustee, -2)!)!;
  assert.equal(encore.originale, '#16A34A');
});

test('W7.3 : Revenir à l’originale, ou appliquer l’originale, retire le champ ; l’aller-retour rend la palette de départ', () => {
  const ajustee = appliquerLAjustement(RECETTE, VERT, '#0DA047')!;
  const revenue = revenirALOriginale(RECETTE, ajustee);
  assert.equal(revenue.reference, '#16A34A');
  assert.equal('originale' in revenue, false);
  assert.deepEqual(revenue, VERT);
  assert.deepEqual(appliquerLAjustement(RECETTE, ajustee, '#16a34a'), VERT);
  assert.equal(revenirALOriginale(RECETTE, VERT), VERT, 'une palette jamais ajustée ne change pas');
});

test('W7.5 : un code saisi dans la configuration est une nouvelle référence, qui retire l’originale', () => {
  const ajustee = appliquerLAjustement(RECETTE, VERT, '#0DA047')!;
  const saisie = changerReference(RECETTE, ajustee, '#15803D')!;
  assert.equal(saisie.reference, '#15803D');
  assert.equal('originale' in saisie, false);
});

test('W7.2 : un pas qui changerait le numéro de la référence s’annonce avant le clic', () => {
  // Depuis #16A34A, le pas sombre place la référence au 600 en Dark ; le pas clair ne change rien.
  assert.deepEqual(changementAuPasVoisin(RECETTE, VERT, 0, -1), [{ mode: 'dark', numero: 600 }]);
  const ajustee = appliquerLAjustement(RECETTE, VERT, '#0DA047')!;
  assert.deepEqual(changementAuPasVoisin(RECETTE, ajustee, -1, -1), []);
});

test('W7.2 : les garanties se comparent avant et après : #16A34A en manque en Light, #0DA047 les tient', () => {
  const ajustee = appliquerLAjustement(RECETTE, VERT, '#0DA047')!;
  const vivid = (liste: ReturnType<typeof manqueesParIntensite>) => liste.find(({ intensite }) => intensite === 'vivid')!.manquees;
  const avant = manqueesParIntensite(RECETTE, VERT);
  const apres = manqueesParIntensite(RECETTE, ajustee);
  assert.deepEqual(avant.map(({ intensite }) => intensite), ['soft', 'vivid']);
  assert.ok(vivid(avant) > 0, 'l’originale manque des garanties en Vivid');
  assert.equal(vivid(apres), 0);
  const comparees = garantiesComparees(RECETTE, VERT, ajustee);
  assert.ok(comparees.length > 0);
  assert.ok(comparees.every(({ avant: a, apres: b }) => a.paire.numero === b.paire.numero && a.mode === b.mode && a.profil === b.profil));
  assert.ok(comparees.some(({ avant: a, apres: b }) => a.verdict === 'manquee' && b.verdict === 'tenue'));
});

test('W7.2 : un code saisi dans le panneau garde l’originale, et le pas suivant repart de sa luminosité', () => {
  assert.equal(pasLePlusProche(RECETTE, VERT, '#0DA047'), -1);
  assert.equal(pasLePlusProche(RECETTE, VERT, '#16A34A'), 0);
  const saisie = appliquerLAjustement(RECETTE, VERT, '#0CA046')!;
  assert.equal(saisie.originale, '#16A34A');
});
