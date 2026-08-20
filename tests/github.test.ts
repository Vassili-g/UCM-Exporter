import assert from 'node:assert/strict';
import test from 'node:test';
import type { GithubConfig } from '../src/config';
import {
  artifactPath,
  decodeBase64,
  encodeBase64,
  exportBranchName,
  publishArtifact,
  pullRequestBody,
  utf8ByteLength,
} from '../src/github';

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
  assert.equal(
    artifactPath(config, { kind: 'component', filename: 'Button.contract.json', content: '{}', warnings: [] }),
    'src/components/Button/Button.contract.json',
  );
  assert.equal(
    artifactPath(config, { kind: 'tokens', filename: 'tokens.json', content: '{}', warnings: [] }),
    'src/tokens/tokens.json',
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
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      type: 'file',
      sha: 'existing-sha',
      content: encodeBase64('{"same":true}\n'),
      encoding: 'base64',
    }), { status: 200 });
  };

  try {
    const result = await publishArtifact(config, {
      kind: 'tokens',
      filename: 'tokens.json',
      content: '{"same":true}\n',
      warnings: [],
    });
    assert.deepEqual(result, { status: 'unchanged', path: 'src/tokens/tokens.json' });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishArtifact fonctionne dans un runtime Figma sans TextEncoder', async () => {
  const previousFetch = globalThis.fetch;
  const previousTextEncoder = (globalThis as any).TextEncoder;
  (globalThis as any).TextEncoder = undefined;
  globalThis.fetch = async () => new Response(JSON.stringify({
    type: 'file',
    sha: 'existing-sha',
    content: encodeBase64('{"same":true}\n'),
    encoding: 'base64',
  }), { status: 200 });

  try {
    const result = await publishArtifact(config, {
      kind: 'tokens',
      filename: 'tokens.json',
      content: '{"same":true}\n',
      warnings: [],
    });
    assert.deepEqual(result, { status: 'unchanged', path: 'src/tokens/tokens.json' });
  } finally {
    globalThis.fetch = previousFetch;
    (globalThis as any).TextEncoder = previousTextEncoder;
  }
});

test('publishArtifact compare aussi un fichier GitHub supérieur à 1 Mo via son blob', async () => {
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  const content = '{"same":true}\n';
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        type: 'file', sha: 'large-sha', content: '', encoding: 'none',
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      content: encodeBase64(content), encoding: 'base64',
    }), { status: 200 });
  };

  try {
    const result = await publishArtifact(config, {
      kind: 'tokens', filename: 'tokens.json', content, warnings: [],
    });
    assert.deepEqual(result, { status: 'unchanged', path: 'src/tokens/tokens.json' });
    assert.match(calls[1], /\/git\/blobs\/large-sha$/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishArtifact ignore meta.exportedAt pour détecter un contrat inchangé', async () => {
  const contractOnRepo = JSON.stringify({
    name: 'Button',
    meta: { contractVersion: '3.0', exportedAt: '2026-07-17T16:11:07.100Z' },
    props: {},
  }, null, 2);
  const reExported = contractOnRepo.replace('2026-07-17T16:11:07.100Z', '2026-07-25T10:00:00.000Z');

  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      type: 'file',
      sha: 'existing-sha',
      content: encodeBase64(contractOnRepo),
      encoding: 'base64',
    }), { status: 200 });
  };

  try {
    const result = await publishArtifact(config, {
      kind: 'component',
      filename: 'Button.contract.json',
      content: reExported,
      warnings: [],
    });
    // Seul l'horodatage diffère : aucun changement design, donc aucune PR.
    assert.deepEqual(result, { status: 'unchanged', path: 'src/components/Button/Button.contract.json' });
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishArtifact supprime la branche quand l’ouverture de la PR échoue', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  const responses = [
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
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
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET', 'POST', 'PUT', 'POST', 'DELETE']);
    assert.match(calls[5].url, /git\/refs\/heads\/ucm-exporter\/export-component-20260717-090500$/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('publishArtifact crée branche, commit et PR pour un nouveau fichier', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  const responses = [
    new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }),
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
    });
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET', 'POST', 'PUT', 'POST']);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('le corps de la pull request porte les avertissements de l’export', () => {
  // C'est la page que le plugin ouvre juste après l'export : les constats
  // destinés au designer y arrivent sans qu'il ait à ouvrir le JSON ni le
  // journal du plugin.
  const sain = pullRequestBody('src/tokens/tokens.json', []);
  assert.match(sain, /Fichier : `src\/tokens\/tokens\.json`/);
  assert.match(sain, /Aucun avertissement d'export\./);

  const signale = pullRequestBody('src/components/Alert/Alert.contract.json', [
    'Icône « triangle-exclamation » : sa taille change selon les variantes.',
    'Calque « row », espacement : aucune variable Figma n’est reliée.',
  ]);
  assert.match(signale, /## ⚠️ L'export n'a pas pu décrire certaines informations \(2 points\)/);
  assert.match(signale, /- Icône « triangle-exclamation » /);
  assert.match(signale, /- Calque « row », espacement /);
  assert.match(signale, /### Action/);
  assert.match(signale, /Ces avertissements ne bloquent pas la fusion/);
  assert.doesNotMatch(signale, /—|\w+\(s\)/);
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
  const corps = pullRequestBody('src/components/StressTest/StressTest.contract.json', []);
  assert.match(corps, /Aucun avertissement d'export\./);
  assert.doesNotMatch(corps, /Notes d’export/);
  assert.equal(corps.includes(note), false);
  assert.equal(corps.includes('TilesGrid'), false);

  // Un avertissement, lui, garde toute la page : la liste ne contient plus que
  // ce qui nomme un geste, et la consigne finale porte donc sur chaque ligne.
  const signale = pullRequestBody(
    'src/components/StressTest/StressTest.contract.json',
    ['Calque « row », espacement : aucune variable Figma n’est reliée.'],
  );
  assert.match(signale, /\(1 point\)/);
  assert.match(signale, /Corrigez chaque point/);
  assert.doesNotMatch(signale, /Notes d’export/);
});

