/** Les demandes au sandbox et le rangement vu de l'interface ([UI-08], [REC-06], [REC-10], E13). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Classement } from 'ucm-couleur';

import { PLANCHE_SANS_CADRE } from '../src/lecture';
import type { UiRequest } from '../src/messages';
import { createFrontiere, type StatutDuRangement } from '../src/ui/frontiere';

const RECETTE = recetteParDefaut();
const AUTRE = { ...RECETTE, seuils: { ...RECETTE.seuils, texte: 7 } };
const ABSENTE: Classement = { etat: 'absente', recette: RECETTE };

function banc() {
  const envoyees: UiRequest[] = [];
  const statuts: StatutDuRangement[] = [];
  const frontiere = createFrontiere((demande) => envoyees.push(demande), (statut) => statuts.push(statut));
  const etat = (demande: number, empreinte: string | null = null) =>
    frontiere.accepterEtat({ type: 'etat', demande, classement: ABSENTE, texte: '', empreinte, profil: 'SRGB', planche: PLANCHE_SANS_CADRE });
  const rangee = (demande: number, empreinte: string) =>
    frontiere.recevoirRangement({ type: 'rangement', demande, issue: { issue: 'rangee', empreinte } });
  return { frontiere, envoyees, statuts, etat, rangee };
}

test('[UI-08] un seul compteur numérote les demandes, et un état plus ancien que la dernière est écarté', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  frontiere.lireLEtat();
  assert.deepEqual(envoyees.map((demande) => 'demande' in demande && demande.demande), [1, 2]);
  assert.equal(etat(1), false);
  assert.equal(etat(2), true);
});

test('[REC-10] un rangement porte l’empreinte lue, puis celle que le rangement précédent a rendue', () => {
  const { frontiere, envoyees, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  assert.deepEqual(envoyees[1], { type: 'ranger-recette', demande: 2, recette: RECETTE, empreinteLue: 'aaaaaaaa' });
  rangee(2, 'bbbbbbbb');
  frontiere.ranger(AUTRE);
  assert.equal((envoyees[2] as { empreinteLue: string }).empreinteLue, 'bbbbbbbb');
});

test('[REC-06] un geste pendant un rangement attend, et seul le dernier part', () => {
  const { frontiere, envoyees, statuts, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, null);
  frontiere.ranger(RECETTE);
  frontiere.ranger(AUTRE);
  frontiere.ranger(RECETTE);
  assert.equal(envoyees.length, 2, 'un seul rangement en vol');
  assert.equal(frontiere.auRepos(), false);
  rangee(2, 'cccccccc');
  assert.equal(envoyees.length, 3);
  assert.deepEqual(envoyees[2], { type: 'ranger-recette', demande: 3, recette: RECETTE, empreinteLue: 'cccccccc' });
  rangee(3, 'dddddddd');
  assert.equal(frontiere.auRepos(), true);
  assert.deepEqual(statuts.slice(-1), ['range']);
});

test('[REC-10] après un refus, rien ne se range avant la relecture', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(frontiere.statut(), 'refuse');
  frontiere.ranger(AUTRE);
  assert.equal(envoyees.length, 2);
  frontiere.lireLEtat();
  assert.equal(etat(3, 'eeeeeeee'), true);
  assert.equal(frontiere.statut(), 'lu');
  frontiere.ranger(AUTRE);
  assert.equal((envoyees[3] as { empreinteLue: string }).empreinteLue, 'eeeeeeee');
});

test('[UI-08] un état demandé avant un rangement n’écrase pas la recette rangée depuis', () => {
  const { frontiere, etat } = banc();
  frontiere.lireLEtat();
  frontiere.ranger(RECETTE);
  assert.equal(etat(1), false);
});

test('E13 : un dessin demandé pendant un rangement part après lui, sur l’empreinte qu’il rend', () => {
  const { frontiere, envoyees, etat, rangee } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(AUTRE);
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: ['12:40'] }, () => assert.fail('aucun abandon'));
  assert.equal(envoyees.length, 2, 'le dessin attend le rangement');
  rangee(2, 'bbbbbbbb');
  assert.deepEqual(envoyees[2], { type: 'dessiner', demande: 3, palettes: ['p-0000000a'], empreinteLue: 'bbbbbbbb', etrangersConfirmes: ['12:40'] });
  assert.equal(frontiere.accepterDessin({ type: 'progression', demande: 3, fait: 0, total: 1, nom: 'Bleu' }), true);
  assert.equal(frontiere.accepterDessin({ type: 'progression', demande: 2, fait: 0, total: 1, nom: 'Bleu' }), false);
});

test('E13 : un rangement refusé abandonne le dessin qui l’attendait, et le dit', () => {
  const { frontiere, envoyees, statuts, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(AUTRE);
  let abandons = 0;
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  assert.equal(abandons, 1);
  assert.deepEqual(statuts.slice(-1), ['refuse']);
  assert.deepEqual(envoyees.map((demande) => demande.type), ['lire-etat', 'ranger-recette']);
});

test('« Voir sur la planche » ne rend caduc aucun état attendu', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  frontiere.voirSurLaPlanche('1:2', ['3:4']);
  assert.deepEqual(envoyees[1], { type: 'voir-sur-la-planche', demande: 2, page: '1:2', cadres: ['3:4'] });
  assert.equal(etat(1), true);
});

test('V12.1 : pendant un conflit, un dessin ne part pas et s’abandonne, jusqu’à la relecture', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  etat(1, 'aaaaaaaa');
  frontiere.ranger(RECETTE);
  frontiere.recevoirRangement({ type: 'rangement', demande: 2, issue: { issue: 'modifiee-ailleurs' } });
  let abandons = 0;
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  assert.equal(abandons, 1);
  assert.deepEqual(envoyees.map((demande) => demande.type), ['lire-etat', 'ranger-recette']);
  frontiere.lireLEtat();
  etat(3, 'eeeeeeee');
  frontiere.dessiner({ palettes: ['p-0000000a'], etrangersConfirmes: [] }, () => { abandons += 1; });
  assert.equal(envoyees.at(-1)?.type, 'dessiner');
  assert.equal(abandons, 1);
});
