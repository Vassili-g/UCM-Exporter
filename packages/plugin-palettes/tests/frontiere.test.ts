/** Les demandes au sandbox et le rangement vu de l'interface ([UI-08], [REC-06], [REC-10], E13). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Classement } from 'ucm-couleur';

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
    frontiere.accepterEtat({ type: 'etat', demande, classement: ABSENTE, empreinte, profil: 'SRGB' });
  const rangee = (demande: number, empreinte: string) =>
    frontiere.recevoirRangement({ type: 'rangement', demande, issue: { issue: 'rangee', empreinte } });
  return { frontiere, envoyees, statuts, etat, rangee };
}

test('[UI-08] un seul compteur numérote les demandes, et un état plus ancien que la dernière est écarté', () => {
  const { frontiere, envoyees, etat } = banc();
  frontiere.lireLEtat();
  frontiere.lireLaSelection();
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

test('une couleur de sélection ne compte que pour la dernière lecture de la sélection', () => {
  const { frontiere } = banc();
  frontiere.lireLaSelection();
  frontiere.lireLaSelection();
  const lecture = { hexa: '#FF0000', ramenee: false };
  assert.equal(frontiere.accepterSelection({ type: 'selection', demande: 1, lecture }), false);
  assert.equal(frontiere.accepterSelection({ type: 'selection', demande: 2, lecture }), true);
});
