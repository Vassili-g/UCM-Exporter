/**
 * Une cause de connexion, un geste (U5.2).
 *
 * Le défaut d'origine n'était pas un texte manquant : c'était un booléen. Trois
 * situations qui se corrigent de trois façons arrivaient sous la même pastille
 * rouge. Ces tests tiennent la seule chose qui empêche la fusion de revenir —
 * que chaque cause d'échec nomme un geste, et que deux causes distinctes ne
 * disent pas la même chose.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { causeDepuisStatut, etatDeConnexion, etatDuDepot } from '../src/connexion';
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

test('qui gouverne les chemins se lit avant de les saisir', () => {
  // U5.1. `repositoryLayout` ignore les réglages dès qu'un ucm.config.json
  // lisible existe : le dire APRÈS coup, en ligne de journal, revient à faire
  // remplir deux champs sans effet.
  const parLeDepot = etatDuDepot({
    components: 'packages/ui/src',
    tokens: 'packages/ui/tokens.json',
    source: 'ucm.config.json',
  });
  assert.equal(parLeDepot.gouverne, 'repository');
  assert.match(parLeDepot.resume ?? '', /packages\/ui\/src/);
  assert.match(parLeDepot.resume ?? '', /packages\/ui\/tokens\.json/);

  const parLesReglages = etatDuDepot({
    components: 'src/components',
    tokens: 'src/tokens/tokens.json',
    source: 'réglages du plugin',
  });
  assert.equal(parLesReglages.gouverne, 'reglages');
});

test('personne ne décide de l’endroit, et cela se dit', () => {
  // Le cas neuf que U5.1 introduit : les chemins ne sont plus obligatoires, un
  // repository qui ne se décrit pas et des réglages vides ne désignent donc
  // plus rien. L'export sera refusé, et le designer doit l'apprendre ici.
  const { gouverne, resume } = etatDuDepot({
    components: null,
    tokens: null,
    source: 'réglages du plugin',
  });
  assert.equal(gouverne, 'reglages');
  assert.match(resume ?? '', /refusé/);
});

test('tant que rien n’est connu, rien n’est affirmé sur les chemins', () => {
  const sansRien = etatDuDepot(null, null);
  assert.equal(sansRien.gouverne, null);
  assert.equal(sansRien.resume, null);
  assert.equal(sansRien.chemins, null);
});

test('sans repository, la ligne dit ce qui VA se passer', () => {
  // U2.5. Le repli en téléchargement local était subi : découvert à l'arrivée,
  // alors que le bouton avait promis une pull request.
  const { ligne, repli } = etatDuDepot(null, null);
  assert.equal(repli, true);
  assert.match(ligne ?? '', /téléchargé/);
});

test('la destination nomme le repository, sa branche et les deux chemins', () => {
  // U2.2. Elle n'apparaissait qu'après publication, en ligne de journal, donc
  // après le point de non-retour.
  const { ligne, chemins, repli } = etatDuDepot(
    { components: 'src/components', tokens: 'src/tokens/tokens.json', source: 'ucm.config.json' },
    { owner: 'mon-org', repo: 'design-system-v3', baseBranch: 'main' },
  );
  assert.equal(repli, false);
  assert.equal(ligne, 'mon-org/design-system-v3 · main');
  assert.match(chemins ?? '', /src\/components/);
  assert.match(chemins ?? '', /src\/tokens\/tokens\.json/);
});
