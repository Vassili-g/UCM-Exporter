import assert from 'node:assert/strict';
import test from 'node:test';
import type { GithubConfig } from '../src/config';
import {
  artifactPath,
  decodeBase64,
  encodeBase64,
  exportBranchName,
  publishArtifact,
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
    artifactPath(config, { kind: 'component', filename: 'Button.contract.json', content: '{}' }),
    'src/components/Button/Button.contract.json',
  );
  assert.equal(
    artifactPath(config, { kind: 'tokens', filename: 'tokens.json', content: '{}' }),
    'src/tokens/tokens.json',
  );
});

test('encodeBase64 préserve les caractères Unicode', () => {
  const value = '{"usage":"Être cohérent"}';
  assert.equal(encodeBase64(value), Buffer.from(value, 'utf8').toString('base64'));
  assert.equal(decodeBase64(encodeBase64(value)), value);
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
    });
    assert.deepEqual(result, { status: 'unchanged', path: 'src/tokens/tokens.json' });
    assert.equal(calls.length, 1);
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
    });
    // Seul l'horodatage diffère : aucun changement design, donc aucune PR.
    assert.deepEqual(result, { status: 'unchanged', path: 'src/components/Button/Button.contract.json' });
    assert.equal(calls.length, 1);
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
      { kind: 'component', filename: 'Button.contract.json', content: '{}' },
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
