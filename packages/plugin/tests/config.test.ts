import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGithubRepository, validateSettings } from '../src/config';

test('parseGithubRepository extrait owner/repo depuis une URL GitHub HTTPS', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/acme/design-system.git'), {
    owner: 'acme',
    repo: 'design-system',
  });
  assert.equal(parseGithubRepository('https://gitlab.com/acme/design-system'), null);
  assert.equal(parseGithubRepository('https://github.com/acme/design-system/issues'), null);
});

test('parseGithubRepository accepte l’URL exacte du playground et un lien Markdown copié', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/Vassili-g/UCM-Playground'), {
    owner: 'Vassili-g',
    repo: 'UCM-Playground',
  });
  assert.deepEqual(
    parseGithubRepository('[Vassili-g/UCM-Playground](https://github.com/Vassili-g/UCM-Playground)'),
    { owner: 'Vassili-g', repo: 'UCM-Playground' },
  );
});

test('validateSettings utilise le PAT stocké quand le champ UI reste vide', () => {
  const result = validateSettings({
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    githubPat: '',
  }, 'github_pat_secret');

  assert.equal(result.valid, true);
  assert.deepEqual(result.config, {
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    owner: 'acme',
    repo: 'design-system',
    githubPat: 'github_pat_secret',
  });
});

test('validateSettings détaille une configuration invalide sans planter', () => {
  const result = validateSettings({ repoUrl: 'invalid', baseBranch: '' });

  assert.equal(result.valid, false);
  assert.equal(result.config, null);
  assert.deepEqual(Object.keys(result.errors).sort(), ['baseBranch', 'githubPat', 'repoUrl']);
});

/**
 * Trois champs, et aucun chemin. Un chemin rangé ici ne pouvait décider que
 * face à un repository sans `ucm.config.json`, c'est-à-dire au moment précis
 * où `ucm check` applique ses défauts : il n'aurait pu que déposer l'export
 * hors de vue du contrôle.
 */
test('les réglages ne portent aucun chemin', () => {
  const result = validateSettings({
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    githubPat: 'github_pat_secret',
  });

  assert.deepEqual(Object.keys(result.config ?? {}).sort(), [
    'baseBranch',
    'githubPat',
    'owner',
    'repo',
    'repoUrl',
  ]);
});
