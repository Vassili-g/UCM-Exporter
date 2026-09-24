import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeBase64 } from '../src/base64';
import { corpsDeLaDemande, diagnostiquerConnexion, publishArtifact, repositoryLayout } from '../src/depot';
import type { RepositoryArtifact } from '../src/depot';
import { forgeGithub } from '../src/forges/github';
import { forgeGitlab, sansLienAutomatiqueGitlab } from '../src/forges/gitlab';

type Appel = { url: string; method: string; headers: Record<string, string>; body: unknown };

/**
 * Remplace `fetch` le temps d'un travail et relève chaque appel, en-têtes et
 * corps compris : le commit et la merge request se distinguent par leur corps.
 */
async function avecFetch<T>(
  reponse: (appel: Appel) => Response,
  travail: () => Promise<T>,
): Promise<{ resultat: T; appels: Appel[] }> {
  const appels: Appel[] = [];
  const precedent = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const appel: Appel = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    appels.push(appel);
    return reponse(appel);
  };
  try {
    return { resultat: await travail(), appels };
  } finally {
    globalThis.fetch = precedent;
  }
}

const forge = forgeGitlab({ projet: 'mon-groupe/design-system', baseBranch: 'main', jeton: 'glpat-jamais-logue' });
const PROJET = '/projects/mon-groupe%2Fdesign-system';

const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });
const introuvable = () => json({ message: '404 File Not Found' }, 404);

/** Un fichier tel que l'API Repository files le rend. */
function fichier(contenu: string, commitId = 'sha-base', lastCommitId = 'sha-fichier'): Response {
  return json({ content: encodeBase64(contenu), encoding: 'base64', commit_id: commitId, last_commit_id: lastCommitId });
}

const estConfiguration = (url: string) => url.includes('/files/ucm.config.json?');
const estListe = (url: string) => url.includes('/merge_requests?');

function contratFigma(name: string, nodeId: string): string {
  return JSON.stringify({
    name,
    meta: {
      contractVersion: '3.0',
      exportedAt: '2026-09-04T10:00:00.000Z',
      figma: { fileName: 'DS', nodeId },
    },
  });
}

const composant = (content: string, warnings: string[] = []): RepositoryArtifact => ({
  kind: 'component', filename: 'IconButton.contract.json', content, warnings,
});

/** Une merge request d'export ouverte depuis le projet lui-même. */
const demande = (branche: string, url?: string) => ({
  source_branch: branche, project_id: 7, source_project_id: 7, ...(url ? { web_url: url } : {}),
});

/** Répond à une publication qui aboutit : base, commit, merge request. */
function ecritureReussie(appel: Appel): Response | null {
  if (appel.method === 'POST' && appel.url.endsWith('/repository/commits')) return json({ id: 'sha-commit' }, 201);
  if (appel.method === 'POST' && appel.url.endsWith('/merge_requests')) {
    return json({ iid: 3, web_url: 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/3' }, 201);
  }
  if (appel.url.includes('/repository/branches/main')) return json({ commit: { id: 'sha-tete' } });
  return null;
}

test('un fichier inchangé sur la base ne crée ni commit ni merge request', async () => {
  const { resultat, appels } = await avecFetch(
    ({ url }) => (estConfiguration(url) ? introuvable() : fichier('{"same":true}\n')),
    () => publishArtifact(forge, { kind: 'tokens', filename: 'tokens.json', content: '{"same":true}\n', warnings: [] }),
  );
  assert.deepEqual(resultat, {
    status: 'unchanged', path: 'tokens.json', source: 'les valeurs par défaut', ou: 'branche main', pullRequestUrl: null,
  });
  assert.equal(appels.length, 2);
});

test('seul meta.exportedAt diffère : aucun export', async () => {
  const surLaBase = contratFigma('IconButton', '1:2');
  const { resultat } = await avecFetch(
    ({ url }) => (estConfiguration(url) ? introuvable() : fichier(surLaBase)),
    () => publishArtifact(forge, composant(surLaBase.replace('2026-09-04', '2026-09-05'))),
  );
  assert.equal(resultat.status, 'unchanged');
});

test('une merge request d’export identique en vol ne crée pas un second export', async () => {
  const branche = 'ucm-exporter/export-component-20260904-090000';
  const contrat = contratFigma('IconButton', '67:890');
  const { resultat, appels } = await avecFetch(
    ({ url }) => {
      if (estListe(url)) {
        return json([demande(branche, 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/12')]);
      }
      if (url.includes(`ref=${encodeURIComponent(branche)}`)) return fichier(contrat);
      return introuvable();
    },
    () => publishArtifact(forge, composant(contrat)),
  );
  assert.deepEqual(resultat, {
    status: 'unchanged',
    path: 'components/IconButton/IconButton.contract.json',
    source: 'les valeurs par défaut',
    ou: `merge request d'export ouverte, branche ${branche}`,
    pullRequestUrl: 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/12',
  });
  assert.deepEqual(appels.map((appel) => appel.method), ['GET', 'GET', 'GET', 'GET']);
  assert.match(appels[2].url, /merge_requests\?state=opened&target_branch=main&per_page=100$/);
});

test('deux composants distincts au même chemin sur la base : refus avant toute écriture', async () => {
  const { appels } = await avecFetch(
    ({ url }) => {
      if (estConfiguration(url)) return introuvable();
      if (estListe(url)) return json([]);
      return fichier(contratFigma('Icon / Button', '12:345'));
    },
    async () => assert.rejects(
      publishArtifact(forge, composant(contratFigma('IconButton', '67:890'))),
      /« IconButton » et « Icon \/ Button »/,
    ),
  );
  assert.deepEqual(appels.map((appel) => appel.method), ['GET', 'GET', 'GET']);
});

test('une collision encore en vol dans une merge request ouverte est vue', async () => {
  const branche = 'ucm-exporter/export-component-20260904-090000';
  await avecFetch(
    ({ url }) => {
      if (estListe(url)) return json([demande('feature/couleurs'), demande(branche)]);
      if (url.includes(`ref=${encodeURIComponent(branche)}`)) return fichier(contratFigma('Icon / Button', '12:345'));
      return introuvable();
    },
    async () => assert.rejects(
      publishArtifact(forge, composant(contratFigma('IconButton', '67:890'))),
      new RegExp(`merge request d'export ouverte, branche ${branche}`),
    ),
  );
});

test('une merge request venue d’une fourche n’est pas lue dans ce projet', async () => {
  const branche = 'ucm-exporter/export-component-20260904-090000';
  const { resultat, appels } = await avecFetch(
    (appel) => {
      if (estListe(appel.url)) return json([{ ...demande(branche), source_project_id: 99 }]);
      return ecritureReussie(appel) ?? introuvable();
    },
    () => publishArtifact(forge, composant(contratFigma('IconButton', '67:890'))),
  );
  assert.equal(resultat.status, 'created');
  assert.equal(appels.some(({ url }) => url.includes(`ref=${encodeURIComponent(branche)}`)), false);
});

test('un contrat sans identité Figma lisible refuse plutôt que d’écraser', async () => {
  await avecFetch(
    ({ url }) => {
      if (estConfiguration(url)) return introuvable();
      if (estListe(url)) return json([]);
      return fichier(JSON.stringify({ name: 'IconButton', meta: { contractVersion: '3.0' } }));
    },
    async () => assert.rejects(
      publishArtifact(forge, composant(contratFigma('IconButton', '67:890'))),
      /aucune identité Figma lisible/,
    ),
  );
});

test('un ucm.config.json vide refuse l’export au lieu de prendre les défauts', async () => {
  await assert.rejects(
    avecFetch(() => fichier(''), () => repositoryLayout(forge)),
    /ucm\.config\.json du dépôt n'est pas du JSON valide/,
  );
});

test('un contrat vide déjà présent refuse plutôt que d’écraser', async () => {
  await avecFetch(
    ({ url }) => {
      if (estConfiguration(url)) return introuvable();
      if (estListe(url)) return json([]);
      return fichier('');
    },
    async () => assert.rejects(
      publishArtifact(forge, composant(contratFigma('IconButton', '67:890'))),
      /aucune identité Figma lisible/,
    ),
  );
});

test('les tokens ne passent pas par la détection de collision', async () => {
  const branche = 'ucm-exporter/export-tokens-20260904-090000';
  const { resultat } = await avecFetch(
    (appel) => {
      if (estListe(appel.url)) return json([demande(branche)]);
      if (appel.url.includes(`ref=${encodeURIComponent(branche)}`)) return fichier('{"ancien":true}');
      return ecritureReussie(appel) ?? introuvable();
    },
    () => publishArtifact(forge, { kind: 'tokens', filename: 'tokens.json', content: '{"nouveau":true}', warnings: [] }),
  );
  assert.equal(resultat.status, 'created');
});

test('un réexport corrigé pendant qu’une merge request est ouverte n’est pas bloqué', async () => {
  const branche = 'ucm-exporter/export-component-20260904-090000';
  const { resultat } = await avecFetch(
    (appel) => {
      if (estListe(appel.url)) return json([demande(branche)]);
      if (appel.url.includes(`ref=${encodeURIComponent(branche)}`)) return fichier(contratFigma('IconButton', '67:890'));
      return ecritureReussie(appel) ?? introuvable();
    },
    () => publishArtifact(forge, composant(contratFigma('Icon Button', '67:890'))),
  );
  assert.equal(resultat.status, 'created');
});

test('un nouveau fichier part en create depuis la tête de la base, puis la merge request s’ouvre', async () => {
  const { resultat, appels } = await avecFetch(
    (appel) => (estListe(appel.url) ? json([]) : ecritureReussie(appel) ?? introuvable()),
    () => publishArtifact(forge, composant('{}', ['Calque « row » : aucune variable.']), new Date(2026, 6, 17, 9, 5)),
  );
  assert.deepEqual(resultat, {
    status: 'created',
    path: 'components/IconButton/IconButton.contract.json',
    branch: 'ucm-exporter/export-component-20260717-090500',
    pullRequestUrl: 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/3',
    source: 'les valeurs par défaut',
  });
  assert.deepEqual(appels.map((appel) => appel.method), ['GET', 'GET', 'GET', 'GET', 'POST', 'POST']);
  assert.equal(appels[3].url, `https://gitlab.com/api/v4${PROJET}/repository/branches/main`);
  assert.deepEqual(appels[4].body, {
    branch: 'ucm-exporter/export-component-20260717-090500',
    start_sha: 'sha-tete',
    commit_message: 'UCM Contract Exporter: export IconButton.contract.json',
    actions: [{ action: 'create', file_path: 'components/IconButton/IconButton.contract.json', content: '{}' }],
  });
  const ouverture = appels[5].body as Record<string, unknown>;
  assert.equal(ouverture.source_branch, 'ucm-exporter/export-component-20260717-090500');
  assert.equal(ouverture.target_branch, 'main');
  assert.equal(ouverture.remove_source_branch, true);
  assert.match(String(ouverture.description), /Calque « row » : aucune variable\./);
  assert.equal('force' in (appels[4].body as object), false);
});

test('un fichier existant part en update depuis la version lue, avec last_commit_id', async () => {
  const { appels } = await avecFetch(
    (appel) => {
      if (estConfiguration(appel.url)) return introuvable();
      if (estListe(appel.url)) return json([]);
      if (appel.method === 'GET' && appel.url.includes('/repository/files/')) {
        return fichier(contratFigma('IconButton', '67:890'), 'sha-lu', 'sha-derniere-modif');
      }
      return ecritureReussie(appel) ?? introuvable();
    },
    () => publishArtifact(forge, composant(contratFigma('Icon Button', '67:890'))),
  );
  // Aucune lecture de branche : la version lue donne le point de départ.
  assert.equal(appels.some(({ url }) => url.includes('/repository/branches/')), false);
  const commit = appels.find(({ url, method }) => method === 'POST' && url.endsWith('/repository/commits'))!;
  const corps = commit.body as { start_sha: string; actions: Array<Record<string, string>> };
  assert.equal(corps.start_sha, 'sha-lu');
  assert.equal(corps.actions[0].action, 'update');
  assert.equal(corps.actions[0].last_commit_id, 'sha-derniere-modif');
});

test('l’échec de la merge request supprime la branche que le commit a créée', async () => {
  const branche = 'ucm-exporter/export-component-20260717-090500';
  const { appels } = await avecFetch(
    (appel) => {
      if (estListe(appel.url)) return json([]);
      if (appel.method === 'POST' && appel.url.endsWith('/merge_requests')) {
        return json({ message: ['Another open merge request already exists for this source branch: !1'] }, 409);
      }
      if (appel.method === 'DELETE') return new Response(null, { status: 204 });
      return ecritureReussie(appel) ?? introuvable();
    },
    async () => assert.rejects(
      publishArtifact(forge, composant('{}'), new Date(2026, 6, 17, 9, 5)),
      (erreur: Error & { status?: number }) => {
        assert.match(erreur.message, /GitLab a répondu 409 : \["Another open merge request/);
        assert.equal(erreur.status, 409);
        return true;
      },
    ),
  );
  assert.deepEqual(appels.map((appel) => appel.method), ['GET', 'GET', 'GET', 'GET', 'POST', 'POST', 'DELETE']);
  assert.equal(appels[6].url, `https://gitlab.com/api/v4${PROJET}/repository/branches/${encodeURIComponent(branche)}`);
});

test('un commit refusé ne laisse rien à supprimer et remonte son statut', async () => {
  const { appels } = await avecFetch(
    (appel) => {
      if (estListe(appel.url)) return json([]);
      if (appel.method === 'POST' && appel.url.endsWith('/repository/commits')) {
        return json({ message: "A branch called 'x' already exists." }, 400);
      }
      return ecritureReussie(appel) ?? introuvable();
    },
    async () => assert.rejects(publishArtifact(forge, composant('{}')), /GitLab a répondu 400 : A branch called/),
  );
  assert.equal(appels.some(({ method }) => method === 'DELETE' || method === 'PUT'), false);
});

test('le projet, un chemin de fichier et une branche forment chacun un seul segment d’URL', async () => {
  const imbrique = forgeGitlab({ projet: 'groupe/sous-groupe/projet', baseBranch: 'main', jeton: 'glpat-x' });
  const branche = 'ucm-exporter/export-component-20260717-090500';
  const { appels } = await avecFetch(
    () => introuvable(),
    async () => {
      await imbrique.lireFichier('components/Button/Button.contract.json', branche);
      await imbrique.testerDepot().catch(() => undefined);
    },
  );
  assert.equal(
    appels[0].url,
    'https://gitlab.com/api/v4/projects/groupe%2Fsous-groupe%2Fprojet/repository/files/'
      + 'components%2FButton%2FButton.contract.json?ref=ucm-exporter%2Fexport-component-20260717-090500',
  );
  assert.equal(appels[1].url, 'https://gitlab.com/api/v4/projects/groupe%2Fsous-groupe%2Fprojet');
});

test('un jeton ne part que dans l’en-tête de sa forge', async () => {
  const github = forgeGithub({
    projet: 'acme/ds', baseBranch: 'main', jeton: 'ghp_x',
  });
  const { appels } = await avecFetch(
    () => json({}),
    async () => {
      await forge.testerDepot();
      await github.testerDepot();
    },
  );
  const [versGitlab, versGithub] = appels;
  assert.equal(versGitlab.headers['PRIVATE-TOKEN'], 'glpat-jamais-logue');
  assert.equal('Authorization' in versGitlab.headers, false);
  assert.equal(versGithub.headers.Authorization, 'Bearer ghp_x');
  assert.equal('PRIVATE-TOKEN' in versGithub.headers, false);
});

test('la connexion GitLab rend la cause de chaque statut, et le réseau à part', async () => {
  for (const [statut, cause] of [[401, 'jeton-refuse'], [403, 'acces-refuse'], [404, 'depot-introuvable']] as const) {
    const { resultat } = await avecFetch(() => json({ message: String(statut) }, statut), () => diagnostiquerConnexion(forge));
    assert.equal(resultat.cause, cause);
  }
  const precedent = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  try {
    assert.equal((await diagnostiquerConnexion(forge)).cause, 'reseau');
  } finally {
    globalThis.fetch = precedent;
  }
});

test('au-delà de 20 Mo, le contrat n’est pas envoyé à GitLab', async () => {
  const { appels } = await avecFetch(
    () => json({}),
    async () => assert.rejects(
      publishArtifact(forge, composant('x'.repeat(20 * 1024 * 1024 + 1))),
      /limite GitLab de 20 Mo\. Il reste disponible en téléchargement local\./,
    ),
  );
  assert.equal(appels.length, 0);
});

test('le corps d’une merge request garde ce qu’une pull request aurait coupé', () => {
  const avertissements = Array.from({ length: 800 }, (_, index) => `Calque « c${index} » : ${'x'.repeat(100)}`);
  const corps = corpsDeLaDemande('a.json', composant('{}', avertissements), forge);
  assert.ok(corps.length > 65_536);
  assert.doesNotMatch(corps, /ne tiennent pas dans cette page/);
});

test('chaque forme que GitLab relie ou exécute part en code, et rien d’autre', () => {
  assert.equal(
    sansLienAutomatiqueGitlab('Ajoutez @icons. Voir #12, !3, ~primaire, ~"a b", %v1, $4, &5, a/b#6 et g/s/p!7.'),
    'Ajoutez `@icons`. Voir `#12`, `!3`, `~primaire`, `~"a b"`, `%v1`, `$4`, `&5`, `a/b#6` et `g/s/p!7`.',
  );
  // Un pourcentage, une adresse, un mot suivi d'un chiffre et du code déjà
  // marqué restent tels quels.
  const inertes = '50 % et 100%, mail a@b.fr, `v1!2`, `@deja` et `#3`.';
  assert.equal(sansLienAutomatiqueGitlab(inertes), inertes);
});

test('une ligne qui commencerait une action rapide part en code', () => {
  assert.equal(
    sansLienAutomatiqueGitlab('Calque « x »\n/close\n  /label ~y\nfin /pas-en-tete'),
    'Calque « x »\n`/close`\n  `/label` `~y`\nfin /pas-en-tete',
  );
  const corps = corpsDeLaDemande('a.json', composant('{}', ['Nom « a »\n/merge']), forge);
  assert.doesNotMatch(corps, /^\/merge/m);
});
