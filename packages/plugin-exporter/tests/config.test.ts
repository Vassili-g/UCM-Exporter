import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activerDepot,
  cleDeDestination,
  ecrireExportLocal,
  ecrireGestionDesTokens,
  enregistrerDepot,
  forgeDuPrefixe,
  lireAdresseDuDepot,
  lireInstantane,
  loadConfiguration,
  memeDepot,
  nomDuDepot,
  reprendreLAncienneConfiguration,
  supprimerDepot,
  validateSettings,
} from '../src/config';

test('l’adresse d’une page GitLab donne le projet, et dit qu’un dossier a été retiré', () => {
  assert.deepEqual(
    lireAdresseDuDepot('https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines?ref_type=heads'),
    { forge: 'gitlab', projet: 'mon-groupe/design-system', cheminRetire: true },
  );
  assert.deepEqual(
    lireAdresseDuDepot('https://gitlab.com/mon-groupe/design-system'),
    { forge: 'gitlab', projet: 'mon-groupe/design-system', cheminRetire: false },
  );
});

test('un projet GitLab garde ses sous-groupes, et perd son suffixe .git', () => {
  assert.deepEqual(
    lireAdresseDuDepot('https://gitlab.com/groupe/sous-groupe/projet.git'),
    { forge: 'gitlab', projet: 'groupe/sous-groupe/projet', cheminRetire: false },
  );
  assert.deepEqual(
    lireAdresseDuDepot('https://gitlab.com/groupe/sous-groupe/projet/-/merge_requests/3#note_1'),
    { forge: 'gitlab', projet: 'groupe/sous-groupe/projet', cheminRetire: true },
  );
});

test('GitHub garde deux segments, et une page du repository est acceptée', () => {
  assert.deepEqual(
    lireAdresseDuDepot('https://github.com/acme/design-system.git'),
    { forge: 'github', projet: 'acme/design-system', cheminRetire: false },
  );
  assert.deepEqual(
    lireAdresseDuDepot('https://github.com/acme/design-system/tree/main/docs'),
    { forge: 'github', projet: 'acme/design-system', cheminRetire: true },
  );
  assert.deepEqual(
    lireAdresseDuDepot('[Vassili-g/UCM-Playground](https://github.com/Vassili-g/UCM-Playground)'),
    { forge: 'github', projet: 'Vassili-g/UCM-Playground', cheminRetire: false },
  );
});

test('un hôte inconnu, un groupe seul et une adresse non HTTPS sont refusés', () => {
  for (const adresse of [
    'https://bitbucket.org/acme/ds',
    'https://gitlab.example.com/acme/ds',
    'https://gitlab.com/groupe',
    'https://gitlab.com/groupe/-/tree/main',
    'https://github.com/acme',
    'http://github.com/acme/ds',
    'https://github.com//ds',
    'invalid',
  ]) {
    assert.equal(lireAdresseDuDepot(adresse), null, adresse);
  }
});

test('le préfixe d’un jeton désigne sa forge', () => {
  assert.equal(forgeDuPrefixe('ghp_abc'), 'github');
  assert.equal(forgeDuPrefixe('github_pat_abc'), 'github');
  assert.equal(forgeDuPrefixe('glpat-abc'), 'gitlab');
  assert.equal(forgeDuPrefixe('secret'), null);
});

test('validateSettings utilise le jeton stocké quand le champ UI reste vide et que la forge concorde', () => {
  const result = validateSettings(
    { repoUrl: 'https://github.com/acme/design-system', baseBranch: 'main', jeton: '' },
    { jeton: 'github_pat_secret', forge: null },
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.config, {
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    forge: 'github',
    projet: 'acme/design-system',
    jeton: 'github_pat_secret',
  });
});

test('validateSettings détaille une configuration invalide sans planter', () => {
  const result = validateSettings({ repoUrl: 'invalid', baseBranch: '' });

  assert.equal(result.valid, false);
  assert.equal(result.config, null);
  assert.deepEqual(Object.keys(result.errors).sort(), ['baseBranch', 'jeton', 'repoUrl']);
});

/**
 * Trois champs, et aucun chemin. Un chemin rangé ici ne pouvait décider que
 * face à un repository sans `ucm.config.json`, c'est-à-dire au moment précis
 * où `ucm check` applique ses défauts : il n'aurait pu que déposer l'export
 * hors de vue du contrôle.
 */
test('les réglages ne portent aucun chemin', () => {
  const result = validateSettings({
    repoUrl: 'https://gitlab.com/mon-groupe/design-system/-/tree/main/guidelines',
    baseBranch: 'main',
    jeton: 'glpat-secret',
  });

  assert.deepEqual(Object.keys(result.config ?? {}).sort(), ['baseBranch', 'forge', 'jeton', 'projet', 'repoUrl']);
});

test('un jeton saisi dont le préfixe désigne l’autre forge est refusé à la saisie', () => {
  const versGitlab = validateSettings({ repoUrl: 'https://gitlab.com/a/b', baseBranch: 'main', jeton: 'ghp_x' });
  assert.equal(versGitlab.valid, false);
  assert.match(versGitlab.errors.jeton ?? '', /jeton GitHub\. Collez un jeton d’accès GitLab/);

  const versGithub = validateSettings({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', jeton: 'glpat-x' });
  assert.equal(versGithub.valid, false);
  assert.match(versGithub.errors.jeton ?? '', /jeton GitLab\. Collez un Personal Access Token GitHub/);
});

/** Un `clientStorage` en mémoire, qui relève chaque écriture et peut tomber en panne. */
function stockageFigma(initial: Record<string, unknown> = {}) {
  const valeurs = new Map(Object.entries(initial));
  const ecritures: string[] = [];
  const panne = { apres: Infinity };
  const runtime = {
    clientStorage: {
      getAsync: async (cle: string) => valeurs.get(cle),
      setAsync: async (cle: string, valeur: unknown) => {
        if (ecritures.length >= panne.apres) throw new Error('stockage interrompu');
        ecritures.push(`set ${cle}`);
        valeurs.set(cle, valeur);
      },
      deleteAsync: async (cle: string) => {
        if (ecritures.length >= panne.apres) throw new Error('stockage interrompu');
        ecritures.push(`delete ${cle}`);
        valeurs.delete(cle);
      },
    },
  };
  (globalThis as unknown as { figma: unknown }).figma = runtime;
  return { valeurs, ecritures, panne };
}

const GITHUB = { repoUrl: 'https://github.com/mon-org/design-system-v3', baseBranch: 'main', jeton: 'ghp_a' };
const GITLAB = { repoUrl: 'https://gitlab.com/mon-groupe/design-system', baseBranch: 'main', jeton: 'glpat-b' };
const ID_GITHUB = 'github:mon-org/design-system-v3';
const ID_GITLAB = 'gitlab:mon-groupe/design-system';

test('un dépôt s’écrit en une seule écriture, et le premier d’une liste vide devient actif', async () => {
  const { ecritures, valeurs } = stockageFigma({ depots: [] });
  const premier = await enregistrerDepot(GITHUB, null);
  assert.equal(premier.id, ID_GITHUB);
  assert.deepEqual(ecritures, ['set depots', 'set depotActif']);
  assert.deepEqual(valeurs.get('depots'), [GITHUB]);

  ecritures.length = 0;
  await enregistrerDepot(GITLAB, null);
  assert.deepEqual(ecritures, ['set depots']);
  assert.equal(valeurs.get('depotActif'), ID_GITHUB);
});

test('une modification garde l’adresse de l’entrée, et un champ vide conserve son jeton', async () => {
  const { valeurs } = stockageFigma({ depots: [GITHUB], depotActif: ID_GITHUB });
  const modification = await enregistrerDepot({ repoUrl: GITHUB.repoUrl, baseBranch: 'develop', jeton: '' }, ID_GITHUB);
  assert.equal(modification.validation.valid, true);
  assert.deepEqual(valeurs.get('depots'), [{ ...GITHUB, baseBranch: 'develop' }]);

  const autreAdresse = await enregistrerDepot({ repoUrl: GITLAB.repoUrl, baseBranch: 'main', jeton: '' }, ID_GITHUB);
  assert.equal(autreAdresse.validation.valid, false);
  assert.match(autreAdresse.validation.errors.repoUrl ?? '', /ne change pas/);
  assert.deepEqual(valeurs.get('depots'), [{ ...GITHUB, baseBranch: 'develop' }]);
});

test('une entrée retirée entre-temps ne se modifie pas', async () => {
  stockageFigma({ depots: [] });
  const { validation } = await enregistrerDepot(GITHUB, ID_GITHUB);
  assert.equal(validation.errors.general, 'Ce dépôt n’est plus enregistré. Ajoutez-le de nouveau dans la configuration.');
});

test('un projet s’enregistre une fois, quelle que soit la casse de son adresse', async () => {
  const { valeurs } = stockageFigma({ depots: [GITLAB] });
  const doublon = await enregistrerDepot({ ...GITLAB, repoUrl: 'https://gitlab.com/Mon-Groupe/Design-System' }, null);
  assert.equal(doublon.validation.errors.repoUrl, 'Ce projet est déjà dans la liste.');
  assert.equal((valeurs.get('depots') as unknown[]).length, 1);
});

test('l’UI apprend la présence du jeton par dépôt, jamais le jeton', async () => {
  stockageFigma({ depots: [GITHUB, GITLAB], depotActif: ID_GITLAB });
  const { depots, actif } = await lireInstantane();
  assert.equal(actif, ID_GITLAB);
  assert.deepEqual(depots.map(({ id, nom, jeton }) => ({ id, nom, jeton })), [
    { id: ID_GITHUB, nom: 'design-system-v3', jeton: true },
    { id: ID_GITLAB, nom: 'design-system', jeton: true },
  ]);
  assert.doesNotMatch(JSON.stringify(depots), /ghp_a|glpat-b/);
});

test('une suppression interrompue ne laisse ni jeton ni dépôt actif utilisable', async () => {
  for (let apres = 0; apres <= 1; apres += 1) {
    const { panne, valeurs } = stockageFigma({ depots: [GITHUB, GITLAB], depotActif: ID_GITHUB });
    panne.apres = apres;
    await supprimerDepot(ID_GITHUB).catch(() => undefined);
    const instantane = await lireInstantane();
    if (apres === 0) {
      assert.equal(instantane.actif, ID_GITHUB, 'rien n’a été écrit');
      continue;
    }
    assert.doesNotMatch(JSON.stringify(valeurs.get('depots')), /ghp_a/);
    assert.equal(instantane.actif, null, `interruption après ${apres} écriture(s)`);
    assert.equal(instantane.validation.config, null);
  }
});

test('un dépôt actif qui désigne une entrée absente se lit comme aucun dépôt actif', async () => {
  stockageFigma({ depots: [GITLAB], depotActif: ID_GITHUB });
  const instantane = await lireInstantane();
  assert.equal(instantane.actif, null);
  assert.equal(instantane.destination, cleDeDestination(null, true));
});

test('une liste de dépôts illisible lève, et la reprise ne l’écrase pas', async () => {
  const { valeurs } = stockageFigma({ depots: 'abîmée', repoUrl: GITHUB.repoUrl, github_pat: 'ghp_ancien' });
  await assert.rejects(lireInstantane(), /ne peuvent pas être lus/);
  await assert.rejects(reprendreLAncienneConfiguration(), /ne peuvent pas être lus/);
  assert.equal(valeurs.get('depots'), 'abîmée');
});

/** Les quatre clés du plugin à un seul dépôt. */
const ANCIENNES = ['repoUrl', 'baseBranch', 'github_pat', 'forge_du_jeton'];

test('la reprise fait d’un dépôt GitHub la première entrée, active, puis efface les anciennes clés', async () => {
  const { valeurs } = stockageFigma({ repoUrl: GITHUB.repoUrl, baseBranch: 'main', github_pat: 'ghp_ancien' });
  await reprendreLAncienneConfiguration();
  assert.deepEqual(valeurs.get('depots'), [{ repoUrl: GITHUB.repoUrl, baseBranch: 'main', jeton: 'ghp_ancien' }]);
  assert.equal(valeurs.get('depotActif'), ID_GITHUB);
  assert.deepEqual(ANCIENNES.filter((cle) => valeurs.has(cle)), []);
});

test('la reprise d’un projet GitLab garde son jeton et sa forge', async () => {
  const { valeurs } = stockageFigma({ repoUrl: GITLAB.repoUrl, baseBranch: 'main', github_pat: 'glpat-ancien', forge_du_jeton: 'gitlab' });
  await reprendreLAncienneConfiguration();
  assert.equal(valeurs.get('depotActif'), ID_GITLAB);
  assert.equal((await lireInstantane()).validation.config?.jeton, 'glpat-ancien');
});

/**
 * Un jeton sans `forge_du_jeton` a été saisi pour GitHub : resté sous une
 * adresse GitLab, il ne suit pas la reprise.
 */
test('un jeton enregistré avant GitLab appartient à GitHub, et une configuration invalide est écartée puis effacée', async () => {
  const { valeurs } = stockageFigma({ repoUrl: GITLAB.repoUrl, baseBranch: 'main', github_pat: 'ghp_ancien' });
  await reprendreLAncienneConfiguration();
  assert.deepEqual(valeurs.get('depots'), []);
  assert.equal(valeurs.has('depotActif'), false);
  assert.deepEqual(ANCIENNES.filter((cle) => valeurs.has(cle)), []);
});

/**
 * Le plugin à un seul dépôt écrivait la branche sous la même clé : une branche
 * absente vient d'une configuration partielle, et non d'un autre nom de clé. La
 * reprise la pose sur `main` plutôt que d'écarter le dépôt et son jeton, et le
 * designer lit cette branche dans sa carte comme sous la carte du composant.
 * Une branche écrite mais vide ne se remplace pas : `validateSettings` la refuse
 * comme toute configuration invalide, et la reprise l'écarte.
 */
test('une ancienne configuration sans branche est reprise sur main, et la carte le montre', async () => {
  const { valeurs } = stockageFigma({ repoUrl: GITHUB.repoUrl, github_pat: 'ghp_ancien' });
  await reprendreLAncienneConfiguration();
  assert.deepEqual(valeurs.get('depots'), [{ repoUrl: GITHUB.repoUrl, baseBranch: 'main', jeton: 'ghp_ancien' }]);
  const instantane = await lireInstantane();
  assert.equal(instantane.depots[0]?.baseBranch, 'main');
  assert.equal(instantane.destination, cleDeDestination({ forge: 'github', projet: 'mon-org/design-system-v3', baseBranch: 'main' }, true));
});

test('une ancienne configuration dont la branche est vide est écartée, puis effacée', async () => {
  const { valeurs } = stockageFigma({ repoUrl: GITHUB.repoUrl, baseBranch: '   ', github_pat: 'ghp_ancien' });
  await reprendreLAncienneConfiguration();
  assert.deepEqual(valeurs.get('depots'), []);
  assert.equal(valeurs.has('depotActif'), false);
  assert.deepEqual(ANCIENNES.filter((cle) => valeurs.has(cle)), []);
});

test('une liste déjà présente, même vide, n’est ni réimportée ni écrasée : seul le nettoyage se termine', async () => {
  for (const depots of [[], [GITLAB]]) {
    const { valeurs } = stockageFigma({ depots, repoUrl: GITHUB.repoUrl, baseBranch: 'main', github_pat: 'ghp_ancien' });
    await reprendreLAncienneConfiguration();
    assert.deepEqual(valeurs.get('depots'), depots);
    assert.deepEqual(ANCIENNES.filter((cle) => valeurs.has(cle)), []);
  }
});

test('une panne à chaque écriture de la reprise se termine à la prochaine ouverture, sans doublon', async () => {
  for (let apres = 0; apres <= 5; apres += 1) {
    const { panne, valeurs } = stockageFigma({ repoUrl: GITHUB.repoUrl, baseBranch: 'main', github_pat: 'ghp_ancien' });
    panne.apres = apres;
    await reprendreLAncienneConfiguration().catch(() => undefined);
    panne.apres = Infinity;
    await reprendreLAncienneConfiguration();
    const depots = valeurs.get('depots') as unknown[];
    assert.equal(depots.length, 1, `interruption après ${apres} écriture(s)`);
    assert.deepEqual(ANCIENNES.filter((cle) => valeurs.has(cle)), [], `interruption après ${apres} écriture(s)`);
    // L'interruption entre la liste et l'activation laisse le dépôt sans actif.
    if (apres !== 1) assert.equal(valeurs.get('depotActif'), ID_GITHUB, `interruption après ${apres} écriture(s)`);
  }
});

test('la clé de destination ignore la casse du projet et garde celle de la branche', () => {
  const cle = (projet: string, baseBranch: string) => cleDeDestination({ forge: 'gitlab', projet, baseBranch }, true);
  assert.equal(cle('Mon-Groupe/Design-System', 'main'), cle('mon-groupe/design-system', 'main'));
  assert.notEqual(cle('mon-groupe/design-system', 'Main'), cle('mon-groupe/design-system', 'main'));
  assert.deepEqual(JSON.parse(cle('Mon-Groupe/Design-System', 'Release')), ['gitlab', 'mon-groupe/design-system', 'Release', true]);
});

test('une branche qui contient un séparateur ne confond pas deux destinations', () => {
  const avecBarre = cleDeDestination({ forge: 'github', projet: 'a/b', baseBranch: 'x|y' }, true);
  const avecArobase = cleDeDestination({ forge: 'github', projet: 'a/b', baseBranch: 'x@y' }, true);
  assert.deepEqual(JSON.parse(avecBarre), ['github', 'a/b', 'x|y', true]);
  assert.deepEqual(JSON.parse(avecArobase), ['github', 'a/b', 'x@y', true]);
  assert.notEqual(avecBarre, avecArobase);
});

test('sans configuration valide, la destination est le téléchargement, et la clé ne porte aucun jeton', async () => {
  assert.equal(cleDeDestination(null, true), JSON.stringify(['aucune', true]));
  stockageFigma({ depots: [{ repoUrl: 'https://github.com/a/b', baseBranch: 'main', jeton: '' }], depotActif: 'github:a/b' });
  assert.equal((await lireInstantane()).destination, JSON.stringify(['aucune', true]));
  stockageFigma({ depots: [{ repoUrl: 'https://github.com/a/b', baseBranch: 'main', jeton: 'ghp_secret' }], depotActif: 'github:a/b' });
  const instantane = await lireInstantane();
  assert.equal(instantane.destination, JSON.stringify(['github', 'a/b', 'main', true]));
  assert.doesNotMatch(instantane.destination, /ghp_secret/);
});

test('le nom d’un dépôt est le dernier segment de son projet, sous-groupes compris', () => {
  assert.equal(nomDuDepot('mon-org/design-system-v3'), 'design-system-v3');
  assert.equal(nomDuDepot('mon-groupe/equipe-produit/design-system'), 'design-system');
});

test('la gestion des tokens vaut « activée » tant que rien n’est enregistré, et entre dans la clé', async () => {
  const { valeurs } = stockageFigma({ depots: [{ repoUrl: 'https://github.com/a/b', baseBranch: 'main', jeton: 'ghp_secret' }], depotActif: 'github:a/b' });
  const activee = await lireInstantane();
  assert.equal(activee.tokens, true);

  await ecrireGestionDesTokens(false);
  assert.equal(valeurs.get('gestionDesTokens'), false);
  const desactivee = await lireInstantane();
  assert.equal(desactivee.tokens, false);
  assert.notEqual(desactivee.destination, activee.destination);
  assert.equal(memeDepot(desactivee.destination, activee.destination), true);
  assert.equal(memeDepot(activee.destination, cleDeDestination(null, true)), false);
});

test('l’export local vaut « désactivé » tant que rien n’est enregistré, garde le dépôt actif et ne rend aucune configuration', async () => {
  const { valeurs } = stockageFigma({ depots: [GITHUB], depotActif: ID_GITHUB });
  const branche = await lireInstantane();
  assert.equal(branche.exportLocal, false);
  assert.equal((await loadConfiguration()).config?.projet, 'mon-org/design-system-v3');

  await ecrireExportLocal(true);
  assert.equal(valeurs.get('exportLocal'), true);
  const local = await lireInstantane();
  assert.equal(local.actif, ID_GITHUB);
  assert.equal(local.validation.config, null);
  assert.equal((await loadConfiguration()).config, null);
  assert.deepEqual(JSON.parse(local.destination), ['local', true]);
  assert.equal(memeDepot(local.destination, cleDeDestination(null, true)), false);
});

test('en export local, le premier dépôt d’une liste vide ne devient pas actif', async () => {
  const { ecritures, valeurs } = stockageFigma({ depots: [], exportLocal: true });
  const premier = await enregistrerDepot(GITHUB, null);
  assert.equal(premier.id, ID_GITHUB);
  assert.deepEqual(ecritures, ['set depots']);
  assert.equal(valeurs.has('depotActif'), false);
});

test('« Se connecter » écrit le dépôt actif, puis désactive l’export local', async () => {
  const { ecritures, valeurs } = stockageFigma({ depots: [GITHUB, GITLAB], depotActif: ID_GITHUB, exportLocal: true });
  await activerDepot(ID_GITLAB);
  assert.deepEqual(ecritures, ['set depotActif', 'set exportLocal']);
  assert.equal(valeurs.get('exportLocal'), false);
  assert.equal((await lireInstantane()).validation.config?.projet, 'mon-groupe/design-system');

  ecritures.length = 0;
  await activerDepot('github:absent/depot');
  assert.deepEqual(ecritures, []);
});
