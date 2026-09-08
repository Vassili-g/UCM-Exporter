/**
 * Une cause de connexion, un geste.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  causeDepuisStatut,
  etatDeConnexion,
  etatDuDepot,
  gesteApresEchecDePublication,
} from '../src/connexion';
import type { CauseConnexion } from '../src/connexion';

const TOUTES: CauseConnexion[] = [
  'verification',
  'connecte',
  'non-configure',
  'jeton-refuse',
  'acces-refuse',
  'depot-introuvable',
  'depot-mal-decrit',
  'github-indisponible',
  'reseau',
];

test('le statut HTTP décide de la cause, et l’absence de réponse aussi', () => {
  assert.equal(causeDepuisStatut(401), 'jeton-refuse');
  assert.equal(causeDepuisStatut(403), 'acces-refuse');
  assert.equal(causeDepuisStatut(404), 'depot-introuvable');
  assert.equal(causeDepuisStatut(500), 'github-indisponible');
  assert.equal(causeDepuisStatut(null), 'reseau');
});

test('seules la vérification et le succès n’attendent aucun geste', () => {
  for (const cause of TOUTES) {
    const { geste } = etatDeConnexion(cause);
    const attendu = cause === 'verification' || cause === 'connecte';
    assert.equal(
      geste === null,
      attendu,
      `${cause} : un échec sans geste laisse le designer devant une pastille rouge`,
    );
  }
});

test('chaque cause d’échec dit une chose différente', () => {
  const echecs = TOUTES.filter((cause) => cause !== 'verification' && cause !== 'connecte');
  const pastilles = echecs.map((cause) => etatDeConnexion(cause).pastille);
  const gestes = echecs.map((cause) => etatDeConnexion(cause).geste);
  assert.equal(new Set(pastilles).size, echecs.length, 'deux causes partagent une pastille');
  assert.equal(new Set(gestes).size, echecs.length, 'deux causes partagent un geste');
});

test('l’état d’affichage suit la cause, et lui seul', () => {
  assert.equal(etatDeConnexion('verification').state, 'checking');
  assert.equal(etatDeConnexion('connecte').state, 'connected');
  for (const cause of TOUTES) {
    if (cause === 'verification' || cause === 'connecte') continue;
    assert.equal(etatDeConnexion(cause).state, 'disconnected', `${cause} n'est pas un succès`);
  }
});

test('le message du repository sur son propre fichier est repris tel quel', () => {
  const { geste } = etatDeConnexion('depot-mal-decrit', { detail: 'ucm.config.json : components.' });
  assert.match(geste ?? '', /ucm\.config\.json : components\./);
});

test('un statut inattendu de GitHub est cité dans le geste', () => {
  const { geste } = etatDeConnexion('github-indisponible', { statut: 502 });
  assert.match(geste ?? '', /502/);
});

test('aucun message ne parle au designer avec un tiret cadratin', () => {
  // CONTRIBUTING.md, « Messages destinés au designer ».
  for (const cause of TOUTES) {
    const { pastille, geste } = etatDeConnexion(cause);
    assert.doesNotMatch(`${pastille} ${geste ?? ''}`, /—/, `${cause}`);
  }
});

/**
 * D'où viennent les chemins, dit là où le designer configure le repository.
 * Deux réponses et deux seulement : le repository l'a écrit, ou les défauts
 * s'appliquent. Il n'y a plus de troisième autorité à départager.
 */
test('la destination nomme les chemins et celui qui les a décidés', () => {
  const parLeDepot = etatDuDepot({
    components: 'packages/ui/src',
    tokens: 'packages/ui/tokens.json',
    source: 'ucm.config.json',
  });
  assert.match(parLeDepot.resume ?? '', /ucm\.config\.json/);
  assert.match(parLeDepot.resume ?? '', /packages\/ui\/src/);
  assert.match(parLeDepot.resume ?? '', /packages\/ui\/tokens\.json/);

  const parDefaut = etatDuDepot({
    components: 'components',
    tokens: 'tokens.json',
    source: 'les valeurs par défaut',
  });
  assert.match(parDefaut.resume ?? '', /valeurs par défaut/);
  assert.match(parDefaut.resume ?? '', /components/);
  // Le geste qui change l'endroit, nommé avec son acteur.
  assert.match(parDefaut.resume ?? '', /ucm\.config\.json/);
});

test('tant que rien n’est connu, rien n’est affirmé sur les chemins', () => {
  const sansRien = etatDuDepot(null, null);
  assert.equal(sansRien.resume, null);
});

test('sans repository, la ligne dit ce qui VA se passer', () => {
  // Le repli en téléchargement local était subi : découvert à l'arrivée,
  // alors que le bouton avait promis une pull request.
  const { ligne, repli } = etatDuDepot(null, null);
  assert.equal(repli, true);
  assert.match(ligne ?? '', /téléchargé/);
});

test('la ligne nomme le repository et sa branche', () => {
  // Elle n'apparaissait qu'après publication, donc
  // après le point de non-retour.
  const { ligne, repli } = etatDuDepot(
    { components: 'src/components', tokens: 'src/tokens/tokens.json', source: 'ucm.config.json' },
    { owner: 'mon-org', repo: 'design-system-v3', baseBranch: 'main' },
  );
  assert.equal(repli, false);
  assert.equal(ligne, 'mon-org/design-system-v3 · main');
});

/**
 * Un 403 de droits manquants, un 409 de conflit et un 422 de branche
 * existante ne se corrigent pas du même geste, et arrivaient tous sous « Échec
 * GitHub » suivi du message brut.
 */
test('un échec de publication nomme un geste, et deux statuts n’en partagent pas un', () => {
  const statuts = [401, 403, 404, 409, 422, 500, null];
  const gestes = statuts.map((statut) => gesteApresEchecDePublication(statut));
  for (const [rang, geste] of gestes.entries()) {
    assert.notEqual(geste, '', `${statuts[rang]} n'a pas de geste`);
  }
  assert.equal(new Set(gestes).size, statuts.length, 'deux statuts partagent leur geste');
});

test('les causes communes gardent le vocabulaire de la connexion', () => {
  // Les recopier ferait un second domicile, promis à diverger.
  assert.equal(gesteApresEchecDePublication(401), etatDeConnexion('jeton-refuse').geste);
  assert.equal(gesteApresEchecDePublication(403), etatDeConnexion('acces-refuse').geste);
  assert.equal(gesteApresEchecDePublication(null), etatDeConnexion('reseau').geste);
});

test('les deux causes propres à la publication disent quoi relancer', () => {
  assert.match(gesteApresEchecDePublication(409), /Relancez l’analyse/);
  assert.match(gesteApresEchecDePublication(422), /branche/);
});
