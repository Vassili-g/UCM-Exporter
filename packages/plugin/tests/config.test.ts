import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleDeDestination,
  forgeDuPrefixe,
  lireAdresseDuDepot,
  lireInstantane,
  loadConfiguration,
  loadPublicSettings,
  nomDuDepot,
  saveSettings,
  supprimerPat,
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

test('un jeton GitHub enregistré ne vaut rien pour une URL GitLab', async () => {
  stockageFigma({ repoUrl: 'https://gitlab.com/mon-groupe/design-system', baseBranch: 'main', github_pat: 'ghp_secret' });
  const validation = await loadConfiguration();
  assert.equal(validation.valid, false);
  assert.equal(validation.config, null);
  assert.equal(validation.jetonAutreForge, true);
});

test('l’enregistrement écrit l’ancien retrait, la forge, le jeton, puis l’URL', async () => {
  const { ecritures, valeurs } = stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', github_pat: 'ghp_x' });
  const validation = await saveSettings({ repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: 'glpat-y' });
  assert.equal(validation.valid, true);
  assert.deepEqual(ecritures, [
    'delete github_pat',
    'set forge_du_jeton',
    'set github_pat',
    'set repoUrl',
    'set baseBranch',
  ]);
  assert.equal(valeurs.get('forge_du_jeton'), 'gitlab');
});

test('un enregistrement interrompu ne laisse aucun jeton utilisable par l’autre forge', async () => {
  // Chaque point d'interruption possible de la bascule GitHub vers GitLab.
  for (let apres = 0; apres <= 4; apres += 1) {
    const { panne } = stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', github_pat: 'ghp_x' });
    panne.apres = apres;
    await saveSettings({ repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: 'glpat-y' }).catch(() => undefined);
    const validation = await loadConfiguration();
    if (!validation.config) continue;
    const prefixe = forgeDuPrefixe(validation.config.jeton);
    assert.equal(prefixe, validation.config.forge, `interruption après ${apres} écriture(s)`);
  }
});

test('un champ vide ne conserve pas le jeton d’une autre forge', async () => {
  stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', github_pat: 'ghp_x' });
  const validation = await saveSettings({ repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', jeton: '' });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.jeton ?? '', /GitLab/);
});

test('l’UI apprend la forge du jeton, jamais le jeton, et la suppression retire les deux', async () => {
  const { valeurs } = stockageFigma({ repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', github_pat: 'glpat-x', forge_du_jeton: 'gitlab' });
  const publics = await loadPublicSettings();
  assert.deepEqual(publics, { repoUrl: 'https://gitlab.com/g/p', baseBranch: 'main', forgeDuJeton: 'gitlab' });

  await supprimerPat();
  assert.equal(valeurs.has('github_pat'), false);
  assert.equal(valeurs.has('forge_du_jeton'), false);
  assert.equal((await loadPublicSettings()).forgeDuJeton, null);
});

test('un jeton enregistré avant GitLab appartient à GitHub', async () => {
  stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', github_pat: 'ghp_ancien' });
  assert.equal((await loadPublicSettings()).forgeDuJeton, 'github');
  assert.equal((await loadConfiguration()).valid, true);
});

test('la clé de destination ignore la casse du projet et garde celle de la branche', () => {
  const cle = (projet: string, baseBranch: string) => cleDeDestination({ forge: 'gitlab', projet, baseBranch });
  assert.equal(cle('Mon-Groupe/Design-System', 'main'), cle('mon-groupe/design-system', 'main'));
  assert.notEqual(cle('mon-groupe/design-system', 'Main'), cle('mon-groupe/design-system', 'main'));
  assert.deepEqual(JSON.parse(cle('Mon-Groupe/Design-System', 'Release')), ['gitlab', 'mon-groupe/design-system', 'Release']);
});

test('une branche qui contient un séparateur ne confond pas deux destinations', () => {
  const avecBarre = cleDeDestination({ forge: 'github', projet: 'a/b', baseBranch: 'x|y' });
  const avecArobase = cleDeDestination({ forge: 'github', projet: 'a/b', baseBranch: 'x@y' });
  assert.deepEqual(JSON.parse(avecBarre), ['github', 'a/b', 'x|y']);
  assert.deepEqual(JSON.parse(avecArobase), ['github', 'a/b', 'x@y']);
  assert.notEqual(avecBarre, avecArobase);
});

test('sans configuration valide, la destination est le téléchargement, et la clé ne porte aucun jeton', async () => {
  assert.equal(cleDeDestination(null), JSON.stringify(['aucune']));
  stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main' });
  assert.equal((await lireInstantane()).destination, JSON.stringify(['aucune']));
  stockageFigma({ repoUrl: 'https://github.com/a/b', baseBranch: 'main', github_pat: 'ghp_secret' });
  const instantane = await lireInstantane();
  assert.equal(instantane.destination, JSON.stringify(['github', 'a/b', 'main']));
  assert.doesNotMatch(instantane.destination, /ghp_secret/);
});

test('le nom d’un dépôt est le dernier segment de son projet, sous-groupes compris', () => {
  assert.equal(nomDuDepot('mon-org/design-system-v3'), 'design-system-v3');
  assert.equal(nomDuDepot('mon-groupe/equipe-produit/design-system'), 'design-system');
});
