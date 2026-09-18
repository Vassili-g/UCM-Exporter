/**
 * Une cause de connexion, un geste.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  causeDepuisStatut,
  etatDeCarte,
  etatDeConnexion,
  etatDuDepot,
  gesteApresEchecDePublication,
} from '../src/connexion';
import type { CauseConnexion } from '../src/connexion';
import { TERMES_GITHUB, TERMES_GITLAB } from '../src/forges/termes';

const TOUTES: CauseConnexion[] = [
  'verification',
  'connecte',
  'non-configure',
  'jeton-refuse',
  'acces-refuse',
  'depot-introuvable',
  'depot-mal-decrit',
  'forge-indisponible',
  'reseau',
];

test('le statut HTTP décide de la cause, et l’absence de réponse aussi', () => {
  assert.equal(causeDepuisStatut(401), 'jeton-refuse');
  assert.equal(causeDepuisStatut(403), 'acces-refuse');
  assert.equal(causeDepuisStatut(404), 'depot-introuvable');
  assert.equal(causeDepuisStatut(500), 'forge-indisponible');
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

test('un statut inattendu de la forge est cité dans le geste', () => {
  const { geste } = etatDeConnexion('forge-indisponible', { statut: 502 });
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
 * Un repository qui déclare l'endroit le dit, et la phrase nomme les deux
 * chemins : c'est la seule chose qu'un designer cherche là.
 */
test('un repository qui se décrit nomme ses deux chemins', () => {
  const { resume } = etatDuDepot({
    components: 'packages/ui/src',
    tokens: 'packages/ui/tokens.json',
    source: 'ucm.config.json',
  });

  assert.equal(resume?.ton, 'info');
  assert.match(resume?.titre ?? '', /packages\/ui\/src/);
  assert.match(resume?.titre ?? '', /packages\/ui\/tokens\.json/);
  assert.match(resume?.detail ?? '', /ucm\.config\.json/);
});

/**
 * Sans `ucm.config.json`, personne n'a choisi cet endroit : les défauts
 * s'appliquent. L'avertissement le dit avant l'export, et nomme le fichier
 * qu'un développeur doit écrire pour en décider.
 */
test('gestion des tokens désactivée, la destination ne parle que des composants', () => {
  const decrit = etatDuDepot({ components: 'src/components', tokens: 'src/tokens/tokens.json', source: 'ucm.config.json' }, 'aucun-depot', false);
  assert.equal(decrit.resume?.titre, 'Contrats dans src/components.');
  const parDefaut = etatDuDepot({ components: 'components', tokens: 'tokens.json', source: 'les valeurs par défaut' }, 'aucun-depot', false);
  assert.doesNotMatch(parDefaut.resume?.detail ?? '', /tokens/);
  assert.match(parDefaut.resume?.detail ?? '', /composants/);
});

test('un repository sans ucm.config.json reçoit un avertissement, pas un constat', () => {
  const { resume } = etatDuDepot({
    components: 'components',
    tokens: 'tokens.json',
    source: 'les valeurs par défaut',
  });

  assert.equal(resume?.ton, 'avertissement');
  assert.match(resume?.titre ?? '', /ucm\.config\.json/);
  assert.match(resume?.detail ?? '', /ucm\.config\.json/);
});

test('tant que rien n’est connu, rien n’est affirmé sur les chemins', () => {
  const sansRien = etatDuDepot(null, 'aucun-depot');
  assert.equal(sansRien.resume, null);
});

test('sans dépôt visé, la ligne dit pourquoi, et ce qui VA se passer', () => {
  // Le repli en téléchargement local était subi : découvert à l'arrivée,
  // alors que le bouton avait promis une pull request.
  const aucun = etatDuDepot(null, 'aucun-depot');
  assert.equal(aucun.repli, 'aucun-depot');
  assert.equal(aucun.ligne, 'Aucun dépôt enregistré. L’export sera téléchargé sur votre poste.');
  const inactif = etatDuDepot(null, 'aucun-actif');
  assert.equal(inactif.repli, 'aucun-actif');
  assert.equal(inactif.ligne, 'Aucun dépôt actif. L’export sera téléchargé sur votre poste.');
  // L'export local n'a pas de ligne : sa pastille le nomme déjà, et il est choisi.
  const local = etatDuDepot(null, 'debranche');
  assert.equal(local.repli, 'debranche');
  assert.equal(local.ligne, null);
});

test('la ligne nomme le repository et sa branche', () => {
  // Elle n'apparaissait qu'après publication, donc
  // après le point de non-retour.
  const { ligne, repli } = etatDuDepot(
    { components: 'src/components', tokens: 'src/tokens/tokens.json', source: 'ucm.config.json' },
    { forge: 'GitHub', projet: 'mon-org/design-system-v3', baseBranch: 'main' },
  );
  assert.equal(repli, null);
  assert.equal(ligne, 'GitHub · mon-org/design-system-v3 · main');
  assert.equal(
    etatDuDepot(null, { forge: 'GitLab', projet: 'mon-groupe/design-system', baseBranch: 'main' }).ligne,
    'GitLab · mon-groupe/design-system · main',
  );
});

/**
 * Un 403 de droits manquants, un 409 de conflit et un 422 de branche
 * existante ne se corrigent pas du même geste, et arrivaient tous sous « Échec
 * GitHub » suivi du message brut.
 */
test('un échec de publication nomme un geste, et deux statuts n’en partagent pas un', () => {
  const statuts = [401, 403, 404, 409, 422, 500, null];
  const gestes = statuts.map((statut) => gesteApresEchecDePublication(statut, TERMES_GITHUB));
  for (const [rang, geste] of gestes.entries()) {
    assert.notEqual(geste, '', `${statuts[rang]} n'a pas de geste`);
  }
  assert.equal(new Set(gestes).size, statuts.length, 'deux statuts partagent leur geste');
});

test('les causes communes gardent le vocabulaire de la connexion', () => {
  // Les recopier ferait un second domicile, promis à diverger.
  assert.equal(gesteApresEchecDePublication(401, TERMES_GITHUB), etatDeConnexion('jeton-refuse', { termes: TERMES_GITHUB }).geste);
  assert.equal(gesteApresEchecDePublication(403, TERMES_GITHUB), etatDeConnexion('acces-refuse', { termes: TERMES_GITHUB }).geste);
  assert.equal(gesteApresEchecDePublication(null, TERMES_GITHUB), etatDeConnexion('reseau', { termes: TERMES_GITHUB }).geste);
});

test('les deux causes propres à la publication disent quoi relancer', () => {
  assert.match(gesteApresEchecDePublication(409, TERMES_GITHUB), /Relancez l’analyse/);
  assert.match(gesteApresEchecDePublication(422, TERMES_GITHUB), /branche/);
});

/**
 * GitLab rend 400 pour une branche existante, mais aussi pour une règle de push
 * du projet : message de commit, nom de branche. Seule sa réponse les
 * distingue, et le geste appartient au mainteneur du projet.
 */
test('sur GitLab, un 400 transmet la réponse de GitLab à un mainteneur du projet', () => {
  const reponse = "GitLab a répondu 400 : Commit message does not follow the pattern 'JIRA-\\d+'.";
  const geste = gesteApresEchecDePublication(400, TERMES_GITLAB, reponse);
  assert.ok(geste.startsWith(reponse), geste);
  assert.match(geste, /mainteneur du projet/);
  assert.doesNotMatch(geste, /Réessayez dans un moment/);
  assert.match(gesteApresEchecDePublication(400, TERMES_GITLAB), /GitLab a refusé l’écriture sans donner de raison/);
});

test('sur GitLab, une merge request en double garde le geste du refus', () => {
  assert.match(gesteApresEchecDePublication(409, TERMES_GITLAB), /GitLab a refusé la branche ou la merge request/);
  const statuts = [401, 403, 404, 400, 409, 500, null];
  const gestes = statuts.map((statut) => gesteApresEchecDePublication(statut, TERMES_GITLAB));
  assert.equal(new Set(gestes).size, statuts.length, 'deux statuts partagent leur geste');
});

test('le 404 GitLab dit que le projet peut être privé et que le jeton doit y avoir accès', () => {
  const { pastille, geste } = etatDeConnexion('depot-introuvable', { termes: TERMES_GITLAB });
  assert.equal(pastille, 'Projet introuvable');
  assert.match(geste ?? '', /GitLab ne trouve aucun projet/);
  assert.match(geste ?? '', /Si le projet est privé, donnez au jeton l’accès à ce projet./);
});

test('sur GitHub, les gestes de connexion gardent leurs phrases', () => {
  assert.equal(
    etatDeConnexion('jeton-refuse', { termes: TERMES_GITHUB }).geste,
    'GitHub refuse ce Personal Access Token. Créez-en un nouveau sur GitHub, puis collez-le dans le champ ci-dessus.',
  );
  assert.equal(
    etatDeConnexion('acces-refuse', { termes: TERMES_GITHUB }).geste,
    'Le jeton est reconnu, mais il n’a pas les droits sur ce repository. '
      + 'Donnez-lui Contents: Read and write et Pull requests: Read and write.',
  );
});

test('une carte nomme sa cause en statut court, dans les mots de sa forge', () => {
  const statut = (cause: CauseConnexion, termes = TERMES_GITLAB) => etatDeCarte(cause, { termes }).statut;
  assert.equal(statut('connecte'), 'Connecté');
  assert.equal(statut('verification'), 'Connexion…');
  assert.equal(statut('jeton-refuse'), 'Jeton refusé');
  assert.equal(statut('acces-refuse'), 'Accès refusé');
  assert.equal(statut('depot-introuvable'), 'Projet introuvable');
  assert.equal(statut('depot-introuvable', TERMES_GITHUB), 'Repository introuvable');
  assert.equal(statut('depot-mal-decrit'), 'ucm.config.json fautif');
  assert.equal(statut('reseau', TERMES_GITHUB), 'GitHub injoignable');
  assert.equal(etatDeCarte('connecte', { termes: TERMES_GITHUB }).geste, null);
});

/**
 * Le geste d'une carte s'affiche au-dessus de ses champs : il désigne le champ
 * où agir, et le geste d'un dépôt introuvable dit comment corriger l'adresse,
 * qui ne se modifie plus.
 */
test('le geste d’une carte désigne son champ, et la correction d’une adresse figée', () => {
  assert.equal(
    etatDeCarte('jeton-refuse', { termes: TERMES_GITLAB }).geste,
    'GitLab refuse ce jeton d’accès. Collez-en un nouveau ci-dessous, puis enregistrez.',
  );
  assert.equal(
    etatDeCarte('depot-introuvable', { termes: TERMES_GITLAB }).geste,
    'GitLab ne trouve aucun projet à cette adresse avec ce jeton. Si le projet est privé, donnez au jeton '
      + 'l’accès à ce projet. Si l’adresse est fausse, supprimez ce dépôt, puis ajoutez la bonne adresse.',
  );
  assert.equal(
    etatDeCarte('acces-refuse', { termes: TERMES_GITLAB }).geste,
    'Le jeton est reconnu, mais il n’a pas les droits sur ce projet. Donnez-lui les droits listés sous le champ du jeton, dans la configuration.',
  );
  assert.match(etatDeCarte('depot-mal-decrit', { termes: TERMES_GITLAB, detail: 'Détail.' }).geste ?? '', /décrit ce projet\. .*Détail\.$/);
});

/**
 * Avec plusieurs dépôts, « connecté » seul ne dit pas où l'export ira : la
 * pastille nomme le dépôt actif dans chaque état, succès comme échec.
 */
test('la pastille nomme le dépôt actif dans chaque cause', () => {
  const nom = 'design-system';
  const pastille = (cause: CauseConnexion) => etatDeConnexion(cause, { termes: TERMES_GITLAB, nom }).pastille;
  assert.equal(pastille('connecte'), 'design-system connecté');
  assert.equal(pastille('verification'), 'design-system : Connexion…');
  assert.equal(pastille('jeton-refuse'), 'design-system : Jeton refusé');
  assert.equal(pastille('acces-refuse'), 'design-system : Accès refusé');
  assert.equal(pastille('depot-introuvable'), 'design-system : Projet introuvable');
  assert.equal(pastille('reseau'), 'design-system : GitLab injoignable');
  assert.equal(pastille('forge-indisponible'), 'design-system : GitLab indisponible');
  assert.equal(pastille('depot-mal-decrit'), 'design-system : ucm.config.json fautif');
});

test('sans dépôt visé, la pastille dit s’il n’y en a aucun ou si aucun n’est actif', () => {
  assert.equal(etatDeConnexion('non-configure', { repli: 'aucun-depot' }).pastille, 'Aucun dépôt');
  const inactif = etatDeConnexion('non-configure', { repli: 'aucun-actif' });
  assert.equal(inactif.pastille, 'Aucun dépôt actif');
  assert.match(inactif.geste ?? '', /Se connecter/);
});

test('en export local, la pastille le dit en avertissement, sans geste', () => {
  assert.deepEqual(
    etatDeConnexion('non-configure', { repli: 'debranche', termes: TERMES_GITHUB, nom: 'design-system-v3' }),
    { state: 'local', pastille: 'Export en local', geste: null },
  );
});
