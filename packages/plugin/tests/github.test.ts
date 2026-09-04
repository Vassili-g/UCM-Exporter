import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import type { GithubConfig } from '../src/config';
import {
  artifactPath,
  decodeBase64,
  encodeBase64,
  exportBranchName,
  layoutDesReglages,
  publishArtifact,
  pullRequestBody,
  repositoryLayout,
  utf8ByteLength,
} from '../src/github';

/**
 * Remplace `fetch` le temps d'un appel, et le rend toujours.
 *
 * Le stub répond PAR URL, et ce n'est pas du confort : depuis T4.1, publier
 * interroge d'abord `ucm.config.json`. Un stub qui répondrait la même chose à
 * tout le monde ferait passer le contrat pour une configuration, et le test
 * mesurerait le stub.
 */
async function avecFetch<T>(
  reponse: (url: string) => Response,
  travail: () => Promise<T>,
): Promise<T> {
  const precedent = globalThis.fetch;
  globalThis.fetch = async (input) => reponse(String(input));
  try {
    return await travail();
  } finally {
    globalThis.fetch = precedent;
  }
}

/**
 * Comme `avecFetch`, mais le stub voit aussi la MÉTHODE.
 *
 * Un export complet enchaîne des GET, un POST de branche, un PUT de contenu et
 * un POST de pull request sur des URL qui se ressemblent : répondre à l'URL
 * seule confondrait la création de la branche et l'ouverture de la PR.
 */
async function avecMethode<T>(
  reponse: (url: string, method: string) => Response,
  travail: () => Promise<T>,
): Promise<T> {
  const precedent = globalThis.fetch;
  globalThis.fetch = async (input, init) => reponse(String(input), init?.method ?? 'GET');
  try {
    return await travail();
  } finally {
    globalThis.fetch = precedent;
  }
}

/** Une configuration de repository absente : le cas nominal. */
function sansConfiguration(url: string): Response | null {
  return url.includes('ucm.config.json') ? new Response('{}', { status: 404 }) : null;
}

/** Le contenu d'un fichier, tel que l'API GitHub le rend. */
function fichier(contenu: string, sha = 'existing-sha'): Response {
  return new Response(
    JSON.stringify({ type: 'file', sha, content: encodeBase64(contenu), encoding: 'base64' }),
    { status: 200 },
  );
}

const config: GithubConfig = {
  repoUrl: 'https://github.com/acme/design-system',
  owner: 'acme',
  repo: 'design-system',
  baseBranch: 'main',
  componentsPath: 'src/components',
  tokensPath: 'src/tokens',
  githubPat: 'secret-never-logged',
};

test('artifactPath dérive les paths du composant et des tokens', () => {
  const layout = layoutDesReglages(config);
  assert.equal(
    artifactPath({ kind: 'component', filename: 'Button.contract.json', content: '{}', warnings: [] }, layout),
    'src/components/Button/Button.contract.json',
  );
  assert.equal(
    artifactPath({ kind: 'tokens', filename: 'tokens.json', content: '{}', warnings: [] }, layout),
    'src/tokens/tokens.json',
  );
});

/**
 * T4.1. Le repository est seul à savoir où ses contrats vivent ; les réglages
 * du plugin sont locaux à une machine et ne savent rien de lui. Le défaut était
 * masqué par une coïncidence — les défauts des réglages décrivent justement le
 * repository de démonstration —, et il se déclenche au premier repo aux
 * conventions différentes : l'export écrit là où la CI ne regarde pas, la PR
 * s'ouvre, le contrôle ne trouve rien de nouveau, tout est vert.
 */
test('la configuration du repository décide où l’export s’écrit', async () => {
  const configuration = {
    components: 'design/contrats',
    tokens: 'design/tokens/design-tokens.json',
  };
  const layout = await avecFetch(
    () => fichier(JSON.stringify(configuration)),
    () => repositoryLayout(config),
  );

  assert.equal(layout.source, 'ucm.config.json');
  assert.equal(
    artifactPath({ kind: 'component', filename: 'Button.contract.json', content: '{}', warnings: [] }, layout),
    'design/contrats/Button/Button.contract.json',
  );
  // `tokens` est un CHEMIN DE FICHIER, pas un dossier : les réglages du plugin
  // ajoutaient `/tokens.json`, et les deux conventions ne se distinguaient pas
  // tant que le dossier s'appelait `tokens`.
  assert.equal(
    artifactPath({ kind: 'tokens', filename: 'tokens.json', content: '{}', warnings: [] }, layout),
    'design/tokens/design-tokens.json',
  );
});

/**
 * Un repository qui ne se décrit pas est le cas NOMINAL, pas une erreur : c'est
 * le critère de réussite n° 1. Les réglages prennent alors le relais.
 */
test('un repository sans ucm.config.json retombe sur les réglages, sans erreur', async () => {
  const layout = await avecFetch(
    () => new Response('{}', { status: 404 }),
    () => repositoryLayout(config),
  );

  assert.deepEqual(layout, layoutDesReglages(config));
});

/**
 * Présent et mal formé, c'est autre chose : quelqu'un a voulu dire où écrire.
 * Retomber en silence sur les réglages déposerait le contrat ailleurs que là où
 * son propriétaire l'a demandé — et le silence est ce qui rend le défaut
 * incompréhensible ensuite.
 */
test('une configuration de repository fautive refuse l’export au lieu de deviner', async () => {
  await assert.rejects(
    () => avecFetch(() => fichier('{ pas du json'), () => repositoryLayout(config)),
    /ucm\.config\.json du repository n'est pas du JSON valide/,
  );

  await assert.rejects(
    () => avecFetch(
      () => fichier(JSON.stringify({ contractVersion: '12.0' })),
      () => repositoryLayout(config),
    ),
    /aucun numéro de version ne s'y écrit/,
  );
});

test('encodeBase64 préserve les caractères Unicode', () => {
  const value = '{"usage":"Être cohérent"}';
  assert.equal(encodeBase64(value), Buffer.from(value, 'utf8').toString('base64'));
  assert.equal(decodeBase64(encodeBase64(value)), value);
});

test('utf8ByteLength reste disponible sans TextEncoder', () => {
  assert.equal(utf8ByteLength('Être cohérent'), Buffer.byteLength('Être cohérent', 'utf8'));
});

test('decodeBase64 accepte les retours à la ligne GitHub et refuse une Base64 invalide', () => {
  // Charge utile volontairement neutre : ce test porte sur le décodage Base64,
  // pas sur le nom du produit (un nom en dur ici casse à chaque renommage).
  assert.equal(decodeBase64('ZGVzaWdu\nIHN5c3RlbQ=='), 'design system');
  assert.throws(() => decodeBase64('%%%='), /Base64 GitHub invalide/);
});

test('exportBranchName inclut le type d’artefact et les secondes (anti-collision)', () => {
  // Exporter le contrat PUIS les tokens dans la même minute est le flux
  // courant : les deux branches doivent différer.
  assert.equal(
    exportBranchName('tokens', new Date(2026, 6, 17, 9, 5, 42)),
    'ucm-exporter/export-tokens-20260717-090542',
  );
  assert.equal(
    exportBranchName('component', new Date(2026, 6, 17, 9, 5, 42)),
    'ucm-exporter/export-component-20260717-090542',
  );
});

test('publishArtifact ne crée aucune branche si le fichier est inchangé', async () => {
  const calls: string[] = [];
  const result = await avecFetch(
    (url) => {
      calls.push(url);
      return sansConfiguration(url) ?? fichier('{"same":true}\n');
    },
    () => publishArtifact(config, {
      kind: 'tokens',
      filename: 'tokens.json',
      content: '{"same":true}\n',
      warnings: [],
    }),
  );

  assert.deepEqual(result, {
    status: 'unchanged',
    path: 'src/tokens/tokens.json',
    source: 'réglages du plugin',
  });
  // Deux appels et pas un de plus : la configuration du repository, puis le
  // fichier lui-même. Aucune branche n'est créée.
  assert.equal(calls.length, 2);
});

test('publishArtifact fonctionne dans un runtime Figma sans TextEncoder', async () => {
  const previousTextEncoder = (globalThis as any).TextEncoder;
  (globalThis as any).TextEncoder = undefined;

  try {
    const result = await avecFetch(
      (url) => sansConfiguration(url) ?? fichier('{"same":true}\n'),
      () => publishArtifact(config, {
        kind: 'tokens',
        filename: 'tokens.json',
        content: '{"same":true}\n',
        warnings: [],
      }),
    );
    assert.deepEqual(result, {
      status: 'unchanged',
      path: 'src/tokens/tokens.json',
      source: 'réglages du plugin',
    });
  } finally {
    (globalThis as any).TextEncoder = previousTextEncoder;
  }
});

test('publishArtifact compare aussi un fichier GitHub supérieur à 1 Mo via son blob', async () => {
  const calls: string[] = [];
  const content = '{"same":true}\n';
  const result = await avecFetch(
    (url) => {
      calls.push(url);
      const absente = sansConfiguration(url);
      if (absente) return absente;
      if (url.includes('/git/blobs/')) {
        return new Response(
          JSON.stringify({ content: encodeBase64(content), encoding: 'base64' }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ type: 'file', sha: 'large-sha', content: '', encoding: 'none' }),
        { status: 200 },
      );
    },
    () => publishArtifact(config, { kind: 'tokens', filename: 'tokens.json', content, warnings: [] }),
  );

  assert.deepEqual(result, {
    status: 'unchanged',
    path: 'src/tokens/tokens.json',
    source: 'réglages du plugin',
  });
  assert.match(calls[2], /\/git\/blobs\/large-sha$/);
});

test('publishArtifact ignore meta.exportedAt pour détecter un contrat inchangé', async () => {
  const contractOnRepo = JSON.stringify({
    name: 'Button',
    meta: { contractVersion: '3.0', exportedAt: '2026-07-17T16:11:07.100Z' },
    props: {},
  }, null, 2);
  const reExported = contractOnRepo.replace('2026-07-17T16:11:07.100Z', '2026-07-25T10:00:00.000Z');

  const calls: string[] = [];
  const result = await avecFetch(
    (url) => {
      calls.push(url);
      return sansConfiguration(url) ?? fichier(contractOnRepo);
    },
    () => publishArtifact(config, {
      kind: 'component',
      filename: 'Button.contract.json',
      content: reExported,
      warnings: [],
    }),
  );

  // Seul l'horodatage diffère : aucun changement design, donc aucune PR.
  assert.deepEqual(result, {
    status: 'unchanged',
    path: 'src/components/Button/Button.contract.json',
    source: 'réglages du plugin',
  });
  assert.equal(calls.length, 2);
});

test('publishArtifact supprime la branche quand l’ouverture de la PR échoue', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  const responses = [
    // Le repository ne se décrit pas : les réglages du plugin décident (T4.1).
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
    // Aucun export en vol : la recherche de collision de T4.3 liste les pull
    // requests ouvertes avant d'écrire, et ne trouve rien à comparer.
    new Response(JSON.stringify([]), { status: 200 }),
    new Response(JSON.stringify({ object: { sha: 'base-sha' } }), { status: 200 }),
    new Response(JSON.stringify({ ref: 'created' }), { status: 201 }),
    new Response(JSON.stringify({ content: { sha: 'file-sha' } }), { status: 201 }),
    // La PR est refusée : la branche et son commit ne doivent pas rester.
    new Response(JSON.stringify({ message: 'Validation Failed' }), { status: 422 }),
    new Response(null, { status: 204 }),
  ];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET' });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected fetch');
    return response;
  };

  try {
    await assert.rejects(
      publishArtifact(
        config,
        { kind: 'component', filename: 'Button.contract.json', content: '{}', warnings: [] },
        new Date(2026, 6, 17, 9, 5),
      ),
      /GitHub a répondu 422/,
    );
    assert.deepEqual(
      calls.map((call) => call.method),
      ['GET', 'GET', 'GET', 'GET', 'POST', 'PUT', 'POST', 'DELETE'],
    );
    assert.match(calls[7].url, /git\/refs\/heads\/ucm-exporter\/export-component-20260717-090500$/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishArtifact crée branche, commit et PR pour un nouveau fichier', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  const responses = [
    // Le repository ne se décrit pas : les réglages du plugin décident (T4.1).
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
    // Aucun export en vol : la recherche de collision de T4.3 liste les pull
    // requests ouvertes avant d'écrire, et ne trouve rien à comparer.
    new Response(JSON.stringify([]), { status: 200 }),
    new Response(JSON.stringify({ object: { sha: 'base-sha' } }), { status: 200 }),
    new Response(JSON.stringify({ ref: 'created' }), { status: 201 }),
    new Response(JSON.stringify({ content: { sha: 'file-sha' } }), { status: 201 }),
    new Response(JSON.stringify({ html_url: 'https://github.com/acme/design-system/pull/12' }), { status: 201 }),
  ];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET' });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected fetch');
    return response;
  };

  try {
    const result = await publishArtifact(
      config,
      { kind: 'component', filename: 'Button.contract.json', content: '{}', warnings: [] },
      new Date(2026, 6, 17, 9, 5),
    );
    assert.deepEqual(result, {
      status: 'created',
      path: 'src/components/Button/Button.contract.json',
      branch: 'ucm-exporter/export-component-20260717-090500',
      pullRequestUrl: 'https://github.com/acme/design-system/pull/12',
      source: 'réglages du plugin',
    });
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET', 'GET', 'GET', 'POST', 'PUT', 'POST']);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

/**
 * T4.3, et il faut le lire avec D9 sous les yeux : le plugin REFUSE.
 *
 * `codeIdentifier` n'est pas injective — « Icon / Button » et « IconButton »
 * rendent tous deux `IconButton` —, et l'identifiant nomme le dossier ET le
 * fichier de contrat. Sans ce refus, le second export écrase le premier, la CI
 * ne voit ensuite qu'UN seul contrat, donc aucun doublon, donc aucune erreur.
 * Le garde-fou de graphe existe et il est bloquant ; il est simplement
 * inatteignable pour la sortie du plugin.
 */
function contratFigma(name: string, nodeId: string, componentKey?: string): string {
  return JSON.stringify({
    name,
    meta: {
      contractVersion: '3.0',
      exportedAt: '2026-09-04T10:00:00.000Z',
      figma: { fileName: 'DS', nodeId, ...(componentKey ? { componentKey } : {}) },
    },
  });
}

/** Aucun export en vol : la liste des pull requests ouvertes est vide. */
function sansExportEnVol(url: string): Response | null {
  return url.includes('/pulls?') ? new Response('[]', { status: 200 }) : null;
}

test('deux composants Figma distincts au même chemin : l’export est refusé, rien n’est écrit', async () => {
  const calls: Array<{ url: string; method: string }> = [];
  await assert.rejects(
    avecMethode(
      (url, method) => {
        calls.push({ url, method });
        return sansConfiguration(url)
          ?? sansExportEnVol(url)
          ?? fichier(contratFigma('Icon / Button', '12:345'));
      },
      () => publishArtifact(config, {
        kind: 'component',
        filename: 'IconButton.contract.json',
        content: contratFigma('IconButton', '67:890'),
        warnings: [],
      }),
    ),
    (erreur: Error) => {
      // Le message doit NOMMER les deux composants et le geste : un refus qui
      // dit seulement « collision » ne se corrige pas, le designer ne sait pas
      // quel autre composant est en cause.
      assert.match(erreur.message, /« Icon \/ Button » et « IconButton »/);
      assert.match(erreur.message, /IconButton\/IconButton\.contract\.json/);
      assert.match(erreur.message, /Renommez l'un des deux composants dans Figma/);
      return true;
    },
  );

  // Le refus tombe AVANT toute écriture. Une branche créée puis abandonnée
  // laisserait une trace que personne n'ira nettoyer.
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET', 'GET']);
});

test('le même composant réexporté après un renommage dans Figma passe', async () => {
  // Le pendant obligatoire du test précédent. Un garde-fou qui refuse tout est
  // aussi inutile qu'un garde-fou qui ne refuse rien — et c'est exactement ce
  // qu'aurait produit `contract.name` comme arbitre de l'identité.
  const result = await avecMethode(
    (url, method) => {
      if (method === 'POST') {
        return new Response(JSON.stringify({ html_url: 'https://github.com/acme/ds/pull/7' }), { status: 201 });
      }
      if (method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'x' } }), { status: 201 });
      return sansConfiguration(url)
        ?? sansExportEnVol(url)
        ?? (url.includes('/git/ref/heads/')
          ? new Response(JSON.stringify({ object: { sha: 'base-sha' } }), { status: 200 })
          : fichier(contratFigma('Icon / Button', '12:345')));
    },
    () => publishArtifact(config, {
      kind: 'component',
      filename: 'IconButton.contract.json',
      content: contratFigma('IconButton', '12:345'),
      warnings: [],
    }),
  );

  assert.equal(result.status, 'created');
});

test('une collision encore en vol dans une pull request ouverte est vue', async () => {
  // Le trou que la lecture sur la seule branche de base laissait : un contrat
  // qui n'existe QUE dans une PR d'export ouverte y est invisible. Deux
  // composants en collision exportés coup sur coup ouvriraient deux PR sur le
  // même chemin, et la collision ne se révélerait qu'à la fusion de la
  // seconde — en écrasant la première.
  const branche = 'ucm-exporter/export-component-20260904-090000';
  await assert.rejects(
    avecMethode(
      (url) => {
        if (url.includes('/pulls?')) {
          return new Response(JSON.stringify([
            // Une PR humaine ordinaire : elle ne porte pas le préfixe d'export
            // et n'est jamais ouverte, sinon le coût de l'export suivrait
            // l'activité du repository.
            { head: { ref: 'feature/refonte-des-couleurs' } },
            { head: { ref: branche } },
          ]), { status: 200 });
        }
        const absente = sansConfiguration(url);
        if (absente) return absente;
        // Le chemin est libre sur la branche de base ; il est pris en vol.
        if (url.includes(`ref=${encodeURIComponent(branche)}`)) {
          return fichier(contratFigma('Icon / Button', '12:345'));
        }
        return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      },
      () => publishArtifact(config, {
        kind: 'component',
        filename: 'IconButton.contract.json',
        content: contratFigma('IconButton', '67:890'),
        warnings: [],
      }),
    ),
    new RegExp(`pull request d'export ouverte, branche ${branche}`),
  );
});

test('un contrat déjà présent sans identité Figma lisible refuse plutôt que d’écraser', async () => {
  // Écrit à la main, ou par un autre outil. Passer outre écraserait peut-être
  // le travail de quelqu'un sans un mot — le défaut même que T4.3 supprime.
  await assert.rejects(
    avecMethode(
      (url) => sansConfiguration(url)
        ?? sansExportEnVol(url)
        ?? fichier(JSON.stringify({ name: 'IconButton', meta: { contractVersion: '3.0' } })),
      () => publishArtifact(config, {
        kind: 'component',
        filename: 'IconButton.contract.json',
        content: contratFigma('IconButton', '67:890'),
        warnings: [],
      }),
    ),
    /aucune identité Figma lisible/,
  );
});

test('les tokens ne passent pas par la détection de collision', async () => {
  // `tokens.json` est unique par repository : son chemin ne se dispute avec
  // rien, et il ne porte aucune identité Figma à comparer. Lui faire lister les
  // pull requests ouvertes serait un appel payé pour une question qui ne se
  // pose pas.
  const calls: string[] = [];
  const result = await avecMethode(
    (url, method) => {
      calls.push(url);
      if (method === 'POST') {
        return new Response(JSON.stringify({ html_url: 'https://github.com/acme/ds/pull/8' }), { status: 201 });
      }
      if (method === 'PUT') return new Response(JSON.stringify({ content: { sha: 'x' } }), { status: 201 });
      return sansConfiguration(url)
        ?? (url.includes('/git/ref/heads/')
          ? new Response(JSON.stringify({ object: { sha: 'base-sha' } }), { status: 200 })
          : new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }));
    },
    () => publishArtifact(config, {
      kind: 'tokens',
      filename: 'tokens.json',
      content: '{"nouveau":true}',
      warnings: [],
    }),
  );

  assert.equal(result.status, 'created');
  assert.equal(calls.filter((url) => url.includes('/pulls?')).length, 0);
});

/** Un artefact réduit à ce que le corps de la pull request regarde. */
function artefactPourPr(
  kind: 'component' | 'tokens',
  content: string,
  warnings: string[] = [],
) {
  return { kind, filename: kind === 'tokens' ? 'tokens.json' : 'X.contract.json', content, warnings };
}

/** Un contrat réduit au champ que l'en-tête annonce. */
function contratEn(version: unknown): string {
  return JSON.stringify({ name: 'Alert', meta: { contractVersion: version } });
}

test('le corps de la pull request porte les avertissements de l’export', () => {
  // C'est la page que le plugin ouvre juste après l'export : les constats
  // destinés au designer y arrivent sans qu'il ait à ouvrir le JSON ni le
  // journal du plugin.
  const sain = pullRequestBody('src/tokens/tokens.json', artefactPourPr('tokens', '{}'));
  assert.match(sain, /Fichier : `src\/tokens\/tokens\.json`/);
  assert.match(sain, /Aucun avertissement d'export\./);

  const signale = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', contratEn('12.0'), [
      'Icône « triangle-exclamation » : sa taille change selon les variantes.',
      'Calque « row », espacement : aucune variable Figma n’est reliée.',
    ]),
  );
  assert.match(signale, /## ⚠️ L'export n'a pas pu décrire certaines informations \(2 points\)/);
  assert.match(signale, /- Icône « triangle-exclamation » /);
  assert.match(signale, /- Calque « row », espacement /);
  assert.match(signale, /### Action/);
  assert.match(signale, /Ces avertissements ne bloquent pas la fusion/);
  assert.doesNotMatch(signale, /—|\w+\(s\)/);
});

test('l’en-tête annonce le schéma que porte le contrat déposé', () => {
  // T4.2. C'est le seul champ qui décide si le fichier ENTIER est lisible par
  // le repository, et il est enfoui dans un diff de plusieurs milliers de
  // lignes. Sur la couverture, celui qui fusionne le voit sans ouvrir le JSON.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', contratEn('12.0')),
  );
  assert.match(corps, /Schéma de contrat : `12\.0`/);
  // Il reste un en-tête : la liste des gestes n'a rien gagné.
  assert.match(corps, /Aucun avertissement d'export\./);
});

test('le schéma annoncé est celui du FICHIER, pas celui du plugin', () => {
  // La mutation que ce test attrape : annoncer `CONTRACT_VERSION`. Le corps
  // deviendrait un énoncé sur le plugin déguisé en énoncé sur le fichier, et
  // un contrat produit par une autre version — le seul cas où la ligne sert à
  // quelque chose — serait annoncé faux. Le contenu ci-dessous ne peut pas
  // être celui du plugin courant : il n'existe aucun schéma 3.0 aujourd'hui.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', contratEn('3.0')),
  );
  assert.match(corps, /Schéma de contrat : `3\.0`/);
  assert.equal(corps.includes(CONTRACT_VERSION), false);
});

test('une version illisible est annoncée telle quelle, une version absente est nommée', () => {
  // Annoncer la valeur fautive telle qu'elle est écrite est ce qui permet de
  // la rapprocher du rapport de CI, qui la cite pareil. La corriger ou la
  // taire ferait de cette ligne un troisième avis sur la version.
  const informe = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', contratEn('douze')),
  );
  assert.match(informe, /Schéma de contrat : `douze`/);

  // Le plugin en écrit toujours une : ce cas vient d'un artefact produit
  // ailleurs, et le contrôle du repository le refusera pour champ absent. La
  // cause se lit ici en une ligne au lieu de se chercher dans le rapport.
  for (const contenu of [contratEn(undefined), contratEn(12), '{}', 'pas du JSON']) {
    const corps = pullRequestBody(
      'src/components/Alert/Alert.contract.json',
      artefactPourPr('component', contenu),
    );
    assert.match(corps, /Schéma de contrat : absent du fichier/);
    assert.match(corps, /le contrôle du repository refusera ce contrat/);
  }
});

test('tokens.json ne reçoit aucun schéma de contrat', () => {
  // Ce n'est pas un contrat mais un arbre DTCG : il ne porte aucun schéma UCM.
  // Lui en annoncer un — fût-ce celui du plugin — inventerait une version que
  // le fichier ne contient pas, et l'absence de ligne n'est donc pas un oubli.
  const corps = pullRequestBody(
    'src/tokens/tokens.json',
    artefactPourPr('tokens', JSON.stringify({ color: { bg: { $value: '#fff' } } })),
  );
  assert.equal(corps.includes('Schéma de contrat'), false);
  assert.match(corps, /Fichier : `src\/tokens\/tokens\.json`/);
});

test('un avertissement n’ouvre aucun lien depuis le corps de la pull request', () => {
  // Le message cite les intitulés de Figma tels quels ; GitHub, lui, relie
  // `@nom` à un compte et `#123` à une issue. Le nom d'une variante de règle y
  // ouvrait le profil d'un inconnu, notifié à chaque export, au lieu de donner
  // au designer le mot à taper dans son composant. Seul le code échappe à
  // l'autoliaison.
  const corps = pullRequestBody(
    'src/components/StressTest/StressTest.contract.json',
    artefactPourPr('component', contratEn('12.0'), [
      'Layer « skull » : aucune règle @icons ne le désigne. Ajoutez une règle @icons '
        + 'dont le layer « icon » porte ce nom, puis réexportez.',
      'Layer « #12 », espacement : aucune variable Figma n’est reliée.',
    ]),
  );
  assert.match(corps, /- Layer « skull » : aucune règle `@icons` ne le désigne\./);
  assert.match(corps, /Ajoutez une règle `@icons` dont/);
  assert.match(corps, /Layer « `#12` », espacement/);
  assert.doesNotMatch(corps, /[^`]@icons/);
  assert.doesNotMatch(corps, /[^`]#12/);
});

test('une note d’export n’atteint pas le corps de la pull request', () => {
  // La PR est le seul canal que le designer relit à froid, et ce qu'il y lit
  // décide s'il relira la suivante. Une note dit elle-même qu'aucune
  // modification n'est demandée : la publier ici, c'est lui apprendre que ces
  // listes se survolent, et le jour où un avertissement demandera un geste il
  // le survolera aussi. Les notes vivent dans `meta.diagnostics` et dans le
  // journal du plugin.
  const note = 'Layer « TilesGrid » : ses lignes de taille fixe sont publiées en pixels, '
    + "exception propre aux pistes FIXED d'une grille.";
  const corps = pullRequestBody(
    'src/components/StressTest/StressTest.contract.json',
    artefactPourPr('component', contratEn('12.0')),
  );
  assert.match(corps, /Aucun avertissement d'export\./);
  assert.doesNotMatch(corps, /Notes d’export/);
  assert.equal(corps.includes(note), false);
  assert.equal(corps.includes('TilesGrid'), false);

  // Un avertissement, lui, garde toute la page : la liste ne contient plus que
  // ce qui nomme un geste, et la consigne finale porte donc sur chaque ligne.
  const signale = pullRequestBody(
    'src/components/StressTest/StressTest.contract.json',
    artefactPourPr('component', contratEn('12.0'), [
      'Calque « row », espacement : aucune variable Figma n’est reliée.',
    ]),
  );
  assert.match(signale, /\(1 point\)/);
  assert.match(signale, /Corrigez chaque point/);
  assert.doesNotMatch(signale, /Notes d’export/);
});

test('l’en-tête dit d’où vient le composant, puisque le lien a disparu', () => {
  // T4.4. La distribution par la Community interdit `enablePrivatePluginApi`,
  // donc `figma.fileKey`, donc `meta.figma.url` : le raccourci d'un clic vers
  // le composant source n'existe plus. D6 demandait que la traçabilité par
  // `fileName` et `nodeId` soit constatée sur une pull request RÉELLE et pas en
  // principe — elle est donc écrite là où la revue a lieu.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', JSON.stringify({
      name: 'Alert',
      meta: { contractVersion: '12.0', figma: { fileName: 'Design System', nodeId: '12:345' } },
    })),
  );
  assert.match(corps, /Composant Figma : « Alert » — fichier « Design System », nœud `12:345`/);
  // Aucun lien inventé : le champ décide, pas la distribution supposée.
  assert.equal(corps.includes(']('), false);
});

test('un contrat qui porte encore une URL la rend en lien', () => {
  // Un export antérieur à T4.4, ou un plugin chargé en développement dans une
  // organisation. La couverture lit le fichier plutôt que de déduire ce que la
  // distribution courante devrait produire : c'est la même règle que pour le
  // schéma, et la déduction se tromperait exactement sur les contrats anciens.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', JSON.stringify({
      name: 'Alert',
      meta: {
        contractVersion: '12.0',
        figma: {
          fileName: 'Design System',
          nodeId: '12:345',
          url: 'https://www.figma.com/design/ABC/Design%20System?node-id=12-345',
        },
      },
    })),
  );
  assert.match(corps, /\[« Alert »\]\(https:\/\/www\.figma\.com\/design\/ABC\//);
});

test('un intitulé Figma reste inerte dans l’en-tête comme dans la liste', () => {
  // Un composant nommé `@icons` ouvrirait le profil d'un inconnu, notifié à
  // chaque export. La règle qui protège la liste protège l'en-tête : un second
  // traitement du même risque aurait fini par diverger de celui-ci.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', JSON.stringify({
      name: '@icons',
      meta: { contractVersion: '12.0', figma: { fileName: '#12 Design', nodeId: '12:345' } },
    })),
  );
  assert.match(corps, /Composant Figma : « `@icons` »/);
  assert.match(corps, /fichier « `#12` Design »/);
  assert.doesNotMatch(corps, /[^`]@icons/);
});

test('une origine illisible s’omet au lieu de redire le défaut', () => {
  // Le contrat cassé est déjà nommé une fois par la ligne de schéma. Une
  // seconde ligne « origine absente » n'apprendrait rien et entraînerait la
  // page vers ce que la règle des notes interdit.
  const corps = pullRequestBody(
    'src/components/Alert/Alert.contract.json',
    artefactPourPr('component', '{}'),
  );
  assert.match(corps, /Schéma de contrat : absent du fichier/);
  assert.equal(corps.includes('Composant Figma'), false);
});

test('tokens.json n’est le portrait d’aucun composant', () => {
  // Ses variables viennent du fichier entier : lui attribuer une origine de
  // composant serait faux, pas seulement inutile.
  const corps = pullRequestBody(
    'src/tokens/tokens.json',
    artefactPourPr('tokens', JSON.stringify({ color: { bg: { $value: '#fff' } } })),
  );
  assert.equal(corps.includes('Composant Figma'), false);
});
